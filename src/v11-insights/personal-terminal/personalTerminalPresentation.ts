import type {
  Category,
  ExecutionLog,
  PatternMemory,
  Skill,
  StateCheckIn,
} from '../../types';
import type { V11EvidenceStage } from '../../v11/tokens';
import type { V11InsightCopy, V11InsightsPresentation } from '../insightsPresentation';

export type PersonalTerminalScope = 'market' | 'goal' | 'skill';
export type PersonalTerminalChartKind = 'line' | 'candle';
export type PersonalTerminalTimeframe = '1D' | '7D' | '1M' | '3M' | '1Y' | 'ALL';
export type PersonalTerminalIndicator = 'emaShort' | 'emaLong' | 'baseline' | 'load' | 'density' | 'events';
export type PersonalTerminalFixtureId = 'forming' | 'mature' | 'portfolio' | 'skill' | 'volatile' | 'historical';
export type PersonalTerminalProvenance = 'questlife_confirmed' | 'historical_reference' | 'derived_fixture';
export type PersonalTerminalEventCategory = 'training' | 'exam' | 'travel' | 'schedule' | 'decision' | 'execution' | 'milestone';

export type PersonalTerminalObservation = {
  id: string;
  timestamp: string;
  value: number;
  provenance: PersonalTerminalProvenance;
  sourceIds: string[];
};

export type PersonalTerminalLoadPoint = {
  timestamp: string;
  value: number;
  sourceIds: string[];
};

export type PersonalTerminalEvent = {
  id: string;
  timestamp: string;
  type: 'execution' | 'context' | 'decision' | 'milestone';
  category: PersonalTerminalEventCategory;
  title: V11InsightCopy;
  shortLabel: V11InsightCopy;
  detail: V11InsightCopy;
  provenance: PersonalTerminalProvenance;
  scopeId: string | null;
  sourceIds: string[];
};

export type PersonalTerminalBaseline = {
  status: 'unavailable' | 'forming' | 'provisional' | 'established' | 'qa_only';
  value: number | null;
  low: number | null;
  high: number | null;
  referenceKind: 'none' | 'active' | 'historical' | 'qa_derived';
};

export type PersonalTerminalSeries = {
  id: string;
  entityId: string;
  label: V11InsightCopy;
  unit: V11InsightCopy;
  stage: V11EvidenceStage;
  semantic: 'ordinal_state' | 'duration' | 'quality' | 'performance' | 'derived_index';
  valueChangeMode: 'absolute' | 'percentage' | 'none';
  supportsCandle: boolean;
  observations: PersonalTerminalObservation[];
  load: PersonalTerminalLoadPoint[];
  events: PersonalTerminalEvent[];
  baseline: PersonalTerminalBaseline;
  limitation: V11InsightCopy;
  qaDerivedIndex?: boolean;
  qaStability?: 'stable' | 'mixed' | 'variable';
};

export type PersonalTerminalCompositionRow = {
  id: string;
  label: V11InsightCopy;
  value: number;
  direction: 'rising' | 'stable' | 'weakening' | 'unavailable';
  stage: V11EvidenceStage;
};

export type PersonalTerminalBreadth = {
  improving: number;
  stable: number;
  weakening: number;
  unavailable: number;
};

export type PersonalTerminalMapRow = {
  id: string;
  entityId: string;
  label: V11InsightCopy;
  value: number;
  direction: PersonalTerminalCompositionRow['direction'];
  quantity: 'recent_activity' | 'configured_weight' | 'time_allocation';
};

export type PersonalTerminalEntity = {
  id: string;
  scope: PersonalTerminalScope;
  label: V11InsightCopy;
  context: V11InsightCopy;
  seriesIds: string[];
  compositionBasis?: V11InsightCopy;
  composition?: PersonalTerminalCompositionRow[];
};

