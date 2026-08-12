import type {
  PersonalTerminalEvent,
  PersonalTerminalSeries,
} from './personalTerminalPresentation';
import type {
  QuantDecisionCandidate,
  QuantDriverCandidate,
  QuantInterpretationBundle,
  QuantScenarioBranch,
  QuantSimilarPeriod,
} from './quantInterpretation';

const DAY_MS = 86_400_000;
const TIMELINE_DAY_COUNT = 8;

export type QuantDriverTimelinePoint = {
  day: string;
  relativeDay: number;
  timestamp: string | null;
  value: number | null;
  normalizedValue: number | null;
  sourceIds: string[];
};

export type QuantDriverTimelineLane = {
  id: string;
  construct: string;
  role: 'target' | 'primary_driver' | 'secondary_driver';
  unit: string;
  points: QuantDriverTimelinePoint[];
  baselineNormalized: number | null;
};

export type QuantDriverTimeline = {
  start: string;
  end: string;
  lanes: QuantDriverTimelineLane[];
  events: PersonalTerminalEvent[];
};

export type QuantScenarioActionKey =
  | 'normal_training'
  | 'lower_intensity_activity'
  | 'recovery_rest';

export type QuantScenarioPresentationBranch = {
  actionKey: QuantScenarioActionKey;
  candidate: QuantDecisionCandidate | null;
  branch: QuantScenarioBranch | null;
  evidenceState: 'observed' | 'mixed' | 'insufficient';
  comparableCount: number | null;
  medianOutcomeChange: number | null;
  medianDaysToNearReference: number | null;
  supportCount: number | null;
  counterexampleCount: number | null;
  missingOutcomeCount: number | null;
  limitations: string[];
};

export type QuantDecisionPresentation = {
  abstains: boolean;
  leading: QuantDecisionCandidate | null;
  alternatives: QuantDecisionCandidate[];
  uncertaintyCodes: string[];
  missingInformation: string[];
};

export type QuantInterpretationOperatorAction =
  | 'why_move'
  | 'show_drivers'
  | 'compare_previous'
  | 'find_similar'
  | 'show_recovery'
  | 'compare_actions'
  | 'show_unknowns'
  | 'next_observation';

export type QuantInterpretationOperatorOption = {
  id: QuantInterpretationOperatorAction;
  enabled: boolean;
};

export type QuantInterpretationOperatorIntent =
  | { kind: 'driver'; driverId: string }
  | { kind: 'previous_period' }
  | { kind: 'sheet'; view: 'drivers' | 'similar' | 'recovery' | 'scenario' | 'decision' | 'next'; showAnalogueEnvelope: boolean };

function day(value: string) {
  return value.slice(0, 10);
}

function utcDay(value: string) {
  return new Date(`${day(value)}T00:00:00.000Z`);
}

function addDays(value: Date, amount: number) {
  return new Date(value.getTime() + amount * DAY_MS);
}

function normalized(value: number, minimum: number, maximum: number) {
  if (maximum <= minimum) return 0.5;
  return (value - minimum) / (maximum - minimum);
}

function lane(
  series: PersonalTerminalSeries,
  role: QuantDriverTimelineLane['role'],
  days: string[],
) {
  const latestByDay = new Map<string, PersonalTerminalSeries['observations'][number]>();
  const allowedDays = new Set(days);
  series.observations.forEach((observation) => {
    const key = day(observation.timestamp);
    if (!allowedDays.has(key)) return;
    const current = latestByDay.get(key);
    if (!current || current.timestamp < observation.timestamp) latestByDay.set(key, observation);
  });
  const values = [...latestByDay.values()].map((observation) => observation.value);
  if (series.baseline.value != null) values.push(series.baseline.value);
  const minimum = values.length ? Math.min(...values) : 0;
  const maximum = values.length ? Math.max(...values) : 1;
  return {
    id: `${role}:${series.id}`,
    construct: series.constructKey || series.id,
    role,
    unit: series.unit.kind === 'text' ? series.unit.text : series.unit.key,
    points: days.map((key, index) => {
      const observation = latestByDay.get(key) ?? null;
      return {
        day: key,
        relativeDay: index - (days.length - 1),
        timestamp: observation?.timestamp ?? null,
        value: observation?.value ?? null,
        normalizedValue: observation ? normalized(observation.value, minimum, maximum) : null,
        sourceIds: observation?.sourceIds ?? [],
      };
    }),
    baselineNormalized: series.baseline.value == null
      ? null
      : normalized(series.baseline.value, minimum, maximum),
  } satisfies QuantDriverTimelineLane;
}

