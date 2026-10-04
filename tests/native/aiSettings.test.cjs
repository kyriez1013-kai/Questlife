// Normal settings UI with isolated auth/replica/storage doubles, no provider calls.
const assert = require('node:assert/strict');
const { test, afterEach } = require('node:test');
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const ts = require('typescript');
const runtime = process.env.QUESTLIFE_UI_TEST_RUNTIME;
if (!runtime) throw Error('QUESTLIFE_UI_TEST_RUNTIME is required');
const React = require(path.join(runtime, 'react'));
const { create, act } = require(path.join(runtime, 'react-test-renderer'));
global.IS_REACT_ACT_ENVIRONMENT = true;
let user, replicaOwner, prefs, failure, pending, writes, tree, authObserver;
const listeners = new Set();
const originalLoad = Module._load;
Module._load = function(name, parent, main) {
  if (name === 'react') return React;
  if (name === 'react/jsx-runtime') return require(path.join(runtime, 'react/jsx-runtime'));
  if (name === 'react-native') return { View: 'View', Text: 'Text', Switch: 'Switch' };
  if (name === '../store') return { useStore: () => ({ data: { settings: { language: 'en', selectedThemeId: 'cleanFocus' } } }) };
  if (name.endsWith('/useQuestTheme')) return { useQuestTheme: () => ({ colors: { text: '#111111', textMuted: '#555555', danger: '#993333' } }) };
  if (name.endsWith('/sync-v2/supabase')) return { authConfigured: () => true, supabaseClient: () => ({ auth: {
    getSession: async () => ({ data: { session: user ? { user: { id: user } } : null }, error: null }),
    onAuthStateChange: callback => { authObserver = callback; return { data: { subscription: { unsubscribe() {} } } }; },
  } }) };
  if (name.endsWith('/sync-v2/runtime')) return { readSyncState: async () => ({ ownerId: replicaOwner }) };
  if (name === './aiPreferences') return {
    aiPreferencesSnapshot: () => ({ ...prefs }), loadAiPreferences: async () => ({ ...prefs }),
    subscribeAiPreferences: fn => { listeners.add(fn); return () => listeners.delete(fn); },
    saveAiPreferences: async value => {
      if (pending) await pending;
      if (failure) throw Error('isolated_storage_failure');
      prefs = { ...value }; writes.push({ ...value }); listeners.forEach(fn => fn());
    },
  };
  return originalLoad.call(this, name, parent, main);
};
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, file);
const Settings = require('../../src/services/AiSettingsSection.tsx').default;
const switches = () => tree.root.findAllByType('Switch');
const setup = async signed => {
  user = signed ? 'ISOLATED_A' : null; replicaOwner = user;
  prefs = { ownerId: null, enabled: false, includeImportedContext: false };
  failure = false; pending = undefined; writes = [];
  await act(async () => { tree = create(React.createElement(Settings)); });
};
afterEach(async () => { if (tree) await act(async () => tree.unmount()); tree = undefined; });
test('signed-out normal settings show disabled controls and an actionable account instruction', async () => {
  await setup(false);
  assert.ok(switches().every(row => row.props.disabled && !row.props.value));
  assert.match(tree.root.findAllByType('Text').map(row => row.children.join('')).join('\n'), /Sign in/);
  assert.equal(writes.length, 0);
});
test('enable is owner-bound and imported context remains separately off until explicit selection', async () => {
  await setup(true);
  await act(async () => switches()[0].props.onValueChange(true));
  assert.deepEqual(writes[0], { ownerId: 'ISOLATED_A', enabled: true, includeImportedContext: false });
  assert.equal(switches()[0].props.value, true); assert.equal(switches()[1].props.value, false);
  await act(async () => switches()[1].props.onValueChange(true));
  assert.equal(writes[1].includeImportedContext, true);
  await act(async () => switches()[0].props.onValueChange(false));
  assert.ok(switches()[1].props.disabled && !switches()[1].props.value);
});
test('account replacement cannot inherit cloud or imported-context consent', async () => {
  await setup(true);
  await act(async () => switches()[0].props.onValueChange(true));
  user = replicaOwner = 'ISOLATED_B';
  await act(async () => authObserver('SIGNED_IN', { user: { id: user } }));
  assert.ok(switches().every(row => !row.props.value));
  await act(async () => switches()[0].props.onValueChange(true));
  assert.deepEqual(writes.at(-1), { ownerId: 'ISOLATED_B', enabled: true, includeImportedContext: false });
});
test('mismatched replica or failed persistence displays error without changing consent', async () => {
  await setup(true); replicaOwner = 'OTHER';
  await act(async () => switches()[0].props.onValueChange(true));
  assert.equal(writes.length, 0); assert.equal(switches()[0].props.value, false);
  assert.equal(tree.root.findAll(node => node.type === 'Text' && node.props.accessibilityRole === 'alert').length, 1);
  replicaOwner = user; failure = true;
  await act(async () => switches()[0].props.onValueChange(true));
  assert.equal(writes.length, 0); assert.equal(switches()[0].props.value, false);
});
test('pending consent save disables both controls until acknowledged', async () => {
  await setup(true); let complete;
  pending = new Promise(resolve => { complete = resolve; });
  let job;
  await act(async () => { job = switches()[0].props.onValueChange(true); await Promise.resolve(); });
  assert.ok(switches().every(row => row.props.disabled));
  await act(async () => { complete(); await job; });
  assert.equal(switches()[0].props.value, true); assert.equal(writes.length, 1);
});
