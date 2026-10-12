import assert from 'node:assert/strict';
import { test, afterEach, after } from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

// Isolated component runtime, fake file provider and fake sync boundary only.
const require = createRequire(import.meta.url);
const runtime = process.env.QUESTLIFE_UI_TEST_RUNTIME;
if (!runtime) throw new Error('QUESTLIFE_UI_TEST_RUNTIME must point to isolated React 19.1 node_modules');
const React = require(join(runtime, 'react'));
const { create, act } = require(join(runtime, 'react-test-renderer'));
const ts = require('typescript');
const Module = require('node:module');
global.IS_REACT_ACT_ENVIRONMENT = true;
const cache = 'file:///ISOLATED_BACKUP_CACHE/';
const platform = { OS: 'android' };
let tree, data, selected, confirmations, restores, shares, files, deleted, restoreError, logs, revoked;
const ownerId = '11111111-1111-4111-8111-111111111111';
const theme = { spacing: { sm: 8, md: 12 }, colors: { text: '#111', textSecondary: '#555' },
  typography: { cardTitleSize: 16, bodySize: 14, captionSize: 12 } };
class TestFile {
  constructor(uri) { this.uri = uri; }
  get exists() { return files.has(this.uri); }
  get size() { const row = files.get(this.uri); return row?.size ?? Buffer.byteLength(row?.text ?? ''); }
  async text() { const row = files.get(this.uri); if (row?.readError) throw row.readError; return row?.text ?? ''; }
  delete() { if (files.get(this.uri)?.deleteError) throw Error('isolated_cleanup_failure'); deleted.push(this.uri); files.delete(this.uri); }
}
class TestDirectory {
  constructor(parent, name) { this.uri = `${parent.uri.replace(/\/$/, '')}/${name}`; }
}
const load = Module._load;
const extensions = { ts: require.extensions['.ts'], tsx: require.extensions['.tsx'] };
const originalConsole = { log: console.log, error: console.error, warn: console.warn };
const originalRevoke = URL.revokeObjectURL;
Module._load = function(request, parent, isMain) {
  if (request === 'react') return React;
  if (request === 'react/jsx-runtime') return require(join(runtime, 'react/jsx-runtime'));
  if (request === 'react-native') return { Platform: platform, View: 'View', Text: 'Text' };
  if (request === 'expo-file-system') return { File: TestFile, Directory: TestDirectory, Paths: { cache: { uri: cache } } };
  if (request === 'expo-document-picker') return { getDocumentAsync: async options => {
    assert.equal(options.copyToCacheDirectory, true); assert.equal(options.base64, false); return selected;
  } };
  if (/\/store$/.test(request)) return { useStore: () => ({ data, loading: false }) };
  if (/\/useQuestTheme$/.test(request)) return { useQuestTheme: () => theme };
  if (/\/i18n$/.test(request)) return { getLanguage: value => value === 'zh' ? 'zh' : 'en' };
  if (/\/QuestButton$/.test(request)) return { __esModule: true, default: props => React.createElement('Button', props) };
  if (/\/confirm$/.test(request)) return { confirmAction: value => confirmations.push(value) };
  if (/\/sync-v2\/runtime$/.test(request)) return {
    readSyncState: async () => ({ ownerId }),
    restoreRecordBackup: async text => { restores.push(text); if (restoreError) throw restoreError; },
  };
  if (/\/nativeRecordExport$/.test(request)) return { shareNativeRecordFile: async value => { shares.push(value); return 'shared'; } };
  return load.call(this, request, parent, isMain);
};
for (const extension of ['.ts', '.tsx']) require.extensions[extension] = (module, filename) => {
  module._compile(ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } }).outputText, filename);
};
const Actions = require('../src/backup/RecordBackupActions.tsx').default;
const { createRecordBackup, MAX_BACKUP_BYTES } = require('../src/backup/records.ts');
const { DEFAULT_DATA } = require('../src/types.ts');
const copy = require('../src/backup/copy.ts').backupCopy;
const button = label => tree.root.findAllByType('Button').find(node => node.props.label === label);
const message = () => tree.root.findAllByType('Text').map(node => node.props.children).filter(value => typeof value === 'string').join('\n');
async function mount() {
  data = { ...structuredClone(DEFAULT_DATA), settings: { language: 'en' },
    categories: [{ id: 'isolated-record', name: 'Private local placeholder', createdAt: 1, emoji: '' }] };
  platform.OS = 'android'; selected = { canceled: true }; confirmations = []; restores = []; shares = [];
  files = new Map(); deleted = []; restoreError = null; logs = []; revoked = [];
  console.log = (...args) => logs.push(args); console.error = (...args) => logs.push(args); console.warn = (...args) => logs.push(args);
  URL.revokeObjectURL = uri => revoked.push(uri);
  await act(async () => { tree = create(React.createElement(Actions)); });
}
function pick(text = JSON.stringify(createRecordBackup(data, ownerId)), uri = `${cache}DocumentPicker/input.json`, options = {}) {
  files.set(uri, { text, ...options });
  selected = { canceled: false, assets: [{ uri, size: options.assetSize ?? Buffer.byteLength(text),
    file: { size: options.fileSize ?? Buffer.byteLength(text), text: async () => { if (options.readError) throw options.readError; return text; } } }] };
  return uri;
}
async function choose() { await act(async () => { button('Choose backup to restore').props.onPress(); }); }
async function answer(confirmed) { await act(async () => { confirmations.at(-1)[confirmed ? 'onConfirm' : 'onCancel'](); }); }
afterEach(async () => {
  if (tree) await act(async () => tree.unmount()); tree = undefined;
  Object.assign(console, originalConsole); URL.revokeObjectURL = originalRevoke;
});
after(() => { Module._load = load; require.extensions['.ts'] = extensions.ts; require.extensions['.tsx'] = extensions.tsx; });

