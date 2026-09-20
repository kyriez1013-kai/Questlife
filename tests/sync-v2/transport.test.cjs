const assert = require('node:assert/strict');
const { test, after } = require('node:test');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { createClient } = require('@supabase/supabase-js');

// Run the production transport and real SDK request builders/auth lifecycle.
// Only the singleton provider and network are replaced; no disk/session writes.
const file = resolve(__dirname, '../../src/sync-v2/transport.ts');
const compiled = ts.transpileModule(readFileSync(file, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
let activeClient;
const transportModule = new Module(file, module);
transportModule.filename = file;
transportModule.paths = module.paths;
transportModule.require = name => name === './supabase'
  ? { supabaseClient: () => activeClient }
  : require(name);
transportModule._compile(compiled, file);
const { supabaseTransport } = transportModule.exports;

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const ORIGIN = 'https://transport.example.test';
const PUBLIC_KEY = 'sb_publishable_transport_test_only';
const user = id => ({ id, aud: 'authenticated', role: 'authenticated',
  app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' });
const token = (id, version = 1) => [
  Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
  Buffer.from(JSON.stringify({ sub: id, aud: 'authenticated', version,
    exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url'),
  'test-only-signature',
].join('.');
const TA = token(A), TA2 = token(A, 2), TB = token(B);
const mutation = {
  mutationId: '33333333-3333-4333-8333-333333333333', deviceId: 'test-device',
  entityType: 'categories', entityId: 'private-A', operation: 'upsert',
  payload: { id: 'private-A', name: 'isolated test' }, schemaVersion: 1,
  baseRevision: 0, createdAt: '2026-09-20T00:00:00Z', attemptCount: 3,
  lastAttemptAt: '2026-09-20T01:00:00Z', lastError: 'test-retry',
};
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' },
});
const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};
const clients = [];
after(async () => { for (const client of clients) await client.auth.stopAutoRefresh(); });

async function fixture(initial = TA) {
  const owners = new Map([[TA, A], [TA2, A], [TB, B]]);
  const requests = [], writes = [];
  const hooks = { verify: null, data: null, refreshToken: TA2 };
  const client = createClient(ORIGIN, PUBLIC_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input, init = {}) => {
      const url = new URL(String(input));
      assert.equal(url.origin, ORIGIN, 'tests must never leave the isolated transport');
      const headers = new Headers(init.headers);
      const bearer = headers.get('authorization')?.replace(/^Bearer /, '');
      const owner = owners.get(bearer);
      if (url.pathname === '/auth/v1/user') {
        if (hooks.verify) { const response = await hooks.verify(bearer); if (response) return response; }
        return owner ? json(user(owner)) : json({ msg: 'invalid token' }, 401);
      }
      if (url.pathname === '/auth/v1/token') {
        return json({ access_token: hooks.refreshToken, refresh_token: 'test-refresh',
          expires_in: 3600, token_type: 'bearer', user: user(owners.get(hooks.refreshToken)) });
      }
      if (url.pathname === '/auth/v1/logout') return new Response(null, { status: 204 });
      assert.ok(url.pathname.startsWith('/rest/v1/'), 'unexpected API');
      const request = { url, headers, bearer, owner, body: init.body ? JSON.parse(init.body) : null, signal: init.signal };
      requests.push(request);
      if (hooks.data) { const response = await hooks.data(request); if (response) return response; }
      if (!owner) return json({ message: 'unauthorized' }, 401);
      if (url.pathname === '/rest/v1/rpc/questlife_sync_push') {
        writes.push(...request.body.mutations.map(row => ({ owner, row })));
      }
      return json([]);
    } },
  });
  clients.push(client);
  activeClient = client;
  const login = async bearer => {
    const result = await client.auth.setSession({ access_token: bearer, refresh_token: 'test-refresh' });
    assert.equal(result.error, null);
  };
  if (initial) await login(initial);
  return { client, login, hooks, requests, writes };
}

test('signed-out push and pull fail before any data request', async () => {
  const f = await fixture(null);
  await assert.rejects(supabaseTransport.push(A, [mutation]), /sync_account_mismatch/);
  await assert.rejects(supabaseTransport.pull(A, 0, 200), /sync_account_mismatch/);
  assert.equal(f.requests.length, 0);
});

test('an already-switched account cannot dispatch the old owner outbox', async () => {
  const f = await fixture(TB);
  await assert.rejects(supabaseTransport.push(A, [mutation]), /sync_account_mismatch/);
  await assert.rejects(supabaseTransport.pull(A, 0, 200), /sync_account_mismatch/);
  assert.equal(f.requests.length, 0);
});

test('auth errors fail closed even if a session is returned', async () => {
  const f = await fixture();
  const original = f.client.auth.getSession.bind(f.client.auth);
  f.client.auth.getSession = async () => ({ ...(await original()), error: new Error('auth unavailable') });
  await assert.rejects(supabaseTransport.push(A, [mutation]), /sync_account_mismatch/);
  assert.equal(f.requests.length, 0);
});

test('server validation must bind the captured token to the expected user', async () => {
  const f = await fixture();
  f.hooks.verify = async () => json(user(B));
  await assert.rejects(supabaseTransport.push(A, [mutation]), /sync_account_unverified/);
  assert.equal(f.requests.length, 0);
});

test('revoked captured token cannot dispatch', async () => {
  const f = await fixture();
  f.hooks.verify = async () => json({ msg: 'revoked' }, 401);
  await assert.rejects(supabaseTransport.push(A, [mutation]), /sync_account_unverified/);
  assert.equal(f.requests.length, 0);
});

test('push retains RPC contract, captured bearer and idempotent wire payload', async () => {
  const f = await fixture();
  await supabaseTransport.push(A, [mutation]);
  assert.equal(f.writes[0].owner, A);
  assert.equal(f.requests[0].bearer, TA);
  assert.equal(f.requests[0].headers.get('apikey'), PUBLIC_KEY);
  const { attemptCount, lastAttemptAt, lastError, ...wire } = mutation;
  assert.deepEqual(f.requests[0].body, { mutations: [wire] });
  assert.ok(f.requests[0].signal instanceof AbortSignal);
});

test('A to B during token validation never writes A mutations as B', async () => {
  const f = await fixture(), entered = deferred(), release = deferred();
  f.hooks.verify = async bearer => {
    if (bearer === TA) { entered.resolve(); await release.promise; }
  };
  const pending = supabaseTransport.push(A, [mutation]);
  await entered.promise;
  await f.login(TB);
  release.resolve();
  await pending;
  assert.equal((await f.client.auth.getSession()).data.session.user.id, B);
  assert.deepEqual(f.writes.map(row => row.owner), [A]);
  assert.equal(f.requests[0].bearer, TA);
});

test('SDK late token lookup cannot replace the explicit RPC Authorization header', async () => {
  const f = await fixture(), entered = deferred(), release = deferred();
  const original = f.client.auth.getSession.bind(f.client.auth);
  let reads = 0;
  f.client.auth.getSession = async () => {
    if (++reads === 2) { entered.resolve(); await release.promise; }
    return original();
  };
  const pending = supabaseTransport.push(A, [mutation]);
  await entered.promise;
  await f.login(TB);
  release.resolve();
  await pending;
  assert.deepEqual(f.writes.map(row => row.owner), [A]);
  assert.equal(f.requests[0].bearer, TA);
});

test('a delete retry stays account-bound with the same mutation identity', async () => {
  const f = await fixture(), entered = deferred(), release = deferred();
  f.hooks.verify = async bearer => {
    if (bearer === TA) { entered.resolve(); await release.promise; }
  };
  const { payload, ...withoutPayload } = mutation;
  const deletion = { ...withoutPayload, operation: 'delete', baseRevision: 4 };
  const pending = supabaseTransport.push(A, [deletion]);
  await entered.promise;
  await f.login(TB);
  release.resolve();
  await pending;
  assert.equal(f.writes[0].owner, A);
  assert.equal(f.writes[0].row.operation, 'delete');
  assert.equal(f.writes[0].row.mutationId, mutation.mutationId);
  assert.equal(f.writes[0].row.baseRevision, 4);
  assert.equal(f.writes[0].row.payload, undefined);
});

test('logout during validation never falls back to anonymous authorization', async () => {
  const f = await fixture(), entered = deferred(), release = deferred();
  f.hooks.verify = async () => { entered.resolve(); await release.promise; };
  const pending = supabaseTransport.push(A, [mutation]);
  await entered.promise;
  await f.client.auth.signOut({ scope: 'local' });
  release.resolve();
  await pending;
  assert.equal(f.requests[0].bearer, TA);
  assert.deepEqual(f.writes.map(row => row.owner), [A]);
});

test('same-user token refresh is captured afresh on each retry', async () => {
  const f = await fixture();
  await supabaseTransport.push(A, [mutation]);
  const refreshed = await f.client.auth.refreshSession();
  assert.equal(refreshed.error, null);
  await supabaseTransport.push(A, [{ ...mutation, attemptCount: 4 }]);
  assert.deepEqual(f.requests.map(row => row.bearer), [TA, TA2]);
  assert.deepEqual(f.requests[0].body, f.requests[1].body);
});

test('same-user refresh during validation never substitutes an unvalidated token', async () => {
  const f = await fixture(), entered = deferred(), release = deferred();
  f.hooks.verify = async bearer => {
    if (bearer === TA) { entered.resolve(); await release.promise; }
  };
  const pending = supabaseTransport.push(A, [mutation]);
  await entered.promise;
  assert.equal((await f.client.auth.refreshSession()).error, null);
  release.resolve();
  await pending;
  assert.equal((await f.client.auth.getSession()).data.session.access_token, TA2);
  assert.equal(f.requests[0].bearer, TA);
  assert.deepEqual(f.writes.map(row => row.owner), [A]);
});

test('session refresh before capture validates and uses the refreshed token', async () => {
  const f = await fixture();
  const original = f.client.auth.getSession.bind(f.client.auth);
  let first = true;
  f.client.auth.getSession = async () => {
    if (first) { first = false; assert.equal((await f.client.auth.refreshSession()).error, null); }
    return original();
  };
  const validated = [];
  f.hooks.verify = async bearer => { validated.push(bearer); };
  await supabaseTransport.push(A, [mutation]);
  assert.deepEqual(validated, [TA2]);
  assert.equal(f.requests[0].bearer, TA2);
});

test('a 401 during dispatch does not replay the old mutation with B credentials', async () => {
  const f = await fixture();
  f.hooks.data = async request => {
    assert.equal(request.bearer, TA);
    await f.login(TB);
    return json({ message: 'expired' }, 401);
  };
  await assert.rejects(supabaseTransport.push(A, [mutation]), /push_failed/);
  await assert.rejects(supabaseTransport.push(A, [mutation]), /sync_account_mismatch/);
  assert.equal(f.requests.length, 1);
  assert.equal(f.writes.length, 0);
});

test('auth timeout releases the sync queue and late verification cannot dispatch', async () => {
  const f = await fixture(), entered = deferred(), release = deferred();
  const originalTimer = global.setTimeout;
  let deadline;
  global.setTimeout = (callback, milliseconds, ...args) => {
    if (milliseconds === 20000) deadline = callback;
    return originalTimer(callback, milliseconds, ...args);
  };
  f.hooks.verify = async () => { entered.resolve(); await release.promise; };
  try {
    const pending = supabaseTransport.push(A, [mutation]);
    const rejected = assert.rejects(pending, /sync_auth_timeout/);
    await entered.promise;
    assert.equal(typeof deadline, 'function');
    deadline();
    await rejected;
    release.resolve();
    await new Promise(done => setImmediate(done));
    assert.equal(f.requests.length, 0);
  } finally {
    release.resolve();
    global.setTimeout = originalTimer;
  }
});

test('pull uses captured owner bearer as well as exact owner/cursor filters', async () => {
  const f = await fixture(), entered = deferred(), release = deferred();
  f.hooks.verify = async bearer => {
    if (bearer === TA) { entered.resolve(); await release.promise; }
  };
  const pending = supabaseTransport.pull(A, 17, 200);
  await entered.promise;
  await f.login(TB);
  release.resolve();
  await pending;
  const request = f.requests[0];
  assert.equal(request.bearer, TA);
  assert.equal(request.url.searchParams.get('user_id'), `eq.${A}`);
  assert.equal(request.url.searchParams.get('change_seq'), 'gt.17');
  assert.equal(request.url.searchParams.get('order'), 'change_seq.asc');
  assert.equal(request.url.searchParams.get('limit'), '200');
});

test('malformed data responses fail without acknowledging mutations', async () => {
  const f = await fixture();
  f.hooks.data = async () => json({ not: 'an array' });
  await assert.rejects(supabaseTransport.push(A, [mutation]), /push_failed/);
  await assert.rejects(supabaseTransport.pull(A, 0, 200), /pull_failed/);
  assert.equal(f.writes.length, 0);
});
