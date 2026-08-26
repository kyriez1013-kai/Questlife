import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import type { Lang } from '../i18n';
import type { QuestVisualFoundation } from '../design/visualFoundation';
import type { QuantIndicatorSeriesV1 } from '../quant-product/quantAnalysisContract';
import type { QuantProductSeriesV1 } from '../quant-product/quantProductContract';
import {
  formatDateTime,
  formatQuantValue,
  selectSeriesCandles,
  selectSeriesPoints,
  unitLabel,
  type InsightsV3ChartKind,
  type InsightsV3RangeSelection,
} from './insightsV3Presentation';
import { iv3 } from './insightsV3I18n';

const WebView = View as any;

export type InsightsV3ChartSelection = {
  time: string;
  placement: 'left' | 'right';
  rows: Array<{
    color: string;
    id: string;
    label: string;
    unit: string;
    value: number;
  }>;
  candle?: {
    open: number;
    high: number;
    low: number;
    close: number;
  };
};

export type InsightsV3ComparisonSeries = {
  instrumentId: string;
  label: string;
  matchingWindowKey: string | null;
  overlapCount: number | null;
  series: QuantProductSeriesV1;
};

export type InsightsV3IndicatorLayer = {
  label: string;
  series: QuantIndicatorSeriesV1;
};

export type InsightsV3ChartHandle = {
  fit: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
};

function chartTime(value: string) {
  return Math.round(new Date(value).getTime() / 1000) as any;
}

function timeKey(value: unknown) {
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return String(chartTime(value));
  if (value && typeof value === 'object' && 'year' in value && 'month' in value && 'day' in value) {
    const row = value as { year: number; month: number; day: number };
    return String(chartTime(`${row.year}-${String(row.month).padStart(2, '0')}-${String(row.day).padStart(2, '0')}T00:00:00Z`));
  }
  return '';
}

function uniquePoints(points: QuantProductSeriesV1['points']) {
  const rows = new Map<number, QuantProductSeriesV1['points'][number]>();
  points.forEach((point) => rows.set(chartTime(point.observed_at), point));
  return Array.from(rows.entries()).sort((a, b) => a[0] - b[0]);
}

function utcDayKey(value: string) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString().slice(0, 10) : '';
}

