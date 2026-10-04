import assert from 'node:assert/strict';
import { execFile, execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const bin=process.env.QUESTLIFE_TEST_PG_BIN??'/Library/PostgreSQL/18/bin';
const root=mkdtempSync(join(tmpdir(),'questlife-ai-pg-'));
const env={PATH:process.env.PATH,LC_ALL:'C',PGHOST:root,PGPORT:'56449',PGDATABASE:'postgres',PGUSER:'fixture_admin',PGPASSFILE:'/dev/null',PGSERVICEFILE:'/dev/null'};
const args=['-X','-qAt','-v','ON_ERROR_STOP=1','-w'];
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
const sql=query=>execFileSync(join(bin,'psql'),args,{input:query,env,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
const claim=(id,endpoint='parse',role='service_role')=>JSON.parse(sql(`begin;set local role ${role};select public.questlife_ai_claim('${id}','${endpoint}');commit;`));
const denied=(job)=>assert.throws(job,error=>/permission denied/.test(String(error.stderr??error.message)));
const reset=()=>sql('truncate public.questlife_ai_budget');
let started=false,checks=0;
async function check(name,job){reset();await job();checks++;console.log(`PASS ${name}`);}
try {
  execFileSync(join(bin,'initdb'),['-D',join(root,'db'),'--auth=trust','--username=fixture_admin','--no-locale','--encoding=UTF8'],{env,stdio:'ignore'});
  execFileSync(join(bin,'pg_ctl'),['-D',join(root,'db'),'-l',join(root,'server.log'),'-o',`-F -h '' -k ${root} -p 56449`,'-w','start'],{env,stdio:'ignore'});started=true;
  sql(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);insert into auth.users values('${A}'),('${B}');`);
  sql(readFileSync(new URL('../supabase/migrations/202610050001_ai_request_budget.sql',import.meta.url),'utf8'));
  sql(readFileSync(new URL('../supabase/migrations/202610050002_ai_budget_account_retention.sql',import.meta.url),'utf8'));
  await check('only server can claim; all client roles denied counters and direct mutations',()=>{
    for(const role of ['anon','authenticated']){
      denied(()=>claim(A,'parse',role));
      denied(()=>sql(`set role ${role};select * from public.questlife_ai_budget;`));
      denied(()=>sql(`set role ${role};insert into public.questlife_ai_budget values('global',now(),1);`));
    }
    assert.equal(sql("select relrowsecurity from pg_class where oid='public.questlife_ai_budget'::regclass"),'t');
  });
  await check('fixed route costs and independent per-account counters',()=>{
    assert.equal(claim(A).status,'claimed');assert.equal(claim(A,'brief').status,'claimed');assert.equal(claim(B).status,'claimed');
    assert.equal(sql("select units from public.questlife_ai_budget where scope='global'"),'5');
    assert.equal(sql(`select units from public.questlife_ai_budget where scope='user:${A}'`),'4');
    assert.equal(sql(`select units from public.questlife_ai_budget where scope='user:${B}'`),'1');
  });
  await check('minute cap blocks inference reservation without incrementing counters',()=>{
    for(let i=0;i<12;i++)assert.equal(claim(A).status,'claimed');
    assert.equal(claim(A).status,'rate_limited');assert.equal(sql("select units from public.questlife_ai_budget where scope='global'"),'12');
    assert.equal(claim(B).status,'claimed');
  });
  await check('daily per-account cap and global cost cap are enforced independently',()=>{
    sql(`insert into public.questlife_ai_budget values('user:${A}',date_trunc('day',now() at time zone 'UTC') at time zone 'UTC',200),('global',date_trunc('day',now() at time zone 'UTC') at time zone 'UTC',1498);`);
    assert.equal(claim(A).status,'rate_limited');assert.equal(claim(B,'brief').status,'rate_limited');
    assert.equal(claim(B).status,'claimed');assert.equal(claim(B).status,'claimed');assert.equal(claim(B).status,'rate_limited');
    assert.equal(sql("select units from public.questlife_ai_budget where scope='global'"),'1500');
  });
  await check('separate concurrent database sessions cannot overrun minute cap',async()=>{
    const run=promisify(execFile);
    const jobs=Array.from({length:24},()=>run(join(bin,'psql'),[...args,'-c',`begin;set local role service_role;select public.questlife_ai_claim('${A}','parse');commit;`],{env}));
    const results=(await Promise.all(jobs)).map(row=>JSON.parse(row.stdout.trim()));
    assert.equal(results.filter(row=>row.status==='claimed').length,12);
    assert.equal(results.filter(row=>row.status==='rate_limited').length,12);
    assert.equal(sql("select units from public.questlife_ai_budget where scope='global'"),'12');
  });
  await check('invalid endpoint or nonexistent account cannot consume budget',()=>{
    assert.throws(()=>claim(A,'custom'),error=>/invalid_endpoint/.test(String(error.stderr)));
    assert.throws(()=>claim('33333333-3333-4333-8333-333333333333'),error=>/invalid_user/.test(String(error.stderr)));
    assert.equal(sql('select count(*) from public.questlife_ai_budget'),'0');
  });
  await check('reservations survive retries; obsolete counters are removed without user-data tables',()=>{
    sql("insert into public.questlife_ai_budget values('global',now()-interval '4 days',12);");
    claim(A);claim(A);assert.equal(sql("select units from public.questlife_ai_budget where scope='global'"),'2');
    assert.equal(sql('select count(*) from auth.users'),'2');assert.equal(sql('show listen_addresses'),'');
  });
  await check('Auth deletion erases only that identity accounting and retains global spent budget',()=>{
    claim(A);claim(B,'brief');
    for(const role of ['anon','authenticated','service_role']) denied(()=>sql(`set role ${role};select public.questlife_ai_forget_account();`));
    sql(`delete from auth.users where id='${A}'`);
    assert.equal(sql(`select count(*) from public.questlife_ai_budget where scope in ('user:${A}','minute:${A}')`),'0');
    assert.equal(sql(`select units from public.questlife_ai_budget where scope='user:${B}'`),'3');
    assert.equal(sql("select units from public.questlife_ai_budget where scope='global'"),'4');
  });
  console.log(`AI budget PostgreSQL: ${checks}/${checks} isolated groups passed; no hosted database touched.`);
} finally {
  if(started)execFileSync(join(bin,'pg_ctl'),['-D',join(root,'db'),'-m','fast','-w','stop'],{env,stdio:'ignore'});
  rmSync(root,{recursive:true,force:true});
}
