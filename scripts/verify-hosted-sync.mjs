import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const compiled = process.argv[2];
if (!compiled) {
  const out = mkdtempSync(join(tmpdir(), 'questlife-hosted-sync-'));
  execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', '--module', 'commonjs', '--target', 'es2022', '--moduleResolution', 'node', '--skipLibCheck', '--esModuleInterop', '--outDir', out, '--rootDir', 'src', 'src/sync-v2/engine.ts'], { stdio: 'inherit' });
  execFileSync(process.execPath, [import.meta.filename, out], { stdio: 'inherit', env: { ...process.env, NODE_PATH: join(process.cwd(), 'node_modules') } });
  process.exit(0);
}
const { SyncEngineV2 } = createRequire(import.meta.url)(join(compiled, 'sync-v2/engine.js'));
const { emptySyncState } = createRequire(import.meta.url)(join(compiled, 'sync-v2/contracts.js'));
const secrets = join(homedir(), 'Library/QuestLifeToolchain/secrets');
const pub = JSON.parse(readFileSync(join(secrets, 'supabase-candidate-public.json'), 'utf8'));
const service = JSON.parse(readFileSync(join(secrets, 'supabase-candidate-admin.json'), 'utf8'));
assert.equal(pub.url, 'https://gttcoocfkqwvsqfwxpyo.supabase.co');
assert.equal(service.url, pub.url);
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(service.url, service.key, options);
const users = [], clients = [], checks = [];
const report = { sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), project: 'gttcoocfkqwvsqfwxpyo', testedAt: new Date().toISOString(),
  scope: 'Actual hosted Supabase Auth/password sessions and Sync V2 engine/SQL over HTTPS. Disposable admin-created email-confirmed identities only. Not email OTP delivery, physical-device, or UI acceptance.', checks, cleanup: [] };
