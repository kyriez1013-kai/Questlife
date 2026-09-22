import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { parseQuantProductBundleV1 } from '../../../quant-product/quantProductContract';
import { parseQuantAnalysisExtensionV1 } from '../../../quant-product/quantAnalysisContract';
import { adaptQuantProductBundleV1 } from '../../../quant-product/quantProductV1Adapter';
import { defaultRangeSelection, selectSeriesCandles, selectSeriesPoints } from '../../../insights-v3/insightsV3Presentation';
import { comparisonBlock, comparisonInWindow, customSelection, inRangeEvents, initialInsightsLoadState, insightsFailureKind, localDateKey, matchingAnalysis, parseLocalDate, renderableKinds, settleInsightsLoad } from '../nativeInsightsPresentation';
import { nativeChartModel, parseNativeChartEvent, selectionText } from '../nativeInsightsChartModel';
import { nativeInsightsStringKeys, ni } from '../nativeInsightsStrings';
import { nativeInsightsRendererScript } from '../nativeInsightsChartRuntime';
import type { QuestTheme } from '../../../design/tokens';
import type { QuestLifeChartModelV1 } from '../../../platform/charts/contract';
import type { OwnerQuantRuntimeArtifacts } from '../../../adaptive-decision/ownerQuantRuntime';
import { clearInsightsV3BundleCacheForTests, loadInsightsV3InitialBundle, loadInsightsV3DetailBundle } from '../../../insights-v3/insightsV3Source';
import { loadInsightsV3AnalysisExtension } from '../../../insights-v3/insightsV3AnalysisSource';
import { createInsightsEntrances, filterInsightsCatalog, insightsSourceCatalog } from '../nativeInsightsCatalog';
import { HEALTH_METRICS, type QuickActionIntent } from '../../../platform/contracts';
import { normalizeHealthSample } from '../../../platform/health/normalization';
import { clearPendingNotificationIntent, deliverNotificationIntent, registerNotificationHandler } from '../../../platform/notifications/intentBus';

function fixture(name: string) {
  const parsed = parseQuantProductBundleV1(JSON.parse(readFileSync(`src/quant-product/fixtures/${name}.json`, 'utf8')));
  assert.ok(parsed.ok); return parsed.bundle;
}
const mature = fixture('mature_market_full'); const model = adaptQuantProductBundleV1(mature);
const first = model.instruments.find(row => row.series.length)!; const series = first.series[0];
const all = { kind: 'contract', key: 'ALL' } as const;
const q = { colors: { accent: '#125599', info: '#00bbbb', textMuted: '#cccccc', neutral: '#ddaaaa', textSecondary: '#888888' }, typography: { helperSize: 12 } } as QuestTheme;
const foundation = { environment: { canvas: '#ffffff' }, text: { secondary: '#222222' }, data: { observed: '#112233', comparison: '#554433' }, border: { subtle: '#eeeeee' } } as QuestLifeChartModelV1['presentation']['foundation'];
const presentation: QuestLifeChartModelV1 = { version: 1, presentation: { asOf: mature.metadata.as_of, series, range: all, chartKind: 'line', foundation, lang: 'en', targetLabel: 'Synthetic fixture', showEvents: false, showRawObservations: true, showReference: false, showReferenceRange: false } };

