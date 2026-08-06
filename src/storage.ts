// 本地持久化层 - 全部基于 @react-native-async-storage/async-storage
// Web 平台会自动 fallback 到 localStorage; iOS/Android 写到原生本地存储.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppData, DEFAULT_DATA, Category, UNCATEGORIZED_ID, Skill, TaskType, ProgressType, QuestModule, ModuleSkillLink, ExecutionLog, RescueLog, StateCheckIn, ContextLog, DecisionResult, PatternMemory } from './types';
import { isPersistenceDebugEnabled, recordPersistenceTrace } from './utils/persistenceTrace';

export const APP_DATA_STORAGE_KEY = 'questlife.v1';
const KEY = APP_DATA_STORAGE_KEY;

export type PersistContext = {
  base?: AppData;
  source?: string;
  caller?: string;
  operation?: string;
  hydrationStatus?: 'loading' | 'hydrated' | 'unknown';
};

function parseStoredData(raw: string | null): AppData | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as AppData;
  } catch {
    return undefined;
  }
}

function readCurrentWebDataForTrace() {
  if (!isPersistenceDebugEnabled() || typeof window === 'undefined') return undefined;
  try {
    return parseStoredData(window.localStorage?.getItem(KEY));
  } catch {
    return undefined;
  }
}

export async function readPersistedDataForDebug(): Promise<AppData | undefined> {
  if (!isPersistenceDebugEnabled()) return undefined;
  return parseStoredData(await AsyncStorage.getItem(KEY));
}

function inferTaskType(name: string): TaskType {
  const n = name.toLowerCase();
  if (/python|sql|finance|study|学习|考试/.test(n)) return 'deep_study';
  if (/卧推|硬拉|深蹲|健身|gym|bench|deadlift|squat/.test(n)) return 'strength_training';
  if (/cook|cooking|做饭|吃饭|shower|洗澡|clean|清洁|打扫/.test(n)) return 'life_maintenance';
  return 'deep_study';
}

function inferProgressType(name: string): ProgressType {
  if (/卧推|硬拉|深蹲|健身|gym|bench|deadlift|squat/i.test(name)) return 'performance_log';
  return 'time_based';
}

function defaultModuleId(goalId: string) {
  return `module-${goalId}-default`;
}

function stableId(prefix: string, value: string) {
  const clean = value.toLowerCase().trim().replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, '-').replace(/^-|-$/g, '');
  return `${prefix}-${clean || 'item'}`;
}

function profileDefaults(type: TaskType) {
  const map = {
    deep_study: [80, 10, 40, 20, 70],
    light_review: [45, 5, 25, 10, 80],
    strength_training: [35, 85, 30, 70, 45],
    cardio_recovery: [15, 35, 15, 20, 60],
    admin: [50, 5, 35, 10, 60],
    life_maintenance: [20, 30, 10, 10, 15],
    creative_building: [75, 10, 60, 30, 65],
  } as const;
  const [mentalCost, physicalCost, emotionalCost, recoveryImpact, compressibility] = map[type];
  return { mentalCost, physicalCost, emotionalCost, recoveryImpact, compressibility };
}

function migrateSkill(s: any): Skill {
  const taskType = (s.taskType ?? inferTaskType(s.name ?? '')) as TaskType;
  const progressType = (s.metricConfig?.metricType ?? s.progressType ?? inferProgressType(s.name ?? '')) as ProgressType;
  const defaults = profileDefaults(taskType);
  const metricConfig = s.metricConfig ?? {
    metricType: progressType === 'curriculum' ? 'checklist' : progressType,
    unit: s.unit ?? (progressType === 'target_value' ? 'kg' : undefined),
    completedHours: s.completedHours ?? ((s.totalXP ?? 0) / 60),
    targetHours: s.targetHours ?? s.totalTargetHours ?? 100,
    currentValue: s.currentValue,
    targetValue: s.targetValue,
    completedThisWeek: s.completedThisWeek,
    weeklyTargetCount: s.weeklyTargetCount,
    checklistItems: s.curriculumItems ?? [],
    performanceType: taskType === 'strength_training' ? 'strength' : undefined,
    primaryMetric: taskType === 'strength_training' ? 'estimated_1rm' : undefined,
    trackVolume: taskType === 'strength_training' ? true : undefined,
    trackRPE: taskType === 'strength_training' ? true : undefined,
    useEstimated1RM: taskType === 'strength_training' ? true : undefined,
  };
  return {
    dailyTargetMinutes: 30,
    taskType,
    progressType,
    metricConfig,
    targetHours: s.targetHours ?? s.totalTargetHours ?? 100,
    completedHours: s.completedHours ?? ((s.totalXP ?? 0) / 60),
    unit: s.unit ?? (progressType === 'target_value' ? 'kg' : undefined),
    scheduleEnabled: false,
    scheduleType: 'manual_only',
    defaultStartTime: '09:00',
    defaultDurationMinutes: s.dailyTargetMinutes ?? 30,
    flexibility: 'flexible',
    rigidity: 'medium',
    linkedGoalIds: s.linkedGoalIds ?? (s.categoryId ? [s.categoryId] : undefined),
    ...defaults,
    ...s,
  };
}

