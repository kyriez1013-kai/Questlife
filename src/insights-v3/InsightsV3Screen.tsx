import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useStore } from '../store';
import { getLanguage, type Lang } from '../i18n';
import { isDarkTheme } from '../design/darkSurfaceGuard';
import { getQuestVisualFoundation } from '../design/visualFoundation';
import { questLayout } from '../design/tokens';
import { useQuestTheme } from '../design/useQuestTheme';
import V11GlowOrb from '../v11/components/V11GlowOrb';
import { V11GlassSheet } from '../v11/components/V11Material';
import { getV11ProductDebugLanguage, getV11ProductThemeId } from '../v11/featureFlag';
import {
  getV11ThemeTokens,
  v11Radius,
  v11Spacing,
  v11Typography,
  type V11EvidenceStage,
} from '../v11/tokens';
import useV11ReducedMotion from '../v11/useV11ReducedMotion';
import type { QuantAnalysisExtensionV1, QuantJointDriverV1 } from '../quant-product/quantAnalysisContract';
import type { QuantProductBundleV1, QuantProductSeriesV1 } from '../quant-product/quantProductContract';
import type { QuantProductConsumerInstrument, QuantProductConsumerModel } from '../quant-product/quantProductV1Adapter';
import InsightsV3Chart, {
  type InsightsV3ChartHandle,
  type InsightsV3ComparisonSeries,
  type InsightsV3IndicatorLayer,
} from './InsightsV3Chart';
import InsightsV3Sheet from './InsightsV3Sheet';
import InsightsV3Watchlist from './InsightsV3Watchlist';
import {
  AnalystPanel,
  AnalyzeOverviewPanel,
  DriversPanel,
  EvidencePanel,
  EventsPanel,
  JointAnalysisPanel,
  JointDriverDetailPanel,
  RecoveryPanel,
  ScenarioPanel,
  SimilarPanel,
} from './InsightsV3Analysis';
import {
  hasInsightsV3AnalysisExtension,
  loadInsightsV3AnalysisExtension,
} from './insightsV3AnalysisSource';
import {
  aggregationBucketLabel,
  availabilityLabel,
  availableChartKinds,
  buildCompactCue,
  buildInsightsV3Consumer,
  buildPersonalContext,
  chartTypeContractKey,
  contractQuickRanges,
  defaultChartKind,
  defaultRangeSelection,
  evidenceStageLabel,
  formatDateTime,
  formatQuantValue,
  instrumentLabel,
  isChartKindRenderable,
  nextObservationCopy,
  rangeLabel,
  seriesForInstrument,
  unitLabel,
  type InsightsV3ChartKind,
  type InsightsV3RangeSelection,
} from './insightsV3Presentation';
import {
  hasInsightsV3DetailBundle,
  loadInsightsV3DetailBundle,
  loadInsightsV3InitialBundle,
  resolveInsightsV3FixtureId,
  type InsightsV3BundleLoadResult,
  type InsightsV3FixtureId,
} from './insightsV3Source';
import { iv3 } from './insightsV3I18n';
import {
  addInsightsV3WatchlistItem,
  insightsV3WatchlistNamespace,
  moveInsightsV3WatchlistItem,
  orderedInsightsV3Watchlist,
  readInsightsV3Watchlist,
  removeInsightsV3WatchlistItem,
  toggleInsightsV3PinnedItem,
  writeInsightsV3Watchlist,
  type InsightsV3WatchlistPreferences,
} from './insightsV3WatchlistPreferences';
import '../v11/v11-components.css';
import './insights-v3.css';

const WebView = View as any;
const WebPressable = Pressable as any;
const WebScrollView = ScrollView as any;
const WebSafeAreaView = SafeAreaView as any;
const WebTextInput = TextInput as any;
const WebText = Text as any;

type ToolId =
  | 'view'
  | 'compare'
  | 'indicators'
  | 'analyze'
  | 'joint-analysis'
  | 'joint-driver-detail'
  | 'more'
  | 'custom-range'
  | 'drivers'
  | 'similar'
  | 'recovery'
  | 'scenario'
  | 'analyst'
  | 'evidence'
  | 'events'
  | 'watchlist';

const PRIMARY_CHART_KINDS: InsightsV3ChartKind[] = ['line', 'candle', 'bar'];

function chartKindLabel(lang: Lang, kind: InsightsV3ChartKind) {
  if (kind === 'candle') return iv3(lang, 'chartCandle');
  if (kind === 'bar') return iv3(lang, 'chartBar');
  if (kind === 'point') return iv3(lang, 'chartPoint');
  return iv3(lang, 'chartLine');
}

function chartKindUnavailableReason(
  lang: Lang,
  series: QuantProductSeriesV1 | null,
  kind: InsightsV3ChartKind,
  range: InsightsV3RangeSelection,
) {
  if (!series) return iv3(lang, 'chartModeNoSeries');
  if (!series.supported_chart_types.includes(chartTypeContractKey(kind))) {
    return iv3(lang, 'chartModeUnsupported');
  }
  if (kind === 'candle' && !isChartKindRenderable(series, kind, range)) {
    return iv3(lang, 'chartCandleRangeUnavailable');
  }
  return null;
}

function currentSearch() {
  return typeof window === 'undefined' ? '' : window.location.search;
}

function recordInsightsV3Performance(name: string, durationMs: number) {
  if (typeof window === 'undefined' || new URLSearchParams(window.location.search).get('debugInsightsV3') !== '1') return;
  const rounded = Math.round(durationMs * 10) / 10;
  const target = window as typeof window & { __questlifeInsightsV3Metrics?: Record<string, unknown> };
  target.__questlifeInsightsV3Metrics = { ...(target.__questlifeInsightsV3Metrics || {}), [name]: rounded };
  console.info('[insights-v3 performance]', JSON.stringify({ name, durationMs: rounded }));
}

function initialTool(): ToolId | null {
  if (typeof window === 'undefined') return null;
  const value = new URLSearchParams(window.location.search).get('insightsTool');
  return ['drivers', 'similar', 'recovery', 'scenario', 'analyst', 'evidence', 'events'].includes(value || '')
    ? value as ToolId
    : null;
}

function EmptySurface({
  action,
  body,
  foundation,
  title,
}: {
  action?: { label: string; onPress: () => void };
  body: string;
  foundation: ReturnType<typeof getQuestVisualFoundation>;
  title: string;
}) {
  return (
    <WebView dataSet={{ 'insights-v3-role': 'empty-surface' }}>
      <WebView dataSet={{ 'insights-v3-role': 'empty-axis' }}>
        {Array.from({ length: 7 }).map((_, index) => <WebView key={index} />)}
      </WebView>
      <Text style={{ color: foundation.text.primary }}>{title}</Text>
      <Text style={{ color: foundation.text.secondary }}>{body}</Text>
      {action ? (
        <WebPressable accessibilityRole="button" dataSet={{ 'insights-v3-role': 'primary-action' }} onPress={action.onPress}>
          <Text style={{ color: foundation.text.onPrimary }}>{action.label}</Text>
        </WebPressable>
      ) : null}
    </WebView>
  );
}

