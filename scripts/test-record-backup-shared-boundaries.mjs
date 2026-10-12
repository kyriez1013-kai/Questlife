import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

// Isolated regression probes: no application storage, account or transport.
const require = createRequire(import.meta.url), ts = require('typescript');
function isolatedModule(path, globals = {}) {
  const url = new URL(path, import.meta.url);
  const exports = {};
  const source = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(source, { exports, URLSearchParams, require: name => {
    if (!name.startsWith('.')) return require(name);
    const dependency = new URL(name, url);
    if (name.endsWith('.cjs')) return require(fileURLToPath(dependency));
    return isolatedModule(fileURLToPath(dependency) + '.ts');
  }, ...globals });
  return exports;
}
const { DEFAULT_DATA } = isolatedModule('../src/types.ts');
test('persistence trace must not retain or log auth callback query credentials', () => {
  const writes = [], logs = [];
  const trace = isolatedModule('../src/utils/persistenceTrace.ts', {
    window: { location: { pathname: '/auth/callback', search: '?debugPersistence=1&code=isolated-code-placeholder&access_token=isolated-token-placeholder' },
      sessionStorage: { getItem: () => null, setItem: (_, text) => writes.push(text) },
      localStorage: { getItem: () => null } },
    console: { log: (...args) => logs.push(args) },
  });
  trace.recordPersistenceTrace({ storageKey: 'isolated-data', operation: 'restore-probe', next: structuredClone(DEFAULT_DATA) });
  assert.doesNotMatch(JSON.stringify({ writes, logs }), /isolated-code-placeholder|isolated-token-placeholder/);
});
test('existing diagnostic traces are scrubbed before retention and the next log', () => {
  const writes = [], logs = [];
  const trace = isolatedModule('../src/utils/persistenceTrace.ts', {
    window: { location: { pathname: '/', search: '?debugPersistence=1&questlife_v11_ui=isolated-secret-placeholder' },
      sessionStorage: { getItem: () => JSON.stringify([{ route: '/auth/callback?code=old-private-placeholder#access_token=old-token-placeholder', featureFlag: 'old-private-placeholder' }]),
        setItem: (_, text) => writes.push(text) }, localStorage: { getItem: () => null } },
    console: { log: (...args) => logs.push(args) },
  });
  trace.recordPersistenceTrace({ storageKey: 'isolated-data', operation: 'restore-probe', next: structuredClone(DEFAULT_DATA) });
  assert.doesNotMatch(JSON.stringify({ writes, logs }), /old-private-placeholder|old-token-placeholder|isolated-secret-placeholder/);
  assert.ok(writes.length >= 1);
});

function nativeExport(shareFails = false, onAvailability = () => {}) {
  const files = new Map();
  const uri = (parent, name) => `${typeof parent === 'string' ? parent : parent.uri}/${name}`;
  class File {
    constructor(parent, name) { this.uri = uri(parent, name); }
    get exists() { return files.has(this.uri); }
    get size() { return Buffer.byteLength(files.get(this.uri) ?? ''); }
    create() { files.set(this.uri, ''); }
    write(text) { files.set(this.uri, text); }
    delete() { files.delete(this.uri); }
  }
  class Directory {
    constructor(parent, name) { this.uri = uri(parent, name); }
    create() {}
    list() { return []; }
  }
  const helper = isolatedModule('../src/native/nativeRecordExport.ts', { require: name => {
    if (name === '../backup/records') return isolatedModule('../src/backup/records.ts');
    if (name === 'expo-file-system') return { File, Directory, Paths: { cache: 'file:///ISOLATED_EXPORT_CACHE' } };
    if (name === 'expo-crypto') return { randomUUID: () => '11111111-1111-4111-8111-111111111111' };
    if (name === 'expo-sharing') return { isAvailableAsync: async () => { onAvailability(); return true; }, shareAsync: async () => {
      if (shareFails) throw Error('isolated_share_failure');
    } };
    throw Error(`Unexpected dependency: ${name}`);
  } });
  return { helper, files };
}

test('failed native sharing must release its newly created private file', async () => {
  const { helper, files } = nativeExport(true);
  await assert.rejects(helper.shareNativeRecordFile(structuredClone(DEFAULT_DATA), 'Isolated export'), /isolated_share_failure/);
  assert.equal(files.size, 0);
});

test('legacy raw export must reject the same known confidential extensions as restorable backup', async () => {
  const { helper, files } = nativeExport();
  const data = { ...structuredClone(DEFAULT_DATA), settings: { access_token: 'isolated-credential-placeholder' } };
  await assert.rejects(helper.shareNativeRecordFile(data, 'Isolated raw export'));
  assert.equal(files.size, 0);
});
test('native sharing serializes the validated snapshot before asynchronous platform calls', async () => {
  const data = structuredClone(DEFAULT_DATA);
  const { helper, files } = nativeExport(false, () => { data.settings.access_token = 'isolated-mutation-placeholder'; });
  assert.equal(await helper.shareNativeRecordFile(data, 'Isolated export'), 'shared');
  assert.doesNotMatch([...files.values()].join(''), /isolated-mutation-placeholder/);
});
test('disabling debug still scrubs retained legacy diagnostic query values', () => {
  const writes = [];
  const trace = isolatedModule('../src/utils/persistenceTrace.ts', {
    window: { location: { pathname: '/', search: '' },
      sessionStorage: { getItem: () => JSON.stringify([{ route: '/auth/callback?code=old-private-placeholder', featureFlag: 'legacy' }]), setItem: (_, text) => writes.push(text) },
      localStorage: { getItem: () => null } },
  });
  trace.installPersistenceDebugBridge({ getStoreData: () => structuredClone(DEFAULT_DATA), readPersistedData: async () => undefined });
  assert.ok(writes.length > 0);
  assert.doesNotMatch(writes.join(''), /old-private-placeholder/);
});
