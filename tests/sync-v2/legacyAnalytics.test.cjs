const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const test = require('node:test');
const ts = require('typescript');

function load(path, requireDependency = () => { throw new Error('Unexpected dependency'); }) {
  const source = ts.transpileModule(readFileSync(resolve(path), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  new Function('module', 'exports', 'require', source)(module, module.exports, requireDependency);
  return module.exports;
}

test('retired analytics rejects every method without reading credentials or doing IO', async () => {
  const handler = load('api/track.ts').default;
  const previous = global.fetch;
  let calls = 0;
  global.fetch = async () => { calls++; throw new Error('No anonymous write allowed'); };
  try {
    for (const method of ['POST', 'GET', 'DELETE', 'OPTIONS']) {
      const response = { headers: {}, status(code) { this.code = code; return this; },
        setHeader(key, value) { this.headers[key] = value; }, json(body) { this.body = body; } };
      await handler({ method, body: { anonymousUserId: 'forged-owner', properties: { value: 5 } } }, response);
      assert.equal(response.code, 410);
      assert.equal(response.headers['Cache-Control'], 'no-store');
      assert.deepEqual(response.body, { ok: false, error: 'legacy_analytics_retired' });
    }
    assert.equal(calls, 0);
  } finally { global.fetch = previous; }
});

test('caller-compatible tracking creates neither network traffic nor new local identifiers', async () => {
  let storage = 0, network = 0;
  const analytics = load('src/utils/analytics.ts', name => {
    assert.equal(name, '@react-native-async-storage/async-storage');
    return { getItem: async () => { storage++; return null; }, setItem: async () => { storage++; } };
  });
  const previous = global.fetch;
  global.fetch = async () => { network++; throw new Error('Retired route'); };
  try {
    analytics.trackEvent('record_saved', { duration: 30 }, { page: 'Today' });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(network, 0);
    assert.equal(storage, 0);
    assert.deepEqual(analytics.sanitizeAnalyticsProperties({ notes: 'private', count: 1 }), { count: 1 });
  } finally { global.fetch = previous; }
});
