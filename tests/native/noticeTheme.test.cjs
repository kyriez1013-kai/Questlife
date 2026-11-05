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
let preference = 'cleanFocus', platform = 'web', tree;
global.window = { location: { search: '' }, addEventListener() {}, removeEventListener() {} };
Object.defineProperty(global, 'navigator', { configurable: true, value: { onLine: false } });
const realLoad = Module._load;
Module._load = function(request, parent, main) {
  if (request === 'react') return React;
  if (request === 'react/jsx-runtime') return require(path.join(runtime, 'react/jsx-runtime'));
  if (request === 'react-native') return { Text: 'Text', View: 'View', Platform: { get OS() { return platform; } }, useColorScheme: () => null };
  if (request === '../store') return { useStore: () => ({ data: { settings: { language: 'zh', selectedThemeId: preference } }, localPersistence: { failed: 1 }, retryLocalWrites: async () => {} }) };
  if (request === './ui/QuestButton') return props => React.createElement('Button', props);
  return realLoad.call(this, request, parent, main);
};
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText, file);
const { questThemes } = require('../../src/design/tokens.ts');
const OfflineNotice = require('../../src/components/OfflineNotice.tsx').default;
const LocalPersistenceNotice = require('../../src/components/LocalPersistenceNotice.tsx').default;
afterEach(async () => { if (tree) await act(async () => tree.unmount()); tree = undefined; });
for (const [name, Component] of [['offline', OfflineNotice], ['local save error', LocalPersistenceNotice]]) {
  for (const [search, stored, expected] of [
    ['?debugTheme=dark', 'cleanFocus', 'deepWork'],
    ['?debugTheme=light', 'deepWork', 'cleanFocus'],
    ['', 'deepWork', 'deepWork'],
    ['', 'cleanFocus', 'cleanFocus'],
  ]) test(`${name} notice matches root theme (${search || stored})`, async () => {
    platform = 'web'; preference = stored; window.location.search = search;
    await act(async () => { tree = create(React.createElement(Component)); });
    assert.equal(tree.root.findAllByType('View')[0].props.style.backgroundColor, questThemes[expected].colors.surfaceElevated);
    assert.equal(tree.root.findAllByType('Text')[0].props.style.color, questThemes[expected].colors.text);
  });
}
test('native save error retains the stored theme, not a web query', async () => {
  platform = 'ios'; preference = 'cleanFocus'; window.location.search = '?debugTheme=dark';
  await act(async () => { tree = create(React.createElement(LocalPersistenceNotice)); });
  assert.equal(tree.root.findAllByType('View')[0].props.style.backgroundColor, questThemes.cleanFocus.colors.surfaceElevated);
});
