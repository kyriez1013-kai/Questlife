import type {
  ExecutionLog,
  PatternMemory,
  Skill,
  StateCheckIn,
} from '../types';
import type { InsightsSummaryResult } from '../utils/insightsEngine';
import type { MetacognitionSummary } from '../utils/metacognition';
import type { ObjectiveContextBrief } from '../utils/objectiveContextBrief';
import type { V11EvidenceStage } from '../v11/tokens';

export type V11InsightsView = 'overview' | 'trends' | 'patterns' | 'advanced';
export type V11PatternFilter = 'accepted' | 'candidate' | 'archived';
export type V11Confidence = 'low' | 'medium' | 'high' | 'unknown';

export type V11InsightCopy =
  | { kind: 'i18n'; key: string; values?: Record<string, string | number> }
  | { kind: 'text'; text: string };

export type V11InsightsEvidenceItem = {
  id: string;
  title: V11InsightCopy;
  detail: V11InsightCopy;
  sourceType: 'state' | 'execution' | 'context' | 'pattern' | 'association';
  sourceIds: string[];
  observedAt?: string;
  confidence: V11Confidence;
  limitation: V11InsightCopy;
};

export type V11TrendPoint = {
  date: string;
  dayLabel: string;
  minutes: number | null;
  executionCount: number;
  ratedCount: number;
  averageQuality: number | null;
  observation: 'duration' | 'untimed_execution' | 'missing';
};

export type V11SkillAllocation = {
  id: string;
  label: string;
  minutes: number;
  share: number;
  color?: string;
};

export type V11PatternRow = {
  id: string;
  status: V11PatternFilter;
  origin: 'pattern_memory' | 'derived_state' | 'derived_association';
  title: V11InsightCopy;
  description: V11InsightCopy;
  evidenceCount: number;
  confidence: V11Confidence;
  evidenceBasis?: PatternMemory['evidenceBasis'];
  lastSeenAt?: string;
  caution?: string;
  sourceIds: string[];
};

export type V11AdvancedModeId =
  | 'ability'
  | 'tomorrow'
  | 'monthly'
  | 'growth'
  | 'anomalies'
  | 'combination'
  | 'self_knowledge'
  | 'weekly_execution'
  | 'rescue'
  | 'system_loop';

export type V11AdvancedPayload =
  | { kind: 'ability'; dimensions: InsightsSummaryResult['abilityRadar']['dimensions'] }
  | { kind: 'tomorrow'; energy: number; focus: number }
  | { kind: 'monthly'; months: InsightsSummaryResult['monthlyTrend']['months'] }
  | { kind: 'growth'; weeks: InsightsSummaryResult['growthCurve']['weeks']; monthRatePct: number | null }
  | { kind: 'anomalies'; anomalies: InsightsSummaryResult['anomalies']['anomalies'] }
  | { kind: 'combination'; buckets: InsightsSummaryResult['combination']['buckets'] }
  | { kind: 'self_knowledge'; durationError: number; qualityError: number | null; weeks: { week: string; error: number }[] }
  | { kind: 'weekly_execution'; points: V11TrendPoint[]; allocation: V11SkillAllocation[] }
  | { kind: 'rescue'; total: number; completed: number; completionRate: number }
  | { kind: 'system_loop'; activeGoals: number; totalGoals: number; skillsWithLogs: number; totalSkills: number; scheduledBlocksThisWeek: number; executionLogsThisWeek: number };

export type V11AdvancedMode = {
  id: V11AdvancedModeId;
  titleKey: string;
  status: 'available' | 'insufficient';
  sampleSize: number;
  confidence: V11Confidence;
  summary: V11InsightCopy;
  limitation: V11InsightCopy;
  payload?: V11AdvancedPayload;
};

export type V11SelfKnowledgeInput = {
  durationError: number;
  qualityError: number | null;
  weeks: { week: string; error: number }[];
} | null;

export type V11RescueInput = {
  total: number;
  completed: number;
  completionRate: number;
};

