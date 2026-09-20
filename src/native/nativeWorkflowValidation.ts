import type { CalendarDraft, ExternalCommitment } from '../platform/contracts';
import type { ScheduleBlock } from '../types';

export function localDateValue(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

export function localTimeValue(value: Date) {
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}

export function validScheduleDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return Number.isFinite(date.getTime()) && localDateValue(date) === value;
}

export function scheduleMinutes(start: string, end: string) {
  const time = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!time.test(start) || (!time.test(end) && end !== '24:00')) return 0;
  const minutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
  return Math.max(0, minutes(end) - minutes(start));
}

export function scheduleConflicts(draft: Pick<ScheduleBlock, 'date' | 'startTime' | 'endTime'>, blocks: ScheduleBlock[], excludeId?: string) {
  if (!validScheduleDate(draft.date) || !scheduleMinutes(draft.startTime, draft.endTime)) return [];
  return blocks.filter(block => block.id !== excludeId && block.date === draft.date && block.status !== 'skipped'
    && block.startTime < draft.endTime && block.endTime > draft.startTime);
}

export function validCalendarDraft(draft: CalendarDraft) {
  return !!draft.title.trim() && Number.isFinite(Date.parse(draft.startAt))
    && Number.isFinite(Date.parse(draft.endAt)) && Date.parse(draft.endAt) > Date.parse(draft.startAt);
}

// This is an OS-write comparison, never an account/cloud-sync status.
export function calendarMatchesBlock(event: ExternalCommitment, block: ScheduleBlock) {
  return event.ownership === 'questlife' && event.linkedScheduleBlockId === block.id
    && event.title === block.title && !event.allDay
    && Date.parse(event.startAt) === Date.parse(`${block.date}T${block.startTime}:00`)
    && Date.parse(event.endAt) === Date.parse(`${block.date}T${block.endTime}:00`);
}
