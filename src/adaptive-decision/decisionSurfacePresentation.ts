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
  unknownCount: number;
  isSparse: boolean;
  isAbstained: boolean;
};

const evidenceOrder: DecisionEvidenceItemV1['category'][] = [
  'fact',
  'personal_comparison',
  'joint_evidence',
  'historical_analogue',
  'unknown',
  'limitation',
];

function formatMinutes(lang: Lang, minutes: number): string {
  return adaptiveText(lang, 'adaptiveSurfaceMinutes', { count: minutes });
}

function formatFactValue(lang: Lang, fact: DecisionContextFactV1): string {
  if (fact.value == null) return '—';
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

function operationChange(lang: Lang, operation: DecisionPlanOperationV1): DecisionSurfacePlanChangeV2 {
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
      after: `${operation.after.date} · ${operation.after.startTime} · ${formatMinutes(lang, operation.after.plannedMinutes)}`,
      kind: 'add',
    };
  }

  const dateChanged = operation.before.date !== operation.after.date;
  const timeChanged = operation.before.startTime !== operation.after.startTime;
  const before = dateChanged || timeChanged
    ? `${operation.before.date} · ${operation.before.startTime} · ${formatMinutes(lang, operation.before.plannedMinutes)}`
    : formatMinutes(lang, operation.before.plannedMinutes);
  const after = dateChanged || timeChanged
    ? `${operation.after.date} · ${operation.after.startTime} · ${formatMinutes(lang, operation.after.plannedMinutes)}`
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
  const operations = candidate.planPatch.operations.map((operation) => operationChange(lang, operation));
  return {
    id: candidate.id,
    title: detail.title,
    description: detail.description,
    exactEffect: detail.effect,
    outcomes: [detail.protects, detail.feasibility].filter(Boolean),
    reasonLines: [
      ...evidence.map((item) => evidenceItemText(lang, item)),
      detail.uncertainty,
    ].filter(Boolean).slice(0, 3),
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

function chooseContextFacts(
  episode: DecisionEpisodeV1,
  activeCandidate: DecisionCandidateActionV1 | undefined,
): DecisionContextFactV1[] {
  const facts = episode.contextSnapshot?.facts ?? [];
  const changedBlockIds = new Set(
    activeCandidate?.planPatch.operations.map((operation) => operation.blockId) ?? [],
  );
  const ranked = facts.map((fact, index) => {
    const kindRank = {
      state: 0,
      sleep: 1,
      recent_load: 2,
      priority: 3,
      schedule_constraint: 5,
      available_window: 6,
      goal_alignment: 7,
      historical_episode: 8,
    }[fact.kind];
    const affectsPatch = fact.sourceIds.some((id) => changedBlockIds.has(id));
    return { fact, index, rank: affectsPatch ? 3.5 : kindRank };
  });
  return ranked
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
    .slice(0, 4)
    .map(({ fact }) => fact);
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
          text: evidenceItemText(lang, item),
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
        text: evidenceItemText(lang, item),
      }))
    : [];
  const groups = evidenceGroups(lang, episode);
  const facts = chooseContextFacts(episode, activeCandidate);

  return {
    question: episode.question.text ?? questionTypeLabel(lang, episode.question.type),
    contextItems: facts.map((fact) => ({
      id: fact.id,
      label: contextFactLabel(lang, fact),
      value: formatFactValue(lang, fact),
    })),
    primaryAction,
    alternatives: episode.candidateActions
      .filter((candidate) => candidate.id !== activeCandidate?.id)
      .slice(0, 2)
      .map((candidate) => actionPresentation(lang, episode, candidate, scheduleBlocks)),
    evidencePreview: evidence,
    evidenceGroups: groups,
    unknownCount: episode.evidencePacket?.items.filter((item) => item.category === 'unknown').length ?? 0,
    isSparse: episode.evidencePacket?.eligibility !== 'eligible',
    isAbstained: episode.status === 'ABSTAINED',
  };
}
