import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import Module, { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = mkdtempSync(join(tmpdir(), 'questlife-health-delete-'));
const compile = spawnSync(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '--module', 'commonjs', '--target', 'es2022',
  '--moduleResolution', 'node', '--jsx', 'react-jsx', '--strict', '--skipLibCheck', '--esModuleInterop', '--resolveJsonModule',
  '--rootDir', root, '--outDir', out, join(root, 'src/sync-v2/runtime.ts'), join(root, 'src/platform/health/changes.ts')], {cwd: root, stdio: 'inherit'});
assert.equal(compile.status, 0);
symlinkSync(join(root, 'node_modules'), join(out, 'node_modules'), 'dir');
const require = createRequire(join(out, 'test.cjs'));
const db = new PGlite();
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const values = new Map();
const storage = {getItem: async key => values.get(key) ?? null, setItem: async (key, value) => {values.set(key, value);}};
const {DeviceRepository} = require(join(out, 'src/platform/deviceRepository.js'));
const {normalizeHealthSample} = require(join(out, 'src/platform/health/normalization.js'));
const {applyHealthChanges} = require(join(out, 'src/platform/health/changes.js'));
const {DEFAULT_DATA} = require(join(out, 'src/types.js'));
const repo = new DeviceRepository(storage);
let userId = null, loseAck = false, checks = 0, stop;
const originalLoad = Module._load;
await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth,public to authenticated; grant execute on function auth.uid() to authenticated;`);
await db.exec(readFileSync(join(root, 'supabase/migrations/202609180001_sync_v2.sql'), 'utf8'));
await db.query('insert into auth.users values($1),($2)', [A, B]);
async function queryAs(owner, sql, params) {
  return db.transaction(async tx => {
    await tx.exec('set local role authenticated');
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [owner]);
    return tx.query(sql, params);
  });
}
const transport = {
  push: async (owner, mutations) => {
    const wire = mutations.map(({attemptCount, lastAttemptAt, lastError, ...value}) => value);
    const result = (await queryAs(owner, 'select public.questlife_sync_push($1::jsonb) as result', [JSON.stringify(wire)])).rows[0].result;
    if (loseAck) {loseAck=false; throw Error('Fixture lost SQL ACK');}
    return result;
  },
  pull: async (owner, cursor, limit) => (await queryAs(owner,
    'select * from public.questlife_sync_entities where user_id=$1 and change_seq>$2 order by change_seq limit $3', [owner, cursor, limit])).rows,
};
const remote = async id => (await queryAs(A, 'select * from public.questlife_sync_entities where entity_id=$1', [id])).rows[0];
Module._load = function(name, parent, isMain) {
  if (name === '@react-native-async-storage/async-storage') return storage;
  if (name === 'expo-crypto') return {randomUUID};
  if (name === 'react-native') return {Platform: {OS:'ios'}, AppState:{addEventListener:()=>({remove(){}})}};
  if (parent?.filename.endsWith('/src/sync-v2/runtime.js')) {
    if (name === './supabase') return {authConfigured:()=>false, listenForAuthLinks:()=>()=>{}, authService:{getUserId:async()=>userId, getSession:async()=>userId?{userId}:null, subscribe:()=>()=>{}}, supabaseClient:()=>{throw Error('No hosted SDK allowed');}};
    if (name === './device') return {getSyncDevice:async()=>({id:'ios:health-runtime',platform:'ios',appVersion:'test'})};
    if (name === './pushRegistry') return {retryPendingPushRetirement:async()=>{}};
    if (name === './transport') return {supabaseTransport:transport};
    if (name === '../platform/services') return {deviceRepository:repo};
  }
  return originalLoad.call(this, name, parent, isMain);
};
let runtime, engine;
async function boot() {
  userId=null;
  const path = join(out, 'src/sync-v2/runtime.js'); delete require.cache[path];
  runtime=require(path);
  stop=await runtime.startSyncRuntime(()=>structuredClone(DEFAULT_DATA),async()=>{});
  engine=await runtime.getSyncEngine(); userId=A; await engine.attach(A, []);
}
async function flush() {
  const done=new Promise((resolve, reject)=>{
    let began=false;
    const timer=setTimeout(()=>{unsubscribe();reject(Error('runtime_sync_timeout'));},5000);
    const unsubscribe=engine.subscribe(()=>{
      if(engine.status==='syncing')began=true;
      if(began&&engine.status!=='syncing'){clearTimeout(timer);unsubscribe();resolve();}
    });
  });
  runtime.requestSync(true); await done;
}
const sample = id => normalizeHealthSample({metric:'heart_rate',value:70,unit:'bpm',startAt:'2026-09-18T00:00:00Z',endAt:'2026-09-18T00:00:01Z',availableAt:'2026-09-18T00:01:00Z',externalId:id,platform:'healthkit'});
async function removeSource(row, at='2026-09-20T00:00:00Z') {
  await repo.update(data=>({...data,...applyHealthChanges(data.observations,data.healthDeletions??[],
    [{kind:'delete',sourcePlatform:row.sourcePlatform,metric:row.metric,sourceRecordId:row.externalId}],at)}));
}
async function check(name, job) {await job();checks++;console.log(`PASS ${name}`);}
try {
  await boot();
  const first=sample('provider-delete-runtime'), kept=sample('provider-retained-runtime');
  await repo.update(data=>({...data,observations:[first,kept]}));
  await check('runtime consent/account gates do not upload Health before consent',async()=>{
    await flush();assert.equal(await remote(first.id),undefined);
    await engine.setHealthConsent(true);
    userId=B;await flush();assert.equal(await remote(first.id),undefined);
    userId=A;await flush();assert.equal((await remote(first.id)).revision,1);
  });
  await check('actual runtime converts explicit source deletion into PostgreSQL tombstone and never infers array absence',async()=>{
    await removeSource(first);await flush();
    assert.ok((await remote(first.id)).deleted_at);assert.equal((await remote(first.id)).payload,null);
    assert.equal((await remote(kept.id)).deleted_at,null);
    await flush();assert.equal((await repo.read()).healthDeletions.length,0);
    await repo.update(data=>({...data,observations:[]}));await flush();
    assert.equal((await remote(kept.id)).deleted_at,null);
  });
  await check('runtime lost delete ACK survives restart and replays the original PostgreSQL receipt',async()=>{
    await repo.update(data=>({...data,observations:[kept]}));await removeSource(kept);
    loseAck=true;await flush();
    const sent=(await runtime.readSyncState()).outbox[0];const tombstone=await remote(kept.id);
    assert.equal(sent.operation,'delete');assert.ok(tombstone.deleted_at);
    assert.equal((await repo.read()).healthDeletions.length,1);
    stop();await boot();await flush();
    assert.equal((await runtime.readSyncState()).outbox.length,0);
    assert.deepEqual(await remote(kept.id),tombstone);
    assert.equal((await repo.read()).healthDeletions.length,1,'ACK cleanup occurs on the next durable observation');
  });
  await check('older ACK cleanup cannot erase a newer same-ID deletion version',async()=>{
    const queue=engine.queueHealth.bind(engine);
    engine.queueHealth=async(...args)=>{
      const ack=await queue(...args);
      if(ack.length)await repo.update(data=>({...data,healthDeletions:data.healthDeletions.map(row=>({...row,deletedAt:'2026-09-20T01:00:00Z'}))}));
      return ack;
    };
    await flush();engine.queueHealth=queue;
    assert.equal((await repo.read()).healthDeletions[0].deletedAt,'2026-09-20T01:00:00Z');
    await flush();await flush();assert.equal((await repo.read()).healthDeletions.length,0);
  });
  await check('remote live hydration cannot resurrect a persisted explicit local delete',async()=>{
    const row=sample('provider-hydration-runtime');
    await transport.push(A,[{mutationId:randomUUID(),deviceId:'ios:other',entityType:'healthObservations',entityId:row.id,operation:'upsert',payload:row,schemaVersion:1,baseRevision:0,createdAt:'2026-09-20T00:00:00Z'}]);
    await repo.update(data=>({...data,observations:[row]}));await removeSource(row);
    await engine.pull();
    assert.equal((await repo.read()).observations.some(item=>item.id===row.id),false);
    await flush();assert.ok((await remote(row.id)).deleted_at);
  });
  await check('explicit remote conflict choice restores its row and retires only the matching local deletion',async()=>{
    const row=sample('provider-conflict-runtime');
    await repo.update(data=>({...data,observations:[...data.observations,row]}));await flush();
    await removeSource(row);
    await transport.push(A,[{mutationId:randomUUID(),deviceId:'ios:other',entityType:'healthObservations',entityId:row.id,operation:'upsert',payload:{...row,value:81},schemaVersion:1,baseRevision:1,createdAt:'2026-09-20T00:30:00Z'}]);
    await flush();
    const conflict=(await runtime.readSyncState()).conflicts.find(c=>c.entityId===row.id&&c.resolution==='pending');assert.ok(conflict);
    assert.equal((await repo.read()).observations.some(item=>item.id===row.id),false);
    await engine.resolve(conflict.id,'remote');
    assert.equal((await repo.read()).observations.find(item=>item.id===row.id).value,81);
    await flush();assert.equal((await repo.read()).healthDeletions.some(item=>item.observationId===row.id),false);
    assert.equal((await remote(row.id)).deleted_at,null);
  });
  console.log(`Health delete boundary: ${checks}/${checks} production runtime + local PostgreSQL groups passed; auth/native/transport adapters are fixtures, SQL/RLS/receipt enforcement is real. No hosted Supabase or owner data.`);
} finally {
  stop?.();Module._load=originalLoad;await db.close();rmSync(out,{recursive:true,force:true});
}
