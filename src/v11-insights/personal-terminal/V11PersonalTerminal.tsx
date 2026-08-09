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
import V11RebaselineIcon from '../../v11-stage2-rebaseline/V11RebaselineIcon';
import PersonalTerminalChart, {
  type PersonalTerminalChartHandle,
  type PersonalTerminalChartSelection,
} from './PersonalTerminalChart';
import PersonalTerminalSheet from './PersonalTerminalSheet';
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

function direction(value: number | null) {
  if (value == null || Math.abs(value) < 0.02) return '→';
  return value > 0 ? '↗' : '↘';
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

function measureInteraction(label: string, action: () => void) {
  const startedAt = typeof performance === 'undefined' ? 0 : performance.now();
  action();
  if (typeof window === 'undefined') return;
  window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
    const rows = ((window as any).__questlifePersonalTerminalInteractions || []) as Array<{ label: string; duration: number }>;
    rows.push({ label, duration: Math.round((performance.now() - startedAt) * 10) / 10 });
    (window as any).__questlifePersonalTerminalInteractions = rows.slice(-80);
  }));
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
      <WebView>
        <Text style={{ color: theme.text.metadata }}>{t(language, `quantSignal_${signal.status}`)}</Text>
        <Text style={{ color: theme.text.primary }}>{signal.observationCount}</Text>
      </WebView>
      <WebView>
        <Text numberOfLines={1} style={{ color: theme.text.primary }}>{copy(language, signal.title)}</Text>
        <Text numberOfLines={1} style={{ color: theme.text.secondary }}>{copy(language, signal.relationship)}</Text>
      </WebView>
      <V11RebaselineIcon color={theme.text.secondary} name="arrow" size={14} />
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
  const [chartKind, setChartKind] = useState<PersonalTerminalChartKind>(query().get('quantChart') === 'candle' ? 'candle' : 'line');
  const [timeframe, setTimeframe] = useState<PersonalTerminalTimeframe>(() => initialTimeframe(model, defaultSeries));
  const [indicators, setIndicators] = useState<Set<PersonalTerminalIndicator>>(initialIndicators);
  const [crosshair, setCrosshair] = useState<PersonalTerminalChartSelection | null>(null);
  const [rangeMode, setRangeMode] = useState(query().get('rangeMode') === '1');
  const [rangeSelection, setRangeSelection] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });
  const [sheet, setSheet] = useState<SheetState>(null);
  const [analystPrompt, setAnalystPrompt] = useState<string | null>(null);
  const chartRef = useRef<PersonalTerminalChartHandle | null>(null);

  useEffect(() => onSheetStateChange?.(sheet != null), [onSheetStateChange, sheet]);
  useEffect(() => {
    setScope(model.defaultScope);
    setEntityId(model.defaultEntityId);
    setSeriesId(model.defaultSeriesId);
  }, [model]);

  const entities = useMemo(() => model.entities.filter((row) => row.scope === scope), [model.entities, scope]);
  const entity = model.entities.find((row) => row.id === entityId) || entities[0] || model.entities[0];
  const seriesRows = entity ? entitySeries(model, entity) : [];
  const series = model.series.find((row) => row.id === seriesId) || seriesRows[0] || model.series[0];
  const now = useMemo(() => new Date(model.range.end ? `${model.range.end}T23:59:59.000` : Date.now()), [model.range.end]);
  const available = useMemo(() => series ? availableTimeframes(series, now) : ['1M'] as PersonalTerminalTimeframe[], [now, series]);
  const viewData = useMemo(() => series ? buildPersonalTerminalViewData(series, timeframe, now) : null, [now, series, timeframe]);
  const current = viewData?.line[viewData.line.length - 1]?.value ?? null;
  const delta = current == null || series?.baseline.value == null ? null : current - series.baseline.value;
  const candleAvailable = Boolean(series?.supportsCandle && viewData?.candles.length);
  const lastPoint = viewData?.line[viewData.line.length - 1] ?? null;
  const historicalCount = viewData?.observations.filter((row) => row.provenance === 'historical_reference').length || 0;
  const confirmedCount = viewData?.observations.filter((row) => row.provenance === 'questlife_confirmed').length || 0;

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
    setSeriesId(firstEntity.seriesIds[0]);
    setCrosshair(null);
    setRangeSelection({ start: null, end: null });
  });
  const selectEntity = (next: PersonalTerminalEntity) => measureInteraction('entity-switch', () => {
    setEntityId(next.id);
    setSeriesId(next.seriesIds[0]);
    setCrosshair(null);
    setRangeSelection({ start: null, end: null });
    setSheet(null);
  });
  const selectSeries = (next: PersonalTerminalSeries) => measureInteraction('metric-switch', () => {
    setSeriesId(next.id);
    setCrosshair(null);
    setRangeSelection({ start: null, end: null });
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
      setSheet({ kind: 'range', start, end });
      return { start: start.time, end: end.time };
    });
  }, [rangeMode, series]);
  const handleCrosshair = useCallback((selection: PersonalTerminalChartSelection | null) => setCrosshair(selection), []);

  const openAnalyst = () => {
    setAnalystPrompt(null);
    setSheet({ kind: 'analyst' });
  };
  const latestEvents = series?.events.filter((event) => !viewData?.observations.length || new Date(event.timestamp) >= new Date(viewData.observations[0].timestamp)).slice(-4) || [];
  const visibleSignals = model.signals.slice(0, 3);

  if (!entity || !series || !viewData) return null;

  const sheetMeta = (() => {
    if (!sheet) return { eyebrow: '', title: '', subtitle: undefined as string | undefined };
    if (sheet.kind === 'signal') return { eyebrow: t(language, 'personalTerminalSignalDetail'), title: copy(language, sheet.signal.title), subtitle: t(language, `quantSignal_${sheet.signal.status}`) };
    if (sheet.kind === 'event') return { eyebrow: t(language, 'personalTerminalEventDetail'), title: copy(language, sheet.event.title), subtitle: sheet.event.timestamp.slice(0, 16).replace('T', ' ') };
    if (sheet.kind === 'observation') return { eyebrow: t(language, 'personalTerminalObservationDetail'), title: `${number(sheet.selection.value)} ${copy(language, series.unit)}`, subtitle: sheet.selection.time.slice(0, 16).replace('T', ' ') };
    if (sheet.kind === 'range') return { eyebrow: t(language, 'personalTerminalRangeAnalysis'), title: `${sheet.start.time.slice(0, 10)} → ${sheet.end.time.slice(0, 10)}`, subtitle: copy(language, series.label) };
    if (sheet.kind === 'analyst') return { eyebrow: t(language, 'personalTerminalAnalyst'), title: t(language, 'personalTerminalTalkToData'), subtitle: `${copy(language, entity.label)} · ${copy(language, series.label)} · ${timeframe}` };
    if (sheet.kind === 'composition') return { eyebrow: t(language, 'personalTerminalComposition'), title: copy(language, entity.label), subtitle: entity.compositionBasis ? copy(language, entity.compositionBasis) : undefined };
    if (sheet.kind === 'entity') return { eyebrow: t(language, 'personalTerminalSelectEntity'), title: t(language, `personalTerminalScope_${scope}`), subtitle: t(language, 'personalTerminalOneInterface') };
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
            <WebView>
              <Text style={{ color: theme.text.primary }}>{t(language, 'personalTerminalTitle')}</Text>
              <Text style={{ color: theme.text.metadata }}>{model.fixture ? `${t(language, 'quantQaFixture')} · ${model.fixture.toUpperCase()}` : t(language, 'personalTerminalLiveData')}</Text>
            </WebView>
            <WebView accessibilityRole="tablist" dataSet={{ 'personal-terminal-role': 'scope-switch' }}>
              {(['market', 'goal', 'skill'] as const).map((item) => (
                <TerminalButton key={item} label={t(language, `personalTerminalScope_${item}`)} onPress={() => selectScope(item)} selected={scope === item} theme={theme} />
              ))}
            </WebView>
          </WebView>

          <WebView dataSet={{ 'personal-terminal-role': 'workstation' }}>
            <WebView dataSet={{ 'personal-terminal-role': 'entity-rail' }}>
              <Text style={{ color: theme.text.metadata }}>{t(language, `personalTerminalScope_${scope}`)}</Text>
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
                    <Text style={{ color: theme.text.metadata }}>{t(language, `personalTerminalScope_${scope}`)}</Text>
                    <Text numberOfLines={1} style={{ color: theme.text.primary }}>{copy(language, entity.label)}</Text>
                  </WebView>
                  <V11RebaselineIcon color={theme.text.secondary} name="chevron-down" size={14} />
                </WebPressable>
                <WebView dataSet={{ 'personal-terminal-role': 'reading' }}>
                  <Text style={{ color: theme.text.primary }}>{number(crosshair?.value ?? current)}</Text>
                  <Text style={{ color: theme.text.secondary }}>{copy(language, series.unit)}</Text>
                  <Text style={{ color: theme.text.primary }}>{direction(delta)} {change(delta)}</Text>
                </WebView>
                <WebView dataSet={{ 'personal-terminal-role': 'baseline-readout' }}>
                  <Text style={{ color: theme.text.metadata }}>{t(language, 'quantBaseline')}</Text>
                  <Text style={{ color: theme.text.primary }}>{number(series.baseline.value)}</Text>
                  <Text style={{ color: theme.text.metadata }}>{t(language, `personalTerminalBaseline_${series.baseline.referenceKind}`)}</Text>
                </WebView>
              </WebView>

              <WebView accessibilityRole="tablist" dataSet={{ 'personal-terminal-role': 'series-switch' }}>
                {seriesRows.map((item) => (
                  <TerminalButton key={item.id} label={copy(language, item.label)} onPress={() => selectSeries(item)} selected={series.id === item.id} theme={theme} />
                ))}
              </WebView>

              <WebView dataSet={{ 'personal-terminal-role': 'chart-toolbar' }}>
                <WebView dataSet={{ 'personal-terminal-role': 'chart-kind' }}>
                  <TerminalButton label={t(language, 'personalTerminalLine')} onPress={() => measureInteraction('chart-line', () => setChartKind('line'))} selected={chartKind === 'line'} theme={theme} />
                  <TerminalButton disabled={!candleAvailable} label={t(language, 'personalTerminalCandle')} onPress={() => measureInteraction('chart-candle', () => setChartKind('candle'))} selected={chartKind === 'candle'} theme={theme} />
                </WebView>
                <WebView dataSet={{ 'personal-terminal-role': 'timeframes' }}>
                  {available.map((item) => (
                    <TerminalButton key={item} label={item} onPress={() => measureInteraction('timeframe-switch', () => setTimeframe(item))} selected={timeframe === item} theme={theme} />
                  ))}
                </WebView>
              </WebView>

              <WebView dataSet={{ 'personal-terminal-role': 'chart-wrap' }}>
                <PersonalTerminalChart
                  chartKind={chartKind}
                  indicators={indicators}
                  language={language}
                  onCrosshair={handleCrosshair}
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

              <WebView dataSet={{ 'personal-terminal-role': 'indicator-strip' }}>
                {(['emaShort', 'emaLong', 'baseline', 'load', 'events'] as const).map((item) => (
                  <TerminalButton key={item} label={t(language, `personalTerminalIndicator_${item}`)} onPress={() => toggleIndicator(item)} selected={indicators.has(item)} theme={theme} />
                ))}
                <WebView dataSet={{ 'personal-terminal-role': 'zoom-controls' }}>
                  <TerminalButton label="−" onPress={() => measureInteraction('zoom-out', () => chartRef.current?.zoomOut())} theme={theme} />
                  <TerminalButton label="+" onPress={() => measureInteraction('zoom-in', () => chartRef.current?.zoomIn())} theme={theme} />
                  <TerminalButton label={t(language, 'personalTerminalReset')} onPress={() => measureInteraction('zoom-reset', () => chartRef.current?.reset())} theme={theme} />
                </WebView>
              </WebView>

              <WebView dataSet={{ 'personal-terminal-role': 'analysis-actions' }}>
                <TerminalButton label={rangeMode ? t(language, 'personalTerminalCancelRange') : t(language, 'personalTerminalSelectRange')} onPress={() => { setRangeMode((currentRangeMode) => !currentRangeMode); setRangeSelection({ start: null, end: null }); }} selected={rangeMode} theme={theme} />
                <TerminalButton label={t(language, 'personalTerminalAnalyseMovement')} onPress={openAnalyst} theme={theme} />
                <TerminalButton label={t(language, 'quantEvidence')} onPress={() => setSheet({ kind: 'evidence' })} theme={theme} />
                {latestEvents[0] ? <TerminalButton label={t(language, 'personalTerminalLatestEvent')} onPress={() => setSheet({ kind: 'event', event: latestEvents[0] })} theme={theme} /> : null}
              </WebView>

              <WebView dataSet={{ 'personal-terminal-role': 'mobile-signal' }}>
                {visibleSignals[0] ? <SignalRow language={language} onPress={() => setSheet({ kind: 'signal', signal: visibleSignals[0] })} signal={visibleSignals[0]} theme={theme} /> : (
                  <Text style={{ color: theme.text.secondary }}>{t(language, 'quantNoSignalYet')}</Text>
                )}
              </WebView>
            </WebView>

            <WebView dataSet={{ 'personal-terminal-role': 'side-panel' }}>
              <WebView dataSet={{ 'personal-terminal-role': 'panel-section' }}>
                <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalNow')}</Text>
                <WebView dataSet={{ 'personal-terminal-role': 'now-grid' }}>
                  <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'quantCurrent')}</Text><Text style={{ color: theme.text.primary }}>{number(current)}</Text></WebView>
                  <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'quantBaseline')}</Text><Text style={{ color: theme.text.primary }}>{number(series.baseline.value)}</Text></WebView>
                  <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'quantChange')}</Text><Text style={{ color: theme.text.primary }}>{change(delta)}</Text></WebView>
                  <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'quantEvidence')}</Text><Text style={{ color: theme.text.primary }}>{viewData.observations.length}</Text></WebView>
                </WebView>
              </WebView>
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
              <WebView dataSet={{ 'personal-terminal-role': 'panel-section' }}>
                <Text style={{ color: theme.text.metadata }}>{t(language, 'quantSignals')}</Text>
                {visibleSignals.length ? visibleSignals.map((signal) => <SignalRow key={signal.id} language={language} onPress={() => setSheet({ kind: 'signal', signal })} signal={signal} theme={theme} />) : <Text style={{ color: theme.text.secondary }}>{t(language, 'quantNoSignalYet')}</Text>}
              </WebView>
              <WebPressable accessibilityRole="button" dataSet={{ 'personal-terminal-role': 'analyst-entry' }} onPress={openAnalyst}>
                <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalAnalyst')}</Text><Text style={{ color: theme.text.primary }}>{t(language, 'personalTerminalTalkToData')}</Text></WebView>
                <V11RebaselineIcon color={theme.text.primary} name="arrow" size={15} />
              </WebPressable>
            </WebView>

            <WebView dataSet={{ 'personal-terminal-role': 'bottom-panel' }}>
              <WebView dataSet={{ 'personal-terminal-role': 'bottom-summary' }}>
                <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalActivityAndEvents')}</Text>
                <Text style={{ color: theme.text.secondary }}>{viewData.load.length} {t(language, 'personalTerminalLoadPeriods')} · {latestEvents.length} {t(language, 'personalTerminalEvents')}</Text>
              </WebView>
              <WebView dataSet={{ 'personal-terminal-role': 'event-tape' }}>
                {latestEvents.map((event) => (
                  <WebPressable accessibilityRole="button" key={event.id} onPress={() => setSheet({ kind: 'event', event })}>
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
            <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'quantImplication')}</Text><Text numberOfLines={2} style={{ color: theme.text.primary }}>{copy(language, model.implication)}</Text></WebView>
            <V11RebaselineIcon color={theme.text.primary} name="arrow" size={16} />
          </WebPressable>
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
            <Text style={{ color: theme.text.primary }}>{copy(language, sheet.signal.relationship)}</Text>
            <WebView dataSet={{ 'personal-terminal-role': 'sheet-data-grid' }}>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'quantEvidenceSupport')}</Text><Text style={{ color: theme.text.primary }}>{sheet.signal.observationCount}</Text></WebView>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'quantCounterexamples')}</Text><Text style={{ color: theme.text.primary }}>{sheet.signal.counterexampleCount ?? '—'}</Text></WebView>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'quantLastObserved')}</Text><Text style={{ color: theme.text.primary }}>{sheet.signal.lastSeenAt?.slice(0, 10) || '—'}</Text></WebView>
            </WebView>
            <Text style={{ color: theme.text.secondary }}>{copy(language, sheet.signal.limitation)}</Text>
          </WebView>
        ) : null}
        {sheet?.kind === 'event' ? (
          <WebView dataSet={{ 'personal-terminal-role': 'sheet-content' }}>
            <Text style={{ color: theme.text.primary }}>{copy(language, sheet.event.detail)}</Text>
            <Text style={{ color: theme.text.secondary }}>{t(language, 'personalTerminalEventNotCause')}</Text>
            <Text style={{ color: theme.text.metadata }}>{t(language, 'quantSourceCount')}: {sheet.event.sourceIds.length}</Text>
          </WebView>
        ) : null}
        {sheet?.kind === 'observation' ? (
          <WebView dataSet={{ 'personal-terminal-role': 'sheet-content' }}>
            <WebView dataSet={{ 'personal-terminal-role': 'sheet-data-grid' }}>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'quantCurrent')}</Text><Text style={{ color: theme.text.primary }}>{number(sheet.selection.value)}</Text></WebView>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'quantBaseline')}</Text><Text style={{ color: theme.text.primary }}>{number(sheet.selection.baseline)}</Text></WebView>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'quantSourceCount')}</Text><Text style={{ color: theme.text.primary }}>{sheet.selection.sourceIds.length}</Text></WebView>
            </WebView>
            <Text style={{ color: theme.text.secondary }}>{copy(language, series.limitation)}</Text>
          </WebView>
        ) : null}
        {sheet?.kind === 'range' ? (() => {
          const difference = sheet.end.value == null || sheet.start.value == null ? null : sheet.end.value - sheet.start.value;
          const percentage = difference != null && sheet.start.value && series.valueChangeMode === 'percentage' ? difference / sheet.start.value * 100 : null;
          return (
            <WebView dataSet={{ 'personal-terminal-role': 'sheet-content' }}>
              <WebView dataSet={{ 'personal-terminal-role': 'sheet-data-grid' }}>
                <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalRangeStart')}</Text><Text style={{ color: theme.text.primary }}>{number(sheet.start.value)}</Text></WebView>
                <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalRangeEnd')}</Text><Text style={{ color: theme.text.primary }}>{number(sheet.end.value)}</Text></WebView>
                <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'quantChange')}</Text><Text style={{ color: theme.text.primary }}>{change(difference)}{percentage == null ? '' : ` · ${change(percentage)}%`}</Text></WebView>
              </WebView>
              <Text style={{ color: theme.text.secondary }}>{t(language, 'personalTerminalRangeLimitation')}</Text>
              <TerminalButton label={t(language, 'personalTerminalAskAboutRange')} onPress={openAnalyst} theme={theme} />
            </WebView>
          );
        })() : null}
        {sheet?.kind === 'analyst' ? (
          <WebView dataSet={{ 'personal-terminal-role': 'sheet-content' }}>
            <WebView dataSet={{ 'personal-terminal-role': 'analyst-context' }}>
              <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalSelectedContext')}</Text>
              <Text style={{ color: theme.text.primary }}>{copy(language, entity.label)} · {copy(language, series.label)} · {timeframe}</Text>
              <Text style={{ color: theme.text.secondary }}>{rangeSelection.start ? `${rangeSelection.start.slice(0, 10)} → ${rangeSelection.end?.slice(0, 10) || '…'}` : t(language, 'personalTerminalVisibleRangeContext')}</Text>
            </WebView>
            <WebView dataSet={{ 'personal-terminal-role': 'analyst-prompts' }}>
              {['whyChange', 'comparePeriod', 'beforeMovement', 'relatedSignals'].map((key) => (
                <TerminalButton key={key} label={t(language, `personalTerminalPrompt_${key}`)} onPress={() => setAnalystPrompt(key)} selected={analystPrompt === key} theme={theme} />
              ))}
            </WebView>
            <Text style={{ color: theme.text.secondary }}>
              {analystPrompt ? t(language, 'personalTerminalAnalystShellReady') : t(language, 'personalTerminalAnalystShellLimitation')}
            </Text>
          </WebView>
        ) : null}
        {sheet?.kind === 'evidence' ? (
          <WebView dataSet={{ 'personal-terminal-role': 'sheet-content' }}>
            <WebView dataSet={{ 'personal-terminal-role': 'sheet-data-grid' }}>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalQuestLifeConfirmed')}</Text><Text style={{ color: theme.text.primary }}>{confirmedCount}</Text></WebView>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalHistoricalReference')}</Text><Text style={{ color: theme.text.primary }}>{historicalCount}</Text></WebView>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalMissing')}</Text><Text style={{ color: theme.text.primary }}>{Math.max(0, viewData.line.length - viewData.observations.length)}</Text></WebView>
            </WebView>
            <Text style={{ color: theme.text.secondary }}>{copy(language, series.limitation)}</Text>
          </WebView>
        ) : null}
        {sheet?.kind === 'composition' ? (
          <WebView dataSet={{ 'personal-terminal-role': 'composition-sheet' }}>
            {entity.composition?.map((row) => (
              <WebView key={row.id}>
                <Text style={{ color: theme.text.primary }}>{copy(language, row.label)}</Text>
                <WebView><WebView style={{ width: `${row.value * 100}%`, backgroundColor: theme.glow.primary }} /></WebView>
                <Text style={{ color: theme.text.secondary }}>{Math.round(row.value * 100)}% · {t(language, `personalTerminalDirection_${row.direction}`)}</Text>
              </WebView>
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
      </PersonalTerminalSheet>
    </>
  );
}
