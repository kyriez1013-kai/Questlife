import { createHash } from 'node:crypto';
import { z } from 'zod';
import { buildStateCheckIn } from '../../src/state-layer/checkIn';
import { normalizeHealthSample } from '../../src/platform/health/normalization';
import type { StateCheckIn } from '../../src/types';
import type { PassiveSignals } from '../../src/state-layer/signals';
import type { Scale5 } from '../../src/state-layer/types';

const stamp=z.string().datetime({offset:true});
const scale=z.number().int().min(1).max(5);
const common={requestId:z.string().uuid(),at:stamp,timezoneOffset:z.number().int().min(-840).max(840)};
const sample=z.object({metric:z.enum(['sleep','steps','resting_heart_rate','hrv']),value:z.number().finite().nonnegative(),unit:z.enum(['min','s','h','count','bpm','ms']),startAt:stamp,endAt:stamp,source:z.string().trim().min(1).max(200),measurementMethod:z.enum(['sdnn','rmssd']).optional()}).strict();
export const inboxSchema=z.discriminatedUnion('kind',[
  z.object({...common,kind:z.literal('state'),energy:scale,tension:scale}).strict(),
  z.object({...common,kind:z.literal('capture'),text:z.string().min(1).max(8000).refine(v=>v.trim().length>0)}).strict(),
  z.object({...common,kind:z.literal('follow_up'),checkInId:z.string().min(1).max(512),energy:scale}).strict(),
  z.object({...common,kind:z.literal('health'),samples:z.array(sample).min(1).max(100)}).strict(),
  z.object({...common,kind:z.literal('calendar'),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),events:z.array(z.object({id:z.string().min(1).max(300),calendarId:z.string().min(1).max(200),title:z.string().max(300),startAt:stamp,endAt:stamp,allDay:z.boolean().optional()}).strict()).max(100)}).strict(),
]);
export type InboxBody=z.infer<typeof inboxSchema>;
export const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
export function inboxToken(headers:Record<string,unknown>):string|null {
  const values=Object.entries(headers).filter(([k])=>k.toLowerCase()==='authorization');
  const match=values.length===1&&typeof values[0][1]==='string'?/^Bearer (ql_[A-Za-z0-9_-]{43})$/.exec(values[0][1]):null;
  return match?match[1]:null;
}
type Change={entityType:'stateCheckIns'|'rawCaptures'|'healthObservations'|'contextLogs';entityId:string;payload:Record<string,unknown>;baseRevision?:number};
type History={payload:StateCheckIn;revision:number}[];
/** Narrow server-side normalization. Never calls a model or invents passive evidence. */
export function inboxChanges(body:InboxBody, history:History, receivedAt:string):Change[] {
  if(Date.parse(body.at)>Date.parse(receivedAt)+300000)throw new Error('future_timestamp');
  const local=new Date(Date.parse(body.at)+body.timezoneOffset*60000);const date=local.toISOString().slice(0,10);
  const id=`inbox:${body.kind}:${body.requestId}`;
  if(body.kind==='state'){
    const hour=local.getUTCHours();
    const signals:PassiveSignals={timeBlock:hour<5?'night':hour<11?'morning':hour<14?'midday':hour<18?'afternoon':hour<23?'evening':'night',missing:['sleep','resting_hr','hrv','training','schedule_load']};
    const fields=buildStateCheckIn({answers:{energy:body.energy as Scale5,tension:body.tension as Scale5},kind:'check_in',now:new Date(body.at),date,signals,allCheckIns:history.map(h=>h.payload)});
    return [{entityType:'stateCheckIns',entityId:id,payload:{...fields,id,createdAt:receivedAt,stateLayer:{...fields.stateLayer!,source:'watch_shortcut'}}}];
  }
  if(body.kind==='capture')return [{entityType:'rawCaptures',entityId:id,payload:{id,text:body.text,createdAt:body.at,parseStatus:'pending',shortcutInbox:true}}];
  if(body.kind==='follow_up'){
    const row=history.find(h=>h.payload.id===body.checkInId);
    if(!row?.payload.stateLayer?.choice)throw new Error('follow_up_not_found');
    if(Date.parse(body.at)<Date.parse(row.payload.stateLayer.choice.at))throw new Error('invalid_follow_up_time');
    return [{entityType:'stateCheckIns',entityId:row.payload.id,baseRevision:row.revision,payload:{...row.payload,stateLayer:{...row.payload.stateLayer,choice:{...row.payload.stateLayer.choice,energyFollowUp:{energy:body.energy,at:body.at}}}}}];
  }
  if(body.kind==='health'){
    const rows=new Map<string,Change>();
    for(const s of body.samples){
      // Include metric/method so different measurements at one timestamp never collide.
      const externalId=hash(JSON.stringify([s.metric,s.measurementMethod??'',new Date(s.startAt).toISOString(),new Date(s.endAt).toISOString(),s.source]));
      const row=normalizeHealthSample({...s,externalId,platform:'shortcut',availableAt:receivedAt,app:s.source,timezoneOffset:body.timezoneOffset});
      if(!row||Date.parse(row.eventEndAt)>Date.parse(receivedAt)+300000)throw new Error('invalid_health_sample');
      rows.set(row.id,{entityType:'healthObservations',entityId:row.id,payload:row as unknown as Record<string,unknown>});
    }
    return [...rows.values()];
  }
  if(body.date!==date)throw new Error('calendar_date_mismatch');
  const events=body.events.map(e=>{
    if(Date.parse(e.endAt)<=Date.parse(e.startAt))throw new Error('invalid_event_range');
    return {...e,id:`shortcut-calendar:${hash(e.calendarId+':'+e.id)}`,externalEventId:e.id,ownership:'external',availability:'busy',lastSyncedAt:receivedAt};
  });
  const cid=`inbox:calendar:${body.date}`;
  return [{entityType:'contextLogs',entityId:cid,payload:{id:cid,date:body.date,createdAt:receivedAt,type:'custom',label:'shortcut_calendar',source:'import',shortcutCalendar:{events,syncedAt:receivedAt,capturedAt:body.at,timezoneOffset:body.timezoneOffset}}}];
}
