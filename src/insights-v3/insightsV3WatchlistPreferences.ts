const PERSONAL_TERMINAL_PREFERENCES_KEY = 'questlife_v11_personal_terminal_preferences_v1';

function personalTerminalPreferencesStorageKey(namespace: string) {
  return !namespace || namespace === 'real'
    ? PERSONAL_TERMINAL_PREFERENCES_KEY
    : `${PERSONAL_TERMINAL_PREFERENCES_KEY}:${encodeURIComponent(namespace)}`;
}

export type InsightsV3WatchlistPreferences = {
  order: string[];
  pinnedIds: string[];
};

function uniqueValidIds(values: unknown, validIds: Set<string>) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter((value): value is string => typeof value === 'string' && validIds.has(value)))];
}

export function insightsV3WatchlistNamespace(fixtureId: string | null) {
  return fixtureId ? `insights-v3:fixture:${fixtureId}` : 'real';
}

export function normalizeInsightsV3Watchlist(
  raw: unknown,
  availableIds: string[],
  defaultIds: string[],
): InsightsV3WatchlistPreferences {
  const validIds = new Set(availableIds);
  const row = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const storedOrder = uniqueValidIds(row.watchlistOrder, validIds);
  const order = Array.isArray(row.watchlistOrder)
    ? storedOrder
    : uniqueValidIds(defaultIds, validIds);
  const pinnedIds = uniqueValidIds(row.pinnedIds, new Set(order)).slice(0, 5);
  return { order, pinnedIds };
}

export function readInsightsV3Watchlist(
  availableIds: string[],
  defaultIds: string[],
  namespace: string,
) {
  if (typeof window === 'undefined') return normalizeInsightsV3Watchlist(null, availableIds, defaultIds);
  try {
    const raw = window.localStorage.getItem(personalTerminalPreferencesStorageKey(namespace));
    return normalizeInsightsV3Watchlist(raw ? JSON.parse(raw) : null, availableIds, defaultIds);
  } catch (error) {
    console.warn('[insights-v3] watchlist preference read failed', error);
    return normalizeInsightsV3Watchlist(null, availableIds, defaultIds);
  }
}

export function writeInsightsV3Watchlist(
  preferences: InsightsV3WatchlistPreferences,
  availableIds: string[],
  namespace: string,
) {
  if (typeof window === 'undefined') return;
  const key = personalTerminalPreferencesStorageKey(namespace);
  try {
    const stored = window.localStorage.getItem(key);
    const parsed = stored ? JSON.parse(stored) : null;
    const existing = parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
    const normalized = normalizeInsightsV3Watchlist(
      { watchlistOrder: preferences.order, pinnedIds: preferences.pinnedIds },
      availableIds,
      preferences.order,
    );
    const currentDefault = typeof existing.defaultSeriesId === 'string' && availableIds.includes(existing.defaultSeriesId)
      ? existing.defaultSeriesId
      : normalized.order[0] || null;
    window.localStorage.setItem(key, JSON.stringify({
      ...existing,
      version: 1,
      watchlistOrder: normalized.order,
      pinnedIds: normalized.pinnedIds,
      defaultSeriesId: currentDefault,
    }));
  } catch (error) {
    console.warn('[insights-v3] watchlist preference write failed', error);
  }
}

export function orderedInsightsV3Watchlist(preferences: InsightsV3WatchlistPreferences) {
  return [
    ...preferences.order.filter((id) => preferences.pinnedIds.includes(id)),
    ...preferences.order.filter((id) => !preferences.pinnedIds.includes(id)),
  ];
}

export function addInsightsV3WatchlistItem(order: string[], id: string) {
  return order.includes(id) ? order : [...order, id];
}

export function removeInsightsV3WatchlistItem(order: string[], id: string) {
  return order.filter((item) => item !== id);
}

export function moveInsightsV3WatchlistItem(order: string[], id: string, direction: -1 | 1) {
  const index = order.indexOf(id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= order.length) return order;
  const next = [...order];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function toggleInsightsV3PinnedItem(pinnedIds: string[], id: string) {
  if (pinnedIds.includes(id)) return pinnedIds.filter((item) => item !== id);
  return pinnedIds.length >= 5 ? pinnedIds : [...pinnedIds, id];
}
