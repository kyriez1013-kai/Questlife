import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { Text, View } from 'react-native';
import type { Lang } from '../../i18n';
import { t } from '../../i18n';
import type { V11ThemeTokens } from '../../v11/tokens';
import type {
  PersonalTerminalChartKind,
  PersonalTerminalIndicator,
  PersonalTerminalPoint,
  PersonalTerminalSeries,
  PersonalTerminalTimeframe,
  PersonalTerminalViewData,
} from './personalTerminalPresentation';

const WebView = View as any;

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
  indicators: Set<PersonalTerminalIndicator>;
  language: Lang;
  onCrosshair: (selection: PersonalTerminalChartSelection | null) => void;
  onSelectTime: (time: string) => void;
  rangeSelection: { start: string | null; end: string | null };
  reducedMotion: boolean;
  series: PersonalTerminalSeries;
  theme: V11ThemeTokens;
  timeframe: PersonalTerminalTimeframe;
  viewData: PersonalTerminalViewData;
}>(({
  chartKind,
  indicators,
  language,
  onCrosshair,
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
          background: { type: library.ColorType.Solid, color: 'transparent' },
          textColor: theme.text.metadata,
          fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, sans-serif',
          fontSize: 10,
          panes: { separatorColor: theme.questTheme.colors.border, separatorHoverColor: theme.glow.primary },
        },
        localization: { priceFormatter: compactNumber },
        grid: {
          vertLines: { color: theme.questTheme.colors.border, style: library.LineStyle.Dotted, visible: true },
          horzLines: { color: theme.questTheme.colors.border, style: library.LineStyle.Dotted, visible: true },
        },
        crosshair: {
          mode: library.CrosshairMode.Normal,
          vertLine: { color: theme.text.secondary, width: 1, style: library.LineStyle.Dashed, labelBackgroundColor: theme.questTheme.colors.surfaceElevated },
          horzLine: { color: theme.text.secondary, width: 1, style: library.LineStyle.Dashed, labelBackgroundColor: theme.questTheme.colors.surfaceElevated },
        },
        handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
        handleScale: { axisDoubleClickReset: true, axisPressedMouseMove: true, mouseWheel: true, pinch: true },
        kineticScroll: { mouse: !reducedMotion, touch: !reducedMotion },
        rightPriceScale: { borderColor: theme.questTheme.colors.border, scaleMargins: { top: 0.12, bottom: indicators.has('load') ? 0.24 : 0.1 } },
        timeScale: { borderColor: theme.questTheme.colors.border, timeVisible: timeframe === '1D', secondsVisible: false, rightOffset: 2, barSpacing: timeframe === '1D' ? 34 : 10, minBarSpacing: 2 },
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
      if (indicators.has('events') && series.events.length > 0) {
        const markers = series.events.flatMap((event) => {
          const point = nearestPoint(viewData.line, event.timestamp);
          return point ? [{
            time: chartTime(point.time),
            position: 'aboveBar' as const,
            color: theme.text.secondary,
            shape: 'circle' as const,
            text: '',
          }] : [];
        });
        if (markers.length) library.createSeriesMarkers(primary, markers as any);
      }

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
        const selection = selectionFor(param.time, param);
        if (selection) onSelectTime(selection.time);
      };
      chart.subscribeCrosshairMove(crosshairHandler);
      chart.subscribeClick(clickHandler);
      const rangeHandler = (range: any) => { visibleRangeRef.current = range; };
      chart.timeScale().subscribeVisibleLogicalRangeChange(rangeHandler);
      chart.timeScale().fitContent();
      if (visibleRangeRef.current) chart.timeScale().setVisibleLogicalRange(visibleRangeRef.current);

      resizeObserver = new ResizeObserver(() => chart?.applyOptions({ width: hostRef.current?.clientWidth || 0, height: hostRef.current?.clientHeight || 0 }));
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
  }, [chartKind, indicators, language, lookup, onCrosshair, onSelectTime, reducedMotion, series, theme, timeframe, viewData]);

  return (
    <WebView dataSet={{ 'personal-terminal-role': 'chart-frame' }}>
      <WebView
        accessibilityLabel={t(language, 'personalTerminalChartAccessibility')}
        accessibilityRole="image"
        dataSet={{ 'personal-terminal-role': 'chart-host' }}
        ref={(node: HTMLElement | null) => { hostRef.current = node; }}
      />
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
