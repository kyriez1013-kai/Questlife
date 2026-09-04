import type { Lang } from '../i18n';
import type { ScheduleBlock } from '../types';
import type {
  DecisionCandidateActionV1,
  DecisionContextFactV1,
  DecisionEpisodeV1,
  DecisionEvidenceItemV1,
  DecisionPlanOperationV1,
} from './decisionEpisode';
import {
  adaptiveText,
  candidateCopy,
  contextFactLabel,
  evidenceItemText,
  questionTypeLabel,
} from './presentation';

export type DecisionSurfaceContextItemV2 = {
  id: string;
  label: string;
  value: string;
};

export type DecisionSurfacePlanChangeV2 = {
  id: string;
  title: string;
  before: string;
  after: string;
  kind: 'update' | 'add' | 'remove' | 'unchanged';
};

export type DecisionSurfaceEvidenceGroupV2 = {
  id: DecisionEvidenceItemV1['category'];
  label: string;
  items: Array<{
    id: string;
    text: string;
    supportCount?: number;
    counterexampleCount?: number;
  }>;
};

export type DecisionSurfaceActionV2 = {
  id: string;
  title: string;
  description: string;
  basisNote?: string;
  exactEffect: string;
  outcomes: string[];
  reasonLines: string[];
  planChanges: DecisionSurfacePlanChangeV2[];
  protectedItems: DecisionSurfacePlanChangeV2[];
  reversible: boolean;
};

export type DecisionSurfacePresentationV2 = {
  question: string;
  contextItems: DecisionSurfaceContextItemV2[];
  primaryAction: DecisionSurfaceActionV2 | null;
  alternatives: DecisionSurfaceActionV2[];
  evidencePreview: Array<{ id: string; label: string; text: string }>;
  evidenceGroups: DecisionSurfaceEvidenceGroupV2[];
  evidenceSummary: string;
  unknownCount: number;
  isSparse: boolean;
  isAbstained: boolean;
};

const evidenceOrder: DecisionEvidenceItemV1['category'][] = [
  'fact',
  'personal_comparison',
  'observational_signal',
  'joint_evidence',
  'historical_analogue',
  'historical_decision',
  'unknown',
  'limitation',
];

function formatMinutes(lang: Lang, minutes: number): string {
  return adaptiveText(lang, 'adaptiveSurfaceMinutes', { count: minutes });
}

function roundedEvidenceText(lang: Lang, item: DecisionEvidenceItemV1): string {
  const values = Object.fromEntries(Object.entries(item.values ?? {}).map(([key, value]) => [
    key,
    typeof value === 'number' ? Number(value.toFixed(1)) : value,
  ]));
  return evidenceItemText(lang, { ...item, values });
}

function relativeDateLabel(lang: Lang, date: string, baseDate: string): string {
  if (date === baseDate) return adaptiveText(lang, 'today');
  const current = new Date(`${baseDate}T12:00:00`);
  const compared = new Date(`${date}T12:00:00`);
  if (Number.isFinite(current.getTime()) && compared.getTime() - current.getTime() === 24 * 60 * 60 * 1000) {
    return adaptiveText(lang, 'adaptiveTomorrow');
  }
  return date;
}

function formatFactValue(lang: Lang, fact: DecisionContextFactV1): string {
  if (fact.value == null) return adaptiveText(lang, 'adaptiveSurfaceUnknown');
  if (fact.kind === 'priority' && typeof fact.value === 'string') {
    const priorityKey = {
      first: 'adaptivePriorityFirst',
      deadline: 'adaptivePriorityDeadline',
      recovery: 'adaptivePriorityRecovery',
    }[fact.value];
    if (priorityKey) return adaptiveText(lang, priorityKey);
  }
  if (fact.kind === 'schedule_constraint' && typeof fact.value === 'string') {
    const flexibilityKey = {
      fixed: 'adaptiveFixed',
      movable: 'adaptiveMovable',
      optional: 'adaptiveOptional',
    }[fact.value];
    if (flexibilityKey) return adaptiveText(lang, flexibilityKey);
  }
  if (fact.unit === '/5') return `${fact.value} / 5`;
  if (fact.unit === 'minutes' && typeof fact.value === 'number') {
    if (fact.kind === 'sleep') {
      const hours = Math.floor(fact.value / 60);
      const minutes = Math.round(fact.value % 60);
      return minutes > 0
        ? adaptiveText(lang, 'adaptiveSurfaceHoursMinutes', { hours, minutes })
        : adaptiveText(lang, 'adaptiveSurfaceHours', { hours });
    }
    return formatMinutes(lang, fact.value);
  }
  return `${fact.value}${fact.unit ? ` ${fact.unit}` : ''}`;
}

