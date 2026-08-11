import type { V11InsightCopy } from '../insightsPresentation';
import {
  buildPersonalTerminalViewData,
  type PersonalTerminalChartKind,
  type PersonalTerminalIndicator,
  type PersonalTerminalModel,
  type PersonalTerminalScope,
  type PersonalTerminalSeries,
  type PersonalTerminalTimeframe,
  type PersonalTerminalViewData,
} from './personalTerminalPresentation';

export const PERSONAL_TERMINAL_PREFERENCES_KEY = 'questlife_v11_personal_terminal_preferences_v1';

export type PersonalTerminalQuickRange =
  | '1D'
  | '2D'
  | '3D'
  | '5D'
  | '7D'
  | '14D'
  | '1M'
  | '3M'
  | '6M'
  | '1Y'
  | 'ALL';

export type PersonalTerminalDisplayRange =
  | { kind: 'preset'; preset: PersonalTerminalQuickRange }
  | { kind: 'last_n_days'; days: number }
  | { kind: 'calendar_range'; start: string; end: string }
  | { kind: 'last_n_observations'; count: number };

export type PersonalTerminalCatalogGroup = 'passive' | 'state' | 'goal' | 'skill' | 'other';

export type PersonalTerminalCatalogItem = {
  id: string;
  seriesId: string;
  entityId: string;
  scope: PersonalTerminalScope;
  group: PersonalTerminalCatalogGroup;
  domain: string;
  label: V11InsightCopy;
  unit: V11InsightCopy;
  current: number | null;
  reference: number | null;
  deviationAbsolute: number | null;
  deviationPercent: number | null;
  observationCount: number;
  independentDayCount: number;
  coverageRatio: number | null;
  miniSeries: Array<{ timestamp: string; value: number }>;
};

export type PersonalTerminalPane = {
  id: string;
  seriesId: string;
  range: PersonalTerminalDisplayRange;
  chartKind: PersonalTerminalChartKind;
  candleSource: PersonalTerminalTimeframe | null;
  indicators: PersonalTerminalIndicator[];
};

export type PersonalTerminalWorkspaceLayout = 'single' | 'two' | 'four' | 'six';

export type PersonalTerminalSavedWorkspace = {
  id: string;
  name: 'daily' | 'study' | 'fitness' | 'recovery' | 'custom';
  layout: PersonalTerminalWorkspaceLayout;
  panes: PersonalTerminalPane[];
  syncTime: boolean;
  syncCrosshair: boolean;
};

export type PersonalTerminalPreferences = {
  version: 1;
  watchlistOrder: string[];
  pinnedIds: string[];
  defaultSeriesId: string | null;
  quickRanges: PersonalTerminalQuickRange[];
  activeWorkspaceId: string;
  workspaces: PersonalTerminalSavedWorkspace[];
};

export type PersonalMarketWidgetPayload = {
  generatedAt: string;
  primarySeriesId: string | null;
  items: Array<{
    seriesId: string;
    current: number | null;
    reference: number | null;
    deviationAbsolute: number | null;
    miniSeries: Array<{ timestamp: string; value: number }>;
  }>;
};

const DEFAULT_QUICK_RANGES: PersonalTerminalQuickRange[] = ['1D', '3D', '7D', '1M', '3M', '1Y'];
const VALID_QUICK_RANGES = new Set<PersonalTerminalQuickRange>([
  '1D', '2D', '3D', '5D', '7D', '14D', '1M', '3M', '6M', '1Y', 'ALL',
]);

