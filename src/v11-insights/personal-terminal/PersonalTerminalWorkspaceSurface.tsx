import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { Lang } from '../../i18n';
import { t } from '../../i18n';
import type { V11ThemeTokens } from '../../v11/tokens';
import PersonalTerminalChart, {
  type PersonalTerminalChartHandle,
  type PersonalTerminalChartSelection,
} from './PersonalTerminalChart';
import PersonalTerminalIcon from './PersonalTerminalIcon';
import PersonalTerminalRangeControl from './PersonalTerminalRangeControl';
import PersonalTerminalSheet from './PersonalTerminalSheet';
import PersonalTerminalWatchlist, { PersonalTerminalWatchlistStrip } from './PersonalTerminalWatchlist';
import type {
  PersonalTerminalChartKind,
  PersonalTerminalEvent,
  PersonalTerminalIndicator,
  PersonalTerminalModel,
  PersonalTerminalSeries,
  PersonalTerminalSignal,
} from './personalTerminalPresentation';
import { availableComparisonSeries } from './personalTerminalPresentation';
import type {
  PersonalTerminalCatalogGroup,
  PersonalTerminalDisplayRange,
  PersonalTerminalPane,
  PersonalTerminalPreferences,
  PersonalTerminalQuickRange,
  PersonalTerminalSavedWorkspace,
  PersonalTerminalWorkspaceLayout,
} from './personalTerminalWorkspace';
import {
  addWatchlistItem,
  availableCandleSources,
  availableQuickRanges,
  buildPersonalTerminalCatalog,
  buildPersonalTerminalRangeViewData,
  createDefaultPersonalTerminalPreferences,
  defaultCandleSource,
  normalizePersonalTerminalPreferences,
  personalTerminalPreferenceNamespace,
  readPersonalTerminalPreferences,
  removeWatchlistItem,
  reorderWatchlist,
  togglePinnedItem,
  writePersonalTerminalPreferences,
} from './personalTerminalWorkspace';
import './personal-terminal-workspace.css';

const WebView = View as any;
const WebPressable = Pressable as any;
const WebScrollView = ScrollView as any;
const WebTextInput = TextInput as any;

type WorkspaceSheet =
  | { kind: 'watchlist' }
  | { kind: 'add-instrument' }
  | { kind: 'range' }
  | { kind: 'view' }
  | { kind: 'indicators' }
  | { kind: 'compare' }
  | { kind: 'workspaces' }
  | { kind: 'analyst' }
  | { kind: 'evidence' }
  | { kind: 'signal'; signal: PersonalTerminalSignal }
  | { kind: 'event'; event: PersonalTerminalEvent }
  | { kind: 'observation'; selection: PersonalTerminalChartSelection }
  | null;

type InteractionMeasurement = {
  label: string;
  duration: number;
  p50: number;
  p95: number;
  frames: number;
  over20: number;
};

const LAYOUT_COUNT: Record<PersonalTerminalWorkspaceLayout, number> = {
  single: 1,
  two: 2,
  four: 4,
  six: 6,
};

const QUICK_RANGE_OPTIONS: PersonalTerminalQuickRange[] = [
  '1D', '2D', '3D', '5D', '7D', '14D', '1M', '3M', '6M', '1Y', 'ALL',
];

function query() {
  if (typeof window === 'undefined') return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

function copy(language: Lang, value: PersonalTerminalSeries['label']) {
  if (value.kind === 'text') return value.text;
  return Object.entries(value.values || {}).reduce(
    (result, [key, replacement]) => result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(replacement)),
    t(language, value.key),
  );
}

function number(value: number | null) {
  if (value == null) return '—';
  if (Math.abs(value) >= 1000) return `${Math.round(value / 100) / 10}k`;
  return new Intl.NumberFormat('en-AU', { maximumFractionDigits: 1 }).format(value);
}

function seriesReading(language: Lang, series: PersonalTerminalSeries, value: number | null) {
  if (value == null) return '—';
  if (series.semantic === 'timing') {
    const minutes = (Math.round(value + 12 * 60) + 24 * 60) % (24 * 60);
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  }
  if (series.constructKey === 'sleep.duration') {
    return new Intl.NumberFormat(language === 'zh' ? 'zh-CN' : 'en-AU', { maximumFractionDigits: 1 }).format(value / 60);
  }
  return new Intl.NumberFormat(language === 'zh' ? 'zh-CN' : 'en-AU', { maximumFractionDigits: 1 }).format(value);
}

function seriesUnit(language: Lang, series: PersonalTerminalSeries) {
  if (series.constructKey === 'sleep.duration') return t(language, 'personalTerminalV041Unit_hours');
  return copy(language, series.unit);
}

function dateLabel(language: Lang, value: string) {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

function referenceLabel(language: Lang, series: PersonalTerminalSeries) {
  if (series.baseline.referenceKind === 'historical') return t(language, 'personalMarketHistoricalReference');
  if (series.baseline.referenceKind === 'active') return t(language, 'personalMarketActiveReference');
  return t(language, 'personalMarketPersonalReference');
}

function maturityLabel(language: Lang, series: PersonalTerminalSeries) {
  if (series.adaptive) return t(language, `personalMarketMaturity_${series.adaptive.state}`);
  return t(language, `quantBaseline_${series.baseline.status === 'qa_only' ? 'established' : series.baseline.status}`);
}

function visibleRangeLabel(language: Lang, range: PersonalTerminalDisplayRange) {
  if (range.kind === 'preset') return range.preset;
  if (range.kind === 'last_n_days') return t(language, 'personalTerminalLastNDays').replace('{count}', String(range.days));
  if (range.kind === 'last_n_observations') return t(language, 'personalTerminalLastNObservations').replace('{count}', String(range.count));
  return `${range.start} — ${range.end}`;
}

function evidenceDays(series: PersonalTerminalSeries) {
  return series.coverage?.observedDays
    ?? new Set(series.observations.map((row) => row.timestamp.slice(0, 10))).size;
}

function relevantSignals(model: PersonalTerminalModel, series: PersonalTerminalSeries) {
  if (!series.constructKey) return [];
  return model.signals.filter((signal) => (
    signal.sourceConstruct === series.constructKey || signal.targetConstruct === series.constructKey
  ));
}

function paneFor(id: string, seriesId: string, range: PersonalTerminalDisplayRange): PersonalTerminalPane {
  return {
    id,
    seriesId,
    range,
    chartKind: 'line',
    candleSource: null,
    indicators: ['baseline', 'events'],
  };
}

function measureInteraction(debug: boolean, label: string, action: () => void) {
  if (typeof window === 'undefined') {
    action();
    return;
  }
  const startedAt = window.performance.now();
  action();
  if (!debug) return;
  const frames: number[] = [];
  let previous = performance.now();
  const sample = (time: number) => {
    frames.push(time - previous);
    previous = time;
    if (time - startedAt < 640) {
      window.requestAnimationFrame(sample);
      return;
    }
    const sorted = frames.slice().sort((left, right) => left - right);
    const percentile = (ratio: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))] || 0;
    const row: InteractionMeasurement = {
      label,
      duration: Math.round((time - startedAt) * 10) / 10,
      p50: Math.round(percentile(0.5) * 10) / 10,
      p95: Math.round(percentile(0.95) * 10) / 10,
      frames: sorted.length,
      over20: sorted.filter((value) => value > 20).length,
    };
    const current = ((window as any).__questlifeStage313Performance || []) as InteractionMeasurement[];
    (window as any).__questlifeStage313Performance = [...current, row].slice(-120);
    window.dispatchEvent(new CustomEvent('questlife-stage313-performance', { detail: row }));
  };
  window.requestAnimationFrame(sample);
}

