import assert from 'node:assert/strict';
import type { ScheduleBlock } from '../types';
import {
  applyDecisionPlanPatch,
  createDecisionPlanPatch,
  DecisionPlanPatchConflictError,
  decisionPlanSnapshotHash,
  scheduleBlockOnNextDay,
  scheduleBlockWithDuration,
  undoDecisionPlanPatch,
} from './planPatch';

function block(id: string, flexibility: ScheduleBlock['flexibility'], startTime: string, minutes: number): ScheduleBlock {
  const [hour, minute] = startTime.split(':').map(Number);
  const end = hour * 60 + minute + minutes;
  return {
    id,
    title: id,
    date: '2026-09-01',
    startTime,
    endTime: `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`,
    plannedMinutes: minutes,
    taskType: 'deep_study',
    flexibility,
    rigidity: flexibility === 'fixed' ? 'high' : 'medium',
    status: 'planned',
    createdAt: 1,
    source: 'manual',
  };
}

const fixed = block('fixed', 'fixed', '18:00', 60);
const flexible = block('flexible', 'movable', '20:00', 60);
const before = [fixed, flexible];
const after = [fixed, scheduleBlockWithDuration(flexible, 25)];
const patch = createDecisionPlanPatch({
  id: 'patch-1',
  generatedAt: '2026-09-01T17:00:00+08:00',
  date: '2026-09-01',
  before,
  after,
});

assert.equal(before[1].plannedMinutes, 60, 'preview must not mutate the source plan');
assert.equal(patch.operations.length, 1);
assert.equal(patch.operations[0].blockId, 'flexible');

const applied = applyDecisionPlanPatch(before, patch);
assert.equal(applied.find((item) => item.id === 'flexible')?.plannedMinutes, 25);
assert.equal(applied.find((item) => item.id === 'fixed')?.plannedMinutes, 60);
assert.deepEqual(applyDecisionPlanPatch(applied, patch), applied, 'repeated apply must be idempotent');

const restored = undoDecisionPlanPatch(applied, patch);
assert.deepEqual(restored, before);
assert.deepEqual(undoDecisionPlanPatch(restored, patch), restored, 'repeated undo must be idempotent');
assert.equal(decisionPlanSnapshotHash(restored), decisionPlanSnapshotHash(before));

const movedPatch = createDecisionPlanPatch({
  id: 'patch-2',
  generatedAt: '2026-09-01T17:00:00+08:00',
  date: '2026-09-01',
  before,
  after: [fixed, scheduleBlockOnNextDay(flexible)],
});
assert.equal(applyDecisionPlanPatch(before, movedPatch).find((item) => item.id === 'flexible')?.date, '2026-09-02');

assert.throws(() => createDecisionPlanPatch({
  id: 'patch-fixed',
  generatedAt: '2026-09-01T17:00:00+08:00',
  date: '2026-09-01',
  before,
  after: [scheduleBlockWithDuration(fixed, 30), flexible],
}), DecisionPlanPatchConflictError);

const concurrentlyChanged = before.map((item) => item.id === 'flexible' ? { ...item, title: 'Changed elsewhere' } : item);
assert.throws(() => applyDecisionPlanPatch(concurrentlyChanged, patch), DecisionPlanPatchConflictError);

const removedPatch = createDecisionPlanPatch({
  id: 'patch-remove',
  generatedAt: '2026-09-01T17:00:00+08:00',
  date: '2026-09-01',
  before,
  after: [fixed],
  unplacedBlockIds: ['flexible'],
});
const removed = applyDecisionPlanPatch(before, removedPatch);
assert.equal(removed.some((item) => item.id === 'flexible'), false);
assert.deepEqual(undoDecisionPlanPatch(removed, removedPatch), before);

console.log('adaptive decision plan patch apply and undo: passed');
