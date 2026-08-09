import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { Lang } from '../../i18n';
import { t } from '../../i18n';
import type { V11ThemeTokens } from '../../v11/tokens';
import PersonalTerminalChart, {
  type PersonalTerminalChartHandle,
  type PersonalTerminalChartSelection,
} from './PersonalTerminalChart';
import PersonalTerminalSheet from './PersonalTerminalSheet';
import PersonalTerminalIcon, { type PersonalTerminalIconName } from './PersonalTerminalIcon';
import type {
  PersonalTerminalChartKind,
  PersonalTerminalEntity,
  PersonalTerminalEvent,
  PersonalTerminalIndicator,
  PersonalTerminalModel,
  PersonalTerminalScope,
  PersonalTerminalSeries,
  PersonalTerminalSignal,
  PersonalTerminalTimeframe,
} from './personalTerminalPresentation';
import {
  availableComparisonSeries,
  availableTimeframes,
  buildPersonalTerminalViewData,
} from './personalTerminalPresentation';
import './personal-terminal.css';

const WebView = View as any;
const WebPressable = Pressable as any;
const WebScrollView = ScrollView as any;

type SheetState =
  | { kind: 'signal'; signal: PersonalTerminalSignal }
  | { kind: 'event'; event: PersonalTerminalEvent }
  | { kind: 'observation'; selection: PersonalTerminalChartSelection }
  | { kind: 'range'; start: PersonalTerminalChartSelection; end: PersonalTerminalChartSelection }
  | { kind: 'analyst' }
  | { kind: 'evidence' }
  | { kind: 'composition' }
  | { kind: 'entity' }
  | { kind: 'instrument' }
  | { kind: 'compare' }
  | { kind: 'indicators' }
  | { kind: 'chart-type' }
  | { kind: 'events' }
  | { kind: 'market-map' }
  | null;

function query() {
  if (typeof window === 'undefined') return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

function copy(language: Lang, value: { kind: 'text'; text: string } | { kind: 'i18n'; key: string; values?: Record<string, string | number> }) {
  if (value.kind === 'text') return value.text;
  return Object.entries(value.values || {}).reduce(
    (result, [key, replacement]) => result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(replacement)),
    t(language, value.key),
  );
}

function number(value: number | null) {
  if (value == null) return '—';
  if (Math.abs(value) >= 1000) return `${Math.round(value / 100) / 10}k`;
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function change(value: number | null) {
  if (value == null) return '—';
  return `${value > 0 ? '+' : ''}${number(value)}`;
}

function direction(value: number | null): 'up' | 'down' | 'flat' | 'unavailable' {
  if (value == null) return 'unavailable';
  if (Math.abs(value) < 0.02) return 'flat';
  return value > 0 ? 'up' : 'down';
}

function directionIcon(value: number | null): PersonalTerminalIconName {
  const valueDirection = direction(value);
  if (valueDirection === 'up') return 'trend-up';
  if (valueDirection === 'down') return 'trend-down';
  return 'trend-flat';
}

function nearestObservation(series: PersonalTerminalSeries, time: string) {
  if (!series.observations.length) return null;
  const target = new Date(time).getTime();
  return series.observations.reduce((best, row) => (
    Math.abs(new Date(row.timestamp).getTime() - target) < Math.abs(new Date(best.timestamp).getTime() - target) ? row : best
  ));
}

function eventScopeLabel(language: Lang, model: PersonalTerminalModel, scopeId: string | null) {
  if (!scopeId) return t(language, 'personalTerminalEventScopeUnlinked');
  const matchedEntity = model.entities.find((item) => item.id === scopeId);
  if (matchedEntity) return copy(language, matchedEntity.label);
  const scope = scopeId.split(':')[0];
  if (scope === 'market' || scope === 'goal' || scope === 'skill') {
    return t(language, `personalTerminalResolution_${scope}`);
  }
  return t(language, 'personalTerminalEventScopeRecorded');
}

function periodChange(series: PersonalTerminalSeries, now: Date, days: number | null) {
  const rows = series.observations.filter((row) => days == null || new Date(row.timestamp).getTime() >= now.getTime() - days * 86_400_000);
  if (rows.length < 2) return null;
  const first = rows[0].value;
  const last = rows[rows.length - 1].value;
  if (series.valueChangeMode === 'percentage') return first === 0 ? null : (last - first) / Math.abs(first) * 100;
  if (series.valueChangeMode === 'none') return null;
  return last - first;
}

function evidenceSummary(observations: PersonalTerminalSeries['observations'], timeframe: PersonalTerminalTimeframe) {
  const activeDays = new Set(observations.map((row) => row.timestamp.slice(0, 10))).size;
  if (!observations.length) return { activeDays: 0, missing: null as number | null, latest: null as string | null };
  const first = new Date(observations[0].timestamp);
  const last = new Date(observations[observations.length - 1].timestamp);
  const spanDays = Math.max(1, Math.floor((last.getTime() - first.getTime()) / 86_400_000) + 1);
  const supportsDailyMissing = timeframe === '7D' || timeframe === '1M' || timeframe === '3M';
  return {
    activeDays,
    missing: supportsDailyMissing ? Math.max(0, spanDays - activeDays) : null,
    latest: observations[observations.length - 1].timestamp,
  };
}

function initialIndicators() {
  const raw = query().get('quantIndicators');
  const supported: PersonalTerminalIndicator[] = ['emaShort', 'emaLong', 'baseline', 'load', 'density', 'events'];
  const selected = raw?.split(',').filter((value): value is PersonalTerminalIndicator => supported.includes(value as PersonalTerminalIndicator));
  return new Set<PersonalTerminalIndicator>(selected?.length ? selected : ['baseline', 'emaShort', 'load', 'events']);
}

function initialTimeframe(model: PersonalTerminalModel, series: PersonalTerminalSeries) {
  const requested = query().get('quantTimeframe') as PersonalTerminalTimeframe | null;
  const available = availableTimeframes(series, new Date(model.range.end ? `${model.range.end}T23:59:59.000` : Date.now()));
  if (requested && available.includes(requested)) return requested;
  if (model.fixture === 'historical' && available.includes('1Y')) return '1Y';
  if (model.fixture && model.fixture !== 'forming' && available.includes('3M')) return '3M';
  return available[0] || '1M';
}

type InteractionPerformanceRow = {
  duration: number;
  frames: number;
  label: string;
  over20: number;
  p50: number;
  p95: number;
};

function storeInteractionPerformance(row: InteractionPerformanceRow) {
  const rows = ((window as any).__questlifePersonalTerminalInteractions || []) as InteractionPerformanceRow[];
  rows.push(row);
  (window as any).__questlifePersonalTerminalInteractions = rows.slice(-80);
  if (query().get('debugPerformance') === '1') {
    console.log('[personal terminal interaction]', JSON.stringify(row));
  }
}

function measureInteraction(label: string, action: () => void) {
  const startedAt = typeof performance === 'undefined' ? 0 : performance.now();
  action();
  if (typeof window === 'undefined') return;
  const debugFrames = query().get('debugPerformance') === '1';
  if (!debugFrames) {
    window.setTimeout(() => storeInteractionPerformance({
      duration: Math.round((performance.now() - startedAt) * 10) / 10,
      frames: 0,
      label,
      over20: 0,
      p50: 0,
      p95: 0,
    }), 0);
    return;
  }

  const deltas: number[] = [];
  let previous = performance.now();
  let frame = 0;
  let completed = false;
  const finish = () => {
    if (completed) return;
    completed = true;
    const sorted = deltas.slice().sort((left, right) => left - right);
    const percentile = (value: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * value))] ?? 0;
    storeInteractionPerformance({
      duration: Math.round((performance.now() - startedAt) * 10) / 10,
      frames: sorted.length,
      label,
      over20: sorted.filter((value) => value > 20).length,
      p50: Math.round(percentile(0.5) * 10) / 10,
      p95: Math.round(percentile(0.95) * 10) / 10,
    });
  };
  const sample = (time: number) => {
    deltas.push(time - previous);
    previous = time;
    frame += 1;
    if (frame >= 48) { finish(); return; }
    window.requestAnimationFrame(sample);
  };
  window.requestAnimationFrame(sample);
  window.setTimeout(finish, 1200);
}

function TerminalButton({
  disabled = false,
  label,
  onPress,
  selected = false,
  theme,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  selected?: boolean;
  theme: V11ThemeTokens;
}) {
  return (
    <WebPressable
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      dataSet={{ 'personal-terminal-selected': selected ? 'true' : 'false' }}
      disabled={disabled}
      onPress={onPress}
    >
      <Text style={{ color: disabled ? theme.text.metadata : selected ? theme.text.primary : theme.text.secondary }}>{label}</Text>
    </WebPressable>
  );
}