export function buildDriverTimeline(
  bundle: QuantInterpretationBundle,
  series: PersonalTerminalSeries[],
  selectedDriverId?: string,
): QuantDriverTimeline {
  const context = bundle.driver_analysis.context;
  const end = utcDay(context.window_end);
  const days = Array.from({ length: TIMELINE_DAY_COUNT }, (_, index) => (
    addDays(end, index - (TIMELINE_DAY_COUNT - 1)).toISOString().slice(0, 10)
  ));
  const target = series.find((row) => row.constructKey === context.target_construct) ?? null;
  const selected = bundle.driver_analysis.candidates.find((candidate) => candidate.candidate_id === selectedDriverId)
    ?? bundle.driver_analysis.candidates[0]
    ?? null;
  const secondary = bundle.driver_analysis.candidates.find((candidate) => candidate.candidate_id !== selected?.candidate_id) ?? null;
  const selectedSeries = selected ? series.find((row) => row.constructKey === selected.driver_construct) ?? null : null;
  const secondarySeries = secondary ? series.find((row) => row.constructKey === secondary.driver_construct) ?? null : null;
  const lanes: QuantDriverTimelineLane[] = [];
  if (target) lanes.push(lane(target, 'target', days));
  if (selectedSeries) lanes.push(lane(selectedSeries, 'primary_driver', days));
  if (secondarySeries) lanes.push(lane(secondarySeries, 'secondary_driver', days));
  const eventMap = new Map<string, PersonalTerminalEvent>();
  series.forEach((row) => row.events.forEach((event) => {
    const eventDay = day(event.timestamp);
    if (eventDay < days[0] || eventDay > days[days.length - 1]) return;
    eventMap.set(event.id, event);
  }));
  return {
    start: days[0],
    end: days[days.length - 1],
    lanes,
    events: [...eventMap.values()].sort((left, right) => left.timestamp.localeCompare(right.timestamp)),
  };
}

function scenarioBranch(bundle: QuantInterpretationBundle, actionKey: QuantScenarioActionKey) {
  const aliases: Record<QuantScenarioActionKey, string[]> = {
    normal_training: ['normal_training', 'exercise'],
    lower_intensity_activity: ['lower_intensity_activity', 'low_intensity_activity', 'low_intensity'],
    recovery_rest: ['recovery_rest', 'rest'],
  };
  return bundle.scenario_comparison.branches.find((branch) => aliases[actionKey].includes(branch.action_value)) ?? null;
}

export function buildScenarioComparisonPresentation(bundle: QuantInterpretationBundle) {
  const keys: QuantScenarioActionKey[] = ['normal_training', 'lower_intensity_activity', 'recovery_rest'];
  return keys.map((actionKey): QuantScenarioPresentationBranch => {
    const candidate = bundle.decision_support.candidates.find((row) => row.action_key === actionKey) ?? null;
    const branch = scenarioBranch(bundle, actionKey);
    const insufficient = !branch || branch.comparable_episode_count === 0 || candidate?.status === 'INSUFFICIENT_EVIDENCE';
    return {
      actionKey,
      candidate,
      branch,
      evidenceState: insufficient ? 'insufficient' : candidate?.status === 'MIXED_EVIDENCE' ? 'mixed' : 'observed',
      comparableCount: branch?.comparable_episode_count ?? null,
      medianOutcomeChange: branch?.median_outcome_change ?? null,
      medianDaysToNearReference: branch?.median_days_to_near_reference ?? null,
      supportCount: branch?.support_count ?? null,
      counterexampleCount: branch?.counterexample_count ?? null,
      missingOutcomeCount: branch?.missing_outcome_count ?? null,
      limitations: [...new Set([...(branch?.limitations ?? []), ...(candidate?.uncertainty_codes ?? [])])],
    };
  });
}

export function buildDecisionPresentation(bundle: QuantInterpretationBundle): QuantDecisionPresentation {
  const leading = bundle.decision_support.candidates.find((candidate) => (
    candidate.candidate_id === bundle.decision_support.leading_candidate_id
  )) ?? null;
  const abstains = !leading
    || leading.status === 'INSUFFICIENT_EVIDENCE'
    || leading.action_key === 'gather_more_information';
  const alternatives = bundle.decision_support.candidates.filter((candidate) => (
    candidate.candidate_id !== leading?.candidate_id && candidate.action_key !== 'gather_more_information'
  ));
  return {
    abstains,
    leading: abstains ? null : leading,
    alternatives,
    uncertaintyCodes: [...new Set([
      ...bundle.brief.uncertainty_codes,
      ...(leading?.uncertainty_codes ?? []),
    ])],
    missingInformation: [...new Set(bundle.decision_support.candidates.flatMap((candidate) => candidate.missing_information))],
  };
}

