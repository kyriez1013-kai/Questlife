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
  if (request.endsWith('V11SheetControls')) return { V11InlineButton: 'InlineButton', V11SheetButton: 'SheetButton' };
  if (request.endsWith('useV11ReducedMotion')) return { __esModule: true, default: () => false };
  if (request.endsWith('V11Stage2ProductionSheet')) return { __esModule: true, default: 'Sheet' };
  if (request.endsWith('V11RebaselineIcon')) return { __esModule: true, default: 'Icon' };
  if (request.endsWith('.styles')) return {};
  if (/\/store$|\/services\//.test(request)) throw Error('History presentation must not own business data');
  return original.call(this, request, parent, main);
};
require.extensions['.tsx'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
}).outputText, file);
const Sheet = require('../../src/components/today/V11ActivityHistorySheet.tsx').default;
const records = ['first', 'middle', 'last'].map(id => ({ id, title: `Title ${id}`, note: `Note ${id}`, time: '12:00' }));
const base = { records, visible: true, closeLabel: 'Close', deleteLabel: 'Delete', detailTitle: 'Record', emptyLabel: 'Empty',
  feedbackTitle: 'Feedback', historyTitle: 'History', loadMoreLabel: 'More', onClose() {}, onDeleteRecord() {},
  getRecordFeedback: id => ({ summary: `Feedback ${id}`, detail: `Detail ${id}` }),
  theme: { text: { primary: '#fff', secondary: '#ccc', metadata: '#bbb' }, glow: { primary: '#fff' } } };
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
