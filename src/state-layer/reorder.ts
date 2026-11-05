import type { ScheduleBlock } from '../types';
import type { Demand, StateTypeOrUnclear } from './types';

export const DEMAND_ORDER: Record<Exclude<StateTypeOrUnclear, 'unclear'>, Demand[]> = {
  calm_energy: ['deep', 'physical', 'shallow', 'social', 'recovery'],
  tense_energy: ['shallow', 'physical', 'social', 'recovery', 'deep'],
  low_fuel: ['recovery', 'shallow', 'social', 'physical', 'deep'],
  overload: ['shallow', 'recovery', 'physical', 'social', 'deep'],
  low_arousal: ['physical', 'shallow', 'social', 'deep', 'recovery'],
};

export function inferDemand(block: Pick<ScheduleBlock, 'taskType' | 'demand'>): { demand: Demand; inferred: boolean } {
  if (block.demand) return { demand: block.demand, inferred: false };
  switch (block.taskType) {
    case 'deep_study':
    case 'creative_building':
      return { demand: 'deep', inferred: true };
    case 'strength_training':
      return { demand: 'physical', inferred: true };
    case 'cardio_recovery':
      return { demand: 'recovery', inferred: true };
    default:
      return { demand: 'shallow', inferred: true };
  }
}

const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const toClock = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const DAY_END = 23 * 60 + 59;

export type ReorderResult =
  | { kind: 'unchanged' }
  | { kind: 'cant_fit' }
  | { kind: 'not_applicable' }
  | { kind: 'reordered'; before: ScheduleBlock[]; after: ScheduleBlock[]; movedIds: string[] };

/**
 * Re-orders today's not-yet-started movable blocks for a state type. Pure: returns the full day
 * before/after, for createDecisionPlanPatch. Fixed / locked / started / done blocks never move.
 * `demandOverrides` are the person's own demand tags from the preview; they are written into the
 * after-blocks so the tag change is part of the same undoable patch.
 */
export function reorderToday(input: {
  type: StateTypeOrUnclear;
  date: string;
  now: Date;
  blocks: ScheduleBlock[];
  demandOverrides?: Record<string, Demand>;
  preparationMinutes?: number;
}): ReorderResult {
  if (input.type === 'unclear') return { kind: 'not_applicable' };
  const order = DEMAND_ORDER[input.type];
  const nowMin = Math.ceil((input.now.getHours() * 60 + input.now.getMinutes()) / 5) * 5;
  const day = input.blocks.filter((b) => b.date === input.date);
  const live = (b: ScheduleBlock) => b.status !== 'completed' && b.status !== 'skipped';
  const movable = day
    .filter((b) => live(b) && b.flexibility !== 'fixed' && !b.placementLocked && toMin(b.startTime) >= nowMin)
    .sort((a, b) => a.startTime.localeCompare(b.startTime) || a.id.localeCompare(b.id));
  const overrides = input.demandOverrides ?? {};
  const tagged = (b: ScheduleBlock): ScheduleBlock => (overrides[b.id] && overrides[b.id] !== b.demand ? { ...b, demand: overrides[b.id] } : b);
  if (!movable.length) {
    return { kind: 'unchanged' };
  }
  // Anything not skipped occupies its slot (planPatch's conflict check treats completed blocks the same way).
  const obstacles = day
    .filter((b) => b.status !== 'skipped' && !movable.includes(b))
    .map((b) => [toMin(b.startTime), toMin(b.endTime)] as const);
  const rank = (b: ScheduleBlock) => order.indexOf(overrides[b.id] ?? inferDemand(b).demand);
  const sorted = movable
    .map((b, i) => ({ b, i }))
    .sort((x, y) => rank(x.b) - rank(y.b) || x.i - y.i)
    .map(({ b }) => b);

  const windowEnd = Math.max(...movable.map((b) => toMin(b.endTime)));
  const slotStarts = movable.map((b) => toMin(b.startTime));
  const tryPlace = (limit: number): Map<string, [number, number]> | null => {
    const placed = new Map<string, [number, number]>();
    let cursor = nowMin + Math.max(0, input.preparationMinutes ?? 0);
    // The i-th block in the new order starts no earlier than the i-th original start, so gaps the
    // person left are kept and an already-good order comes back unchanged.
    for (const [i, b] of sorted.entries()) {
      const len = toMin(b.endTime) - toMin(b.startTime);
      let start = Math.max(cursor, slotStarts[i]);
      for (let guard = 0; guard < 200; guard += 1) {
        const hit = obstacles.find(([s, e]) => start < e && s < start + len);
        if (!hit) break;
        start = hit[1];
      }
      if (start + len > limit) return null;
      placed.set(b.id, [start, start + len]);
      cursor = start + len;
    }
    return placed;
  };
  const placed = tryPlace(windowEnd) ?? tryPlace(DAY_END);
  if (!placed) return { kind: 'cant_fit' };

  const movedIds: string[] = [];
  const after = input.blocks.map((b) => {
    const slot = placed.get(b.id);
    if (!slot) return b;
    const startTime = toClock(slot[0]);
    const endTime = toClock(slot[1]);
    const next = tagged(b);
    if (startTime === b.startTime && endTime === b.endTime) return next;
    movedIds.push(b.id);
    return { ...next, startTime, endTime, status: 'adjusted' as const };
  });
  const tagChanged = movable.some((b) => overrides[b.id] && overrides[b.id] !== b.demand);
  if (!movedIds.length && !tagChanged) return { kind: 'unchanged' };
  return { kind: 'reordered', before: day, after: after.filter((b) => b.date === input.date), movedIds };
}
