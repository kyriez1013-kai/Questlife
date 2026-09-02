import type { AppData, DecisionResult, ScheduleBlock } from '../types';
import { assembleDecisionContext, type DecisionContextAnswersV1 } from './contextAssembler';
import { generateDecisionProposals } from './decisionPolicy';
import {
  createDecisionEpisode,
  transitionDecisionEpisode,
  type DecisionEpisodeV1,
  type DecisionQuestionType,
} from './decisionEpisode';
import { buildDecisionEvidence } from './evidenceAdapter';
import { createDecisionFollowUpPlan } from './followUp';
import {
  applyDecisionPlanPatch,
  decisionPlanSnapshotHash,
  undoDecisionPlanPatch,
} from './planPatch';
import { evaluateDecisionSafety } from './safetyGate';

export type DecisionEngineData = Pick<
  AppData,
  'stateCheckIns' | 'contextLogs' | 'executionLogs' | 'scheduleBlocks' | 'goals' | 'categories' | 'skills'
> & { decisionResults?: DecisionResult[] };

const NON_OWNER_ORIGINS = new Set(['SYNTHETIC', 'QA_TEST', 'DEBUG_FIXTURE']);
const EVIDENCE_LEVEL_ORDER = ['A', 'B', 'C', 'D', 'E'] as const;

function addHistoricalDecisionEvidence(
  packet: NonNullable<DecisionEpisodeV1['evidencePacket']>,
  results: DecisionResult[],
  episode: DecisionEpisodeV1,
): NonNullable<DecisionEpisodeV1['evidencePacket']> {
  const asOf = Date.parse(episode.time.asOf);
  const history = results
    .filter((result) => !result.dataProvenance?.deleted)
    .filter((result) => !result.dataProvenance?.origin || !NON_OWNER_ORIGINS.has(result.dataProvenance.origin))
    .map((result) => ({ result, episode: result.decisionEpisode }))
    .filter((entry): entry is { result: DecisionResult; episode: DecisionEpisodeV1 } => Boolean(entry.episode))
    .filter((entry) => (
      entry.episode.id !== episode.id
      && entry.episode.subject.kind === 'owner'
      && entry.episode.question.type === episode.question.type
      && !entry.episode.provenance.syntheticOnly
      && entry.episode.provenance.containsRealUserData
      && Date.parse(entry.episode.time.availableAt) <= asOf
      && (entry.episode.status === 'OUTCOME_RECORDED' || entry.episode.status === 'CLOSED')
      && entry.episode.followUpOutcomes.some((outcome) => Date.parse(outcome.recordedAt) <= asOf)
    ))
    .sort((left, right) => right.episode.updatedAt.localeCompare(left.episode.updatedAt))
    .slice(0, 5);
  if (history.length === 0) return packet;

  const outcomes = history.flatMap((entry) => entry.episode.followUpOutcomes);
  const supportCount = outcomes.filter((outcome) => (
    outcome.usefulness === 'helpful'
    || outcome.taskResult === 'completed'
    || outcome.taskResult === 'partially_completed'
  )).length;
  const counterexampleCount = outcomes.filter((outcome) => (
    outcome.usefulness === 'not_helpful'
    || outcome.taskResult === 'not_completed'
  )).length;
  const items = [
    ...packet.items,
    {
      id: 'evidence-historical-decisions',
      category: 'historical_decision' as const,
      evidenceLevel: 'E' as const,
      labelKey: 'adaptiveEvidenceHistoricalDecision',
      values: { count: history.length, outcomes: outcomes.length },
      sourceIds: history.map((entry) => entry.result.id),
      supportCount,
      counterexampleCount,
      limitationCodes: ['HISTORICAL_DECISIONS_ARE_NOT_CAUSAL'],
    },
  ];
  const availableLevels = EVIDENCE_LEVEL_ORDER.filter((level) => items.some((item) => item.evidenceLevel === level));
  return {
    ...packet,
    items,
    availableLevels,
    highestEvidenceLevel: availableLevels[availableLevels.length - 1],
    limitations: Array.from(new Set([...packet.limitations, 'HISTORICAL_DECISIONS_ARE_NOT_CAUSAL'])),
    sourceArtifactIds: Array.from(new Set([
      ...packet.sourceArtifactIds,
      ...history.map((entry) => entry.result.id),
    ])),
  };
}

export function beginDecisionEpisode(input: {
  id: string;
  questionType: DecisionQuestionType;
  questionText?: string;
  subjectKind: 'owner' | 'demo';
  subjectId?: string;
  now: string;
  timezone: string;
  observationWindowStart: string;
}): DecisionEpisodeV1 {
  return createDecisionEpisode(input);
}