function InstrumentStrip({
  foundation,
  ids,
  lang,
  model,
  onSelect,
  selectedId,
}: {
  foundation: ReturnType<typeof getQuestVisualFoundation>;
  ids: string[];
  lang: Lang;
  model: QuantProductConsumerModel;
  onSelect: (id: string) => void;
  selectedId: string | null;
}) {
  return (
    <WebScrollView
      accessibilityRole="tablist"
      contentContainerStyle={{ gap: 6 }}
      dataSet={{ 'insights-v3-role': 'watchlist' }}
      horizontal
      showsHorizontalScrollIndicator={false}
    >
      {ids.map((id) => {
        const instrument = model.instruments.find((row) => row.id === id);
        if (!instrument) return null;
        const item = model.watchlist.find((row) => row.instrument_id === id);
        const latest = item?.latest ?? instrument.latest;
        const selected = id === selectedId;
        return (
          <WebPressable
            accessibilityLabel={instrumentLabel(lang, instrument)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            dataSet={{ 'insights-v3-role': 'watchlist-item', 'insights-v3-selected': selected ? 'true' : 'false' }}
            key={id}
            onPress={() => onSelect(id)}
          >
            <WebText dataSet={{ 'insights-v3-role': 'watchlist-label' }} numberOfLines={1} style={{ color: selected ? foundation.text.primary : foundation.text.secondary }}>
              {instrumentLabel(lang, instrument)}
            </WebText>
            <WebText dataSet={{ 'insights-v3-role': 'watchlist-reading' }} numberOfLines={1} style={{ color: selected ? foundation.text.primary : foundation.text.secondary }}>
              {formatQuantValue(latest?.value, instrument.unit, lang)}
              {unitLabel(instrument.unit, lang) ? <Text style={{ color: foundation.text.metadata }}> {unitLabel(instrument.unit, lang)}</Text> : null}
            </WebText>
          </WebPressable>
        );
      })}
    </WebScrollView>
  );
}

function ToolButton({
  active,
  foundation,
  label,
  onPress,
}: {
  active?: boolean;
  foundation: ReturnType<typeof getQuestVisualFoundation>;
  label: string;
  onPress: () => void;
}) {
  return (
    <WebPressable
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(active) }}
      dataSet={{ 'insights-v3-role': 'tool-button', 'insights-v3-selected': active ? 'true' : 'false' }}
      onPress={onPress}
    >
      <Text style={{ color: active ? foundation.text.primary : foundation.text.secondary }}>{label}</Text>
    </WebPressable>
  );
}

function SheetToggleChoice({
  foundation,
  label,
  onPress,
  selected,
}: {
  foundation: ReturnType<typeof getQuestVisualFoundation>;
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <WebPressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      dataSet={{ 'insights-v3-role': 'choice-row', 'insights-v3-selected': selected ? 'true' : 'false' }}
      onPress={onPress}
    >
      <Text style={{ color: foundation.text.primary }}>{label}</Text>
      <Text style={{ color: foundation.text.metadata }}>{selected ? '✓' : ''}</Text>
    </WebPressable>
  );
}

function ChartViewportControls({
  foundation,
  lang,
  onFit,
  onZoomIn,
  onZoomOut,
}: {
  foundation: ReturnType<typeof getQuestVisualFoundation>;
  lang: Lang;
  onFit: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}) {
  const fitIcon = (
    <Svg height={17} width={17} viewBox="0 0 20 20">
      <Path
        d="M7 3H3v4 M13 3h4v4 M17 13v4h-4 M7 17H3v-4"
        fill="none"
        stroke={foundation.text.secondary}
        strokeLinecap="square"
        strokeLinejoin="miter"
        strokeWidth="1.4"
      />
    </Svg>
  );
  return (
    <WebView accessibilityRole="toolbar" dataSet={{ 'insights-v3-role': 'chart-controls' }}>
      <WebPressable
        accessibilityLabel={iv3(lang, 'zoomIn')}
        accessibilityRole="button"
        dataSet={{ 'insights-v3-role': 'chart-control' }}
        onPress={onZoomIn}
      >
        <Text style={{ color: foundation.text.primary }}>+</Text>
      </WebPressable>
      <WebPressable
        accessibilityLabel={iv3(lang, 'zoomOut')}
        accessibilityRole="button"
        dataSet={{ 'insights-v3-role': 'chart-control' }}
        onPress={onZoomOut}
      >
        <Text style={{ color: foundation.text.primary }}>−</Text>
      </WebPressable>
      <WebPressable
        accessibilityLabel={iv3(lang, 'fit')}
        accessibilityRole="button"
        dataSet={{ 'insights-v3-role': 'chart-control' }}
        onPress={onFit}
      >
        {fitIcon}
      </WebPressable>
    </WebView>
  );
}

