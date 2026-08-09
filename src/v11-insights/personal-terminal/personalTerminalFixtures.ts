import type { V11InsightCopy } from '../insightsPresentation';
import type {
  PersonalTerminalEntity,
  PersonalTerminalEvent,
  PersonalTerminalFixtureId,
  PersonalTerminalModel,
  PersonalTerminalObservation,
  PersonalTerminalSeries,
  PersonalTerminalSignal,
} from './personalTerminalPresentation';

const text = (key: string, values?: Record<string, string | number>): V11InsightCopy => ({ kind: 'i18n', key, values });
const END = new Date('2026-08-08T20:00:00.000Z');

function seeded(index: number) {
  const value = Math.sin(index * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function isoDay(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function dailySeries({
  amplitude,
  baseline,
  missingEvery = 19,
  slope,
  volatile = false,
}: {
  amplitude: number;
  baseline: number;
  missingEvery?: number;
  slope: number;
  volatile?: boolean;
}) {
  const rows: PersonalTerminalObservation[] = [];
  for (let index = 0; index < 365; index += 1) {
    if (index % missingEvery === 0 || index % 71 === 0) continue;
    const date = new Date(END);
    date.setUTCDate(END.getUTCDate() - (364 - index));
    const wave = Math.sin(index / 17) * amplitude;
    const pulse = (seeded(index) - 0.5) * amplitude * (volatile && index > 285 ? 2.4 : 0.7);
    const value = baseline + slope * index + wave + pulse;
    rows.push({
      id: `fixture-day-${index}`,
      timestamp: `${isoDay(date)}T12:00:00.000Z`,
      value: Math.round(value * 100) / 100,
      provenance: index < 245 ? 'historical_reference' : 'questlife_confirmed',
      sourceIds: [`fixture-source-${index}`],
    });
  }
  return rows;
}

function withIntraday(rows: PersonalTerminalObservation[]) {
  const result = rows.slice();
  for (let offset = 0; offset < 28; offset += 1) {
    const date = new Date(END);
    date.setUTCDate(END.getUTCDate() - offset);
    const day = isoDay(date);
    const base = rows.find((row) => row.timestamp.startsWith(day))?.value;
    if (base == null) continue;
    [8, 14, 20].forEach((hour, index) => {
      result.push({
        id: `fixture-intraday-${offset}-${hour}`,
        timestamp: `${day}T${String(hour).padStart(2, '0')}:00:00.000Z`,
        value: Math.round((base + (index - 1) * 0.18 + (seeded(offset + hour) - 0.5) * 0.12) * 100) / 100,
        provenance: 'questlife_confirmed',
        sourceIds: [`fixture-intraday-source-${offset}-${hour}`],
      });
    });
  }
  return result.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

function loadSeries() {
  return dailySeries({ baseline: 46, amplitude: 20, slope: 0.045, missingEvery: 11 })
    .map((row) => ({ timestamp: row.timestamp, value: Math.max(5, Math.round(row.value)), sourceIds: row.sourceIds }));
}

function events(): PersonalTerminalEvent[] {
  return [
    {
      id: 'fixture-event-training',
      timestamp: '2026-07-18T18:30:00.000Z',
      type: 'execution',
      category: 'training',
      title: text('personalTerminalFixtureEventTraining'),
      shortLabel: text('personalTerminalFixtureEventTraining'),
      detail: text('personalTerminalFixtureEventTrainingDetail'),
      provenance: 'questlife_confirmed',
      scopeId: 'goal:strength',
      sourceIds: ['fixture-event-source-training'],
    },
    {
      id: 'fixture-event-context',
      timestamp: '2026-07-27T07:30:00.000Z',
      type: 'context',
      category: 'travel',
      title: text('personalTerminalFixtureEventTravel'),
      shortLabel: text('personalTerminalFixtureEventTravel'),
      detail: text('personalTerminalFixtureEventTravelDetail'),
      provenance: 'questlife_confirmed',
      scopeId: 'market:personal',
      sourceIds: ['fixture-event-source-travel'],
    },
    {
      id: 'fixture-event-decision',
      timestamp: '2026-08-03T09:15:00.000Z',
      type: 'decision',
      category: 'decision',
      title: text('personalTerminalFixtureEventDecision'),
      shortLabel: text('personalTerminalFixtureEventDecision'),
      detail: text('personalTerminalFixtureEventDecisionDetail'),
      provenance: 'questlife_confirmed',
      scopeId: 'market:personal',
      sourceIds: ['fixture-event-source-decision'],
    },
  ];
}

const signals: PersonalTerminalSignal[] = [
  {
    id: 'fixture-supported-signal',
    status: 'supported',
    title: text('personalTerminalFixtureSupportedSignal'),
    relationship: text('personalTerminalFixtureSupportedRelationship'),
    observationCount: 24,
    counterexampleCount: 5,
    direction: 'lower',
    lagDays: 1,
    maturity: 'established',
    windowDays: 90,
    sourceIds: ['fixture-source-286', 'fixture-source-301', 'fixture-source-327'],
    lastSeenAt: '2026-08-06T20:00:00.000Z',
    limitation: text('quantSupportedNotCausal'),
  },
  {
    id: 'fixture-candidate-signal',
    status: 'candidate',
    title: text('personalTerminalFixtureCandidateSignal'),
    relationship: text('personalTerminalFixtureCandidateRelationship'),
    observationCount: 9,
    counterexampleCount: 4,
    direction: 'higher',
    lagDays: 0,
    maturity: 'provisional',
    windowDays: 60,
    sourceIds: ['fixture-source-311', 'fixture-source-339'],
    lastSeenAt: '2026-08-04T08:00:00.000Z',
    limitation: text('stage3CandidatePatternLimitation'),
  },
];

function series(
  id: string,
  entityId: string,
  labelKey: string,
  observations: PersonalTerminalObservation[],
  options: {
    baseline: number;
    low: number;
    high: number;
    semantic?: PersonalTerminalSeries['semantic'];
    supportsCandle?: boolean;
    unitKey?: string;
    qaIndex?: boolean;
    stability?: PersonalTerminalSeries['qaStability'];
  },
): PersonalTerminalSeries {
  return {
    id,
    entityId,
    label: text(labelKey),
    unit: text(options.unitKey || 'quantUnitOutOfFive'),
    stage: 'S3',
    semantic: options.semantic || 'ordinal_state',
    valueChangeMode: options.semantic === 'duration' || options.semantic === 'performance' ? 'percentage' : 'absolute',
    supportsCandle: options.supportsCandle ?? false,
    observations,
    load: loadSeries(),
    events: events(),
    baseline: {
      status: options.qaIndex ? 'qa_only' : 'established',
      value: options.baseline,
      low: options.low,
      high: options.high,
      referenceKind: options.qaIndex ? 'qa_derived' : 'historical',
    },
    limitation: text(options.qaIndex ? 'personalTerminalQaIndexLimitation' : 'personalTerminalFixtureLimitation'),
    qaDerivedIndex: options.qaIndex,
    qaStability: options.stability,
  };
}

function skillRows(goalId: string, labels: string[], entityIds: string[] = []) {
  return labels.map((label, index) => ({
    id: entityIds[index] || `${goalId}:skill:${index}`,
    label: text(label),
    value: [0.34, 0.27, 0.23, 0.16][index] || 0.1,
    direction: index === 0 || index === 2 ? 'rising' as const : index === 1 ? 'stable' as const : 'weakening' as const,
    stage: index < 3 ? 'S3' as const : 'S2' as const,
  }));
}

function matureModel(fixture: PersonalTerminalFixtureId): PersonalTerminalModel {
  const volatile = fixture === 'volatile';
  const marketObservations = withIntraday(dailySeries({ baseline: 66, amplitude: 5.2, slope: 0.018, volatile }));
  const stateObservations = withIntraday(dailySeries({ baseline: 3.25, amplitude: 0.36, slope: 0.0015, volatile }));
  const executionObservations = dailySeries({ baseline: 44, amplitude: 18, slope: 0.08, missingEvery: 9, volatile });
  const entities: PersonalTerminalEntity[] = [
    {
      id: 'market:personal', scope: 'market', label: text('personalTerminalPersonalMarket'), context: text('personalTerminalMarketContext'),
      seriesIds: ['market:index', 'market:state', 'market:execution', 'market:recovery'],
    },
    {
      id: 'goal:quant-analyst', scope: 'goal', label: text('personalTerminalFixtureGoalQuant'), context: text('personalTerminalGoalPortfolioContext'),
      seriesIds: ['goal:quant-analyst:activity'], compositionBasis: text('personalTerminalRecentActivityShare'),
      composition: skillRows(
        'goal:quant-analyst',
        ['personalTerminalFixtureSkillSql', 'personalTerminalFixtureSkillPython', 'personalTerminalFixtureSkillEconometrics', 'personalTerminalFixtureSkillFinance'],
        ['skill:sql'],
      ),
    },
    {
      id: 'goal:strength', scope: 'goal', label: text('personalTerminalFixtureGoalStrength'), context: text('personalTerminalGoalPortfolioContext'),
      seriesIds: ['goal:strength:activity'], compositionBasis: text('personalTerminalRecentActivityShare'),
      composition: skillRows('goal:strength', ['personalTerminalFixtureSkillBench', 'personalTerminalFixtureSkillSquat', 'personalTerminalFixtureSkillPull', 'personalTerminalFixtureSkillRecovery'], ['skill:bench']),
    },
    {
      id: 'goal:writing', scope: 'goal', label: text('personalTerminalFixtureGoalWriting'), context: text('personalTerminalGoalPortfolioContext'),
      seriesIds: ['goal:writing:activity'], compositionBasis: text('personalTerminalRecentActivityShare'),
      composition: skillRows('goal:writing', ['personalTerminalFixtureSkillResearch', 'personalTerminalFixtureSkillDraft', 'personalTerminalFixtureSkillRevision', 'personalTerminalFixtureSkillFinal'], ['skill:writing']),
    },
    {
      id: 'goal:recovery', scope: 'goal', label: text('personalTerminalFixtureGoalRecovery'), context: text('personalTerminalGoalPortfolioContext'),
      seriesIds: ['goal:recovery:activity'], compositionBasis: text('personalTerminalRecentActivityShare'),
      composition: skillRows('goal:recovery', ['personalTerminalFixtureSkillSleep', 'personalTerminalFixtureSkillWalk', 'personalTerminalFixtureSkillMobility', 'personalTerminalFixtureSkillDownshift']),
    },
    { id: 'skill:sql', scope: 'skill', label: text('personalTerminalFixtureSkillSql'), context: text('personalTerminalSkillAssetContext'), seriesIds: ['skill:sql:performance', 'skill:sql:activity'] },
    { id: 'skill:bench', scope: 'skill', label: text('personalTerminalFixtureSkillBench'), context: text('personalTerminalSkillAssetContext'), seriesIds: ['skill:bench:performance', 'skill:bench:activity'] },
    { id: 'skill:writing', scope: 'skill', label: text('personalTerminalFixtureSkillDraft'), context: text('personalTerminalSkillAssetContext'), seriesIds: ['skill:writing:performance', 'skill:writing:activity'] },
  ];
  const seriesRows: PersonalTerminalSeries[] = [
    series('market:index', 'market:personal', 'personalTerminalQaDerivedIndex', marketObservations, { baseline: 69.2, low: 63.8, high: 73.5, semantic: 'derived_index', supportsCandle: true, unitKey: 'personalTerminalUnitIndex', qaIndex: true, stability: volatile ? 'variable' : 'stable' }),
    series('market:state', 'market:personal', 'quantMetricState', stateObservations, { baseline: 3.62, low: 3.18, high: 4.08, supportsCandle: true, stability: volatile ? 'variable' : 'stable' }),
    series('market:execution', 'market:personal', 'quantMetricExecution', executionObservations, { baseline: 66, low: 38, high: 88, semantic: 'duration', unitKey: 'quantUnitMinutes', stability: 'mixed' }),
    series('market:recovery', 'market:personal', 'quantMetricRecovery', dailySeries({ baseline: 52, amplitude: 7, slope: 0.012, volatile }), { baseline: 54, low: 45, high: 62, semantic: 'performance', unitKey: 'quantUnitMilliseconds' }),
    series('goal:quant-analyst:activity', 'goal:quant-analyst', 'personalTerminalGoalActivity', dailySeries({ baseline: 38, amplitude: 22, slope: 0.08, missingEvery: 8, volatile }), { baseline: 48, low: 20, high: 76, semantic: 'duration', unitKey: 'quantUnitMinutes' }),
    series('goal:strength:activity', 'goal:strength', 'personalTerminalGoalActivity', dailySeries({ baseline: 32, amplitude: 26, slope: 0.05, missingEvery: 10, volatile }), { baseline: 42, low: 18, high: 74, semantic: 'duration', unitKey: 'quantUnitMinutes' }),
    series('goal:writing:activity', 'goal:writing', 'personalTerminalGoalActivity', dailySeries({ baseline: 28, amplitude: 18, slope: 0.06, missingEvery: 7 }), { baseline: 38, low: 16, high: 62, semantic: 'duration', unitKey: 'quantUnitMinutes' }),
    series('goal:recovery:activity', 'goal:recovery', 'personalTerminalGoalActivity', dailySeries({ baseline: 18, amplitude: 9, slope: 0.02, missingEvery: 6 }), { baseline: 24, low: 10, high: 38, semantic: 'duration', unitKey: 'quantUnitMinutes' }),
    series('skill:sql:performance', 'skill:sql', 'personalTerminalFixtureSkillSqlPerformance', dailySeries({ baseline: 58, amplitude: 6, slope: 0.055, missingEvery: 8, volatile }), { baseline: 70, low: 61, high: 79, semantic: 'performance', unitKey: 'personalTerminalUnitIndex' }),
    series('skill:sql:activity', 'skill:sql', 'personalTerminalSkillActivity', dailySeries({ baseline: 28, amplitude: 20, slope: 0.06, missingEvery: 6 }), { baseline: 36, low: 12, high: 62, semantic: 'duration', unitKey: 'quantUnitMinutes' }),
    series('skill:bench:performance', 'skill:bench', 'personalTerminalFixtureSkillBenchPerformance', dailySeries({ baseline: 74, amplitude: 3, slope: 0.035, missingEvery: 13 }), { baseline: 82, low: 76, high: 88, semantic: 'performance', unitKey: 'personalTerminalUnitKg' }),
    series('skill:bench:activity', 'skill:bench', 'personalTerminalSkillActivity', dailySeries({ baseline: 18, amplitude: 15, slope: 0.02, missingEvery: 10 }), { baseline: 26, low: 8, high: 45, semantic: 'duration', unitKey: 'quantUnitMinutes' }),
    series('skill:writing:performance', 'skill:writing', 'personalTerminalFixtureSkillWritingPerformance', dailySeries({ baseline: 520, amplitude: 160, slope: 0.7, missingEvery: 5 }), { baseline: 710, low: 430, high: 940, semantic: 'performance', unitKey: 'personalTerminalUnitWords' }),
    series('skill:writing:activity', 'skill:writing', 'personalTerminalSkillActivity', dailySeries({ baseline: 24, amplitude: 14, slope: 0.04, missingEvery: 7 }), { baseline: 34, low: 12, high: 52, semantic: 'duration', unitKey: 'quantUnitMinutes' }),
  ];
  const selectedScope = fixture === 'portfolio' ? 'goal' : fixture === 'skill' ? 'skill' : 'market';
  const selectedEntity = selectedScope === 'goal' ? 'goal:quant-analyst' : selectedScope === 'skill' ? 'skill:sql' : 'market:personal';
  const selectedSeries = selectedScope === 'goal' ? 'goal:quant-analyst:activity' : selectedScope === 'skill' ? 'skill:sql:performance' : 'market:state';
  const marketMap = entities
    .filter((entity) => entity.scope === 'goal')
    .flatMap((goal) => (goal.composition || []).map((row) => ({
      ...row,
      entityId: goal.id,
      quantity: 'recent_activity' as const,
    })));
  const breadth = marketMap.reduce((result, row) => {
    if (row.direction === 'rising') result.improving += 1;
    else if (row.direction === 'stable') result.stable += 1;
    else if (row.direction === 'weakening') result.weakening += 1;
    else result.unavailable += 1;
    return result;
  }, { improving: 0, stable: 0, weakening: 0, unavailable: 0 });
  return {
    fixture,
    dataMode: 'qa_fixture',
    defaultScope: selectedScope,
    defaultEntityId: selectedEntity,
    defaultSeriesId: selectedSeries,
    entities,
    series: seriesRows,
    signals,
    implication: text('personalTerminalFixtureImplication'),
    breadth,
    marketMap,
    similarPeriods: [
      { id: 'similar-march', start: '2026-03-03', end: '2026-03-08', primaryChange: -0.52, relatedChange: 17, observationCount: 6 },
      { id: 'similar-may', start: '2026-05-20', end: '2026-05-25', primaryChange: -0.44, relatedChange: 14, observationCount: 5 },
    ],
    range: { start: '2025-08-09', end: '2026-08-08' },
  };
}

function forming(): PersonalTerminalModel {
  const observations = [
    { id: 'forming-1', timestamp: '2026-08-05T09:00:00.000Z', value: 3, provenance: 'questlife_confirmed' as const, sourceIds: ['forming-source-1'] },
    { id: 'forming-2', timestamp: '2026-08-07T09:00:00.000Z', value: 3.4, provenance: 'questlife_confirmed' as const, sourceIds: ['forming-source-2'] },
    { id: 'forming-3', timestamp: '2026-08-08T09:00:00.000Z', value: 3.2, provenance: 'questlife_confirmed' as const, sourceIds: ['forming-source-3'] },
  ];
  return {
    fixture: 'forming',
    dataMode: 'qa_fixture',
    defaultScope: 'market',
    defaultEntityId: 'market:personal',
    defaultSeriesId: 'market:state',
    entities: [{ id: 'market:personal', scope: 'market', label: text('personalTerminalPersonalMarket'), context: text('personalTerminalMarketContext'), seriesIds: ['market:state'] }],
    series: [{
      id: 'market:state', entityId: 'market:personal', label: text('quantMetricState'), unit: text('quantUnitOutOfFive'), stage: 'S1', semantic: 'ordinal_state',
      valueChangeMode: 'absolute', supportsCandle: false, observations, load: [], events: [],
      baseline: { status: 'forming', value: null, low: null, high: null, referenceKind: 'none' }, limitation: text('personalTerminalFixtureFormingLimitation'),
    }],
    signals: [],
    implication: text('quantFixtureFormingImplication'),
    range: { start: '2026-08-05', end: '2026-08-08' },
  };
}

export function getPersonalTerminalFixture(id: PersonalTerminalFixtureId): PersonalTerminalModel {
  return id === 'forming' ? forming() : matureModel(id);
}
