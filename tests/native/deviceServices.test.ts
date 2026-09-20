import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AppData, Skill, ScheduleBlock } from '../../src/types';
import type { HealthSource, KeyValueStorage, NotificationRequest, ExternalCommitment, CalendarDraft, QuickActionIntent } from '../../src/platform/contracts';
import { DeviceRepository, DEVICE_DATA_KEY, DEVICE_PENDING_KEY, emptyDeviceData } from '../../src/platform/deviceRepository';
import { normalizeHealthSample, mergeHealthObservations, healthContextView, type RawHealthSample } from '../../src/platform/health/normalization';
import { HealthSync } from '../../src/platform/health/HealthSync';
import { CalendarService, calendarFixedBlocks, type CalendarDriver } from '../../src/platform/calendar/CalendarService';
import { externalCommitmentIdentity } from '../../src/platform/calendar/identity';
import { createNotificationService, isNotificationKind, parseNotificationIntent, type NotificationDriver } from '../../src/platform/notifications/NotificationService';
import { notificationTargetEnabled, planLocalNotifications, syncNotificationPlan } from '../../src/platform/notifications/planner';
import { invalidateNotificationSession, NotificationSessionBoundary } from '../../src/platform/notifications/sessionBoundary';
import { deliverNotificationIntent, registerNotificationHandler } from '../../src/platform/notifications/intentBus';

const now = new Date('2026-09-20T12:00:00Z');
class MemoryStorage implements KeyValueStorage {
  values = new Map<string,string>();
  fail = false;
  async getItem(key: string) { return this.values.get(key) ?? null; }
  async setItem(key: string, value: string) { if (this.fail) throw new Error('TEST_DISK'); this.values.set(key,value); }
}
const setup = () => { const storage = new MemoryStorage(); return { storage, repo: new DeviceRepository(storage) }; };
const raw = (extra: Partial<RawHealthSample> = {}): RawHealthSample => ({ metric:'steps', value:10, unit:'count', startAt:'2026-09-20T10:00:00Z', endAt:'2026-09-20T11:00:00Z', availableAt:now.toISOString(), externalId:'TEST_SOURCE', platform:'healthkit', ...extra });
const row = (extra: Partial<RawHealthSample> = {}) => normalizeHealthSample(raw(extra))!;
const sleep = (id: string, start: string, end: string) => row({ metric:'sleep', unit:'min', value:(Date.parse(end)-Date.parse(start))/60000, externalId:id, startAt:start, endAt:end });
const app = () => ({ skills:[], scheduleBlocks:[], decisionResults:[] } as unknown as AppData);
const source = (readSince: HealthSource['readSince']): HealthSource => ({ isAvailable:async()=>true, requestPermissions:async metrics=>({state:'granted',metrics:[...metrics]}), readSince, getSyncStatus:async()=>emptyDeviceData().health });
const request: NotificationRequest = { id:'questlife:TEST', kind:'morning_state', at:'2026-09-21T08:00:00Z', title:'TEST_PRIVATE_TITLE', body:'TEST_PRIVATE_HEALTH' };
function notify() {
  const calls: string[] = [];
  const driver: NotificationDriver = { permission:async()=> 'granted', schedule:async r=>{calls.push(`schedule:${r.id}`);return r.id;}, cancel:async id=>{calls.push(`cancel:${id}`);}, subscribe:()=>()=>{}, token:async()=>null };
  return { driver, calls, service:createNotificationService(driver,()=>now.getTime()) };
}
const draft: CalendarDraft = { title:'TEST_EVENT', startAt:'2026-09-20T09:00:00Z', endAt:'2026-09-20T10:00:00Z' };
function calendar() {
  const {repo}=setup(); const calls:string[]=[];
  let event:any=null;
  const driver: CalendarDriver = {platform:'ios',available:async()=>true,permission:async()=> 'granted',calendars:async()=>[{id:'TEST_CAL',title:'TEST',writable:true,source:'test'}],read:async()=>[],
    operationId:randomUUID,inspect:async()=>event,findByMarker:async(_,marker)=>event?.operationMarker===marker?[event]:[],
    create:async(calendarId,value,marker)=>{calls.push('create');event={...value,id:'TEST_EVENT',externalEventId:'TEST_EVENT',calendarId,platform:'ios',source:'system_calendar',allDay:false,operationMarker:marker};return 'TEST_EVENT';},
    update:async(_,value,expected,marker)=>{calls.push('update');event={...event,...value,operationMarker:marker};},remove:async()=>{calls.push('remove');event=null;},open:async()=>{}};
  return {repo,driver,calls,service:new CalendarService(driver,repo,()=>now.toISOString())};
}
function loadMocked<T>(path: string, mocks: Record<string,unknown>): T {
  const Module = require('node:module'); const original = Module._load;
  Module._load = function(id:string,...args:unknown[]) { return Object.hasOwn(mocks,id) ? mocks[id] : original.call(this,id,...args); };
  try { delete require.cache[require.resolve(path)]; return require(path) as T; }
  finally { Module._load=original; }
}

