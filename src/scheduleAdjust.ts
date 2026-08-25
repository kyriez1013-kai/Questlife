import { ScheduleBlock, Skill, TaskType } from './types';

export interface ExecutionState {
  energy: number;
  focus: number;
  mood: number;
  health: 'normal' | 'tired' | 'sick' | 'recovery' | 'high';
}

export interface BlockRecommendation {
  adjustedMinutes: number;
  adjustmentLabel: string;
  reason: string;
  intensity: 'minimum' | 'reduced' | 'normal' | 'challenge' | 'protected';
}

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  deep_study: '深度学习',
  light_review: '轻复习',
  strength_training: '力量训练',
  cardio_recovery: '恢复/轻运动',
  admin: '行政事务',
  life_maintenance: '生活维持',
  creative_building: '创造/搭建',
};

export const SKILL_PROFILE_DEFAULTS: Record<TaskType, {
  mentalCost: number;
  physicalCost: number;
  emotionalCost: number;
  recoveryImpact: number;
  compressibility: number;
}> = {
  deep_study: { mentalCost: 80, physicalCost: 10, emotionalCost: 40, recoveryImpact: 20, compressibility: 70 },
  light_review: { mentalCost: 45, physicalCost: 5, emotionalCost: 25, recoveryImpact: 10, compressibility: 80 },
  strength_training: { mentalCost: 35, physicalCost: 85, emotionalCost: 30, recoveryImpact: 70, compressibility: 45 },
  cardio_recovery: { mentalCost: 15, physicalCost: 35, emotionalCost: 15, recoveryImpact: 20, compressibility: 60 },
  admin: { mentalCost: 50, physicalCost: 5, emotionalCost: 35, recoveryImpact: 10, compressibility: 60 },
  life_maintenance: { mentalCost: 20, physicalCost: 30, emotionalCost: 10, recoveryImpact: 10, compressibility: 15 },
  creative_building: { mentalCost: 75, physicalCost: 10, emotionalCost: 60, recoveryImpact: 30, compressibility: 65 },
};

