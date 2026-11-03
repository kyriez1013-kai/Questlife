import assert from 'node:assert/strict';
import type { ContextLog, ExecutionLog, ScheduleBlock, StateCheckIn } from '../types';
import { DEFAULT_DATA } from '../types';
import { createDecisionPlanPatch, applyDecisionPlanPatch, undoDecisionPlanPatch } from '../adaptive-decision/planPatch';
import { validEntity } from '../sync-v2/registry';
import { bandOf, scaleBaseline, personalBaseline, median } from './baseline';
import { classifyState, effectiveType, baselineHistory } from './classifyState';
import { gatherPassiveSignals, bodyAccountOf, sleepMinutesByDate, localYmd, addDays, type PassiveSignals } from './signals';
import { reasonLine, notUsedLine, baselineLine } from './explain';
import { reorderToday, inferDemand, DEMAND_ORDER } from './reorder';
import { summarizeOutcomes, pendingFollowUp, MIN_OUTCOME_N } from './outcomes';
import { stateCalendar, calendarSummary, lagSleepDescription } from './calendar';
import { splitBrainDump, freeSlots, slotIsFree, brainDumpBlock } from './brainDump';
import { buildStateCheckIn, latestStateLayerRow } from './checkIn';
import { ACTIONS_BY_TYPE, followUpDue } from './actions';
import { ACTION_COPY, TYPE_NAME, SCIENCE_LINE } from './copy';
import type { OpenLoops, Pull, Scale5, StateTypeOrUnclear } from './types';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const validateAppData: (v: unknown) => boolean = require('../backup/validateAppData.cjs');

let checks = 0;
const ok = (cond: unknown, msg: string) => { assert.ok(cond, msg); checks += 1; };
const eq = <T>(a: T, b: T, msg: string) => { assert.deepEqual(a, b, msg); checks += 1; };

// ── baseline ────────────────────────────────────────────────────────────────
eq(median([3, 1, 2]), 2, 'median odd');
eq(median([1, 2, 3, 4]), 2.5, 'median even');
eq(scaleBaseline([4, 4, 4]).personal, false, '<7 answers → scale midpoint');
eq(scaleBaseline([4, 4, 4]).median, 3, 'midpoint is 3');
const pb = scaleBaseline([4, 4, 4, 4, 4, 5, 3]);
eq(pb.personal, true, '≥7 answers → personal');
eq(pb.scale, 1, 'MAD 0 floors scale at 1');
eq(bandOf(1, pb), 'low', 'endpoint 1 always low');
eq(bandOf(5, scaleBaseline([5, 5, 5, 5, 5, 5, 5])), 'high', 'endpoint 5 always high even when median is 5');
eq(bandOf(3, pb), 'low', 'personal median 4: 3 is low for this person');
eq(bandOf(3, scaleBaseline([])), 'mid', 'midpoint: 3 is mid');
eq(bandOf(2, scaleBaseline([])), 'low', 'midpoint: 2 is low');
eq(bandOf(4, scaleBaseline([])), 'high', 'midpoint: 4 is high');
eq(personalBaseline([1, 2, 3], 1), undefined, 'personalBaseline needs 7');

// ── classification: every rule, missing combos, boundaries ──────────────────
const sig = (over: Partial<PassiveSignals> = {}): PassiveSignals => ({ timeBlock: 'afternoon', missing: ['sleep', 'resting_hr', 'hrv', 'training', 'schedule_load'], ...over });
const bodyLow = sig({ sleep: { recentAvgMin: 300, nights: 2, low: true, basis: 'general' }, missing: ['resting_hr', 'hrv', 'training', 'schedule_load'] });
const bodyOk = sig({ sleep: { recentAvgMin: 450, nights: 2, low: false, basis: 'general' }, missing: ['resting_hr', 'hrv', 'training', 'schedule_load'] });
const C = (energy: Scale5, tension: Scale5, signals = sig(), openLoops?: OpenLoops, pull?: Pull, history: StateCheckIn[] = []) =>
  classifyState({ energy, tension, openLoops, pull, signals, history });
