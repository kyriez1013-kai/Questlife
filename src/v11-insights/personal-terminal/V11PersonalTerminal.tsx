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
import V11PersonalMarketOverview from './V11PersonalMarketOverview';
import PersonalTerminalSheet from './PersonalTerminalSheet';
import PersonalTerminalIcon, { type PersonalTerminalIconName } from './PersonalTerminalIcon';
import type {
  PersonalTerminalChartKind,
  PersonalTerminalCandle,
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
import { resolvePersonalTerminalDisplayChange } from './personalTerminalValueMath';
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

function reading(language: Lang, series: PersonalTerminalSeries, value: number | null) {
  if (value == null) return '—';
  if (series.semantic === 'timing') {
    const minutes = Math.round(value + 12 * 60) % (24 * 60);
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  }
  if (series.constructKey === 'sleep.duration') {
    return new Intl.NumberFormat(language === 'zh' ? 'zh-CN' : 'en-AU', { maximumFractionDigits: 1 }).format(value / 60);
  }
  return new Intl.NumberFormat(language === 'zh' ? 'zh-CN' : 'en-AU', { maximumFractionDigits: 1 }).format(value);
}

function readingUnit(language: Lang, series: PersonalTerminalSeries) {
  return series.constructKey === 'sleep.duration'
    ? t(language, 'personalTerminalV041Unit_hours')
    : copy(language, series.unit);
}

function changeReading(
  language: Lang,
  series: PersonalTerminalSeries,
  currentValue: number | null,
  referenceValue: number | null,
) {
  const resolved = resolvePersonalTerminalDisplayChange(series, currentValue, referenceValue);
  const value = resolved.percent ?? resolved.absolute;
  if (value == null) return '—';
  const formatted = new Intl.NumberFormat(language === 'zh' ? 'zh-CN' : 'en-AU', { maximumFractionDigits: 1 }).format(value);
  if (resolved.percent != null) return `${value > 0 ? '+' : ''}${formatted}%`;
  const suffix = series.semantic === 'timing' || series.constructKey === 'sleep.duration'
    ? ` ${t(language, 'personalTerminalV041Unit_minutes')}`
    : '';
  return `${value > 0 ? '+' : ''}${formatted}${suffix}`;
}

function maturityLabel(language: Lang, series: PersonalTerminalSeries) {
  if (series.adaptive) return t(language, `personalMarketMaturity_${series.adaptive.state}`);
  return series.maturityLabel
    ? t(language, `personalTerminalV041Maturity_${series.maturityLabel}`)
    : t(language, `quantBaseline_${series.baseline.status === 'qa_only' ? 'established' : series.baseline.status}`);
}

function baselineLabel(language: Lang, series: PersonalTerminalSeries) {
  if (series.baseline.referenceKind === 'historical') return t(language, 'personalMarketHistoricalReference');
  if (series.baseline.referenceKind === 'active') return t(language, 'personalMarketActiveReference');
  return t(language, 'personalMarketPersonalReference');
}

function adaptiveSummaryRows(language: Lang, series: PersonalTerminalSeries): Array<[string, string]> | null {
  const adaptive = series.adaptive;
  if (!adaptive || adaptive.referenceAvailable) return null;
  const unit = readingUnit(language, series);
  const withUnit = (value: number | null) => `${reading(language, series, value)} ${unit}`.trim();
  const observationCount = `${adaptive.observationCount} ${t(language, 'personalMarketObservationsShort')}`;
  if (adaptive.state === 'first_observation') {
    return [
      [t(language, 'personalTerminalCurrentObservation'), withUnit(adaptive.current)],
      [t(language, 'personalTerminalRecordedAt'), adaptive.lastObservedAt ? timestampLabel(language, adaptive.lastObservedAt) : '—'],
      [t(language, 'quantEvidence'), observationCount],
    ];
  }
  if (adaptive.state === 'comparison_available') {
    return [
      [t(language, 'personalTerminalCurrentObservation'), withUnit(adaptive.current)],
      [t(language, 'personalTerminalPreviousObservation'), withUnit(adaptive.previous)],
      [t(language, 'personalTerminalChangeFromPrevious'), changeReading(language, series, adaptive.current, adaptive.previous)],
      [t(language, 'quantEvidence'), observationCount],
    ];
  }
  if (adaptive.state === 'short_window_forming') {
    return [
      [t(language, 'personalTerminalCurrentObservation'), withUnit(adaptive.current)],
      [t(language, 'personalTerminalObservedRange'), `${reading(language, series, adaptive.rangeLow)} — ${reading(language, series, adaptive.rangeHigh)} ${unit}`.trim()],
      [t(language, 'personalTerminalFirstToLatest'), changeReading(language, series, adaptive.current, adaptive.first)],
      [t(language, 'quantEvidence'), observationCount],
    ];
  }
  return null;
}

function adaptiveAnalystBody(language: Lang, series: PersonalTerminalSeries) {
  const adaptive = series.adaptive;
  if (!adaptive || adaptive.referenceAvailable) return null;
  if (adaptive.state === 'first_observation') return t(language, 'personalTerminalAdaptiveFirstObservationBody');
  if (adaptive.state === 'comparison_available') {
    return `${t(language, 'personalTerminalAdaptiveSecondObservationBody')} ${t(language, 'personalTerminalChangeFromPrevious')}: ${changeReading(language, series, adaptive.current, adaptive.previous)}.`;
  }
  if (adaptive.state === 'short_window_forming') {
    return `${t(language, 'personalTerminalAdaptiveShortWindowBody')} ${t(language, 'personalTerminalObservedRange')}: ${reading(language, series, adaptive.rangeLow)} — ${reading(language, series, adaptive.rangeHigh)} ${readingUnit(language, series)}.`;
  }
  return null;
}

function timestampLabel(language: Lang, value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function candleBucketLabel(language: Lang, candle: PersonalTerminalCandle) {
  if (candle.bucketType === 'OBSERVATION_COUNT') {
    return `${t(language, 'personalTerminalObservationBucket')} · ${candle.bucketSize ?? candle.observationCount}`;
  }
  if (candle.bucketSemantics.includes('calendar_week')) return t(language, 'personalTerminalCandleBucketWeek');
  if (candle.bucketSemantics.includes('calendar_month')) return t(language, 'personalTerminalCandleBucketMonth');
  if (candle.bucketSemantics.includes('calendar_quarter')) return t(language, 'personalTerminalCandleBucketQuarter');
  return t(language, 'personalTerminalCandleBucketPeriod');
}

function candleMeaning(language: Lang, candle: PersonalTerminalCandle) {
  if (candle.bucketType === 'OBSERVATION_COUNT') {
    return t(language, 'personalTerminalObservationCandleMeaning')
      .replace('{count}', String(candle.bucketSize ?? candle.observationCount));
  }
  return t(language, 'personalTerminalTimeCandleMeaning');
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

function isHistoricalProvenance(value: PersonalTerminalSeries['observations'][number]['provenance']) {
  return value === 'historical_reference' || value === 'passive_device';
}

function analystItemLabel(language: Lang, type: string) {
  return t(language, `personalTerminalV041Analyst_${type}`);
}

function analystItemBody(
  language: Lang,
  series: PersonalTerminalSeries,
  item: NonNullable<PersonalTerminalModel['analyst']>['items'][number],
) {
  if (item.type === 'COVERAGE' && series.coverage) {
    const firstObservedAt = series.observations[0]?.timestamp;
    const lastObservedAt = series.observations[series.observations.length - 1]?.timestamp;
    return t(language, 'personalTerminalV041AnalystCoverageBody')
      .replace('{count}', String(series.coverage.observedDays))
      .replace('{start}', firstObservedAt ? timestampLabel(language, firstObservedAt) : '—')
      .replace('{end}', lastObservedAt ? timestampLabel(language, lastObservedAt) : '—');
  }
  if (item.type === 'RECENT_VS_REFERENCE' && series.recentChange) {
    return t(language, 'personalTerminalV041AnalystReferenceBody')
      .replace('{recent}', reading(language, series, series.recentChange.recentMedian))
      .replace('{reference}', reading(language, series, series.recentChange.referenceMedian))
      .replace('{change}', changeReading(language, series, series.recentChange.recentMedian, series.recentChange.referenceMedian));
  }
  return t(language, 'personalTerminalV041AnalystEvidenceBody').replace('{count}', String(item.evidenceCount));
}

function signalWindowLabel(language: Lang, value?: string) {
  if (value === 'registered_previous_night') return t(language, 'personalTerminalSignalWindowPreviousNight');
  if (value === 'registered_next_day_state') return t(language, 'personalTerminalSignalWindowNextDayState');
  return value || '—';
}

function signalEvidenceLabel(language: Lang, value?: string) {
  if (value?.startsWith('E2')) return t(language, 'personalTerminalSignalEvidenceRepeated');
  if (value?.startsWith('E1')) return t(language, 'personalTerminalSignalEvidenceEarly');
  return t(language, 'personalTerminalSignalEvidenceInsufficient');
}

function signalAlternativeLabel(language: Lang, value: string) {
  if (value === 'schedule context') return t(language, 'personalTerminalAlternativeSchedule');
  if (value === 'measurement selection') return t(language, 'personalTerminalAlternativeMeasurement');
  if (value === 'unmeasured daily context') return t(language, 'personalTerminalAlternativeUnmeasured');
  return value;
}

function signalExampleReading(language: Lang, construct: string | undefined, value: number, unit: string) {
  if (construct === 'sleep.duration') {
    const hours = new Intl.NumberFormat(language === 'zh' ? 'zh-CN' : 'en-AU', { maximumFractionDigits: 1 }).format(value / 60);
    return `${hours} ${t(language, 'personalTerminalV041Unit_hours')}`;
  }
  return `${new Intl.NumberFormat(language === 'zh' ? 'zh-CN' : 'en-AU', { maximumFractionDigits: 1 }).format(value)} ${unit}`;
}

function NoDataTerminal({
  language,
  model,
  onNextAction,
  performanceReadout,
  theme,
}: {
  language: Lang;
  model: PersonalTerminalModel;
  onNextAction: () => void;
  performanceReadout?: string | null;
  theme: V11ThemeTokens;
}) {
  const debugSource = query().get('debugQuantSource') === '1';
  return (
    <WebScrollView contentContainerStyle={{ paddingBottom: 116 }} dataSet={{ 'personal-terminal-role': 'scroll' }} showsVerticalScrollIndicator={false}>
      <WebView dataSet={{ 'personal-terminal-availability': 'none', 'personal-terminal-role': 'terminal' }}>
        <WebView dataSet={{ 'personal-terminal-role': 'topbar' }}>
          <WebView dataSet={{ 'personal-terminal-role': 'brand-context' }}>
            <PersonalTerminalIcon color={theme.text.primary} name="market" size={17} />
            <WebView>
              <Text style={{ color: theme.text.primary }}>{t(language, 'personalTerminalResolution_market')}</Text>
              <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalV041NoDataContext')}</Text>
            </WebView>
          </WebView>
          <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalV041Maturity_no_personal_data')}</Text>
        </WebView>
        <WebView dataSet={{ 'personal-terminal-role': 'no-data-terminal' }}>
          <WebView dataSet={{ 'personal-terminal-role': 'no-data-field' }}>
            <PersonalTerminalIcon color={theme.text.secondary} name="research" size={24} />
            <Text style={{ color: theme.text.primary }}>{t(language, 'personalTerminalV041NoDataTitle')}</Text>
            <Text style={{ color: theme.text.secondary }}>{t(language, 'personalTerminalV041NoDataBody')}</Text>
            <WebView dataSet={{ 'personal-terminal-role': 'no-data-calibration' }}>
              <WebView /><WebView /><WebView /><WebView /><WebView /><WebView /><WebView />
            </WebView>
            <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalV041NoDataBoundary')}</Text>
          </WebView>
          <WebPressable accessibilityRole="button" dataSet={{ 'personal-terminal-role': 'no-data-action' }} onPress={onNextAction}>
            <Text style={{ color: theme.text.primary }}>{copy(language, model.nextAction || model.implication)}</Text>
            <PersonalTerminalIcon color={theme.text.primary} name="trend-up" size={16} />
          </WebPressable>
        </WebView>
        {debugSource && model.sourceMetadata ? (
          <WebView dataSet={{ 'personal-terminal-role': 'source-debug' }}>
            <Text style={{ color: theme.text.metadata }}>{model.sourceMetadata.schemaVersion}</Text>
            <Text style={{ color: theme.text.metadata }}>{model.sourceMetadata.quantCommit.slice(0, 12)} · {model.sourceMetadata.canonicalArtifactHash.slice(0, 16)}</Text>
          </WebView>
        ) : null}
        {performanceReadout ? <Text style={{ color: theme.text.metadata }}>{performanceReadout}</Text> : null}
      </WebView>
    </WebScrollView>
  );
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

function initialTimeframe(model: PersonalTerminalModel, series?: PersonalTerminalSeries) {
  if (!series) return '30D';
  const requested = query().get('quantTimeframe') as PersonalTerminalTimeframe | null;
  const available = availableTimeframes(series, new Date(model.range.end ? `${model.range.end}T23:59:59.000` : Date.now()));
  if (requested && available.includes(requested)) return requested;
  if (series.defaultTimeframe && available.includes(series.defaultTimeframe)) return series.defaultTimeframe;
  if (model.fixture === 'historical' && available.includes('1Y')) return '1Y';
  if (model.fixture && model.fixture !== 'forming' && available.includes('3M')) return '3M';
  return available[0] || '1M';
}

function initialMarketOverview(model: PersonalTerminalModel) {
  if (!model.marketOverview) return false;
  const requested = query().get('quantView');
  if (requested === 'instrument') return false;
  if (requested === 'market') return true;
  const lifecycle = model.lifecycleScenario || '';
  return lifecycle === 'no_data'
    || lifecycle.startsWith('market_')
    || lifecycle === 'day30'
    || lifecycle === 'day90'
    || lifecycle === 'day180';
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
  const [marketOverviewOpen, setMarketOverviewOpen] = useState(() => initialMarketOverview(model));
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
  const debugSource = query().get('debugQuantSource') === '1';

  useEffect(() => onSheetStateChange?.(sheet != null), [onSheetStateChange, sheet]);
  useEffect(() => {
    setScope(model.defaultScope);
    setEntityId(model.defaultEntityId);
    setSeriesId(model.defaultSeriesId);
    setComparisonSeriesId(null);
    setMarketOverviewOpen(initialMarketOverview(model));
  }, [model]);

  const scopes = useMemo(() => (['market', 'goal', 'skill'] as const).filter((item) => model.entities.some((row) => row.scope === item)), [model.entities]);
  const entities = useMemo(() => model.entities.filter((row) => row.scope === scope), [model.entities, scope]);
  const entity = model.entities.find((row) => row.id === entityId) || entities[0] || model.entities[0];
  const rawSeriesRows = entity ? entitySeries(model, entity) : [];
  const seriesRows = rawSeriesRows.filter((row) => !row.qaDerivedIndex || debugFixture);
  const series = model.series.find((row) => row.id === seriesId) || seriesRows[0] || model.series[0];
  const now = useMemo(() => new Date(model.range.end ? `${model.range.end}T23:59:59.000` : Date.now()), [model.range.end]);
  const available = useMemo(() => series ? availableTimeframes(series, now) : [] as PersonalTerminalTimeframe[], [now, series]);
  const viewData = useMemo(() => series ? buildPersonalTerminalViewData(series, timeframe, now) : null, [now, series, timeframe]);
  const comparisonRows = useMemo(() => (
    entity ? availableComparisonSeries(model, entity.id, series?.id || '').filter((row) => (!row.qaDerivedIndex || debugFixture) && row.observations.length > 0) : []
  ), [debugFixture, entity, model, series?.id]);
  const comparisonSeries = comparisonRows.find((row) => row.id === comparisonSeriesId) || null;
  const comparisonViewData = useMemo(() => (
    comparisonSeries && availableTimeframes(comparisonSeries, now).includes(timeframe)
      ? buildPersonalTerminalViewData(comparisonSeries, timeframe, now)
      : null
  ), [comparisonSeries, now, timeframe]);
  const current = viewData?.line[viewData.line.length - 1]?.value ?? null;
  const referenceAvailable = series?.adaptive
    ? series.adaptive.referenceAvailable
    : series?.baseline.value != null;
  const comparisonReference = referenceAvailable
    ? series?.baseline.value ?? null
    : series?.adaptive?.previous ?? null;
  const delta = current == null || comparisonReference == null ? null : current - comparisonReference;
  const candleAvailable = Boolean(
    series?.supportsCandle
      && (!series.adaptive || series.adaptive.availableViews.includes('candle'))
      && viewData?.candles.length,
  );
  const lastPoint = viewData?.line[viewData.line.length - 1] ?? null;
  const historicalCount = series?.provenanceSummary?.historicalCount
    ?? viewData?.observations.filter((row) => isHistoricalProvenance(row.provenance)).length
    ?? 0;
  const confirmedCount = series?.provenanceSummary?.activeCount
    ?? viewData?.observations.filter((row) => !isHistoricalProvenance(row.provenance)).length
    ?? 0;
  const evidence = series?.coverage ? {
    activeDays: series.coverage.observedDays,
    missing: series.coverage.expectedDays == null ? null : Math.max(0, series.coverage.expectedDays - series.coverage.observedDays),
    latest: series.coverage.lastAvailableAt || series.latestAt || null,
  } : viewData ? evidenceSummary(viewData.observations, timeframe) : { activeDays: 0, missing: null, latest: null };
  const trend = direction(delta);
  const configuredIndicators = series?.availableIndicators || (['baseline', 'emaShort', 'emaLong', 'load', 'density', 'events'] as PersonalTerminalIndicator[]);
  const availableIndicators = series?.adaptive && !referenceAvailable
    ? configuredIndicators.filter((item) => item === 'load' || item === 'density' || item === 'events')
    : configuredIndicators;
  const activeIndicatorCount = [...indicators].filter((item) => item !== 'events' && availableIndicators.includes(item)).length;
  const hasComparableData = (viewData?.observations.length || 0) > 1;
  const longRange = useMemo(() => !series || series.precomputedViews ? [] : ([
    ['7D', periodChange(series, now, 7)],
    ['30D', periodChange(series, now, 30)],
    ['90D', periodChange(series, now, 90)],
    ['YTD', periodChange(series, now, Math.max(1, Math.ceil((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86_400_000)))],
    ['1Y', periodChange(series, now, 365)],
    ['ALL', periodChange(series, now, null)],
  ] as Array<[string, number | null]>).filter((row) => row[1] != null), [now, series]);
  const adaptiveRows = series ? adaptiveSummaryRows(language, series) : null;

  useEffect(() => {
    if (!available.includes(timeframe)) setTimeframe(series?.defaultTimeframe || available[0] || '30D');
  }, [available, series?.defaultTimeframe, timeframe]);
  useEffect(() => {
    if (chartKind === 'candle' && !candleAvailable) setChartKind('line');
  }, [candleAvailable, chartKind]);

  const selectScope = (next: PersonalTerminalScope) => measureInteraction('scope-switch', () => {
    if (next === 'market' && model.marketOverview) {
      setMarketOverviewOpen(true);
      setScope('market');
      setSheet(null);
      return;
    }
    const firstEntity = model.entities.find((row) => row.scope === next);
    if (!firstEntity) return;
    setScope(next);
    setEntityId(firstEntity.id);
    const nextSeries = entitySeries(model, firstEntity).find((row) => !row.qaDerivedIndex || debugFixture);
    setSeriesId(nextSeries?.id || firstEntity.seriesIds[0]);
    setCrosshair(null);
    setRangeSelection({ start: null, end: null });
    setComparisonSeriesId(null);
    setMarketOverviewOpen(false);
  });
  const selectEntity = (next: PersonalTerminalEntity) => measureInteraction('entity-switch', () => {
    setEntityId(next.id);
    const nextSeries = entitySeries(model, next).find((row) => !row.qaDerivedIndex || debugFixture);
    setSeriesId(nextSeries?.id || next.seriesIds[0]);
    setCrosshair(null);
    setRangeSelection({ start: null, end: null });
    setComparisonSeriesId(null);
    setSheet(null);
    setMarketOverviewOpen(false);
  });
  const selectSeries = (next: PersonalTerminalSeries) => measureInteraction('metric-switch', () => {
    setSeriesId(next.id);
    setTimeframe(next.defaultTimeframe || availableTimeframes(next, now)[0] || '30D');
    setCrosshair(null);
    setRangeSelection({ start: null, end: null });
    setComparisonSeriesId(null);
    setMarketOverviewOpen(false);
  });

  const selectOverviewSeries = (nextSeriesId: string) => measureInteraction('market-instrument-drilldown', () => {
    const nextSeries = model.series.find((row) => row.id === nextSeriesId);
    if (!nextSeries) return;
    const nextEntity = model.entities.find((row) => row.id === nextSeries.entityId);
    if (nextEntity) {
      setScope(nextEntity.scope);
      setEntityId(nextEntity.id);
    }
    setSeriesId(nextSeries.id);
    setTimeframe(nextSeries.defaultTimeframe || availableTimeframes(nextSeries, now)[0] || 'ALL');
    setChartKind(nextSeries.adaptive?.defaultView === 'point' ? 'line' : nextSeries.adaptive?.defaultView || 'line');
    setComparisonSeriesId(null);
    setCrosshair(null);
    setRangeSelection({ start: null, end: null });
    setMarketOverviewOpen(false);
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
  const handleChartSelection = useCallback((selected: PersonalTerminalChartSelection) => {
    if (!series) return;
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

  if (marketOverviewOpen && model.marketOverview) {
    return (
      <WebScrollView
        contentContainerStyle={{ paddingBottom: 116 }}
        dataSet={{ 'personal-terminal-role': 'scroll' }}
        showsVerticalScrollIndicator={false}
      >
        <WebView dataSet={{ 'personal-terminal-adaptive-version': '3.12', 'personal-terminal-role': 'terminal', 'personal-terminal-version': '3.11' }}>
          <V11PersonalMarketOverview
            language={language}
            onNextAction={onNextAction}
            onSelectScope={selectScope}
            onSelectSeries={selectOverviewSeries}
            overview={model.marketOverview}
            performanceReadout={performanceReadout}
            theme={theme}
          />
        </WebView>
      </WebScrollView>
    );
  }

  if (!entity || !series || !viewData) {
    return <NoDataTerminal language={language} model={model} onNextAction={onNextAction} performanceReadout={performanceReadout} theme={theme} />;
  }

  const latestEvents = series?.events.filter((event) => !viewData?.observations.length || new Date(event.timestamp) >= new Date(viewData.observations[0].timestamp)).slice(-4) || [];
  const visibleSignals = scope === 'market' ? model.signals.slice(0, 3) : [];
  const analystItems = (model.analyst?.items || []).filter((item) => item.constructKey === series?.constructKey).slice(0, 4);
  const earlyAnalystBody = adaptiveAnalystBody(language, series);
  const analystPreviewRows = earlyAnalystBody ? [{
    label: t(language, series.adaptive?.state === 'first_observation'
      ? 'personalTerminalAdaptiveFirstObservation'
      : series.adaptive?.state === 'comparison_available'
        ? 'personalTerminalAdaptiveSecondObservation'
        : 'personalTerminalAdaptiveShortWindow'),
    body: earlyAnalystBody,
  }, {
    label: t(language, 'personalTerminalAnalystCoverage'),
    body: `${series.adaptive?.observationCount ?? viewData.observations.length} ${t(language, 'personalMarketObservationsShort')} · ${t(language, 'personalTerminalReferenceForming')}`,
  }] : analystItems.length ? analystItems.slice(0, 3).map((item) => ({
    label: analystItemLabel(language, item.type),
    body: analystItemBody(language, series, item),
  })) : [
    {
      label: t(language, 'personalTerminalAnalystObserved'),
      body: t(language, 'personalTerminalAnalystCurrentReference')
        .replace('{current}', `${reading(language, series, current)} ${readingUnit(language, series)}`)
        .replace('{reference}', `${reading(language, series, series.baseline.value)} ${readingUnit(language, series)}`)
        .replace('{change}', changeReading(language, series, current, series.baseline.value)),
    },
    {
      label: t(language, 'personalTerminalAnalystRelated'),
      body: visibleSignals[0]
        ? copy(language, visibleSignals[0].title)
        : comparisonSeries
          ? `${copy(language, comparisonSeries.label)} · ${t(language, 'personalTerminalIndependentScale')}`
          : t(language, 'personalTerminalV041NoEligibleRelationship'),
    },
    {
      label: t(language, 'personalTerminalAnalystCoverage'),
      body: t(language, 'personalTerminalAnalystCoverageSummary')
        .replace('{observed}', String(evidence.activeDays))
        .replace('{missing}', evidence.missing == null ? '—' : String(evidence.missing)),
    },
  ];

  const sheetMeta = (() => {
    if (!sheet) return { eyebrow: '', title: '', subtitle: undefined as string | undefined };
    if (sheet.kind === 'signal') return { eyebrow: t(language, 'personalTerminalSignalDetail'), title: copy(language, sheet.signal.title), subtitle: t(language, `quantSignal_${sheet.signal.status}`) };
    if (sheet.kind === 'event') return { eyebrow: t(language, 'personalTerminalEventDetail'), title: copy(language, sheet.event.title), subtitle: sheet.event.timestamp.slice(0, 16).replace('T', ' ') };
    if (sheet.kind === 'observation') return {
      eyebrow: sheet.selection.candle ? t(language, 'personalTerminalObservationalCandle') : t(language, 'personalTerminalObservationDetail'),
      title: `${reading(language, series, sheet.selection.value)} ${readingUnit(language, series)}`,
      subtitle: sheet.selection.candle
        ? `${timestampLabel(language, sheet.selection.candle.openAt)} — ${timestampLabel(language, sheet.selection.candle.closeAt)}`
        : timestampLabel(language, sheet.selection.time),
    };
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
        <WebView dataSet={{ 'personal-terminal-role': 'terminal', 'personal-terminal-version': '3.12' }}>
          <WebView dataSet={{ 'personal-terminal-role': 'topbar' }}>
            <WebView dataSet={{ 'personal-terminal-role': 'brand-context' }}>
              <PersonalTerminalIcon color={theme.text.primary} name="market" size={17} />
              <WebView>
                <Text numberOfLines={1} style={{ color: theme.text.primary }}>{copy(language, entity.label)}</Text>
                <Text numberOfLines={1} style={{ color: theme.text.metadata }}>{copy(language, series.label)}</Text>
              </WebView>
            </WebView>
            <WebView accessibilityRole="navigation" dataSet={{ 'personal-terminal-role': 'scope-breadcrumb' }}>
              {scopes.map((item) => (
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
              <Text style={{ color: theme.text.metadata }}>{maturityLabel(language, series)}</Text>
              {series.coverage?.observedDays ? (
                <Text style={{ color: theme.text.metadata }}>
                  {t(language, 'personalTerminalV041CoverageDays').replace('{count}', String(series.coverage.observedDays))}
                </Text>
              ) : null}
              {debugFixture && model.fixture ? <Text style={{ color: theme.text.secondary }}>{t(language, 'personalTerminalDebugFixture')} · {model.fixture.toUpperCase()}</Text> : null}
            </WebView>
          </WebView>

          <WebView dataSet={{ 'personal-terminal-role': 'workstation' }}>
            <WebView dataSet={{ 'personal-terminal-role': 'entity-rail' }}>
              <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalObjectBrowser')}</Text>
              <WebView dataSet={{ 'personal-terminal-role': 'scope-rail' }}>
                {scopes.map((item) => (
                  <WebPressable accessibilityRole="button" accessibilityState={{ selected: scope === item }} key={item} onPress={() => selectScope(item)}>
                    <PersonalTerminalIcon color={scope === item ? theme.text.primary : theme.text.metadata} name={item} size={15} />
                    <Text style={{ color: scope === item ? theme.text.primary : theme.text.metadata }}>{t(language, `personalTerminalResolution_${item}`)}</Text>
                  </WebPressable>
                ))}
              </WebView>
              {entities.length > 1 ? entities.map((item) => (
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
              )) : null}
              <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalAvailableInstruments')}</Text>
              <WebView dataSet={{ 'personal-terminal-role': 'instrument-rail' }}>
                {seriesRows.map((item) => (
                  <WebPressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: item.id === series.id }}
                    dataSet={{ 'personal-terminal-selected': item.id === series.id ? 'true' : 'false' }}
                    key={item.id}
                    onPress={() => selectSeries(item)}
                  >
                    <Text numberOfLines={1} style={{ color: item.id === series.id ? theme.text.primary : theme.text.secondary }}>{copy(language, item.label)}</Text>
                    <Text style={{ color: theme.text.metadata }}>{reading(language, item, item.latestValue ?? item.observations[item.observations.length - 1]?.value ?? null)} {readingUnit(language, item)}</Text>
                  </WebPressable>
                ))}
              </WebView>
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
                    <Text style={{ color: theme.text.primary }}>{reading(language, series, crosshair?.value ?? current)}</Text>
                    <Text style={{ color: theme.text.secondary }}>{readingUnit(language, series)}</Text>
                  </WebView>
                  <Text numberOfLines={1} style={{ color: theme.text.secondary }}>{copy(language, series.label)}</Text>
                </WebPressable>
                <WebView dataSet={{ 'personal-terminal-adaptive': series.adaptive?.state || 'legacy', 'personal-terminal-role': 'baseline-readout' }}>
                  {adaptiveRows ? (
                    <>
                      <Text style={{ color: theme.text.metadata }}>{maturityLabel(language, series)}</Text>
                      <Text style={{ color: theme.text.primary }}>{adaptiveRows[1]?.[1] || adaptiveRows[0]?.[1]}</Text>
                      <Text style={{ color: theme.text.secondary }}>{adaptiveRows[2]?.[0]} · {adaptiveRows[2]?.[1]}</Text>
                    </>
                  ) : (
                    <>
                      <Text style={{ color: theme.text.metadata }}>{baselineLabel(language, series)}</Text>
                      <Text style={{ color: theme.text.primary }}>{reading(language, series, series.baseline.value)}</Text>
                      <WebView dataSet={{ 'personal-terminal-role': 'trajectory-readout' }}>
                        <PersonalTerminalIcon color={theme.text.secondary} name={directionIcon(delta)} size={13} />
                        <Text style={{ color: theme.text.secondary }}>{t(language, `personalTerminalTrajectory_${trend}`)} · {changeReading(language, series, current, series.baseline.value)}</Text>
                      </WebView>
                    </>
                  )}
                </WebView>
              </WebView>

              <WebView dataSet={{ 'personal-terminal-role': 'chart-toolbar' }}>
                <WebView dataSet={{ 'personal-terminal-role': 'timeframes' }}>
                  {available.map((item) => (
                    <TerminalButton key={item} label={item} onPress={() => measureInteraction('timeframe-switch', () => setTimeframe(item))} selected={timeframe === item} theme={theme} />
                  ))}
                </WebView>
                {viewData.observations.length && candleAvailable ? (
                  <WebView dataSet={{ 'personal-terminal-role': 'view-switch' }}>
                    <TerminalButton label={t(language, 'personalTerminalLine')} onPress={() => measureInteraction('chart-line', () => setChartKind('line'))} selected={chartKind === 'line'} theme={theme} />
                    <TerminalButton label={t(language, 'personalTerminalCandle')} onPress={() => measureInteraction('chart-candle', () => setChartKind('candle'))} selected={chartKind === 'candle'} theme={theme} />
                    <WebPressable accessibilityLabel={t(language, 'personalTerminalChartTypeHint')} accessibilityRole="button" dataSet={{ 'personal-terminal-role': 'view-info' }} onPress={() => setSheet({ kind: 'chart-type' })}>
                      <PersonalTerminalIcon color={theme.text.metadata} name="chart" size={14} />
                    </WebPressable>
                  </WebView>
                ) : viewData.observations.length ? (
                  <WebView dataSet={{ 'personal-terminal-role': 'instrument-context' }}>
                    <Text style={{ color: theme.text.metadata }}>{series.adaptive && !referenceAvailable ? maturityLabel(language, series) : `${activeIndicatorCount} ${t(language, 'personalTerminalIndicatorsActive')}`}</Text>
                    <Text style={{ color: theme.text.metadata }}>{series.adaptive?.state === 'first_observation' ? t(language, 'personalTerminalCurrentObservation') : t(language, 'personalTerminalLine')}</Text>
                  </WebView>
                ) : null}
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
                  onSelectSelection={handleChartSelection}
                  rangeSelection={rangeSelection}
                  reducedMotion={reducedMotion}
                  ref={chartRef}
                  series={series}
                  theme={theme}
                  timeframe={timeframe}
                  viewData={viewData}
                  questlifeStartedAt={model.questlifeStartedAt}
                />
                {crosshair ? (
                  <WebView dataSet={{ 'personal-terminal-role': 'crosshair-readout' }}>
                    <Text style={{ color: theme.text.metadata }}>{crosshair.candle ? `${timestampLabel(language, crosshair.candle.openAt)} — ${timestampLabel(language, crosshair.candle.closeAt)}` : timestampLabel(language, crosshair.time)}</Text>
                    <Text style={{ color: theme.text.primary }}>{reading(language, series, crosshair.value)} {readingUnit(language, series)} · {crosshair.candle ? t(language, 'personalTerminalCandleClose') : crosshair.baseline == null ? maturityLabel(language, series) : `Δ ${changeReading(language, series, crosshair.value, crosshair.baseline)}`}</Text>
                  </WebView>
                ) : null}
              </WebView>

              {viewData.observations.length || series.events.length || comparisonRows.length || (scope === 'market' && model.marketMap?.length) ? <WebView dataSet={{ 'personal-terminal-role': 'toolbars' }}>
                <WebView dataSet={{ 'personal-terminal-role': 'analysis-tools' }}>
                  {viewData.observations.length && referenceAvailable ? <TerminalTool active={activeIndicatorCount > 0} icon="indicator" label={t(language, 'personalTerminalIndicators')} onPress={() => setSheet({ kind: 'indicators' })} theme={theme} /> : null}
                  {series.events.length ? <TerminalTool active={indicators.has('events')} icon="event" label={t(language, 'personalTerminalEventTool')} onPress={() => setSheet({ kind: 'events' })} theme={theme} /> : null}
                  {comparisonRows.length ? <TerminalTool active={Boolean(comparisonSeries)} icon="compare" label={t(language, 'personalTerminalCompare')} onPress={() => setSheet({ kind: 'compare' })} theme={theme} /> : null}
                  {hasComparableData ? <TerminalTool active={rangeMode} icon="range" label={rangeMode ? t(language, 'personalTerminalCancelRange') : t(language, 'personalTerminalRangeTool')} onPress={() => { setRangeMode((currentRangeMode) => !currentRangeMode); setRangeSelection({ start: null, end: null }); }} theme={theme} /> : null}
                  {scope === 'market' && model.marketMap?.length ? <TerminalTool icon="market" label={t(language, 'personalTerminalOverviewTool')} onPress={() => setSheet({ kind: 'market-map' })} theme={theme} /> : null}
                </WebView>
                {viewData.observations.length > 2 ? <WebView dataSet={{ 'personal-terminal-role': 'zoom-controls' }}>
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
                ) : (adaptiveRows || [
                  [t(language, 'quantCurrent'), `${reading(language, series, current)} ${readingUnit(language, series)}`],
                  [baselineLabel(language, series), `${reading(language, series, series.baseline.value)} ${readingUnit(language, series)}`],
                  [t(language, 'quantChange'), changeReading(language, series, current, series.baseline.value)],
                  [t(language, 'quantEvidence'), t(language, 'personalTerminalAnalystCoverageSummary').replace('{observed}', String(evidence.activeDays)).replace('{missing}', evidence.missing == null ? '—' : String(evidence.missing))],
                ]).map(([label, value]) => <WebView key={label}><Text style={{ color: theme.text.metadata }}>{label}</Text><Text style={{ color: theme.text.primary }}>{value}</Text></WebView>)}
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
                  <Text numberOfLines={2} style={{ color: theme.text.primary }}>{analystPreviewRows[0].body}</Text>
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
                  {(adaptiveRows || [
                    [t(language, 'quantCurrent'), `${reading(language, series, current)} ${readingUnit(language, series)}`],
                    [baselineLabel(language, series), `${reading(language, series, series.baseline.value)} ${readingUnit(language, series)}`],
                    [t(language, 'quantChange'), changeReading(language, series, current, series.baseline.value)],
                    [t(language, 'quantEvidence'), t(language, 'personalTerminalAnalystCoverageSummary').replace('{observed}', String(evidence.activeDays)).replace('{missing}', evidence.missing == null ? '—' : String(evidence.missing))],
                  ]).map(([label, value]) => <WebView key={label}><Text style={{ color: theme.text.metadata }}>{label}</Text><Text style={{ color: theme.text.primary }}>{value}</Text></WebView>)}
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
              {viewData.observations.length ? (
                <WebPressable accessibilityRole="button" dataSet={{ 'personal-terminal-role': 'panel-section', 'personal-terminal-panel': 'analyst' }} onPress={() => openAnalyst()}>
                  <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalAnalyst')}</Text>
                  <WebView dataSet={{ 'personal-terminal-role': 'analyst-preview' }}>
                    {analystPreviewRows.map((item) => (
                      <WebView key={item.label}>
                        <Text style={{ color: theme.text.metadata }}>{item.label}</Text>
                        <Text numberOfLines={3} style={{ color: theme.text.primary }}>{item.body}</Text>
                      </WebView>
                    ))}
                  </WebView>
                  <WebView dataSet={{ 'personal-terminal-role': 'analyst-open-row' }}>
                    <Text style={{ color: theme.text.primary }}>{t(language, 'personalTerminalInspectContext')}</Text>
                    <PersonalTerminalIcon color={theme.text.primary} name="analyst" size={16} />
                  </WebView>
                </WebPressable>
              ) : null}
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
          {debugSource && model.sourceMetadata ? (
            <WebView dataSet={{ 'personal-terminal-role': 'source-debug' }}>
              <Text style={{ color: theme.text.metadata }}>{model.sourceMetadata.schemaVersion} · {model.lifecycleScenario}</Text>
              <Text style={{ color: theme.text.metadata }}>{model.sourceMetadata.quantCommit.slice(0, 12)} · {model.sourceMetadata.canonicalArtifactHash.slice(0, 16)}</Text>
              <Text style={{ color: theme.text.metadata }}>{model.sourceMetadata.sourceArtifact}</Text>
            </WebView>
          ) : null}
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
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalSignalWindow')}</Text><Text style={{ color: theme.text.primary }}>{sheet.signal.sourceWindow || sheet.signal.targetWindow ? `${signalWindowLabel(language, sheet.signal.sourceWindow)} → ${signalWindowLabel(language, sheet.signal.targetWindow)}` : sheet.signal.windowDays == null ? timeframe : t(language, 'personalTerminalWindowDays').replace('{days}', String(sheet.signal.windowDays))}</Text></WebView>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalSignalDirection')}</Text><Text style={{ color: theme.text.primary }}>{sheet.signal.direction ? t(language, `personalTerminalTrajectory_${sheet.signal.direction === 'higher' ? 'up' : sheet.signal.direction === 'lower' ? 'down' : 'flat'}`) : '—'}</Text></WebView>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalSignalLag')}</Text><Text style={{ color: theme.text.primary }}>{sheet.signal.lagDays == null ? '—' : t(language, 'personalTerminalLagDays').replace('{days}', String(sheet.signal.lagDays))}</Text></WebView>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalSignalMaturity')}</Text><Text style={{ color: theme.text.primary }}>{signalEvidenceLabel(language, sheet.signal.evidenceGrade)}</Text></WebView>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'quantEvidenceSupport')}</Text><Text style={{ color: theme.text.primary }}>{sheet.signal.observationCount}</Text></WebView>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'quantCounterexamples')}</Text><Text style={{ color: theme.text.primary }}>{sheet.signal.counterexampleCount ?? '—'}</Text></WebView>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalSignalEffect')}</Text><Text style={{ color: theme.text.primary }}>{sheet.signal.effectEstimate == null ? '—' : number(sheet.signal.effectEstimate)}</Text></WebView>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalSignalInterval')}</Text><Text style={{ color: theme.text.primary }}>{sheet.signal.interval ? `${number(sheet.signal.interval[0])} — ${number(sheet.signal.interval[1])}` : '—'}</Text></WebView>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalIndependentDays')}</Text><Text style={{ color: theme.text.primary }}>{sheet.signal.independentDayCount ?? '—'}</Text></WebView>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalMissingness')}</Text><Text style={{ color: theme.text.primary }}>{sheet.signal.missingness ? Object.values(sheet.signal.missingness).reduce((sum, value) => sum + value, 0) : '—'}</Text></WebView>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'quantLastObserved')}</Text><Text style={{ color: theme.text.primary }}>{sheet.signal.lastSeenAt?.slice(0, 10) || '—'}</Text></WebView>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalEvidenceStatus')}</Text><Text style={{ color: theme.text.primary }}>{t(language, `quantSignal_${sheet.signal.status}`)}</Text></WebView>
            </WebView>
            {sheet.signal.recentExamples?.length ? (
              <WebView dataSet={{ 'personal-terminal-role': 'signal-examples' }}>
                <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalRecentExamples')}</Text>
                {sheet.signal.recentExamples.map((example) => (
                  <WebView key={`${example.sourceObservationId}:${example.targetObservationId}`}>
                    <Text style={{ color: theme.text.secondary }}>{timestampLabel(language, example.sourceAt)}</Text>
                    <Text style={{ color: theme.text.primary }}>{signalExampleReading(language, sheet.signal.sourceConstruct, example.sourceValue, example.sourceUnit)} → {signalExampleReading(language, sheet.signal.targetConstruct, example.targetValue, example.targetUnit)}</Text>
                  </WebView>
                ))}
              </WebView>
            ) : null}
            <WebView dataSet={{ 'personal-terminal-role': 'research-notes' }}>
              <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalAlternativeExplanations')}</Text>
              <Text style={{ color: theme.text.secondary }}>{sheet.signal.alternativeExplanations?.length ? sheet.signal.alternativeExplanations.map((item) => signalAlternativeLabel(language, item)).join(' · ') : t(language, 'personalTerminalAlternativeExplanationsBody')}</Text>
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
                  <Text style={{ color: theme.text.metadata }}>{sheet.selection.candle ? candleBucketLabel(language, sheet.selection.candle) : t(language, 'personalTerminalSelectedMovement')}</Text>
                  {sheet.selection.candle ? (
                    <>
                      <WebView dataSet={{ 'personal-terminal-role': 'candle-inspector' }}>
                        {[
                          ['personalTerminalCandleOpen', sheet.selection.candle.open, sheet.selection.candle.openAt],
                          ['personalTerminalCandleHigh', sheet.selection.candle.high, sheet.selection.candle.highAt],
                          ['personalTerminalCandleLow', sheet.selection.candle.low, sheet.selection.candle.lowAt],
                          ['personalTerminalCandleClose', sheet.selection.candle.close, sheet.selection.candle.closeAt],
                        ].map(([label, value, at]) => (
                          <WebView key={String(label)}>
                            <Text style={{ color: theme.text.metadata }}>{t(language, String(label))}</Text>
                            <Text style={{ color: theme.text.primary }}>{reading(language, series, Number(value))} {readingUnit(language, series)}</Text>
                            <Text style={{ color: theme.text.secondary }}>{timestampLabel(language, String(at))}</Text>
                          </WebView>
                        ))}
                      </WebView>
                      <WebView dataSet={{ 'personal-terminal-role': 'sheet-data-grid' }}>
                        <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalCandleAverage')}</Text><Text style={{ color: theme.text.primary }}>{reading(language, series, sheet.selection.candle.average)} {readingUnit(language, series)}</Text></WebView>
                        <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalCandleObservations')}</Text><Text style={{ color: theme.text.primary }}>{sheet.selection.candle.observationCount} / {sheet.selection.candle.expectedObservationCount ?? '—'}</Text></WebView>
                        {referenceAvailable ? <WebView><Text style={{ color: theme.text.metadata }}>{baselineLabel(language, series)}</Text><Text style={{ color: theme.text.primary }}>{reading(language, series, sheet.selection.baseline)} {readingUnit(language, series)}</Text></WebView> : null}
                      </WebView>
                      <Text style={{ color: theme.text.secondary }}>{candleMeaning(language, sheet.selection.candle)}</Text>
                    </>
                  ) : (
                    <>
                      <WebView dataSet={{ 'personal-terminal-role': 'sheet-data-grid' }}>
                        <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'quantCurrent')}</Text><Text style={{ color: theme.text.primary }}>{reading(language, series, sheet.selection.value)} {readingUnit(language, series)}</Text></WebView>
                        {referenceAvailable ? <WebView><Text style={{ color: theme.text.metadata }}>{baselineLabel(language, series)}</Text><Text style={{ color: theme.text.primary }}>{reading(language, series, sheet.selection.baseline)} {readingUnit(language, series)}</Text></WebView> : null}
                        {referenceAvailable ? <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalBaselineDeviation')}</Text><Text style={{ color: theme.text.primary }}>{changeReading(language, series, sheet.selection.value, sheet.selection.baseline)}</Text></WebView> : null}
                        {!referenceAvailable ? <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalReferenceForming')}</Text><Text style={{ color: theme.text.primary }}>{maturityLabel(language, series)}</Text></WebView> : null}
                        <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalRelatedChanges')}</Text><Text style={{ color: theme.text.primary }}>{related ? `${number(related.value)} ${copy(language, comparisonSeries!.unit)}` : '—'}</Text></WebView>
                        <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalEventTool')}</Text><Text style={{ color: theme.text.primary }}>{nearbyEvents.length}</Text></WebView>
                        <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalSignalCount')}</Text><Text style={{ color: theme.text.primary }}>{visibleSignals.length}</Text></WebView>
                        <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'quantSourceCount')}</Text><Text style={{ color: theme.text.primary }}>{sheet.selection.sourceIds.length}</Text></WebView>
                      </WebView>
                      <Text style={{ color: theme.text.secondary }}>{copy(language, series.limitation)}</Text>
                    </>
                  )}
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
                {referenceAvailable ? <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalBaselineDeviation')}</Text><Text style={{ color: theme.text.primary }}>{change(baselineDeviation)}</Text></WebView> : null}
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
              {earlyAnalystBody ? (
                <WebView>
                  <Text style={{ color: theme.text.metadata }}>{analystPreviewRows[0].label}</Text>
                  <Text style={{ color: theme.text.primary }}>{earlyAnalystBody}</Text>
                </WebView>
              ) : analystItems.length ? analystItems.map((item) => (
                <WebView key={`${item.type}:${item.constructKey}`}>
                  <Text style={{ color: theme.text.metadata }}>{analystItemLabel(language, item.type)}</Text>
                  <Text style={{ color: theme.text.primary }}>{analystItemBody(language, series, item)}</Text>
                </WebView>
              )) : (
                <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalAnalystObserved')}</Text><Text style={{ color: theme.text.primary }}>{copy(language, series.label)} · {t(language, `personalTerminalTrajectory_${trend}`)} · {changeReading(language, series, current, series.baseline.value)}</Text></WebView>
              )}
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalRelatedChanges')}</Text><Text style={{ color: theme.text.secondary }}>{comparisonSeries ? `${copy(language, comparisonSeries.label)} · ${readingUnit(language, comparisonSeries)} · ${t(language, 'personalTerminalIndependentScale')}` : t(language, 'personalTerminalNoComparison')}</Text></WebView>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalKnownSignals')}</Text><Text style={{ color: theme.text.secondary }}>{visibleSignals.length ? copy(language, visibleSignals[0].title) : t(language, 'personalTerminalV041NoEligibleRelationship')}</Text></WebView>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalAnalystLimitations')}</Text><Text style={{ color: theme.text.secondary }}>{copy(language, series.limitation)}</Text></WebView>
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
                <Text style={{ color: theme.text.metadata }}>{copy(language, item.unit)} · {maturityLabel(language, item)}</Text>
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
            {availableIndicators.map((item) => (
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
            {candleAvailable ? <WebPressable accessibilityRole="button" accessibilityState={{ selected: chartKind === 'candle' }} onPress={() => { measureInteraction('chart-candle', () => setChartKind('candle')); setSheet(null); }}>
              <PersonalTerminalIcon color={theme.text.primary} name="chart" size={17} /><Text style={{ color: theme.text.primary }}>{t(language, 'personalTerminalCandle')}</Text><Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalCandleHint')}</Text>
            </WebPressable> : null}
            {candleAvailable && viewData.candles[0] ? (
              <WebView dataSet={{ 'personal-terminal-role': 'chart-meaning' }}>
                <Text style={{ color: theme.text.metadata }}>{candleBucketLabel(language, viewData.candles[0])}</Text>
                <Text style={{ color: theme.text.secondary }}>{candleMeaning(language, viewData.candles[0])}</Text>
              </WebView>
            ) : null}
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
