import type { Lang } from '../i18n';
import type {
  QuantProductBundleV1,
  QuantProductInstrumentV1,
  QuantProductSeriesV1,
} from '../quant-product/quantProductContract';
import {
  adaptQuantProductBundleV1,
  selectQuantProductInstrument,
  type QuantProductConsumerInstrument,
  type QuantProductConsumerModel,
} from '../quant-product/quantProductV1Adapter';
import { iv3, type InsightsV3CopyKey } from './insightsV3I18n';

export type InsightsV3ChartKind = 'line' | 'candle' | 'point' | 'bar';

export type InsightsV3RangeSelection =
  | { kind: 'contract'; key: string }
  | { kind: 'last_n_days'; days: number }
  | { kind: 'last_n_observations'; count: number }
  | { kind: 'calendar'; start: string; end: string };

export type InsightsV3CompactCue = {
  boundary: 'fact' | 'inference';
  text: string;
  detail: string | null;
};

const instrumentKeys: Record<string, InsightsV3CopyKey> = {
  steps: 'instrumentSteps',
  distance: 'instrumentDistance',
  active_minutes: 'instrumentActiveMinutes',
  exercise_minutes: 'instrumentExerciseMinutes',
  sleep_duration: 'instrumentSleepDuration',
  sleep_timing: 'instrumentSleepTiming',
  wake_timing: 'instrumentWakeTiming',
  resting_heart_rate: 'instrumentRestingHeartRate',
  execution_duration: 'instrumentExecutionDuration',
  execution_quality: 'instrumentExecutionQuality',
  focus_state: 'instrumentFocus',
  state_focus: 'instrumentFocus',
  execution_load: 'instrumentExecutionLoad',
  activity_minutes: 'instrumentActivityMinutes',
  schedule_disruption: 'instrumentScheduleDisruption',
};

const featureKeys: Record<string, InsightsV3CopyKey> = {
  focus_level: 'featureFocus',
  sleep_level: 'featureSleep',
  load_level: 'featureLoad',
  activity_level: 'featureActivity',
  schedule_disruption: 'featureSchedule',
};

export function buildInsightsV3Consumer(bundle: QuantProductBundleV1) {
  return adaptQuantProductBundleV1(bundle);
}

export function selectDefaultInstrumentId(model: QuantProductConsumerModel): string | null {
  const requested = model.analystContext.selected_instrument_id;
  if (requested && selectQuantProductInstrument(model, requested)) return requested;
  return model.watchlist.find((item) => selectQuantProductInstrument(model, item.instrument_id))?.instrument_id
    || model.instruments[0]?.id
    || null;
}

export function instrumentLabel(lang: Lang, instrument: Pick<QuantProductConsumerInstrument, 'labelKey'> | Pick<QuantProductInstrumentV1, 'label_key'>) {
  const key = 'labelKey' in instrument ? instrument.labelKey : instrument.label_key;
  return iv3(lang, instrumentKeys[key] || 'instrumentGeneric');
}

export function featureLabel(lang: Lang, value: string) {
  return iv3(lang, featureKeys[value] || 'instrumentGeneric');
}

export function actionLabel(lang: Lang, value: string) {
  if (value === 'exercise') return iv3(lang, 'actionExercise');
  if (value === 'rest') return iv3(lang, 'actionRest');
  return iv3(lang, 'instrumentGeneric');
}

export function sourceClassLabel(lang: Lang, value: string) {
  if (value === 'questlife_confirmed') return iv3(lang, 'sourceConfirmed');
  if (value === 'passive_device') return iv3(lang, 'sourcePassive');
  if (value === 'historical_analogue') return iv3(lang, 'sourceHistorical');
  if (value === 'compact_reference') return iv3(lang, 'sourceCompact');
  return iv3(lang, 'sourceGeneric');
}

function decimalPlaces(value: number) {
  if (Math.abs(value) >= 100 || Number.isInteger(value)) return 0;
  if (Math.abs(value) >= 10) return 1;
  return 2;
}

