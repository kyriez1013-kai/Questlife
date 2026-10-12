// Component-runtime probes only: no browser, real account, storage, OS picker or Quant service.
// Run with QUESTLIFE_UI_TEST_RUNTIME pointing to isolated React 19.1 node_modules.
const assert = require('node:assert/strict');
const { test, beforeEach, afterEach, after } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const runtime = process.env.QUESTLIFE_UI_TEST_RUNTIME;
if (!runtime) throw new Error('QUESTLIFE_UI_TEST_RUNTIME must point to isolated React 19.1 node_modules');
const React = require(path.join(runtime, 'react'));
const { create, act } = require(path.join(runtime, 'react-test-renderer'));
assert.equal(React.version, '19.1.0');
const originalActEnvironment = global.IS_REACT_ACT_ENVIRONMENT;
global.IS_REACT_ACT_ENVIRONMENT = true;

let tree, store, baseline, result, calls, pickerResult, pickerText, confirmRestore;
let fixtureFault, sourceReads;
const platform = { OS: 'android', select: values => values[platform.OS] ?? values.default };
const rn = {
  Platform: platform, StyleSheet: { create: styles => styles, flatten: styles => Object.assign({}, ...[styles].flat(Infinity).filter(Boolean)), hairlineWidth: 1 },
  Appearance: { getColorScheme: () => 'light' },
  AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) },
};
for (const name of ['View', 'Text', 'TextInput', 'Pressable', 'ScrollView', 'Switch', 'ActivityIndicator', 'Modal']) rn[name] = name;
const chartHost = React.forwardRef((props, ref) => React.createElement('ChartHost', { ...props, ref }));
const originalLoad = Module._load;
const originalExtensions = Object.fromEntries(['.ts', '.tsx'].map(ext => [ext, require.extensions[ext]]));
const originalFetch = global.fetch;
global.fetch = async () => { throw new Error('Network is forbidden in first-use component probes'); };

Module._load = function(request, parent, isMain) {
  if ((parent?.filename.endsWith('/insightsV3Source.ts') || parent?.filename.endsWith('/insightsV3AnalysisSource.ts')) && request.endsWith('.json')) {
    const name = path.basename(request);
    sourceReads.set(name, (sourceReads.get(name) ?? 0) + 1);
    if (fixtureFault?.name === name && fixtureFault.remaining-- > 0) {
      if (fixtureFault.payload) return fixtureFault.payload;
      throw new Error('ISOLATED_TRANSIENT_IMPORT_FAILURE');
    }
  }
  if (request === 'react') return React;
  if (request === 'react/jsx-runtime') return require(path.join(runtime, 'react/jsx-runtime'));
  if (request === 'react-native') return rn;
  if (request === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView' };
  if (request === '@react-navigation/native') return { useIsFocused: () => true };
  if (/\/store$/.test(request)) return { useStore: () => store };
  if (/\/useQuestTheme$/.test(request)) return { useQuestTheme: () => require('../src/design/tokens.ts').getQuestTheme(store.data.settings.selectedThemeId) };
  if (/\/useDeviceData$/.test(request)) return { useDeviceData: () => ({ data: { observations: [] }, error: false }) };
  if (/\/apiUrl$/.test(request)) return { apiUrl: () => 'https://first-use.invalid/never-requested' };
  if (/\/ownerQuantRuntime$/.test(request)) return {
    buildOwnerQuantSnapshot: data => ({ executionLogs: data.executionLogs, stateCheckIns: data.stateCheckIns }),
    loadOwnerQuantArtifacts: async () => { calls.push(['quant-double']); return result; },
  };
  if (/\/sync-v2\/supabase$/.test(request)) return { authService: { getUserId: async () => null, subscribe: () => () => {} } };
  if (/\/sync-v2\/runtime$/.test(request)) return {
    readSyncState: async () => ({ ownerId: null }),
    restoreRecordBackup: async text => calls.push(['restore-double', text]),
  };
  if (/\/confirm$/.test(request)) return { confirmAction: options => {
    calls.push(['confirm', options.message]);
    options[confirmRestore ? 'onConfirm' : 'onCancel']?.();
  } };
  if (request === 'expo-document-picker') return { getDocumentAsync: async options => {
    calls.push(['picker-double', options]); return pickerResult;
  } };
  if (request === 'expo-file-system') return { Paths: { cache: { uri: 'file:///ISOLATED_FIRST_USE/cache/' } }, Directory: class {
    constructor(parent, name) { this.uri = new URL(`${name}/`, parent.uri).href; }
  }, File: class {
    constructor(uri) { this.uri = uri; }
    get exists() { return false; }
    get size() { return Buffer.byteLength(pickerText); }
    async text() { return pickerText; }
  } };
  if (/\/QuestButton$/.test(request)) return { __esModule: true, default: props => React.createElement('BackupButton', props) };
  if (/\/PersonalTerminalIcon$/.test(request)) return { __esModule: true, default: () => null };
  if (request === './NativeInsightsChart') return { __esModule: true, default: chartHost };
  return originalLoad.call(this, request, parent, isMain);
};
for (const extension of ['.ts', '.tsx']) require.extensions[extension] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } }).outputText, filename);
};

