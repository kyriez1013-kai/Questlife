import type { ScheduleBlock } from '../../types';
import type { DecisionPlanPatchV1 } from '../../adaptive-decision/decisionEpisode';
import { applyDecisionPlanPatch, undoDecisionPlanPatch, DecisionPlanPatchConflictError } from '../../adaptive-decision/planPatch';
import type { CalendarSource, ExternalCommitment } from '../contracts';
import type { DeviceRepository } from '../deviceRepository';
import { calendarFixedBlocks } from './CalendarService';
import { draftForBlock, sameCalendarDraft } from './durability';

export class CalendarPlanUnavailableError extends Error {
  constructor() { super('calendar_plan_check_unavailable'); this.name = 'CalendarPlanUnavailableError'; }
}
export class CalendarPlanConflictError extends DecisionPlanPatchConflictError {
  constructor() { super('calendar_plan_conflict'); this.name = 'CalendarPlanConflictError'; }
}

export function planCalendarDates(patch: DecisionPlanPatchV1): string[] {
  return [...new Set(patch.operations.flatMap(op => [op.before?.date, op.after?.date].filter((date): date is string => !!date)))].sort();
}

/** Only a temporary constraint view. External events never become AppData blocks. */
export function assertPlanCalendarAvailable(blocks: ScheduleBlock[], patch: DecisionPlanPatchV1, events: ExternalCommitment[], direction: 'apply' | 'undo' = 'apply'): void {
  const result = direction === 'apply' ? applyDecisionPlanPatch(blocks, patch) : undoDecisionPlanPatch(blocks, patch);
  const touched = new Set(patch.operations.map(op => op.blockId));
  for (const block of result.filter(row => touched.has(row.id) && row.status !== 'skipped')) {
    const prior = blocks.find(row => row.id === block.id);
    const occupied = events.filter(event => !(prior && event.ownership === 'questlife'
      && event.linkedScheduleBlockId === block.id && sameCalendarDraft(event, draftForBlock(prior))));
    const readMinutes = (clock: string) => { const [h, m] = clock.split(':').map(Number); return h * 60 + m; };
    const start = readMinutes(block.startTime); const end = readMinutes(block.endTime);
    if (calendarFixedBlocks(occupied, block.date).some(row => start < readMinutes(row.endTime) && readMinutes(row.startTime) < end)) throw new CalendarPlanConflictError();
  }
}

export async function readCalendarOccupancy(
  dates: string[], repo: Pick<DeviceRepository, 'read'>,
  source: Pick<CalendarSource, 'isAvailable' | 'permission' | 'readEvents'>,
): Promise<ExternalCommitment[]> {
  if (!dates.length) return [];
  try {
    const { calendar } = await repo.read();
    if (calendar.error === 'calendar_permission_required') throw new CalendarPlanUnavailableError();
    if (!calendar.connected) return []; // No enabled Calendar source; internal checks still apply.
    if (!calendar.selectedIds.length || !await source.isAvailable() || await source.permission() !== 'granted') throw new CalendarPlanUnavailableError();
    const sorted = [...new Set(dates)].sort();
    const start = new Date(`${sorted[0]}T00:00:00`);
    const end = new Date(`${sorted.at(-1)}T00:00:00`); end.setDate(end.getDate() + 1);
    if (sorted.some(date => {
      const day = new Date(`${date}T12:00:00`);
      return !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(day.getTime())
        || `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}` !== date;
    })) throw new CalendarPlanUnavailableError();
    const events = await source.readEvents(calendar.selectedIds, start.toISOString(), end.toISOString());
    const current = (await repo.read()).calendar;
    if (!current.connected || current.connectionRevision !== calendar.connectionRevision
      || JSON.stringify(current.selectedIds.slice().sort()) !== JSON.stringify(calendar.selectedIds.slice().sort())) throw new CalendarPlanUnavailableError();
    return events;
  } catch { throw new CalendarPlanUnavailableError(); }
}
