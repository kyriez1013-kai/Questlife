// QuestLife 核心数据模型
// V2 层级: Category (大目标) → Skill (子技能) → Action (打卡)
// 旧 Goal 类型保留以便老数据兼容, UI 不再使用

// ───── 历史类型 (保留, 不渲染) ─────
export type GoalLevel = 'life' | 'big' | 'daily';
export interface Goal {
  id: string;
  title: string;
  description?: string;
  level: GoalLevel;
  parentId?: string;
  skillIds: string[];
  createdAt: number;
  targetDate?: number;
  completed: boolean;
  completedAt?: number;
  color?: string;
}

// ───── Goal Definition v1: 目标定义与达成条件 ─────
export type GoalType =
  | 'fitness'
  | 'career'
  | 'study'
  | 'exam'
  | 'finance'
  | 'health'
  | 'project'
  | 'custom';

export type GoalProgressModel =
  | 'criteria_weighted'
  | 'module_average'
  | 'skill_average'
  | 'manual';

export type OutcomeMetricType =
  | 'none'
  | 'target_value'
  | 'time_based'
  | 'frequency'
  | 'checklist'
  | 'curriculum'
  | 'performance_log'
  | 'quality_score'
  | 'state_based'
  | 'money_based'
  | 'qualitative'
  | 'manual'
  | 'binary';

export interface OutcomeCriterion {
  id: string;
  title: string;
  description?: string;
  linkedSkillId?: string;
  metricType: OutcomeMetricType;
  currentValue?: number;
  targetValue?: number;
  unit?: string;
  weight: number;
  completed?: boolean;
  checklistItemIds?: string[];
  stateMetric?: string;
  currency?: string;
}

// ───── V2 新类型: 大目标 ─────
export interface Category {
  id: string;
  name: string;              // "健身" / "职业发展"
  emoji?: string;            // 🏋️
  color?: string;
  goalType?: GoalType;
  domain?: DomainTemplateDomain;
  domainTemplateId?: string;
  vision?: string;
  description?: string;
  targetDate?: string;
  progressModel?: GoalProgressModel;
  manualProgress?: number;
  outcomeCriteria?: OutcomeCriterion[];
  createdAt: number;
}

// ───── Growth Tree v1: 大目标 → 模块 → 技能 ─────
export interface QuestModule {
  id: string;
  goalId: string;
  name: string;
  icon?: string;
  description?: string;
  order?: number;
  progress?: number;
  createdFromTemplateId?: string;
  moduleTemplateId?: string;
  createdAt: number;
}

export interface ModuleSkillLink {
  id: string;
  goalId: string;
  moduleId: string;
  skillId: string;
  role?: 'primary' | 'supporting' | 'optional';
  order?: number;
  note?: string;
  createdAt: number;
}

// ───── 子技能 ─────
export type TaskType =
  | 'deep_study'
  | 'light_review'
  | 'strength_training'
  | 'cardio_recovery'
  | 'admin'
  | 'life_maintenance'
  | 'creative_building';

export type ProgressType =
  | 'none'
  | 'time_based'
  | 'target_value'
  | 'checklist'
  | 'curriculum'
  | 'performance_log'
  | 'quality_score'
  | 'state_based'
  | 'money_based'
  | 'binary'
  | 'frequency'
  | 'qualitative';

export interface CurriculumItem {
  id: string;
  title: string;
  completed: boolean;
}

export type StateMetric = 'energy' | 'focus' | 'mood' | 'sleep' | 'stress' | 'recovery' | 'health' | 'custom';
export type PerformanceType = 'strength' | 'endurance' | 'skill_reps' | 'speed' | 'accuracy' | 'business' | 'custom';
export type PrimaryPerformanceMetric =
  | 'weight'
  | 'volume'
  | 'estimated_1rm'
  | 'reps'
  | 'distance'
  | 'pace'
  | 'accuracy'
  | 'conversion_rate'
  | 'revenue'
  | 'custom';

export interface MetricConfig {
  metricType: ProgressType;
  unit?: string;
  targetLabel?: string;
  completedHours?: number;
  targetHours?: number;
  currentValue?: number;
  targetValue?: number;
  weeklyTargetCount?: number;
  completedThisWeek?: number;
  checklistItems?: CurriculumItem[];
  averageQuality?: number;
  targetQuality?: number;
  stateMetric?: StateMetric;
  targetStateValue?: number;
  averageStateValue?: number;
  currentAmount?: number;
  targetAmount?: number;
  currency?: string;
  completed?: boolean;
  performanceType?: PerformanceType;
  primaryMetric?: PrimaryPerformanceMetric;
  useEstimated1RM?: boolean;
  trackVolume?: boolean;
  trackRPE?: boolean;
  bestValue?: number;
  targetPerformanceValue?: number;
  currentBest?: number;
  bestEstimated1RM?: number;
  bestVolume?: number;
  milestones?: {
    id: string;
    title: string;
    completed?: boolean;
    note?: string;
    date?: string;
  }[];
}

