import type { ScheduleBlock } from '../types';
import type {
  DecisionCandidateActionV1,
  DecisionContextSnapshotV1,
  DecisionEvidencePacketV1,
  DecisionQuestionType,
  DecisionSafetyStatusV1,
} from './decisionEpisode';
import {
  createDecisionPlanPatch,
  scheduleBlockOnNextDay,
  scheduleBlockWithDuration,
} from './planPatch';

export type GenerateDecisionProposalsInput = {
  episodeId: string;
  questionType: DecisionQuestionType;
  context: DecisionContextSnapshotV1;
  evidence: DecisionEvidencePacketV1;
  safety: DecisionSafetyStatusV1;
  generatedAt: string;
};

function patchFor(
  input: GenerateDecisionProposalsInput,
  kind: string,
  after: ScheduleBlock[],
  unplacedBlockIds: string[] = [],
) {
  return createDecisionPlanPatch({
    id: `${input.episodeId}:patch:${kind}`,
    generatedAt: input.generatedAt,
    date: input.context.schedule.date,
    before: input.context.schedule.blocks,
    after,
    unplacedBlockIds,
  });
}

function trace(input: GenerateDecisionProposalsInput, reversible: boolean, patchOperations: number) {
  const evidenceRelevant = input.evidence.eligibility !== 'abstained';
  return [
    { criterion: 'safety', outcome: input.safety.level === 'normal' ? 'pass' as const : 'blocked' as const, reason: input.safety.reasonCodes.join(',') || 'normal_context' },
    { criterion: 'feasibility', outcome: patchOperations > 0 || input.context.schedule.blocks.length === 0 ? 'pass' as const : 'limited' as const, reason: patchOperations > 0 ? 'explicit_patch_available' : 'no_plan_mutation_required' },
    { criterion: 'explicit_constraints', outcome: 'pass' as const, reason: 'fixed_blocks_unchanged' },
    { criterion: 'reversibility', outcome: reversible ? 'pass' as const : 'limited' as const, reason: reversible ? 'exact_snapshot_undo' : 'no_automatic_reversal' },
    { criterion: 'evidence_relevance', outcome: evidenceRelevant ? 'pass' as const : 'limited' as const, reason: evidenceRelevant ? input.evidence.target : 'explicit_constraints_only' },
    { criterion: 'goal_alignment', outcome: input.context.direction ? 'pass' as const : 'limited' as const, reason: input.context.direction?.goalId ?? 'goal_not_linked' },
  ];
}

function candidate(
  input: GenerateDecisionProposalsInput,
  config: Omit<DecisionCandidateActionV1, 'id' | 'planPatch' | 'policyTrace'> & { after: ScheduleBlock[]; unplacedBlockIds?: string[] },
): DecisionCandidateActionV1 {
  const planPatch = patchFor(input, config.kind, config.after, config.unplacedBlockIds);
  return {
    id: `${input.episodeId}:action:${config.kind}`,
    kind: config.kind,
    titleKey: config.titleKey,
    descriptionKey: config.descriptionKey,
    exactEffectKey: config.exactEffectKey,
    values: config.values,
    protectsKey: config.protectsKey,
    feasibilityKey: config.feasibilityKey,
    uncertaintyKey: config.uncertaintyKey,
    reversible: config.reversible,
    outcomeHorizon: config.outcomeHorizon,
    outcomeFields: config.outcomeFields,
    evidenceItemIds: config.evidenceItemIds,
    constraintIds: config.constraintIds,
    planPatch,
    policyTrace: trace(input, config.reversible, planPatch.operations.length),
  };
}

function relevantEvidenceIds(evidence: DecisionEvidencePacketV1): string[] {
  return evidence.items
    .filter((item) => item.category === 'fact' || item.category === 'personal_comparison' || item.category === 'joint_evidence')
    .slice(0, 3)
    .map((item) => item.id);
}

function primaryMovableBlock(
  context: DecisionContextSnapshotV1,
  questionType: DecisionQuestionType,
) {
  const movable = context.schedule.blocks.filter(
    (block) => block.flexibility !== 'fixed' && block.status !== 'completed',
  );
  const relevantTaskTypes = questionType === 'training_recovery'
    ? new Set(['strength_training', 'cardio_recovery'])
    : questionType === 'cognitive_adjustment' || questionType === 'custom'
      ? new Set(['deep_study', 'light_review', 'creative_building'])
      : null;
  return relevantTaskTypes
    ? movable.find((block) => relevantTaskTypes.has(block.taskType)) ?? movable[0]
    : movable[0];
}

