// Isolated rendered form tests. Store/OS/network are doubles; no real records.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { test, afterEach } = require('node:test');
const ts = require('typescript');
const runtime = process.env.QUESTLIFE_UI_TEST_RUNTIME;
if (!runtime) throw Error('Set QUESTLIFE_UI_TEST_RUNTIME to an isolated React 19.1 test runtime');
const React = require(path.join(runtime, 'react'));
const { create, act } = require(path.join(runtime, 'react-test-renderer'));
global.IS_REACT_ACT_ENVIRONMENT = true;
const RealDate = Date;
global.Date = class extends RealDate {
  constructor(...args) { super(...(args.length ? args : ['2026-11-05T01:00:00Z'])); }
  static now() { return new RealDate('2026-11-05T01:00:00Z').getTime(); }
};
let tree, writes, closed, completed, wait, retries, planGate, plans;
const store = { data: { scheduleBlocks: [] }, addContextLog: record => writes.push(record),
  waitForLocalWrites: () => wait(), retryLocalWrites: async () => { retries++; } };
const plan = { preview: input => input, confirmAndApply: async input => { plans++; if (planGate) await planGate.promise; return { episode: { id: 'qa-episode' }, patch: input.patch }; } };
const host = name => props => React.createElement(name, props, props.children);
const controls = Object.fromEntries(['V11CategoricalChip', 'V11SegmentedSelector', 'V11StickySheetFooter', 'V11TextField'].map(name => [name, host(name)]));
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === 'react') return React;
  if (request === 'react/jsx-runtime') return require(path.join(runtime, 'react/jsx-runtime'));
  if (request === 'react-native') return { Text: 'Text', View: 'View' };
  if (request === '../store') return { useStore: () => store };
  if (request.endsWith('/V11Stage2ProductionSheet')) return host('Sheet');
  if (request.endsWith('/V11SheetControls')) return controls;
  if (request === './useStateLayerActions') return { errorReason: e => e.message, useStateLayerPlan: () => plan };
  return originalLoad.call(this, request, parent, isMain);
};
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, file);
const Form = require('../../src/state-layer/StateBrainDumpSheet.tsx').default;
const footer = () => tree.root.findByType('Sheet').props.footer.props;
const deferred = () => { let resolve; const promise = new Promise(done => resolve = done); return { promise, resolve }; };
async function render() {
  writes = []; closed = 0; completed = []; retries = 0; plans = 0; planGate = null; wait = async () => {};
  await act(async () => { tree = create(React.createElement(Form, { visible: true, lang: 'en', ruleId: 'qa-rule', reducedMotion: true,
    theme: { text: { primary: '#111', secondary: '#333', metadata: '#555' } }, onClose: () => closed++, onDone: (...args) => completed.push(args) })); });
}
async function prepare(choice = 'now') {
  await act(async () => tree.root.findByType('V11TextField').props.onChangeText('Isolated QA task'));
  await act(async () => footer().onSave());
  await act(async () => tree.root.findByType('V11SegmentedSelector').props.onChange(choice));
  if (choice === 'schedule') await act(async () => tree.root.findAllByType('V11CategoricalChip')[0].props.onPress());
}
afterEach(async () => { if (tree) await act(async () => tree.unmount()); tree = null; });

test('failed ACK keeps the original draft reachable and retry saves exactly once', async () => {
  await render(); await prepare();
  wait = async () => { throw Error('TEST_WRITE_FAILED'); };
  await act(async () => footer().onSave());
  assert.equal(writes.length, 1);
  assert.equal(completed.length, 0);
  assert.equal(footer().messageStatus, 'error');
  await act(async () => tree.root.findByType('Sheet').props.onClose());
  assert.equal(closed, 0, 'must not discard a queued submission on close');
  await act(async () => footer().onCancel());
  assert.equal(tree.root.findAllByType('V11SegmentedSelector').length, 1, 'back must not hide failed pending draft');
  assert.equal(tree.root.findByType('V11SegmentedSelector').props.disabled, true);
  wait = async () => {};
  await act(async () => footer().onSave());
  assert.equal(writes.length, 1);
  assert.equal(retries, 1);
  assert.equal(completed.length, 1);
});

test('scheduled save coalesces double taps and blocks dismissal until the receipt', async () => {
  await render(); await prepare('schedule');
  planGate = deferred();
  await act(async () => { const save = footer().onSave; save(); save(); });
  assert.equal(plans, 1, 'double tap must not apply the schedule twice');
  await act(async () => tree.root.findByType('Sheet').props.onClose());
  assert.equal(closed, 0);
  assert.equal(completed.length, 0);
  await act(async () => planGate.resolve());
  assert.equal(writes.length, 1);
  assert.equal(completed.length, 1);
});

test('unsaved draft can cancel without making any business writes', async () => {
  await render();
  await act(async () => tree.root.findByType('V11TextField').props.onChangeText('Discard this draft'));
  await act(async () => footer().onCancel());
  assert.equal(closed, 1); assert.equal(writes.length, 0); assert.equal(plans, 0);
});

test('success waits for the actual persistence receipt', async () => {
  await render(); await prepare(); const gate = deferred(); wait = () => gate.promise;
  await act(async () => footer().onSave());
  assert.equal(writes.length, 1); assert.equal(completed.length, 0); assert.equal(footer().saving, true);
  await act(async () => gate.resolve());
  assert.equal(completed.length, 1); assert.equal(footer().saving, false);
});
