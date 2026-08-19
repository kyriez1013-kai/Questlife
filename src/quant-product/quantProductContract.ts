import { z } from 'zod';

export const QUANT_PRODUCT_CONTRACT_VERSION = 'questlife.quant.product.v1' as const;
export const QUANT_PRODUCT_SCHEMA_HASH = 'da7bd3987a9343c72cb37f2edd4dbc81b604e655d4b915c9f85949f001632335' as const;

const DateTimeSchema = z.string().refine(
  (value) => Number.isFinite(Date.parse(value)) && /(?:Z|[+-]\d{2}:\d{2})$/.test(value),
  'Expected a timezone-aware ISO datetime.',
);
const FiniteNumber = z.number().finite();
const NullableNumber = FiniteNumber.nullable();

export const BundleModeSchema = z.enum(['COMPACT', 'FULL']);
export const ProductScopeSchema = z.enum(['PERSONAL_MARKET', 'INSTRUMENT', 'GOAL', 'SKILL']);
export const ProductAvailabilityStateSchema = z.enum([
  'AVAILABLE', 'FORMING', 'INSUFFICIENT_DATA', 'ABSTAINED', 'NOT_SUPPORTED',
  'RESEARCH_ONLY', 'UNAVAILABLE_SOURCE',
]);
export const ScaleSemanticsSchema = z.enum([
  'RATIO', 'COUNT', 'ORDINAL', 'TIME_DURATION', 'TIME_OF_DAY', 'CATEGORICAL',
]);
export const ChartTypeSchema = z.enum([
  'POINT', 'LINE', 'BAR', 'RANGE', 'CANDLE', 'COMPARE', 'EVENTS', 'ANALOGUE_ENVELOPE',
]);
const ReferenceKindSchema = z.enum(['PERSONAL_ROLLING', 'HISTORICAL_RANGE', 'POPULATION', 'NONE']);
const ReferenceStatusSchema = z.enum(['UNAVAILABLE', 'FORMING', 'PROVISIONAL', 'ESTABLISHED']);
const ChangeKindSchema = z.enum(['NONE', 'ABSOLUTE', 'RELATIVE']);
const ChangeDirectionSchema = z.enum(['HIGHER', 'LOWER', 'FLAT', 'UNAVAILABLE']);
const ProductEligibilitySchema = z.enum([
  'PRODUCT_ELIGIBLE', 'PRODUCT_ELIGIBLE_WITH_QUALIFICATION', 'INTERNAL_ONLY',
]);
const EventTypeSchema = z.enum([
  'EXECUTION', 'STATE_OBSERVATION', 'CONTEXT_OBSERVATION', 'PLAN', 'ENTITY_CHANGE',
]);
const TimeRangeKindSchema = z.enum([
  'CALENDAR_RANGE', 'LAST_N_DAYS', 'LAST_N_OBSERVATIONS', 'MONTH', 'QUARTER',
  'HALF_YEAR', 'YEAR', 'ALL',
]);
const MissingnessReasonSchema = z.enum([
  'NOT_OBSERVED', 'NOT_AVAILABLE', 'NOT_APPLICABLE', 'PERMISSION_UNAVAILABLE',
  'SOURCE_MISSING', 'INSUFFICIENT_FOLLOW_UP', 'UNKNOWN',
]);

const AvailabilitySchema = z.object({
  state: ProductAvailabilityStateSchema,
  reason_codes: z.array(z.string()),
}).strict();

const ProvenanceSchema = z.object({
  observation_ids: z.array(z.string().min(1)),
  observation_count: z.number().int().nonnegative(),
  observation_set_hash: z.string().min(1).nullable(),
  source_artifact_ids: z.array(z.string().min(1)),
  method: z.string().min(1),
  method_version: z.string().min(1),
  instrument_version: z.string().min(1),
  model_id: z.string().min(1).nullable(),
  model_version: z.string().min(1).nullable(),
  lineage_hash: z.string().min(1).nullable(),
}).strict().superRefine((value, context) => {
  if (new Set(value.observation_ids).size !== value.observation_ids.length) {
    context.addIssue({ code: 'custom', message: 'Duplicate observation provenance IDs.' });
  }
  if (value.observation_ids.length > 0 && value.observation_ids.length !== value.observation_count) {
    context.addIssue({ code: 'custom', message: 'Explicit provenance IDs do not match observation_count.' });
  }
  if (value.observation_count > 0 && value.observation_ids.length === 0 && value.observation_set_hash == null) {
    context.addIssue({ code: 'custom', message: 'Non-empty provenance requires IDs or a set hash.' });
  }
});

