import { z } from 'zod';
import type { V11InsightCopy } from '../insightsPresentation';
import type {
  PersonalTerminalCompositionRow,
  PersonalTerminalModel,
  PersonalTerminalProvenance,
  PersonalTerminalSeries,
  PersonalTerminalTimeframe,
  QuantV041LifecycleId,
} from './personalTerminalPresentation';

const TimeframeSchema = z.enum(['4H', '12H', '24H', '7D', '30D', '90D', '1Y', 'ALL']);
const EvidenceStageSchema = z.enum(['S0', 'S1', 'S2', 'S3']);
const NullableNumber = z.number().finite().nullable();
const EvidenceReferenceSchema = z.object({
  count: z.number().int().nonnegative(),
  firstId: z.string().nullable(),
  lastId: z.string().nullable(),
  semanticHash: z.string().min(1),
});
const PointSchema = z.object({
  id: z.string().min(1),
  timestamp: z.string().min(1),
  value: z.number().finite(),
  provenance: z.enum(['historical_reference', 'passive_device', 'questlife_confirmed', 'derived_research']),
});
const ViewSchema = z.object({
  aggregation: z.literal('quant_source_points'),
  axisPrecision: z.enum(['month_day', 'month', 'year_month']),
  startIndex: z.number().int().nonnegative(),
  endIndex: z.number().int().nonnegative(),
  pointCount: z.number().int().nonnegative(),
});
const BaselineSchema = z.object({
  status: z.enum(['unavailable', 'forming', 'provisional', 'established']),
  value: NullableNumber,
  low: NullableNumber,
  high: NullableNumber,
  referenceKind: z.enum(['none', 'active', 'historical']),
  observationCount: z.number().int().nonnegative(),
  independentDayCount: z.number().int().nonnegative(),
});
const CoverageSchema = z.object({
  observed_days: z.number().int().nonnegative(),
  expected_days: z.number().int().nonnegative().nullable(),
  coverage_ratio: z.number().finite().min(0).max(1).nullable(),
  first_available_at: z.string().nullable().optional(),
  last_available_at: z.string().nullable().optional(),
  source_count: z.number().int().nonnegative(),
}).passthrough();
const RecentChangeSchema = z.object({
  absolute_change: NullableNumber,
  percent_change: NullableNumber,
  recent_median: NullableNumber,
  reference_median: NullableNumber,
  classification: z.string(),
  recent_window: z.string(),
  reference_window: z.string(),
}).passthrough();
const ProvenanceSchema = z.object({
  historical_observation_ids_reference: EvidenceReferenceSchema.optional(),
  active_questlife_observation_ids_reference: EvidenceReferenceSchema.optional(),
  source_observation_ids_reference: EvidenceReferenceSchema.optional(),
  source_conflicts_resolved: z.number().int().nonnegative().optional(),
  source_profiles: z.array(z.object({
    provider: z.string().optional(),
    source_app: z.string().optional(),
  }).passthrough()).optional(),
}).passthrough();
const SeriesSchema = z.object({
  id: z.string().min(1),
  entityId: z.string().min(1),
  constructKey: z.string().min(1),
  domain: z.string().min(1),
  labelKey: z.string().min(1),
  unit: z.string(),
  stage: EvidenceStageSchema,
  semantic: z.enum(['count', 'duration', 'ordinal_state', 'performance', 'quality', 'timing']),
  valueChangeMode: z.enum(['absolute', 'percentage', 'none']),
  latestValue: NullableNumber,
  latestAt: z.string().nullable(),
  points: z.array(PointSchema),
  availableTimeframes: z.array(TimeframeSchema).min(1),
  defaultTimeframe: TimeframeSchema,
  views: z.record(z.string(), ViewSchema),
  chartCapabilities: z.object({
    line: z.boolean(),
    bar: z.boolean(),
    candle: z.boolean(),
    percent_change: z.boolean(),
  }).passthrough(),
  baseline: BaselineSchema,
  coverage: CoverageSchema,
  recentChange: RecentChangeSchema.nullable(),
  maturityLabel: z.string().min(1),
  provenance: ProvenanceSchema,
  limitationCodes: z.array(z.string()),
});
const CompositionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  value: z.number().finite().nonnegative(),
  direction: z.string(),
  stage: EvidenceStageSchema,
});
const EntitySchema = z.object({
  id: z.string().min(1),
  scope: z.enum(['market', 'goal', 'skill']),
  labelKey: z.string().optional(),
  label: z.string().optional(),
  contextKey: z.string().min(1),
  seriesIds: z.array(z.string()),
  compositionBasis: z.string().optional(),
  composition: z.array(CompositionSchema).optional(),
});
const AnalystSchema = z.object({
  activeObservationCount: z.number().int().nonnegative(),
  items: z.array(z.object({
    type: z.string().min(1),
    constructKey: z.string().min(1),
    evidenceCount: z.number().int().nonnegative(),
    evidenceReference: EvidenceReferenceSchema,
    limitationCodes: z.array(z.string()),
  })),
  limitations: z.array(z.string()),
  modelReadiness: z.array(z.unknown()),
});
const SourceSchema = z.object({
  engineVersion: z.string().min(1),
  materializedEngineVersion: z.string().min(1),
  quantCommit: z.string().min(1),
  canonicalArtifactHash: z.string().min(1),
  sourceArtifact: z.string().min(1),
  syntheticOnly: z.literal(true),
  containsRealUserData: z.literal(false),
});

