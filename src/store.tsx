// 全局状态 Context
// 持久化策略: 每次 mutation 先基于同步 ref 计算新状态, 再立即持久化.
// React state updater 保持纯函数, 避免跨标签事件与批量更新吞掉写入.
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { AppData, DEFAULT_DATA, Goal, Skill, Action, Category, UNCATEGORIZED_ID, ScheduleBlock, QuestModule, ModuleSkillLink, ExecutionLog, RescueLog, StateCheckIn, EffortUnit, ContributionLink, RawCapture, ContextLog, DecisionResult, PatternMemory, DashboardCardSize, DashboardPresetId, DashboardSurface, DashboardPreferences } from './types';
import { loadData, persist, readPersistedDataForDebug, uid, today } from './storage';
import { scheduleSkillReminder, cancelSkillReminder, rescheduleAllReminders } from './notifications';
import { calculateModuleProgress, calculatePredictionDelta, progressTypeForSkill, skillsForModule } from './progress';
import { trackEvent } from './utils/analytics';
import { scheduleServerSync } from './services/syncService';
import { createEffortUnitsFromExecutionLog, generateContributionLinks } from './utils/effort';
import { DOMAIN_TEMPLATES, createGoalStructureFromTemplate, templateProgressModel } from './domainTemplates';
import { rebuildDerivedDataFromLogs, repairAppDataIntegrity, validateAppDataIntegrity, CoreFlowIntegrityResult } from './utils/coreFlow';
import { getLinkedExecutionLogIdsForCapture, removeDerivedForLogs } from './utils/dataResidueAudit';
import { buildDashboardPreferencesForPreset, normalizeDashboardPreferences } from './utils/dashboardCards';
import { compactDecisionResults } from './utils/decisionMemory';
import { mergePatternCandidates as mergePatternCandidateList } from './utils/patternMemory';
import { installPersistenceDebugBridge } from './utils/persistenceTrace';
import {
  reconcileCommittedAppData,
  reconcileExternalAppData,
  shouldPersistStoreMutation,
} from './utils/persistenceConsistency';

function metricTypeForAnalytics(skill?: Skill) {
  return skill?.metricConfig?.metricType ?? skill?.progressType;
}

function safeNumber(value?: number) {
  return Number.isFinite(value) ? value : undefined;
}

interface Ctx {
  data: AppData;
  loading: boolean;
  addGoal: (g: Omit<Goal, 'id' | 'createdAt' | 'completed' | 'skillIds'> & { skillIds?: string[] }) => Goal;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  addCategory: (c: Omit<Category, 'id' | 'createdAt'>) => Category;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  applyDomainTemplateToGoal: (goalId: string, templateId: string) => { createdModuleIds: string[]; createdSkillIds: string[]; createdLinkIds: string[]; skippedExisting: string[]; modulesCreated: number; skillsCreated: number; linksCreated: number } | undefined;
  /** mode: 'cascade' 同时删该 category 下所有 skill+action; 'transfer' 把 skill 挪到"未分类" */
  deleteCategory: (id: string, mode: 'cascade' | 'transfer') => void;
  addModule: (m: Omit<QuestModule, 'id' | 'createdAt'>) => QuestModule;
  updateModule: (id: string, patch: Partial<QuestModule>) => void;
  deleteModule: (id: string) => void;
  addModuleSkillLink: (l: Omit<ModuleSkillLink, 'id' | 'createdAt'>) => ModuleSkillLink | undefined;
  removeModuleSkillLink: (id: string) => void;
  addExistingSkillToModule: (goalId: string, moduleId: string, skillId: string) => ModuleSkillLink | undefined;
  removeSkillFromModule: (moduleId: string, skillId: string) => void;
  createSkillAndAttachToModule: (goalId: string, moduleId: string, s: Omit<Skill, 'id' | 'createdAt' | 'totalXP'>) => Skill;
  deleteSkillFromLibrary: (skillId: string) => void;
  addSkill: (s: Omit<Skill, 'id' | 'createdAt' | 'totalXP'>) => Skill;
  updateSkill: (id: string, patch: Partial<Skill>) => void;
  deleteSkill: (id: string) => void;
  addAction: (a: Omit<Action, 'id' | 'createdAt' | 'date'> & { date?: string }) => Action;
  deleteAction: (id: string) => void;
  createExecutionLog: (logData: Partial<Omit<ExecutionLog, 'id' | 'createdAt' | 'appliedToProgress'>> & {
    id?: string;
    createdAt?: string;
    appliedToProgress?: boolean;
    skillId?: string;
    goalId?: string;
    moduleId?: string;
    scheduleBlockId?: string;
  }) => ExecutionLog;
  updateExecutionLog: (id: string, patch: Partial<ExecutionLog>) => void;
  deleteExecutionLog: (id: string) => void;
  getExecutionLogsByDate: (date: string) => ExecutionLog[];
  getExecutionLogsBySkill: (skillId: string) => ExecutionLog[];
  getExecutionLogsByGoal: (goalId: string) => ExecutionLog[];
  getExecutionLogsByScheduleBlock: (blockId: string) => ExecutionLog[];
  createRescueLog: (logData: Omit<RescueLog, 'id' | 'createdAt' | 'source'> & { id?: string; createdAt?: string; source?: 'brain_off_rescue' }) => RescueLog;
  updateRescueLog: (id: string, patch: Partial<RescueLog>) => void;
  completeRescueStep: (id: string, bodyAction: string) => void;
  completeActivationStep: (id: string, activationAction: string) => void;
  getRescueLogsByDate: (date: string) => RescueLog[];
  getRescueLogsThisWeek: () => RescueLog[];
  getActiveUnfinishedRescue: () => RescueLog | undefined;
  createStateCheckIn: (checkIn: Omit<StateCheckIn, 'id' | 'createdAt'> & { id?: string; createdAt?: string }) => StateCheckIn;
  updateStateCheckIn: (id: string, patch: Partial<StateCheckIn>) => void;
  deleteStateCheckIn: (id: string) => void;
  getStateCheckInsByDate: (date: string) => StateCheckIn[];
  getLatestStateCheckIn: (date?: string) => StateCheckIn | undefined;
  getStateCheckInsThisWeek: () => StateCheckIn[];
  getAverageStateByTimeBlock: (days: number) => Record<string, number>;
  addContextLog: (log: Omit<ContextLog, 'id' | 'createdAt'> & { id?: string; createdAt?: string }) => ContextLog;
  addContextLogs: (logs: (Omit<ContextLog, 'id' | 'createdAt'> & { id?: string; createdAt?: string })[]) => ContextLog[];
  deleteContextLog: (id: string) => void;
  addScheduleBlock: (b: Omit<ScheduleBlock, 'id' | 'createdAt'>) => ScheduleBlock;
  updateScheduleBlock: (id: string, patch: Partial<ScheduleBlock>) => void;
  deleteScheduleBlock: (id: string) => void;
  setSettings: (s: Partial<AppData['settings']>) => void;
  updateDashboardPreferences: (patch: Partial<DashboardPreferences>) => void;
  setDashboardPreset: (presetId: DashboardPresetId) => void;
  setDashboardCardVisibility: (surface: DashboardSurface, cardId: string, visible: boolean) => void;
  moveDashboardCard: (surface: DashboardSurface, cardId: string, direction: 'up' | 'down') => void;
  setDashboardCardSize: (surface: DashboardSurface, cardId: string, size: DashboardCardSize) => void;
  resetDashboardLayout: (surface?: DashboardSurface | 'all') => void;
  runIntegrityCheck: () => CoreFlowIntegrityResult;
  repairSafeIntegrityIssues: () => CoreFlowIntegrityResult;
  rebuildDerivedData: () => { effortUnitCount: number; contributionLinkCount: number };
  addDecisionResult: (result: Omit<DecisionResult, 'id' | 'createdAt'> & { id?: string; createdAt?: string }) => DecisionResult;
  updateDecisionResultFeedback: (id: string, rating: 'useful' | 'not_useful') => void;
  deleteDecisionResult: (id: string) => void;
  mergePatternMemoryCandidates: (candidates: PatternMemory[]) => PatternMemory[];
  updatePatternMemoryStatus: (id: string, status: PatternMemory['status']) => void;
  // Spec B-1: Smart Capture Loop
  addRawCapture: (text: string) => RawCapture;
  updateRawCapture: (id: string, patch: Partial<RawCapture>) => void;
  deleteRawCapture: (id: string, options?: { deleteLinkedExecutionLogs?: boolean }) => void;
}

