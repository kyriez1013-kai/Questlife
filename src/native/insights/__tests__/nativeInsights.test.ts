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
