import {
  Category,
  ContributionLink,
  EffortUnit,
  ExecutionLog,
  MetricFamily,
  ModuleSkillLink,
  ProgressType,
  QuestModule,
  ScheduleBlock,
  Skill,
} from '../types';

export type EffortContext = {
  skill?: Skill;
  goal?: Category;
  module?: QuestModule;
  scheduleBlock?: ScheduleBlock;
  allGoals: Category[];
  allSkills: Skill[];
  allModules: QuestModule[];
  links: ModuleSkillLink[];
};

function safeNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function normalizeText(value?: string) {
  return (value || '')
    .trim()
    .toLowerCase()
    .replace(/卧推|平板卧推|bench press|flat bench/g, 'bench_press')
    .replace(/上斜卧推|incline bench/g, 'incline_bench')
    .replace(/硬拉|deadlift/g, 'deadlift')
    .replace(/深蹲|squat/g, 'squat')
    .replace(/双杠臂屈伸|dips?/g, 'dips')
    .replace(/[^a-z0-9_\u4e00-\u9fa5]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function metricTypeFor(log: ExecutionLog, skill?: Skill): ProgressType {
  return log.metricUpdate?.metricType
    ?? log.progressUpdate?.progressType
    ?? skill?.metricConfig?.metricType
    ?? skill?.progressType
    ?? 'none';
}

function isStudyTask(skill?: Skill, log?: ExecutionLog) {
  const type = log?.taskType ?? skill?.taskType;
  return type === 'deep_study' || type === 'light_review';
}

function isProjectTask(skill?: Skill, log?: ExecutionLog) {
  const type = log?.taskType ?? skill?.taskType;
  return type === 'creative_building';
}

function isRecoveryTask(skill?: Skill, log?: ExecutionLog) {
  const type = log?.taskType ?? skill?.taskType;
  return type === 'cardio_recovery';
}

function inferMetricFamily(metricType: ProgressType, skill?: Skill, unit?: string): MetricFamily {
  const normalizedUnit = (unit || skill?.metricConfig?.unit || skill?.unit || '').toLowerCase();
  if (metricType === 'time_based') return 'time';
  if (metricType === 'frequency') return 'frequency';
  if (metricType === 'checklist' || metricType === 'curriculum') return 'items';
  if (metricType === 'money_based' || /[$¥€£]|usd|aud|cny|rmb/.test(normalizedUnit)) return 'money';
  if (metricType === 'state_based') return 'state_shift';
  if (metricType === 'qualitative' || metricType === 'none') return 'qualitative';
  if (metricType === 'performance_log') {
    if (skill?.metricConfig?.primaryMetric === 'volume') return 'volume';
    if (skill?.metricConfig?.primaryMetric === 'reps') return 'reps';
    if (skill?.metricConfig?.performanceType === 'strength' || skill?.taskType === 'strength_training') return 'strength';
    return 'score';
  }
  if (metricType === 'target_value' && (/kg|lb|lbs/.test(normalizedUnit) || skill?.taskType === 'strength_training')) return 'strength';
  return 'score';
}

function strengthDataFromLog(log: ExecutionLog) {
  const structured = log.structuredData || {};
  const set = log.actualData?.exercises?.[0]
    ?? log.metricUpdate?.performanceData?.strengthSets?.[0]
    ?? log.progressUpdate?.performanceData?.strengthSets?.[0]
    ?? log.actualData?.strength
    ?? log.predictionData?.strength;
  const weight = safeNumber(set?.weight ?? log.actualData?.topWeight ?? log.metricUpdate?.performanceValue ?? structured.weight);
  const sets = safeNumber(set?.sets ?? log.actualData?.sets ?? structured.sets);
  const reps = safeNumber(set?.reps ?? log.actualData?.reps ?? structured.reps);
  const rpe = safeNumber(set?.rpe ?? log.actualData?.rpe ?? structured.rpe);
  const estimatedVolume = weight != null && sets != null && reps != null ? weight * sets * reps : undefined;
  return { weight, sets, reps, rpe, estimatedVolume };
}

export function getComparableKey(effortUnit: EffortUnit, skill?: Skill) {
  if (effortUnit.effortType === 'strength_training') {
    return normalizeText(effortUnit.raw.exerciseName || skill?.name) || effortUnit.primarySkillId || effortUnit.id;
  }
  if (effortUnit.effortType === 'study_session') return `${effortUnit.primarySkillId ?? 'unknown'}:study`;
  if (effortUnit.effortType === 'project_progress') return `${effortUnit.primarySkillId ?? 'unknown'}:project`;
  if (effortUnit.effortType === 'frequency_completion') return `${effortUnit.primarySkillId ?? 'unknown'}:frequency`;
  if (effortUnit.effortType === 'checklist_completion') return `${effortUnit.primarySkillId ?? 'unknown'}:checklist`;
  if (effortUnit.metricFamily === 'time') return `${effortUnit.primarySkillId ?? 'unknown'}:time`;
  if (effortUnit.metricFamily === 'score' || effortUnit.metricFamily === 'money') return `${effortUnit.primarySkillId ?? 'unknown'}:target_value`;
  return effortUnit.comparableKey;
}

export function createEffortUnitsFromExecutionLog(log: ExecutionLog, context: EffortContext): EffortUnit[] {
  const skill = context.skill;
  const metricType = metricTypeFor(log, skill);
  const now = new Date().toISOString();
  const source: EffortUnit['source'] =
    log.source === 'timer' ? 'timer'
      : log.source === 'one_tap' ? 'one_tap'
        : log.source === 'schedule_block' ? 'schedule_block'
          : log.source === 'manual' ? 'manual'
            : 'execution_log';
  const strength = strengthDataFromLog(log);
  const structured = log.structuredData || {};
  const durationMinutes = safeNumber(log.metricUpdate?.minutesAdded ?? structured.durationMinutes ?? log.durationMinutes);
  const unitLabel = log.metricUpdate?.performanceUnit ?? skill?.metricConfig?.unit ?? skill?.unit;
  let metricFamily = inferMetricFamily(metricType, skill, unitLabel);

  let effortType: EffortUnit['effortType'] = 'qualitative_progress';
  if (metricType === 'time_based') effortType = isStudyTask(skill, log) ? 'study_session' : isProjectTask(skill, log) ? 'project_progress' : 'time_investment';
  else if (metricType === 'performance_log' || skill?.taskType === 'strength_training') effortType = 'strength_training';
  else if (metricType === 'target_value') effortType = 'performance_attempt';
  else if (metricType === 'frequency') effortType = 'frequency_completion';
  else if (metricType === 'checklist' || metricType === 'curriculum') effortType = 'checklist_completion';
  else if (isRecoveryTask(skill, log) || metricType === 'state_based') effortType = 'recovery_action';
  else if (skill?.taskType === 'life_maintenance' || skill?.taskType === 'admin') effortType = 'life_maintenance';
  if ((log.linkedSkillId && !skill) || (log.linkedGoalId && !context.goal) || (log.linkedModuleId && !context.module)) {
    effortType = 'qualitative_progress';
    metricFamily = 'qualitative';
  }

  const raw: EffortUnit['raw'] = {
    durationMinutes,
    exerciseName: strength.weight != null ? (log.actualData?.exerciseName ?? log.title ?? skill?.name) : undefined,
    ...strength,
    count: safeNumber(log.metricUpdate?.countAdded ?? structured.count ?? structured.questionCount ?? structured.wordCount ?? structured.outputCount ?? structured.taskCount),
    completedItems: log.metricUpdate?.completedChecklistItemIds?.length ?? log.progressUpdate?.completedCurriculumItemIds?.length ?? safeNumber(structured.completedItems),
    score: safeNumber(log.metricUpdate?.newCurrentValue ?? log.progressUpdate?.newCurrentValue ?? log.metricUpdate?.performanceValue ?? structured.score ?? structured.correctCount ?? structured.mockScore ?? structured.afterState),
    amount: safeNumber(log.metricUpdate?.amountAdded ?? log.metricUpdate?.newCurrentAmount ?? structured.amount),
    qualityRating: safeNumber(log.metricUpdate?.qualityValue ?? log.qualityRating ?? structured.quality ?? structured.understanding ?? structured.decisionQuality ?? structured.recoveryEffect),
    difficultyRating: safeNumber(log.difficultyRating ?? structured.difficulty ?? structured.fatigue),
    mentalCost: safeNumber(log.actualMentalCost ?? (typeof structured.mentalCost === 'number' ? structured.mentalCost * 20 : undefined) ?? (typeof structured.energyCost === 'number' ? structured.energyCost * 20 : undefined)),
    physicalCost: safeNumber(log.actualPhysicalCost ?? (typeof structured.physicalCost === 'number' ? structured.physicalCost * 20 : undefined)),
    exercises: Array.isArray(log.actualData?.exercises) ? log.actualData.exercises.map((entry: any) => ({
      exerciseName: typeof entry.exerciseName === 'string' ? entry.exerciseName : undefined,
      weight: safeNumber(entry.weight),
      sets: safeNumber(entry.sets),
      reps: safeNumber(entry.reps),
      rpe: safeNumber(entry.rpe),
      note: typeof entry.note === 'string' ? entry.note : undefined,
    })) : undefined,
  };

  const derived: EffortUnit['derived'] = {
    effortScore: durationMinutes != null ? Math.max(1, durationMinutes) : raw.estimatedVolume != null ? Math.round(raw.estimatedVolume / 100) : raw.count,
    intensityScore: raw.rpe != null ? raw.rpe * 10 : raw.weight,
    volumeScore: raw.estimatedVolume,
    consistencyScore: raw.count,
    qualityScore: raw.qualityRating != null ? raw.qualityRating * 20 : undefined,
  };

  const effortUnit: EffortUnit = {
    id: `effort-${log.id}-primary`,
    executionLogId: log.id,
    date: log.date,
    timestamp: log.createdAt || now,
    source,
    primarySkillId: skill ? log.linkedSkillId : undefined,
    primaryGoalId: context.goal ? (log.linkedGoalId ?? context.goal.id) : undefined,
    primaryModuleId: context.module ? (log.linkedModuleId ?? context.module.id) : undefined,
    scheduleBlockId: log.linkedScheduleBlockId,
    effortType,
    metricFamily,
    raw,
    derived,
    createdAt: now,
  };
  effortUnit.comparableKey = getComparableKey(effortUnit, skill);
  return [effortUnit];
}

function linkId(effortUnit: EffortUnit, targetType: ContributionLink['targetType'], targetId: string, reasonCode: ContributionLink['reasonCode']) {
  return `contrib-${effortUnit.id}-${targetType}-${targetId}-${reasonCode}`;
}

export function generateContributionLinks(effortUnit: EffortUnit, context: EffortContext): ContributionLink[] {
  const now = new Date().toISOString();
  const links: ContributionLink[] = [];
  const seen = new Set<string>();
  const add = (
    targetType: ContributionLink['targetType'],
    targetId: string | undefined,
    contributionType: ContributionLink['contributionType'],
    strength: ContributionLink['strength'],
    weight: number,
    reasonCode: ContributionLink['reasonCode'],
  ) => {
    if (!targetId) return;
    const id = linkId(effortUnit, targetType, targetId, reasonCode);
    const dedupe = `${targetType}:${targetId}:${reasonCode}`;
    if (seen.has(dedupe)) return;
    seen.add(dedupe);
    links.push({ id, effortUnitId: effortUnit.id, executionLogId: effortUnit.executionLogId, targetType, targetId, contributionType, strength, weight, reasonCode, createdAt: now });
  };

  add('skill', effortUnit.primarySkillId, 'direct', 'high', 1, 'primary_skill');

  const skillLinks = effortUnit.primarySkillId
    ? context.links.filter((link) => link.skillId === effortUnit.primarySkillId)
    : [];
  skillLinks.forEach((link) => {
    add('module', link.moduleId, effortUnit.effortType === 'recovery_action' ? 'recovery' : 'supporting', 'medium', 0.7, 'linked_module');
    add('goal', link.goalId, effortUnit.effortType === 'recovery_action' ? 'recovery' : 'direct', 'medium', 0.7, 'linked_goal');
  });

  add('module', effortUnit.primaryModuleId, 'supporting', 'medium', 0.7, 'linked_module');
  add('goal', effortUnit.primaryGoalId, 'direct', 'high', 0.9, 'linked_goal');

  const skill = context.skill;
  const goalType = context.goal?.goalType;
  if (skill?.categoryId) {
    context.allGoals
      .filter((goal) => goal.id === skill.categoryId || (goal.goalType && goal.goalType === goalType))
      .forEach((goal) => add('goal', goal.id, 'indirect', 'medium', 0.4, 'shared_category'));
  }

  const key = effortUnit.comparableKey || '';
  if (effortUnit.effortType === 'strength_training' && (key.includes('bench') || key.includes('dips') || key.includes('incline'))) {
    context.allModules
      .filter((module) => /胸|推|push|chest|upper/i.test(module.name))
      .forEach((module) => add('module', module.id, 'supporting', 'medium', 0.5, 'supporting_muscle_group'));
    context.allGoals
      .filter((goal) => goal.goalType === 'fitness' || /体型|健身|physique|fitness|strength/i.test(goal.name))
      .forEach((goal) => add('goal', goal.id, 'indirect', 'low', 0.3, 'supporting_muscle_group'));
  }

  return links;
}

export function getComparableHistory(effortUnit: EffortUnit, allEffortUnits: EffortUnit[]) {
  if (!effortUnit.comparableKey) return [];
  return allEffortUnits
    .filter((item) => item.id !== effortUnit.id && item.comparableKey === effortUnit.comparableKey)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export function compareEffortToPrevious(effortUnit: EffortUnit, history: EffortUnit[]) {
  const previous = history[history.length - 1];
  if (!previous) return { hasComparison: false as const, label: 'not_comparable' as const };
  const changes = {
    durationChange: effortUnit.raw.durationMinutes != null && previous.raw.durationMinutes != null ? effortUnit.raw.durationMinutes - previous.raw.durationMinutes : undefined,
    weightChange: effortUnit.raw.weight != null && previous.raw.weight != null ? effortUnit.raw.weight - previous.raw.weight : undefined,
    volumeChange: effortUnit.raw.estimatedVolume != null && previous.raw.estimatedVolume != null ? effortUnit.raw.estimatedVolume - previous.raw.estimatedVolume : undefined,
    repsChange: effortUnit.raw.reps != null && previous.raw.reps != null ? effortUnit.raw.reps - previous.raw.reps : undefined,
    qualityChange: effortUnit.raw.qualityRating != null && previous.raw.qualityRating != null ? effortUnit.raw.qualityRating - previous.raw.qualityRating : undefined,
  };
  const values = Object.values(changes).filter((value): value is number => value != null);
  const total = values.reduce((sum, value) => sum + value, 0);
  const hasPositive = values.some((value) => value > 0);
  const hasNegative = values.some((value) => value < 0);
  const label = hasPositive && total > 0 ? 'improved' : hasNegative && !hasPositive ? 'lower_load' : 'maintained';
  return { hasComparison: true as const, previous, changes, label };
}

export function formatEffortUnitSummary(effort: EffortUnit, lang: 'zh' | 'en' = 'zh') {
  if (effort.effortType === 'strength_training') {
    const pieces = [];
    if (effort.raw.weight != null) pieces.push(`${effort.raw.weight}kg`);
    if (effort.raw.reps != null) pieces.push(`× ${effort.raw.reps}`);
    if (effort.raw.sets != null) pieces.push(`× ${effort.raw.sets}`);
    const base = pieces.join(' ') || (lang === 'zh' ? '力量训练' : 'Strength training');
    return `${effort.raw.exerciseName ? `${effort.raw.exerciseName} · ` : ''}${base}${effort.raw.rpe != null ? ` · RPE ${effort.raw.rpe}` : ''}`;
  }
  if (effort.metricFamily === 'time') return lang === 'zh' ? `${effort.raw.durationMinutes ?? 0} 分钟` : `${effort.raw.durationMinutes ?? 0} min`;
  if (effort.effortType === 'frequency_completion') return lang === 'zh' ? `完成 ${effort.raw.count ?? 1} 次` : `${effort.raw.count ?? 1} completion`;
  if (effort.effortType === 'checklist_completion') return lang === 'zh' ? `完成 ${effort.raw.completedItems ?? 0} 项` : `${effort.raw.completedItems ?? 0} items`;
  if (effort.metricFamily === 'money') return lang === 'zh' ? `金额 ${effort.raw.amount ?? 0}` : `Amount ${effort.raw.amount ?? 0}`;
  return lang === 'zh' ? '质性努力记录' : 'Qualitative effort';
}