const Screen = require('../src/native/NativeInsightsScreen.tsx').default;
const Workspace = require('../src/native/insights/NativeInsightsWorkspace.tsx').default;
const source = require('../src/insights-v3/insightsV3Source.ts');
const analysisSource = require('../src/insights-v3/insightsV3AnalysisSource.ts');
const { parseQuantProductBundleV1 } = require('../src/quant-product/quantProductContract.ts');
const { DEFAULT_DATA } = require('../src/types.ts');
const { createRecordBackup } = require('../src/backup/records.ts');
const { backupCopy } = require('../src/backup/copy.ts');
const { ni } = require('../src/native/insights/nativeInsightsStrings.ts');
const { iv3 } = require('../src/insights-v3/insightsV3I18n.ts');
const { clearPendingNotificationIntent, registerNotificationHandler } = require('../src/platform/notifications/intentBus.ts');
const ownerRuntime = require('../src/adaptive-decision/ownerQuantRuntime.ts');
const fixture = name => JSON.parse(fs.readFileSync(path.join(root, 'src/quant-product/fixtures', `${name}.json`), 'utf8'));

beforeEach(() => {
  source.clearInsightsV3BundleCacheForTests(); analysisSource.clearInsightsV3AnalysisCacheForTests();
  ownerRuntime.clearOwnerQuantRuntimeCacheForTests(); clearPendingNotificationIntent();
  sourceReads = new Map(); fixtureFault = null; calls = [];
  store = { data: structuredClone(DEFAULT_DATA), loading: false };
  store.data.settings.language = 'en'; store.data.settings.selectedThemeId = 'cleanFocus';
  baseline = JSON.stringify(store.data);
  result = { status: 'no_eligible_data', eligibleObservationCount: 0, excludedObservationCount: 0, cacheHit: false, limitations: [] };
  pickerResult = { canceled: true }; pickerText = ''; confirmRestore = false;
});
afterEach(async () => {
  if (tree) await act(async () => tree.unmount()); tree = undefined;
  assert.equal(JSON.stringify(store.data), baseline, 'all entrances and examples must leave Store unchanged');
  clearPendingNotificationIntent();
});
after(() => {
  Module._load = originalLoad;
  for (const [extension, loader] of Object.entries(originalExtensions)) {
    if (loader) require.extensions[extension] = loader; else delete require.extensions[extension];
  }
  global.fetch = originalFetch; global.IS_REACT_ACT_ENVIRONMENT = originalActEnvironment;
});

const text = () => tree.root.findAllByType('Text').map(node => node.props.children).flat(Infinity).filter(value => typeof value === 'string').join('\n');
const button = label => {
  const node = tree.root.findAll(node => (node.type === 'Pressable' && node.props.accessibilityLabel === label)
    || (node.type === 'BackupButton' && node.props.label === label))[0];
  assert.ok(node, `missing button: ${label}`); assert.ok(!node.props.disabled, `disabled button: ${label}`); return node;
};
const press = async label => act(async () => { button(label).props.onPress(); });
const close = lang => press(iv3(lang, 'close'));
const mount = async (os, lang = 'en') => {
  platform.OS = os; store.data.settings.language = lang; baseline = JSON.stringify(store.data);
  await act(async () => { tree = create(React.createElement(Screen, { navigation: { navigate: (...args) => calls.push(['navigate', ...args]) } })); });
};

