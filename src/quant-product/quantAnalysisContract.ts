import { z } from 'zod';

export const QUANT_ANALYSIS_CONTRACT_VERSION = 'questlife.quant.analysis.v1' as const;

const DateTimeSchema = z.string().refine(
  (value) => Number.isFinite(Date.parse(value)) && /(?:Z|[+-]\d{2}:\d{2})$/.test(value),
  'Expected a timezone-aware ISO datetime.',
);
const FiniteNumber = z.number().finite();
const NullableFinite = FiniteNumber.nullable();

const AnalysisPointSchema = z.object({
  observed_at: DateTimeSchema,
  value: FiniteNumber,
  source_observation_ids: z.array(z.string().min(1)).min(1),
}).strict();

const IndicatorSeriesSchema = z.object({
  indicator_id: z.string().min(1),
  instrument_id: z.string().min(1),
  layer_kind: z.enum(['EWMA_SHORT', 'EWMA_LONG']),
  unit: z.string(),
  points: z.array(AnalysisPointSchema),
  method: z.literal('time_aware_half_life_ewma'),
  parameter_key: z.string().min(1),
  product_label_key: z.string().min(1),
  limitation_codes: z.array(z.string()),
}).strict().superRefine((value, context) => {
  if (!value.limitation_codes.includes('EWMA_IS_NOT_A_PREDICTION')) {
    context.addIssue({ code: 'custom', message: 'EWMA layer lacks forecast limitation.' });
  }
  if (!value.points.every((point, index) => index === 0 || point.observed_at >= value.points[index - 1].observed_at)) {
    context.addIssue({ code: 'custom', message: 'Indicator points are not ordered.' });
  }
});

const CompareOverlapSchema = z.object({
  target_instrument_id: z.string().min(1),
  compare_instrument_id: z.string().min(1),
  matching_window_key: z.string().min(1),
  overlapping_window_count: z.number().int().nonnegative(),
  first_overlap_at: DateTimeSchema.nullable(),
  last_overlap_at: DateTimeSchema.nullable(),
  limitation_codes: z.array(z.string()),
}).strict();

const ModelValidationSchema = z.object({
  strategy: z.literal('blocked_forward_validation'),
  fold_count: z.number().int().nonnegative(),
  held_out_observation_count: z.number().int().nonnegative(),
  held_out_mae: NullableFinite,
  target_mad: NullableFinite,
  selected_ridge_penalty: NullableFinite,
  future_leakage_check_passed: z.boolean(),
  limitation_codes: z.array(z.string()),
}).strict();

const JointDriverSchema = z.object({
  driver_id: z.string().min(1),
  predictor_instrument_id: z.string().min(1),
  target_instrument_id: z.string().min(1),
  lag_periods: z.number().int().nonnegative(),
  rolling_periods: z.number().int().positive(),
  coefficient_target_units: FiniteNumber,
  current_predictor_value: FiniteNumber,
  contribution_target_units: FiniteNumber,
  stability: z.enum(['STABLE', 'MODERATE', 'UNSTABLE', 'INSUFFICIENT']),
  stability_fold_count: z.number().int().nonnegative(),
  sign_agreement_ratio: FiniteNumber.min(0).max(1).nullable(),
  complete_observation_count: z.number().int().nonnegative(),
  missing_observation_count: z.number().int().nonnegative(),
  collinearity_group_id: z.string().nullable(),
  limitation_codes: z.array(z.string()),
}).strict().superRefine((value, context) => {
  if (!value.limitation_codes.some((code) => code.includes('CAUS') || code.includes('ASSOCI'))) {
    context.addIssue({ code: 'custom', message: 'Joint driver lacks association limitation.' });
  }
});

