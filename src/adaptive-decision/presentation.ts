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
  return adaptiveText(lang, item.labelKey, item.values);
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
