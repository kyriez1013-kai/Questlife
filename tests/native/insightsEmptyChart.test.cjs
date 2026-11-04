const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { test, afterEach } = require('node:test');
const ts = require('typescript');
const runtime = process.env.QUESTLIFE_UI_TEST_RUNTIME;
if (!runtime) throw Error('QUESTLIFE_UI_TEST_RUNTIME required');
const React = require(path.join(runtime, 'react'));
const { create, act } = require(path.join(runtime, 'react-test-renderer'));
global.IS_REACT_ACT_ENVIRONMENT = true;
const original = Module._load;
Module._load = function(request, parent, main) {
  if (request === 'react') return React;
  if (request === 'react/jsx-runtime') return require(path.join(runtime, 'react/jsx-runtime'));
  if (request === 'react-native') return { Text: 'Text', View: 'View', Pressable: 'Pressable' };
  if (request.endsWith('/V11SheetControls')) return { V11SheetButton: 'Button' };
  return original.call(this, request, parent, main);
};
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText, file);
const Chart = require('../../src/v11-insights/personal-terminal/PersonalTerminalChart.tsx').default;
let tree, clicks;
async function render({ observations = [], line = [], language = 'en' } = {}) {
  clicks = 0;
  await act(async () => { tree = create(React.createElement(Chart, {
    chartKind: 'line', indicators: new Set(), language, onCrosshair() {}, onSelectEvent() {}, onSelectSelection() {}, onRecordObservation: () => clicks++,
    rangeSelection: { start: null, end: null }, reducedMotion: true, series: { id: 'isolated-state', observations, events: [], baseline: { value: null } },
    theme: { text: { primary: '#111', secondary: '#333', metadata: '#555' } }, timeframe: '1M',
    viewData: { line, observations: line, candles: [], incompleteCandles: [], load: [], emaShort: [], emaLong: [], timeframe: '1M' },
  })); });
}
const text = () => tree.root.findAllByType('Text').map(node => node.children.join('')).join('|');
afterEach(async () => { if (tree) await act(async () => tree.unmount()); tree = null; });
test('empty personal chart has a working observation entry, not a dead end', async () => {
  await render(); const buttons = tree.root.findAllByType('Button');
  assert.equal(buttons.length, 1);
  assert.equal(buttons[0].props.label, 'Record an observation');
  await act(async () => buttons[0].props.onPress()); assert.equal(clicks, 1);
  assert.match(text(), /Enough comparable observations/);
});
test('an empty selected range is not described as missing all personal history', async () => {
  await render({ observations: [{ id: 'old-observation', value: 3 }], language: 'zh' });
  assert.match(text(), /所选范围/); assert.doesNotMatch(text(), /等待第一条/);
});
test('chart with a real point does not show an empty-state action or fabricated baseline', async () => {
  await render({ observations: [{ id: 'one', value: 3 }], line: [{ time: '2026-11-04', value: 3, observationCount: 1, sourceIds: ['one'] }] });
  assert.equal(tree.root.findAllByType('Button').length, 0);
  assert.equal(tree.root.findAll(node => node.props.dataSet?.['personal-terminal-role'] === 'baseline-band').length, 0);
});