function migrateCategory(c: any): Category {
  return {
    goalType: 'custom',
    vision: '',
    progressModel: 'criteria_weighted',
    outcomeCriteria: [],
    ...c,
  };
}

function migrateActionToExecutionLog(a: any, skills: Skill[]): ExecutionLog {
  const linkedSkillId = Array.isArray(a.skillIds) ? a.skillIds[0] : undefined;
  const skill = linkedSkillId ? skills.find((s) => s.id === linkedSkillId) : undefined;
  return {
    id: `exec-${a.id}`,
    date: a.date ?? today(),
    durationMinutes: a.minutes ?? 0,
    note: a.note,
    linkedSkillId,
    orphanedSkillName: linkedSkillId && !skill ? '已删除技能' : undefined,
    linkedGoalId: skill?.categoryId ?? a.goalId,
    source: 'quick_log',
    taskType: skill?.taskType,
    qualityRating: a.quality,
    progressUpdate: {
      progressType: skill?.metricConfig?.metricType ?? skill?.progressType,
      valueAdded: a.minutes ?? 0,
    },
    metricUpdate: {
      metricType: skill?.metricConfig?.metricType ?? skill?.progressType ?? 'time_based',
      minutesAdded: a.minutes ?? 0,
      qualityValue: a.quality,
    },
    appliedToProgress: true,
    createdAt: new Date(a.createdAt ?? Date.now()).toISOString(),
  };
}

function migrateRescueLog(log: any): RescueLog {
  return {
    id: log.id ?? stableId('rescue', `${log.startedAt ?? Date.now()}-${Math.random()}`),
    date: log.date ?? today(),
    startedAt: log.startedAt ?? log.createdAt ?? new Date().toISOString(),
    source: 'brain_off_rescue',
    createdAt: log.createdAt ?? log.startedAt ?? new Date().toISOString(),
    ...log,
  };
}

function migrateStateCheckIn(checkIn: any): StateCheckIn {
  return {
    id: checkIn.id ?? stableId('state', `${checkIn.timestamp ?? Date.now()}-${Math.random()}`),
    date: checkIn.date ?? today(),
    timestamp: checkIn.timestamp ?? checkIn.createdAt ?? new Date().toISOString(),
    overall: checkIn.overall ?? 3,
    createdAt: checkIn.createdAt ?? checkIn.timestamp ?? new Date().toISOString(),
    ...checkIn,
  };
}

function migrateContextLog(log: any): ContextLog | null {
  if (!log || typeof log !== 'object') return null;
  const createdAt = log.createdAt ?? new Date().toISOString();
  return {
    id: log.id ?? stableId('context', `${createdAt}-${Math.random()}`),
    date: log.date ?? today(),
    createdAt,
    type: log.type ?? 'custom',
    label: log.label ?? 'context',
    source: log.source ?? 'manual',
    ...log,
  };
}