test('zero-data catalog reuses every supported Health metric without fabricating values or a Quant bundle', () => {
  const rows = insightsSourceCatalog('en');
  assert.deepEqual(rows.filter(row => row.source === 'health').map(row => row.id), HEALTH_METRICS.map(metric => `health:${metric}`));
  assert.equal(new Set(rows.map(row => row.id)).size, rows.length);
  assert.ok(rows.every(row => Object.keys(row).sort().join(',') === 'id,label,source,unit'));
  for (const metric of HEALTH_METRICS) {
    const entry = rows.find(row => row.id === `health:${metric}`)!;
    const normalized = normalizeHealthSample({ metric, unit: entry.unit, value: 1, startAt: '2026-01-01T00:00:00Z', endAt: '2026-01-01T00:01:00Z', availableAt: '2026-01-01T00:01:00Z', externalId: 'synthetic-catalog-test', platform: 'healthkit' });
    assert.ok(normalized, metric);
    assert.equal(normalized.unit, entry.unit);
  }
});
test('source catalog supports bilingual browsing, normalized search and no matches', () => {
  for (const lang of ['zh', 'en'] as const) {
    const rows = insightsSourceCatalog(lang);
    assert.equal(filterInsightsCatalog(rows, '  HRV ')[0].id, 'health:hrv');
    assert.equal(filterInsightsCatalog(rows, rows[0].label)[0].id, rows[0].id);
    assert.equal(filterInsightsCatalog(rows, 'not-a-variable').length, 0);
    assert.equal(filterInsightsCatalog(rows, '  ').length, rows.length);
    assert.ok(rows.every(row => row.label.length > 0));
  }
});
test('source and create-record entrances dispatch only existing navigation and OPEN intents', () => {
  const events: unknown[] = [];
  const actions = createInsightsEntrances({ navigate: (...args) => events.push(args) }, intent => events.push(intent));
  actions.onOpenSources(); actions.onCreateRecord('state'); actions.onCreateRecord('activity');
  assert.deepEqual(events, [
    ['Settings', { screen: 'NativeSettings' }], ['Today'],
    { action: 'OPEN', kind: 'morning_state', notificationId: 'insights:state' }, ['Today'],
    { action: 'OPEN', kind: 'quick_capture', notificationId: 'insights:activity' },
  ]);
});
test('create-record entrance opens Today through the real pending intent bus, without recording anything', () => {
  clearPendingNotificationIntent();
  const received: QuickActionIntent[] = [];
  createInsightsEntrances({ navigate: () => {} }, deliverNotificationIntent).onCreateRecord('activity');
  const stop = registerNotificationHandler(intent => received.push(intent));
  try {
    assert.equal(received.length, 1);
    assert.equal(received[0].kind, 'quick_capture');
    assert.equal(received[0].action, 'OPEN');
    createInsightsEntrances({ navigate: () => {} }, deliverNotificationIntent).onCreateRecord('state');
    assert.equal(received[1].kind, 'morning_state');
  } finally { stop(); clearPendingNotificationIntent(); }
});
test('workspace offers owner entrances with no model and excludes them from isolated samples', () => {
  const source = readFileSync('src/native/insights/NativeInsightsWorkspace.tsx', 'utf8');
  assert.match(source, /!selected && !sample \? <InsightsSourceWorkspace/);
  assert.match(source, /!sample \? <InsightsSourceWorkspace[^>]*browse=\{false\}/);
  const experience = readFileSync('src/native/insights/NativeInsightsExperience.tsx', 'utf8');
  assert.match(experience, /renderImport=\{\(\) => <RecordBackupActions \/>\}/);
  assert.equal((experience.match(/await loadOwnerQuantArtifacts/g) ?? []).length, 1);
  assert.match(experience, /onRefresh=\{\(\) => void refresh\(\)\}/);
});

test('real example loaders accept native window without browser location', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  clearInsightsV3BundleCacheForTests();
  try {
    for (const id of ['sparse-1', 'mature', 'drivers', 'similar', 'recovery', 'scenario'] as const) {
      const result = id === 'sparse-1' ? await loadInsightsV3InitialBundle(id) : await loadInsightsV3DetailBundle(id);
      assert.ok(result.ok, `${id}: ${JSON.stringify(result)}`);
      assert.equal(result.bundle.metadata.synthetic_only, true);
      assert.equal(result.bundle.metadata.contains_real_user_data, false);
      const extension = await loadInsightsV3AnalysisExtension(id, result.bundle.metadata.bundle_id);
      if (id === 'sparse-1' || id === 'mature' || id === 'drivers') assert.ok(extension.ok);
    }
    assert.equal('__questlifeInsightsV3Metrics' in window, false);
  } finally {
    clearInsightsV3BundleCacheForTests();
    if (original) Object.defineProperty(globalThis, 'window', original);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});

