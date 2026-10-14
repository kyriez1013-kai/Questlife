const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const runtime = process.env.QUESTLIFE_UI_TEST_RUNTIME;
if (!runtime) throw Error('QUESTLIFE_UI_TEST_RUNTIME required');
const React = require(path.join(runtime, 'react'));
const { create, act } = require(path.join(runtime, 'react-test-renderer'));
global.IS_REACT_ACT_ENVIRONMENT = true;
const original = Module._load;
Module._load = function(request, parent, main) {
  if (request === 'react') return React;
  if (request === 'react-native') return { Pressable: 'Pressable', Text: 'Text', View: 'View' };
  if (request.endsWith('/i18n')) return { t: (_, key) => key };
  if (request.endsWith('V11SheetControls')) return { V11InlineButton: 'InlineButton', V11SheetButton: 'SheetButton', V11TextField: 'TextField' };
  if (request.endsWith('useV11ReducedMotion')) return { __esModule: true, default: () => false };
  if (request.endsWith('V11Stage2ProductionSheet')) return { __esModule: true, default: 'Sheet' };
  if (request.endsWith('V11RebaselineIcon')) return { __esModule: true, default: 'Icon' };
  if (request.endsWith('.styles')) return {};
  if (/\/store$|\/services\//.test(request)) throw Error('History presentation must not own business data');
  return original.call(this, request, parent, main);
};
for (const extension of ['.ts', '.tsx']) require.extensions[extension] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
}).outputText, file);
const Sheet = require('../../src/components/today/V11ActivityHistorySheet.tsx').default;
const records = ['first', 'middle', 'last'].map(id => ({ id, title: `Title ${id}`, note: `Note ${id}`, time: '12:00', durationMinutes: 7, canEditDuration: true }));
const base = { records, visible: true, closeLabel: 'Close', deleteLabel: 'Delete', detailTitle: 'Record', emptyLabel: 'Empty',
  feedbackTitle: 'Feedback', historyTitle: 'History', loadMoreLabel: 'More', language: 'en', onClose() {}, onDeleteRecord() {}, onUpdateRecord() {},
  waitForLocalWrites: async () => {}, retryLocalWrites: async () => {},
  getRecordFeedback: id => ({ summary: `Feedback ${id}`, detail: `Detail ${id}` }),
  theme: { text: { primary: '#fff', secondary: '#ccc', metadata: '#bbb' }, glow: { primary: '#fff' }, control: { error: '#f00' } } };
const text = tree => JSON.stringify(tree.toJSON());

for (const id of ['first', 'middle', 'last']) test(`feedback entry targets exact ${id} record and survives sorting/insertion`, async () => {
  const deleted = [];
  const props = { ...base, initialRecordId: id, onDeleteRecord: value => deleted.push(value) };
  let tree;
  try {
    await act(async () => { tree = create(React.createElement(Sheet, props)); });
    assert.equal(tree.root.findByType('Sheet').props.title, 'Record');
    assert.match(text(tree), new RegExp(`Feedback ${id}`));
    await act(async () => tree.update(React.createElement(Sheet, { ...props, records: [{ id:'new',title:'New',time:'13:00' }, ...[...records].reverse()] })));
    assert.match(text(tree), new RegExp(`Note ${id}`));
    await act(async () => tree.root.findAllByType('InlineButton').find(node => node.props.label === 'Delete').props.onPress());
    assert.deepEqual(deleted, [id]);
    await act(async () => tree.update(React.createElement(Sheet, { ...props, records: records.filter(record => record.id !== id) })));
    assert.equal(tree.root.findByType('Sheet').props.title, 'History · 2');
    assert.doesNotMatch(text(tree), /Feedback (first|middle|last)/);
  } finally { if (tree) await act(async () => tree.unmount()); }
});

test('back navigation, close and ordinary history reopen do not retain another entry target', async () => {
  let tree;
  try {
    await act(async () => { tree = create(React.createElement(Sheet, { ...base, initialRecordId:'middle' })); });
    await act(async () => tree.root.findAllByType('InlineButton').find(node => node.props.label === 'History').props.onPress());
    assert.equal(tree.root.findByType('Sheet').props.title, 'History · 3');
    await act(async () => tree.update(React.createElement(Sheet, { ...base, initialRecordId:'middle', visible:false })));
    await act(async () => tree.update(React.createElement(Sheet, base)));
    assert.equal(tree.root.findByType('Sheet').props.title, 'History · 3');
    await act(async () => tree.update(React.createElement(Sheet, { ...base, visible:false })));
    await act(async () => tree.update(React.createElement(Sheet, { ...base, initialRecordId:'last' })));
    assert.match(text(tree), /Feedback last/);
  } finally { if (tree) await act(async () => tree.unmount()); }
});

test('missing record or missing feedback cannot borrow another record feedback', async () => {
  let tree;
  try {
    await act(async () => { tree = create(React.createElement(Sheet, { ...base, initialRecordId:'missing' })); });
    assert.equal(tree.root.findByType('Sheet').props.title, 'History · 3');
    await act(async () => tree.update(React.createElement(Sheet, { ...base, initialRecordId:'first', getRecordFeedback:()=>undefined })));
    assert.match(text(tree), /Note first/);
    assert.doesNotMatch(text(tree), /record-feedback|Feedback first/);
  } finally { if (tree) await act(async () => tree.unmount()); }
});