const MissingnessSchema = z.object({
  counts: z.partialRecord(MissingnessReasonSchema, z.number().int().nonnegative()),
}).strict();

const ObservationSchema = z.object({
  observation_id: z.string().min(1),
  observed_at: DateTimeSchema,
  value: FiniteNumber,
  unit: z.string(),
  source_class: z.string().min(1),
}).strict();

const ReferenceSchema = z.object({
  kind: ReferenceKindSchema,
  status: ReferenceStatusSchema,
  value: NullableNumber,
  low: NullableNumber,
  high: NullableNumber,
  unit: z.string(),
  window_start: DateTimeSchema.nullable(),
  window_end: DateTimeSchema.nullable(),
  observation_count: z.number().int().nonnegative(),
  independent_period_count: z.number().int().nonnegative(),
  provenance: ProvenanceSchema,
}).strict().superRefine((value, context) => {
  if (value.status === 'UNAVAILABLE' && [value.value, value.low, value.high].some((item) => item != null)) {
    context.addIssue({ code: 'custom', message: 'Unavailable reference cannot carry values.' });
  }
  if (value.low != null && value.high != null && value.low > value.high) {
    context.addIssue({ code: 'custom', message: 'Reference range is reversed.' });
  }
});

const ChangeSchema = z.object({
  kind: ChangeKindSchema,
  direction: ChangeDirectionSchema,
  absolute: NullableNumber,
  relative: NullableNumber,
  from_value: NullableNumber,
  to_value: NullableNumber,
  comparison_window_key: z.string().nullable(),
}).strict().superRefine((value, context) => {
  if (value.kind === 'NONE' && [value.absolute, value.relative, value.from_value, value.to_value].some((item) => item != null)) {
    context.addIssue({ code: 'custom', message: 'No-comparison change cannot carry values.' });
  }
  if (value.kind === 'ABSOLUTE' && value.absolute == null) {
    context.addIssue({ code: 'custom', message: 'Absolute change requires absolute value.' });
  }
  if (value.kind === 'RELATIVE' && value.relative == null) {
    context.addIssue({ code: 'custom', message: 'Relative change requires relative value.' });
  }
});

const CoverageSchema = z.object({
  observation_count: z.number().int().nonnegative(),
  independent_period_count: z.number().int().nonnegative(),
  observed_period_count: z.number().int().nonnegative().nullable(),
  expected_period_count: z.number().int().nonnegative().nullable(),
  coverage_ratio: FiniteNumber.min(0).max(1).nullable(),
  missingness: MissingnessSchema,
}).strict();

const MaturitySchema = z.object({
  code: z.string().min(1),
  product_stage: z.string().min(1),
  evidence_stage: z.enum(['S0', 'S1', 'S2', 'S3']),
}).strict();

const EvidenceSchema = z.object({
  stage: z.enum(['S0', 'S1', 'S2', 'S3']),
  claim_type: z.string().min(1),
  observation_count: z.number().int().nonnegative(),
  independent_period_count: z.number().int().nonnegative(),
  support_count: z.number().int().nonnegative(),
  counterexample_count: z.number().int().nonnegative(),
  missingness: MissingnessSchema,
  limitation_codes: z.array(z.string()),
  provenance: ProvenanceSchema,
}).strict();

const TimeRangeSchema = z.object({
  key: z.string().min(1),
  kind: TimeRangeKindSchema,
  start: DateTimeSchema.nullable(),
  end: DateTimeSchema.nullable(),
  count: z.number().int().positive().nullable(),
  aggregation_bucket: z.string().min(1),
  observation_window_count: z.number().int().positive().nullable(),
}).strict();