test('overlapping generic sleep, stages and sources produce one derived interval with lineage',()=>{
  const rows=[sleep('whole','2026-09-19T22:00:00Z','2026-09-20T06:00:00Z'),sleep('deep','2026-09-20T00:00:00Z','2026-09-20T02:00:00Z'),sleep('other','2026-09-20T01:00:00Z','2026-09-20T07:00:00Z')];
  const snapshot=JSON.stringify(rows); const view=healthContextView(rows);
  assert.equal(view.length,1);assert.equal(view[0].value,540);assert.equal(view[0].dataProvenance?.origin,'DERIVED');
  assert.deepEqual(view[0].dataProvenance?.sourceIds,rows.map(r=>r.id));assert.equal(JSON.stringify(rows),snapshot);
});
test('sleep gaps remain gaps and duplicates never double duration',()=>{
  const a=sleep('a','2026-09-19T22:00:00Z','2026-09-20T00:00:00Z');
  const b=sleep('b','2026-09-20T01:00:00Z','2026-09-20T03:00:00Z');
  const view=healthContextView([a,b,a]);assert.equal(view.length,2);assert.equal(view.reduce((n,r)=>n+Number(r.value),0),240);
});
test('event offset controls calendar date, not UTC date or current phone zone',()=>{
  const r=row({startAt:'2026-09-19T23:30:00Z',endAt:'2026-09-20T00:00:00Z',timezoneOffset:120});
  assert.equal(healthContextView([r])[0].date,'2026-09-20');
  assert.equal(r.provenance.timezone,undefined);
});
test('invalid offsets and empty sleep intervals fail closed',()=>{
  assert.equal(normalizeHealthSample(raw({timezoneOffset:NaN})),null);
  assert.equal(normalizeHealthSample(raw({metric:'sleep',unit:'min',endAt:raw().startAt})),null);
});
test('same external ID can retain both SDNN and RMSSD without collision',()=>{
  const a=row({metric:'hrv',unit:'ms',measurementMethod:'sdnn'}),b=row({metric:'hrv',unit:'ms',measurementMethod:'rmssd'});
  assert.notEqual(a.id,b.id); const merged=mergeHealthObservations([a],[b]);assert.equal(merged.length,2);
  assert.deepEqual(new Set(healthContextView(merged).map(r=>r.label)),new Set(['hrv_sdnn','hrv_rmssd']));
});
test('legacy HRV identity is retained on reread instead of adding another sample',()=>{
  const a=row({metric:'hrv',unit:'ms',measurementMethod:'sdnn'}); const legacy={...a,id:a.id.replace(/:sdnn$/,'')};
  const merged=mergeHealthObservations([legacy],[a]);assert.equal(merged.length,1);assert.equal(merged[0].id,legacy.id);
  const corrected=mergeHealthObservations([legacy],[{...a,value:20}])[0];assert.ok(corrected.provenance.sourceIds?.includes(legacy.id));
});
test('corrections retain first import time and stale rereads cannot reverse them',()=>{
  const first=row();const corrected=row({value:20,availableAt:'2026-09-21T12:00:00Z'});
  const merged=mergeHealthObservations([first],[corrected]);assert.equal(merged[0].importedAt,first.importedAt);assert.equal(merged[0].availableAt,corrected.availableAt);
  assert.equal(mergeHealthObservations(merged,[first])[0].value,20);
});
test('timezone metadata correction is not silently discarded as unchanged',()=>{
  const first=row(); const corrected=row({timezoneOffset:480,availableAt:'2026-09-21T12:00:00Z'});
  assert.equal(mergeHealthObservations([first],[corrected])[0].timezoneOffset,480);
});
test('incomplete metric rows do not replace previous data or advance its checkpoint',async()=>{
  const {repo}=setup(); await repo.update(d=>({...d,observations:[row()]}));
  const sync=new HealthSync(source(async()=>({observations:[row({value:99})],completedMetrics:[],limitations:['PAGE_FAILED']})),repo,()=>now);
  await sync.connect(['steps']);await sync.sync();const d=await repo.read();assert.equal(d.observations[0].value,10);assert.equal(d.health.metricCheckpoints?.steps,undefined);
});
test('empty reads preserve records because permission loss is not a deletion feed',async()=>{
  const {repo}=setup();await repo.update(d=>({...d,observations:[row()]}));
  const sync=new HealthSync(source(async()=>({observations:[],completedMetrics:['steps'],limitations:[]})),repo,()=>now);
  await sync.connect(['steps']);await sync.sync();assert.equal((await repo.read()).observations.length,1);
});
test('foreign completed metrics cannot advance another metric checkpoint',async()=>{
  const {repo}=setup();const sync=new HealthSync(source(async()=>({observations:[row()],completedMetrics:['sleep'],limitations:[]})),repo,()=>now);
  await sync.connect(['steps']);await sync.sync();assert.deepEqual((await repo.read()).health.metricCheckpoints,{});assert.equal((await repo.read()).observations.length,0);
});
test('unrequested observation data is rejected before checkpoint commit',async()=>{
  const {repo}=setup();const sync=new HealthSync(source(async()=>({observations:[row({metric:'distance',unit:'m'})],completedMetrics:['steps'],limitations:[]})),repo,()=>now);
  await sync.connect(['steps']);await sync.sync();assert.equal((await repo.read()).observations.length,0);assert.deepEqual((await repo.read()).health.metricCheckpoints,{});
});
test('not-requested permission cannot create a connected source',async()=>{
  const {repo}=setup();let reads=0;const s=source(async()=>{reads++;return {observations:[],completedMetrics:[],limitations:[]};});s.requestPermissions=async()=>({state:'not_requested',metrics:['steps']});
  const sync=new HealthSync(s,repo,()=>now);await sync.connect(['steps']);await sync.sync();assert.equal(reads,0);assert.equal((await repo.read()).health.connected,false);
});
test('invalid and future checkpoints fall back to bounded seven-day reread',async()=>{
  for(const checkpoint of ['broken','2099-01-01T00:00:00Z']){
    const {repo}=setup();let start=''; const sync=new HealthSync(source(async s=>{start=s;return {observations:[],completedMetrics:['steps'],limitations:[]};}),repo,()=>now);
    await sync.connect(['steps']);await repo.update(d=>({...d,health:{...d.health,metricCheckpoints:{steps:checkpoint}}}));await sync.sync();assert.equal(start,'2026-09-13T12:00:00.000Z');
  }
});
test('failed storage commit leaves checkpoint retryable',async()=>{
  const {repo,storage}=setup(); const sync=new HealthSync(source(async()=>({observations:[row()],completedMetrics:['steps'],limitations:[]})),repo,()=>now);
  await sync.connect(['steps']);storage.fail=true;await assert.rejects(sync.sync());storage.fail=false;
  assert.equal((await repo.read()).health.metricCheckpoints?.steps,undefined);await sync.sync();assert.equal((await repo.read()).observations.length,1);
});

