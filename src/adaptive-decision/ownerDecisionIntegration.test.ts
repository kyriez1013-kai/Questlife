import assert from 'node:assert/strict';
import type { AppData, DataRecordProvenance, ScheduleBlock } from '../types';
import { DEFAULT_DATA } from '../types';
import {
  applyAcceptedDecision,
  beginDecisionEpisode,
  decisionEpisodeToResult,
  proposeDecisionEpisode,
  selectDecisionAction,
  undoAppliedDecision,
} from './decisionEngine';
import { markDecisionFollowUpDue, recordDecisionOutcome } from './followUp';
import { inferOwnerDecisionIntent, retainFeasibleOwnerCandidates } from './ownerDecisionFlow';

const NOW = '2026-09-02T17:00:00+08:00';
const ZONE = 'Asia/Shanghai';

function ownerProvenance(at: string): DataRecordProvenance {
  return {
    schemaVersion: 'questlife.data.provenance.v1',
    origin: 'OWNER_OBSERVED',
    confirmation: 'USER_ENTERED',
    captureMethod: 'manual_form',
    recordedAt: at,
    availableAt: at,
    timezone: ZONE,
  };
}

const training: ScheduleBlock = {
  id: 'owner-training',
  title: 'Strength training',
  date: '2026-09-02',
  startTime: '19:00',
  endTime: '20:00',
  plannedMinutes: 60,
  linkedGoalId: 'owner-goal',
  linkedSkillId: 'owner-skill',
  taskType: 'strength_training',
  flexibility: 'movable',
  rigidity: 'medium',
  status: 'planned',
  createdAt: 1,
  source: 'manual',
};

const fixed: ScheduleBlock = {
  ...training,
  id: 'owner-fixed',
  title: 'Fixed commitment',
  startTime: '21:00',
  endTime: '22:00',
  flexibility: 'fixed',
  rigidity: 'high',
  placementLocked: true,
};

const data: AppData = {
  ...DEFAULT_DATA,
  categories: [{ id: 'owner-goal', name: 'Strength', createdAt: 1 }],
  skills: [{
    id: 'owner-skill',
    categoryId: 'owner-goal',
    name: 'Strength training',
    color: '#888888',
    progressType: 'time_based',
    totalXP: 0,
    dailyTargetMinutes: 45,
    completedHours: 0,
    taskType: 'strength_training',
    createdAt: 1,
  }],
  stateCheckIns: [{
    id: 'owner-state',
    date: '2026-09-02',
    timestamp: '2026-09-02T16:30:00+08:00',
    overall: 2,
    energy: 2,
    focus: 3,
    createdAt: '2026-09-02T16:30:00+08:00',
    dataProvenance: ownerProvenance('2026-09-02T16:30:00+08:00'),
  }],
  contextLogs: [{
    id: 'owner-sleep',
    type: 'sleep',
    label: 'sleep',
    value: 5.75,
    unit: 'hours',
    createdAt: '2026-09-02T07:00:00+08:00',
    dataProvenance: ownerProvenance('2026-09-02T07:00:00+08:00'),
  }],
  executionLogs: [{
    id: 'owner-execution',
    date: '2026-09-01',
    durationMinutes: 75,
    qualityRating: 3,
    source: 'manual',
    createdAt: '2026-09-01T19:00:00+08:00',
    appliedToProgress: true,
    linkedGoalId: 'owner-goal',
    linkedSkillId: 'owner-skill',
    dataProvenance: ownerProvenance('2026-09-01T19:00:00+08:00'),
  }],
  scheduleBlocks: [training, fixed],
};

const intent = inferOwnerDecisionIntent({ data, now: NOW, timezone: ZONE });
assert.equal(intent.questionType, 'training_recovery');
assert.equal(intent.targetId, training.id);

const draft = beginDecisionEpisode({
  id: 'owner-core-e2e',
  questionType: intent.questionType,
  questionText: 'Should I keep the strength session tonight?',
  targetId: intent.targetId,
  subjectKind: 'owner',
  now: NOW,
  timezone: ZONE,
  observationWindowStart: '2026-08-05T17:00:00+08:00',
});
const proposed = retainFeasibleOwnerCandidates(proposeDecisionEpisode({
  episode: draft,
  data,
  now: '2026-09-02T17:00:01+08:00',
}), data.scheduleBlocks);

