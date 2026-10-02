// Isolated render test: native controls use the existing DecisionEpisode, not fixture UI state.
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
const root = path.resolve(__dirname, '../..');
const load = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === 'react') return React;
  if (request === 'react/jsx-runtime') return require(path.join(runtime, 'react/jsx-runtime'));
  if (request === 'react-native') return { View: 'View', Text: 'Text', Pressable: 'Pressable', Platform: { OS: 'android' } };
  return load.call(this, request, parent, isMain);
};
for (const extension of ['.ts', '.tsx']) require.extensions[extension] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } }).outputText, filename);
};

const { beginDecisionEpisode, proposeDecisionEpisode } = require(path.join(root, 'src/adaptive-decision/decisionEngine.ts'));
const NativeDecisionWorkspace = require(path.join(root, 'src/adaptive-decision/NativeDecisionWorkspace.tsx')).default;
const theme = { text: { primary: '#fff', secondary: '#aaa' }, control: {
  neutralSurface: '#222', neutralBorder: '#444', neutralSelectedSurface: '#333',
  neutralSelectedBorder: '#888', neutralAction: '#ddd', neutralActionText: '#111', error: '#f88',
} };
const now = '2026-10-03T08:00:00Z';
const draft = beginDecisionEpisode({ id: 'isolated-native-decision', questionType: 'custom', questionText: 'Given what I have recorded, what is next?', subjectKind: 'owner',
  now, timezone: 'UTC', observationWindowStart: '2026-09-05T08:00:00Z' });
const episode = proposeDecisionEpisode({ episode: draft, data: {
  stateCheckIns: [], contextLogs: [], executionLogs: [], scheduleBlocks: [], goals: [], categories: [], skills: [],
}, now });

test('native decision shows a real proposal, evidence entry, and explicit Apply control', async () => {
  let applied = 0;
  let tree;
  await act(async () => { tree = create(React.createElement(NativeDecisionWorkspace, {
    episode, activeActionId: episode.candidateActions[0].id, answers: {}, canApply: true,
    lang: 'en', onAnswer() {}, onApply() { applied++; }, onSelectAction() {}, onUndo() {},
    scheduleBlocks: [], theme,
  })); });
  const visible = tree.root.findAllByType('Text').map(node => node.children.join('')).join(' ');
  assert.match(visible, /Given what I have recorded/);
  const controls = tree.root.findAllByType('Pressable');
  const apply = controls.find(node => node.props.accessibilityRole === 'button' && node.findAllByType('Text').some(text => text.children.join('').includes('Apply adjustment')));
  assert.ok(apply);
  await act(async () => apply.props.onPress());
  assert.equal(applied, 1);
  const evidence = controls.find(node => node.props.accessibilityState?.expanded === false);
  assert.ok(evidence);
  await act(async () => evidence.props.onPress());
  assert.equal(tree.root.findAll(node => node.props.accessibilityState?.expanded === true).length, 1);
  await act(async () => tree.unmount());
});
