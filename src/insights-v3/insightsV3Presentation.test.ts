import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseQuantProductBundleV1 } from '../quant-product/quantProductContract';
import { aggregationBucketLabel, availableChartKinds, buildCompactCue, buildInsightsV3Consumer, defaultRangeSelection, instrumentLabel, isChartKindRenderable, rangeLabel, selectDefaultInstrumentId, selectSeriesCandles, selectSeriesPoints, seriesForInstrument, unitLabel } from './insightsV3Presentation';
import { isSafeReviewBundle, resolveInsightsV3FixtureId } from './insightsV3Source';

const fixtureRoot = resolve(process.cwd(), 'src/quant-product/fixtures');
const loadRaw = (name: string) => JSON.parse(readFileSync(resolve(fixtureRoot, `${name}.json`), 'utf8'));
const load = (name: string) => {
  const parsed = parseQuantProductBundleV1(loadRaw(name));
  assert.equal(parsed.ok, true, `${name} must pass the Product Contract`);
  if (!parsed.ok) throw new Error(`${name} failed`);
  return parsed.bundle;
};

assert.equal(resolveInsightsV3FixtureId('?quantProductFixture=mature'), 'mature');
assert.equal(resolveInsightsV3FixtureId('quantProductFixture=sparse-3'), 'sparse-3');
assert.equal(resolveInsightsV3FixtureId('?quantProductFixture=owner-data'), null);
assert.equal(rangeLabel('zh', { kind: 'contract', key: 'RECENT' }), '最近');
assert.equal(rangeLabel('en', { kind: 'contract', key: '30D' }), '30D');
assert.equal(aggregationBucketLabel('zh', 'quant_source_points'), '原始观察');
assert.equal(unitLabel('minutes', 'zh'), '分钟');

const manifest = loadRaw('manifest');
for (const name of manifest.fixtures) {
  const bundle = load(name);
  assert.equal(isSafeReviewBundle(bundle), true, `${name} must remain synthetic review data`);
}

const unsafe = loadRaw('one_observation_full');
unsafe.metadata.synthetic_only = false;
unsafe.metadata.contains_real_user_data = true;
const unsafeParsed = parseQuantProductBundleV1(unsafe);
assert.equal(unsafeParsed.ok, true);
if (unsafeParsed.ok) assert.equal(isSafeReviewBundle(unsafeParsed.bundle), false);

const empty = buildInsightsV3Consumer(load('no_data_compact'));
assert.equal(empty.instruments.length, 0);
assert.equal(selectDefaultInstrumentId(empty), null);

for (const [fixture, count] of [
  ['one_observation_full', 1],
  ['three_observations_full', 3],
  ['ten_observations_full', 10],
] as const) {
  const bundle = load(fixture);
  const model = buildInsightsV3Consumer(bundle);
  const id = selectDefaultInstrumentId(model);
  assert.ok(id);
  const instrument = model.instruments.find((row) => row.id === id)!;
  assert.equal(instrument.evidence.observation_count, count);
  const series = seriesForInstrument(instrument);
  assert.ok(series);
  assert.equal(series!.points.length, count);
  const visible = selectSeriesPoints(series!, defaultRangeSelection(series), bundle.metadata.as_of);
  assert.ok(visible.length > 0 && visible.length <= count);
  assert.equal(selectSeriesPoints(series!, { kind: 'last_n_observations', count }, bundle.metadata.as_of).length, count);
}

const mature = load('mature_market_full');
const matureModel = buildInsightsV3Consumer(mature);
const matureId = selectDefaultInstrumentId(matureModel);
assert.ok(matureId);
const matureInstrument = matureModel.instruments.find((row) => row.id === matureId)!;
const goalInstrument = matureModel.instruments.find((row) => row.scope === 'GOAL')!;
const skillInstrument = matureModel.instruments.find((row) => row.scope === 'SKILL')!;
assert.match(instrumentLabel('en', goalInstrument), /^Goal · /);
assert.match(instrumentLabel('en', skillInstrument), /^Skill · /);
const matureSeries = seriesForInstrument(matureInstrument)!;
assert.ok(matureSeries.points.length > 10);
assert.ok(availableChartKinds(matureSeries).includes('line'));
const defaultRange = defaultRangeSelection(matureSeries);
const defaultPoints = selectSeriesPoints(matureSeries, defaultRange, mature.metadata.as_of);
assert.ok(defaultPoints.length > 0);
if (selectSeriesCandles(matureSeries, defaultRange).length > 0) {
  assert.equal(isChartKindRenderable(matureSeries, 'candle', defaultRange), true);
}
const threePointWindow = selectSeriesPoints(matureSeries, { kind: 'last_n_observations', count: 3 }, mature.metadata.as_of);
assert.equal(threePointWindow.length, 3);
assert.equal(selectSeriesPoints(matureSeries, { kind: 'contract', key: 'UNSUPPORTED_RANGE' }, mature.metadata.as_of).length, 0);

const driverBundle = load('driver_analysis_full');
const driverModel = buildInsightsV3Consumer(driverBundle);
const driverId = selectDefaultInstrumentId(driverModel)!;
const driverInstrument = driverModel.instruments.find((row) => row.id === driverId)!;
const cue = buildCompactCue('en', driverBundle, driverInstrument);
assert.equal(cue.boundary, 'inference');
assert.match(cue.text, /registered observational candidates/);
assert.match(cue.detail || '', /not causes/);
assert.equal(driverBundle.interpretation?.recovery?.forecast_allowed, false);
assert.equal(driverBundle.interpretation?.scenario?.causal_effect_estimated, false);

const researchFiltered = load('research_filtered_compact');
assert.ok(researchFiltered.eligibility_summary.blocked_research_artifact_count > 0);
assert.ok(researchFiltered.eligibility_summary.blocked_artifact_kinds.length > 0);
assert.equal(researchFiltered.metadata.eligibility, 'PRODUCT_ELIGIBLE');

const sourceText = [
  readFileSync(resolve(process.cwd(), 'src/insights-v3/insightsV3Presentation.ts'), 'utf8'),
  readFileSync(resolve(process.cwd(), 'src/insights-v3/insightsV3I18n.ts'), 'utf8'),
  readFileSync(resolve(process.cwd(), 'src/insights-v3/InsightsV3Analysis.tsx'), 'utf8'),
  readFileSync(resolve(process.cwd(), 'src/insights-v3/InsightsV3Screen.tsx'), 'utf8'),
].join('\n');
for (const forbidden of ['Life Score', 'Readiness Score', 'Productivity Score']) {
  assert.equal(sourceText.includes(forbidden), false, `${forbidden} must not enter Insights V3`);
}

console.log('Insights V3 Product Contract presentation tests passed');