const expectRule = (c: ReturnType<typeof C>, type: StateTypeOrUnclear, ruleId: string) => {
  eq(c.type, type, `${ruleId}: type`);
  eq(c.ruleId, ruleId, `${ruleId}: rule id`);
};
expectRule(C(2, 4), 'overload', 'overload.low_e_high_t');
expectRule(C(3, 3, sig(), 'many'), 'overload', 'overload.many_loops');
expectRule(C(4, 2, sig(), 'many'), 'calm_energy', 'calm_energy'); // many loops but loose: not overload
expectRule(C(2, 2, bodyLow), 'low_fuel', 'low_fuel.body_low');
expectRule(C(2, 2, bodyOk, undefined, 'want_cant'), 'unclear', 'unclear.conflict_pull_body');
expectRule(C(2, 2, bodyOk), 'low_arousal', 'low_arousal.body_ok');
expectRule(C(2, 3, sig(), undefined, 'can_dont_want'), 'low_arousal', 'low_arousal.pull');
expectRule(C(2, 3, sig(), undefined, 'want_cant'), 'low_fuel', 'low_fuel.pull');
expectRule(C(2, 3, sig()), 'unclear', 'unclear.missing_body');
expectRule(C(2, 3, sig(), undefined, 'unsure'), 'unclear', 'unclear.missing_body');
expectRule(C(3, 3, sig(), undefined, 'can_dont_want'), 'low_arousal', 'low_arousal.pull_mid');
expectRule(C(4, 4), 'tense_energy', 'tense_energy');
expectRule(C(5, 1), 'calm_energy', 'calm_energy');
expectRule(C(4, 3), 'calm_energy', 'calm_energy.mid'); // tension at median → calm
expectRule(C(3, 4, sig(), 'few'), 'overload', 'overload.mid_e');
expectRule(C(3, 4, sig(), 'none'), 'tense_energy', 'tense_energy.mid_e');
expectRule(C(3, 4), 'unclear', 'unclear.mid_e_high_t');
expectRule(C(3, 2, bodyLow), 'low_fuel', 'low_fuel.mid_e_body_low');
expectRule(C(3, 3), 'unclear', 'unclear.in_range');
expectRule(C(3, 3, bodyOk), 'unclear', 'unclear.in_range');
// every energy × tension × loops × pull × body combination yields a defined rule
let combos = 0;
for (const e of [1, 2, 3, 4, 5] as Scale5[]) for (const t of [1, 2, 3, 4, 5] as Scale5[])
  for (const l of [undefined, 'none', 'few', 'many'] as (OpenLoops | undefined)[])
    for (const p of [undefined, 'want_cant', 'can_dont_want', 'unsure'] as (Pull | undefined)[])
      for (const s of [sig(), bodyLow, bodyOk]) {
        const c = C(e, t, s, l, p);
        assert.ok(c.ruleId && c.type, `combo ${e}/${t}/${l}/${p}`);
        combos += 1;
      }
ok(combos === 5 * 5 * 4 * 4 * 3, 'all 1200 combinations classified');
// relative thresholds: someone whose usual energy is 4 reads 3 as low
const history = Array.from({ length: 8 }, (_, i) => ({ id: `h${i}`, date: '2026-10-01', timestamp: `2026-10-0${i + 1}T09:00:00Z`, overall: 4, energy: 4, stress: 2, createdAt: '', stateLayer: { v: 'questlife.state-layer.v0', kind: 'check_in', tension: 2, overallFrom: 'energy' } })) as StateCheckIn[];
const rel = C(3, 2, bodyOk, undefined, undefined, history);
eq(rel.baseline, 'personal', 'personal baseline after 8 answers');
eq(rel.energyBand, 'low', 'energy 3 is low against a usual of 4');
eq(rel.type, 'low_arousal', 'so 3/2 with normal body reads as low arousal for this person');
eq(C(3, 2, bodyOk).type, 'unclear', 'same answer without a baseline is in range');
eq(rel.baselineN, 8, 'baselineN');
// baselineHistory excludes legacy rows (stress defaulted to 3) and the current row
const legacy = { id: 'L', date: '2026-10-01', timestamp: 'x', overall: 3, stress: 3, createdAt: '' } as StateCheckIn;
eq(baselineHistory([...history, legacy], 'h0').length, 7, 'legacy and current row excluded');
// used / missing lists
const cu = C(2, 4, bodyOk, 'many');
ok(cu.used.includes('sleep') && cu.used.includes('open_loops'), 'used lists sleep + loops');
ok(cu.missing.includes('pull') && cu.missing.includes('resting_hr'), 'missing lists pull + rhr');
// correction wins
eq(effectiveType({ stateLayer: { v: 'questlife.state-layer.v0', kind: 'check_in', tension: 3, overallFrom: 'energy', classification: cu, correction: { type: 'low_fuel', at: 'x' } } }), 'low_fuel', 'correction wins');