const runId = randomUUID();
const check = async (name, fn) => { await fn(); checks.push({ name, result: 'PASS' }); console.log(`${name}: PASS`); };
function replica(client, name, previous) {
  let diskState = previous?.state ?? emptySyncState();
  const visible = previous?.visible ?? new Map();
  const flags = { offline: false, loseAck: false };
  const disk = { read: async () => structuredClone(diskState), write: async state => { diskState = structuredClone(state); }, apply: async changes => {
    for (const change of changes) { if (change.payload) visible.set(change.entityId, change.payload); else visible.delete(change.entityId); }
  } };
  const transport = {
    push: async (owner, mutations) => {
      if (flags.offline) throw new Error('controlled_offline');
      assert.equal((await client.auth.getUser()).data.user?.id, owner);
      const wire = mutations.map(({ attemptCount, lastAttemptAt, lastError, ...mutation }) => mutation);
      const result = await client.rpc('questlife_sync_push', { mutations: wire });
      if (result.error) throw new Error(`push_http_${result.status}_${result.error.code}`);
      if (flags.loseAck) { flags.loseAck = false; throw new Error('controlled_ack_loss_after_remote_commit'); }
      return result.data;
    },
    pull: async (owner, cursor, limit) => {
      if (flags.offline) throw new Error('controlled_offline');
      const result = await client.from('questlife_sync_entities').select('*').eq('user_id', owner).gt('change_seq', cursor).order('change_seq').limit(limit);
      if (result.error) throw new Error(`pull_http_${result.status}_${result.error.code}`);
      return result.data;
    },
  };
  return { engine: new SyncEngineV2(disk, transport, `hosted-${name}-${runId}`, randomUUID), visible, flags, state: () => structuredClone(diskState) };
}
try {
  for (const label of ['a', 'b']) {
    const email = `questlife-candidate-${runId}-${label}@example.com`;
    const password = randomBytes(32).toString('base64url');
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { purpose: 'disposable_release_verification', runId } });
    if (created.error || !created.data.user) throw new Error(`test_identity_create_${created.error?.status ?? 'invalid'}`);
    users.push(created.data.user.id);
    const client = createClient(pub.url, pub.key, options);
    const signed = await client.auth.signInWithPassword({ email, password });
    if (signed.error) throw new Error(`test_signin_${signed.error.status}`);
    clients.push(client);
  }
  await check('real_auth_and_session_restore', async () => {
    const session = (await clients[0].auth.getSession()).data.session;
    const second = createClient(pub.url, pub.key, options);
    assert.equal((await second.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token })).error, null);
    assert.equal((await second.auth.getUser()).data.user?.id, users[0]); clients.push(second);
  });
  const a = replica(clients[0], 'web'), b = replica(clients[2], 'android-code-path');
  await a.engine.attach(users[0], []); await b.engine.attach(users[0], []);
  const id = randomUUID(), row = name => ({ entityType: 'categories', entityId: id, payload: { id, name, createdAt: Date.now() } });
  await check('create_and_second_replica_pull', async () => {
    await a.engine.commit([row('Disposable candidate structure')]); await a.engine.sync(true); await b.engine.sync(true);
    assert.equal(b.visible.get(id)?.name, 'Disposable candidate structure'); assert.equal(a.state().outbox.length, 0);
  });
  await check('reverse_direction_update', async () => {
    await b.engine.commit([row('Updated by second replica')]); await b.engine.sync(true); await a.engine.sync(true);
    assert.equal(a.visible.get(id)?.name, 'Updated by second replica');
  });
  await check('hosted_Realtime_wakes_pull_and_reconnect_recovers', async () => {
    let channel, arrival;
    const statuses = [];
    const systems = [];
    report.realtime = { statuses, systems, waitFor: 'postgres_changes system readiness, not just channel join' };
    const wake = new Promise(resolve => { arrival = resolve; });
    const ready = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('realtime_postgres_ready_timeout')), 30000);
      channel = clients[2].channel(`release-${runId}`).on('postgres_changes', {
        event: '*', schema: 'public', table: 'questlife_sync_entities', filter: `user_id=eq.${users[0]}`,
      }, event => { if (event.new?.entity_id === id) arrival(); }).on('system', {}, event => {
        systems.push({ extension: event.extension, status: event.status });
        if (event.extension === 'postgres_changes' && event.status === 'ok') { clearTimeout(timeout); resolve(); }
        else if (event.status === 'error') { clearTimeout(timeout); reject(new Error(`realtime_system_${event.extension}`)); }
      }).subscribe(status => {
        statuses.push(status);
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') { clearTimeout(timeout); reject(new Error(`realtime_${status}`)); }
      });
    });
    try {
      await ready;
      await a.engine.commit([row('Realtime updated structure')]); await a.engine.sync(true);
      const actual = await clients[0].from('questlife_sync_entities').select('payload').eq('entity_id', id).single();
      assert.equal(actual.data?.payload?.name, 'Realtime updated structure');
      let timer;
      try { await Promise.race([wake, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`realtime_event_timeout_${statuses.join('_')}`)), 30000); })]); }
      finally { clearTimeout(timer); }
      await b.engine.sync(true); assert.equal(b.visible.get(id)?.name, 'Realtime updated structure');
      await clients[2].removeChannel(channel); channel = undefined;
      await a.engine.commit([row('Change while subscription disconnected')]); await a.engine.sync(true);
      await b.engine.sync(true); assert.equal(b.visible.get(id)?.name, 'Change while subscription disconnected');
    } finally { if (channel) await clients[2].removeChannel(channel); }
  });
  await check('hosted_push_binding_retire_and_cross_account_denial_no_delivery', async () => {
    const deviceId = `test-${runId}`, registrationId = randomUUID();
    // A syntactically valid disposable token tests the SQL boundary only. No
    // provider send is made, and no real device token enters this runner.
    const token = `ExpoPushToken[disposable_${runId.replaceAll('-', '')}]`;
    const rpc = async (client, name, args) => { const result = await client.rpc(name, args); assert.equal(result.error, null); return result.data; };
    await rpc(clients[0], 'questlife_device_touch', { p_device_id: deviceId, p_platform: 'android', p_app_version: 'release-verification' });
    const args = { p_device_id: deviceId, p_registration_id: registrationId, p_generation: 1, p_token: token, p_enabled: true };
    assert.equal((await rpc(clients[0], 'questlife_push_register', args)).status, 'registered');
    await rpc(clients[1], 'questlife_device_touch', { p_device_id: deviceId, p_platform: 'android', p_app_version: 'release-verification' });
    assert.ok((await clients[1].rpc('questlife_push_register', args)).error);
    assert.equal((await rpc(clients[1], 'questlife_push_test_claim', { p_device_id: deviceId, p_request_id: randomUUID(), p_send: false })).status, 'disabled');
    const retirement = { p_device_id: deviceId, p_registration_id: registrationId, p_generation: 1 };
    assert.equal((await rpc(clients[0], 'questlife_push_retire', retirement)).status, 'retired');
    assert.equal((await rpc(clients[0], 'questlife_push_retire', retirement)).status, 'retired');
    assert.ok((await clients[0].rpc('questlife_push_register', args)).error);
  });
  await check('RLS_account_isolation_and_direct_write_denial', async () => {
    const read = await clients[1].from('questlife_sync_entities').select('*').eq('user_id', users[0]);
    assert.equal(read.error, null); assert.deepEqual(read.data, []);
    const forbidden = await clients[0].from('questlife_sync_entities').update({ payload: { id, name: 'forbidden' } }).eq('entity_id', id);
    assert.ok(forbidden.error);
    const tokenRead = await clients[0].from('questlife_sync_devices').select('push_token'); assert.ok(tokenRead.error);
  });
  await check('offline_restart_outbox_and_lost_ACK_receipt', async () => {
    a.flags.offline = true; await a.engine.commit([row('Offline retained draft')]); await a.engine.sync(true);
    assert.equal(a.state().outbox.length, 1);
    const restored = replica(clients[0], 'restored', { state: a.state(), visible: new Map(a.visible) });
    await restored.engine.attach(users[0], []); restored.flags.loseAck = true;
    await restored.engine.sync(true); assert.equal(restored.state().outbox.length, 1);
    await restored.engine.sync(true); assert.equal(restored.state().outbox.length, 0);
    await b.engine.sync(true); assert.equal(b.visible.get(id)?.name, 'Offline retained draft');
    a.flags.offline = false; a.engine.detach();
  });
  await check('delete_tombstone_and_stale_replica_conflict', async () => {
    const c = replica(clients[0], 'fresh'); await c.engine.attach(users[0], []); await c.engine.sync(true);
    await c.engine.commit([row('stale local edit')]);
    await b.engine.commit([{ entityType: 'categories', entityId: id, payload: null }]); await b.engine.sync(true);
    await c.engine.sync(true); assert.ok(c.state().conflicts.some(x => x.entityId === id));
    const remote = await clients[0].from('questlife_sync_entities').select('*').eq('entity_id', id).single();
    assert.equal(remote.error, null); assert.equal(remote.data.payload, null); assert.ok(remote.data.deleted_at);
    const fresh = replica(clients[0], 'after-delete'); await fresh.engine.attach(users[0], []); await fresh.engine.sync(true); assert.equal(fresh.visible.has(id), false);
  });
  await check('unauthenticated_RPC_denied', async () => {
    const anon = createClient(pub.url, pub.key, options);
    assert.ok((await anon.rpc('questlife_sync_push', { mutations: [] })).error);
    assert.ok((await anon.rpc('questlife_device_touch', { p_device_id: 'hosted-test', p_platform: 'web', p_app_version: '1' })).error);
  });
  await check('candidate_authenticated_Quant_and_subject_isolation', async () => {
    const access = (await clients[0].auth.getSession()).data.session.access_token;
    const asOf = new Date().toISOString();
    const request = { runtimeVersion: 'questlife.owner-quant-runtime-client.v1', subjectId: users[0], configuredTimezone: 'Asia/Shanghai', asOf, appData: {} };
    const call = body => fetch('https://questlife-v1-release.vercel.app/api/decision-quant', {
      method: 'POST', headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: AbortSignal.timeout(25000),
    });
    const valid = await call(request), result = await valid.json();
    assert.equal(valid.status, 200, result.error); assert.equal(result.eligible_observation_count, 0);
    assert.equal(result.request_context.subject_id, users[0]); assert.equal(result.request_context.as_of, asOf);
    const other = await call({ ...request, subjectId: users[1] }); assert.equal(other.status, 403);
    report.quantReceipt = { status: valid.status, subjectBound: true, eligibleObservations: result.eligible_observation_count,
      quantCommit: result.quant_source_commit, sourceSnapshotHash: result.source_snapshot_hash };
  });
} catch (error) {
  report.failure = error instanceof Error ? error.message : 'verification_failed';
  console.error(report.failure); process.exitCode = 1;
} finally {
  for (const [index, id] of users.entries()) {
    const result = await admin.auth.admin.deleteUser(id);
    const gone = await admin.auth.admin.getUserById(id);
    // The test user's still-valid JWT can read only its own rows. Do not widen
    // service_role privileges just to inspect cascade cleanup from this runner.
    const rows = clients[index] ? await clients[index].from('questlife_sync_entities').select('entity_id', { count: 'exact' }).eq('user_id', id) : null;
    const clean = !result.error && gone.error?.status === 404 && !!rows && !rows.error && rows.count === 0;
    report.cleanup.push({ userId: id, deleted: clean, remainingEntities: rows?.count ?? null,
      ...(rows?.error ? { verificationStatus: rows.status, verificationError: rows.error.code } : {}) });
    if (!clean) process.exitCode = 1;
  }
  for (const client of clients) {
    await client.removeAllChannels(); client.realtime.disconnect();
    await client.auth.signOut().catch(() => undefined);
  }
  mkdirSync('reports/release', { recursive: true });
  writeFileSync('reports/release/hosted-sync-verification.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: checks.length, cleanup: report.cleanup.map(x => x.deleted), failure: report.failure ?? null }));
}