export type PersonalTerminalSignal = {
  id: string;
  status: 'candidate' | 'supported' | 'archived';
  title: V11InsightCopy;
  relationship: V11InsightCopy;
  observationCount: number;
  counterexampleCount: number | null;
  direction: 'higher' | 'lower' | 'mixed' | null;
  lagDays: number | null;
  maturity: 'forming' | 'provisional' | 'established';
  windowDays: number | null;
  sourceIds: string[];
  lastSeenAt?: string;
  limitation: V11InsightCopy;
};

export type PersonalTerminalSimilarPeriod = {
  id: string;
  start: string;
  end: string;
  primaryChange: number | null;
  relatedChange: number | null;
  observationCount: number;
};

export type PersonalTerminalModel = {
  fixture: PersonalTerminalFixtureId | null;
  dataMode: 'real' | 'qa_fixture';
  defaultScope: PersonalTerminalScope;
  defaultEntityId: string;
  defaultSeriesId: string;
  entities: PersonalTerminalEntity[];
  series: PersonalTerminalSeries[];
  signals: PersonalTerminalSignal[];
  implication: V11InsightCopy;
  breadth?: PersonalTerminalBreadth;
  marketMap?: PersonalTerminalMapRow[];
  similarPeriods?: PersonalTerminalSimilarPeriod[];
  range: { start: string | null; end: string | null };
};

export type PersonalTerminalCandle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  observationCount: number;
  sourceIds: string[];
};

export type PersonalTerminalPoint = {
  time: string;
  value: number;
  observationCount: number;
  sourceIds: string[];
  provenance: PersonalTerminalProvenance | 'mixed';
};

export type PersonalTerminalViewData = {
  observations: PersonalTerminalObservation[];
  line: PersonalTerminalPoint[];
  candles: PersonalTerminalCandle[];
  incompleteCandles: PersonalTerminalPoint[];
  load: PersonalTerminalPoint[];
  emaShort: PersonalTerminalPoint[];
  emaLong: PersonalTerminalPoint[];
  timeframe: PersonalTerminalTimeframe;
};

export type BuildPersonalTerminalInput = {
  now: Date;
  base: V11InsightsPresentation;
  liveLogs: ExecutionLog[];
  stateCheckIns: StateCheckIn[];
  patternMemory: PatternMemory[];
  goals: Category[];
  skills: Skill[];
};

const copy = (key: string, values?: Record<string, string | number>): V11InsightCopy => ({ kind: 'i18n', key, values });