test('custom count validation rejects decimals, zero, exponent, negative and unsafe integers', () => {
  for (const value of ['0', '-1', '1.5', '1e3', '', '9007199254740992']) assert.equal(customSelection('days', value, '', ''), null);
  assert.deepEqual(customSelection('days', '30', '', ''), { kind: 'last_n_days', days: 30 });
  assert.deepEqual(customSelection('observations', '1', '', ''), { kind: 'last_n_observations', count: 1 });
});
test('calendar rejects overflow dates and reversed ranges; supports leap day', () => {
  assert.equal(parseLocalDate('2025-02-29'), null); assert.equal(parseLocalDate('2026-13-01'), null);
  assert.equal(customSelection('calendar', '', '2026-05-02', '2026-05-01'), null);
  assert.ok(customSelection('calendar', '', '2024-02-29', '2024-03-01'));
});
test('date projection uses local calendar day, including the supplied time zone', () => {
  const time = new Date('2026-04-01T01:00:00Z');
  assert.equal(localDateKey(time), `${time.getFullYear()}-${String(time.getMonth() + 1).padStart(2, '0')}-${String(time.getDate()).padStart(2, '0')}`);
});
test('capabilities never invent a line for a point-only contract', () => {
  const sparse = adaptQuantProductBundleV1(fixture('one_observation_full')).instruments.find(row => row.series.length)!.series[0];
  assert.deepEqual(renderableKinds({ ...sparse, supported_chart_types: ['POINT'] }, defaultRangeSelection(sparse)), ['point']);
});
test('custom ranges cannot manufacture OHLC; contract candles are exact values', () => {
  assert.ok(!renderableKinds(series, { kind: 'last_n_days', days: 365 }).includes('candle'));
  const key = Object.keys(series.candles).find(k => series.candles[k].length);
  if (key) {
    const result = nativeChartModel({ ...presentation, presentation: { ...presentation.presentation, range: { kind: 'contract', key }, chartKind: 'candle' } }, q);
    assert.deepEqual(result.candles.map(({ time, ...values }) => values), selectSeriesCandles(series, { kind: 'contract', key }).map(({ open, high, low, close }) => ({ open, high, low, close })));
  }
});
test('comparison rejects different unit and scale without normalization', () => {
  assert.equal(comparisonBlock(first, { ...first, unit: 'bpm' }), 'incompatible');
  assert.equal(comparisonBlock(first, { ...first, scale: first.scale === 'ORDINAL' ? 'RATIO' : 'ORDINAL' }), 'incompatible');
  assert.equal(comparisonBlock(first, { ...first, series: [] }), 'noSeries');
  assert.equal(comparisonBlock(first, { ...first, id: 'other' }), null);
});
test('HRV measurement methods cannot share a scale despite matching units', () => {
  assert.equal(comparisonBlock({ ...first, constructKey: 'hrv_sdnn' }, { ...first, constructKey: 'hrv_rmssd' }), 'incompatibleMethod');
});
test('last-N comparison uses primary timestamps, not independently selected points', () => {
  const range = { kind: 'last_n_observations', count: 3 } as const;
  const selected = selectSeriesPoints(series, range, mature.metadata.as_of);
  const result = comparisonInWindow(series, { ...series, points: series.points.slice(0, -2) }, range, mature.metadata.as_of);
  assert.ok(result.points.every(row => Date.parse(row.observed_at) >= Date.parse(selected[0].observed_at) && Date.parse(row.observed_at) <= Date.parse(selected.at(-1)!.observed_at)));
  assert.deepEqual(result.points.map(row => row.value), series.points.slice(-3, -2).map(row => row.value));
});
test('empty primary range cannot accidentally show comparison history', () => {
  assert.deepEqual(comparisonInWindow(series, series, { kind: 'calendar', start: '1900-01-01', end: '1900-01-02' }, mature.metadata.as_of).points, []);
});
test('analysis must match bundle ID, as-of and owner/example provenance', () => {
  const parsed = parseQuantAnalysisExtensionV1(JSON.parse(readFileSync('src/quant-product/fixtures/mature_market_analysis_v1.json', 'utf8')));
  assert.ok(parsed.ok); const analysis = parsed.extension;
  assert.ok(matchingAnalysis(mature, analysis));
  assert.equal(matchingAnalysis(mature, { ...analysis, base_bundle_id: 'other' }), null);
  assert.equal(matchingAnalysis(mature, { ...analysis, as_of: '2000-01-01T00:00:00Z' }), null);
  assert.equal(matchingAnalysis(mature, { ...analysis, synthetic_only: false, contains_real_user_data: true }), null);
});
test('service failure retains a successful snapshot and explicitly marks failure', () => {
  const available: OwnerQuantRuntimeArtifacts = { status: 'available', product: mature, eligibleObservationCount: 1, excludedObservationCount: 0, cacheHit: false, limitations: [] };
  const previous = settleInsightsLoad(initialInsightsLoadState, available);
  const failed = settleInsightsLoad(previous, { ...available, status: 'unavailable', product: undefined, limitations: ['QUANT_RUNTIME_TIMEOUT'] });
  assert.equal(failed.result, available); assert.equal(failed.failure, true); assert.equal(failed.busy, false);
  const changed = settleInsightsLoad(previous, { ...available, status: 'unavailable', product: undefined, limitations: ['QUANT_RUNTIME_CONTEXT_CHANGED'] });
  assert.equal(changed.result?.product, undefined);
  const empty = settleInsightsLoad(previous, { ...available, status: 'no_eligible_data', product: undefined });
  assert.equal(empty.result?.product, undefined); assert.equal(empty.failure, false);
});
test('native chart keeps original observations, and absent references stay null', () => {
  const result = nativeChartModel(presentation, q);
  assert.deepEqual(result.points.map(row => row.value), selectSeriesPoints(series, all, mature.metadata.as_of).map(row => row.value));
  assert.deepEqual(result.reference, { value: null, low: null, high: null });
});
test('events use the selected interval, never all history in a custom empty range', () => {
  assert.equal(inRangeEvents(series, { kind: 'calendar', start: '1900-01-01', end: '1900-01-02' }, mature.metadata.as_of).length, 0);
});
test('WebView message parser rejects malformed / writable / nonfinite events', () => {
  for (const value of ['{', '{}', '{"channel":"native-insights","type":"writeStore"}', '{"channel":"native-insights","type":"selection","time":null,"value":1,"rows":[]}']) assert.equal(parseNativeChartEvent(value), null);
  assert.deepEqual(parseNativeChartEvent('{"channel":"native-insights","type":"ready"}'), { type: 'ready' });
  assert.equal(parseNativeChartEvent({ channel: 'native-insights', type: 'selection', time: 100, value: 1, rows: [{ id: 'a', value: Infinity }] }), null);
});
test('selection is outside the canvas and preserves zero instead of replacing it', () => {
  const result = selectionText(nativeChartModel(presentation, q), { time: 100, value: 0, rows: [] });
  assert.match(result, /0/); assert.ok(!result.includes('undefined'));
});
test('every local label has Chinese and English text', () => {
  for (const key of nativeInsightsStringKeys) { assert.ok(ni('zh', key).length); assert.ok(ni('en', key).length); }
});
test('unconfigured account, sign-in, context change and runtime failure are distinct from no data', () => {
  const result: OwnerQuantRuntimeArtifacts = { status: 'unavailable', eligibleObservationCount: 0, excludedObservationCount: 0, cacheHit: false, limitations: [] };
  for (const [code, expected] of [['QUANT_AUTH_NOT_CONFIGURED', 'accountSetup'], ['QUANT_AUTH_REQUIRED', 'signIn'], ['QUANT_RUNTIME_HTTP_401', 'signIn'], ['QUANT_LOCAL_ACCOUNT_MISMATCH', 'accountChanged'], ['QUANT_RUNTIME_TIMEOUT', 'serviceError']]) {
    const next = { ...result, limitations: [code] };
    assert.equal(insightsFailureKind(next), expected); assert.equal(settleInsightsLoad(initialInsightsLoadState, next).failure, true);
  }
  assert.equal(settleInsightsLoad(initialInsightsLoadState, { ...result, status: 'no_eligible_data' }).failure, false);
});
test('literal renderer is self-contained across the Hermes/WebView boundary and zoom is bounded', () => {
  const messages: unknown[] = []; const data: unknown[] = [];
  let visible = { from: 0, to: 10 }; let fits = 0;
  const scale = { fitContent: () => { fits++; }, getVisibleLogicalRange: () => visible, setVisibleLogicalRange: (range: typeof visible) => { visible = range; } };
  const chart = { remove: () => {}, addSeries: () => ({ setData: (rows: unknown) => data.push(rows), createPriceLine: () => {} }), subscribeCrosshairMove: () => {}, timeScale: () => scale };
  const win = { LightweightCharts: { createChart: () => chart, LineSeries: {}, HistogramSeries: {}, CandlestickSeries: {} }, ReactNativeWebView: { postMessage: (message: string) => messages.push(JSON.parse(message)) }, questlifeChart: (_command: object) => {} };
  runInNewContext(nativeInsightsRendererScript, { window: win, document: { getElementById: () => ({}) }, Intl, Date });
  const result = nativeChartModel(presentation, q);
  win.questlifeChart({ type: 'model', model: result });
  assert.equal((messages.at(-1) as { type: string }).type, 'ready');
  assert.deepEqual(data[0], result.points);
  win.questlifeChart({ type: 'zoomIn' }); assert.equal(visible.to - visible.from, 7);
  win.questlifeChart({ type: 'zoomOut' }); assert.ok(visible.to - visible.from > 7);
  for (let i = 0; i < 80; i++) win.questlifeChart({ type: 'zoomIn' });
  assert.ok(visible.to - visible.from >= 1);
  win.questlifeChart({ type: 'fit' }); assert.equal(fits, 2);
});

