import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import type { CalendarDriver, CalendarDriverEvent } from './CalendarService';
import type { ExternalCommitment } from '../contracts';
import {readOperationMarker,writeOperationMarker} from './durability';
function record(event:Calendar.Event):CalendarDriverEvent {
  return {id:`calendar:${event.calendarId}:${event.id}:${new Date(event.startDate).toISOString()}`,externalEventId:event.id,calendarId:event.calendarId,source:'system_calendar',platform:Platform.OS,availability:event.availability==='free'?'free':event.availability==='busy'?'busy':'unknown',title:event.title,startAt:new Date(event.startDate).toISOString(),endAt:new Date(event.endDate).toISOString(),allDay:event.allDay,operationMarker:readOperationMarker(event.notes),recurring:!!(event.recurrenceRule || event.originalId || event.isDetached)};
}
async function inspect(id:string):Promise<CalendarDriverEvent|null> {
  try {return record(await Calendar.getEventAsync(id));}
  catch(error) {
    const code=(error as {code?:string})?.code;
    if(code!=='ERR_EVENT_NOT_FOUND' && code!=='E_EVENT_NOT_FOUND')throw error;
    // Revocation/read errors never count as an exact-ID absence.
    if(!(await Calendar.getCalendarPermissionsAsync()).granted)throw new Error('calendar_permission_required');
    return null;
  }
}
async function checkedEvent(id: string, expected?: ExternalCommitment) {
  if (!expected || expected.externalEventId !== id) throw new Error('calendar_ownership_required');
  const event = await Calendar.getEventAsync(id);
  if (!event || event.calendarId !== expected.calendarId) throw new Error('calendar_source_changed');
  // The current mapping has no recurring-instance contract. Never edit a series
  // when the user confirmed one visible occurrence.
  if (event.recurrenceRule || event.originalId || event.isDetached) throw new Error('calendar_recurring_write_unsupported');
  if (new Date(event.startDate).getTime() !== Date.parse(expected.startAt) || new Date(event.endDate).getTime() !== Date.parse(expected.endAt) || event.title !== expected.title) throw new Error('calendar_source_changed');
  if (!!event.allDay!==!!expected.allDay || readOperationMarker(event.notes)!==expected.operationMarker) throw new Error('calendar_source_changed');
  return event;
}
export const calendarDriver: CalendarDriver = {
  platform: Platform.OS,
  available: () => Calendar.isAvailableAsync(),
  permission: async request => {
    const state = request ? await Calendar.requestCalendarPermissionsAsync() : await Calendar.getCalendarPermissionsAsync();
    return state.granted ? 'granted' : state.status === 'undetermined' ? 'not_requested' : 'denied';
  },
  calendars: async () => (await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT)).map(c => ({ id:c.id,title:c.title,writable:c.allowsModifications,source:c.source?.name ?? 'system_calendar' })),
  read: async (ids,start,end) => (await Calendar.getEventsAsync(ids,new Date(start),new Date(end))).map(record),
  create: (id,d,marker) => {if(!marker)throw new Error('calendar_operation_marker_required');return Calendar.createEventAsync(id,{title:d.title,startDate:new Date(d.startAt),endDate:new Date(d.endAt),allDay:d.allDay,notes:writeOperationMarker(undefined,marker)});},
  update: async (id,d,expected,marker) => { const event=await checkedEvent(id,expected); if(!marker)throw new Error('calendar_operation_marker_required');await Calendar.updateEventAsync(id,{title:d.title,startDate:new Date(d.startAt),endDate:new Date(d.endAt),allDay:d.allDay,notes:writeOperationMarker(event.notes,marker)}); },
  remove: async (id,expected) => { await checkedEvent(id,expected); await Calendar.deleteEventAsync(id); },
  open: async id => { await Calendar.openEventInCalendarAsync({ id }); },
  inspect,
  findByMarker:async(calendarId,marker,draft)=>{
    const start=new Date(Date.parse(draft.startAt)-86400000);const end=new Date(Date.parse(draft.endAt)+86400000);
    const events=await Calendar.getEventsAsync([calendarId],start,end);
    return events.filter(event=>(event.notes??'').split(/\r?\n/).includes(marker)).map(record);
  },
  operationId:()=>require('expo-crypto').randomUUID(),
};
