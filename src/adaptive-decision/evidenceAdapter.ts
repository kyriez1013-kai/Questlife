import {
  parseQuantAnalysisExtensionV1,
  type QuantAnalysisExtensionV1,
  type QuantJointAnalysisV1,
} from '../quant-product/quantAnalysisContract';
import {
  parseQuantProductBundleV1,
  type QuantProductBundleV1,
  type QuantProductInstrumentV1,
} from '../quant-product/quantProductContract';
import type {
  DecisionContextSnapshotV1,
  DecisionEvidenceItemV1,
  DecisionEvidencePacketV1,
  DecisionQuestionType,
} from './decisionEpisode';
import { DECISION_EVIDENCE_CONTRACT_VERSION } from './decisionEpisode';

export type BuildDecisionEvidenceInput = {
  questionType: DecisionQuestionType;
  context: DecisionContextSnapshotV1;
  asOf: string;
  mode: 'owner' | 'demo';
  quantProduct?: unknown;
  quantAnalysis?: unknown;
};

export type BuildDecisionEvidenceResult = {
  packet: DecisionEvidencePacketV1;
  parseIssues: string[];
};

function targetCandidates(questionType: DecisionQuestionType): string[] {
  if (questionType === 'training_recovery') {
    return ['market:execution.load', 'market:activity.minutes', 'market:state.focus', 'market:sleep.duration'];
  }
  if (questionType === 'cognitive_adjustment') {
    return ['market:state.focus', 'market:sleep.duration', 'market:execution.load'];
  }
  if (questionType === 'overloaded_day') {
    return ['market:execution.load', 'market:state.focus', 'market:schedule.disruption'];
  }
  return ['market:state.focus', 'market:execution.load', 'market:sleep.duration'];
}

function pickInstrument(bundle: QuantProductBundleV1 | undefined, questionType: DecisionQuestionType): QuantProductInstrumentV1 | undefined {
  if (!bundle) return undefined;
  const candidates = targetCandidates(questionType);
  return candidates.map((id) => bundle.instruments.find((item) => item.instrument_id === id)).find(Boolean);
}

function futureOrIneligible(
  bundle: QuantProductBundleV1,
  asOf: string,
  mode: 'owner' | 'demo',
): string | null {
  if (Date.parse(bundle.metadata.as_of) > Date.parse(asOf)) return 'QUANT_ARTIFACT_AFTER_DECISION_AS_OF';
  if (mode === 'owner' && (bundle.metadata.synthetic_only || !bundle.metadata.contains_real_user_data)) {
    return 'SYNTHETIC_QUANT_EXCLUDED_FROM_OWNER_MODE';
  }
  if (mode === 'demo' && !bundle.metadata.synthetic_only) return 'REAL_USER_QUANT_EXCLUDED_FROM_DEMO_MODE';
  if (bundle.metadata.eligibility !== 'PRODUCT_ELIGIBLE') return 'QUANT_PRODUCT_NOT_ELIGIBLE';
  return null;
}

function analysisIneligible(
  extension: QuantAnalysisExtensionV1,
  asOf: string,
  mode: 'owner' | 'demo',
): string | null {
  if (Date.parse(extension.as_of) > Date.parse(asOf)) return 'QUANT_ANALYSIS_AFTER_DECISION_AS_OF';
  if (mode === 'owner' && (extension.synthetic_only || !extension.contains_real_user_data)) {
    return 'SYNTHETIC_ANALYSIS_EXCLUDED_FROM_OWNER_MODE';
  }
  if (mode === 'demo' && !extension.synthetic_only) return 'REAL_USER_ANALYSIS_EXCLUDED_FROM_DEMO_MODE';
  return null;
}

function sourceArtifacts(instrument?: QuantProductInstrumentV1): string[] {
  if (!instrument) return [];
  return Array.from(new Set([
    ...instrument.provenance.source_artifact_ids,
    ...instrument.reference.provenance.source_artifact_ids,
    ...instrument.evidence.provenance.source_artifact_ids,
  ]));
}

function latestValue(series: QuantAnalysisExtensionV1['indicator_series'][number] | undefined) {
  return series?.points[series.points.length - 1];
}

