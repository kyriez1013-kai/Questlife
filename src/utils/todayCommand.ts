import { AppData, ExecutionLog, ScheduleBlock, StateCheckIn, Skill } from '../types';
import type { StateTypeOrUnclear } from '../state-layer/types';

export type StateTaskMatch = 'match' | 'unknown' | 'recover' | 'brain_dump' | 'probe_5';

/** V5's published decision table. Unknown demand never becomes an inferred mismatch. */
export function matchStateToTask(state: StateTypeOrUnclear | undefined, required?: Skill['requiredState']): StateTaskMatch {
  if (!state || state === 'unclear' || !required || required === 'unknown') return 'unknown';
  if (state === 'low_fuel' && (required === 'deep_focus' || required === 'physical')) return 'recover';
  if (state === 'overload' && (required === 'deep_focus' || required === 'social')) return 'brain_dump';
  if (state === 'low_arousal' && required === 'deep_focus') return 'probe_5';
  return 'match';
}

export type TodayCommandType =
  | 'continue_plan'
  | 'start_skill'
  | 'log_something'
  | 'rescue'
  | 'review_feedback'
  | 'empty_state'
  | 'finish_pending_capture';

export type TodayCommandAction =
  | 'start'
  | 'log'
  | 'rescue'
  | 'create_goal'
  | 'review_feedback'
  | 'finish_pending_capture';

export type TodayCommand = {
  type: TodayCommandType;
  titleKey: string;
  titleValues?: Record<string, string | number>;
  reasonKey: string;
  reasonValues?: Record<string, string | number>;
  primaryAction: TodayCommandAction;
  secondaryActions: TodayCommandAction[];
  linkedGoalId?: string;
  linkedModuleId?: string;
  linkedSkillId?: string;
  scheduleBlockId?: string;
  plannedMinutes?: number;
  confidence: 'high' | 'medium' | 'low';
  /** Presentation and execution both consume this one command; no second suggestion authority. */
  stateAdvice?: { kind: 'recover' | 'brain_dump' | 'probe_5'; state: StateTypeOrUnclear; checkInId: string; taskTitle: string };
};

type BuildTodayCommandInput = {
  data: AppData;
  now: Date;
  scheduleBlocks: ScheduleBlock[];
  todayLogs: ExecutionLog[];
  latestFeedback?: { executionLogId?: string } | null;
  latestState?: StateCheckIn | null;
  activeSession?: { linkedSkillId?: string; linkedGoalId?: string; linkedModuleId?: string; linkedScheduleBlockId?: string; title: string } | null;
  stateAware?: boolean;
};

