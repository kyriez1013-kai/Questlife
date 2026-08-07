import type { ExecutionLog, PatternMemory, Skill, StateCheckIn } from '../types';
import type { InsightsSummaryResult } from '../utils/insightsEngine';
import type { MetacognitionSummary } from '../utils/metacognition';
import type { ObjectiveContextBrief } from '../utils/objectiveContextBrief';
// Node's built-in TypeScript runner requires the extension; Expo typecheck does not.
// @ts-expect-error Test-only Node TypeScript entry.
import { buildV11InsightsPresentation } from './insightsPresentation.ts';

const now = new Date('2026-08-07T12:00:00+10:00');

function equal(actual: unknown, expected: unknown, name: string) {
  if (actual !== expected) {
    throw new Error(`${name}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

function state(id: string, date = '2026-08-07'): StateCheckIn {
  return {
    id,
    date,
    timestamp: `${date}T08:00:00.000Z`,
    overall: 3,
    createdAt: `${date}T08:00:00.000Z`,
  };
}

function log(id: string, date: string, durationMinutes = 20): ExecutionLog {
  return {
    id,
    date,
    durationMinutes,
    title: id,
    source: 'manual',
    createdAt: `${date}T09:00:00.000Z`,
  };
}

function pattern(id: string, sourceId: string): PatternMemory {
  return {
    id,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-07T00:00:00.000Z',
    status: 'accepted',
    label: id,
    description: id,
    patternType: 'action_state_effect',
    evidenceBasis: 'personal_pattern',
    confidence: 0.8,
    sampleN: 2,
    support: [{ sourceType: 'state', sourceId, summary: 'support' }],
  };
}

const insufficientEngine = {
  weeklyPattern: { status: 'insufficient', conclusion: { confidence: 'low' } },
  abilityRadar: { status: 'insufficient', dimensions: [], conclusion: { sampleSize: 0, confidence: 'low' } },
  tomorrowPrediction: { status: 'insufficient', energy: 3, focus: 3, conclusion: { sampleSize: 0 } },
  monthlyTrend: { status: 'insufficient', months: [], conclusion: { sampleSize: 0, confidence: 'low' } },
  growthCurve: { status: 'insufficient', weeks: [], monthRatePct: null, conclusion: { sampleSize: 0, confidence: 'low' } },
  anomalies: { status: 'insufficient', anomalies: [] },
  combination: { status: 'insufficient', buckets: [], conclusion: { sampleSize: 0, confidence: 'low' } },
} as unknown as InsightsSummaryResult;

const insufficientMeta: MetacognitionSummary = {
  status: 'insufficient',
  windowDays: 7,
  stateTrend: { direction: 'unknown' },
  behaviorLinks: [],
  statePatterns: { status: 'insufficient', patterns: [] },
  predictionGap: { status: 'insufficient', tendency: 'unknown' },
  currentPattern: {
    titleKey: 'dataNotEnoughForMetacognition',
    bodyKey: 'whatToRecordNext',
    nextActionKey: 'recordBeforeAfterAction',
    confidence: 'low',
  },
};

const emptyContext: ObjectiveContextBrief = {
  status: 'empty',
  recoveryStatus: 'unknown',
  cognitiveLoadSuggestionKey: 'contextNoDataSuggestion',
  recommendedActionKey: 'contextNoDataAction',
  avoidKeys: [],
  confidence: 'low',
  metrics: {},
};

function build(
  logs: ExecutionLog[] = [],
  states: StateCheckIn[] = [],
  patterns: PatternMemory[] = [],
  metacognition: MetacognitionSummary = insufficientMeta,
) {
  return buildV11InsightsPresentation({
    now,
    liveLogs: logs,
    stateCheckIns: states,
    skills: [] as Skill[],
    patternMemory: patterns,
    metacognition,
    objectiveContext: emptyContext,
    engine: insufficientEngine,
    selfKnowledge: null,
    rescue: { total: 0, completed: 0, completionRate: 0 },
    loop: { activeGoals: 0, totalGoals: 0, skillsWithLogs: 0, totalSkills: 0, scheduledBlocksThisWeek: 0, executionLogsThisWeek: 0 },
  });
}

const s0 = build();
equal(s0.overview.stage, 'S0', 'no observation stays S0');
equal(s0.trends.baselineMinutes, null, 'insufficient trend has no baseline');

const s1 = build([], [state('state-one')]);
equal(s1.overview.stage, 'S1', 'one direct observation is S1');
equal(s1.overview.primary.kind, 'state', 'S1 exposes the direct observation');

const trend = build([
  log('one', '2026-08-05'),
  log('two', '2026-08-06'),
  log('three', '2026-08-07'),
]);
equal(trend.trends.status, 'available', 'existing 3 sample and 3 active day gate remains');
equal(trend.trends.points[0]?.observation, 'missing', 'missing day is not rendered as zero');

const unrelated = build([], [state('state-one')], [pattern('unrelated', 'other-state')]);
equal(unrelated.overview.stage, 'S1', 'unrelated accepted pattern cannot promote overview');

const linkedMeta: MetacognitionSummary = {
  ...insufficientMeta,
  status: 'ok',
  stateTrend: { direction: 'stable' },
  currentPattern: {
    titleKey: 'stateStable',
    bodyKey: 'whatToRecordNext',
    nextActionKey: 'recordBeforeAfterAction',
    confidence: 'medium',
  },
};
const linked = build([], [state('state-one')], [pattern('linked', 'state-one')], linkedMeta);
equal(linked.overview.stage, 'S3', 'accepted pattern only promotes when its support is current evidence');
equal(linked.patterns.counts.accepted, 1, 'accepted state remains separate');