const action = (tree, label) => tree.root.findAll(node => ['InlineButton', 'SheetButton'].includes(node.type) && node.props.label === label)[0];
const field = (tree, label) => tree.root.findAllByType('TextField').find(node => node.props.accessibilityLabel === label);
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
async function edit(tree) {
  await act(async () => action(tree, 'edit').props.onPress());
  await act(async () => {
    field(tree, 'minutesQuestion').props.onChangeText('19');
    field(tree, 'noteOptional').props.onChangeText('  Edited note  ');
  });
}

test('edit waits for durable ACK and synchronously guards duplicate save, dismiss, back, cancel and delete', async () => {
  const receipt = deferred(); const writes = []; let closed = 0, deleted = 0, waits = 0; let tree;
  try {
    await act(async () => { tree = create(React.createElement(Sheet, { ...base, initialRecordId: 'middle',
      onClose: () => closed++, onDeleteRecord: () => deleted++, onUpdateRecord: (...args) => writes.push(args),
      waitForLocalWrites: () => { waits++; return receipt.promise; } })); });
    await edit(tree);
    const save = action(tree, 'save').props.onPress;
    await act(async () => {
      void save(); void save();
      tree.root.findByType('Sheet').props.onClose();
      action(tree, 'History').props.onPress();
      action(tree, 'cancel').props.onPress();
      action(tree, 'Delete').props.onPress();
    });
    assert.deepEqual(writes, [['middle', { durationMinutes: 19, note: 'Edited note' }]]);
    assert.equal(waits, 1); assert.equal(closed, 0); assert.equal(deleted, 0);
    assert.equal(action(tree, 'savingRecord').props.loading, true);
    assert.equal(field(tree, 'noteOptional').props.disabled, true);
    await act(async () => receipt.resolve());
    assert.equal(tree.root.findAllByType('TextField').length, 0);
    assert.ok(action(tree, 'edit'));
    await act(async () => tree.root.findByType('Sheet').props.onClose());
    assert.equal(closed, 1);
  } finally { if (tree) await act(async () => tree.unmount()); }
});

test('failed save retains the exact draft across optimistic updates and retries only the queued write', async () => {
  const writes = []; let retries = 0, closed = 0; let tree;
  const props = { ...base, initialRecordId: 'middle', onClose: () => closed++,
    onUpdateRecord: (...args) => writes.push(args), waitForLocalWrites: async () => { throw Error('DISK_FULL'); },
    retryLocalWrites: async () => { if (++retries === 1) throw Error('STILL_FULL'); } };
  try {
    await act(async () => { tree = create(React.createElement(Sheet, props)); });
    await edit(tree);
    await act(async () => action(tree, 'save').props.onPress());
    assert.match(text(tree), /captureSaveRetry/);
    await act(async () => tree.update(React.createElement(Sheet, { ...props, records: records.map(record => record.id === 'middle' ? { ...record, durationMinutes: 19, note: 'Edited note' } : record) })));
    await act(async () => {
      field(tree, 'noteOptional').props.onChangeText('Must not replace queued draft');
      field(tree, 'minutesQuestion').props.onChangeText('99');
      tree.root.findByType('Sheet').props.onClose();
      action(tree, 'cancel').props.onPress();
      action(tree, 'History').props.onPress();
    });
    assert.equal(closed, 0);
    assert.equal(field(tree, 'noteOptional').props.value, '  Edited note  ');
    assert.equal(field(tree, 'minutesQuestion').props.value, '19');
    await act(async () => action(tree, 'save').props.onPress());
    assert.match(text(tree), /captureSaveRetry/);
    await act(async () => action(tree, 'save').props.onPress());
    assert.equal(retries, 2); assert.equal(writes.length, 1);
    assert.equal(tree.root.findAllByType('TextField').length, 0);
  } finally { if (tree) await act(async () => tree.unmount()); }
});

test('invalid duration writes nothing and a note-only edit preserves unknown duration', async () => {
  const writes = []; let tree;
  try {
    const props = { ...base, initialRecordId: 'middle', onUpdateRecord: (...args) => writes.push(args) };
    await act(async () => { tree = create(React.createElement(Sheet, props)); });
    await edit(tree);
    for (const value of ['0', '-1', '1.5', 'NaN']) {
      await act(async () => field(tree, 'minutesQuestion').props.onChangeText(value));
      await act(async () => action(tree, 'save').props.onPress());
      assert.equal(writes.length, 0); assert.match(text(tree), /invalidMinutes/);
    }
    await act(async () => action(tree, 'cancel').props.onPress());
    await act(async () => tree.update(React.createElement(Sheet, { ...props, records: records.map(record => ({ ...record, durationMinutes: 0, canEditDuration: false })) })));
    await act(async () => action(tree, 'edit').props.onPress());
    await act(async () => field(tree, 'noteOptional').props.onChangeText('Note only'));
    await act(async () => action(tree, 'save').props.onPress());
    assert.deepEqual(writes, [['middle', { durationMinutes: undefined, note: 'Note only' }]]);
  } finally { if (tree) await act(async () => tree.unmount()); }
});
