import type { ScheduleBlock } from '../types';

export const SCHEDULE_DAY_START_MINUTES = 7 * 60;
export const SCHEDULE_DAY_END_MINUTES = 23 * 60;

export type ScheduleCompilerMode = 'initial' | 'replan';
export type ScheduleCompilerPriority = 'low' | 'normal' | 'high';
export type SchedulePlacementReason = 'preferred_window' | 'existing_placement' | 'earliest_valid_window';
export type ScheduleUnplacedReason = 'insufficient_capacity' | 'insufficient_continuous_time';

export type ScheduleWindow = {
  startMinutes: number;
  endMinutes: number;
};

export type ScheduleCompilerCandidate = {
  block: ScheduleBlock;
  persisted: boolean;
  priority?: ScheduleCompilerPriority;
  deadlineAt?: string;
  preferredStartTime?: string;
};

export type SchedulePlacement = {
  candidate: ScheduleCompilerCandidate;
  startMinutes: number;
  endMinutes: number;
  startTime: string;
  endTime: string;
  reason: SchedulePlacementReason;
  changed: boolean;
};

export type ScheduleUnplaced = {
  candidate: ScheduleCompilerCandidate;
  reason: ScheduleUnplacedReason;
};

export type ScheduleCompilerInput = {
  date: string;
  fixedBlocks: ScheduleBlock[];
  flexibleBlocks: ScheduleCompilerCandidate[];
  dayStartMinutes?: number;
  dayEndMinutes?: number;
  notBeforeMinutes?: number;
  mode?: ScheduleCompilerMode;
};

export type ScheduleCompilerResult = {
  date: string;
  mode: ScheduleCompilerMode;
  dayStartMinutes: number;
  dayEndMinutes: number;
  notBeforeMinutes: number;
  fixedBlocks: ScheduleBlock[];
  preservedBlocks: ScheduleBlock[];
  placements: SchedulePlacement[];
  unplaced: ScheduleUnplaced[];
  openWindows: ScheduleWindow[];
  affectedCount: number;
};

type OccupiedRange = ScheduleWindow & { id: string };

export function scheduleTimeToMinutes(value: string): number {
  const [hour, minute] = value.split(':').map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return Number.NaN;
  return hour * 60 + minute;
}

