import assert from 'node:assert/strict';
import type { AppData, DataRecordProvenance, ScheduleBlock } from '../types';
import { assembleDecisionContext, classifyDecisionQuestion } from './contextAssembler';

const AS_OF = '2026-09-01T18:00:00+08:00';

function provenance(
  origin: DataRecordProvenance['origin'],
  availableAt: string,
  options: { deleted?: boolean; eventStartAt?: string; eventEndAt?: string } = {},
): DataRecordProvenance {
  return {
    schemaVersion: 'questlife.data.provenance.v1',
    origin,
    confirmation: origin === 'OWNER_OBSERVED' ? 'USER_ENTERED' : 'NOT_REQUIRED',
    captureMethod: origin === 'OWNER_OBSERVED' ? 'manual_form' : 'import',
    recordedAt: availableAt,
    availableAt,
    eventStartAt: options.eventStartAt,
    eventEndAt: options.eventEndAt,
    timezone: 'Asia/Shanghai',
    deleted: options.deleted,
  };
}

const planned: ScheduleBlock = {
  id: 'block-workout',
  title: 'Strength training',
  date: '2026-09-01',
  startTime: '19:00',
  endTime: '20:00',
  plannedMinutes: 60,
  linkedGoalId: 'goal-fitness',
  linkedSkillId: 'skill-strength',
  taskType: 'strength_training',
  flexibility: 'movable',
  rigidity: 'medium',
  status: 'planned',
  createdAt: 1,
  source: 'manual',
};

const data = {
  stateCheckIns: [
    {
      id: 'state-valid',
      date: '2026-09-01',
      timestamp: '2026-09-01T17:00:00+08:00',
      overall: 2,
      energy: 2,
      focus: 2,
      createdAt: '2026-09-01T17:00:00+08:00',
      dataProvenance: provenance('OWNER_OBSERVED', '2026-09-01T17:00:00+08:00'),
    },
    {
      id: 'state-future',
      date: '2026-09-01',
      timestamp: '2026-09-01T19:00:00+08:00',
      overall: 5,
      createdAt: '2026-09-01T19:00:00+08:00',
      dataProvenance: provenance('OWNER_OBSERVED', '2026-09-01T19:00:00+08:00'),
    },
    {
      id: 'state-debug',
      date: '2026-09-01',
      timestamp: '2026-09-01T17:30:00+08:00',
      overall: 5,
      createdAt: '2026-09-01T17:30:00+08:00',
      dataProvenance: provenance('DEBUG_FIXTURE', '2026-09-01T17:30:00+08:00'),
    },
  ],
  contextLogs: [
    {
      id: 'sleep-valid',
      type: 'sleep' as const,
      label: 'sleep',
      value: 5.5,
      unit: 'hours',
      createdAt: '2026-09-01T07:00:00+08:00',
      dataProvenance: provenance('OWNER_OBSERVED', '2026-09-01T07:00:00+08:00', {
        eventStartAt: '2026-09-01T01:30:00+08:00',
        eventEndAt: '2026-09-01T07:00:00+08:00',
      }),
    },
    {
      id: 'sleep-deleted',
      type: 'sleep' as const,
      label: 'sleep',
      value: 8,
      unit: 'hours',
      createdAt: '2026-09-01T08:00:00+08:00',
      dataProvenance: provenance('OWNER_OBSERVED', '2026-09-01T08:00:00+08:00', { deleted: true }),
    },
  ],
  executionLogs: [
    {
      id: 'execution-valid',
      date: '2026-08-31',
      durationMinutes: 45,
      qualityRating: 3,
      source: 'manual' as const,
      createdAt: '2026-08-31T18:00:00+08:00',
      appliedToProgress: true,
      dataProvenance: provenance('OWNER_OBSERVED', '2026-08-31T18:00:00+08:00'),
    },
  ],
  scheduleBlocks: [planned],
  goals: [],
  categories: [{ id: 'goal-fitness', name: 'Build strength', createdAt: 1 }],
  skills: [{ id: 'skill-strength', name: 'Strength', categoryId: 'goal-fitness' }],
} as unknown as Pick<AppData, 'stateCheckIns' | 'contextLogs' | 'executionLogs' | 'scheduleBlocks' | 'goals' | 'categories' | 'skills'>;

const result = assembleDecisionContext({
  data,
  questionType: 'training_recovery',
  questionText: 'Should I train?',
  asOf: AS_OF,
  timezone: 'Asia/Shanghai',
  mode: 'owner',
});

assert.equal(result.snapshot.currentState?.sourceId, 'state-valid');
assert.equal(result.snapshot.currentState?.overall, 2);
assert.equal(result.snapshot.sleepMinutes?.value, 330);
assert.equal(result.snapshot.recentExecution?.totalMinutes, 45);
assert.equal(result.snapshot.schedule.flexibleCount, 1);
assert.equal(result.missingQuestions.length, 0);
assert.deepEqual(new Set(result.excludedSourceIds), new Set(['state-future', 'state-debug', 'sleep-deleted']));
assert.equal(result.snapshot.sourceRefs.find((ref) => ref.sourceId === 'state-debug')?.eligibility, 'excluded');

const sparse = assembleDecisionContext({
  data: { stateCheckIns: [], contextLogs: [], executionLogs: [], scheduleBlocks: [], goals: [], categories: [], skills: [] },
  questionType: 'cognitive_adjustment',
  asOf: AS_OF,
  timezone: 'Asia/Shanghai',
  mode: 'owner',
});
assert.equal(sparse.missingQuestions.length, 2);
assert.ok(sparse.snapshot.missingness.some((item) => item.code === 'SLEEP_MISSING'));

const answered = assembleDecisionContext({
  data: { stateCheckIns: [], contextLogs: [], executionLogs: [], scheduleBlocks: [], goals: [], categories: [], skills: [] },
  questionType: 'cognitive_adjustment',
  asOf: AS_OF,
  timezone: 'Asia/Shanghai',
  mode: 'owner',
  answers: { 'current-state': '2', 'target-flexibility': 'movable' },
});
assert.equal(answered.missingQuestions.length, 0);
assert.equal(answered.snapshot.currentState?.overall, 2);

assert.equal(classifyDecisionQuestion('我现在状态不好，今天还要不要训练？'), 'training_recovery');
assert.equal(classifyDecisionQuestion('脑子很慢，但还有文章要读'), 'cognitive_adjustment');
assert.equal(classifyDecisionQuestion('今天事情太多，怎么调整？'), 'overloaded_day');
assert.equal(classifyDecisionQuestion('Should I change something?'), 'custom');

console.log('adaptive decision context assembly: passed');
