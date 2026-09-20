import type { ExecutionLog, Skill } from '../types';

/** Undo known additive contributions, never erase an owner's unrecorded baseline. */
export function removeExecutionProgress(skill: Skill, removed: ExecutionLog[]): Skill {
  const logs = removed.filter(log => log.linkedSkillId === skill.id && log.appliedToProgress === true);
  if (!logs.length) return skill;
  const type = skill.metricConfig?.metricType ?? skill.progressType ?? 'time_based';
  const config = skill.metricConfig ?? { metricType: type };
  if (type === 'time_based') {
    const hours = logs.reduce((n, log) => n + (log.metricUpdate?.minutesAdded ?? log.progressUpdate?.valueAdded ?? log.durationMinutes ?? 0) / 60, 0);
    const completedHours = Math.max(0, (config.completedHours ?? skill.completedHours ?? 0) - hours);
    return { ...skill, completedHours, totalXP: Math.max(0, skill.totalXP - logs.reduce((n, log) => n + log.durationMinutes, 0)), metricConfig: { ...config, completedHours } };
  }
  if (type === 'frequency') {
    const count = logs.reduce((n, log) => n + (log.metricUpdate?.countAdded ?? log.progressUpdate?.valueAdded ?? 1), 0);
    const completedThisWeek = Math.max(0, (config.completedThisWeek ?? skill.completedThisWeek ?? 0) - count);
    return { ...skill, completedThisWeek, metricConfig: { ...config, completedThisWeek } };
  }
  if (type === 'money_based' && logs.every(log => log.metricUpdate?.newCurrentAmount == null && log.progressUpdate?.newCurrentAmount == null)) {
    const amount = logs.reduce((n, log) => n + (log.metricUpdate?.amountAdded ?? log.progressUpdate?.amountAdded ?? 0), 0);
    return { ...skill, metricConfig: { ...config, currentAmount: (config.currentAmount ?? 0) - amount } };
  }
  // Historic maxima, averages, absolute amounts and completed flags have no
  // reversible baseline receipt. Preserve them; live evidence always uses logs.
  return skill;
}