function shortenedDurationBasis(
  lang: Lang,
  candidate: DecisionCandidateActionV1,
): string | undefined {
  const shortened = candidate.planPatch.operations.find((operation) => (
    operation.type === 'update'
    && operation.after.plannedMinutes < operation.before.plannedMinutes
  ));
  if (!shortened || shortened.type !== 'update') return undefined;
  return adaptiveText(lang, 'adaptiveSurfaceShortenBasis', {
    from: shortened.before.plannedMinutes,
    to: shortened.after.plannedMinutes,
  });
}

function evidenceSummary(
  lang: Lang,
  evidence: DecisionEvidenceItemV1[],
): string {
  if (evidence.some((item) => item.category === 'joint_evidence')) {
    return adaptiveText(lang, 'adaptiveSurfaceEvidenceJointSummary');
  }
  if (evidence.some((item) => (
    item.category === 'personal_comparison'
    || item.category === 'observational_signal'
    || item.category === 'historical_analogue'
    || item.category === 'historical_decision'
  ))) {
    const counted = [...evidence].reverse().find((item) => (
      item.supportCount != null || item.counterexampleCount != null
    ));
    if (counted) {
      return adaptiveText(lang, 'adaptiveSurfaceEvidenceHistorySummary', {
        support: counted.supportCount ?? 0,
        counter: counted.counterexampleCount ?? 0,
      });
    }
    return adaptiveText(lang, 'adaptiveSurfaceEvidencePersonalSummary');
  }
  return adaptiveText(lang, 'adaptiveSurfaceEvidenceConstraintSummary');
}

function operationChange(
  lang: Lang,
  operation: DecisionPlanOperationV1,
  baseDate: string,
): DecisionSurfacePlanChangeV2 {
  if (operation.type === 'remove') {
    return {
      id: operation.id,
      title: operation.before.title,
      before: formatMinutes(lang, operation.before.plannedMinutes),
      after: adaptiveText(lang, 'adaptiveSurfaceUnplaced'),
      kind: 'remove',
    };
  }
  if (operation.type === 'add') {
    return {
      id: operation.id,
      title: operation.after.title,
      before: adaptiveText(lang, 'adaptiveSurfaceNotScheduled'),
      after: `${relativeDateLabel(lang, operation.after.date, baseDate)} · ${operation.after.startTime} · ${formatMinutes(lang, operation.after.plannedMinutes)}`,
      kind: 'add',
    };
  }

  const dateChanged = operation.before.date !== operation.after.date;
  const timeChanged = operation.before.startTime !== operation.after.startTime;
  const before = dateChanged || timeChanged
    ? `${relativeDateLabel(lang, operation.before.date, baseDate)} · ${operation.before.startTime} · ${formatMinutes(lang, operation.before.plannedMinutes)}`
    : formatMinutes(lang, operation.before.plannedMinutes);
  const after = dateChanged || timeChanged
    ? `${relativeDateLabel(lang, operation.after.date, baseDate)} · ${operation.after.startTime} · ${formatMinutes(lang, operation.after.plannedMinutes)}`
    : formatMinutes(lang, operation.after.plannedMinutes);
  return {
    id: operation.id,
    title: operation.before.title,
    before,
    after,
    kind: 'update',
  };
}

function protectedPlanItems(
  lang: Lang,
  candidate: DecisionCandidateActionV1,
  blocks: ScheduleBlock[],
): DecisionSurfacePlanChangeV2[] {
  const changedIds = new Set(candidate.planPatch.operations.map((operation) => operation.blockId));
  return blocks
    .filter((block) => block.flexibility === 'fixed' && !changedIds.has(block.id))
    .slice(0, 1)
    .map((block) => ({
      id: `unchanged:${block.id}`,
      title: block.title,
      before: `${block.startTime} · ${formatMinutes(lang, block.plannedMinutes)}`,
      after: adaptiveText(lang, 'adaptiveSurfaceUnchanged'),
      kind: 'unchanged' as const,
    }));
}