export function endTimeFrom(start: string, duration: number) {
  const [h, m] = start.split(':').map(Number);
  const total = h * 60 + m + duration;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function generateScheduleBlocksFromSkills(skills: Skill[], dateRange: string[], existing: ScheduleBlock[] = []): ScheduleBlock[] {
  const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const exists = new Set(existing.map((b) => `${b.linkedSkillId ?? ''}|${b.date}|${b.startTime}|${b.source ?? 'manual'}`));
  const acceptedSkillRuleDates = new Set(existing
    .filter((block) => block.source === 'skill_rule' && block.linkedSkillId)
    .map((block) => `${block.linkedSkillId}|${block.date}`));
  const generated: ScheduleBlock[] = [];

  for (const skill of skills) {
    if (!skill.scheduleEnabled || skill.scheduleType === 'manual_only') continue;
    const taskType = skill.taskType ?? 'deep_study';
    const startTime = skill.defaultStartTime ?? '09:00';
    const plannedMinutes = skill.defaultDurationMinutes ?? skill.dailyTargetMinutes ?? 30;
    const dates = dateRange.filter((date, index) => {
      if (skill.scheduleType === 'daily') return true;
      if (skill.scheduleType === 'times_per_week') return index < (skill.timesPerWeek ?? 1);
      if (skill.scheduleType === 'weekly_days') {
        const d = new Date(`${date}T00:00:00`);
        return (skill.weeklyDays ?? []).includes(dayKeys[d.getDay()]);
      }
      return false;
    });

    for (const date of dates) {
      const key = `${skill.id}|${date}|${startTime}|skill_rule`;
      if (exists.has(key) || acceptedSkillRuleDates.has(`${skill.id}|${date}`)) continue;
      generated.push({
        id: `skill-rule-${skill.id}-${date}-${startTime}`,
        title: skill.name,
        date,
        startTime,
        endTime: endTimeFrom(startTime, plannedMinutes),
        plannedMinutes,
        linkedGoalId: skill.categoryId ?? skill.goalId ?? skill.linkedGoalIds?.[0],
        linkedGoalIds: skill.linkedGoalIds ?? (skill.categoryId ? [skill.categoryId] : undefined),
        linkedSkillId: skill.id,
        taskType,
        flexibility: skill.flexibility ?? 'flexible',
        rigidity: skill.rigidity ?? 'medium',
        status: 'planned',
        createdAt: skill.createdAt,
        source: 'skill_rule',
      });
    }
  }

  return generated;
}

export function adjustScheduleBlock(block: ScheduleBlock, state?: ExecutionState | null): BlockRecommendation {
  const current = state ?? { energy: 3, focus: 3, mood: 3, health: 'normal' as const };
  const original = block.plannedMinutes;
  const preserve = block.flexibility === 'fixed' || block.rigidity === 'high' || block.taskType === 'life_maintenance';
  const round = (factor: number) => Math.max(0, Math.round(original * factor));
  const normal: BlockRecommendation = {
    adjustedMinutes: original,
    adjustmentLabel: preserve ? 'protected' : 'normal',
    reason: preserve ? '固定/高刚性任务保留原计划，不随状态大幅压缩。' : '当前状态适合按原计划执行。',
    intensity: preserve ? 'protected' : 'normal',
  };

  if (preserve) return normal;

  if (block.taskType === 'deep_study') {
    if (current.health === 'sick' || current.health === 'recovery') {
      return { adjustedMinutes: round(0.3), adjustmentLabel: 'reduced', reason: '恢复优先，深度学习只保留最低推进。', intensity: 'minimum' };
    }
    if (current.energy <= 2 || current.focus <= 2) {
      return { adjustedMinutes: round(0.5), adjustmentLabel: 'reduced', reason: '当前专注/精力较低，建议降低认知负荷。', intensity: 'reduced' };
    }
    if (current.energy >= 4 && current.focus >= 4) {
      return { adjustedMinutes: round(1.15), adjustmentLabel: 'challenge', reason: '当前状态适合深度学习。', intensity: 'challenge' };
    }
  }

  if (block.taskType === 'strength_training') {
    if (current.health === 'sick') {
      return { adjustedMinutes: 0, adjustmentLabel: 'reduced', reason: '生病状态不建议高强度力量训练。', intensity: 'minimum' };
    }
    if (current.health === 'recovery' || current.energy <= 2) {
      return { adjustedMinutes: round(0.5), adjustmentLabel: 'reduced', reason: '降低训练强度，避免透支。', intensity: 'reduced' };
    }
    if (current.energy >= 4 && current.mood >= 4) {
      return { adjustedMinutes: round(1.1), adjustmentLabel: 'challenge', reason: '身体状态较好，可以小幅挑战。', intensity: 'challenge' };
    }
  }

  if (block.taskType === 'creative_building') {
    if (current.focus <= 2 || current.mood <= 2) {
      return { adjustedMinutes: round(0.5), adjustmentLabel: 'reduced', reason: '当前专注/情绪较低，适合降低创造负荷。', intensity: 'reduced' };
    }
    if (current.energy >= 4 && current.focus >= 4 && current.mood >= 4) {
      return { adjustedMinutes: round(1.2), adjustmentLabel: 'challenge', reason: '当前状态适合推进创造/搭建任务。', intensity: 'challenge' };
    }
  }

  if (block.taskType === 'admin' && current.focus <= 2) {
    return { adjustedMinutes: round(0.7), adjustmentLabel: 'reduced', reason: '当前专注较低，行政任务可缩短或移到稍后。', intensity: 'reduced' };
  }

  if (block.taskType === 'light_review' && (current.energy <= 2 || current.focus <= 2 || current.health !== 'normal')) {
    return { adjustedMinutes: round(current.health === 'sick' || current.health === 'recovery' ? 0.5 : 0.7), adjustmentLabel: 'reduced', reason: '保留复习节奏，不强求高强度。', intensity: 'reduced' };
  }

  if (block.taskType === 'cardio_recovery' && (current.health !== 'normal' || current.energy <= 2)) {
    return { adjustedMinutes: original, adjustmentLabel: 'protected', reason: '轻运动可作为恢复任务。', intensity: 'protected' };
  }

  return normal;
}
