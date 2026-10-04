import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes, randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const origin = process.argv[2];
if (origin !== 'https://questlife-v1-release.vercel.app') throw new Error('Candidate origin required');
const checks = [];
const cleanup = [];
const testedAt = new Date().toISOString();
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
let failure;
function saveReport() {
  mkdirSync('reports/release', { recursive: true });
  writeFileSync('reports/release/candidate-api-verification.json', JSON.stringify({
    origin, testedAt, sourceCommit, project: 'gttcoocfkqwvsqfwxpyo',
    scope: 'Real authenticated DeepSeek calls from an isolated disposable identity. No observation/Store writes. Auth deletion trigger owns private quota cleanup; SQL readback is separate. Global spent reservations retained. Not normal UI/physical-device acceptance.',
    ...(failure ? { failure } : {}), checks, cleanup,
  }, null, 2));
}
async function request(path, body, token) {
  const start = performance.now();
  const response = await fetch(`${origin}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(30000), redirect: 'manual',
  });
  const content = await response.text();
  return { status: response.status, elapsedMs: Math.round(performance.now() - start), content };
}

const root = await request('/');
assert.equal(root.status, 200);
assert.match(root.content, /<html/i);
checks.push({ name: 'public_candidate_document', status: root.status });
const unauthenticatedBodies = [
  ['/api/sync', 410, {}],
  ['/api/track', 410, {}],
  ['/api/decision-quant', 401, { runtimeVersion: 'questlife.owner-quant-runtime-client.v1',
    subjectId: '00000000-0000-4000-8000-000000000001', configuredTimezone: 'UTC', asOf: new Date().toISOString(), appData: {} }],
  ['/api/push-test', 401, { deviceId: 'candidate-test-device', requestId: '00000000-0000-4000-8000-000000000002', action: 'send' }],
  ['/api/parse', 401, { text: 'Isolated auth boundary input' }],
  ['/api/brief', 401, { mode: 'instant_micro', trigger: 'manual', now: new Date().toISOString(),
    current_state: null, today_context: { recent_context_logs: [] },
    profile: { active_goals: [], modules: [], skills: [], known_baselines: {}, confirmed_patterns: [], chronotype: 'unknown' },
    history_index: { last_7_days: [], last_28_days: {} }, schedule_today: [] }],
];
for (const [path, expected, body] of unauthenticatedBodies) {
  const result = await request(path, body);
  assert.equal(result.status, expected, `${path} must fail closed without authentication`);
  checks.push({ name: path, status: result.status, elapsedMs: result.elapsedMs });
}
const secrets = join(homedir(), 'Library/QuestLifeToolchain/secrets');
const pub = JSON.parse(readFileSync(join(secrets, 'supabase-candidate-public.json'), 'utf8'));
const service = JSON.parse(readFileSync(join(secrets, 'supabase-candidate-admin.json'), 'utf8'));
assert.equal(pub.url, 'https://gttcoocfkqwvsqfwxpyo.supabase.co');
assert.equal(service.url, pub.url);
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(service.url, service.key, options);
const client = createClient(pub.url, pub.key, options);
let userId;
try {
  const email = `questlife-ai-${randomUUID()}@example.com`;
  const password = randomBytes(32).toString('base64url');
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true,
    user_metadata: { purpose: 'disposable_stateless_ai_verification' } });
  assert.equal(created.error, null); userId = created.data.user.id;
  cleanup.push({ userId, purpose: 'disposable_stateless_ai_verification', status: 'PENDING' });
  saveReport();
  const signed = await client.auth.signInWithPassword({ email, password });
  assert.equal(signed.error, null);
  const token = signed.data.session.access_token;
  const publicClaim = await client.rpc('questlife_ai_claim', { p_user_id: userId, p_endpoint: 'parse' });
  assert.ok(publicClaim.error);
  checks.push({ name: 'client_cannot_bypass_server_ai_budget', result: 'PASS' });
  for (const text of ['打了篮球', 'SQL 学习了 40 分钟', '卧推 82.5 kg，5 次，3 组']) {
  const result = await request('/api/parse', { text, history: [], skillsCatalog: [], goalsSnapshot: [], skillHistory: [] }, token);
  let parsed;
  try { parsed = JSON.parse(result.content); } catch { parsed = { error: 'invalid_json' }; }
  const entries = Array.isArray(parsed.entries) ? parsed.entries : [];
  const currentInputMatched = text.includes('SQL')
    ? parsed.completionSchema?.domain === 'learning' && entries.some(entry => /SQL/i.test(entry.skillName)
      && entry.fields?.durationMinutes === 40)
    : text.includes('卧推') ? parsed.completionSchema?.domain === 'fitness' && entries.some(entry => /卧推|bench/i.test(entry.skillName)
      && entry.fields?.weightKg === 82.5 && entry.fields?.reps === 5 && entry.fields?.sets === 3)
      : parsed.completionSchema?.domain === 'fitness' && entries.some(entry => /篮球|basketball/i.test(entry.skillName))
        && entries.every(entry => entry.fields?.durationMinutes == null);
  checks.push({ name: 'live_capture_parse', input: text, status: result.status,
    elapsedMs: result.elapsedMs, currentInputMatched, response: parsed });
  }
  const brief = await request('/api/brief', unauthenticatedBodies.find(([path]) => path === '/api/brief')[2], token);
  const briefBody = JSON.parse(brief.content);
  checks.push({ name: 'live_authenticated_empty_brief', status: brief.status, elapsedMs: brief.elapsedMs,
    ok: briefBody.ok, serverMemory: briefBody.meta?.server_memory,
    noImportedMemory: briefBody.meta?.server_pattern_count === 0 && briefBody.meta?.server_decision_count === 0,
    noServerDecisionWrite: true });
  assert.equal(brief.status, 200); assert.equal(briefBody.ok, true);
  const own = await client.from('questlife_sync_entities').select('*', { count: 'exact', head: true }).eq('user_id', userId);
  assert.equal(own.error, null); assert.equal(own.count, 0);
  // Fill only this disposable identity's rate bucket without another paid call.
  // Global reservations remain counted; never reset a production-wide budget.
  let limited = false;
  for (let i = 0; i < 13; i++) {
    const claim = await admin.rpc('questlife_ai_claim', { p_user_id: userId, p_endpoint: 'parse' });
    assert.equal(claim.error, null);
    if (claim.data.status === 'rate_limited') { limited = true; break; }
  }
  assert.equal(limited, true);
  const rejected = await request('/api/parse', { text: 'Disposable budget rejection' }, token);
  assert.equal(rejected.status, 429);
  checks.push({ name: 'hosted_atomic_quota_API_denial', status: rejected.status, result: 'PASS' });
} catch (error) {
  failure = { code: error.code ?? 'verification_failed', message: error.message };
  process.exitCode = 1;
} finally {
  if (userId) {
    const entry = cleanup.find(item => item.userId === userId);
    try {
      const own = await client.from('questlife_sync_entities').select('*', { count: 'exact', head: true }).eq('user_id', userId);
      entry.remainingSyncEntities = own.error ? 'UNVERIFIED' : own.count;
      entry.syncReadError = own.error?.code;
      // Never erase a disposable identity that unexpectedly owns observations.
      if (own.error || own.count !== 0) throw new Error('Exact disposable identity cleanup requires zero confirmed sync entities');
      assert.equal((await admin.auth.admin.deleteUser(userId)).error, null);
      const gone = await admin.auth.admin.getUserById(userId);
      assert.equal(gone.error?.status, 404);
      Object.assign(entry, { status: 'AUTH_REMOVED', privateBudgetCleanup: 'Auth deletion trigger; SQL readback separate', authReadback: 404 });
    } catch (error) {
      entry.status = 'CLEANUP_REQUIRED';
      entry.error = error.code ?? 'cleanup_failed';
      process.exitCode = 1;
    }
    await client.auth.signOut().catch(() => undefined);
  }
  saveReport();
}
console.log(JSON.stringify(checks.map(({ response, ...check }) => ({ ...check,
  ...(response ? { ok: response.ok, error: response.error } : {}) })), null, 2));
if (checks.some(check => check.name === 'live_capture_parse' && (check.status !== 200 || !check.response?.ok || !check.currentInputMatched))) process.exitCode = 1;
