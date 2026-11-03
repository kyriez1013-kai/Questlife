import type { StateCheckIn } from '../types';
import { effectiveType } from './classifyState';
import { addDays } from './signals';
import { STATE_TYPES, type StateType, type StateTypeOrUnclear } from './types';

export const MIN_LAG_PAIRS = 10;

export type CalendarDay = { date: string; type?: StateTypeOrUnclear; checkIns: number };

/** One cell per day; a day without a check-in has no type (shown empty, never filled). */
export function stateCalendar(rows: StateCheckIn[], endDate: string, days: number): CalendarDay[] {
  const byDate = new Map<string, StateCheckIn[]>();
  for (const r of rows) {
    if (r.dataProvenance?.deleted || !effectiveType(r)) continue;
    byDate.set(r.date, [...(byDate.get(r.date) ?? []), r]);
  }
  const out: CalendarDay[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = addDays(endDate, -i);
    const list = (byDate.get(date) ?? []).slice().sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    if (!list.length) { out.push({ date, checkIns: 0 }); continue; }
    // Mode of the day's types; a tie goes to the most recent one.
    const counts = new Map<StateTypeOrUnclear, { n: number; last: number }>();
    list.forEach((r, idx) => {
      const t = effectiveType(r)!;
      const c = counts.get(t) ?? { n: 0, last: -1 };
      counts.set(t, { n: c.n + 1, last: idx });
    });
    const type = [...counts.entries()].sort((a, b) => b[1].n - a[1].n || b[1].last - a[1].last)[0][0];
    out.push({ date, type, checkIns: list.length });
  }
  return out;
}

export function calendarSummary(cal: CalendarDay[]): { logged: number; counts: Array<{ type: StateTypeOrUnclear; days: number }> } {
  const counts = new Map<StateTypeOrUnclear, number>();
  for (const d of cal) if (d.type) counts.set(d.type, (counts.get(d.type) ?? 0) + 1);
  return {
    logged: cal.filter((d) => d.type).length,
    counts: [...counts.entries()].map(([type, days]) => ({ type, days })).sort((a, b) => b.days - a.days),
  };
}

/**
 * Lag-1 description: among days whose previous night's sleep is known, how often the day was
 * `target` after short vs usual sleep. Counts only; hidden below MIN_LAG_PAIRS pairs.
 */
export function lagSleepDescription(
  cal: CalendarDay[],
  sleepByDate: Map<string, number>,
  isShort: (minutes: number) => boolean,
  target: StateType = 'low_fuel',
): { pairs: number; shown: boolean; lowN: number; lowTarget: number; normN: number; normTarget: number } {
  let lowN = 0, lowTarget = 0, normN = 0, normTarget = 0;
  for (const d of cal) {
    if (!d.type) continue;
    const sleep = sleepByDate.get(d.date); // sleep is keyed by wake-up date = the morning of this day
    if (sleep === undefined) continue;
    if (isShort(sleep)) { lowN += 1; if (d.type === target) lowTarget += 1; }
    else { normN += 1; if (d.type === target) normTarget += 1; }
  }
  const pairs = lowN + normN;
  return { pairs, shown: pairs >= MIN_LAG_PAIRS, lowN, lowTarget, normN, normTarget };
}

export { STATE_TYPES };
