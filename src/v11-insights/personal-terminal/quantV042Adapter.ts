import { z } from 'zod';
import type { V11InsightCopy } from '../insightsPresentation';
import type {
  PersonalMarketOverview,
  PersonalTerminalAdaptiveState,
  PersonalTerminalCandle,
  PersonalTerminalModel,
  PersonalTerminalSeries,
  PersonalTerminalTimeframe,
  QuantV041LifecycleId,
  QuantV042LifecycleId,
} from './personalTerminalPresentation';
import { adaptQuantV041TerminalPayload } from './quantV041Adapter';

const TimeframeSchema = z.enum(['RECENT', '4H', '12H', '24H', '7D', '30D', '90D', '1Y', 'ALL']);
const NullableNumber = z.number().finite().nullable();
const EvidenceStageSchema = z.enum(['S0', 'S1', 'S2', 'S3']);
const ScenarioSchema = z.enum([
  'market_steps_only',
  'market_rich_passive',
  'market_questlife_only',
  'market_mixed_mature',
  'focus_1_observation',
  'focus_2_observations',
  'focus_3_observations',
  'focus_5_observations',
  'focus_10_observations',
  'execution_3_observations',
  'execution_7_observations',
  'day30',
  'day90',
  'day180',
  'goal',
  'skill',
  'no_data',
]);
const AdaptiveStateSchema = z.enum([
  'no_observation',
  'first_observation',
  'comparison_available',
  'short_window_forming',
  'reference_available',
]);
const AdaptiveSchema = z.object({
  state: AdaptiveStateSchema,
  analystKey: z.string().min(1),
  observationCount: z.number().int().nonnegative(),
  current: NullableNumber,
  previous: NullableNumber,
  changeFromPrevious: NullableNumber,
  first: NullableNumber,
  changeFromFirst: NullableNumber,
  rangeLow: NullableNumber,
  rangeHigh: NullableNumber,
  firstObservedAt: z.string().nullable(),
  lastObservedAt: z.string().nullable(),
  referenceAvailable: z.boolean(),
  limitations: z.array(z.string()),
  defaultView: z.enum(['point', 'line']),
  availableViews: z.array(z.enum(['point', 'line', 'candle', 'range'])),
  availableTimeframes: z.array(TimeframeSchema),
  microCandleAvailable: z.boolean(),
  microCandleBucketSize: z.number().int().positive().nullable(),
  microCandleBucketType: z.literal('OBSERVATION_COUNT').nullable(),
});
const CandleSchema = z.object({
  start: z.string().min(1),
  end: z.string().min(1),
  open: NullableNumber,
  high: NullableNumber,
  low: NullableNumber,
  close: NullableNumber,
  openAt: z.string().nullable(),
  highAt: z.string().nullable(),
  lowAt: z.string().nullable(),
  closeAt: z.string().nullable(),
  average: NullableNumber,
  observationCount: z.number().int().nonnegative(),
  expectedObservationCount: z.number().int().positive().nullable(),
  complete: z.boolean(),
  sourceIds: z.array(z.string().min(1)),
  representation: z.enum(['OBSERVATIONAL_SCALAR_OHLC', 'NATIVE_OHLC']),
  bucketSemantics: z.string().min(1),
  bucketType: z.enum(['TIME', 'OBSERVATION_COUNT']),
  bucketSize: z.number().int().positive().nullable(),
  observationWindow: z.object({
    start: z.string().nullable(),
    end: z.string().nullable(),
    observationCount: z.number().int().nonnegative(),
  }),
}).passthrough();
const SeriesSchema = z.object({
  id: z.string().min(1),
  constructKey: z.string().min(1),
  semantic: z.enum(['count', 'duration', 'ordinal_state', 'performance', 'quality', 'timing']),
  latestValue: NullableNumber,
  points: z.array(z.object({
    id: z.string().min(1),
    timestamp: z.string().min(1),
    value: z.number().finite(),
  }).passthrough()),
  availableTimeframes: z.array(TimeframeSchema).min(1),
  defaultTimeframe: TimeframeSchema,
  views: z.record(z.string(), z.object({
    axisPrecision: z.enum(['month_day', 'month', 'year_month']),
    startIndex: z.number().int().nonnegative(),
    endIndex: z.number().int().nonnegative(),
    pointCount: z.number().int().nonnegative(),
  }).passthrough()),
  chartCapabilities: z.object({
    candle: z.boolean(),
    percent_change: z.boolean(),
    candleRepresentation: z.enum(['NONE', 'OBSERVATIONAL_SCALAR_OHLC', 'NATIVE_OHLC']).optional(),
    candleTimeframes: z.array(TimeframeSchema).optional(),
    bucketSemantics: z.record(z.string(), z.string()).optional(),
  }).passthrough(),
  candleViews: z.record(z.string(), z.array(CandleSchema)),
  baseline: z.object({
    status: z.enum(['unavailable', 'forming', 'provisional', 'established']),
    value: NullableNumber,
    low: NullableNumber,
    high: NullableNumber,
    referenceKind: z.enum(['none', 'active', 'historical']),
    referenceType: z.string().nullable().optional(),
    observationCount: z.number().int().nonnegative(),
    independentDayCount: z.number().int().nonnegative(),
    windowStart: z.string().nullable().optional(),
    windowEnd: z.string().nullable().optional(),
  }),
  adaptive: AdaptiveSchema,
}).passthrough();
const OverviewInstrumentSchema = z.object({
  seriesId: z.string().min(1),
  constructKey: z.string().min(1),
  domain: z.string().min(1),
  labelKey: z.string().min(1),
  unit: z.string(),
  semantic: z.enum(['count', 'duration', 'ordinal_state', 'performance', 'quality', 'timing']),
  current: NullableNumber,
  currentAt: z.string().nullable(),
  reference: NullableNumber,
  referenceLow: NullableNumber,
  referenceHigh: NullableNumber,
  referenceKind: z.enum(['none', 'active', 'historical']),
  referenceType: z.string().nullable(),
  referenceWindow: z.object({
    start: z.string().min(1),
    end: z.string().min(1),
    observationCount: z.number().int().nonnegative(),
    independentDayCount: z.number().int().nonnegative(),
  }).nullable(),
  deviationAbsolute: NullableNumber,
  deviationPercent: NullableNumber,
  position: z.enum(['above_reference', 'near_reference', 'below_reference', 'forming']),
  direction: z.enum(['higher', 'lower', 'flat', 'unavailable']),
  maturity: AdaptiveStateSchema,
  evidenceStage: EvidenceStageSchema,
  observationCount: z.number().int().nonnegative(),
  independentDayCount: z.number().int().nonnegative(),
  coverageRatio: z.number().finite().min(0).max(1).nullable(),
  provenanceFamily: z.enum(['mixed', 'passive_historical', 'questlife_native']),
  miniSeries: z.array(z.object({ timestamp: z.string().min(1), value: z.number().finite() })),
  adaptive: AdaptiveSchema,
  limitationCodes: z.array(z.string()),
});
const OverviewSchema = z.object({
  schemaVersion: z.literal('questlife-personal-market-overview-v0.4.2'),
  state: z.enum(['available', 'no_data']),
  asOf: z.string().min(1),
  instrumentCount: z.number().int().nonnegative(),
  historyPeriod: z.object({ start: z.string().nullable(), end: z.string().nullable() }),
  breadth: z.object({
    aboveReference: z.number().int().nonnegative(),
    nearReference: z.number().int().nonnegative(),
    belowReference: z.number().int().nonnegative(),
    forming: z.number().int().nonnegative(),
    basis: z.literal('categorical_instrument_count'),
  }),
  instruments: z.array(OverviewInstrumentSchema).max(8),
  topMoves: z.array(z.object({
    kind: z.enum(['reference_relative_change', 'new_capability', 'eligible_signal']),
    seriesId: z.string().nullable(),
    signalId: z.string().nullable().optional(),
    rankBasis: z.string().min(1),
    magnitude: NullableNumber,
    deviationPercent: NullableNumber.optional(),
    capability: z.string().nullable().optional(),
  })).max(3),
  signals: z.object({
    activeCount: z.number().int().nonnegative(),
    newlyEligibleCount: z.number().int().nonnegative(),
    items: z.array(z.object({
      id: z.string().nullable(),
      sourceConstruct: z.string().nullable(),
      targetConstruct: z.string().nullable(),
      evidenceGrade: z.string().nullable(),
    })).max(3),
  }),
  analyst: z.object({
    state: z.enum(['structured_observation', 'acquisition']),
    rows: z.array(z.record(z.string(), z.union([z.string(), z.number(), z.null()]))).max(4),
    causalClaimsAllowed: z.literal(false),
  }),
  entitySummary: z.object({ goalCount: z.number().int().nonnegative(), skillCount: z.number().int().nonnegative() }),
  limitations: z.array(z.string()),
});
const TerminalSchema = z.object({
  schemaVersion: z.literal('questlife-terminal-presentation-v0.4.2'),
  scenarioId: ScenarioSchema,
  series: z.array(SeriesSchema),
  overview: OverviewSchema,
}).passthrough();
const CompactOverviewSchema = z.object({
  schemaVersion: z.literal('questlife-personal-market-overview-v0.4.2'),
  scenarioId: ScenarioSchema,
  overview: OverviewSchema,
}).passthrough();

