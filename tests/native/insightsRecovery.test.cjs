const assert = require('node:assert/strict');
const { test, afterEach } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const runtime = process.env.QUESTLIFE_UI_TEST_RUNTIME;
if (!runtime) throw Error('QUESTLIFE_UI_TEST_RUNTIME is required');
const React = require(path.join(runtime, 'react'));
const { create, act } = require(path.join(runtime, 'react-test-renderer'));
global.IS_REACT_ACT_ENVIRONMENT = true;
let data, focused, user, authListener, appListener, tree;
let calls = [], jobs = [], sampleJob, analysisResult;
const theme = { spacing: { sm: 8, xxl: 24 }, colors: { primary: '#555' } };
const load = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === 'react') return React;
  if (request === 'react/jsx-runtime') return require(path.join(runtime, 'react/jsx-runtime'));
  if (request === 'react-native') return { View: 'View', Text: 'Text', ActivityIndicator: 'Spinner', AppState: { currentState: 'active', addEventListener: (_, fn) => { appListener = fn; return { remove() { appListener = null; } }; } } };
  if (request === 'react-native-webview') return { WebView: React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({ injectJavaScript: script => calls.push(script) }));
    return React.createElement('WebView', props);
  }) };
  if (request === '@react-navigation/native') return { useIsFocused: () => focused };
  if (/\/store$/.test(request)) return { useStore: () => ({ data }) };
  if (/\/useQuestTheme$/.test(request)) return { useQuestTheme: () => theme };
  if (/\/useDeviceData$/.test(request)) return { useDeviceData: () => ({ data: { observations: [] }, error: false }) };
  if (/\/normalization$/.test(request)) return { withDeviceObservations: value => value };
  if (/\/supabase$/.test(request)) return { authService: { getUserId: async () => user, subscribe: fn => { authListener = fn; return () => { authListener = null; }; } } };
  if (/\/ownerQuantRuntime$/.test(request)) return {
    buildOwnerQuantSnapshot: value => value.executions,
    loadOwnerQuantArtifacts: args => { calls.push(args); const job = deferred(); jobs.push(job); return job.promise; },
  };
  if (/\/insightsV3Source$/.test(request)) return { hasInsightsV3DetailBundle: () => true, loadInsightsV3DetailBundle: () => sampleJob.promise };
  if (/\/insightsV3AnalysisSource$/.test(request)) return { loadInsightsV3AnalysisExtension: async () => analysisResult };
  if (/\/RecordBackupActions$/.test(request)) return { __esModule: true, default: () => React.createElement('Backup') };
  if (/\/NativeInsightsWorkspace$/.test(request)) return { __esModule: true, default: props => React.createElement('Workspace', props) };
  if (/\/localChartAsset$/.test(request)) return { chartHtml: '<html></html>' };
  if (request === './InsightsControls') return { insightsStyles: () => ({ body: {}, meta: {} }), InsightButton: props => React.createElement('Button', props) };
  return load.call(this, request, parent, isMain);
};
for (const extension of ['.ts', '.tsx']) require.extensions[extension] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
};
const Experience = require('../../src/native/insights/NativeInsightsExperience.tsx').default;
const Chart = require('../../src/native/insights/NativeInsightsChart.native.tsx').default;
const { ni } = require('../../src/native/insights/nativeInsightsStrings.ts');
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
const available = id => ({ status: 'available', product: { metadata: { subject_id: user, bundle_id: id } }, eligibleObservationCount: 1, excludedObservationCount: 0, cacheHit: false, limitations: [] });
const empty = () => ({ status: 'no_eligible_data', eligibleObservationCount: 0, excludedObservationCount: 0, cacheHit: false, limitations: [] });
const props = () => tree.root.findByType('Workspace').props;
const records = executions => ({ executions, skills: [], categories: [], settings: { selectedThemeId: 'cleanFocus', language: 'en' } });
async function mount() { data = records([]); focused = true; user = 'isolated-recovery-a'; calls = []; jobs = []; sampleJob = deferred(); analysisResult = { ok: false, code: 'NOT_AVAILABLE', issues: [], durationMs: 0 }; await act(async () => { tree = create(React.createElement(Experience)); }); }
async function update() { await act(async () => tree.update(React.createElement(Experience))); }
async function settle(job, result) { await act(async () => job.resolve(result)); }
afterEach(async () => { if (tree) await act(async () => tree.unmount()); tree = undefined; });