function androidSource(readRecords: (...args:any[])=>Promise<any>) {
  const mod=loadMocked<typeof import('../../src/platform/health/HealthSource.android')>('../../src/platform/health/HealthSource.android',{'react-native-health-connect':{initialize:async()=>true,getGrantedPermissions:async()=>[{recordType:'Steps',accessType:'read'},{recordType:'SleepSession',accessType:'read'}],readRecords}});
  return mod.createHealthSource(setup().repo);
}
test('Android page failure rolls back the entire metric batch',async()=>{
  let pages=0; const s=androidSource(async()=>{if(pages++)throw new Error('TEST_PAGE');return {records:[{metadata:{id:'TEST'},startTime:raw().startAt,endTime:raw().endAt,count:10}],pageToken:'next'};});
  const result=await s.readSince(raw().startAt,now.toISOString(),['steps']);assert.equal(result.observations.length,0);assert.deepEqual(result.completedMetrics,[]);
});
test('Android repeated page token terminates and cannot advance checkpoint',async()=>{
  let calls=0;const s=androidSource(async()=>{calls++;return {records:[],pageToken:'repeat'};});
  const result=await s.readSince(raw().startAt,now.toISOString(),['steps']);assert.equal(calls,2);assert.deepEqual(result.completedMetrics,[]);
});
test('Android missing source ID is an incomplete read, not silent success',async()=>{
  const s=androidSource(async()=>({records:[{count:10,startTime:raw().startAt,endTime:raw().endAt}]}));
  assert.deepEqual((await s.readSince(raw().startAt,now.toISOString(),['steps'])).completedMetrics,[]);
});
test('Android overlapping stage IDs retain longest explicit interval; awake is excluded',async()=>{
  const s=androidSource(async()=>({records:[{metadata:{id:'S'},startTime:'2026-09-19T22:00:00Z',endTime:'2026-09-20T06:00:00Z',stages:[{stage:2,startTime:'2026-09-19T22:00:00Z',endTime:'2026-09-20T02:00:00Z'},{stage:4,startTime:'2026-09-19T22:00:00Z',endTime:'2026-09-20T00:00:00Z'},{stage:1,startTime:'2026-09-20T02:00:00Z',endTime:'2026-09-20T06:00:00Z'}]}]}));
  const result=await s.readSince('2026-09-19T00:00:00Z',now.toISOString(),['sleep']);
  assert.equal(healthContextView(mergeHealthObservations([],result.observations))[0].value,240);
});
test('iOS invalid sample rejects the batch instead of skipping it and advancing',async()=>{
  const mod=loadMocked<typeof import('../../src/platform/health/HealthSource.ios')>('../../src/platform/health/HealthSource.ios',{'@kingstinct/react-native-healthkit':{queryQuantitySamples:async()=>[{uuid:'OK',startDate:new Date(raw().startAt),endDate:new Date(raw().endAt),quantity:10},{uuid:'INVALID',startDate:new Date(raw().startAt),endDate:new Date(raw().endAt),quantity:NaN}]}});
  const result=await mod.createHealthSource(setup().repo).readSince(raw().startAt,now.toISOString(),['steps']);assert.equal(result.observations.length,0);assert.deepEqual(result.completedMetrics,[]);
});

