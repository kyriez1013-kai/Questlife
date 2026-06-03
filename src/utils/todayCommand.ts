import { AppData, ExecutionLog, ScheduleBlock, StateCheckIn } from '../types';

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
};

type BuildTodayCommandInput = {
  data: AppData;
  now: Date;
  scheduleBlocks: ScheduleBlock[];
  todayLogs: ExecutionLog[];
  latestFeedback?: { executionLogId?: string } | null;
  latestState?: StateCheckIn | null;
  activeSession?: { linkedSkillId?: string; linkedGoalId?: string; linkedModuleId?: string; linkedScheduleBlockId?: string; title: string } | null;
};

function minuteOfDay(time: string) {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function hasPendingCapture(data: AppData) {
  return (data.rawCaptures || []).some((capture) => {
    const hasGeneratedLog = (data.executionLogs || []).some((log) => (
      log.structuredData?.sourceCaptureId === capture.id || log.id.startsWith(`capture-${capture.id}`)
    ));
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
}: BuildTodayCommandInput): TodayCommand {
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

  if (isLowState(latestState)) {
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
      plannedMinutes: nextBlock.plannedMinutes,
      confidence: currentBlock ? 'high' : 'medium',
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