const RangePointSchema = z.object({
  timestamp: DateTimeSchema,
  low: FiniteNumber,
  mid: FiniteNumber,
  high: FiniteNumber,
  source_ids: z.array(z.string().min(1)),
}).strict().superRefine((value, context) => {
  if (!(value.low <= value.mid && value.mid <= value.high)) {
    context.addIssue({ code: 'custom', message: 'Range point must satisfy low <= mid <= high.' });
  }
});

const CandleSchema = z.object({
  start: DateTimeSchema,
  end: DateTimeSchema,
  open: FiniteNumber,
  high: FiniteNumber,
  low: FiniteNumber,
  close: FiniteNumber,
  observation_count: z.number().int().positive(),
  source_ids: z.array(z.string().min(1)),
  representation: z.string().min(1),
  bucket_semantics: z.string().min(1),
  valid: z.literal(true),
}).strict().superRefine((value, context) => {
  if (Date.parse(value.start) >= Date.parse(value.end)) {
    context.addIssue({ code: 'custom', message: 'Candle interval is invalid.' });
  }
  if (value.high < Math.max(value.open, value.close, value.low)) {
    context.addIssue({ code: 'custom', message: 'Illegal candle high.' });
  }
  if (value.low > Math.min(value.open, value.close, value.high)) {
    context.addIssue({ code: 'custom', message: 'Illegal candle low.' });
  }
  if (value.source_ids.length !== value.observation_count) {
    context.addIssue({ code: 'custom', message: 'Candle source lineage count mismatch.' });
  }
});

const EventSchema = z.object({
  event_id: z.string().min(1),
  timestamp: DateTimeSchema,
  event_type: EventTypeSchema,
  label_key: z.string().min(1),
  source_entity_id: z.string().nullable(),
  executed: z.boolean().nullable(),
  eligibility: ProductEligibilitySchema,
  provenance: ProvenanceSchema,
}).strict().superRefine((value, context) => {
  if (value.event_type === 'PLAN' && value.executed === true) {
    context.addIssue({ code: 'custom', message: 'Plan and execution events must remain distinct.' });
  }
});

const SeriesSchema = z.object({
  series_id: z.string().min(1),
  instrument_id: z.string().min(1),
  construct_key: z.string().min(1),
  unit: z.string(),
  scale: ScaleSemanticsSchema,
  points: z.array(ObservationSchema),
  range_points: z.array(RangePointSchema),
  candles: z.record(z.string(), z.array(CandleSchema)),
  events: z.array(EventSchema),
  reference: ReferenceSchema,
  supported_chart_types: z.array(ChartTypeSchema),
  supported_ranges: z.array(TimeRangeSchema),
  default_range_key: z.string().nullable(),
  availability: AvailabilitySchema,
  provenance: ProvenanceSchema,
}).strict().superRefine((value, context) => {
  const pointIds = value.points.map((point) => point.observation_id);
  if (new Set(pointIds).size !== pointIds.length) {
    context.addIssue({ code: 'custom', message: 'Duplicate series observation IDs.' });
  }
  const ordered = value.points.every((point, index) => (
    index === 0
    || point.observed_at > value.points[index - 1].observed_at
    || (point.observed_at === value.points[index - 1].observed_at
      && point.observation_id >= value.points[index - 1].observation_id)
  ));
  if (!ordered) context.addIssue({ code: 'custom', message: 'Series points are not ordered.' });
  const pointSet = new Set(pointIds);
  Object.values(value.candles).flat().forEach((candle) => {
    if (candle.source_ids.some((id) => !pointSet.has(id))) {
      context.addIssue({ code: 'custom', message: 'Candle references unavailable observations.' });
    }
  });
  if (!value.supported_chart_types.includes('CANDLE') && Object.values(value.candles).some((rows) => rows.length > 0)) {
    context.addIssue({ code: 'custom', message: 'Candle payload lacks candle capability.' });
  }
  if (value.default_range_key != null && !value.supported_ranges.some((range) => range.key === value.default_range_key)) {
    context.addIssue({ code: 'custom', message: 'Default range is unsupported.' });
  }
});