test('calendar ownership key alone is not enough to forge a local event mapping',async()=>{
  const x=calendar();const owned=await x.service.create('TEST_CAL',draft,{confirmed:true});
  await assert.rejects(x.service.update({...owned,id:'FORGED'},draft,{confirmed:true}),/read_only/);assert.deepEqual(x.calls,['create']);
});
test('stale calendar confirmation cannot delete a subsequently edited event',async()=>{
  const x=calendar();const owned=await x.service.create('TEST_CAL',draft,{confirmed:true});await x.service.update(owned,{...draft,title:'NEW'},{confirmed:true});
  await assert.rejects(x.service.delete(owned,{confirmed:true}),/stale/);assert.deepEqual(x.calls,['create','update']);
});
test('calendar source mapping stays local without fabricated provider IDs',async()=>{
  const x=calendar();const owned=await x.service.create('TEST_CAL',draft,{confirmed:true});assert.equal(owned.platform,'ios');assert.equal(owned.providerEventId,undefined);
  assert.notEqual(externalCommitmentIdentity(owned),externalCommitmentIdentity({...owned,platform:'android'}));
});
test('calendar persists intent before any OS write and recovers it after storage failure',async()=>{
  const x=calendar();const values=new Map<string,string>();let fail=true;
  const storage:KeyValueStorage={getItem:async key=>values.get(key)??null,setItem:async(key,value)=>{if(key===DEVICE_DATA_KEY && fail)throw new Error('TEST_DISK');values.set(key,value);}};
  const repo=new DeviceRepository(storage);const service=new CalendarService(x.driver,repo,()=>now.toISOString());
  await assert.rejects(service.create('TEST_CAL',draft,{confirmed:true}),/TEST_DISK/);
  assert.deepEqual(x.calls,[]);assert.ok(values.get(DEVICE_PENDING_KEY));
  fail=false;const recovered=await new DeviceRepository(storage).read();assert.equal(recovered.calendar.events.length,0);assert.equal(recovered.calendar.pendingOperations?.length,1);
  await service.retryOperation(recovered.calendar.pendingOperations![0].id,{confirmed:true});
  assert.deepEqual(x.calls,['create']);assert.equal((await repo.read()).calendar.events.length,1);
});
test('calendar recognizes a recovered successful commit without deleting its OS event',async()=>{
  const x=calendar();const values=new Map<string,string>();let fail=true;
  const storage:KeyValueStorage={getItem:async key=>values.get(key)??null,setItem:async(key,value)=>{if(key===DEVICE_DATA_KEY && fail){fail=false;throw new Error('TEST_DISK_ONCE');}values.set(key,value);}};
  const repo=new DeviceRepository(storage);const service=new CalendarService(x.driver,repo,()=>now.toISOString());
  await assert.rejects(service.create('TEST_CAL',draft,{confirmed:true}),/TEST_DISK_ONCE/);
  const pending=(await service.getPendingOperations())[0];
  const result=await service.retryOperation(pending.id,{confirmed:true});assert.equal(result?.externalEventId,'TEST_EVENT');assert.deepEqual(x.calls,['create']);assert.equal((await repo.read()).calendar.events.length,1);
});
test('calendar refuses to fabricate a missing OS event ID',async()=>{
  const x=calendar();x.driver.create=async()=>'';await assert.rejects(x.service.create('TEST_CAL',draft,{confirmed:true}),/source_id_missing/);assert.deepEqual((await x.repo.read()).calendar.events,[]);
});
test('calendar sync cannot overwrite an event created while read was pending',async()=>{
  const x=calendar();let release!:(r:[])=>void;let ready!:()=>void;const started=new Promise<void>(r=>{ready=r;});
  x.driver.read=async()=>{ready();return new Promise<[]>(r=>{release=r;});};
  const running=x.service.sync(['TEST_CAL'],draft.startAt,draft.endAt);await started;await x.service.create('TEST_CAL',draft,{confirmed:true});release([]);await running;assert.equal((await x.repo.read()).calendar.events.length,1);
});
test('calendar read started during an OS write cannot overwrite its later local commit',async()=>{
  const x=calendar();let releaseCreate!:(id:string)=>void;let releaseRead!:(r:[])=>void;let created!:()=>void;let read!:()=>void;
  const creating=new Promise<void>(r=>{created=r;});const reading=new Promise<void>(r=>{read=r;});
  const originalCreate=x.driver.create;
  x.driver.create=async(...args)=>{await originalCreate(...args);created();return new Promise<string>(r=>{releaseCreate=r;});};
  x.driver.read=async()=>{read();return new Promise<[]>(r=>{releaseRead=r;});};
  const write=x.service.create('TEST_CAL',draft,{confirmed:true});await creating;
  const sync=x.service.sync(['TEST_CAL'],draft.startAt,draft.endAt);await reading;
  releaseCreate('TEST_EVENT');await write;releaseRead([]);await sync;assert.equal((await x.repo.read()).calendar.events.length,1);
});
test('free calendar events do not block capacity; unknown remains conservative',()=>{
  const e={...draft,id:'T',calendarId:'C',externalEventId:'E',allDay:false,ownership:'external',source:'system_calendar',lastSyncedAt:now.toISOString()} as ExternalCommitment;
  const d=new Date(e.startAt);const date=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  assert.equal(calendarFixedBlocks([{...e,availability:'free'}],date).length,0);assert.equal(calendarFixedBlocks([e],date).length,1);
});
test('concurrent explicit exports reuse one source event',async()=>{
  const x=calendar();const b={id:'B',title:'TEST',date:'2026-09-20',startTime:'09:00',endTime:'10:00'} as ScheduleBlock;
  await Promise.all([x.service.createForBlock('TEST_CAL',b,{confirmed:true}),x.service.createForBlock('TEST_CAL',b,{confirmed:true})]);assert.deepEqual(x.calls,['create']);
});
test('native calendar refuses changed source calendar and recurring-series mutations',async()=>{
  let event:any={calendarId:'OTHER',startDate:draft.startAt,endDate:draft.endAt,title:draft.title};let writes=0;
  const {calendarDriver}=loadMocked<typeof import('../../src/platform/calendar/CalendarDriver.native')>('../../src/platform/calendar/CalendarDriver.native',{'react-native':{Platform:{OS:'ios'}},'expo-calendar':{getEventAsync:async()=>event,updateEventAsync:async()=>{writes++;}}});
  const expected={...draft,calendarId:'TEST_CAL',externalEventId:'E'} as ExternalCommitment;
  await assert.rejects(calendarDriver.update('E',draft,expected),/source_changed/);event={...event,calendarId:'TEST_CAL',recurrenceRule:{frequency:'daily'}};
  await assert.rejects(calendarDriver.update('E',draft,expected),/recurring/);assert.equal(writes,0);
});