function withReplacement(blocks: ScheduleBlock[], replacement: ScheduleBlock) {
  return blocks.map((block) => block.id === replacement.id ? replacement : block);
}

function unchangedCandidate(input: GenerateDecisionProposalsInput, kind: 'continue' | 'protect'): DecisionCandidateActionV1 {
  return candidate(input, {
    kind,
    titleKey: kind === 'continue' ? 'adaptiveActionContinue' : 'adaptiveActionProtect',
    descriptionKey: kind === 'continue' ? 'adaptiveActionContinueDescription' : 'adaptiveActionProtectDescription',
    exactEffectKey: 'adaptiveEffectNoPlanChange',
    protectsKey: 'adaptiveProtectsPriority',
    feasibilityKey: 'adaptiveFeasibleNoConflict',
    uncertaintyKey: 'adaptiveUncertaintyObserveOutcome',
    reversible: true,
    outcomeHorizon: 'end_of_day',
    outcomeFields: ['task_result', 'state', 'usefulness'],
    evidenceItemIds: relevantEvidenceIds(input.evidence),
    constraintIds: input.context.schedule.blocks.filter((block) => block.flexibility === 'fixed').map((block) => block.id),
    after: input.context.schedule.blocks,
  });
}

function trainingCandidates(input: GenerateDecisionProposalsInput): DecisionCandidateActionV1[] {
  const target = primaryMovableBlock(input.context, input.questionType);
  if (!target) return [unchangedCandidate(input, 'continue')];
  const reducedMinutes = Math.max(20, Math.min(30, Math.round(target.plannedMinutes * 0.5)));
  const shortened = scheduleBlockWithDuration(target, reducedMinutes);
  const moved = scheduleBlockOnNextDay(target);
  const lowState = (input.context.currentState?.overall ?? 3) <= 2;
  const shortSleep = input.context.sleepMinutes != null && input.context.sleepMinutes.value < 360;
  const elevatedLoad = (input.context.recentExecution?.totalMinutes ?? 0) >= 120;

  const shorten = candidate(input, {
    kind: 'shorten',
    titleKey: 'adaptiveActionReduceIntensity',
    descriptionKey: 'adaptiveActionReduceIntensityDescription',
    exactEffectKey: 'adaptiveEffectShorten',
    values: { title: target.title, from: target.plannedMinutes, to: reducedMinutes },
    protectsKey: 'adaptiveProtectsTrainingContinuity',
    feasibilityKey: 'adaptiveFeasibleKeepsWindow',
    uncertaintyKey: 'adaptiveUncertaintyNotCausal',
    reversible: true,
    outcomeHorizon: 'two_hours',
    outcomeFields: ['state', 'fatigue', 'task_result', 'usefulness'],
    evidenceItemIds: relevantEvidenceIds(input.evidence),
    constraintIds: [target.id],
    after: withReplacement(input.context.schedule.blocks, shortened),
  });
  const move = candidate(input, {
    kind: 'move',
    titleKey: 'adaptiveActionMoveTraining',
    descriptionKey: 'adaptiveActionMoveTrainingDescription',
    exactEffectKey: 'adaptiveEffectMoveTomorrow',
    values: { title: target.title, from: target.date, to: moved.date },
    protectsKey: 'adaptiveProtectsEveningRecovery',
    feasibilityKey: 'adaptiveFeasibleMovableBlock',
    uncertaintyKey: 'adaptiveUncertaintyTomorrowCapacity',
    reversible: true,
    outcomeHorizon: 'next_morning',
    outcomeFields: ['state', 'fatigue', 'carryover', 'usefulness'],
    evidenceItemIds: relevantEvidenceIds(input.evidence),
    constraintIds: [target.id],
    after: withReplacement(input.context.schedule.blocks, moved),
  });
  const recover = candidate(input, {
    kind: 'recover',
    titleKey: 'adaptiveActionRecovery',
    descriptionKey: 'adaptiveActionRecoveryDescription',
    exactEffectKey: 'adaptiveEffectLeaveUnplaced',
    values: { title: target.title },
    protectsKey: 'adaptiveProtectsRecoveryWindow',
    feasibilityKey: 'adaptiveFeasibleOptionalBlock',
    uncertaintyKey: 'adaptiveUncertaintyNoTreatmentEffect',
    reversible: true,
    outcomeHorizon: 'two_hours',
    outcomeFields: ['state', 'fatigue', 'usefulness'],
    evidenceItemIds: relevantEvidenceIds(input.evidence),
    constraintIds: [target.id],
    after: input.context.schedule.blocks.filter((block) => block.id !== target.id),
    unplacedBlockIds: [target.id],
  });

  if (lowState && (shortSleep || elevatedLoad)) return [shorten, move, recover];
  return [unchangedCandidate(input, 'continue'), shorten, move];
}

