import { calendarSource, deviceRepository } from '../services';
import { readCalendarOccupancy } from './planAvailability';

export function readPlanCalendar(dates: string[]) { return readCalendarOccupancy(dates, deviceRepository, calendarSource); }
