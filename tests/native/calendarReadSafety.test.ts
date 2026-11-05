import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CalendarService, type CalendarDriverEvent, type CalendarDriver } from '../../src/platform/calendar/CalendarService';
import { DeviceRepository } from '../../src/platform/deviceRepository';
import type { PermissionState } from '../../src/platform/contracts';

const start = '2026-11-05T00:00:00Z';
const end = '2026-11-06T00:00:00Z';
const event: CalendarDriverEvent = {
  id: 'isolated-event', externalEventId: 'isolated-event', calendarId: 'isolated-calendar',
  title: 'Isolated commitment', startAt: '2026-11-05T09:00:00Z', endAt: '2026-11-05T10:00:00Z',
  allDay: false, availability: 'busy', source: 'system_calendar',
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

async function fixture(connected = true) {
  const disk = new Map<string, string>();
  const repo = new DeviceRepository({ getItem: async key => disk.get(key) ?? null, setItem: async (key, value) => { disk.set(key, value); } });
  let permission: PermissionState = 'granted';
  const writes: string[] = [];
  const driver: CalendarDriver = {
    available: async () => true, permission: async () => permission,
    calendars: async () => [], read: async () => [event], open: async () => {},
    create: async () => { writes.push('create'); return 'unexpected'; },
    update: async () => { writes.push('update'); }, remove: async () => { writes.push('remove'); },
  };
  const service = new CalendarService(driver, repo, () => start);
  if (connected) await service.sync([event.calendarId], start, end);
  return { repo, driver, service, writes, permission: (value: PermissionState) => { permission = value; } };
}

function holdRead(driver: CalendarDriver) {
  const started = deferred<void>(); const response = deferred<CalendarDriverEvent[]>();
  driver.read = async () => { started.resolve(); return response.promise; };
  return { started: started.promise, finish: response.resolve, fail: response.reject };
}

test('revocation while reading cannot reconnect Calendar or return newly read events', async () => {
  const x = await fixture(); const pending = holdRead(x.driver);
  const request = x.service.sync([event.calendarId], start, end);
  const rejected = assert.rejects(request, /calendar_permission_required/);
  await pending.started; x.permission('denied'); pending.finish([event]); await rejected;
  const { calendar } = await x.repo.read();
  assert.equal(calendar.connected, false);
  assert.equal(calendar.error, 'calendar_permission_required');
  assert.deepEqual(x.writes, []);
});

test('checking revoked permission invalidates connection but retains last-read provenance and ownership', async () => {
  const x = await fixture();
  await x.repo.update(data => ({ ...data, calendar: { ...data.calendar, exportMappings: [{
    id: 'isolated-mapping', calendarId: event.calendarId, active: true,
    record: { ...event, ownership: 'questlife', lastSyncedAt: start },
  }] } }));
  const before = (await x.repo.read()).calendar;
  x.permission('denied'); assert.equal(await x.service.permission(), 'denied');
  const after = (await x.repo.read()).calendar;
  assert.equal(after.connected, false);
  assert.deepEqual(after.events, before.events);
  assert.deepEqual(after.selectedIds, before.selectedIds);
  assert.equal(after.exportMappings?.[0].active, false);
  assert.equal(after.exportMappings?.[0].record.externalEventId, event.externalEventId);
  assert.equal(after.connectionRevision, (before.connectionRevision ?? 0) + 1);
  await x.service.permission();
  assert.deepEqual((await x.repo.read()).calendar, after, 'Repeated denial is idempotent.');
  assert.deepEqual(x.writes, []);
});

test('explicit disconnect cancels in-flight reads instead of returning stale availability', async () => {
  const x = await fixture(); const pending = holdRead(x.driver);
  const request = x.service.sync([event.calendarId], start, end);
  const rejected = assert.rejects(request, /calendar_read_superseded/);
  await pending.started; await x.service.disconnect(); pending.finish([event]); await rejected;
  const { calendar } = await x.repo.read();
  assert.equal(calendar.connected, false); assert.deepEqual(calendar.events, []);
  assert.deepEqual(x.writes, []);
});

test('a newer refresh supersedes an older reply without reporting old data as success', async () => {
  const x = await fixture(); const pending = holdRead(x.driver);
  const oldRequest = x.service.sync([event.calendarId], start, end);
  const rejected = assert.rejects(oldRequest, /calendar_read_superseded/);
  await pending.started;
  const newest = { ...event, title: 'Latest isolated commitment' };
  x.driver.read = async () => [newest];
  assert.equal((await x.service.sync([event.calendarId], start, end))[0].title, newest.title);
  pending.finish([event]); await rejected;
  assert.equal((await x.repo.read()).calendar.events[0].title, newest.title);
  assert.equal((await x.repo.read()).calendar.error, undefined);
});

test('readEvents itself rechecks permission before exposing results', async () => {
  const x = await fixture(); const pending = holdRead(x.driver);
  const request = x.service.readEvents([event.calendarId], start, end);
  const rejected = assert.rejects(request, /calendar_permission_required/);
  await pending.started; x.permission('denied'); pending.finish([event]); await rejected;
});

test('a stale read failure cannot overwrite a newer successful refresh', async () => {
  const x = await fixture(); const pending = holdRead(x.driver);
  const request = x.service.sync([event.calendarId], start, end);
  const rejected = assert.rejects(request, /calendar_read_superseded/);
  await pending.started;
  x.driver.read = async () => [{ ...event, title: 'Newer result' }];
  await x.service.sync([event.calendarId], start, end);
  pending.fail(new Error('obsolete_os_failure')); await rejected;
  assert.equal((await x.repo.read()).calendar.error, undefined);
  assert.equal((await x.repo.read()).calendar.events[0].title, 'Newer result');
});

test('revocation surfaced as an OS read error still invalidates the connection', async () => {
  const x = await fixture(); const pending = holdRead(x.driver);
  const request = x.service.sync([event.calendarId], start, end);
  const rejected = assert.rejects(request, /calendar_permission_required/);
  await pending.started; x.permission('denied'); pending.fail(new Error('os_denied')); await rejected;
  assert.equal((await x.repo.read()).calendar.connected, false);
  assert.equal((await x.repo.read()).calendar.error, 'calendar_permission_required');
});

test('a valid empty Calendar remains distinct from denied access and read failure', async () => {
  const x = await fixture();
  x.driver.read = async () => []; assert.deepEqual(await x.service.sync([event.calendarId], start, end), []);
  assert.equal((await x.repo.read()).calendar.connected, true);
  assert.equal((await x.repo.read()).calendar.error, undefined);
  x.driver.read = async () => { throw new Error('isolated_read_failure'); };
  await assert.rejects(x.service.sync([event.calendarId], start, end), /isolated_read_failure/);
  assert.equal((await x.repo.read()).calendar.error, 'calendar_read_failed');
  x.permission('denied'); let reads = 0;
  x.driver.read = async () => { reads++; return []; };
  await assert.rejects(x.service.sync([event.calendarId], start, end), /calendar_permission_required/);
  assert.equal(reads, 0);
  x.permission('granted'); await x.service.sync([event.calendarId], start, end);
  assert.equal((await x.repo.read()).calendar.connected, true);
  assert.equal((await x.repo.read()).calendar.error, undefined);
});

test('denial on an explicit first connection is not labelled as an empty calendar or generic read error', async () => {
  const x = await fixture(false); x.permission('denied');
  await assert.rejects(x.service.sync([event.calendarId], start, end), /calendar_permission_required/);
  assert.equal((await x.repo.read()).calendar.error, 'calendar_permission_required');
  assert.equal((await x.repo.read()).calendar.connected, false);
});
