import type { ScheduleBlock } from '../types';

/** Deterministic local split: one item per line, also accepting Chinese/English list separators. */
export function splitBrainDump(text: string): string[] {
  const seen = new Set<string>();
  // With line breaks, lines are the items (a comma inside a line stays); otherwise list separators split.
  return text
    .split(/[\n\r]/.test(text.trim()) ? /[\n\r；;]+/ : /[；;，,、]+/)
    .map((s) => s.replace(/^\s*(?:[-*•·]|\d+[.)、])\s*/, '').trim())
    .filter((s) => {
      if (!s || seen.has(s)) return false;
      seen.add(s);
      return true;
    })
    .slice(0, 30);
}

const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const toClock = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export function validClock(value: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/** The earliest `count` free half-hour-aligned slots of `minutes` today, after now. */
export function freeSlots(input: { now: Date; date: string; blocks: ScheduleBlock[]; minutes: number; count: number; taken?: string[] }): string[] {
  const busy = input.blocks
    .filter((b) => b.date === input.date && b.status !== 'skipped')
    .map((b) => [toMin(b.startTime), toMin(b.endTime)] as const);
  for (const t of input.taken ?? []) busy.push([toMin(t), toMin(t) + input.minutes]);
  const nowMin = input.now.getHours() * 60 + input.now.getMinutes();
  const out: string[] = [];
  for (let start = Math.ceil((nowMin + 10) / 30) * 30; start + input.minutes <= 23 * 60 + 30 && out.length < input.count; start += 30) {
    if (!busy.some(([s, e]) => start < e && s < start + input.minutes)) out.push(toClock(start));
  }
  return out;
}

/** True when [time, time+minutes) is today, after now, and does not overlap any non-skipped block. */
export function slotIsFree(input: { now: Date; date: string; blocks: ScheduleBlock[]; time: string; minutes: number; taken?: string[] }): boolean {
  if (!validClock(input.time)) return false;
  const start = toMin(input.time);
  const nowMin = input.now.getHours() * 60 + input.now.getMinutes();
  if (start <= nowMin || start + input.minutes > 24 * 60) return false;
  const busy = input.blocks
    .filter((b) => b.date === input.date && b.status !== 'skipped')
    .map((b) => [toMin(b.startTime), toMin(b.endTime)] as const);
  for (const t of input.taken ?? []) busy.push([toMin(t), toMin(t) + input.minutes]);
  return !busy.some(([s, e]) => start < e && s < start + input.minutes);
}

export function brainDumpBlock(input: { id: string; date: string; title: string; time: string; minutes: number; createdAt: number }): ScheduleBlock {
  return {
    id: input.id,
    title: input.title,
    date: input.date,
    startTime: input.time,
    endTime: toClock(toMin(input.time) + input.minutes),
    plannedMinutes: input.minutes,
    taskType: 'admin',
    flexibility: 'movable',
    rigidity: 'low',
    status: 'planned',
    demand: 'shallow',
    notes: '清空脑子',
    createdAt: input.createdAt,
    source: 'manual',
  };
}
