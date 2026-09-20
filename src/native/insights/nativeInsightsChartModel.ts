import type { QuestLifeChartModelV1 } from '../../platform/charts/contract';
import { chartWireModel } from '../../platform/charts/contract';
import { inRangeEvents } from './nativeInsightsPresentation';
import { formatDateTime, formatQuantValue, unitLabel } from '../../insights-v3/insightsV3Presentation';
import { iv3 } from '../../insights-v3/insightsV3I18n';
import type { QuestTheme } from '../../design/tokens';

export function nativeChartModel(model: QuestLifeChartModelV1, q: QuestTheme) {
  const p = model.presentation;
  const base = chartWireModel({ ...model, presentation: { ...p, comparisonSeries: [], indicatorSeries: [] } });
  const first = base.points[0]?.time ?? Infinity; const last = base.points.at(-1)?.time ?? -Infinity;
  const palette = [q.colors.accent, q.colors.warning, q.colors.textMuted];
  const timed = (rows: Array<{ observed_at: string; value: number }>) => {
    const unique = new Map<number, { time: number; value: number }>();
    rows.forEach(row => { const time = Math.floor(Date.parse(row.observed_at) / 1000); if (time >= first && time <= last) unique.set(time, { time, value: row.value }); });
    return [...unique.values()].sort((a, b) => a.time - b.time);
  };
  const layers = [
    ...(p.comparisonSeries ?? []).map((row, index) => ({ id: row.instrumentId, label: row.label, unit: row.series.unit, color: palette[index % palette.length], dashed: true, points: timed(row.series.points) })),
    ...(p.indicatorSeries ?? []).map(row => ({ id: row.series.indicator_id, label: row.label, unit: row.series.unit, color: row.series.layer_kind === 'EWMA_SHORT' ? q.colors.success : q.colors.danger, dashed: row.series.layer_kind === 'EWMA_LONG', points: timed(row.series.points) })),
  ];
  const bands = p.showReferenceRange ? p.series.range_points.filter(row => {
    const time = Date.parse(row.timestamp) / 1000; return time >= first && time <= last;
  }).map(row => ({ time: Math.floor(Date.parse(row.timestamp) / 1000), low: row.low, high: row.high })) : [];
  return { ...base, layers, bands, lang: p.lang, fontSize: q.typography.helperSize, referenceColor: q.colors.textMuted,
    binaryYes: formatQuantValue(1, 'binary', p.lang), binaryNo: formatQuantValue(0, 'binary', p.lang),
    unitDisplay: unitLabel(p.series.unit, p.lang),
    referenceLabels: { value: iv3(p.lang, 'reference'), low: iv3(p.lang, 'rangeIndicator'), high: iv3(p.lang, 'rangeIndicator') },
    events: p.showEvents ? inRangeEvents(p.series, p.range, p.asOf).map(row => ({ time: Math.floor(Date.parse(row.timestamp) / 1000), label: row.event_type })) : [],
  };
}

export type NativeChartModel = ReturnType<typeof nativeChartModel>;
export type NativeChartSelection = { time: number; value: number | null; candle?: { open: number; high: number; low: number; close: number }; rows: Array<{ id: string; value: number }> };
export type NativeChartEvent = { type: 'ready' | 'error' } | ({ type: 'selection' } & NativeChartSelection);
export function parseNativeChartEvent(value: unknown): NativeChartEvent | null {
  try {
    const row = typeof value === 'string' ? JSON.parse(value) : value;
    if (!row || row.channel !== 'native-insights') return null;
    if (row.type === 'ready' || row.type === 'error') return { type: row.type };
    if (row.type !== 'selection' || !Number.isFinite(row.time) || !Number.isFinite(new Date(row.time * 1000).getTime()) || !(row.value === null || Number.isFinite(row.value)) || !Array.isArray(row.rows)) return null;
    if (!row.rows.every((item: { id?: unknown; value?: unknown }) => typeof item.id === 'string' && Number.isFinite(item.value))) return null;
    if (row.candle && !['open', 'high', 'low', 'close'].every(key => Number.isFinite(row.candle[key]))) return null;
    return row;
  } catch { return null; }
}

export function selectionText(model: NativeChartModel, selection: NativeChartSelection) {
  const lines = [`${formatDateTime(model.lang, new Date(selection.time * 1000).toISOString(), true)} · ${model.label} · ${formatQuantValue(selection.value, model.unit, model.lang)} ${model.unitDisplay}`];
  selection.rows.forEach(row => {
    const layer = model.layers.find(item => item.id === row.id);
    if (layer) lines.push(`${layer.label} · ${formatQuantValue(row.value, layer.unit, model.lang)} ${unitLabel(layer.unit, model.lang)}`);
  });
  if (selection.candle) lines.push(iv3(model.lang, 'candleDetail', Object.fromEntries(Object.entries(selection.candle).map(([key, value]) => [key, formatQuantValue(value, model.unit, model.lang)]))));
  return lines.join('\n');
}
