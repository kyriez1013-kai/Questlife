import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// Node's built-in TypeScript runner requires the extension; Expo typecheck does not.
// @ts-expect-error Test-only Node TypeScript entry.
import { adaptQuantV042TerminalPayload } from './quantV042Adapter.ts';
// @ts-expect-error Test-only Node TypeScript entry.
import { buildPersonalTerminalViewData } from './personalTerminalPresentation.ts';

const fixtureDir = resolve(dirname(fileURLToPath(import.meta.url)), 'v042-fixtures');
const load = (name: string) => JSON.parse(readFileSync(resolve(fixtureDir, `${name}.json`), 'utf8'));
const loadOverview = (name: string) => JSON.parse(readFileSync(resolve(fixtureDir, 'overview', `${name}.json`), 'utf8'));
const adapt = (name: string) => adaptQuantV042TerminalPayload(load(name), loadOverview(name));

const noData = adapt('no_data');
assert.equal(noData.availability, 'no_data');
assert.equal(noData.marketOverview?.state, 'no_data');
assert.deepEqual(noData.marketOverview?.instruments, []);

const first = adapt('focus_1_observation');
const firstFocus = first.series[0];
assert.equal(firstFocus.adaptive?.state, 'first_observation');
assert.deepEqual(firstFocus.adaptive?.availableViews, ['point']);
assert.equal(firstFocus.baseline.value, null);
assert.equal(firstFocus.adaptive?.microCandleAvailable, false);
assert.deepEqual(firstFocus.availableTimeframes, ['RECENT', 'ALL']);

const second = adapt('focus_2_observations');
const secondFocus = second.series[0];
assert.equal(secondFocus.adaptive?.state, 'comparison_available');
assert.equal(secondFocus.adaptive?.previous, 4);
assert.equal(secondFocus.adaptive?.current, 3);
assert.equal(secondFocus.adaptive?.changeFromPrevious, -1);
assert.equal(secondFocus.baseline.value, null);
assert.equal(secondFocus.supportsCandle, false);

const third = adapt('focus_3_observations');
const thirdFocus = third.series[0];
assert.equal(thirdFocus.adaptive?.state, 'short_window_forming');
assert.equal(thirdFocus.adaptive?.defaultView, 'line');
assert.equal(thirdFocus.adaptive?.rangeLow, 3);
assert.equal(thirdFocus.adaptive?.rangeHigh, 5);
assert.equal(thirdFocus.adaptive?.microCandleAvailable, true);
const thirdRecent = buildPersonalTerminalViewData(thirdFocus, 'RECENT', new Date('2026-01-05T00:00:00+11:00'));
assert.equal(thirdRecent.candles.length, 1);
assert.equal(thirdRecent.candles[0].bucketType, 'OBSERVATION_COUNT');
assert.equal(thirdRecent.candles[0].observationCount, 3);
assert.deepEqual(
  [thirdRecent.candles[0].open, thirdRecent.candles[0].high, thirdRecent.candles[0].low, thirdRecent.candles[0].close],
  [4, 5, 3, 5],
);

const steps = adapt('market_steps_only');
const stepsSeries = steps.series[0];
const stepsSummary = steps.marketOverview!.instruments[0];
assert.equal(stepsSummary.current, 11400);
assert.equal(stepsSummary.reference, 7571);
assert.equal(stepsSummary.deviationAbsolute, 3829);
assert.ok(Math.abs(stepsSummary.deviationPercent! - (11400 - 7571) / 7571 * 100) < 1e-9);
assert.notEqual(stepsSummary.deviationPercent, stepsSeries.recentChange?.percentChange);
assert.equal(stepsSummary.semantic, 'count');
assert.equal(steps.marketOverview?.instrumentCount, 1);

const mature = adapt('market_mixed_mature');
const breadth = mature.marketOverview!.breadth;
assert.equal(
  breadth.aboveReference + breadth.nearReference + breadth.belowReference + breadth.forming,
  mature.marketOverview!.instrumentCount,
);
assert.equal(mature.marketOverview!.limitations.includes('NO_COMPOSITE_PERSONAL_INDEX'), true);
assert.equal(String(mature.marketOverview).includes('Life Score'), false);

const ordinalModel = adapt('focus_10_observations');
const ordinal = ordinalModel.marketOverview!.instruments[0];
assert.equal(ordinal.semantic, 'ordinal_state');
assert.equal(ordinal.deviationPercent, null);
assert.ok((ordinalModel.series[0].baseline.low ?? 0) >= 1);
assert.ok((ordinalModel.series[0].baseline.high ?? 6) <= 5);
assert.ok((ordinal.referenceLow ?? 0) >= 1);
assert.ok((ordinal.referenceHigh ?? 6) <= 5);

const tamperedCandle = load('focus_3_observations');
tamperedCandle.series[0].candleViews.RECENT[0].high = 99;
assert.throws(
  () => adaptQuantV042TerminalPayload(tamperedCandle, loadOverview('focus_3_observations')),
  /candle values do not reconstruct/,
);

const tamperedOverview = loadOverview('market_steps_only');
tamperedOverview.overview.instruments[0].deviationPercent = 8.7;
assert.throws(
  () => adaptQuantV042TerminalPayload(load('market_steps_only'), tamperedOverview),
  /overview does not match|percentage deviation mismatch/,
);

console.log('Quant V0.4.2 adapter tests passed');
