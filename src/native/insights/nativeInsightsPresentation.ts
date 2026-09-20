import type { Lang } from '../../i18n';
import type { OwnerQuantRuntimeArtifacts } from '../../adaptive-decision/ownerQuantRuntime';
import type { QuantAnalysisExtensionV1 } from '../../quant-product/quantAnalysisContract';
import type { QuantProductBundleV1, QuantProductSeriesV1 } from '../../quant-product/quantProductContract';
import type { QuantProductConsumerInstrument } from '../../quant-product/quantProductV1Adapter';
import { availableChartKinds, rangeLabel, selectSeriesCandles, selectSeriesPoints, type InsightsV3RangeSelection } from '../../insights-v3/insightsV3Presentation';
import { ni } from './nativeInsightsStrings';

export function localDateKey(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function parseLocalDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isFinite(date.getTime()) && localDateKey(date) === value ? date : null;
}

export function customSelection(mode: 'days' | 'observations' | 'calendar', amount: string, start: string, end: string): InsightsV3RangeSelection | null {
  if (mode === 'calendar') {
    const from = parseLocalDate(start); const to = parseLocalDate(end);
    return from && to && from <= to ? { kind: 'calendar', start, end } : null;
  }
  const count = Number(amount);
  if (!/^\d+$/.test(amount) || !Number.isSafeInteger(count) || count < 1) return null;
  return mode === 'days' ? { kind: 'last_n_days', days: count } : { kind: 'last_n_observations', count };
}

export function nativeRangeLabel(lang: Lang, selection: InsightsV3RangeSelection, series?: QuantProductSeriesV1 | null) {
  const item = selection.kind === 'contract' ? series?.supported_ranges.find(row => row.key === selection.key) : null;
  const names = { MONTH: 'month', QUARTER: 'quarter', HALF_YEAR: 'halfYear', YEAR: 'year' } as const;
  if (item && item.kind in names) return `${ni(lang, names[item.kind as keyof typeof names])}${item.start ? ` ${localDateKey(item.start)}` : ''}`;
  if (item?.key.startsWith('CUSTOM_')) {
    if (item.kind === 'LAST_N_OBSERVATIONS' && item.count) return rangeLabel(lang, { kind: 'last_n_observations', count: item.count });
    if (item.start && item.end) return `${localDateKey(item.start)} / ${localDateKey(item.end)}`;
  }
  return rangeLabel(lang, selection);
}

export function renderableKinds(series: QuantProductSeriesV1 | null, range: InsightsV3RangeSelection) {
  return availableChartKinds(series).filter(kind => kind !== 'candle' || (series && selectSeriesCandles(series, range).length > 0));
}

/** Identity, provenance and unit guards only. Numerical analyses stay Quant-owned. */
export function matchingAnalysis(bundle: QuantProductBundleV1 | null, analysis?: QuantAnalysisExtensionV1 | null) {
  if (!bundle || !analysis || analysis.base_bundle_id !== bundle.metadata.bundle_id
    || analysis.as_of !== bundle.metadata.as_of
    || analysis.base_product_contract_version !== bundle.metadata.contract_version
    || analysis.synthetic_only !== bundle.metadata.synthetic_only
    || analysis.contains_real_user_data !== bundle.metadata.contains_real_user_data) return null;
  return analysis;
}

export function comparisonBlock(primary: QuantProductConsumerInstrument, candidate: QuantProductConsumerInstrument) {
  if (!candidate.series.length) return 'noSeries' as const;
  const series = candidate.series[0]; const target = primary.series[0];
  if (candidate.unit !== primary.unit || candidate.scale !== primary.scale || series.unit !== target?.unit || series.scale !== target.scale) return 'incompatible' as const;
  if (/hrv/i.test(`${primary.constructKey} ${candidate.constructKey}`)
    && (primary.constructKey !== candidate.constructKey || primary.evidence.provenance.method !== candidate.evidence.provenance.method)) return 'incompatibleMethod' as const;
  return null;
}

/** Compare the same time interval, not independently selected last-N samples. */
export function comparisonInWindow(primary: QuantProductSeriesV1, candidate: QuantProductSeriesV1, range: InsightsV3RangeSelection, asOf: string): QuantProductSeriesV1 {
  const points = selectSeriesPoints(primary, range, asOf);
  const start = points[0] ? Date.parse(points[0].observed_at) : Infinity;
  const end = points.at(-1) ? Date.parse(points.at(-1)!.observed_at) : -Infinity;
  return {
    ...candidate,
    points: candidate.points.filter(row => Date.parse(row.observed_at) >= start && Date.parse(row.observed_at) <= end),
  };
}

export function inRangeEvents(series: QuantProductSeriesV1, range: InsightsV3RangeSelection, asOf: string) {
  const eventSeries = { ...series, points: series.events.map(row => ({ observation_id: row.event_id, observed_at: row.timestamp, value: 1, unit: '', source_class: 'event' })) };
  if (range.kind === 'last_n_observations' || (range.kind === 'contract' && series.supported_ranges.find(row => row.key === range.key)?.kind === 'LAST_N_OBSERVATIONS')) {
    const points = selectSeriesPoints(series, range, asOf);
    return series.events.filter(event => points.length && Date.parse(event.timestamp) >= Date.parse(points[0].observed_at) && Date.parse(event.timestamp) <= Date.parse(points.at(-1)!.observed_at));
  }
  const ids = new Set(selectSeriesPoints(eventSeries, range, asOf).map(row => row.observation_id));
  return series.events.filter(row => ids.has(row.event_id));
}

export type NativeInsightsLoadState = { busy: boolean; result: OwnerQuantRuntimeArtifacts | null; failure: boolean; attempted: boolean };
export const initialInsightsLoadState: NativeInsightsLoadState = { busy: false, result: null, failure: false, attempted: false };
export function insightsFailureKind(result: OwnerQuantRuntimeArtifacts | null) {
  const codes = result?.limitations ?? [];
  if (codes.includes('QUANT_AUTH_NOT_CONFIGURED')) return 'accountSetup' as const;
  if (codes.includes('QUANT_AUTH_REQUIRED') || codes.includes('QUANT_RUNTIME_HTTP_401')) return 'signIn' as const;
  if (codes.some(code => /AUTH|CONTEXT|ACCOUNT|CONSENT/.test(code))) return 'accountChanged' as const;
  return 'serviceError' as const;
}
export function settleInsightsLoad(previous: NativeInsightsLoadState, next: OwnerQuantRuntimeArtifacts): NativeInsightsLoadState {
  const changedScope = insightsFailureKind(next) !== 'serviceError';
  return { busy: false, attempted: true, failure: next.status === 'unavailable', result: next.status === 'unavailable' && !changedScope && previous.result?.status === 'available' ? previous.result : next };
}