function applyExecutionLogToSkillProgress(skill: Skill, log: ExecutionLog): Skill {
  if (log.appliedToProgress) return skill;
  const update = log.metricUpdate;
  const legacy = log.progressUpdate;
  const progressType = skill.metricConfig?.metricType ?? skill.progressType ?? update?.metricType ?? legacy?.progressType ?? 'time_based';
  const config = skill.metricConfig ?? { metricType: progressType };
  if (progressType === 'time_based') {
    const addedMinutes = update?.minutesAdded ?? legacy?.valueAdded ?? log.durationMinutes ?? 0;
    const addedHours = addedMinutes / 60;
    const completedHours = (config.completedHours ?? skill.completedHours ?? 0) + addedHours;
    return {
      ...skill,
      completedHours,
      totalXP: skill.totalXP + log.durationMinutes,
      metricConfig: { ...config, metricType: progressType, completedHours },
    };
  }
  if (progressType === 'target_value') {
    const nextValue = update?.newCurrentValue ?? legacy?.newCurrentValue;
    if (typeof nextValue !== 'number' || Number.isNaN(nextValue)) return skill;
    const currentValue = Math.max(config.currentValue ?? skill.currentValue ?? 0, nextValue);
    return { ...skill, currentValue, metricConfig: { ...config, metricType: progressType, currentValue } };
  }
  if (progressType === 'frequency') {
    const completedThisWeek = (config.completedThisWeek ?? skill.completedThisWeek ?? 0) + (update?.countAdded ?? legacy?.valueAdded ?? 1);
    return { ...skill, completedThisWeek, metricConfig: { ...config, metricType: progressType, completedThisWeek } };
  }
  if (progressType === 'curriculum' || progressType === 'checklist') {
    const completedIds = new Set(update?.completedChecklistItemIds ?? legacy?.completedCurriculumItemIds ?? []);
    if (completedIds.size === 0) return skill;
    const checklistItems = (config.checklistItems ?? skill.curriculumItems ?? []).map((item) => (
      completedIds.has(item.id) ? { ...item, completed: true } : item
    ));
    return {
      ...skill,
      curriculumItems: checklistItems,
      metricConfig: { ...config, metricType: progressType, checklistItems },
    };
  }
  if (progressType === 'performance_log') {
    const data = update?.performanceData ?? legacy?.performanceData;
    const strengthSets: NonNullable<ExecutionLog['metricUpdate']>['performanceData']['strengthSets'] = data?.strengthSets ?? [];
    const totalVolume = data?.totalVolume ?? strengthSets.reduce((sum: number, set: any) => sum + (set.weight ?? 0) * (set.reps ?? 0) * (set.sets ?? 1), 0);
    const estimated1RM = data?.estimated1RM ?? strengthSets.reduce((best: number, set: any) => {
      const weight = set.weight ?? 0;
      const reps = set.reps ?? 0;
      const estimate = weight > 0 && reps > 0 ? weight * (1 + reps / 30) : 0;
      return Math.max(best, estimate);
    }, 0);
    const genericBest = update?.performanceValue ?? data?.values?.reduce((best: number, item: any) => Math.max(best, item.value), 0) ?? 0;
    const currentBest = Math.max(config.bestValue ?? config.currentBest ?? 0, genericBest, strengthSets.reduce((best: number, set: any) => Math.max(best, set.weight ?? 0), 0));
    return {
      ...skill,
      metricConfig: {
        ...config,
        metricType: progressType,
        bestValue: currentBest,
        currentBest,
        bestVolume: Math.max(config.bestVolume ?? 0, totalVolume),
        bestEstimated1RM: Math.max(config.bestEstimated1RM ?? 0, estimated1RM),
      },
    };
  }
  if (progressType === 'quality_score') {
    const q = update?.qualityValue ?? log.qualityRating;
    if (!q) return skill;
    const averageQuality = config.averageQuality ? (config.averageQuality + q) / 2 : q;
    return { ...skill, metricConfig: { ...config, metricType: progressType, averageQuality } };
  }
  if (progressType === 'state_based') {
    const stateValue = update?.stateValue ?? legacy?.stateValue
      ?? (config.stateMetric && log.stateSnapshot ? (log.stateSnapshot as any)[config.stateMetric] : undefined);
    if (typeof stateValue !== 'number' || Number.isNaN(stateValue)) return skill;
    const averageStateValue = config.averageStateValue ? (config.averageStateValue + stateValue) / 2 : stateValue;
    return { ...skill, metricConfig: { ...config, metricType: progressType, averageStateValue } };
  }
  if (progressType === 'money_based') {
    const currentAmount = (update?.newCurrentAmount ?? legacy?.newCurrentAmount) != null
      ? (update?.newCurrentAmount ?? legacy?.newCurrentAmount ?? 0)
      : (config.currentAmount ?? 0) + (update?.amountAdded ?? legacy?.amountAdded ?? 0);
    return { ...skill, metricConfig: { ...config, metricType: progressType, currentAmount } };
  }
  if (progressType === 'binary') {
    return { ...skill, metricConfig: { ...config, metricType: progressType, completed: update?.markCompleted ?? legacy?.completed ?? true } };
  }
  return skill;
}

/**
 * Recompute a skill's cached progress fields from scratch using all remaining
 * execution logs. Called after any log deletion so that skill progress bars,
 * completedHours, totalXP, bestValue etc. stay in sync (single source of truth).
 *
 * Resets all accumulator fields to 0, then re-applies each log in chronological
 * order — identical logic to the add path but starting from zero.
 *
 * Special cases:
 *  • frequency — only counts logs from the current ISO week (Mon-Sun) to match
 *    the "completedThisWeek" semantics.
 *  • All other types — all remaining logs applied in full.
 */