function minuteOfDay(time: string) {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function hasPendingCapture(data: AppData) {
  const captures = data.rawCaptures || [];
  if (!captures.length) return false;
  const logs = data.executionLogs || [];
  const sourceCaptureIds = new Set(logs.map((log) => log.structuredData?.sourceCaptureId));
  const logIds = logs.map((log) => log.id).sort();
  // Preserve legacy prefix matching without rescanning every log for every capture.
  const hasLegacyLog = (prefix: string) => {
    let start = 0;
    let end = logIds.length;
    while (start < end) {
      const middle = (start + end) >>> 1;
      if (logIds[middle] < prefix) start = middle + 1;
      else end = middle;
    }
    return logIds[start]?.startsWith(prefix) ?? false;
  };
  return captures.some((capture) => {
    const hasGeneratedLog = sourceCaptureIds.has(capture.id) || hasLegacyLog(`capture-${capture.id}`);
    if (hasGeneratedLog) return false;
    if (capture.parsed?.entriesDismissed) return false;
    if (capture.parseStatus === 'pending' || capture.parseStatus === 'failed') return true;
    if (capture.parseStatus !== 'done') return false;
    return (capture.parsed?.entries?.length ?? 0) > 0 || capture.parsed?.completionSchema?.needsCompletion === true;
  });
}

function isLowState(state?: StateCheckIn | null) {
  if (!state) return false;
  return (state.energy ?? state.overall) <= 2 || (state.focus ?? state.overall) <= 2 || state.overall <= 2;
}

function primaryLinkForSkill(data: AppData, skillId?: string) {
  if (!skillId) return undefined;
  return (data.moduleSkillLinks || []).find((link) => link.skillId === skillId);
}

export function buildTodayCommand({
  data,
  now,
  scheduleBlocks,
  todayLogs,
  latestFeedback,
  latestState,
  activeSession,
  stateAware,
}: BuildTodayCommandInput): TodayCommand {
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const stateRow = stateAware ? (data.stateCheckIns || []).filter(r => r.date === date && r.stateLayer && !r.dataProvenance?.deleted && r.timestamp <= now.toISOString()).sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0] : undefined;
  // A running action cannot be replaced by another recommendation. Legacy/no-check-in order is unchanged.
  if (stateRow && activeSession) return {
    type: 'continue_plan', titleKey: 'continueTodayPlan', titleValues: { title: activeSession.title },
    reasonKey: 'basedOnYourPlan', primaryAction: 'start', secondaryActions: ['log'], confidence: 'high',
    linkedSkillId: activeSession.linkedSkillId, linkedGoalId: activeSession.linkedGoalId,
    linkedModuleId: activeSession.linkedModuleId, scheduleBlockId: activeSession.linkedScheduleBlockId,
  };
  if (hasPendingCapture(data)) {
    return {
      type: 'finish_pending_capture',
      titleKey: 'finishCurrentCapture',
      reasonKey: 'basedOnYourLatestRecord',
      primaryAction: 'finish_pending_capture',
      secondaryActions: ['log'],
      confidence: 'high',
    };
  }

  if (!stateRow && isLowState(latestState)) {
    return {
      type: 'rescue',
      titleKey: 'rescueTwoMinutes',
      reasonKey: (latestState?.focus ?? latestState?.overall ?? 3) <= 2 ? 'currentStateLowFocusReason' : 'currentStateLowEnergyReason',
      primaryAction: 'rescue',
      secondaryActions: ['log'],
      confidence: 'medium',
    };
  }

  if (latestFeedback) {
    const log = todayLogs.find((item) => item.id === latestFeedback.executionLogId) ?? todayLogs.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    return {
      type: 'review_feedback',
      titleKey: 'reviewLatestFeedback',
      reasonKey: 'basedOnYourLatestRecord',
      primaryAction: 'review_feedback',
      secondaryActions: ['start', 'log'],
      linkedGoalId: log?.linkedGoalId,
      linkedModuleId: log?.linkedModuleId,
      linkedSkillId: log?.linkedSkillId,
      scheduleBlockId: log?.linkedScheduleBlockId,
      plannedMinutes: log?.durationMinutes || undefined,
      confidence: 'medium',
    };
  }

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const currentBlock = scheduleBlocks.find((block) => (
    block.status !== 'completed' && minuteOfDay(block.startTime) <= nowMinutes && nowMinutes < minuteOfDay(block.endTime)
  ));
  const nextBlock = currentBlock ?? scheduleBlocks.find((block) => block.status !== 'completed');

  if (nextBlock) {
    const state = stateRow?.stateLayer?.correction?.type ?? stateRow?.stateLayer?.classification?.type;
    const required = data.skills.find(skill => skill.id === nextBlock.linkedSkillId)?.requiredState;
    const dismissed = (data.stateCheckIns || []).some(r => r.date === date && r.stateLayer?.originalPlanChoices?.some(choice => choice.taskId === nextBlock.id));
    const match = dismissed ? 'match' : matchStateToTask(state, required);
    return {
      type: 'continue_plan',
      titleKey: 'continueTodayPlan',
      titleValues: { title: nextBlock.title },
      reasonKey: 'basedOnYourPlan',
      reasonValues: { time: `${nextBlock.startTime}-${nextBlock.endTime}` },
      primaryAction: 'start',
      secondaryActions: ['log'],
      linkedGoalId: nextBlock.linkedGoalId,
      linkedSkillId: nextBlock.linkedSkillId,
      scheduleBlockId: nextBlock.id,
      plannedMinutes: match === 'probe_5' ? 5 : nextBlock.plannedMinutes,
      confidence: currentBlock ? 'high' : 'medium',
      ...(stateRow && state && ['recover', 'brain_dump', 'probe_5'].includes(match) ? {
        stateAdvice: { kind: match as 'recover' | 'brain_dump' | 'probe_5', state, checkInId: stateRow.id, taskTitle: nextBlock.title },
      } : {}),
    };
  }

  if (activeSession) {
    return {
      type: 'continue_plan',
      titleKey: 'continueTodayPlan',
      titleValues: { title: activeSession.title },
      reasonKey: 'basedOnYourPlan',
      primaryAction: 'start',
      secondaryActions: ['log'],
      linkedGoalId: activeSession.linkedGoalId,
      linkedModuleId: activeSession.linkedModuleId,
      linkedSkillId: activeSession.linkedSkillId,
      scheduleBlockId: activeSession.linkedScheduleBlockId,
      confidence: 'high',
    };
  }

  const unloggedSkill = (data.skills || []).find((skill) => !todayLogs.some((log) => log.linkedSkillId === skill.id));
  const skill = unloggedSkill ?? (data.skills || [])[0];
  if (skill) {
    const link = primaryLinkForSkill(data, skill.id);
    return {
      type: 'start_skill',
      titleKey: 'nowSuggested',
      titleValues: { title: skill.name },
      reasonKey: 'noScheduleButCanLog',
      primaryAction: 'start',
      secondaryActions: ['log'],
      linkedGoalId: link?.goalId ?? skill.categoryId,
      linkedModuleId: link?.moduleId,
      linkedSkillId: skill.id,
      plannedMinutes: skill.defaultDurationMinutes ?? skill.dailyTargetMinutes ?? 30,
      confidence: 'medium',
    };
  }

  if ((data.categories || []).length === 0) {
    return {
      type: 'empty_state',
      titleKey: 'noGoalYetCommand',
      reasonKey: 'noGoalYetCommandReason',
      primaryAction: 'create_goal',
      secondaryActions: ['log'],
      confidence: 'high',
    };
  }

  return {
    type: 'log_something',
    titleKey: 'logSomething',
    reasonKey: 'recordOneSentenceReason',
    primaryAction: 'log',
    secondaryActions: [],
    confidence: 'low',
  };
}
