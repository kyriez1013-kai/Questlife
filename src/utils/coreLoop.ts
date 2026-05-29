import { AppData, Category, ExecutionLog, ModuleSkillLink, QuestModule, ScheduleBlock, Skill } from '../types';
import { calculateSkillProgress, getSkillMetricType } from '../progress';

export type CoreLoopLang = 'zh' | 'en';

export interface GoalCoreLoopStatus {
  hasGoalDefinition: boolean;
  hasModules: boolean;
  hasLinkedSkills: boolean;
  hasMetricConfigured: boolean;
  hasScheduleBlocks: boolean;
  hasExecutionLogs: boolean;
  hasProgressData: boolean;
  nextBestAction: string;
  missingSteps: string[];
  moduleCount: number;
  linkedSkillCount: number;
  metricConfiguredCount: number;
  executionLogCount: number;
}

export interface AppCoreLoopStatus {
  totalGoals: number;
  totalSkills: number;
  totalScheduleBlocks: number;
  totalExecutionLogs: number;
  activeGoals: number;
  skillsWithMetrics: number;
  skillsWithLogs: number;
  scheduledBlocksThisWeek: number;
  executionLogsThisWeek: number;
  nextBestAction: string;
}

const copy = {
  zh: {
    defineGoal: '先补充目标愿景',
    addModule: '添加一个模块',
    addSkill: '给模块添加技能',
    setMetric: '给技能设置量化方式',
    schedule: '安排一次日程',
    log: '今天记录一次进展',
    insights: '查看洞察',
    createGoal: '先创建目标',
    createSkill: '先创建技能',
  },
  en: {
    defineGoal: 'Define the goal vision',
    addModule: 'Add a module',
    addSkill: 'Add skills to a module',
    setMetric: 'Set a metric type',
    schedule: 'Schedule a session',
    log: 'Log progress today',
    insights: 'Review insights',
    createGoal: 'Create a goal',
    createSkill: 'Create a skill',
  },
};

function weekStart(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

function toDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function currentWeekDateSet() {
  const start = weekStart();
  return new Set(Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return toDateString(d);
  }));
}

function skillHasMetric(skill?: Skill) {
  if (!skill) return false;
  return getSkillMetricType(skill) !== 'none';
}

function skillHasProgressData(skill?: Skill) {
  if (!skill) return false;
  const progress = calculateSkillProgress(skill);
  return progress.tracked || progress.percent != null || progress.summary !== 'none';
}

function uniqueLinkedSkills(goalId: string, modules: QuestModule[], skills: Skill[], links: ModuleSkillLink[]) {
  const moduleIds = new Set(modules.filter((module) => module.goalId === goalId).map((module) => module.id));
  const skillIds = new Set(
    links
      .filter((link) => link.goalId === goalId || moduleIds.has(link.moduleId))
      .map((link) => link.skillId)
  );
  return skills.filter((skill) => skillIds.has(skill.id));
}

function logsForGoal(goal: Category, linkedSkillIds: Set<string>, logs: ExecutionLog[]) {
  return logs.filter((log) => (
    log.linkedGoalId === goal.id || (!!log.linkedSkillId && linkedSkillIds.has(log.linkedSkillId))
  ));
}

function scheduleForGoal(goal: Category, linkedSkillIds: Set<string>, blocks: ScheduleBlock[]) {
  return blocks.filter((block) => (
    block.linkedGoalId === goal.id
    || (block.linkedGoalIds || []).includes(goal.id)
    || (!!block.linkedSkillId && linkedSkillIds.has(block.linkedSkillId))
  ));
}

export function getNextBestActionForGoal(status: Pick<GoalCoreLoopStatus,
  'hasGoalDefinition' | 'hasModules' | 'hasLinkedSkills' | 'hasMetricConfigured' | 'hasScheduleBlocks' | 'hasExecutionLogs'>,
lang: CoreLoopLang = 'zh') {
  const c = copy[lang];
  if (!status.hasGoalDefinition) return c.defineGoal;
  if (!status.hasModules) return c.addModule;
  if (!status.hasLinkedSkills) return c.addSkill;
  if (!status.hasMetricConfigured) return c.setMetric;
  if (!status.hasScheduleBlocks) return c.schedule;
  if (!status.hasExecutionLogs) return c.log;
  return c.insights;
}