test('initial example Retry makes a fresh validated attempt after a transient failure', async () => {
  fixtureFault = { name: 'one_observation_full.json', remaining: 1 };
  const failed = await source.loadInsightsV3InitialBundle('sparse-1');
  assert.equal(failed.ok, false); assert.equal(failed.code, 'LOAD_FAILED');
  const retried = await source.loadInsightsV3InitialBundle('sparse-1');
  assert.equal(retried.ok, true); assert.equal(sourceReads.get(fixtureFault.name), 2);
  assert.ok(source.isSafeReviewBundle(retried.bundle));
});
test('detail example Retry recovers without reloading the successful compact bundle', async () => {
  const initial = await source.loadInsightsV3InitialBundle('mature'); assert.equal(initial.ok, true);
  fixtureFault = { name: 'mature_market_full.json', remaining: 1 };
  assert.equal((await source.loadInsightsV3DetailBundle('mature')).ok, false);
  assert.equal((await source.loadInsightsV3DetailBundle('mature')).ok, true);
  assert.equal(await source.loadInsightsV3InitialBundle('mature'), initial);
  assert.equal(sourceReads.get('mature_market_compact.json'), 1);
  assert.equal(sourceReads.get('mature_market_full.json'), 2);
});
test('Retry revalidates both the schema and synthetic-only boundary', async () => {
  const realClaim = fixture('one_observation_full');
  realClaim.metadata.synthetic_only = false; realClaim.metadata.contains_real_user_data = true;
  for (const [payload, code] of [[{}, 'MISSING_CONTRACT_VERSION'], [realClaim, 'UNSAFE_FIXTURE_PROVENANCE']]) {
    source.clearInsightsV3BundleCacheForTests();
    fixtureFault = { name: 'one_observation_full.json', remaining: 1, payload };
    const rejected = await source.loadInsightsV3InitialBundle('sparse-1');
    assert.equal(rejected.ok, false);
    assert.equal(rejected.code, code);
    const recovered = await source.loadInsightsV3InitialBundle('sparse-1');
    assert.equal(recovered.ok, true); assert.ok(source.isSafeReviewBundle(recovered.bundle));
  }
});
test('successful concurrent first-use loads remain deduplicated and cached', async () => {
  const [a, b] = await Promise.all([source.loadInsightsV3InitialBundle('sparse-1'), source.loadInsightsV3InitialBundle('sparse-1')]);
  assert.equal(a.ok, true); assert.equal(a, b);
  assert.equal(await source.loadInsightsV3InitialBundle('sparse-1'), a);
  assert.equal(sourceReads.get('one_observation_full.json'), 1);
});
test('analysis-extension transient failures can be retried without replacing the base bundle', async () => {
  const base = await source.loadInsightsV3DetailBundle('mature');
  assert.equal(base.ok, true);
  fixtureFault = { name: 'mature_market_analysis_v1.json', remaining: 1 };
  assert.equal((await analysisSource.loadInsightsV3AnalysisExtension('mature', base.bundle.metadata.bundle_id)).ok, false);
  const retry = await analysisSource.loadInsightsV3AnalysisExtension('mature', base.bundle.metadata.bundle_id);
  assert.equal(retry.ok, true);
  assert.equal(retry.extension.base_bundle_id, base.bundle.metadata.bundle_id);
});

