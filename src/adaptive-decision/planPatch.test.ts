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

const tomorrowOccupied = { ...block('tomorrow-booking', 'fixed', '20:00', 60), date: '2026-09-02' };
assert.throws(() => applyDecisionPlanPatch([...before, tomorrowOccupied], movedPatch), DecisionPlanPatchConflictError, 'final Apply must recheck tomorrow, not only the preview day');
assert.deepEqual(before, [fixed, flexible], 'failed apply must not partially mutate input');

const newBooking = block('new-booking', 'fixed', '20:30', 30);
assert.throws(() => undoDecisionPlanPatch([...applied, newBooking], patch), DecisionPlanPatchConflictError, 'Undo cannot expand into a later booking');
assert.equal(applied.find((item) => item.id === flexible.id)?.plannedMinutes, 25);

const moved = applyDecisionPlanPatch(before, movedPatch);
const originalSlotOccupied = block('replacement-booking', 'fixed', '20:00', 60);
assert.throws(() => undoDecisionPlanPatch([...moved, originalSlotOccupied], movedPatch), DecisionPlanPatchConflictError, 'Undo validates the original day too');
assert.throws(() => undoDecisionPlanPatch([...removed, originalSlotOccupied], removedPatch), DecisionPlanPatchConflictError, 'restoring a removed block is also a placement');

const adjacent = { ...tomorrowOccupied, startTime: '21:00', endTime: '22:00' };
assert.equal(applyDecisionPlanPatch([...before, adjacent], movedPatch).length, 3, 'touching endpoints are not overlap');
assert.equal(applyDecisionPlanPatch([...before, { ...tomorrowOccupied, status: 'skipped' }], movedPatch).length, 3, 'skipped intervals are not occupied');
assert.deepEqual(applyDecisionPlanPatch([...moved, tomorrowOccupied], movedPatch), [...moved, tomorrowOccupied], 'idempotent retry does not attempt another mutation or rewrite existing conflicts');
assert.deepEqual(undoDecisionPlanPatch([...before, originalSlotOccupied], movedPatch), [...before, originalSlotOccupied], 'repeated Undo does not disturb later changes');

const first = block('first-swap', 'movable', '10:00', 60);
const second = block('second-swap', 'movable', '11:00', 60);
const swapPatch = createDecisionPlanPatch({ id: 'swap', date: first.date, generatedAt: patch.generatedAt, before: [first, second], after: [{ ...first, startTime: second.startTime, endTime: second.endTime }, { ...second, startTime: first.startTime, endTime: first.endTime }] });
const swapped = applyDecisionPlanPatch([first, second], swapPatch);
assert.deepEqual(undoDecisionPlanPatch(swapped, swapPatch), [first, second], 'validate the final atomic swap, not occupied intermediate slots');
const collisionPatch = createDecisionPlanPatch({ id: 'collision', date: first.date, generatedAt: patch.generatedAt, before: [first, second], after: [{ ...first, startTime: '12:00', endTime: '13:00' }, { ...second, startTime: '12:30', endTime: '13:30' }] });
assert.throws(() => applyDecisionPlanPatch([first, second], collisionPatch), DecisionPlanPatchConflictError, 'two operations cannot overlap each other');

const invalidPatch = createDecisionPlanPatch({ id: 'invalid', date: flexible.date, generatedAt: patch.generatedAt, before, after: [fixed, { ...flexible, endTime: '25:00' }] });
assert.throws(() => applyDecisionPlanPatch(before, invalidPatch), DecisionPlanPatchConflictError, 'do not invent a cross-day placement from an invalid wall clock');
assert.throws(() => undoDecisionPlanPatch(applied.map((item) => item.id === flexible.id ? { ...item, status: 'completed' } : item), patch), DecisionPlanPatchConflictError, 'Undo cannot erase actual completion');
assert.throws(() => undoDecisionPlanPatch(applied.map((item) => item.id === flexible.id ? { ...item, notes: 'new owner note' } : item), patch), DecisionPlanPatchConflictError, 'Undo preserves concurrent legitimate edits');

console.log('adaptive decision plan patch apply and undo: passed');
