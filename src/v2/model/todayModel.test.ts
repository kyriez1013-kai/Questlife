import assert from 'node:assert/strict';
import { buildTodayModel, recordRow, localDateKey, type TodaySlices } from './todayModel';
import { buildFirstSuggestion, energyToOverall, remainingAnswers, sleepToValue } from './firstUse';
import { buildSampleSlices, buildSampleToday, isSampleId } from './sample';
import type { ExecutionLog, StateCheckIn, Skill, RawCapture } from '../../types';

const now = new Date(2026, 9, 27, 15, 30);
const today = localDateKey(now);
const empty: TodaySlices = { executionLogs: [], stateCheckIns: [], scheduleBlocks: [], rawCaptures: [], contextLogs: [], skills: [], categories: [], moduleSkillLinks: [] };

// ── todayCommand stays the authority ──
let m = buildTodayModel(empty, now);
assert.equal(m.command.type, 'empty_state');
assert.equal(m.action, 'create_goal');
assert.equal(m.state, null, 'no state logged → null, not a default');
assert.equal(m.records.length, 0);
assert.equal(m.evidence.find((c) => c.id === 'state_trend')!.level, 'e0');

// low state → rescue (authority decides, view-model only mirrors)
const lowState: StateCheckIn = { id: 's1', date: today, timestamp: now.toISOString(), createdAt: now.toISOString(), overall: 2 };
m = buildTodayModel({ ...empty, stateCheckIns: [lowState] }, now);
assert.equal(m.action, 'rescue');
assert.deepEqual(m.state && { o: m.state.overall, l: m.state.label }, { o: 2, l: '较差' });

// pending capture takes priority and is exposed
const pending: RawCapture = { id: 'rc1', text: '卧推', createdAt: now.toISOString(), parseStatus: 'failed' };
m = buildTodayModel({ ...empty, rawCaptures: [pending] }, now);
assert.equal(m.action, 'finish_pending_capture');
assert.equal(m.pendingCapture?.id, 'rc1');

// ── actual vs predicted are separate; missing is missing ──
const base: ExecutionLog = { id: 'e1', date: today, durationMinutes: 0, title: '卧推', source: 'manual', createdAt: now.toISOString() };
let row = recordRow(base);
assert.deepEqual(row.actual, [], 'duration 0 = unrecorded → nothing shown, never "0 分钟"');
assert.deepEqual(row.predicted, []);
row = recordRow({ ...base, durationMinutes: 45, predictedDurationMinutes: 30, structuredData: { weightKg: 60, sets: 5, reps: 5 } });
assert.deepEqual(row.actual, ['45 分钟', '60 kg', '5 组 × 5 次']);
assert.deepEqual(row.predicted, ['预计 30 分钟']);
assert.ok(!row.actual.some((s) => s.includes('预计')), 'predicted never mixed into actual');

// deleted records and other days are excluded
const skill = { id: 'sk1', name: '卧推' } as Skill;
m = buildTodayModel({
  ...empty, skills: [skill],
  executionLogs: [
    { ...base, id: 'a', date: today, createdAt: '2026-10-27T01:00:00.000Z' },
    { ...base, id: 'b', date: '2026-10-26' },
    { ...base, id: 'c', date: today, dataProvenance: { deleted: true } as never },
  ],
}, now);
assert.deepEqual(m.records.map((r) => r.id), ['a']);

// ── first-use suggestion ──
assert.equal(remainingAnswers({}), 3);
assert.equal(remainingAnswers({ sleep: 'ok', focus: 'work' }), 1);
assert.equal(buildFirstSuggestion({ sleep: 'bad', energy: 'low', focus: 'training' }).intensity, 'light');
assert.equal(buildFirstSuggestion({ sleep: 'good', energy: 'high', focus: 'study' }).intensity, 'focus');
assert.equal(buildFirstSuggestion({ sleep: 'ok', energy: 'mid', focus: 'work' }).intensity, 'normal');
assert.equal(buildFirstSuggestion({ sleep: 'bad', energy: 'high', focus: 'work' }).intensity, 'normal', 'bad sleep + high energy is not "focus"');
assert.equal(buildFirstSuggestion({ sleep: 'good', energy: 'low', focus: 'work' }).basis, 'prior', 'always labelled general advice');
assert.equal(energyToOverall('low'), 2);
assert.equal(sleepToValue('good'), 3);

// ── sample data is isolated and clearly synthetic ──
const slices = buildSampleSlices(now);
const ids = [...slices.executionLogs.map((x) => x.id), ...slices.stateCheckIns.map((x) => x.id), ...slices.contextLogs.map((x) => x.id)];
assert.ok(ids.length > 0 && ids.every(isSampleId), 'every sample record id is sample-prefixed');
const sample = buildSampleToday(now);
assert.equal(sample.evidence.find((c) => c.id === 'sleep_state')!.level, 'e2');
console.log('todayModel/firstUse/sample ok');