const InstrumentSchema = z.object({
  instrument_id: z.string().min(1),
  entity_id: z.string().min(1),
  scope: ProductScopeSchema,
  construct_key: z.string().min(1),
  label_key: z.string().min(1),
  domain_key: z.string().min(1),
  unit: z.string(),
  scale: ScaleSemanticsSchema,
  latest: ObservationSchema.nullable(),
  reference: ReferenceSchema,
  change: ChangeSchema,
  coverage: CoverageSchema,
  maturity: MaturitySchema,
  evidence: EvidenceSchema,
  availability: AvailabilitySchema,
  series_ids: z.array(z.string().min(1)),
  supported_analysis_keys: z.array(z.string().min(1)),
  provenance: ProvenanceSchema,
}).strict().superRefine((value, context) => {
  if (value.scale === 'ORDINAL' && value.change.kind === 'RELATIVE') {
    context.addIssue({ code: 'custom', message: 'Ordinal instrument cannot expose relative change.' });
  }
  if (value.availability.state === 'AVAILABLE' && value.latest == null) {
    context.addIssue({ code: 'custom', message: 'Available instrument requires latest observation.' });
  }
});

const WatchlistItemSchema = z.object({
  instrument_id: z.string().min(1),
  latest: ObservationSchema.nullable(),
  reference: ReferenceSchema,
  change: ChangeSchema,
  sparkline: z.array(ObservationSchema).max(24),
  maturity: MaturitySchema,
  availability: AvailabilitySchema,
  updated_at: DateTimeSchema.nullable(),
}).strict();

const MarketMovementSchema = z.object({
  instrument_id: z.string().min(1),
  change: ChangeSchema,
  rank_basis: z.string().min(1),
}).strict();

const PersonalMarketSchema = z.object({
  instrument_ids: z.array(z.string().min(1)),
  watchlist: z.array(WatchlistItemSchema),
  top_movements: z.array(MarketMovementSchema).max(3),
  availability_counts: z.record(ProductAvailabilityStateSchema, z.number().int().nonnegative()),
  limitation_codes: z.array(z.string()),
}).strict().superRefine((value, context) => {
  if (!value.limitation_codes.includes('NO_COMPOSITE_PERSONAL_INDEX')) {
    context.addIssue({ code: 'custom', message: 'Personal Market must prohibit a composite life index.' });
  }
});

const EntitySurfaceSchema = z.object({
  entity_id: z.string().min(1),
  scope: z.enum(['GOAL', 'SKILL']),
  label: z.string(),
  linked_instrument_ids: z.array(z.string().min(1)),
  child_instrument_ids: z.array(z.string().min(1)),
  recent_activity: z.array(EventSchema),
  movement: ChangeSchema,
  availability: AvailabilitySchema,
  quant_deep_link: z.string().min(1),
  limitation_codes: z.array(z.string()),
}).strict();

const SignalSchema = z.object({
  signal_id: z.string().min(1),
  source_instrument_id: z.string().min(1),
  target_instrument_id: z.string().min(1),
  relationship_key: z.string().min(1),
  direction: ChangeDirectionSchema,
  lag_key: z.string().min(1),
  source_window_key: z.string().min(1),
  target_window_key: z.string().min(1),
  sample_count: z.number().int().nonnegative(),
  independent_period_count: z.number().int().nonnegative(),
  support_count: z.number().int().nonnegative(),
  counterexample_count: z.number().int().nonnegative(),
  magnitude: NullableNumber,
  interval: z.tuple([FiniteNumber, FiniteNumber]).nullable(),
  evidence: EvidenceSchema,
  availability: AvailabilitySchema,
  limitation_codes: z.array(z.string()),
  provenance: ProvenanceSchema,
}).strict().superRefine((value, context) => {
  if (!value.limitation_codes.some((code) => code.includes('CAUS') || code.includes('OBSERV'))) {
    context.addIssue({ code: 'custom', message: 'Signal lacks observational/causal limitation.' });
  }
});

const DriverCandidateSchema = z.object({
  candidate_id: z.string().min(1),
  driver_instrument_id: z.string().min(1),
  target_instrument_id: z.string().min(1),
  rank: z.number().int().positive(),
  evidence_status: z.string().min(1),
  recent_change: NullableNumber,
  lag_key: z.string().min(1),
  support_count: z.number().int().nonnegative(),
  counterexample_count: z.number().int().nonnegative(),
  independent_period_count: z.number().int().nonnegative(),
  missingness: MissingnessSchema,
  ranking_reason_key: z.string().min(1),
  evidence: EvidenceSchema,
  limitation_codes: z.array(z.string()),
}).strict();

