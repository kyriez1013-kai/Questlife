import { AppData, ContextLog, ExecutionLog } from '../types';
import { buildObjectiveContextBrief } from './objectiveContextBrief';
import { buildMetacognitionSummary, getLiveExecutionLogs } from './metacognition';
import { DecisionBriefInput, DecisionMode, DecisionTrigger } from './decisionTypes';

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function safeCreatedAt(value?: string | number) {
  if (typeof value === 'number') return new Date(value).toISOString();
  return typeof value === 'string' ? value : '';
}

function recentContextLogs(contextLogs: ContextLog[], now: Date) {
  const cutoff = now.getTime() - 48 * 60 * 60 * 1000;
  return (contextLogs || [])
    .filter((log) => {
      const time = new Date(log.createdAt ?? log.date ?? 0).getTime();
      return Number.isFinite(time) && time >= cutoff;
    })
    .sort((a, b) => safeCreatedAt(b.createdAt ?? b.date).localeCompare(safeCreatedAt(a.createdAt ?? a.date)))
    .slice(0, 20)
    .map((log) => ({
      date: log.date,
      type: log.type,
      label: log.label,
      value: typeof log.value === 'string' ? '[text]' : log.value,
      unit: log.unit,
      intensity: log.intensity,
      source: log.source,
    }));
}

function summarizeLog(log: ExecutionLog, data: AppData) {
  const skill = log.linkedSkillId ? data.skills.find((item) => item.id === log.linkedSkillId) : undefined;
  const goal = log.linkedGoalId ? data.categories.find((item) => item.id === log.linkedGoalId) : undefined;
  return {
    id: log.id,
    date: log.date,
    createdAt: log.createdAt,
    type: log.taskType ?? skill?.taskType ?? 'unknown',
    duration: log.durationMinutes > 0 ? log.durationMinutes : undefined,
    quality: log.qualityRating,
    difficulty: log.difficultyRating,
    linkedSkill: skill ? { id: skill.id, type: skill.taskType, progressType: skill.progressType } : undefined,
    linkedGoal: goal ? { id: goal.id, goalType: goal.goalType, domain: goal.domain } : undefined,
    afterStateDelta: (log.actualData as any)?.afterStateDelta,
  };
}

function buildSevenDayRows(logs: ExecutionLog[], data: AppData, now: Date) {
  const start = new Date(now);
  start.setDate(start.getDate() - 6);
  const rows: Array<Record<string, unknown>> = [];
  for (let i = 0; i < 7; i += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    const key = dateKey(day);
    const dayLogs = logs.filter((log) => log.date === key);
    rows.push({
      date: key,
      log_count: dayLogs.length,
      total_duration: dayLogs.reduce((sum, log) => sum + Math.max(0, log.durationMinutes || 0), 0),
      avg_quality: dayLogs.length > 0
        ? Number((dayLogs.reduce((sum, log) => sum + (log.qualityRating || 0), 0) / dayLogs.length).toFixed(2))
        : undefined,
      samples: dayLogs.slice(0, 5).map((log) => summarizeLog(log, data)),
    });
  }
  return rows;
}

function buildLast28Aggregate(logs: ExecutionLog[], now: Date) {
  const cutoff = now.getTime() - 28 * 24 * 60 * 60 * 1000;
  const recent = logs.filter((log) => {
    const time = new Date(log.createdAt ?? log.date ?? 0).getTime();
    return Number.isFinite(time) && time >= cutoff;
  });
  const byTask: Record<string, number> = {};
  recent.forEach((log) => {
    const key = log.taskType ?? 'unknown';
    byTask[key] = (byTask[key] || 0) + 1;
  });
  return {
    log_count: recent.length,
    total_duration: recent.reduce((sum, log) => sum + Math.max(0, log.durationMinutes || 0), 0),
    task_type_counts: byTask,
  };
}