function relevantEvidence(
  episode: DecisionEpisodeV1,
  candidate: DecisionCandidateActionV1,
): DecisionEvidenceItemV1[] {
  const items = episode.evidencePacket?.items ?? [];
  const byId = new Map(items.map((item) => [item.id, item]));
  const selected = candidate.evidenceItemIds
    .map((id) => byId.get(id))
    .filter((item): item is DecisionEvidenceItemV1 => Boolean(item));
  const unknown = items.find((item) => item.category === 'unknown');
  return [...selected, ...(unknown && selected.length < 3 ? [unknown] : [])].slice(0, 3);
}

function actionPresentation(
  lang: Lang,
  episode: DecisionEpisodeV1,
  candidate: DecisionCandidateActionV1,
  scheduleBlocks: ScheduleBlock[],
): DecisionSurfaceActionV2 {
  const detail = candidateCopy(lang, candidate);
  const evidence = relevantEvidence(episode, candidate);
  const summary = evidenceSummary(lang, evidence);
  const followUpOnlyUncertainty = candidate.uncertaintyKey === 'adaptiveUncertaintyObserveOutcome'
    || candidate.uncertaintyKey === 'adaptiveUncertaintyObserveFocus';
  const boundary = followUpOnlyUncertainty
    ? adaptiveText(lang, 'adaptiveSurfaceEvidenceStillLimited')
    : detail.uncertainty;
  const baseDate = episode.contextSnapshot?.schedule.date ?? episode.time.asOf.slice(0, 10);
  const operations = candidate.planPatch.operations.map((operation) => operationChange(lang, operation, baseDate));
  const firstChange = operations[0];
  return {
    id: candidate.id,
    title: detail.title,
    description: detail.description,
    basisNote: shortenedDurationBasis(lang, candidate),
    exactEffect: firstChange
      ? `${firstChange.title} · ${firstChange.before} → ${firstChange.after}`
      : detail.effect,
    outcomes: [detail.protects, detail.feasibility].filter(Boolean),
    reasonLines: [summary, boundary].filter(Boolean).slice(0, 2),
    planChanges: operations.length > 0 ? operations : [{
      id: `${candidate.id}:unchanged`,
      title: adaptiveText(lang, 'adaptiveSurfaceCurrentPlan'),
      before: adaptiveText(lang, 'adaptiveSurfaceNoChange'),
      after: adaptiveText(lang, 'adaptiveSurfaceUnchanged'),
      kind: 'unchanged',
    }],
    protectedItems: protectedPlanItems(lang, candidate, scheduleBlocks),
    reversible: candidate.reversible,
  };
}

const relevantContextKinds: Record<DecisionEpisodeV1['question']['type'], Set<DecisionContextFactV1['kind']>> = {
  training_recovery: new Set(['state', 'sleep', 'recent_load', 'schedule_constraint', 'available_window']),
  cognitive_adjustment: new Set(['state', 'schedule_constraint', 'available_window', 'priority']),
  overloaded_day: new Set(['schedule_constraint', 'available_window', 'priority', 'recent_load']),
  custom: new Set(['state', 'sleep', 'recent_load', 'schedule_constraint', 'available_window', 'priority']),
};

