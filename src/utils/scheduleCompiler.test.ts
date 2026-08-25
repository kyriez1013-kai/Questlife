import type { ScheduleBlock } from '../types';
// @ts-expect-error Node test execution requires the explicit extension.
import { compileScheduleDay } from './scheduleCompiler.ts';

function equal(actual: unknown, expected: unknown, name: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${name}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

function block(id: string, startTime: string, endTime: string, patch: Partial<ScheduleBlock> = {}): ScheduleBlock {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  return {
    id,
    title: id,
    date: '2026-08-25',
    startTime,
    endTime,
    plannedMinutes: endHour * 60 + endMinute - (startHour * 60 + startMinute),
    taskType: 'deep_study',
    flexibility: 'flexible',
    rigidity: 'medium',
    status: 'planned',
    createdAt: Number(id.replace(/\D/g, '')) || 1,
    source: 'manual',
    ...patch,
  };
}

function candidate(value: ScheduleBlock, patch: Record<string, unknown> = {}) {
  return { block: value, persisted: true, ...patch } as any;
}

export function runScheduleCompilerTests() {
  const noCommitments = compileScheduleDay({
    date: '2026-08-25', fixedBlocks: [], flexibleBlocks: [candidate(block('b1', '09:00', '10:00'))],
  });
  equal(noCommitments.placements[0].startTime, '09:00', 'existing valid placement is stable without commitments');

  const oneCommitment = compileScheduleDay({
    date: '2026-08-25',
    fixedBlocks: [block('f1', '09:00', '10:00', { flexibility: 'fixed' })],
    flexibleBlocks: [candidate(block('b2', '09:00', '10:00'))],
  });
  equal(oneCommitment.placements[0].startTime, '07:00', 'one fixed commitment moves a conflicting flexible block');

  const severalCommitments = compileScheduleDay({
    date: '2026-08-25',
    fixedBlocks: [
      block('f1', '07:00', '09:00', { flexibility: 'fixed' }),
      block('f2', '10:00', '12:00', { flexibility: 'fixed' }),
      block('f3', '13:00', '23:00', { flexibility: 'fixed' }),
    ],
    flexibleBlocks: [candidate(block('b3', '08:00', '09:00'))],
  });
  equal(severalCommitments.placements[0].startTime, '09:00', 'several commitments preserve the only valid window');

  const exactFit = compileScheduleDay({
    date: '2026-08-25',
    fixedBlocks: [
      block('f1', '07:00', '09:00', { flexibility: 'fixed' }),
      block('f2', '10:00', '23:00', { flexibility: 'fixed' }),
    ],
    flexibleBlocks: [candidate(block('b4', '08:00', '09:00'))],
  });
  equal([exactFit.placements[0].startTime, exactFit.placements[0].endTime], ['09:00', '10:00'], 'exact-fit continuous window is accepted');

  const insufficient = compileScheduleDay({
    date: '2026-08-25',
    dayStartMinutes: 7 * 60,
    dayEndMinutes: 10 * 60,
    fixedBlocks: [block('f1', '08:00', '09:30', { flexibility: 'fixed' })],
    flexibleBlocks: [candidate(block('b5', '07:00', '09:00'))],
  });
  equal(insufficient.unplaced[0].reason, 'insufficient_capacity', 'insufficient total capacity is explicit');

  const fragmented = compileScheduleDay({
    date: '2026-08-25',
    dayStartMinutes: 7 * 60,
    dayEndMinutes: 11 * 60,
    fixedBlocks: [block('f1', '08:00', '09:00', { flexibility: 'fixed' }), block('f2', '10:00', '11:00', { flexibility: 'fixed' })],
    flexibleBlocks: [candidate(block('b6', '07:00', '08:30'))],
  });
  equal(fragmented.unplaced[0].reason, 'insufficient_continuous_time', 'fragmented capacity does not fake a fit');

  const priority = compileScheduleDay({
    date: '2026-08-25', dayStartMinutes: 7 * 60, dayEndMinutes: 8 * 60, fixedBlocks: [],
    flexibleBlocks: [candidate(block('b7', '09:00', '10:00'), { priority: 'low' }), candidate(block('b8', '09:00', '10:00'), { priority: 'high' })],
  });
  equal(priority.placements[0].candidate.block.id, 'b8', 'explicit priority orders competing blocks');

  const deadline = compileScheduleDay({
    date: '2026-08-25', dayStartMinutes: 7 * 60, dayEndMinutes: 8 * 60, fixedBlocks: [],
    flexibleBlocks: [
      candidate(block('b9', '09:00', '10:00'), { deadlineAt: '2026-09-10' }),
      candidate(block('b10', '09:00', '10:00'), { deadlineAt: '2026-08-30' }),
    ],
  });
  equal(deadline.placements[0].candidate.block.id, 'b10', 'earlier explicit deadline wins a tie');

  const preferred = compileScheduleDay({
    date: '2026-08-25', fixedBlocks: [],
    flexibleBlocks: [candidate(block('b11', '09:00', '10:00'), { persisted: false, preferredStartTime: '14:00' })],
  });
  equal([preferred.placements[0].startTime, preferred.placements[0].reason], ['14:00', 'preferred_window'], 'explicit preferred window is used');

  const locked = block('b12', '15:00', '16:00', { placementLocked: true });
  const lockedResult = compileScheduleDay({ date: locked.date, fixedBlocks: [], flexibleBlocks: [candidate(locked)], mode: 'replan', notBeforeMinutes: 12 * 60 });
  equal(lockedResult.preservedBlocks[0].startTime, '15:00', 'manual locked placement survives replan');

  const first = compileScheduleDay({
    date: '2026-08-25', fixedBlocks: [block('f1', '09:00', '10:00', { flexibility: 'fixed' })], flexibleBlocks: [candidate(block('b13', '09:00', '10:00'))],
  });
  const accepted = first.placements[0];
  const second = compileScheduleDay({
    date: '2026-08-25', fixedBlocks: [block('f1', '09:00', '10:00', { flexibility: 'fixed' })],
    flexibleBlocks: [candidate({ ...accepted.candidate.block, startTime: accepted.startTime, endTime: accepted.endTime })],
  });
  equal(second.placements[0].startTime, first.placements[0].startTime, 'unchanged inputs compile idempotently');

  const past = block('b14', '08:00', '09:00');
  const future = block('b15', '15:00', '16:00');
  const replan = compileScheduleDay({
    date: past.date, fixedBlocks: [], flexibleBlocks: [candidate(past), candidate(future)], mode: 'replan', notBeforeMinutes: 12 * 60,
  });
  equal(replan.preservedBlocks.map((item) => item.id), ['b14'], 'replan preserves the past portion of the day');

  const completed = block('b16', '15:00', '16:00', { status: 'completed' });
  const completedResult = compileScheduleDay({ date: completed.date, fixedBlocks: [], flexibleBlocks: [candidate(completed)], mode: 'replan', notBeforeMinutes: 12 * 60 });
  equal(completedResult.preservedBlocks[0].status, 'completed', 'completed execution history is never rewritten');

  const linked = block('b17', '09:00', '10:00', { linkedGoalId: 'goal-explicit', linkedSkillId: 'skill-explicit' });
  const linkedResult = compileScheduleDay({ date: linked.date, fixedBlocks: [], flexibleBlocks: [candidate(linked)] });
  equal([linkedResult.placements[0].candidate.block.linkedGoalId, linkedResult.placements[0].candidate.block.linkedSkillId], ['goal-explicit', 'skill-explicit'], 'explicit links are preserved without inference');

  equal(replan.placements.every((placement) => placement.candidate.block.status === 'planned'), true, 'compiler does not turn plans into execution');
}

runScheduleCompilerTests();
console.log('schedule compiler tests passed: 14 cases');