export function buildDecisionPayload(
  data: AppData,
  options: { mode?: DecisionMode; trigger?: DecisionTrigger; now?: Date } = {},
): DecisionBriefInput {
  const now = options.now ?? new Date();
  const liveLogs = getLiveExecutionLogs(data.executionLogs || [], { skills: data.skills || [] });
  const objectiveContextBrief = buildObjectiveContextBrief(data.contextLogs || [], now);
  const metacognition = buildMetacognitionSummary({
    executionLogs: liveLogs,
    stateCheckIns: data.stateCheckIns || [],
    skills: data.skills || [],
    goals: data.categories || [],
    contextLogs: data.contextLogs || [],
    now,
  });
  const latestState = (data.stateCheckIns || [])
    .slice()
    .sort((a, b) => (b.timestamp ?? b.createdAt ?? '').localeCompare(a.timestamp ?? a.createdAt ?? ''))[0];
  const today = dateKey(now);

  return {
    mode: options.mode ?? 'daily_brief',
    trigger: options.trigger ?? 'debug',
    now: now.toISOString(),
    current_state: latestState ? {
      timestamp: latestState.timestamp,
      overall: latestState.overall,
      energy: latestState.energy,
      focus: latestState.focus,
      mood: latestState.mood,
      physical: latestState.physical,
      stress: latestState.stress,
      label: latestState.label,
    } : null,
    today_context: {
      objective_context_brief: objectiveContextBrief,
      recent_context_logs: recentContextLogs(data.contextLogs || [], now),
      latest_sleep_minutes: objectiveContextBrief.metrics.sleepMinutes,
      hrv: objectiveContextBrief.metrics.hrv,
      resting_heart_rate: objectiveContextBrief.metrics.restingHeartRate,
      steps: objectiveContextBrief.metrics.steps,
      workout_minutes: objectiveContextBrief.metrics.workoutMinutes,
      caffeine_count: objectiveContextBrief.metrics.caffeineCount,
    },
    profile: {
      active_goals: (data.categories || []).slice(0, 12).map((goal) => ({
        id: goal.id,
        goalType: goal.goalType,
        domain: goal.domain,
        progressModel: goal.progressModel,
        moduleCount: (data.modules || []).filter((module) => module.goalId === goal.id).length,
        skillCount: (data.skills || []).filter((skill) => skill.categoryId === goal.id || skill.goalId === goal.id || (skill.linkedGoalIds || []).includes(goal.id)).length,
      })),
      modules: (data.modules || []).slice(0, 20).map((module) => ({ id: module.id, goalId: module.goalId, progress: module.progress })),
      skills: (data.skills || []).slice(0, 30).map((skill) => ({
        id: skill.id,
        goalId: skill.categoryId ?? skill.goalId,
        moduleId: skill.moduleId,
        taskType: skill.taskType,
        progressType: skill.progressType,
        unit: skill.unit,
        currentValue: skill.currentValue,
        targetValue: skill.targetValue,
      })),
      known_baselines: {
        activeDays: new Set(liveLogs.map((log) => log.date)).size,
        avgDurationLast28: buildLast28Aggregate(liveLogs, now).total_duration / Math.max(1, buildLast28Aggregate(liveLogs, now).log_count),
      },
      confirmed_patterns: (metacognition.statePatterns.patterns || []).slice(0, 8).map((pattern) => ({
        type: pattern.patternType,
        confidence: pattern.confidence,
        labelValues: pattern.labelValues,
      })),
      chronotype: 'unknown',
    },
    history_index: {
      last_7_days: buildSevenDayRows(liveLogs, data, now),
      last_28_days: buildLast28Aggregate(liveLogs, now),
    },
    schedule_today: (data.scheduleBlocks || [])
      .filter((block) => block.date === today)
      .slice(0, 12)
      .map((block) => ({
        id: block.id,
        startTime: block.startTime,
        endTime: block.endTime,
        plannedMinutes: block.plannedMinutes,
        status: block.status,
        taskType: block.taskType,
        linkedSkillId: block.linkedSkillId,
        linkedGoalId: block.linkedGoalId,
        flexibility: block.flexibility,
        rigidity: block.rigidity,
      })),
  };
}