const DriverAnalysisSchema = z.object({
  status: AvailabilitySchema,
  target_instrument_id: z.string().min(1),
  current_value: NullableNumber,
  reference_value: NullableNumber,
  deviation: NullableNumber,
  candidates: z.array(DriverCandidateSchema),
  competing_candidate_ids: z.array(z.string()),
  unresolved_explanation_keys: z.array(z.string()),
}).strict();

const SimilarPeriodSchema = z.object({
  period_id: z.string().min(1),
  start_at: DateTimeSchema,
  end_at: DateTimeSchema,
  distance: FiniteNumber.nonnegative(),
  matching_feature_keys: z.array(z.string()),
  different_feature_keys: z.array(z.string()),
  subsequent_series: z.array(ObservationSchema),
  evidence: EvidenceSchema,
  timeline_jump: TimeRangeSchema,
}).strict();

const SimilarPeriodsSchema = z.object({
  status: AvailabilitySchema,
  feature_keys: z.array(z.string()),
  periods: z.array(SimilarPeriodSchema),
  self_match_excluded: z.boolean(),
  future_leakage_check_passed: z.boolean(),
}).strict().superRefine((value, context) => {
  if (value.periods.length > 0 && (!value.self_match_excluded || !value.future_leakage_check_passed)) {
    context.addIssue({ code: 'custom', message: 'Similar periods failed leakage gates.' });
  }
});

const RecoverySchema = z.object({
  status: AvailabilitySchema,
  semantics: z.enum(['HISTORICAL_ANALOGUE', 'VALIDATED_FORECAST']),
  reference_path: z.array(z.object({
    offset_days: z.number().int().nonnegative(),
    median_deviation: FiniteNumber,
    low_deviation: FiniteNumber,
    high_deviation: FiniteNumber,
    episode_count: z.number().int().nonnegative(),
  }).strict()),
  historical_episode_ids: z.array(z.string()),
  forecast_allowed: z.boolean(),
  limitation_codes: z.array(z.string()),
}).strict().superRefine((value, context) => {
  if (value.semantics === 'HISTORICAL_ANALOGUE' && value.forecast_allowed) {
    context.addIssue({ code: 'custom', message: 'Historical analogue cannot be a forecast.' });
  }
});

const ScenarioBranchSchema = z.object({
  branch_id: z.string().min(1),
  action_value: z.string().min(1),
  comparable_period_count: z.number().int().nonnegative(),
  observed_outcome_change: NullableNumber,
  support_count: z.number().int().nonnegative(),
  counterexample_count: z.number().int().nonnegative(),
  missing_outcome_count: z.number().int().nonnegative(),
  evidence: EvidenceSchema,
  limitation_codes: z.array(z.string()),
}).strict();

const ScenarioSchema = z.object({
  status: AvailabilitySchema,
  action_construct: z.string().min(1),
  branches: z.array(ScenarioBranchSchema),
  claim_type: z.string().min(1),
  observed_branch_difference: NullableNumber,
  causal_effect_estimated: z.literal(false),
  confounding_warning_keys: z.array(z.string()),
  selection_bias_warning_key: z.string().min(1),
}).strict().superRefine((value, context) => {
  if (value.claim_type.toLowerCase() === 'causal') {
    context.addIssue({ code: 'custom', message: 'Scenario comparison cannot be causal.' });
  }
});

const DecisionCandidateSchema = z.object({
  candidate_id: z.string().min(1),
  action_key: z.string().min(1),
  status: z.string().min(1),
  evidence_ids: z.array(z.string()),
  analogue_period_ids: z.array(z.string()),
  uncertainty_codes: z.array(z.string()),
  downside_risk_key: z.string().min(1),
  reversibility_key: z.string().min(1),
  missing_information_keys: z.array(z.string()),
  outcome_to_observe_key: z.string().min(1),
}).strict();

