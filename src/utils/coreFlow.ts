import { AppData, ContributionLink, EffortUnit, ExecutionLog } from '../types';
import { calculateGoalProgress, calculateModuleProgress, skillsForModule } from '../progress';
import { createEffortUnitsFromExecutionLog, generateContributionLinks } from './effort';

export type CoreFlowIssue = {
  type:
    | 'orphan_skill'
    | 'orphan_module'
    | 'orphan_log'
    | 'orphan_effort_unit'
    | 'orphan_contribution_link'
    | 'missing_template_link'
    | 'missing_progress_model'
    | 'invalid_schedule_block'
    | 'duplicate_template_entity';
  severity: 'low' | 'medium' | 'high';
  message: string;
  entityId?: string;
};

export type CoreFlowIntegrityResult = {
  ok: boolean;
  issues: CoreFlowIssue[];
  orphanSkills: string[];
  orphanModules: string[];
  orphanLogs: string[];
  orphanEffortUnits: string[];
  orphanContributionLinks: string[];
};

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function validateAppDataIntegrity(appData: AppData): CoreFlowIntegrityResult {
  const goals = appData.categories || [];
  const modules = appData.modules || [];
  const skills = appData.skills || [];
  const links = appData.moduleSkillLinks || [];
  const logs = appData.executionLogs || [];
  const efforts = appData.effortUnits || [];
  const contributionLinks = appData.contributionLinks || [];
  const scheduleBlocks = appData.scheduleBlocks || [];

  const goalIds = new Set(goals.map((goal) => goal.id));
  const moduleIds = new Set(modules.map((module) => module.id));
  const skillIds = new Set(skills.map((skill) => skill.id));
  const logIds = new Set(logs.map((log) => log.id));
  const effortIds = new Set(efforts.map((unit) => unit.id));
  const scheduleIds = new Set(scheduleBlocks.map((block) => block.id));

  const issues: CoreFlowIssue[] = [];

  const orphanModules = unique(modules.filter((module) => module.goalId && !goalIds.has(module.goalId)).map((module) => module.id));
  orphanModules.forEach((id) => issues.push({ type: 'orphan_module', severity: 'medium', message: 'Module references a missing goal.', entityId: id }));

  const orphanSkills = unique(links.filter((link) => !skillIds.has(link.skillId)).map((link) => link.skillId));
  orphanSkills.forEach((id) => issues.push({ type: 'orphan_skill', severity: 'medium', message: 'Module-skill link references a missing skill.', entityId: id }));

  links.forEach((link) => {
    if (!moduleIds.has(link.moduleId) || !goalIds.has(link.goalId)) {
      issues.push({ type: 'orphan_module', severity: 'medium', message: 'Module-skill link references a missing module or goal.', entityId: link.id });
    }
  });

  const orphanLogs = unique(logs.filter((log) => (
    (!!log.linkedSkillId && !skillIds.has(log.linkedSkillId))
      || (!!log.linkedGoalId && !goalIds.has(log.linkedGoalId))
      || (!!log.linkedModuleId && !moduleIds.has(log.linkedModuleId))
      || (!!log.linkedScheduleBlockId && !scheduleIds.has(log.linkedScheduleBlockId))
  )).map((log) => log.id));
  orphanLogs.forEach((id) => issues.push({ type: 'orphan_log', severity: 'low', message: 'Execution log references a missing linked entity.', entityId: id }));

  const orphanEffortUnits = unique(efforts.filter((unit) => (
    !logIds.has(unit.executionLogId)
      || (!!unit.primarySkillId && !skillIds.has(unit.primarySkillId))
      || (!!unit.primaryGoalId && !goalIds.has(unit.primaryGoalId))
      || (!!unit.primaryModuleId && !moduleIds.has(unit.primaryModuleId))
  )).map((unit) => unit.id));
  orphanEffortUnits.forEach((id) => issues.push({ type: 'orphan_effort_unit', severity: 'low', message: 'Effort unit references missing source data.', entityId: id }));

  const orphanContributionLinks = unique(contributionLinks.filter((link) => {
    const targetExists = link.targetType === 'goal'
      ? goalIds.has(link.targetId)
      : link.targetType === 'module'
        ? moduleIds.has(link.targetId)
        : skillIds.has(link.targetId);
    return !logIds.has(link.executionLogId) || !effortIds.has(link.effortUnitId) || !targetExists;
  }).map((link) => link.id));
  orphanContributionLinks.forEach((id) => issues.push({ type: 'orphan_contribution_link', severity: 'low', message: 'Contribution link references missing source or target data.', entityId: id }));

  goals.filter((goal) => !goal.progressModel).forEach((goal) => {
    issues.push({ type: 'missing_progress_model', severity: 'low', message: 'Goal is missing progress model.', entityId: goal.id });
  });

  scheduleBlocks.filter((block) => block.linkedSkillId && !skillIds.has(block.linkedSkillId)).forEach((block) => {
    issues.push({ type: 'invalid_schedule_block', severity: 'low', message: 'Schedule block references a missing skill.', entityId: block.id });
  });

  return {
    ok: issues.length === 0,
    issues,
    orphanSkills,
    orphanModules,
    orphanLogs,
    orphanEffortUnits,
    orphanContributionLinks,
  };
}

