import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {HealthChangeCursor,HealthMetric,HealthObservationV1,HealthReadResult,HealthSource,HealthSourceChange,KeyValueStorage} from '../../src/platform/contracts';
import {DeviceRepository,DEVICE_DATA_KEY,DEVICE_PENDING_KEY,emptyDeviceData} from '../../src/platform/deviceRepository';
import {HealthSync} from '../../src/platform/health/HealthSync';
import {applyHealthChanges,belongsToHealthSource} from '../../src/platform/health/changes';
import {normalizeHealthSample,type RawHealthSample} from '../../src/platform/health/normalization';

const now=new Date('2026-09-20T12:00:00Z');const since='2026-09-13T12:00:00.000Z';
const cursor=(token:string):HealthChangeCursor=>({sourcePlatform:'health_connect',token,since});
const row=(extra:Partial<RawHealthSample>={}):HealthObservationV1=>normalizeHealthSample({metric:'steps',value:10,unit:'count',startAt:'2026-09-20T10:00:00Z',endAt:'2026-09-20T11:00:00Z',availableAt:now.toISOString(),platform:'health_connect',externalId:'TEST_PARENT',sourceRecordId:'TEST_PARENT',...extra})!;
const upsert=(r:HealthObservationV1):HealthSourceChange=>({kind:'upsert',metric:r.metric,sourcePlatform:r.sourcePlatform,sourceRecordId:r.sourceRecordId??r.externalId,sourceModifiedAt:r.sourceModifiedAt,observations:[r]});
const deletion=(r:HealthObservationV1):HealthSourceChange=>({kind:'delete',metric:r.metric,sourcePlatform:r.sourcePlatform,sourceRecordId:r.sourceRecordId??r.externalId});
const page=(changes:HealthSourceChange[],token:string,more=false):HealthReadResult=>({observations:changes.flatMap(r=>r.kind==='upsert'?r.observations:[]),changes,completedMetrics:['steps'],limitations:[],nextCursor:cursor(token),hasMoreChanges:more});
class MemoryStorage implements KeyValueStorage {
  values=new Map<string,string>();writes:{key:string;value:string}[]=[];crashAt=Infinity;
  async getItem(key:string){return this.values.get(key)??null;}
  async setItem(key:string,value:string){if(this.writes.length>=this.crashAt)throw new Error('TEST_POWER_LOSS');this.writes.push({key,value});this.values.set(key,value);}
}
const setup=()=>{const storage=new MemoryStorage();return {storage,repo:new DeviceRepository(storage)};};
async function connected(repo:DeviceRepository,observations:HealthObservationV1[]=[],changeCursor:HealthChangeCursor|null=cursor('old'),metric:HealthMetric='steps'){
  await repo.update(d=>({...d,observations,health:{...d.health,connected:true,permission:'granted',enabledMetrics:[metric],changeCursors:changeCursor?{[metric]:changeCursor}:{}}}));
}
const source=(read:NonNullable<HealthSource['readChanges']>):HealthSource=>({platform:'health_connect',isAvailable:async()=>true,requestPermissions:async metrics=>({state:'granted',metrics:[...metrics]}),getSyncStatus:async()=>emptyDeviceData().health,readSince:async()=>({observations:[],completedMetrics:['steps'],limitations:[]}),readChanges:read});
function mockModule<T>(path:string,mocks:Record<string,unknown>):T {
  const Module=require('node:module');const original=Module._load;
  Module._load=function(id:string,...args:unknown[]){return Object.hasOwn(mocks,id)?mocks[id]:original.call(this,id,...args);};
  try {delete require.cache[require.resolve(path)];return require(path) as T;}finally{Module._load=original;}
}

