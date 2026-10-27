import assert from 'node:assert/strict';
import { buildEvidenceCards, unlockHint } from './evidence';
import type { ContextLog, ExecutionLog, StateCheckIn } from '../../types';

const st = (date: string): StateCheckIn => ({ id: `s-${date}`, date, timestamp: `${date}T08:00:00.000Z`, createdAt: `${date}T08:00:00.000Z`, overall: 3 });
const sleep = (date: string, unit: string, value = 400): ContextLog => ({ id: `c-${date}-${unit}`, type: 'sleep', label: '睡眠', date, createdAt: `${date}T07:00:00.000Z`, value, unit });
const days = (n: number) => Array.from({ length: n }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`);
const card = (cards: ReturnType<typeof buildEvidenceCards>, id: string) => cards.find((c) => c.id === id)!;

// empty → honest e0, says exactly what is missing, nothing is locked globally
let cards = buildEvidenceCards({ stateCheckIns: [], contextLogs: [], executionLogs: [] });
assert.equal(card(cards, 'state_trend').level, 'e0');
assert.match(card(cards, 'state_trend').missing!, /再记 3 天状态/);
assert.equal(card(cards, 'sleep_state').level, 'e0');
assert.match(card(cards, 'sleep_state').missing!, /已有 0\/7 天同时有睡眠和状态，还差 7 天/);

// 3 state days → observation only (e1), not a conclusion
cards = buildEvidenceCards({ stateCheckIns: days(3).map(st), contextLogs: [], executionLogs: [] });
assert.equal(card(cards, 'state_trend').level, 'e1');

// sleep × state needs PAIRS on the same day
cards = buildEvidenceCards({ stateCheckIns: days(7).map(st), contextLogs: days(5).map((d) => sleep(d, '分钟')), executionLogs: [] });
assert.equal(card(cards, 'sleep_state').have, 5);
assert.equal(card(cards, 'sleep_state').level, 'e1');
cards = buildEvidenceCards({ stateCheckIns: days(7).map(st), contextLogs: days(7).map((d) => sleep(d, '分钟')), executionLogs: [] });
assert.equal(card(cards, 'sleep_state').level, 'e2');
assert.equal(card(cards, 'sleep_state').association, true, 'relations always say association ≠ causation');
assert.equal(card(cards, 'state_trend').association, false);

// units are never mixed: 4 days of minutes + 4 days of 1–3 self-rating ≠ 8 pairs
cards = buildEvidenceCards({
  stateCheckIns: days(8).map(st),
  contextLogs: [...days(4).map((d) => sleep(d, '分钟')), ...days(8).slice(4).map((d) => sleep(d, '睡眠自评1-3', 2))],
  executionLogs: [],
});
assert.equal(card(cards, 'sleep_state').have, 4, 'largest single unit only');
assert.match(card(cards, 'sleep_state').unitNote!, /不与其他单位混用/);

// action baselines never mix actions, and ignore unrecorded (0) durations
const log = (id: string, title: string, min: number, date: string): ExecutionLog => ({ id, date, title, durationMinutes: min, source: 'manual', createdAt: `${date}T09:00:00.000Z` });
cards = buildEvidenceCards({
  stateCheckIns: [], contextLogs: [],
  executionLogs: [log('1', '卧推', 40, '2026-10-01'), log('2', '卧推', 45, '2026-10-03'), log('3', '卧推', 0, '2026-10-04'), log('4', '深蹲', 30, '2026-10-02')],
});
assert.equal(card(cards, 'baseline:卧推').have, 2, 'a 0-minute (unrecorded) log does not count');
assert.equal(card(cards, 'baseline:深蹲').have, 1);
assert.notEqual(card(cards, 'baseline:卧推').id, card(cards, 'baseline:深蹲').id);

// unlock hint = closest card
const hint = unlockHint(cards);
assert.ok(hint && /再记|已有/.test(hint));
console.log('evidence ok');
