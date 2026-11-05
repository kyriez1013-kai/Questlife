import type {ContextLog,ScheduleBlock} from '../types';
import {calendarFixedBlocks} from '../platform/calendar/CalendarService';
/** Read-only occupancy from the latest explicit sync. Never a Store schedule entity. */
export function shortcutCalendarBlocks(rows:ContextLog[]|undefined,dates:string[]):ScheduleBlock[]{
  return dates.flatMap(date=>{
    const cache=(rows??[]).filter(r=>r.date===date&&r.shortcutCalendar&&!r.dataProvenance?.deleted).sort((a,b)=>b.shortcutCalendar!.syncedAt.localeCompare(a.shortcutCalendar!.syncedAt))[0]?.shortcutCalendar;
    return cache?calendarFixedBlocks(cache.events,date):[];
  });
}