test('normal Insights entry automatically uses the existing runtime without a debug entrance', async () => {
  await mount(); assert.equal(calls.length, 1); assert.equal(props().state.busy, true);
  await settle(jobs[0], available('first')); assert.equal(props().bundle.metadata.bundle_id, 'first');
});
for (const lang of ['zh', 'en']) {
  test(`${lang} data-use notice discloses automatic analysis on entry, changes and return`, async () => {
    await mount(); await settle(jobs[0], empty());
    data = records([{ id: 'isolated-new-observation' }]); await update();
    await settle(jobs[1], empty());
    await act(async () => appListener('background'));
    await act(async () => appListener('active'));
    assert.equal(jobs.length, 3, 'these are automatic loads, with no manual refresh');
    const notice = ni(lang, 'consent');
    assert.doesNotMatch(notice, lang === 'zh' ? /仅在你点击/ : /only when you load or refresh/i,
      'the data-use notice must not promise manual-only requests while the screen auto-loads');
    assert.match(notice, lang === 'zh' ? /自动/ : /automatically/i);
    assert.match(notice, lang === 'zh' ? /健康.*另行同意/ : /health.*separate.*consent/i);
    const importNotice = ni(lang, 'importScope');
    assert.doesNotMatch(importNotice, lang === 'zh' ? /不会自动运行分析/ : /analysis does not run automatically/i,
      'an imported snapshot change can trigger the same recovery effect');
  });
}
test('synced record changes recompute, reject the superseded result and clear deletion-derived analysis', async () => {
  await mount(); const previous = jobs[0];
  data = records([{ id: 'isolated-record', durationMinutes: 9 }]); await update();
  assert.equal(calls.length, 2); assert.deepEqual(calls[1].data, data);
  await settle(previous, available('stale')); assert.equal(props().bundle, null);
  await settle(jobs[1], available('corrected')); assert.equal(props().bundle.metadata.bundle_id, 'corrected');
  data = records([]); await update(); assert.equal(props().bundle, null);
  await settle(jobs[2], empty()); assert.equal(props().bundle, null); assert.equal(props().state.failure, false);
});
test('account change cannot inherit another account result or pending request', async () => {
  await mount(); const old = jobs[0]; user = 'isolated-recovery-b';
  await act(async () => authListener({ userId: user }));
  assert.equal(jobs.length, 2); await settle(old, available('wrong-account')); assert.equal(props().bundle, null);
  await settle(jobs[1], available('account-b')); assert.equal(props().bundle.metadata.subject_id, user);
});
test('foreground and tab restoration refresh existing data and retain an unchanged successful snapshot on service failure', async () => {
  await mount(); await settle(jobs[0], available('before-sleep'));
  await act(async () => appListener('background')); assert.equal(jobs.length, 1);
  await act(async () => appListener('active')); assert.equal(jobs.length, 2);
  await act(async () => jobs[1].reject(Error('isolated-service-failure')));
  assert.equal(props().state.failure, true); assert.equal(props().bundle.metadata.bundle_id, 'before-sleep');
  focused = false; await update(); focused = true; await update(); assert.equal(jobs.length, 3);
  await settle(jobs[2], available('after-return')); assert.equal(props().state.failure, false);
});
test('sample mode never requests account analysis and leaving it refreshes current real records', async () => {
  await mount(); await settle(jobs[0], available('owner'));
  let task; await act(async () => { task = props().onSample('mature'); });
  await settle(sampleJob, { ok: true, bundle: { metadata: { subject_id: 'synthetic', bundle_id: 'sample' } } }); await task;
  assert.equal(props().sample, true); data = records([{ id: 'new-real-record' }]); await update(); assert.equal(jobs.length, 1);
  await act(async () => props().onExitSample()); assert.equal(jobs.length, 2); assert.deepEqual(calls[1].data, data);
  await settle(jobs[1], available('updated-owner')); assert.equal(props().sample, false);
});
test('failed extra example analysis retains the base observations and retries the same example, never owner analysis', async () => {
  await mount(); await settle(jobs[0], empty());
  analysisResult = { ok: false, code: 'LOAD_FAILED', issues: ['isolated interrupted download'], durationMs: 1 };
  await act(async () => props().onSample('mature'));
  await settle(sampleJob, { ok: true, bundle: { metadata: { subject_id: 'synthetic', bundle_id: 'sample' } } });
  assert.equal(props().bundle.metadata.bundle_id, 'sample');
  assert.equal(props().sampleAnalysisError, true, 'load failure must be explicit, not no analysis supplied');
  analysisResult = { ok: true, extension: { base_bundle_id: 'sample' }, durationMs: 1 };
  await act(async () => props().onRefresh());
  assert.equal(props().sampleAnalysisError, false);
  assert.equal(props().analysis.base_bundle_id, 'sample');
  assert.equal(jobs.length, 1, 'sample retry does not call account runtime');
  assert.deepEqual(data, records([]), 'read-only sample leaves Store input unchanged');
});
test('failed base example can be retried without exiting or choosing the example again', async () => {
  await mount(); await settle(jobs[0], empty());
  await act(async () => props().onSample('mature'));
  await settle(sampleJob, { ok: false, code: 'LOAD_FAILED' });
  assert.equal(props().sampleError, true); assert.equal(props().bundle, null);
  sampleJob = deferred();
  await act(async () => props().onRefresh());
  assert.equal(props().state.busy, true, 'retry reloads the failed example');
  await settle(sampleJob, { ok: true, bundle: { metadata: { subject_id: 'synthetic', bundle_id: 'retried' } } });
  assert.equal(props().sampleError, false); assert.equal(props().bundle.metadata.bundle_id, 'retried');
  assert.equal(jobs.length, 1);
});
test('an example without a registered extension is not a service error', async () => {
  await mount(); await settle(jobs[0], empty());
  await act(async () => props().onSample('recovery'));
  await settle(sampleJob, { ok: true, bundle: { metadata: { subject_id: 'synthetic', bundle_id: 'no-extra' } } });
  assert.equal(props().sampleError, false); assert.ok(!props().sampleAnalysisError);
  assert.equal(props().analysis, null); assert.equal(props().bundle.metadata.bundle_id, 'no-extra');
});
for (const code of ['INVALID_CONTRACT', 'BASE_BUNDLE_MISMATCH', 'UNSAFE_PROVENANCE']) {
  test(`rejected example analysis (${code}) stays hidden with a recoverable error`, async () => {
    await mount(); await settle(jobs[0], empty());
    analysisResult = { ok: false, code, issues: ['isolated rejection'], durationMs: 1 };
    await act(async () => props().onSample('mature'));
    await settle(sampleJob, { ok: true, bundle: { metadata: { subject_id: 'synthetic', bundle_id: 'safe-base' } } });
    assert.equal(props().sampleAnalysisError, true); assert.equal(props().analysis, null);
    assert.equal(props().bundle.metadata.bundle_id, 'safe-base'); assert.equal(jobs.length, 1);
  });
}
test('returning to real data invalidates an interrupted example retry', async () => {
  await mount(); await settle(jobs[0], empty());
  await act(async () => props().onSample('mature'));
  await settle(sampleJob, { ok: false, code: 'LOAD_FAILED' });
  sampleJob = deferred();
  await act(async () => props().onRefresh());
  await act(async () => props().onExitSample());
  await settle(sampleJob, { ok: true, bundle: { metadata: { subject_id: 'synthetic', bundle_id: 'too-late' } } });
  assert.equal(props().sample, false); assert.equal(props().bundle, null);
  await settle(jobs[1], available('personal')); assert.equal(props().bundle.metadata.bundle_id, 'personal');
});
test('unmounted Insights ignores a late runtime response', async () => {
  await mount(); const job = jobs[0]; await act(async () => tree.unmount()); tree = undefined;
  await settle(job, available('late')); assert.equal(authListener, null); assert.equal(appListener, null);
});
test('theme/language rerenders do not repeat the same runtime calculation', async () => {
  await mount(); await settle(jobs[0], available('current'));
  data = { ...data, settings: { selectedThemeId: 'deepWork', language: 'zh' } }; await update();
  assert.equal(jobs.length, 1); assert.equal(props().lang, 'zh'); assert.equal(props().bundle.metadata.bundle_id, 'current');
});
test('first service failure is an error with the ordinary retry action, not no eligible data', async () => {
  await mount(); await act(async () => jobs[0].reject(Error('isolated-timeout')));
  assert.equal(props().state.failure, true); assert.equal(props().state.attempted, true);
  await act(async () => props().onRefresh()); assert.equal(jobs.length, 2);
  await settle(jobs[1], available('retry')); assert.equal(props().state.failure, false);
});
test('native chart ignores stale readiness/errors and redraws safely after process recovery', async () => {
  calls = []; const statuses = []; const model = { label: 'Execution', lang: 'en', colors: { background: '#fff' } };
  const input = value => ({ model: value, q: theme, onReadyChange: value => statuses.push(value) });
  await act(async () => { tree = create(React.createElement(Chart, input(model))); });
  await act(async () => tree.root.findByType('WebView').props.onLoadEnd());
  const command = () => JSON.parse(calls.at(-1).match(/questlifeChart\((.*)\);true;/)[1]);
  const first = command(); assert.equal(first.type, 'model');
  await act(async () => tree.update(React.createElement(Chart, input({ ...model, label: 'Steps' }))));
  const second = command(); assert.notEqual(second.requestId, first.requestId);
  const message = async (type, requestId) => act(async () => tree.root.findByType('WebView').props.onMessage({ nativeEvent: { data: JSON.stringify({ channel: 'native-insights', type, requestId }) } }));
  await message('ready', first.requestId); assert.notEqual(statuses.at(-1), true);
  await message('error', first.requestId); assert.equal(tree.root.findAllByType('Button').length, 0);
  await message('ready', second.requestId); assert.equal(statuses.at(-1), true);
  await act(async () => tree.root.findByType('WebView').props.onRenderProcessGone()); assert.equal(statuses.at(-1), false);
  await act(async () => tree.root.findByType('Button').props.onPress());
  await act(async () => tree.root.findByType('WebView').props.onLoadEnd());
  const recovered = command(); await message('ready', second.requestId); assert.notEqual(statuses.at(-1), true);
  await message('ready', recovered.requestId); assert.equal(statuses.at(-1), true);
});
