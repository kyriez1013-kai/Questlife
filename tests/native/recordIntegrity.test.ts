import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ExecutionPersistence } from '../../src/utils/executionPersistence';
import { removeExecutionProgress } from '../../src/utils/executionDeletionProgress';
import { recordSourceBindings, timerRecordProvenance, lockRecordDraftCallbacks } from '../../src/utils/recordSubmission';
import type { ExecutionLog, ScheduleBlock, Skill } from '../../src/types';

const skill = (type = 'time_based') => ({ id: 's', totalXP: 630, completedHours: 10.5, progressType: type, metricConfig: { metricType: type, completedHours: 10.5 } } as Skill);
const log = (patch: Partial<ExecutionLog> = {}) => ({ id: 'e', linkedSkillId: 's', appliedToProgress: true, durationMinutes: 30, source: 'manual', date: '2026-09-20', createdAt: '2026-09-20T01:00:00Z', ...patch } as ExecutionLog);
test('pending and retry drafts cannot silently change the immutable submitted fields', () => {
  let calls = 0;
  const props = { minutes: '17', onMinutesChange: (_value: string) => { calls++; } };
  assert.equal(lockRecordDraftCallbacks(props, false), props);
  const locked = lockRecordDraftCallbacks(props, true);
  locked.onMinutesChange('99');
  assert.equal(calls, 0); assert.equal(locked.minutes, '17');
});
test('deleting 30 minutes retains the manual 10-hour baseline and earlier XP', () => {
  const result = removeExecutionProgress(skill(), [log()]);
  assert.equal(result.completedHours, 10); assert.equal(result.metricConfig?.completedHours, 10); assert.equal(result.totalXP, 600);
});
test('unapplied and unrelated logs never change skill values', () => {
  const s = skill(); assert.equal(removeExecutionProgress(s, [log({ appliedToProgress: false }), log({ linkedSkillId: 'other' })]), s);
});
test('explicit minute contribution wins over duration and capture cascade subtracts once per removed record', () => {
  const result = removeExecutionProgress(skill(), [log({ metricUpdate: { metricType: 'time_based', minutesAdded: 15 } }), log({ id: 'other', durationMinutes: 15 })]);
  assert.equal(result.completedHours, 10);
});
test('frequency preserves an existing count and money preserves an additive baseline', () => {
  const a = skill('frequency'); a.metricConfig = { metricType: 'frequency', completedThisWeek: 8 };
  assert.equal(removeExecutionProgress(a, [log({ metricUpdate: { metricType: 'frequency', countAdded: 2 } })]).metricConfig?.completedThisWeek, 6);
  const b = skill('money_based'); b.metricConfig = { metricType: 'money_based', currentAmount: 150 };
  assert.equal(removeExecutionProgress(b, [log({ metricUpdate: { metricType: 'money_based', amountAdded: 20 } })]).metricConfig?.currentAmount, 130);
});
for (const type of ['target_value', 'quality_score', 'state_based', 'performance_log', 'binary', 'checklist', 'curriculum', 'qualitative', 'none']) {
  test(`legacy ${type} cannot invent a missing reversible baseline`, () => {
    const s = skill(type); assert.equal(removeExecutionProgress(s, [log()]), s);
  });
}
test('absolute money updates are not mistaken for additive contributions', () => {
  const s = skill('money_based'); assert.equal(removeExecutionProgress(s, [log({ metricUpdate: { metricType: 'money_based', newCurrentAmount: 500 } })]), s);
});
test('source switching cannot retain hidden schedule or skill associations', () => {
  const blocks = [{ id: 'b', linkedSkillId: 's' }, { id: 'unlinked' }] as ScheduleBlock[];
  assert.deepEqual(recordSourceBindings('custom', 's', 'b', blocks), { block: undefined, skillId: undefined });
  assert.deepEqual(recordSourceBindings('skill', 's', 'b', blocks), { block: undefined, skillId: 's' });
  assert.equal(recordSourceBindings('schedule', 'stale', 'unlinked', blocks).skillId, undefined);
  assert.equal(recordSourceBindings('schedule', 'stale', 'missing', blocks).skillId, undefined);
});
test('timer provenance retains cross-midnight actual timestamps, not scheduled endpoints', () => {
  const p = timerRecordProvenance('2026-09-20T23:50:00+08:00', '2026-09-21T00:10:00+08:00', '2026-09-21T00:15:00+08:00');
  assert.equal(p.eventStartAt, '2026-09-20T15:50:00.000Z'); assert.equal(p.eventEndAt, '2026-09-20T16:10:00.000Z');
  assert.equal(p.recordedAt, '2026-09-20T16:15:00.000Z'); assert.throws(() => timerRecordProvenance('bad', 'bad', 'bad'));
});
test('form ACK waits for persistence and concurrent submissions share one write', async () => {
  const writes = new ExecutionPersistence(); let finish!: () => void; let calls = 0;
  writes.register('e', async () => { calls++; await new Promise<void>(r => { finish = r; }); });
  writes.register('e', async () => { calls++; });
  let acknowledged = false; const ack = writes.wait('e').then(() => { acknowledged = true; });
  await Promise.resolve(); assert.equal(acknowledged, false); assert.equal(calls, 1);
  finish(); await ack; assert.equal(acknowledged, true); assert.equal(writes.has('e'), false);
});
test('failure remains retryable and uses the original pending write, not a second payload', async () => {
  const writes = new ExecutionPersistence(); let attempts = 0;
  writes.register('e', async () => { if (++attempts === 1) throw new Error('DISK_FULL'); });
  await assert.rejects(writes.wait('e'), /DISK_FULL/); assert.equal(writes.has('e'), true);
  writes.retry('e'); await writes.wait('e'); assert.equal(attempts, 2); assert.equal(writes.has('e'), false);
});
test('real Home submit awaits durable ACK before clearing the timer or closing', () => {
  const source = readFileSync('src/screens/HomeScreen.tsx', 'utf8');
  const submit = source.slice(source.indexOf('const submit = async'), source.indexOf('// 庆祝浮层动画'));
  assert.ok(submit.indexOf('await waitForExecutionLog(savedLog.id)') < submit.indexOf('await AsyncStorage.removeItem(ACTIVE_SESSION_KEY)'));
  assert.ok(submit.indexOf('await AsyncStorage.removeItem(ACTIVE_SESSION_KEY)') < submit.indexOf('setModal(false)'));
  assert.match(submit, /recordSourceBindings\(logType/); assert.match(submit, /timerRecordProvenance\(actualSession.startedAt, timerEndedAt/);
  const oneTap = source.slice(source.indexOf('const oneTapComplete'), source.indexOf('const submit = async'));
  assert.doesNotMatch(oneTap, /createExecutionLog|qualityRating:\s*3/); assert.match(oneTap, /openModal/);
});