function groupForSeries(series: PersonalTerminalSeries, scope: PersonalTerminalScope): PersonalTerminalCatalogGroup {
  if (scope === 'goal') return 'goal';
  if (scope === 'skill') return 'skill';
  if (series.semantic === 'ordinal_state' || series.domain === 'focus' || series.domain === 'state') return 'state';
  if (series.domain === 'movement' || series.domain === 'sleep' || series.domain === 'activity' || series.domain === 'cardiovascular' || series.domain === 'recovery') return 'passive';
  return 'other';
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function latestValue(series: PersonalTerminalSeries) {
  return series.latestValue ?? series.observations[series.observations.length - 1]?.value ?? null;
}

export function buildPersonalTerminalCatalog(model: PersonalTerminalModel): PersonalTerminalCatalogItem[] {
  const entityById = new Map(model.entities.map((entity) => [entity.id, entity]));
  const overviewBySeries = new Map((model.marketOverview?.instruments || []).map((instrument) => [instrument.seriesId, instrument]));
  return model.series
    .filter((series) => !series.qaDerivedIndex)
    .map((series) => {
      const entity = entityById.get(series.entityId);
      const scope = entity?.scope || 'market';
      const overview = overviewBySeries.get(series.id);
      const current = overview?.current ?? latestValue(series);
      const reference = overview?.reference ?? series.baseline.value;
      return {
        id: series.id,
        seriesId: series.id,
        entityId: series.entityId,
        scope,
        group: groupForSeries(series, scope),
        domain: series.domain || series.constructKey || scope,
        label: series.label,
        unit: series.unit,
        current,
        reference,
        deviationAbsolute: overview?.deviationAbsolute ?? (current != null && reference != null ? current - reference : null),
        deviationPercent: overview?.deviationPercent ?? null,
        observationCount: overview?.observationCount ?? series.adaptive?.observationCount ?? series.observations.length,
        independentDayCount: overview?.independentDayCount ?? series.coverage?.observedDays ?? new Set(series.observations.map((row) => row.timestamp.slice(0, 10))).size,
        coverageRatio: overview?.coverageRatio ?? series.coverage?.coverageRatio ?? null,
        miniSeries: overview?.miniSeries?.slice(-20) ?? series.observations.slice(-20).map((row) => ({ timestamp: row.timestamp, value: row.value })),
      };
    });
}

export function defaultWatchlistOrder(catalog: PersonalTerminalCatalogItem[]) {
  const withData = catalog.filter((item) => item.observationCount > 0);
  const market = withData.filter((item) => item.scope === 'market');
  const goal = withData.find((item) => item.scope === 'goal');
  const skill = withData.find((item) => item.scope === 'skill');
  const preferred = unique([
    ...market.slice(0, 2).map((item) => item.id),
    ...(goal ? [goal.id] : []),
    ...(skill ? [skill.id] : []),
    ...market.slice(2, 5).map((item) => item.id),
  ]).slice(0, 7);
  if (preferred.length) return preferred;
  return catalog.slice(0, 5).map((item) => item.id);
}

function pane(id: string, seriesId: string): PersonalTerminalPane {
  return {
    id,
    seriesId,
    range: { kind: 'preset', preset: '1M' },
    chartKind: 'line',
    candleSource: null,
    indicators: ['baseline', 'events'],
  };
}

function defaultWorkspaces(order: string[]): PersonalTerminalSavedWorkspace[] {
  const fallback = order[0] || '';
  const seriesAt = (index: number) => order[index] || fallback;
  return [
    { id: 'daily', name: 'daily', layout: 'two', panes: [pane('daily-1', seriesAt(0)), pane('daily-2', seriesAt(1))], syncTime: true, syncCrosshair: true },
    { id: 'study', name: 'study', layout: 'two', panes: [pane('study-1', seriesAt(2)), pane('study-2', seriesAt(3))], syncTime: true, syncCrosshair: true },
    { id: 'fitness', name: 'fitness', layout: 'two', panes: [pane('fitness-1', seriesAt(0)), pane('fitness-2', seriesAt(4))], syncTime: true, syncCrosshair: true },
    { id: 'recovery', name: 'recovery', layout: 'two', panes: [pane('recovery-1', seriesAt(1)), pane('recovery-2', seriesAt(0))], syncTime: true, syncCrosshair: true },
  ];
}

export function createDefaultPersonalTerminalPreferences(catalog: PersonalTerminalCatalogItem[]): PersonalTerminalPreferences {
  const order = defaultWatchlistOrder(catalog);
  return {
    version: 1,
    watchlistOrder: order,
    pinnedIds: order.slice(0, 4),
    defaultSeriesId: order[0] || catalog[0]?.id || null,
    quickRanges: DEFAULT_QUICK_RANGES,
    activeWorkspaceId: 'daily',
    workspaces: defaultWorkspaces(order),
  };
}

function validRange(value: unknown): PersonalTerminalDisplayRange {
  if (!value || typeof value !== 'object') return { kind: 'preset', preset: '1M' };
  const row = value as Partial<PersonalTerminalDisplayRange> & Record<string, unknown>;
  if (row.kind === 'preset' && VALID_QUICK_RANGES.has(row.preset as PersonalTerminalQuickRange)) return { kind: 'preset', preset: row.preset as PersonalTerminalQuickRange };
  if (row.kind === 'last_n_days' && Number.isFinite(row.days)) return { kind: 'last_n_days', days: Math.max(1, Math.min(3650, Math.round(Number(row.days)))) };
  if (row.kind === 'last_n_observations' && Number.isFinite(row.count)) return { kind: 'last_n_observations', count: Math.max(1, Math.min(1000, Math.round(Number(row.count)))) };
  if (row.kind === 'calendar_range' && typeof row.start === 'string' && typeof row.end === 'string' && row.start <= row.end) return { kind: 'calendar_range', start: row.start, end: row.end };
  return { kind: 'preset', preset: '1M' };
}

function paneCount(layout: PersonalTerminalWorkspaceLayout) {
  if (layout === 'two') return 2;
  if (layout === 'four') return 4;
  if (layout === 'six') return 6;
  return 1;
}

function normalizeWorkspace(raw: unknown, index: number, validIds: Set<string>, fallbackId: string): PersonalTerminalSavedWorkspace | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Partial<PersonalTerminalSavedWorkspace>;
  const layout: PersonalTerminalWorkspaceLayout = row.layout === 'two' || row.layout === 'four' || row.layout === 'six' ? row.layout : 'single';
  const target = paneCount(layout);
  const rawPanes = Array.isArray(row.panes) ? row.panes : [];
  const panes = Array.from({ length: target }, (_, paneIndex): PersonalTerminalPane => {
    const source = rawPanes[paneIndex];
    const seriesId = source && validIds.has(source.seriesId) ? source.seriesId : fallbackId;
    return {
      id: source?.id || `workspace-${index + 1}-pane-${paneIndex + 1}`,
      seriesId,
      range: validRange(source?.range),
      chartKind: source?.chartKind === 'candle' || source?.chartKind === 'bar' ? source.chartKind : 'line',
      candleSource: source?.candleSource || null,
      indicators: Array.isArray(source?.indicators) ? source.indicators.filter((item): item is PersonalTerminalIndicator => ['emaShort', 'emaLong', 'baseline', 'load', 'density', 'events'].includes(item)) : ['baseline', 'events'],
    };
  });
  return {
    id: typeof row.id === 'string' ? row.id : `workspace-${index + 1}`,
    name: row.name === 'daily' || row.name === 'study' || row.name === 'fitness' || row.name === 'recovery' ? row.name : 'custom',
    layout,
    panes,
    syncTime: row.syncTime !== false,
    syncCrosshair: row.syncCrosshair !== false,
  };
}

