import { strict as assert } from 'node:assert';
import type {
  PersonalTerminalCandle,
  PersonalTerminalModel,
  PersonalTerminalSeries,
} from './personalTerminalPresentation';
import {
  addWatchlistItem,
  availableCandleSources,
  availableQuickRanges,
  buildPersonalMarketWidgetPayload,
  buildPersonalTerminalCatalog,
  buildPersonalTerminalRangeViewData,
  createDefaultPersonalTerminalPreferences,
  defaultCandleSource,
  normalizePersonalTerminalPreferences,
  removeWatchlistItem,
  reorderWatchlist,
  resolveDisplayRangeWindow,
  togglePinnedItem,
} from './personalTerminalWorkspace';

const text = (value: string) => ({ kind: 'text' as const, text: value });
const timestamps = Array.from({ length: 10 }, (_, index) => `2026-08-${String(index + 1).padStart(2, '0')}T12:00:00.000Z`);

function makeSeries(id: string, entityId: string, domain: string, values = timestamps.map((_, index) => index + 1)): PersonalTerminalSeries {
  return {
    id,
    entityId,
    label: text(id),
    unit: text('unit'),
    stage: 'S2',
    semantic: 'count',
    valueChangeMode: 'absolute',
    supportsCandle: false,
    observations: values.map((value, index) => ({
      id: `${id}:${index}`,
      timestamp: timestamps[index],
      value,
      provenance: 'questlife_confirmed',
      sourceIds: [`source:${id}:${index}`],
    })),
    load: [],
    events: [],
    baseline: {
      status: 'provisional',
      value: 5,
      low: 3,
      high: 7,
      referenceKind: 'active',
    },
    limitation: text('observational only'),
    domain,
  };
}

const marketOne = makeSeries('market:steps', 'market:personal', 'movement');
const marketTwo = makeSeries('market:sleep', 'market:personal', 'sleep');
const marketThree = makeSeries('market:focus', 'market:personal', 'focus');
const goalSeries = makeSeries('goal:sql', 'goal:sql', 'learning');
const skillSeries = makeSeries('skill:sql', 'skill:sql', 'learning');

const model: PersonalTerminalModel = {
  fixture: null,
  dataMode: 'real',
  defaultScope: 'market',
  defaultEntityId: 'market:personal',
  defaultSeriesId: marketOne.id,
  entities: [
    { id: 'market:personal', scope: 'market', label: text('market'), context: text('market'), seriesIds: [marketOne.id, marketTwo.id, marketThree.id] },
    { id: 'goal:sql', scope: 'goal', label: text('SQL goal'), context: text('goal'), seriesIds: [goalSeries.id] },
    { id: 'skill:sql', scope: 'skill', label: text('SQL skill'), context: text('skill'), seriesIds: [skillSeries.id] },
  ],
  series: [marketOne, marketTwo, marketThree, goalSeries, skillSeries],
  signals: [],
  implication: text('observational only'),
  range: { start: timestamps[0], end: timestamps[timestamps.length - 1] },
};

const catalog = buildPersonalTerminalCatalog(model);
assert.equal(catalog.find((item) => item.id === goalSeries.id)?.group, 'goal');
assert.equal(catalog.find((item) => item.id === skillSeries.id)?.group, 'skill');

const defaults = createDefaultPersonalTerminalPreferences(catalog);
assert.deepEqual(defaults.watchlistOrder.slice(0, 4), [marketOne.id, marketTwo.id, goalSeries.id, skillSeries.id]);
assert.equal(defaults.workspaces[0].panes.length, 1);

assert.deepEqual(addWatchlistItem(['a'], 'b'), ['a', 'b']);
assert.deepEqual(addWatchlistItem(['a'], 'a'), ['a']);
assert.deepEqual(removeWatchlistItem(['a', 'b'], 'a'), ['b']);
assert.deepEqual(reorderWatchlist(['a', 'b', 'c'], 'c', 'a'), ['c', 'a', 'b']);
assert.deepEqual(togglePinnedItem(['a'], 'b'), ['a', 'b']);
assert.deepEqual(togglePinnedItem(['a', 'b'], 'a'), ['b']);

