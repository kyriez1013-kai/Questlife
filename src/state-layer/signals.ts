import type { ContextLog, ExecutionLog, ScheduleBlock, StateCheckIn } from '../types';
import { MIN_BASELINE_N, median, personalBaseline, quantile } from './baseline';
import type { SignalId } from './types';

// Passive signals: used when present, reported as "not used" when absent. Never filled in.

export type HealthPoint = { metric: string; value: number; unit?: string; eventEndAt: string };

export const SLEEP_SELF_RATING_UNIT = '睡眠自评1-3';
export const GENERAL_SHORT_SLEEP_MIN = 360;
export const GENERAL_HEAVY_TRAINING_MIN = 60;
const TRAINING_TASKS = new Set(['strength_training', 'cardio_recovery']);

export type PassiveSignals = {
  sleep?: { recentAvgMin: number; nights: number; low: boolean; basis: 'personal' | 'general'; baselineMedianMin?: number };
  sleepSelfRating?: { value: 1 | 2 | 3; low: boolean };
  restingHr?: { latest: number; high: boolean; baselineMedian: number };
  hrv?: { latest: number; low: boolean; baselineMedian: number };
  training?: { yesterdayMin: number; heavy: boolean; basis: 'personal' | 'general' };
  scheduleLoadHours?: number;
  timeBlock: NonNullable<StateCheckIn['timeBlock']>;
  /** Passive signals that were looked for but had no data. */
  missing: SignalId[];
};

export function localYmd(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return localYmd(new Date(y, m - 1, d + days, 12));
}

export function timeBlockOf(now: Date): PassiveSignals['timeBlock'] {
  const h = now.getHours();
  if (h < 5) return 'night';
  if (h < 11) return 'morning';
  if (h < 14) return 'midday';
  if (h < 18) return 'afternoon';
  if (h < 23) return 'evening';
  return 'night';
}

/** Sleep minutes per wake-up date. Synced HealthKit sleep wins over typed sleep for the same date. */
export function sleepMinutesByDate(contextLogs: ContextLog[], health: HealthPoint[]): Map<string, number> {
  const fromHealth = new Map<string, number>();
  for (const p of health) {
    if (p.metric !== 'sleep' || (p.unit && p.unit !== 'min') || !(p.value > 0)) continue;
    const day = localYmd(p.eventEndAt);
    fromHealth.set(day, (fromHealth.get(day) ?? 0) + p.value);
  }
  const result = new Map(fromHealth);
  for (const log of contextLogs) {
    if (log.type !== 'sleep' || log.unit !== 'min' || log.label !== 'sleep_duration' || log.dataProvenance?.deleted) continue;
    const value = Number(log.value);
    const day = log.date ?? (log.createdAt ? localYmd(log.createdAt) : undefined);
    if (!day || !(value > 0) || fromHealth.has(day)) continue;
    result.set(day, value);
  }
  return result;
}

function metricSeries(health: HealthPoint[], metric: string, beforeIso: string): number[] {
  return health
    .filter((p) => p.metric === metric && p.value > 0 && p.eventEndAt <= beforeIso)
    .sort((a, b) => a.eventEndAt.localeCompare(b.eventEndAt))
    .map((p) => p.value);
}