export type V11LoopInput = {
  activeGoals: number;
  totalGoals: number;
  skillsWithLogs: number;
  totalSkills: number;
  scheduledBlocksThisWeek: number;
  executionLogsThisWeek: number;
};

export type BuildV11InsightsPresentationInput = {
  now: Date;
  liveLogs: ExecutionLog[];
  stateCheckIns: StateCheckIn[];
  skills: Skill[];
  patternMemory: PatternMemory[];
  metacognition: MetacognitionSummary;
  objectiveContext: ObjectiveContextBrief;
  engine: InsightsSummaryResult;
  selfKnowledge: V11SelfKnowledgeInput;
  rescue: V11RescueInput;
  loop: V11LoopInput;
};

export type V11InsightsPresentation = {
  range: { start: string; end: string; labelKey: string };
  overview: {
    stage: V11EvidenceStage;
    primary: {
      kind: 'metacognition' | 'state_pattern' | 'context' | 'state' | 'execution' | 'empty';
      title: V11InsightCopy;
      body: V11InsightCopy;
      confidence: V11Confidence;
      sourceIds: string[];
    };
    evidence: V11InsightsEvidenceItem[];
    limitation: V11InsightCopy;
    nextAction: V11InsightCopy;
  };
  trends: {
    stage: V11EvidenceStage;
    status: 'available' | 'insufficient';
    points: V11TrendPoint[];
    sampleCount: number;
    activeDays: number;
    baselineMinutes: number | null;
    skillAllocation: V11SkillAllocation[];
    limitation: V11InsightCopy;
  };
  patterns: {
    stage: V11EvidenceStage;
    rows: V11PatternRow[];
    counts: Record<V11PatternFilter, number>;
  };
  advanced: {
    stage: V11EvidenceStage;
    modes: V11AdvancedMode[];
  };
};

function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function validState(row: StateCheckIn) {
  return Number.isFinite(row.overall) && row.overall >= 1 && row.overall <= 5;
}

function confidenceRank(confidence: V11Confidence) {
  return confidence === 'high' ? 3 : confidence === 'medium' ? 2 : confidence === 'low' ? 1 : 0;
}

function stageFromConfidence(confidence: V11Confidence): V11EvidenceStage {
  if (confidence === 'high') return 'S3';
  if (confidence === 'medium') return 'S2';
  return 'S1';
}

function storedConfidence(value: number): V11Confidence {
  if (!Number.isFinite(value)) return 'unknown';
  if (value >= 0.75) return 'high';
  if (value >= 0.5) return 'medium';
  return 'low';
}

function lastSevenDays(now: Date, logs: ExecutionLog[]) {
  const anchor = new Date(now);
  anchor.setHours(0, 0, 0, 0);
  const points: V11TrendPoint[] = [];

  for (let index = 6; index >= 0; index -= 1) {
    const date = new Date(anchor);
    date.setDate(anchor.getDate() - index);
    const key = localDate(date);
    const dayLogs = logs.filter((log) => log.date === key);
    const durationLogs = dayLogs.filter((log) => (log.durationMinutes ?? 0) > 0);
    const rated = dayLogs.filter((log) => Number.isFinite(log.qualityRating));
    points.push({
      date: key,
      dayLabel: String(date.getDate()),
      minutes: durationLogs.length > 0
        ? durationLogs.reduce((sum, log) => sum + (log.durationMinutes ?? 0), 0)
        : null,
      executionCount: dayLogs.length,
      ratedCount: rated.length,
      averageQuality: rated.length > 0
        ? rated.reduce((sum, log) => sum + (log.qualityRating ?? 0), 0) / rated.length
        : null,
      observation: durationLogs.length > 0
        ? 'duration'
        : dayLogs.length > 0
          ? 'untimed_execution'
          : 'missing',
    });
  }

  return points;
}

