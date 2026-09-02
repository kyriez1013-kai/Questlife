import assert from 'node:assert/strict';
import driverBundle from '../quant-product/fixtures/driver_analysis_full.json';
import analysisExtension from '../quant-product/fixtures/analysis_extension_v1.json';
import type { DataRecordProvenance, ScheduleBlock } from '../types';
import {
  applyAcceptedDecision,
  beginDecisionEpisode,
  decisionEpisodeToResult,
  proposeDecisionEpisode,
  selectDecisionAction,
  similarCompletedEpisodes,
  undoAppliedDecision,
  type DecisionEngineData,
} from './decisionEngine';
import { markDecisionFollowUpDue, recordDecisionOutcome, skipDecisionFollowUp } from './followUp';

const NOW = '2025-05-01T18:00:00+00:00';

function debugProvenance(id: string): DataRecordProvenance {
  return {
    schemaVersion: 'questlife.data.provenance.v1',
    origin: 'DEBUG_FIXTURE',
    confirmation: 'NOT_REQUIRED',
    captureMethod: 'manual_form',
    recordedAt: id,
    availableAt: id,
    timezone: 'UTC',
  };
}

const workout: ScheduleBlock = {
  id: 'workout',
  title: 'Strength training',
  date: '2025-05-01',
  startTime: '19:00',
  endTime: '20:00',
  plannedMinutes: 60,
  linkedGoalId: 'goal-strength',
  linkedSkillId: 'skill-strength',
  taskType: 'strength_training',
  flexibility: 'movable',
  rigidity: 'medium',
  status: 'planned',
  createdAt: 1,
  source: 'manual',
};
const fixed: ScheduleBlock = {
  ...workout,
  id: 'fixed',
  title: 'Fixed commitment',
  startTime: '21:00',
  endTime: '22:00',
  flexibility: 'fixed',
  rigidity: 'high',
};

const data: DecisionEngineData = {
  stateCheckIns: [{
    id: 'state-1',
    date: '2025-05-01',
    timestamp: '2025-05-01T17:45:00+00:00',
    overall: 2,
    energy: 2,
    focus: 2,
    createdAt: '2025-05-01T17:45:00+00:00',
    dataProvenance: debugProvenance('2025-05-01T17:45:00+00:00'),
  }],
  contextLogs: [{
    id: 'sleep-1',
    type: 'sleep',
    label: 'sleep',
    value: 5.5,
    unit: 'hours',
    createdAt: '2025-05-01T07:00:00+00:00',
    dataProvenance: debugProvenance('2025-05-01T07:00:00+00:00'),
  }],
  executionLogs: [{
    id: 'execution-1',
    date: '2025-04-30',
    durationMinutes: 180,
    qualityRating: 3,
    source: 'manual',
    createdAt: '2025-04-30T18:00:00+00:00',
    appliedToProgress: true,
    dataProvenance: debugProvenance('2025-04-30T18:00:00+00:00'),
  }],
  scheduleBlocks: [workout, fixed],
  goals: [],
  categories: [{ id: 'goal-strength', name: 'Strength', createdAt: 1 }],
  skills: [{
    id: 'skill-strength',
    categoryId: 'goal-strength',
    name: 'Strength training',
    color: '#888888',
    progressType: 'time_based',
    totalXP: 0,
    dailyTargetMinutes: 45,
    completedHours: 0,
    taskType: 'strength_training',
    createdAt: 1,
  }],
};

const draft = beginDecisionEpisode({
  id: 'episode-training',
  questionType: 'training_recovery',
  questionText: '我现在状态不好，今天还要不要训练？',
  subjectKind: 'demo',
  now: NOW,
  timezone: 'UTC',
  observationWindowStart: '2025-04-01T00:00:00+00:00',
});
const proposed = proposeDecisionEpisode({
  episode: draft,
  data,
  quantProduct: driverBundle,
  quantAnalysis: analysisExtension,
  now: '2025-05-01T18:00:01+00:00',
});
assert.equal(proposed.status, 'PROPOSED');
assert.equal(proposed.missingContext.length, 0);
assert.deepEqual(proposed.candidateActions.map((item) => item.kind), ['shorten', 'move', 'recover']);
assert.equal(proposed.evidencePacket?.jointModel, undefined);
assert.ok(proposed.limitations.includes('QUANT_ANALYSIS_AFTER_DECISION_AS_OF'));

const accepted = selectDecisionAction(proposed, proposed.candidateActions[0].id, '2025-05-01T18:00:02+00:00');
assert.equal(accepted.status, 'ACCEPTED');
assert.equal(data.scheduleBlocks[0].plannedMinutes, 60, 'selection must not mutate the plan');

const applied = applyAcceptedDecision({ episode: accepted, scheduleBlocks: data.scheduleBlocks, appliedAt: '2025-05-01T18:00:03+00:00' });
assert.equal(applied.episode.status, 'APPLIED');
assert.equal(applied.scheduleBlocks.find((item) => item.id === 'workout')?.plannedMinutes, 30);
assert.equal(applied.scheduleBlocks.find((item) => item.id === 'fixed')?.plannedMinutes, 60);
assert.equal(applied.episode.followUpPlan?.status, 'pending');

assert.throws(() => recordDecisionOutcome(applied.episode, {
  state: 3,
  fatigue: 2,
  taskResult: 'completed',
  usefulness: 'helpful',
}, '2025-05-01T18:30:00+00:00'));

