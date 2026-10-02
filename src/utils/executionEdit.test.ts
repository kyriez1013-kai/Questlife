import assert from 'node:assert/strict';
import { DEFAULT_DATA, type AppData, type EffortUnit, type ExecutionLog, type Skill } from '../types';
import { applyExecutionLogPatch } from './executionEdit';

const log = {
  id: 'qa-log', date: '2026-10-02', createdAt: '2026-10-02T10:00:00.000Z',
  durationMinutes: 7, linkedSkillId: 'qa-skill', source: 'manual', appliedToProgress: true,
  metricUpdate: { metricType: 'time_based', minutesAdded: 7 },
  structuredData: { durationMinutes: 7 },
  note: 'before',
} satisfies ExecutionLog;
const skill = {
  id: 'qa-skill', name: 'SQL', completedHours: 7 / 60, totalXP: 7,
  metricConfig: { metricType: 'time_based', completedHours: 7 / 60 },
} as Skill;
const effort = {
  id: 'effort-qa-log-primary', executionLogId: 'qa-log',
  raw: { durationMinutes: 7 }, derived: { effortScore: 7 },
} as EffortUnit;
const data: AppData = {
  ...DEFAULT_DATA,
  executionLogs: [log], skills: [skill], effortUnits: [effort],
};
const edited = applyExecutionLogPatch(data, 'qa-log', { durationMinutes: 9, note: 'after' }, '2026-10-02T11:00:00.000Z');
assert.equal(edited.executionLogs[0].durationMinutes, 9);
assert.equal(edited.executionLogs[0].metricUpdate?.minutesAdded, 9);
assert.equal(edited.executionLogs[0].structuredData?.durationMinutes, 9);
assert.equal(edited.executionLogs[0].note, 'after');
assert.equal(edited.skills[0].completedHours, 9 / 60);
assert.equal(edited.skills[0].totalXP, 9);
assert.equal(edited.effortUnits[0].raw.durationMinutes, 9);
assert.equal(edited.effortUnits[0].derived.effortScore, 9);
assert.equal(data.executionLogs[0].durationMinutes, 7);
assert.equal(data.skills[0].totalXP, 7);

const editedAgain = applyExecutionLogPatch(edited, 'qa-log', { durationMinutes: 11 }, '2026-10-02T12:00:00.000Z');
assert.equal(editedAgain.skills[0].totalXP, 11, 'successive edits must not double count');
assert.equal(editedAgain.skills[0].completedHours, 11 / 60);
assert.equal(editedAgain.effortUnits[0].raw.durationMinutes, 11);
const noteOnly = applyExecutionLogPatch(editedAgain, 'qa-log', { note: 'note only' }, '2026-10-02T13:00:00.000Z');
assert.equal(noteOnly.skills, editedAgain.skills);
assert.equal(noteOnly.effortUnits, editedAgain.effortUnits);
assert.throws(() => applyExecutionLogPatch(data, 'qa-log', { durationMinutes: 0 }, '2026-10-02T11:00:00.000Z'));
assert.equal(applyExecutionLogPatch(data, 'missing', { durationMinutes: 9 }, '2026-10-02T11:00:00.000Z'), data);
console.log('execution edit: 17 assertions passed');