test('crosshair deduplicates identical bridge messages but preserves changed values and redraws', () => {
  const messages: Array<{ type: string; value?: number }> = [];
  const primary = { setData: () => {}, createPriceLine: () => {} };
  let select: (event: object) => void = () => {};
  const chart = { remove: () => {}, addSeries: () => primary, subscribeCrosshairMove: (callback: typeof select) => { select = callback; }, timeScale: () => ({ fitContent() {} }) };
  const win = { LightweightCharts: { createChart: () => chart, LineSeries: {}, HistogramSeries: {}, CandlestickSeries: {} },
    ReactNativeWebView: { postMessage: (message: string) => messages.push(JSON.parse(message)) }, questlifeChart: (_command: object) => {} };
  runInNewContext(nativeInsightsRendererScript, { window: win, document: { getElementById: () => ({}) }, Intl, Date });
  const model = nativeChartModel(presentation, q);
  const event = (value: number) => ({ time: 100, seriesData: new Map([[primary, { value }]]) });
  win.questlifeChart({ type: 'model', model });
  for (let i = 0; i < 200; i++) select(event(2));
  assert.equal(messages.filter(row => row.type === 'selection').length, 1);
  select(event(3)); select(event(2));
  assert.deepEqual(messages.filter(row => row.type === 'selection').map(row => row.value), [2, 3, 2]);
  win.questlifeChart({ type: 'model', model }); select(event(2));
  assert.equal(messages.filter(row => row.type === 'selection').length, 4);
  assert.equal(messages.filter(row => row.type === 'ready').length, 2);
});