const i18nCopy = (key: string): V11InsightCopy => ({ kind: 'i18n', key });

function legacyScenario(id: QuantV042LifecycleId): QuantV041LifecycleId {
  if (id === 'no_data') return 'no-data';
  if (id === 'market_steps_only') return 'steps-only';
  if (id === 'market_rich_passive') return 'rich-passive';
  if (id === 'market_mixed_mature') return 'day180';
  if (id === 'day30' || id === 'day90' || id === 'day180' || id === 'goal' || id === 'skill') return id;
  return 'day7';
}

function withoutRecent<T>(value: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'RECENT'));
}

function downgradeForV041(payload: z.infer<typeof TerminalSchema>) {
  return {
    ...payload,
    schemaVersion: 'questlife-terminal-presentation-v0.4.1',
    scenarioId: legacyScenario(payload.scenarioId),
    series: payload.series.map((row) => {
      const availableTimeframes = row.availableTimeframes.filter((timeframe) => timeframe !== 'RECENT');
      const defaultTimeframe = row.defaultTimeframe === 'RECENT'
        ? availableTimeframes[0] || 'ALL'
        : row.defaultTimeframe;
      return {
        ...row,
        availableTimeframes,
        defaultTimeframe,
        views: withoutRecent(row.views),
        chartCapabilities: {
          ...row.chartCapabilities,
          candleTimeframes: row.chartCapabilities.candleTimeframes?.filter((timeframe) => timeframe !== 'RECENT'),
          bucketSemantics: withoutRecent(row.chartCapabilities.bucketSemantics || {}),
        },
        candleViews: withoutRecent(row.candleViews),
      };
    }),
  };
}