const JointAnalysisSchema = z.object({
  analysis_id: z.string().min(1),
  status: z.enum(['AVAILABLE', 'FORMING', 'INSUFFICIENT_DATA', 'ABSTAINED', 'NOT_SUPPORTED']),
  target_instrument_id: z.string().min(1),
  target_unit: z.string(),
  model_family: z.literal('time_aware_regularized_regression'),
  model_version: z.string().min(1),
  window_start: DateTimeSchema.nullable(),
  window_end: DateTimeSchema.nullable(),
  candidate_variable_count: z.number().int().nonnegative(),
  eligible_variable_count: z.number().int().nonnegative(),
  complete_observation_count: z.number().int().nonnegative(),
  excluded_observation_count: z.number().int().nonnegative(),
  observed_value: NullableFinite,
  reference_value: NullableFinite,
  observed_deviation: NullableFinite,
  model_attributed_deviation: NullableFinite,
  residual_deviation: NullableFinite,
  drivers: z.array(JointDriverSchema),
  validation: ModelValidationSchema,
  collinearity_groups: z.array(z.array(z.string().min(1)).min(2)),
  source_observation_ids: z.array(z.string().min(1)),
  source_observation_set_hash: z.string().min(1).nullable(),
  limitation_codes: z.array(z.string()),
}).strict().superRefine((value, context) => {
  if (!value.limitation_codes.includes('OBSERVATIONAL_NOT_CAUSAL')
    || !value.limitation_codes.includes('RESIDUAL_REMAINS_UNEXPLAINED')) {
    context.addIssue({ code: 'custom', message: 'Joint analysis lacks required interpretation boundaries.' });
  }
  if (value.status === 'AVAILABLE') {
    const values = [
      value.observed_value,
      value.reference_value,
      value.observed_deviation,
      value.model_attributed_deviation,
      value.residual_deviation,
    ];
    if (values.some((item) => item == null)) {
      context.addIssue({ code: 'custom', message: 'Available analysis lacks decomposition values.' });
    }
    if (!value.validation.future_leakage_check_passed) {
      context.addIssue({ code: 'custom', message: 'Available analysis failed leakage validation.' });
    }
    if (value.observed_deviation != null && value.model_attributed_deviation != null && value.residual_deviation != null
      && Math.abs(value.observed_deviation - value.model_attributed_deviation - value.residual_deviation) > 1e-7) {
      context.addIssue({ code: 'custom', message: 'Analysis decomposition is inconsistent.' });
    }
  }
});

export const QuantAnalysisExtensionV1Schema = z.object({
  contract_version: z.literal(QUANT_ANALYSIS_CONTRACT_VERSION),
  artifact_id: z.string().min(1),
  base_product_contract_version: z.literal('questlife.quant.product.v1'),
  base_bundle_id: z.string().min(1),
  as_of: DateTimeSchema,
  generated_at: DateTimeSchema,
  synthetic_only: z.boolean(),
  contains_real_user_data: z.boolean(),
  indicator_series: z.array(IndicatorSeriesSchema),
  compare_overlaps: z.array(CompareOverlapSchema),
  joint_analyses: z.array(JointAnalysisSchema),
  limitation_codes: z.array(z.string()),
}).strict().superRefine((value, context) => {
  const required = [
    'OBSERVATIONAL_NOT_CAUSAL',
    'MISSING_IS_NOT_ZERO',
    'NO_FORECAST_OUTPUT',
    'RESEARCH_MODELS_EXCLUDED',
  ];
  required.forEach((code) => {
    if (!value.limitation_codes.includes(code)) {
      context.addIssue({ code: 'custom', message: `Missing analysis firewall: ${code}` });
    }
  });
  if (value.synthetic_only === value.contains_real_user_data) {
    context.addIssue({ code: 'custom', message: 'Analysis provenance flags are inconsistent.' });
  }
  if (Date.parse(value.generated_at) < Date.parse(value.as_of)) {
    context.addIssue({ code: 'custom', message: 'Analysis generated_at precedes as_of.' });
  }
});

export type QuantAnalysisExtensionV1 = z.infer<typeof QuantAnalysisExtensionV1Schema>;
export type QuantIndicatorSeriesV1 = z.infer<typeof IndicatorSeriesSchema>;
export type QuantJointAnalysisV1 = z.infer<typeof JointAnalysisSchema>;
export type QuantJointDriverV1 = z.infer<typeof JointDriverSchema>;

export type QuantAnalysisParseResult =
  | { ok: true; extension: QuantAnalysisExtensionV1 }
  | { ok: false; issues: string[] };

export function parseQuantAnalysisExtensionV1(value: unknown): QuantAnalysisParseResult {
  const parsed = QuantAnalysisExtensionV1Schema.safeParse(value);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => `${issue.path.join('.') || '$'}: ${issue.message}`),
    };
  }
  return { ok: true, extension: parsed.data };
}
