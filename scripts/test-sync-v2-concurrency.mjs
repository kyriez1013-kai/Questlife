import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

// Real independent PostgreSQL backends, never the owner's database or a hosted project.
const bin = process.env.QUESTLIFE_TEST_PG_BIN ?? '/Library/PostgreSQL/18/bin';
const root = mkdtempSync(join(tmpdir(), 'questlife-sync-concurrency-'));
const port = 56439;
const env = { ...process.env, PGHOST: root, PGPORT: String(port), PGDATABASE: 'postgres', PGUSER: process.env.USER };
const psql = ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1'];
const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
let checks = 0;
let started = false;
const children = new Set();
const check = (condition, label) => { assert.ok(condition, label); checks++; };
const sql = (query) => execFileSync(join(bin, 'psql'), psql, { input: query, env, encoding: 'utf8' }).trim();
const auth = (id = owner) => `set role authenticated; select set_config('request.jwt.claim.sub','${id}',false);`;
function mutation(id) {
  return { mutationId: randomUUID(), deviceId: 'web:concurrency', entityType: 'categories', entityId: id,
    operation: 'upsert', payload: { id, name: 'Isolated concurrency check', createdAt: 1 },
    schemaVersion: 1, baseRevision: 0, createdAt: new Date().toISOString() };
}
const push = (m) => `select public.questlife_sync_push('${JSON.stringify([m])}'::jsonb);`;
function connection(query, marker) {
  const child = spawn(join(bin, 'psql'), psql, { env, stdio: ['pipe', 'pipe', 'pipe'] });
  children.add(child);
  let output = '', error = '', markerResolve, markerReject;
  const marked = new Promise((resolve, reject) => { markerResolve = resolve; markerReject = reject; });
  const timeout = setTimeout(() => { child.kill('SIGTERM'); markerReject(new Error('concurrency_timeout')); }, 20000);
  child.stdout.on('data', (chunk) => { output += chunk; if (marker && output.includes(marker)) markerResolve(); });
  child.stderr.on('data', (chunk) => { error += chunk; });
  const done = new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', (code) => {
      clearTimeout(timeout); children.delete(child);
      if (code !== 0) { const failure = new Error(`psql exit ${code}: ${error}`); markerReject(failure); reject(failure); }
      else { markerResolve(); resolve(output); }
    });
  });
  // Observe rejection immediately, even when the test is awaiting the lock marker.
  done.catch(() => {}); marked.catch(() => {});
  child.stdin.end(query);
  return { done, marked };
}
try {
  execFileSync(join(bin, 'initdb'), ['-D', join(root, 'db'), '--auth=trust', '--no-locale', '--encoding=UTF8'], { stdio: 'ignore' });
  execFileSync(join(bin, 'pg_ctl'), ['-D', join(root, 'db'), '-l', join(root, 'server.log'), '-o', `-F -h '' -k ${root} -p ${port}`, '-w', 'start'], { stdio: 'ignore' });
  started = true;
  sql(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth,public to authenticated; grant execute on function auth.uid() to authenticated;`);
  sql(readFileSync(new URL('../supabase/migrations/202609180001_sync_v2.sql', import.meta.url), 'utf8'));
  sql(`insert into auth.users values('${owner}'),('${other}');`);
  const first = mutation('first'), second = mutation('second');
  const a = connection(`${auth()} begin; ${push(first)}\n\\echo FIRST_WRITTEN\nselect pg_sleep(2); commit;`, 'FIRST_WRITTEN');
  await a.marked;
  const before = sql(`${auth()} select count(*) from public.questlife_sync_entities;`).split('\n').at(-1);
  check(before === '0', 'uncommitted lower sequence is invisible');
  let bFinished = false;
  const b = connection(`${auth()} ${push(second)}`);
  b.done.then(() => { bFinished = true; });
  const c = connection(`${auth(other)} ${push(mutation('independent-user'))}`);
  await c.done;
  check(!bFinished, 'same-user writer waits, other user progresses');
  await a.done;
  const bOutput = await b.done;
  check(bOutput.includes('"status": "applied"'), 'second writer commits after first');
  const rows = JSON.parse(sql(`${auth()} select jsonb_agg(x order by change_seq) from (select entity_id,change_seq,revision from public.questlife_sync_entities) x;`).split('\n').at(-1));
  check(rows.length === 2 && rows[0].entity_id === 'first' && rows[1].entity_id === 'second', 'pull cannot skip delayed lower-sequence commit');
  check(rows[0].change_seq === 1 && rows[1].change_seq === 2, 'committed cursor order follows writes');
  const retry = sql(`${auth()} ${push(first)}`).split('\n').at(-1);
  check(JSON.parse(retry)[0].remote.change_seq === 1, 'lost ACK replay returns immutable original receipt');
  const updateA = { ...first, mutationId: randomUUID(), baseRevision: 1, payload: { ...first.payload, name: 'A' } };
  const updateB = { ...updateA, mutationId: randomUUID(), payload: { ...first.payload, name: 'B' } };
  const writerA = connection(`${auth()} begin; ${push(updateA)}\n\\echo UPDATE_WRITTEN\nselect pg_sleep(1); commit;`, 'UPDATE_WRITTEN');
  await writerA.marked;
  const writerB = connection(`${auth()} ${push(updateB)}`);
  await writerA.done;
  const conflict = JSON.parse((await writerB.done).trim().split('\n').at(-1))[0];
  check(conflict.status === 'conflict' && conflict.remote.payload.name === 'A', 'concurrent edit preserves winner and returns losing revision');
  const tombstone = { ...first, mutationId: randomUUID(), operation: 'delete', payload: undefined, baseRevision: 2 };
  const deleted = JSON.parse(sql(`${auth()} ${push(tombstone)}`).split('\n').at(-1))[0];
  check(deleted.status === 'applied' && deleted.remote.deleted_at && deleted.remote.payload === null, 'explicit deletion is a durable tombstone');
  check(JSON.parse(sql(`${auth()} ${push(tombstone)}`).split('\n').at(-1))[0].remote.change_seq === deleted.remote.change_seq, 'repeated delete has no extra revision');
  const otherCount = sql(`${auth(other)} select count(*) from public.questlife_sync_entities;`).split('\n').at(-1);
  check(otherCount === '1', 'RLS still isolates the independent user');
  console.log(JSON.stringify({ suite: 'PostgreSQL 18 independent connections', checks, passed: checks, realConcurrency: true, hostedSupabase: false, ownerDataTouched: false }));
} finally {
  for (const child of children) child.kill('SIGTERM');
  if (started) execFileSync(join(bin, 'pg_ctl'), ['-D', join(root, 'db'), '-m', 'immediate', '-w', 'stop'], { stdio: 'ignore' });
  rmSync(root, { recursive: true, force: true });
}