test('explicit provider deletion removes only matching platform/metric/parent and records durable deletion',()=>{
  const target=row();const other=row({platform:'healthkit'});const different=row({metric:'distance',unit:'m'});
  const result=applyHealthChanges([target,other,different],[],[deletion(target)],now.toISOString());
  assert.equal(result.observations.length,2);assert.equal(result.healthDeletions.length,1);assert.equal(result.healthDeletions[0].observationId,target.id);assert.equal(result.healthDeletions[0].reason,'source_delete');
});
test('explicit source update replaces removed child samples without deleting another parent',()=>{
  const a=row({metric:'heart_rate',unit:'bpm',externalId:'P:2026-09-20T10:00:00Z',sourceRecordId:'P'});
  const b=row({metric:'heart_rate',unit:'bpm',externalId:'P:2026-09-20T10:01:00Z',sourceRecordId:'P'});
  const other=row({metric:'heart_rate',unit:'bpm',externalId:'OTHER:2026-09-20T10:00:00Z',sourceRecordId:'OTHER'});
  const result=applyHealthChanges([a,b,other],[],[upsert({...a,value:70})],now.toISOString());
  assert.equal(result.observations.length,2);assert.equal(result.healthDeletions[0].observationId,b.id);assert.equal(result.healthDeletions[0].reason,'source_update');assert.equal(result.observations.find(r=>r.id===a.id)?.value,70);
});
test('legacy child matching uses exact parent and ISO suffix, not a broad prefix',()=>{
  const child=row({metric:'sleep',unit:'min',externalId:'P:2026-09-20T10:00:00Z',sourceRecordId:undefined});
  const ref={sourcePlatform:'health_connect' as const,metric:'sleep' as const,sourceRecordId:'P'};
  assert.equal(belongsToHealthSource(child,ref),true);assert.equal(belongsToHealthSource({...child,externalId:'P:another-record'},ref),false);assert.equal(belongsToHealthSource({...child,externalId:'P2:2026-09-20T10:00:00Z'},ref),false);
});
test('older provider modification cannot replace a newer complete parent',()=>{
  const latest=row({sourceModifiedAt:'2026-09-20T11:00:00Z',value:20});
  const old=row({sourceModifiedAt:'2026-09-20T10:00:00Z',value:10});
  assert.equal(applyHealthChanges([latest],[],[upsert(old)],now.toISOString()).observations[0].value,20);
});
test('replayed explicit deletion remains idempotent',()=>{
  const original=row();const first=applyHealthChanges([original],[],[deletion(original)],now.toISOString());const again=applyHealthChanges(first.observations,first.healthDeletions,[deletion(original)],now.toISOString());
  assert.deepEqual(again,first);
});
test('complete empty change page preserves observations and advances only its cursor',async()=>{
  const {repo}=setup();await connected(repo,[row()]);await new HealthSync(source(async()=>page([],'next')),repo,()=>now).sync();
  const d=await repo.read();assert.equal(d.observations.length,1);assert.equal(d.health.changeCursors?.steps?.token,'next');assert.deepEqual(d.healthDeletions,[]);
});
test('explicit deletion and cursor survive repository restart together',async()=>{
  const {repo,storage}=setup();const original=row();await connected(repo,[original]);await new HealthSync(source(async()=>page([deletion(original)],'next')),repo,()=>now).sync();
  const d=await new DeviceRepository(storage).read();assert.equal(d.observations.length,0);assert.equal(d.health.changeCursors?.steps?.token,'next');assert.equal(d.healthDeletions?.[0].observationId,original.id);
});
test('revoked/failed read cannot delete data or replace the last successful token',async()=>{
  const {repo}=setup();await connected(repo,[row()]);const failed={...page([deletion(row())],'UNSAFE'),completedMetrics:[]};
  await new HealthSync(source(async()=>failed),repo,()=>now).sync();const d=await repo.read();assert.equal(d.observations.length,1);assert.equal(d.health.changeCursors?.steps?.token,'old');assert.equal(d.healthDeletions,undefined);
});
test('successful first page remains resumable if the next page fails',async()=>{
  const {repo}=setup();await connected(repo);let calls=0;
  await new HealthSync(source(async(_metric,c)=>{if(!calls++){assert.equal(c?.token,'old');return page([upsert(row())],'page-1',true);}assert.equal(c?.token,'page-1');return {observations:[],completedMetrics:[],limitations:['TEST_FAILURE']};}),repo,()=>now).sync();
  const d=await repo.read();assert.equal(d.observations.length,1);assert.equal(d.health.changeCursors?.steps?.token,'page-1');assert.equal(d.health.metricCheckpoints?.steps,undefined);
});
test('repeated token with changes fails closed before applying duplicate or ambiguous changes',async()=>{
  const {repo}=setup();await connected(repo,[row()]);await new HealthSync(source(async()=>page([deletion(row())],'old',true)),repo,()=>now).sync();assert.equal((await repo.read()).observations.length,1);
});
test('disconnect invalidates an in-flight deletion page and its cursor',async()=>{
  const {repo}=setup();await connected(repo,[row()]);let release!:(r:HealthReadResult)=>void;let started!:()=>void;const ready=new Promise<void>(r=>{started=r;});
  const sync=new HealthSync(source(async()=>{started();return new Promise(r=>{release=r;});}),repo,()=>now);const running=sync.sync();await ready;await sync.disconnect();release(page([deletion(row())],'new'));await running;
  const d=await repo.read();assert.equal(d.observations.length,1);assert.equal(d.health.changeCursors?.steps?.token,'old');
});
test('bounded change pages persist progress and report unfinished work',async()=>{
  const {repo}=setup();await connected(repo);let n=0;await new HealthSync(source(async()=>page([],'page-'+(++n),true)),repo,()=>now).sync();
  assert.equal(n,20);const d=await repo.read();assert.equal(d.health.changeCursors?.steps?.token,'page-20');assert.equal(d.health.error,'health_more_changes_pending');assert.equal(d.health.lastSyncedAt,undefined);
});
test('foreign metric/source changes cannot acquire a valid checkpoint',async()=>{
  const {repo}=setup();await connected(repo,[row()]);await new HealthSync(source(async()=>page([{...deletion(row()),sourcePlatform:'healthkit'}],'new')),repo,()=>now).sync();assert.equal((await repo.read()).health.changeCursors?.steps?.token,'old');
});
test('explicit resync rejects foreign source changes and never accepts snapshot deletions',async()=>{
  for(const changes of [[{...upsert(row()),sourcePlatform:'healthkit'} as HealthSourceChange],[deletion(row())]]){
    const {repo}=setup();await connected(repo,[row()]);const s=source(async()=>page([],'next'));
    s.readSince=async()=>({observations:[],completedMetrics:['steps'],limitations:[],changes});
    await new HealthSync(s,repo,()=>now).sync(true);const d=await repo.read();assert.equal(d.observations.length,1);assert.equal(d.healthDeletions?.length??0,0);assert.equal(d.health.error,'health_partial_read_retry_required');
  }
});
test('concurrent cursor advancement invalidates a stale resync snapshot',async()=>{
  const {repo}=setup();await connected(repo,[row()]);let changeReads=0;const s=source(async()=>{changeReads++;return page([],'stale');});
  s.readSince=async()=>{
    await repo.update(d=>({...d,observations:[row({value:90})],health:{...d.health,changeCursors:{steps:cursor('concurrent')}}}));
    return {...page([upsert(row({value:20}))],'ignored'),nextCursor:undefined};
  };
  await new HealthSync(s,repo,()=>now).sync(true);const d=await repo.read();assert.equal(d.observations[0].value,90);assert.equal(d.health.changeCursors?.steps?.token,'concurrent');assert.equal(changeReads,0);
});
test('legacy device state reads without migration writes and keeps optional fields absent',async()=>{
  const {repo,storage}=setup();const legacy={...emptyDeviceData(),observations:[row()]};storage.values.set(DEVICE_DATA_KEY,JSON.stringify(legacy));
  const d=await repo.read();assert.equal(d.observations.length,1);assert.equal(d.health.changeCursors,undefined);assert.equal(storage.writes.length,0);assert.equal(d.notificationQuietHours,undefined);
});
test('crash at every transaction write recovers source rows, tombstones and cursor atomically',async()=>{
  const initial=setup();await connected(initial.repo,[row(),row({externalId:'SECOND',sourceRecordId:'SECOND'}),row({externalId:'THIRD',sourceRecordId:'THIRD'})]);
  const initialValues=new Map(initial.storage.values);
  const mutate=(d:Awaited<ReturnType<DeviceRepository['read']>>)=>({...d,...applyHealthChanges(d.observations,d.healthDeletions??[],[deletion(row())],now.toISOString()),health:{...d.health,changeCursors:{steps:cursor('committed')}}});
  const probe=new MemoryStorage();probe.values=new Map(initialValues);await new DeviceRepository(probe).update(mutate);
  for(let crashAt=0;crashAt<probe.writes.length;crashAt++){
    const storage=new MemoryStorage();storage.values=new Map(initialValues);storage.crashAt=crashAt;
    await assert.rejects(new DeviceRepository(storage).update(mutate));
    const restarted=new MemoryStorage();restarted.values=storage.values;const recovered=await new DeviceRepository(restarted).read();
    assert.equal(recovered.health.changeCursors?.steps?.token,crashAt===0?'old':'committed');assert.equal(recovered.observations.length,crashAt===0?3:2);assert.equal(recovered.healthDeletions?.length??0,crashAt===0?0:1);
  }
});
test('repository reads wait behind writes across instances sharing one storage',async()=>{
  const {repo,storage}=setup();let release!:()=>void;let entered!:()=>void;const ready=new Promise<void>(r=>{entered=r;});
  const write=repo.update(async d=>{entered();await new Promise<void>(r=>{release=r;});return {...d,notificationQuietHours:{startMinute:1320,endMinute:480}};});
  await ready;const read=new DeviceRepository(storage).read();release();await write;assert.equal((await read).notificationQuietHours?.startMinute,1320);
});
test('corrupt recovery journal never overwrites valid metadata',async()=>{
  const {repo,storage}=setup();await connected(repo,[row()]);const prior=storage.values.get(DEVICE_DATA_KEY);storage.values.set(DEVICE_PENDING_KEY,JSON.stringify({version:1,writes:[{key:DEVICE_DATA_KEY,value:'{}'}]}));
  await assert.rejects(repo.read(),/device_pending_invalid/);assert.equal(storage.values.get(DEVICE_DATA_KEY),prior);
});

