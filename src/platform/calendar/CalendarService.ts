import type { CalendarDraft, CalendarSource, DeviceCalendar, ExternalCommitment, PermissionState } from '../contracts';
import { DeviceRepository } from '../deviceRepository';
import type { ScheduleBlock } from '../../types';

export interface CalendarDriver {
  available(): Promise<boolean>; permission(request: boolean): Promise<PermissionState>;
  calendars(): Promise<DeviceCalendar[]>;
  read(ids: string[], start: string, end: string): Promise<Omit<ExternalCommitment, 'ownership' | 'lastSyncedAt'>[]>;
  create(calendarId: string, draft: CalendarDraft): Promise<string>;
  update(id: string, draft: CalendarDraft): Promise<void>; remove(id: string): Promise<void>; open(id: string): Promise<void>;
}
const ownedKey = (calendarId: string, id: string) => `${calendarId}:${id}`;
function validate(draft: CalendarDraft) {
  if (!draft.title.trim() || !Number.isFinite(Date.parse(draft.startAt)) || !Number.isFinite(Date.parse(draft.endAt)) || Date.parse(draft.endAt) <= Date.parse(draft.startAt)) throw new Error('calendar_invalid_event');
}
export class CalendarService implements CalendarSource {
  constructor(private driver: CalendarDriver, private repo: DeviceRepository, private now = () => new Date().toISOString()) {}
  isAvailable() { return this.driver.available(); }
  permission() { return this.driver.permission(false); }
  requestPermission() { return this.driver.permission(true); }
  private async requirePermission() { if (await this.permission() !== 'granted') throw new Error('calendar_permission_required'); }
  async listCalendars() { await this.requirePermission(); return this.driver.calendars(); }
  async readEvents(ids: string[], start: string, end: string) {
    await this.requirePermission();
    if (!Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end)) || Date.parse(end) <= Date.parse(start)) throw new Error('calendar_invalid_range');
    const { calendar } = await this.repo.read();
    const read = await this.driver.read(ids,start,end);
    const mapped = read.map(row => ({ ...row, ownership: calendar.ownedIds.includes(ownedKey(row.calendarId,row.externalEventId)) ? 'questlife' as const : 'external' as const, lastSyncedAt: this.now() }));
    return [...new Map(mapped.map(row => [row.id,row])).values()];
  }
  async sync(ids: string[], start: string, end: string) {
    const before=await this.repo.read();
    const events = await this.readEvents(ids,start,end);
    await this.repo.update(data => data.calendar.connectionRevision!==before.calendar.connectionRevision ? data : ({ ...data, calendar: { ...data.calendar, connected: true, selectedIds: ids, events, lastSyncedAt: this.now(), error: undefined } }));
    return events;
  }
  async disconnect() {
    await this.repo.update(data=>({...data,calendar:{...data.calendar,connectionRevision:(data.calendar.connectionRevision??0)+1,connected:false,events:[]}}));
  }
  private async writable(calendarId: string) {
    if (!(await this.listCalendars()).some(row => row.id === calendarId && row.writable)) throw new Error('calendar_not_writable');
  }
  async create(calendarId: string, draft: CalendarDraft, consent: { confirmed: true }) {
    if (consent?.confirmed !== true) throw new Error('calendar_confirmation_required');
    validate(draft); await this.writable(calendarId);
    const externalEventId = await this.driver.create(calendarId,draft);
    const result: ExternalCommitment = { ...draft, allDay: !!draft.allDay, id: `calendar:${calendarId}:${externalEventId}`, calendarId, externalEventId, source: 'system_calendar', ownership: 'questlife', lastSyncedAt: this.now() };
    try { await this.repo.update(data => ({ ...data, calendar: { ...data.calendar, ownedIds: [...new Set([...data.calendar.ownedIds,ownedKey(calendarId,externalEventId)])], events: [...data.calendar.events,result] } })); }
    catch { await this.driver.remove(externalEventId); throw new Error('calendar_local_commit_failed'); }
    return result;
  }
  private async own(record: ExternalCommitment, consent: { confirmed: true }) {
    if (consent?.confirmed !== true) throw new Error('calendar_confirmation_required');
    const { calendar } = await this.repo.read();
    if (!calendar.ownedIds.includes(ownedKey(record.calendarId, record.externalEventId))) throw new Error('calendar_external_event_read_only');
    await this.writable(record.calendarId);
  }
  async update(record: ExternalCommitment, draft: CalendarDraft, consent: { confirmed: true }) {
    validate(draft); await this.own(record,consent);
    await this.driver.update(record.externalEventId,draft);
    const result = { ...record, ...draft, allDay: draft.allDay ?? record.allDay, lastSyncedAt: this.now() };
    await this.repo.update(data => ({ ...data, calendar: { ...data.calendar, events: data.calendar.events.map(row => row.id === record.id ? result : row) } }));
    return result;
  }
  async delete(record: ExternalCommitment, consent: { confirmed: true }) {
    await this.own(record,consent);
    await this.driver.remove(record.externalEventId);
    await this.repo.update(data => ({ ...data, calendar: { ...data.calendar, ownedIds: data.calendar.ownedIds.filter(id => id !== ownedKey(record.calendarId,record.externalEventId)), events: data.calendar.events.filter(row => row.externalEventId !== record.externalEventId || row.calendarId !== record.calendarId) } }));
  }
  async open(record: ExternalCommitment) { await this.driver.open(record.externalEventId); }
}

/** Ephemeral compiler constraints. Never persist or apply a patch to these IDs. */
export function calendarFixedBlocks(events: ExternalCommitment[], date: string): ScheduleBlock[] {
  const dayStart = new Date(`${date}T00:00:00`); const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
  const time = (d: Date) => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  return events.filter(e => Date.parse(e.startAt) < dayEnd.getTime() && Date.parse(e.endAt) > dayStart.getTime()).map(e => ({
    id: e.id, date, title: e.title, startTime: Date.parse(e.startAt) <= dayStart.getTime() ? '00:00' : time(new Date(e.startAt)), endTime: Date.parse(e.endAt) >= dayEnd.getTime() ? '24:00' : time(new Date(e.endAt)), plannedMinutes: (Math.min(Date.parse(e.endAt),dayEnd.getTime()) - Math.max(Date.parse(e.startAt),dayStart.getTime())) / 60000, taskType: 'admin', flexibility: 'fixed', rigidity: 'high', status: 'planned', placementLocked: true, createdAt: Date.parse(e.lastSyncedAt), source: 'manual',
  }));
}