function allocationForRange(
  logs: ExecutionLog[],
  skills: Skill[],
  points: V11TrendPoint[],
): V11SkillAllocation[] {
  const dates = new Set(points.map((point) => point.date));
  const skillMap = new Map(skills.map((skill) => [skill.id, skill]));
  const minutes = new Map<string, number>();

  logs.forEach((log) => {
    if (!dates.has(log.date) || !log.linkedSkillId || (log.durationMinutes ?? 0) <= 0) return;
    if (!skillMap.has(log.linkedSkillId)) return;
    minutes.set(log.linkedSkillId, (minutes.get(log.linkedSkillId) ?? 0) + (log.durationMinutes ?? 0));
  });

  const total = Array.from(minutes.values()).reduce((sum, value) => sum + value, 0);
  if (total <= 0) return [];

  return Array.from(minutes.entries())
    .map(([id, value]) => {
      const skill = skillMap.get(id);
      return {
        id,
        label: skill?.name ?? id,
        minutes: value,
        share: value / total,
        color: skill?.color,
      };
    })
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 5);
}

function trendLabelKey(direction: MetacognitionSummary['stateTrend']['direction']) {
  if (direction === 'improving') return 'stateImproving';
  if (direction === 'declining') return 'stateDeclining';
  if (direction === 'stable') return 'stateStable';
  if (direction === 'mixed') return 'stateMixed';
  return 'dataNotEnoughForMetacognition';
}

function associationDetail(label: string): V11InsightCopy {
  return {
    kind: 'i18n',
    key: 'stage3AssociationDetail',
    values: { label },
  };
}

function buildEvidence({
  liveLogs,
  metacognition,
  objectiveContext,
  stateCheckIns,
}: Pick<BuildV11InsightsPresentationInput, 'liveLogs' | 'metacognition' | 'objectiveContext' | 'stateCheckIns'>) {
  const rows: V11InsightsEvidenceItem[] = [];
  const latestState = stateCheckIns
    .filter(validState)
    .slice()
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];

  if (metacognition.stateTrend.direction !== 'unknown') {
    rows.push({
      id: 'state-trend',
      title: { kind: 'i18n', key: 'evidenceFromState' },
      detail: { kind: 'i18n', key: trendLabelKey(metacognition.stateTrend.direction) },
      sourceType: 'state',
      sourceIds: stateCheckIns.filter(validState).map((row) => row.id),
      observedAt: latestState?.timestamp,
      confidence: metacognition.status === 'ok' ? 'medium' : 'low',
      limitation: { kind: 'i18n', key: 'stage3StateTrendLimitation' },
    });
  } else if (latestState) {
    rows.push({
      id: `state-${latestState.id}`,
      title: { kind: 'i18n', key: 'stage3LatestStateObservation' },
      detail: { kind: 'i18n', key: 'stage3StateObservationValue', values: { value: latestState.overall } },
      sourceType: 'state',
      sourceIds: [latestState.id],
      observedAt: latestState.timestamp,
      confidence: 'low',
      limitation: { kind: 'i18n', key: 'stage3SingleObservationLimitation' },
    });
  }

  const topPattern = metacognition.statePatterns.patterns[0];
  if (topPattern) {
    rows.push({
      id: `derived-pattern-${topPattern.id}`,
      title: { kind: 'i18n', key: topPattern.labelKey, values: topPattern.labelValues },
      detail: { kind: 'i18n', key: topPattern.evidenceKey, values: topPattern.evidenceValues },
      sourceType: 'pattern',
      sourceIds: topPattern.sourceIds,
      confidence: topPattern.confidence,
      limitation: { kind: 'i18n', key: 'stage3CandidatePatternLimitation' },
    });
  }

  if (objectiveContext.status !== 'empty') {
    rows.push({
      id: 'objective-context',
      title: { kind: 'i18n', key: 'evidenceFromContext' },
      detail: { kind: 'i18n', key: objectiveContext.cognitiveLoadSuggestionKey },
      sourceType: 'context',
      sourceIds: [],
      confidence: objectiveContext.confidence,
      limitation: { kind: 'i18n', key: 'stage3ContextLimitation' },
    });
  }

  const link = metacognition.behaviorLinks[0];
  if (link) {
    rows.push({
      id: `association-${link.evidence}`,
      title: { kind: 'i18n', key: 'evidenceFromRecentExecution' },
      detail: associationDetail(link.label),
      sourceType: 'association',
      sourceIds: link.sourceIds ?? [],
      confidence: link.confidence,
      limitation: { kind: 'i18n', key: 'associatedNotCausal' },
    });
  }

  if (rows.length === 0 && liveLogs.length > 0) {
    const latest = liveLogs.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    rows.push({
      id: `execution-${latest.id}`,
      title: { kind: 'i18n', key: 'evidenceFromRecentExecution' },
      detail: {
        kind: 'i18n',
        key: 'stage3RecentExecutionValue',
        values: {
          title: latest.title ?? latest.orphanedSkillName ?? '—',
          minutes: Math.max(0, latest.durationMinutes ?? 0),
        },
      },
      sourceType: 'execution',
      sourceIds: [latest.id],
      observedAt: latest.createdAt,
      confidence: 'low',
      limitation: { kind: 'i18n', key: 'stage3ExecutionLimitation' },
    });
  }

  return rows.slice(0, 3);
}