function android(mocks:Record<string,unknown>){
  return mockModule<typeof import('../../src/platform/health/HealthSource.android')>('../../src/platform/health/HealthSource.android',{'react-native-health-connect':{initialize:async()=>true,getGrantedPermissions:async()=>[{recordType:'Steps',accessType:'read'}],...mocks}}).createHealthSource(setup().repo);
}
const hcPage=(token:string,extra:Record<string,unknown>={})=>({upsertionChanges:[],deletionChanges:[],nextChangesToken:token,hasMore:false,changesTokenExpired:false,...extra});
const hcRecord={metadata:{id:'TEST_PARENT',lastModifiedTime:'2026-09-19T11:00:00Z'},startTime:'2026-09-19T10:00:00Z',endTime:'2026-09-19T11:00:00Z',count:10};
test('Android bootstrap reserves changes before snapshot and catches deletion during snapshot',async()=>{
  const calls:string[]=[];const s=android({getChanges:async(r:{changesToken?:string})=>{calls.push(r.changesToken??'reserve');return r.changesToken?hcPage('end',{deletionChanges:[{recordId:'TEST_PARENT'}]}):hcPage('reserved');},readRecords:async()=>{calls.push('snapshot');return {records:[hcRecord]};}});
  const {repo}=setup();await connected(repo,[],null);await new HealthSync(s,repo,()=>now).sync();assert.deepEqual(calls,['reserve','snapshot','reserved']);const d=await repo.read();assert.equal(d.observations.length,0);assert.equal(d.healthDeletions?.length,1);assert.equal(d.health.changeCursors?.steps?.token,'end');
});
test('Android expired token bootstraps without inferring old source deletions and reports history gap',async()=>{
  let n=0;const s=android({getChanges:async()=>++n===1?hcPage('expired',{changesTokenExpired:true}):hcPage('fresh'),readRecords:async()=>({records:[]})});
  const {repo}=setup();await connected(repo,[row()]);await new HealthSync(s,repo,()=>now).sync();const d=await repo.read();assert.equal(d.observations.length,1);assert.equal(d.health.changeCursors?.steps?.token,'fresh');assert.equal(d.health.error,'health_change_history_gap');
});
test('Android revoked permission does not query the change feed',async()=>{
  let queried=false;const s=android({getGrantedPermissions:async()=>[],getChanges:async()=>{queried=true;return hcPage('bad');}});const result=await s.readChanges!('steps',cursor('old'),since,now.toISOString());assert.equal(queried,false);assert.equal(result.nextCursor,undefined);assert.deepEqual(result.completedMetrics,[]);
});
test('Android malformed changes cannot advance a token',async()=>{
  const s=android({getChanges:async()=>hcPage('bad',{deletionChanges:[{recordId:''}]})});const result=await s.readChanges!('steps',cursor('old'),since,now.toISOString());assert.equal(result.nextCursor,undefined);
});
test('Android failed recovery snapshot keeps expired checkpoint retryable',async()=>{
  let n=0;const s=android({getChanges:async()=>++n===1?hcPage('expired',{changesTokenExpired:true}):hcPage('fresh'),readRecords:async()=>{throw new Error('TEST_READ_FAILED');}});
  assert.equal((await s.readChanges!('steps',cursor('old'),since,now.toISOString())).nextCursor,undefined);
});
test('Android source parent and actual provider revision survive normalization',async()=>{
  const s=android({getChanges:async()=>hcPage('new',{upsertionChanges:[{record:hcRecord}]})});const result=await s.readChanges!('steps',cursor('old'),since,now.toISOString());assert.equal(result.observations[0].sourceRecordId,'TEST_PARENT');assert.equal(result.observations[0].sourceModifiedAt,hcRecord.metadata.lastModifiedTime);
});
test('HealthKit anchored query preserves its original predicate and explicit deleted UUID',async()=>{
  let options:any;const s=mockModule<typeof import('../../src/platform/health/HealthSource.ios')>('../../src/platform/health/HealthSource.ios',{'@kingstinct/react-native-healthkit':{queryQuantitySamplesWithAnchor:async(_id:string,o:unknown)=>{options=o;return {samples:[],deletedSamples:[{uuid:'TEST_PARENT'}],newAnchor:'new-anchor'};}}}).createHealthSource(setup().repo);
  const result=await s.readChanges!('steps',{sourcePlatform:'healthkit',token:'old-anchor',since},'2026-09-19T00:00:00Z',now.toISOString());assert.equal(options.anchor,'old-anchor');assert.equal(options.filter.date.startDate.toISOString(),since);assert.equal(options.filter.date.endDate,undefined);assert.equal(result.changes?.[0].kind,'delete');assert.equal(result.nextCursor?.token,'new-anchor');
});
test('HealthKit anchor/read failure retains all data and does not mint a replacement cursor',async()=>{
  const s=mockModule<typeof import('../../src/platform/health/HealthSource.ios')>('../../src/platform/health/HealthSource.ios',{'@kingstinct/react-native-healthkit':{queryQuantitySamplesWithAnchor:async()=>{throw new Error('TEST_DENIED_OR_INVALID_ANCHOR');}}}).createHealthSource(setup().repo);
  const result=await s.readChanges!('steps',{sourcePlatform:'healthkit',token:'old',since},since,now.toISOString());assert.equal(result.nextCursor,undefined);assert.deepEqual(result.completedMetrics,[]);assert.equal(result.changes,undefined);
});