test('deleted or disabled targets cannot retain snoozes or accept stale actions',()=>{
  const d=emptyDeviceData();d.notificationsEnabled=true;d.reminderKinds={accepted_block:true};d.snoozedNotifications=[{...request,kind:'accepted_block',entityId:'DELETED'}];
  assert.deepEqual(planLocalNotifications(app(),d,now,'en'),[]);assert.equal(notificationTargetEnabled(app(),d,{kind:'accepted_block',entityId:'DELETED'}),false);
});
test('shortcut intents remain separate from reminder kinds and OS notification payloads',()=>{
  for(const kind of ['quick_capture','current_plan'] as const){
    assert.equal(isNotificationKind(kind),false);
    assert.equal(parseNotificationIntent({source:'questlife',kind},'OPEN','questlife:shortcut'),null);
    const shortcut:QuickActionIntent={kind,action:'OPEN',notificationId:'questlife:shortcut'};
    assert.equal(notificationTargetEnabled(app(),{...emptyDeviceData(),notificationsEnabled:true},shortcut),false);
  }
});
test('invalid daily time cannot crash planning, disabled skill category suppresses reminders',()=>{
  const data=app();data.skills=[{id:'S',reminderEnabled:true,reminderHour:NaN,reminderMinute:0} as Skill];const d=emptyDeviceData();d.notificationsEnabled=true;
  assert.deepEqual(planLocalNotifications(data,d,now,'en'),[]);data.skills[0].reminderHour=9;d.reminderKinds={skill_reminder:false};assert.deepEqual(planLocalNotifications(data,d,now,'en'),[]);
});
test('notification ID is persisted before scheduling and remains retryable on failure',async()=>{
  const {repo}=setup();const x=notify();x.driver.schedule=async()=>{assert.deepEqual((await repo.read()).scheduledNotificationIds,[request.id]);throw new Error('TEST_OS');};
  await assert.rejects(syncNotificationPlan(repo,x.service,[request],()=>true,()=>now.getTime()));assert.deepEqual((await repo.read()).scheduledNotificationIds,[request.id]);
});
test('session invalidation during OS scheduling cancels the late notification',async()=>{
  const {repo}=setup();const x=notify();let current=true;x.driver.schedule=async r=>{current=false;return r.id;};
  await syncNotificationPlan(repo,x.service,[request],()=>current,()=>now.getTime());assert.deepEqual((await repo.read()).scheduledNotificationIds,[]);assert.equal(x.calls.at(-1),`cancel:${request.id}`);
});
test('stale queued plans never touch the OS',async()=>{
  const {repo}=setup();const x=notify();await syncNotificationPlan(repo,x.service,[request],()=>false);assert.deepEqual(x.calls,[]);
});
test('session observer invalidates signout and account switches but not token refresh',()=>{
  const boundary=new NotificationSessionBoundary();assert.equal(boundary.ready,false);assert.equal(boundary.observe('A'),false);assert.equal(boundary.observe('A'),false);assert.equal(boundary.generation,0);
  assert.equal(boundary.observe(null),true);assert.equal(boundary.observe('B'),true);assert.equal(boundary.generation,2);
});
test('existing persisted owner seeds cold-start signout reconciliation',()=>{
  const boundary=new NotificationSessionBoundary();boundary.observe('TEST_PERSISTED_OWNER');assert.equal(boundary.observe(null),true);assert.equal(boundary.generation,1);
});
test('signout disables reminders, clears snoozes and queued intents, cancels persisted IDs',async()=>{
  const {repo}=setup();const x=notify();await repo.update(d=>({...d,notificationsEnabled:true,scheduledNotificationIds:[request.id],snoozedNotifications:[request]}));
  deliverNotificationIntent({action:'OPEN',kind:'morning_state',notificationId:request.id});let cleared=false;await invalidateNotificationSession(repo,x.service,async()=>{cleared=true;});
  let delivered=false;const stop=registerNotificationHandler(()=>{delivered=true;});stop();const d=await repo.read();assert.equal(d.notificationsEnabled,false);assert.deepEqual(d.snoozedNotifications,[]);assert.deepEqual(d.scheduledNotificationIds,[]);assert.equal(delivered,false);assert.equal(cleared,true);
});
test('signout cancellation failure keeps IDs but disables delivery for retry',async()=>{
  const {repo}=setup();const x=notify();await repo.update(d=>({...d,notificationsEnabled:true,scheduledNotificationIds:[request.id]}));x.driver.cancel=async()=>{throw new Error('TEST_OS');};
  await assert.rejects(invalidateNotificationSession(repo,x.service,async()=>{}));const d=await repo.read();assert.equal(d.notificationsEnabled,false);assert.deepEqual(d.scheduledNotificationIds,[request.id]);
});