export function gatherPassiveSignals(input: {
  now: Date;
  contextLogs: ContextLog[];
  health: HealthPoint[];
  executionLogs: ExecutionLog[];
  scheduleBlocks: ScheduleBlock[];
}): PassiveSignals {
  const today = localYmd(input.now);
  const missing: SignalId[] = [];
  const out: PassiveSignals = { timeBlock: timeBlockOf(input.now), missing };

  // Sleep: last two nights vs the person's own usual.
  const byDate = sleepMinutesByDate(input.contextLogs, input.health);
  const recent = [today, addDays(today, -1)].map((d) => byDate.get(d)).filter((v): v is number => v !== undefined);
  if (recent.length) {
    const history = [...byDate.entries()].filter(([d]) => d < addDays(today, -1)).map(([, v]) => v);
    const base = personalBaseline(history, 30);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    out.sleep = base
      ? { recentAvgMin: avg, nights: recent.length, low: avg <= base.median - base.scale, basis: 'personal', baselineMedianMin: base.median }
      : { recentAvgMin: avg, nights: recent.length, low: avg < GENERAL_SHORT_SLEEP_MIN, basis: 'general' };
  } else {
    missing.push('sleep');
    const rating = input.contextLogs
      .filter((l) => l.type === 'sleep' && l.unit === SLEEP_SELF_RATING_UNIT && l.date === today && !l.dataProvenance?.deleted)
      .map((l) => Number(l.value))
      .filter((v) => v === 1 || v === 2 || v === 3)
      .pop() as 1 | 2 | 3 | undefined;
    if (rating) out.sleepSelfRating = { value: rating, low: rating === 1 };
  }

  // Resting HR / HRV: personal baseline only; there is no trustworthy population cut-off.
  const nowIso = input.now.toISOString();
  const rhr = metricSeries(input.health, 'resting_heart_rate', nowIso);
  const rhrBase = personalBaseline(rhr.slice(0, -1), 3);
  if (rhr.length && rhrBase) {
    const latest = rhr[rhr.length - 1];
    out.restingHr = { latest, high: latest >= rhrBase.median + rhrBase.scale, baselineMedian: rhrBase.median };
  } else missing.push('resting_hr');
  const hrv = metricSeries(input.health, 'hrv', nowIso);
  const hrvBase = personalBaseline(hrv.slice(0, -1), 5);
  if (hrv.length && hrvBase) {
    const latest = hrv[hrv.length - 1];
    out.hrv = { latest, low: latest <= hrvBase.median - hrvBase.scale, baselineMedian: hrvBase.median };
  } else missing.push('hrv');

  // Yesterday's training. durationMinutes 0 means "not recorded", not "zero minutes".
  const trainingByDate = new Map<string, number>();
  for (const log of input.executionLogs) {
    if (!log.taskType || !TRAINING_TASKS.has(log.taskType) || !(log.durationMinutes > 0) || log.dataProvenance?.deleted) continue;
    trainingByDate.set(log.date, (trainingByDate.get(log.date) ?? 0) + log.durationMinutes);
  }
  const yesterday = addDays(today, -1);
  const yMin = trainingByDate.get(yesterday);
  if (yMin !== undefined) {
    const history = [...trainingByDate.entries()].filter(([d]) => d < yesterday).map(([, v]) => v);
    const p75 = history.length >= MIN_BASELINE_N ? quantile(history, 0.75) : undefined;
    out.training = {
      yesterdayMin: yMin,
      heavy: yMin >= Math.max(GENERAL_HEAVY_TRAINING_MIN, p75 ?? 0),
      basis: p75 !== undefined ? 'personal' : 'general',
    };
  } else missing.push('training');

  // Remaining scheduled time today (Web has no external calendar).
  const nowMin = input.now.getHours() * 60 + input.now.getMinutes();
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const remaining = input.scheduleBlocks.filter((b) => b.date === today && b.status !== 'completed' && b.status !== 'skipped' && toMin(b.endTime) > nowMin);
  if (remaining.length) {
    out.scheduleLoadHours = remaining.reduce((sum, b) => sum + (toMin(b.endTime) - Math.max(toMin(b.startTime), nowMin)), 0) / 60;
  } else missing.push('schedule_load');

  return out;
}

/** low = any body signal says low; normal = at least one body signal and none low; else unknown. */
export function bodyAccountOf(s: PassiveSignals): 'low' | 'normal' | 'unknown' {
  const flags: boolean[] = [];
  if (s.sleep) flags.push(s.sleep.low);
  else if (s.sleepSelfRating) flags.push(s.sleepSelfRating.low);
  if (s.restingHr) flags.push(s.restingHr.high);
  if (s.hrv) flags.push(s.hrv.low);
  if (s.training) flags.push(s.training.heavy);
  if (!flags.length) return 'unknown';
  return flags.some(Boolean) ? 'low' : 'normal';
}

export { median };
