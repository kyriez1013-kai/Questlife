import {
  Category,
  ExecutionLog,
  GoalType,
  ModuleSkillLink,
  OutcomeCriterion,
  ProgressType,
  QuestModule,
  Skill,
  TaskType,
} from './types';

export interface ProgressResult {
  percent: number | null;
  tracked: boolean;
  summary: string;
  label?: string;
  metricType?: ProgressType;
  raw?: any;
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function ratioProgress(current = 0, target = 0) {
  return target > 0 ? clampPercent((current / target) * 100) : 0;
}

function formatStrengthSetLine(data: { weight?: number; reps?: number; sets?: number; rpe?: number }, unit = 'kg') {
  const pieces = [];
  if (data.weight != null) pieces.push(`${data.weight}${unit}`);
  if (data.reps != null) pieces.push(`× ${data.reps}`);
  if (data.sets != null) pieces.push(`× ${data.sets}`);
  const main = pieces.join(' ');
  return `${main || '--'}${data.rpe != null ? ` · RPE ${data.rpe}` : ''}`;
}

export function calculatePredictionDelta(log: Pick<ExecutionLog,
  'durationMinutes' | 'predictedDurationMinutes' | 'qualityRating' | 'predictedQualityRating'
>) {
  const durationDeltaMinutes = log.durationMinutes != null && log.predictedDurationMinutes != null
    ? log.durationMinutes - log.predictedDurationMinutes
    : undefined;
  const qualityDelta = log.qualityRating != null && log.predictedQualityRating != null
    ? log.qualityRating - log.predictedQualityRating
    : undefined;
  if (durationDeltaMinutes == null && qualityDelta == null) return undefined;
  return { durationDeltaMinutes, qualityDelta };
}

export function getSkillMetricType(skill?: Skill): ProgressType {
  return skill?.metricConfig?.metricType ?? skill?.progressType ?? 'none';
}

export function progressTypeForSkill(skill: Skill): ProgressType {
  return getSkillMetricType(skill) === 'curriculum' ? 'checklist' : getSkillMetricType(skill);
}

function metricConfig(skill: Skill) {
  return skill.metricConfig;
}

export function isStrengthSkill(name: string) {
  return /卧推|硬拉|深蹲|健身|gym|bench|deadlift|squat/i.test(name);
}

export function inferProgressDefaults(skill: Skill): Partial<Skill> {
  if (skill.progressType) return {};
  if (isStrengthSkill(skill.name)) {
    return { progressType: 'target_value', unit: skill.unit ?? 'kg' };
  }
  return {
    progressType: 'time_based',
    targetHours: skill.targetHours ?? skill.totalTargetHours ?? 100,
    completedHours: skill.completedHours ?? skill.totalXP / 60,
  };
}

export function calculateSkillProgress(skill: Skill): ProgressResult {
  const type = progressTypeForSkill(skill);
  const config = metricConfig(skill);
  if (type === 'none') return { percent: null, tracked: false, summary: 'none', label: 'No tracking', metricType: type };
  if (type === 'qualitative') return { percent: null, tracked: false, summary: 'qualitative', label: 'Qualitative logs', metricType: type };

  if (type === 'target_value') {
    const current = config?.currentValue ?? skill.currentValue ?? 0;
    const target = config?.targetValue ?? skill.targetValue ?? 0;
    const unit = config?.unit ?? skill.unit ?? '';
    return {
      percent: target > 0 ? clampPercent((current / target) * 100) : 0,
      tracked: target > 0,
      summary: `${current}${unit} / ${target}${unit}`,
      label: `${current}${unit} / ${target}${unit}`,
      metricType: type,
    };
  }

  if (type === 'curriculum' || type === 'checklist') {
    const items = config?.checklistItems ?? skill.curriculumItems ?? [];
    const done = items.filter((item) => item.completed).length;
    return {
      percent: items.length > 0 ? clampPercent((done / items.length) * 100) : 0,
      tracked: items.length > 0,
      summary: `${done} / ${items.length}`,
      label: `${done} / ${items.length}`,
      metricType: type,
    };
  }

  if (type === 'frequency') {
    const done = config?.completedThisWeek ?? skill.completedThisWeek ?? 0;
    const target = config?.weeklyTargetCount ?? skill.weeklyTargetCount ?? 0;
    return {
      percent: target > 0 ? clampPercent((done / target) * 100) : 0,
      tracked: target > 0,
      summary: `${done} / ${target}`,
      label: `${done} / ${target}`,
      metricType: type,
    };
  }

  if (type === 'performance_log') {
    const current = config?.bestValue ?? config?.currentBest ?? config?.bestEstimated1RM ?? skill.currentValue ?? 0;
    const target = config?.targetPerformanceValue ?? config?.targetValue ?? skill.targetValue ?? 0;
    const unit = config?.unit ?? skill.unit ?? '';
    return {
      percent: target > 0 ? clampPercent((current / target) * 100) : null,
      tracked: target > 0 || current > 0,
      summary: current > 0
        ? `Best ${current}${unit}${target > 0 ? ` / ${target}${unit}` : ''}`
        : 'Log-based progress',
      label: current > 0
        ? `Best ${current}${unit}${target > 0 ? ` / ${target}${unit}` : ''}`
        : 'Log-based progress',
      metricType: type,
      raw: { current, target, unit },
    };
  }

  if (type === 'quality_score') {
    const avg = config?.averageQuality ?? 0;
    const target = config?.targetQuality ?? 5;
    return {
      percent: target > 0 && avg > 0 ? clampPercent((avg / target) * 100) : null,
      tracked: avg > 0,
      summary: `${avg.toFixed(1)} / ${target}`,
      label: `${avg.toFixed(1)} / ${target}`,
      metricType: type,
    };
  }

  if (type === 'state_based') {
    const avg = config?.averageStateValue ?? 0;
    const target = config?.targetStateValue ?? 0;
    const label = config?.stateMetric ?? 'state';
    return {
      percent: target > 0 && avg > 0 ? clampPercent((avg / target) * 100) : null,
      tracked: avg > 0,
      summary: `${label} ${avg.toFixed(1)}${target > 0 ? ` / ${target}` : ''}`,
      label: `${label} ${avg.toFixed(1)}${target > 0 ? ` / ${target}` : ''}`,
      metricType: type,
    };
  }

  if (type === 'money_based') {
    const current = config?.currentAmount ?? skill.currentValue ?? 0;
    const target = config?.targetAmount ?? skill.targetValue ?? 0;
    const currency = config?.currency ?? config?.unit ?? skill.unit ?? '$';
    return {
      percent: target > 0 ? clampPercent((current / target) * 100) : null,
      tracked: target > 0 || current > 0,
      summary: `${currency}${current} / ${currency}${target}`,
      label: `${currency}${current} / ${currency}${target}`,
      metricType: type,
    };
  }

  if (type === 'binary') {
    const completed = !!config?.completed;
    return {
      percent: completed ? 100 : 0,
      tracked: true,
      summary: completed ? 'Completed' : 'Not Completed',
      label: completed ? 'Completed' : 'Not Completed',
      metricType: type,
    };
  }

  const completed = Math.max(config?.completedHours ?? skill.completedHours ?? 0, skill.totalXP / 60);
  const target = config?.targetHours ?? skill.targetHours ?? skill.totalTargetHours ?? 0;
  return {
    percent: target > 0 ? clampPercent((completed / target) * 100) : 0,
    tracked: target > 0,
    summary: `${completed.toFixed(1)}h / ${target}h`,
    label: `${completed.toFixed(1)}h / ${target}h`,
    metricType: type,
  };
}

export function formatSkillProgress(skill: Skill, lang: 'zh' | 'en' = 'zh') {
  const progress = calculateSkillProgress(skill);
  const type = progressTypeForSkill(skill);
  if (type === 'none') return lang === 'zh' ? '不追踪进度' : 'No tracking';
  if (type === 'qualitative') return lang === 'zh' ? '质性记录' : 'Qualitative logs';
  if (type === 'performance_log' && progress.percent == null) return lang === 'zh' ? '表现记录型进度' : 'Log-based progress';
  if (!progress.tracked) return lang === 'zh' ? '未设置' : 'Not set';
  if (type === 'frequency') {
    return lang === 'zh' ? `${progress.summary} 本周 · ${progress.percent}%` : `${progress.summary} this week · ${progress.percent}%`;
  }
  if (type === 'checklist') {
    return lang === 'zh' ? `清单 ${progress.summary} · ${progress.percent}%` : `Checklist ${progress.summary} · ${progress.percent}%`;
  }
  if (type === 'quality_score') {
    return lang === 'zh' ? `平均质量 ${progress.summary} · ${progress.percent}%` : `Average Quality ${progress.summary} · ${progress.percent}%`;
  }
  if (type === 'binary') return progress.summary;
  return `${progress.summary} · ${progress.percent}%`;
}

export function calculateMetricProgress(skillOrCriterion: Skill | OutcomeCriterion, linkedSkills: Skill[] = []): ProgressResult {
  if ('name' in skillOrCriterion) return calculateSkillProgress(skillOrCriterion);
  const percent = calculateOutcomeCriterionProgress(skillOrCriterion, linkedSkills);
  return { percent, tracked: percent != null, summary: `${percent}%`, label: skillOrCriterion.title };
}

export function formatMetricSummary(skill: Skill, lang: 'zh' | 'en' = 'zh') {
  return formatSkillProgress(skill, lang);
}

export function formatMetricUpdateSummary(log: ExecutionLog, skill?: Skill, lang: 'zh' | 'en' = 'zh') {
  const update = log.metricUpdate;
  const legacy = log.progressUpdate;
  const metricType = update?.metricType ?? legacy?.progressType ?? skill?.metricConfig?.metricType ?? skill?.progressType ?? 'none';
  const unit = update?.performanceUnit ?? skill?.metricConfig?.unit ?? skill?.unit ?? '';

  if (metricType === 'time_based') {
    const minutes = update?.minutesAdded ?? legacy?.valueAdded ?? log.durationMinutes ?? 0;
    return lang === 'zh' ? `增加 ${minutes} 分钟` : `Added ${minutes} min`;
  }
  if (metricType === 'target_value') {
    const value = update?.newCurrentValue ?? legacy?.newCurrentValue;
    return value != null
      ? (lang === 'zh' ? `更新到 ${value}${unit}` : `Updated to ${value}${unit}`)
      : (lang === 'zh' ? '数值记录' : 'Value log');
  }
  if (metricType === 'frequency') {
    const count = update?.countAdded ?? legacy?.valueAdded ?? 1;
    return lang === 'zh' ? `完成 ${count} 次` : `${count} completion${count === 1 ? '' : 's'}`;
  }
  if (metricType === 'checklist' || metricType === 'curriculum') {
    const count = (update?.completedChecklistItemIds ?? legacy?.completedCurriculumItemIds ?? []).length;
    return lang === 'zh' ? `完成 ${count} 个清单项` : `${count} checklist item${count === 1 ? '' : 's'} completed`;
  }
  if (metricType === 'performance_log') {
    const strengthSet = update?.performanceData?.strengthSets?.[0] ?? legacy?.performanceData?.strengthSets?.[0];
    if (strengthSet) {
      const line = formatStrengthSetLine(strengthSet, unit || 'kg');
      const predicted = log.predictionData?.strength;
      if (predicted?.weight != null || predicted?.reps != null || predicted?.sets != null) {
        const predictedLine = formatStrengthSetLine(predicted, unit || 'kg');
        return lang === 'zh' ? `${line} · 预测 ${predictedLine}` : `${line} · predicted ${predictedLine}`;
      }
      return line;
    }
    const value = update?.performanceValue ?? update?.performanceData?.values?.[0]?.value;
    return value != null
      ? (lang === 'zh' ? `表现记录：${value}${unit}` : `Performance: ${value}${unit}`)
      : (lang === 'zh' ? '表现记录' : 'Performance log');
  }
  if (metricType === 'quality_score') {
    const value = update?.qualityValue ?? log.qualityRating;
    return value != null
      ? (lang === 'zh' ? `质量评分：${value} / 5` : `Quality: ${value} / 5`)
      : (lang === 'zh' ? '质量记录' : 'Quality log');
  }
  if (metricType === 'state_based') {
    const value = update?.stateValue ?? legacy?.stateValue;
    return value != null
      ? (lang === 'zh' ? `状态记录：${value}` : `State value: ${value}`)
      : (lang === 'zh' ? '状态记录' : 'State log');
  }
  if (metricType === 'money_based') {
    const currency = skill?.metricConfig?.currency ?? skill?.metricConfig?.unit ?? skill?.unit ?? '$';
    if (update?.newCurrentAmount != null || legacy?.newCurrentAmount != null) {
      const value = update?.newCurrentAmount ?? legacy?.newCurrentAmount;
      return lang === 'zh' ? `当前金额：${currency}${value}` : `Current amount: ${currency}${value}`;
    }
    const added = update?.amountAdded ?? legacy?.amountAdded;
    return added != null
      ? (lang === 'zh' ? `金额增加：${currency}${added}` : `Amount added: ${currency}${added}`)
      : (lang === 'zh' ? '金额记录' : 'Money log');
  }
  if (metricType === 'binary') {
    return update?.markCompleted || legacy?.completed
      ? (lang === 'zh' ? '已标记完成' : 'Marked completed')
      : (lang === 'zh' ? '完成记录' : 'Completion log');
  }
  if (metricType === 'qualitative') return lang === 'zh' ? '已记录复盘' : 'Reflection saved';
  return lang === 'zh' ? '执行记录' : 'Execution log';
}

export function getDefaultMetricConfigForTaskType(taskType?: TaskType): Partial<Skill['metricConfig']> {
  if (taskType === 'strength_training') {
    return { metricType: 'performance_log', performanceType: 'strength', primaryMetric: 'estimated_1rm', unit: 'kg', trackVolume: true, trackRPE: true, useEstimated1RM: true };
  }
  if (taskType === 'cardio_recovery') return { metricType: 'frequency', weeklyTargetCount: 3, completedThisWeek: 0 };
  if (taskType === 'admin') return { metricType: 'checklist', checklistItems: [] };
  if (taskType === 'life_maintenance') return { metricType: 'frequency', weeklyTargetCount: 7, completedThisWeek: 0 };
  if (taskType === 'creative_building') return { metricType: 'time_based', targetHours: 100, completedHours: 0 };
  return { metricType: 'time_based', targetHours: 100, completedHours: 0 };
}

export function getMetricTypeOptionsForDomain(domain?: GoalType | TaskType): ProgressType[] {
  if (domain === 'fitness' || domain === 'strength_training') return ['performance_log', 'frequency', 'target_value', 'state_based', 'qualitative'];
  if (domain === 'study' || domain === 'deep_study' || domain === 'light_review') return ['time_based', 'checklist', 'quality_score', 'binary'];
  if (domain === 'career') return ['checklist', 'time_based', 'binary', 'quality_score'];
  if (domain === 'finance') return ['money_based', 'target_value', 'frequency'];
  if (domain === 'health' || domain === 'cardio_recovery') return ['state_based', 'frequency', 'qualitative'];
  if (domain === 'project' || domain === 'creative_building') return ['checklist', 'time_based', 'binary', 'quality_score'];
  return ['none', 'time_based', 'target_value', 'frequency', 'checklist', 'performance_log', 'quality_score', 'state_based', 'money_based', 'binary', 'qualitative'];
}

export function getSkillLinkedLocations(
  skillId: string,
  goals: Category[],
  modules: QuestModule[],
  links: ModuleSkillLink[] = []
) {
  return links
    .filter((link) => link.skillId === skillId)
    .map((link) => {
      const goal = goals.find((item) => item.id === link.goalId);
      const module = modules.find((item) => item.id === link.moduleId);
      if (!goal || !module) return null;
      return {
        goalId: goal.id,
        goalName: goal.name,
        goalIcon: goal.emoji,
        moduleId: module.id,
        moduleName: module.name,
        moduleIcon: module.icon,
      };
    })
    .filter(Boolean) as {
      goalId: string;
      goalName: string;
      goalIcon?: string;
      moduleId: string;
      moduleName: string;
      moduleIcon?: string;
    }[];
}

export function getSkillLinkedCount(skillId: string, links: ModuleSkillLink[] = []) {
  return links.filter((link) => link.skillId === skillId).length;
}

export function skillsForModule(moduleId: string, skills: Skill[], links: ModuleSkillLink[]) {
  const skillIds = new Set(links.filter((link) => link.moduleId === moduleId).map((link) => link.skillId));
  return skills.filter((skill) => skillIds.has(skill.id));
}

export function calculateModuleProgress(module: QuestModule, skills: Skill[], links: ModuleSkillLink[] = []) {
  const scopedSkills = skillsForModule(module.id, skills, links);
  const rows = scopedSkills.map(calculateSkillProgress).filter((p) => p.tracked && p.percent != null);
  if (rows.length === 0) return 0;
  return clampPercent(rows.reduce((sum, p) => sum + (p.percent ?? 0), 0) / rows.length);
}

export function calculateOutcomeCriterionProgress(criterion: OutcomeCriterion, skills: Skill[] = []) {
  if (criterion.metricType === 'none' || criterion.metricType === 'qualitative') return 0;
  if (criterion.metricType === 'binary') return criterion.completed ? 100 : 0;
  if (criterion.metricType === 'manual') {
    if ((criterion.targetValue ?? 0) > 0) {
      return ratioProgress(criterion.currentValue ?? 0, criterion.targetValue ?? 0);
    }
    return clampPercent(criterion.currentValue ?? 0);
  }
  if ((criterion.metricType === 'curriculum' || criterion.metricType === 'checklist' || criterion.metricType === 'performance_log') && criterion.linkedSkillId) {
    const linkedSkill = skills.find((skill) => skill.id === criterion.linkedSkillId);
    if (linkedSkill) return calculateSkillProgress(linkedSkill).percent ?? 0;
  }
  if (criterion.metricType === 'quality_score' || criterion.metricType === 'state_based' || criterion.metricType === 'money_based') {
    return ratioProgress(criterion.currentValue ?? 0, criterion.targetValue ?? 0);
  }
  return ratioProgress(criterion.currentValue ?? 0, criterion.targetValue ?? 0);
}

export function calculateCriteriaWeightedProgress(criteria: OutcomeCriterion[] = [], skills: Skill[] = []) {
  const weighted = criteria.filter((criterion) => criterion.weight > 0);
  const totalWeight = weighted.reduce((sum, criterion) => sum + criterion.weight, 0);
  if (totalWeight <= 0) return 0;
  const score = weighted.reduce((sum, criterion) => {
    return sum + calculateOutcomeCriterionProgress(criterion, skills) * criterion.weight;
  }, 0);
  return clampPercent(score / totalWeight);
}

function linkedSkillsForGoal(goal: Category, modules: QuestModule[], skills: Skill[], links: ModuleSkillLink[]) {
  const goalModules = modules.filter((module) => module.goalId === goal.id);
  const moduleIds = new Set(goalModules.map((module) => module.id));
  const linkedSkillIds = new Set(
    links
      .filter((link) => link.goalId === goal.id || moduleIds.has(link.moduleId))
      .map((link) => link.skillId)
  );
  return skills.filter((skill) => linkedSkillIds.has(skill.id));
}

function calculateSkillAverageForGoal(goal: Category, modules: QuestModule[], skills: Skill[], links: ModuleSkillLink[]) {
  const rows = linkedSkillsForGoal(goal, modules, skills, links)
    .map(calculateSkillProgress)
    .filter((p) => p.tracked && p.percent != null);
  if (rows.length === 0) return 0;
  return clampPercent(rows.reduce((sum, p) => sum + (p.percent ?? 0), 0) / rows.length);
}

function calculateModuleAverageForGoal(goal: Category, modules: QuestModule[], skills: Skill[], links: ModuleSkillLink[]) {
  const goalModules = modules.filter((module) => module.goalId === goal.id);
  const rows = goalModules
    .map((module) => {
      const moduleSkills = skillsForModule(module.id, skills, links);
      const hasTrackedSkill = moduleSkills.some((skill) => calculateSkillProgress(skill).tracked);
      return hasTrackedSkill ? calculateModuleProgress(module, skills, links) : null;
    })
    .filter((value): value is number => value != null);
  if (rows.length === 0) return calculateSkillAverageForGoal(goal, modules, skills, links);
  return clampPercent(rows.reduce((sum, value) => sum + value, 0) / rows.length);
}

export function calculateGoalProgress(goal: Category, modules: QuestModule[], skills: Skill[], links: ModuleSkillLink[] = []) {
  const criteria = goal.outcomeCriteria ?? [];
  const model = goal.progressModel ?? (criteria.length > 0 ? 'criteria_weighted' : 'module_average');
  if (model === 'criteria_weighted' && criteria.length > 0) {
    return calculateCriteriaWeightedProgress(criteria, skills);
  }
  if (model === 'skill_average') {
    return calculateSkillAverageForGoal(goal, modules, skills, links);
  }
  if (model === 'manual') {
    return goal.manualProgress != null
      ? clampPercent(goal.manualProgress)
      : calculateModuleAverageForGoal(goal, modules, skills, links);
  }
  return calculateModuleAverageForGoal(goal, modules, skills, links);
}

export function getSuggestedModulesForGoalType(goalType?: GoalType) {
  const templates: Record<GoalType, string[]> = {
    fitness: ['推日', '拉日', '腿日', '肩部', '恢复', '营养'],
    career: ['核心技能', '项目作品', '简历/LinkedIn', '面试准备', 'Networking'],
    study: ['基础知识', '练习题', '复习', '项目/作业', '弱点整理'],
    exam: ['Lecture Review', 'Practice Questions', 'Formula Sheet', 'Mock Exam', 'Weak Points'],
    finance: ['收入', '支出', '储蓄', '投资', '风险管理'],
    health: ['睡眠', '饮食', '运动', '恢复', '情绪'],
    project: ['产品设计', '技术搭建', '用户反馈', '数据分析', '发布部署'],
    custom: ['默认模块'],
  };
  return templates[goalType ?? 'custom'] ?? [];
}