for (const os of ['web', 'android', 'ios']) for (const lang of ['en', 'zh']) {
  test(`zero observations and signed-out failure leave normal first-use entrances actionable (${os}, ${lang})`, async () => {
    result = { ...result, status: 'unavailable', limitations: ['QUANT_AUTH_REQUIRED'] };
    await mount(os, lang);
    assert.ok(text().includes(ni(lang, 'variables')));
    assert.equal(tree.root.findAllByType('ChartHost').length, 0);
    await press(ni(lang, 'manageSources'));
    assert.deepEqual(calls.at(-1), ['navigate', 'Settings', { screen: 'NativeSettings' }]);
    const intents = []; const stop = registerNotificationHandler(intent => intents.push(intent));
    try {
      await press(ni(lang, 'recordActivity')); await press(ni(lang, 'recordState'));
      assert.deepEqual(intents.map(({ action, kind }) => ({ action, kind })), [
        { action: 'OPEN', kind: 'quick_capture' }, { action: 'OPEN', kind: 'morning_state' },
      ]);
    } finally { stop(); }
    await press(ni(lang, 'importHistory')); assert.ok(text().includes(ni(lang, 'importScope')));
    await press(backupCopy(lang, 'restore'));
    assert.equal(calls.filter(row => row[0] === 'picker-double').length, 1);
    assert.equal(calls.filter(row => row[0] === 'restore-double').length, 0);
    await close(lang); await press(ni(lang, 'sampleOpen'));
    button(ni(lang, 'single')); button(ni(lang, 'mature'));
  });

  test(`one-observation normal-workspace contract probe exposes history and methods without invented references (${os}, ${lang})`, async () => {
    // Artificial service response for the personal branch only, not computed or real-user evidence.
    const product = fixture('one_observation_full');
    product.metadata = { ...product.metadata, subject_id: 'first-use-contract-probe', synthetic_only: false, contains_real_user_data: true };
    assert.equal(parseQuantProductBundleV1(product).ok, true);
    result = { ...result, status: 'available', product, eligibleObservationCount: 1 };
    await mount(os, lang);
    const chart = tree.root.findByType('ChartHost').props.model;
    assert.deepEqual(chart.points.map(row => row.value), [4]);
    assert.deepEqual(chart.reference, { value: null, low: null, high: null });
    assert.ok(text().includes(iv3(lang, 'sparsePointOnly')));
    await press(ni(lang, 'history'));
    assert.ok(text().includes(product.series[0].points[0].observation_id)); await close(lang);
    await press(iv3(lang, 'indicators'));
    const baselineToggle = tree.root.findAllByType('Switch').find(node => node.props.accessibilityLabel === iv3(lang, 'baselineIndicator'));
    assert.equal(baselineToggle.props.disabled, true); await close(lang);
    for (const key of ['jointAnalysis', 'drivers', 'similar', 'recovery', 'scenario']) {
      await press(iv3(lang, key)); assert.ok(text().includes(ni(lang, 'noAnalysis'))); await close(lang);
    }
    await press(iv3(lang, 'evidenceDetail'));
    assert.ok(text().includes('FORMING')); assert.ok(text().includes('FIRST_OBSERVATION'));
    assert.ok(text().includes(iv3(lang, 'missingNotZero'))); await close(lang);
    await press(ni(lang, 'importHistory')); button(backupCopy(lang, 'restore')); await close(lang);
    button(ni(lang, 'sampleOpen'));
    assert.equal(calls.filter(row => row[0] === 'quant-double').length, 1, 'opening methods must not run another analysis');
  });

  test(`isolated example failure can be reselected and exit restores normal empty workspace (${os}, ${lang})`, async () => {
    await mount(os, lang);
    fixtureFault = { name: 'one_observation_full.json', remaining: 1 };
    await press(ni(lang, 'sampleOpen')); await press(ni(lang, 'single'));
    assert.ok(text().includes(ni(lang, 'sampleError')));
    await press(ni(lang, 'sampleOpen')); await press(ni(lang, 'single'));
    assert.ok(!text().includes(ni(lang, 'sampleError')));
    assert.ok(text().includes(ni(lang, 'sampleBody')));
    assert.equal(tree.root.findAllByType('ChartHost').length, 1);
    assert.equal(tree.root.findAllByType('BackupButton').length, 0);
    assert.equal(tree.root.findAll(node => node.type === 'Pressable' && node.props.accessibilityLabel === ni(lang, 'recordActivity')).length, 0);
    await press(ni(lang, 'sampleExit'));
    assert.equal(tree.root.findAllByType('ChartHost').length, 0); button(ni(lang, 'importHistory'));
    assert.equal(calls.filter(row => row[0] === 'restore-double').length, 0);
  });
}

