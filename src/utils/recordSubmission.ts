import type { ScheduleBlock } from '../types';
import { buildExecutionLogProvenance } from './dataProvenance';

/** Keep controlled draft fields aligned with the immutable pending write on retry. */
export function lockRecordDraftCallbacks<T extends object>(props: T, locked: boolean): T {
  if (!locked) return props;
  return Object.fromEntries(Object.entries(props).map(([key, value]) =>
    [key, key.startsWith('on') && typeof value === 'function' ? () => undefined : value])) as T;
}

export function recordSourceBindings(type: 'skill' | 'schedule' | 'custom', skillId: string | null, blockId: string | null, blocks: ScheduleBlock[]) {
  const block = type === 'schedule' ? blocks.find(row => row.id === blockId) : undefined;
  return { block, skillId: type === 'custom' ? undefined : type === 'schedule' ? block?.linkedSkillId : skillId ?? undefined };
}

/** Planned/default minutes are not measurements. Only a finished timer can prefill. */
export function initialActualMinutes(preset?: { source?: string; minutes?: number }) {
  return preset?.source === 'timer' && Number.isFinite(preset.minutes) && preset.minutes! > 0
    ? String(preset.minutes) : '';
}

export function actualMinutesInput(value: string, schemaValue: unknown, optional: boolean) {
  const entered = value.trim() || (typeof schemaValue === 'number' || typeof schemaValue === 'string' ? String(schemaValue).trim() : '');
  if (!entered) return { valid: optional, minutes: undefined };
  const minutes = Number(entered);
  return { valid: Number.isFinite(minutes) && Number.isInteger(minutes) && minutes > 0, minutes };
}

export function timerRecordProvenance(startedAt: string, endedAt: string, recordedAt: string) {
  const start = Date.parse(startedAt), end = Date.parse(endedAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) throw new Error('invalid_timer_interval');
  return { ...buildExecutionLogProvenance({ source: 'timer', createdAt: recordedAt, hasExplicitDuration: true }),
    eventStartAt: new Date(start).toISOString(), eventEndAt: new Date(end).toISOString() };
}
