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
  PersonalTerminalChartKind,
  PersonalTerminalEvent,
  PersonalTerminalIndicator,
  PersonalTerminalPoint,
  PersonalTerminalSeries,
  PersonalTerminalTimeframe,
  PersonalTerminalViewData,
} from './personalTerminalPresentation';

const WebView = View as any;
const WebPressable = Pressable as any;

export type PersonalTerminalChartSelection = {
  time: string;
  value: number | null;
  baseline: number | null;
  sourceIds: string[];
  observationCount: number;
};

export type PersonalTerminalChartHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
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
  chartKind: PersonalTerminalChartKind;
  comparisonSeries?: PersonalTerminalSeries | null;
  comparisonViewData?: PersonalTerminalViewData | null;
  indicators: Set<PersonalTerminalIndicator>;
  language: Lang;
  onCrosshair: (selection: PersonalTerminalChartSelection | null) => void;
  onInteraction?: () => void;
  onSelectEvent: (event: PersonalTerminalEvent) => void;
  onSelectTime: (time: string) => void;
  rangeSelection: { start: string | null; end: string | null };
  reducedMotion: boolean;
  series: PersonalTerminalSeries;
  theme: V11ThemeTokens;
  timeframe: PersonalTerminalTimeframe;
  viewData: PersonalTerminalViewData;
}>(({
  chartKind,
  comparisonSeries = null,
  comparisonViewData = null,
  indicators,
  language,
  onCrosshair,
  onInteraction,
  onSelectEvent,
  onSelectTime,
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
  const primarySeriesRef = useRef<any>(null);
  const [baselineBand, setBaselineBand] = useState<{ top: number; height: number } | null>(null);

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
  }), []);

  const lookup = useMemo(() => {
    const result = new Map<string, PersonalTerminalPoint>();
    viewData.line.forEach((point) => result.set(String(chartTime(point.time)), point));
    return result;
  }, [viewData.line]);

  useEffect(() => {
    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;
    let chart: any = null;
    const host = hostRef.current;
    if (!host || typeof window === 'undefined') return undefined;

    (async () => {
      const library = await import('lightweight-charts');
      if (disposed || !hostRef.current) return;
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
        localization: { priceFormatter: compactNumber },
        grid: {
          vertLines: { color: theme.questTheme.colors.border, style: library.LineStyle.Dashed, visible: false },
          horzLines: { color: theme.questTheme.colors.border, style: library.LineStyle.Dotted, visible: false },
        },
        crosshair: {
          mode: library.CrosshairMode.Normal,
          vertLine: { color: theme.text.secondary, width: 1, style: library.LineStyle.Dashed, labelBackgroundColor: theme.questTheme.colors.surfaceElevated },
          horzLine: { color: theme.text.secondary, width: 1, style: library.LineStyle.Dashed, labelBackgroundColor: theme.questTheme.colors.surfaceElevated },
        },
        handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
        handleScale: { axisDoubleClickReset: true, axisPressedMouseMove: true, mouseWheel: true, pinch: true },
        kineticScroll: { mouse: !reducedMotion, touch: !reducedMotion },
        leftPriceScale: { visible: Boolean(comparisonSeries), borderVisible: false, scaleMargins: { top: 0.12, bottom: indicators.has('load') ? 0.24 : 0.1 } },
        rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.12, bottom: indicators.has('load') ? 0.24 : 0.1 } },
        timeScale: { borderVisible: false, timeVisible: timeframe === '1D', secondsVisible: false, rightOffset: 2, barSpacing: timeframe === '1D' ? 34 : 10, minBarSpacing: 2 },
      });
      chartRef.current = chart;

      let primary: any;
      if (chartKind === 'candle' && series.supportsCandle && viewData.candles.length > 0) {
        primary = chart.addSeries(library.CandlestickSeries, {
          upColor: theme.glow.primary,
          downColor: theme.glow.supporting,
          borderUpColor: theme.glow.primary,
          borderDownColor: theme.glow.supporting,
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
      } else {
        primary = chart.addSeries(library.LineSeries, {
          color: theme.glow.primary,
          lineWidth: 2,
          lineType: library.LineType.Curved,
          pointMarkersVisible: viewData.line.length < 40,
          pointMarkersRadius: 2,
          priceLineVisible: false,
          lastValueVisible: true,
        });
        const confirmed = viewData.line.filter((row) => row.provenance !== 'historical_reference');
        const historical = viewData.line.filter((row) => row.provenance === 'historical_reference');
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
          lineType: library.LineType.Curved,
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
        if (selection) onSelectTime(selection.time);
      };
      chart.subscribeCrosshairMove(crosshairHandler);
      chart.subscribeClick(clickHandler);
      const rangeHandler = (range: any) => {
        if (visibleRangeRef.current) onInteraction?.();
        visibleRangeRef.current = range;
        updateBaselineBand();
      };
      chart.timeScale().subscribeVisibleLogicalRangeChange(rangeHandler);
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
  }, [chartKind, comparisonSeries, comparisonViewData, indicators, language, lookup, onCrosshair, onInteraction, onSelectEvent, onSelectTime, reducedMotion, series, theme, timeframe, viewData]);

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
      <WebView dataSet={{ 'personal-terminal-role': 'time-calibration' }} pointerEvents="none" />
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
              <WebView />
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
