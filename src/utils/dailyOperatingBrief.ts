import { Category, ContextLog, ExecutionLog, QuestModule, ScheduleBlock, Skill, StateCheckIn } from '../types';
import { ObjectiveContextBrief } from './objectiveContextBrief';
import { MetacognitionSummary } from './metacognition';
import { TodayCommand } from './todayCommand';

export type DailyOperatingBriefMode = 'recovery' | 'steady' | 'push' | 'restart' | 'protect_focus' | 'unknown';
export type DailyOperatingBriefIntensity = 'very_low' | 'low' | 'normal' | 'high';
export type DailyOperatingBriefSource = 'state_pattern' | 'context' | 'schedule' | 'recent_feedback' | 'fallback';
export type DailyOperatingBriefConfidence = 'low' | 'medium' | 'high';

export type DailyOperatingBrief = {
  status: 'insufficient' | 'ok';
  mode: DailyOperatingBriefMode;
  modeLabelKey: string;
  mainJudgementKey: string;
  mainJudgementValues?: Record<string, string | number>;
  recommendedIntensity: DailyOperatingBriefIntensity;
  firstActionKey: string;
  firstActionValues?: Record<string, string | number>;
  firstActionSource?: DailyOperatingBriefSource;
  whyKeys: string[];
  whyValues?: Record<string, string | number>;
  avoidKeys: string[];
  evidence: Array<{
    type: 'sleep' | 'recovery' | 'state' | 'pattern' | 'recent_execution' | 'schedule' | 'fallback';
    labelKey: string;
    labelValues?: Record<string, string | number>;
    confidence: DailyOperatingBriefConfidence;
  }>;
  confidence: DailyOperatingBriefConfidence;
};

type BuildDailyOperatingBriefInput = {
  contextLogs: ContextLog[];
  stateCheckIns: StateCheckIn[];
  executionLogs: ExecutionLog[];
  goals: Category[];
  modules: QuestModule[];
  skills: Skill[];
  scheduleBlocks: ScheduleBlock[];
  todayCommand: TodayCommand;
  objectiveContextBrief: ObjectiveContextBrief;
  metacognitionSummary: MetacognitionSummary;
  now: Date;
};

function modeLabelKey(mode: DailyOperatingBriefMode) {
  const map: Record<DailyOperatingBriefMode, string> = {
    recovery: 'modeRecovery',
    steady: 'modeSteady',
    push: 'modePush',
    restart: 'modeRestart',
    protect_focus: 'modeProtectFocus',
    unknown: 'modeUnknown',
  };
  return map[mode];
}

function newestState(stateCheckIns: StateCheckIn[]) {
  return (stateCheckIns || []).slice().sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
}

function isLowState(state?: StateCheckIn) {
  if (!state) return false;
  return (state.overall ?? 3) <= 2 || (state.energy ?? state.overall ?? 3) <= 2 || (state.focus ?? state.overall ?? 3) <= 2;
}

function findSkillName(skills: Skill[], skillId?: string) {
  if (!skillId) return undefined;
  return skills.find((skill) => skill.id === skillId)?.name;
}

function commandActionTitle(input: BuildDailyOperatingBriefInput) {
  const { todayCommand, skills } = input;
  return findSkillName(skills, todayCommand.linkedSkillId)
    ?? todayCommand.titleValues?.title
    ?? todayCommand.reasonValues?.title
    ?? undefined;
}

function focusStarter(metacognitionSummary: MetacognitionSummary) {
  return metacognitionSummary.statePatterns.patterns.find((pattern) => (
    pattern.patternType === 'focus_stabilizer' || pattern.patternType === 'low_state_starter'
  ));
}

function confidenceRank(value: DailyOperatingBriefConfidence) {
  return value === 'high' ? 3 : value === 'medium' ? 2 : 1;
}

function combineConfidence(values: DailyOperatingBriefConfidence[]): DailyOperatingBriefConfidence {
  const best = values.reduce((max, value) => Math.max(max, confidenceRank(value)), 1);
  return best >= 3 ? 'high' : best >= 2 ? 'medium' : 'low';
}