function relatedAcceptedPattern(
  patterns: PatternMemory[],
  evidence: V11InsightsEvidenceItem[],
) {
  const sourceIds = new Set(evidence.flatMap((row) => row.sourceIds));
  if (sourceIds.size === 0) return undefined;
  return patterns.find((pattern) => (
    pattern.status === 'accepted'
    && pattern.sampleN > 0
    && pattern.support.length > 0
    && pattern.support.some((support) => support.sourceId && sourceIds.has(support.sourceId))
  ));
}

function buildOverview(input: BuildV11InsightsPresentationInput) {
  const evidence = buildEvidence(input);
  const latestState = input.stateCheckIns
    .filter(validState)
    .slice()
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
  const topPattern = input.metacognition.statePatterns.patterns[0];

  let primary: V11InsightsPresentation['overview']['primary'];
  let nextAction: V11InsightCopy;

  if (input.metacognition.status === 'ok') {
    primary = {
      kind: 'metacognition',
      title: { kind: 'i18n', key: input.metacognition.currentPattern.titleKey },
      body: { kind: 'i18n', key: input.metacognition.currentPattern.bodyKey },
      confidence: input.metacognition.currentPattern.confidence,
      sourceIds: evidence.flatMap((row) => row.sourceIds),
    };
    nextAction = { kind: 'i18n', key: input.metacognition.currentPattern.nextActionKey };
  } else if (topPattern) {
    primary = {
      kind: 'state_pattern',
      title: { kind: 'i18n', key: topPattern.labelKey, values: topPattern.labelValues },
      body: { kind: 'i18n', key: topPattern.evidenceKey, values: topPattern.evidenceValues },
      confidence: topPattern.confidence,
      sourceIds: topPattern.sourceIds,
    };
    nextAction = { kind: 'i18n', key: topPattern.nextActionKey, values: topPattern.nextActionValues };
  } else if (input.objectiveContext.status !== 'empty') {
    primary = {
      kind: 'context',
      title: { kind: 'i18n', key: 'bodyContext' },
      body: { kind: 'i18n', key: input.objectiveContext.cognitiveLoadSuggestionKey },
      confidence: input.objectiveContext.confidence,
      sourceIds: [],
    };
    nextAction = { kind: 'i18n', key: input.objectiveContext.recommendedActionKey };
  } else if (latestState) {
    primary = {
      kind: 'state',
      title: { kind: 'i18n', key: 'stage3FirstObservationTitle' },
      body: { kind: 'i18n', key: 'stage3StateObservationValue', values: { value: latestState.overall } },
      confidence: 'low',
      sourceIds: [latestState.id],
    };
    nextAction = { kind: 'i18n', key: 'recordBeforeAfterAction' };
  } else if (input.liveLogs.length > 0) {
    primary = {
      kind: 'execution',
      title: { kind: 'i18n', key: 'evidenceFromRecentExecution' },
      body: { kind: 'i18n', key: 'recentFeedbackEvidence' },
      confidence: 'low',
      sourceIds: [input.liveLogs[input.liveLogs.length - 1]?.id].filter(Boolean) as string[],
    };
    nextAction = { kind: 'i18n', key: 'continueOneMoreRecord' };
  } else {
    primary = {
      kind: 'empty',
      title: { kind: 'i18n', key: 'dataStillAccumulating' },
      body: { kind: 'i18n', key: 'stage3NoUsableObservation' },
      confidence: 'low',
      sourceIds: [],
    };
    nextAction = { kind: 'i18n', key: 'recordBeforeAfterAction' };
  }

  const accepted = relatedAcceptedPattern(input.patternMemory, evidence);
  const stage: V11EvidenceStage = primary.kind === 'empty'
    ? 'S0'
    : accepted
      ? 'S3'
      : input.metacognition.status === 'ok'
        || input.metacognition.statePatterns.status === 'ok'
        || input.metacognition.stateTrend.direction !== 'unknown'
        ? 'S2'
        : 'S1';

  return {
    stage,
    primary,
    evidence,
    limitation: stage === 'S0'
      ? { kind: 'i18n' as const, key: 'stage3NoMeasurementLimitation' }
      : stage === 'S1'
        ? { kind: 'i18n' as const, key: 'stage3SingleObservationLimitation' }
        : accepted
          ? { kind: 'text' as const, text: accepted.caution || '' }
          : { kind: 'i18n' as const, key: 'stage3AssociationLimitation' },
    nextAction,
  };
}

