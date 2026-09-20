import type {ScheduleBlock} from '../../types';
import type {CalendarDraft,CalendarExportMapping,ExternalCommitment} from '../contracts';
import type {DeviceData} from '../deviceRepository';

const markerPattern=/^\[questlife-calendar-op:v1:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\]$/;
export const validOperationMarker=(marker:string)=>markerPattern.test(marker);
export function operationMarker(id:string) {
  const marker=`[questlife-calendar-op:v1:${id}]`;
  if(!validOperationMarker(marker))throw new Error('calendar_operation_id_invalid');
  return marker;
}
export function readOperationMarker(notes:string|undefined):string|undefined {
  const markers=(notes??'').split(/\r?\n/).filter(line=>validOperationMarker(line));
  if(markers.length>1)throw new Error('calendar_operation_marker_ambiguous');
  return markers[0];
}
export function writeOperationMarker(notes:string|undefined,marker:string) {
  if(!validOperationMarker(marker))throw new Error('calendar_operation_id_invalid');
  readOperationMarker(notes);
  return [...(notes??'').split(/\r?\n/).filter(line=>!validOperationMarker(line)),marker].filter(Boolean).join('\n');
}
export const ownedCalendarKey=(calendarId:string,eventId:string)=>`${calendarId}:${eventId}`;
export function draftForBlock(block:ScheduleBlock):CalendarDraft {
  return {title:block.title,startAt:new Date(`${block.date}T${block.startTime}:00`).toISOString(),endAt:new Date(`${block.date}T${block.endTime}:00`).toISOString(),allDay:false,linkedScheduleBlockId:block.id};
}
export function blockFingerprint(block:ScheduleBlock) {
  return JSON.stringify([block.id,block.title,block.date,block.startTime,block.endTime,block.status]);
}
export function sameCalendarDraft(a:CalendarDraft,b:CalendarDraft) {
  return a.title===b.title && Date.parse(a.startAt)===Date.parse(b.startAt) && Date.parse(a.endAt)===Date.parse(b.endAt) && !!a.allDay===!!b.allDay;
}
export function sameCalendarRecord(a:ExternalCommitment,b:ExternalCommitment) {
  return a.externalEventId===b.externalEventId && a.calendarId===b.calendarId && sameCalendarDraft(a,b) && a.operationMarker===b.operationMarker;
}
/** Promote only existing exact local ownership, never a title or a discovered marker. */
export function retainedMappings(calendar:DeviceData['calendar']):CalendarExportMapping[] {
  const mappings=[...(calendar.exportMappings??[])];
  for(const record of calendar.events) {
    if(record.ownership!=='questlife' || !calendar.ownedIds.includes(ownedCalendarKey(record.calendarId,record.externalEventId)))continue;
    if(mappings.some(mapping=>mapping.calendarId===record.calendarId && mapping.record.externalEventId===record.externalEventId))continue;
    mappings.push({id:`legacy:${JSON.stringify([record.calendarId,record.externalEventId])}`,calendarId:record.calendarId,linkedScheduleBlockId:record.linkedScheduleBlockId,record,active:calendar.connected});
  }
  return mappings;
}