const DecisionSupportSchema = z.object({
  status: AvailabilitySchema,
  candidates: z.array(DecisionCandidateSchema),
  leading_candidate_id: z.string().nullable(),
  next_useful_observation_key: z.string().min(1),
  handoff_authority: z.literal('today_decision'),
  automatic_execution: z.literal(false),
}).strict();

const InterpretationSchema = z.object({
  availability: AvailabilitySchema,
  as_of: DateTimeSchema,
  target_instrument_id: z.string().min(1),
  observed_claims: z.array(z.record(z.string(), z.unknown())),
  driver_analysis: DriverAnalysisSchema.nullable(),
  similar_periods: SimilarPeriodsSchema.nullable(),
  recovery: RecoverySchema.nullable(),
  scenario: ScenarioSchema.nullable(),
  decision_support: DecisionSupportSchema.nullable(),
  uncertainty_codes: z.array(z.string()),
  next_useful_observation_key: z.string().nullable(),
  provenance: ProvenanceSchema,
}).strict();

const AnalystContextSchema = z.object({
  selected_instrument_id: z.string().nullable(),
  selected_range_key: z.string().nullable(),
  compare_instrument_ids: z.array(z.string()),
  evidence_ids: z.array(z.string()),
  driver_candidate_ids: z.array(z.string()),
  similar_period_ids: z.array(z.string()),
  recovery_available: z.boolean(),
  scenario_available: z.boolean(),
  operation_keys: z.array(z.string()),
}).strict();

const EligibilitySummarySchema = z.object({
  emitted_artifact_count: z.number().int().nonnegative(),
  blocked_research_artifact_count: z.number().int().nonnegative(),
  blocked_artifact_kinds: z.array(z.string()),
  champion_keys: z.record(z.string(), z.string()),
}).strict();

const MetadataSchema = z.object({
  contract_version: z.literal(QUANT_PRODUCT_CONTRACT_VERSION),
  contract_schema_hash: z.literal(QUANT_PRODUCT_SCHEMA_HASH),
  bundle_id: z.string().min(1),
  mode: BundleModeSchema,
  scope: ProductScopeSchema,
  subject_id: z.string().min(1),
  entity_id: z.string().nullable(),
  as_of: DateTimeSchema,
  generated_at: DateTimeSchema,
  source_snapshot_hash: z.string().min(1),
  engine_versions: z.record(z.string(), z.string()),
  feature_versions: z.record(z.string(), z.string()),
  instrument_versions: z.record(z.string(), z.string()),
  eligibility: z.literal('PRODUCT_ELIGIBLE'),
  staleness: z.object({
    state: z.enum(['CURRENT', 'STALE', 'UNKNOWN']),
    source_as_of: DateTimeSchema,
    evaluated_at: DateTimeSchema,
    stale_after: DateTimeSchema.nullable(),
  }).strict(),
  synthetic_only: z.boolean(),
  contains_real_user_data: z.boolean(),
}).strict();

const BundleCoreSchema = z.object({
  metadata: MetadataSchema,
  instruments: z.array(InstrumentSchema),
  series: z.array(SeriesSchema),
  personal_market: PersonalMarketSchema.nullable(),
  goal_surfaces: z.array(EntitySurfaceSchema),
  skill_surfaces: z.array(EntitySurfaceSchema),
  signals: z.array(SignalSchema),
  interpretation: z.unknown().nullable(),
  analyst_context: AnalystContextSchema,
  eligibility_summary: EligibilitySummarySchema,
  limitation_codes: z.array(z.string()),
}).strict().superRefine((value, context) => {
  const instrumentIds = value.instruments.map((item) => item.instrument_id);
  const seriesIds = value.series.map((item) => item.series_id);
  if (new Set(instrumentIds).size !== instrumentIds.length) {
    context.addIssue({ code: 'custom', path: ['instruments'], message: 'Duplicate instrument IDs.' });
  }
  if (new Set(seriesIds).size !== seriesIds.length) {
    context.addIssue({ code: 'custom', path: ['series'], message: 'Duplicate series IDs.' });
  }
  const seriesSet = new Set(seriesIds);
  value.instruments.forEach((instrument, index) => {
    if (instrument.series_ids.some((id) => !seriesSet.has(id))) {
      context.addIssue({ code: 'custom', path: ['instruments', index, 'series_ids'], message: 'Missing referenced series.' });
    }
  });
  const asOf = Date.parse(value.metadata.as_of);
  value.series.forEach((series, index) => {
    if (series.points.some((point) => Date.parse(point.observed_at) > asOf)) {
      context.addIssue({ code: 'custom', path: ['series', index, 'points'], message: 'Future observation exceeds as_of.' });
    }
  });
  if (value.metadata.mode === 'COMPACT' && (value.series.length > 0 || value.signals.length > 0 || value.interpretation != null)) {
    context.addIssue({ code: 'custom', message: 'Compact bundle contains full analytical payload.' });
  }
});