function buildPatterns(input: BuildV11InsightsPresentationInput) {
  const memoryRows: V11PatternRow[] = input.patternMemory
    .filter((pattern) => pattern.status === 'accepted' || pattern.status === 'candidate' || pattern.status === 'archived')
    .map((pattern) => ({
      id: pattern.id,
      status: pattern.status as V11PatternFilter,
      origin: 'pattern_memory' as const,
      title: { kind: 'text' as const, text: pattern.label },
      description: { kind: 'text' as const, text: pattern.description },
      evidenceCount: pattern.sampleN,
      confidence: storedConfidence(pattern.confidence),
      evidenceBasis: pattern.evidenceBasis,
      lastSeenAt: pattern.lastSeenAt ?? pattern.updatedAt,
      caution: pattern.caution,
      sourceIds: pattern.support.map((support) => support.sourceId).filter(Boolean) as string[],
    }));

  const stateRows: V11PatternRow[] = input.metacognition.statePatterns.patterns.map((pattern) => ({
    id: `derived-state-${pattern.id}`,
    status: 'candidate',
    origin: 'derived_state',
    title: { kind: 'i18n', key: pattern.labelKey, values: pattern.labelValues },
    description: { kind: 'i18n', key: pattern.evidenceKey, values: pattern.evidenceValues },
    evidenceCount: pattern.sourceIds.length,
    confidence: pattern.confidence,
    sourceIds: pattern.sourceIds,
  }));

  const associationRows: V11PatternRow[] = input.metacognition.behaviorLinks.map((link, index) => ({
    id: `derived-association-${index}-${link.evidence}`,
    status: 'candidate',
    origin: 'derived_association',
    title: { kind: 'i18n', key: 'stage3PossibleAssociation' },
    description: associationDetail(link.label),
    evidenceCount: link.sourceIds?.length ?? 0,
    confidence: link.confidence,
    sourceIds: link.sourceIds ?? [],
  }));

  const rows = [...memoryRows, ...stateRows, ...associationRows].sort((a, b) => {
    const order = { accepted: 0, candidate: 1, archived: 2 };
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    if (confidenceRank(a.confidence) !== confidenceRank(b.confidence)) return confidenceRank(b.confidence) - confidenceRank(a.confidence);
    return (b.lastSeenAt ?? '').localeCompare(a.lastSeenAt ?? '');
  });
  const counts = rows.reduce<Record<V11PatternFilter, number>>((result, row) => {
    result[row.status] += 1;
    return result;
  }, { accepted: 0, candidate: 0, archived: 0 });
  const stage: V11EvidenceStage = counts.accepted > 0
    ? 'S3'
    : rows.some((row) => row.evidenceCount > 0)
      ? 'S2'
      : rows.length > 0
        ? 'S1'
        : 'S0';

  return { stage, rows, counts };
}