export function repairAppDataIntegrity(appData: AppData): AppData {
  const checked = validateAppDataIntegrity(appData);
  const effortUnitIdsToRemove = new Set(checked.orphanEffortUnits);
  const contributionLinkIdsToRemove = new Set(checked.orphanContributionLinks);
  const goalIds = new Set((appData.categories || []).map((goal) => goal.id));
  const moduleIds = new Set((appData.modules || []).map((module) => module.id));
  const skillIds = new Set((appData.skills || []).map((skill) => skill.id));

  return {
    ...appData,
    goals: appData.goals || [],
    categories: (appData.categories || []).map((goal) => ({ ...goal, progressModel: goal.progressModel || 'module_average' })),
    modules: appData.modules || [],
    moduleSkillLinks: (appData.moduleSkillLinks || []).filter((link) => goalIds.has(link.goalId) && moduleIds.has(link.moduleId) && skillIds.has(link.skillId)),
    skills: appData.skills || [],
    actions: appData.actions || [],
    executionLogs: appData.executionLogs || [],
    effortUnits: (appData.effortUnits || []).filter((unit) => !effortUnitIdsToRemove.has(unit.id)),
    contributionLinks: (appData.contributionLinks || []).filter((link) => !contributionLinkIdsToRemove.has(link.id)),
    rescueLogs: appData.rescueLogs || [],
    stateCheckIns: appData.stateCheckIns || [],
    contextLogs: appData.contextLogs || [],
    decisionResults: appData.decisionResults || [],
    patternMemory: appData.patternMemory || [],
    scheduleBlocks: (appData.scheduleBlocks || []).map((block) => (
      block.linkedSkillId && !skillIds.has(block.linkedSkillId)
        ? { ...block, linkedSkillId: undefined, source: block.source ?? 'manual' }
        : block
    )),
    settings: appData.settings || {},
  };
}

export function rebuildDerivedDataFromLogs(appData: AppData) {
  const effortUnits: EffortUnit[] = [];
  const contributionLinks: ContributionLink[] = [];
  const contributionKeys = new Set<string>();

  (appData.executionLogs || []).forEach((log) => {
    try {
      const skill = log.linkedSkillId ? (appData.skills || []).find((item) => item.id === log.linkedSkillId) : undefined;
      const module = log.linkedModuleId ? (appData.modules || []).find((item) => item.id === log.linkedModuleId) : undefined;
      const goal = log.linkedGoalId ? (appData.categories || []).find((item) => item.id === log.linkedGoalId) : undefined;
      const scheduleBlock = log.linkedScheduleBlockId ? (appData.scheduleBlocks || []).find((item) => item.id === log.linkedScheduleBlockId) : undefined;
      const context = {
        skill,
        goal,
        module,
        scheduleBlock,
        allGoals: appData.categories || [],
        allSkills: appData.skills || [],
        allModules: appData.modules || [],
        links: appData.moduleSkillLinks || [],
      };
      const units = createEffortUnitsFromExecutionLog(log, context);
      effortUnits.push(...units);
      units.flatMap((unit) => generateContributionLinks(unit, context)).forEach((link) => {
        const key = `${link.effortUnitId}:${link.targetType}:${link.targetId}:${link.reasonCode}`;
        if (contributionKeys.has(key)) return;
        contributionKeys.add(key);
        contributionLinks.push(link);
      });
    } catch (error) {
      console.warn('[coreFlow] skipped derived rebuild for log', log.id, error);
    }
  });

  return {
    ...appData,
    effortUnits,
    contributionLinks,
  };
}

export function applyExecutionLogToProgress(log: ExecutionLog, appData: AppData) {
  const updatedSkillIds: string[] = [];
  const updatedModuleIds: string[] = [];
  const updatedGoalIds: string[] = [];
  const warnings: string[] = [];

  if (log.linkedSkillId && (appData.skills || []).some((skill) => skill.id === log.linkedSkillId)) {
    updatedSkillIds.push(log.linkedSkillId);
  } else if (log.linkedSkillId) {
    warnings.push('Linked skill is missing; numeric skill progress was not updated.');
  }

  const linkedModuleIds = new Set<string>();
  if (log.linkedModuleId) linkedModuleIds.add(log.linkedModuleId);
  (appData.moduleSkillLinks || [])
    .filter((link) => !log.linkedSkillId || link.skillId === log.linkedSkillId)
    .forEach((link) => linkedModuleIds.add(link.moduleId));

  linkedModuleIds.forEach((moduleId) => {
    const module = (appData.modules || []).find((item) => item.id === moduleId);
    if (!module) {
      warnings.push('Linked module is missing; module progress was not updated.');
      return;
    }
    const moduleSkills = skillsForModule(module.id, appData.skills || [], appData.moduleSkillLinks || []);
    calculateModuleProgress(module, moduleSkills, appData.moduleSkillLinks || []);
    updatedModuleIds.push(module.id);
    if (module.goalId) updatedGoalIds.push(module.goalId);
  });

  if (log.linkedGoalId) updatedGoalIds.push(log.linkedGoalId);
  unique(updatedGoalIds).forEach((goalId) => {
    const goal = (appData.categories || []).find((item) => item.id === goalId);
    if (!goal) {
      warnings.push('Linked goal is missing; goal progress was not updated.');
      return;
    }
    const goalModules = (appData.modules || []).filter((module) => module.goalId === goal.id);
    calculateGoalProgress(goal, goalModules, appData.skills || [], appData.moduleSkillLinks || []);
  });

  const uniqueModules = unique(updatedModuleIds);
  const uniqueGoals = unique(updatedGoalIds);
  return {
    updatedSkillIds: unique(updatedSkillIds),
    updatedModuleIds: uniqueModules,
    updatedGoalIds: uniqueGoals,
    summary: warnings.length > 0
      ? 'Execution log saved; some linked progress could not be recalculated.'
      : 'Execution log saved and linked progress recalculated.',
    warnings,
  };
}