function renderEventMarkers(model: ReturnType<typeof nativeChartModel>) {
  const data: unknown[] = []; const messages: Array<{ type: string }> = [];
  let markers: Array<{ time: number; position: string; shape: string }> = [];
  const primary = { setData: (rows: unknown) => data.push(rows), createPriceLine: () => {} };
  const chart = { remove: () => {}, addSeries: () => primary, subscribeCrosshairMove: () => {}, timeScale: () => ({ fitContent: () => {} }) };
  const win = {
    LightweightCharts: { createChart: () => chart, LineSeries: {}, HistogramSeries: {}, CandlestickSeries: {}, createSeriesMarkers: (target: unknown, rows: unknown) => {
      assert.equal(target, primary); markers = JSON.parse(JSON.stringify(rows));
    } },
    ReactNativeWebView: { postMessage: (message: string) => messages.push(JSON.parse(message)) }, questlifeChart: (_command: object) => {},
  };
  runInNewContext(nativeInsightsRendererScript, { window: win, document: { getElementById: () => ({}) }, Intl, Date });
  win.questlifeChart({ type: 'model', model });
  assert.equal(messages.at(-1)?.type, 'ready');
  return { data, markers };
}

test('events between readings anchor to the nearest existing X without fabricating readings', () => {
  const model: ReturnType<typeof nativeChartModel> = { ...nativeChartModel(presentation, q), points: [{ time: 100, value: 7 }, { time: 200, value: 0 }, { time: 300, value: 4 }], events: [
    { time: 160, label: 'EXECUTION' }, { time: 140, label: 'PLAN' }, { time: 200, label: 'EXECUTION' }, { time: 150, label: 'PLAN' },
  ] };
  const before = JSON.stringify(model);
  const { data, markers } = renderEventMarkers(model);
  assert.deepEqual(markers.map(row => row.time), [100, 100, 200, 200]);
  assert.deepEqual(markers.map(row => [row.position, row.shape]), [['belowBar', 'arrowUp'], ['belowBar', 'arrowUp'], ['aboveBar', 'circle'], ['aboveBar', 'circle']]);
  assert.equal(data.length, 1); assert.deepEqual(data[0], model.points);
  assert.equal(JSON.stringify(model), before);
});