function engineMode(
  id: V11AdvancedModeId,
  titleKey: string,
  status: 'ok' | 'insufficient',
  sampleSize: number,
  confidence: V11Confidence,
  summaryKey: string,
  limitationKey: string,
  payload?: V11AdvancedPayload,
): V11AdvancedMode {
  return {
    id,
    titleKey,
    status: status === 'ok' ? 'available' : 'insufficient',
    sampleSize,
    confidence,
    summary: { kind: 'i18n', key: summaryKey },
    limitation: { kind: 'i18n', key: limitationKey },
    payload: status === 'ok' ? payload : undefined,
  };
}

function buildAdvanced(
  input: BuildV11InsightsPresentationInput,
  points: V11TrendPoint[],
  allocation: V11SkillAllocation[],
) {
  const { engine } = input;
  const modes: V11AdvancedMode[] = [
    engineMode(
      'ability',
      'stage3AdvancedAbility',
      engine.abilityRadar.status,
      engine.abilityRadar.conclusion.sampleSize,
      engine.abilityRadar.conclusion.confidence,
      'stage3AbilitySummary',
      'stage3AbilityLimitation',
      { kind: 'ability', dimensions: engine.abilityRadar.dimensions },
    ),
    engineMode(
      'tomorrow',
      'stage3AdvancedTomorrow',
      engine.tomorrowPrediction.status,
      engine.tomorrowPrediction.conclusion.sampleSize,
      'unknown',
      'stage3TomorrowSummary',
      'stage3TomorrowLimitation',
      { kind: 'tomorrow', energy: engine.tomorrowPrediction.energy, focus: engine.tomorrowPrediction.focus },
    ),
    engineMode(
      'monthly',
      'stage3AdvancedMonthly',
      engine.monthlyTrend.status,
      engine.monthlyTrend.conclusion.sampleSize,
      engine.monthlyTrend.conclusion.confidence,
      'stage3MonthlySummary',
      'stage3MonthlyLimitation',
      { kind: 'monthly', months: engine.monthlyTrend.months },
    ),
    engineMode(
      'growth',
      'stage3AdvancedGrowth',
      engine.growthCurve.status,
      engine.growthCurve.conclusion.sampleSize,
      engine.growthCurve.conclusion.confidence,
      'stage3GrowthSummary',
      'stage3GrowthLimitation',
      { kind: 'growth', weeks: engine.growthCurve.weeks, monthRatePct: engine.growthCurve.monthRatePct },
    ),
    engineMode(
      'anomalies',
      'stage3AdvancedAnomalies',
      engine.anomalies.status === 'ok' && engine.anomalies.anomalies.length > 0 ? 'ok' : 'insufficient',
      input.liveLogs.length,
      'unknown',
      'stage3AnomalySummary',
      'stage3AnomalyLimitation',
      { kind: 'anomalies', anomalies: engine.anomalies.anomalies },
    ),
    engineMode(
      'combination',
      'stage3AdvancedCombination',
      engine.combination.status,
      engine.combination.conclusion.sampleSize,
      engine.combination.conclusion.confidence,
      'stage3CombinationSummary',
      'stage3CombinationLimitation',
      { kind: 'combination', buckets: engine.combination.buckets },
    ),
    engineMode(
      'self_knowledge',
      'stage3AdvancedSelfKnowledge',
      input.selfKnowledge ? 'ok' : 'insufficient',
      input.selfKnowledge?.weeks.length ?? 0,
      'unknown',
      'stage3SelfKnowledgeSummary',
      'stage3SelfKnowledgeLimitation',
      input.selfKnowledge ? { kind: 'self_knowledge', ...input.selfKnowledge } : undefined,
    ),
    engineMode(
      'weekly_execution',
      'stage3AdvancedWeeklyExecution',
      points.filter((point) => point.minutes != null).length >= 3 ? 'ok' : 'insufficient',
      points.reduce((sum, point) => sum + point.executionCount, 0),
      'unknown',
      'stage3WeeklyExecutionSummary',
      'stage3WeeklyExecutionLimitation',
      { kind: 'weekly_execution', points, allocation },
    ),
    engineMode(
      'rescue',
      'stage3AdvancedRescue',
      input.rescue.total > 0 ? 'ok' : 'insufficient',
      input.rescue.total,
      'unknown',
      'stage3RescueSummary',
      'stage3RescueLimitation',
      { kind: 'rescue', ...input.rescue },
    ),
    engineMode(
      'system_loop',
      'stage3AdvancedSystemLoop',
      input.loop.totalGoals > 0 || input.loop.totalSkills > 0 ? 'ok' : 'insufficient',
      input.loop.executionLogsThisWeek,
      'unknown',
      'stage3SystemLoopSummary',
      'stage3SystemLoopLimitation',
      { kind: 'system_loop', ...input.loop },
    ),
  ];
  const strongest = modes
    .filter((mode) => mode.status === 'available')
    .sort((a, b) => confidenceRank(b.confidence) - confidenceRank(a.confidence))[0];
  const stage = strongest
    ? stageFromConfidence(strongest.confidence === 'unknown' ? 'medium' : strongest.confidence)
    : input.liveLogs.length > 0 || input.stateCheckIns.some(validState)
      ? 'S1'
      : 'S0';
  return { stage, modes };
}