export default function InsightsV3Screen() {
  const { data } = useStore();
  const navigation = useNavigation<any>();
  const theme = useQuestTheme(getV11ProductThemeId(data.settings.selectedThemeId));
  const foundation = useMemo(() => getQuestVisualFoundation(theme), [theme]);
  const v11ThemeMode = isDarkTheme(theme) ? 'dark' : 'light';
  const v11Theme = useMemo(() => getV11ThemeTokens(v11ThemeMode), [v11ThemeMode]);
  const reducedMotion = useV11ReducedMotion();
  const lang = getV11ProductDebugLanguage() ?? getLanguage(data.settings.language);
  const fixtureId = useMemo(() => resolveInsightsV3FixtureId(currentSearch()), []);
  const [loadResult, setLoadResult] = useState<InsightsV3BundleLoadResult | null>(null);
  const [bundle, setBundle] = useState<QuantProductBundleV1 | null>(null);
  const [analysisExtension, setAnalysisExtension] = useState<QuantAnalysisExtensionV1 | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [range, setRange] = useState<InsightsV3RangeSelection>({ kind: 'contract', key: 'ALL' });
  const [chartKind, setChartKind] = useState<InsightsV3ChartKind>('line');
  const [showRawObservations, setShowRawObservations] = useState(true);
  const [showReference, setShowReference] = useState(true);
  const [showReferenceRange, setShowReferenceRange] = useState(true);
  const [showShortEwma, setShowShortEwma] = useState(false);
  const [showLongEwma, setShowLongEwma] = useState(false);
  const [showEvents, setShowEvents] = useState(true);
  const [selectedJointDriverId, setSelectedJointDriverId] = useState<string | null>(null);
  const [watchlistPreferences, setWatchlistPreferences] = useState<InsightsV3WatchlistPreferences>({ order: [], pinnedIds: [] });
  const [tool, setTool] = useState<ToolId | null>(initialTool);
  const [customMode, setCustomMode] = useState<'days' | 'observations' | 'calendar'>('days');
  const [customCount, setCustomCount] = useState('30');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const chartRef = useRef<InsightsV3ChartHandle | null>(null);
  const detailRequestRef = useRef<Promise<boolean> | null>(null);
  const instrumentSwitchStartedAt = useRef<number | null>(null);
  const surfaceStartedAt = useRef(typeof performance === 'undefined' ? null : performance.now());
  const surfaceReadyRecorded = useRef(false);
  const toolOpenedAt = useRef<number | null>(null);

  const loadInitial = useCallback(async () => {
    if (!fixtureId) return;
    setLoadResult(null);
    setBundle(null);
    setAnalysisExtension(null);
    setAnalysisError(false);
    setDetailError(false);
    const result = await loadInsightsV3InitialBundle(fixtureId);
    setLoadResult(result);
    if (result.ok) setBundle(result.bundle);
  }, [fixtureId]);

  useEffect(() => { void loadInitial(); }, [loadInitial]);

  const model = useMemo(() => bundle ? buildInsightsV3Consumer(bundle) : null, [bundle]);
  const availableInstrumentIds = useMemo(() => model?.instruments.map((row) => row.id) ?? [], [model]);
  const defaultWatchlistIds = useMemo(() => model?.watchlist.map((row) => row.instrument_id) ?? [], [model]);
  const watchlistNamespace = useMemo(() => insightsV3WatchlistNamespace(fixtureId), [fixtureId]);
  const displayedWatchlistIds = useMemo(
    () => orderedInsightsV3Watchlist(watchlistPreferences),
    [watchlistPreferences],
  );

  useEffect(() => {
    if (!model) return;
    setWatchlistPreferences(readInsightsV3Watchlist(availableInstrumentIds, defaultWatchlistIds, watchlistNamespace));
  }, [availableInstrumentIds, defaultWatchlistIds, model, watchlistNamespace]);

  useEffect(() => {
    if (!model) return;
    setSelectedId((current) => current && model.instruments.some((row) => row.id === current)
      ? current
      : model.analystContext.selected_instrument_id || model.watchlist[0]?.instrument_id || model.instruments[0]?.id || null);
  }, [model]);

  const ensureDetailBundle = useCallback(async () => {
    if (!fixtureId || !hasInsightsV3DetailBundle(fixtureId)) return false;
    if (bundle?.metadata.mode === 'FULL') return true;
    if (detailRequestRef.current) return detailRequestRef.current;
    setDetailLoading(true);
    setDetailError(false);
    const request = loadInsightsV3DetailBundle(fixtureId).then((result) => {
      setDetailLoading(false);
      setLoadResult(result);
      if (result.ok) {
        setBundle(result.bundle);
        return true;
      }
      setDetailError(true);
      return false;
    }).finally(() => {
      detailRequestRef.current = null;
    });
    detailRequestRef.current = request;
    return request;
  }, [bundle?.metadata.mode, fixtureId]);

  useEffect(() => {
    if (!tool || bundle?.metadata.mode !== 'COMPACT') return;
    if (['view', 'compare', 'indicators', 'drivers', 'similar', 'recovery', 'scenario', 'events'].includes(tool)) {
      void ensureDetailBundle();
    }
  }, [bundle?.metadata.mode, ensureDetailBundle, tool]);

  useEffect(() => {
    if (!fixtureId || bundle?.metadata.mode !== 'FULL' || !hasInsightsV3AnalysisExtension(fixtureId)) {
      setAnalysisExtension(null);
      setAnalysisLoading(false);
      setAnalysisError(false);
      return undefined;
    }
    let cancelled = false;
    const startedAt = typeof performance === 'undefined' ? null : performance.now();
    setAnalysisLoading(true);
    setAnalysisError(false);
    void loadInsightsV3AnalysisExtension(fixtureId, bundle.metadata.bundle_id).then((result) => {
      if (cancelled) return;
      setAnalysisLoading(false);
      if (result.ok) {
        setAnalysisExtension(result.extension);
        if (startedAt != null) recordInsightsV3Performance('analysisExtensionReadyMs', performance.now() - startedAt);
      } else {
        setAnalysisExtension(null);
        setAnalysisError(result.code !== 'NOT_AVAILABLE');
      }
    });
    return () => { cancelled = true; };
  }, [bundle?.metadata.bundle_id, bundle?.metadata.mode, fixtureId]);

  const instrument = useMemo<QuantProductConsumerInstrument | null>(
    () => model?.instruments.find((row) => row.id === selectedId) || null,
    [model, selectedId],
  );
  const series = useMemo(() => seriesForInstrument(instrument), [instrument]);
  const compareInstruments = useMemo(
    () => compareIds.flatMap((id) => {
      const row = model?.instruments.find((item) => item.id === id);
      return row ? [row] : [];
    }),
    [compareIds, model],
  );
  const comparisonSeries = useMemo<InsightsV3ComparisonSeries[]>(() => compareInstruments.flatMap((row) => {
    const rowSeries = seriesForInstrument(row);
    if (!rowSeries || !instrument) return [];
    const overlap = analysisExtension?.compare_overlaps.find((item) => (
      item.target_instrument_id === instrument.id && item.compare_instrument_id === row.id
    ));
    return [{
      instrumentId: row.id,
      label: instrumentLabel(lang, row),
      matchingWindowKey: overlap?.matching_window_key ?? null,
      overlapCount: overlap?.overlapping_window_count ?? null,
      series: rowSeries,
    }];
  }), [analysisExtension?.artifact_id, compareInstruments, instrument, lang]);
  const indicatorLayers = useMemo<InsightsV3IndicatorLayer[]>(() => {
    if (!analysisExtension || !instrument) return [];
    return analysisExtension.indicator_series.flatMap((item) => {
      if (item.instrument_id !== instrument.id) return [];
      if (item.layer_kind === 'EWMA_SHORT' && showShortEwma) return [{ label: iv3(lang, 'shortEwmaIndicator'), series: item }];
      if (item.layer_kind === 'EWMA_LONG' && showLongEwma) return [{ label: iv3(lang, 'longEwmaIndicator'), series: item }];
      return [];
    });
  }, [analysisExtension, instrument, lang, showLongEwma, showShortEwma]);
  const jointAnalysis = useMemo(
    () => analysisExtension?.joint_analyses.find((item) => item.target_instrument_id === instrument?.id) ?? null,
    [analysisExtension, instrument?.id],
  );
  const selectedJointDriver = useMemo<QuantJointDriverV1 | null>(
    () => jointAnalysis?.drivers.find((item) => item.driver_id === selectedJointDriverId) ?? null,
    [jointAnalysis, selectedJointDriverId],
  );

  useEffect(() => {
    if (!fixtureId || !instrument || series || detailLoading || detailError || bundle?.metadata.mode !== 'COMPACT') return;
    if (hasInsightsV3DetailBundle(fixtureId)) void ensureDetailBundle();
  }, [bundle?.metadata.mode, detailError, detailLoading, ensureDetailBundle, fixtureId, instrument, series]);

  useEffect(() => {
    if (surfaceReadyRecorded.current || !bundle || !model || surfaceStartedAt.current == null || typeof performance === 'undefined') return;
    surfaceReadyRecorded.current = true;
    recordInsightsV3Performance('initialSurfaceReadyMs', performance.now() - surfaceStartedAt.current);
  }, [bundle, model]);

  useEffect(() => {
    if (!series) return;
    const nextRange = defaultRangeSelection(series);
    setRange(nextRange);
    setChartKind(defaultChartKind(series));
  }, [series?.series_id]);

  useEffect(() => {
    if (instrumentSwitchStartedAt.current == null || !series || typeof window === 'undefined') return;
    const durationMs = performance.now() - instrumentSwitchStartedAt.current;
    instrumentSwitchStartedAt.current = null;
    recordInsightsV3Performance('instrumentSwitchMs', durationMs);
  }, [series?.series_id]);

  useEffect(() => {
    if (!tool || detailLoading || toolOpenedAt.current == null || typeof performance === 'undefined') return;
    const durationMs = performance.now() - toolOpenedAt.current;
    toolOpenedAt.current = null;
    recordInsightsV3Performance('toolReadyMs', durationMs);
  }, [bundle?.metadata.bundle_id, detailLoading, tool]);

  const selectInstrument = (id: string) => {
    instrumentSwitchStartedAt.current = typeof performance === 'undefined' ? null : performance.now();
    setSelectedId(id);
    setCompareIds([]);
    setSelectedJointDriverId(null);
    if (bundle?.metadata.mode === 'COMPACT') void ensureDetailBundle();
  };

  const openTool = (nextTool: ToolId) => {
    toolOpenedAt.current = typeof performance === 'undefined' ? null : performance.now();
    setTool(nextTool);
    if (['view', 'compare', 'indicators', 'analyze', 'joint-analysis', 'drivers', 'similar', 'recovery', 'scenario', 'events'].includes(nextTool)
      && bundle?.metadata.mode === 'COMPACT') {
      void ensureDetailBundle();
    }
  };

  const applyCustomRange = () => {
    const count = Math.max(1, Number.parseInt(customCount, 10) || 1);
    if (customMode === 'days') setRange({ kind: 'last_n_days', days: count });
    else if (customMode === 'observations') setRange({ kind: 'last_n_observations', count });
    else if (customStart && customEnd) setRange({ kind: 'calendar', start: customStart, end: customEnd });
    setChartKind((current) => current === 'candle' ? 'line' : current);
    setTool(null);
  };

  const jumpToRange = (next: InsightsV3RangeSelection) => {
    setRange(next);
    setChartKind('line');
    setTool(null);
  };

  const recordChartReady = useCallback((durationMs: number) => {
    recordInsightsV3Performance('chartReadyMs', durationMs);
  }, []);

  const updateWatchlist = useCallback((transform: (current: InsightsV3WatchlistPreferences) => InsightsV3WatchlistPreferences) => {
    setWatchlistPreferences((current) => {
      const next = transform(current);
      writeInsightsV3Watchlist(next, availableInstrumentIds, watchlistNamespace);
      return next;
    });
  }, [availableInstrumentIds, watchlistNamespace]);

  const addWatchlistInstrument = useCallback((id: string) => {
    updateWatchlist((current) => ({ ...current, order: addInsightsV3WatchlistItem(current.order, id) }));
  }, [updateWatchlist]);

  const removeWatchlistInstrument = useCallback((id: string) => {
    updateWatchlist((current) => ({
      order: removeInsightsV3WatchlistItem(current.order, id),
      pinnedIds: removeInsightsV3WatchlistItem(current.pinnedIds, id),
    }));
  }, [updateWatchlist]);

  const moveWatchlistInstrument = useCallback((id: string, direction: -1 | 1) => {
    updateWatchlist((current) => ({ ...current, order: moveInsightsV3WatchlistItem(current.order, id, direction) }));
  }, [updateWatchlist]);

  const togglePinnedInstrument = useCallback((id: string) => {
    updateWatchlist((current) => ({ ...current, pinnedIds: toggleInsightsV3PinnedItem(current.pinnedIds, id) }));
  }, [updateWatchlist]);

  const rootStyle = {
    '--iv3-bg': foundation.environment.canvas,
    '--iv3-surface': foundation.material.base,
    '--iv3-elevated': foundation.material.elevated,
    '--iv3-soft': foundation.material.soft,
    '--iv3-border': foundation.border.standard,
    '--iv3-divider': foundation.border.divider,
    '--iv3-text': foundation.text.primary,
    '--iv3-muted': foundation.text.secondary,
    '--iv3-meta': foundation.text.metadata,
    '--iv3-primary': foundation.interaction.primary,
    '--iv3-primary-soft': foundation.interaction.primarySoft,
    '--iv3-data': foundation.data.observed,
    '--iv3-compare': foundation.data.comparison,
    '--iv3-overlay': foundation.material.overlay,
    '--iv3-field-near': v11Theme.field.near,
    '--iv3-field-middle': v11Theme.field.middle,
    '--iv3-field-far': v11Theme.field.far,
    '--iv3-field-grid': v11Theme.field.grid,
    '--iv3-glow-primary': v11Theme.glow.primary,
    '--iv3-glow-supporting': v11Theme.glow.supporting,
    '--iv3-control-surface': v11Theme.control.neutralSurface,
    '--iv3-control-pressed': v11Theme.control.neutralPressedSurface,
    '--iv3-control-border': v11Theme.control.neutralBorder,
    '--iv3-motion-standard': reducedMotion ? '0.001ms' : '320ms',
    '--iv3-radius-control': `${v11Radius.control}px`,
    '--iv3-radius-panel': `${v11Radius.panel}px`,
    '--iv3-radius-sheet': `${v11Radius.sheet}px`,
    '--iv3-space-xxs': `${v11Spacing.xxs}px`,
    '--iv3-space-xs': `${v11Spacing.xs}px`,
    '--iv3-space-sm': `${v11Spacing.sm}px`,
    '--iv3-space-md': `${v11Spacing.md}px`,
    '--iv3-space-lg': `${v11Spacing.lg}px`,
    '--iv3-space-xl': `${v11Spacing.xl}px`,
    '--iv3-type-body': `${v11Typography.body.fontSize}px`,
    '--iv3-type-body-line': `${v11Typography.body.lineHeight}px`,
    '--iv3-type-label': `${v11Typography.label.fontSize}px`,
    '--iv3-type-meta': `${v11Typography.metadata.fontSize}px`,
    '--iv3-type-title': `${v11Typography.title.fontSize}px`,
    '--iv3-type-instrument': `${v11Typography.judgement.fontSize}px`,
    '--iv3-type-reading': `${Math.round(v11Typography.reading.fontSize * 0.52)}px`,
    '--iv3-shadow': v11Theme.material.shadow,
    backgroundColor: foundation.environment.canvas,
  } as any;

  if (!fixtureId) {
    return (
      <WebSafeAreaView dataSet={{ 'insights-v3-role': 'root', 'insights-v3-theme': v11ThemeMode }} edges={['top', 'left', 'right']} style={[{ flex: 1 }, rootStyle]}>
        <EmptySurface
          action={{ label: iv3(lang, 'sourceUnavailableAction'), onPress: () => navigation.navigate('Today') }}
          body={iv3(lang, 'sourceUnavailableBody')}
          foundation={foundation}
          title={iv3(lang, 'sourceUnavailableTitle')}
        />
      </WebSafeAreaView>
    );
  }

  if (!loadResult || (!bundle && loadResult == null)) {
    return (
      <WebSafeAreaView dataSet={{ 'insights-v3-role': 'root', 'insights-v3-theme': v11ThemeMode }} edges={['top', 'left', 'right']} style={[{ flex: 1 }, rootStyle]}>
        <WebView dataSet={{ 'insights-v3-role': 'loading' }}>
          <ActivityIndicator color={foundation.interaction.primary} />
          <Text style={{ color: foundation.text.secondary }}>{iv3(lang, 'loading')}</Text>
        </WebView>
      </WebSafeAreaView>
    );
  }

  if (!loadResult.ok && !bundle) {
    return (
      <WebSafeAreaView dataSet={{ 'insights-v3-role': 'root', 'insights-v3-theme': v11ThemeMode }} edges={['top', 'left', 'right']} style={[{ flex: 1 }, rootStyle]}>
        <EmptySurface
          action={{ label: iv3(lang, 'retry'), onPress: () => void loadInitial() }}
          body={iv3(lang, 'contractErrorBody')}
          foundation={foundation}
          title={iv3(lang, 'contractErrorTitle')}
        />
      </WebSafeAreaView>
    );
  }

  if (!bundle || !model) return null;

  if (!instrument) {
    return (
      <WebSafeAreaView dataSet={{ 'insights-v3-role': 'root', 'insights-v3-theme': v11ThemeMode }} edges={['top', 'left', 'right']} style={[{ flex: 1 }, rootStyle]}>
        <EmptySurface
          action={{ label: iv3(lang, 'emptyAction'), onPress: () => navigation.navigate('Today') }}
          body={iv3(lang, 'emptyBody')}
          foundation={foundation}
          title={iv3(lang, 'emptyTitle')}
        />
      </WebSafeAreaView>
    );
  }

  const personalContext = buildPersonalContext(lang, instrument);
  const compactCue = buildCompactCue(lang, bundle, instrument);
  const chartKinds = availableChartKinds(series);
  const chartViewKinds = [
    ...PRIMARY_CHART_KINDS,
    ...(chartKinds.includes('point') && !chartKinds.includes('line') ? ['point' as const] : []),
  ];
  const quickRanges = contractQuickRanges(series);
  const activeToolTitle = tool === 'drivers' ? iv3(lang, 'drivers')
    : tool === 'joint-analysis' ? iv3(lang, 'jointAnalysis')
      : tool === 'joint-driver-detail' ? iv3(lang, 'driverDetail')
    : tool === 'similar' ? iv3(lang, 'similar')
      : tool === 'recovery' ? iv3(lang, 'recovery')
        : tool === 'scenario' ? iv3(lang, 'scenario')
          : tool === 'analyst' ? iv3(lang, 'analyst')
            : tool === 'evidence' ? iv3(lang, 'evidenceDetail')
              : tool === 'events' ? iv3(lang, 'eventLog')
                : tool === 'watchlist' ? iv3(lang, 'watchlist')
                  : tool === 'compare' ? iv3(lang, 'compare')
                  : tool === 'indicators' ? iv3(lang, 'indicators')
                    : tool === 'view' ? iv3(lang, 'view')
                      : tool === 'custom-range' ? iv3(lang, 'customRange')
                        : tool === 'analyze' ? iv3(lang, 'analysisTools')
                          : iv3(lang, 'more');

  return (
    <WebSafeAreaView
      dataSet={{
        'insights-v3-role': 'root',
        'insights-v3-theme': v11ThemeMode,
        'v11-motion': reducedMotion ? 'reduced' : 'normal',
      }}
      edges={['top', 'left', 'right']}
      style={[{ flex: 1 }, rootStyle]}
    >
      <WebView dataSet={{ 'insights-v3-role': 'environment' }} pointerEvents="none" />
      <V11GlowOrb
        stage={instrument.evidence.stage as V11EvidenceStage}
        style={{ position: 'absolute', top: 66, left: -116 }}
        theme={v11Theme}
      />
      <V11GlowOrb
        stage={(instrument.evidence.stage === 'S3' ? 'S2' : instrument.evidence.stage) as V11EvidenceStage}
        style={{ position: 'absolute', top: 474, right: -156 }}
        theme={v11Theme}
        tone="supporting"
      />
      <WebScrollView
        contentContainerStyle={{ paddingBottom: questLayout.contentBottomInset + 22 }}
        dataSet={{ 'insights-v3-role': 'screen-scroll' }}
        showsVerticalScrollIndicator={false}
      >
        <WebView dataSet={{ 'insights-v3-role': 'terminal' }}>
          <WebView dataSet={{ 'insights-v3-role': 'topline' }}>
            <Text style={{ color: foundation.text.primary }}>{iv3(lang, 'personalMarket')}</Text>
            <WebView dataSet={{ 'insights-v3-role': 'topline-meta' }}>
              {bundle.metadata.synthetic_only ? <Text style={{ color: foundation.text.metadata }}>{iv3(lang, 'reviewData')}</Text> : null}
              <Text style={{ color: foundation.text.metadata }}>{iv3(lang, 'asOf', { date: formatDateTime(lang, bundle.metadata.as_of) })}</Text>
            </WebView>
          </WebView>

          <WebView dataSet={{ 'insights-v3-role': 'desktop-grid' }}>
            <WebView dataSet={{ 'insights-v3-role': 'primary-column' }}>
              <WebView dataSet={{ 'insights-v3-role': 'instrument-header' }}>
                <WebView dataSet={{ 'insights-v3-role': 'instrument-copy' }}>
                  <WebText dataSet={{ 'insights-v3-role': 'instrument-eyebrow' }} style={{ color: foundation.text.metadata }}>
                    {availabilityLabel(lang, instrument.availability.state)} · {evidenceStageLabel(lang, instrument.evidence.stage)}
                  </WebText>
                  <WebText dataSet={{ 'insights-v3-role': 'instrument-name' }} numberOfLines={2} style={{ color: foundation.text.primary }}>
                    {instrumentLabel(lang, instrument)}
                  </WebText>
                  <WebText dataSet={{ 'insights-v3-role': 'personal-context' }} numberOfLines={2} style={{ color: foundation.text.secondary }}>
                    {personalContext.summary}
                  </WebText>
                </WebView>
                <WebView dataSet={{ 'insights-v3-role': 'latest-reading' }}>
                  <Text style={{ color: foundation.text.primary }}>{personalContext.currentValue}</Text>
                  {personalContext.currentUnit ? <Text style={{ color: foundation.text.metadata }}>{personalContext.currentUnit}</Text> : null}
                </WebView>
                <WebView dataSet={{ 'insights-v3-role': 'personal-context-line' }}>
                  <Text style={{ color: foundation.text.secondary }}>
                    {personalContext.referenceLabel} {personalContext.referenceValue}
                    {' · '}{personalContext.changeValue}
                    {' · '}{personalContext.evidenceValue}
                  </Text>
                </WebView>
              </WebView>

              <InstrumentStrip
                foundation={foundation}
                ids={displayedWatchlistIds}
                lang={lang}
                model={model}
                onSelect={selectInstrument}
                selectedId={selectedId}
              />

              <WebView dataSet={{ 'insights-v3-role': 'chart-material' }}>
                <V11GlassSheet
                  contentStyle={{ padding: 0, gap: 0 }}
                  minHeight={430}
                  reducedMotion={reducedMotion}
                  stage={instrument.evidence.stage as V11EvidenceStage}
                  style={{ width: '100%' }}
                  theme={v11Theme}
                >
                  <WebView dataSet={{ 'insights-v3-role': 'chart-stage' }}>
                    {series ? (
                      <>
                        <WebView dataSet={{ 'insights-v3-role': 'chart-toolbar' }}>
                          <WebView dataSet={{ 'insights-v3-role': 'chart-title' }}>
                            <Text numberOfLines={1} style={{ color: foundation.text.primary }}>
                              {instrumentLabel(lang, instrument)} · {chartKindLabel(lang, chartKind)}
                            </Text>
                            <Text numberOfLines={1} style={{ color: foundation.text.metadata }}>
                              {comparisonSeries.length ? iv3(lang, 'independentScales') : unitLabel(series.unit, lang)}
                            </Text>
                          </WebView>
                          <ChartViewportControls
                            foundation={foundation}
                            lang={lang}
                            onFit={() => chartRef.current?.fit()}
                            onZoomIn={() => chartRef.current?.zoomIn()}
                            onZoomOut={() => chartRef.current?.zoomOut()}
                          />
                        </WebView>
                        <InsightsV3Chart
                          asOf={bundle.metadata.as_of}
                          chartKind={isChartKindRenderable(series, chartKind, range) ? chartKind : 'line'}
                          comparisonSeries={comparisonSeries}
                          foundation={foundation}
                          indicatorSeries={indicatorLayers}
                          lang={lang}
                          onReady={recordChartReady}
                          range={range}
                          ref={chartRef}
                          series={series}
                          showEvents={showEvents}
                          showRawObservations={showRawObservations}
                          showReference={showReference}
                          showReferenceRange={showReferenceRange}
                          targetLabel={instrumentLabel(lang, instrument)}
                        />
                      </>
                    ) : (
                      <WebView dataSet={{ 'insights-v3-role': 'chart-empty' }}>
                        {detailLoading ? <ActivityIndicator color={foundation.interaction.primary} /> : null}
                        <Text style={{ color: foundation.text.primary }}>{detailLoading ? iv3(lang, 'loadingHistory') : iv3(lang, 'noChartTitle')}</Text>
                        <Text style={{ color: foundation.text.secondary }}>{iv3(lang, 'noChartBody')}</Text>
                        {!detailLoading && hasInsightsV3DetailBundle(fixtureId) ? (
                          <WebPressable accessibilityRole="button" dataSet={{ 'insights-v3-role': 'inline-action' }} onPress={() => void ensureDetailBundle()}>
                            <Text style={{ color: foundation.interaction.primary }}>{iv3(lang, 'loadHistory')}</Text>
                          </WebPressable>
                        ) : null}
                        {detailError ? <Text style={{ color: foundation.text.secondary }}>{iv3(lang, 'detailLoadFailed')}</Text> : null}
                      </WebView>
                    )}
                  </WebView>

                  <WebView dataSet={{ 'insights-v3-role': 'range-row' }}>
                    <WebScrollView contentContainerStyle={{ gap: 4 }} horizontal showsHorizontalScrollIndicator={false}>
                      {quickRanges.map((item) => {
                        const selected = range.kind === 'contract' && range.key === item.key;
                        return (
                          <WebPressable
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                            dataSet={{ 'insights-v3-role': 'range-button', 'insights-v3-selected': selected ? 'true' : 'false' }}
                            key={item.key}
                            onPress={() => {
                              const next: InsightsV3RangeSelection = { kind: 'contract', key: item.key };
                              setRange(next);
                              if (series && !isChartKindRenderable(series, chartKind, next)) setChartKind('line');
                            }}
                          >
                            <Text style={{ color: selected ? foundation.text.primary : foundation.text.secondary }}>{rangeLabel(lang, { kind: 'contract', key: item.key })}</Text>
                          </WebPressable>
                        );
                      })}
                      <WebPressable accessibilityRole="button" dataSet={{ 'insights-v3-role': 'range-button' }} onPress={() => openTool('custom-range')}>
                        <Text style={{ color: range.kind === 'contract' ? foundation.text.secondary : foundation.text.primary }}>
                          {range.kind === 'contract' ? iv3(lang, 'customRange') : rangeLabel(lang, range)}
                        </Text>
                      </WebPressable>
                    </WebScrollView>
                  </WebView>
                  {series ? (
                    <WebView dataSet={{ 'insights-v3-role': 'bucket-label' }}>
                      <Text style={{ color: foundation.text.metadata }}>
                        {iv3(lang, 'range')}: {rangeLabel(lang, range)} · {iv3(lang, 'bucket')}: {aggregationBucketLabel(lang, range.kind === 'contract' ? series.supported_ranges.find((item) => item.key === range.key)?.aggregation_bucket : 'quant_source_points')}
                      </Text>
                    </WebView>
                  ) : null}

                  <WebView accessibilityRole="toolbar" dataSet={{ 'insights-v3-role': 'tool-row' }}>
                    <ToolButton foundation={foundation} label={iv3(lang, 'view')} onPress={() => openTool('view')} />
                    <ToolButton active={compareIds.length > 0} foundation={foundation} label={iv3(lang, 'compare')} onPress={() => openTool('compare')} />
                    <ToolButton active={showReference || showReferenceRange || showShortEwma || showLongEwma || showEvents} foundation={foundation} label={iv3(lang, 'indicators')} onPress={() => openTool('indicators')} />
                    <ToolButton foundation={foundation} label={iv3(lang, 'analyze')} onPress={() => openTool('analyze')} />
                    <ToolButton foundation={foundation} label={iv3(lang, 'more')} onPress={() => openTool('more')} />
                  </WebView>
                </V11GlassSheet>
              </WebView>
            </WebView>

            <WebView dataSet={{ 'insights-v3-role': 'context-column' }}>
              <WebPressable accessibilityRole="button" dataSet={{ 'insights-v3-role': 'interpretation-cue' }} onPress={() => openTool(compactCue.action)}>
                <Text style={{ color: foundation.text.metadata }}>{compactCue.eyebrow}</Text>
                <Text style={{ color: foundation.text.primary }}>{compactCue.text}</Text>
                {compactCue.detail ? <Text style={{ color: foundation.text.secondary }}>{compactCue.detail}</Text> : null}
                <WebView dataSet={{ 'insights-v3-role': 'interpretation-evidence' }}>
                  <Text style={{ color: foundation.text.metadata }}>{compactCue.evidence}</Text>
                  <Text style={{ color: foundation.interaction.primary }}>{compactCue.actionLabel} →</Text>
                </WebView>
              </WebPressable>
              <WebView dataSet={{ 'insights-v3-role': 'next-observation' }}>
                <Text style={{ color: foundation.text.metadata }}>{iv3(lang, 'nextObservation')}</Text>
                <Text style={{ color: foundation.text.primary }}>{nextObservationCopy(lang, bundle)}</Text>
              </WebView>
              {compareInstruments.length ? (
                <WebView dataSet={{ 'insights-v3-role': 'compare-note' }}>
                  <Text style={{ color: foundation.text.metadata }}>{iv3(lang, 'independentScales')}</Text>
                  <Text style={{ color: foundation.text.primary }}>{iv3(lang, 'targetSeries')}: {instrumentLabel(lang, instrument)} · {unitLabel(instrument.unit, lang)}</Text>
                  {comparisonSeries.map((item) => (
                    <Text key={item.instrumentId} style={{ color: foundation.text.secondary }}>
                      {item.label} · {unitLabel(item.series.unit, lang)} · {item.overlapCount == null
                        ? iv3(lang, 'overlapUnavailable')
                        : iv3(lang, 'overlapWindows', { count: item.overlapCount })}
                    </Text>
                  ))}
                </WebView>
              ) : null}
              {loadResult.ok && loadResult.warnings.includes('OPTIONAL_INTERPRETATION_REJECTED') ? (
                <Text style={{ color: foundation.text.secondary }}>{iv3(lang, 'partialInterpretation')}</Text>
              ) : null}
              {fixtureId === 'research-filtered' ? <Text style={{ color: foundation.text.secondary }}>{iv3(lang, 'researchFiltered')}</Text> : null}
            </WebView>
          </WebView>
        </WebView>
      </WebScrollView>

      <InsightsV3Sheet
        foundation={foundation}
        lang={lang}
        onClose={() => setTool(null)}
        open={tool != null}
        reducedMotion={reducedMotion}
        theme={v11Theme}
        title={activeToolTitle}
      >
        {detailLoading ? (
          <WebView dataSet={{ 'insights-v3-role': 'sheet-loading' }}>
            <ActivityIndicator color={foundation.interaction.primary} />
            <Text style={{ color: foundation.text.secondary }}>{iv3(lang, 'loadingHistory')}</Text>
          </WebView>
        ) : tool === 'view' ? (
          <WebView dataSet={{ 'insights-v3-role': 'choice-list' }}>
            {chartViewKinds.map((kind) => {
              const selected = kind === chartKind;
              const enabled = series ? isChartKindRenderable(series, kind, range) : false;
              const unavailableReason = enabled ? null : chartKindUnavailableReason(lang, series, kind, range);
              return (
                <WebPressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !enabled, selected }}
                  dataSet={{ 'insights-v3-role': 'choice-row', 'insights-v3-selected': selected ? 'true' : 'false' }}
                  disabled={!enabled}
                  key={kind}
                  onPress={() => { setChartKind(kind); setTool(null); }}
                >
                  <WebView style={{ minWidth: 0, flex: 1 }}>
                    <Text style={{ color: enabled ? foundation.text.primary : foundation.text.disabled }}>{chartKindLabel(lang, kind)}</Text>
                    {unavailableReason ? (
                      <Text style={{ color: foundation.text.metadata }}>{unavailableReason}</Text>
                    ) : null}
                  </WebView>
                  <Text style={{ color: foundation.text.metadata }}>{selected ? '✓' : ''}</Text>
                </WebPressable>
              );
            })}
          </WebView>
        ) : tool === 'compare' ? (
          <WebView dataSet={{ 'insights-v3-role': 'choice-list' }}>
            {model.instruments.filter((row) => row.id !== instrument.id && row.series.length > 0).length === 0 ? (
              <Text style={{ color: foundation.text.secondary }}>{iv3(lang, 'compareUnavailable')}</Text>
            ) : (
              <>
                <Text style={{ color: foundation.text.secondary }}>{iv3(lang, 'compareLimit')}</Text>
                {model.instruments.filter((row) => row.id !== instrument.id && row.series.length > 0).map((row) => {
                  const selected = compareIds.includes(row.id);
                  const overlap = analysisExtension?.compare_overlaps.find((item) => (
                    item.target_instrument_id === instrument.id && item.compare_instrument_id === row.id
                  ));
                  const disabled = !selected && compareIds.length >= 3;
                  return (
                    <WebPressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected, disabled }}
                      dataSet={{ 'insights-v3-role': 'choice-row', 'insights-v3-selected': selected ? 'true' : 'false' }}
                      disabled={disabled}
                      key={row.id}
                      onPress={() => setCompareIds((current) => current.includes(row.id)
                        ? current.filter((id) => id !== row.id)
                        : [...current, row.id].slice(0, 3))}
                    >
                      <WebView style={{ minWidth: 0, flex: 1 }}>
                        <Text style={{ color: disabled ? foundation.text.disabled : foundation.text.primary }}>{instrumentLabel(lang, row)}</Text>
                        <Text style={{ color: foundation.text.metadata }}>
                          {unitLabel(row.unit, lang)} · {overlap
                            ? iv3(lang, 'overlapWindows', { count: overlap.overlapping_window_count })
                            : iv3(lang, 'overlapUnavailable')}
                        </Text>
                      </WebView>
                      <Text style={{ color: foundation.text.metadata }}>{selected ? '✓' : ''}</Text>
                    </WebPressable>
                  );
                })}
              </>
            )}
          </WebView>
        ) : tool === 'indicators' ? (
          <WebView dataSet={{ 'insights-v3-role': 'choice-list' }}>
            <WebView dataSet={{ 'insights-v3-role': 'indicator-group' }}>
              <WebText dataSet={{ 'insights-v3-role': 'indicator-group-title' }} style={{ color: foundation.text.metadata }}>
                {iv3(lang, 'indicatorGroupBase')}
              </WebText>
              <SheetToggleChoice
                foundation={foundation}
                label={iv3(lang, 'rawObservationsIndicator')}
                onPress={() => setShowRawObservations((current) => !current)}
                selected={showRawObservations}
              />
              <SheetToggleChoice
                foundation={foundation}
                label={iv3(lang, 'baselineIndicator')}
                onPress={() => setShowReference((current) => !current)}
                selected={showReference}
              />
            </WebView>

            {analysisExtension?.indicator_series.some((item) => item.instrument_id === instrument.id && (item.layer_kind === 'EWMA_SHORT' || item.layer_kind === 'EWMA_LONG')) ? (
              <WebView dataSet={{ 'insights-v3-role': 'indicator-group' }}>
                <WebText dataSet={{ 'insights-v3-role': 'indicator-group-title' }} style={{ color: foundation.text.metadata }}>
                  {iv3(lang, 'indicatorGroupTrend')}
                </WebText>
                {analysisExtension.indicator_series.some((item) => item.instrument_id === instrument.id && item.layer_kind === 'EWMA_SHORT') ? (
                  <SheetToggleChoice
                    foundation={foundation}
                    label={iv3(lang, 'shortEwmaIndicator')}
                    onPress={() => setShowShortEwma((current) => !current)}
                    selected={showShortEwma}
                  />
                ) : null}
                {analysisExtension.indicator_series.some((item) => item.instrument_id === instrument.id && item.layer_kind === 'EWMA_LONG') ? (
                  <SheetToggleChoice
                    foundation={foundation}
                    label={iv3(lang, 'longEwmaIndicator')}
                    onPress={() => setShowLongEwma((current) => !current)}
                    selected={showLongEwma}
                  />
                ) : null}
                <Text style={{ color: foundation.text.secondary }}>{iv3(lang, 'ewmaNotForecast')}</Text>
              </WebView>
            ) : null}

            <WebView dataSet={{ 'insights-v3-role': 'indicator-group' }}>
              <WebText dataSet={{ 'insights-v3-role': 'indicator-group-title' }} style={{ color: foundation.text.metadata }}>
                {iv3(lang, 'indicatorGroupRange')}
              </WebText>
              <SheetToggleChoice
                foundation={foundation}
                label={iv3(lang, 'rangeIndicator')}
                onPress={() => setShowReferenceRange((current) => !current)}
                selected={showReferenceRange}
              />
            </WebView>

            <WebView dataSet={{ 'insights-v3-role': 'indicator-group' }}>
              <WebText dataSet={{ 'insights-v3-role': 'indicator-group-title' }} style={{ color: foundation.text.metadata }}>
                {iv3(lang, 'indicatorGroupEvents')}
              </WebText>
              <SheetToggleChoice
                foundation={foundation}
                label={iv3(lang, 'eventsIndicator')}
                onPress={() => setShowEvents((current) => !current)}
                selected={showEvents}
              />
            </WebView>
          </WebView>
        ) : tool === 'custom-range' ? (
          <WebView dataSet={{ 'insights-v3-role': 'custom-range' }}>
            <WebView dataSet={{ 'insights-v3-role': 'segmented' }}>
              {(['days', 'observations', 'calendar'] as const).map((mode) => (
                <WebPressable accessibilityRole="button" accessibilityState={{ selected: customMode === mode }} key={mode} dataSet={{ 'insights-v3-selected': customMode === mode ? 'true' : 'false' }} onPress={() => setCustomMode(mode)}>
                  <Text style={{ color: customMode === mode ? foundation.text.primary : foundation.text.secondary }}>
                    {iv3(lang, mode === 'days' ? 'customDays' : mode === 'observations' ? 'customObservations' : 'customCalendar')}
                  </Text>
                </WebPressable>
              ))}
            </WebView>
            {customMode === 'calendar' ? (
              <WebView dataSet={{ 'insights-v3-role': 'date-inputs' }}>
                <WebTextInput accessibilityLabel={iv3(lang, 'from')} onChangeText={setCustomStart} placeholder="YYYY-MM-DD" value={customStart} />
                <WebTextInput accessibilityLabel={iv3(lang, 'to')} onChangeText={setCustomEnd} placeholder="YYYY-MM-DD" value={customEnd} />
              </WebView>
            ) : (
              <WebTextInput accessibilityLabel={customMode === 'days' ? iv3(lang, 'customDays') : iv3(lang, 'customObservations')} inputMode="numeric" onChangeText={setCustomCount} value={customCount} />
            )}
            <WebPressable accessibilityRole="button" dataSet={{ 'insights-v3-role': 'primary-action' }} onPress={applyCustomRange}>
              <Text style={{ color: foundation.text.onPrimary }}>{iv3(lang, 'apply')}</Text>
            </WebPressable>
          </WebView>
        ) : tool === 'analyze' ? (
          <AnalyzeOverviewPanel
            analysis={jointAnalysis}
            analysisError={analysisError}
            analysisLoading={analysisLoading}
            foundation={foundation}
            instrument={bundle.instruments.find((row) => row.instrument_id === instrument.id)!}
            lang={lang}
            onOpen={(id) => openTool(id)}
          />
        ) : tool === 'more' ? (
          <WebView dataSet={{ 'insights-v3-role': 'choice-list' }}>
            {(['watchlist', 'analyst', 'evidence', 'events'] as const).map((id) => (
              <WebPressable accessibilityRole="button" dataSet={{ 'insights-v3-role': 'choice-row' }} key={id} onPress={() => openTool(id)}>
                <Text style={{ color: foundation.text.primary }}>{iv3(lang, id === 'watchlist' ? 'watchlist' : id === 'evidence' ? 'evidenceDetail' : id === 'events' ? 'eventLog' : 'analyst')}</Text>
                <Text style={{ color: foundation.text.metadata }}>›</Text>
              </WebPressable>
            ))}
          </WebView>
        ) : tool === 'watchlist' ? (
          <InsightsV3Watchlist
            foundation={foundation}
            lang={lang}
            model={model}
            onAdd={addWatchlistInstrument}
            onMove={moveWatchlistInstrument}
            onRemove={removeWatchlistInstrument}
            onSelect={(id) => { selectInstrument(id); setTool(null); }}
            onTogglePin={togglePinnedInstrument}
            preferences={watchlistPreferences}
            selectedId={instrument.id}
          />
        ) : tool === 'joint-analysis' ? (
          <JointAnalysisPanel
            analysis={jointAnalysis}
            bundle={bundle}
            foundation={foundation}
            lang={lang}
            onSelectDriver={(driverId) => {
              setSelectedJointDriverId(driverId);
              openTool('joint-driver-detail');
            }}
          />
        ) : tool === 'joint-driver-detail' ? (
          <JointDriverDetailPanel
            analysis={jointAnalysis}
            bundle={bundle}
            driver={selectedJointDriver}
            foundation={foundation}
            lang={lang}
          />
        ) : tool === 'drivers' ? <DriversPanel bundle={bundle} foundation={foundation} lang={lang} />
          : tool === 'similar' ? <SimilarPanel bundle={bundle} foundation={foundation} lang={lang} onJump={jumpToRange} />
            : tool === 'recovery' ? <RecoveryPanel bundle={bundle} foundation={foundation} lang={lang} />
              : tool === 'scenario' ? <ScenarioPanel bundle={bundle} foundation={foundation} lang={lang} />
                : tool === 'analyst' ? <AnalystPanel bundle={bundle} foundation={foundation} lang={lang} />
                  : tool === 'evidence' ? <EvidencePanel bundle={bundle} foundation={foundation} instrument={bundle.instruments.find((row) => row.instrument_id === instrument.id)!} lang={lang} />
                    : tool === 'events' ? <EventsPanel foundation={foundation} lang={lang} series={series} />
                      : null}
      </InsightsV3Sheet>
    </WebSafeAreaView>
  );
}