export function getGoalCoreLoopStatus(
  goal: Category,
  modules: QuestModule[] = [],
  skills: Skill[] = [],
  links: ModuleSkillLink[] = [],
  scheduleBlocks: ScheduleBlock[] = [],
  executionLogs: ExecutionLog[] = [],
  lang: CoreLoopLang = 'zh'
): GoalCoreLoopStatus {
  const goalModules = modules.filter((module) => module.goalId === goal.id);
  const linkedSkills = uniqueLinkedSkills(goal.id, goalModules, skills, links);
  const linkedSkillIds = new Set(linkedSkills.map((skill) => skill.id));
  const metricConfiguredCount = linkedSkills.filter(skillHasMetric).length;
  const goalLogs = logsForGoal(goal, linkedSkillIds, executionLogs);
  const goalBlocks = scheduleForGoal(goal, linkedSkillIds, scheduleBlocks);

  const base = {
    hasGoalDefinition: !!goal.vision?.trim() || !!(goal.outcomeCriteria || []).length,
    hasModules: goalModules.length > 0,
    hasLinkedSkills: linkedSkills.length > 0,
    hasMetricConfigured: linkedSkills.length > 0 && metricConfiguredCount === linkedSkills.length,
    hasScheduleBlocks: goalBlocks.length > 0,
    hasExecutionLogs: goalLogs.length > 0,
    hasProgressData: goalLogs.length > 0 || linkedSkills.some(skillHasProgressData),
  };
  const missingSteps = [
    !base.hasGoalDefinition ? copy[lang].defineGoal : null,
    !base.hasModules ? copy[lang].addModule : null,
    !base.hasLinkedSkills ? copy[lang].addSkill : null,
    !base.hasMetricConfigured ? copy[lang].setMetric : null,
    !base.hasScheduleBlocks ? copy[lang].schedule : null,
    !base.hasExecutionLogs ? copy[lang].log : null,
  ].filter(Boolean) as string[];

  return {
    ...base,
    nextBestAction: getNextBestActionForGoal(base, lang),
    missingSteps,
    moduleCount: goalModules.length,
    linkedSkillCount: linkedSkills.length,
    metricConfiguredCount,
    executionLogCount: goalLogs.length,
  };
}

export function getAppCoreLoopStatus(data: AppData, lang: CoreLoopLang = 'zh'): AppCoreLoopStatus {
  const goals = data.categories || [];
  const skills = data.skills || [];
  const links = data.moduleSkillLinks || [];
  const logs = data.executionLogs || [];
  const blocks = data.scheduleBlocks || [];
  const weekDates = currentWeekDateSet();
  const skillsWithMetrics = skills.filter(skillHasMetric).length;
  const skillIdsWithLogs = new Set(logs.map((log) => log.linkedSkillId).filter(Boolean) as string[]);
  const activeGoals = goals.filter((goal) => (
    getGoalCoreLoopStatus(goal, data.modules || [], skills, links, blocks, logs, lang).hasLinkedSkills
  )).length;

  let nextBestAction = copy[lang].insights;
  if (goals.length === 0) nextBestAction = copy[lang].createGoal;
  else if (skills.length === 0) nextBestAction = copy[lang].createSkill;
  else if (logs.length === 0) nextBestAction = copy[lang].log;

  return {
    totalGoals: goals.length,
    totalSkills: skills.length,
    totalScheduleBlocks: blocks.length,
    totalExecutionLogs: logs.length,
    activeGoals,
    skillsWithMetrics,
    skillsWithLogs: skillIdsWithLogs.size,
    scheduledBlocksThisWeek: blocks.filter((block) => weekDates.has(block.date)).length,
    executionLogsThisWeek: logs.filter((log) => weekDates.has(log.date)).length,
    nextBestAction,
  };
}