function candle(row: z.infer<typeof CandleSchema>): PersonalTerminalCandle | null {
  if (!row.complete || row.open == null || row.high == null || row.low == null || row.close == null
    || row.openAt == null || row.highAt == null || row.lowAt == null || row.closeAt == null || row.average == null) return null;
  return {
    time: row.start,
    endTime: row.end,
    open: row.open,
    high: row.high,
    low: row.low,
    close: row.close,
    openAt: row.openAt,
    highAt: row.highAt,
    lowAt: row.lowAt,
    closeAt: row.closeAt,
    average: row.average,
    observationCount: row.observationCount,
    expectedObservationCount: row.expectedObservationCount,
    sourceIds: row.sourceIds,
    representation: row.representation,
    bucketSemantics: row.bucketSemantics,
    bucketType: row.bucketType,
    bucketSize: row.bucketSize,
    observationWindow: row.observationWindow,
  };
}

function mapAdaptive(value: z.infer<typeof AdaptiveSchema>): NonNullable<PersonalTerminalSeries['adaptive']> {
  return {
    ...value,
    state: value.state as PersonalTerminalAdaptiveState,
    availableTimeframes: value.availableTimeframes as PersonalTerminalTimeframe[],
  };
}

function validateCandleLineage(series: z.infer<typeof SeriesSchema>) {
  const points = new Map(series.points.map((point) => [point.id, point]));
  Object.entries(series.candleViews).forEach(([timeframe, candles]) => candles.forEach((item) => {
    if (!item.complete) return;
    const source = item.sourceIds.map((id) => points.get(id));
    if (source.some((point) => !point) || source.length !== item.observationCount) {
      throw new Error(`Invalid V0.4.2 candle lineage for ${series.id} ${timeframe}.`);
    }
    const ordered = source.slice().sort((left, right) => (
      left!.timestamp.localeCompare(right!.timestamp) || left!.id.localeCompare(right!.id)
    ));
    const values = ordered.map((point) => point!.value);
    if (
      item.open !== values[0]
      || item.high !== Math.max(...values)
      || item.low !== Math.min(...values)
      || item.close !== values[values.length - 1]
      || item.observationWindow.observationCount !== item.observationCount
    ) throw new Error(`V0.4.2 candle values do not reconstruct for ${series.id} ${timeframe}.`);
    if (timeframe === 'RECENT' && item.bucketType !== 'OBSERVATION_COUNT') {
      throw new Error(`RECENT micro candle must declare OBSERVATION_COUNT for ${series.id}.`);
    }
    if (timeframe !== 'RECENT' && item.bucketType !== 'TIME') {
      throw new Error(`Calendar candle must declare TIME for ${series.id} ${timeframe}.`);
    }
  }));
}

