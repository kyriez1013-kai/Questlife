import { AppData, ContextLog, ExecutionLog, StateCheckIn } from '../types';
import { buildObjectiveContextBrief } from './objectiveContextBrief';
import { buildMetacognitionSummary, getLiveExecutionLogs } from './metacognition';
import { buildPostSaveFeedback } from './progressFeedback';
import { DecisionBriefInput, DecisionMode, DecisionTrigger } from './decisionTypes';

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function safeCreatedAt(value?: string | number) {
  if (typeof value === 'number') return new Date(value).toISOString();
  return typeof value === 'string' ? value : '';
}

function safeNumber(value: unknown): number | undefined {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function cutoffTime(now: Date, days: number) {
  return now.getTime() - days * 24 * 60 * 60 * 1000;
}

function safeTime(value?: string | number) {
  const time = new Date(value ?? 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function isWithinDays(value: string | number | undefined, now: Date, days: number) {
  const time = safeTime(value);
  return time > 0 && time >= cutoffTime(now, days);
}

function compactLabel(value?: string) {
  const text = String(value || '').trim();
  if (!text) return undefined;
  return text.length > 60 ? `${text.slice(0, 57)}...` : text;
}

function logLinkedLabels(log: ExecutionLog, data: AppData) {
  const skill = log.linkedSkillId ? data.skills.find((item) => item.id === log.linkedSkillId) : undefined;
  const goal = log.linkedGoalId ? data.categories.find((item) => item.id === log.linkedGoalId) : undefined;
  const module = log.linkedModuleId ? (data.modules || []).find((item) => item.id === log.linkedModuleId) : undefined;
  return { skill, goal, module };
}

function extractStrength(log: ExecutionLog) {
  const structured = log.structuredData || {};
  const strength = (log.actualData as any)?.strength || {};
  const firstSet = Array.isArray((log.actualData as any)?.sets) ? (log.actualData as any).sets[0] : undefined;
  const perf = (log.metricUpdate?.performanceData as any)?.strengthSets?.[0];
  const weight = safeNumber(strength.weight ?? firstSet?.weight ?? perf?.weight ?? structured.weight ?? (log.actualData as any)?.topWeight);
  const sets = safeNumber(strength.sets ?? firstSet?.sets ?? perf?.sets ?? structured.sets);
  const reps = safeNumber(strength.reps ?? firstSet?.reps ?? perf?.reps ?? structured.reps);
  const rpe = safeNumber(strength.rpe ?? firstSet?.rpe ?? perf?.rpe ?? structured.rpe);
  const volume = safeNumber(strength.volume ?? (log.metricUpdate?.performanceData as any)?.totalVolume ?? structured.totalVolume);
  const estimatedVolume = volume ?? (weight != null && sets != null && reps != null ? weight * sets * reps : undefined);
  return { weight, sets, reps, rpe, estimatedVolume };
}

function afterStateDelta(log: ExecutionLog) {
  const delta = log.structuredData?.afterStateDelta as Record<string, unknown> | undefined;
  if (!delta || delta.skipped) return undefined;
  const normalize = (value: unknown) => (
    value === 'up' || value === 'same' || value === 'down' || value === 'unknown' ? value : undefined
  );
  const energy = normalize(delta.energy);
  const focus = normalize(delta.focus);
  const mood = normalize(delta.mood);
  const body = normalize(delta.body);
  if (!energy && !focus && !mood && !body) return undefined;
  return { energy, focus, mood, body };
}

function inferEffect(delta?: ReturnType<typeof afterStateDelta>) {
  if (!delta) return undefined;
  const values = [delta.energy, delta.focus, delta.mood, delta.body].filter(Boolean);
  const up = values.filter((value) => value === 'up').length;
  const same = values.filter((value) => value === 'same').length;
  const down = values.filter((value) => value === 'down').length;
  if (up > down && down === 0) return 'restorative';
  if (down > up && up === 0) return 'draining';
  if (same >= up + down && same > 0) return 'stabilizing';
  return 'mixed';
}

function compactLogSummary(log: ExecutionLog, data: AppData) {
  const { skill, goal, module } = logLinkedLabels(log, data);
  const strength = extractStrength(log);
  const parts = [
    compactLabel(log.title || skill?.name || log.orphanedSkillName),
    log.durationMinutes > 0 ? `${log.durationMinutes}m` : undefined,
    strength.weight != null ? `${strength.weight}kg` : undefined,
    strength.sets != null && strength.reps != null ? `${strength.sets}x${strength.reps}` : undefined,
    log.qualityRating != null ? `q${log.qualityRating}` : undefined,
  ].filter(Boolean);
  return {
    type: 'execution',
    id: log.id,
    date: log.date,
    createdAt: log.createdAt,
    action_label: compactLabel(log.title || skill?.name || log.orphanedSkillName || log.taskType),
    skill_label: compactLabel(skill?.name || log.orphanedSkillName),
    module_label: compactLabel(module?.name),
    goal_label: compactLabel(goal?.name),
    task_type: log.taskType ?? skill?.taskType ?? 'unknown',
    duration: log.durationMinutes > 0 ? log.durationMinutes : undefined,
    quantity: {
      weight: strength.weight,
      sets: strength.sets,
      reps: strength.reps,
      rpe: strength.rpe,
      estimatedVolume: strength.estimatedVolume,
    },
    quality: log.qualityRating,
    difficulty: log.difficultyRating,
    completion_status: log.linkedScheduleBlockId ? 'scheduled_log' : 'logged',
    linked: {
      skillId: log.linkedSkillId,
      moduleId: log.linkedModuleId,
      goalId: log.linkedGoalId,
      goalType: goal?.goalType,
      domain: goal?.domain,
    },
    afterStateDelta: afterStateDelta(log),
    summary: parts.length > 0 ? parts.join(' · ') : 'execution log',
  };
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

function contextType(log: ContextLog) {
  if (log.type === 'sleep' || ['sleep_duration', 'deep_sleep', 'rem_sleep'].includes(log.label)) return 'sleep';
  if (log.label === 'hrv') return 'hrv';
  if (log.label === 'resting_heart_rate') return 'resting_heart_rate';
  if (log.label === 'steps') return 'steps';
  if (log.label === 'caffeine') return 'caffeine';
  if (log.label === 'workout_minutes') return 'workout';
  if (log.type === 'food') return 'food';
  if (log.type === 'body' || log.type === 'symptom') return 'body';
  if (log.type === 'environment') return 'environment';
  return log.type || 'custom';
}

function buildContextSummary(contextLogs: ContextLog[], now: Date) {
  const recent24 = (contextLogs || []).filter((log) => isWithinDays(log.createdAt ?? log.date, now, 1));
  const recent7 = (contextLogs || []).filter((log) => isWithinDays(log.createdAt ?? log.date, now, 7));
  const typesPresent = Array.from(new Set(recent7.map((log) => String(contextType(log))))).sort();
  const coreTypes = ['sleep', 'hrv', 'resting_heart_rate', 'steps', 'caffeine'];
  return {
    count_24h: recent24.length,
    count_7d: recent7.length,
    types_present: typesPresent,
    latest_context_ts: recent7
      .slice()
      .sort((a, b) => safeCreatedAt(b.createdAt ?? b.date).localeCompare(safeCreatedAt(a.createdAt ?? a.date)))[0]?.createdAt,
    missing_core_types: coreTypes.filter((type) => !typesPresent.includes(type)),
  };
}

function compactContextEvent(log: ContextLog) {
  return {
    type: 'context',
    id: log.id,
    date: log.date,
    createdAt: log.createdAt,
    context_type: contextType(log),
    label: log.label,
    value: typeof log.value === 'string' ? '[text]' : log.value,
    unit: log.unit,
    intensity: log.intensity,
    source: log.source,
    summary: `${contextType(log)}:${log.label}${typeof log.value === 'number' ? `=${log.value}${log.unit ?? ''}` : ''}`,
  };
}

function compactState(row: StateCheckIn) {
  return {
    type: 'state',
    id: row.id,
    date: row.date,
    timestamp: row.timestamp,
    timeBlock: row.timeBlock,
    overall: row.overall,
    energy: row.energy,
    focus: row.focus,
    mood: row.mood,
    stress: row.stress,
    physical: row.physical,
    label: row.label,
    context_flags: row.context ? Object.entries(row.context).filter(([, value]) => !!value).map(([key]) => key) : [],
    summary: [
      row.label ?? `overall:${row.overall}`,
      row.energy != null ? `energy:${row.energy}` : undefined,
      row.focus != null ? `focus:${row.focus}` : undefined,
      row.mood != null ? `mood:${row.mood}` : undefined,
    ].filter(Boolean).join(' · '),
  };
}

function avg(values: Array<number | undefined>) {
  const numbers = values.filter((value): value is number => Number.isFinite(value));
  if (numbers.length === 0) return undefined;
  return Number((numbers.reduce((sum, value) => sum + value, 0) / numbers.length).toFixed(2));
}

function buildStateSummary(stateCheckIns: StateCheckIn[], now: Date) {
  const recent = (stateCheckIns || [])
    .filter((row) => isWithinDays(row.timestamp ?? row.createdAt ?? row.date, now, 7))
    .sort((a, b) => (b.timestamp ?? b.createdAt ?? '').localeCompare(a.timestamp ?? a.createdAt ?? ''));
  return {
    latest: recent[0] ? compactState(recent[0]) : null,
    count_7d: recent.length,
    averages_7d: {
      overall: avg(recent.map((row) => row.overall)),
      energy: avg(recent.map((row) => row.energy)),
      focus: avg(recent.map((row) => row.focus)),
      mood: avg(recent.map((row) => row.mood)),
      stress: avg(recent.map((row) => row.stress)),
      physical: avg(recent.map((row) => row.physical)),
    },
    recent_rows: recent.slice(0, 8).map(compactState),
  };
}

function buildAfterStateSummary(logs: ExecutionLog[], data: AppData, now: Date) {
  const recent = (logs || [])
    .filter((log) => isWithinDays(log.createdAt ?? log.date, now, 28))
    .map((log) => {
      const delta = afterStateDelta(log);
      if (!delta) return null;
      const { skill, goal, module } = logLinkedLabels(log, data);
      return {
        logId: log.id,
        date: log.date,
        action_label: compactLabel(log.title || skill?.name || log.orphanedSkillName || log.taskType),
        skill_label: compactLabel(skill?.name),
        module_label: compactLabel(module?.name),
        goal_label: compactLabel(goal?.name),
        energy_delta: delta.energy,
        focus_delta: delta.focus,
        mood_delta: delta.mood,
        body_delta: delta.body,
        inferred_effect: inferEffect(delta),
      };
    })
    .filter(Boolean) as Array<Record<string, unknown>>;
  const effects = recent.reduce<Record<string, number>>((acc, row) => {
    const key = String(row.inferred_effect || 'mixed');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  return {
    sample_count: recent.length,
    recent_samples: recent.slice(0, 8),
    effects,
  };
}

function buildInferredPatternsV0(logs: ExecutionLog[], data: AppData, now: Date) {
  const groups = new Map<string, {
    label: string;
    count: number;
    focusSameUp: number;
    moodSameUp: number;
    energySameUp: number;
    sourceTypes: Set<string>;
  }>();
  logs
    .filter((log) => isWithinDays(log.createdAt ?? log.date, now, 28))
    .forEach((log) => {
      const delta = afterStateDelta(log);
      if (!delta) return;
      const { skill } = logLinkedLabels(log, data);
      const key = log.linkedSkillId ?? compactLabel(log.title || log.orphanedSkillName || log.taskType) ?? log.id;
      const row = groups.get(key) ?? {
        label: compactLabel(skill?.name || log.title || log.orphanedSkillName || log.taskType) ?? 'action',
        count: 0,
        focusSameUp: 0,
        moodSameUp: 0,
        energySameUp: 0,
        sourceTypes: new Set<string>(),
      };
      row.count += 1;
      if (delta.focus === 'same' || delta.focus === 'up') row.focusSameUp += 1;
      if (delta.mood === 'same' || delta.mood === 'up') row.moodSameUp += 1;
      if (delta.energy === 'same' || delta.energy === 'up') row.energySameUp += 1;
      row.sourceTypes.add('after_state_delta');
      groups.set(key, row);
    });

  const patterns = Array.from(groups.values()).flatMap((row) => {
    const confidence = row.count >= 5 ? 'medium' : 'low';
    const evidenceBasis = row.count >= 3 ? 'personal_pattern' : 'mixed';
    const out: Array<Record<string, unknown>> = [];
    if (row.count >= 2 && row.focusSameUp >= Math.ceil(row.count / 2)) {
      out.push({
        label: `${row.label} tends to stabilize focus`,
        confidence,
        evidence_basis: evidenceBasis,
        sample_n: row.count,
        supporting_evidence: ['after_state_delta:focus_same_or_up'],
      });
    }
    if (row.count >= 2 && row.moodSameUp >= Math.ceil(row.count / 2)) {
      out.push({
        label: `${row.label} tends to support mood`,
        confidence,
        evidence_basis: evidenceBasis,
        sample_n: row.count,
        supporting_evidence: ['after_state_delta:mood_same_or_up'],
      });
    }
    return out;
  });
  return patterns.slice(0, 6);
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
    afterStateDelta: afterStateDelta(log),
  };
}

function buildRecentFeedbackEvents(logs: ExecutionLog[], data: AppData, locale?: 'zh' | 'en') {
  const feedback = buildPostSaveFeedback({
    savedLogs: logs.slice(0, 3),
    data,
    lang: locale ?? 'en',
  });
  return feedback.items.map((item) => ({
    type: 'feedback',
    logId: item.logId,
    title: compactLabel(item.title),
    recordType: item.recordType,
    baselineStatus: item.baselineStatus,
    trend: item.trend,
    durationMinutes: item.durationMinutes,
    qualityRating: item.qualityRating,
    linked: {
      skillName: compactLabel(item.skillName),
      moduleName: compactLabel(item.moduleName),
      goalName: compactLabel(item.goalName),
    },
    summaryKey: item.summaryKey,
    nextActionKey: item.nextActionKey,
    comparison: item.comparison,
  }));
}

function buildSevenDayRows(logs: ExecutionLog[], data: AppData, now: Date, locale?: 'zh' | 'en') {
  const start = new Date(now);
  start.setDate(start.getDate() - 6);
  const rows: Array<Record<string, unknown>> = [];
  for (let i = 0; i < 7; i += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    const key = dateKey(day);
    const dayLogs = logs.filter((log) => log.date === key);
    const dayStates = (data.stateCheckIns || []).filter((row) => row.date === key);
    const dayContexts = (data.contextLogs || []).filter((row) => row.date === key);
    const executionEvents = dayLogs.slice(0, 6).map((log) => compactLogSummary(log, data));
    const stateEvents = dayStates.slice(0, 4).map(compactState);
    const contextEvents = dayContexts.slice(0, 6).map(compactContextEvent);
    const feedbackEvents = buildRecentFeedbackEvents(dayLogs.slice().sort((a, b) => safeCreatedAt(b.createdAt).localeCompare(safeCreatedAt(a.createdAt))), data, locale);
    rows.push({
      date: key,
      log_count: dayLogs.length,
      total_duration: dayLogs.reduce((sum, log) => sum + Math.max(0, log.durationMinutes || 0), 0),
      avg_quality: dayLogs.length > 0
        ? Number((dayLogs.reduce((sum, log) => sum + (log.qualityRating || 0), 0) / dayLogs.length).toFixed(2))
        : undefined,
      execution_events: executionEvents,
      state_events: stateEvents,
      context_events: contextEvents,
      feedback_events: feedbackEvents,
      events: [...executionEvents, ...stateEvents, ...contextEvents, ...feedbackEvents].slice(0, 16),
      samples: dayLogs.slice(0, 5).map((log) => summarizeLog(log, data)),
    });
  }
  return rows;
}

function topBy<T>(items: T[], label: (item: T) => string | undefined, value: (item: T) => number) {
  const rows = new Map<string, { label?: string; count: number; total: number }>();
  items.forEach((item) => {
    const rowLabel = label(item);
    if (!rowLabel) return;
    const id = rowLabel.trim().toLowerCase();
    const row = rows.get(id) ?? { label: rowLabel, count: 0, total: 0 };
    row.count += 1;
    row.total += value(item);
    rows.set(id, row);
  });
  return Array.from(rows.entries())
    .map(([id, row]) => ({ id, label: compactLabel(row.label), count: row.count, total: Math.round(row.total) }))
    .sort((a, b) => b.total - a.total || b.count - a.count)
    .slice(0, 5);
}

function buildLast28Aggregate(logs: ExecutionLog[], data: AppData, now: Date) {
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
  const recentContexts = (data.contextLogs || []).filter((log) => isWithinDays(log.createdAt ?? log.date, now, 28));
  const recentStates = (data.stateCheckIns || []).filter((row) => isWithinDays(row.timestamp ?? row.createdAt ?? row.date, now, 28));
  const afterStateSampleCount = recent.filter((log) => !!afterStateDelta(log)).length;
  const averageQuality = avg(recent.map((log) => log.qualityRating));
  return {
    log_count: recent.length,
    total_duration: recent.reduce((sum, log) => sum + Math.max(0, log.durationMinutes || 0), 0),
    task_type_counts: byTask,
    average_quality: averageQuality,
    after_state_sample_count: afterStateSampleCount,
    context_sample_count: recentContexts.length,
    state_checkin_count: recentStates.length,
    top_goals_by_duration: topBy(recent, (log) => logLinkedLabels(log, data).goal?.name, (log) => Math.max(0, log.durationMinutes || 0)),
    top_modules_by_duration: topBy(recent, (log) => logLinkedLabels(log, data).module?.name, (log) => Math.max(0, log.durationMinutes || 0)),
    top_skills_by_duration: topBy(recent, (log) => logLinkedLabels(log, data).skill?.name || log.orphanedSkillName, (log) => Math.max(0, log.durationMinutes || 0)),
    top_skills_by_count: topBy(recent, (log) => logLinkedLabels(log, data).skill?.name || log.orphanedSkillName, () => 1),
  };
}

export function buildDecisionPayload(
  data: AppData,
  options: { mode?: DecisionMode; trigger?: DecisionTrigger; now?: Date; locale?: 'zh' | 'en' } = {},
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
  const contextSummary = buildContextSummary(data.contextLogs || [], now);
  const stateSummary = buildStateSummary(data.stateCheckIns || [], now);
  const afterStateSummary = buildAfterStateSummary(liveLogs, data, now);
  const inferredPatterns = buildInferredPatternsV0(liveLogs, data, now);
  const last28Aggregate = buildLast28Aggregate(liveLogs, data, now);

  return {
    mode: options.mode ?? 'daily_brief',
    trigger: options.trigger ?? 'debug',
    now: now.toISOString(),
    locale: options.locale,
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
      context_summary: contextSummary,
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
        avgDurationLast28: (last28Aggregate.total_duration as number) / Math.max(1, last28Aggregate.log_count as number),
      },
      confirmed_patterns: (metacognition.statePatterns.patterns || []).slice(0, 8).map((pattern) => ({
        type: pattern.patternType,
        confidence: pattern.confidence,
        labelValues: pattern.labelValues,
      })),
      inferred_patterns_v0: inferredPatterns.length > 0
        ? inferredPatterns
        : [{
            label: 'No confirmed personal patterns yet',
            confidence: 'low',
            evidence_basis: 'population_prior',
            sample_n: 0,
            supporting_evidence: ['insufficient_after_state_delta_samples'],
          }],
      chronotype: 'unknown',
    },
    history_index: {
      last_7_days: buildSevenDayRows(liveLogs, data, now, options.locale),
      last_28_days: last28Aggregate,
    },
    state_summary: stateSummary,
    after_state_summary: afterStateSummary,
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
