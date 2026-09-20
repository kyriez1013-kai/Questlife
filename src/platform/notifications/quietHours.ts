import type { NotificationRequest } from '../contracts';

export type QuietHours = { startMinute: number; endMinute: number };
export function normalizeQuietHours(value: unknown): QuietHours | null | 'invalid' {
  if (value == null) return null;
  if (typeof value!=='object') return 'invalid';
  const {startMinute,endMinute}=value as QuietHours;
  if (![startMinute,endMinute].every(n=>Number.isInteger(n) && n>=0 && n<=1439)) return 'invalid';
  return startMinute===endMinute?null:{startMinute,endMinute};
}
export function outsideQuietHours(request: NotificationRequest, value: unknown): NotificationRequest | null {
  const quiet=normalizeQuietHours(value);
  if (quiet==='invalid') return null;
  if (!quiet) return request;
  const at=new Date(request.at);
  if (!Number.isFinite(at.getTime())) return null;
  const isQuiet=(date:Date)=>{
    const minute=date.getHours()*60+date.getMinutes();
    return quiet.startMinute<quiet.endMinute
      ? minute>=quiet.startMinute && minute<quiet.endMinute
      : minute>=quiet.startMinute || minute<quiet.endMinute;
  };
  const minute=at.getHours()*60+at.getMinutes();
  if (!isQuiet(at)) return request;
  // A start reminder delivered after its block has started is misleading. Other
  // reminders can wait; repeating reminders must also change the OS daily trigger.
  if (request.kind==='accepted_block') return null;
  if (quiet.startMinute>quiet.endMinute && minute>=quiet.startMinute) at.setDate(at.getDate()+1);
  const hour=Math.floor(quiet.endMinute/60);const minutes=quiet.endMinute%60;
  at.setHours(hour,minutes,0,0);
  if (at.getTime()<=Date.parse(request.at)) {
    // Date chooses the first occurrence of a repeated DST hour. A reminder in
    // its second occurrence must wait for the next non-quiet elapsed minute.
    at.setTime(Math.floor(Date.parse(request.at)/60000)*60000);
    for(let elapsed=0;elapsed<26*60 && isQuiet(at);elapsed++) at.setTime(at.getTime()+60000);
    if (isQuiet(at)) return null;
  }
  return {...request,at:at.toISOString(),daily:request.daily?{hour,minute:minutes}:undefined};
}
