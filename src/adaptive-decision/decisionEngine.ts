import type { AppData, DecisionResult, ExecutionLog, ScheduleBlock } from '../types';
import { assembleDecisionContext, type DecisionContextAnswersV1 } from './contextAssembler';
import { generateDecisionProposals } from './decisionPolicy';
import {
  createDecisionEpisode,
  transitionDecisionEpisode,
  type DecisionEpisodeV1,
  type DecisionCandidateActionV1,
  type DecisionQuestionType,
} from './decisionEpisode';
import { buildDecisionEvidence } from './evidenceAdapter';
import { createDecisionFollowUpPlan, decisionActionTargets, decisionExecutionAnchor, followUpDueAt } from './followUp';
import {
  applyDecisionPlanPatch,
  decisionPlanSnapshotHash,
  DecisionPlanPatchConflictError,
  undoDecisionPlanPatch,
} from './planPatch';
import { evaluateDecisionSafety } from './safetyGate';

export type DecisionEngineData = Pick<
  AppData,
  'stateCheckIns' | 'contextLogs' | 'executionLogs' | 'scheduleBlocks' | 'goals' | 'categories' | 'skills'
> & { decisionResults?: DecisionResult[] };

const NON_OWNER_ORIGINS = new Set(['SYNTHETIC', 'QA_TEST', 'DEBUG_FIXTURE']);
const EVIDENCE_LEVEL_ORDER = ['A', 'B', 'C', 'D', 'E'] as const;

function actionContext(episode: DecisionEpisodeV1, action: DecisionCandidateActionV1): string | null {
  const targets = decisionActionTargets(episode, action);
  if (targets.length === 0) return null;
  return JSON.stringify({
    kind: action.kind,
    title: action.titleKey,
    horizon: action.outcomeHorizon,
    fields: [...action.outcomeFields].sort(),
    targets: targets.map((block) => {
      const before = action.planPatch.beforeSnapshot.find((item) => item.id === block.id);
      return {
        // Repeated instances may share a skill; unrelated skills or unlinked blocks cannot match.
        skillOrBlock: block.linkedSkillId ?? block.id,
        goals: [...new Set([block.linkedGoalId, ...(block.linkedGoalIds ?? [])].filter(Boolean))].sort(),
        taskType: block.taskType,
        fromMinutes: before?.plannedMinutes,
        toMinutes: block.plannedMinutes,
        dayOffset: before ? (Date.parse(block.date) - Date.parse(before.date)) / 86400000 : 0,
      };
    }).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
  });
}

function eligibleHistory(
  results: DecisionResult[], episode: DecisionEpisodeV1, executionLogs: ExecutionLog[],
): Array<{ result: DecisionResult; episode: DecisionEpisodeV1 }> {
  const asOf = Date.parse(episode.time.asOf);
  return results
    .filter((result) => !result.dataProvenance?.deleted)
    .filter((result) => !result.dataProvenance?.availableAt || Date.parse(result.dataProvenance.availableAt) <= asOf)
    .filter((result) => episode.subject.kind === 'demo' || !result.dataProvenance?.origin || !NON_OWNER_ORIGINS.has(result.dataProvenance.origin))
    .map((result) => ({ result, episode: result.decisionEpisode }))
    .filter((entry): entry is { result: DecisionResult; episode: DecisionEpisodeV1 } => Boolean(entry.episode))
    .filter(({ episode: previous }) => {
      if (previous.id === episode.id || previous.subject.kind !== episode.subject.kind
        || previous.subject.subjectId !== episode.subject.subjectId
        || previous.question.type !== episode.question.type
        || Date.parse(previous.time.availableAt) > asOf || !Number.isFinite(Date.parse(previous.time.availableAt))
        || !(Date.parse(previous.updatedAt) <= asOf)
        || !['OUTCOME_RECORDED', 'CLOSED'].includes(previous.status)) return false;
      if (episode.subject.kind === 'owner') {
        if (previous.provenance.syntheticOnly || !previous.provenance.containsRealUserData || NON_OWNER_ORIGINS.has(previous.provenance.origin)) return false;
        const anchor = decisionExecutionAnchor(previous, executionLogs, episode.time.asOf);
        const selected = previous.candidateActions.find((action) => action.id === previous.selectedActionId);
        if (!anchor || !selected) return false;
        if (previous.targetOutcome.horizon !== selected.outcomeHorizon
          || JSON.stringify([...previous.targetOutcome.fields].sort()) !== JSON.stringify([...selected.outcomeFields].sort())) return false;
        let due: number;
        try { due = Date.parse(followUpDueAt(selected, anchor.endedAt, previous.time.timezone)); }
        catch { return false; }
        return previous.followUpOutcomes.some((outcome) => Date.parse(outcome.recordedAt) >= due && Date.parse(outcome.recordedAt) <= asOf);
      }
      return previous.followUpOutcomes.some((outcome) => Date.parse(outcome.recordedAt) <= asOf);
    })
    .sort((left, right) => right.episode.updatedAt.localeCompare(left.episode.updatedAt));
}