// ── passive signals ─────────────────────────────────────────────────────────
const now = new Date(2026, 10, 4, 15, 0);
const today = localYmd(now);
const ctx = (date: string, value: number, unit = 'min', label = 'sleep_duration'): ContextLog => ({ id: `c${date}${unit}`, date, type: 'sleep', label, value, unit, createdAt: `${date}T08:00:00Z` });
eq(addDays('2026-03-01', -1), '2026-02-28', 'addDays crosses months');
const sm = sleepMinutesByDate([ctx(today, 400)], [{ metric: 'sleep', value: 200, unit: 'min', eventEndAt: new Date(2026, 10, 4, 7).toISOString() }, { metric: 'sleep', value: 220, unit: 'min', eventEndAt: new Date(2026, 10, 4, 3).toISOString() }]);
eq(sm.get(today), 420, 'health sleep segments summed and win over typed sleep');
const generalShort = gatherPassiveSignals({ now, contextLogs: [ctx(today, 320), ctx(addDays(today, -1), 330)], health: [], executionLogs: [], scheduleBlocks: [] });
eq(generalShort.sleep?.basis, 'general', 'no 7-night history → general threshold');
eq(generalShort.sleep?.low, true, '5.4h < 6h is short');
ok(generalShort.missing.includes('resting_hr') && generalShort.missing.includes('hrv'), 'no HR on web → missing');
const longHist = Array.from({ length: 10 }, (_, i) => ctx(addDays(today, -2 - i), 480));
const personalOk = gatherPassiveSignals({ now, contextLogs: [...longHist, ctx(today, 460), ctx(addDays(today, -1), 450)], health: [], executionLogs: [], scheduleBlocks: [] });
eq(personalOk.sleep?.basis, 'personal', 'personal sleep baseline');
eq(personalOk.sleep?.low, false, '7.6h vs usual 8h (scale floor 30min) is in range; exactly 7.5h would count as low');
const personalLow = gatherPassiveSignals({ now, contextLogs: [...longHist, ctx(today, 400), ctx(addDays(today, -1), 420)], health: [], executionLogs: [], scheduleBlocks: [] });
eq(personalLow.sleep?.low, true, '6.8h vs usual 8h is low for this person (though above 6h)');
const selfRated = gatherPassiveSignals({ now, contextLogs: [ctx(today, 1, '睡眠自评1-3', '睡眠自评')], health: [], executionLogs: [], scheduleBlocks: [] });
eq(selfRated.sleep, undefined, 'self-rating never becomes minutes');
eq(selfRated.sleepSelfRating?.low, true, 'self-rating 1 is a weak low signal');
const exec = (date: string, min: number, taskType: ExecutionLog['taskType'] = 'strength_training') => ({ id: `e${date}${min}`, date, durationMinutes: min, taskType, createdAt: `${date}T10:00:00Z` }) as unknown as ExecutionLog;
const tr = gatherPassiveSignals({ now, contextLogs: [], health: [], executionLogs: [exec(addDays(today, -1), 75)], scheduleBlocks: [] });
eq(tr.training?.heavy, true, '75 min ≥ 60 general');
const tr0 = gatherPassiveSignals({ now, contextLogs: [], health: [], executionLogs: [exec(addDays(today, -1), 0)], scheduleBlocks: [] });
eq(tr0.training, undefined, '0 minutes = not recorded, not zero training');
const rhrPts = Array.from({ length: 9 }, (_, i) => ({ metric: 'resting_heart_rate', value: 56, unit: 'bpm', eventEndAt: new Date(2026, 10, 4 - 9 + i, 6).toISOString() }));
const rhr = gatherPassiveSignals({ now, contextLogs: [], health: [...rhrPts, { metric: 'resting_heart_rate', value: 63, unit: 'bpm', eventEndAt: new Date(2026, 10, 4, 6).toISOString() }], executionLogs: [], scheduleBlocks: [] });
eq(rhr.restingHr?.high, true, 'RHR 63 vs usual 56 (+3 floor) is high');
eq(bodyAccountOf(rhr), 'low', 'high RHR → body low');
eq(bodyAccountOf(sig()), 'unknown', 'no body signals → unknown');
eq(bodyAccountOf(personalOk), 'normal', 'sleep in range → normal');

