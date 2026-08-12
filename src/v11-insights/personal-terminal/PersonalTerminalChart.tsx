import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, Text, View } from 'react-native';
import type { Lang } from '../../i18n';
import { t } from '../../i18n';
import type { V11ThemeTokens } from '../../v11/tokens';
import type {
  PersonalTerminalCandle,
  PersonalTerminalChartKind,
  PersonalTerminalEvent,
  PersonalTerminalIndicator,
  PersonalTerminalPoint,
  PersonalTerminalSeries,
  PersonalTerminalTimeframe,
  PersonalTerminalViewData,
} from './personalTerminalPresentation';
import type { QuantRecoveryTrajectory } from './quantInterpretation';

const WebView = View as any;
const WebPressable = Pressable as any;

export type PersonalTerminalChartSelection = {
  time: string;
  value: number | null;
  baseline: number | null;
  sourceIds: string[];
  observationCount: number;
  candle?: PersonalTerminalCandle;
};

export type PersonalTerminalChartHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  setCrosshair: (selection: PersonalTerminalChartSelection | null) => void;
  setVisibleRange: (range: { from: string; to: string } | null) => void;
};

function chartTime(value: string) {
  if (value.length <= 10) return value;
  return Math.round(new Date(value).getTime() / 1000) as any;
}

function timeLabel(value: unknown) {
  if (typeof value === 'number') return new Date(value * 1000).toISOString();
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'year' in value && 'month' in value && 'day' in value) {
    const row = value as { year: number; month: number; day: number };
    return `${row.year}-${String(row.month).padStart(2, '0')}-${String(row.day).padStart(2, '0')}`;
  }
  return '';
}