function nativeNotifications(extra:Record<string,unknown>={}) {
  const scheduled:any[]=[];const cancelled:string[]=[];const dismissed:string[]=[];
  const api={setNotificationHandler:()=>{},SchedulableTriggerInputTypes:{DAILY:'daily',DATE:'date'},scheduleNotificationAsync:async(r:unknown)=>{scheduled.push(r);return request.id;},cancelScheduledNotificationAsync:async(id:string)=>{cancelled.push(id);},dismissNotificationAsync:async(id:string)=>{dismissed.push(id);},getAllScheduledNotificationsAsync:async()=>[],getLastNotificationResponseAsync:async()=>null,getPresentedNotificationsAsync:async()=>[],clearLastNotificationResponseAsync:async()=>{},...extra};
  const mod=loadMocked<typeof import('../../src/platform/notifications/NotificationDriver.native')>('../../src/platform/notifications/NotificationDriver.native',{'react-native':{Platform:{OS:'ios'}},'expo-notifications':api});
  return {...mod,scheduled,cancelled,dismissed};
}
test('native notification content never forwards private title or body',async()=>{
  const x=nativeNotifications();await x.createNotificationDriver('en').schedule(request);const content=x.scheduled[0].content;
  assert.equal(content.title,'QuestLife');assert.notEqual(content.body,request.body);assert.equal(JSON.stringify(content).includes('TEST_PRIVATE'),false);assert.deepEqual(Object.keys(content.data).sort(),['entityId','kind','source']);
});
test('OS reconciliation cancels orphan owned reminders only',async()=>{
  const x=nativeNotifications({getAllScheduledNotificationsAsync:async()=>[{identifier:'questlife:orphan'},{identifier:'questlife:keep'},{identifier:'foreign'}]});await x.reconcileOwnedNotifications(['questlife:keep']);assert.deepEqual(x.cancelled,['questlife:orphan']);
});
test('late cold-start response cannot deliver after unsubscribe',async()=>{
  let resolve!:(r:unknown)=>void;const pending=new Promise(r=>{resolve=r;});
  const x=nativeNotifications({getLastNotificationResponseAsync:()=>pending,addNotificationResponseReceivedListener:()=>({remove:()=>{}}),DEFAULT_ACTION_IDENTIFIER:'default'});
  let deliveries=0;const stop=x.createNotificationDriver('en').subscribe(()=>{deliveries++;});stop();resolve({notification:{request:{identifier:request.id,content:{data:{source:'questlife',kind:'morning_state'}}},date:1},actionIdentifier:'default'});await pending;await Promise.resolve();assert.equal(deliveries,0);
});
test('native duplicate response is not replayed when the subscription is recreated',async()=>{
  const response={notification:{request:{identifier:request.id,content:{data:{source:'questlife',kind:'morning_state'}}},date:1},actionIdentifier:'default'};
  const x=nativeNotifications({getLastNotificationResponseAsync:async()=>response,addNotificationResponseReceivedListener:()=>({remove:()=>{}}),DEFAULT_ACTION_IDENTIFIER:'default'});
  let deliveries=0;const driver=x.createNotificationDriver('en');const stop=driver.subscribe(()=>{deliveries++;});await Promise.resolve();stop();const stopAgain=driver.subscribe(()=>{deliveries++;});await Promise.resolve();stopAgain();assert.equal(deliveries,1);
});