// ── explanation ─────────────────────────────────────────────────────────────
const line = reasonLine({ energy: 2, tension: 4, openLoops: 'many', signals: personalOk, classification: C(2, 4, personalOk, 'many') }, 'zh');
ok(line.startsWith('精力 2、紧绷 4，挂着很多事；近两晚平均 7.6 小时，在你的常态范围内'), `zh reason line: ${line}`);
ok(line.endsWith('→ 更像过载，不是没睡够。'), 'zh conclusion');
ok(!/因为|诊断|导致/.test(line), 'no causal / diagnostic words');
const selfOnly = reasonLine({ energy: 2, tension: 4, signals: selfRated, classification: { ...C(2, 4, selfRated), body: 'normal' } }, 'zh');
ok(!selfOnly.includes('不是没睡够'), `self-rating alone never yields "not lack of sleep": ${selfOnly}`);
const enLine = reasonLine({ energy: 2, tension: 2, signals: sig(), classification: C(2, 2, sig()) }, 'en');
ok(enLine.includes('unclear') && enLine.includes('no body signals'), `en unclear line: ${enLine}`);
ok(notUsedLine(C(2, 4, sig()), 'zh')!.includes('静息心率'), 'not-used line lists missing HR');
ok(baselineLine(C(2, 4), 'zh').includes('还没有你的基线'), 'baseline line without baseline');
// every type has primary + alternate copy in both languages
for (const type of Object.keys(ACTIONS_BY_TYPE) as StateTypeOrUnclear[]) for (const lang of ['zh', 'en'] as const) {
  const a = ACTIONS_BY_TYPE[type];
  ok(ACTION_COPY[lang][a.primary.id].title && ACTION_COPY[lang][a.alternate.id].title && TYPE_NAME[lang][type], `copy ${type}/${lang}`);
  if (a.primary.science) ok(SCIENCE_LINE[lang][a.primary.science], 'science line exists');
}

