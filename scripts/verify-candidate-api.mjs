import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';

const origin = process.argv[2];
if (origin !== 'https://questlife-v1-release.vercel.app') throw new Error('Candidate origin required');
const checks = [];
async function request(path, body) {
  const start = performance.now();
  const response = await fetch(`${origin}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json' },
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
];
for (const [path, expected, body] of unauthenticatedBodies) {
  const result = await request(path, body);
  assert.equal(result.status, expected, `${path} must fail closed without authentication`);
  checks.push({ name: path, status: result.status, elapsedMs: result.elapsedMs });
}
for (const text of ['打了篮球', 'SQL 学习了 40 分钟', '卧推 82.5 kg，5 次，3 组']) {
  const result = await request('/api/parse', { text, history: [], skillsCatalog: [], goalsSnapshot: [], skillHistory: [] });
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
mkdirSync('reports/release', { recursive: true });
writeFileSync('reports/release/candidate-api-verification.json', JSON.stringify({
  origin, testedAt: new Date().toISOString(),
  scope: 'Isolated stateless API inputs only. No Store, owner data or database writes; not UI confirmation or persistence acceptance.',
  checks,
}, null, 2));
console.log(JSON.stringify(checks.map(({ response, ...check }) => ({ ...check,
  ...(response ? { ok: response.ok, error: response.error } : {}) })), null, 2));
if (checks.some(check => check.name === 'live_capture_parse' && (check.status !== 200 || !check.response?.ok || !check.currentInputMatched))) process.exitCode = 1;