function cognitiveCandidates(input: GenerateDecisionProposalsInput): DecisionCandidateActionV1[] {
  const target = primaryMovableBlock(input.context, input.questionType);
  if (!target) return [unchangedCandidate(input, 'continue')];
  const reducedMinutes = Math.max(15, Math.min(30, Math.round(target.plannedMinutes * 0.5)));
  const shorten = candidate(input, {
    kind: 'shorten',
    titleKey: 'adaptiveActionShortenFocus',
    descriptionKey: 'adaptiveActionShortenFocusDescription',
    exactEffectKey: 'adaptiveEffectShorten',
    values: { title: target.title, from: target.plannedMinutes, to: reducedMinutes },
    protectsKey: 'adaptiveProtectsTaskMomentum',
    feasibilityKey: 'adaptiveFeasibleBeforeCommitment',
    uncertaintyKey: 'adaptiveUncertaintyObserveFocus',
    reversible: true,
    outcomeHorizon: 'end_of_day',
    outcomeFields: ['task_result', 'state', 'usefulness'],
    evidenceItemIds: relevantEvidenceIds(input.evidence),
    constraintIds: [target.id],
    after: withReplacement(input.context.schedule.blocks, scheduleBlockWithDuration(target, reducedMinutes)),
  });
  const moved = candidate(input, {
    kind: 'move',
    titleKey: 'adaptiveActionMoveTask',
    descriptionKey: 'adaptiveActionMoveTaskDescription',
    exactEffectKey: 'adaptiveEffectMoveTomorrow',
    values: { title: target.title, from: target.date, to: scheduleBlockOnNextDay(target).date },
    protectsKey: 'adaptiveProtectsFixedCommitment',
    feasibilityKey: 'adaptiveFeasibleMovableBlock',
    uncertaintyKey: 'adaptiveUncertaintyTomorrowCapacity',
    reversible: true,
    outcomeHorizon: 'next_morning',
    outcomeFields: ['task_result', 'state', 'carryover', 'usefulness'],
    evidenceItemIds: relevantEvidenceIds(input.evidence),
    constraintIds: [target.id],
    after: withReplacement(input.context.schedule.blocks, scheduleBlockOnNextDay(target)),
  });
  const lowFocus = (input.context.currentState?.focus ?? input.context.currentState?.overall ?? 3) <= 2;
  return lowFocus ? [shorten, moved, unchangedCandidate(input, 'continue')] : [unchangedCandidate(input, 'continue'), shorten, moved];
}