export function normalizePersonalTerminalPreferences(raw: unknown, catalog: PersonalTerminalCatalogItem[]): PersonalTerminalPreferences {
  const fallback = createDefaultPersonalTerminalPreferences(catalog);
  if (!raw || typeof raw !== 'object') return fallback;
  const row = raw as Partial<PersonalTerminalPreferences>;
  const validIds = new Set(catalog.map((item) => item.id));
  const watchlistOrder = unique(Array.isArray(row.watchlistOrder) ? row.watchlistOrder.filter((id): id is string => typeof id === 'string' && validIds.has(id)) : fallback.watchlistOrder);
  const effectiveOrder = Array.isArray(row.watchlistOrder) ? watchlistOrder : fallback.watchlistOrder;
  const defaultSeriesId = row.defaultSeriesId && validIds.has(row.defaultSeriesId) ? row.defaultSeriesId : effectiveOrder[0] || catalog[0]?.id || null;
  const pinnedIds = unique(Array.isArray(row.pinnedIds) ? row.pinnedIds.filter((id): id is string => typeof id === 'string' && effectiveOrder.includes(id)) : fallback.pinnedIds).slice(0, 5);
  const quickRanges = unique((Array.isArray(row.quickRanges) ? row.quickRanges : fallback.quickRanges).filter((item): item is PersonalTerminalQuickRange => VALID_QUICK_RANGES.has(item as PersonalTerminalQuickRange))).slice(0, 7);
  const fallbackId = defaultSeriesId || catalog[0]?.id || '';
  const workspaces = (Array.isArray(row.workspaces) ? row.workspaces : fallback.workspaces)
    .map((workspace, index) => normalizeWorkspace(workspace, index, validIds, fallbackId))
    .filter((workspace): workspace is PersonalTerminalSavedWorkspace => workspace != null)
    .slice(0, 8);
  const effectiveWorkspaces = workspaces.length ? workspaces : defaultWorkspaces(effectiveOrder);
  const activeWorkspaceId = effectiveWorkspaces.some((workspace) => workspace.id === row.activeWorkspaceId)
    ? String(row.activeWorkspaceId)
    : effectiveWorkspaces[0]?.id || 'daily';
  return {
    version: 1,
    watchlistOrder: effectiveOrder,
    pinnedIds,
    defaultSeriesId,
    quickRanges: quickRanges.length ? quickRanges : DEFAULT_QUICK_RANGES,
    activeWorkspaceId,
    workspaces: effectiveWorkspaces,
  };
}