function validateEarlyLifecycle(series: z.infer<typeof SeriesSchema>) {
  const count = series.points.length;
  if (series.adaptive.observationCount !== count) throw new Error(`Adaptive observation count mismatch for ${series.id}.`);
  if (count === 1 && (
    series.baseline.value != null
    || series.adaptive.availableViews.join(',') !== 'point'
    || series.adaptive.microCandleAvailable
  )) throw new Error(`First observation must remain point-only without a baseline for ${series.id}.`);
  if (count === 2 && (
    series.baseline.value != null
    || series.adaptive.availableViews.includes('candle')
    || series.adaptive.changeFromPrevious == null
  )) throw new Error(`Second observation must remain a direct comparison without a baseline for ${series.id}.`);
  if (series.semantic === 'ordinal_state' && series.chartCapabilities.percent_change) {
    throw new Error(`Ordinal state cannot expose percentage change for ${series.id}.`);
  }
}

function mapOverview(value: z.infer<typeof OverviewSchema>): PersonalMarketOverview {
  return {
    ...value,
    instruments: value.instruments.map((row) => ({
      ...row,
      label: i18nCopy(`personalTerminalV041Series_${row.labelKey}`),
      unit: i18nCopy(`personalTerminalV041Unit_${row.unit.replace(/[^a-zA-Z0-9]+/g, '_')}`),
      adaptive: mapAdaptive(row.adaptive),
    })),
  };
}

function validateOverview(
  payload: z.infer<typeof TerminalSchema>,
  compact: z.infer<typeof CompactOverviewSchema>,
) {
  if (JSON.stringify(payload.overview) !== JSON.stringify(compact.overview)) {
    throw new Error('Compact V0.4.2 overview does not match the full Terminal overview.');
  }
  const byId = new Map(payload.series.map((series) => [series.id, series]));
  const counts = { above_reference: 0, near_reference: 0, below_reference: 0, forming: 0 };
  payload.overview.instruments.forEach((row) => {
    const source = byId.get(row.seriesId);
    if (!source) throw new Error(`Overview references unknown series ${row.seriesId}.`);
    if (row.current !== source.latestValue || row.reference !== source.baseline.value) {
      throw new Error(`Overview current/reference mismatch for ${row.seriesId}.`);
    }
    const expectedAbsolute = row.current == null || row.reference == null ? null : row.current - row.reference;
    if (row.deviationAbsolute !== expectedAbsolute) throw new Error(`Overview absolute deviation mismatch for ${row.seriesId}.`);
    if (row.semantic === 'ordinal_state' && row.deviationPercent != null) {
      throw new Error(`Ordinal overview instrument cannot expose percentage change for ${row.seriesId}.`);
    }
    if (row.deviationPercent != null) {
      const expectedPercent = expectedAbsolute == null || row.reference == null || row.reference <= 0
        ? null
        : expectedAbsolute / row.reference * 100;
      if (expectedPercent == null || Math.abs(row.deviationPercent - expectedPercent) > 1e-9) {
        throw new Error(`Overview percentage deviation mismatch for ${row.seriesId}.`);
      }
    }
    counts[row.position] += 1;
  });
  if (
    counts.above_reference !== payload.overview.breadth.aboveReference
    || counts.near_reference !== payload.overview.breadth.nearReference
    || counts.below_reference !== payload.overview.breadth.belowReference
    || counts.forming !== payload.overview.breadth.forming
  ) throw new Error('Personal Market breadth does not match eligible overview rows.');
  if (payload.overview.instrumentCount !== payload.overview.instruments.length) {
    throw new Error('Personal Market instrument count mismatch.');
  }
}