function recentExecutionEvidence(executionLogs: ExecutionLog[], now: Date) {
  const newest = (executionLogs || [])
    .filter((log) => log.createdAt)
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (!newest) return undefined;
  const ageMs = now.getTime() - new Date(newest.createdAt).getTime();
  return ageMs <= 24 * 60 * 60 * 1000 ? newest : undefined;
}

function makeFallbackBrief(): DailyOperatingBrief {
  return {
    status: 'insufficient',
    mode: 'unknown',
    modeLabelKey: modeLabelKey('unknown'),
    mainJudgementKey: 'briefInsufficient',
    recommendedIntensity: 'low',
    firstActionKey: 'startWithLowFrictionTask',
    firstActionSource: 'fallback',
    whyKeys: ['briefInsufficient'],
    avoidKeys: ['avoidTooManyBigTasks'],
    evidence: [{
      type: 'fallback',
      labelKey: 'briefInsufficient',
      confidence: 'low',
    }],
    confidence: 'low',
  };
}

export function buildDailyOperatingBrief(input: BuildDailyOperatingBriefInput): DailyOperatingBrief {
  const { objectiveContextBrief, metacognitionSummary, todayCommand, scheduleBlocks, skills, stateCheckIns, executionLogs, now } = input;
  const latestState = newestState(stateCheckIns);
  const sleepMinutes = objectiveContextBrief.metrics.sleepMinutes;
  const shortSleep = sleepMinutes != null && sleepMinutes < 360;
  const slightlyShortSleep = sleepMinutes != null && sleepMinutes >= 360 && sleepMinutes < 420;
  const normalSleep = sleepMinutes != null && sleepMinutes >= 420 && sleepMinutes <= 540;
  const lowState = isLowState(latestState);
  const pattern = focusStarter(metacognitionSummary);
  const hasSchedule = todayCommand.type === 'continue_plan' || scheduleBlocks.some((block) => block.status !== 'completed');
  const actionTitle = commandActionTitle(input);
  const recentLog = recentExecutionEvidence(executionLogs, now);

  if (!sleepMinutes && !latestState && metacognitionSummary.statePatterns.patterns.length === 0 && !actionTitle && skills.length === 0) {
    return makeFallbackBrief();
  }

  let mode: DailyOperatingBriefMode = 'steady';
  let recommendedIntensity: DailyOperatingBriefIntensity = 'normal';
  let mainJudgementKey = 'continueNormalProgress';
  let firstActionKey = actionTitle ? 'firstActionDoNamed' : 'startWithLowFrictionTask';
  let firstActionValues: Record<string, string | number> | undefined = actionTitle ? { action: String(actionTitle) } : undefined;
  let firstActionSource: DailyOperatingBriefSource = hasSchedule ? 'schedule' : 'fallback';
  const whyKeys: string[] = [];
  const whyValues: Record<string, string | number> = {};
  const avoidKeys: string[] = [];
  const evidence: DailyOperatingBrief['evidence'] = [];

  if (shortSleep) {
    mode = 'protect_focus';
    recommendedIntensity = sleepMinutes < 300 ? 'very_low' : 'low';
    mainJudgementKey = 'sleepSuggestsReduceGranularity';
    firstActionKey = 'startWithLowFrictionTask';
    firstActionValues = undefined;
    firstActionSource = 'context';
    whyKeys.push('sleepSuggestsReduceGranularity');
    avoidKeys.push('avoidLongDeepWork', 'avoidHeavyTrainingThenDeepWork');
    evidence.push({ type: 'sleep', labelKey: 'sleepSuggestsReduceGranularity', confidence: objectiveContextBrief.confidence });
  } else if (slightlyShortSleep) {
    mode = 'recovery';
    recommendedIntensity = 'low';
    mainJudgementKey = 'sleepSuggestsReduceGranularity';
    firstActionKey = actionTitle ? 'firstActionDoNamedLowFriction' : 'startWithLowFrictionTask';
    firstActionValues = actionTitle ? { action: String(actionTitle) } : undefined;
    firstActionSource = actionTitle ? 'schedule' : 'context';
    whyKeys.push('sleepSuggestsReduceGranularity');
    avoidKeys.push('avoidLongDeepWork');
    evidence.push({ type: 'sleep', labelKey: 'sleepSuggestsReduceGranularity', confidence: objectiveContextBrief.confidence });
  } else if (normalSleep) {
    mode = lowState ? 'restart' : 'steady';
    recommendedIntensity = lowState ? 'low' : 'normal';
    mainJudgementKey = lowState ? 'lowStateSuggestsRestart' : 'sleepSupportsNormalPush';
    whyKeys.push(lowState ? 'lowStateSuggestsRestart' : 'sleepSupportsNormalPush');
    evidence.push({ type: 'sleep', labelKey: 'sleepSupportsNormalPush', confidence: objectiveContextBrief.confidence });
  }

  if (lowState) {
    mode = shortSleep ? 'recovery' : 'restart';
    recommendedIntensity = shortSleep ? 'very_low' : 'low';
    mainJudgementKey = 'lowStateSuggestsRestart';
    firstActionKey = pattern ? 'startWithFocusStabilizer' : 'startWithLowFrictionTask';
    firstActionValues = pattern?.labelValues?.action ? { action: String(pattern.labelValues.action) } : undefined;
    firstActionSource = pattern ? 'state_pattern' : 'fallback';
    whyKeys.push('lowStateSuggestsRestart');
    evidence.push({ type: 'state', labelKey: 'lowStateSuggestsRestart', confidence: 'medium' });
  }

  if (!hasSchedule && pattern && !shortSleep) {
    const patternAction = String(pattern.labelValues?.action ?? '');
    firstActionKey = 'startWithFocusStabilizer';
    firstActionValues = { action: patternAction };
    firstActionSource = 'state_pattern';
    whyKeys.push('focusPatternSuggestsStarter');
    whyValues.action = patternAction;
    evidence.push({
      type: 'pattern',
      labelKey: 'focusPatternSuggestsStarter',
      labelValues: { action: patternAction },
      confidence: pattern.confidence,
    });
  }

  if (hasSchedule && actionTitle && !lowState && !shortSleep) {
    firstActionKey = 'firstActionDoNamed';
    firstActionValues = { action: String(actionTitle) };
    firstActionSource = 'schedule';
    evidence.push({ type: 'schedule', labelKey: 'todayCommandEvidence', labelValues: { action: String(actionTitle) }, confidence: todayCommand.confidence });
  }

  if (todayCommand.type === 'review_feedback' || recentLog) {
    whyKeys.push('recentFeedbackEvidence');
    evidence.push({ type: 'recent_execution', labelKey: 'recentFeedbackEvidence', confidence: todayCommand.type === 'review_feedback' ? 'medium' : 'low' });
  }

  if (!shortSleep && !lowState && normalSleep && todayCommand.confidence === 'high') {
    mode = 'push';
    recommendedIntensity = 'high';
    mainJudgementKey = 'pushIfReadyButCheckState';
    whyKeys.push('pushIfReadyButCheckState');
  }

  if (whyKeys.length === 0) whyKeys.push('continueNormalProgress');
  if (avoidKeys.length === 0) avoidKeys.push('avoidTooManyBigTasks');
  if (evidence.length === 0) {
    evidence.push({ type: 'fallback', labelKey: 'continueNormalProgress', confidence: 'low' });
  }

  const confidence = combineConfidence(evidence.map((item) => item.confidence));
  return {
    status: 'ok',
    mode,
    modeLabelKey: modeLabelKey(mode),
    mainJudgementKey,
    mainJudgementValues: sleepMinutes ? { sleepHours: Math.round((sleepMinutes / 60) * 10) / 10 } : undefined,
    recommendedIntensity,
    firstActionKey,
    firstActionValues,
    firstActionSource,
    whyKeys: Array.from(new Set(whyKeys)).slice(0, 3),
    whyValues,
    avoidKeys: Array.from(new Set(avoidKeys)).slice(0, 2),
    evidence: evidence.slice(0, 4),
    confidence,
  };
}