function recomputeSkillFromLogs(skill: Skill, logsForSkill: ExecutionLog[]): Skill {
  const type = progressTypeForSkill(skill);

  // Current ISO-week Monday in "YYYY-MM-DD"
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const mondayOffset = (now.getDay() + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - mondayOffset);
  const weekStartStr = monday.toISOString().slice(0, 10);

  const logsToApply = type === 'frequency'
    ? logsForSkill.filter((l) => l.date >= weekStartStr)
    : logsForSkill;

  const sorted = logsToApply
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  // Zero out all accumulated fields
  const zeroed: Skill = {
    ...skill,
    totalXP: 0,
    completedHours: 0,
    completedThisWeek: 0,
    currentValue: 0,
    metricConfig: skill.metricConfig
      ? {
          ...skill.metricConfig,
          completedHours:    0,
          completedThisWeek: 0,
          currentValue:      0,
          currentAmount:     0,
          bestValue:         0,
          bestEstimated1RM:  0,
          bestVolume:        0,
          currentBest:       0,
          averageQuality:    0,
          averageStateValue: 0,
          completed:         false,
        }
      : undefined,
  };

  // Re-apply every remaining log
  return sorted.reduce(
    (s, log) => applyExecutionLogToSkillProgress(s, { ...log, appliedToProgress: false }),
    zeroed,
  );
}

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);
  // 标记是否已经完成首次加载, 防止 loading 阶段意外写盘把已有数据覆盖成空.
  const loadedRef = useRef(false);
  const dataRef = useRef(data);
  dataRef.current = data;

  // 启动时从 AsyncStorage 读取
  useEffect(() => {
    loadData().then((d) => {
      const integrity = validateAppDataIntegrity(d);
      const repaired = integrity.ok ? d : repairAppDataIntegrity(d);
      if (!integrity.ok) {
        console.warn('[coreFlow] integrity issues detected on load', integrity.issues);
      }
      dataRef.current = repaired;
      setData(repaired);
      setLoading(false);
      loadedRef.current = true;
      if (!integrity.ok) persist(repaired, {
        base: d,
        source: 'store.hydration_repair',
        operation: 'repair_after_load',
        hydrationStatus: 'hydrated',
      });
      // 启动后重新排所有技能提醒 (防系统清掉)
      rescheduleAllReminders(repaired.skills).catch((e) => console.warn('[notify] reschedule failed', e));
    });
  }, []);

  /** 通用 mutation helper: 同时更新 React state 和 AsyncStorage. */
  const mutate = useCallback((fn: (d: AppData) => AppData, source = 'store.mutation') => {
    const caller = new Error().stack?.split('\n').slice(2, 5).join(' | ');
    const base = dataRef.current;
    const next = fn(base);
    if (next === base) return;

    dataRef.current = next;
    setData(next);
    if (!shouldPersistStoreMutation(loadedRef.current)) return;

    // fire-and-forget; web commit 本身同步, native commit 由 storage queue 串行化.
    persist(next, {
      base,
      source,
      caller,
      operation: 'mutation',
      hydrationStatus: 'hydrated',
    }).then((committed) => {
      setData((current) => {
        const reconciled = reconcileCommittedAppData(next, committed, current);
        dataRef.current = reconciled;
        return reconciled;
      });
    }).catch(() => {});
  }, []);

  // Data mutations persist through mutate(); this effect only queues server sync.
  useEffect(() => {
    if (loadedRef.current) {
      scheduleServerSync(data);
    }
  }, [data]);

  useEffect(() => installPersistenceDebugBridge({
    getStoreData: () => dataRef.current,
    readPersistedData: readPersistedDataForDebug,
  }), []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== 'questlife.v1' || !event.newValue || !loadedRef.current) return;
      try {
        const incoming = JSON.parse(event.newValue) as AppData;
        const previous = event.oldValue ? JSON.parse(event.oldValue) as AppData : undefined;
        const merged = previous
          ? reconcileExternalAppData(previous, incoming, dataRef.current)
          : incoming;
        const integrity = validateAppDataIntegrity(merged);
        const next = integrity.ok ? merged : repairAppDataIntegrity(merged);
        dataRef.current = next;
        setData(next);
      } catch (error) {
        console.warn('[persist] cross-tab merge failed', error);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const addGoal: Ctx['addGoal'] = useCallback((g) => {
    const goal: Goal = {
      id: uid(),
      createdAt: Date.now(),
      completed: false,
      skillIds: g.skillIds ?? [],
      ...g,
    };
    mutate((d) => ({ ...d, goals: [...d.goals, goal] }));
    trackEvent('goal_created', {
      goalType: (goal as any).goalType,
      hasVision: !!(goal as any).vision,
      hasTargetDate: !!(goal as any).targetDate,
    }, { page: 'store' });
    return goal;
  }, [mutate]);

  const updateGoal: Ctx['updateGoal'] = useCallback((id, patch) => {
    mutate((d) => ({
      ...d,
      goals: d.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)),
    }));
  }, [mutate]);

  const deleteGoal: Ctx['deleteGoal'] = useCallback((id) => {
    mutate((d) => {
      const toDelete = new Set<string>([id]);
      let changed = true;
      while (changed) {
        changed = false;
        d.goals.forEach((g) => {
          if (g.parentId && toDelete.has(g.parentId) && !toDelete.has(g.id)) {
            toDelete.add(g.id);
            changed = true;
          }
        });
      }
      return {
        ...d,
        goals: d.goals.filter((g) => !toDelete.has(g.id)),
        actions: d.actions.filter((a) => !a.goalId || !toDelete.has(a.goalId)),
      };
    });
  }, [mutate]);

  // ───── Category mutations ─────
  const addCategory: Ctx['addCategory'] = useCallback((c) => {
    const cat: Category = { id: uid(), createdAt: Date.now(), ...c };
    mutate((d) => ({ ...d, categories: [...d.categories, cat] }));
    trackEvent('goal_created', {
      goalType: cat.goalType,
      hasVision: !!cat.vision,
      hasTargetDate: !!cat.targetDate,
    }, { page: 'store' });
    return cat;
  }, [mutate]);

  const updateCategory: Ctx['updateCategory'] = useCallback((id, patch) => {
    mutate((d) => ({
      ...d,
      categories: d.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }, [mutate]);

  const applyDomainTemplateToGoal: Ctx['applyDomainTemplateToGoal'] = useCallback((goalId, templateId) => {
    const selectedTemplate = DOMAIN_TEMPLATES.find((item) => item.id === templateId);
    if (!selectedTemplate) return undefined;
    let result = { createdModuleIds: [] as string[], createdSkillIds: [] as string[], createdLinkIds: [] as string[], skippedExisting: [] as string[], modulesCreated: 0, skillsCreated: 0, linksCreated: 0 };
    mutate((d) => {
      const goal = d.categories.find((item) => item.id === goalId);
      if (!goal) return d;
      const lang = d.settings.language ?? 'zh';
      const structure = createGoalStructureFromTemplate(selectedTemplate, { id: goalId, language: lang });
      const existingModuleNames = new Set((d.modules || []).filter((module) => module.goalId === goalId).map((module) => module.name.trim().toLowerCase()));
      const existingSkillNames = new Set((d.skills || []).map((skill) => skill.name.trim().toLowerCase()));
      const modulesToAdd = structure.modules
        .filter((module) => {
          const exists = existingModuleNames.has(module.name.trim().toLowerCase());
          if (exists) result.skippedExisting.push(`module:${module.name}`);
          return !exists;
        })
        .map((module) => ({ ...module, createdAt: Date.now() } as QuestModule));
      const moduleByTemplateId = new Map<string, string>();
      structure.modules.forEach((templateModule) => {
        const existing = (d.modules || []).find((module) => module.goalId === goalId && module.name.trim().toLowerCase() === templateModule.name.trim().toLowerCase());
        moduleByTemplateId.set(templateModule.moduleTemplateId ?? templateModule.id, existing?.id ?? templateModule.id);
      });
      const moduleByGeneratedId = new Map(structure.modules.map((module) => [module.id, moduleByTemplateId.get(module.moduleTemplateId ?? module.id) ?? module.id]));
      const skillIdByTemplateId = new Map<string, string>();
      const skillsToAdd = structure.skills
        .filter((skill) => {
          const exists = existingSkillNames.has(skill.name.trim().toLowerCase());
          if (exists) result.skippedExisting.push(`skill:${skill.name}`);
          return !exists;
        })
        .map((skill) => {
          skillIdByTemplateId.set(skill.skillTemplateId ?? skill.id, skill.id);
          return { ...skill, createdAt: Date.now(), totalXP: 0 } as Skill;
        });
      structure.skills.forEach((templateSkill) => {
        const existing = (d.skills || []).find((skill) => skill.name.trim().toLowerCase() === templateSkill.name.trim().toLowerCase());
        if (existing) skillIdByTemplateId.set(templateSkill.skillTemplateId ?? templateSkill.id, existing.id);
      });
      const existingLinkKeys = new Set((d.moduleSkillLinks || []).map((link) => `${link.moduleId}:${link.skillId}`));
      const linksToAdd = structure.links.flatMap((link) => {
        const moduleId = moduleByGeneratedId.get(link.moduleId) ?? link.moduleId;
        const skillTemplateId = link.skillId.split(`${selectedTemplate.id}-`).pop() ?? link.skillId;
        const skillId = skillIdByTemplateId.get(skillTemplateId) ?? link.skillId;
        const key = `${moduleId}:${skillId}`;
        if (!moduleId || !skillId || existingLinkKeys.has(key)) return [];
        existingLinkKeys.add(key);
        return [{ ...link, id: uid(), goalId, moduleId, skillId, createdAt: Date.now() } as ModuleSkillLink];
      });
      const outcomeCriteria = [
        ...(goal.outcomeCriteria || []),
        ...(selectedTemplate.defaultOutcomeCriteria || [])
          .filter((criterion) => !(goal.outcomeCriteria || []).some((existing) => existing.id === criterion.id))
          .map((criterion) => ({
            id: criterion.id,
            title: lang === 'en' ? criterion.label : criterion.labelZh,
            metricType: criterion.metricType as any,
            currentValue: 0,
            targetValue: criterion.targetValue,
            unit: criterion.unit,
            weight: criterion.weight ?? 25,
          })),
      ];
      result = {
        ...result,
        createdModuleIds: modulesToAdd.map((module) => module.id),
        createdSkillIds: skillsToAdd.map((skill) => skill.id),
        createdLinkIds: linksToAdd.map((link) => link.id),
        modulesCreated: modulesToAdd.length,
        skillsCreated: skillsToAdd.length,
        linksCreated: linksToAdd.length,
      };
      return {
        ...d,
        categories: d.categories.map((item) => item.id === goalId ? {
          ...item,
          domain: selectedTemplate.domain,
          domainTemplateId: selectedTemplate.id,
          progressModel: templateProgressModel(selectedTemplate),
          outcomeCriteria,
        } : item),
        modules: [...(d.modules || []), ...modulesToAdd],
        skills: [...d.skills, ...skillsToAdd],
        moduleSkillLinks: [...(d.moduleSkillLinks || []), ...linksToAdd],
      };
    });
    trackEvent('domain_template_applied', {
      domain: selectedTemplate.domain,
      moduleCount: result.modulesCreated,
      skillCount: result.skillsCreated,
      hasOutcomeCriteria: !!selectedTemplate.defaultOutcomeCriteria?.length,
    }, { page: 'store' });
    trackEvent('template_structure_applied', {
      domain: selectedTemplate.domain,
      createdModules: result.modulesCreated,
      createdSkills: result.skillsCreated,
      skippedExisting: result.skippedExisting.length,
    }, { page: 'store' });
    return result;
  }, [mutate]);

  const deleteCategory: Ctx['deleteCategory'] = useCallback((id, mode) => {
    mutate((d) => {
      const childSkillIds = new Set((d.moduleSkillLinks || []).filter((l) => l.goalId === id).map((l) => l.skillId));
      if (mode === 'cascade') {
        return {
          ...d,
          categories: d.categories.filter((c) => c.id !== id),
          modules: (d.modules || []).filter((m) => m.goalId !== id),
          moduleSkillLinks: (d.moduleSkillLinks || []).filter((l) => l.goalId !== id),
          skills: d.skills,
          actions: d.actions,
        };
      }
      // transfer: 子技能挪到"未分类"; 若 "未分类" 不存在则现场建一个
      const hasUncat = d.categories.some((c) => c.id === UNCATEGORIZED_ID);
      const categories: Category[] = hasUncat
        ? d.categories
        : [
            {
              id: UNCATEGORIZED_ID,
              name: '未分类',
              emoji: '📦',
              goalType: 'custom',
              vision: '',
              description: '尚未归入大目标的技能',
              progressModel: 'criteria_weighted',
              outcomeCriteria: [],
              createdAt: Date.now(),
            },
            ...d.categories,
          ];
      return {
        ...d,
        categories: categories.filter((c) => c.id !== id),
        modules: (d.modules || []).filter((m) => m.goalId !== id),
        moduleSkillLinks: (d.moduleSkillLinks || []).filter((l) => l.goalId !== id),
        skills: d.skills.map((s) =>
          childSkillIds.has(s.id) ? { ...s, categoryId: UNCATEGORIZED_ID } : s
        ),
      };
    });
  }, [mutate]);

  const addModule: Ctx['addModule'] = useCallback((m) => {
    const mod: QuestModule = { id: uid(), createdAt: Date.now(), ...m };
    mutate((d) => ({ ...d, modules: [...(d.modules || []), mod] }));
    const goal = data.categories.find((item) => item.id === mod.goalId);
    trackEvent('module_created', {
      goalType: goal?.goalType,
    }, { page: 'store' });
    return mod;
  }, [data.categories, mutate]);

  const updateModule: Ctx['updateModule'] = useCallback((id, patch) => {
    mutate((d) => ({
      ...d,
      modules: (d.modules || []).map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }));
  }, [mutate]);

  const deleteModule: Ctx['deleteModule'] = useCallback((id) => {
    mutate((d) => ({
      ...d,
      modules: (d.modules || []).filter((m) => m.id !== id),
      moduleSkillLinks: (d.moduleSkillLinks || []).filter((l) => l.moduleId !== id),
    }));
  }, [mutate]);

  const addModuleSkillLink: Ctx['addModuleSkillLink'] = useCallback((l) => {
    const link: ModuleSkillLink = { id: uid(), createdAt: Date.now(), ...l };
    let created: ModuleSkillLink | undefined;
    mutate((d) => {
      const exists = (d.moduleSkillLinks || []).some((item) => item.moduleId === l.moduleId && item.skillId === l.skillId);
      if (exists) return d;
      created = link;
      return { ...d, moduleSkillLinks: [...(d.moduleSkillLinks || []), link] };
    });
    const skill = data.skills.find((item) => item.id === l.skillId);
    if (created) {
      trackEvent('skill_linked_to_module', {
        metricType: metricTypeForAnalytics(skill),
        taskType: skill?.taskType,
      }, { page: 'store' });
    }
    return created;
  }, [data.skills, mutate]);

  const removeModuleSkillLink: Ctx['removeModuleSkillLink'] = useCallback((id) => {
    mutate((d) => ({
      ...d,
      moduleSkillLinks: (d.moduleSkillLinks || []).filter((l) => l.id !== id),
    }));
  }, [mutate]);

  const addSkill: Ctx['addSkill'] = useCallback((s) => {
    const skill: Skill = { id: uid(), createdAt: Date.now(), totalXP: 0, ...s };
    mutate((d) => ({ ...d, skills: [...d.skills, skill] }));
    scheduleSkillReminder(skill).catch((e) => console.warn('[notify] schedule failed', e));
    trackEvent('skill_created', {
      taskType: skill.taskType,
      metricType: metricTypeForAnalytics(skill),
      hasScheduleEnabled: !!skill.scheduleEnabled,
    }, { page: 'store' });
    return skill;
  }, [mutate]);

  const addExistingSkillToModule: Ctx['addExistingSkillToModule'] = useCallback((goalId, moduleId, skillId) => (
    addModuleSkillLink({ goalId, moduleId, skillId, role: 'primary' })
  ), [addModuleSkillLink]);

  const removeSkillFromModule: Ctx['removeSkillFromModule'] = useCallback((moduleId, skillId) => {
    mutate((d) => ({
      ...d,
      moduleSkillLinks: (d.moduleSkillLinks || []).filter((l) => !(l.moduleId === moduleId && l.skillId === skillId)),
    }));
  }, [mutate]);

  const createSkillAndAttachToModule: Ctx['createSkillAndAttachToModule'] = useCallback((goalId, moduleId, s) => {
    const skill: Skill = { id: uid(), createdAt: Date.now(), totalXP: 0, ...s };
    const link: ModuleSkillLink = { id: uid(), createdAt: Date.now(), goalId, moduleId, skillId: skill.id, role: 'primary' };
    mutate((d) => ({
      ...d,
      skills: [...d.skills, skill],
      moduleSkillLinks: [...(d.moduleSkillLinks || []), link],
    }));
    scheduleSkillReminder(skill).catch((e) => console.warn('[notify] schedule failed', e));
    trackEvent('skill_created', {
      taskType: skill.taskType,
      metricType: metricTypeForAnalytics(skill),
      hasScheduleEnabled: !!skill.scheduleEnabled,
    }, { page: 'store' });
    trackEvent('skill_linked_to_module', {
      metricType: metricTypeForAnalytics(skill),
      taskType: skill.taskType,
    }, { page: 'store' });
    return skill;
  }, [mutate]);

  const updateSkill: Ctx['updateSkill'] = useCallback((id, patch) => {
    mutate((d) => {
      const next = {
        ...d,
        skills: d.skills.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      };
      const updated = next.skills.find((s) => s.id === id);
      if (updated) {
        scheduleSkillReminder(updated).catch((e) => console.warn('[notify] reschedule failed', e));
      }
      return next;
    });
  }, [mutate]);

  const deleteSkillFromLibrary: Ctx['deleteSkillFromLibrary'] = useCallback((id) => {
    mutate((d) => {
      const deletedSkill = d.skills.find((s) => s.id === id);
      return {
        ...d,
        skills: d.skills.filter((s) => s.id !== id),
        modules: (d.modules || []).map((m: any) => (
          Array.isArray(m.skillIds)
            ? { ...m, skillIds: m.skillIds.filter((sid: string) => sid !== id) }
            : m
        )),
        moduleSkillLinks: (d.moduleSkillLinks || []).filter((l) => l.skillId !== id),
        goals: d.goals.map((g) => ({ ...g, skillIds: g.skillIds.filter((sid) => sid !== id) })),
        categories: d.categories.map((c) => ({
          ...c,
          outcomeCriteria: (c.outcomeCriteria || []).map((criterion) => (
            criterion.linkedSkillId === id ? { ...criterion, linkedSkillId: undefined } : criterion
          )),
        })),
        // Keep manual blocks as calendar records, but detach the deleted skill. Skill-rule blocks belong
        // to the skill itself, so removing the skill removes those generated projections.
        scheduleBlocks: (d.scheduleBlocks || [])
          .filter((b) => !(b.linkedSkillId === id && b.source === 'skill_rule'))
          .map((b) => (b.linkedSkillId === id ? { ...b, linkedSkillId: undefined, source: b.source ?? 'manual' } : b)),
        // Preserve history records, but detach the deleted skill id so Today/Insights never dereference
        // a missing skill object. Empty skillIds are safe and simply stop contributing to skill charts.
        actions: d.actions.map((a) => ({ ...a, skillIds: a.skillIds.filter((sid) => sid !== id) })),
        executionLogs: (d.executionLogs || []).map((log) => (
          log.linkedSkillId === id
            ? { ...log, linkedSkillId: undefined, orphanedSkillName: log.orphanedSkillName ?? deletedSkill?.name }
            : log
        )),
        effortUnits: (d.effortUnits || []).map((unit) => (
          unit.primarySkillId === id ? { ...unit, primarySkillId: undefined, updatedAt: new Date().toISOString() } : unit
        )),
        contributionLinks: (d.contributionLinks || []).filter((link) => !(link.targetType === 'skill' && link.targetId === id)),
      };
    });
    cancelSkillReminder(id).catch((e) => console.warn('[notify] cancel failed', e));
  }, [mutate]);

  const deleteSkill: Ctx['deleteSkill'] = deleteSkillFromLibrary;

  const addAction: Ctx['addAction'] = useCallback((a) => {
    const action: Action = {
      id: uid(),
      createdAt: Date.now(),
      date: a.date ?? today(),
      ...a,
    };
    mutate((d) => ({
      ...d,
      actions: [...d.actions, action],
      skills: d.skills.map((s) =>
        action.skillIds.includes(s.id) ? { ...s, totalXP: s.totalXP + action.minutes } : s
      ),
    }));
    return action;
  }, [mutate]);

  const deleteAction: Ctx['deleteAction'] = useCallback((id) => {
    mutate((d) => {
      const target = d.actions.find((a) => a.id === id);
      if (!target) return d;
      return {
        ...d,
        actions: d.actions.filter((a) => a.id !== id),
        skills: d.skills.map((s) =>
          target.skillIds.includes(s.id)
            ? { ...s, totalXP: Math.max(0, s.totalXP - target.minutes) }
            : s
        ),
      };
    });
  }, [mutate]);

  const createExecutionLog: Ctx['createExecutionLog'] = useCallback((logData) => {
    const scheduleBlockId = logData.linkedScheduleBlockId ?? logData.scheduleBlockId;
    const scheduleBlock = scheduleBlockId ? (data.scheduleBlocks || []).find((block) => block.id === scheduleBlockId) : undefined;
    const requestedSkillId = logData.linkedSkillId ?? logData.skillId ?? scheduleBlock?.linkedSkillId;
    const firstRequestedLink = requestedSkillId
      ? (data.moduleSkillLinks || []).find((link) => link.skillId === requestedSkillId)
      : undefined;
    const requestedGoalId = logData.linkedGoalId ?? logData.goalId ?? scheduleBlock?.linkedGoalId ?? firstRequestedLink?.goalId;
    const requestedModuleId = logData.linkedModuleId ?? logData.moduleId ?? firstRequestedLink?.moduleId;
    const log: ExecutionLog = {
      id: logData.id ?? uid(),
      createdAt: logData.createdAt ?? new Date().toISOString(),
      appliedToProgress: logData.appliedToProgress ?? false,
      ...logData,
      date: logData.date ?? today(),
      durationMinutes: Math.max(0, Math.round(logData.durationMinutes ?? scheduleBlock?.plannedMinutes ?? 0)),
      source: logData.source ?? (scheduleBlockId ? 'schedule_log' : 'manual'),
      linkedSkillId: requestedSkillId,
      linkedGoalId: requestedGoalId,
      linkedModuleId: requestedModuleId,
      linkedScheduleBlockId: scheduleBlockId,
    };
    const linkedSkillForTracking = log.linkedSkillId ? data.skills.find((s) => s.id === log.linkedSkillId) : undefined;
    const firstLinkForTracking = log.linkedSkillId
      ? (data.moduleSkillLinks || []).find((l) => l.skillId === log.linkedSkillId)
      : undefined;
    const trackingLog: ExecutionLog = {
      ...log,
      predictionDelta: log.predictionDelta ?? calculatePredictionDelta(log),
      linkedGoalId: log.linkedGoalId ?? firstLinkForTracking?.goalId,
      linkedModuleId: log.linkedModuleId ?? firstLinkForTracking?.moduleId,
      taskType: log.taskType ?? linkedSkillForTracking?.taskType,
      metricUpdate: {
        metricType: linkedSkillForTracking?.metricConfig?.metricType ?? linkedSkillForTracking?.progressType ?? log.metricUpdate?.metricType ?? log.progressUpdate?.progressType ?? 'none',
        ...log.metricUpdate,
      },
    };
    let derivedEffortUnits: EffortUnit[] = [];
    let derivedContributionLinks: ContributionLink[] = [];
    mutate((d) => {
      const linkedSkill = log.linkedSkillId ? d.skills.find((s) => s.id === log.linkedSkillId) : undefined;
      const firstLink = log.linkedSkillId
        ? (d.moduleSkillLinks || []).find((l) => l.skillId === log.linkedSkillId)
        : undefined;
      const normalizedLog: ExecutionLog = {
        ...log,
        predictionDelta: log.predictionDelta ?? calculatePredictionDelta(log),
        linkedGoalId: log.linkedGoalId ?? firstLink?.goalId,
        linkedModuleId: log.linkedModuleId ?? firstLink?.moduleId,
        orphanedSkillName: log.linkedSkillId && !linkedSkill ? log.orphanedSkillName ?? log.title : log.orphanedSkillName,
        taskType: log.taskType ?? linkedSkill?.taskType,
        progressUpdate: {
          progressType: linkedSkill?.metricConfig?.metricType ?? linkedSkill?.progressType ?? log.progressUpdate?.progressType,
          ...log.progressUpdate,
        },
        metricUpdate: {
          metricType: linkedSkill?.metricConfig?.metricType ?? linkedSkill?.progressType ?? log.metricUpdate?.metricType ?? log.progressUpdate?.progressType ?? 'none',
          ...log.metricUpdate,
        },
      };
      if ((d.executionLogs || []).some((existing) => existing.id === normalizedLog.id)) {
        return d;
      }
      const linkedGoal = normalizedLog.linkedGoalId
        ? (d.categories || []).find((goal) => goal.id === normalizedLog.linkedGoalId)
        : undefined;
      const linkedModule = normalizedLog.linkedModuleId
        ? (d.modules || []).find((module) => module.id === normalizedLog.linkedModuleId)
        : undefined;
      const linkedScheduleBlock = normalizedLog.linkedScheduleBlockId
        ? (d.scheduleBlocks || []).find((block) => block.id === normalizedLog.linkedScheduleBlockId)
        : undefined;
      derivedEffortUnits = [];
      derivedContributionLinks = [];
      const alreadyDerived = (d.effortUnits || []).some((unit) => unit.executionLogId === normalizedLog.id);
      if (!alreadyDerived) {
        try {
          const effortContext = {
            skill: linkedSkill,
            goal: linkedGoal,
            module: linkedModule,
            scheduleBlock: linkedScheduleBlock,
            allGoals: d.categories || [],
            allSkills: d.skills || [],
            allModules: d.modules || [],
            links: d.moduleSkillLinks || [],
          };
          derivedEffortUnits = createEffortUnitsFromExecutionLog(normalizedLog, effortContext);
          const existingContributionKeys = new Set(
            (d.contributionLinks || []).map((link) => `${link.effortUnitId}:${link.targetType}:${link.targetId}:${link.reasonCode}`)
          );
          derivedContributionLinks = derivedEffortUnits.flatMap((effortUnit) => (
            generateContributionLinks(effortUnit, effortContext)
          )).filter((link) => {
            const key = `${link.effortUnitId}:${link.targetType}:${link.targetId}:${link.reasonCode}`;
            if (existingContributionKeys.has(key)) return false;
            existingContributionKeys.add(key);
            return true;
          });
        } catch (error) {
          console.warn('[effort] failed to derive effort units from execution log', error);
          derivedEffortUnits = [];
          derivedContributionLinks = [];
        }
      }
      const appliedSkills = d.skills.map((skill) => (
        normalizedLog.linkedSkillId === skill.id && !normalizedLog.appliedToProgress
          ? applyExecutionLogToSkillProgress(skill, normalizedLog)
          : skill
      ));
      const touchedSkillId = normalizedLog.linkedSkillId;
      const touchedModuleIds = new Set((d.moduleSkillLinks || [])
        .filter((link) => !touchedSkillId || link.skillId === touchedSkillId)
        .map((link) => link.moduleId));
      const updatedModules = (d.modules || []).map((module) => {
        if (!touchedModuleIds.has(module.id)) return module;
        const moduleSkills = skillsForModule(module.id, appliedSkills, d.moduleSkillLinks || []);
        return { ...module, progress: calculateModuleProgress(module, moduleSkills, d.moduleSkillLinks || []) };
      });
      return {
        ...d,
        executionLogs: [...(d.executionLogs || []), { ...normalizedLog, appliedToProgress: !!normalizedLog.linkedSkillId }],
        effortUnits: [...(d.effortUnits || []), ...derivedEffortUnits],
        contributionLinks: [...(d.contributionLinks || []), ...derivedContributionLinks],
        skills: appliedSkills,
        modules: updatedModules,
        scheduleBlocks: (d.scheduleBlocks || []).map((block) => (
          normalizedLog.linkedScheduleBlockId === block.id
            ? { ...block, status: 'completed' }
            : block
        )),
      };
    });
    derivedEffortUnits.forEach((effortUnit) => {
      trackEvent('effort_unit_created', {
        effortType: effortUnit.effortType,
        metricFamily: effortUnit.metricFamily,
        hasComparableKey: !!effortUnit.comparableKey,
        hasDerivedMetrics: Object.values(effortUnit.derived || {}).some((value) => value != null),
      }, { page: 'store' });
    });
    if (derivedContributionLinks.length > 0) {
      trackEvent('contribution_links_created', {
        count: derivedContributionLinks.length,
        hasDirect: derivedContributionLinks.some((link) => link.contributionType === 'direct'),
        hasIndirect: derivedContributionLinks.some((link) => link.contributionType === 'indirect'),
        hasSupporting: derivedContributionLinks.some((link) => link.contributionType === 'supporting'),
      }, { page: 'store' });
    }
    if (trackingLog.domainTemplateId && trackingLog.structuredData) {
      trackEvent('domain_schema_log_saved', {
        domain: trackingLog.domain,
        fieldCount: Object.keys(trackingLog.structuredData).length,
        effortType: derivedEffortUnits[0]?.effortType,
        metricFamily: derivedEffortUnits[0]?.metricFamily,
      }, { page: 'store' });
    }
    trackEvent('core_flow_log_created', {
      source: trackingLog.source,
      hasSkill: !!trackingLog.linkedSkillId,
      hasGoal: !!trackingLog.linkedGoalId,
      hasModule: !!trackingLog.linkedModuleId,
      hasScheduleBlock: !!trackingLog.linkedScheduleBlockId,
      hasStructuredData: !!trackingLog.structuredData,
      derivedEffortUnitCount: derivedEffortUnits.length,
      contributionLinkCount: derivedContributionLinks.length,
    }, { page: 'store' });
    const metricType = trackingLog.metricUpdate?.metricType;
    trackEvent('execution_log_saved', {
      source: trackingLog.source,
      durationMinutes: safeNumber(trackingLog.durationMinutes),
      qualityRating: safeNumber(trackingLog.qualityRating),
      metricType,
      hasPrediction: trackingLog.predictedDurationMinutes != null || trackingLog.predictedQualityRating != null,
      hasScheduleBlock: !!trackingLog.linkedScheduleBlockId,
    }, { page: 'store' });
    trackEvent('structured_log_saved', {
      metricType,
      taskType: trackingLog.taskType,
      hasPrediction: trackingLog.predictedDurationMinutes != null
        || trackingLog.predictedQualityRating != null
        || trackingLog.predictionData != null,
      hasQuality: trackingLog.qualityRating != null || trackingLog.metricUpdate?.qualityValue != null,
      hasPerformanceData: !!trackingLog.metricUpdate?.performanceData || trackingLog.metricUpdate?.performanceValue != null,
    }, { page: 'store' });
    if (trackingLog.predictedDurationMinutes != null || trackingLog.predictedQualityRating != null || trackingLog.predictionData != null) {
      trackEvent('prediction_saved', {
        metricType,
        taskType: trackingLog.taskType,
        predictedDurationMinutes: safeNumber(trackingLog.predictedDurationMinutes),
        predictedQualityRating: safeNumber(trackingLog.predictedQualityRating),
        hasQualityPrediction: trackingLog.predictedQualityRating != null,
        hasDurationPrediction: trackingLog.predictedDurationMinutes != null,
        hasPerformancePrediction: !!trackingLog.predictionData?.strength,
      }, { page: 'store' });
    }
    if (trackingLog.source === 'one_tap' || trackingLog.source === 'one_tap_done') {
      trackEvent('one_tap_completed', {
        durationMinutes: safeNumber(trackingLog.durationMinutes),
        taskType: trackingLog.taskType,
        metricType,
      }, { page: 'store' });
    }
    return log;
  }, [data.moduleSkillLinks, data.skills, mutate]);

  const updateExecutionLog: Ctx['updateExecutionLog'] = useCallback((id, patch) => {
    mutate((d) => ({
      ...d,
      // First version intentionally does not reverse/reapply progress deltas when editing logs.
      // This avoids double-counting; future edit history can add reversible progress accounting.
      executionLogs: (d.executionLogs || []).map((log) => (
        log.id === id ? { ...log, ...patch, updatedAt: new Date().toISOString() } : log
      )),
    }));
  }, [mutate]);

  const deleteExecutionLog: Ctx['deleteExecutionLog'] = useCallback((id) => {
    mutate((d) => {
      const removedLog = (d.executionLogs || []).find((log) => log.id === id);
      const logIdsToRemove = new Set([id]);
      const remainingLogs = (d.executionLogs || []).filter((log) => log.id !== id);
      const derived = removeDerivedForLogs(d, logIdsToRemove);

      // Recompute the linked skill's progress from all remaining logs so that
      // skill bars / completedHours / totalXP stay in sync (single source of truth).
      let skills = d.skills;
      if (removedLog?.linkedSkillId) {
        const affectedSkill = d.skills.find((s) => s.id === removedLog.linkedSkillId);
        if (affectedSkill) {
          const skillLogs = remainingLogs.filter((l) => l.linkedSkillId === removedLog.linkedSkillId);
          const recomputed = recomputeSkillFromLogs(affectedSkill, skillLogs);
          skills = d.skills.map((s) => (s.id === removedLog.linkedSkillId ? recomputed : s));
        }
      }

      return {
        ...d,
        skills,
        executionLogs: remainingLogs,
        effortUnits: derived.effortUnits,
        contributionLinks: derived.contributionLinks,
      };
    });
  }, [mutate]);

  const getExecutionLogsByDate: Ctx['getExecutionLogsByDate'] = useCallback((date) => (
    (data.executionLogs || []).filter((log) => log.date === date)
  ), [data.executionLogs]);

  const getExecutionLogsBySkill: Ctx['getExecutionLogsBySkill'] = useCallback((skillId) => (
    (data.executionLogs || []).filter((log) => log.linkedSkillId === skillId)
  ), [data.executionLogs]);

  const getExecutionLogsByGoal: Ctx['getExecutionLogsByGoal'] = useCallback((goalId) => {
    const goalSkillIds = new Set((data.moduleSkillLinks || []).filter((l) => l.goalId === goalId).map((l) => l.skillId));
    return (data.executionLogs || []).filter((log) => (
      log.linkedGoalId === goalId || (!!log.linkedSkillId && goalSkillIds.has(log.linkedSkillId))
    ));
  }, [data.executionLogs, data.moduleSkillLinks]);

  const getExecutionLogsByScheduleBlock: Ctx['getExecutionLogsByScheduleBlock'] = useCallback((blockId) => (
    (data.executionLogs || []).filter((log) => log.linkedScheduleBlockId === blockId)
  ), [data.executionLogs]);

  const createRescueLog: Ctx['createRescueLog'] = useCallback((logData) => {
    const log: RescueLog = {
      id: logData.id ?? uid(),
      createdAt: logData.createdAt ?? new Date().toISOString(),
      source: 'brain_off_rescue',
      ...logData,
    };
    mutate((d) => ({ ...d, rescueLogs: [...(d.rescueLogs || []), log] }));
    return log;
  }, [mutate]);

  const updateRescueLog: Ctx['updateRescueLog'] = useCallback((id, patch) => {
    mutate((d) => ({
      ...d,
      rescueLogs: (d.rescueLogs || []).map((log) => (
        log.id === id ? { ...log, ...patch, updatedAt: new Date().toISOString() } : log
      )),
    }));
  }, [mutate]);

  const completeRescueStep: Ctx['completeRescueStep'] = useCallback((id, bodyAction) => {
    mutate((d) => ({
      ...d,
      rescueLogs: (d.rescueLogs || []).map((log) => (
        log.id === id ? { ...log, bodyAction, rescueStepCompleted: true, updatedAt: new Date().toISOString() } : log
      )),
    }));
  }, [mutate]);

  const completeActivationStep: Ctx['completeActivationStep'] = useCallback((id, activationAction) => {
    mutate((d) => ({
      ...d,
      rescueLogs: (d.rescueLogs || []).map((log) => (
        log.id === id
          ? { ...log, activationAction, activationStepCompleted: true, completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
          : log
      )),
    }));
  }, [mutate]);

  const getRescueLogsByDate: Ctx['getRescueLogsByDate'] = useCallback((date) => (
    (data.rescueLogs || []).filter((log) => log.date === date)
  ), [data.rescueLogs]);

  const getRescueLogsThisWeek: Ctx['getRescueLogsThisWeek'] = useCallback(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const start = new Date(now);
    start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
    return (data.rescueLogs || []).filter((log) => log.date >= startStr);
  }, [data.rescueLogs]);

  const getActiveUnfinishedRescue: Ctx['getActiveUnfinishedRescue'] = useCallback(() => (
    (data.rescueLogs || []).slice().reverse().find((log) => !log.activationStepCompleted)
  ), [data.rescueLogs]);

  const createStateCheckIn: Ctx['createStateCheckIn'] = useCallback((checkIn) => {
    const row: StateCheckIn = {
      id: checkIn.id ?? uid(),
      createdAt: checkIn.createdAt ?? new Date().toISOString(),
      ...checkIn,
    };
    mutate((d) => ({ ...d, stateCheckIns: [...(d.stateCheckIns || []), row] }));
    return row;
  }, [mutate]);

  const updateStateCheckIn: Ctx['updateStateCheckIn'] = useCallback((id, patch) => {
    mutate((d) => ({
      ...d,
      stateCheckIns: (d.stateCheckIns || []).map((row) => (
        row.id === id ? { ...row, ...patch, updatedAt: new Date().toISOString() } : row
      )),
    }));
  }, [mutate]);

  const deleteStateCheckIn: Ctx['deleteStateCheckIn'] = useCallback((id) => {
    mutate((d) => ({ ...d, stateCheckIns: (d.stateCheckIns || []).filter((row) => row.id !== id) }));
  }, [mutate]);

  const getStateCheckInsByDate: Ctx['getStateCheckInsByDate'] = useCallback((date) => (
    (data.stateCheckIns || []).filter((row) => row.date === date)
  ), [data.stateCheckIns]);

  const getLatestStateCheckIn: Ctx['getLatestStateCheckIn'] = useCallback((date) => {
    const rows = (data.stateCheckIns || []).filter((row) => !date || row.date === date);
    return rows.slice().sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
  }, [data.stateCheckIns]);

  const getStateCheckInsThisWeek: Ctx['getStateCheckInsThisWeek'] = useCallback(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const start = new Date(now);
    start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
    return (data.stateCheckIns || []).filter((row) => row.date >= startStr);
  }, [data.stateCheckIns]);

  const getAverageStateByTimeBlock: Ctx['getAverageStateByTimeBlock'] = useCallback((days) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - Math.max(1, days));
    const rows = (data.stateCheckIns || []).filter((row) => new Date(row.timestamp) >= cutoff && row.timeBlock);
    const totals = rows.reduce<Record<string, { sum: number; count: number }>>((acc, row) => {
      const key = row.timeBlock ?? 'unknown';
      const existing = acc[key] ?? { sum: 0, count: 0 };
      acc[key] = { sum: existing.sum + row.overall, count: existing.count + 1 };
      return acc;
    }, {});
    return Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, value.count > 0 ? value.sum / value.count : 0]));
  }, [data.stateCheckIns]);

  const addContextLogs: Ctx['addContextLogs'] = useCallback((logs) => {
    const now = new Date().toISOString();
    const rows: ContextLog[] = logs
      .filter((log) => log && log.label && log.type)
      .map((log) => ({
        id: log.id ?? uid(),
        createdAt: log.createdAt ?? now,
        source: log.source ?? 'manual',
        ...log,
      }));
    if (rows.length > 0) {
      mutate((d) => ({ ...d, contextLogs: [...(d.contextLogs || []), ...rows] }));
    }
    return rows;
  }, [mutate]);

  const addContextLog: Ctx['addContextLog'] = useCallback((log) => (
    addContextLogs([log])[0]
  ), [addContextLogs]);

  const deleteContextLog: Ctx['deleteContextLog'] = useCallback((id) => {
    mutate((d) => ({ ...d, contextLogs: (d.contextLogs || []).filter((log) => log.id !== id) }));
  }, [mutate]);

  const addScheduleBlock: Ctx['addScheduleBlock'] = useCallback((b) => {
    const block: ScheduleBlock = { id: uid(), createdAt: Date.now(), ...b };
    mutate((d) => ({ ...d, scheduleBlocks: [...(d.scheduleBlocks || []), block] }));
    trackEvent('schedule_block_created', {
      source: block.source,
      taskType: block.taskType,
      hasLinkedSkill: !!block.linkedSkillId,
      plannedMinutes: safeNumber(block.plannedMinutes),
    }, { page: 'store' });
    return block;
  }, [mutate]);

  const updateScheduleBlock: Ctx['updateScheduleBlock'] = useCallback((id, patch) => {
    mutate((d) => ({
      ...d,
      scheduleBlocks: (d.scheduleBlocks || []).map((b) => (b.id === id ? { ...b, ...patch } : b)),
    }));
  }, [mutate]);

  const deleteScheduleBlock: Ctx['deleteScheduleBlock'] = useCallback((id) => {
    mutate((d) => ({
      ...d,
      scheduleBlocks: (d.scheduleBlocks || []).filter((b) => b.id !== id),
    }));
  }, [mutate]);

  const setSettings: Ctx['setSettings'] = useCallback((s) => {
    mutate((d) => ({ ...d, settings: { ...d.settings, ...s } }));
  }, [mutate]);

  const updateDashboardPreferences: Ctx['updateDashboardPreferences'] = useCallback((patch) => {
    mutate((d) => {
      const current = normalizeDashboardPreferences(d.settings.dashboardPreferences);
      return {
        ...d,
        settings: {
          ...d.settings,
          dashboardPreferences: {
            ...current,
            ...patch,
            todayCards: patch.todayCards ?? current.todayCards,
            insightsCards: patch.insightsCards ?? current.insightsCards,
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
  }, [mutate]);

  const setDashboardPreset: Ctx['setDashboardPreset'] = useCallback((presetId) => {
    mutate((d) => ({
      ...d,
      settings: {
        ...d.settings,
        dashboardPreferences: buildDashboardPreferencesForPreset(presetId),
      },
    }));
  }, [mutate]);

  const setDashboardCardVisibility: Ctx['setDashboardCardVisibility'] = useCallback((surface, cardId, visible) => {
    mutate((d) => {
      const prefs = normalizeDashboardPreferences(d.settings.dashboardPreferences);
      const key = surface === 'today' ? 'todayCards' : 'insightsCards';
      return {
        ...d,
        settings: {
          ...d.settings,
          dashboardPreferences: {
            ...prefs,
            [key]: prefs[key].map((card) => (card.cardId === cardId ? { ...card, visible } : card)),
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
  }, [mutate]);

  const moveDashboardCard: Ctx['moveDashboardCard'] = useCallback((surface, cardId, direction) => {
    mutate((d) => {
      const prefs = normalizeDashboardPreferences(d.settings.dashboardPreferences);
      const key = surface === 'today' ? 'todayCards' : 'insightsCards';
      const cards = [...prefs[key]].sort((a, b) => a.order - b.order);
      const index = cards.findIndex((card) => card.cardId === cardId);
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      if (index < 0 || swapIndex < 0 || swapIndex >= cards.length) return d;
      const currentOrder = cards[index].order;
      cards[index] = { ...cards[index], order: cards[swapIndex].order };
      cards[swapIndex] = { ...cards[swapIndex], order: currentOrder };
      return {
        ...d,
        settings: {
          ...d.settings,
          dashboardPreferences: {
            ...prefs,
            [key]: cards.sort((a, b) => a.order - b.order),
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
  }, [mutate]);

  const setDashboardCardSize: Ctx['setDashboardCardSize'] = useCallback((surface, cardId, size) => {
    mutate((d) => {
      const prefs = normalizeDashboardPreferences(d.settings.dashboardPreferences);
      const key = surface === 'today' ? 'todayCards' : 'insightsCards';
      return {
        ...d,
        settings: {
          ...d.settings,
          dashboardPreferences: {
            ...prefs,
            [key]: prefs[key].map((card) => (card.cardId === cardId ? { ...card, size } : card)),
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
  }, [mutate]);

  const resetDashboardLayout: Ctx['resetDashboardLayout'] = useCallback((surface = 'all') => {
    mutate((d) => {
      const current = normalizeDashboardPreferences(d.settings.dashboardPreferences);
      const defaults = buildDashboardPreferencesForPreset(current.activePreset);
      return {
        ...d,
        settings: {
          ...d.settings,
          dashboardPreferences: surface === 'today'
            ? { ...current, todayCards: defaults.todayCards, updatedAt: new Date().toISOString() }
            : surface === 'insights'
              ? { ...current, insightsCards: defaults.insightsCards, updatedAt: new Date().toISOString() }
              : defaults,
        },
      };
    });
  }, [mutate]);

  const runIntegrityCheck: Ctx['runIntegrityCheck'] = useCallback(() => {
    const result = validateAppDataIntegrity(data);
    trackEvent('integrity_check_run', {
      issueCount: result.issues.length,
      orphanSkillCount: result.orphanSkills.length,
      orphanLogCount: result.orphanLogs.length,
      orphanEffortUnitCount: result.orphanEffortUnits.length,
      orphanContributionLinkCount: result.orphanContributionLinks.length,
    }, { page: 'settings' });
    return result;
  }, [data]);

  const repairSafeIntegrityIssues: Ctx['repairSafeIntegrityIssues'] = useCallback(() => {
    let result = validateAppDataIntegrity(data);
    mutate((d) => {
      const repaired = repairAppDataIntegrity(d);
      result = validateAppDataIntegrity(repaired);
      return repaired;
    });
    return result;
  }, [data, mutate]);

  // ── Spec B-1: Smart Capture Loop ────────────────────────────────────────────
  const addRawCapture: Ctx['addRawCapture'] = useCallback((text: string): RawCapture => {
    const capture: RawCapture = {
      id: `rc-${uid()}`,
      text,
      createdAt: new Date().toISOString(),
      parseStatus: 'pending',
    };
    mutate((d) => ({ ...d, rawCaptures: [...(d.rawCaptures || []), capture] }));
    return capture;
  }, [mutate]);

  const updateRawCapture: Ctx['updateRawCapture'] = useCallback((id: string, patch: Partial<RawCapture>) => {
    mutate((d) => ({
      ...d,
      rawCaptures: (d.rawCaptures || []).map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }, [mutate]);

  const deleteRawCapture: Ctx['deleteRawCapture'] = useCallback((id: string, options) => {
    mutate((d) => {
      const linkedLogIds = getLinkedExecutionLogIdsForCapture(d.executionLogs || [], id);
      if (!options?.deleteLinkedExecutionLogs || linkedLogIds.size === 0) {
        return {
          ...d,
          rawCaptures: (d.rawCaptures || []).filter((c) => c.id !== id),
        };
      }

      // Collect affected skill IDs before removing logs
      const affectedSkillIds = new Set(
        (d.executionLogs || [])
          .filter((log) => linkedLogIds.has(log.id) && log.linkedSkillId)
          .map((log) => log.linkedSkillId as string),
      );

      const remainingLogs = (d.executionLogs || []).filter((log) => !linkedLogIds.has(log.id));
      const derived = removeDerivedForLogs(d, linkedLogIds);

      // Recompute each affected skill from remaining logs
      let skills = d.skills;
      if (affectedSkillIds.size > 0) {
        skills = d.skills.map((s) => {
          if (!affectedSkillIds.has(s.id)) return s;
          const skillLogs = remainingLogs.filter((l) => l.linkedSkillId === s.id);
          return recomputeSkillFromLogs(s, skillLogs);
        });
      }

      return {
        ...d,
        skills,
        rawCaptures: (d.rawCaptures || []).filter((c) => c.id !== id),
        executionLogs: remainingLogs,
        effortUnits: derived.effortUnits,
        contributionLinks: derived.contributionLinks,
      };
    });
  }, [mutate]);

  const rebuildDerivedData: Ctx['rebuildDerivedData'] = useCallback(() => {
    let counts = { effortUnitCount: 0, contributionLinkCount: 0 };
    mutate((d) => {
      const rebuilt = rebuildDerivedDataFromLogs(d);
      counts = {
        effortUnitCount: (rebuilt.effortUnits || []).length,
        contributionLinkCount: (rebuilt.contributionLinks || []).length,
      };
      return rebuilt;
    });
    trackEvent('derived_data_rebuilt', {
      logCount: (data.executionLogs || []).length,
      effortUnitCount: counts.effortUnitCount,
      contributionLinkCount: counts.contributionLinkCount,
    }, { page: 'settings' });
    return counts;
  }, [data.executionLogs, mutate]);

  const addDecisionResult: Ctx['addDecisionResult'] = useCallback((input) => {
    const result: DecisionResult = {
      id: input.id ?? `decision-${uid()}`,
      createdAt: input.createdAt ?? new Date().toISOString(),
      ...input,
    };
    mutate((d) => ({
      ...d,
      decisionResults: compactDecisionResults([result, ...(d.decisionResults || []).filter((item) => item.id !== result.id)]),
    }));
    return result;
  }, [mutate]);

  const updateDecisionResultFeedback: Ctx['updateDecisionResultFeedback'] = useCallback((id, rating) => {
    mutate((d) => ({
      ...d,
      decisionResults: (d.decisionResults || []).map((result) => (
        result.id === id
          ? { ...result, userFeedback: { rating, ts: new Date().toISOString() } }
          : result
      )),
    }));
  }, [mutate]);

  const deleteDecisionResult: Ctx['deleteDecisionResult'] = useCallback((id) => {
    mutate((d) => ({
      ...d,
      decisionResults: (d.decisionResults || []).filter((result) => result.id !== id),
    }));
  }, [mutate]);

  const mergePatternMemoryCandidates: Ctx['mergePatternMemoryCandidates'] = useCallback((candidates) => {
    let merged: PatternMemory[] = [];
    mutate((d) => {
      merged = mergePatternCandidateList(d.patternMemory || [], candidates || []);
      return { ...d, patternMemory: merged };
    });
    return merged;
  }, [mutate]);

  const updatePatternMemoryStatus: Ctx['updatePatternMemoryStatus'] = useCallback((id, status) => {
    mutate((d) => ({
      ...d,
      patternMemory: (d.patternMemory || []).map((pattern) => (
        pattern.id === id ? { ...pattern, status, updatedAt: new Date().toISOString() } : pattern
      )),
    }));
  }, [mutate]);

  return (
    <StoreContext.Provider
      value={{
        data,
        loading,
        addGoal,
        updateGoal,
        deleteGoal,
        addCategory,
        updateCategory,
        applyDomainTemplateToGoal,
        deleteCategory,
        addModule,
        updateModule,
        deleteModule,
        addModuleSkillLink,
        removeModuleSkillLink,
        addExistingSkillToModule,
        removeSkillFromModule,
        createSkillAndAttachToModule,
        deleteSkillFromLibrary,
        addSkill,
        updateSkill,
        deleteSkill,
        addAction,
        deleteAction,
        createExecutionLog,
        updateExecutionLog,
        deleteExecutionLog,
        getExecutionLogsByDate,
        getExecutionLogsBySkill,
        getExecutionLogsByGoal,
        getExecutionLogsByScheduleBlock,
        createRescueLog,
        updateRescueLog,
        completeRescueStep,
        completeActivationStep,
        getRescueLogsByDate,
        getRescueLogsThisWeek,
        getActiveUnfinishedRescue,
        createStateCheckIn,
        updateStateCheckIn,
        deleteStateCheckIn,
        getStateCheckInsByDate,
        getLatestStateCheckIn,
        getStateCheckInsThisWeek,
        getAverageStateByTimeBlock,
        addContextLog,
        addContextLogs,
        deleteContextLog,
        addScheduleBlock,
        updateScheduleBlock,
        deleteScheduleBlock,
        setSettings,
        updateDashboardPreferences,
        setDashboardPreset,
        setDashboardCardVisibility,
        moveDashboardCard,
        setDashboardCardSize,
        resetDashboardLayout,
        runIntegrityCheck,
        repairSafeIntegrityIssues,
        rebuildDerivedData,
        addDecisionResult,
        updateDecisionResultFeedback,
        deleteDecisionResult,
        mergePatternMemoryCandidates,
        updatePatternMemoryStatus,
        addRawCapture,
        updateRawCapture,
        deleteRawCapture,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