export function readPersonalTerminalPreferences(catalog: PersonalTerminalCatalogItem[]) {
  if (typeof window === 'undefined') return createDefaultPersonalTerminalPreferences(catalog);
  try {
    const raw = window.localStorage.getItem(PERSONAL_TERMINAL_PREFERENCES_KEY);
    return normalizePersonalTerminalPreferences(raw ? JSON.parse(raw) : null, catalog);
  } catch (error) {
    console.warn('[personal terminal] preference read failed', error);
    return createDefaultPersonalTerminalPreferences(catalog);
  }
}

export function writePersonalTerminalPreferences(preferences: PersonalTerminalPreferences) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PERSONAL_TERMINAL_PREFERENCES_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.warn('[personal terminal] preference write failed', error);
  }
}

export function reorderWatchlist(ids: string[], sourceId: string, targetId: string) {
  if (sourceId === targetId) return ids;
  const sourceIndex = ids.indexOf(sourceId);
  const targetIndex = ids.indexOf(targetId);
  if (sourceIndex < 0 || targetIndex < 0) return ids;
  const next = [...ids];
  const [removed] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, removed);
  return next;
}

export function addWatchlistItem(ids: string[], id: string) {
  return ids.includes(id) ? ids : [...ids, id];
}

export function removeWatchlistItem(ids: string[], id: string) {
  return ids.filter((item) => item !== id);
}

export function togglePinnedItem(ids: string[], id: string) {
  if (ids.includes(id)) return ids.filter((item) => item !== id);
  return [...ids, id].slice(-5);
}