export function similarPeriodOutcome(period: QuantSimilarPeriod) {
  const first = period.subsequent_trajectory[0]?.baseline_deviation ?? null;
  const final = period.subsequent_trajectory[period.subsequent_trajectory.length - 1]?.baseline_deviation ?? null;
  return {
    first,
    final,
    change: first == null || final == null ? null : final - first,
    observationCount: period.subsequent_trajectory.length,
  };
}

export function buildInterpretationOperatorOptions(bundle: QuantInterpretationBundle): QuantInterpretationOperatorOption[] {
  const hasDrivers = bundle.driver_analysis.candidates.length > 0;
  const hasSimilar = bundle.similar_periods.periods.length > 0;
  const hasRecovery = bundle.recovery_trajectory.reference_path.length > 0;
  const hasScenarios = bundle.scenario_comparison.branches.length > 0 || bundle.decision_support.candidates.length > 0;
  return [
    { id: 'why_move', enabled: hasDrivers },
    { id: 'show_drivers', enabled: hasDrivers },
    { id: 'compare_previous', enabled: true },
    { id: 'find_similar', enabled: hasSimilar },
    { id: 'show_recovery', enabled: hasRecovery },
    { id: 'compare_actions', enabled: hasScenarios },
    { id: 'show_unknowns', enabled: true },
    { id: 'next_observation', enabled: true },
  ];
}

export function resolveInterpretationOperatorIntent(
  bundle: QuantInterpretationBundle,
  action: QuantInterpretationOperatorAction,
): QuantInterpretationOperatorIntent {
  const primaryDriver = bundle.driver_analysis.candidates[0] ?? null;
  if (action === 'why_move' || action === 'show_drivers') {
    return primaryDriver
      ? { kind: 'driver', driverId: primaryDriver.candidate_id }
      : { kind: 'sheet', view: 'drivers', showAnalogueEnvelope: false };
  }
  if (action === 'compare_previous') return { kind: 'previous_period' };
  if (action === 'find_similar') return { kind: 'sheet', view: 'similar', showAnalogueEnvelope: false };
  if (action === 'show_recovery') return { kind: 'sheet', view: 'recovery', showAnalogueEnvelope: true };
  if (action === 'compare_actions') return { kind: 'sheet', view: 'scenario', showAnalogueEnvelope: false };
  return {
    kind: 'sheet',
    view: action === 'next_observation' ? 'next' : 'decision',
    showAnalogueEnvelope: false,
  };
}

export function buildPreviousInterpretationRange(windowStart: string, windowEnd: string) {
  const currentStart = new Date(windowStart);
  const currentEnd = new Date(windowEnd);
  const span = Math.max(DAY_MS, currentEnd.getTime() - currentStart.getTime());
  const previousEnd = new Date(currentStart.getTime() - DAY_MS);
  const previousStart = new Date(previousEnd.getTime() - span);
  return {
    kind: 'calendar_range' as const,
    start: previousStart.toISOString().slice(0, 10),
    end: previousEnd.toISOString().slice(0, 10),
  };
}

export function buildHistoricalActionEvents(bundle: QuantInterpretationBundle): PersonalTerminalEvent[] {
  const seen = new Set<string>();
  return bundle.scenario_comparison.branches.flatMap((branch) => branch.episodes.flatMap((episode) => {
    const id = `interpretation-action:${episode.action_observation_id}`;
    if (seen.has(id)) return [];
    seen.add(id);
    const actionKey = branch.action_value.replace(/[^a-zA-Z0-9]+/g, '_');
    return [{
      id,
      timestamp: episode.action_at,
      type: 'execution' as const,
      category: 'execution' as const,
      title: { kind: 'i18n' as const, key: `quantInterpretationAction_${actionKey}` },
      shortLabel: { kind: 'i18n' as const, key: `quantInterpretationAction_${actionKey}` },
      detail: { kind: 'i18n' as const, key: 'quantInterpretationHistoricalActionEventDetail' },
      provenance: 'derived_fixture' as const,
      scopeId: 'market:personal',
      sourceIds: [episode.action_observation_id, ...episode.outcome_source_ids],
    }];
  }));
}