function matchingAction(previous: DecisionEpisodeV1, current: DecisionEpisodeV1, action: DecisionCandidateActionV1): boolean {
  const selected = previous.candidateActions.find((item) => item.id === previous.selectedActionId);
  const signature = actionContext(current, action);
  return Boolean(selected && signature && signature === actionContext(previous, selected));
}

function addHistoricalDecisionEvidence(
  packet: NonNullable<DecisionEpisodeV1['evidencePacket']>,
  results: DecisionResult[],
  episode: DecisionEpisodeV1,
  executionLogs: ExecutionLog[],
): NonNullable<DecisionEpisodeV1['evidencePacket']> {
  const asOf = Date.parse(episode.time.asOf);
  const history = eligibleHistory(results, episode, executionLogs);
  const historicalItems = episode.candidateActions.flatMap((action) => {
    const matching = history.filter((entry) => matchingAction(entry.episode, episode, action)).slice(0, 5);
    if (matching.length === 0) return [];
    const outcomes = matching.flatMap((entry) => {
      const previousAction = entry.episode.candidateActions.find((candidate) => candidate.id === entry.episode.selectedActionId)!;
      const anchor = decisionExecutionAnchor(entry.episode, executionLogs, episode.time.asOf);
      const earliest = anchor ? Date.parse(followUpDueAt(previousAction, anchor.endedAt, entry.episode.time.timezone)) : -Infinity;
      return entry.episode.followUpOutcomes.filter((outcome) => Date.parse(outcome.recordedAt) >= earliest && Date.parse(outcome.recordedAt) <= asOf);
    });
    return [{
      id: `evidence-historical-decisions:${action.id}`,
      category: 'historical_decision' as const,
      evidenceLevel: 'E' as const,
      labelKey: 'adaptiveEvidenceHistoricalDecision',
      values: {
        count: matching.length, outcomes: outcomes.length,
        helpful: outcomes.filter((outcome) => outcome.usefulness === 'helpful').length,
        notHelpful: outcomes.filter((outcome) => outcome.usefulness === 'not_helpful').length,
        uncertain: outcomes.filter((outcome) => outcome.usefulness === 'uncertain').length,
        completed: outcomes.filter((outcome) => outcome.taskResult === 'completed').length,
        partiallyCompleted: outcomes.filter((outcome) => outcome.taskResult === 'partially_completed').length,
        notCompleted: outcomes.filter((outcome) => outcome.taskResult === 'not_completed').length,
        stateReadings: outcomes.filter((outcome) => outcome.state != null).length,
        fatigueReadings: outcomes.filter((outcome) => outcome.fatigue != null).length,
      },
      sourceIds: matching.map((entry) => entry.result.id),
      limitationCodes: ['HISTORICAL_DECISIONS_ARE_NOT_CAUSAL', 'OUTCOME_DIMENSIONS_NOT_COMBINED', 'ACTION_MATCH_NOT_SITUATION_EQUIVALENCE'],
    }];
  });
  if (historicalItems.length === 0) return packet;
  const items = [...packet.items, ...historicalItems];
  const availableLevels = EVIDENCE_LEVEL_ORDER.filter((level) => items.some((item) => item.evidenceLevel === level));
  return {
    ...packet,
    items,
    availableLevels,
    highestEvidenceLevel: availableLevels[availableLevels.length - 1],
    limitations: Array.from(new Set([...packet.limitations, 'HISTORICAL_DECISIONS_ARE_NOT_CAUSAL'])),
    sourceArtifactIds: Array.from(new Set([
      ...packet.sourceArtifactIds,
      ...historicalItems.flatMap((item) => item.sourceIds),
    ])),
  };
}