function matchingJointAnalysis(
  extension: QuantAnalysisExtensionV1 | undefined,
  instrument: QuantProductInstrumentV1 | undefined,
): QuantJointAnalysisV1 | undefined {
  if (!extension || !instrument) return undefined;
  return extension.joint_analyses.find((analysis) => (
    analysis.target_instrument_id === instrument.instrument_id
    && analysis.status === 'AVAILABLE'
    && analysis.validation.future_leakage_check_passed
  ));
}

function numberOrUndefined(value: number | null): number | undefined {
  return value == null ? undefined : value;
}

export function buildDecisionEvidence(input: BuildDecisionEvidenceInput): BuildDecisionEvidenceResult {
  const parseIssues: string[] = [];
  const parsedProduct = input.quantProduct == null ? null : parseQuantProductBundleV1(input.quantProduct);
  if (parsedProduct?.ok === false) parseIssues.push(...parsedProduct.issues.map((issue) => `product:${issue}`));
  let bundle = parsedProduct?.ok === true ? parsedProduct.bundle : undefined;
  if (bundle) {
    const issue = futureOrIneligible(bundle, input.asOf, input.mode);
    if (issue) {
      parseIssues.push(issue);
      bundle = undefined;
    }
  }

  const parsedAnalysis = input.quantAnalysis == null ? null : parseQuantAnalysisExtensionV1(input.quantAnalysis);
  if (parsedAnalysis?.ok === false) parseIssues.push(...parsedAnalysis.issues.map((issue) => `analysis:${issue}`));
  let analysis = parsedAnalysis?.ok === true ? parsedAnalysis.extension : undefined;
  if (analysis) {
    const issue = analysisIneligible(analysis, input.asOf, input.mode);
    if (issue) {
      parseIssues.push(issue);
      analysis = undefined;
    }
  }

  const instrument = pickInstrument(bundle, input.questionType);
  const interpretation = bundle?.interpretation && instrument
    && bundle.interpretation.target_instrument_id === instrument.instrument_id
    ? bundle.interpretation
    : undefined;
  const joint = matchingJointAnalysis(analysis, instrument);
  const items: DecisionEvidenceItemV1[] = [];
  const limitations = new Set<string>([
    ...(bundle?.limitation_codes ?? []),
    ...(instrument?.evidence.limitation_codes ?? []),
    ...(interpretation?.uncertainty_codes ?? []),
    ...(analysis?.limitation_codes ?? []),
    ...input.context.limitations,
  ]);
  const missingness = new Set<string>(input.context.missingness.map((item) => item.code));

  if (instrument?.latest) {
    items.push({
      id: 'evidence-fact-current',
      category: 'fact',
      labelKey: 'adaptiveEvidenceCurrentFact',
      values: { value: instrument.latest.value, unit: instrument.latest.unit },
      sourceIds: [instrument.latest.observation_id],
    });
  } else if (input.context.currentState) {
    items.push({
      id: 'evidence-fact-state',
      category: 'fact',
      labelKey: 'adaptiveEvidenceCurrentState',
      values: { value: input.context.currentState.overall, unit: '/5' },
      sourceIds: [input.context.currentState.sourceId],
    });
  }

  if (instrument && instrument.reference.status !== 'UNAVAILABLE') {
    items.push({
      id: 'evidence-personal-reference',
      category: 'personal_comparison',
      labelKey: 'adaptiveEvidencePersonalReference',
      values: {
        current: instrument.latest?.value ?? '',
        reference: instrument.reference.value ?? '',
        unit: instrument.reference.unit,
      },
      sourceIds: instrument.reference.provenance.observation_ids,
      limitationCodes: instrument.reference.provenance.observation_count > 0 ? [] : ['REFERENCE_LINEAGE_HASH_ONLY'],
    });
  } else {
    missingness.add('PERSONAL_REFERENCE_UNAVAILABLE');
  }

  const shortSeries = analysis?.indicator_series.find((series) => (
    series.instrument_id === instrument?.instrument_id && series.layer_kind === 'EWMA_SHORT'
  ));
  const longSeries = analysis?.indicator_series.find((series) => (
    series.instrument_id === instrument?.instrument_id && series.layer_kind === 'EWMA_LONG'
  ));
  const shortPoint = latestValue(shortSeries);
  const longPoint = latestValue(longSeries);
  if (!shortPoint && !longPoint) missingness.add('EWMA_UNAVAILABLE');

  if (joint?.observed_deviation != null && joint.model_attributed_deviation != null && joint.residual_deviation != null) {
    items.push({
      id: 'evidence-joint-model',
      category: 'joint_evidence',
      labelKey: 'adaptiveEvidenceJointModel',
      values: {
        deviation: joint.observed_deviation,
        associated: joint.model_attributed_deviation,
        residual: joint.residual_deviation,
      },
      sourceIds: joint.source_observation_ids,
      limitationCodes: joint.limitation_codes,
    });
  } else {
    missingness.add('MULTIVARIATE_EVIDENCE_UNAVAILABLE');
  }

  const driverCandidates = interpretation?.driver_analysis?.candidates ?? [];
  const jointDrivers = (joint?.drivers ?? []).slice(0, 3).map((driver) => {
    const productCandidate = driverCandidates.find((candidate) => candidate.driver_instrument_id === driver.predictor_instrument_id);
    return {
      id: driver.driver_id,
      label: driver.predictor_instrument_id,
      contribution: driver.contribution_target_units,
      lagPeriods: driver.lag_periods,
      supportCount: productCandidate?.support_count ?? 0,
      counterexampleCount: productCandidate?.counterexample_count ?? 0,
      stability: driver.stability,
      limitationCodes: Array.from(new Set([...driver.limitation_codes, ...(productCandidate?.limitation_codes ?? [])])),
    };
  });
  driverCandidates.slice(0, 3).forEach((candidate) => items.push({
    id: `evidence-driver-${candidate.candidate_id}`,
    category: 'joint_evidence',
    labelKey: 'adaptiveEvidenceObservedAssociation',
    values: { driver: candidate.driver_instrument_id, lag: candidate.lag_key },
    sourceIds: candidate.evidence.provenance.observation_ids,
    supportCount: candidate.support_count,
    counterexampleCount: candidate.counterexample_count,
    limitationCodes: candidate.limitation_codes,
  }));

  const similarPeriods = interpretation?.similar_periods?.status.state === 'AVAILABLE'
    && interpretation.similar_periods.future_leakage_check_passed
    && interpretation.similar_periods.self_match_excluded
    ? interpretation.similar_periods.periods.slice(0, 4).map((period) => ({
        id: period.period_id,
        startAt: period.start_at,
        endAt: period.end_at,
        distance: period.distance,
        matchingFeatures: period.matching_feature_keys,
        differentFeatures: period.different_feature_keys,
        supportCount: period.evidence.support_count,
        counterexampleCount: period.evidence.counterexample_count,
      }))
    : [];
  if (similarPeriods.length > 0) {
    items.push({
      id: 'evidence-similar-periods',
      category: 'historical_analogue',
      labelKey: 'adaptiveEvidenceSimilarPeriods',
      values: { count: similarPeriods.length },
      sourceIds: similarPeriods.map((period) => period.id),
      supportCount: similarPeriods.reduce((sum, period) => sum + period.supportCount, 0),
      counterexampleCount: similarPeriods.reduce((sum, period) => sum + period.counterexampleCount, 0),
    });
  } else {
    missingness.add('SIMILAR_PERIODS_UNAVAILABLE');
  }

  const recoverySource = interpretation?.recovery?.status.state === 'AVAILABLE' ? interpretation.recovery : undefined;
  const recovery = recoverySource ? {
    semantics: recoverySource.semantics === 'VALIDATED_FORECAST' ? 'validated_forecast' as const : 'historical_analogue' as const,
    episodeCount: recoverySource.historical_episode_ids.length,
    path: recoverySource.reference_path.map((point) => ({
      offsetDays: point.offset_days,
      medianDeviation: point.median_deviation,
      lowDeviation: point.low_deviation,
      highDeviation: point.high_deviation,
    })),
    forecastAllowed: recoverySource.forecast_allowed,
    limitationCodes: recoverySource.limitation_codes,
  } : undefined;
  if (!recovery) missingness.add('RECOVERY_HISTORY_UNAVAILABLE');

  const scenarioBranches = interpretation?.scenario?.status.state === 'AVAILABLE'
    ? interpretation.scenario.branches.map((branch) => ({
        id: branch.branch_id,
        action: branch.action_value,
        comparablePeriodCount: branch.comparable_period_count,
        observedOutcomeChange: numberOrUndefined(branch.observed_outcome_change),
        supportCount: branch.support_count,
        counterexampleCount: branch.counterexample_count,
        missingOutcomeCount: branch.missing_outcome_count,
        limitationCodes: branch.limitation_codes,
      }))
    : [];
  if (scenarioBranches.length === 0) missingness.add('SCENARIO_HISTORY_UNAVAILABLE');

  Array.from(missingness).forEach((code) => items.push({
    id: `evidence-unknown-${code.toLowerCase()}`,
    category: 'unknown',
    labelKey: 'adaptiveEvidenceUnknown',
    values: { code },
    sourceIds: [],
  }));
  Array.from(limitations).slice(0, 8).forEach((code) => items.push({
    id: `evidence-limitation-${code.toLowerCase()}`,
    category: 'limitation',
    labelKey: 'adaptiveEvidenceLimitation',
    values: { code },
    sourceIds: [],
  }));

  const packet: DecisionEvidencePacketV1 = {
    contractVersion: DECISION_EVIDENCE_CONTRACT_VERSION,
    target: instrument?.instrument_id ?? (input.questionType === 'cognitive_adjustment' ? 'current_state.focus' : 'current_state.overall'),
    asOf: bundle?.metadata.as_of ?? input.asOf,
    eligibility: instrument ? 'eligible' : input.context.facts.length > 0 ? 'limited' : 'abstained',
    fact: instrument?.latest ? {
      value: instrument.latest.value,
      unit: instrument.latest.unit,
      observedAt: instrument.latest.observed_at,
      sourceId: instrument.latest.observation_id,
    } : input.context.currentState ? {
      value: input.context.currentState.overall,
      unit: '/5',
      observedAt: input.context.currentState.observedAt,
      sourceId: input.context.currentState.sourceId,
    } : undefined,
    personalReference: instrument && instrument.reference.status !== 'UNAVAILABLE' ? {
      value: numberOrUndefined(instrument?.reference.value ?? null),
      low: numberOrUndefined(instrument?.reference.low ?? null),
      high: numberOrUndefined(instrument?.reference.high ?? null),
      unit: instrument?.reference.unit ?? '',
      observationCount: instrument?.reference.observation_count ?? 0,
      independentPeriodCount: instrument?.reference.independent_period_count ?? 0,
      sourceIds: instrument?.reference.provenance.observation_ids ?? [],
    } : undefined,
    currentDeviation: numberOrUndefined(joint?.observed_deviation ?? instrument?.change.absolute ?? null),
    trend: instrument ? {
      direction: instrument.change.direction.toLowerCase() as 'higher' | 'lower' | 'flat' | 'unavailable',
      absolute: numberOrUndefined(instrument.change.absolute),
      sourceIds: instrument.provenance.observation_ids,
    } : undefined,
    ewma: shortPoint || longPoint ? {
      short: shortPoint?.value,
      long: longPoint?.value,
      observedAt: shortPoint?.observed_at ?? longPoint?.observed_at,
      sourceIds: Array.from(new Set([...(shortPoint?.source_observation_ids ?? []), ...(longPoint?.source_observation_ids ?? [])])),
      limitationCodes: Array.from(new Set([...(shortSeries?.limitation_codes ?? []), ...(longSeries?.limitation_codes ?? [])])),
    } : undefined,
    jointModel: joint?.observed_deviation != null && joint.model_attributed_deviation != null && joint.residual_deviation != null ? {
      observedDeviation: joint.observed_deviation,
      modelAssociated: joint.model_attributed_deviation,
      unexplainedResidual: joint.residual_deviation,
      completeObservationCount: joint.complete_observation_count,
      drivers: jointDrivers,
      limitationCodes: joint.limitation_codes,
    } : undefined,
    similarPeriods,
    recovery,
    scenarioBranches,
    items,
    missingness: Array.from(missingness),
    limitations: Array.from(limitations),
    sourceArtifactIds: Array.from(new Set([
      ...(bundle ? [bundle.metadata.bundle_id] : []),
      ...sourceArtifacts(instrument),
      ...(analysis ? [analysis.artifact_id] : []),
    ])),
  };

  return { packet, parseIssues };
}