test('event markers never pull past or future events into the plotted interval', () => {
  const model: ReturnType<typeof nativeChartModel> = { ...nativeChartModel(presentation, q), points: [{ time: 100, value: 7 }, { time: 200, value: 0 }], events: [
    { time: 99, label: 'PLAN' }, { time: 100, label: 'PLAN' }, { time: 200, label: 'EXECUTION' }, { time: 201, label: 'PLAN' },
    { time: NaN, label: 'PLAN' }, { time: Infinity, label: 'PLAN' },
  ] };
  assert.deepEqual(renderEventMarkers(model).markers.map(row => row.time), [100, 200]);
  assert.deepEqual(renderEventMarkers({ ...model, points: model.points.slice(0, 1) }).markers.map(row => row.time), [100]);
  assert.deepEqual(renderEventMarkers({ ...model, points: [] }).markers, []);
});

test('candle events anchor only to existing candle X positions and stay within their bounds', () => {
  const model: ReturnType<typeof nativeChartModel> = { ...nativeChartModel(presentation, q), kind: 'candle', points: [{ time: 50, value: 2 }, { time: 250, value: 3 }], candles: [
    { time: 100, open: 1, high: 3, low: 0, close: 2 }, { time: 200, open: 2, high: 4, low: 1, close: 3 },
  ], events: [{ time: 90, label: 'PLAN' }, { time: 160, label: 'EXECUTION' }, { time: 210, label: 'PLAN' }] };
  const { data, markers } = renderEventMarkers(model);
  assert.deepEqual(markers.map(row => row.time), [200]);
  assert.equal(data.length, 1); assert.deepEqual(data[0], model.candles);
});
