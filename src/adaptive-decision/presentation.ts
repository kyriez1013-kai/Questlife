import { t, type Lang } from '../i18n';
import type {
  DecisionCandidateActionV1,
  DecisionContextFactV1,
  DecisionEvidenceItemV1,
  DecisionPlanOperationV1,
  DecisionQuestionType,
  DecisionOutcomeHorizon,
} from './decisionEpisode';

export function adaptiveText(
  lang: Lang,
  key: string,
  values: Record<string, string | number> = {},
): string {
  return Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    t(lang, key),
  );
}

export function questionTypeLabel(lang: Lang, type: DecisionQuestionType): string {
  const keys: Record<DecisionQuestionType, string> = {
    training_recovery: 'adaptiveQuestionTypeTraining',
    cognitive_adjustment: 'adaptiveQuestionTypeCognitive',
    overloaded_day: 'adaptiveQuestionTypeOverloaded',
    custom: 'adaptiveQuestionTypeCustom',
  };
  return adaptiveText(lang, keys[type]);
}

export function horizonLabel(lang: Lang, horizon: DecisionOutcomeHorizon): string {
  return adaptiveText(lang, {
    two_hours: 'adaptiveHorizonTwoHours',
    end_of_day: 'adaptiveHorizonEndOfDay',
    next_morning: 'adaptiveHorizonNextMorning',
  }[horizon]);
}

export function candidateCopy(lang: Lang, candidate: DecisionCandidateActionV1) {
  return {
    title: adaptiveText(lang, candidate.titleKey, candidate.values),
    description: adaptiveText(lang, candidate.descriptionKey, candidate.values),
    effect: adaptiveText(lang, candidate.exactEffectKey, candidate.values),
    protects: adaptiveText(lang, candidate.protectsKey, candidate.values),
    feasibility: adaptiveText(lang, candidate.feasibilityKey, candidate.values),
    uncertainty: adaptiveText(lang, candidate.uncertaintyKey, candidate.values),
  };
}

export function evidenceItemText(lang: Lang, item: DecisionEvidenceItemV1): string {
  const code = typeof item.values?.code === 'string' ? item.values.code : undefined;
  const codeKey = code ? {
    CURRENT_STATE_MISSING: 'adaptiveMissingCurrentState',
    SLEEP_MISSING: 'adaptiveMissingSleep',
    RECENT_EXECUTION_MISSING: 'adaptiveMissingRecentExecution',
    PERSONAL_REFERENCE_UNAVAILABLE: 'adaptiveMissingPersonalReference',
    EWMA_UNAVAILABLE: 'adaptiveMissingEwma',
    MULTIVARIATE_EVIDENCE_UNAVAILABLE: 'adaptiveMissingMultivariate',
    SIMILAR_PERIODS_UNAVAILABLE: 'adaptiveMissingSimilarPeriods',
    RECOVERY_HISTORY_UNAVAILABLE: 'adaptiveMissingRecoveryHistory',
    SCENARIO_HISTORY_UNAVAILABLE: 'adaptiveMissingScenarioHistory',
    OBSERVATIONAL_NOT_CAUSAL: 'adaptiveLimitationObservational',
    BASELINE_IS_NOT_TARGET: 'adaptiveLimitationBaselineNotTarget',
    MISSING_IS_NOT_ZERO: 'adaptiveLimitationMissingNotZero',
    PLAN_IS_NOT_EXECUTION: 'adaptiveLimitationPlanNotExecution',
    NO_ADVANCED_RESEARCH_ARTIFACTS: 'adaptiveLimitationResearchExcluded',
    RESEARCH_MODELS_EXCLUDED: 'adaptiveLimitationResearchExcluded',
    SYNTHETIC_FIXTURE_ONLY: 'adaptiveLimitationFixtureOnly',
    NO_FORECAST_OUTPUT: 'adaptiveLimitationNoForecast',
    OVERLAP_IS_NOT_CAUSAL_EVIDENCE: 'adaptiveLimitationOverlapNotCausal',
    ANALOGUE_IS_NOT_FORECAST: 'adaptiveLimitationAnalogueNotForecast',
    HISTORICAL_ANALOGUE_IS_NOT_FORECAST: 'adaptiveLimitationAnalogueNotForecast',
    DIRECTION_IS_DESCRIPTIVE_NOT_CAUSAL: 'adaptiveLimitationDescriptiveDirection',
    NO_CAUSAL_INTERPRETATION: 'adaptiveLimitationNoCausalInterpretation',
    SYNTHETIC_ANALYSIS_EXCLUDED_FROM_OWNER_MODE: 'adaptiveLimitationOwnerSyntheticExcluded',
    SYNTHETIC_QUANT_EXCLUDED_FROM_OWNER_MODE: 'adaptiveLimitationOwnerSyntheticExcluded',
  }[code] : undefined;
  return adaptiveText(lang, item.labelKey, {
    ...item.values,
    ...(codeKey ? { code: adaptiveText(lang, codeKey) } : {}),
  });
}

export function contextFactLabel(lang: Lang, fact: DecisionContextFactV1): string {
  return adaptiveText(lang, {
    state: 'adaptiveContextState',
    sleep: 'adaptiveContextSleep',
    recent_load: 'adaptiveContextRecentLoad',
    schedule_constraint: 'adaptiveContextSchedule',
    available_window: 'adaptiveContextAvailableWindow',
    priority: 'adaptiveContextPriority',
    goal_alignment: 'adaptiveContextDirection',
    historical_episode: 'adaptiveContextHistory',
  }[fact.kind]);
}

function blockSummary(block: NonNullable<DecisionPlanOperationV1['before']>): string {
  return `${block.date} · ${block.startTime}–${block.endTime} · ${block.plannedMinutes} min`;
}

export function planOperationText(lang: Lang, operation: DecisionPlanOperationV1): string {
  if (operation.type === 'add') {
    return adaptiveText(lang, 'adaptivePatchAdd', {
      title: operation.after.title,
      after: blockSummary(operation.after),
    });
  }
  if (operation.type === 'remove') {
    return adaptiveText(lang, 'adaptivePatchRemove', {
      title: operation.before.title,
      before: blockSummary(operation.before),
    });
  }
  return adaptiveText(lang, 'adaptivePatchUpdate', {
    title: operation.before.title,
    before: blockSummary(operation.before),
    after: blockSummary(operation.after),
  });
}