export const QuantV041TerminalPayloadSchema = z.object({
  schemaVersion: z.literal('questlife-terminal-presentation-v0.4.1'),
  scenarioId: z.enum(['no-data', 'steps-only', 'sleep-only', 'rich-passive', 'day7', 'day30', 'day90', 'day180', 'goal', 'skill']),
  state: z.enum(['available', 'no_data']),
  asOf: z.string().min(1),
  source: SourceSchema,
  defaultScope: z.enum(['market', 'goal', 'skill']),
  defaultEntityId: z.string().nullable(),
  defaultSeriesId: z.string().nullable(),
  goalAvailable: z.boolean(),
  skillAvailable: z.boolean(),
  questlifeStartedAt: z.string().nullable(),
  range: z.object({ start: z.string().nullable(), end: z.string().nullable() }),
  entities: z.array(EntitySchema),
  series: z.array(SeriesSchema),
  analyst: AnalystSchema,
  signals: z.array(z.unknown()),
  nextActionKey: z.string().min(1),
});

export type QuantV041TerminalPayload = z.infer<typeof QuantV041TerminalPayloadSchema>;

const i18nCopy = (key: string, values?: Record<string, string | number>): V11InsightCopy => ({ kind: 'i18n', key, values });

function entityLabel(row: QuantV041TerminalPayload['entities'][number]): V11InsightCopy {
  if (row.label) return { kind: 'text', text: row.label };
  return i18nCopy(`personalTerminalV041Entity_${row.labelKey || 'personal_market'}`);
}

function direction(value: string): PersonalTerminalCompositionRow['direction'] {
  if (value === 'increasing') return 'rising';
  if (value === 'decreasing') return 'weakening';
  if (value === 'stable') return 'stable';
  return 'unavailable';
}

function validateRelationships(payload: QuantV041TerminalPayload) {
  const entityIds = new Set(payload.entities.map((row) => row.id));
  const seriesIds = new Set(payload.series.map((row) => row.id));
  if (payload.state === 'no_data') {
    if (payload.entities.length || payload.series.length || payload.defaultEntityId || payload.defaultSeriesId) {
      throw new Error('V0.4.1 no-data payload must not manufacture analytical entities.');
    }
    return;
  }
  if (!payload.defaultEntityId || !entityIds.has(payload.defaultEntityId)) throw new Error('Invalid V0.4.1 default entity.');
  if (!payload.defaultSeriesId || !seriesIds.has(payload.defaultSeriesId)) throw new Error('Invalid V0.4.1 default series.');
  payload.entities.forEach((entity) => entity.seriesIds.forEach((id) => {
    if (!seriesIds.has(id)) throw new Error(`Unknown series ${id} on entity ${entity.id}.`);
  }));
  payload.series.forEach((series) => {
    if (!entityIds.has(series.entityId)) throw new Error(`Unknown entity ${series.entityId} on series ${series.id}.`);
    series.availableTimeframes.forEach((timeframe) => {
      const view = series.views[timeframe];
      if (!view || view.endIndex > series.points.length || view.endIndex - view.startIndex !== view.pointCount) {
        throw new Error(`Invalid precomputed ${timeframe} view for ${series.id}.`);
      }
    });
  });
}

