import assert from 'node:assert/strict';
import {
  addInsightsV3WatchlistItem,
  moveInsightsV3WatchlistItem,
  normalizeInsightsV3Watchlist,
  orderedInsightsV3Watchlist,
  removeInsightsV3WatchlistItem,
  toggleInsightsV3PinnedItem,
} from './insightsV3WatchlistPreferences';

const available = ['a', 'b', 'c', 'd'];

assert.deepEqual(
  normalizeInsightsV3Watchlist(null, available, ['b', 'a', 'missing']),
  { order: ['b', 'a'], pinnedIds: [] },
);
assert.deepEqual(
  normalizeInsightsV3Watchlist({ watchlistOrder: ['c', 'missing', 'c', 'a'], pinnedIds: ['a', 'missing'] }, available, ['b']),
  { order: ['c', 'a'], pinnedIds: ['a'] },
);
assert.deepEqual(orderedInsightsV3Watchlist({ order: ['a', 'b', 'c'], pinnedIds: ['c'] }), ['c', 'a', 'b']);
assert.deepEqual(addInsightsV3WatchlistItem(['a'], 'b'), ['a', 'b']);
assert.deepEqual(addInsightsV3WatchlistItem(['a'], 'a'), ['a']);
assert.deepEqual(removeInsightsV3WatchlistItem(['a', 'b'], 'a'), ['b']);
assert.deepEqual(moveInsightsV3WatchlistItem(['a', 'b', 'c'], 'b', -1), ['b', 'a', 'c']);
assert.deepEqual(moveInsightsV3WatchlistItem(['a', 'b', 'c'], 'b', 1), ['a', 'c', 'b']);
assert.deepEqual(toggleInsightsV3PinnedItem(['a'], 'a'), []);
assert.deepEqual(toggleInsightsV3PinnedItem(['a'], 'b'), ['a', 'b']);
assert.deepEqual(toggleInsightsV3PinnedItem(['a', 'b', 'c', 'd', 'e'], 'f'), ['a', 'b', 'c', 'd', 'e']);

console.log('Insights V3 watchlist tests passed');
