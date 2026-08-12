import { z } from 'zod';
import type { V11InsightCopy } from '../insightsPresentation';
import type {
  PersonalTerminalModel,
  PersonalTerminalSeries,
  QuantInterpretationScenarioId,
} from './personalTerminalPresentation';
import type { QuantInterpretationBundle } from './quantInterpretation';
// Node's built-in TypeScript test runner requires the extension; Metro resolves it normally.
// @ts-expect-error Test-compatible TypeScript module specifier.
import { buildHistoricalActionEvents } from './quantInterpretationPresentation.ts';

const NullableNumber = z.number().finite().nullable();
const Status = z.enum(['AVAILABLE', 'INSUFFICIENT']);
const Context = z.object({
  artifact_id: z.string().min(1),
  subject_id: z.string().min(1),
  as_of: z.string().min(1),
  target_construct: z.string().min(1),
  window_start: z.string().min(1),
  window_end: z.string().min(1),
  evidence_ids: z.array(z.string()),
  available_constructs: z.array(z.string()),
  unavailable_constructs: z.array(z.string()),
  missingness: z.record(z.string(), z.record(z.string(), z.number().int().nonnegative())),
  method_version: z.string().min(1),
  limitations: z.array(z.string()),
  lineage: z.record(z.string(), z.unknown()),
});
const TargetMovement = z.object({
  current_value: NullableNumber,
  baseline_value: NullableNumber,
  deviation: NullableNumber,
  unit: z.string(),
  current_source_ids: z.array(z.string()),
  baseline_source_ids: z.array(z.string()),
});
const DriverCandidate = z.object({
  candidate_id: z.string().min(1),
  driver_construct: z.string().min(1),
  rank: z.number().int().positive(),
  evidence_status: z.enum(['STRONG_OBSERVATIONAL_FIT', 'MODERATE_OBSERVATIONAL_FIT', 'WEAK_OR_MIXED', 'CONFLICTING', 'INSUFFICIENT']),
  evidence_grade: z.string().min(1),
  observed_recent_value: NullableNumber,
  observed_reference_value: NullableNumber,
  observed_recent_change: NullableNumber,
  unit: z.string(),
  temporal_relationship: z.string().min(1),
  effect_estimate: NullableNumber,
  interval: z.tuple([z.number().finite(), z.number().finite()]).nullable(),
  support_count: z.number().int().nonnegative(),
  counterexample_count: z.number().int().nonnegative(),
  independent_period_count: z.number().int().nonnegative(),
  missingness: z.record(z.string(), z.number().int().nonnegative()),
  evidence_ids: z.array(z.string()),
  alternative_explanations: z.array(z.string()),
  ranking_reason: z.string().min(1),
  limitations: z.array(z.string()),
});
const DriverAnalysis = z.object({
  context: Context,
  status: Status,
  target_movement: TargetMovement,
  candidates: z.array(DriverCandidate),
  competing_candidate_ids: z.array(z.string()),
  unresolved_explanations: z.array(z.string()),
});
const TrajectoryPoint = z.object({
  offset_days: z.number().int().nonnegative(),
  observed_at: z.string().min(1),
  value: z.number().finite(),
  baseline_deviation: NullableNumber,
  source_ids: z.array(z.string()),
});
const FeatureComparison = z.object({
  feature_key: z.string().min(1),
  current_value: NullableNumber,
  historical_value: NullableNumber,
  unit: z.string(),
  scale: NullableNumber,
  distance_contribution: NullableNumber,
  current_missing: z.boolean(),
  historical_missing: z.boolean(),
  source_ids: z.array(z.string()),
});
const SimilarPeriod = z.object({
  period_id: z.string().min(1),
  start_at: z.string().min(1),
  end_at: z.string().min(1),
  distance: z.number().finite().nonnegative(),
  feature_comparisons: z.array(FeatureComparison),
  matching_feature_keys: z.array(z.string()),
  different_feature_keys: z.array(z.string()),
  evidence_ids: z.array(z.string()),
  subsequent_trajectory: z.array(TrajectoryPoint),
});
const SimilarPeriods = z.object({
  context: Context,
  status: Status,
  feature_registry: z.array(z.string()),
  current_features: z.record(z.string(), NullableNumber),
  periods: z.array(SimilarPeriod),
  self_match_excluded: z.literal(true),
  future_leakage_check_passed: z.literal(true),
});
const Recovery = z.object({
  context: Context,
  status: Status,
  projection_semantics: z.literal('HISTORICAL_ANALOGUE'),
  display_style: z.literal('historical_analogue_dashed_envelope'),
  episodes: z.array(z.object({ period_id: z.string(), points: z.array(TrajectoryPoint) })),
  reference_path: z.array(z.object({
    offset_days: z.number().int().nonnegative(),
    median_deviation: z.number().finite(),
    low_deviation: z.number().finite(),
    high_deviation: z.number().finite(),
    episode_count: z.number().int().positive(),
  })),
  excluded_period_ids: z.array(z.string()),
  forecast_allowed: z.literal(false),
});
const ScenarioBranch = z.object({
  branch_id: z.string().min(1),
  action_value: z.string().min(1),
  comparable_episode_count: z.number().int().nonnegative(),
  episodes: z.array(z.object({
    period_id: z.string(),
    action_observation_id: z.string(),
    action_at: z.string(),
    outcome_change: NullableNumber,
    days_to_near_reference: z.number().int().nonnegative().nullable(),
    outcome_source_ids: z.array(z.string()),
  })),
  median_outcome_change: NullableNumber,
  median_days_to_near_reference: NullableNumber,
  support_count: z.number().int().nonnegative(),
  counterexample_count: z.number().int().nonnegative(),
  missing_outcome_count: z.number().int().nonnegative(),
  evidence_ids: z.array(z.string()),
  limitations: z.array(z.string()),
});
const Scenario = z.object({
  context: Context,
  status: Status,
  action_construct: z.string(),
  branches: z.array(ScenarioBranch),
  claim_type: z.literal('descriptive'),
  observed_branch_difference: NullableNumber,
  causal_effect_estimated: z.literal(false),
  confounding_warnings: z.array(z.string()),
  selection_bias_warning: z.string().min(1),
});
const Claim = z.object({
  claim_id: z.string().min(1),
  section: z.enum(['OBSERVED', 'CANDIDATE_DRIVERS', 'COUNTEREVIDENCE', 'SIMILAR_PERIODS', 'WHAT_FOLLOWED', 'NEXT_ACTION', 'UNCERTAINTY']),
  statement_key: z.string().min(1),
  values: z.record(z.string(), z.unknown()),
  claim_type: z.enum(['descriptive', 'association', 'prediction', 'policy']),
  evidence_grade: z.string(),
  evidence_ids: z.array(z.string()),
  limitation_ids: z.array(z.string()),
});
const Brief = z.object({
  context: Context,
  status: Status,
  claims: z.array(Claim),
  candidate_driver_ids: z.array(z.string()),
  counterevidence_driver_ids: z.array(z.string()),
  similar_period_ids: z.array(z.string()),
  uncertainty_codes: z.array(z.string()),
  next_useful_observation: z.string().min(1),
});
const DecisionCandidate = z.object({
  candidate_id: z.string().min(1),
  action_key: z.string().min(1),
  status: z.enum(['OBSERVATIONAL_SUPPORT', 'MIXED_EVIDENCE', 'INSUFFICIENT_EVIDENCE']),
  evidence_ids: z.array(z.string()),
  analogue_period_ids: z.array(z.string()),
  uncertainty_codes: z.array(z.string()),
  downside_risk: z.string().min(1),
  reversibility: z.string().min(1),
  missing_information: z.array(z.string()),
  outcome_to_observe: z.string().min(1),
});
const DecisionSupport = z.object({
  context: Context,
  status: Status,
  candidates: z.array(DecisionCandidate),
  leading_candidate_id: z.string().nullable(),
  next_useful_observation: z.string().min(1),
  handoff_authority: z.literal('today_decision'),
  automatic_execution: z.literal(false),
});
const Bundle = z.object({
  bundle_id: z.string().min(1),
  driver_analysis: DriverAnalysis,
  similar_periods: SimilarPeriods,
  recovery_trajectory: Recovery,
  scenario_comparison: Scenario,
  brief: Brief,
  decision_support: DecisionSupport,
});
const Series = z.object({
  id: z.string().min(1),
  constructKey: z.string().min(1),
  label: z.string().min(1),
  domain: z.string().min(1),
  unit: z.string(),
  semantic: z.enum(['ordinal_state', 'duration', 'count']),
  valueChangeMode: z.enum(['absolute', 'percentage', 'none']),
  observations: z.array(z.object({
    id: z.string().min(1),
    timestamp: z.string().min(1),
    value: z.number().finite(),
    sourceIds: z.array(z.string()),
  })),
  baseline: z.object({
    status: z.enum(['forming', 'established']),
    value: NullableNumber,
    low: NullableNumber,
    high: NullableNumber,
    referenceKind: z.literal('active'),
    observationCount: z.number().int().nonnegative(),
    independentDayCount: z.number().int().nonnegative(),
  }),
  coverage: z.object({
    observedDays: z.number().int().nonnegative(),
    expectedDays: z.number().int().positive(),
    coverageRatio: z.number().finite().min(0).max(1),
    firstAvailableAt: z.string().nullable(),
    lastAvailableAt: z.string().nullable(),
    sourceCount: z.number().int().nonnegative(),
  }),
  latestValue: NullableNumber,
  latestAt: z.string().nullable(),
});
const ScenarioId = z.enum(['accumulated_load', 'sleep_disruption', 'conflicting', 'exercise_branch', 'rest_branch', 'insufficient']);
const Payload = z.object({
  schemaVersion: z.literal('questlife-quant-interpretation-fixture-v0.1'),
  scenarioId: ScenarioId,
  subjectId: z.string().min(1),
  asOf: z.string().min(1),
  syntheticOnly: z.literal(true),
  containsRealUserData: z.literal(false),
  series: z.array(Series).min(1),
  interpretation: Bundle,
  sourceMetadata: z.object({
    engineVersion: z.string().min(1),
    canonicalArtifactHash: z.string().min(1),
    sourceArtifact: z.string().min(1),
    syntheticOnly: z.literal(true),
    containsRealUserData: z.literal(false),
  }),
}).passthrough();

