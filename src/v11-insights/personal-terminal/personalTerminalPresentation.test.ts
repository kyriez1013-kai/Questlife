import { strict as assert } from 'node:assert';
import type { PersonalTerminalSeries } from './personalTerminalPresentation';
// Node's built-in TypeScript runner requires the extension; Expo typecheck does not.
// @ts-expect-error Test-only Node TypeScript entry.
import { getPersonalTerminalFixture } from './personalTerminalFixtures.ts';
// @ts-expect-error Test-only Node TypeScript entry.
import { availableComparisonSeries, availableTimeframes, buildPersonalTerminalViewData } from './personalTerminalPresentation.ts';

const mature = getPersonalTerminalFixture('mature');
assert.equal(mature.fixture, 'mature');
assert.equal(mature.dataMode, 'qa_fixture');
assert.ok(mature.entities.some((entity) => entity.scope === 'market'));
assert.ok(mature.entities.some((entity) => entity.scope === 'goal'));
assert.ok(mature.entities.some((entity) => entity.scope === 'skill'));
assert.ok(mature.series.find((row) => row.id === 'market:index')?.qaDerivedIndex);

const state = mature.series.find((row) => row.id === 'market:state')!;
const all = buildPersonalTerminalViewData(state, 'ALL', new Date('2026-08-08T20:00:00.000Z'));
assert.ok(all.line.length >= 11, 'same daily observations aggregate into a monthly ALL view');
assert.ok(all.candles.length > 0, 'multi-observation periods produce legitimate OHLC candles');
assert.ok(all.observations.some((row) => row.provenance === 'historical_reference'));
assert.ok(all.observations.some((row) => row.provenance === 'questlife_confirmed'));
const marketComparisons = availableComparisonSeries(mature, 'market:personal', 'market:state');
assert.deepEqual(marketComparisons.map((row) => row.id), ['market:index', 'market:execution', 'market:recovery']);
assert.ok(marketComparisons.every((row) => row.unit), 'comparison candidates retain explicit independent units');
assert.equal(mature.series.find((row) => row.id === 'market:state')?.events[0].category, 'training');
assert.equal(mature.signals[0].lagDays, 1);
assert.equal(mature.signals[0].maturity, 'established');
assert.equal(mature.similarPeriods?.length, 2);

const onePointSeries: PersonalTerminalSeries = {
  ...state,
  supportsCandle: true,
  observations: [{ id: 'one', timestamp: '2026-08-08T08:00:00.000Z', value: 3, provenance: 'questlife_confirmed', sourceIds: ['one'] }],
};
const onePoint = buildPersonalTerminalViewData(onePointSeries, '1D', new Date('2026-08-08T20:00:00.000Z'));
assert.equal(onePoint.candles.length, 0, 'one observation never fabricates OHLC');
assert.equal(onePoint.incompleteCandles.length, 1, 'one observation remains an explicit point');

const forming = getPersonalTerminalFixture('forming');
const formingSeries = forming.series[0];
assert.equal(formingSeries.baseline.value, null);
assert.equal(formingSeries.baseline.status, 'forming');
assert.equal(forming.signals.length, 0);
assert.deepEqual(availableTimeframes(formingSeries, new Date('2026-08-08T20:00:00.000Z')), ['7D', '1M']);

const portfolio = getPersonalTerminalFixture('portfolio');
assert.equal(portfolio.defaultScope, 'goal');
assert.ok(portfolio.entities.find((row) => row.id === portfolio.defaultEntityId)?.composition?.length);

const skill = getPersonalTerminalFixture('skill');
assert.equal(skill.defaultScope, 'skill');
assert.ok(skill.series.find((row) => row.id === skill.defaultSeriesId)?.semantic === 'performance');

console.log('personalTerminalPresentation tests passed');