function migrateDecisionResult(result: any): DecisionResult | null {
  if (!result || typeof result !== 'object') return null;
  const createdAt = result.createdAt ?? result.generatedAt ?? new Date().toISOString();
  return {
    id: result.id ?? stableId('decision', `${createdAt}-${Math.random()}`),
    createdAt,
    mode: result.mode === 'instant_micro' ? 'instant_micro' : 'daily_brief',
    trigger: ['state_checkin', 'manual', 'morning_push', 'debug'].includes(result.trigger) ? result.trigger : 'manual',
    source: ['ai', 'legacy_fallback', 'ai_failed_fallback'].includes(result.source) ? result.source : 'legacy_fallback',
    schemaVersion: result.schemaVersion ?? '1.0',
    headlineInsight: String(result.headlineInsight ?? result.headline_insight ?? '').slice(0, 240),
    ...result,
  };
}

function migratePatternMemory(pattern: any): PatternMemory | null {
  if (!pattern?.id || !pattern?.label) return null;
  const status = ['candidate', 'accepted', 'rejected', 'archived'].includes(pattern.status) ? pattern.status : 'candidate';
  const patternType = [
    'action_state_effect',
    'context_state_effect',
    'decision_feedback',
    'schedule_timing',
    'recovery_readiness',
    'execution_quality',
    'perception_gap',
    'other',
  ].includes(pattern.patternType) ? pattern.patternType : 'other';
  const evidenceBasis = ['personal_pattern', 'mixed', 'population_prior'].includes(pattern.evidenceBasis) ? pattern.evidenceBasis : 'mixed';
  const confidence = typeof pattern.confidence === 'number' && Number.isFinite(pattern.confidence) ? Math.max(0, Math.min(1, pattern.confidence)) : 0.25;
  return {
    id: String(pattern.id),
    createdAt: pattern.createdAt || new Date().toISOString(),
    updatedAt: pattern.updatedAt || pattern.createdAt || new Date().toISOString(),
    status,
    label: String(pattern.label).slice(0, 180),
    description: String(pattern.description || '').slice(0, 360),
    patternType,
    evidenceBasis,
    confidence,
    sampleN: Number.isFinite(Number(pattern.sampleN)) ? Math.max(0, Math.round(Number(pattern.sampleN))) : 0,
    support: Array.isArray(pattern.support) ? pattern.support.slice(0, 5).map((item: any) => ({
      sourceType: ['execution', 'state', 'context', 'decision_result', 'after_state'].includes(item?.sourceType) ? item.sourceType : 'execution',
      sourceId: item?.sourceId ? String(item.sourceId) : undefined,
      ts: item?.ts ? String(item.ts) : undefined,
      summary: String(item?.summary || '').slice(0, 120),
    })) : [],
    caution: pattern.caution ? String(pattern.caution).slice(0, 180) : undefined,
    lastSeenAt: pattern.lastSeenAt,
    usefulness: pattern.usefulness ? {
      usefulCount: Number(pattern.usefulness.usefulCount || 0),
      notUsefulCount: Number(pattern.usefulness.notUsefulCount || 0),
    } : undefined,
  };
}