function updateWorkspace(
  preferences: PersonalTerminalPreferences,
  workspaceId: string,
  update: (workspace: PersonalTerminalSavedWorkspace) => PersonalTerminalSavedWorkspace,
) {
  return {
    ...preferences,
    workspaces: preferences.workspaces.map((workspace) => workspace.id === workspaceId ? update(workspace) : workspace),
  };
}

function resizeWorkspace(
  workspace: PersonalTerminalSavedWorkspace,
  layout: PersonalTerminalWorkspaceLayout,
  fallbackIds: string[],
) {
  const target = LAYOUT_COUNT[layout];
  const baseRange = workspace.panes[0]?.range || { kind: 'preset' as const, preset: '1M' as const };
  const panes = Array.from({ length: target }, (_, index) => (
    workspace.panes[index]
      || paneFor(`${workspace.id}-pane-${index + 1}`, fallbackIds[index] || fallbackIds[0] || '', baseRange)
  ));
  return { ...workspace, layout, panes };
}

function workspaceName(language: Lang, workspace: PersonalTerminalSavedWorkspace) {
  return t(language, `personalTerminalWorkspace_${workspace.name}`);
}

function IndicatorToggle({
  checked,
  label,
  onPress,
  theme,
}: {
  checked: boolean;
  label: string;
  onPress: () => void;
  theme: V11ThemeTokens;
}) {
  return (
    <WebPressable accessibilityRole="checkbox" accessibilityState={{ checked }} dataSet={{ 'personal-terminal-selected': checked ? 'true' : 'false', 'personal-terminal-workspace-role': 'sheet-option' }} onPress={onPress}>
      <PersonalTerminalIcon color={checked ? theme.glow.primary : theme.text.metadata} name={checked ? 'check' : 'indicator'} size={16} />
      <Text style={{ color: checked ? theme.text.primary : theme.text.secondary }}>{label}</Text>
    </WebPressable>
  );
}

