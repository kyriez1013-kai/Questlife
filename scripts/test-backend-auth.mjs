import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Module, { createRequire } from 'node:module';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = mkdtempSync(join(tmpdir(), 'questlife-backend-auth-'));
const compile = spawnSync(process.execPath, [
  join(root, 'node_modules/typescript/bin/tsc'), '--module', 'commonjs', '--target', 'es2022',
  '--moduleResolution', 'node', '--jsx', 'react-jsx', '--esModuleInterop', '--resolveJsonModule',
  '--skipLibCheck', '--strict', '--rootDir', root, '--outDir', out,
  join(root, 'api/sync.ts'), join(root, 'api/decision-quant.ts'),
  join(root, 'src/adaptive-decision/ownerQuantRuntime.ts'),
], { cwd: root, stdio: 'inherit' });
if (compile.status !== 0) {
  rmSync(out, { recursive: true, force: true });
  process.exit(compile.status ?? 1);
}
symlinkSync(join(root, 'node_modules'), join(out, 'node_modules'), 'dir');
const require = createRequire(join(out, 'test.cjs'));
const UID = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const SUPABASE = 'https://auth.example.test';
const QUANT = 'https://quant.example.test/api/decision_artifacts';
const PUBLIC_KEY = 'sb_publishable_boundary_test_only';
Object.assign(process.env, {
  SUPABASE_URL: SUPABASE, SUPABASE_ANON_KEY: PUBLIC_KEY,
  EXPO_PUBLIC_SUPABASE_URL: SUPABASE, EXPO_PUBLIC_SUPABASE_ANON_KEY: PUBLIC_KEY,
  QUESTLIFE_QUANT_RUNTIME_URL: QUANT, QUESTLIFE_QUANT_RUNTIME_TOKEN: 'runtime-test-only',
  EXPO_PUBLIC_API_ORIGIN: 'https://app.example.test',
});
const fixture = require(join(root, 'src/quant-product/fixtures/forming_history_full.json'));
const AS_OF = fixture.metadata.as_of;
let syncState = { ownerId: UID, healthConsent: false };
const storage = new Map();
const originalLoad = Module._load;
// Native persistence/Sync journal I/O and the platform host are replaced. The production Supabase
// module, real SDK auth lifecycle, wrapper, API and remote verification code run.
Module._load = function (name, parent, isMain) {
  if (name === 'react-native-url-polyfill/auto') return {};
  if (name === 'react-native') return { Platform: { OS: 'web' }, Linking: {} };
  if (name === './sessionStorage' && parent?.filename.endsWith('/src/sync-v2/supabase.js')) {
    return { sessionStorage: {
      getItem: async (key) => storage.get(key) ?? null,
      setItem: async (key, value) => { storage.set(key, value); },
      removeItem: async (key) => { storage.delete(key); },
    } };
  }
  if (name === '../sync-v2/runtime' && parent?.filename.endsWith('/src/adaptive-decision/ownerQuantRuntime.js')) {
    return { readSyncState: async () => ({ ...syncState }) };
  }
  return originalLoad.call(this, name, parent, isMain);
};
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const user = (id) => ({ id, aud: 'authenticated', role: 'authenticated', email: 'fixture@example.test',
  app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' });
const token = (id) => [
  Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
  Buffer.from(JSON.stringify({ sub: id, aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url'),
  'test-signature-not-a-real-credential',
].join('.');
const tokens = new Map([[token(UID), UID], [token(OTHER), OTHER]]);
const TOKEN = [...tokens.keys()][0];
const OTHER_TOKEN = [...tokens.keys()][1];
let calls = [];
let quantOverride;
let authOverride;
let tamperReceipt = false;
let apiHandler;
function upstream(body) {
  return {
    ok: true, as_of: body.as_of, source_snapshot_hash: 'runtime-input-hash',
    eligible_observation_count: 12, excluded_observation_count: 0, cache_hit: false,
    product: { ...fixture, metadata: { ...fixture.metadata, subject_id: body.subject_id,
      synthetic_only: false, contains_real_user_data: true } }, analysis: null,
  };
}
function responseSink() {
  return { statusCode: 0, body: undefined, headers: {},
    setHeader(key, value) { this.headers[key] = value; },
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; return this; },
  };
}
async function invoke(handler, body, authorization = `Bearer ${TOKEN}`, method = 'POST') {
  const res = responseSink();
  await handler({ method, body, headers: authorization === null ? {} : { authorization } }, res);
  return res;
}
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init = {}) => {
  const url = String(input);
  const headers = new Headers(init.headers);
  calls.push({ url, init, headers });
  if (url.startsWith(`${SUPABASE}/auth/v1/user`)) {
    if (authOverride) return authOverride();
    const id = tokens.get(headers.get('authorization')?.replace(/^Bearer /, ''));
    return id ? json(user(id)) : json({ error: 'invalid token' }, 401);
  }
  if (url.startsWith(`${SUPABASE}/auth/v1/logout`)) return new Response(null, { status: 204 });
  if (url === QUANT) {
    const body = JSON.parse(init.body);
    return quantOverride ? quantOverride(body) : json(upstream(body));
  }
  if (url === 'https://app.example.test/api/decision-quant' || url === '/api/decision-quant') {
    const result = await invoke(apiHandler, JSON.parse(init.body), headers.get('authorization'));
    if (tamperReceipt && result.body.request_context) result.body.request_context.snapshot_hash = 'tampered';
    return json(result.body, result.statusCode);
  }
  throw new Error(`Unexpected fixture network destination: ${new URL(url).origin}`);
};
const countQuant = () => calls.filter((call) => call.url === QUANT).length;
let checks = 0;
async function check(name, run) {
  await run();
  checks++;
  console.log(`PASS ${name}`);
}
let auth;
try {
  const legacy = require(join(out, 'api/sync.js')).default;
  apiHandler = require(join(out, 'api/decision-quant.js')).default;
  const client = require(join(out, 'src/adaptive-decision/ownerQuantRuntime.js'));
  const { DEFAULT_DATA } = require(join(out, 'src/types.js'));
  const request = { runtimeVersion: client.OWNER_QUANT_RUNTIME_VERSION, subjectId: UID,
    configuredTimezone: 'UTC', asOf: AS_OF, appData: {} };
  await check('retired anonymous endpoint never reads, writes or acknowledges deletions', async () => {
    for (const method of ['POST', 'GET', 'DELETE', 'OPTIONS']) {
      const before = calls.length;
      const result = await invoke(legacy, { anonymousUserId: OTHER, collections: { executionLogs: [{ id: 'forged' }] }, deletions: { executionLogs: ['private'] } }, null, method);
      assert.equal(result.statusCode, 410);
      assert.equal(result.body.ok, false);
      assert.equal(result.body.deletions, undefined);
      assert.equal(result.headers['Cache-Control'], 'no-store');
      assert.equal(calls.length, before);
    }
  });
  await check('no auth and malformed bearer fail before upstream', async () => {
    for (const bearer of [null, '', 'Basic token', 'Bearer a,b', ['Bearer a', 'Bearer b']]) {
      const before = calls.length;
      assert.equal((await invoke(apiHandler, request, bearer)).statusCode, 401);
      assert.equal(calls.length, before);
    }
  });
  await check('wrong token and forged JWT claims do not authenticate', async () => {
    const before = countQuant();
    for (const bearer of ['Bearer invalid-token', `Bearer ${token('33333333-3333-4333-8333-333333333333')}`]) {
      assert.equal((await invoke(apiHandler, request, bearer)).statusCode, 401);
    }
    assert.equal(countQuant(), before);
  });
  await check('verified uid owns request and mismatched subject is forbidden', async () => {
    const before = countQuant();
    assert.equal((await invoke(apiHandler, { ...request, subjectId: OTHER })).statusCode, 403);
    assert.equal((await invoke(apiHandler, request, `Bearer ${OTHER_TOKEN}`)).statusCode, 403);
    assert.equal(countQuant(), before);
    const { subjectId: _ignored, ...noSubject } = request;
    const result = await invoke(apiHandler, noSubject);
    assert.equal(result.statusCode, 200);
    const sent = calls.filter((call) => call.url === QUANT).at(-1);
    assert.equal(JSON.parse(sent.init.body).subject_id, UID);
    assert.equal(JSON.parse(sent.init.body).mode, 'owner');
    assert.deepEqual(Object.keys(JSON.parse(sent.init.body)).sort(), ['app_data', 'as_of', 'configured_timezone', 'mode', 'subject_id']);
    assert.equal(sent.headers.get('X-QuestLife-Subject-Id'), UID);
    assert.equal(sent.headers.get('authorization'), 'Bearer runtime-test-only');
    assert.equal(sent.init.redirect, 'error');
    assert.equal(result.body.request_context.subject_id, UID);
    assert.equal(result.headers['Cache-Control'], 'private, no-store');
    const verification = calls.filter((call) => call.url.endsWith('/auth/v1/user')).at(-1);
    assert.equal(verification.headers.get('apikey'), PUBLIC_KEY);
    assert.equal(verification.init.redirect, 'error');
    const spoofed = responseSink();
    await apiHandler({ method: 'POST', body: request, headers: {
      authorization: `Bearer ${TOKEN}`, 'x-questlife-subject-id': OTHER,
    } }, spoofed);
    assert.equal(spoofed.statusCode, 200);
    assert.equal(calls.filter((call) => call.url === QUANT).at(-1).headers.get('X-QuestLife-Subject-Id'), UID);
  });
  await check('missing auth config fails closed without falling back to a service key', async () => {
    delete process.env.SUPABASE_ANON_KEY;
    assert.equal((await invoke(apiHandler, request)).statusCode, 503);
    process.env.SUPABASE_ANON_KEY = 'sb_secret_forbidden_test_only';
    assert.equal((await invoke(apiHandler, request)).statusCode, 503);
    process.env.SUPABASE_ANON_KEY = PUBLIC_KEY;
    process.env.SUPABASE_URL = 'http://remote.example.test';
    assert.equal((await invoke(apiHandler, request)).statusCode, 503);
    process.env.SUPABASE_URL = SUPABASE;
  });
  await check('auth outages and malformed verified user fail closed', async () => {
    const before = countQuant();
    for (const reply of [() => json({}, 503), () => json({ id: 'not-a-uid' }), () => { throw new Error('network'); }]) {
      authOverride = reply;
      assert.equal((await invoke(apiHandler, request)).statusCode, 503);
    }
    authOverride = undefined;
    assert.equal(countQuant(), before);
  });
  await check('UTF-8 byte limit applies to raw and parsed bodies, including exact boundary', async () => {
    const body = { ...request, appData: { padding: '\u754c'.repeat(640_000) } };
    assert.ok(JSON.stringify(body).length < 1_900_000);
    for (const value of [body, JSON.stringify(body)]) assert.equal((await invoke(apiHandler, value)).statusCode, 413);
    const base = { ...request, appData: { padding: '' } };
    base.appData.padding = 'x'.repeat(1_900_000 - Buffer.byteLength(JSON.stringify(base)));
    assert.equal(Buffer.byteLength(JSON.stringify(base)), 1_900_000);
    assert.equal((await invoke(apiHandler, base)).statusCode, 200);
    assert.ok(Buffer.byteLength(calls.filter((call) => call.url === QUANT).at(-1).init.body) <= 1_900_000);
    base.appData.padding += 'x';
    assert.equal((await invoke(apiHandler, base)).statusCode, 413);
    assert.equal((await invoke(apiHandler, '{invalid')).statusCode, 400);
    assert.equal((await invoke(apiHandler, { ...request, asOf: 'yesterday' })).statusCode, 400);
    assert.equal((await invoke(apiHandler, request, null, 'GET')).statusCode, 405);
  });
  await check('unconfigured Quant is unavailable, not insufficient observations', async () => {
    delete process.env.QUESTLIFE_QUANT_RUNTIME_URL;
    const result = await invoke(apiHandler, request);
    assert.equal(result.statusCode, 503);
    assert.equal(result.body.error, 'quant_runtime_not_configured');
    assert.equal(result.body.eligible_observation_count, undefined);
    process.env.QUESTLIFE_QUANT_RUNTIME_URL = QUANT;
    delete process.env.QUESTLIFE_QUANT_RUNTIME_TOKEN;
    assert.equal((await invoke(apiHandler, request)).statusCode, 503);
    process.env.QUESTLIFE_QUANT_RUNTIME_TOKEN = 'runtime-test-only';
  });
  await check('Quant failures, false insufficiency and cross-account/as-of replies are rejected', async () => {
    const replies = [
      () => json({ error: 'PRIVATE UPSTREAM DETAILS' }, 401),
      () => new Response('PRIVATE UPSTREAM DETAILS', { status: 503 }),
      () => new Response('invalid json'),
      () => json({ ok: true }),
      (b) => json({ ...upstream(b), eligible_observation_count: -1 }),
      (b) => json({ ...upstream(b), eligible_observation_count: 0 }),
      (b) => json({ ...upstream(b), as_of: '2020-01-01T00:00:00Z' }),
      (b) => json(upstream({ ...b, subject_id: OTHER })),
      (b) => json({ ...upstream(b), analysis: { base_bundle_id: 'another-users-bundle', as_of: b.as_of } }),
    ];
    for (const reply of replies) {
      quantOverride = reply;
      const result = await invoke(apiHandler, request);
      assert.equal(result.statusCode, 502);
      assert.ok(!JSON.stringify(result.body).includes('PRIVATE'));
      assert.equal(result.body.product, undefined);
    }
    quantOverride = undefined;
  });
  const { supabaseClient } = require(join(out, 'src/sync-v2/supabase.js'));
  auth = supabaseClient().auth;
  const signIn = async (accessToken = TOKEN) => {
    const result = await auth.setSession({ access_token: accessToken, refresh_token: 'fixture-refresh' });
    assert.equal(result.error, null);
  };
  const appData = { ...DEFAULT_DATA, contextLogs: [
    { id: 'manual-steps', type: 'body', label: 'steps', value: 100, source: 'manual' },
    { id: 'health:private-sample', type: 'body', label: 'steps', value: 9000, source: 'healthkit' },
  ] };
  const loadInput = { data: appData, timezone: 'UTC', asOf: AS_OF };
  await check('real request wrapper requires existing Supabase session, no anonymous fallback', async () => {
    const before = countQuant();
    assert.equal((await client.loadOwnerQuantArtifacts(loadInput)).status, 'unavailable');
    assert.equal(countQuant(), before);
    await signIn();
    const forged = await client.requestOwnerQuantArtifacts({ ...loadInput, subjectId: OTHER });
    assert.ok(forged.limitations.includes('QUANT_AUTH_SUBJECT_MISMATCH'));
    assert.equal(countQuant(), before);
  });
  await check('local replica account ownership gates every upload', async () => {
    const before = countQuant();
    for (const ownerId of [null, OTHER]) {
      syncState = { ownerId, healthConsent: true };
      const result = await client.loadOwnerQuantArtifacts(loadInput);
      assert.ok(result.limitations.includes('QUANT_LOCAL_ACCOUNT_MISMATCH'));
    }
    assert.equal(countQuant(), before);
    syncState = { ownerId: UID, healthConsent: false };
  });
  await check('real wrapper uses bearer, removes health without consent and caches private copies', async () => {
    const first = await client.loadOwnerQuantArtifacts(loadInput);
    assert.equal(first.status, 'available');
    const sent = calls.filter((call) => call.url === QUANT).at(-1);
    assert.ok(!sent.init.body.includes('health:private-sample'));
    assert.ok(sent.init.body.includes('manual-steps'));
    const api = calls.filter((call) => call.url.endsWith('/api/decision-quant')).at(-1);
    assert.equal(api.headers.get('authorization'), `Bearer ${TOKEN}`);
    const before = countQuant();
    first.product.metadata.subject_id = 'mutated';
    const cached = await client.loadOwnerQuantArtifacts(loadInput);
    assert.equal(cached.product.metadata.subject_id, UID);
    assert.equal(cached.cacheHit, true);
    assert.equal(countQuant(), before);
  });
  await check('consent changes partition the cache and health upload', async () => {
    syncState.healthConsent = true;
    const result = await client.loadOwnerQuantArtifacts(loadInput);
    assert.equal(result.status, 'available');
    assert.ok(calls.filter((call) => call.url === QUANT).at(-1).init.body.includes('health:private-sample'));
    syncState.healthConsent = false;
    const revoked = await client.loadOwnerQuantArtifacts(loadInput);
    assert.equal(revoked.status, 'available');
    assert.equal(revoked.cacheHit, false);
    assert.ok(!calls.filter((call) => call.url === QUANT).at(-1).init.body.includes('health:private-sample'));
    assert.equal(appData.contextLogs.length, 2);
  });
  await check('real client missing upstream and tampered snapshot receipt remain errors', async () => {
    client.clearOwnerQuantRuntimeCacheForTests();
    delete process.env.QUESTLIFE_QUANT_RUNTIME_URL;
    const missing = await client.loadOwnerQuantArtifacts(loadInput);
    assert.equal(missing.status, 'unavailable');
    assert.ok(missing.limitations.includes('QUANT_RUNTIME_HTTP_503'));
    process.env.QUESTLIFE_QUANT_RUNTIME_URL = QUANT;
    tamperReceipt = true;
    const mismatch = await client.loadOwnerQuantArtifacts(loadInput);
    assert.ok(mismatch.limitations.includes('QUANT_REQUEST_CONTEXT_MISMATCH'));
    tamperReceipt = false;
  });
  async function staleDuring(change) {
    client.clearOwnerQuantRuntimeCacheForTests();
    let release;
    let entered;
    const ready = new Promise((resolveReady) => { entered = resolveReady; });
    quantOverride = async (body) => {
      await new Promise((resolveWait) => { release = resolveWait; entered(); });
      return json(upstream(body));
    };
    const pending = client.loadOwnerQuantArtifacts(loadInput);
    await ready;
    await change();
    release();
    const result = await pending;
    quantOverride = undefined;
    assert.equal(result.status, 'unavailable');
    assert.equal(result.product, undefined);
    assert.equal(result.analysis, undefined);
    assert.equal(result.eligibleObservationCount, 0);
  }
  await check('logout discards in-flight response and prevents later cache resurrection', async () => {
    await staleDuring(async () => { await auth.signOut({ scope: 'local' }); });
    assert.equal((await client.loadOwnerQuantArtifacts(loadInput)).status, 'unavailable');
    await signIn();
    const before = countQuant();
    assert.equal((await client.loadOwnerQuantArtifacts(loadInput)).cacheHit, false);
    assert.equal(countQuant(), before + 1);
  });
  await check('account switch discards A response and cannot upload A replica for B', async () => {
    await staleDuring(() => signIn(OTHER_TOKEN));
    const before = countQuant();
    assert.ok((await client.loadOwnerQuantArtifacts(loadInput)).limitations.includes('QUANT_LOCAL_ACCOUNT_MISMATCH'));
    assert.equal(countQuant(), before);
    await signIn();
  });
  await check('consent revocation while waiting discards health-derived response', async () => {
    syncState.healthConsent = true;
    await staleDuring(async () => { syncState.healthConsent = false; });
  });
  console.log(`Backend auth boundary: ${checks} scenario groups passed (fixture network; no live services).`);
} finally {
  await auth?.stopAutoRefresh();
  Module._load = originalLoad;
  globalThis.fetch = originalFetch;
  rmSync(out, { recursive: true, force: true });
}