function enterContextAssembly(episode: DecisionEpisodeV1, now: string): DecisionEpisodeV1 {
  if (episode.status === 'DRAFT' || episode.status === 'NEEDS_INPUT') {
    return transitionDecisionEpisode(episode, 'CONTEXT_ASSEMBLING', now);
  }
  if (episode.status === 'CONTEXT_ASSEMBLING') return episode;
  throw new Error(`Cannot assemble context from Decision Episode status ${episode.status}.`);
}

export function proposeDecisionEpisode(input: {
  episode: DecisionEpisodeV1;
  data: DecisionEngineData;
  answers?: DecisionContextAnswersV1;
  quantProduct?: unknown;
  quantAnalysis?: unknown;
  now: string;
}): DecisionEpisodeV1 {
  let episode = enterContextAssembly(input.episode, input.now);
  const mode = episode.subject.kind;
  const assembled = assembleDecisionContext({
    data: input.data,
    questionType: episode.question.type,
    questionText: episode.question.text,
    targetId: episode.question.targetId,
    asOf: episode.time.asOf,
    timezone: episode.time.timezone,
    mode,
    answers: input.answers,
  });
  const safety = evaluateDecisionSafety({
    questionText: episode.question.text,
    context: assembled.snapshot,
    symptomSeverityAnswer: input.answers?.['symptom-severity'],
  });
  const builtEvidence = buildDecisionEvidence({
    questionType: episode.question.type,
    context: assembled.snapshot,
    asOf: episode.time.asOf,
    mode,
    quantProduct: input.quantProduct,
    quantAnalysis: input.quantAnalysis,
  });
  const evidence = {
    ...builtEvidence,
    packet: safety.status.level === 'normal'
      ? addHistoricalDecisionEvidence(
          builtEvidence.packet,
          input.data.decisionResults ?? [],
          episode,
        )
      : builtEvidence.packet,
  };
  const questions = [
    ...(safety.missingQuestion ? [safety.missingQuestion] : []),
    ...assembled.missingQuestions,
  ].slice(0, 2);

  episode = {
    ...episode,
    contextSnapshot: assembled.snapshot,
    contextSources: assembled.snapshot.sourceRefs.filter((source) => source.eligibility !== 'excluded'),
    missingContext: questions,
    evidencePacket: evidence.packet,
    safetyStatus: safety.status,
    limitations: Array.from(new Set([
      ...assembled.snapshot.limitations,
      ...evidence.packet.limitations,
      ...evidence.parseIssues,
    ])),
    provenance: {
      ...episode.provenance,
      sourceIds: Array.from(new Set([
        ...assembled.snapshot.sourceRefs.filter((source) => source.eligibility !== 'excluded').map((source) => source.sourceId),
        ...evidence.packet.sourceArtifactIds,
      ])),
    },
    leverage: {
      fixtureOnly: episode.subject.kind === 'demo',
      contextItemsAutoAssembled: assembled.snapshot.facts.length,
      questionsAvoided: Math.max(0, 5 - questions.length),
      questionsAsked: questions.length,
      userTaps: 1,
      decisionTimeMs: 0,
      planActionsApplied: 0,
      followUpCompleted: false,
      outcomeAvailable: false,
    },
    updatedAt: input.now,
  };

  if (safety.status.level === 'blocked') {
    const candidates = generateDecisionProposals({
      episodeId: episode.id,
      questionType: episode.question.type,
      context: assembled.snapshot,
      evidence: evidence.packet,
      safety: safety.status,
      generatedAt: input.now,
    });
    return {
      ...transitionDecisionEpisode(episode, 'ABSTAINED', input.now),
      candidateActions: candidates,
    };
  }
  if (questions.length > 0) return transitionDecisionEpisode(episode, 'NEEDS_INPUT', input.now);

  episode = transitionDecisionEpisode(episode, 'READY', input.now);
  const candidates = generateDecisionProposals({
    episodeId: episode.id,
    questionType: episode.question.type,
    context: assembled.snapshot,
    evidence: evidence.packet,
    safety: safety.status,
    generatedAt: input.now,
  });
  return {
    ...transitionDecisionEpisode(episode, 'PROPOSED', input.now),
    candidateActions: candidates,
    targetOutcome: candidates[0] ? {
      horizon: candidates[0].outcomeHorizon,
      fields: candidates[0].outcomeFields,
    } : episode.targetOutcome,
    leverage: episode.leverage ? { ...episode.leverage, decisionTimeMs: Math.max(0, Date.parse(input.now) - Date.parse(episode.createdAt)) } : undefined,
  };
}

