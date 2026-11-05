const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { test, afterEach, mock } = require('node:test');
const ts = require('typescript');
const runtime = process.env.QUESTLIFE_UI_TEST_RUNTIME;
if (!runtime) throw Error('QUESTLIFE_UI_TEST_RUNTIME required');
const React = require(path.join(runtime, 'react'));
const { create, act } = require(path.join(runtime, 'react-test-renderer'));
global.IS_REACT_ACT_ENVIRONMENT = true;
const realLoad = Module._load;
Module._load = function(request, parent, main) {
  if (request === 'react') return React;
  if (request === 'react/jsx-runtime') return require(path.join(runtime, 'react/jsx-runtime'));
  if (request === 'react-native') return { Text: 'Text', View: 'View', ActivityIndicator: 'Loading' };
  if (request === './ui/QuestButton') return props => React.createElement('Button', props);
  return realLoad.call(this, request, parent, main);
};
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText, file);
const RetryableScreen = require('../../src/components/RetryableScreen.tsx').default;
const { questThemes } = require('../../src/design/tokens.ts');
let tree;
const page = (load, lang = 'zh') => React.createElement('Navigation', null,
  React.createElement('TabBar'), React.createElement(RetryableScreen, { load, lang, questTheme: questThemes.deepWork }));
afterEach(async () => { if (tree) await act(async () => tree.unmount()); tree = undefined; mock.restoreAll(); });

for (const lang of ['zh', 'en']) test(`screen load error retains navigation and a real retry (${lang})`, async () => {
  mock.method(console, 'error', () => {}); // Expected React boundary logging; no user records/errors logged.
  let calls = 0;
  const load = async () => { calls++; if (calls === 1) throw Error('TEST_OFFLINE'); return { default: () => React.createElement('LoadedInsights') }; };
  await act(async () => { tree = create(page(load, lang)); });
  assert.equal(tree.root.findAllByType('TabBar').length, 1);
  const texts = tree.root.findAllByType('Text').map(row => row.props.children).join(' ');
  assert.match(texts, lang === 'zh' ? /无法加载/ : /could not load/);
  assert.doesNotMatch(texts, /insufficient|not enough|数据不足/i);
  assert.equal(tree.root.findByType('Button').props.label, lang === 'zh' ? '重试加载' : 'Retry loading');
  await act(async () => tree.root.findByType('Button').props.onPress());
  assert.equal(calls, 2);
  assert.equal(tree.root.findAllByType('LoadedInsights').length, 1);
  assert.equal(tree.root.findAllByType('TabBar').length, 1);
  assert.equal(tree.root.findAllByType('Button').length, 0);
});

test('pending load keeps one request through parent rerenders', async () => {
  let finish, calls = 0;
  const promise = new Promise(resolve => { finish = resolve; });
  const load = () => { calls++; return promise; };
  await act(async () => { tree = create(page(load)); });
  assert.equal(tree.root.findByType('Loading').props.accessibilityLabel, '正在加载页面');
  await act(async () => tree.update(page(load, 'en')));
  assert.equal(calls, 1);
  await act(async () => { finish({ default: () => React.createElement('LoadedInsights') }); });
  assert.equal(tree.root.findAllByType('LoadedInsights').length, 1);
});

test('Insights entry wraps both actual lazy loaders without changing the legacy Stats route', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../../App.web.tsx'), 'utf8');
  assert.match(source, /loadInsightsV3Screen = \(\) => import\('\.\/src\/insights-v3\/InsightsV3Screen'\)/);
  assert.match(source, /loadV11InsightsScreen = \(\) => import\('\.\/src\/v11-insights\/V11InsightsScreen'\)/);
  assert.match(source, /RetryableScreen load=\{insightsV3Enabled \? loadInsightsV3Screen : loadV11InsightsScreen\}/);
  assert.match(source, /: <StatsScreen \/>/);
});