function timingLabel(value: number) {
  const minutes = (Math.round(value + 12 * 60) + 24 * 60) % (24 * 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export function unitLabel(unit: string) {
  if (unit === 'steps') return 'steps';
  if (unit === 'kilometres') return 'km';
  if (unit === 'minutes') return 'min';
  if (unit === 'bpm') return 'bpm';
  if (unit === '/5') return '/ 5';
  if (unit === 'binary') return '';
  if (unit === 'minutes_from_local_noon') return '';
  return unit;
}

export function formatQuantValue(value: number | null | undefined, unit: string, lang: Lang) {
  if (value == null || !Number.isFinite(value)) return '—';
  if (unit === 'minutes_from_local_noon') return timingLabel(value);
  if (unit === 'binary') return value > 0 ? (lang === 'zh' ? '有' : 'Yes') : (lang === 'zh' ? '无' : 'No');
  return new Intl.NumberFormat(lang === 'zh' ? 'zh-CN' : 'en-AU', {
    maximumFractionDigits: decimalPlaces(value),
    minimumFractionDigits: 0,
  }).format(value);
}

export function formatSignedValue(value: number | null | undefined, unit: string, lang: Lang) {
  if (value == null || !Number.isFinite(value)) return '—';
  const absolute = formatQuantValue(Math.abs(value), unit, lang);
  return `${value > 0 ? '+' : value < 0 ? '−' : ''}${absolute}${unitLabel(unit) ? ` ${unitLabel(unit)}` : ''}`;
}

export function formatDateTime(lang: Lang, value: string, includeTime = false) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-AU', includeTime
    ? { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
}

export function evidenceStageLabel(lang: Lang, stage: QuantProductInstrumentV1['evidence']['stage']) {
  return iv3(lang, `stage${stage}` as InsightsV3CopyKey);
}

export function availabilityLabel(lang: Lang, state: QuantProductInstrumentV1['availability']['state']) {
  if (state === 'AVAILABLE') return iv3(lang, 'stateAvailable');
  if (state === 'FORMING') return iv3(lang, 'stateForming');
  if (state === 'INSUFFICIENT_DATA') return iv3(lang, 'stateInsufficient');
  if (state === 'ABSTAINED') return iv3(lang, 'stateAbstained');
  return iv3(lang, 'stateUnavailable');
}

export function seriesForInstrument(instrument: QuantProductConsumerInstrument | null) {
  if (!instrument) return null;
  return instrument.series[0] || null;
}

export function defaultRangeSelection(series: QuantProductSeriesV1 | null): InsightsV3RangeSelection {
  const key = series?.default_range_key
    || series?.supported_ranges.find((range) => !range.key.startsWith('CUSTOM_'))?.key
    || 'ALL';
  return { kind: 'contract', key };
}

export function contractQuickRanges(series: QuantProductSeriesV1 | null) {
  return (series?.supported_ranges || []).filter((range) => !range.key.startsWith('CUSTOM_'));
}

export function rangeLabel(lang: Lang, selection: InsightsV3RangeSelection) {
  if (selection.kind === 'contract') return selection.key;
  if (selection.kind === 'last_n_days') return iv3(lang, 'lastNDays', { count: selection.days });
  if (selection.kind === 'last_n_observations') return iv3(lang, 'lastNObservations', { count: selection.count });
  return `${selection.start} — ${selection.end}`;
}

export function selectSeriesPoints(
  series: QuantProductSeriesV1,
  selection: InsightsV3RangeSelection,
  asOf: string,
) {
  if (selection.kind === 'last_n_observations') return series.points.slice(-Math.max(1, selection.count));
  if (selection.kind === 'last_n_days') {
    const end = Date.parse(asOf);
    const start = end - Math.max(1, selection.days) * 86_400_000;
    return series.points.filter((point) => Date.parse(point.observed_at) >= start && Date.parse(point.observed_at) <= end);
  }
  if (selection.kind === 'calendar') {
    const start = Date.parse(`${selection.start}T00:00:00`);
    const end = Date.parse(`${selection.end}T23:59:59.999`);
    return series.points.filter((point) => {
      const time = Date.parse(point.observed_at);
      return time >= start && time <= end;
    });
  }
  const contractRange = series.supported_ranges.find((range) => range.key === selection.key);
  if (!contractRange || contractRange.kind === 'ALL') return series.points;
  if (contractRange.kind === 'LAST_N_OBSERVATIONS' && contractRange.count != null) {
    return series.points.slice(-contractRange.count);
  }
  if (contractRange.kind === 'LAST_N_DAYS' && contractRange.count != null) {
    const end = Date.parse(asOf);
    const start = end - contractRange.count * 86_400_000;
    return series.points.filter((point) => Date.parse(point.observed_at) >= start && Date.parse(point.observed_at) <= end);
  }
  if (contractRange.start && contractRange.end) {
    const start = Date.parse(contractRange.start);
    const end = Date.parse(contractRange.end);
    return series.points.filter((point) => {
      const time = Date.parse(point.observed_at);
      return time >= start && time <= end;
    });
  }
  return series.points;
}

export function selectSeriesCandles(series: QuantProductSeriesV1, selection: InsightsV3RangeSelection) {
  return selection.kind === 'contract' ? series.candles[selection.key] || [] : [];
}

export function availableChartKinds(series: QuantProductSeriesV1 | null): InsightsV3ChartKind[] {
  if (!series) return [];
  const kinds: InsightsV3ChartKind[] = [];
  if (series.supported_chart_types.includes('LINE')) kinds.push('line');
  if (series.supported_chart_types.includes('CANDLE')) kinds.push('candle');
  if (series.supported_chart_types.includes('BAR')) kinds.push('bar');
  if (series.supported_chart_types.includes('POINT') && !kinds.includes('point')) kinds.push('point');
  return kinds;
}

export function defaultChartKind(series: QuantProductSeriesV1 | null): InsightsV3ChartKind {
  const available = availableChartKinds(series);
  if (available.includes('line')) return 'line';
  return available[0] || 'point';
}

export function buildCompactCue(
  lang: Lang,
  bundle: QuantProductBundleV1,
  instrument: QuantProductConsumerInstrument,
): InsightsV3CompactCue {
  const interpretation = bundle.interpretation;
  const driver = interpretation?.target_instrument_id === instrument.id
    ? interpretation.driver_analysis?.candidates[0]
    : null;
  if (driver) {
    const source = bundle.instruments.find((row) => row.instrument_id === driver.driver_instrument_id);
    return {
      boundary: 'inference',
      text: iv3(lang, 'driverCue', {
        driver: source ? instrumentLabel(lang, source) : iv3(lang, 'instrumentGeneric'),
        target: instrumentLabel(lang, instrument),
        support: driver.support_count,
        counter: driver.counterexample_count,
      }),
      detail: iv3(lang, 'driverLimit'),
    };
  }
  const change = instrument.change;
  if (change.kind !== 'NONE' && change.absolute != null) {
    const value = formatSignedValue(Math.abs(change.absolute), instrument.unit, lang);
    return {
      boundary: 'fact',
      text: change.direction === 'HIGHER'
        ? iv3(lang, 'comparedPreviousHigher', { value })
        : change.direction === 'LOWER'
          ? iv3(lang, 'comparedPreviousLower', { value })
          : iv3(lang, 'comparedPreviousFlat'),
      detail: null,
    };
  }
  if (instrument.evidence.observation_count > 1) {
    return {
      boundary: 'fact',
      text: iv3(lang, 'formingCue', { count: instrument.evidence.observation_count }),
      detail: iv3(lang, 'continueSameMetric'),
    };
  }
  return { boundary: 'fact', text: iv3(lang, 'observationCue'), detail: iv3(lang, 'continueSameMetric') };
}

export function nextObservationCopy(lang: Lang, bundle: QuantProductBundleV1) {
  const key = bundle.interpretation?.next_useful_observation_key;
  if (key === 'observe:pre_action_and_post_action_state' || key === 'observe:post_activity_state') {
    return iv3(lang, 'recordBeforeAfter');
  }
  return iv3(lang, 'continueSameMetric');
}

export function chartTypeContractKey(kind: InsightsV3ChartKind) {
  if (kind === 'candle') return 'CANDLE';
  if (kind === 'bar') return 'BAR';
  if (kind === 'point') return 'POINT';
  return 'LINE';
}

export function isChartKindRenderable(
  series: QuantProductSeriesV1,
  kind: InsightsV3ChartKind,
  selection: InsightsV3RangeSelection,
) {
  if (!series.supported_chart_types.includes(chartTypeContractKey(kind))) return false;
  if (kind === 'candle') return selectSeriesCandles(series, selection).length > 0;
  return true;
}