const due = markDecisionFollowUpDue(applied.episode, '2025-05-01T20:00:03+00:00');
assert.equal(due.status, 'FOLLOW_UP_DUE');
assert.throws(() => recordDecisionOutcome(due, { state: 3 }, '2025-05-01T20:01:00+00:00'));
const completed = recordDecisionOutcome(due, {
  state: 3,
  fatigue: 2,
  taskResult: 'completed',
  usefulness: 'helpful',
}, '2025-05-01T20:01:00+00:00');
assert.equal(completed.status, 'OUTCOME_RECORDED');
assert.equal(completed.followUpOutcomes.length, 1);
assert.equal(completed.leverage?.followUpCompleted, true);

const result = decisionEpisodeToResult({ episode: completed, headline: 'Reduced training and checked the result' });
assert.equal(result.decisionEpisode?.id, completed.id);
assert.equal(result.meta?.model, 'questlife.decision.policy.v1');
assert.equal(similarCompletedEpisodes([{ ...result }], { ...completed, id: 'later-episode' }).length, 1);

const appliedAgain = applyAcceptedDecision({ episode: accepted, scheduleBlocks: data.scheduleBlocks, appliedAt: '2025-05-01T18:00:03+00:00' });
const undone = undoAppliedDecision({ episode: appliedAgain.episode, scheduleBlocks: appliedAgain.scheduleBlocks, undoneAt: '2025-05-01T18:10:00+00:00' });
assert.equal(undone.episode.status, 'PROPOSED');
assert.deepEqual(undone.scheduleBlocks, data.scheduleBlocks);
const repeatedUndo = undoAppliedDecision({ episode: undone.episode, scheduleBlocks: undone.scheduleBlocks, undoneAt: '2025-05-01T18:11:00+00:00' });
assert.deepEqual(repeatedUndo, undone);

const skipped = skipDecisionFollowUp(due, '2025-05-01T20:02:00+00:00');
assert.equal(skipped.status, 'CLOSED');
assert.equal(skipped.followUpPlan?.status, 'skipped');

const sparseDraft = beginDecisionEpisode({
  id: 'episode-sparse',
  questionType: 'cognitive_adjustment',
  subjectKind: 'owner',
  now: NOW,
  timezone: 'UTC',
  observationWindowStart: '2025-04-01T00:00:00+00:00',
});
const sparseData: DecisionEngineData = { stateCheckIns: [], contextLogs: [], executionLogs: [], scheduleBlocks: [], goals: [], categories: [], skills: [] };
const needsInput = proposeDecisionEpisode({ episode: sparseDraft, data: sparseData, now: NOW });
assert.equal(needsInput.status, 'NEEDS_INPUT');
assert.equal(needsInput.missingContext.length, 2);
const answered = proposeDecisionEpisode({
  episode: needsInput,
  data: sparseData,
  answers: { 'current-state': '2', 'target-flexibility': 'movable' },
  now: '2025-05-01T18:01:00+00:00',
});
assert.equal(answered.status, 'PROPOSED');
assert.equal(answered.evidencePacket?.eligibility, 'limited');

const memoryDraft = beginDecisionEpisode({
  id: 'episode-memory-next',
  questionType: 'training_recovery',
  subjectKind: 'owner',
  now: '2025-05-02T18:00:00+00:00',
  timezone: 'UTC',
  observationWindowStart: '2025-04-02T00:00:00+00:00',
});
const ownerHistory = {
  ...completed,
  subject: { kind: 'owner' as const },
  provenance: {
    ...completed.provenance,
    origin: 'OWNER_OBSERVED' as const,
    syntheticOnly: false,
    containsRealUserData: true,
  },
};
const memoryData: DecisionEngineData = {
  ...data,
  stateCheckIns: data.stateCheckIns.map((item) => ({
    ...item,
    dataProvenance: { ...item.dataProvenance!, origin: 'OWNER_OBSERVED' as const },
  })),
  contextLogs: data.contextLogs.map((item) => ({
    ...item,
    dataProvenance: { ...item.dataProvenance!, origin: 'OWNER_OBSERVED' as const },
  })),
  executionLogs: data.executionLogs.map((item) => ({
    ...item,
    dataProvenance: { ...item.dataProvenance!, origin: 'OWNER_OBSERVED' as const },
  })),
  decisionResults: [{ ...result, decisionEpisode: ownerHistory }],
};
const withMemory = proposeDecisionEpisode({
  episode: memoryDraft,
  data: memoryData,
  answers: { 'target-flexibility': 'movable' },
  now: '2025-05-02T18:00:01+00:00',
});
assert.equal(withMemory.evidencePacket?.highestEvidenceLevel, 'E');
assert.ok(withMemory.evidencePacket?.items.some((item) => item.category === 'historical_decision'));
assert.ok(withMemory.candidateActions[0].evidenceItemIds.includes('evidence-historical-decisions'));

const blockedDraft = beginDecisionEpisode({
  id: 'episode-blocked',
  questionType: 'training_recovery',
  questionText: '我胸痛但想继续训练',
  subjectKind: 'demo',
  now: NOW,
  timezone: 'UTC',
  observationWindowStart: '2025-04-01T00:00:00+00:00',
});
const blocked = proposeDecisionEpisode({ episode: blockedDraft, data, now: NOW });
assert.equal(blocked.status, 'ABSTAINED');
assert.deepEqual(blocked.candidateActions.map((item) => item.kind), ['abstain']);

console.log('adaptive decision engine follow-up and memory loop: passed');
