import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDecisionPlanPatch } from '../../src/adaptive-decision/planPatch';
import { assertPlanCalendarAvailable, readCalendarOccupancy, planCalendarDates, CalendarPlanUnavailableError, CalendarPlanConflictError } from '../../src/platform/calendar/planAvailability';
import { candidateHasFeasibleExactPatch } from '../../src/adaptive-decision/ownerDecisionFlow';
import { CalendarService, type CalendarDriver } from '../../src/platform/calendar/CalendarService';
import { DeviceRepository } from '../../src/platform/deviceRepository';
import type { ExternalCommitment, PermissionState } from '../../src/platform/contracts';
import type { ScheduleBlock } from '../../src/types';

const date = '2099-11-05';
const block: ScheduleBlock = { id: 'ISOLATED_BLOCK', title: 'Isolated schedule', date, startTime: '09:00', endTime: '10:00', plannedMinutes: 60, status: 'planned', flexibility: 'movable', rigidity: 'medium', taskType: 'deep_study', source: 'manual', createdAt: 1 };
const busy = (start = '11:00', end = '12:00'): ExternalCommitment => ({
  id: 'ISOLATED_EVENT', externalEventId: 'ISOLATED_EVENT', calendarId: 'ISOLATED_CALENDAR', title: 'Isolated external event',
  startAt: new Date(`${date}T${start}:00`).toISOString(), endAt: new Date(`${date}T${end}:00`).toISOString(),
  availability: 'busy', ownership: 'external', allDay: false, source: 'system_calendar', lastSyncedAt: new Date(`${date}T00:00:00`).toISOString(),
});
const patchFor = (after: ScheduleBlock) => createDecisionPlanPatch({ id: 'ISOLATED_PATCH', date, generatedAt: busy().lastSyncedAt, before: [block], after: [after] });

for (const kind of ['move', 'shorten', 'protect'] as const) test(`${kind} and Undo both check the external Calendar view without changing events`, () => {
  const after = kind === 'move' ? { ...block, startTime: '11:00', endTime: '12:00' }
    : kind === 'shorten' ? { ...block, endTime: '09:30', plannedMinutes: 30 } : { ...block, placementLocked: true };
  const patch = patchFor(after); const events = [kind === 'move' ? busy() : busy('09:00', '09:20')];
  const snapshot = JSON.stringify(events);
  assert.throws(() => assertPlanCalendarAvailable([block], patch, events), CalendarPlanConflictError);
  assert.throws(() => assertPlanCalendarAvailable([after], patch, [busy('09:00', '10:00')], 'undo'), CalendarPlanConflictError);
  assert.equal(JSON.stringify(events), snapshot);
  assert.doesNotThrow(() => assertPlanCalendarAvailable([block], patch, []));
  assert.doesNotThrow(() => assertPlanCalendarAvailable([after], patch, [], 'undo'));
});

test('candidate preview uses the same external conflict check as Apply', () => {
  const patch = patchFor({ ...block, startTime: '11:00', endTime: '12:00' });
  const candidate = { planPatch: patch } as Parameters<typeof candidateHasFeasibleExactPatch>[0];
  assert.equal(candidateHasFeasibleExactPatch(candidate, [block], [busy()]), false);
  assert.equal(candidateHasFeasibleExactPatch(candidate, [block], []), true);
});

test('free events and touching endpoints do not block; unknown availability does', () => {
  const patch = patchFor({ ...block, startTime: '11:00', endTime: '12:00' });
  assert.doesNotThrow(() => assertPlanCalendarAvailable([block], patch, [{ ...busy(), availability: 'free' }, busy('10:00', '11:00'), busy('12:00', '13:00')]));
  assert.throws(() => assertPlanCalendarAvailable([block], patch, [{ ...busy(), availability: 'unknown' }]), CalendarPlanConflictError);
});

