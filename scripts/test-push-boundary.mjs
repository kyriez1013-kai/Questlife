import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import Module, { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = mkdtempSync(join(tmpdir(), 'questlife-push-boundary-'));
function run(args, env) {
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit', env });
  assert.equal(result.status, 0, 'test compilation/execution failed');
}
run([join(root, 'node_modules/typescript/bin/tsc'), '--module', 'commonjs', '--target', 'es2022',
  '--moduleResolution', 'node', '--jsx', 'react-jsx', '--strict', '--skipLibCheck', '--esModuleInterop', '--resolveJsonModule',
  '--rootDir', root, '--outDir', out, join(root, 'api/push-test.ts'),
  join(root, 'src/sync-v2/supabase.ts'), join(root, 'src/sync-v2/pushRegistryCore.test.ts')]);
symlinkSync(join(root, 'node_modules'), join(out, 'node_modules'), 'dir');
run([join(out, 'src/sync-v2/pushRegistryCore.test.js')]);
const require = createRequire(join(out, 'test.cjs'));
const db = new PGlite(); // Deliberately no database URL or hosted credentials.
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const DEVICE = 'ios:fixture-device';
const TOKEN = 'ExpoPushToken[push_fixture_token_123456]';
const REG = randomUUID();
await db.exec(`create role anon; create role authenticated; create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth,public to authenticated,anon;
grant execute on function auth.uid() to authenticated,anon;`);
await db.exec(readFileSync(join(root, 'supabase/migrations/202609180001_sync_v2.sql'), 'utf8'));
await db.exec(readFileSync(join(root, 'supabase/migrations/202609200002_device_push_boundary.sql'), 'utf8'));
await db.query('insert into auth.users values($1),($2)', [A, B]);
async function queryAs(user, sql, params = [], role = 'authenticated') {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${role}`);
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [user]);
    return tx.query(sql, params);
  });
}
const signatures = {
  questlife_device_touch: ['p_device_id', 'p_platform', 'p_app_version'],
  questlife_push_register: ['p_device_id', 'p_registration_id', 'p_generation', 'p_token', 'p_enabled'],
  questlife_push_retire: ['p_device_id', 'p_registration_id', 'p_generation'],
  questlife_push_test_claim: ['p_device_id', 'p_request_id', 'p_send'],
  questlife_push_test_finish: ['p_device_id', 'p_registration_id', 'p_request_id', 'p_status', 'p_ticket_id'],
};
async function rpc(user, name, args) {
  const fields = signatures[name];
  assert.ok(fields, 'only known fixture RPCs may execute');
  const result = await queryAs(user, `select public.${name}(${fields.map((key, i) => `${key} => $${i + 1}`).join(',')}) as result`, fields.map((key) => args[key] ?? null));
  return result.rows[0].result;
}
const touch = (user, device = DEVICE) => rpc(user, 'questlife_device_touch', { p_device_id: device, p_platform: 'ios', p_app_version: '1.0.0' });
const registerArgs = { p_device_id: DEVICE, p_registration_id: REG, p_generation: 1, p_token: TOKEN, p_enabled: true };
const retireArgs = { p_device_id: DEVICE, p_registration_id: REG, p_generation: 1 };
let checks = 0;
async function check(name, job) { await job(); checks++; console.log(`PASS ${name}`); }
const originalLoad = Module._load;
const originalFetch = globalThis.fetch;
let auth;
try {
  await check('migration grants no anonymous registry or direct authenticated token writes', async () => {
    await assert.rejects(queryAs('', 'select public.questlife_device_touch($1,$2,$3)', [DEVICE, 'ios', '1'], 'anon'));
    await assert.rejects(touch(''));
    await touch(A);
    await assert.rejects(queryAs(A, 'update public.questlife_sync_devices set push_token=$1', [TOKEN]));
    await assert.rejects(queryAs(A, 'select push_token from public.questlife_sync_devices'));
    assert.equal((await queryAs(B, 'select platform,name from public.questlife_sync_devices')).rows.length, 0);
  });
  await check('registration uses auth.uid and prevents account/token/device rebinding', async () => {
    assert.equal((await rpc(A, 'questlife_push_register', registerArgs)).status, 'registered');
    await touch(B);
    await assert.rejects(rpc(B, 'questlife_push_register', { ...registerArgs, p_registration_id: randomUUID() }));
    await assert.rejects(rpc(A, 'questlife_push_register', { ...registerArgs, p_enabled: false }));
    await assert.rejects(rpc(A, 'questlife_push_register', { ...registerArgs, p_token: 'not-an-expo-token' }));
    await rpc(B, 'questlife_push_retire', retireArgs);
    assert.equal((await db.query('select push_token from public.questlife_sync_devices where user_id=$1', [A])).rows[0].push_token, TOKEN);
  });
  await check('exact-generation retirement is idempotent and blocks delayed registration resurrection', async () => {
    await rpc(A, 'questlife_push_retire', retireArgs);
    await rpc(A, 'questlife_push_retire', retireArgs);
    await assert.rejects(rpc(A, 'questlife_push_register', registerArgs));
    const next = { ...registerArgs, p_generation: 2, p_registration_id: randomUUID() };
    await rpc(A, 'questlife_push_register', next);
    assert.equal((await rpc(A, 'questlife_push_retire', retireArgs)).status, 'superseded');
    await rpc(A, 'questlife_push_retire', { p_device_id: DEVICE, p_registration_id: next.p_registration_id, p_generation: 2 });
    await assert.rejects(rpc(A, 'questlife_push_register', registerArgs));
    await rpc(A, 'questlife_push_register', { ...registerArgs, p_generation: 3 });
  });
  await check('every push RPC rejects anonymous role and missing auth.uid', async () => {
    for (const [sql, args] of [
      ['select public.questlife_push_register($1,$2,$3,$4,$5)', [DEVICE, REG, 4, TOKEN, true]],
      ['select public.questlife_push_retire($1,$2,$3)', [DEVICE, REG, 4]],
      ['select public.questlife_push_test_claim($1,$2,$3)', [DEVICE, randomUUID(), true]],
      ['select public.questlife_push_test_finish($1,$2,$3,$4,$5)', [DEVICE, REG, randomUUID(), 'accepted', 'fixture']],
    ]) {
      await assert.rejects(queryAs('', sql, args, 'anon'));
      await assert.rejects(queryAs('', sql, args));
    }
  });
  await check('expired leases cannot send and stale provider results cannot retire a newer generation', async () => {
    const device = 'ios:expiry-fixture', first = randomUUID(), second = randomUUID(), requestId = randomUUID();
    await touch(A, device);
    const args = { ...registerArgs, p_device_id: device, p_token: 'ExpoPushToken[expiry_fixture_12345]', p_registration_id: first };
    await rpc(A, 'questlife_push_register', args);
    await rpc(A, 'questlife_push_test_claim', { p_device_id: device, p_request_id: requestId, p_send: true });
    await rpc(A, 'questlife_push_retire', { p_device_id: device, p_registration_id: first, p_generation: 1 });
    await rpc(A, 'questlife_push_register', { ...args, p_registration_id: second, p_generation: 2 });
    assert.equal((await rpc(A, 'questlife_push_test_finish', { p_device_id: device, p_registration_id: first,
      p_request_id: requestId, p_status: 'device_unregistered' })).status, 'superseded');
    assert.equal((await db.query('select push_enabled from public.questlife_sync_devices where user_id=$1 and device_id=$2', [A, device])).rows[0].push_enabled, true);
    await db.query("update public.questlife_sync_devices set push_expires_at=now()-interval '1 second' where user_id=$1 and device_id=$2", [A, device]);
    assert.equal((await rpc(A, 'questlife_push_test_claim', { p_device_id: device, p_request_id: randomUUID(), p_send: true })).status, 'disabled');
  });

  const SUPABASE = 'https://push-auth.example.test';
  Object.assign(process.env, { SUPABASE_URL: SUPABASE, SUPABASE_ANON_KEY: 'sb_publishable_push_fixture',
    EXPO_PUBLIC_SUPABASE_URL: SUPABASE, EXPO_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_push_fixture',
    EXPO_PUSH_ACCESS_TOKEN: 'fixture-expo-provider-access' });
  const tokenFor = (id) => [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'),
    Buffer.from(JSON.stringify({ sub: id, aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url'), Buffer.from('fixture-signature').toString('base64url')].join('.');
  const bearerA = tokenFor(A), bearerB = tokenFor(B);
  const users = new Map([[bearerA, A], [bearerB, B]]);
  const user = (id) => ({ id, aud: 'authenticated', role: 'authenticated', email: 'fixture@example.test', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' });
  const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
  const network = [];
  let registryOnline = true;
  let expoReply = { data: { status: 'ok', id: 'fixture-ticket-id' } };
  let receiptReply = { data: {} };
  let loseRegisterAck = false;
  let loseProviderAck = false;
  const store = new Map();
  let syncOwner = A;
  let notificationsEnabled = true;
  Module._load = function (name, parent, isMain) {
    if (name === 'react-native-url-polyfill/auto') return {};
    if (name === 'react-native') return { Platform: { OS: 'web' }, Linking: {} };
    if (name === 'expo-crypto') return { randomUUID, CryptoDigestAlgorithm: { SHA256: 'sha256' }, digestStringAsync: async (_algorithm, value) => createHash('sha256').update(value).digest('hex') };
    if (name === './sessionStorage' && /\/src\/sync-v2\/(supabase|pushRegistry)\.js$/.test(parent?.filename ?? '')) return { sessionStorage: {
      getItem: async (key) => store.get(key) ?? null, setItem: async (key, value) => { store.set(key, value); }, removeItem: async (key) => { store.delete(key); },
    } };
    if (parent?.filename.endsWith('/src/sync-v2/pushRegistry.js')) {
      if (name === './device') return { getSyncDevice: async () => ({ id: 'ios:wrapper-device', platform: 'ios', appVersion: '1.0.0' }) };
      if (name === './runtime') return { readSyncState: async () => ({ ownerId: syncOwner }) };
      if (name === '../platform/services') return { deviceRepository: { read: async () => ({ notificationsEnabled }) } };
    }
    return originalLoad.call(this, name, parent, isMain);
  };
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input), headers = new Headers(init.headers);
    const owner = users.get(headers.get('authorization')?.replace(/^Bearer /, ''));
    network.push({ url, headers, init, owner });
    if (url.startsWith(`${SUPABASE}/auth/v1/user`)) return owner ? json(user(owner)) : json({ error: 'invalid' }, 401);
    if (url.startsWith(`${SUPABASE}/auth/v1/logout`)) return new Response(null, { status: 204 });
    if (url.startsWith(`${SUPABASE}/rest/v1/rpc/`)) {
      if (!owner) return json({}, 401);
      if (!registryOnline) return json({}, 503);
      const name = url.split('/').at(-1);
      try {
        const result = await rpc(owner, name, JSON.parse(init.body));
        if (loseRegisterAck && name === 'questlife_push_register') { registryOnline = false; throw new Error('lost ACK'); }
        return json(result);
      } catch { return json({ error: 'fixture_rpc_failed' }, 400); }
    }
    if (url === 'https://exp.host/--/api/v2/push/send') {
      if (loseProviderAck) throw new Error('Fixture lost provider ACK');
      return json(expoReply);
    }
    if (url === 'https://exp.host/--/api/v2/push/getReceipts') return json(receiptReply);
    throw new Error('Unexpected network destination');
  };
  const endpoint = require(join(out, 'api/push-test.js')).default;
  async function invoke(body, bearer = bearerA) {
    const sink = { statusCode: 0, body: null, setHeader() {}, status(value) { this.statusCode = value; return this; }, json(value) { this.body = value; return this; } };
    await endpoint({ method: 'POST', body, headers: bearer ? { authorization: `Bearer ${bearer}` } : {} }, sink);
    assert.ok(!JSON.stringify(sink.body).includes('PushToken['));
    return sink;
  }
  const expoCount = () => network.filter((item) => item.url.endsWith('/push/send')).length;
  const request = { deviceId: DEVICE, requestId: randomUUID(), action: 'send' };
  await check('push API rejects unauthenticated, forged bearer, custom content and cross-account device', async () => {
    const before = expoCount();
    assert.equal((await invoke(request, null)).statusCode, 401);
    assert.equal((await invoke(request, 'forged-token')).statusCode, 401);
    assert.equal((await invoke({ ...request, health: { private: true } })).statusCode, 400);
    assert.equal((await invoke({ ...request, to: TOKEN })).statusCode, 400);
    assert.equal((await invoke({ ...request, userId: B })).statusCode, 400);
    assert.equal((await invoke({ ...request, deviceId: '字'.repeat(350) })).statusCode, 413);
    assert.equal((await invoke(request, bearerB)).statusCode, 409);
    assert.equal(expoCount(), before);
  });
  await check('manual delivery has generic payload, cooldown, durable duplicate suppression and no bearer leakage', async () => {
    const first = await invoke(request);
    assert.equal(first.statusCode, 202);
    assert.equal(first.body.status, 'accepted');
    assert.equal(first.body.delivered, false);
    const sent = network.filter((item) => item.url.endsWith('/push/send')).at(-1);
    const body = JSON.parse(sent.init.body);
    assert.deepEqual(Object.keys(body.data).sort(), ['kind', 'registrationId', 'source']);
    assert.equal(body.body, 'Open QuestLife.');
    assert.equal(body.ttl, 60);
    assert.ok(!sent.init.body.includes(A));
    assert.equal(sent.headers.get('authorization'), 'Bearer fixture-expo-provider-access');
    const before = expoCount();
    assert.equal((await invoke(request)).body.status, 'accepted');
    assert.equal(expoCount(), before);
    assert.equal((await invoke({ ...request, requestId: randomUUID() })).statusCode, 429);
  });
  await check('receipt states never claim device delivery and DeviceNotRegistered retires only exact binding', async () => {
    assert.equal((await invoke({ ...request, action: 'receipt' })).body.status, 'receipt_pending');
    receiptReply = { data: { 'fixture-ticket-id': { status: 'error', details: { error: 'DeviceNotRegistered' } } } };
    const receipt = await invoke({ ...request, action: 'receipt' });
    assert.equal(receipt.body.status, 'device_unregistered');
    assert.equal(receipt.body.delivered, false);
    assert.equal((await invoke({ ...request, requestId: randomUUID() })).statusCode, 409);
    assert.equal((await db.query('select push_token from public.questlife_sync_devices where user_id=$1 and device_id=$2', [A, DEVICE])).rows[0].push_token, null);
  });
  await check('lost provider ACK leaves a durable pending claim and retries never duplicate send', async () => {
    const device = 'ios:provider-ack-fixture';
    await touch(A, device);
    await rpc(A, 'questlife_push_register', { ...registerArgs, p_device_id: device,
      p_token: 'ExpoPushToken[provider_ack_fixture_123]', p_registration_id: randomUUID() });
    const payload = { ...request, deviceId: device, requestId: randomUUID() };
    loseProviderAck = true;
    assert.equal((await invoke(payload)).statusCode, 503);
    loseProviderAck = false;
    const before = expoCount();
    assert.equal((await invoke(payload)).body.status, 'pending');
    assert.equal(expoCount(), before);
  });
  await check('successful provider receipt is explicitly not proof of device delivery', async () => {
    const device = 'ios:provider-receipt-fixture';
    await touch(A, device);
    await rpc(A, 'questlife_push_register', { ...registerArgs, p_device_id: device,
      p_token: 'ExpoPushToken[provider_receipt_fixture_123]', p_registration_id: randomUUID() });
    const payload = { ...request, deviceId: device, requestId: randomUUID() };
    assert.equal((await invoke(payload)).statusCode, 202);
    receiptReply = { data: { 'fixture-ticket-id': { status: 'ok' } } };
    assert.deepEqual((await invoke({ ...payload, action: 'receipt' })).body,
      { ok: true, status: 'provider_accepted', delivered: false });
  });

  const { supabaseClient, authService } = require(join(out, 'src/sync-v2/supabase.js'));
  const client = require(join(out, 'src/sync-v2/pushRegistry.js'));
  auth = supabaseClient().auth;
  async function signIn(token = bearerA) { assert.equal((await auth.setSession({ access_token: token, refresh_token: 'fixture-refresh' })).error, null); }
  const input = { expectedUserId: A, expoPushToken: TOKEN, notificationsEnabled: true, permissionGranted: true };
  await check('production registration helper uses actual session and persisted notifications preference', async () => {
    assert.equal((await client.syncDevicePushRegistration(input)).status, 'auth_required');
    await signIn();
    notificationsEnabled = false;
    assert.equal((await client.syncDevicePushRegistration(input)).status, 'disabled');
    notificationsEnabled = true;
    assert.equal((await client.syncDevicePushRegistration(input)).status, 'registered');
    const journal = store.get('questlife.push.registry.v1');
    assert.ok(!journal.includes(TOKEN) && !journal.includes(bearerA));
    assert.equal(await client.matchesCurrentPushRegistration(JSON.parse(journal).binding.registrationId), true);
    assert.equal(await client.matchesCurrentPushRegistration(REG), false);
  });
  await check('production Settings callback requires ACK and persisted disable retires on retry', async () => {
    await client.registerNativePushToken(TOKEN, A);
    await assert.rejects(client.registerNativePushToken(TOKEN, B), /push_account_mismatch/);
    notificationsEnabled = false;
    await assert.rejects(client.registerNativePushToken(TOKEN, A), /push_disabled/);
    notificationsEnabled = true;
    await client.registerNativePushToken(TOKEN, A);
    const registrationId = JSON.parse(store.get('questlife.push.registry.v1')).binding.registrationId;
    notificationsEnabled = false;
    await client.retryPendingPushRetirement();
    assert.equal(await client.matchesCurrentPushRegistration(registrationId), false);
    assert.equal(JSON.parse(store.get('questlife.push.registry.v1')).binding, null);
    notificationsEnabled = true;
    await client.registerNativePushToken(TOKEN, A);
  });
  await check('authService sign-out defers SDK logout on failed retirement and durable retry completes it', async () => {
    registryOnline = false;
    await assert.rejects(authService.signOut(), /push_retirement_pending/);
    assert.equal((await auth.getSession()).data.session.user.id, A);
    assert.equal(JSON.parse(store.get('questlife.push.registry.v1')).binding.phase, 'retiring');
    registryOnline = true;
    await client.retryPendingPushRetirement();
    assert.equal((await auth.getSession()).data.session, null);
    assert.equal(JSON.parse(store.get('questlife.push.registry.v1')).binding, null);
    assert.equal((await db.query('select push_token from public.questlife_sync_devices where user_id=$1 and device_id=$2', [A, 'ios:wrapper-device'])).rows[0].push_token, null);
  });
  await check('lost registration ACK persists retirement and never reuses A token under B', async () => {
    await signIn();
    loseRegisterAck = true;
    assert.equal((await client.syncDevicePushRegistration(input)).status, 'retirement_pending');
    const pending = JSON.parse(store.get('questlife.push.registry.v1'));
    assert.equal(pending.binding.userId, A);
    await signIn(bearerB);
    syncOwner = B;
    const before = network.length;
    assert.equal((await client.syncDevicePushRegistration({ ...input, expectedUserId: B })).status, 'account_mismatch');
    assert.equal(network.length, before);
    assert.equal(await client.matchesCurrentPushRegistration(pending.binding.registrationId), false);
    loseRegisterAck = false;
    registryOnline = true;
    await signIn(); syncOwner = A;
    await client.retryPendingPushRetirement();
    await authService.signOut();
    assert.equal((await auth.getSession()).data.session, null);
  });
  console.log(`Push boundary: ${checks} integration groups passed; actual local PostgreSQL RLS/RPC, production wrapper and real Supabase SDK; fixture network only, no hosted migration or delivery.`);
} finally {
  await auth?.stopAutoRefresh();
  Module._load = originalLoad;
  globalThis.fetch = originalFetch;
  await db.close();
  rmSync(out, { recursive: true, force: true });
}
