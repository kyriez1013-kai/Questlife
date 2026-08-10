import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// Node's built-in TypeScript runner requires the extension; Expo typecheck does not.
// @ts-expect-error Test-only Node TypeScript entry.
import { adaptQuantV041TerminalPayload } from './quantV041Adapter.ts';
// @ts-expect-error Test-only Node TypeScript entry.
import { buildPersonalTerminalViewData } from './personalTerminalPresentation.ts';

const fixtureDir = resolve(dirname(fileURLToPath(import.meta.url)), 'v041-fixtures');
const load = (name: string) => JSON.parse(readFileSync(resolve(fixtureDir, `${name}.json`), 'utf8'));

const noData = adaptQuantV041TerminalPayload(load('no-data'));
assert.equal(noData.availability, 'no_data');
assert.deepEqual(noData.entities, []);
assert.deepEqual(noData.series, []);

const steps = adaptQuantV041TerminalPayload(load('steps-only'));
const stepsSeries = steps.series[0];
assert.equal(steps.lifecycleScenario, 'steps-only');
assert.equal(steps.entities.length, 1);
assert.equal(steps.entities.some((row) => row.scope === 'goal'), false);
assert.equal(stepsSeries.supportsCandle, true);
assert.deepEqual(stepsSeries.availableTimeframes, ['7D', '30D', '90D', '1Y', 'ALL']);
assert.equal(stepsSeries.chartCapabilities?.candleRepresentation, 'OBSERVATIONAL_SCALAR_OHLC');
assert.deepEqual(stepsSeries.chartCapabilities?.candleTimeframes, ['30D', '90D', '1Y', 'ALL']);
assert.equal(stepsSeries.chartCapabilities?.bucketSemantics?.['30D'], 'calendar_week_daily_scalar_ohlc');
assert.equal(stepsSeries.baseline.value, 7571);
assert.equal(stepsSeries.recentChange?.percentChange, 8.737287016246203);
const steps30 = buildPersonalTerminalViewData(stepsSeries, '30D', new Date('2026-01-03T07:59:00+11:00'));
assert.equal(steps30.line.length, stepsSeries.precomputedViews?.['30D']?.pointCount);
assert.deepEqual(steps30.emaShort, [], 'the App must not recompute Quant EMA');
assert.ok(steps30.candles.length > 0, 'the App must consume Quant-provided observational candles');
assert.ok(buildPersonalTerminalViewData(stepsSeries, '90D', new Date('2026-01-03T07:59:00+11:00')).candles.length > 0);

for (const candle of steps30.candles) {
  const source = candle.sourceIds
    .map((id) => stepsSeries.observations.find((point) => point.id === id))
    .filter((point): point is NonNullable<typeof point> => Boolean(point))
    .sort((left, right) => left.timestamp.localeCompare(right.timestamp) || left.id.localeCompare(right.id));
  assert.equal(source.length, candle.observationCount);
  assert.ok(source.length >= 2);
  assert.equal(candle.open, source[0].value);
  assert.equal(candle.close, source[source.length - 1].value);
  assert.equal(candle.high, Math.max(...source.map((point) => point.value)));
  assert.equal(candle.low, Math.min(...source.map((point) => point.value)));
  assert.equal(candle.openAt, source[0].timestamp);
  assert.equal(candle.closeAt, source[source.length - 1].timestamp);
  assert.equal(candle.average, source.reduce((sum, point) => sum + point.value, 0) / source.length);
}

const day30 = adaptQuantV041TerminalPayload(load('day30'));
assert.ok(day30.series.some((row) => row.domain === 'active_questlife'));
assert.ok(day30.entities.some((row) => row.scope === 'goal'));
assert.ok(day30.entities.some((row) => row.scope === 'skill'));

const day90 = adaptQuantV041TerminalPayload(load('day90'));
assert.equal(day90.signals.length, 1);
assert.equal(day90.signals[0].status, 'supported');
assert.equal(day90.signals[0].sourceConstruct, 'sleep.duration');
assert.equal(day90.signals[0].targetConstruct, 'state.focus');
assert.equal(day90.signals[0].independentDayCount, 72);
assert.equal(day90.signals[0].counterexampleCount, 3);
assert.ok((day90.signals[0].effectEstimate || 0) > 0);
assert.equal(day90.signals[0].recentExamples?.length, 3);
assert.equal(
  (new Date(`${day90.signals[0].recentExamples![0].targetAt.slice(0, 10)}T00:00:00Z`).getTime()
    - new Date(`${day90.signals[0].recentExamples![0].sourceAt.slice(0, 10)}T00:00:00Z`).getTime()) / 86_400_000,
  1,
);

const goal = adaptQuantV041TerminalPayload(load('goal'));
assert.equal(goal.defaultScope, 'goal');
assert.equal(goal.entities.find((row) => row.scope === 'goal')?.compositionBasis?.kind, 'i18n');

const unsafe = load('steps-only');
unsafe.source.containsRealUserData = true;
assert.throws(() => adaptQuantV041TerminalPayload(unsafe));

const tampered = load('steps-only');
tampered.series[0].candleViews['30D'][0].high += 1;
assert.throws(
  () => adaptQuantV041TerminalPayload(tampered),
  /Candle values do not reconstruct from Quant source points/,
);

assert.equal(steps.sourceMetadata?.syntheticOnly, true);
assert.equal(steps.sourceMetadata?.containsRealUserData, false);

console.log('Quant V0.4.1 adapter tests passed');
