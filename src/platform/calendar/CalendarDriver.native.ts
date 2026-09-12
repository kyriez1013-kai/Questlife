import * as Calendar from 'expo-calendar';
import type { CalendarDriver } from './CalendarService';
export const calendarDriver: CalendarDriver = {
  available: () => Calendar.isAvailableAsync(),
  permission: async request => {
    const state = request ? await Calendar.requestCalendarPermissionsAsync() : await Calendar.getCalendarPermissionsAsync();
    return state.granted ? 'granted' : state.status === 'undetermined' ? 'not_requested' : 'denied';
  },
  calendars: async () => (await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT)).map(c => ({ id:c.id,title:c.title,writable:c.allowsModifications,source:c.source?.name ?? 'system_calendar' })),
  read: async (ids,start,end) => (await Calendar.getEventsAsync(ids,new Date(start),new Date(end))).map(e => ({ id:`calendar:${e.calendarId}:${e.id}:${new Date(e.startDate).toISOString()}`,externalEventId:e.id,calendarId:e.calendarId,source:'system_calendar',title:e.title,startAt:new Date(e.startDate).toISOString(),endAt:new Date(e.endDate).toISOString(),allDay:e.allDay })),
  create: (id,d) => Calendar.createEventAsync(id,{title:d.title,startDate:new Date(d.startAt),endDate:new Date(d.endAt),allDay:d.allDay}),
  update: async (id,d) => { await Calendar.updateEventAsync(id,{title:d.title,startDate:new Date(d.startAt),endDate:new Date(d.endAt),allDay:d.allDay}); },
  remove: async id => { const event = await Calendar.getEventAsync(id); if (event) await Calendar.deleteEventAsync(id); },
  open: async id => { await Calendar.openEventInCalendarAsync({ id }); },
};