function TerminalTool({
  active = false,
  compact = false,
  icon,
  label,
  onPress,
  theme,
}: {
  active?: boolean;
  compact?: boolean;
  icon: PersonalTerminalIconName;
  label: string;
  onPress: () => void;
  theme: V11ThemeTokens;
}) {
  return (
    <WebPressable
      accessibilityLabel={label}
      accessibilityRole="button"
      dataSet={{ 'personal-terminal-active': active ? 'true' : 'false', 'personal-terminal-compact': compact ? 'true' : 'false', 'personal-terminal-role': 'tool-button' }}
      onPress={onPress}
    >
      <PersonalTerminalIcon color={active ? theme.text.primary : theme.text.secondary} name={icon} size={15} />
      <Text style={{ color: active ? theme.text.primary : theme.text.secondary }}>{label}</Text>
    </WebPressable>
  );
}

function entitySeries(model: PersonalTerminalModel, entity: PersonalTerminalEntity) {
  return entity.seriesIds.flatMap((id) => model.series.find((row) => row.id === id) || []);
}

function nearestSelection(series: PersonalTerminalSeries, time: string): PersonalTerminalChartSelection | null {
  const target = new Date(time).getTime();
  const row = series.observations.reduce<PersonalTerminalSeries['observations'][number] | null>((best, item) => {
    if (!best) return item;
    return Math.abs(new Date(item.timestamp).getTime() - target) < Math.abs(new Date(best.timestamp).getTime() - target) ? item : best;
  }, null);
  return row ? { time: row.timestamp, value: row.value, baseline: series.baseline.value, sourceIds: row.sourceIds, observationCount: 1 } : null;
}

function SignalRow({ language, onPress, signal, theme }: { language: Lang; onPress: () => void; signal: PersonalTerminalSignal; theme: V11ThemeTokens }) {
  return (
    <WebPressable accessibilityRole="button" dataSet={{ 'personal-terminal-role': 'signal-row' }} onPress={onPress}>
      <PersonalTerminalIcon color={theme.text.secondary} name="signal" size={16} />
      <WebView dataSet={{ 'personal-terminal-role': 'signal-copy' }}>
        <Text numberOfLines={2} style={{ color: theme.text.primary }}>{copy(language, signal.title)}</Text>
        <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalSignalWindow')} · {signal.observationCount} {t(language, 'personalTerminalSupportShort')} · {signal.counterexampleCount ?? '—'} {t(language, 'personalTerminalCounterShort')}</Text>
      </WebView>
      <Text style={{ color: theme.text.secondary }}>{t(language, `quantSignal_${signal.status}`)}</Text>
    </WebPressable>
  );
}