function mapSeries(row: QuantV041TerminalPayload['series'][number]): PersonalTerminalSeries {
  const precomputedViews = Object.fromEntries(Object.entries(row.views).map(([timeframe, view]) => [timeframe, {
    axisPrecision: view.axisPrecision,
    startIndex: view.startIndex,
    endIndex: view.endIndex,
    pointCount: view.pointCount,
  }])) as PersonalTerminalSeries['precomputedViews'];
  return {
    id: row.id,
    entityId: row.entityId,
    label: i18nCopy(`personalTerminalV041Series_${row.labelKey}`),
    unit: i18nCopy(`personalTerminalV041Unit_${row.unit.replace(/[^a-zA-Z0-9]+/g, '_')}`),
    stage: row.stage,
    semantic: row.semantic,
    valueChangeMode: row.valueChangeMode,
    supportsCandle: row.chartCapabilities.candle,
    observations: row.points.map((point) => ({
      id: point.id,
      timestamp: point.timestamp,
      value: point.value,
      provenance: point.provenance as PersonalTerminalProvenance,
      sourceIds: [point.id],
    })),
    load: [],
    events: [],
    baseline: {
      status: row.baseline.status,
      value: row.baseline.value,
      low: row.baseline.low,
      high: row.baseline.high,
      referenceKind: row.baseline.referenceKind,
    },
    limitation: i18nCopy('personalTerminalV041DescriptiveLimitation'),
    constructKey: row.constructKey,
    domain: row.domain,
    latestValue: row.latestValue,
    latestAt: row.latestAt,
    availableTimeframes: row.availableTimeframes as PersonalTerminalTimeframe[],
    defaultTimeframe: row.defaultTimeframe as PersonalTerminalTimeframe,
    availableIndicators: ['baseline'],
    chartCapabilities: {
      line: row.chartCapabilities.line,
      bar: row.chartCapabilities.bar,
      candle: row.chartCapabilities.candle,
      percentChange: row.chartCapabilities.percent_change,
    },
    coverage: {
      observedDays: row.coverage.observed_days,
      expectedDays: row.coverage.expected_days,
      coverageRatio: row.coverage.coverage_ratio,
      firstAvailableAt: row.coverage.first_available_at ?? null,
      lastAvailableAt: row.coverage.last_available_at ?? null,
      sourceCount: row.coverage.source_count,
    },
    recentChange: row.recentChange ? {
      absoluteChange: row.recentChange.absolute_change,
      percentChange: row.recentChange.percent_change,
      recentMedian: row.recentChange.recent_median,
      referenceMedian: row.recentChange.reference_median,
      classification: row.recentChange.classification,
      recentWindow: row.recentChange.recent_window,
      referenceWindow: row.recentChange.reference_window,
    } : null,
    maturityLabel: row.maturityLabel,
    precomputedViews,
    provenanceSummary: {
      historicalCount: row.provenance.historical_observation_ids_reference?.count || 0,
      activeCount: row.provenance.active_questlife_observation_ids_reference?.count
        || row.provenance.source_observation_ids_reference?.count
        || 0,
      sourceConflictsResolved: row.provenance.source_conflicts_resolved || 0,
      sourceLabels: (row.provenance.source_profiles || []).map((profile) => profile.source_app || profile.provider || '').filter(Boolean),
    },
  };
}

export function adaptQuantV041TerminalPayload(input: unknown): PersonalTerminalModel {
  const payload = QuantV041TerminalPayloadSchema.parse(input);
  validateRelationships(payload);
  const entities = payload.entities.map((row) => ({
    id: row.id,
    scope: row.scope,
    label: entityLabel(row),
    context: i18nCopy(`personalTerminalV041Context_${row.contextKey}`),
    seriesIds: row.seriesIds,
    compositionBasis: row.compositionBasis ? i18nCopy(`personalTerminalV041Composition_${row.compositionBasis}`) : undefined,
    composition: row.composition?.map((item) => ({
      id: item.id,
      label: { kind: 'text' as const, text: item.label },
      value: item.value,
      direction: direction(item.direction),
      stage: item.stage,
    })),
  }));
  return {
    fixture: null,
    dataMode: 'quant_v041_fixture',
    availability: payload.state,
    lifecycleScenario: payload.scenarioId as QuantV041LifecycleId,
    defaultScope: payload.defaultScope,
    defaultEntityId: payload.defaultEntityId || '',
    defaultSeriesId: payload.defaultSeriesId || '',
    entities,
    series: payload.series.map(mapSeries),
    signals: [],
    implication: i18nCopy(`personalTerminalV041Next_${payload.nextActionKey}`),
    range: payload.range,
    questlifeStartedAt: payload.questlifeStartedAt,
    sourceMetadata: {
      schemaVersion: payload.schemaVersion,
      engineVersion: payload.source.engineVersion,
      materializedEngineVersion: payload.source.materializedEngineVersion,
      quantCommit: payload.source.quantCommit,
      canonicalArtifactHash: payload.source.canonicalArtifactHash,
      sourceArtifact: payload.source.sourceArtifact,
      syntheticOnly: payload.source.syntheticOnly,
      containsRealUserData: payload.source.containsRealUserData,
    },
    analyst: {
      activeObservationCount: payload.analyst.activeObservationCount,
      items: payload.analyst.items.map((item) => ({
        type: item.type,
        constructKey: item.constructKey,
        evidenceCount: item.evidenceCount,
        limitationCodes: item.limitationCodes,
      })),
      limitations: payload.analyst.limitations,
    },
    nextAction: i18nCopy(`personalTerminalV041Next_${payload.nextActionKey}`),
  };
}
