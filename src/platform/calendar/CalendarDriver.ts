import type { CalendarDriver } from './CalendarService';
const unavailable = async (): Promise<never> => { throw new Error('calendar_native_required'); };
export const calendarDriver: CalendarDriver = { available: async()=>false, permission: async()=>'unavailable', calendars:unavailable, read:unavailable, create:unavailable, update:unavailable, remove:unavailable, open:unavailable };