export default function V11PersonalTerminal({
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
  const defaultSeries = model.series.find((row) => row.id === model.defaultSeriesId) || model.series[0];
  const [scope, setScope] = useState<PersonalTerminalScope>(model.defaultScope);
  const [entityId, setEntityId] = useState(model.defaultEntityId);
  const [seriesId, setSeriesId] = useState(model.defaultSeriesId);
  const [comparisonSeriesId, setComparisonSeriesId] = useState<string | null>(null);
  const [chartKind, setChartKind] = useState<PersonalTerminalChartKind>(query().get('quantChart') === 'candle' ? 'candle' : 'line');
  const [timeframe, setTimeframe] = useState<PersonalTerminalTimeframe>(() => initialTimeframe(model, defaultSeries));
  const [indicators, setIndicators] = useState<Set<PersonalTerminalIndicator>>(initialIndicators);
  const [crosshair, setCrosshair] = useState<PersonalTerminalChartSelection | null>(null);
  const [rangeMode, setRangeMode] = useState(query().get('rangeMode') === '1');
  const [rangeSelection, setRangeSelection] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });
  const [sheet, setSheet] = useState<SheetState>(null);
  const [analystPrompt, setAnalystPrompt] = useState<string | null>(null);
  const [showSimilarPeriods, setShowSimilarPeriods] = useState(false);
  const chartRef = useRef<PersonalTerminalChartHandle | null>(null);
  const lastCrosshairMeasurementRef = useRef(0);
  const lastChartRangeMeasurementRef = useRef(0);
  const debugFixture = query().get('debugQuantFixture') === '1';

  useEffect(() => onSheetStateChange?.(sheet != null), [onSheetStateChange, sheet]);
  useEffect(() => {
    setScope(model.defaultScope);
    setEntityId(model.defaultEntityId);
    setSeriesId(model.defaultSeriesId);
    setComparisonSeriesId(null);
  }, [model]);

  const entities = useMemo(() => model.entities.filter((row) => row.scope === scope), [model.entities, scope]);
  const entity = model.entities.find((row) => row.id === entityId) || entities[0] || model.entities[0];
  const rawSeriesRows = entity ? entitySeries(model, entity) : [];
  const seriesRows = rawSeriesRows.filter((row) => !row.qaDerivedIndex || debugFixture);
  const series = model.series.find((row) => row.id === seriesId) || seriesRows[0] || model.series[0];
  const now = useMemo(() => new Date(model.range.end ? `${model.range.end}T23:59:59.000` : Date.now()), [model.range.end]);
  const available = useMemo(() => series ? availableTimeframes(series, now) : ['1M'] as PersonalTerminalTimeframe[], [now, series]);
  const viewData = useMemo(() => series ? buildPersonalTerminalViewData(series, timeframe, now) : null, [now, series, timeframe]);
  const comparisonRows = useMemo(() => (
    entity ? availableComparisonSeries(model, entity.id, series?.id || '').filter((row) => (!row.qaDerivedIndex || debugFixture) && row.observations.length > 0) : []
  ), [debugFixture, entity, model, series?.id]);
  const comparisonSeries = comparisonRows.find((row) => row.id === comparisonSeriesId) || null;
  const comparisonViewData = useMemo(() => (
    comparisonSeries ? buildPersonalTerminalViewData(comparisonSeries, timeframe, now) : null
  ), [comparisonSeries, now, timeframe]);
  const current = viewData?.line[viewData.line.length - 1]?.value ?? null;
  const delta = current == null || series?.baseline.value == null ? null : current - series.baseline.value;
  const candleAvailable = Boolean(series?.supportsCandle && viewData?.candles.length);
  const lastPoint = viewData?.line[viewData.line.length - 1] ?? null;
  const historicalCount = viewData?.observations.filter((row) => row.provenance === 'historical_reference').length || 0;
  const confirmedCount = viewData?.observations.filter((row) => row.provenance === 'questlife_confirmed').length || 0;
  const evidence = viewData ? evidenceSummary(viewData.observations, timeframe) : { activeDays: 0, missing: null, latest: null };
  const trend = direction(delta);
  const activeIndicatorCount = [...indicators].filter((item) => item !== 'events').length;
  const hasComparableData = (viewData?.observations.length || 0) > 1;
  const longRange = useMemo(() => ([
    ['7D', periodChange(series, now, 7)],
    ['30D', periodChange(series, now, 30)],
    ['90D', periodChange(series, now, 90)],
    ['YTD', periodChange(series, now, Math.max(1, Math.ceil((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86_400_000)))],
    ['1Y', periodChange(series, now, 365)],
    ['ALL', periodChange(series, now, null)],
  ] as Array<[string, number | null]>).filter((row) => row[1] != null), [now, series]);

  useEffect(() => {
    if (!available.includes(timeframe)) setTimeframe(available[0] || '1M');
  }, [available, timeframe]);
  useEffect(() => {
    if (chartKind === 'candle' && !candleAvailable) setChartKind('line');
  }, [candleAvailable, chartKind]);

  const selectScope = (next: PersonalTerminalScope) => measureInteraction('scope-switch', () => {
    const firstEntity = model.entities.find((row) => row.scope === next);
    if (!firstEntity) return;
    setScope(next);
    setEntityId(firstEntity.id);
    const nextSeries = entitySeries(model, firstEntity).find((row) => !row.qaDerivedIndex || debugFixture);
    setSeriesId(nextSeries?.id || firstEntity.seriesIds[0]);
    setCrosshair(null);
    setRangeSelection({ start: null, end: null });
    setComparisonSeriesId(null);
  });
  const selectEntity = (next: PersonalTerminalEntity) => measureInteraction('entity-switch', () => {
    setEntityId(next.id);
    const nextSeries = entitySeries(model, next).find((row) => !row.qaDerivedIndex || debugFixture);
    setSeriesId(nextSeries?.id || next.seriesIds[0]);
    setCrosshair(null);
    setRangeSelection({ start: null, end: null });
    setComparisonSeriesId(null);
    setSheet(null);
  });
  const selectSeries = (next: PersonalTerminalSeries) => measureInteraction('metric-switch', () => {
    setSeriesId(next.id);
    setCrosshair(null);
    setRangeSelection({ start: null, end: null });
    setComparisonSeriesId(null);
  });
  const selectComparison = (next: PersonalTerminalSeries | null) => measureInteraction('compare-toggle', () => {
    setComparisonSeriesId(next?.id || null);
    setSheet(null);
  });
  const toggleIndicator = (indicator: PersonalTerminalIndicator) => measureInteraction(`indicator-${indicator}`, () => {
    setIndicators((currentSet) => {
      const next = new Set(currentSet);
      if (next.has(indicator)) next.delete(indicator); else next.add(indicator);
      return next;
    });
  });
  const handleChartTime = useCallback((time: string) => {
    if (!series) return;
    const selected = nearestSelection(series, time);
    if (!selected) return;
    if (!rangeMode) {
      setSheet({ kind: 'observation', selection: selected });
      return;
    }
    setRangeSelection((currentRange) => {
      if (!currentRange.start || currentRange.end) return { start: selected.time, end: null };
      const first = nearestSelection(series, currentRange.start);
      if (!first) return { start: selected.time, end: null };
      const [start, end] = [first, selected].sort((left, right) => new Date(left.time).getTime() - new Date(right.time).getTime());
      measureInteraction('range-selection', () => setSheet({ kind: 'range', start, end }));
      return { start: start.time, end: end.time };
    });
  }, [rangeMode, series]);
  const handleCrosshair = useCallback((selection: PersonalTerminalChartSelection | null) => {
    if (query().get('debugPerformance') === '1' && performance.now() - lastCrosshairMeasurementRef.current > 1400) {
      lastCrosshairMeasurementRef.current = performance.now();
      measureInteraction('crosshair', () => setCrosshair(selection));
      return;
    }
    setCrosshair(selection);
  }, []);
  const handleChartRange = useCallback(() => {
    if (query().get('debugPerformance') !== '1' || performance.now() - lastChartRangeMeasurementRef.current <= 1400) return;
    lastChartRangeMeasurementRef.current = performance.now();
    measureInteraction('chart-pan-or-scale', () => undefined);
  }, []);
  const handleEvent = useCallback((event: PersonalTerminalEvent) => measureInteraction('event-sheet', () => setSheet({ kind: 'event', event })), []);

  const openAnalyst = (prompt: string | null = null) => {
    measureInteraction('analyst-open', () => {
      setAnalystPrompt(prompt);
      setSheet({ kind: 'analyst' });
    });
  };
  const latestEvents = series?.events.filter((event) => !viewData?.observations.length || new Date(event.timestamp) >= new Date(viewData.observations[0].timestamp)).slice(-4) || [];
  const visibleSignals = scope === 'market' ? model.signals.slice(0, 3) : [];

  if (!entity || !series || !viewData) return null;

  const sheetMeta = (() => {
    if (!sheet) return { eyebrow: '', title: '', subtitle: undefined as string | undefined };
    if (sheet.kind === 'signal') return { eyebrow: t(language, 'personalTerminalSignalDetail'), title: copy(language, sheet.signal.title), subtitle: t(language, `quantSignal_${sheet.signal.status}`) };
    if (sheet.kind === 'event') return { eyebrow: t(language, 'personalTerminalEventDetail'), title: copy(language, sheet.event.title), subtitle: sheet.event.timestamp.slice(0, 16).replace('T', ' ') };
    if (sheet.kind === 'observation') return { eyebrow: t(language, 'personalTerminalObservationDetail'), title: `${number(sheet.selection.value)} ${copy(language, series.unit)}`, subtitle: sheet.selection.time.slice(0, 16).replace('T', ' ') };
    if (sheet.kind === 'range') return { eyebrow: t(language, 'personalTerminalRangeAnalysis'), title: `${sheet.start.time.slice(0, 10)} — ${sheet.end.time.slice(0, 10)}`, subtitle: copy(language, series.label) };
    if (sheet.kind === 'analyst') return { eyebrow: t(language, 'personalTerminalAnalyst'), title: t(language, 'personalTerminalTalkToData'), subtitle: `${copy(language, entity.label)} · ${copy(language, series.label)} · ${timeframe}` };
    if (sheet.kind === 'composition') return { eyebrow: t(language, 'personalTerminalComposition'), title: copy(language, entity.label), subtitle: entity.compositionBasis ? copy(language, entity.compositionBasis) : undefined };
    if (sheet.kind === 'entity') return { eyebrow: t(language, 'personalTerminalSelectEntity'), title: t(language, `personalTerminalScope_${scope}`), subtitle: t(language, 'personalTerminalOneInterface') };
    if (sheet.kind === 'instrument') return { eyebrow: t(language, 'personalTerminalInstrument'), title: copy(language, entity.label), subtitle: t(language, 'personalTerminalInstrumentHint') };
    if (sheet.kind === 'compare') return { eyebrow: t(language, 'personalTerminalCompareWith'), title: copy(language, series.label), subtitle: t(language, 'personalTerminalIndependentScale') };
    if (sheet.kind === 'indicators') return { eyebrow: t(language, 'personalTerminalIndicators'), title: copy(language, series.label), subtitle: t(language, 'personalTerminalIndicatorsHint') };
    if (sheet.kind === 'chart-type') return { eyebrow: t(language, 'personalTerminalChartType'), title: copy(language, series.label), subtitle: t(language, 'personalTerminalChartTypeHint') };
    if (sheet.kind === 'events') return { eyebrow: t(language, 'personalTerminalEventTool'), title: copy(language, entity.label), subtitle: t(language, 'personalTerminalEventRailHint') };
    if (sheet.kind === 'market-map') return { eyebrow: t(language, 'personalTerminalMarketOverview'), title: t(language, 'personalTerminalBreadth'), subtitle: t(language, 'personalTerminalMarketMapBasis') };
    return { eyebrow: t(language, 'quantEvidence'), title: t(language, 'personalTerminalEvidenceProvenance'), subtitle: copy(language, series.label) };
  })();

  return (
    <>
      <WebScrollView
        contentContainerStyle={{ paddingBottom: 116 }}
        dataSet={{ 'personal-terminal-role': 'scroll' }}
        showsVerticalScrollIndicator={false}
      >
        <WebView dataSet={{ 'personal-terminal-role': 'terminal' }}>
          <WebView dataSet={{ 'personal-terminal-role': 'topbar' }}>
            <WebView dataSet={{ 'personal-terminal-role': 'brand-context' }}>
              <PersonalTerminalIcon color={theme.text.primary} name="market" size={17} />
              <WebView>
                <Text style={{ color: theme.text.primary }}>{t(language, 'personalTerminalBrand')}</Text>
                <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalResearchWorkspace')}</Text>
              </WebView>
            </WebView>
            <WebView accessibilityRole="navigation" dataSet={{ 'personal-terminal-role': 'scope-breadcrumb' }}>
              {(['market', 'goal', 'skill'] as const).map((item) => (
                <WebPressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: scope === item }}
                  dataSet={{ 'personal-terminal-selected': scope === item ? 'true' : 'false' }}
                  key={item}
                  onPress={() => selectScope(item)}
                >
                  <PersonalTerminalIcon color={scope === item ? theme.text.primary : theme.text.metadata} name={item} size={14} />
                  <Text style={{ color: scope === item ? theme.text.primary : theme.text.metadata }}>{t(language, `personalTerminalResolution_${item}`)}</Text>
                </WebPressable>
              ))}
            </WebView>
            <WebView dataSet={{ 'personal-terminal-role': 'terminal-status' }}>
              <Text style={{ color: theme.text.primary }}>{timeframe}</Text>
              <Text style={{ color: theme.text.metadata }}>{t(language, `quantBaseline_${series.baseline.status === 'qa_only' ? 'established' : series.baseline.status}`)}</Text>
              {debugFixture && model.fixture ? <Text style={{ color: theme.text.secondary }}>{t(language, 'personalTerminalDebugFixture')} · {model.fixture.toUpperCase()}</Text> : null}
            </WebView>
          </WebView>

          <WebView dataSet={{ 'personal-terminal-role': 'workstation' }}>
            <WebView dataSet={{ 'personal-terminal-role': 'entity-rail' }}>
              <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalObjectBrowser')}</Text>
              <WebView dataSet={{ 'personal-terminal-role': 'scope-rail' }}>
                {(['market', 'goal', 'skill'] as const).map((item) => (
                  <WebPressable accessibilityRole="button" accessibilityState={{ selected: scope === item }} key={item} onPress={() => selectScope(item)}>
                    <PersonalTerminalIcon color={scope === item ? theme.text.primary : theme.text.metadata} name={item} size={15} />
                    <Text style={{ color: scope === item ? theme.text.primary : theme.text.metadata }}>{t(language, `personalTerminalResolution_${item}`)}</Text>
                  </WebPressable>
                ))}
              </WebView>
              {entities.map((item) => (
                <WebPressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: item.id === entity.id }}
                  dataSet={{ 'personal-terminal-selected': item.id === entity.id ? 'true' : 'false' }}
                  key={item.id}
                  onPress={() => selectEntity(item)}
                >
                  <Text numberOfLines={2} style={{ color: item.id === entity.id ? theme.text.primary : theme.text.secondary }}>{copy(language, item.label)}</Text>
                  <Text numberOfLines={1} style={{ color: theme.text.metadata }}>{item.seriesIds.length} {t(language, 'personalTerminalSeriesCount')}</Text>
                </WebPressable>
              ))}
            </WebView>

            <WebView dataSet={{ 'personal-terminal-role': 'center' }}>
              <WebView dataSet={{ 'personal-terminal-role': 'instrument-header' }}>
                <WebPressable accessibilityRole="button" dataSet={{ 'personal-terminal-role': 'entity-trigger' }} onPress={() => setSheet({ kind: 'entity' })}>
                  <WebView>
                    <Text style={{ color: theme.text.metadata }}>{t(language, `personalTerminalResolution_${scope}`)}</Text>
                    <Text numberOfLines={1} style={{ color: theme.text.primary }}>{copy(language, entity.label)}</Text>
                  </WebView>
                  <PersonalTerminalIcon color={theme.text.secondary} name={scope} size={15} />
                </WebPressable>
                <WebPressable accessibilityRole="button" dataSet={{ 'personal-terminal-role': 'instrument-trigger' }} onPress={() => setSheet({ kind: 'instrument' })}>
                  <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalInstrument')}</Text>
                  <WebView dataSet={{ 'personal-terminal-role': 'reading' }}>
                    <Text style={{ color: theme.text.primary }}>{number(crosshair?.value ?? current)}</Text>
                    <Text style={{ color: theme.text.secondary }}>{copy(language, series.unit)}</Text>
                  </WebView>
                  <Text numberOfLines={1} style={{ color: theme.text.secondary }}>{copy(language, series.label)}</Text>
                </WebPressable>
                <WebView dataSet={{ 'personal-terminal-role': 'baseline-readout' }}>
                  <Text style={{ color: theme.text.metadata }}>{t(language, 'quantBaseline')}</Text>
                  <Text style={{ color: theme.text.primary }}>{number(series.baseline.value)}</Text>
                  <WebView dataSet={{ 'personal-terminal-role': 'trajectory-readout' }}>
                    <PersonalTerminalIcon color={theme.text.secondary} name={directionIcon(delta)} size={13} />
                    <Text style={{ color: theme.text.secondary }}>{t(language, `personalTerminalTrajectory_${trend}`)} · {change(delta)}</Text>
                  </WebView>
                </WebView>
              </WebView>

              <WebView dataSet={{ 'personal-terminal-role': 'chart-toolbar' }}>
                <WebView dataSet={{ 'personal-terminal-role': 'timeframes' }}>
                  {available.map((item) => (
                    <TerminalButton key={item} label={item} onPress={() => measureInteraction('timeframe-switch', () => setTimeframe(item))} selected={timeframe === item} theme={theme} />
                  ))}
                </WebView>
                {viewData.observations.length ? <WebView dataSet={{ 'personal-terminal-role': 'instrument-context' }}>
                  <Text style={{ color: theme.text.metadata }}>{activeIndicatorCount} {t(language, 'personalTerminalIndicatorsActive')}</Text>
                  <Text style={{ color: theme.text.metadata }}>{chartKind === 'candle' ? t(language, 'personalTerminalCandle') : t(language, 'personalTerminalLine')}</Text>
                </WebView> : null}
              </WebView>

              <WebView dataSet={{ 'personal-terminal-role': 'human-timeline-legend' }}>
                <WebView>
                  <WebView dataSet={{ 'personal-terminal-series': 'primary' }} />
                  <Text style={{ color: theme.text.primary }}>{t(language, 'personalTerminalPrimarySeries')} · {copy(language, series.label)} · {copy(language, series.unit)}</Text>
                </WebView>
                {comparisonSeries ? (
                  <WebPressable accessibilityRole="button" onPress={() => setSheet({ kind: 'compare' })}>
                    <WebView dataSet={{ 'personal-terminal-series': 'secondary' }} />
                    <Text style={{ color: theme.text.secondary }}>{t(language, 'personalTerminalSecondarySeries')} · {copy(language, comparisonSeries.label)} · {copy(language, comparisonSeries.unit)}</Text>
                  </WebPressable>
                ) : (
                  <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalHumanTimeline')}</Text>
                )}
              </WebView>

              <WebView dataSet={{ 'personal-terminal-empty': viewData.line.length ? 'false' : 'true', 'personal-terminal-role': 'chart-wrap' }}>
                <PersonalTerminalChart
                  chartKind={chartKind}
                  comparisonSeries={comparisonSeries}
                  comparisonViewData={comparisonViewData}
                  indicators={indicators}
                  language={language}
                  onCrosshair={handleCrosshair}
                  onInteraction={handleChartRange}
                  onSelectEvent={handleEvent}
                  onSelectTime={handleChartTime}
                  rangeSelection={rangeSelection}
                  reducedMotion={reducedMotion}
                  ref={chartRef}
                  series={series}
                  theme={theme}
                  timeframe={timeframe}
                  viewData={viewData}
                />
                {crosshair ? (
                  <WebView dataSet={{ 'personal-terminal-role': 'crosshair-readout' }}>
                    <Text style={{ color: theme.text.metadata }}>{crosshair.time.slice(0, 16).replace('T', ' ')}</Text>
                    <Text style={{ color: theme.text.primary }}>{number(crosshair.value)} · Δ {change(crosshair.value == null || crosshair.baseline == null ? null : crosshair.value - crosshair.baseline)}</Text>
                  </WebView>
                ) : null}
              </WebView>

              {viewData.observations.length || series.events.length || comparisonRows.length || (scope === 'market' && model.marketMap?.length) ? <WebView dataSet={{ 'personal-terminal-role': 'toolbars' }}>
                <WebView dataSet={{ 'personal-terminal-role': 'analysis-tools' }}>
                  {viewData.observations.length ? <TerminalTool active={activeIndicatorCount > 0} icon="indicator" label={t(language, 'personalTerminalIndicators')} onPress={() => setSheet({ kind: 'indicators' })} theme={theme} /> : null}
                  {series.events.length ? <TerminalTool active={indicators.has('events')} icon="event" label={t(language, 'personalTerminalEventTool')} onPress={() => setSheet({ kind: 'events' })} theme={theme} /> : null}
                  {comparisonRows.length ? <TerminalTool active={Boolean(comparisonSeries)} icon="compare" label={t(language, 'personalTerminalCompare')} onPress={() => setSheet({ kind: 'compare' })} theme={theme} /> : null}
                  {hasComparableData ? <TerminalTool active={rangeMode} icon="range" label={rangeMode ? t(language, 'personalTerminalCancelRange') : t(language, 'personalTerminalRangeTool')} onPress={() => { setRangeMode((currentRangeMode) => !currentRangeMode); setRangeSelection({ start: null, end: null }); }} theme={theme} /> : null}
                  {viewData.observations.length ? <TerminalTool active={chartKind === 'candle'} icon="chart" label={t(language, 'personalTerminalChartType')} onPress={() => setSheet({ kind: 'chart-type' })} theme={theme} /> : null}
                  {scope === 'market' && model.marketMap?.length ? <TerminalTool icon="market" label={t(language, 'personalTerminalOverviewTool')} onPress={() => setSheet({ kind: 'market-map' })} theme={theme} /> : null}
                </WebView>
                {viewData.observations.length ? <WebView dataSet={{ 'personal-terminal-role': 'zoom-controls' }}>
                  <TerminalTool compact icon="zoom-out" label={t(language, 'personalTerminalZoomOut')} onPress={() => measureInteraction('zoom-out', () => chartRef.current?.zoomOut())} theme={theme} />
                  <TerminalTool compact icon="zoom-in" label={t(language, 'personalTerminalZoomIn')} onPress={() => measureInteraction('zoom-in', () => chartRef.current?.zoomIn())} theme={theme} />
                  <TerminalTool compact icon="reset" label={t(language, 'personalTerminalReset')} onPress={() => measureInteraction('zoom-reset', () => chartRef.current?.reset())} theme={theme} />
                </WebView> : null}
              </WebView> : null}

              <WebPressable
                accessibilityLabel={t(language, 'personalTerminalEvidenceProvenance')}
                accessibilityRole="button"
                dataSet={{ 'personal-terminal-role': 'mobile-snapshot' }}
                onPress={() => setSheet({ kind: 'evidence' })}
              >
                {!viewData.observations.length ? (
                  <WebView dataSet={{ 'personal-terminal-role': 'accumulation-state' }}>
                    <Text style={{ color: theme.text.primary }}>{t(language, 'personalTerminalAccumulationTitle')}</Text>
                    <Text style={{ color: theme.text.secondary }}>{t(language, 'personalTerminalAccumulationBody')}</Text>
                  </WebView>
                ) : [
                  [t(language, 'quantCurrent'), number(current)],
                  [t(language, 'quantBaseline'), number(series.baseline.value)],
                  [t(language, 'quantChange'), change(delta)],
                  [t(language, 'personalTerminalTrajectory'), t(language, `personalTerminalTrajectory_${trend}`)],
                  [t(language, 'personalTerminalStability'), series.qaStability ? t(language, `personalTerminalStability_${series.qaStability}`) : t(language, 'personalTerminalNotCalculated')],
                  [t(language, 'quantEvidence'), String(viewData.observations.length)],
                ].map(([label, value]) => <WebView key={label}><Text style={{ color: theme.text.metadata }}>{label}</Text><Text style={{ color: theme.text.primary }}>{value}</Text></WebView>)}
              </WebPressable>

              {longRange.length ? (
                <WebView dataSet={{ 'personal-terminal-role': 'mobile-multiscale' }}>
                  {longRange.slice(0, 3).map(([label, value]) => (
                    <WebView key={label}>
                      <Text style={{ color: theme.text.metadata }}>{label}</Text>
                      <Text style={{ color: theme.text.primary }}>{change(value)}{series.valueChangeMode === 'percentage' ? '%' : ''}</Text>
                    </WebView>
                  ))}
                </WebView>
              ) : null}

              {entity.composition?.length ? (
                <WebPressable accessibilityRole="button" dataSet={{ 'personal-terminal-role': 'mobile-portfolio' }} onPress={() => setSheet({ kind: 'composition' })}>
                  <WebView>
                    <Text style={{ color: theme.text.metadata }}>{entity.compositionBasis ? copy(language, entity.compositionBasis) : t(language, 'personalTerminalComposition')}</Text>
                    <Text numberOfLines={1} style={{ color: theme.text.primary }}>{entity.composition.slice(0, 4).map((row) => `${copy(language, row.label)} ${Math.round(row.value * 100)}%`).join(' · ')}</Text>
                  </WebView>
                  <PersonalTerminalIcon color={theme.text.secondary} name="goal" size={16} />
                </WebPressable>
              ) : null}

              {visibleSignals[0] ? (
                <WebView dataSet={{ 'personal-terminal-role': 'mobile-signal' }}>
                  <SignalRow language={language} onPress={() => setSheet({ kind: 'signal', signal: visibleSignals[0] })} signal={visibleSignals[0]} theme={theme} />
                </WebView>
              ) : null}
              {viewData.observations.length ? <WebPressable accessibilityRole="button" dataSet={{ 'personal-terminal-role': 'mobile-analyst-entry' }} onPress={() => openAnalyst()}>
                <WebView>
                  <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalAnalyst')}</Text>
                  <Text style={{ color: theme.text.primary }}>{t(language, 'personalTerminalTalkToData')}</Text>
                </WebView>
                <PersonalTerminalIcon color={theme.text.primary} name="analyst" size={16} />
              </WebPressable> : null}
            </WebView>

            <WebView dataSet={{ 'personal-terminal-role': 'side-panel' }}>
              <WebPressable
                accessibilityLabel={t(language, 'personalTerminalEvidenceProvenance')}
                accessibilityRole="button"
                dataSet={{ 'personal-terminal-role': 'panel-section' }}
                onPress={() => setSheet({ kind: 'evidence' })}
              >
                <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalQuantSnapshot')}</Text>
                {!viewData.observations.length ? (
                  <WebView dataSet={{ 'personal-terminal-role': 'accumulation-state' }}>
                    <Text style={{ color: theme.text.primary }}>{t(language, 'personalTerminalAccumulationTitle')}</Text>
                    <Text style={{ color: theme.text.secondary }}>{t(language, 'personalTerminalAccumulationBody')}</Text>
                  </WebView>
                ) : <WebView dataSet={{ 'personal-terminal-role': 'snapshot-list' }}>
                  {[
                    [t(language, 'quantCurrent'), number(current)],
                    [t(language, 'quantBaseline'), number(series.baseline.value)],
                    [t(language, 'quantChange'), change(delta)],
                    [t(language, 'personalTerminalTrajectory'), t(language, `personalTerminalTrajectory_${trend}`)],
                    [t(language, 'personalTerminalStability'), series.qaStability ? t(language, `personalTerminalStability_${series.qaStability}`) : t(language, 'personalTerminalNotCalculated')],
                    [t(language, 'quantEvidence'), `${viewData.observations.length} / ${evidence.activeDays}${t(language, 'personalTerminalDayShort')}`],
                  ].map(([label, value]) => <WebView key={label}><Text style={{ color: theme.text.metadata }}>{label}</Text><Text style={{ color: theme.text.primary }}>{value}</Text></WebView>)}
                </WebView>}
              </WebPressable>
              {longRange.length ? (
                <WebView dataSet={{ 'personal-terminal-role': 'panel-section' }}>
                  <Text style={{ color: theme.text.metadata }}>{scope === 'goal' ? t(language, 'personalTerminalGoalDevelopment') : scope === 'skill' ? t(language, 'personalTerminalSkillDevelopment') : t(language, 'personalTerminalLongRange')}</Text>
                  <WebView dataSet={{ 'personal-terminal-role': 'long-range-grid' }}>
                    {longRange.map(([label, value]) => (
                      <WebView key={label}>
                        <Text style={{ color: theme.text.metadata }}>{label}</Text>
                        <Text style={{ color: theme.text.primary }}>{change(value)}{series.valueChangeMode === 'percentage' ? '%' : ''}</Text>
                      </WebView>
                    ))}
                  </WebView>
                </WebView>
              ) : null}
              {scope === 'market' && model.breadth ? (
                <WebPressable accessibilityRole="button" dataSet={{ 'personal-terminal-role': 'panel-section' }} onPress={() => setSheet({ kind: 'market-map' })}>
                  <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalBreadth')}</Text>
                  <WebView dataSet={{ 'personal-terminal-role': 'breadth-bar' }}>
                    <WebView style={{ flex: model.breadth.improving }} /><WebView style={{ flex: model.breadth.stable }} /><WebView style={{ flex: model.breadth.weakening }} />
                  </WebView>
                  <Text style={{ color: theme.text.secondary }}>{model.breadth.improving} {t(language, 'personalTerminalImproving')} · {model.breadth.stable} {t(language, 'personalTerminalStable')} · {model.breadth.weakening} {t(language, 'personalTerminalWeakening')}</Text>
                </WebPressable>
              ) : null}
              {entity.composition?.length ? (
                <WebPressable accessibilityRole="button" dataSet={{ 'personal-terminal-role': 'panel-section' }} onPress={() => setSheet({ kind: 'composition' })}>
                  <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalComposition')}</Text>
                  <WebView dataSet={{ 'personal-terminal-role': 'composition-mini' }}>
                    {entity.composition.slice(0, 4).map((row) => (
                      <WebView key={row.id} style={{ flex: Math.max(0.15, row.value) }}>
                        <Text numberOfLines={1} style={{ color: theme.text.primary }}>{copy(language, row.label)}</Text>
                        <Text style={{ color: theme.text.secondary }}>{Math.round(row.value * 100)}%</Text>
                      </WebView>
                    ))}
                  </WebView>
                </WebPressable>
              ) : null}
              {visibleSignals.length ? (
                <WebView dataSet={{ 'personal-terminal-role': 'panel-section' }}>
                  <Text style={{ color: theme.text.metadata }}>{t(language, 'quantSignals')}</Text>
                  {visibleSignals.map((signal) => <SignalRow key={signal.id} language={language} onPress={() => setSheet({ kind: 'signal', signal })} signal={signal} theme={theme} />)}
                </WebView>
              ) : null}
              {viewData.observations.length ? <WebPressable accessibilityRole="button" dataSet={{ 'personal-terminal-role': 'analyst-entry' }} onPress={() => openAnalyst()}>
                <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalAnalyst')}</Text><Text style={{ color: theme.text.primary }}>{t(language, 'personalTerminalTalkToData')}</Text></WebView>
                <PersonalTerminalIcon color={theme.text.primary} name="analyst" size={16} />
              </WebPressable> : null}
            </WebView>

            <WebView dataSet={{ 'personal-terminal-role': 'bottom-panel' }}>
              <WebView dataSet={{ 'personal-terminal-role': 'bottom-summary' }}>
                <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalActivityAndEvents')}</Text>
                <Text style={{ color: theme.text.secondary }}>{viewData.load.length} {t(language, 'personalTerminalLoadPeriods')} · {latestEvents.length} {t(language, 'personalTerminalEvents')}</Text>
              </WebView>
              <WebView dataSet={{ 'personal-terminal-role': 'event-tape' }}>
                {latestEvents.map((event) => (
                  <WebPressable accessibilityRole="button" key={event.id} onPress={() => handleEvent(event)}>
                    <Text style={{ color: theme.text.metadata }}>{event.timestamp.slice(5, 10)}</Text>
                    <Text numberOfLines={1} style={{ color: theme.text.primary }}>{copy(language, event.title)}</Text>
                  </WebPressable>
                ))}
                {!latestEvents.length ? <Text style={{ color: theme.text.secondary }}>{t(language, 'personalTerminalNoEvents')}</Text> : null}
              </WebView>
              <WebView dataSet={{ 'personal-terminal-role': 'provenance-row' }}>
                <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalHistoricalReference')} {historicalCount}</Text>
                <Text style={{ color: theme.text.primary }}>{t(language, 'personalTerminalQuestLifeConfirmed')} {confirmedCount}</Text>
                <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalMissingNeverZero')}</Text>
              </WebView>
            </WebView>
          </WebView>

          <WebPressable accessibilityRole="button" dataSet={{ 'personal-terminal-role': 'implication' }} onPress={onNextAction}>
            <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalNextWatch')}</Text><Text numberOfLines={2} style={{ color: theme.text.primary }}>{copy(language, model.implication)}</Text></WebView>
            <PersonalTerminalIcon color={theme.text.primary} name="research" size={16} />
          </WebPressable>
          <WebView dataSet={{ 'personal-terminal-role': 'chart-license' }}>
            <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalChartTechnology')}</Text>
            <Text style={{ color: theme.text.metadata }}>{'TradingView Lightweight Charts\u2122 · Copyright 2025 TradingView, Inc.'}</Text>
            <a href="https://www.tradingview.com/" rel="noreferrer" style={{ color: theme.text.secondary }} target="_blank">tradingview.com</a>
          </WebView>
          {performanceReadout ? <Text style={{ color: theme.text.metadata }}>{performanceReadout}</Text> : null}
        </WebView>
      </WebScrollView>

      <PersonalTerminalSheet
        eyebrow={sheetMeta.eyebrow}
        language={language}
        onClose={() => setSheet(null)}
        open={sheet != null}
        reducedMotion={reducedMotion}
        subtitle={sheetMeta.subtitle}
        theme={theme}
        title={sheetMeta.title}
      >
        {sheet?.kind === 'signal' ? (
          <WebView dataSet={{ 'personal-terminal-role': 'sheet-content' }}>
            <WebView dataSet={{ 'personal-terminal-role': 'signal-inspector' }}>
              <PersonalTerminalIcon color={theme.text.primary} name="signal" size={24} />
              <Text style={{ color: theme.text.primary }}>{copy(language, sheet.signal.relationship)}</Text>
              <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalSignalNonCausal')}</Text>
            </WebView>
            <WebView dataSet={{ 'personal-terminal-role': 'sheet-data-grid' }}>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalSignalWindow')}</Text><Text style={{ color: theme.text.primary }}>{sheet.signal.windowDays == null ? timeframe : t(language, 'personalTerminalWindowDays').replace('{days}', String(sheet.signal.windowDays))}</Text></WebView>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalSignalDirection')}</Text><Text style={{ color: theme.text.primary }}>{sheet.signal.direction ? t(language, `personalTerminalTrajectory_${sheet.signal.direction === 'higher' ? 'up' : sheet.signal.direction === 'lower' ? 'down' : 'flat'}`) : '—'}</Text></WebView>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalSignalLag')}</Text><Text style={{ color: theme.text.primary }}>{sheet.signal.lagDays == null ? '—' : t(language, 'personalTerminalLagDays').replace('{days}', String(sheet.signal.lagDays))}</Text></WebView>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalSignalMaturity')}</Text><Text style={{ color: theme.text.primary }}>{t(language, `quantBaseline_${sheet.signal.maturity}`)}</Text></WebView>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'quantEvidenceSupport')}</Text><Text style={{ color: theme.text.primary }}>{sheet.signal.observationCount}</Text></WebView>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'quantCounterexamples')}</Text><Text style={{ color: theme.text.primary }}>{sheet.signal.counterexampleCount ?? '—'}</Text></WebView>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalMissingness')}</Text><Text style={{ color: theme.text.primary }}>{t(language, 'personalTerminalNotCalculated')}</Text></WebView>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'quantLastObserved')}</Text><Text style={{ color: theme.text.primary }}>{sheet.signal.lastSeenAt?.slice(0, 10) || '—'}</Text></WebView>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalEvidenceStatus')}</Text><Text style={{ color: theme.text.primary }}>{t(language, `quantSignal_${sheet.signal.status}`)}</Text></WebView>
            </WebView>
            <WebView dataSet={{ 'personal-terminal-role': 'research-notes' }}>
              <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalAlternativeExplanations')}</Text>
              <Text style={{ color: theme.text.secondary }}>{t(language, 'personalTerminalAlternativeExplanationsBody')}</Text>
              <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalKnownLimitations')}</Text>
            </WebView>
            <Text style={{ color: theme.text.secondary }}>{copy(language, sheet.signal.limitation)}</Text>
          </WebView>
        ) : null}
        {sheet?.kind === 'event' ? (
          <WebView dataSet={{ 'personal-terminal-role': 'sheet-content' }}>
            <Text style={{ color: theme.text.primary }}>{copy(language, sheet.event.detail)}</Text>
            <WebView dataSet={{ 'personal-terminal-role': 'sheet-data-grid' }}>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalEventCategory')}</Text><Text style={{ color: theme.text.primary }}>{t(language, `personalTerminalEventCategory_${sheet.event.category}`)}</Text></WebView>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalSource')}</Text><Text style={{ color: theme.text.primary }}>{t(language, sheet.event.provenance === 'historical_reference' ? 'personalTerminalProvenanceHistorical' : sheet.event.provenance === 'derived_fixture' ? 'personalTerminalProvenanceDerived' : 'personalTerminalProvenanceManual')}</Text></WebView>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalEventScope')}</Text><Text style={{ color: theme.text.primary }}>{eventScopeLabel(language, model, sheet.event.scopeId)}</Text></WebView>
            </WebView>
            <Text style={{ color: theme.text.secondary }}>{t(language, 'personalTerminalEventNotCause')}</Text>
            <Text style={{ color: theme.text.metadata }}>{t(language, 'quantSourceCount')}: {sheet.event.sourceIds.length}</Text>
          </WebView>
        ) : null}
        {sheet?.kind === 'observation' ? (
          <WebView dataSet={{ 'personal-terminal-role': 'sheet-content' }}>
            {(() => {
              const related = comparisonSeries ? nearestObservation(comparisonSeries, sheet.selection.time) : null;
              const nearbyEvents = latestEvents.filter((event) => Math.abs(new Date(event.timestamp).getTime() - new Date(sheet.selection.time).getTime()) <= 86_400_000);
              return (
                <>
                  <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalSelectedMovement')}</Text>
            <WebView dataSet={{ 'personal-terminal-role': 'sheet-data-grid' }}>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'quantCurrent')}</Text><Text style={{ color: theme.text.primary }}>{number(sheet.selection.value)}</Text></WebView>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'quantBaseline')}</Text><Text style={{ color: theme.text.primary }}>{number(sheet.selection.baseline)}</Text></WebView>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalBaselineDeviation')}</Text><Text style={{ color: theme.text.primary }}>{change(sheet.selection.value == null || sheet.selection.baseline == null ? null : sheet.selection.value - sheet.selection.baseline)}</Text></WebView>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalRelatedChanges')}</Text><Text style={{ color: theme.text.primary }}>{related ? `${number(related.value)} ${copy(language, comparisonSeries!.unit)}` : '—'}</Text></WebView>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalEventTool')}</Text><Text style={{ color: theme.text.primary }}>{nearbyEvents.length}</Text></WebView>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalSignalCount')}</Text><Text style={{ color: theme.text.primary }}>{visibleSignals.length}</Text></WebView>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'quantSourceCount')}</Text><Text style={{ color: theme.text.primary }}>{sheet.selection.sourceIds.length}</Text></WebView>
            </WebView>
            <Text style={{ color: theme.text.secondary }}>{copy(language, series.limitation)}</Text>
                  <TerminalButton label={t(language, 'personalTerminalAnalyseMovement')} onPress={openAnalyst} theme={theme} />
                </>
              );
            })()}
          </WebView>
        ) : null}
        {sheet?.kind === 'range' ? (() => {
          const difference = sheet.end.value == null || sheet.start.value == null ? null : sheet.end.value - sheet.start.value;
          const percentage = difference != null && sheet.start.value && series.valueChangeMode === 'percentage' ? difference / sheet.start.value * 100 : null;
          const rangeStart = new Date(sheet.start.time).getTime();
          const rangeEnd = new Date(sheet.end.time).getTime();
          const rangeObservations = viewData.observations.filter((row) => {
            const value = new Date(row.timestamp).getTime();
            return value >= rangeStart && value <= rangeEnd;
          });
          const rangeEvents = latestEvents.filter((event) => {
            const value = new Date(event.timestamp).getTime();
            return value >= rangeStart && value <= rangeEnd;
          });
          const relatedStart = comparisonSeries ? nearestObservation(comparisonSeries, sheet.start.time) : null;
          const relatedEnd = comparisonSeries ? nearestObservation(comparisonSeries, sheet.end.time) : null;
          const relatedDifference = relatedStart && relatedEnd ? relatedEnd.value - relatedStart.value : null;
          const baselineDeviation = sheet.end.value == null || series.baseline.value == null ? null : sheet.end.value - series.baseline.value;
          return (
            <WebView dataSet={{ 'personal-terminal-role': 'sheet-content' }}>
              <WebView dataSet={{ 'personal-terminal-role': 'sheet-data-grid' }}>
                <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalRangeStart')}</Text><Text style={{ color: theme.text.primary }}>{number(sheet.start.value)}</Text></WebView>
                <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalRangeEnd')}</Text><Text style={{ color: theme.text.primary }}>{number(sheet.end.value)}</Text></WebView>
                <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'quantChange')}</Text><Text style={{ color: theme.text.primary }}>{change(difference)}{percentage == null ? '' : ` · ${change(percentage)}%`}</Text></WebView>
                <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalBaselineDeviation')}</Text><Text style={{ color: theme.text.primary }}>{change(baselineDeviation)}</Text></WebView>
                <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalExecutionChange')}</Text><Text style={{ color: theme.text.primary }}>{relatedDifference == null ? '—' : `${change(relatedDifference)} ${comparisonSeries ? copy(language, comparisonSeries.unit) : ''}`}</Text></WebView>
                <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalStability')}</Text><Text style={{ color: theme.text.primary }}>{series.qaStability ? t(language, `personalTerminalStability_${series.qaStability}`) : t(language, 'personalTerminalNotCalculated')}</Text></WebView>
                <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalObservations')}</Text><Text style={{ color: theme.text.primary }}>{rangeObservations.length}</Text></WebView>
                <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalEventTool')}</Text><Text style={{ color: theme.text.primary }}>{rangeEvents.length}</Text></WebView>
                <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalSignalCount')}</Text><Text style={{ color: theme.text.primary }}>{visibleSignals.length}</Text></WebView>
                <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalMissing')}</Text><Text style={{ color: theme.text.primary }}>{Math.max(0, Math.round((rangeEnd - rangeStart) / 86_400_000) + 1 - new Set(rangeObservations.map((row) => row.timestamp.slice(0, 10))).size)}</Text></WebView>
              </WebView>
              <Text style={{ color: theme.text.secondary }}>{t(language, 'personalTerminalRangeLimitation')}</Text>
              <WebView dataSet={{ 'personal-terminal-role': 'range-actions' }}>
                <TerminalButton label={t(language, 'personalTerminalPreviousPeriod')} onPress={() => openAnalyst('comparePeriod')} theme={theme} />
                <TerminalButton label={t(language, 'personalTerminalAnalyseMovement')} onPress={openAnalyst} theme={theme} />
                <TerminalButton label={t(language, 'personalTerminalPrompt_similarPeriods')} onPress={() => setShowSimilarPeriods((currentValue) => !currentValue)} selected={showSimilarPeriods} theme={theme} />
              </WebView>
              {showSimilarPeriods && model.similarPeriods?.length ? (
                <WebView dataSet={{ 'personal-terminal-role': 'similar-periods' }}>
                  <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalSimilarPeriods')}</Text>
                  {model.similarPeriods.map((period) => (
                    <WebView key={period.id}>
                      <Text style={{ color: theme.text.primary }}>{period.start.slice(5)} — {period.end.slice(5)}</Text>
                      <Text style={{ color: theme.text.secondary }}>{change(period.primaryChange)} · {period.observationCount} {t(language, 'personalTerminalObservations')}</Text>
                    </WebView>
                  ))}
                  <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalSimilarPeriodsFixture')}</Text>
                </WebView>
              ) : null}
            </WebView>
          );
        })() : null}
        {sheet?.kind === 'analyst' ? (
          <WebView dataSet={{ 'personal-terminal-role': 'sheet-content' }}>
            <WebView dataSet={{ 'personal-terminal-role': 'analyst-context' }}>
              <PersonalTerminalIcon color={theme.text.primary} name="analyst" size={23} />
              <WebView>
                <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalSelectedContext')}</Text>
                <Text style={{ color: theme.text.primary }}>{copy(language, entity.label)} · {copy(language, series.label)} · {timeframe}</Text>
                <Text style={{ color: theme.text.secondary }}>{rangeSelection.start ? `${rangeSelection.start.slice(0, 10)} — ${rangeSelection.end?.slice(0, 10) || t(language, 'personalTerminalPendingRange')}` : t(language, 'personalTerminalVisibleRangeContext')}</Text>
              </WebView>
            </WebView>
            <WebView dataSet={{ 'personal-terminal-role': 'analyst-sections' }}>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalAnalystObserved')}</Text><Text style={{ color: theme.text.primary }}>{copy(language, series.label)} · {t(language, `personalTerminalTrajectory_${trend}`)} · {change(delta)}</Text></WebView>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalRelatedChanges')}</Text><Text style={{ color: theme.text.secondary }}>{comparisonSeries ? `${copy(language, comparisonSeries.label)} · ${copy(language, comparisonSeries.unit)} · ${t(language, 'personalTerminalIndependentScale')}` : t(language, 'personalTerminalNoComparison')}</Text></WebView>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalKnownSignals')}</Text><Text style={{ color: theme.text.secondary }}>{visibleSignals.length ? copy(language, visibleSignals[0].title) : t(language, 'quantNoSignalYet')}</Text></WebView>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalAnalystLimitations')}</Text><Text style={{ color: theme.text.secondary }}>{debugFixture || !model.fixture ? copy(language, series.limitation) : t(language, 'personalTerminalEvidenceBoundary')}</Text></WebView>
            </WebView>
            <WebView dataSet={{ 'personal-terminal-role': 'analyst-prompts' }}>
              {['whyChange', 'comparePeriod', 'beforeMovement', 'similarPeriods', 'relatedSignals', 'unknown'].map((key) => (
                <TerminalButton key={key} label={t(language, `personalTerminalPrompt_${key}`)} onPress={() => setAnalystPrompt(key)} selected={analystPrompt === key} theme={theme} />
              ))}
            </WebView>
            <WebView dataSet={{ 'personal-terminal-role': 'analyst-next-question' }}>
              <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalAnalystNextQuestion')}</Text>
              <Text style={{ color: theme.text.secondary }}>{analystPrompt ? t(language, 'personalTerminalAnalystShellReady') : t(language, 'personalTerminalAnalystShellLimitation')}</Text>
            </WebView>
          </WebView>
        ) : null}
        {sheet?.kind === 'evidence' ? (
          <WebView dataSet={{ 'personal-terminal-role': 'sheet-content' }}>
            <WebView dataSet={{ 'personal-terminal-role': 'sheet-data-grid' }}>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalObservations')}</Text><Text style={{ color: theme.text.primary }}>{viewData.observations.length}</Text></WebView>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'quantActiveDays')}</Text><Text style={{ color: theme.text.primary }}>{evidence.activeDays}</Text></WebView>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalMissing')}</Text><Text style={{ color: theme.text.primary }}>{evidence.missing ?? '—'}</Text></WebView>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalQuestLifeConfirmed')}</Text><Text style={{ color: theme.text.primary }}>{confirmedCount}</Text></WebView>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalHistoricalReference')}</Text><Text style={{ color: theme.text.primary }}>{historicalCount}</Text></WebView>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalLatest')}</Text><Text style={{ color: theme.text.primary }}>{evidence.latest?.slice(0, 10) || '—'}</Text></WebView>
            </WebView>
            <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalEvidenceNotConfidence')}</Text>
            <Text style={{ color: theme.text.secondary }}>{debugFixture || !model.fixture ? copy(language, series.limitation) : t(language, 'personalTerminalEvidenceBoundary')}</Text>
          </WebView>
        ) : null}
        {sheet?.kind === 'composition' ? (
          <WebView dataSet={{ 'personal-terminal-role': 'composition-sheet' }}>
            {entity.composition?.map((row) => (
              <WebPressable
                accessibilityRole="button"
                key={row.id}
                onPress={() => {
                  const target = model.entities.find((item) => item.id === row.id);
                  if (target) { setScope(target.scope); selectEntity(target); }
                }}
              >
                <Text style={{ color: theme.text.primary }}>{copy(language, row.label)}</Text>
                <WebView><WebView style={{ width: `${row.value * 100}%`, backgroundColor: theme.glow.primary }} /></WebView>
                <Text style={{ color: theme.text.secondary }}>{Math.round(row.value * 100)}% · {t(language, `personalTerminalDirection_${row.direction}`)}</Text>
              </WebPressable>
            ))}
            <Text style={{ color: theme.text.secondary }}>{t(language, 'personalTerminalCompositionNotContribution')}</Text>
          </WebView>
        ) : null}
        {sheet?.kind === 'entity' ? (
          <WebView dataSet={{ 'personal-terminal-role': 'entity-sheet' }}>
            {entities.map((item) => (
              <WebPressable accessibilityRole="button" key={item.id} onPress={() => selectEntity(item)}>
                <Text style={{ color: item.id === entity.id ? theme.text.primary : theme.text.secondary }}>{copy(language, item.label)}</Text>
                <Text style={{ color: theme.text.metadata }}>{copy(language, item.context)}</Text>
              </WebPressable>
            ))}
          </WebView>
        ) : null}
        {sheet?.kind === 'instrument' ? (
          <WebView dataSet={{ 'personal-terminal-role': 'entity-sheet' }}>
            {seriesRows.map((item) => (
              <WebPressable accessibilityRole="button" accessibilityState={{ selected: item.id === series.id }} key={item.id} onPress={() => { selectSeries(item); setSheet(null); }}>
                <Text style={{ color: item.id === series.id ? theme.text.primary : theme.text.secondary }}>{copy(language, item.label)}</Text>
                <Text style={{ color: theme.text.metadata }}>{copy(language, item.unit)} · {t(language, `quantBaseline_${item.baseline.status === 'qa_only' ? 'established' : item.baseline.status}`)}</Text>
              </WebPressable>
            ))}
          </WebView>
        ) : null}
        {sheet?.kind === 'compare' ? (
          <WebView dataSet={{ 'personal-terminal-role': 'control-sheet' }}>
            <WebPressable accessibilityRole="button" accessibilityState={{ selected: comparisonSeries == null }} onPress={() => selectComparison(null)}>
              <PersonalTerminalIcon color={comparisonSeries == null ? theme.text.primary : theme.text.metadata} name="compare" size={17} />
              <Text style={{ color: comparisonSeries == null ? theme.text.primary : theme.text.secondary }}>{t(language, 'personalTerminalNoComparison')}</Text>
              <Text style={{ color: theme.text.metadata }}>{copy(language, series.label)} · {copy(language, series.unit)}</Text>
            </WebPressable>
            {comparisonRows.map((item) => (
              <WebPressable accessibilityRole="button" accessibilityState={{ selected: comparisonSeries?.id === item.id }} key={item.id} onPress={() => selectComparison(item)}>
                <PersonalTerminalIcon color={comparisonSeries?.id === item.id ? theme.text.primary : theme.text.metadata} name="compare" size={17} />
                <Text style={{ color: comparisonSeries?.id === item.id ? theme.text.primary : theme.text.secondary }}>{copy(language, item.label)}</Text>
                <Text style={{ color: theme.text.metadata }}>{copy(language, item.unit)} · {t(language, 'personalTerminalIndependentScale')}</Text>
              </WebPressable>
            ))}
          </WebView>
        ) : null}
        {sheet?.kind === 'indicators' ? (
          <WebView dataSet={{ 'personal-terminal-role': 'control-sheet' }}>
            {(['baseline', 'emaShort', 'emaLong', 'load', 'density', 'events'] as const).map((item) => (
              <WebPressable accessibilityRole="checkbox" accessibilityState={{ checked: indicators.has(item) }} key={item} onPress={() => toggleIndicator(item)}>
                <PersonalTerminalIcon color={indicators.has(item) ? theme.text.primary : theme.text.metadata} name="indicator" size={17} />
                <Text style={{ color: indicators.has(item) ? theme.text.primary : theme.text.secondary }}>{t(language, `personalTerminalIndicator_${item}`)}</Text>
                <Text style={{ color: theme.text.metadata }}>{indicators.has(item) ? t(language, 'personalTerminalEnabled') : t(language, 'personalTerminalDisabled')}</Text>
              </WebPressable>
            ))}
          </WebView>
        ) : null}
        {sheet?.kind === 'chart-type' ? (
          <WebView dataSet={{ 'personal-terminal-role': 'control-sheet' }}>
            <WebPressable accessibilityRole="button" accessibilityState={{ selected: chartKind === 'line' }} onPress={() => { measureInteraction('chart-line', () => setChartKind('line')); setSheet(null); }}>
              <PersonalTerminalIcon color={theme.text.primary} name="chart" size={17} /><Text style={{ color: theme.text.primary }}>{t(language, 'personalTerminalLine')}</Text><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalLineHint')}</Text>
            </WebPressable>
            <WebPressable accessibilityRole="button" accessibilityState={{ disabled: !candleAvailable, selected: chartKind === 'candle' }} disabled={!candleAvailable} onPress={() => { measureInteraction('chart-candle', () => setChartKind('candle')); setSheet(null); }}>
              <PersonalTerminalIcon color={candleAvailable ? theme.text.primary : theme.text.metadata} name="chart" size={17} /><Text style={{ color: candleAvailable ? theme.text.primary : theme.text.metadata }}>{t(language, 'personalTerminalCandle')}</Text><Text style={{ color: theme.text.metadata }}>{candleAvailable ? t(language, 'personalTerminalCandleHint') : t(language, 'personalTerminalCandleUnavailable')}</Text>
            </WebPressable>
          </WebView>
        ) : null}
        {sheet?.kind === 'events' ? (
          <WebView dataSet={{ 'personal-terminal-role': 'event-sheet' }}>
            {latestEvents.map((event) => (
              <WebPressable accessibilityRole="button" key={event.id} onPress={() => handleEvent(event)}>
                <PersonalTerminalIcon color={theme.text.secondary} name="event" size={16} />
                <WebView><Text style={{ color: theme.text.primary }}>{copy(language, event.title)}</Text><Text style={{ color: theme.text.metadata }}>{event.timestamp.slice(0, 16).replace('T', ' ')}</Text></WebView>
              </WebPressable>
            ))}
            {!latestEvents.length ? <Text style={{ color: theme.text.secondary }}>{t(language, 'personalTerminalNoEvents')}</Text> : null}
          </WebView>
        ) : null}
        {sheet?.kind === 'market-map' ? (
          <WebView dataSet={{ 'personal-terminal-role': 'market-overview-sheet' }}>
            {model.breadth ? (
              <WebView dataSet={{ 'personal-terminal-role': 'breadth-detail' }}>
                {(['improving', 'stable', 'weakening'] as const).map((item) => <WebView key={item}><Text style={{ color: theme.text.metadata }}>{t(language, `personalTerminal_${item}`)}</Text><Text style={{ color: theme.text.primary }}>{model.breadth?.[item]}</Text></WebView>)}
              </WebView>
            ) : null}
            <WebView dataSet={{ 'personal-terminal-role': 'market-map' }}>
              {model.marketMap?.map((row) => (
                <WebPressable accessibilityRole="button" key={`${row.entityId}:${row.id}`} onPress={() => {
                  const target = model.entities.find((item) => item.id === row.id);
                  if (target) { setScope(target.scope); selectEntity(target); }
                }} style={{ flexGrow: Math.max(1, row.value * 10) }}>
                  <Text style={{ color: theme.text.primary }}>{copy(language, row.label)}</Text>
                  <Text style={{ color: theme.text.secondary }}>{Math.round(row.value * 100)}% · {t(language, `personalTerminalDirection_${row.direction}`)}</Text>
                </WebPressable>
              ))}
            </WebView>
            <Text style={{ color: theme.text.secondary }}>{t(language, 'personalTerminalMarketMapLimitation')}</Text>
          </WebView>
        ) : null}
      </PersonalTerminalSheet>
    </>
  );
}
