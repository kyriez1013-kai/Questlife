// Exercise the real in-app intent bus. No notification provider or Store is loaded.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const runtime = process.env.QUESTLIFE_UI_TEST_RUNTIME;
if (!runtime) throw Error('QUESTLIFE_UI_TEST_RUNTIME is required');
const React = require(path.join(runtime, 'react'));
const { create, act } = require(path.join(runtime, 'react-test-renderer'));
global.IS_REACT_ACT_ENVIRONMENT = true;
const original = Module._load;
Module._load = function(request, parent, main) {
  if (request === 'react') return React;
  if (/expo-notifications|\/store$/.test(request)) throw Error('In-app navigation must not load OS services or Store');
  return original.call(this, request, parent, main);
};
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, file);
const { deliverNotificationIntent, clearPendingNotificationIntent } = require('../../src/platform/notifications/intentBus.ts');

for (const suffix of ['', '.native']) test(`in-app intent survives navigation and uses current handler ${suffix || 'web'}`, async () => {
  clearPendingNotificationIntent();
  const { useQuickActions } = require(`../../src/platform/notifications/useQuickActions${suffix}.ts`);
  const calls = [];
  const intent = { action: 'OPEN', kind: 'skill_reminder', entityId: 'TEST_SKILL', notificationId: 'TEST_OPEN' };
  const Host = ({ version }) => { useQuickActions(value => calls.push({ version, value })); return null; };
  deliverNotificationIntent(intent);
  let tree;
  try {
    await act(async () => { tree = create(React.createElement(Host, { version: 1 })); });
    assert.deepEqual(calls, [{ version: 1, value: intent }]);
    await act(async () => tree.update(React.createElement(Host, { version: 2 })));
    assert.equal(calls.length, 1);
    await act(async () => deliverNotificationIntent({ ...intent, entityId: 'TEST_OTHER' }));
    assert.equal(calls[1].version, 2);
    assert.equal(calls[1].value.entityId, 'TEST_OTHER');
    await act(async () => tree.unmount()); tree = null;
    deliverNotificationIntent(intent);
    assert.equal(calls.length, 2);
    clearPendingNotificationIntent();
    await act(async () => { tree = create(React.createElement(Host, { version: 3 })); });
    assert.equal(calls.length, 2, 'cleared account-session intent must not leak into a later mount');
  } finally {
    if (tree) await act(async () => tree.unmount());
    clearPendingNotificationIntent();
  }
});