// ── reorder ─────────────────────────────────────────────────────────────────
const blk = (id: string, start: string, end: string, taskType: ScheduleBlock['taskType'], extra: Partial<ScheduleBlock> = {}): ScheduleBlock => ({
  id, title: id, date: today, startTime: start, endTime: end, plannedMinutes: 0, taskType, flexibility: 'flexible', rigidity: 'low', status: 'planned', createdAt: 0, ...extra,
});
const dayBlocks = [
  blk('study', '15:30', '16:30', 'deep_study'),
  blk('meeting', '16:30', '17:00', 'admin', { flexibility: 'fixed' }),
  blk('email', '17:00', '17:30', 'admin'),
  blk('gym', '18:00', '19:00', 'strength_training'),
  blk('walk', '19:30', '20:00', 'cardio_recovery'),
  blk('done', '14:00', '15:00', 'admin', { status: 'completed' }),
];
eq(inferDemand(dayBlocks[0]), { demand: 'deep', inferred: true }, 'deep_study → deep (inferred)');
eq(inferDemand({ taskType: 'admin', demand: 'social' }), { demand: 'social', inferred: false }, 'explicit demand wins');
const lf = reorderToday({ type: 'low_fuel', date: today, now, blocks: dayBlocks });
ok(lf.kind === 'reordered', 'low_fuel reorders');
if (lf.kind === 'reordered') {
  const order = lf.after.filter((b) => b.id !== 'meeting' && b.id !== 'done').sort((a, b) => a.startTime.localeCompare(b.startTime)).map((b) => b.id);
  eq(order, ['walk', 'email', 'gym', 'study'], 'low_fuel: recovery → shallow → physical → deep');
  eq(lf.after.find((b) => b.id === 'meeting')!.startTime, '16:30', 'fixed block never moves');
  eq(lf.after.find((b) => b.id === 'done')!.startTime, '14:00', 'completed block never moves');
  ok(!lf.after.some((b) => b.id !== 'meeting' && b.id !== 'done' && b.startTime < '16:30' && b.endTime > '16:30'), 'nothing overlaps the fixed meeting');
  const patch = createDecisionPlanPatch({ id: 'p1', generatedAt: now.toISOString(), date: today, before: lf.before, after: lf.after });
  const applied = applyDecisionPlanPatch(dayBlocks, patch);
  eq(undoDecisionPlanPatch(applied, patch), dayBlocks, 'planPatch apply → undo restores the day exactly');
  ok(patch.operations.every((op) => op.blockId !== 'meeting'), 'no operation on the fixed block');
}
const calm = reorderToday({ type: 'calm_energy', date: today, now, blocks: dayBlocks });
ok(calm.kind === 'reordered' && calm.after.filter((b) => !['meeting', 'done'].includes(b.id)).sort((a, b) => a.startTime.localeCompare(b.startTime)).map((b) => b.id).join() === 'study,gym,email,walk', 'calm_energy: deep → physical → shallow → recovery');
ok(calm.kind === 'reordered' && calm.after.find((b) => b.id === 'study')!.startTime === '15:30', 'first slot keeps its original start (gaps preserved)');
eq(reorderToday({ type: 'calm_energy', date: today, now, blocks: [dayBlocks[0], dayBlocks[3]] }).kind, 'unchanged', 'already in order → unchanged, no time shifts');
eq(reorderToday({ type: 'unclear', date: today, now, blocks: dayBlocks }).kind, 'not_applicable', 'unclear never reorders');
eq(reorderToday({ type: 'overload', date: today, now: new Date(2026, 10, 4, 21, 0), blocks: dayBlocks }).kind, 'unchanged', 'nothing left to move');
const tight = [blk('a', '22:00', '23:30', 'deep_study'), blk('b', '23:30', '23:55', 'cardio_recovery'), blk('f', '23:00', '23:20', 'admin', { flexibility: 'fixed' })];
eq(reorderToday({ type: 'low_fuel', date: today, now: new Date(2026, 10, 4, 21, 50), blocks: tight }).kind, 'cant_fit', 'cannot fit → no reorder');
const tagged = reorderToday({ type: 'calm_energy', date: today, now, blocks: dayBlocks, demandOverrides: { email: 'deep' } });
ok(tagged.kind === 'reordered' && tagged.after.find((b) => b.id === 'email')!.demand === 'deep', 'demand override is written into the patch');
ok(Object.values(DEMAND_ORDER).every((o) => o.length === 5), 'each order ranks all 5 demands');

