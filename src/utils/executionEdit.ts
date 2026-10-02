import type { AppData, ExecutionLog } from '../types';
import { calculateModuleProgress, calculatePredictionDelta, skillsForModule } from '../progress';

export function applyExecutionLogPatch(data: AppData, id: string, patch: Partial<ExecutionLog>, updatedAt: string): AppData {
  const previous = data.executionLogs.find((log) => log.id === id);
  if (!previous) return data;
  const changedDuration = patch.durationMinutes !== undefined && patch.durationMinutes !== previous.durationMinutes;
  if (changedDuration && (!Number.isSafeInteger(patch.durationMinutes) || patch.durationMinutes! <= 0)) {
    throw new Error('invalid_execution_duration');
  }

  const duration = patch.durationMinutes ?? previous.durationMinutes;
  const next: ExecutionLog = {
    ...previous,
    ...patch,
    updatedAt,
    metricUpdate: changedDuration && previous.metricUpdate?.minutesAdded != null
      ? { ...previous.metricUpdate, minutesAdded: duration }
      : patch.metricUpdate ?? previous.metricUpdate,
    progressUpdate: changedDuration && previous.progressUpdate?.valueAdded != null
      ? { ...previous.progressUpdate, valueAdded: duration }
      : patch.progressUpdate ?? previous.progressUpdate,
    structuredData: changedDuration && typeof previous.structuredData?.durationMinutes === 'number'
      ? { ...previous.structuredData, durationMinutes: duration }
      : patch.structuredData ?? previous.structuredData,
  };
  if (changedDuration) next.predictionDelta = calculatePredictionDelta(next);
  const executionLogs = data.executionLogs.map((log) => log.id === id ? next : log);
  if (!changedDuration) return { ...data, executionLogs };

  const skills = data.skills.map((skill) => {
    if (skill.id !== previous.linkedSkillId || !previous.appliedToProgress) return skill;
    const metricType = skill.metricConfig?.metricType ?? skill.progressType ?? 'time_based';
    if (metricType !== 'time_based') return skill;
    const oldMinutes = previous.metricUpdate?.minutesAdded ?? previous.progressUpdate?.valueAdded ?? previous.durationMinutes;
    const config = skill.metricConfig ?? { metricType };
    const completedHours = Math.max(0, (config.completedHours ?? skill.completedHours ?? 0) + (duration - oldMinutes) / 60);
    return {
      ...skill,
      completedHours,
      totalXP: Math.max(0, skill.totalXP + duration - previous.durationMinutes),
      metricConfig: { ...config, completedHours },
    };
  });
  const touchedModules = new Set(data.moduleSkillLinks
    .filter((link) => link.skillId === previous.linkedSkillId)
    .map((link) => link.moduleId));
  const modules = data.modules.map((module) => {
    if (!touchedModules.has(module.id)) return module;
    return {
      ...module,
      progress: calculateModuleProgress(module, skillsForModule(module.id, skills, data.moduleSkillLinks), data.moduleSkillLinks),
    };
  });
  const effortUnits = data.effortUnits.map((unit) => unit.executionLogId === id ? {
    ...unit,
    raw: { ...unit.raw, durationMinutes: duration },
    derived: { ...unit.derived, effortScore: Math.max(1, duration) },
  } : unit);
  return { ...data, executionLogs, skills, modules, effortUnits };
}