export interface StrengthSet {
  weight?: number;
  reps?: number;
  sets?: number;
  rpe?: number;
}

export interface PerformanceData {
  performanceType?: PerformanceType;
  values?: { metric: string; value: number; unit?: string }[];
  strengthSets?: StrengthSet[];
  totalVolume?: number;
  estimated1RM?: number;
  notes?: string;
}

export interface Skill {
  id: string;
  name: string;
  icon?: string;              // emoji
  color: string;
  totalXP: number;            // 累计 = 累计分钟 (派生但缓存)
  dailyTargetMinutes: number;
  totalTargetHours?: number;
  createdAt: number;
  goalId?: string;
  linkedGoalIds?: string[];
  moduleId?: string;
  progressType?: ProgressType;
  metricConfig?: MetricConfig;
  domainTemplateId?: string;
  createdFromTemplateId?: string;
  skillTemplateId?: string;
  moduleTemplateId?: string;
  recordingFieldKeys?: string[];
  currentValue?: number;
  targetValue?: number;
  unit?: string;
  targetHours?: number;
  completedHours?: number;
  curriculumItems?: CurriculumItem[];
  weeklyTargetCount?: number;
  completedThisWeek?: number;
  // V2 新增
  categoryId?: string;        // 所属大目标
  reminderHour?: number;
  reminderMinute?: number;
  reminderEnabled?: boolean;
  taskType?: TaskType;
  scheduleEnabled?: boolean;
  scheduleType?: 'daily' | 'weekly_days' | 'times_per_week' | 'manual_only';
  weeklyDays?: string[];
  timesPerWeek?: number;
  defaultStartTime?: string;
  defaultDurationMinutes?: number;
  flexibility?: 'fixed' | 'flexible' | 'movable';
  rigidity?: 'low' | 'medium' | 'high';
  mentalCost?: number;
  physicalCost?: number;
  emotionalCost?: number;
  recoveryImpact?: number;
  compressibility?: number;
}

export interface ScheduleBlock {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  plannedMinutes: number;
  linkedGoalId?: string;
  linkedGoalIds?: string[];
  linkedSkillId?: string;
  taskType: TaskType;
  flexibility: 'fixed' | 'flexible' | 'movable';
  rigidity: 'low' | 'medium' | 'high';
  status: 'planned' | 'adjusted' | 'completed' | 'skipped';
  notes?: string;
  createdAt: number;
  source?: 'manual' | 'skill_rule';
}

