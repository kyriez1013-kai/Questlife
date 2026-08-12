export type QuantInterpretationStatus = 'AVAILABLE' | 'INSUFFICIENT';

export type QuantInterpretationContext = {
  artifact_id: string;
  subject_id: string;
  as_of: string;
  target_construct: string;
  window_start: string;
  window_end: string;
  evidence_ids: string[];
  available_constructs: string[];
  unavailable_constructs: string[];
  missingness: Record<string, Record<string, number>>;
  method_version: string;
  limitations: string[];
  lineage: Record<string, unknown>;
};

export type QuantTargetMovement = {
  current_value: number | null;
  baseline_value: number | null;
  deviation: number | null;
  unit: string;
  current_source_ids: string[];
  baseline_source_ids: string[];
};

export type QuantDriverCandidate = {
  candidate_id: string;
  driver_construct: string;
  rank: number;
  evidence_status:
    | 'STRONG_OBSERVATIONAL_FIT'
    | 'MODERATE_OBSERVATIONAL_FIT'
    | 'WEAK_OR_MIXED'
    | 'CONFLICTING'
    | 'INSUFFICIENT';
  evidence_grade: string;
  observed_recent_value: number | null;
  observed_reference_value: number | null;
  observed_recent_change: number | null;
  unit: string;
  temporal_relationship: string;
  effect_estimate: number | null;
  interval: [number, number] | null;
  support_count: number;
  counterexample_count: number;
  independent_period_count: number;
  missingness: Record<string, number>;
  evidence_ids: string[];
  alternative_explanations: string[];
  ranking_reason: string;
  limitations: string[];
};

export type QuantDriverAnalysis = {
  context: QuantInterpretationContext;
  status: QuantInterpretationStatus;
  target_movement: QuantTargetMovement;
  candidates: QuantDriverCandidate[];
  competing_candidate_ids: string[];
  unresolved_explanations: string[];
};

export type QuantFeatureComparison = {
  feature_key: string;
  current_value: number | null;
  historical_value: number | null;
  unit: string;
  scale: number | null;
  distance_contribution: number | null;
  current_missing: boolean;
  historical_missing: boolean;
  source_ids: string[];
};

export type QuantTrajectoryPoint = {
  offset_days: number;
  observed_at: string;
  value: number;
  baseline_deviation: number | null;
  source_ids: string[];
};

export type QuantSimilarPeriod = {
  period_id: string;
  start_at: string;
  end_at: string;
  distance: number;
  feature_comparisons: QuantFeatureComparison[];
  matching_feature_keys: string[];
  different_feature_keys: string[];
  evidence_ids: string[];
  subsequent_trajectory: QuantTrajectoryPoint[];
};

export type QuantSimilarPeriods = {
  context: QuantInterpretationContext;
  status: QuantInterpretationStatus;
  feature_registry: string[];
  current_features: Record<string, number | null>;
  periods: QuantSimilarPeriod[];
  self_match_excluded: true;
  future_leakage_check_passed: true;
};

export type QuantRecoveryTrajectory = {
  context: QuantInterpretationContext;
  status: QuantInterpretationStatus;
  projection_semantics: 'HISTORICAL_ANALOGUE';
  display_style: 'historical_analogue_dashed_envelope';
  episodes: Array<{ period_id: string; points: QuantTrajectoryPoint[] }>;
  reference_path: Array<{
    offset_days: number;
    median_deviation: number;
    low_deviation: number;
    high_deviation: number;
    episode_count: number;
  }>;
  excluded_period_ids: string[];
  forecast_allowed: false;
};

export type QuantScenarioBranch = {
  branch_id: string;
  action_value: string;
  comparable_episode_count: number;
  episodes: Array<{
    period_id: string;
    action_observation_id: string;
    action_at: string;
    outcome_change: number | null;
    days_to_near_reference: number | null;
    outcome_source_ids: string[];
  }>;
  median_outcome_change: number | null;
  median_days_to_near_reference: number | null;
  support_count: number;
  counterexample_count: number;
  missing_outcome_count: number;
  evidence_ids: string[];
  limitations: string[];
};

export type QuantScenarioComparison = {
  context: QuantInterpretationContext;
  status: QuantInterpretationStatus;
  action_construct: string;
  branches: QuantScenarioBranch[];
  claim_type: 'descriptive';
  observed_branch_difference: number | null;
  causal_effect_estimated: false;
  confounding_warnings: string[];
  selection_bias_warning: string;
};

export type QuantInterpretationClaim = {
  claim_id: string;
  section: 'OBSERVED' | 'CANDIDATE_DRIVERS' | 'COUNTEREVIDENCE' | 'SIMILAR_PERIODS' | 'WHAT_FOLLOWED' | 'NEXT_ACTION' | 'UNCERTAINTY';
  statement_key: string;
  values: Record<string, unknown>;
  claim_type: 'descriptive' | 'association' | 'prediction' | 'policy';
  evidence_grade: string;
  evidence_ids: string[];
  limitation_ids: string[];
};

export type QuantInterpretationBrief = {
  context: QuantInterpretationContext;
  status: QuantInterpretationStatus;
  claims: QuantInterpretationClaim[];
  candidate_driver_ids: string[];
  counterevidence_driver_ids: string[];
  similar_period_ids: string[];
  uncertainty_codes: string[];
  next_useful_observation: string;
};

export type QuantDecisionCandidate = {
  candidate_id: string;
  action_key: string;
  status: 'OBSERVATIONAL_SUPPORT' | 'MIXED_EVIDENCE' | 'INSUFFICIENT_EVIDENCE';
  evidence_ids: string[];
  analogue_period_ids: string[];
  uncertainty_codes: string[];
  downside_risk: string;
  reversibility: string;
  missing_information: string[];
  outcome_to_observe: string;
};

export type QuantDecisionSupport = {
  context: QuantInterpretationContext;
  status: QuantInterpretationStatus;
  candidates: QuantDecisionCandidate[];
  leading_candidate_id: string | null;
  next_useful_observation: string;
  handoff_authority: 'today_decision';
  automatic_execution: false;
};

export type QuantInterpretationBundle = {
  bundle_id: string;
  driver_analysis: QuantDriverAnalysis;
  similar_periods: QuantSimilarPeriods;
  recovery_trajectory: QuantRecoveryTrajectory;
  scenario_comparison: QuantScenarioComparison;
  brief: QuantInterpretationBrief;
  decision_support: QuantDecisionSupport;
};