export function selectDecisionAction(
  episode: DecisionEpisodeV1,
  actionId: string,
  selectedAt: string,
): DecisionEpisodeV1 {
  if (episode.status !== 'PROPOSED') throw new Error('Decision action can only be selected from PROPOSED.');
  const selected = episode.candidateActions.find((candidate) => candidate.id === actionId);
  if (!selected) throw new Error(`Unknown Decision action: ${actionId}`);
  return {
    ...transitionDecisionEpisode(episode, 'ACCEPTED', selectedAt),
    selectedActionId: selected.id,
    proposedPlanPatch: selected.planPatch,
    targetOutcome: { horizon: selected.outcomeHorizon, fields: selected.outcomeFields },
    leverage: episode.leverage ? { ...episode.leverage, userTaps: episode.leverage.userTaps + 1 } : undefined,
  };
}

export function applyAcceptedDecision(input: {
  episode: DecisionEpisodeV1;
  scheduleBlocks: ScheduleBlock[];
  appliedAt: string;
}): { episode: DecisionEpisodeV1; scheduleBlocks: ScheduleBlock[] } {
  const selected = input.episode.candidateActions.find((candidate) => candidate.id === input.episode.selectedActionId);
  if (input.episode.status !== 'ACCEPTED' || !selected || !input.episode.proposedPlanPatch) {
    throw new Error('Decision must be accepted before apply.');
  }
  const confirmedPatch = { ...input.episode.proposedPlanPatch, confirmedAt: input.appliedAt, appliedAt: input.appliedAt };
  const scheduleBlocks = applyDecisionPlanPatch(input.scheduleBlocks, confirmedPatch);
  const applied = transitionDecisionEpisode(input.episode, 'APPLIED', input.appliedAt);
  return {
    scheduleBlocks,
    episode: {
      ...applied,
      proposedPlanPatch: confirmedPatch,
      appliedPlanPatch: confirmedPatch,
      undoState: { available: true },
      followUpPlan: createDecisionFollowUpPlan(applied.id, selected, input.appliedAt),
      leverage: applied.leverage ? {
        ...applied.leverage,
        userTaps: applied.leverage.userTaps + 1,
        planActionsApplied: confirmedPatch.operations.length,
      } : undefined,
    },
  };
}

export function undoAppliedDecision(input: {
  episode: DecisionEpisodeV1;
  scheduleBlocks: ScheduleBlock[];
  undoneAt: string;
}): { episode: DecisionEpisodeV1; scheduleBlocks: ScheduleBlock[] } {
  if ((input.episode.status !== 'APPLIED' && input.episode.status !== 'FOLLOW_UP_DUE') || !input.episode.appliedPlanPatch) {
    return { episode: input.episode, scheduleBlocks: input.scheduleBlocks };
  }
  if (!input.episode.undoState.available && input.episode.undoState.usedAt) {
    return { episode: input.episode, scheduleBlocks: input.scheduleBlocks };
  }
  const scheduleBlocks = undoDecisionPlanPatch(input.scheduleBlocks, input.episode.appliedPlanPatch);
  return {
    scheduleBlocks,
    episode: {
      ...transitionDecisionEpisode(input.episode, 'PROPOSED', input.undoneAt),
      selectedActionId: undefined,
      proposedPlanPatch: undefined,
      undoState: {
        available: false,
        usedAt: input.undoneAt,
        restoredSnapshotHash: decisionPlanSnapshotHash(input.episode.appliedPlanPatch.beforeSnapshot),
      },
      followUpPlan: input.episode.followUpPlan ? { ...input.episode.followUpPlan, status: 'skipped' } : undefined,
      leverage: input.episode.leverage ? { ...input.episode.leverage, userTaps: input.episode.leverage.userTaps + 1 } : undefined,
    },
  };
}

export function decisionEpisodeToResult(input: {
  episode: DecisionEpisodeV1;
  headline: string;
}): Omit<DecisionResult, 'id' | 'createdAt'> & { id: string; createdAt: string } {
  return {
    id: input.episode.id,
    createdAt: input.episode.createdAt,
    mode: 'daily_brief',
    trigger: 'manual',
    source: 'legacy_fallback',
    schemaVersion: input.episode.contractVersion,
    headlineInsight: input.headline,
    evidenceBasis: input.episode.evidencePacket?.eligibility === 'eligible' ? 'personal_pattern' : 'mixed',
    confidence: undefined,
    meta: { model: input.episode.methodVersion, evidenceRichness: input.episode.evidencePacket?.eligibility === 'eligible' ? 'rich' : 'sparse' },
    decisionEpisode: input.episode,
  };
}

export function similarCompletedEpisodes(
  results: DecisionResult[],
  episode: DecisionEpisodeV1,
): DecisionEpisodeV1[] {
  return results
    .map((result) => result.decisionEpisode)
    .filter((candidate): candidate is DecisionEpisodeV1 => !!candidate)
    .filter((candidate) => (
      candidate.id !== episode.id
      && candidate.question.type === episode.question.type
      && candidate.followUpOutcomes.length > 0
      && (candidate.status === 'OUTCOME_RECORDED' || candidate.status === 'CLOSED')
    ))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