export interface ExecutionLog {
  id: string;
  date: string;
  startTime?: string;
  endTime?: string;
  durationMinutes: number;
  title?: string;
  note?: string;
  linkedSkillId?: string;
  orphanedSkillName?: string;
  linkedGoalId?: string;
  linkedModuleId?: string;
  linkedScheduleBlockId?: string;
  source:
    | 'manual'
    | 'schedule_block'
    | 'quick_log'
    | 'timer'
    | 'one_tap'
    | 'today_start'
    | 'today_log'
    | 'one_tap_done'
    | 'schedule_log'
    | 'skill_detail'
    | 'goal_detail';
  taskType?: TaskType;
  predictedDurationMinutes?: number;
  predictedQualityRating?: number;
  qualityRating?: number;
  difficultyRating?: number;
  predictedMentalCost?: number;
  predictedPhysicalCost?: number;
  predictedEmotionalCost?: number;
  actualMentalCost?: number;
  actualPhysicalCost?: number;
  actualEmotionalCost?: number;
  predictionDelta?: {
    durationDeltaMinutes?: number;
    qualityDelta?: number;
  };
  predictionData?: any;
  actualData?: any;
  structuredData?: Record<string, unknown>;
  domainTemplateId?: string;
  domain?: DomainTemplateDomain;
  stateSnapshot?: {
    energy?: number;
    focus?: number;
    mood?: number;
    health?: string;
    timestamp?: string;
  };
  progressUpdate?: {
    progressType?: ProgressType;
    valueAdded?: number;
    newCurrentValue?: number;
    completedCurriculumItemIds?: string[];
    qualitativeSummary?: string;
    performanceData?: PerformanceData;
    stateValue?: number;
    amountAdded?: number;
    newCurrentAmount?: number;
    completed?: boolean;
  };
  metricUpdate?: {
    metricType: ProgressType;
    minutesAdded?: number;
    newCurrentValue?: number;
    countAdded?: number;
    completedChecklistItemIds?: string[];
    performanceValue?: number;
    performanceUnit?: string;
    performanceNote?: string;
    performanceData?: PerformanceData | any;
    qualityValue?: number;
    stateValue?: number;
    amountAdded?: number;
    newCurrentAmount?: number;
    markCompleted?: boolean;
    qualitativeText?: string;
  };
  appliedToProgress?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type EffortType =
  | 'time_investment'
  | 'strength_training'
  | 'performance_attempt'
  | 'study_session'
  | 'practice_reps'
  | 'project_progress'
  | 'checklist_completion'
  | 'frequency_completion'
  | 'recovery_action'
  | 'life_maintenance'
  | 'qualitative_progress';

export type MetricFamily =
  | 'time'
  | 'strength'
  | 'volume'
  | 'reps'
  | 'score'
  | 'money'
  | 'items'
  | 'frequency'
  | 'state_shift'
  | 'qualitative';

export interface EffortUnit {
  id: string;
  executionLogId: string;
  date: string;
  timestamp: string;
  source: 'execution_log' | 'timer' | 'one_tap' | 'schedule_block' | 'manual';
  primarySkillId?: string;
  primaryGoalId?: string;
  primaryModuleId?: string;
  scheduleBlockId?: string;
  effortType: EffortType;
  metricFamily: MetricFamily;
  raw: {
    durationMinutes?: number;
    exerciseName?: string;
    weight?: number;
    sets?: number;
    reps?: number;
    rpe?: number;
    estimatedVolume?: number;
    count?: number;
    completedItems?: number;
    score?: number;
    amount?: number;
    qualityRating?: number;
    difficultyRating?: number;
    mentalCost?: number;
    physicalCost?: number;
    note?: string;
    exercises?: {
      exerciseName?: string;
      weight?: number;
      sets?: number;
      reps?: number;
      rpe?: number;
      note?: string;
    }[];
  };
  derived: {
    effortScore?: number;
    intensityScore?: number;
    volumeScore?: number;
    consistencyScore?: number;
    qualityScore?: number;
  };
  comparableKey?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ContributionLink {
  id: string;
  effortUnitId: string;
  executionLogId: string;
  targetType: 'goal' | 'skill' | 'module';
  targetId: string;
  contributionType: 'direct' | 'indirect' | 'supporting' | 'maintenance' | 'recovery';
  strength: 'high' | 'medium' | 'low';
  weight: number;
  reasonCode:
    | 'primary_skill'
    | 'linked_module'
    | 'linked_goal'
    | 'shared_category'
    | 'supporting_muscle_group'
    | 'manual_link'
    | 'fallback';
  createdAt: string;
}

export type DomainTemplateDomain =
  | 'fitness_strength'
  | 'fitness_physique'
  | 'study_course'
  | 'exam_prep'
  | 'writing_assignment'
  | 'coding_project'
  | 'creative_project'
  | 'career_skill'
  | 'life_maintenance'
  | 'recovery_health'
  | 'finance_tracking'
  | 'custom';

export interface DomainTemplateModule {
  id: string;
  name: string;
  nameZh: string;
  iconKey?: string;
  description?: string;
  descriptionZh?: string;
}

export interface DomainTemplateSkill {
  id: string;
  moduleTemplateId?: string;
  name: string;
  nameZh: string;
  iconKey?: string;
  taskType?: string;
  progressType?: string;
  metricType?: string;
  defaultDurationMinutes?: number;
  targetValue?: number;
  unit?: string;
  recordingFieldKeys: string[];
}

export interface DomainRecordingField {
  key: string;
  label: string;
  labelZh: string;
  type: 'number' | 'text' | 'select' | 'rating' | 'boolean' | 'duration' | 'date';
  unit?: string;
  required?: boolean;
  defaultValue?: string | number | boolean;
  options?: { value: string; label: string; labelZh: string }[];
  appliesToEffortRawKey?: string;
}

export interface DomainTemplateOutcomeCriterion {
  id: string;
  label: string;
  labelZh: string;
  metricType: string;
  targetValue?: number;
  unit?: string;
  weight?: number;
}

export interface DomainTemplate {
  id: string;
  name: string;
  nameZh: string;
  description: string;
  descriptionZh: string;
  domain: DomainTemplateDomain;
  goalTypes: string[];
  defaultModules: DomainTemplateModule[];
  defaultSkills: DomainTemplateSkill[];
  defaultProgressModel: 'goal_criteria_weighted' | 'module_average' | 'skill_average' | 'manual';
  defaultScheduleHint?: {
    frequencyPerWeek?: number;
    suggestedSessionMinutes?: number;
    preferredCadence?: 'daily' | 'weekly' | 'custom';
    restDaysRecommended?: boolean;
  };
  defaultOutcomeCriteria?: DomainTemplateOutcomeCriterion[];
  effortMapping: {
    defaultEffortType: EffortUnit['effortType'];
    defaultMetricFamily: EffortUnit['metricFamily'];
    comparableStrategy: 'same_skill' | 'same_exercise' | 'same_topic' | 'same_section' | 'same_project_area' | 'none';
  };
  recordingSchema: DomainRecordingField[];
  contributionHints: {
    directTargets: ('skill' | 'module' | 'goal')[];
    indirectTargets: ('module' | 'goal')[];
    supportingTargets?: string[];
  };
  version: number;
}

export interface RescueLog {
  id: string;
  date: string;
  startedAt: string;
  completedAt?: string;
  triggerType?:
    | 'brain_off'
    | 'doomscrolling'
    | 'overthinking'
    | 'sleep_debt'
    | 'mental_fatigue'
    | 'avoidance'
    | 'unknown';
  rescueStepCompleted?: boolean;
  activationStepCompleted?: boolean;
  bodyAction?: string;
  activationAction?: string;
  beforeState?: {
    energy?: number;
    focus?: number;
    mood?: number;
    note?: string;
  };
  afterState?: {
    energy?: number;
    focus?: number;
    mood?: number;
    note?: string;
  };
  linkedSkillId?: string;
  linkedGoalId?: string;
  linkedModuleId?: string;
  linkedScheduleBlockId?: string;
  source: 'brain_off_rescue';
  note?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface StateCheckIn {
  id: string;
  date: string;
  timestamp: string;
  timeBlock?: 'morning' | 'midday' | 'afternoon' | 'evening' | 'night';
  overall: number;
  energy?: number;
  focus?: number;
  mood?: number;
  physical?: number;
  stress?: number;
  label?: 'very_low' | 'low' | 'normal' | 'good' | 'great';
  context?: {
    sleepQuality?: number;
    sick?: boolean;
    postWorkout?: boolean;
    afterExam?: boolean;
    caffeine?: boolean;
    socialDrain?: boolean;
  };
  note?: string;
  createdAt: string;
  updatedAt?: string;
}

export function getLevel(totalXP: number): { level: number; currentXP: number; nextLevelXP: number; progress: number } {
  let level = 1;
  let remaining = totalXP;
  let need = 60 * level;
  while (remaining >= need) {
    remaining -= need;
    level += 1;
    need = 60 * level;
  }
  return { level, currentXP: remaining, nextLevelXP: need, progress: remaining / need };
}

// 状态质量评分: 1=😴很差, 2=😕较差, 3=😐一般, 4=😊不错, 5=🔥极佳
export type Quality = 1 | 2 | 3 | 4 | 5;

export const QUALITY_OPTIONS: { value: Quality; emoji: string; label: string }[] = [
  { value: 1, emoji: '😴', label: '很差' },
  { value: 2, emoji: '😕', label: '较差' },
  { value: 3, emoji: '😐', label: '一般' },
  { value: 4, emoji: '😊', label: '不错' },
  { value: 5, emoji: '🔥', label: '极佳' },
];

/** 把 1-5 的平均分映射回最接近的 emoji */
export function emojiForAvgQuality(avg: number): string {
  const rounded = Math.round(avg);
  const found = QUALITY_OPTIONS.find((q) => q.value === rounded);
  return found?.emoji ?? '😐';
}

export interface Action {
  id: string;
  goalId?: string;
  skillIds: string[];
  minutes: number;
  note?: string;
  date: string;
  createdAt: number;
  quality?: Quality;       // V2.2 新增, 可选, 老数据为 undefined
}

// ───── Smart Capture (Spec B-1) ─────
export interface RawCapture {
  id: string;
  text: string;            // 用户原文，一字不改，永久保留
  createdAt: string;       // ISO，本地时间
  parseStatus: 'pending' | 'done' | 'failed';
  parsed?: {
    type: 'training' | 'reading' | 'state' | 'misc';
    fields: Record<string, any>;
    crossLinks: { captureId: string; reason: string }[];
    insight: { zh: string; en: string };
    // Spec B-2 additions (optional, backward-compatible)
    matchedSkillIds?: string[];
    linkedGoalId?: string;
    insightType?: 'skill_progress' | 'goal_link' | 'cross_link' | 'encourage';
  };
}

export interface AppData {
  goals: Goal[];
  categories: Category[];     // V2 新
  modules: QuestModule[];
  moduleSkillLinks: ModuleSkillLink[];
  skills: Skill[];
  actions: Action[];
  executionLogs: ExecutionLog[];
  effortUnits: EffortUnit[];
  contributionLinks: ContributionLink[];
  rescueLogs: RescueLog[];
  stateCheckIns: StateCheckIn[];
  scheduleBlocks: ScheduleBlock[];
  rawCaptures: RawCapture[];   // Spec B-1: smart capture loop
  settings: {
    // 全局提醒已弃用, 字段保留兼容; UI 不再暴露
    reminderHour?: number;
    reminderMinute?: number;
    reminderEnabled?: boolean;
    accentColor?: string;
    language?: 'zh' | 'en';
    preferredLanguage?: 'zh' | 'en';
    selectedThemeId?: string;
    onboardingCompleted?: boolean;
    onboardingVersion?: number;
    firstQuestCreated?: boolean;
    onboardingRestartRequested?: boolean;
    firstSystemWelcomeDismissed?: boolean;
  };
}

export const DEFAULT_DATA: AppData = {
  goals: [],
  categories: [],
  modules: [],
  moduleSkillLinks: [],
  skills: [],
  actions: [],
  executionLogs: [],
  effortUnits: [],
  contributionLinks: [],
  rescueLogs: [],
  stateCheckIns: [],
  scheduleBlocks: [],
  rawCaptures: [],
  settings: { selectedThemeId: 'cleanFocus' },
};

// 默认"未分类"分类的稳定 id, 迁移时使用
export const UNCATEGORIZED_ID = 'cat-uncategorized';

// ───── 派生计算 ─────

export function skillTotalMinutes(skillId: string, actions: Action[]): number {
  return actions.filter((a) => a.skillIds.includes(skillId)).reduce((s, a) => s + a.minutes, 0);
}

export function skillMinutesOnDate(skillId: string, date: string, actions: Action[]): number {
  return actions
    .filter((a) => a.skillIds.includes(skillId) && a.date === date)
    .reduce((s, a) => s + a.minutes, 0);
}

// ───── 小时里程碑 ─────

export const HOUR_MILESTONES = [10, 25, 50, 100, 200, 300] as const;
export type MilestoneHours = typeof HOUR_MILESTONES[number];

export interface MilestoneInfo {
  hours: MilestoneHours;
  unlocked: boolean;
  unlockedAt?: string;  // YYYY-MM-DD
  unlockedTs?: number;  // createdAt of the action that crossed the threshold
}

/**
 * 按时间顺序遍历该技能的 actions, 返回每个里程碑是否解锁及解锁时间.
 * 同一 action 可以同时跨多个里程碑(超长单次打卡).
 */
export function skillMilestones(skillId: string, actions: Action[]): MilestoneInfo[] {
  const sorted = actions
    .filter((a) => a.skillIds.includes(skillId))
    .sort((a, b) => a.createdAt - b.createdAt);

  let cum = 0;
  const unlocked = new Map<number, { date: string; ts: number }>();

  for (const a of sorted) {
    const prev = cum;
    cum += a.minutes;
    for (const h of HOUR_MILESTONES) {
      if (!unlocked.has(h) && prev < h * 60 && cum >= h * 60) {
        unlocked.set(h, { date: a.date, ts: a.createdAt });
      }
    }
  }

  return HOUR_MILESTONES.map((h) => ({
    hours: h,
    unlocked: unlocked.has(h),
    unlockedAt: unlocked.get(h)?.date,
    unlockedTs: unlocked.get(h)?.ts,
  }));
}

export function skillStreak(skillId: string, actions: Action[], now: Date = new Date()): number {
  const days = new Set(actions.filter((a) => a.skillIds.includes(skillId)).map((a) => a.date));
  if (days.size === 0) return 0;
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);
  if (!days.has(fmt(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(fmt(cursor))) return 0;
  }
  let count = 0;
  while (days.has(fmt(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}