const normalized = normalizePersonalTerminalPreferences({
  watchlistOrder: [marketOne.id, 'stale', goalSeries.id],
  pinnedIds: ['stale', goalSeries.id],
  defaultSeriesId: 'stale',
  quickRanges: ['1D', '9D', 'ALL'],
  activeWorkspaceId: 'custom-workspace',
  workspaces: [{
    id: 'custom-workspace',
    name: 'custom',
    layout: 'four',
    panes: [{ id: 'pane-1', seriesId: 'stale', chartKind: 'bar', range: { kind: 'last_n_days', days: 9 } }],
  }],
}, catalog);
assert.deepEqual(normalized.watchlistOrder, [marketOne.id, goalSeries.id]);
assert.deepEqual(normalized.pinnedIds, [goalSeries.id]);
assert.deepEqual(normalized.quickRanges, ['1D', 'ALL']);
assert.equal(normalized.defaultSeriesId, marketOne.id);
assert.equal(normalized.workspaces[0].panes.length, 4);
assert.equal(normalized.workspaces[0].panes[0].chartKind, 'bar');
assert.equal(normalized.workspaces[0].panes[0].seriesId, marketOne.id);

const now = new Date('2026-08-10T20:00:00.000+08:00');
const fourDay = buildPersonalTerminalRangeViewData(marketOne, { kind: 'last_n_days', days: 4 }, now, null);
const nineDay = buildPersonalTerminalRangeViewData(marketOne, { kind: 'last_n_days', days: 9 }, now, null);
assert.equal(fourDay.observations.length, 4);
assert.equal(nineDay.observations.length, 9);
assert.equal(resolveDisplayRangeWindow({ kind: 'last_n_observations', count: 3 }, now, marketOne).start, new Date(timestamps[7]).getTime());
assert.equal(buildPersonalTerminalRangeViewData(marketOne, { kind: 'last_n_observations', count: 3 }, now, null).observations.length, 3);
assert.equal(buildPersonalTerminalRangeViewData(marketOne, { kind: 'calendar_range', start: '2026-08-03', end: '2026-08-05' }, now, null).observations.length, 3);
assert.deepEqual(availableQuickRanges(marketOne), ['1D', '2D', '3D', '5D', '7D', 'ALL']);

const quantCandle: PersonalTerminalCandle = {
  time: timestamps[0],
  endTime: timestamps[6],
  open: 1,
  high: 7,
  low: 1,
  close: 7,
  openAt: timestamps[0],
  highAt: timestamps[6],
  lowAt: timestamps[0],
  closeAt: timestamps[6],
  average: 4,
  observationCount: 7,
  expectedObservationCount: 7,
  sourceIds: marketOne.observations.slice(0, 7).map((row) => row.id),
  representation: 'OBSERVATIONAL_SCALAR_OHLC',
  bucketSemantics: 'quant_supplied_week',
};
const candleSeries: PersonalTerminalSeries = {
  ...marketOne,
  supportsCandle: true,
  chartCapabilities: { line: true, bar: true, candle: true, percentChange: true, candleTimeframes: ['30D'] },
  precomputedCandles: { '30D': [quantCandle] },
};
assert.deepEqual(availableCandleSources(candleSeries), ['30D']);
assert.equal(defaultCandleSource(candleSeries, { kind: 'last_n_days', days: 9 }), '30D');
assert.equal(buildPersonalTerminalRangeViewData(candleSeries, { kind: 'preset', preset: '1M' }, now, '30D').candles[0], quantCandle);
assert.equal(buildPersonalTerminalRangeViewData(candleSeries, { kind: 'calendar_range', start: '2026-08-03', end: '2026-08-05' }, now, '30D').candles[0], quantCandle);
assert.equal(buildPersonalTerminalRangeViewData(marketOne, { kind: 'preset', preset: '1M' }, now, null).candles.length, 0);

const widget = buildPersonalMarketWidgetPayload(catalog, defaults, now);
assert.ok(widget.items.length <= 6);
assert.equal(widget.primarySeriesId, defaults.defaultSeriesId);

console.log('personalTerminalWorkspace tests passed');
