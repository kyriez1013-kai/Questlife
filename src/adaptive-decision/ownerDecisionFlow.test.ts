import assert from 'node:assert/strict';
import type { AppData, ScheduleBlock } from '../types';
import { DEFAULT_DATA } from '../types';
import { createDecisionPlanPatch } from './planPatch';
import type { DecisionCandidateActionV1, DecisionEpisodeV1 } from './decisionEpisode';
import {
  candidateHasFeasibleExactPatch,
  dueOwnerDecisionEpisode,
  inferOwnerDecisionIntent,
  retainFeasibleOwnerCandidates,
} from './ownerDecisionFlow';

function block(input: Partial<ScheduleBlock> & Pick<ScheduleBlock, 'id' | 'title'>): ScheduleBlock {
  return {
    id: input.id,
    title: input.title,
    date: input.date ?? '2026-09-02',
    startTime: input.startTime ?? '18:00',
    endTime: input.endTime ?? '19:00',
    plannedMinutes: input.plannedMinutes ?? 60,
    taskType: input.taskType ?? 'deep_study',
    flexibility: input.flexibility ?? 'movable',
    rigidity: input.rigidity ?? 'medium',
    status: input.status ?? 'planned',
    createdAt: input.createdAt ?? 1,
  };
}

const training = block({ id: 'training', title: 'Strength', taskType: 'strength_training' });
const learning = block({ id: 'learning', title: 'Reading', taskType: 'deep_study', startTime: '20:00', endTime: '21:00' });
const data: AppData = { ...DEFAULT_DATA, scheduleBlocks: [training, learning] };

assert.deepEqual(
  inferOwnerDecisionIntent({ data, now: '2026-09-02T17:00:00+08:00', timezone: 'Asia/Shanghai' }),
  {
    questionType: 'training_recovery',
    questionKey: 'adaptiveCoreQuestionTraining',
    questionValues: { title: 'Strength' },
    targetId: 'training',
  },
);
assert.equal(
  inferOwnerDecisionIntent({ data: { scheduleBlocks: [learning] }, now: '2026-09-02T19:00:00+08:00', timezone: 'Asia/Shanghai' }).questionType,
  'cognitive_adjustment',
);
assert.equal(
  inferOwnerDecisionIntent({ data: { scheduleBlocks: [] }, now: '2026-09-02T19:00:00+08:00', timezone: 'Asia/Shanghai' }).questionType,
  'custom',
);

const occupied = block({ id: 'occupied', title: 'Fixed', date: '2026-09-03', flexibility: 'fixed', startTime: '18:00', endTime: '19:00' });
const moved = { ...training, date: '2026-09-03' };
const movePatch = createDecisionPlanPatch({
  id: 'move-patch',
  generatedAt: '2026-09-02T17:00:00+08:00',
  date: '2026-09-02',
  before: [training],
  after: [moved],
});
const candidate = {
  id: 'move',
  kind: 'move',
  titleKey: 'adaptiveActionMoveTask',
  descriptionKey: 'adaptiveActionMoveTaskDescription',
  exactEffectKey: 'adaptiveEffectMoveTomorrow',
  protectsKey: 'adaptiveProtectsFixedCommitment',
  feasibilityKey: 'adaptiveFeasibleMovableBlock',
  uncertaintyKey: 'adaptiveUncertaintyTomorrowCapacity',
  reversible: true,
  outcomeHorizon: 'next_morning',
  outcomeFields: ['task_result'],
  evidenceItemIds: [],
  constraintIds: [],
  planPatch: movePatch,
  policyTrace: [],
} satisfies DecisionCandidateActionV1;
assert.equal(candidateHasFeasibleExactPatch(candidate, [training, occupied]), false);

const episode = {
  candidateActions: [candidate],
  limitations: [],
} as unknown as DecisionEpisodeV1;
const filtered = retainFeasibleOwnerCandidates(episode, [training, occupied]);
assert.equal(filtered.candidateActions.length, 0);
assert.ok(filtered.limitations.includes('INFEASIBLE_EXACT_PLAN_PATCH_EXCLUDED'));

const dueEpisode = {
  id: 'owner-due',
  subject: { kind: 'owner' },
  status: 'APPLIED',
  updatedAt: '2026-09-02T08:00:00Z',
  followUpPlan: {
    id: 'follow-up',
    horizon: 'two_hours',
    dueAt: '2026-09-02T10:00:00Z',
    requiredFields: ['state'],
    status: 'pending',
  },
} as unknown as DecisionEpisodeV1;
assert.equal(dueOwnerDecisionEpisode([{
  id: dueEpisode.id,
  createdAt: dueEpisode.updatedAt,
  mode: 'daily_brief',
  trigger: 'manual',
  source: 'legacy_fallback',
  schemaVersion: dueEpisode.contractVersion,
  headlineInsight: 'owner',
  evidenceBasis: 'mixed',
  decisionEpisode: dueEpisode,
}], '2026-09-02T10:01:00Z')?.status, 'FOLLOW_UP_DUE');

console.log('owner decision flow inference, exact placement, and follow-up: passed');