export function beginDecisionEpisode(input: {
  id: string;
  questionType: DecisionQuestionType;
  questionText?: string;
  targetId?: string;
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
  const evidence = builtEvidence;
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
  const proposed = {
    ...transitionDecisionEpisode(episode, 'PROPOSED', input.now),
    candidateActions: candidates,
    targetOutcome: candidates[0] ? {
      horizon: candidates[0].outcomeHorizon,
      fields: candidates[0].outcomeFields,
    } : episode.targetOutcome,
    leverage: episode.leverage ? { ...episode.leverage, decisionTimeMs: Math.max(0, Date.parse(input.now) - Date.parse(episode.createdAt)) } : undefined,
  };
  const packet = addHistoricalDecisionEvidence(evidence.packet, input.data.decisionResults ?? [], proposed, input.data.executionLogs);
  return {
    ...proposed,
    evidencePacket: packet,
    limitations: Array.from(new Set([...proposed.limitations, ...packet.limitations])),
    provenance: { ...proposed.provenance, sourceIds: Array.from(new Set([...proposed.provenance.sourceIds, ...packet.sourceArtifactIds])) },
    // Historical outcomes explain the matching option; they do not choose or re-rank it.
    candidateActions: candidates.map((action) => {
      const historyId = `evidence-historical-decisions:${action.id}`;
      return packet.items.some((item) => item.id === historyId)
        ? { ...action, evidenceItemIds: [...action.evidenceItemIds, historyId] } : action;
    }),
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
  if ((input.episode.status === 'APPLIED' || input.episode.status === 'FOLLOW_UP_DUE') && input.episode.appliedPlanPatch) {
    return { episode: input.episode, scheduleBlocks: input.scheduleBlocks };
  }
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
      followUpPlan: applied.subject.kind === 'demo'
        ? createDecisionFollowUpPlan(applied.id, selected, input.appliedAt) : undefined,
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
  executionLogs?: ExecutionLog[];
}): { episode: DecisionEpisodeV1; scheduleBlocks: ScheduleBlock[] } {
  if ((input.episode.status !== 'APPLIED' && input.episode.status !== 'FOLLOW_UP_DUE') || !input.episode.appliedPlanPatch) {
    return { episode: input.episode, scheduleBlocks: input.scheduleBlocks };
  }
  if (!input.episode.undoState.available && input.episode.undoState.usedAt) {
    return { episode: input.episode, scheduleBlocks: input.scheduleBlocks };
  }
  const scheduleBlocks = undoDecisionPlanPatch(input.scheduleBlocks, input.episode.appliedPlanPatch);
  if (input.episode.subject.kind === 'owner' && JSON.stringify(scheduleBlocks) !== JSON.stringify(input.scheduleBlocks)) {
    const patch = input.episode.appliedPlanPatch;
    const changedIds = new Set(patch.operations.map((operation) => operation.blockId));
    if ((input.executionLogs ?? []).some((log) => log.linkedScheduleBlockId && changedIds.has(log.linkedScheduleBlockId) && !log.dataProvenance?.deleted)) {
      throw new DecisionPlanPatchConflictError('Cannot undo a plan adjustment after linked execution.');
    }
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: input.episode.time.timezone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date(input.undoneAt));
    const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)!.value;
    const now = `${value('year')}-${value('month')}-${value('day')}T${value('hour')}:${value('minute')}`;
    if (patch.operations.some((operation) => [operation.before, operation.after].some((block) => (
      block && `${block.date}T${block.startTime}` <= now
    )))) throw new DecisionPlanPatchConflictError('Cannot undo a started or expired schedule placement.');
  }
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
  executionLogs: ExecutionLog[] = [],
): DecisionEpisodeV1[] {
  const actions = episode.selectedActionId
    ? episode.candidateActions.filter((action) => action.id === episode.selectedActionId)
    : episode.candidateActions;
  return eligibleHistory(results, episode, executionLogs)
    .filter((entry) => actions.some((action) => matchingAction(entry.episode, episode, action)))
    .map((entry) => entry.episode);
}