test('native import releases only its picker cache copy before confirmation', async () => {
  await mount(); const text = JSON.stringify(createRecordBackup(data, ownerId)); const uri = pick(text);
  await choose(); assert.deepEqual(restores, []); assert.deepEqual(deleted, [uri]); assert.equal(confirmations.length, 1);
  assert.equal(button('Choose backup to restore').props.disabled, true);
  await answer(true); assert.deepEqual(restores, [text]); assert.match(message(), /Records restored locally/);
});
test('canceling confirmation releases the copy without a restore or success claim', async () => {
  await mount(); const uri = pick(); await choose(); await answer(false);
  assert.deepEqual(deleted, [uri]); assert.deepEqual(restores, []); assert.doesNotMatch(message(), /Records restored locally/);
});
test('malformed input releases cache and never reaches confirmation or sync', async () => {
  await mount(); const uri = pick('{"isolated-private-text":"bad"}'); await choose();
  assert.deepEqual(deleted, [uri]); assert.equal(confirmations.length, 0); assert.deepEqual(restores, []);
  assert.equal(tree.root.findAllByType('Text').filter(node => node.props.accessibilityRole === 'alert').length, 1);
  assert.ok(!JSON.stringify(logs).includes('isolated-private-text'));
});
test('oversized declared and actual native files release the picker copy without reading', async () => {
  for (const options of [{ assetSize: MAX_BACKUP_BYTES + 1 }, { size: MAX_BACKUP_BYTES + 1 }]) {
    await mount(); const uri = pick('{}', undefined, { ...options, readError: Error('must_not_read') }); await choose();
    assert.deepEqual(deleted, [uri]); assert.equal(confirmations.length, 0); assert.deepEqual(restores, []);
    await act(async () => tree.unmount()); tree = undefined;
  }
});
test('native read interruption releases the copy and emits no private error text', async () => {
  await mount(); const uri = pick('{}', undefined, { readError: Error('isolated_private_error') }); await choose();
  assert.deepEqual(deleted, [uri]); assert.deepEqual(restores, []);
  assert.ok(!JSON.stringify(logs).includes('isolated_private_error')); assert.doesNotMatch(message(), /isolated_private_error/);
});
test('provider originals, traversal and sibling paths are never deleted', async () => {
  for (const uri of ['content://provider/private.json', 'file:///Documents/private.json',
    `${cache}../Documents/private.json`, `${cache.slice(0, -1)}-sibling/private.json`]) {
    await mount(); pick(undefined, uri); await choose(); await answer(false);
    assert.deepEqual(deleted, []); assert.equal(files.has(uri), true);
    await act(async () => tree.unmount()); tree = undefined;
  }
});
test('cache cleanup failure blocks restoration and exposes no provider error', async () => {
  await mount(); pick(undefined, undefined, { deleteError: true }); await choose();
  assert.equal(confirmations.length, 0); assert.deepEqual(restores, []);
  assert.match(message(), /Operation did not complete/); assert.doesNotMatch(message(), /isolated_cleanup_failure/);
});
test('web picker object URLs release on malformed, oversized and unreadable input', async () => {
  for (const options of [{}, { assetSize: MAX_BACKUP_BYTES + 1 }, { fileSize: MAX_BACKUP_BYTES + 1 }, { readError: Error('private_read_failure') }]) {
    await mount(); platform.OS = 'web'; const uri = pick('{}', 'blob:isolated-picker', options); await choose();
    assert.deepEqual(revoked, [uri]); assert.deepEqual(restores, []); assert.equal(confirmations.length, 0);
    await act(async () => tree.unmount()); tree = undefined;
  }
});
test('a failed restore reports possible durable recovery, not unchanged data or success', async () => {
  await mount(); pick(); restoreError = Error('isolated_private_journal_failure'); await choose(); await answer(true);
  assert.equal(restores.length, 1); assert.match(message(), /may already be staged/);
  assert.doesNotMatch(message(), /Records restored locally|Existing records were not overwritten|isolated_private_journal_failure/);
  assert.equal(button('Choose backup to restore').props.disabled, false);
});
test('save requires unencrypted-file confirmation and rejects confidential extensions before sharing', async () => {
  await mount(); await act(async () => button('Save restorable backup').props.onPress());
  assert.equal(shares.length, 0); assert.match(confirmations.at(-1).message, /unencrypted private data file/);
  await answer(true); assert.equal(shares.length, 1); assert.equal(shares[0].ownerId, ownerId);
  assert.deepEqual(shares[0].data, data); assert.match(message(), /Confirm that your destination saved it/);
  data = { ...data, settings: { language: 'en', access_token: 'isolated_credential_placeholder' } };
  await act(async () => tree.update(React.createElement(Actions)));
  await act(async () => button('Save restorable backup').props.onPress()); await answer(true);
  assert.equal(shares.length, 1); assert.match(message(), /Operation did not complete/);
  assert.ok(!JSON.stringify(logs).includes('isolated_credential_placeholder'));
});
test('Chinese and English interruption messages preserve the recovery boundary', () => {
  assert.match(copy('en', 'interrupted'), /may already be staged/);
  assert.match(copy('zh', 'interrupted'), /\u91cd\u65b0\u6253\u5f00/);
});
