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
assert.equal(stepsSeries.supportsCandle, false);
assert.deepEqual(stepsSeries.availableTimeframes, ['7D', '30D', '90D', '1Y', 'ALL']);
assert.equal(stepsSeries.baseline.value, 6902);
assert.equal(stepsSeries.recentChange?.percentChange, 4.31758910460736);
const steps30 = buildPersonalTerminalViewData(stepsSeries, '30D', new Date('2026-01-03T07:59:00+11:00'));
assert.equal(steps30.line.length, stepsSeries.precomputedViews?.['30D']?.pointCount);
assert.deepEqual(steps30.emaShort, [], 'the App must not recompute Quant EMA');
assert.deepEqual(steps30.candles, [], 'the App must not fabricate OHLC');

const day30 = adaptQuantV041TerminalPayload(load('day30'));
assert.ok(day30.series.some((row) => row.domain === 'active_questlife'));
assert.ok(day30.entities.some((row) => row.scope === 'goal'));
assert.ok(day30.entities.some((row) => row.scope === 'skill'));

const goal = adaptQuantV041TerminalPayload(load('goal'));
assert.equal(goal.defaultScope, 'goal');
assert.equal(goal.entities.find((row) => row.scope === 'goal')?.compositionBasis?.kind, 'i18n');

const unsafe = load('steps-only');
unsafe.source.containsRealUserData = true;
assert.throws(() => adaptQuantV041TerminalPayload(unsafe));

console.log('Quant V0.4.1 adapter tests passed');
