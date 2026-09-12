import {useMemo} from 'react';
import {useDeviceData} from '../useDeviceData';
import {calendarFixedBlocks} from './CalendarService';
export function useExternalCalendarBlocks(dates:string[]){
  const {data}=useDeviceData();const key=dates.join(',');
  return useMemo(()=>data.calendar.connected?key.split(',').flatMap(date=>calendarFixedBlocks(data.calendar.events,date)):[],[data.calendar,key]);
}