for (const os of ['web', 'android', 'ios']) test(`every normal-menu example is isolated, validated and escapable (${os})`, async () => {
  await mount(os);
  for (const id of ['sparse-1', 'mature', 'drivers', 'similar', 'recovery', 'scenario']) {
    await press(ni('en', 'sampleOpen'));
    await press(id === 'sparse-1' ? ni('en', 'single') : id === 'mature' ? ni('en', 'mature') : iv3('en', id));
    const workspace = tree.root.findByType(Workspace).props;
    assert.equal(workspace.sample, true); assert.equal(workspace.sampleError, false);
    assert.ok(workspace.bundle); assert.ok(source.isSafeReviewBundle(workspace.bundle));
    if (workspace.analysis) {
      assert.equal(workspace.analysis.base_bundle_id, workspace.bundle.metadata.bundle_id);
      assert.equal(workspace.analysis.synthetic_only, true); assert.equal(workspace.analysis.contains_real_user_data, false);
    }
    assert.ok(text().includes(ni('en', 'sampleBody')));
    assert.equal(tree.root.findAllByType('BackupButton').length, 0);
    assert.equal(JSON.stringify(store.data), baseline);
    await press(ni('en', 'sampleExit')); button(ni('en', 'importHistory'));
  }
  assert.equal(calls.filter(row => row[0] === 'restore-double' || row[0] === 'picker-double' || row[0] === 'navigate').length, 0);
});

test('normal import validates original file bytes and requires confirmation before the restore callback', async () => {
  await mount('android');
  const history = structuredClone(DEFAULT_DATA);
  history.executionLogs = [{ id: 'first-use-history-record', date: '2026-01-02', durationMinutes: 17, source: 'manual', createdAt: '2026-01-02T10:00:00Z', appliedToProgress: true }];
  pickerText = JSON.stringify(createRecordBackup(history, null));
  pickerResult = { canceled: false, assets: [{ uri: 'file:///ISOLATED_FIRST_USE/history.json', size: Buffer.byteLength(pickerText) }] };
  await press(ni('en', 'importHistory')); await press(backupCopy('en', 'restore'));
  assert.equal(calls.filter(row => row[0] === 'confirm').length, 1, JSON.stringify({ calls, text: text() }));
  assert.equal(calls.filter(row => row[0] === 'restore-double').length, 0);
  confirmRestore = true; await press(backupCopy('en', 'restore'));
  assert.deepEqual(calls.filter(row => row[0] === 'restore-double'), [['restore-double', pickerText]]);
  assert.ok(text().includes(backupCopy('en', 'restored')));
  assert.equal(calls.filter(row => row[0] === 'quant-double').length, 1);
});
test('personal runtime rejects the same synthetic example used by first-use gallery', async () => {
  const product = fixture('one_observation_full');
  const rejected = await ownerRuntime.requestOwnerQuantArtifacts({ data: store.data, subjectId: product.metadata.subject_id,
    timezone: 'UTC', asOf: product.metadata.as_of, fetchImpl: async () => new Response(JSON.stringify({
      ok: true, eligible_observation_count: 1, excluded_observation_count: 0, product,
    }), { status: 200 }) });
  assert.equal(rejected.status, 'unavailable'); assert.equal(rejected.product, undefined);
  assert.ok(rejected.limitations.includes('SYNTHETIC_QUANT_EXCLUDED_FROM_OWNER_MODE'));
});
test('source-only route boundary: normal Web/native use the shared experience, not fixture-only InsightsV3Screen', () => {
  const read = name => fs.readFileSync(path.join(root, name), 'utf8');
  assert.match(read('App.web.tsx'), /insightsV3Enabled \? <InsightsV3Screen \/> : v11InsightsEnabled \? <V11InsightsScreen/);
  assert.match(read('src/v11/featureSelection.ts'), /default:\s*return 'owner_beta'/);
  assert.match(read('src/v11-insights/V11InsightsScreen.tsx'), /ownerQuantOpen \? <NativeInsightsExperience/);
  assert.match(read('src/native/NativeApp.tsx'), /name="Insights" component=\{NativeInsightsScreen\}/);
});