export const QuantProductBundleV1Schema = BundleCoreSchema.transform((core, context) => {
  if (core.interpretation == null) return { ...core, interpretation: null };
  const parsed = InterpretationSchema.safeParse(core.interpretation);
  if (!parsed.success) {
    parsed.error.issues.forEach((issue) => context.addIssue({
      code: 'custom',
      path: ['interpretation', ...issue.path],
      message: issue.message,
    }));
    return z.NEVER;
  }
  if (parsed.data.as_of !== core.metadata.as_of) {
    context.addIssue({ code: 'custom', path: ['interpretation', 'as_of'], message: 'Interpretation as_of mismatch.' });
    return z.NEVER;
  }
  return { ...core, interpretation: parsed.data };
});

export type QuantProductBundleV1 = z.infer<typeof QuantProductBundleV1Schema>;
export type QuantProductInstrumentV1 = z.infer<typeof InstrumentSchema>;
export type QuantProductSeriesV1 = z.infer<typeof SeriesSchema>;
export type QuantProductInterpretationV1 = z.infer<typeof InterpretationSchema>;

export type QuantProductParseFailureCode =
  | 'MISSING_CONTRACT_VERSION'
  | 'UNSUPPORTED_CONTRACT_VERSION'
  | 'SCHEMA_HASH_MISMATCH'
  | 'INVALID_PRODUCT_BUNDLE';

export type QuantProductParseResult =
  | { ok: true; bundle: QuantProductBundleV1; warnings: string[] }
  | { ok: false; code: QuantProductParseFailureCode; issues: string[] };

export function parseQuantProductBundleV1(value: unknown): QuantProductParseResult {
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : null;
  const metadata = record?.metadata && typeof record.metadata === 'object'
    ? record.metadata as Record<string, unknown>
    : null;
  if (typeof metadata?.contract_version !== 'string') {
    return { ok: false, code: 'MISSING_CONTRACT_VERSION', issues: ['metadata.contract_version is required.'] };
  }
  if (metadata.contract_version !== QUANT_PRODUCT_CONTRACT_VERSION) {
    return { ok: false, code: 'UNSUPPORTED_CONTRACT_VERSION', issues: [`Unsupported contract ${metadata.contract_version}.`] };
  }
  if (metadata.contract_schema_hash !== QUANT_PRODUCT_SCHEMA_HASH) {
    return { ok: false, code: 'SCHEMA_HASH_MISMATCH', issues: ['Quant Product schema hash mismatch.'] };
  }

  const core = BundleCoreSchema.safeParse(value);
  if (!core.success) {
    return {
      ok: false,
      code: 'INVALID_PRODUCT_BUNDLE',
      issues: core.error.issues.map((issue) => `${issue.path.join('.') || '$'}: ${issue.message}`),
    };
  }
  if (core.data.interpretation == null) {
    return { ok: true, bundle: { ...core.data, interpretation: null } as QuantProductBundleV1, warnings: [] };
  }
  const interpretation = InterpretationSchema.safeParse(core.data.interpretation);
  if (!interpretation.success || interpretation.data.as_of !== core.data.metadata.as_of) {
    return {
      ok: true,
      bundle: { ...core.data, interpretation: null } as QuantProductBundleV1,
      warnings: ['OPTIONAL_INTERPRETATION_REJECTED'],
    };
  }
  return {
    ok: true,
    bundle: { ...core.data, interpretation: interpretation.data } as QuantProductBundleV1,
    warnings: [],
  };
}
