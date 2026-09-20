import type { CalendarDraft, CalendarSource, DeviceCalendar, ExternalCommitment, PermissionState } from '../contracts';
import { DeviceRepository } from '../deviceRepository';
import type { ScheduleBlock } from '../../types';
import { uniqueCommitments } from './identity';
import { CalendarOperations } from './CalendarOperations';
import { retainedMappings } from './durability';

export interface CalendarDriver {
  platform?: string;
  available(): Promise<boolean>; permission(request: boolean): Promise<PermissionState>;
  calendars(): Promise<DeviceCalendar[]>;
  read(ids: string[], start: string, end: string): Promise<Omit<ExternalCommitment, 'ownership' | 'lastSyncedAt'>[]>;
  create(calendarId: string, draft: CalendarDraft, marker?: string): Promise<string>;
  update(id: string, draft: CalendarDraft, expected?: ExternalCommitment, marker?: string): Promise<void>; remove(id: string, expected?: ExternalCommitment): Promise<void>; open(id: string): Promise<void>;
  inspect?(id: string): Promise<CalendarDriverEvent | null>;
  findByMarker?(calendarId: string, marker: string, draft: CalendarDraft): Promise<CalendarDriverEvent[]>;
  operationId?(): string;
}
export type CalendarDriverEvent = Omit<ExternalCommitment,'ownership'|'lastSyncedAt'> & { recurring?: boolean };
export class CalendarService implements CalendarSource {
  private revision = 0;
  private get operations() { return new CalendarOperations(this.driver,this.repo,this.now); }
  constructor(private driver: CalendarDriver, private repo: DeviceRepository, private now = () => new Date().toISOString()) {}
  isAvailable() { return this.driver.available(); }
  permission() { return this.operations.permission(false); }
  requestPermission() { return this.operations.permission(true); }
  private async requirePermission() { if (await this.permission() !== 'granted') throw new Error('calendar_permission_required'); }
  async listCalendars() { await this.requirePermission(); return this.driver.calendars(); }
  async readEvents(ids: string[], start: string, end: string) {
    await this.requirePermission();
    if (!Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end)) || Date.parse(end) <= Date.parse(start)) throw new Error('calendar_invalid_range');
    const { calendar } = await this.repo.read();
    const read = await this.driver.read(ids,start,end);
    if (read.some(row => !ids.includes(row.calendarId) || !row.externalEventId || !Number.isFinite(Date.parse(row.startAt)) || !Number.isFinite(Date.parse(row.endAt)) || Date.parse(row.endAt) <= Date.parse(row.startAt))) throw new Error('calendar_invalid_source_event');
    const mapped = read.map(row => {
      const prior = retainedMappings(calendar).find(mapping => !mapping.deleted && mapping.calendarId === row.calendarId && mapping.record.externalEventId === row.externalEventId);
      const owned = !!prior;
      return { ...row, linkedScheduleBlockId: owned ? prior?.linkedScheduleBlockId : undefined, availability: row.availability ?? 'unknown' as const, ownership: owned ? 'questlife' as const : 'external' as const, lastObservedAt: this.now(), lastSyncedAt: this.now() };
    });
    return uniqueCommitments(mapped);
  }
  async sync(ids: string[], start: string, end: string) {
    const revision = ++this.revision;
    const before=await this.repo.read();
    const events = await this.readEvents(ids,start,end);
    await this.repo.update(data => this.revision !== revision || data.calendar.connectionRevision!==before.calendar.connectionRevision ? data : ({ ...data, calendar: { ...data.calendar, connected: true, selectedIds: ids, events, exportMappings:retainedMappings(data.calendar).map(mapping=>({...mapping,active:!mapping.deleted && ids.includes(mapping.calendarId)})), lastSyncedAt: this.now(), error: undefined } }));
    return events;
  }
  async disconnect() {
    this.revision++;
    await this.repo.update(data=>({...data,calendar:{...data.calendar,connectionRevision:(data.calendar.connectionRevision??0)+1,connected:false,events:[],exportMappings:retainedMappings(data.calendar).map(mapping=>({...mapping,active:false}))}}));
  }
  private async writing<T>(job:()=>Promise<T>) {this.revision++;try{return await job();}finally{this.revision++;}}
  create(calendarId:string,draft:CalendarDraft,consent:{confirmed:true}) {return this.writing(()=>this.operations.create(calendarId,draft,consent));}
  createForBlock(calendarId:string,block:ScheduleBlock,consent:{confirmed:true}) {return this.writing(()=>this.operations.createForBlock(calendarId,block,consent));}
  update(record:ExternalCommitment,draft:CalendarDraft,consent:{confirmed:true}) {return this.writing(()=>this.operations.update(record,draft,consent));}
  delete(record:ExternalCommitment,consent:{confirmed:true}) {return this.writing(()=>this.operations.delete(record,consent));}
  getPendingOperations() {return this.operations.getPendingOperations();}
  getBlockExportStatus(calendarId:string,blockId:string,currentBlock:ScheduleBlock|undefined) {return this.operations.getBlockExportStatus(calendarId,blockId,currentBlock);}
  retryOperation(id:string,consent:{confirmed:true},currentBlock?:ScheduleBlock) {return this.writing(()=>this.operations.retryOperation(id,consent,currentBlock));}
  async open(record: ExternalCommitment) { await this.driver.open(record.externalEventId); }
}

/** Ephemeral compiler constraints. Never persist or apply a patch to these IDs. */
export function calendarFixedBlocks(events: ExternalCommitment[], date: string): ScheduleBlock[] {
  const dayStart = new Date(`${date}T00:00:00`); const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
  const time = (d: Date) => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  return events.filter(e => e.availability !== 'free' && Date.parse(e.endAt) > Date.parse(e.startAt) && Date.parse(e.startAt) < dayEnd.getTime() && Date.parse(e.endAt) > dayStart.getTime()).map(e => ({
    id: e.id, date, title: e.title, startTime: Date.parse(e.startAt) <= dayStart.getTime() ? '00:00' : time(new Date(e.startAt)), endTime: Date.parse(e.endAt) >= dayEnd.getTime() ? '24:00' : time(new Date(e.endAt)), plannedMinutes: (Math.min(Date.parse(e.endAt),dayEnd.getTime()) - Math.max(Date.parse(e.startAt),dayStart.getTime())) / 60000, taskType: 'admin', flexibility: 'fixed', rigidity: 'high', status: 'planned', placementLocked: true, createdAt: Date.parse(e.lastSyncedAt), source: 'manual',
  }));
}