// ── outcomes / follow-up ────────────────────────────────────────────────────
const sl0 = (kind: 'check_in' | 'follow_up', tension: number, extra = {}) => ({ v: 'questlife.state-layer.v0', kind, tension, overallFrom: 'energy', ...extra });
const mk = (id: string, energy: number, tension: number, ts: string, extra: object = {}): StateCheckIn => ({ id, date: today, timestamp: ts, overall: energy, energy, stress: tension, createdAt: ts, stateLayer: sl0('check_in', tension, extra) as StateCheckIn['stateLayer'] });
const rows: StateCheckIn[] = [];
for (let i = 0; i < 6; i += 1) {
  rows.push(mk(`p${i}`, 2, 4, `2026-11-0${i}T09:00:00Z`, { classification: { ...C(2, 4) }, choice: { actionId: 'brain_dump', slot: 'primary', randomized: i % 2 === 0, at: `2026-11-0${i}T09:00:00Z` } }));
  if (i < 5) rows.push({ ...mk(`f${i}`, i < 4 ? 3 : 2, i < 3 ? 3 : 4, `2026-11-0${i}T09:40:00Z`), stateLayer: sl0('follow_up', i < 3 ? 3 : 4, { followUpOf: `p${i}`, nextDone: i < 2 ? true : undefined }) as StateCheckIn['stateLayer'] });
}
const cells = summarizeOutcomes(rows);
const bd = cells.find((c) => c.actionId === 'brain_dump')!;
eq(bd.n, 5, 'five picks with follow-ups');
eq(bd.pendingOrDismissed, 1, 'pick without follow-up is not an outcome');
eq([bd.energyUp, bd.energySame], [4, 1], 'energy counts');
eq([bd.tensionDown, bd.tensionSame], [3, 2], 'tension counts');
eq([bd.nextDone, bd.nextUnanswered], [2, 3], 'next-done counts (unanswered stays unanswered)');
eq(bd.randomizedN, 3, 'randomized picks counted separately');
ok(MIN_OUTCOME_N === 5, 'threshold 5');
ok(followUpDue('2026-11-04T06:00:00Z', new Date('2026-11-04T06:25:00Z')), 'due after 20 min');
ok(!followUpDue('2026-11-04T06:00:00Z', new Date('2026-11-04T06:10:00Z')), 'not due at 10 min');
const pend = pendingFollowUp(rows, new Date('2026-11-06T12:00:00Z'), () => true);
eq(pend?.id, 'p5', 'the unanswered pick is pending');
eq(pendingFollowUp([...rows.filter((r) => r.id !== 'p5'), { ...rows.find((r) => r.id === 'p5')!, stateLayer: { ...rows.find((r) => r.id === 'p5')!.stateLayer!, choice: { ...rows.find((r) => r.id === 'p5')!.stateLayer!.choice!, followUpDismissedAt: 'x' } } }], new Date(), () => true), undefined, 'dismissed is not pending');

// ── calendar / lag ──────────────────────────────────────────────────────────
const dayRow = (date: string, type: StateTypeOrUnclear, hh = '09', corr?: StateTypeOrUnclear): StateCheckIn => ({ id: `${date}-${hh}`, date, timestamp: `${date}T${hh}:00:00Z`, overall: 3, energy: 3, createdAt: '', stateLayer: { v: 'questlife.state-layer.v0', kind: 'check_in', tension: 3, overallFrom: 'energy', classification: { ...C(3, 3), type }, ...(corr ? { correction: { type: corr as never, at: 'x' } } : {}) } });
const calRows = [dayRow(today, 'overload', '09'), dayRow(today, 'low_fuel', '15'), dayRow(addDays(today, -2), 'overload', '09', 'low_fuel')];
const cal = stateCalendar(calRows, today, 30);
eq(cal.length, 30, '30 cells');
eq(cal[29].type, 'low_fuel', 'tie → latest of the day');
eq(cal[28].type, undefined, 'missing day stays empty');
eq(cal[27].type, 'low_fuel', 'correction used in calendar');
eq(calendarSummary(cal), { logged: 2, counts: [{ type: 'low_fuel', days: 2 }] }, 'summary counts days');
const lagRows: StateCheckIn[] = []; const lagSleep = new Map<string, number>();
for (let i = 0; i < 12; i += 1) { const d = addDays(today, -i); lagRows.push(dayRow(d, i < 4 ? 'low_fuel' : 'calm_energy')); lagSleep.set(d, i < 5 ? 300 : 450); }
const lag = lagSleepDescription(stateCalendar(lagRows, today, 30), lagSleep, (m) => m < 360);
eq([lag.pairs, lag.shown, lag.lowN, lag.lowTarget, lag.normN, lag.normTarget], [12, true, 5, 4, 7, 0], 'lag counts');
eq(lagSleepDescription(stateCalendar(lagRows.slice(0, 9), today, 30), lagSleep, (m) => m < 360).shown, false, '<10 pairs hidden');

