import assert from 'node:assert/strict';
import type { ScheduleBlock } from '../types';
import type { DecisionContextSnapshotV1, DecisionEvidencePacketV1 } from './decisionEpisode';
import { generateDecisionProposals } from './decisionPolicy';
import { evaluateDecisionSafety } from './safetyGate';

const NOW = '2026-09-01T18:00:00+08:00';

function block(
  id: string,
  title: string,
  startTime: string,
  minutes: number,
  flexibility: ScheduleBlock['flexibility'],
): ScheduleBlock {
  const [hour, minute] = startTime.split(':').map(Number);
  const end = hour * 60 + minute + minutes;
  return {
    id,
    title,
    date: '2026-09-01',
    startTime,
    endTime: `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`,
    plannedMinutes: minutes,
    taskType: title.includes('Training') ? 'strength_training' : 'deep_study',
    flexibility,
    rigidity: flexibility === 'fixed' ? 'high' : 'medium',
    status: 'planned',
    createdAt: 1,
    source: 'manual',
  };
}

const fixed = block('fixed', 'Fixed meeting', '20:30', 60, 'fixed');
const workout = block('workout', 'Training', '18:30', 60, 'movable');
const reading = block('reading', 'Read article', '18:30', 60, 'movable');

function context(blocks: ScheduleBlock[], options: { overall?: number; focus?: number; sleep?: number; load?: number } = {}): DecisionContextSnapshotV1 {
  return {
    assembledAt: NOW,
    asOf: NOW,
    facts: [],
    currentState: {
      overall: options.overall ?? 3,
      focus: options.focus ?? options.overall ?? 3,
      observedAt: NOW,
      sourceId: 'state-1',
    },
    sleepMinutes: options.sleep == null ? undefined : { value: options.sleep, observedAt: NOW, sourceId: 'sleep-1' },
    recentExecution: options.load == null ? undefined : { count: 3, totalMinutes: options.load, sourceIds: ['exec-1'] },
    schedule: {
      date: '2026-09-01',
      blocks,
      fixedCount: blocks.filter((item) => item.flexibility === 'fixed').length,
      flexibleCount: blocks.filter((item) => item.flexibility !== 'fixed').length,
      remainingPlannedMinutes: blocks.reduce((sum, item) => sum + item.plannedMinutes, 0),
      openWindows: [],
    },
    direction: { goalId: 'goal-1', goalName: 'Focus goal' },
    sourceRefs: [],
    missingness: [],
    limitations: [],
  };
}

const evidence: DecisionEvidencePacketV1 = {
  contractVersion: 'questlife.decision.evidence.v1',
  target: 'market:state.focus',
  asOf: NOW,
  eligibility: 'eligible',
  items: [
    { id: 'fact', category: 'fact', labelKey: 'fact', sourceIds: ['state-1'] },
    { id: 'reference', category: 'personal_comparison', labelKey: 'reference', sourceIds: ['ref-1'] },
    { id: 'joint', category: 'joint_evidence', labelKey: 'joint', sourceIds: ['joint-1'], supportCount: 7, counterexampleCount: 3 },
  ],
  similarPeriods: [],
  scenarioBranches: [],
  missingness: [],
  limitations: ['OBSERVATIONAL_NOT_CAUSAL'],
  sourceArtifactIds: ['bundle-1'],
};

const lowRecoveryContext = context([workout, fixed], { overall: 2, sleep: 330, load: 180 });
const normalSafety = evaluateDecisionSafety({ questionText: '我很累，今天还训练吗？', context: lowRecoveryContext });
assert.equal(normalSafety.status.level, 'normal');

const training = generateDecisionProposals({
  episodeId: 'training',
  questionType: 'training_recovery',
  context: lowRecoveryContext,
  evidence,
  safety: normalSafety.status,
  generatedAt: NOW,
});
assert.deepEqual(training.map((item) => item.kind), ['shorten', 'move', 'recover']);
assert.equal(training.length, 3);
assert.ok(training.every((item) => item.planPatch.operations.every((operation) => operation.blockId !== 'fixed')));
assert.ok(training.every((item) => item.policyTrace.some((entry) => entry.criterion === 'reversibility' && entry.outcome === 'pass')));