const i18n = (key: string, values?: Record<string, string | number>): V11InsightCopy => ({ kind: 'i18n', key, values });
const literal = (value: string): V11InsightCopy => ({ kind: 'text', text: value });

function constructLabel(construct: string): V11InsightCopy {
  return i18n(`quantInterpretationConstruct_${construct.replace(/[^a-zA-Z0-9]+/g, '_')}`);
}

function stage(status: 'AVAILABLE' | 'INSUFFICIENT', count: number) {
  if (!count) return 'S0' as const;
  if (status === 'INSUFFICIENT') return 'S1' as const;
  return count >= 30 ? 'S3' as const : 'S2' as const;
}

export function adaptQuantInterpretationPayload(input: unknown): PersonalTerminalModel {
  const payload = Payload.parse(input);
  const interpretation = payload.interpretation as QuantInterpretationBundle;
  const historicalActionEvents = buildHistoricalActionEvents(interpretation);
  const load = payload.series.find((row) => row.constructKey === 'execution.load')?.observations.map((row) => ({
    timestamp: row.timestamp,
    value: row.value,
    sourceIds: row.sourceIds,
  })) ?? [];
  const series: PersonalTerminalSeries[] = payload.series.map((row) => ({
    id: row.id,
    entityId: 'market:personal',
    label: constructLabel(row.constructKey),
    unit: literal(row.unit),
    stage: stage(payload.interpretation.driver_analysis.status, row.observations.length),
    semantic: row.semantic,
    valueChangeMode: row.valueChangeMode,
    supportsCandle: false,
    observations: row.observations.map((observation) => ({
      ...observation,
      provenance: 'derived_fixture',
    })),
    load,
    events: historicalActionEvents,
    baseline: row.baseline,
    limitation: i18n('quantInterpretationSeriesLimitation'),
    constructKey: row.constructKey,
    domain: row.domain,
    latestValue: row.latestValue,
    latestAt: row.latestAt,
    availableTimeframes: ['7D', '30D', '90D', 'ALL'],
    defaultTimeframe: '30D',
    availableIndicators: historicalActionEvents.length ? ['baseline', 'load', 'events'] : ['baseline', 'load'],
    chartCapabilities: {
      line: true,
      bar: true,
      candle: false,
      percentChange: false,
      candleRepresentation: 'NONE',
      candleTimeframes: [],
    },
    coverage: row.coverage,
  }));
  const targetId = payload.interpretation.driver_analysis.context.target_construct;
  const defaultSeries = series.find((row) => row.constructKey === targetId) ?? series[0];
  const scenarioId = payload.scenarioId as QuantInterpretationScenarioId;
  return {
    fixture: null,
    dataMode: 'quant_interpretation_fixture',
    availability: 'available',
    defaultScope: 'market',
    defaultEntityId: 'market:personal',
    defaultSeriesId: defaultSeries.id,
    entities: [{
      id: 'market:personal',
      scope: 'market',
      label: i18n('personalTerminalPersonalMarket'),
      context: i18n('quantInterpretationMarketContext'),
      seriesIds: series.map((row) => row.id),
    }],
    series,
    signals: [],
    implication: i18n(`quantInterpretationScenario_${scenarioId}`),
    range: {
      start: series.flatMap((row) => row.observations).map((row) => row.timestamp).sort()[0] ?? null,
      end: payload.asOf,
    },
    sourceMetadata: {
      schemaVersion: payload.schemaVersion,
      engineVersion: payload.sourceMetadata.engineVersion,
      materializedEngineVersion: payload.sourceMetadata.engineVersion,
      quantCommit: 'local-interpretation-v0.1',
      canonicalArtifactHash: payload.sourceMetadata.canonicalArtifactHash,
      sourceArtifact: payload.sourceMetadata.sourceArtifact,
      syntheticOnly: true,
      containsRealUserData: false,
    },
    nextAction: i18n('quantInterpretationOpenDecisionSupport'),
    interpretation,
    interpretationScenario: scenarioId,
  };
}