export async function loadData(): Promise<AppData> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) {
      console.log('[persist] no saved data, starting fresh');
      return DEFAULT_DATA;
    }
    const parsed = JSON.parse(raw);
    const rawModules = parsed.modules || [];
    const migrated: AppData = {
      ...DEFAULT_DATA,
      ...parsed,
      categories: (parsed.categories || []).map(migrateCategory),
      modules: rawModules.map((m: any) => {
        const { skills: _skills, skillIds: _skillIds, ...moduleRest } = m;
        return moduleRest;
      }),
      moduleSkillLinks: parsed.moduleSkillLinks || [],
      executionLogs: parsed.executionLogs || [],
      effortUnits: parsed.effortUnits || [],
      contributionLinks: parsed.contributionLinks || [],
      rescueLogs: (parsed.rescueLogs || []).map(migrateRescueLog),
      stateCheckIns: (parsed.stateCheckIns || []).map(migrateStateCheckIn),
      contextLogs: (parsed.contextLogs || []).map(migrateContextLog).filter(Boolean) as ContextLog[],
      decisionResults: (parsed.decisionResults || []).map(migrateDecisionResult).filter(Boolean) as DecisionResult[],
      patternMemory: (parsed.patternMemory || []).map(migratePatternMemory).filter(Boolean) as PatternMemory[],
      scheduleBlocks: parsed.scheduleBlocks || [],
      settings: { ...DEFAULT_DATA.settings, ...(parsed.settings || {}) },
    };
    // V1 迁移: 给老 skill 补 dailyTargetMinutes 默认值; 旧 module.skills 对象也进入全局 Skill Library.
    const skillByName = new Map<string, Skill>();
    const seedSkills = (migrated.skills || []).map(migrateSkill);
    seedSkills.forEach((s) => skillByName.set((s.name || s.id).toLowerCase().trim(), s));
    rawModules.forEach((m: any) => {
      if (!Array.isArray(m.skills)) return;
      m.skills.forEach((rawSkill: any, index: number) => {
        const name = rawSkill?.name ?? rawSkill?.title ?? `${m.name ?? 'module'} skill ${index + 1}`;
        const key = String(name).toLowerCase().trim();
        if (skillByName.has(key)) return;
        const skill = migrateSkill({
          id: rawSkill.id ?? stableId('skill', `${m.goalId ?? 'goal'}-${m.id ?? 'module'}-${name}`),
          name,
          icon: rawSkill.icon,
          color: rawSkill.color ?? '#5DD39E',
          totalXP: rawSkill.totalXP ?? 0,
          categoryId: rawSkill.categoryId ?? m.goalId,
          goalId: rawSkill.goalId ?? m.goalId,
          moduleId: rawSkill.moduleId ?? m.id,
          ...rawSkill,
        });
        skillByName.set(key, skill);
      });
    });
    migrated.skills = Array.from(skillByName.values());
    // V2 迁移: 把没有 categoryId 的老 skill 自动挂到"未分类"分类下
    const orphanSkills = migrated.skills.filter((s) => !s.categoryId);
    if (orphanSkills.length > 0) {
      const hasUncat = migrated.categories.some((c) => c.id === UNCATEGORIZED_ID);
      if (!hasUncat) {
        const uncat: Category = {
          id: UNCATEGORIZED_ID,
          name: '未分类',
          emoji: '📦',
          goalType: 'custom',
          vision: '',
          description: '尚未归入大目标的技能',
          progressModel: 'criteria_weighted',
          outcomeCriteria: [],
          createdAt: Date.now(),
        };
        migrated.categories = [uncat, ...migrated.categories];
        console.log('[persist] migration: created 未分类 category for orphan skills');
      }
      migrated.skills = migrated.skills.map((s) =>
        s.categoryId ? s : { ...s, categoryId: UNCATEGORIZED_ID }
      );
    }
    // Growth Tree v1 migration: each category with skills gets one stable default module.
    const modules = [...(migrated.modules || [])] as QuestModule[];
    const moduleIds = new Set(modules.map((m) => m.id));
    const ensureDefaultModule = (goalId: string) => {
      const id = defaultModuleId(goalId);
      if (!moduleIds.has(id)) {
        const order = modules.filter((m) => m.goalId === goalId).length;
        modules.push({
          id,
          goalId,
          name: '默认模块',
          icon: '📁',
          order,
          createdAt: Date.now(),
        });
        moduleIds.add(id);
      }
      return id;
    };
    migrated.skills = migrated.skills.map((s) => {
      const goalId = s.categoryId ?? s.goalId ?? s.linkedGoalIds?.[0];
      if (!goalId) return s;
      const existingModule = s.moduleId && moduleIds.has(s.moduleId) ? s.moduleId : undefined;
      return existingModule ? s : { ...s, moduleId: ensureDefaultModule(goalId) };
    });
    migrated.modules = modules;
    const links = [...(migrated.moduleSkillLinks || [])] as ModuleSkillLink[];
    const linkKeys = new Set(links.map((l) => `${l.moduleId}:${l.skillId}`));
    const ensureLink = (goalId: string, moduleId: string, skillId: string, order: number) => {
      const key = `${moduleId}:${skillId}`;
      if (linkKeys.has(key)) return;
      links.push({
        id: `link-${moduleId}-${skillId}`,
        goalId,
        moduleId,
        skillId,
        role: 'primary',
        order,
        createdAt: Date.now(),
      });
      linkKeys.add(key);
    };
    migrated.skills.forEach((s, index) => {
      const goalIds = new Set<string>();
      if (s.categoryId) goalIds.add(s.categoryId);
      if (s.goalId) goalIds.add(s.goalId);
      (s.linkedGoalIds || []).forEach((id) => goalIds.add(id));
      goalIds.forEach((goalId) => {
        const moduleId = s.moduleId && moduleIds.has(s.moduleId) ? s.moduleId : ensureDefaultModule(goalId);
        ensureLink(goalId, moduleId, s.id, index);
      });
    });
    rawModules.forEach((m: any) => {
      const goalId = m.goalId;
      const moduleId = m.id;
      if (!goalId || !moduleId) return;
      if (Array.isArray(m.skillIds)) {
        m.skillIds.forEach((skillId: string, index: number) => ensureLink(goalId, moduleId, skillId, index));
      }
      if (Array.isArray(m.skills)) {
        m.skills.forEach((rawSkill: any, index: number) => {
          const name = String(rawSkill?.name ?? rawSkill?.title ?? '').toLowerCase().trim();
          const skill = name ? skillByName.get(name) : undefined;
          if (skill) ensureLink(goalId, moduleId, skill.id, index);
        });
      }
    });
    migrated.moduleSkillLinks = links;
    if ((migrated.executionLogs || []).length === 0 && (migrated.actions || []).length > 0) {
      migrated.executionLogs = migrated.actions.map((a) => migrateActionToExecutionLog(a, migrated.skills));
    }
    migrated.executionLogs = (migrated.executionLogs || []).map((log: any) => {
      const predictedDurationMinutes = log.predictedDurationMinutes
        ?? (typeof log.predictedMentalCost === 'number' && log.predictedMentalCost > 5 ? log.predictedMentalCost : undefined);
      const predictedQualityRating = log.predictedQualityRating;
      const predictionDelta = log.predictionDelta ?? (
        predictedDurationMinutes != null || predictedQualityRating != null
          ? {
              durationDeltaMinutes: log.durationMinutes != null && predictedDurationMinutes != null ? log.durationMinutes - predictedDurationMinutes : undefined,
              qualityDelta: log.qualityRating != null && predictedQualityRating != null ? log.qualityRating - predictedQualityRating : undefined,
            }
          : undefined
      );
      return {
        ...log,
        predictedDurationMinutes,
        predictionDelta,
      };
    });
    recordPersistenceTrace({
      storageKey: KEY,
      operation: 'load',
      source: 'storage.loadData',
      hydrationStatus: 'loading',
      previousPersisted: parsed as AppData,
      base: parsed as AppData,
      next: migrated,
    });
    console.log(
      `[persist] loaded: ${migrated.categories.length} categories, ${migrated.modules.length} modules, ${migrated.moduleSkillLinks.length} links, ${migrated.skills.length} skills, ${migrated.actions.length} actions, ${migrated.scheduleBlocks.length} schedule blocks, ${migrated.rescueLogs.length} rescue logs, ${migrated.stateCheckIns.length} state check-ins`
    );
    return migrated;
  } catch (e) {
    console.warn('[persist] loadData failed', e);
    return DEFAULT_DATA;
  }
}