// ── brain dump ──────────────────────────────────────────────────────────────
eq(splitBrainDump('回老王邮件，问价格\n- 周报\n2. 买猫粮\n周报\n'), ['回老王邮件，问价格', '周报', '买猫粮'], 'lines are items; bullets stripped; dedup');
eq(splitBrainDump('回邮件、周报，买猫粮'), ['回邮件', '周报', '买猫粮'], 'single line splits on separators');
const slots = freeSlots({ now, date: today, blocks: dayBlocks, minutes: 30, count: 3 });
eq(slots, ['17:30', '19:00', '20:00'], 'free slots skip busy blocks');
ok(!slotIsFree({ now, date: today, blocks: dayBlocks, time: '16:40', minutes: 30 }), 'busy slot rejected');
ok(!slotIsFree({ now, date: today, blocks: dayBlocks, time: '14:30', minutes: 30 }), 'past slot rejected');
ok(!slotIsFree({ now, date: today, blocks: dayBlocks, time: '25:00', minutes: 30 }), 'invalid clock rejected');
ok(!slotIsFree({ now, date: today, blocks: dayBlocks, time: '17:30', minutes: 30, taken: ['17:30'] }), 'taken by another item');
const nb = brainDumpBlock({ id: 'bd1', date: today, title: '周报', time: '17:30', minutes: 30, createdAt: 1 });
eq([nb.endTime, nb.flexibility], ['18:00', 'movable'], 'brain-dump block shape');
const addPatch = createDecisionPlanPatch({ id: 'bd', generatedAt: now.toISOString(), date: today, before: dayBlocks, after: [...dayBlocks, nb] });
eq(addPatch.operations.map((o) => o.type), ['add'], 'scheduled item is an add operation');
eq(undoDecisionPlanPatch(applyDecisionPlanPatch(dayBlocks, addPatch), addPatch), dayBlocks, 'add → undo');

// ── check-in builder + sync / backup compatibility ─────────────────────────
const built = buildStateCheckIn({ answers: { energy: 2, tension: 4, openLoops: 'many' }, kind: 'check_in', now, date: today, signals: sig(), allCheckIns: [] });
eq([built.overall, built.energy, built.stress, built.focus, built.mood], [2, 2, 4, undefined, undefined], 'energy→overall/energy, tension→stress; focus/mood not filled');
eq(built.stateLayer?.pull, undefined, 'skipped optional answer stays missing');
eq(built.stateLayer?.classification?.type, 'overload', 'classified on build');
const row = { id: 'state-abc', createdAt: now.toISOString(), ...built } as StateCheckIn;
ok(validEntity('stateCheckIns', row.id, row), 'SyncV2 accepts a state-layer check-in as-is');
ok(validEntity('scheduleBlocks', nb.id, nb), 'SyncV2 accepts a block with demand');
const bdLog: ContextLog = { id: 'ctx-bd', date: today, createdAt: now.toISOString(), type: 'custom', label: '清空脑子', value: 3, unit: '件', source: 'manual', brainDump: { v: 'questlife.state-layer.v0', items: [{ text: '周报', choice: 'schedule', time: '17:30', minutes: 30, scheduleBlockId: 'bd1' }] } };
ok(validEntity('contextLogs', bdLog.id, bdLog), 'SyncV2 accepts a brain-dump context log');
ok(validateAppData({ ...DEFAULT_DATA, stateCheckIns: [row], scheduleBlocks: [nb], contextLogs: [bdLog] }), 'backup schema accepts the new optional fields');
eq(latestStateLayerRow([row, { ...row, id: 'old', timestamp: '2026-01-01T00:00:00Z' }], today)?.id, 'state-abc', 'latest state-layer row of the day');

console.log(`state-layer ok (${checks} checks)`);