export function adaptQuantV042TerminalPayload(
  terminalInput: unknown,
  compactOverviewInput: unknown,
): PersonalTerminalModel {
  const payload = TerminalSchema.parse(terminalInput);
  const compact = CompactOverviewSchema.parse(compactOverviewInput);
  if (payload.scenarioId !== compact.scenarioId) throw new Error('V0.4.2 fixture/overview scenario mismatch.');
  payload.series.forEach((series) => {
    validateCandleLineage(series);
    validateEarlyLifecycle(series);
  });
  validateOverview(payload, compact);

  const base = adaptQuantV041TerminalPayload(downgradeForV041(payload));
  const sourceById = new Map(payload.series.map((series) => [series.id, series]));
  const series = base.series.map((row) => {
    const source = sourceById.get(row.id);
    if (!source) return row;
    const precomputedViews = Object.fromEntries(Object.entries(source.views).map(([timeframe, view]) => [timeframe, {
      axisPrecision: view.axisPrecision,
      startIndex: view.startIndex,
      endIndex: view.endIndex,
      pointCount: view.pointCount,
    }])) as PersonalTerminalSeries['precomputedViews'];
    const precomputedCandles = Object.fromEntries(Object.entries(source.candleViews).map(([timeframe, rows]) => [
      timeframe,
      rows.flatMap((item) => {
        const mapped = candle(item);
        return mapped ? [mapped] : [];
      }),
    ])) as PersonalTerminalSeries['precomputedCandles'];
    return {
      ...row,
      supportsCandle: source.adaptive.availableViews.includes('candle'),
      availableTimeframes: source.availableTimeframes as PersonalTerminalTimeframe[],
      defaultTimeframe: source.defaultTimeframe as PersonalTerminalTimeframe,
      chartCapabilities: {
        ...row.chartCapabilities!,
        candle: source.adaptive.availableViews.includes('candle'),
        percentChange: source.chartCapabilities.percent_change,
        candleRepresentation: source.chartCapabilities.candleRepresentation,
        candleTimeframes: source.chartCapabilities.candleTimeframes as PersonalTerminalTimeframe[] | undefined,
        bucketSemantics: source.chartCapabilities.bucketSemantics as Partial<Record<PersonalTerminalTimeframe, string>> | undefined,
      },
      precomputedViews,
      precomputedCandles,
      baseline: {
        ...row.baseline,
        value: source.baseline.value,
        low: source.baseline.low,
        high: source.baseline.high,
        referenceType: source.baseline.referenceType ?? null,
        observationCount: source.baseline.observationCount,
        independentDayCount: source.baseline.independentDayCount,
        windowStart: source.baseline.windowStart ?? null,
        windowEnd: source.baseline.windowEnd ?? null,
      },
      adaptive: mapAdaptive(source.adaptive),
    };
  });
  return {
    ...base,
    dataMode: 'quant_v042_fixture',
    lifecycleScenario: payload.scenarioId,
    series,
    marketOverview: mapOverview(compact.overview),
    sourceMetadata: base.sourceMetadata ? {
      ...base.sourceMetadata,
      schemaVersion: payload.schemaVersion,
    } : undefined,
  };
}
