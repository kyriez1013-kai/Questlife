import type {ScheduleBlock} from '../../types';
import {useStore} from '../../store';
import {shortcutCalendarBlocks} from '../../v5/shortcutCalendar';
import {useMemo} from 'react';
export function useExternalCalendarBlocks(dates:string[]):ScheduleBlock[]{
  const {data}=useStore();
  const key=dates.join(',');
  return useMemo(()=>shortcutCalendarBlocks(data.contextLogs,key.split(',')),[data.contextLogs,key]);
}