function overloadedCandidates(input: GenerateDecisionProposalsInput): DecisionCandidateActionV1[] {
  const flexible = input.context.schedule.blocks.filter((block) => block.flexibility !== 'fixed' && block.status !== 'completed');
  if (flexible.length === 0) return [unchangedCandidate(input, 'protect')];
  const rigidityRank = { low: 0, medium: 1, high: 2 } as const;
  const nonPriority = flexible.filter((block) => block.rigidity !== 'high');
  const capacityTarget = (nonPriority.length > 0 ? nonPriority : flexible)
    .slice()
    .sort((a, b) => b.plannedMinutes - a.plannedMinutes || a.id.localeCompare(b.id))[0];
  const lowestPriority = flexible.slice().sort((a, b) => (
    rigidityRank[a.rigidity] - rigidityRank[b.rigidity]
    || a.plannedMinutes - b.plannedMinutes
    || b.startTime.localeCompare(a.startTime)
    || a.id.localeCompare(b.id)
  ))[0];
  const shortened = scheduleBlockWithDuration(capacityTarget, Math.max(15, Math.round(capacityTarget.plannedMinutes * 0.5)));
  const moved = scheduleBlockOnNextDay(lowestPriority);

  const protectAndShorten = candidate(input, {
    kind: 'protect',
    titleKey: 'adaptiveActionProtectPriority',
    descriptionKey: 'adaptiveActionProtectPriorityDescription',
    exactEffectKey: 'adaptiveEffectShorten',
    values: { title: capacityTarget.title, from: capacityTarget.plannedMinutes, to: shortened.plannedMinutes },
    protectsKey: 'adaptiveProtectsFixedAndPriority',
    feasibilityKey: 'adaptiveFeasibleReleasesCapacity',
    uncertaintyKey: 'adaptiveUncertaintyPriorityExplicit',
    reversible: true,
    outcomeHorizon: 'end_of_day',
    outcomeFields: ['task_result', 'state', 'carryover', 'usefulness'],
    evidenceItemIds: relevantEvidenceIds(input.evidence),
    constraintIds: input.context.schedule.blocks.filter((block) => block.flexibility === 'fixed').map((block) => block.id),
    after: withReplacement(input.context.schedule.blocks, shortened),
  });
  const moveLowPriority = candidate(input, {
    kind: 'move',
    titleKey: 'adaptiveActionMoveLowPriority',
    descriptionKey: 'adaptiveActionMoveLowPriorityDescription',
    exactEffectKey: 'adaptiveEffectMoveTomorrow',
    values: { title: lowestPriority.title, from: lowestPriority.date, to: moved.date },
    protectsKey: 'adaptiveProtectsFixedAndPriority',
    feasibilityKey: 'adaptiveFeasibleMovableBlock',
    uncertaintyKey: 'adaptiveUncertaintyTomorrowCapacity',
    reversible: true,
    outcomeHorizon: 'next_morning',
    outcomeFields: ['task_result', 'carryover', 'usefulness'],
    evidenceItemIds: relevantEvidenceIds(input.evidence),
    constraintIds: [lowestPriority.id],
    after: withReplacement(input.context.schedule.blocks, moved),
  });
  const leaveUnplaced = candidate(input, {
    kind: 'leave_unplaced',
    titleKey: 'adaptiveActionLeaveUnplaced',
    descriptionKey: 'adaptiveActionLeaveUnplacedDescription',
    exactEffectKey: 'adaptiveEffectLeaveUnplaced',
    values: { title: lowestPriority.title },
    protectsKey: 'adaptiveProtectsAvailableCapacity',
    feasibilityKey: 'adaptiveFeasibleDoesNotOverpack',
    uncertaintyKey: 'adaptiveUncertaintyCarryover',
    reversible: true,
    outcomeHorizon: 'end_of_day',
    outcomeFields: ['task_result', 'carryover', 'usefulness'],
    evidenceItemIds: relevantEvidenceIds(input.evidence),
    constraintIds: [lowestPriority.id],
    after: input.context.schedule.blocks.filter((block) => block.id !== lowestPriority.id),
    unplacedBlockIds: [lowestPriority.id],
  });
  return [protectAndShorten, moveLowPriority, leaveUnplaced];
}

function abstainCandidate(input: GenerateDecisionProposalsInput): DecisionCandidateActionV1 {
  return candidate(input, {
    kind: 'abstain',
    titleKey: 'adaptiveActionSafetyFirst',
    descriptionKey: 'adaptiveActionSafetyFirstDescription',
    exactEffectKey: 'adaptiveEffectNoPlanChange',
    protectsKey: 'adaptiveProtectsSafety',
    feasibilityKey: 'adaptiveFeasibleNoAutomaticPrescription',
    uncertaintyKey: 'adaptiveUncertaintySafetySensitive',
    reversible: true,
    outcomeHorizon: 'two_hours',
    outcomeFields: ['state', 'usefulness'],
    evidenceItemIds: [],
    constraintIds: [],
    after: input.context.schedule.blocks,
  });
}

export function generateDecisionProposals(input: GenerateDecisionProposalsInput): DecisionCandidateActionV1[] {
  if (input.safety.level === 'blocked') return [abstainCandidate(input)];
  if (input.safety.level === 'needs_clarification') return [];
  const proposals = input.questionType === 'training_recovery'
    ? trainingCandidates(input)
    : input.questionType === 'cognitive_adjustment'
      ? cognitiveCandidates(input)
      : input.questionType === 'overloaded_day'
        ? overloadedCandidates(input)
        : cognitiveCandidates(input);
  const distinct = new Map(proposals.map((proposal) => [proposal.kind, proposal]));
  return Array.from(distinct.values()).slice(0, 3);
}
