import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const bin = process.env.QUESTLIFE_TEST_PG_BIN ?? '/Library/PostgreSQL/18/bin';
const root = mkdtempSync(join(tmpdir(), 'questlife-push-pg-'));
const port = 56440;
// Do not inherit database URLs, service files, passwords or credentials from the host.
const env = {PATH: process.env.PATH, LC_ALL: 'C', PGHOST: root, PGPORT: String(port),
  PGDATABASE: 'postgres', PGUSER: 'fixture_admin', PGPASSFILE: '/dev/null', PGSERVICEFILE: '/dev/null'};
const psql = ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-w'];
const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222';
const D1 = 'ios:device-one', D2 = 'ios:device-two', DB = 'android:device-b';
const T1 = 'ExpoPushToken[pg_owner_a_device_one]', T2 = 'ExpoPushToken[pg_owner_a_device_two]', TB = 'ExpoPushToken[pg_owner_b_device_one]';
const R1 = randomUUID(), R2 = randomUUID();
let checks = 0, started = false;
const literal = value => value === null ? 'null' : typeof value === 'boolean' || typeof value === 'number' ? String(value) : `'${String(value).replaceAll("'", "''")}'`;
const sql = query => execFileSync(join(bin, 'psql'), psql, {input: query, env, encoding: 'utf8', stdio: ['pipe','pipe','pipe']}).trim();
const as = (owner, query, role = 'authenticated') => sql(`begin; set local role ${role}; set local request.jwt.claim.sub=${literal(owner)}; ${query}; commit;`);
const call = (owner, name, args, role) => {
  const result = as(owner, `select public.${name}(${args.map(literal).join(',')})`, role);
  return result ? JSON.parse(result) : null;
};
const touch = (owner, device, platform='ios') => call(owner, 'questlife_device_touch', [device, platform, 'test']);
const register = (owner, device, reg, token, generation=1) => call(owner, 'questlife_push_register', [device, reg, generation, token, true]);
const retire = (owner, device, reg, generation=1) => call(owner, 'questlife_push_retire', [device, reg, generation]);
const claim = (owner, device, request=randomUUID(), send=true) => call(owner, 'questlife_push_test_claim', [device, request, send]);
const row = (owner, device) => JSON.parse(sql(`select row_to_json(d) from public.questlife_sync_devices d where user_id=${literal(owner)} and device_id=${literal(device)}`));
const denied = (job, reason) => assert.throws(job, error => new RegExp(reason).test(String(error.stderr ?? error.message)));
function check(name, job) {job();checks++;console.log(`PASS ${name}`);}
try {
  execFileSync(join(bin, 'initdb'), ['-D', join(root, 'db'), '--auth=trust', '--username=fixture_admin', '--no-locale', '--encoding=UTF8'], {env, stdio:'ignore'});
  execFileSync(join(bin, 'pg_ctl'), ['-D', join(root, 'db'), '-l', join(root, 'server.log'), '-o', `-F -h '' -k ${root} -p ${port}`, '-w', 'start'], {env, stdio:'ignore'});
  started=true;
  sql(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth,public to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;`);
  sql(readFileSync(new URL('../supabase/migrations/202609180001_sync_v2.sql', import.meta.url), 'utf8'));
  sql(`insert into auth.users values(${literal(A)}),(${literal(B)});
    insert into public.questlife_sync_devices(user_id,device_id,platform,app_version,name) values(${literal(A)},'ios:existing','ios','prior','Existing device');`);
  sql(readFileSync(new URL('../supabase/migrations/202609200002_device_push_boundary.sql', import.meta.url), 'utf8'));
  check('native PostgreSQL migration preserves existing device metadata and owner RLS',()=>{
    assert.equal(sql('show listen_addresses'),'');
    assert.equal(row(A,'ios:existing').name,'Existing device');
    assert.equal(row(A,'ios:existing').push_enabled,false);
    assert.equal(sql("select relrowsecurity from pg_class where oid='public.questlife_sync_devices'::regclass"),'t');
    assert.equal(as(B,'select count(*) from public.questlife_sync_devices'),'0');
  });
  check('all registry RPCs deny anonymous roles and signed-out authenticated callers',()=>{
    const cases = [
      ['questlife_device_touch',[D1,'ios','test']],
      ['questlife_push_register',[D1,R1,1,T1,true]],
      ['questlife_push_retire',[D1,R1,1]],
      ['questlife_push_test_claim',[D1,randomUUID(),true]],
      ['questlife_push_test_finish',[D1,R1,randomUUID(),'accepted','ticket']],
    ];
    for(const [name,args] of cases){
      denied(()=>call(A,name,args,'anon'),'permission denied');
      denied(()=>call('',name,args),'authentication_required');
    }
  });
  check('authenticated direct token reads and broad device writes are denied',()=>{
    denied(()=>as(A,'select push_token from public.questlife_sync_devices'),'permission denied');
    denied(()=>as(A,`update public.questlife_sync_devices set push_token=${literal(T1)}`),'permission denied');
    denied(()=>as(A,'delete from public.questlife_sync_devices'),'permission denied');
    denied(()=>as(A,`insert into public.questlife_sync_devices(user_id,device_id,platform) values(${literal(B)},'ios:forged','ios')`),'permission denied');
  });
  check('two native devices register only for auth.uid and remain separately bound',()=>{
    touch(A,D1);touch(A,D2);touch(B,DB,'android');
    assert.equal(register(A,D1,R1,T1).status,'registered');
    assert.equal(register(A,D2,R2,T2).status,'registered');
    assert.equal(register(B,DB,randomUUID(),TB).status,'registered');
    assert.equal(row(A,D1).push_token,T1);assert.equal(row(A,D2).push_token,T2);
    assert.equal(as(B,'select count(*) from public.questlife_sync_devices'),'1');
  });
  check('B cannot register, claim, revoke or read A device/token',()=>{
    assert.equal(claim(B,D1).status,'disabled');
    retire(B,D1,R1);assert.equal(row(A,D1).push_token,T1);
    touch(B,D1);
    denied(()=>register(B,D1,randomUUID(),'ExpoPushToken[pg_other_token_12345]'),'push_binding_unavailable');
    touch(B,'android:token-copy','android');
    denied(()=>register(B,'android:token-copy',randomUUID(),T1),'push_binding_unavailable');
    assert.equal(as(B,`select count(*) from public.questlife_sync_devices where user_id=${literal(A)}`),'0');
  });
  check('revoking device one leaves device two and the other owner unchanged',()=>{
    assert.equal(retire(A,D1,R1).status,'retired');
    assert.equal(row(A,D1).push_token,null);
    assert.equal(row(A,D2).push_token,T2);assert.equal(row(B,DB).push_token,TB);
    assert.equal(claim(A,D1).status,'disabled');
  });
  check('wrong registration or wrong device cannot retire the active exact generation',()=>{
    assert.equal(retire(A,D2,randomUUID()).status,'superseded');
    assert.equal(retire(A,'ios:missing-device',R2).status,'retired');
    assert.equal(row(A,D2).push_token,T2);
  });
  check('retirement replay is idempotent and a delayed register cannot resurrect its generation',()=>{
    assert.equal(retire(A,D1,R1).status,'retired');
    denied(()=>register(A,D1,R1,T1),'registration_retired');
    const newer=randomUUID();register(A,D1,newer,T1,2);
    assert.equal(retire(A,D1,R1).status,'superseded');assert.equal(row(A,D1).push_token,T1);
  });
  check('disabled preference, invalid token and web-device registration fail closed',()=>{
    touch(A,'web:unsupported','web');
    denied(()=>register(A,'web:unsupported',randomUUID(),'ExpoPushToken[pg_web_token_123456]'),'device_not_registered');
    denied(()=>call(A,'questlife_push_register',[D2,R2,1,T2,false]),'invalid_push_registration');
    denied(()=>register(A,D2,R2,'invalid'),'invalid_push_registration');
  });
  check('manual claim uses exact device and durable request dedupe without repeat token exposure',()=>{
    const request=randomUUID();const first=claim(A,D2,request);
    assert.equal(first.token,T2);assert.equal(first.registrationId,R2);
    const retry=claim(A,D2,request);assert.equal(retry.status,'pending');assert.equal(retry.token,undefined);
    assert.equal(claim(A,D2).status,'rate_limited');
    assert.equal(call(A,'questlife_push_test_finish',[D1,R2,request,'device_unregistered',null]).status,'superseded');
    assert.equal(call(B,'questlife_push_test_finish',[D2,R2,request,'device_unregistered',null]).status,'superseded');
    assert.equal(row(A,D2).push_token,T2);
    assert.equal(call(A,'questlife_push_test_finish',[D2,R2,request,'device_unregistered',null]).status,'device_unregistered');
    assert.equal(row(A,D2).push_token,null);assert.equal(row(A,D1).push_token,T1);
  });
  check('expired lease is unsendable and signed-out callers cannot use an existing binding',()=>{
    sql(`update public.questlife_sync_devices set push_expires_at=now()-interval '1 second' where user_id=${literal(A)} and device_id=${literal(D1)}`);
    assert.equal(claim(A,D1).status,'disabled');
    denied(()=>claim('',DB),'authentication_required');
    assert.equal(row(B,DB).push_token,TB);
  });
  check('formal Health tombstone and lost-ACK receipt replay preserve exact owner and revision',()=>{
    const id='healthkit:heart_rate:pg_source_123';
    const upsert={mutationId:randomUUID(),deviceId:D1,entityType:'healthObservations',entityId:id,operation:'upsert',schemaVersion:1,baseRevision:0,createdAt:'2026-09-20T00:00:00Z',
      payload:{id,schemaVersion:'questlife.health.observation.v1',metric:'heart_rate',value:70,unit:'bpm',eventStartAt:'2026-09-18T00:00:00Z',eventEndAt:'2026-09-18T00:00:01Z',availableAt:'2026-09-18T00:01:00Z',importedAt:'2026-09-18T00:01:00Z',externalId:'pg_source_123',sourcePlatform:'healthkit',provenance:{origin:'PASSIVE_IMPORTED'},limitations:[]}};
    const push=(owner,m)=>call(owner,'questlife_sync_push',[JSON.stringify([m])])[0];
    assert.equal(push(A,upsert).status,'applied');
    const deletion={...upsert,mutationId:randomUUID(),operation:'delete',payload:undefined,baseRevision:1};
    const accepted=push(A,deletion);assert.equal(accepted.status,'applied');assert.ok(accepted.remote.deleted_at);assert.equal(accepted.remote.payload,null);
    assert.deepEqual(push(A,deletion),accepted);
    assert.equal(as(B,`select count(*) from public.questlife_sync_entities where entity_id=${literal(id)}`),'0');
    denied(()=>push('',deletion),'authentication_required');
  });
  console.log(JSON.stringify({suite:'disposable native PostgreSQL 18 push migration and Health tombstone',checks,passed:checks,
    databaseEngineMocked:false,identityClaims:'fixture auth.uid under actual authenticated/anon roles',hostedSupabase:false,ownerDataTouched:false,tcpListener:false}));
} finally {
  if(started)execFileSync(join(bin,'pg_ctl'),['-D',join(root,'db'),'-m','immediate','-w','stop'],{env,stdio:'ignore'});
  rmSync(root,{recursive:true,force:true});
}