assert.equal(proposed.status, 'PROPOSED');
assert.equal(proposed.subject.kind, 'owner');
assert.equal(proposed.provenance.syntheticOnly, false);
assert.equal(proposed.missingContext.length, 0);
assert.equal(proposed.evidencePacket?.highestEvidenceLevel, 'A');
assert.ok(proposed.contextSnapshot?.facts.length);
assert.ok(proposed.candidateActions.length >= 1 && proposed.candidateActions.length <= 3);
assert.equal(data.scheduleBlocks[0].plannedMinutes, 60, 'proposal preview must not mutate the owner plan');

const selected = selectDecisionAction(proposed, proposed.candidateActions[0].id, '2026-09-02T17:00:02+08:00');
const applied = applyAcceptedDecision({
  episode: selected,
  scheduleBlocks: data.scheduleBlocks,
  appliedAt: '2026-09-02T17:00:03+08:00',
});
assert.equal(applied.episode.status, 'APPLIED');
assert.notDeepEqual(applied.scheduleBlocks, data.scheduleBlocks);
assert.deepEqual(applied.scheduleBlocks.find((block) => block.id === fixed.id), fixed);

const undone = undoAppliedDecision({
  episode: applied.episode,
  scheduleBlocks: applied.scheduleBlocks,
  undoneAt: '2026-09-02T17:00:04+08:00',
});
assert.deepEqual(undone.scheduleBlocks, data.scheduleBlocks, 'Undo must restore the exact owner schedule snapshot');

const reselected = selectDecisionAction(undone.episode, proposed.candidateActions[0].id, '2026-09-02T17:00:05+08:00');
const reapplied = applyAcceptedDecision({
  episode: reselected,
  scheduleBlocks: undone.scheduleBlocks,
  appliedAt: '2026-09-02T17:00:06+08:00',
});
const due = markDecisionFollowUpDue(reapplied.episode, reapplied.episode.followUpPlan!.dueAt);
assert.equal(due.status, 'FOLLOW_UP_DUE');
const completed = recordDecisionOutcome(due, {
  state: 3,
  fatigue: 2,
  taskResult: 'partially_completed',
  usefulness: 'helpful',
}, due.followUpPlan!.dueAt);
const memory = decisionEpisodeToResult({ episode: completed, headline: 'Owner decision memory' });
assert.equal(memory.decisionEpisode?.followUpOutcomes.length, 1);
assert.equal(memory.decisionEpisode?.leverage?.followUpCompleted, true);

const later = beginDecisionEpisode({
  id: 'owner-core-later',
  questionType: 'training_recovery',
  questionText: 'Should I adjust training again?',
  targetId: training.id,
  subjectKind: 'owner',
  now: '2026-09-03T17:00:00+08:00',
  timezone: ZONE,
  observationWindowStart: '2026-08-06T17:00:00+08:00',
});
const withMemory = proposeDecisionEpisode({
  episode: later,
  data: { ...data, decisionResults: [memory] },
  now: '2026-09-03T17:00:01+08:00',
});
assert.equal(withMemory.evidencePacket?.highestEvidenceLevel, 'E');
assert.ok(withMemory.evidencePacket?.items.some((item) => item.category === 'historical_decision'));

const unsafe = beginDecisionEpisode({
  id: 'owner-core-unsafe',
  questionType: 'training_recovery',
  questionText: 'I feel dizzy and have chest pain. Should I train?',
  targetId: training.id,
  subjectKind: 'owner',
  now: NOW,
  timezone: ZONE,
  observationWindowStart: '2026-08-05T17:00:00+08:00',
});
const abstained = proposeDecisionEpisode({ episode: unsafe, data, now: NOW });
assert.equal(abstained.status, 'ABSTAINED');
assert.equal(abstained.safetyStatus.level, 'blocked');
assert.ok(abstained.candidateActions.every((candidate) => candidate.planPatch.operations.length === 0));

console.log('owner QuestLife Core E2E apply, exact Undo, follow-up, memory, and safety: passed');