function dateOnly(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

export function quickRangeDays(range: PersonalTerminalQuickRange) {
  if (range === 'ALL') return null;
  if (range === '1M') return 30;
  if (range === '3M') return 90;
  if (range === '6M') return 180;
  if (range === '1Y') return 365;
  return Number.parseInt(range, 10);
}

export function availableQuickRanges(series: PersonalTerminalSeries) {
  if (!series.observations.length) return [] as PersonalTerminalQuickRange[];
  const first = new Date(series.observations[0].timestamp).getTime();
  const last = new Date(series.observations[series.observations.length - 1].timestamp).getTime();
  const spanDays = Math.max(0, Math.floor((last - first) / 86_400_000));
  const candidates: Array<[PersonalTerminalQuickRange, number]> = [
    ['1D', 0], ['2D', 1], ['3D', 2], ['5D', 4], ['7D', 6], ['14D', 13], ['1M', 20], ['3M', 60], ['6M', 120], ['1Y', 240],
  ];
  const result = candidates.filter(([, minimum]) => spanDays >= minimum).map(([range]) => range);
  if (series.observations.length > 1) result.push('ALL');
  return result;
}

export function resolveDisplayRangeWindow(range: PersonalTerminalDisplayRange, now: Date, series: PersonalTerminalSeries) {
  if (range.kind === 'calendar_range') return {
    start: new Date(`${range.start}T00:00:00`).getTime(),
    end: new Date(`${range.end}T23:59:59.999`).getTime(),
  };
  if (range.kind === 'last_n_observations') {
    const observations = series.observations.slice(-range.count);
    return {
      start: observations.length ? new Date(observations[0].timestamp).getTime() : Number.POSITIVE_INFINITY,
      end: observations.length ? new Date(observations[observations.length - 1].timestamp).getTime() : Number.NEGATIVE_INFINITY,
    };
  }
  const days = range.kind === 'last_n_days' ? range.days : quickRangeDays(range.preset);
  if (days == null) return { start: Number.NEGATIVE_INFINITY, end: now.getTime() };
  const start = new Date(now);
  start.setDate(start.getDate() - Math.max(0, days - 1));
  start.setHours(0, 0, 0, 0);
  return { start: start.getTime(), end: now.getTime() };
}

export function effectiveViewTimeframe(range: PersonalTerminalDisplayRange): PersonalTerminalTimeframe {
  const days = range.kind === 'preset' ? quickRangeDays(range.preset) : range.kind === 'last_n_days' ? range.days : null;
  if (range.kind === 'preset' && range.preset === 'ALL') return 'ALL';
  if (days != null && days <= 1) return '1D';
  if (days != null && days <= 7) return '7D';
  if (days != null && days <= 45) return '1M';
  if (days != null && days <= 180) return '3M';
  if (days != null && days <= 365) return '1Y';
  return 'ALL';
}

export function buildPersonalTerminalRangeViewData(
  series: PersonalTerminalSeries,
  range: PersonalTerminalDisplayRange,
  now: Date,
  candleSource: PersonalTerminalTimeframe | null,
): PersonalTerminalViewData {
  const timeframe = effectiveViewTimeframe(range);
  const base = buildPersonalTerminalViewData(series, timeframe, now);
  const window = resolveDisplayRangeWindow(range, now, series);
  const inWindow = (timestamp: string) => {
    const value = new Date(timestamp).getTime();
    return value >= window.start && value <= window.end;
  };
  const observations = series.observations.filter((row) => inWindow(row.timestamp));
  const allowedIds = range.kind === 'last_n_observations'
    ? new Set(observations.slice(-range.count).map((row) => row.id))
    : null;
  const finalObservations = allowedIds ? observations.filter((row) => allowedIds.has(row.id)) : observations;
  const startAt = finalObservations[0]?.timestamp;
  const endAt = finalObservations[finalObservations.length - 1]?.timestamp;
  const withinFinal = (timestamp: string) => !startAt || !endAt || (timestamp >= startAt && timestamp <= endAt);
  const sourceCandles = candleSource ? series.precomputedCandles?.[candleSource] || [] : [];
  return {
    ...base,
    observations: finalObservations,
    line: base.line.filter((row) => withinFinal(row.time) && inWindow(row.time)),
    candles: sourceCandles.filter((row) => inWindow(row.time) || inWindow(row.endTime)),
    incompleteCandles: base.incompleteCandles.filter((row) => withinFinal(row.time) && inWindow(row.time)),
    load: base.load.filter((row) => withinFinal(row.time) && inWindow(row.time)),
    emaShort: base.emaShort.filter((row) => withinFinal(row.time) && inWindow(row.time)),
    emaLong: base.emaLong.filter((row) => withinFinal(row.time) && inWindow(row.time)),
  };
}

export function availableCandleSources(series: PersonalTerminalSeries) {
  const configured = series.chartCapabilities?.candleTimeframes;
  const candidates: PersonalTerminalTimeframe[] = configured || Object.keys(series.precomputedCandles || {}) as PersonalTerminalTimeframe[];
  return candidates
    .filter((key): key is PersonalTerminalTimeframe => Boolean(series.precomputedCandles?.[key]?.length));
}

const CANDLE_SOURCE_SPAN: Record<PersonalTerminalTimeframe, number> = {
  RECENT: 0,
  '4H': 4 / 24,
  '12H': 12 / 24,
  '24H': 1,
  '1D': 1,
  '7D': 7,
  '30D': 30,
  '1M': 30,
  '90D': 90,
  '3M': 90,
  '1Y': 365,
  ALL: Number.POSITIVE_INFINITY,
};

export function defaultCandleSource(series: PersonalTerminalSeries, range: PersonalTerminalDisplayRange) {
  const sources = availableCandleSources(series);
  if (!sources.length) return null;
  const preferred = effectiveViewTimeframe(range);
  if (sources.includes(preferred)) return preferred;
  const targetSpan = CANDLE_SOURCE_SPAN[preferred];
  return [...sources].sort((left, right) => {
    const leftDistance = Math.abs(CANDLE_SOURCE_SPAN[left] - targetSpan);
    const rightDistance = Math.abs(CANDLE_SOURCE_SPAN[right] - targetSpan);
    return leftDistance - rightDistance;
  })[0] || sources[0];
}

export function rangeDebugLabel(range: PersonalTerminalDisplayRange) {
  if (range.kind === 'preset') return range.preset;
  if (range.kind === 'last_n_days') return `${range.days}D`;
  if (range.kind === 'last_n_observations') return `${range.count}O`;
  return `${range.start}:${range.end}`;
}

export function rangeCalendarDefaults(now: Date, days = 7) {
  const start = new Date(now);
  start.setDate(start.getDate() - Math.max(0, days - 1));
  return { start: dateOnly(start), end: dateOnly(now) };
}

export function buildPersonalMarketWidgetPayload(
  catalog: PersonalTerminalCatalogItem[],
  preferences: PersonalTerminalPreferences,
  now: Date,
): PersonalMarketWidgetPayload {
  const byId = new Map(catalog.map((item) => [item.id, item]));
  const ids = unique([...preferences.pinnedIds, ...preferences.watchlistOrder]).slice(0, 6);
  return {
    generatedAt: now.toISOString(),
    primarySeriesId: preferences.defaultSeriesId,
    items: ids.flatMap((id) => {
      const item = byId.get(id);
      return item ? [{
        seriesId: item.seriesId,
        current: item.current,
        reference: item.reference,
        deviationAbsolute: item.deviationAbsolute,
        miniSeries: item.miniSeries.slice(-12),
      }] : [];
    }),
  };
}