function chooseContextItems(
  lang: Lang,
  episode: DecisionEpisodeV1,
  activeCandidate: DecisionCandidateActionV1 | undefined,
): DecisionSurfaceContextItemV2[] {
  const facts = episode.contextSnapshot?.facts ?? [];
  const evidenceById = new Map((episode.evidencePacket?.items ?? []).map((item) => [item.id, item]));
  const evidenceSourceIds = activeCandidate?.evidenceItemIds.flatMap((id) => evidenceById.get(id)?.sourceIds ?? []) ?? [];
  const changedBlockIds = new Set(
    activeCandidate?.planPatch.operations.map((operation) => operation.blockId) ?? [],
  );
  const referencedIds = new Set([
    ...(activeCandidate?.constraintIds ?? []),
    ...evidenceSourceIds,
    ...changedBlockIds,
  ]);
  const allowedKinds = relevantContextKinds[episode.question.type];
  const ranked = facts.filter((fact) => allowedKinds.has(fact.kind)).map((fact, index) => {
    const kindRank = {
      state: 0,
      sleep: 1,
      recent_load: 2,
      priority: 3,
      schedule_constraint: 4,
      available_window: 5,
      goal_alignment: 7,
      historical_episode: 8,
    }[fact.kind];
    const explicitlyReferenced = fact.sourceIds.some((id) => referencedIds.has(id));
    return { fact, index, rank: explicitlyReferenced ? kindRank - 0.5 : kindRank };
  });
  const selected = ranked
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
    .slice(0, 4)
    .map(({ fact }) => ({
      id: fact.id,
      label: fact.kind === 'schedule_constraint' && fact.label !== 'explicit_flexibility'
        ? fact.label
        : contextFactLabel(lang, fact),
      value: formatFactValue(lang, fact),
    }));

  const sleepMissing = episode.question.type === 'training_recovery'
    && !facts.some((fact) => fact.kind === 'sleep')
    && (episode.contextSnapshot?.missingness ?? []).some((item) => item.code === 'SLEEP_MISSING');
  if (sleepMissing && selected.length < 4) {
    selected.splice(Math.min(1, selected.length), 0, {
      id: 'context-sleep-missing',
      label: adaptiveText(lang, 'adaptiveContextSleep'),
      value: adaptiveText(lang, 'adaptiveSurfaceUnknown'),
    });
  }
  return selected.slice(0, 4);
}

function evidenceGroups(lang: Lang, episode: DecisionEpisodeV1): DecisionSurfaceEvidenceGroupV2[] {
  const items = episode.evidencePacket?.items ?? [];
  return evidenceOrder
    .map((category) => ({
      id: category,
      label: adaptiveText(lang, `adaptiveSurfaceEvidence_${category}`),
      items: items
        .filter((item) => item.category === category)
        .map((item) => ({
          id: item.id,
          text: roundedEvidenceText(lang, item),
          supportCount: item.supportCount,
          counterexampleCount: item.counterexampleCount,
        })),
    }))
    .filter((group) => group.items.length > 0);
}

export function buildDecisionSurfacePresentation(input: {
  episode: DecisionEpisodeV1;
  scheduleBlocks: ScheduleBlock[];
  activeActionId?: string;
  lang: Lang;
}): DecisionSurfacePresentationV2 {
  const { episode, lang, scheduleBlocks } = input;
  const activeCandidate = episode.candidateActions.find((candidate) => candidate.id === input.activeActionId)
    ?? episode.candidateActions[0];
  const primaryAction = activeCandidate
    ? actionPresentation(lang, episode, activeCandidate, scheduleBlocks)
    : null;
  const evidence = activeCandidate
    ? relevantEvidence(episode, activeCandidate).map((item) => ({
        id: item.id,
        label: adaptiveText(lang, `adaptiveSurfaceEvidence_${item.category}`),
        text: roundedEvidenceText(lang, item),
      }))
    : [];
  const groups = evidenceGroups(lang, episode);
  const contextItems = chooseContextItems(lang, episode, activeCandidate);
  const summary = activeCandidate
    ? evidenceSummary(lang, relevantEvidence(episode, activeCandidate))
    : adaptiveText(lang, 'adaptiveSurfaceEvidenceConstraintSummary');

  return {
    question: episode.question.text ?? questionTypeLabel(lang, episode.question.type),
    contextItems,
    primaryAction,
    alternatives: episode.candidateActions
      .filter((candidate) => candidate.id !== activeCandidate?.id)
      .slice(0, 2)
      .map((candidate) => actionPresentation(lang, episode, candidate, scheduleBlocks)),
    evidencePreview: evidence,
    evidenceGroups: groups,
    evidenceSummary: summary,
    unknownCount: episode.evidencePacket?.items.filter((item) => item.category === 'unknown').length ?? 0,
    isSparse: episode.evidencePacket?.eligibility !== 'eligible',
    isAbstained: episode.status === 'ABSTAINED',
  };
}