test('a matching owned export is not a self-conflict, but an externally edited copy remains an obstacle', () => {
  const patch = patchFor({ ...block, endTime: '09:30', plannedMinutes: 30 });
  const owned = { ...busy('09:00', '10:00'), title: block.title, ownership: 'questlife' as const, linkedScheduleBlockId: block.id };
  assert.doesNotThrow(() => assertPlanCalendarAvailable([block], patch, [owned]));
  assert.throws(() => assertPlanCalendarAvailable([block], patch, [{ ...owned, title: 'Externally changed' }]), CalendarPlanConflictError);
  assert.throws(() => assertPlanCalendarAvailable([block], patch, [{ ...owned, ownership: 'external', id: block.id }]), CalendarPlanConflictError);
});

test('all-day and midnight-spanning events occupy the correct local day', () => {
  const patch = patchFor({ ...block, startTime: '11:00', endTime: '12:00' });
  assert.throws(() => assertPlanCalendarAvailable([block], patch, [{ ...busy('00:00', '24:00'), allDay: true }]), CalendarPlanConflictError);
  const previous = new Date(`${date}T00:00:00`); previous.setDate(previous.getDate() - 1);
  assert.throws(() => assertPlanCalendarAvailable([block], patch, [{ ...busy(), startAt: previous.toISOString() }]), CalendarPlanConflictError);
});

async function sourceFixture() {
  const disk = new Map<string, string>();
  const repo = new DeviceRepository({ getItem: async key => disk.get(key) ?? null, setItem: async (key, value) => { disk.set(key, value); } });
  let permission: PermissionState = 'granted'; let reads = 0; let writes = 0; let failure = false; let result: ExternalCommitment[] = [];
  const driver: CalendarDriver = {
    available: async () => true, permission: async () => permission, calendars: async () => [],
    read: async () => { reads++; if (failure) throw Error('ISOLATED_READ_FAILURE'); return result; },
    create: async () => { writes++; return 'unexpected'; }, update: async () => { writes++; }, remove: async () => { writes++; }, open: async () => {},
  };
  const service = new CalendarService(driver, repo);
  return { repo, service, driver, reads: () => reads, writes: () => writes, permission: (p: PermissionState) => { permission = p; }, result: (rows: ExternalCommitment[]) => { result = rows; }, fail: () => { failure = true; } };
}

test('an enabled but genuinely empty Calendar is readable, while denied or failed reads are unavailable', async () => {
  const x = await sourceFixture(); await x.service.sync(['ISOLATED_CALENDAR'], busy().startAt, busy().endAt);
  assert.deepEqual(await readCalendarOccupancy([date], x.repo, x.service), []);
  x.fail(); await assert.rejects(readCalendarOccupancy([date], x.repo, x.service), CalendarPlanUnavailableError);
  x.permission('denied'); await assert.rejects(readCalendarOccupancy([date], x.repo, x.service), CalendarPlanUnavailableError);
  assert.equal((await x.repo.read()).calendar.connected, false);
  await assert.rejects(readCalendarOccupancy([date], x.repo, x.service), CalendarPlanUnavailableError);
  assert.equal(x.writes(), 0);
});

test('no enabled Calendar means no OS reads, not a fabricated connected provider', async () => {
  const x = await sourceFixture();
  assert.deepEqual(await readCalendarOccupancy([date], x.repo, x.service), []);
  assert.equal(x.reads(), 0); assert.equal(x.writes(), 0);
  assert.equal((await x.repo.read()).calendar.connected, false);
});

test('the shared read is ephemeral and includes every affected local date', async () => {
  const x = await sourceFixture(); await x.service.sync(['ISOLATED_CALENDAR'], busy().startAt, busy().endAt);
  const before = await x.repo.read(); x.result([busy()]);
  const events = await readCalendarOccupancy([date], x.repo, x.service);
  assert.equal(events.length, 1); assert.deepEqual(await x.repo.read(), before); assert.equal(x.writes(), 0);
  assert.deepEqual(planCalendarDates(patchFor({ ...block, date: '2099-11-06' })), [date, '2099-11-06']);
  await assert.rejects(readCalendarOccupancy(['2099-02-30'], x.repo, x.service), CalendarPlanUnavailableError);
});