export function buildV11InsightsPresentation(
  input: BuildV11InsightsPresentationInput,
): V11InsightsPresentation {
  const points = lastSevenDays(input.now, input.liveLogs);
  const sampleCount = points.reduce((sum, point) => sum + (point.observation === 'duration' ? point.executionCount : 0), 0);
  const activeDays = points.filter((point) => point.minutes != null && point.minutes > 0).length;
  const status = sampleCount >= 3 && activeDays >= 3 ? 'available' : 'insufficient';
  const observedMinutes = points.map((point) => point.minutes).filter((value): value is number => value != null);
  const baselineMinutes = status === 'available' && observedMinutes.length > 0
    ? observedMinutes.reduce((sum, value) => sum + value, 0) / observedMinutes.length
    : null;
  const skillAllocation = allocationForRange(input.liveLogs, input.skills, points);
  const trendConfidence: V11Confidence = input.engine.weeklyPattern.status === 'ok'
    ? input.engine.weeklyPattern.conclusion.confidence
    : status === 'available'
      ? 'medium'
      : sampleCount > 0
        ? 'low'
        : 'unknown';
  const trendStage: V11EvidenceStage = status === 'available'
    ? stageFromConfidence(trendConfidence)
    : sampleCount > 0
      ? 'S1'
      : 'S0';
  const start = points[0]?.date ?? localDate(input.now);
  const end = points[points.length - 1]?.date ?? localDate(input.now);

  return {
    range: { start, end, labelKey: 'last7Days' },
    overview: buildOverview(input),
    trends: {
      stage: trendStage,
      status,
      points,
      sampleCount,
      activeDays,
      baselineMinutes,
      skillAllocation,
      limitation: status === 'available'
        ? { kind: 'i18n', key: 'trendLimitedToLoggedDuration' }
        : { kind: 'i18n', key: 'trendNeedsComparableDays', values: { days: activeDays, samples: sampleCount } },
    },
    patterns: buildPatterns(input),
    advanced: buildAdvanced(input, points, skillAllocation),
  };
}