function localDate(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function timestampOf(log: ExecutionLog) {
  const timestamp = Date.parse(log.createdAt);
  if (Number.isFinite(timestamp)) return new Date(timestamp).toISOString();
  return `${log.date}T12:00:00.000`;
}

function dateSpan(observations: PersonalTerminalObservation[]) {
  if (observations.length === 0) return { start: null, end: null };
  return {
    start: observations[0].timestamp.slice(0, 10),
    end: observations[observations.length - 1].timestamp.slice(0, 10),
  };
}

function dailyLogs(
  logs: ExecutionLog[],
  value: (rows: ExecutionLog[]) => number | null,
  filter: (row: ExecutionLog) => boolean = () => true,
) {
  const groups = new Map<string, ExecutionLog[]>();
  logs.filter(filter).forEach((log) => groups.set(log.date, [...(groups.get(log.date) || []), log]));
  return [...groups.entries()].flatMap<PersonalTerminalObservation>(([date, rows]) => {
    const next = value(rows);
    if (next == null || !Number.isFinite(next)) return [];
    return [{
      id: `execution-${date}`,
      timestamp: `${date}T12:00:00.000`,
      value: next,
      provenance: 'questlife_confirmed',
      sourceIds: rows.map((row) => row.id),
    }];
  }).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

function executionEvents(logs: ExecutionLog[], skills: Skill[]) {
  const skillById = new Map(skills.map((skill) => [skill.id, skill]));
  return logs.slice(-24).map<PersonalTerminalEvent>((log) => ({
    id: `event-${log.id}`,
    timestamp: timestampOf(log),
    type: 'execution',
    category: 'execution',
    title: log.title
      ? { kind: 'text', text: log.title }
      : log.linkedSkillId && skillById.get(log.linkedSkillId)
        ? { kind: 'text', text: skillById.get(log.linkedSkillId)!.name }
        : copy('personalTerminalRecordedExecution'),
    shortLabel: copy('personalTerminalRecordedExecution'),
    detail: copy('personalTerminalExecutionEventDetail', { minutes: Math.max(0, log.durationMinutes || 0) }),
    provenance: 'questlife_confirmed',
    scopeId: log.linkedSkillId || log.linkedGoalId || null,
    sourceIds: [log.id],
  }));
}

function loadFromLogs(logs: ExecutionLog[]) {
  return dailyLogs(logs, (rows) => rows.reduce((sum, row) => sum + Math.max(0, row.durationMinutes || 0), 0))
    .map<PersonalTerminalLoadPoint>((row) => ({ timestamp: row.timestamp, value: row.value, sourceIds: row.sourceIds }));
}

function stageForCount(count: number, fallback: V11EvidenceStage): V11EvidenceStage {
  if (count === 0) return 'S0';
  if (count === 1) return 'S1';
  return fallback === 'S3' ? 'S3' : 'S2';
}

function signalRows(base: V11InsightsPresentation): PersonalTerminalSignal[] {
  return base.patterns.rows.slice(0, 5).map((row) => ({
    id: row.id,
    status: row.status === 'accepted' ? 'supported' : row.status,
    title: row.title,
    relationship: row.description,
    observationCount: row.evidenceCount,
    counterexampleCount: null,
    direction: null,
    lagDays: null,
    maturity: row.status === 'accepted' ? 'established' : 'provisional',
    windowDays: null,
    sourceIds: row.sourceIds,
    lastSeenAt: row.lastSeenAt,
    limitation: row.status === 'accepted'
      ? copy('quantSupportedNotCausal')
      : copy('stage3CandidatePatternLimitation'),
  }));
}

export function availableComparisonSeries(
  model: PersonalTerminalModel,
  entityId: string,
  primarySeriesId: string,
) {
  const entity = model.entities.find((row) => row.id === entityId);
  if (!entity) return [];
  return entity.seriesIds.flatMap((id) => {
    const row = model.series.find((series) => series.id === id);
    return row && row.id !== primarySeriesId && row.observations.length > 0 ? [row] : [];
  });
}

function sumMinutes(rows: ExecutionLog[]) {
  return rows.reduce((sum, row) => sum + Math.max(0, row.durationMinutes || 0), 0);
}

function linkedGoalId(skill: Skill) {
  return skill.goalId || skill.categoryId || skill.linkedGoalIds?.[0];
}

export function buildPersonalTerminalPresentation(input: BuildPersonalTerminalInput): PersonalTerminalModel {
  const validStates = input.stateCheckIns
    .filter((row) => Number.isFinite(row.overall) && row.overall >= 1 && row.overall <= 5)
    .map<PersonalTerminalObservation>((row) => ({
      id: row.id,
      timestamp: row.timestamp,
      value: row.overall,
      provenance: 'questlife_confirmed',
      sourceIds: [row.id],
    }))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const execution = dailyLogs(input.liveLogs, sumMinutes, (row) => (row.durationMinutes || 0) > 0);
  const quality = dailyLogs(input.liveLogs, (rows) => {
    const values = rows.flatMap((row) => Number.isFinite(row.qualityRating) ? [row.qualityRating!] : []);
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  });
  const load = loadFromLogs(input.liveLogs);
  const events = executionEvents(input.liveLogs, input.skills);
  const stateBaseline = input.base.overview.comparison.status === 'comparable'
    ? { status: 'provisional' as const, value: null, low: null, high: null, referenceKind: 'active' as const }
    : { status: validStates.length ? 'forming' as const : 'unavailable' as const, value: null, low: null, high: null, referenceKind: 'none' as const };
  const executionBaseline = input.base.trends.baselineMinutes;
  const marketEntity: PersonalTerminalEntity = {
    id: 'market:personal',
    scope: 'market',
    label: copy('personalTerminalPersonalMarket'),
    context: copy('personalTerminalMarketContext'),
    seriesIds: ['market:state', 'market:execution', 'market:quality'],
  };
  const marketSeries: PersonalTerminalSeries[] = [
    {
      id: 'market:state',
      entityId: marketEntity.id,
      label: copy('quantMetricState'),
      unit: copy('quantUnitOutOfFive'),
      stage: stageForCount(validStates.length, input.base.overview.stage),
      semantic: 'ordinal_state',
      valueChangeMode: 'absolute',
      supportsCandle: new Set(validStates.map((row) => row.timestamp.slice(0, 10))).size < validStates.length,
      observations: validStates,
      load,
      events,
      baseline: stateBaseline,
      limitation: input.base.overview.limitation,
    },
    {
      id: 'market:execution',
      entityId: marketEntity.id,
      label: copy('quantMetricExecution'),
      unit: copy('quantUnitMinutes'),
      stage: input.base.trends.stage,
      semantic: 'duration',
      valueChangeMode: 'absolute',
      supportsCandle: false,
      observations: execution,
      load,
      events,
      baseline: {
        status: executionBaseline == null ? (execution.length ? 'forming' : 'unavailable') : 'provisional',
        value: executionBaseline,
        low: input.base.trends.observedRangeMinutes?.min ?? null,
        high: input.base.trends.observedRangeMinutes?.max ?? null,
        referenceKind: executionBaseline == null ? 'none' : 'active',
      },
      limitation: input.base.trends.limitation,
    },
    {
      id: 'market:quality',
      entityId: marketEntity.id,
      label: copy('quantMetricQuality'),
      unit: copy('quantUnitOutOfFive'),
      stage: stageForCount(quality.length, input.base.overview.stage),
      semantic: 'quality',
      valueChangeMode: 'absolute',
      supportsCandle: false,
      observations: quality,
      load,
      events,
      baseline: {
        status: quality.length ? 'forming' : 'unavailable',
        value: null,
        low: null,
        high: null,
        referenceKind: 'none',
      },
      limitation: copy('quantQualityBaselineLimitation'),
    },
  ];

  const goalEntities: PersonalTerminalEntity[] = [];
  const skillEntities: PersonalTerminalEntity[] = [];
  const entitySeries: PersonalTerminalSeries[] = [];
  input.goals.forEach((goal) => {
    const goalSkills = input.skills.filter((skill) => linkedGoalId(skill) === goal.id || skill.linkedGoalIds?.includes(goal.id));
    const skillIds = new Set(goalSkills.map((skill) => skill.id));
    const goalLogs = input.liveLogs.filter((log) => log.linkedGoalId === goal.id || (log.linkedSkillId && skillIds.has(log.linkedSkillId)));
    const seriesId = `goal:${goal.id}:activity`;
    const activity = dailyLogs(goalLogs, sumMinutes, (row) => (row.durationMinutes || 0) > 0);
    const total = sumMinutes(goalLogs);
    goalEntities.push({
      id: `goal:${goal.id}`,
      scope: 'goal',
      label: { kind: 'text', text: goal.name },
      context: copy('personalTerminalGoalPortfolioContext'),
      seriesIds: [seriesId],
      compositionBasis: copy('personalTerminalRecentActivityShare'),
      composition: goalSkills.map((skill) => {
        const skillLogs = goalLogs.filter((log) => log.linkedSkillId === skill.id);
        const value = sumMinutes(skillLogs);
        return {
          id: skill.id,
          label: { kind: 'text', text: skill.name },
          value: total > 0 ? value / total : 0,
          direction: value > 0 ? 'stable' : 'unavailable',
          stage: value > 0 ? 'S1' : 'S0',
        };
      }),
    });
    entitySeries.push({
      id: seriesId,
      entityId: `goal:${goal.id}`,
      label: copy('personalTerminalGoalActivity'),
      unit: copy('quantUnitMinutes'),
      stage: stageForCount(activity.length, input.base.trends.stage),
      semantic: 'duration',
      valueChangeMode: 'absolute',
      supportsCandle: false,
      observations: activity,
      load: loadFromLogs(goalLogs),
      events: executionEvents(goalLogs, input.skills),
      baseline: { status: activity.length ? 'forming' : 'unavailable', value: null, low: null, high: null, referenceKind: 'none' },
      limitation: copy('personalTerminalGoalBaselineLimitation'),
    });
  });
  input.skills.forEach((skill) => {
    const skillLogs = input.liveLogs.filter((log) => log.linkedSkillId === skill.id);
    const activity = dailyLogs(skillLogs, sumMinutes, (row) => (row.durationMinutes || 0) > 0);
    const entityId = `skill:${skill.id}`;
    const seriesId = `${entityId}:activity`;
    skillEntities.push({
      id: entityId,
      scope: 'skill',
      label: { kind: 'text', text: skill.name },
      context: copy('personalTerminalSkillAssetContext'),
      seriesIds: [seriesId],
    });
    entitySeries.push({
      id: seriesId,
      entityId,
      label: copy('personalTerminalSkillActivity'),
      unit: copy('quantUnitMinutes'),
      stage: stageForCount(activity.length, input.base.trends.stage),
      semantic: 'duration',
      valueChangeMode: 'absolute',
      supportsCandle: false,
      observations: activity,
      load: loadFromLogs(skillLogs),
      events: executionEvents(skillLogs, input.skills),
      baseline: { status: activity.length ? 'forming' : 'unavailable', value: null, low: null, high: null, referenceKind: 'none' },
      limitation: copy('personalTerminalSkillBaselineLimitation'),
    });
  });
  const series = [...marketSeries, ...entitySeries];
  const firstWithData = series.find((row) => row.observations.length > 0) || series[0];
  const range = dateSpan(series.flatMap((row) => row.observations).sort((a, b) => a.timestamp.localeCompare(b.timestamp)));
  return {
    fixture: null,
    dataMode: 'real',
    defaultScope: firstWithData?.entityId.startsWith('goal:') ? 'goal' : firstWithData?.entityId.startsWith('skill:') ? 'skill' : 'market',
    defaultEntityId: firstWithData?.entityId || marketEntity.id,
    defaultSeriesId: firstWithData?.id || marketSeries[0].id,
    entities: [marketEntity, ...goalEntities, ...skillEntities],
    series,
    signals: signalRows(input.base),
    implication: input.base.overview.nextAction,
    range,
  };
}

function startForTimeframe(now: Date, timeframe: PersonalTerminalTimeframe) {
  if (timeframe === 'ALL') return Number.NEGATIVE_INFINITY;
  const next = new Date(now);
  const days = timeframe === '1D' ? 1 : timeframe === '7D' ? 7 : timeframe === '1M' ? 30 : timeframe === '3M' ? 90 : 365;
  next.setDate(next.getDate() - days);
  return next.getTime();
}

function bucketKey(timestamp: string, timeframe: PersonalTerminalTimeframe) {
  const value = new Date(timestamp);
  if (timeframe === '1D') return `${timestamp.slice(0, 13)}:00:00.000`;
  if (timeframe === '7D' || timeframe === '1M') return timestamp.slice(0, 10);
  if (timeframe === '3M') {
    const day = new Date(value);
    day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
    return localDate(day);
  }
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-01`;
}

function lineBuckets(rows: PersonalTerminalObservation[], timeframe: PersonalTerminalTimeframe) {
  const groups = new Map<string, PersonalTerminalObservation[]>();
  rows.forEach((row) => {
    const key = bucketKey(row.timestamp, timeframe);
    groups.set(key, [...(groups.get(key) || []), row]);
  });
  return [...groups.entries()].map<PersonalTerminalPoint>(([time, values]) => ({
    time,
    value: values.reduce((sum, row) => sum + row.value, 0) / values.length,
    observationCount: values.length,
    sourceIds: values.flatMap((row) => row.sourceIds),
    provenance: new Set(values.map((row) => row.provenance)).size > 1 ? 'mixed' : values[0].provenance,
  })).sort((a, b) => a.time.localeCompare(b.time));
}

function candleBuckets(rows: PersonalTerminalObservation[], timeframe: PersonalTerminalTimeframe) {
  const groups = new Map<string, PersonalTerminalObservation[]>();
  rows.forEach((row) => {
    const key = bucketKey(row.timestamp, timeframe);
    groups.set(key, [...(groups.get(key) || []), row]);
  });
  const candles: PersonalTerminalCandle[] = [];
  const incompleteCandles: PersonalTerminalPoint[] = [];
  [...groups.entries()].forEach(([time, values]) => {
    const ordered = values.slice().sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    if (ordered.length < 2) {
      incompleteCandles.push({ time, value: ordered[0].value, observationCount: 1, sourceIds: ordered[0].sourceIds, provenance: ordered[0].provenance });
      return;
    }
    candles.push({
      time,
      open: ordered[0].value,
      high: Math.max(...ordered.map((row) => row.value)),
      low: Math.min(...ordered.map((row) => row.value)),
      close: ordered[ordered.length - 1].value,
      observationCount: ordered.length,
      sourceIds: ordered.flatMap((row) => row.sourceIds),
    });
  });
  return { candles, incompleteCandles };
}

function ema(points: PersonalTerminalPoint[], period: number) {
  if (!points.length) return [];
  const alpha = 2 / (period + 1);
  let current = points[0].value;
  return points.map((point) => {
    current = point.value * alpha + current * (1 - alpha);
    return { ...point, value: current };
  });
}

export function buildPersonalTerminalViewData(
  series: PersonalTerminalSeries,
  timeframe: PersonalTerminalTimeframe,
  now: Date,
): PersonalTerminalViewData {
  const start = startForTimeframe(now, timeframe);
  const observations = series.observations.filter((row) => new Date(row.timestamp).getTime() >= start);
  const line = lineBuckets(observations, timeframe);
  const { candles, incompleteCandles } = candleBuckets(observations, timeframe);
  const loadObservations = series.load
    .filter((row) => new Date(row.timestamp).getTime() >= start)
    .map<PersonalTerminalObservation>((row, index) => ({
      id: `load-${index}-${row.timestamp}`,
      timestamp: row.timestamp,
      value: row.value,
      provenance: 'questlife_confirmed',
      sourceIds: row.sourceIds,
    }));
  return {
    observations,
    line,
    candles,
    incompleteCandles,
    load: lineBuckets(loadObservations, timeframe),
    emaShort: ema(line, 7),
    emaLong: ema(line, 30),
    timeframe,
  };
}

export function availableTimeframes(series: PersonalTerminalSeries, now: Date): PersonalTerminalTimeframe[] {
  if (!series.observations.length) return ['1M'];
  const first = new Date(series.observations[0].timestamp).getTime();
  const spanDays = Math.max(0, (now.getTime() - first) / 86_400_000);
  const result: PersonalTerminalTimeframe[] = [];
  const latestDay = series.observations[series.observations.length - 1].timestamp.slice(0, 10);
  if (series.observations.filter((row) => row.timestamp.startsWith(latestDay)).length >= 2) result.push('1D');
  if (spanDays >= 2) result.push('7D');
  result.push('1M');
  if (spanDays >= 45) result.push('3M');
  if (spanDays >= 180) result.push('1Y');
  if (spanDays >= 365) result.push('ALL');
  return [...new Set(result)];
}
