import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import type { Lang } from '../i18n';
import type { QuestVisualFoundation } from '../design/visualFoundation';
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
  value: number;
  sourceIds: string[];
  observationCount: number;
  candle?: {
    open: number;
    high: number;
    low: number;
    close: number;
  };
};

export type InsightsV3ChartHandle = {
  fit: () => void;
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

const InsightsV3Chart = forwardRef<InsightsV3ChartHandle, {
  asOf: string;
  chartKind: InsightsV3ChartKind;
  comparisonSeries?: QuantProductSeriesV1 | null;
  foundation: QuestVisualFoundation;
  lang: Lang;
  onReady?: (durationMs: number) => void;
  range: InsightsV3RangeSelection;
  series: QuantProductSeriesV1;
  showEvents: boolean;
  showReference: boolean;
  showReferenceRange: boolean;
}>(({
  asOf,
  chartKind,
  comparisonSeries = null,
  foundation,
  lang,
  onReady,
  range,
  series,
  showEvents,
  showReference,
  showReferenceRange,
}, ref) => {
  const hostRef = useRef<HTMLElement | null>(null);
  const chartRef = useRef<any>(null);
  const [selection, setSelection] = useState<InsightsV3ChartSelection | null>(null);
  const points = useMemo(() => selectSeriesPoints(series, range, asOf), [asOf, range, series]);
  const candles = useMemo(() => selectSeriesCandles(series, range), [range, series]);
  const comparisonPoints = useMemo(
    () => comparisonSeries ? selectSeriesPoints(comparisonSeries, range, asOf) : [],
    [asOf, comparisonSeries, range],
  );

  useImperativeHandle(ref, () => ({
    fit: () => chartRef.current?.timeScale().fitContent(),
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
      const comparison = dark ? '#C7A4FF' : '#7A43C5';
      const reference = dark ? '#D4B36A' : '#8D6B22';
      const event = dark ? '#F0A86B' : '#A65314';
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
        leftPriceScale: { visible: Boolean(comparisonSeries), borderVisible: false, scaleMargins: { top: 0.12, bottom: 0.12 } },
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
        });
        primary.setData(uniquePoints(points).map(([time, point]) => ({ time: time as any, value: point.value })) as any);
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
      if (comparisonSeries && comparisonPoints.length > 0) {
        const comparisonLine = chart.addSeries(library.LineSeries, {
          color: comparison,
          lineWidth: 2,
          lineStyle: library.LineStyle.Dashed,
          priceScaleId: 'left',
          priceFormat: priceFormat(comparisonSeries.unit),
          priceLineVisible: false,
          lastValueVisible: true,
        });
        comparisonLine.setData(uniquePoints(comparisonPoints).map(([time, point]) => ({ time: time as any, value: point.value })) as any);
      }

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
        if (candle) {
          setSelection({
            time: candle.start,
            value: candle.close,
            sourceIds: candle.source_ids,
            observationCount: candle.observation_count,
            candle: { open: candle.open, high: candle.high, low: candle.low, close: candle.close },
          });
          return;
        }
        const point = pointLookup.get(key);
        if (point) setSelection({
          time: point.observed_at,
          value: point.value,
          sourceIds: [point.observation_id],
          observationCount: 1,
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
  }, [asOf, candles, chartKind, comparisonPoints, comparisonSeries, foundation, lang, onReady, points, series, showEvents, showReference, showReferenceRange]);

  return (
    <WebView accessibilityLabel={iv3(lang, 'chartAccessibility')} accessibilityRole="image" dataSet={{ 'insights-v3-role': 'chart-wrap' }}>
      <WebView ref={hostRef} dataSet={{ 'insights-v3-role': 'chart-host' }} />
      {selection ? (
        <WebView dataSet={{ 'insights-v3-role': 'chart-selection' }}>
          <Text style={{ color: foundation.text.primary }}>
            {iv3(lang, 'valueAtTime', {
              date: formatDateTime(lang, selection.time, true),
              value: `${formatQuantValue(selection.value, series.unit, lang)} ${unitLabel(series.unit, lang)}`.trim(),
            })}
          </Text>
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