function compactNumber(value: number) {
  if (Math.abs(value) >= 1000) return `${Math.round(value / 100) / 10}k`;
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function seriesValueLabel(series: PersonalTerminalSeries, value: number) {
  if (series.semantic === 'timing') {
    const minutes = (Math.round(value + 12 * 60) + 24 * 60) % (24 * 60);
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  }
  if (series.constructKey === 'sleep.duration') return `${Math.round(value / 6) / 10}`;
  return compactNumber(value);
}

function dateFromChartTime(value: unknown) {
  const label = timeLabel(value);
  if (!label) return null;
  const date = new Date(label.length <= 10 ? `${label}T12:00:00` : label);
  return Number.isFinite(date.getTime()) ? date : null;
}

function axisLabel(language: Lang, timeframe: PersonalTerminalTimeframe, value: unknown) {
  const date = dateFromChartTime(value);
  if (!date) return '';
  const locale = language === 'zh' ? 'zh-CN' : 'en-AU';
  if (timeframe === '4H' || timeframe === '12H' || timeframe === '24H' || timeframe === '1D') {
    return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
  }
  if (timeframe === 'ALL') return new Intl.DateTimeFormat(locale, { year: 'numeric' }).format(date);
  if (timeframe === '1Y') return new Intl.DateTimeFormat(locale, { month: 'short', year: '2-digit' }).format(date);
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(date);
}

function fullDateLabel(language: Lang, value: unknown) {
  const date = dateFromChartTime(value);
  if (!date) return '';
  return new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function isHistorical(value: PersonalTerminalPoint['provenance']) {
  return value === 'historical_reference' || value === 'passive_device';
}

function eventLabel(language: Lang, event: PersonalTerminalEvent) {
  if (event.shortLabel.kind === 'text') return event.shortLabel.text;
  return Object.entries(event.shortLabel.values || {}).reduce(
    (result, [key, replacement]) => result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(replacement)),
    t(language, event.shortLabel.key),
  );
}

function pointsToData(rows: PersonalTerminalPoint[]) {
  return rows.map((row) => ({ time: chartTime(row.time), value: row.value }));
}

function nearestPoint(rows: PersonalTerminalPoint[], selected: string) {
  const target = new Date(selected).getTime();
  return rows.reduce<PersonalTerminalPoint | null>((best, row) => {
    if (!best) return row;
    return Math.abs(new Date(row.time).getTime() - target) < Math.abs(new Date(best.time).getTime() - target) ? row : best;
  }, null);
}

const PersonalTerminalChart = forwardRef<PersonalTerminalChartHandle, {
  analogueOverlay?: QuantRecoveryTrajectory;
  chartKind: PersonalTerminalChartKind;
  comparisonSeries?: PersonalTerminalSeries | null;
  comparisonViewData?: PersonalTerminalViewData | null;
  indicators: Set<PersonalTerminalIndicator>;
  language: Lang;
  onCrosshair: (selection: PersonalTerminalChartSelection | null) => void;
  onInteraction?: () => void;
  onVisibleRangeChange?: (range: { from: string; to: string } | null) => void;
  onSelectEvent: (event: PersonalTerminalEvent) => void;
  onSelectSelection: (selection: PersonalTerminalChartSelection) => void;
  questlifeStartedAt?: string | null;
  rangeSelection: { start: string | null; end: string | null };
  reducedMotion: boolean;
  series: PersonalTerminalSeries;
  theme: V11ThemeTokens;
  timeframe: PersonalTerminalTimeframe;
  viewData: PersonalTerminalViewData;
}>(({
  analogueOverlay,
  chartKind,
  comparisonSeries = null,
  comparisonViewData = null,
  indicators,
  language,
  onCrosshair,
  onInteraction,
  onVisibleRangeChange,
  onSelectEvent,
  onSelectSelection,
  questlifeStartedAt = null,
  rangeSelection,
  reducedMotion,
  series,
  theme,
  timeframe,
  viewData,
}, ref) => {
  const hostRef = useRef<HTMLElement | null>(null);
  const chartRef = useRef<any>(null);
  const visibleRangeRef = useRef<any>(null);
  const viewIdentityRef = useRef('');
  const viewDataRef = useRef(viewData);
  const primarySeriesRef = useRef<any>(null);
  const [baselineBand, setBaselineBand] = useState<{ top: number; height: number } | null>(null);
  viewDataRef.current = viewData;

  const transitionPosition = useMemo(() => {
    if (!questlifeStartedAt || viewData.line.length < 2) return null;
    const hasHistorical = viewData.line.some((point) => isHistorical(point.provenance));
    if (!hasHistorical) return null;
    const first = new Date(viewData.line[0].time).getTime();
    const last = new Date(viewData.line[viewData.line.length - 1].time).getTime();
    const transition = new Date(questlifeStartedAt).getTime();
    if (!Number.isFinite(transition) || transition <= first || transition >= last) return null;
    return Math.max(2, Math.min(98, (transition - first) / Math.max(1, last - first) * 100));
  }, [questlifeStartedAt, viewData.line]);

  const alignedEvents = useMemo(() => {
    if (!viewData.line.length) return [];
    const first = new Date(viewData.line[0].time).getTime();
    const lastObservation = new Date(viewData.line[viewData.line.length - 1].time).getTime();
    const lastEvent = series.events.reduce((latest, event) => Math.max(latest, new Date(event.timestamp).getTime()), lastObservation);
    const last = Math.max(lastObservation, lastEvent);
    const span = Math.max(1, last - first);
    return series.events.flatMap((event) => {
      const value = new Date(event.timestamp).getTime();
      if (value < first || value > last) return [];
      return [{ event, position: Math.max(2, Math.min(98, (value - first) / span * 100)) }];
    });
  }, [series.events, viewData.line]);

  const evidenceCells = useMemo(() => {
    const cells: Array<{ id: string; kind: 'observed' | 'missing'; count: number }> = [];
    viewData.line.forEach((point, index) => {
      if (index > 0) {
        const previous = new Date(viewData.line[index - 1].time).getTime();
        const current = new Date(point.time).getTime();
        const gapDays = Math.round((current - previous) / 86_400_000);
        if (gapDays > 1) cells.push({ id: `gap-${point.time}`, kind: 'missing', count: Math.min(gapDays - 1, 6) });
      }
      cells.push({ id: `point-${point.time}`, kind: 'observed', count: point.observationCount });
    });
    return cells.slice(-48);
  }, [viewData.line]);

  const rangeBand = useMemo(() => {
    if (!rangeSelection.start || viewData.line.length < 2) return null;
    const first = new Date(viewData.line[0].time).getTime();
    const last = new Date(viewData.line[viewData.line.length - 1].time).getTime();
    const start = new Date(rangeSelection.start).getTime();
    const end = new Date(rangeSelection.end || rangeSelection.start).getTime();
    if (![first, last, start, end].every(Number.isFinite) || last <= first || end < first || start > last) return null;
    const boundedStart = Math.max(first, Math.min(last, start));
    const boundedEnd = Math.max(boundedStart, Math.min(last, end));
    return {
      left: ((boundedStart - first) / (last - first)) * 100,
      width: Math.max(0.8, ((boundedEnd - boundedStart) / (last - first)) * 100),
    };
  }, [rangeSelection.end, rangeSelection.start, viewData.line]);

  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      const range = chartRef.current?.timeScale().getVisibleLogicalRange();
      if (!range) return;
      const center = (range.from + range.to) / 2;
      const span = (range.to - range.from) * 0.72;
      chartRef.current.timeScale().setVisibleLogicalRange({ from: center - span / 2, to: center + span / 2 });
    },
    zoomOut: () => {
      const range = chartRef.current?.timeScale().getVisibleLogicalRange();
      if (!range) return;
      const center = (range.from + range.to) / 2;
      const span = (range.to - range.from) * 1.38;
      chartRef.current.timeScale().setVisibleLogicalRange({ from: center - span / 2, to: center + span / 2 });
    },
    reset: () => chartRef.current?.timeScale().fitContent(),
    setCrosshair: (selection) => {
      const chart = chartRef.current;
      const primary = primarySeriesRef.current;
      if (!chart || !primary) return;
      if (!selection || selection.value == null) {
        chart.clearCrosshairPosition?.();
        return;
      }
      const point = nearestPoint(viewDataRef.current.line, selection.time);
      if (!point) {
        chart.clearCrosshairPosition?.();
        return;
      }
      chart.setCrosshairPosition?.(point.value, chartTime(point.time), primary);
    },
    setVisibleRange: (range) => {
      const scale = chartRef.current?.timeScale();
      if (!scale) return;
      if (!range) {
        scale.fitContent();
        return;
      }
      scale.setVisibleRange({ from: chartTime(range.from), to: chartTime(range.to) });
    },
  }), []);

  const lookup = useMemo(() => {
    const result = new Map<string, PersonalTerminalPoint>();
    viewData.line.forEach((point) => result.set(String(chartTime(point.time)), point));
    return result;
  }, [viewData.line]);

  const candleLookup = useMemo(() => {
    const result = new Map<string, PersonalTerminalCandle>();
    viewData.candles.forEach((candle) => result.set(String(chartTime(candle.time)), candle));
    return result;
  }, [viewData.candles]);

  useEffect(() => {
    const viewIdentity = `${series.id}:${timeframe}:${chartKind}`;
    if (viewIdentityRef.current !== viewIdentity) {
      visibleRangeRef.current = null;
      viewIdentityRef.current = viewIdentity;
    }
    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;
    let chart: any = null;
    const host = hostRef.current;
    if (!host || typeof window === 'undefined') return undefined;

    (async () => {
      const library = await import('lightweight-charts');
      if (disposed || !hostRef.current) return;
      const priceScaleMargins = series.semantic === 'ordinal_state'
        ? { top: 0, bottom: 0 }
        : { top: 0.12, bottom: indicators.has('load') ? 0.24 : 0.1 };
      const coarseViewport = window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(max-width: 700px)').matches;
      chart = library.createChart(hostRef.current, {
        autoSize: true,
        layout: {
          attributionLogo: false,
          background: { type: library.ColorType.Solid, color: 'transparent' },
          textColor: theme.text.metadata,
          fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, sans-serif',
          fontSize: 10,
          panes: { separatorColor: theme.questTheme.colors.border, separatorHoverColor: theme.glow.primary },
        },
        localization: {
          priceFormatter: (value: number) => seriesValueLabel(series, value),
          timeFormatter: (value: unknown) => fullDateLabel(language, value),
        },
        grid: {
          vertLines: { color: theme.questTheme.colors.border, style: library.LineStyle.Dashed, visible: false },
          horzLines: { color: theme.questTheme.colors.border, style: library.LineStyle.Dotted, visible: false },
        },
        crosshair: {
          mode: library.CrosshairMode.Normal,
          vertLine: { color: theme.text.secondary, width: 1, style: library.LineStyle.Dashed, labelBackgroundColor: theme.questTheme.colors.surfaceElevated },
          horzLine: { color: theme.text.secondary, width: 1, style: library.LineStyle.Dashed, labelBackgroundColor: theme.questTheme.colors.surfaceElevated },
        },
        handleScroll: { mouseWheel: !coarseViewport, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
        handleScale: { axisDoubleClickReset: true, axisPressedMouseMove: true, mouseWheel: !coarseViewport, pinch: true },
        kineticScroll: { mouse: !reducedMotion, touch: !reducedMotion },
        leftPriceScale: { visible: Boolean(comparisonSeries), borderVisible: false, scaleMargins: priceScaleMargins },
        rightPriceScale: { borderVisible: false, scaleMargins: priceScaleMargins },
        timeScale: {
          borderVisible: false,
          timeVisible: timeframe === '4H' || timeframe === '12H' || timeframe === '24H' || timeframe === '1D',
          secondsVisible: false,
          rightOffset: 2,
          barSpacing: timeframe === '4H' || timeframe === '12H' || timeframe === '24H' || timeframe === '1D' ? 34 : 10,
          minBarSpacing: 2,
          tickMarkFormatter: (value: unknown) => axisLabel(language, timeframe, value),
        },
      });
      chartRef.current = chart;

      let primary: any;
      const boundedOrdinalScale = series.semantic === 'ordinal_state'
        ? { autoscaleInfoProvider: () => ({ priceRange: { minValue: 1, maxValue: 5 } }) }
        : {};
      if (chartKind === 'candle' && series.supportsCandle && viewData.candles.length > 0) {
        primary = chart.addSeries(library.CandlestickSeries, {
          ...boundedOrdinalScale,
          upColor: 'transparent',
          downColor: theme.glow.primary,
          borderUpColor: theme.glow.primary,
          borderDownColor: theme.glow.primary,
          wickUpColor: theme.text.secondary,
          wickDownColor: theme.text.secondary,
          priceLineVisible: false,
          lastValueVisible: true,
        });
        primary.setData(viewData.candles.map((row) => ({ time: chartTime(row.time), open: row.open, high: row.high, low: row.low, close: row.close })) as any);
        if (viewData.incompleteCandles.length > 0) {
          const incomplete = chart.addSeries(library.LineSeries, { color: theme.text.secondary, lineVisible: false, pointMarkersVisible: true, pointMarkersRadius: 3, priceLineVisible: false, lastValueVisible: false });
          incomplete.setData(pointsToData(viewData.incompleteCandles) as any);
        }
      } else if (chartKind === 'bar') {
        primary = chart.addSeries(library.HistogramSeries, {
          ...boundedOrdinalScale,
          color: theme.glow.primary,
          priceLineVisible: false,
          lastValueVisible: true,
        });
        primary.setData(pointsToData(viewData.line).map((row) => ({ ...row, color: theme.glow.primary })) as any);
      } else {
        primary = chart.addSeries(library.LineSeries, {
          ...boundedOrdinalScale,
          color: theme.glow.primary,
          lineWidth: 2,
          lineType: library.LineType.Simple,
          pointMarkersVisible: viewData.line.length < 40,
          pointMarkersRadius: 2,
          priceLineVisible: false,
          lastValueVisible: true,
        });
        const confirmed = viewData.line.filter((row) => !isHistorical(row.provenance));
        const historical = viewData.line.filter((row) => isHistorical(row.provenance));
        primary.setData(pointsToData(confirmed.length ? confirmed : viewData.line) as any);
        if (historical.length > 0 && confirmed.length > 0) {
          const historicalSeries = chart.addSeries(library.LineSeries, {
            color: theme.text.metadata,
            lineWidth: 1,
            lineStyle: library.LineStyle.Dashed,
            pointMarkersVisible: false,
            priceLineVisible: false,
            lastValueVisible: false,
          });
          historicalSeries.setData(pointsToData(historical) as any);
        }
      }
      primarySeriesRef.current = primary;

      if (comparisonSeries && comparisonViewData?.line.length) {
        const comparison = chart.addSeries(library.LineSeries, {
          color: theme.glow.supporting,
          crosshairMarkerVisible: true,
          lastValueVisible: true,
          lineStyle: library.LineStyle.Dashed,
          lineType: library.LineType.Simple,
          lineWidth: 2,
          pointMarkersVisible: false,
          priceLineVisible: false,
          priceScaleId: 'left',
        });
        comparison.setData(pointsToData(comparisonViewData.line) as any);
      }

      const updateBaselineBand = () => {
        if (!indicators.has('baseline') || series.baseline.low == null || series.baseline.high == null) {
          setBaselineBand(null);
          return;
        }
        const high = primary.priceToCoordinate(series.baseline.high);
        const low = primary.priceToCoordinate(series.baseline.low);
        if (high == null || low == null) return;
        setBaselineBand({ top: Math.min(high, low), height: Math.max(1, Math.abs(low - high)) });
      };

      const first = viewData.line[0]?.time;
      const last = viewData.line[viewData.line.length - 1]?.time;
      if (indicators.has('baseline') && first && last && series.baseline.value != null) {
        const baseline = chart.addSeries(library.LineSeries, { color: theme.text.secondary, lineWidth: 1, lineStyle: library.LineStyle.Dashed, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false });
        baseline.setData([{ time: chartTime(first), value: series.baseline.value }, { time: chartTime(last), value: series.baseline.value }] as any);
        if (series.baseline.low != null && series.baseline.high != null) {
          const low = chart.addSeries(library.LineSeries, { color: theme.glow.supporting, lineWidth: 1, lineStyle: library.LineStyle.Dotted, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false });
          const high = chart.addSeries(library.LineSeries, { color: theme.glow.supporting, lineWidth: 1, lineStyle: library.LineStyle.Dotted, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false });
          low.setData([{ time: chartTime(first), value: series.baseline.low }, { time: chartTime(last), value: series.baseline.low }] as any);
          high.setData([{ time: chartTime(first), value: series.baseline.high }, { time: chartTime(last), value: series.baseline.high }] as any);
        }
      }
      if (
        analogueOverlay
        && analogueOverlay.projection_semantics === 'HISTORICAL_ANALOGUE'
        && analogueOverlay.forecast_allowed === false
        && analogueOverlay.context.target_construct === series.constructKey
        && analogueOverlay.reference_path.length > 1
        && series.baseline.value != null
        && last
      ) {
        const origin = new Date(last).getTime();
        if (Number.isFinite(origin)) {
          const projectedTime = (offsetDays: number) => chartTime(new Date(origin + offsetDays * 86_400_000).toISOString());
          const analogueMedian = chart.addSeries(library.LineSeries, {
            color: theme.glow.primary,
            lineWidth: 2,
            lineStyle: library.LineStyle.Dashed,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          });
          const analogueLow = chart.addSeries(library.LineSeries, {
            color: theme.glow.supporting,
            lineWidth: 1,
            lineStyle: library.LineStyle.Dotted,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          });
          const analogueHigh = chart.addSeries(library.LineSeries, {
            color: theme.glow.supporting,
            lineWidth: 1,
            lineStyle: library.LineStyle.Dotted,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
          });
          analogueMedian.setData(analogueOverlay.reference_path.map((point) => ({
            time: projectedTime(point.offset_days),
            value: series.baseline.value! + point.median_deviation,
          })) as any);
          analogueLow.setData(analogueOverlay.reference_path.map((point) => ({
            time: projectedTime(point.offset_days),
            value: series.baseline.value! + point.low_deviation,
          })) as any);
          analogueHigh.setData(analogueOverlay.reference_path.map((point) => ({
            time: projectedTime(point.offset_days),
            value: series.baseline.value! + point.high_deviation,
          })) as any);
        }
      }
      if (indicators.has('emaShort') && viewData.emaShort.length > 1) {
        const emaShort = chart.addSeries(library.LineSeries, { color: theme.glow.supporting, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
        emaShort.setData(pointsToData(viewData.emaShort) as any);
      }
      if (indicators.has('emaLong') && viewData.emaLong.length > 1) {
        const emaLong = chart.addSeries(library.LineSeries, { color: theme.text.secondary, lineWidth: 1, lineStyle: library.LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
        emaLong.setData(pointsToData(viewData.emaLong) as any);
      }
      if (indicators.has('load') && viewData.load.length > 0) {
        const load = chart.addSeries(library.HistogramSeries, { color: theme.glow.supporting, priceLineVisible: false, lastValueVisible: false, priceFormat: { type: 'volume' } }, 1);
        load.setData(pointsToData(viewData.load).map((row) => ({ ...row, color: theme.glow.supporting })) as any);
        chart.panes()[1]?.setStretchFactor(0.24);
      }
      const markers: any[] = [];
      if (indicators.has('events') && series.events.length > 0) {
        markers.push(...series.events.flatMap((event) => {
          const point = nearestPoint(viewData.line, event.timestamp);
          return point ? [{
            id: `event:${event.id}`,
            time: chartTime(point.time),
            position: event.type === 'context' ? 'belowBar' as const : 'aboveBar' as const,
            color: theme.text.secondary,
            shape: event.type === 'decision' ? 'arrowUp' as const : event.type === 'context' ? 'arrowDown' as const : 'square' as const,
            size: 0.35,
            text: '',
          }] : [];
        }));
      }
      const currentPoint = viewData.line[viewData.line.length - 1];
      if (currentPoint) markers.push({ id: 'current-reading', time: chartTime(currentPoint.time), position: 'inBar', color: theme.glow.primary, shape: 'square', size: 0.5, text: '' });
      if (markers.length) library.createSeriesMarkers(primary, markers as any);

      const selectionFor = (time: unknown, param?: any): PersonalTerminalChartSelection | null => {
        const rawKey = String(time);
        const candle = chartKind === 'candle' ? candleLookup.get(rawKey) : undefined;
        if (candle) {
          const data = param?.seriesData?.get(primary);
          return {
            time: candle.time,
            value: data?.close ?? candle.close,
            baseline: series.baseline.value,
            sourceIds: candle.sourceIds,
            observationCount: candle.observationCount,
            candle,
          };
        }
        const point = lookup.get(rawKey) || nearestPoint(viewData.line, timeLabel(time));
        if (!point) return null;
        const data = param?.seriesData?.get(primary);
        const value = data?.value ?? data?.close ?? point.value;
        return { time: point.time, value, baseline: series.baseline.value, sourceIds: point.sourceIds, observationCount: point.observationCount };
      };
      const crosshairHandler = (param: any) => onCrosshair(param.time ? selectionFor(param.time, param) : null);
      const clickHandler = (param: any) => {
        if (!param.time) return;
        const markerId = String(param.hoveredObjectId || '');
        if (markerId.startsWith('event:')) {
          const event = series.events.find((row) => `event:${row.id}` === markerId);
          if (event) { onSelectEvent(event); return; }
        }
        const selection = selectionFor(param.time, param);
        if (selection) onSelectSelection(selection);
      };
      chart.subscribeCrosshairMove(crosshairHandler);
      chart.subscribeClick(clickHandler);
      const rangeHandler = (range: any) => {
        if (visibleRangeRef.current) onInteraction?.();
        visibleRangeRef.current = range;
        updateBaselineBand();
      };
      const visibleTimeRangeHandler = (range: any) => onVisibleRangeChange?.(range ? {
        from: timeLabel(range.from),
        to: timeLabel(range.to),
      } : null);
      chart.timeScale().subscribeVisibleLogicalRangeChange(rangeHandler);
      chart.timeScale().subscribeVisibleTimeRangeChange(visibleTimeRangeHandler);
      chart.timeScale().fitContent();
      if (visibleRangeRef.current) chart.timeScale().setVisibleLogicalRange(visibleRangeRef.current);
      window.requestAnimationFrame(updateBaselineBand);

      resizeObserver = new ResizeObserver(() => {
        chart?.applyOptions({ width: hostRef.current?.clientWidth || 0, height: hostRef.current?.clientHeight || 0 });
        window.requestAnimationFrame(updateBaselineBand);
      });
      resizeObserver.observe(hostRef.current);
    })();

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      if (chart) {
        visibleRangeRef.current = chart.timeScale().getVisibleLogicalRange();
        chart.remove();
      }
      chartRef.current = null;
      primarySeriesRef.current = null;
    };
  }, [analogueOverlay, candleLookup, chartKind, comparisonSeries, comparisonViewData, indicators, language, lookup, onCrosshair, onInteraction, onSelectEvent, onSelectSelection, onVisibleRangeChange, reducedMotion, series, theme, timeframe, viewData]);

  return (
    <WebView dataSet={{ 'personal-terminal-empty': viewData.line.length ? 'false' : 'true', 'personal-terminal-role': 'chart-frame' }}>
      <WebView
        accessibilityLabel={t(language, 'personalTerminalChartAccessibility')}
        accessibilityRole="image"
        dataSet={{ 'personal-terminal-role': 'chart-host' }}
        ref={(node: HTMLElement | null) => { hostRef.current = node; }}
      />
      {!viewData.line.length ? (
        <WebView dataSet={{ 'personal-terminal-role': 'chart-empty-state' }}>
          <Text style={{ color: theme.text.primary }}>{t(language, 'personalTerminalEmptyChartTitle')}</Text>
          <Text style={{ color: theme.text.secondary }}>{t(language, 'personalTerminalEmptyChartBody')}</Text>
        </WebView>
      ) : null}
      {baselineBand ? <WebView dataSet={{ 'personal-terminal-role': 'baseline-band' }} style={{ top: baselineBand.top, height: baselineBand.height }} /> : null}
      {rangeBand ? <WebView dataSet={{ 'personal-terminal-role': 'range-highlight' }} pointerEvents="none" style={{ left: `${rangeBand.left}%`, width: `${rangeBand.width}%` }} /> : null}
      {analogueOverlay ? (
        <WebView dataSet={{ 'personal-terminal-role': 'analogue-label' }} pointerEvents="none">
          <Text style={{ color: theme.text.metadata }}>{t(language, 'quantInterpretationAnalogueNotForecast')}</Text>
        </WebView>
      ) : null}
      <WebView dataSet={{ 'personal-terminal-role': 'time-calibration' }} pointerEvents="none" />
      {transitionPosition != null ? (
        <WebView dataSet={{ 'personal-terminal-role': 'questlife-transition' }} pointerEvents="none" style={{ left: `${transitionPosition}%` }}>
          <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalV041QuestLifeStarted')}</Text>
        </WebView>
      ) : null}
      {alignedEvents.length ? (
        <WebView dataSet={{ 'personal-terminal-role': 'event-rail' }}>
          {alignedEvents.map(({ event, position }) => {
            const value = new Date(event.timestamp).getTime();
            const selected = rangeSelection.start && value >= new Date(rangeSelection.start).getTime() && (!rangeSelection.end || value <= new Date(rangeSelection.end).getTime());
            return (
            <WebPressable
              accessibilityLabel={`${eventLabel(language, event)} · ${event.timestamp.slice(0, 10)}`}
              accessibilityRole="button"
              dataSet={{ 'personal-terminal-event-category': event.category, 'personal-terminal-selected': selected ? 'true' : 'false' }}
              key={event.id}
              onPress={() => onSelectEvent(event)}
              style={{ left: `${position}%` }}
            >
              <WebView dataSet={{ 'personal-terminal-role': 'event-marker' }} />
              <Text style={{ color: theme.text.metadata }}>{event.timestamp.slice(5, 10)}</Text>
            </WebPressable>
            );
          })}
        </WebView>
      ) : null}
      <WebView dataSet={{ 'personal-terminal-role': 'evidence-rail' }}>
        {evidenceCells.map((cell) => <WebView dataSet={{ 'personal-terminal-evidence-kind': cell.kind }} key={cell.id} style={{ flexGrow: Math.max(1, cell.count) }} />)}
      </WebView>
      {rangeSelection.start ? (
        <WebView dataSet={{ 'personal-terminal-role': 'range-status' }}>
          <Text style={{ color: theme.text.primary }}>
            {rangeSelection.end
              ? `${rangeSelection.start.slice(0, 10)} → ${rangeSelection.end.slice(0, 10)}`
              : t(language, 'personalTerminalSelectRangeEnd')}
          </Text>
        </WebView>
      ) : null}
    </WebView>
  );
});

PersonalTerminalChart.displayName = 'PersonalTerminalChart';

export default PersonalTerminalChart;