/** 同步写入: 立刻把当前 AppData 序列化并 setItem.
 *  调用者通常不需要 await — 用 fire-and-forget 即可,
 *  但写失败会在 console 显示 [persist] 错误. */
export function persist(data: AppData, context: PersistContext = {}): Promise<void> {
  recordPersistenceTrace({
    storageKey: KEY,
    operation: context.operation || 'setItem',
    source: context.source,
    caller: context.caller,
    hydrationStatus: context.hydrationStatus,
    previousPersisted: readCurrentWebDataForTrace(),
    base: context.base,
    next: data,
  });
  return AsyncStorage.setItem(KEY, JSON.stringify(data))
    .then(() => {
      console.log(
        `[persist] saved: ${data.categories.length} categories, ${(data.modules || []).length} modules, ${(data.moduleSkillLinks || []).length} links, ${data.skills.length} skills, ${data.actions.length} actions, ${data.scheduleBlocks.length} schedule blocks, ${(data.rescueLogs || []).length} rescue logs, ${(data.stateCheckIns || []).length} state check-ins`
      );
    })
    .catch((e) => {
      console.warn('[persist] save FAILED — data may be lost on reload!', e);
      throw e;
    });
}

/** 用于完全清空 (调试用) */
export async function clearAll(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function today(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