export function scheduleMinutesToTime(value: number): string {
  const bounded = Math.max(0, Math.min(24 * 60, Math.round(value)));
  const hour = Math.floor(bounded / 60);
  const minute = bounded % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function clampRange(block: ScheduleBlock, dayStartMinutes: number, dayEndMinutes: number): OccupiedRange | null {
  const rawStart = scheduleTimeToMinutes(block.startTime);
  const rawEnd = scheduleTimeToMinutes(block.endTime);
  if (!Number.isFinite(rawStart) || !Number.isFinite(rawEnd) || rawEnd <= rawStart) return null;
  const startMinutes = Math.max(dayStartMinutes, rawStart);
  const endMinutes = Math.min(dayEndMinutes, rawEnd);
  if (endMinutes <= startMinutes) return null;
  return { id: block.id, startMinutes, endMinutes };
}

function mergeRanges(ranges: ScheduleWindow[]): ScheduleWindow[] {
  const ordered = ranges
    .filter((range) => range.endMinutes > range.startMinutes)
    .sort((a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes);
  const merged: ScheduleWindow[] = [];
  ordered.forEach((range) => {
    const previous = merged[merged.length - 1];
    if (!previous || range.startMinutes > previous.endMinutes) {
      merged.push({ ...range });
      return;
    }
    previous.endMinutes = Math.max(previous.endMinutes, range.endMinutes);
  });
  return merged;
}

function openWindowsFromRanges(
  dayStartMinutes: number,
  dayEndMinutes: number,
  ranges: ScheduleWindow[],
  notBeforeMinutes: number,
) {
  const startBoundary = Math.max(dayStartMinutes, notBeforeMinutes);
  const occupied = mergeRanges(ranges
    .map((range) => ({
      startMinutes: Math.max(startBoundary, range.startMinutes),
      endMinutes: Math.min(dayEndMinutes, range.endMinutes),
    }))
    .filter((range) => range.endMinutes > range.startMinutes));
  const open: ScheduleWindow[] = [];
  let cursor = startBoundary;
  occupied.forEach((range) => {
    if (range.startMinutes > cursor) open.push({ startMinutes: cursor, endMinutes: range.startMinutes });
    cursor = Math.max(cursor, range.endMinutes);
  });
  if (cursor < dayEndMinutes) open.push({ startMinutes: cursor, endMinutes: dayEndMinutes });
  return open;
}

export function deriveScheduleOpenWindows(
  dayStartMinutes: number,
  dayEndMinutes: number,
  blocks: ScheduleBlock[],
  notBeforeMinutes = dayStartMinutes,
): ScheduleWindow[] {
  const startBoundary = Math.max(dayStartMinutes, notBeforeMinutes);
  const occupied = blocks
    .filter((block) => block.status !== 'skipped')
    .map((block) => clampRange(block, startBoundary, dayEndMinutes))
    .filter((range): range is OccupiedRange => !!range);
  return openWindowsFromRanges(dayStartMinutes, dayEndMinutes, occupied, startBoundary);
}

function priorityRank(priority?: ScheduleCompilerPriority) {
  if (priority === 'high') return 3;
  if (priority === 'low') return 1;
  return 2;
}

function deadlineRank(deadlineAt?: string) {
  if (!deadlineAt) return Number.POSITIVE_INFINITY;
  const parsed = new Date(deadlineAt).getTime();
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

function candidateOrder(a: ScheduleCompilerCandidate, b: ScheduleCompilerCandidate) {
  return priorityRank(b.priority) - priorityRank(a.priority)
    || deadlineRank(a.deadlineAt) - deadlineRank(b.deadlineAt)
    || a.block.createdAt - b.block.createdAt
    || a.block.id.localeCompare(b.block.id);
}

function rangeIsFree(startMinutes: number, endMinutes: number, occupied: ScheduleWindow[]) {
  return occupied.every((range) => endMinutes <= range.startMinutes || startMinutes >= range.endMinutes);
}

function placementAt(
  candidate: ScheduleCompilerCandidate,
  startMinutes: number,
  reason: SchedulePlacementReason,
): SchedulePlacement {
  const duration = candidate.block.plannedMinutes;
  const endMinutes = startMinutes + duration;
  const startTime = scheduleMinutesToTime(startMinutes);
  const endTime = scheduleMinutesToTime(endMinutes);
  return {
    candidate,
    startMinutes,
    endMinutes,
    startTime,
    endTime,
    reason,
    changed: startTime !== candidate.block.startTime || endTime !== candidate.block.endTime,
  };
}

function validRequestedStart(
  value: string | undefined,
  duration: number,
  dayStartMinutes: number,
  dayEndMinutes: number,
  notBeforeMinutes: number,
  occupied: ScheduleWindow[],
) {
  if (!value) return null;
  const startMinutes = scheduleTimeToMinutes(value);
  const endMinutes = startMinutes + duration;
  if (!Number.isFinite(startMinutes)) return null;
  if (startMinutes < dayStartMinutes || startMinutes < notBeforeMinutes || endMinutes > dayEndMinutes) return null;
  return rangeIsFree(startMinutes, endMinutes, occupied) ? startMinutes : null;
}

function shouldPreserveCandidate(candidate: ScheduleCompilerCandidate, mode: ScheduleCompilerMode, notBeforeMinutes: number) {
  const block = candidate.block;
  if (block.flexibility === 'fixed' || block.placementLocked) return true;
  if (block.status === 'completed' || block.status === 'skipped') return true;
  if (mode !== 'replan') return false;
  const start = scheduleTimeToMinutes(block.startTime);
  return Number.isFinite(start) && start < notBeforeMinutes;
}

export function compileScheduleDay(input: ScheduleCompilerInput): ScheduleCompilerResult {
  const mode = input.mode ?? 'initial';
  const dayStartMinutes = input.dayStartMinutes ?? SCHEDULE_DAY_START_MINUTES;
  const dayEndMinutes = input.dayEndMinutes ?? SCHEDULE_DAY_END_MINUTES;
  const notBeforeMinutes = Math.max(dayStartMinutes, input.notBeforeMinutes ?? dayStartMinutes);
  const fixedBlocks = input.fixedBlocks.slice().sort((a, b) => a.startTime.localeCompare(b.startTime) || a.id.localeCompare(b.id));
  const preservedCandidates = input.flexibleBlocks.filter((candidate) => shouldPreserveCandidate(candidate, mode, notBeforeMinutes));
  const movableCandidates = input.flexibleBlocks.filter((candidate) => !shouldPreserveCandidate(candidate, mode, notBeforeMinutes)).sort(candidateOrder);
  const preservedBlocks = preservedCandidates.map((candidate) => candidate.block);
  const occupied = mergeRanges([...fixedBlocks, ...preservedBlocks]
    .filter((block) => block.status !== 'skipped')
    .map((block) => clampRange(block, dayStartMinutes, dayEndMinutes))
    .filter((range): range is OccupiedRange => !!range));
  const placements: SchedulePlacement[] = [];
  const unplaced: ScheduleUnplaced[] = [];

  movableCandidates.forEach((candidate) => {
    const duration = candidate.block.plannedMinutes;
    if (!Number.isFinite(duration) || duration <= 0) {
      unplaced.push({ candidate, reason: 'insufficient_continuous_time' });
      return;
    }

    const preferredStart = validRequestedStart(
      candidate.preferredStartTime,
      duration,
      dayStartMinutes,
      dayEndMinutes,
      notBeforeMinutes,
      occupied,
    );
    const existingStart = candidate.persisted
      ? validRequestedStart(candidate.block.startTime, duration, dayStartMinutes, dayEndMinutes, notBeforeMinutes, occupied)
      : null;
    const openBeforePlacement = openWindowsFromRanges(dayStartMinutes, dayEndMinutes, occupied, notBeforeMinutes);
    const earliestWindow = openBeforePlacement.find((window) => window.endMinutes - window.startMinutes >= duration);
    const startMinutes = preferredStart ?? existingStart ?? earliestWindow?.startMinutes ?? null;

    if (startMinutes == null) {
      const totalOpen = openBeforePlacement.reduce((sum, window) => sum + window.endMinutes - window.startMinutes, 0);
      unplaced.push({
        candidate,
        reason: totalOpen >= duration ? 'insufficient_continuous_time' : 'insufficient_capacity',
      });
      return;
    }

    const reason: SchedulePlacementReason = preferredStart != null
      ? 'preferred_window'
      : existingStart != null
        ? 'existing_placement'
        : 'earliest_valid_window';
    const placement = placementAt(candidate, startMinutes, reason);
    placements.push(placement);
    occupied.push({ startMinutes: placement.startMinutes, endMinutes: placement.endMinutes });
    occupied.sort((a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes);
  });

  const placedBlocks = placements.map((placement) => ({
    ...placement.candidate.block,
    startTime: placement.startTime,
    endTime: placement.endTime,
  }));
  const openWindows = deriveScheduleOpenWindows(
    dayStartMinutes,
    dayEndMinutes,
    [...fixedBlocks, ...preservedBlocks, ...placedBlocks],
    notBeforeMinutes,
  );

  return {
    date: input.date,
    mode,
    dayStartMinutes,
    dayEndMinutes,
    notBeforeMinutes,
    fixedBlocks,
    preservedBlocks,
    placements,
    unplaced,
    openWindows,
    affectedCount: placements.filter((placement) => placement.changed).length + unplaced.length,
  };
}