export default function PersonalTerminalWorkspaceSurface({
  language,
  model,
  onNextAction,
  onSheetStateChange,
  performanceReadout,
  reducedMotion,
  theme,
}: {
  language: Lang;
  model: PersonalTerminalModel;
  onNextAction: () => void;
  onSheetStateChange?: (open: boolean) => void;
  performanceReadout?: string | null;
  reducedMotion: boolean;
  theme: V11ThemeTokens;
}) {
  const catalog = useMemo(() => buildPersonalTerminalCatalog(model), [model]);
  const debugPerformance = query().get('debugQuantPerformance') === '1';
  const preferenceNamespace = personalTerminalPreferenceNamespace(model);
  const [preferences, setPreferences] = useState<PersonalTerminalPreferences>(() => readPersonalTerminalPreferences(catalog, preferenceNamespace));
  const [activePaneId, setActivePaneId] = useState(preferences.workspaces.find((workspace) => workspace.id === preferences.activeWorkspaceId)?.panes[0]?.id || '');
  const [comparisonSeriesId, setComparisonSeriesId] = useState<string | null>(null);
  const [analystPeekOpen, setAnalystPeekOpen] = useState(false);
  const [sheet, setSheet] = useState<WorkspaceSheet>(null);
  const [watchlistEditMode, setWatchlistEditMode] = useState(false);
  const [customDays, setCustomDays] = useState('9');
  const [customObservations, setCustomObservations] = useState('12');
  const [calendarStart, setCalendarStart] = useState(model.range.start?.slice(0, 10) || '');
  const [calendarEnd, setCalendarEnd] = useState(model.range.end?.slice(0, 10) || '');
  const [instrumentSearch, setInstrumentSearch] = useState('');
  const [interactionMeasurements, setInteractionMeasurements] = useState<InteractionMeasurement[]>([]);
  const chartRefs = useRef(new Map<string, PersonalTerminalChartHandle>());
  const synchronizingRef = useRef(false);
  const mainScrollRef = useRef<any>(null);
  const currentScrollOffsetRef = useRef(0);
  const savedScrollOffsetRef = useRef(0);
  const sheetWasOpenRef = useRef(false);
  const lastChartInteractionAtRef = useRef(0);

  useEffect(() => {
    setPreferences((current) => normalizePersonalTerminalPreferences(current, catalog));
  }, [catalog]);

  useEffect(() => writePersonalTerminalPreferences(preferences, preferenceNamespace), [preferenceNamespace, preferences]);
  useEffect(() => onSheetStateChange?.(sheet != null), [onSheetStateChange, sheet]);
  useEffect(() => setAnalystPeekOpen(false), [activePaneId]);
  useEffect(() => {
    const open = sheet != null;
    if (open && !sheetWasOpenRef.current) savedScrollOffsetRef.current = currentScrollOffsetRef.current;
    if (!open && sheetWasOpenRef.current && typeof window !== 'undefined') {
      window.requestAnimationFrame(() => mainScrollRef.current?.scrollTo?.({ y: savedScrollOffsetRef.current, animated: false }));
    }
    sheetWasOpenRef.current = open;
  }, [sheet]);
  useEffect(() => {
    if (!debugPerformance || typeof window === 'undefined') return undefined;
    const onMeasurement = (event: Event) => {
      const row = (event as CustomEvent<InteractionMeasurement>).detail;
      setInteractionMeasurements((current) => [...current, row].slice(-10));
    };
    window.addEventListener('questlife-stage313-performance', onMeasurement);
    return () => window.removeEventListener('questlife-stage313-performance', onMeasurement);
  }, [debugPerformance]);

  const activeWorkspace = preferences.workspaces.find((workspace) => workspace.id === preferences.activeWorkspaceId)
    || preferences.workspaces[0];
  const activePane = activeWorkspace?.panes.find((pane) => pane.id === activePaneId)
    || activeWorkspace?.panes[0];
  const activeSeries = model.series.find((series) => series.id === activePane?.seriesId)
    || model.series.find((series) => series.id === preferences.defaultSeriesId)
    || model.series[0];
  const activeEntity = model.entities.find((entity) => entity.id === activeSeries?.entityId) || model.entities[0];
  const now = useMemo(() => {
    if (!model.range.end) return new Date();
    const exact = new Date(model.range.end);
    if (Number.isFinite(exact.getTime())) return exact;
    return new Date(`${model.range.end.slice(0, 10)}T23:59:59.000`);
  }, [model.range.end]);
  const activeViewData = useMemo(() => activeSeries && activePane
    ? buildPersonalTerminalRangeViewData(activeSeries, activePane.range, now, activePane.candleSource)
    : null, [activePane, activeSeries, now]);
  const activeCurrent = activeViewData?.line[activeViewData.line.length - 1]?.value
    ?? activeViewData?.observations[activeViewData.observations.length - 1]?.value
    ?? null;
  const activeSignals = activeSeries ? relevantSignals(model, activeSeries) : [];
  const comparisonRows = useMemo(() => activeEntity && activeSeries
    ? availableComparisonSeries(model, activeEntity.id, activeSeries.id).filter((series) => !series.qaDerivedIndex && series.observations.length > 0)
    : [], [activeEntity, activeSeries, model]);
  const comparisonSeries = comparisonRows.find((series) => series.id === comparisonSeriesId) || null;

  const persist = useCallback((update: (current: PersonalTerminalPreferences) => PersonalTerminalPreferences) => {
    setPreferences((current) => normalizePersonalTerminalPreferences(update(current), catalog));
  }, [catalog]);

  const showSheet = useCallback((next: Exclude<WorkspaceSheet, null>, label: string) => {
    measureInteraction(debugPerformance, label, () => setSheet(next));
  }, [debugPerformance]);

  const hideSheet = useCallback(() => {
    measureInteraction(debugPerformance, 'sheet-close', () => setSheet(null));
  }, [debugPerformance]);

  const measureChartInteraction = useCallback(() => {
    if (!debugPerformance || typeof window === 'undefined') return;
    const current = window.performance.now();
    if (current - lastChartInteractionAtRef.current < 800) return;
    lastChartInteractionAtRef.current = current;
    measureInteraction(true, 'chart-pan-zoom', () => undefined);
  }, [debugPerformance]);

  const patchWorkspace = useCallback((update: (workspace: PersonalTerminalSavedWorkspace) => PersonalTerminalSavedWorkspace) => {
    if (!activeWorkspace) return;
    persist((current) => updateWorkspace(current, activeWorkspace.id, update));
  }, [activeWorkspace, persist]);

  const patchPane = useCallback((paneId: string, patch: Partial<PersonalTerminalPane>) => {
    patchWorkspace((workspace) => ({
      ...workspace,
      panes: workspace.panes.map((pane) => pane.id === paneId ? { ...pane, ...patch } : pane),
    }));
  }, [patchWorkspace]);

  const selectSeries = useCallback((seriesId: string, paneId = activePane?.id) => {
    if (!paneId) return;
    measureInteraction(debugPerformance, 'instrument-switch', () => {
      const series = model.series.find((row) => row.id === seriesId);
      patchPane(paneId, {
        seriesId,
        chartKind: 'line',
        candleSource: null,
        indicators: series?.availableIndicators?.filter((indicator) => indicator === 'baseline' || indicator === 'events') || ['baseline', 'events'],
      });
      persist((current) => ({
        ...current,
        defaultSeriesId: seriesId,
        watchlistOrder: addWatchlistItem(current.watchlistOrder, seriesId),
      }));
      setActivePaneId(paneId);
      setComparisonSeriesId(null);
      setSheet(null);
    });
  }, [activePane?.id, debugPerformance, model.series, patchPane, persist]);

  const selectWorkspace = useCallback((workspaceId: string) => {
    const target = preferences.workspaces.find((workspace) => workspace.id === workspaceId);
    if (!target) return;
    measureInteraction(debugPerformance, 'workspace-switch', () => {
      persist((current) => ({ ...current, activeWorkspaceId: workspaceId }));
      setActivePaneId(target.panes[0]?.id || '');
      setComparisonSeriesId(null);
      setSheet(null);
    });
  }, [debugPerformance, persist, preferences.workspaces]);

  const setLayout = useCallback((layout: PersonalTerminalWorkspaceLayout) => {
    if (!activeWorkspace) return;
    measureInteraction(debugPerformance, 'layout-switch', () => {
      const fallbackIds = preferences.watchlistOrder.length ? preferences.watchlistOrder : catalog.map((item) => item.id);
      const next = resizeWorkspace(activeWorkspace, layout, fallbackIds);
      patchWorkspace(() => next);
      setActivePaneId(next.panes[0]?.id || '');
    });
  }, [activeWorkspace, catalog, debugPerformance, patchWorkspace, preferences.watchlistOrder]);

  const setRange = useCallback((range: PersonalTerminalDisplayRange) => {
    if (!activePane || !activeSeries) return;
    measureInteraction(debugPerformance, 'range-switch', () => {
      const candleSource = activePane.chartKind === 'candle' ? defaultCandleSource(activeSeries, range) : activePane.candleSource;
      patchPane(activePane.id, { range, candleSource });
    });
  }, [activePane, activeSeries, debugPerformance, patchPane]);

  const setChartKind = useCallback((chartKind: PersonalTerminalChartKind) => {
    if (!activePane || !activeSeries) return;
    const candleSource = chartKind === 'candle' ? defaultCandleSource(activeSeries, activePane.range) : activePane.candleSource;
    if (chartKind === 'candle' && !candleSource) return;
    measureInteraction(debugPerformance, 'chart-type-switch', () => patchPane(activePane.id, { chartKind, candleSource }));
  }, [activePane, activeSeries, debugPerformance, patchPane]);

  const toggleIndicator = useCallback((indicator: PersonalTerminalIndicator) => {
    if (!activePane) return;
    const selected = activePane.indicators.includes(indicator);
    patchPane(activePane.id, { indicators: selected ? activePane.indicators.filter((item) => item !== indicator) : [...activePane.indicators, indicator] });
  }, [activePane, patchPane]);

  const syncCrosshair = useCallback((sourcePaneId: string, selection: PersonalTerminalChartSelection | null) => {
    if (!activeWorkspace?.syncCrosshair || synchronizingRef.current) return;
    synchronizingRef.current = true;
    chartRefs.current.forEach((ref, paneId) => { if (paneId !== sourcePaneId) ref.setCrosshair(selection); });
    window.requestAnimationFrame(() => { synchronizingRef.current = false; });
  }, [activeWorkspace?.syncCrosshair]);

  const syncVisibleRange = useCallback((sourcePaneId: string, range: { from: string; to: string } | null) => {
    if (!activeWorkspace?.syncTime || synchronizingRef.current) return;
    synchronizingRef.current = true;
    chartRefs.current.forEach((ref, paneId) => { if (paneId !== sourcePaneId) ref.setVisibleRange(range); });
    window.requestAnimationFrame(() => { synchronizingRef.current = false; });
  }, [activeWorkspace?.syncTime]);

  if (!catalog.length || !activeWorkspace || !activePane || !activeSeries || !activeViewData) {
    return (
      <WebScrollView contentContainerStyle={{ minHeight: '100%', paddingBottom: 116 }} dataSet={{ 'personal-terminal-workspace-role': 'scroll' }} showsVerticalScrollIndicator={false}>
        <WebView dataSet={{ 'personal-terminal-workspace-role': 'empty-terminal' }}>
          <PersonalTerminalIcon color={theme.text.secondary} name="market" size={26} />
          <Text style={{ color: theme.text.primary }}>{t(language, 'personalTerminalV041NoDataTitle')}</Text>
          <Text style={{ color: theme.text.secondary }}>{t(language, 'personalTerminalV041NoDataBody')}</Text>
          <WebPressable accessibilityRole="button" onPress={onNextAction}>
            <Text style={{ color: theme.text.primary }}>{copy(language, model.nextAction || model.implication)}</Text>
          </WebPressable>
        </WebView>
      </WebScrollView>
    );
  }

  const hiddenCatalog = catalog.filter((item) => !preferences.watchlistOrder.includes(item.id));
  const normalizedInstrumentSearch = instrumentSearch.trim().toLocaleLowerCase(language === 'zh' ? 'zh-CN' : 'en-AU');
  const filteredHiddenCatalog = normalizedInstrumentSearch
    ? hiddenCatalog.filter((item) => `${copy(language, item.label)} ${item.domain}`.toLocaleLowerCase(language === 'zh' ? 'zh-CN' : 'en-AU').includes(normalizedInstrumentSearch))
    : hiddenCatalog;
  const availableRanges = availableQuickRanges(activeSeries);
  const candleAvailable = availableCandleSources(activeSeries).length > 0;
  const barAvailable = activeSeries.chartCapabilities?.bar !== false && activeViewData.line.length > 0;
  const expectedDays = activeSeries.coverage?.expectedDays ?? null;
  const observedDays = evidenceDays(activeSeries);
  const coverageRatio = activeSeries.coverage?.coverageRatio ?? null;
  const coverageSegments = coverageRatio == null ? 0 : Math.max(0, Math.min(10, Math.round(coverageRatio * 10)));
  const currentDifference = activeCurrent != null && activeSeries.baseline.value != null
    ? activeCurrent - activeSeries.baseline.value
    : null;
  const analystObservation = activeSeries.adaptive?.state === 'first_observation'
    ? t(language, 'personalTerminalAdaptiveFirstObservationBody')
    : activeSeries.recentChange
      ? t(language, 'personalTerminalAnalystCurrentReference')
        .replace('{current}', seriesReading(language, activeSeries, activeCurrent))
        .replace('{reference}', seriesReading(language, activeSeries, activeSeries.baseline.value))
        .replace('{change}', number(currentDifference))
      : t(language, 'personalTerminalNoTrendYet');
  const analystInterpretation = activeSignals[0]
    ? copy(language, activeSignals[0].title)
    : t(language, 'personalTerminalV041NoEligibleRelationship');

  const sheetHeader = (() => {
    if (!sheet) return { eyebrow: '', title: '' };
    if (sheet.kind === 'watchlist') return { eyebrow: t(language, 'personalTerminalPersonalMarket'), title: t(language, 'personalTerminalWatchlist') };
    if (sheet.kind === 'add-instrument') return { eyebrow: t(language, 'personalTerminalWatchlist'), title: t(language, 'personalTerminalAddInstrument') };
    if (sheet.kind === 'range') return { eyebrow: t(language, 'personalTerminalRangeTool'), title: t(language, 'personalTerminalCustomRange') };
    if (sheet.kind === 'view') return { eyebrow: copy(language, activeSeries.label), title: t(language, 'personalTerminalChartView') };
    if (sheet.kind === 'indicators') return { eyebrow: copy(language, activeSeries.label), title: t(language, 'personalTerminalIndicators') };
    if (sheet.kind === 'compare') return { eyebrow: copy(language, activeSeries.label), title: t(language, 'personalTerminalCompareWith') };
    if (sheet.kind === 'workspaces') return { eyebrow: t(language, 'personalTerminalResearchWorkspace'), title: t(language, 'personalTerminalWorkspaces') };
    if (sheet.kind === 'analyst') return { eyebrow: copy(language, activeSeries.label), title: t(language, 'personalTerminalAnalyst') };
    if (sheet.kind === 'evidence') return { eyebrow: copy(language, activeSeries.label), title: t(language, 'quantEvidence') };
    if (sheet.kind === 'signal') return { eyebrow: t(language, 'personalTerminalKeySignal'), title: copy(language, sheet.signal.title) };
    if (sheet.kind === 'event') return { eyebrow: t(language, 'personalTerminalEventTool'), title: copy(language, sheet.event.title) };
    return { eyebrow: t(language, 'personalTerminalCurrentObservation'), title: dateLabel(language, sheet.selection.time) };
  })();

  return (
    <>
      <WebScrollView
        contentContainerStyle={{ paddingBottom: 116 }}
        dataSet={{ 'personal-terminal-workspace-role': 'scroll' }}
        onScroll={(event: any) => {
          if (sheet == null) currentScrollOffsetRef.current = event.nativeEvent?.contentOffset?.y || 0;
        }}
        ref={mainScrollRef}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <WebView dataSet={{ 'personal-terminal-ia': '3.13-workspace', 'personal-terminal-workspace-layout': activeWorkspace.layout, 'personal-terminal-workspace-role': 'terminal' }}>
          <WebView dataSet={{ 'personal-terminal-workspace-role': 'topbar' }}>
            <WebView dataSet={{ 'personal-terminal-workspace-role': 'brand' }}>
              <PersonalTerminalIcon color={theme.text.primary} name="market" size={17} />
              <WebView>
                <Text style={{ color: theme.text.primary }}>{t(language, 'personalTerminalPersonalMarket')}</Text>
                <Text numberOfLines={1} style={{ color: theme.text.metadata }}>{copy(language, activeSeries.label)} · {visibleRangeLabel(language, activePane.range)}</Text>
              </WebView>
            </WebView>
            <WebView dataSet={{ 'personal-terminal-workspace-role': 'topbar-actions' }}>
              <WebPressable accessibilityLabel={t(language, 'personalTerminalWatchlist')} accessibilityRole="button" dataSet={{ 'personal-terminal-workspace-action': 'watchlist' }} onPress={() => showSheet({ kind: 'watchlist' }, 'watchlist-open')}>
                <PersonalTerminalIcon color={theme.text.primary} name="watchlist" size={16} />
              </WebPressable>
              <WebPressable accessibilityLabel={t(language, 'personalTerminalWorkspaces')} accessibilityRole="button" onPress={() => showSheet({ kind: 'workspaces' }, 'workspace-open')}>
                <PersonalTerminalIcon color={theme.text.primary} name="layout" size={16} />
                <Text style={{ color: theme.text.secondary }}>{workspaceName(language, activeWorkspace)}</Text>
              </WebPressable>
            </WebView>
          </WebView>

          <PersonalTerminalWatchlistStrip
            activeSeriesId={activeSeries.id}
            catalog={catalog}
            language={language}
            onOpen={() => showSheet({ kind: 'watchlist' }, 'watchlist-open')}
            onSelect={selectSeries}
            order={preferences.watchlistOrder}
            pinnedIds={preferences.pinnedIds}
            theme={theme}
          />

          <WebView dataSet={{ 'personal-terminal-workspace-role': 'layout' }}>
            <WebView dataSet={{ 'personal-terminal-workspace-role': 'desktop-watchlist' }}>
              <PersonalTerminalWatchlist
                activeSeriesId={activeSeries.id}
                catalog={catalog}
                editMode={watchlistEditMode}
                language={language}
                onAdd={() => { setInstrumentSearch(''); setSheet({ kind: 'add-instrument' }); }}
                onMove={(sourceId, targetId) => measureInteraction(debugPerformance, 'watchlist-reorder', () => persist((current) => ({ ...current, watchlistOrder: reorderWatchlist(current.watchlistOrder, sourceId, targetId) })))}
                onRemove={(id) => persist((current) => ({ ...current, watchlistOrder: removeWatchlistItem(current.watchlistOrder, id), pinnedIds: removeWatchlistItem(current.pinnedIds, id) }))}
                onSelect={selectSeries}
                onToggleEdit={setWatchlistEditMode}
                onTogglePin={(id) => persist((current) => ({ ...current, pinnedIds: togglePinnedItem(current.pinnedIds, id) }))}
                order={preferences.watchlistOrder}
                pinnedIds={preferences.pinnedIds}
                theme={theme}
              />
            </WebView>

            <WebView dataSet={{ 'personal-terminal-workspace-role': 'analysis' }}>
              <WebView dataSet={{ 'personal-terminal-workspace-role': 'instrument-summary' }}>
                <WebView>
                  <Text style={{ color: theme.text.metadata }}>{t(language, `personalTerminalResolution_${activeEntity?.scope || 'market'}`)}</Text>
                  <Text numberOfLines={1} style={{ color: theme.text.primary }}>{copy(language, activeSeries.label)}</Text>
                  <Text numberOfLines={1} style={{ color: theme.text.metadata }}>{activeEntity ? copy(language, activeEntity.label) : t(language, 'personalTerminalPersonalMarket')}</Text>
                </WebView>
                <WebView dataSet={{ 'personal-terminal-workspace-role': 'primary-reading' }}>
                  <Text style={{ color: theme.text.primary }}>{seriesReading(language, activeSeries, activeCurrent)}</Text>
                  <Text style={{ color: theme.text.secondary }}>{seriesUnit(language, activeSeries)}</Text>
                </WebView>
                <WebView dataSet={{ 'personal-terminal-workspace-role': 'baseline-summary' }}>
                  <Text style={{ color: theme.text.metadata }}>{referenceLabel(language, activeSeries)}</Text>
                  <Text style={{ color: theme.text.primary }}>{seriesReading(language, activeSeries, activeSeries.baseline.value)}</Text>
                  <Text style={{ color: theme.text.secondary }}>{currentDifference == null ? maturityLabel(language, activeSeries) : `${currentDifference > 0 ? '+' : ''}${number(currentDifference)}`}</Text>
                </WebView>
              </WebView>

              <WebView dataSet={{ 'personal-terminal-workspace-role': 'chart-commandbar' }}>
                <PersonalTerminalRangeControl
                  available={availableRanges}
                  language={language}
                  onChange={setRange}
                  onOpenCustom={() => showSheet({ kind: 'range' }, 'custom-range-open')}
                  quickRanges={preferences.quickRanges}
                  range={activePane.range}
                  theme={theme}
                />
                <WebView dataSet={{ 'personal-terminal-workspace-role': 'chart-actions' }}>
                  <WebPressable accessibilityLabel={t(language, 'personalTerminalChartView')} accessibilityRole="button" onPress={() => showSheet({ kind: 'view' }, 'view-menu-open')}><PersonalTerminalIcon color={theme.text.secondary} name={activePane.chartKind === 'bar' ? 'bar' : activePane.chartKind === 'candle' ? 'candle' : 'chart'} size={15} /></WebPressable>
                  <WebPressable accessibilityLabel={t(language, 'personalTerminalIndicators')} accessibilityRole="button" onPress={() => showSheet({ kind: 'indicators' }, 'indicators-open')}><PersonalTerminalIcon color={theme.text.secondary} name="indicator" size={15} /></WebPressable>
                  {comparisonRows.length ? <WebPressable accessibilityLabel={t(language, 'personalTerminalCompare')} accessibilityRole="button" accessibilityState={{ selected: Boolean(comparisonSeries) }} dataSet={{ 'personal-terminal-selected': comparisonSeries ? 'true' : 'false' }} onPress={() => showSheet({ kind: 'compare' }, 'compare-open')}><PersonalTerminalIcon color={theme.text.secondary} name="compare" size={15} /></WebPressable> : null}
                  <WebPressable accessibilityLabel={t(language, 'personalTerminalResetChart')} accessibilityRole="button" onPress={() => measureInteraction(debugPerformance, 'chart-reset', () => chartRefs.current.get(activePane.id)?.reset())}><PersonalTerminalIcon color={theme.text.secondary} name="reset" size={15} /></WebPressable>
                </WebView>
              </WebView>

              {activePane.chartKind === 'candle' && availableCandleSources(activeSeries).length > 1 ? (
                <WebView dataSet={{ 'personal-terminal-workspace-role': 'candle-intervals' }}>
                  <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalCandleInterval')}</Text>
                  {availableCandleSources(activeSeries).map((source) => (
                    <WebPressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: activePane.candleSource === source }}
                      dataSet={{ 'personal-terminal-selected': activePane.candleSource === source ? 'true' : 'false' }}
                      key={source}
                      onPress={() => patchPane(activePane.id, { candleSource: source })}
                    >
                      <Text style={{ color: activePane.candleSource === source ? theme.text.primary : theme.text.metadata }}>
                        {source === 'RECENT' ? t(language, 'personalTerminalRecentRangeShort') : source}
                      </Text>
                    </WebPressable>
                  ))}
                </WebView>
              ) : null}

              <WebView dataSet={{ 'personal-terminal-pane-count': activeWorkspace.panes.length, 'personal-terminal-workspace-role': 'chart-grid' }}>
                {activeWorkspace.panes.map((pane) => {
                  const paneSeries = model.series.find((series) => series.id === pane.seriesId) || activeSeries;
                  const paneEntity = model.entities.find((entity) => entity.id === paneSeries.entityId);
                  const paneView = buildPersonalTerminalRangeViewData(paneSeries, pane.range, now, pane.candleSource);
                  const paneComparison = pane.id === activePane.id ? comparisonSeries : null;
                  const paneComparisonView = paneComparison ? buildPersonalTerminalRangeViewData(paneComparison, pane.range, now, null) : null;
                  const compact = activeWorkspace.panes.length > 1;
                  return (
                    <WebPressable
                      accessibilityLabel={copy(language, paneSeries.label)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: pane.id === activePane.id }}
                      dataSet={{ 'personal-terminal-active-pane': pane.id === activePane.id ? 'true' : 'false', 'personal-terminal-workspace-role': 'chart-pane' }}
                      key={pane.id}
                      onPress={() => setActivePaneId(pane.id)}
                    >
                      {compact ? (
                        <WebView dataSet={{ 'personal-terminal-workspace-role': 'pane-heading' }}>
                          <WebView>
                            <Text numberOfLines={1} style={{ color: theme.text.primary }}>{copy(language, paneSeries.label)}</Text>
                            <Text numberOfLines={1} style={{ color: theme.text.metadata }}>{t(language, `personalTerminalResolution_${paneEntity?.scope || 'market'}`)}</Text>
                          </WebView>
                          <Text style={{ color: theme.text.secondary }}>{seriesReading(language, paneSeries, paneView.line[paneView.line.length - 1]?.value ?? null)}</Text>
                        </WebView>
                      ) : null}
                      <PersonalTerminalChart
                        chartKind={pane.chartKind}
                        comparisonSeries={paneComparison}
                        comparisonViewData={paneComparisonView}
                        indicators={new Set(pane.indicators)}
                        language={language}
                        onCrosshair={(selection) => syncCrosshair(pane.id, selection)}
                        onInteraction={measureChartInteraction}
                        onSelectEvent={(event) => setSheet({ kind: 'event', event })}
                        onSelectSelection={(selection) => setSheet({ kind: 'observation', selection })}
                        onVisibleRangeChange={(range) => syncVisibleRange(pane.id, range)}
                        questlifeStartedAt={model.questlifeStartedAt}
                        rangeSelection={{ start: null, end: null }}
                        reducedMotion={reducedMotion}
                        ref={(ref) => { if (ref) chartRefs.current.set(pane.id, ref); else chartRefs.current.delete(pane.id); }}
                        series={paneSeries}
                        theme={theme}
                        timeframe={paneView.timeframe}
                        viewData={paneView}
                      />
                    </WebPressable>
                  );
                })}
              </WebView>

              <WebView dataSet={{ 'personal-terminal-workspace-role': 'status-strip' }}>
                <WebPressable accessibilityRole="button" onPress={() => showSheet({ kind: 'evidence' }, 'evidence-open')}>
                  <Text style={{ color: theme.text.metadata }}>{t(language, 'quantEvidence')}</Text>
                  <Text style={{ color: theme.text.primary }}>{activeViewData.observations.length} {t(language, 'personalTerminalObservationShort')}</Text>
                  <Text style={{ color: theme.text.secondary }}>{observedDays} {t(language, 'personalTerminalDayCountShort')}</Text>
                </WebPressable>
                <WebPressable accessibilityRole="button" disabled={!activeSignals[0]} onPress={() => activeSignals[0] && setSheet({ kind: 'signal', signal: activeSignals[0] })}>
                  <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalKeySignal')}</Text>
                  <Text numberOfLines={2} style={{ color: theme.text.primary }}>{activeSignals[0] ? copy(language, activeSignals[0].title) : t(language, 'personalTerminalV041NoEligibleRelationship')}</Text>
                </WebPressable>
                <WebPressable accessibilityRole="button" accessibilityState={{ expanded: analystPeekOpen }} onPress={() => measureInteraction(debugPerformance, 'analyst-peek-toggle', () => setAnalystPeekOpen((current) => !current))}>
                  <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalAnalyst')}</Text>
                  <Text numberOfLines={2} style={{ color: theme.text.primary }}>{analystObservation}</Text>
                </WebPressable>
              </WebView>

              {analystPeekOpen ? (
                <WebView dataSet={{ 'personal-terminal-workspace-role': 'analyst-peek' }}>
                  <WebView>
                    <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalAnalystObserved')}</Text>
                    <Text numberOfLines={2} style={{ color: theme.text.primary }}>{analystObservation}</Text>
                  </WebView>
                  <WebView>
                    <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalAnalystInterpretation')}</Text>
                    <Text numberOfLines={2} style={{ color: theme.text.secondary }}>{analystInterpretation}</Text>
                  </WebView>
                  <WebPressable accessibilityRole="button" onPress={() => showSheet({ kind: 'analyst' }, 'analyst-open')}>
                    <Text style={{ color: theme.text.primary }}>{t(language, 'personalTerminalOpenAnalyst')}</Text>
                    <PersonalTerminalIcon color={theme.text.primary} name="open" size={14} />
                  </WebPressable>
                </WebView>
              ) : null}
            </WebView>

            <WebView dataSet={{ 'personal-terminal-workspace-role': 'desktop-inspector' }}>
              <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalAnalyst')}</Text>
              <Text style={{ color: theme.text.primary }}>{analystObservation}</Text>
              <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalAnalystInterpretation')}</Text>
              <Text style={{ color: theme.text.secondary }}>{analystInterpretation}</Text>
              <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalAnalystLimitations')}</Text>
              <Text style={{ color: theme.text.secondary }}>{copy(language, activeSeries.limitation)}</Text>
              <WebPressable accessibilityRole="button" onPress={() => setSheet({ kind: 'analyst' })}>
                <Text style={{ color: theme.text.primary }}>{t(language, 'personalTerminalOpenAnalyst')}</Text>
                <PersonalTerminalIcon color={theme.text.primary} name="open" size={14} />
              </WebPressable>
            </WebView>
          </WebView>

          {performanceReadout ? <Text style={{ color: theme.text.metadata }}>{performanceReadout}</Text> : null}
          {debugPerformance && interactionMeasurements.length ? (
            <WebView dataSet={{ 'personal-terminal-workspace-role': 'interaction-performance' }}>
              {interactionMeasurements.map((row, index) => (
                <Text key={`${row.label}-${index}`} style={{ color: theme.text.metadata }}>
                  {row.label} · P50 {row.p50}ms · P95 {row.p95}ms · &gt;20ms {row.over20}/{row.frames}
                </Text>
              ))}
            </WebView>
          ) : null}
        </WebView>
      </WebScrollView>

      <PersonalTerminalSheet
        eyebrow={sheetHeader.eyebrow}
        language={language}
        onClose={hideSheet}
        open={sheet != null}
        reducedMotion={reducedMotion}
        theme={theme}
        title={sheetHeader.title}
      >
        {sheet?.kind === 'watchlist' ? (
          <PersonalTerminalWatchlist
            activeSeriesId={activeSeries.id}
            catalog={catalog}
            editMode={watchlistEditMode}
            language={language}
            onAdd={() => { setInstrumentSearch(''); setSheet({ kind: 'add-instrument' }); }}
            onMove={(sourceId, targetId) => measureInteraction(debugPerformance, 'watchlist-reorder', () => persist((current) => ({ ...current, watchlistOrder: reorderWatchlist(current.watchlistOrder, sourceId, targetId) })))}
            onRemove={(id) => persist((current) => ({ ...current, watchlistOrder: removeWatchlistItem(current.watchlistOrder, id), pinnedIds: removeWatchlistItem(current.pinnedIds, id) }))}
            onSelect={selectSeries}
            onToggleEdit={setWatchlistEditMode}
            onTogglePin={(id) => persist((current) => ({ ...current, pinnedIds: togglePinnedItem(current.pinnedIds, id) }))}
            order={preferences.watchlistOrder}
            pinnedIds={preferences.pinnedIds}
            theme={theme}
          />
        ) : null}

        {sheet?.kind === 'add-instrument' ? (
          <WebView dataSet={{ 'personal-terminal-workspace-role': 'instrument-gallery' }}>
            <WebTextInput
              accessibilityLabel={t(language, 'personalTerminalSearchInstruments')}
              onChangeText={setInstrumentSearch}
              placeholder={t(language, 'personalTerminalSearchInstruments')}
              placeholderTextColor={theme.text.metadata}
              style={{ color: theme.text.primary }}
              value={instrumentSearch}
            />
            {(['passive', 'state', 'goal', 'skill', 'other'] as PersonalTerminalCatalogGroup[]).map((group) => {
              const rows = filteredHiddenCatalog.filter((item) => item.group === group);
              if (!rows.length) return null;
              return (
                <WebView key={group}>
                  <Text style={{ color: theme.text.metadata }}>{t(language, `personalTerminalWatchlistGroup_${group}`)}</Text>
                  {rows.map((item) => (
                    <WebPressable accessibilityRole="button" dataSet={{ 'personal-terminal-workspace-role': 'sheet-option' }} key={item.id} onPress={() => {
                      persist((current) => ({ ...current, watchlistOrder: addWatchlistItem(current.watchlistOrder, item.id) }));
                      selectSeries(item.id);
                    }}>
                      <PersonalTerminalIcon color={theme.text.secondary} name={item.scope === 'goal' ? 'goal' : item.scope === 'skill' ? 'skill' : 'chart'} size={16} />
                      <WebView><Text style={{ color: theme.text.primary }}>{copy(language, item.label)}</Text><Text style={{ color: theme.text.metadata }}>{item.observationCount} {t(language, 'personalMarketObservationsShort')}</Text></WebView>
                      <PersonalTerminalIcon color={theme.text.primary} name="add" size={15} />
                    </WebPressable>
                  ))}
                </WebView>
              );
            })}
            {!hiddenCatalog.length ? <Text style={{ color: theme.text.secondary }}>{t(language, 'personalTerminalAllInstrumentsAdded')}</Text> : null}
            {hiddenCatalog.length && !filteredHiddenCatalog.length ? <Text style={{ color: theme.text.secondary }}>{t(language, 'personalTerminalNoInstrumentMatches')}</Text> : null}
          </WebView>
        ) : null}

        {sheet?.kind === 'range' ? (
          <WebView dataSet={{ 'personal-terminal-workspace-role': 'range-sheet' }}>
            <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalLastDays')}</Text>
            <WebView dataSet={{ 'personal-terminal-workspace-role': 'input-row' }}>
              <WebTextInput accessibilityLabel={t(language, 'personalTerminalNumberOfDays')} inputMode="numeric" onChangeText={setCustomDays} style={{ color: theme.text.primary }} value={customDays} />
              <WebPressable accessibilityRole="button" onPress={() => { const days = Math.max(1, Math.min(3650, Number.parseInt(customDays, 10) || 1)); setRange({ kind: 'last_n_days', days }); setSheet(null); }}><Text style={{ color: theme.text.primary }}>{t(language, 'personalTerminalApplyRange')}</Text></WebPressable>
            </WebView>
            <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalCalendarRange')}</Text>
            <WebView dataSet={{ 'personal-terminal-workspace-role': 'date-inputs' }}>
              <WebTextInput accessibilityLabel={t(language, 'personalTerminalRangeStart')} onChangeText={setCalendarStart} placeholder="YYYY-MM-DD" placeholderTextColor={theme.text.metadata} style={{ color: theme.text.primary }} value={calendarStart} />
              <WebTextInput accessibilityLabel={t(language, 'personalTerminalRangeEnd')} onChangeText={setCalendarEnd} placeholder="YYYY-MM-DD" placeholderTextColor={theme.text.metadata} style={{ color: theme.text.primary }} value={calendarEnd} />
            </WebView>
            <WebPressable accessibilityRole="button" disabled={!calendarStart || !calendarEnd || calendarStart > calendarEnd} onPress={() => { setRange({ kind: 'calendar_range', start: calendarStart, end: calendarEnd }); setSheet(null); }}><Text style={{ color: theme.text.primary }}>{t(language, 'personalTerminalUseCalendarRange')}</Text></WebPressable>
            {activeSeries.observations.length > 1 ? (
              <>
                <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalObservationRange')}</Text>
                <WebView dataSet={{ 'personal-terminal-workspace-role': 'input-row' }}>
                  <WebTextInput accessibilityLabel={t(language, 'personalTerminalNumberOfObservations')} inputMode="numeric" onChangeText={setCustomObservations} style={{ color: theme.text.primary }} value={customObservations} />
                  <WebPressable accessibilityRole="button" onPress={() => { const count = Math.max(1, Math.min(1000, Number.parseInt(customObservations, 10) || 1)); setRange({ kind: 'last_n_observations', count }); setSheet(null); }}><Text style={{ color: theme.text.primary }}>{t(language, 'personalTerminalApplyRange')}</Text></WebPressable>
                </WebView>
              </>
            ) : null}
            <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalEditQuickRanges')}</Text>
            <WebView dataSet={{ 'personal-terminal-workspace-role': 'quick-range-editor' }}>
              {QUICK_RANGE_OPTIONS.map((item) => <IndicatorToggle checked={preferences.quickRanges.includes(item)} key={item} label={item} onPress={() => persist((current) => ({ ...current, quickRanges: current.quickRanges.includes(item) ? current.quickRanges.filter((range) => range !== item) : [...current.quickRanges, item].slice(-7) }))} theme={theme} />)}
            </WebView>
            <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalRangeDoesNotRecalculateCandles')}</Text>
          </WebView>
        ) : null}

        {sheet?.kind === 'view' ? (
          <WebView dataSet={{ 'personal-terminal-workspace-role': 'sheet-options' }}>
            <IndicatorToggle checked={activePane.chartKind === 'line'} label={t(language, 'personalTerminalLine')} onPress={() => { setChartKind('line'); setSheet(null); }} theme={theme} />
            {barAvailable ? <IndicatorToggle checked={activePane.chartKind === 'bar'} label={t(language, 'personalTerminalBar')} onPress={() => { setChartKind('bar'); setSheet(null); }} theme={theme} /> : null}
            {candleAvailable ? <IndicatorToggle checked={activePane.chartKind === 'candle'} label={t(language, 'personalTerminalCandle')} onPress={() => { setChartKind('candle'); setSheet(null); }} theme={theme} /> : null}
            <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalChartViewCapability')}</Text>
          </WebView>
        ) : null}

        {sheet?.kind === 'indicators' ? (
          <WebView dataSet={{ 'personal-terminal-workspace-role': 'sheet-options' }}>
            {(activeSeries.availableIndicators || ['baseline', 'events']).map((indicator) => <IndicatorToggle checked={activePane.indicators.includes(indicator)} key={indicator} label={t(language, `personalTerminalIndicator_${indicator}`)} onPress={() => toggleIndicator(indicator)} theme={theme} />)}
          </WebView>
        ) : null}

        {sheet?.kind === 'compare' ? (
          <WebView dataSet={{ 'personal-terminal-workspace-role': 'sheet-options' }}>
            <IndicatorToggle checked={comparisonSeries == null} label={t(language, 'personalTerminalNoComparison')} onPress={() => { setComparisonSeriesId(null); setSheet(null); }} theme={theme} />
            {comparisonRows.map((series) => <IndicatorToggle checked={comparisonSeries?.id === series.id} key={series.id} label={`${copy(language, series.label)} · ${seriesUnit(language, series)}`} onPress={() => { setComparisonSeriesId(series.id); setSheet(null); }} theme={theme} />)}
            <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalIndependentScale')}</Text>
          </WebView>
        ) : null}

        {sheet?.kind === 'workspaces' ? (
          <WebView dataSet={{ 'personal-terminal-workspace-role': 'workspace-sheet' }}>
            <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalWorkspaceLayout')}</Text>
            <WebView dataSet={{ 'personal-terminal-workspace-role': 'layout-options' }}>
              {(['single', 'two', 'four', 'six'] as PersonalTerminalWorkspaceLayout[]).map((layout) => <WebPressable accessibilityRole="button" accessibilityState={{ selected: activeWorkspace.layout === layout }} dataSet={{ 'personal-terminal-selected': activeWorkspace.layout === layout ? 'true' : 'false' }} key={layout} onPress={() => setLayout(layout)}><Text style={{ color: activeWorkspace.layout === layout ? theme.text.primary : theme.text.metadata }}>{t(language, `personalTerminalLayout_${layout}`)}</Text></WebPressable>)}
            </WebView>
            <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalSavedWorkspaces')}</Text>
            {preferences.workspaces.map((workspace) => (
              <WebPressable accessibilityRole="button" accessibilityState={{ selected: activeWorkspace.id === workspace.id }} dataSet={{ 'personal-terminal-selected': activeWorkspace.id === workspace.id ? 'true' : 'false', 'personal-terminal-workspace-role': 'sheet-option' }} key={workspace.id} onPress={() => selectWorkspace(workspace.id)}>
                <PersonalTerminalIcon color={theme.text.secondary} name="layout" size={16} />
                <WebView><Text style={{ color: theme.text.primary }}>{workspaceName(language, workspace)}</Text><Text style={{ color: theme.text.metadata }}>{t(language, `personalTerminalLayout_${workspace.layout}`)} · {workspace.panes.length}</Text></WebView>
              </WebPressable>
            ))}
            <WebPressable accessibilityRole="button" dataSet={{ 'personal-terminal-workspace-role': 'sheet-option' }} onPress={() => {
              const stamp = Date.now();
              const clone: PersonalTerminalSavedWorkspace = { ...activeWorkspace, id: `custom-${stamp}`, name: 'custom', panes: activeWorkspace.panes.map((pane, index) => ({ ...pane, id: `custom-${stamp}-pane-${index + 1}` })) };
              persist((current) => ({ ...current, activeWorkspaceId: clone.id, workspaces: [...current.workspaces, clone].slice(-8) }));
              setActivePaneId(clone.panes[0]?.id || '');
              setSheet(null);
            }}><PersonalTerminalIcon color={theme.text.primary} name="add" size={16} /><Text style={{ color: theme.text.primary }}>{t(language, 'personalTerminalSaveWorkspaceCopy')}</Text></WebPressable>
            <WebView dataSet={{ 'personal-terminal-workspace-role': 'sync-options' }}>
              <IndicatorToggle checked={activeWorkspace.syncTime} label={t(language, 'personalTerminalSyncTime')} onPress={() => patchWorkspace((workspace) => ({ ...workspace, syncTime: !workspace.syncTime }))} theme={theme} />
              <IndicatorToggle checked={activeWorkspace.syncCrosshair} label={t(language, 'personalTerminalSyncCrosshair')} onPress={() => patchWorkspace((workspace) => ({ ...workspace, syncCrosshair: !workspace.syncCrosshair }))} theme={theme} />
            </WebView>
          </WebView>
        ) : null}

        {sheet?.kind === 'analyst' ? (
          <WebView dataSet={{ 'personal-terminal-workspace-role': 'analyst-sheet' }}>
            <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalAnalystObserved')}</Text><Text style={{ color: theme.text.primary }}>{analystObservation}</Text></WebView>
            <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'quantEvidence')}</Text><Text style={{ color: theme.text.primary }}>{activeViewData.observations.length} {t(language, 'personalMarketObservationsShort')} · {observedDays} {t(language, 'personalMarketIndependentDays')}</Text></WebView>
            <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalAnalystInterpretation')}</Text><Text style={{ color: theme.text.primary }}>{analystInterpretation}</Text></WebView>
            <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalAnalystLimitations')}</Text><Text style={{ color: theme.text.secondary }}>{copy(language, activeSeries.limitation)}</Text></WebView>
            <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalAnalystNoNewAi')}</Text>
          </WebView>
        ) : null}

        {sheet?.kind === 'evidence' ? (
          <WebView dataSet={{ 'personal-terminal-workspace-role': 'evidence-sheet' }}>
            <WebView dataSet={{ 'personal-terminal-workspace-role': 'evidence-summary' }}>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalObservations')}</Text><Text style={{ color: theme.text.primary }}>{activeViewData.observations.length}</Text></WebView>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'quantActiveDays')}</Text><Text style={{ color: theme.text.primary }}>{observedDays}</Text></WebView>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalMarketCoverage')}</Text><Text style={{ color: theme.text.primary }}>{expectedDays == null ? '—' : `${observedDays} / ${expectedDays}`}</Text></WebView>
            </WebView>
            <WebView dataSet={{ 'personal-terminal-workspace-role': 'evidence-meter' }}>{Array.from({ length: 10 }, (_, index) => <WebView dataSet={{ filled: index < coverageSegments ? 'true' : 'false' }} key={index} />)}</WebView>
            <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalEvidenceNotConfidence')}</Text>
            {activeViewData.observations.slice(-30).reverse().map((observation) => <WebView dataSet={{ 'personal-terminal-workspace-role': 'evidence-row' }} key={observation.id}><Text style={{ color: theme.text.primary }}>{seriesReading(language, activeSeries, observation.value)} {seriesUnit(language, activeSeries)}</Text><Text style={{ color: theme.text.metadata }}>{dateLabel(language, observation.timestamp)} · {t(language, `personalTerminalProvenance_${observation.provenance}`)}</Text></WebView>)}
          </WebView>
        ) : null}

        {sheet?.kind === 'signal' ? (
          <WebView dataSet={{ 'personal-terminal-workspace-role': 'signal-sheet' }}>
            <Text style={{ color: theme.text.primary }}>{copy(language, sheet.signal.relationship)}</Text>
            <WebView dataSet={{ 'personal-terminal-workspace-role': 'evidence-summary' }}>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalObservations')}</Text><Text style={{ color: theme.text.primary }}>{sheet.signal.observationCount}</Text></WebView>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalCounterShort')}</Text><Text style={{ color: theme.text.primary }}>{sheet.signal.counterexampleCount ?? '—'}</Text></WebView>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalSignalMaturity')}</Text><Text style={{ color: theme.text.primary }}>{t(language, `personalTerminalSignal_${sheet.signal.maturity}`)}</Text></WebView>
            </WebView>
            <Text style={{ color: theme.text.secondary }}>{copy(language, sheet.signal.limitation)}</Text>
            <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalSignalNonCausal')}</Text>
          </WebView>
        ) : null}

        {sheet?.kind === 'event' ? (
          <WebView dataSet={{ 'personal-terminal-workspace-role': 'event-detail' }}>
            <Text style={{ color: theme.text.primary }}>{copy(language, sheet.event.detail)}</Text>
            <Text style={{ color: theme.text.secondary }}>{dateLabel(language, sheet.event.timestamp)}</Text>
            <Text style={{ color: theme.text.metadata }}>{t(language, `personalTerminalProvenance_${sheet.event.provenance}`)}</Text>
          </WebView>
        ) : null}

        {sheet?.kind === 'observation' ? (
          <WebView dataSet={{ 'personal-terminal-workspace-role': 'observation-detail' }}>
            <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalCurrentObservation')}</Text><Text style={{ color: theme.text.primary }}>{seriesReading(language, activeSeries, sheet.selection.value)} {seriesUnit(language, activeSeries)}</Text></WebView>
            <WebView><Text style={{ color: theme.text.metadata }}>{referenceLabel(language, activeSeries)}</Text><Text style={{ color: theme.text.primary }}>{seriesReading(language, activeSeries, sheet.selection.baseline)}</Text></WebView>
            <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalObservations')}</Text><Text style={{ color: theme.text.primary }}>{sheet.selection.observationCount}</Text></WebView>
            {sheet.selection.candle ? <Text style={{ color: theme.text.secondary }}>{t(language, 'personalTerminalObservationalCandleMeaning')}</Text> : null}
          </WebView>
        ) : null}
      </PersonalTerminalSheet>
    </>
  );
}