const repeatedTraining = generateDecisionProposals({
  episodeId: 'training',
  questionType: 'training_recovery',
  context: lowRecoveryContext,
  evidence,
  safety: normalSafety.status,
  generatedAt: NOW,
});
assert.deepEqual(repeatedTraining, training, 'same inputs must produce stable proposals');

const normalTraining = generateDecisionProposals({
  episodeId: 'normal-training',
  questionType: 'training_recovery',
  context: context([workout, fixed], { overall: 4, sleep: 480, load: 60 }),
  evidence,
  safety: normalSafety.status,
  generatedAt: NOW,
});
assert.equal(normalTraining[0].kind, 'continue');

const cognitive = generateDecisionProposals({
  episodeId: 'cognitive',
  questionType: 'cognitive_adjustment',
  context: context([reading, fixed], { overall: 2, focus: 2, sleep: 360 }),
  evidence,
  safety: normalSafety.status,
  generatedAt: NOW,
});
assert.deepEqual(cognitive.map((item) => item.kind), ['shorten', 'move', 'continue']);

const mixedTraining = generateDecisionProposals({
  episodeId: 'mixed-training',
  questionType: 'training_recovery',
  context: context([reading, workout, fixed], { overall: 2, sleep: 330, load: 180 }),
  evidence,
  safety: normalSafety.status,
  generatedAt: NOW,
});
assert.ok(
  mixedTraining.every((item) => item.planPatch.operations.every((operation) => operation.blockId !== reading.id)),
  'training proposals must prefer a relevant training block over an earlier cognitive block',
);

const mixedCognitive = generateDecisionProposals({
  episodeId: 'mixed-cognitive',
  questionType: 'cognitive_adjustment',
  context: context([workout, reading, fixed], { overall: 2, focus: 2, sleep: 360 }),
  evidence,
  safety: normalSafety.status,
  generatedAt: NOW,
});
assert.ok(
  mixedCognitive.every((item) => item.planPatch.operations.every((operation) => operation.blockId !== workout.id)),
  'cognitive proposals must prefer a relevant cognitive block over an earlier training block',
);

const overloaded = generateDecisionProposals({
  episodeId: 'overloaded',
  questionType: 'overloaded_day',
  context: context([
    block('priority', 'Priority work', '09:00', 90, 'flexible'),
    block('admin', 'Admin', '11:00', 60, 'movable'),
    fixed,
  ]),
  evidence,
  safety: normalSafety.status,
  generatedAt: NOW,
});
assert.deepEqual(overloaded.map((item) => item.kind), ['protect', 'move', 'leave_unplaced']);
assert.ok(overloaded.every((item) => item.planPatch.afterSnapshot.some((candidate) => candidate.id === 'fixed')));

const impossible = generateDecisionProposals({
  episodeId: 'fixed-only',
  questionType: 'overloaded_day',
  context: context([fixed]),
  evidence: { ...evidence, eligibility: 'limited' },
  safety: normalSafety.status,
  generatedAt: NOW,
});
assert.deepEqual(impossible.map((item) => item.kind), ['protect']);
assert.equal(impossible[0].planPatch.operations.length, 0);

const clarify = evaluateDecisionSafety({ questionText: '我有点头晕，还要训练吗？', context: lowRecoveryContext });
assert.equal(clarify.status.level, 'needs_clarification');
assert.equal(clarify.missingQuestion?.id, 'symptom-severity');

const severe = evaluateDecisionSafety({ questionText: '我胸痛但想继续训练', context: lowRecoveryContext });
assert.equal(severe.status.level, 'blocked');
const blocked = generateDecisionProposals({
  episodeId: 'blocked',
  questionType: 'training_recovery',
  context: lowRecoveryContext,
  evidence,
  safety: severe.status,
  generatedAt: NOW,
});
assert.deepEqual(blocked.map((item) => item.kind), ['abstain']);
assert.equal(blocked[0].planPatch.operations.length, 0);
assert.ok(blocked[0].descriptionKey.includes('Safety'));

const unusual = evaluateDecisionSafety({
  questionText: '我头晕',
  context: lowRecoveryContext,
  symptomSeverityAnswer: 'unusual',
});
assert.equal(unusual.status.level, 'blocked');

const mild = evaluateDecisionSafety({
  questionText: '有一点普通疲劳',
  context: lowRecoveryContext,
  symptomSeverityAnswer: 'mild',
});
assert.equal(mild.status.level, 'normal');

console.log('adaptive decision safety gate and deterministic policy: passed');