const InsightsV3Chart = forwardRef<InsightsV3ChartHandle, {
  asOf: string;
  chartKind: InsightsV3ChartKind;
  comparisonSeries?: InsightsV3ComparisonSeries[];
  foundation: QuestVisualFoundation;
  indicatorSeries?: InsightsV3IndicatorLayer[];
  lang: Lang;
  onReady?: (durationMs: number) => void;
  range: InsightsV3RangeSelection;
  series: QuantProductSeriesV1;
  targetLabel: string;
  showEvents: boolean;
  showRawObservations: boolean;
  showReference: boolean;
  showReferenceRange: boolean;
}>(({
  asOf,
  chartKind,
  comparisonSeries = [],
  foundation,
  indicatorSeries = [],
  lang,
  onReady,
  range,
  series,
  targetLabel,
  showEvents,
  showRawObservations,
  showReference,
  showReferenceRange,
}, ref) => {
  const hostRef = useRef<HTMLElement | null>(null);
  const chartRef = useRef<any>(null);
  const [selection, setSelection] = useState<InsightsV3ChartSelection | null>(null);
  const points = useMemo(() => selectSeriesPoints(series, range, asOf), [asOf, range, series]);
  const candles = useMemo(() => selectSeriesCandles(series, range), [range, series]);
  const comparisonPoints = useMemo(
    () => comparisonSeries.map((item) => ({
      ...item,
      points: selectSeriesPoints(item.series, range, asOf),
    })),
    [asOf, comparisonSeries, range],
  );

  useImperativeHandle(ref, () => ({
    fit: () => chartRef.current?.timeScale().fitContent(),
    zoomIn: () => {
      const scale = chartRef.current?.timeScale();
      const visible = scale?.getVisibleLogicalRange();
      if (!scale || !visible) return;
      const center = (visible.from + visible.to) / 2;
      const span = Math.max(2, (visible.to - visible.from) / 1.5);
      scale.setVisibleLogicalRange({ from: center - span / 2, to: center + span / 2 });
    },
    zoomOut: () => {
      const scale = chartRef.current?.timeScale();
      const visible = scale?.getVisibleLogicalRange();
      if (!scale || !visible) return;
      const center = (visible.from + visible.to) / 2;
      const span = Math.max(6, (visible.to - visible.from) * 1.5);
      scale.setVisibleLogicalRange({ from: center - span / 2, to: center + span / 2 });
    },
  }), []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof window === 'undefined') return undefined;
    const startedAt = performance.now();
    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;
    let chart: any = null;

    (async () => {
      const library = await import('lightweight-charts');
      if (disposed || !hostRef.current) return;
      const dark = document.documentElement.classList.contains('questlife-theme-dark');
      const observed = dark ? '#78A7FF' : '#235EDB';
      const comparisonPalette = [
        foundation.data.comparison,
        foundation.semantic.info,
        foundation.data.neutral,
      ];
      const reference = dark ? '#D4B36A' : '#8D6B22';
      const event = dark ? '#F0A86B' : '#A65314';
      const indicatorPalette = [foundation.interaction.accent, foundation.data.neutral];
      const hasComparablePrimaryRange = points.length > 1 || candles.length > 0;
      const priceFormat = (unit: string) => ({
        type: 'custom' as const,
        formatter: (value: number) => formatQuantValue(value, unit, lang),
        minMove: unit === '/5' || unit === 'steps' || unit === 'bpm' || unit === 'minutes_from_local_noon'
          ? 1
          : unit === 'kilometres'
            ? 0.01
            : 0.1,
      });
      chart = library.createChart(hostRef.current, {
        autoSize: true,
        layout: {
          attributionLogo: false,
          background: { type: library.ColorType.Solid, color: 'transparent' },
          textColor: foundation.text.metadata,
          fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, sans-serif',
          fontSize: 10,
        },
        grid: {
          vertLines: { visible: false },
          horzLines: { color: foundation.border.divider, style: library.LineStyle.Dotted, visible: hasComparablePrimaryRange },
        },
        crosshair: {
          mode: library.CrosshairMode.Normal,
          vertLine: { color: foundation.text.metadata, style: library.LineStyle.Dashed, labelBackgroundColor: foundation.material.elevated },
          horzLine: { color: foundation.text.metadata, style: library.LineStyle.Dashed, labelBackgroundColor: foundation.material.elevated },
        },
        handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
        handleScale: { axisDoubleClickReset: true, axisPressedMouseMove: true, mouseWheel: true, pinch: true },
        leftPriceScale: { visible: comparisonSeries.length > 0, borderVisible: false, scaleMargins: { top: 0.12, bottom: 0.12 } },
        rightPriceScale: { visible: hasComparablePrimaryRange, borderVisible: false, scaleMargins: { top: 0.12, bottom: 0.12 } },
        timeScale: { borderVisible: false, rightOffset: 2, minBarSpacing: 2, timeVisible: true, secondsVisible: false },
        localization: {
          priceFormatter: (value: number) => formatQuantValue(value, series.unit, lang),
          timeFormatter: (value: unknown) => {
            const key = Number(timeKey(value));
            return Number.isFinite(key) ? formatDateTime(lang, new Date(key * 1000).toISOString(), true) : '';
          },
        },
      });
      chartRef.current = chart;

      const trackedSeries: Array<{
        api: any;
        color: string;
        dayValues?: Map<string, number>;
        id: string;
        label: string;
        unit: string;
      }> = [];
      const trackedIndicators: typeof trackedSeries = [];

      let primary: any;
      const renderCandle = chartKind === 'candle' && candles.length > 0;
      if (renderCandle) {
        primary = chart.addSeries(library.CandlestickSeries, {
          upColor: 'transparent',
          downColor: 'transparent',
          borderUpColor: observed,
          borderDownColor: observed,
          wickUpColor: foundation.text.secondary,
          wickDownColor: foundation.text.secondary,
          priceFormat: priceFormat(series.unit),
          priceLineVisible: false,
          lastValueVisible: true,
          visible: showRawObservations,
        });
        primary.setData(candles.map((row) => ({
          time: chartTime(row.start),
          open: row.open,
          high: row.high,
          low: row.low,
          close: row.close,
        })) as any);
      } else if (chartKind === 'bar') {
        primary = chart.addSeries(library.HistogramSeries, {
          color: observed,
          priceFormat: priceFormat(series.unit),
          priceLineVisible: false,
          lastValueVisible: true,
          visible: showRawObservations,
        });
        primary.setData(uniquePoints(points).map(([time, point]) => ({ time: time as any, value: point.value, color: observed })) as any);
      } else {
        primary = chart.addSeries(library.LineSeries, {
          color: observed,
          lineWidth: chartKind === 'point' || points.length === 1 ? 1 : 2,
          lineVisible: chartKind !== 'point' && points.length > 1,
          pointMarkersVisible: chartKind === 'point' || points.length < 24,
          pointMarkersRadius: points.length === 1 ? 5 : 3,
          priceFormat: priceFormat(series.unit),
          priceLineVisible: false,
          lastValueVisible: true,
          visible: showRawObservations,
        });
        primary.setData(uniquePoints(points).map(([time, point]) => ({ time: time as any, value: point.value })) as any);
      }
      if (showRawObservations) {
        trackedSeries.push({
          api: primary,
          color: observed,
          dayValues: new Map(points.map((point) => [utcDayKey(point.observed_at), point.value])),
          id: series.instrument_id,
          label: targetLabel,
          unit: series.unit,
        });
      }

      if (showReference && series.reference.value != null) {
        primary.createPriceLine({
          price: series.reference.value,
          color: reference,
          lineWidth: 1,
          lineStyle: library.LineStyle.Dashed,
          axisLabelVisible: false,
          title: '',
        });
      }
      if (showReferenceRange && series.reference.low != null && series.reference.high != null) {
        [series.reference.low, series.reference.high].forEach((price) => primary.createPriceLine({
          price,
          color: reference,
          lineWidth: 1,
          lineStyle: library.LineStyle.Dotted,
          axisLabelVisible: false,
          title: '',
        }));
      }
      if (series.range_points.length > 0 && showReferenceRange) {
        const low = chart.addSeries(library.LineSeries, { color: reference, lineWidth: 1, lineStyle: library.LineStyle.Dotted, priceFormat: priceFormat(series.unit), priceLineVisible: false, lastValueVisible: false });
        const high = chart.addSeries(library.LineSeries, { color: reference, lineWidth: 1, lineStyle: library.LineStyle.Dotted, priceFormat: priceFormat(series.unit), priceLineVisible: false, lastValueVisible: false });
        low.setData(series.range_points.map((row) => ({ time: chartTime(row.timestamp), value: row.low })) as any);
        high.setData(series.range_points.map((row) => ({ time: chartTime(row.timestamp), value: row.high })) as any);
      }
      indicatorSeries.forEach((item, index) => {
        const color = indicatorPalette[index % indicatorPalette.length];
        const firstTime = points[0]?.observed_at ? Date.parse(points[0].observed_at) : Number.NEGATIVE_INFINITY;
        const lastTime = points.at(-1)?.observed_at ? Date.parse(points.at(-1)!.observed_at) : Number.POSITIVE_INFINITY;
        const visiblePoints = item.series.points.filter((point) => {
          const timestamp = Date.parse(point.observed_at);
          return timestamp >= firstTime && timestamp <= lastTime;
        });
        if (!visiblePoints.length) return;
        const indicatorLine = chart.addSeries(library.LineSeries, {
          color,
          lineWidth: 1,
          lineStyle: item.series.layer_kind === 'EWMA_SHORT' ? library.LineStyle.Solid : library.LineStyle.Dashed,
          priceScaleId: 'right',
          priceFormat: priceFormat(item.series.unit),
          priceLineVisible: false,
          lastValueVisible: false,
          pointMarkersVisible: false,
        });
        indicatorLine.setData(visiblePoints.map((point) => ({ time: chartTime(point.observed_at), value: point.value })) as any);
        trackedIndicators.push({
          api: indicatorLine,
          color,
          dayValues: new Map(visiblePoints.map((point) => [utcDayKey(point.observed_at), point.value])),
          id: item.series.indicator_id,
          label: item.label,
          unit: item.series.unit,
        });
      });

      comparisonPoints.forEach((item, index) => {
        if (!item.points.length) return;
        const color = comparisonPalette[index % comparisonPalette.length];
        const comparisonLine = chart.addSeries(library.LineSeries, {
          color,
          lineWidth: 2,
          lineStyle: library.LineStyle.Dashed,
          priceScaleId: index === 0 ? 'left' : `compare-${index + 1}`,
          priceFormat: priceFormat(item.series.unit),
          priceLineVisible: false,
          lastValueVisible: index === 0,
        });
        comparisonLine.setData(uniquePoints(item.points).map(([time, point]) => ({ time: time as any, value: point.value })) as any);
        if (index > 0) chart.priceScale(`compare-${index + 1}`).applyOptions({ visible: false, scaleMargins: { top: 0.12, bottom: 0.12 } });
        trackedSeries.push({
          api: comparisonLine,
          color,
          dayValues: item.matchingWindowKey === 'calendar_day_utc'
            ? new Map(item.points.map((point) => [utcDayKey(point.observed_at), point.value]))
            : undefined,
          id: item.instrumentId,
          label: item.label,
          unit: item.series.unit,
        });
      });
      trackedSeries.push(...trackedIndicators);

      const pointLookup = new Map(uniquePoints(points).map(([time, point]) => [String(time), point]));
      const candleLookup = new Map(candles.map((row) => [String(chartTime(row.start)), row]));
      if (showEvents && series.events.length > 0 && points.length > 0) {
        const times = uniquePoints(points);
        const nearest = (timestamp: string) => times.reduce((best, row) => (
          Math.abs(row[0] - chartTime(timestamp)) < Math.abs(best[0] - chartTime(timestamp)) ? row : best
        ), times[0]);
        const markers = series.events.map((row) => ({
          id: row.event_id,
          time: nearest(row.timestamp)[0] as any,
          position: row.event_type === 'PLAN' ? 'belowBar' as const : 'aboveBar' as const,
          color: event,
          shape: row.event_type === 'PLAN' ? 'arrowUp' as const : 'circle' as const,
          size: 0.45,
          text: '',
        }));
        library.createSeriesMarkers(primary, markers as any);
      }

      chart.subscribeCrosshairMove((param: any) => {
        if (!param.time) {
          setSelection(null);
          return;
        }
        const key = timeKey(param.time);
        const candle = candleLookup.get(key);
        const point = pointLookup.get(key);
        const rows = trackedSeries.flatMap((tracked) => {
          const datum = param.seriesData?.get(tracked.api);
          const exactValue = datum && typeof datum === 'object'
            ? ('value' in datum ? Number(datum.value) : 'close' in datum ? Number(datum.close) : null)
            : null;
          const selectedDay = Number.isFinite(Number(key))
            ? new Date(Number(key) * 1000).toISOString().slice(0, 10)
            : '';
          const value = exactValue ?? tracked.dayValues?.get(selectedDay) ?? null;
          return value != null && Number.isFinite(value)
            ? [{ color: tracked.color, id: tracked.id, label: tracked.label, unit: tracked.unit, value }]
            : [];
        });
        if (!rows.length && !point && !candle) {
          setSelection(null);
          return;
        }
        const width = hostRef.current?.clientWidth ?? 0;
        setSelection({
          time: candle?.start ?? point?.observed_at ?? new Date(Number(key) * 1000).toISOString(),
          placement: param.point?.x > width * 0.56 ? 'left' : 'right',
          rows,
          candle: candle ? { open: candle.open, high: candle.high, low: candle.low, close: candle.close } : undefined,
        });
      });
      chart.timeScale().fitContent();
      onReady?.(performance.now() - startedAt);
      resizeObserver = new ResizeObserver(() => chart?.timeScale().fitContent());
      resizeObserver.observe(hostRef.current);
    })();

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      chart?.remove();
      chartRef.current = null;
    };
  }, [asOf, candles, chartKind, comparisonPoints, comparisonSeries, foundation, indicatorSeries, lang, onReady, points, series, showEvents, showRawObservations, showReference, showReferenceRange, targetLabel]);

  return (
    <WebView accessibilityLabel={iv3(lang, 'chartAccessibility')} accessibilityRole="image" dataSet={{ 'insights-v3-role': 'chart-wrap' }}>
      <WebView ref={hostRef} dataSet={{ 'insights-v3-role': 'chart-host' }} />
      {selection ? (
        <WebView
          dataSet={{
            'insights-v3-placement': selection.placement,
            'insights-v3-role': 'chart-selection',
          }}
        >
          <Text style={{ color: foundation.text.primary }}>{formatDateTime(lang, selection.time, true)}</Text>
          {selection.rows.map((row) => (
            <WebView dataSet={{ 'insights-v3-role': 'inspector-row' }} key={row.id}>
              <WebView style={{ backgroundColor: row.color }} />
              <Text numberOfLines={1} style={{ color: foundation.text.secondary }}>{row.label}</Text>
              <Text numberOfLines={1} style={{ color: foundation.text.primary }}>
                {formatQuantValue(row.value, row.unit, lang)}{unitLabel(row.unit, lang) ? ` ${unitLabel(row.unit, lang)}` : ''}
              </Text>
            </WebView>
          ))}
          {selection.candle ? (
            <Text style={{ color: foundation.text.secondary }}>
              {iv3(lang, 'candleDetail', {
                open: formatQuantValue(selection.candle.open, series.unit, lang),
                high: formatQuantValue(selection.candle.high, series.unit, lang),
                low: formatQuantValue(selection.candle.low, series.unit, lang),
                close: formatQuantValue(selection.candle.close, series.unit, lang),
              })}
            </Text>
          ) : null}
        </WebView>
      ) : null}
    </WebView>
  );
});

export default InsightsV3Chart;
