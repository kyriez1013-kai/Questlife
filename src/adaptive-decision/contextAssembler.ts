import type {
  AppData,
  ContextLog,
  DataRecordProvenance,
  ExecutionLog,
  ScheduleBlock,
  StateCheckIn,
} from '../types';
import type {
  DecisionContextFactV1,
  DecisionContextSnapshotV1,
  DecisionMissingQuestionV1,
  DecisionQuestionType,
  DecisionSourceRefV1,
} from './decisionEpisode';

export type DecisionContextAnswersV1 = Record<string, string>;

export type AssembleDecisionContextInput = {
  data: Pick<
    AppData,
    'stateCheckIns' | 'contextLogs' | 'executionLogs' | 'scheduleBlocks' | 'goals' | 'categories' | 'skills'
  >;
  questionType: DecisionQuestionType;
  questionText?: string;
  targetId?: string;
  asOf: string;
  timezone: string;
  mode: 'owner' | 'demo';
  answers?: DecisionContextAnswersV1;
};

export type AssembleDecisionContextResult = {
  snapshot: DecisionContextSnapshotV1;
  missingQuestions: DecisionMissingQuestionV1[];
  excludedSourceIds: string[];
};

const DAY_START_MINUTES = 7 * 60;
const DAY_END_MINUTES = 23 * 60;
const OWNER_INELIGIBLE_ORIGINS = new Set(['SYNTHETIC', 'QA_TEST', 'DEBUG_FIXTURE']);

function parseTime(value?: string): number | undefined {
  if (!value) return undefined;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function asLocalDate(iso: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function provenanceEligibility(
  provenance: DataRecordProvenance | undefined,
  mode: 'owner' | 'demo',
  fallbackAvailableAt?: string,
  asOfMs?: number,
): { eligible: boolean; limited: boolean; origin?: DataRecordProvenance['origin']; availableAt?: string; limitations: string[] } {
  const availableAt = provenance?.availableAt ?? fallbackAvailableAt;
  const availableMs = parseTime(availableAt);
  const limitations = provenance?.limitations?.slice() ?? [];
  if (provenance?.deleted) return { eligible: false, limited: false, origin: provenance.origin, availableAt, limitations: [...limitations, 'DELETED_SOURCE'] };
  if (asOfMs != null && availableMs != null && availableMs > asOfMs) {
    return { eligible: false, limited: false, origin: provenance?.origin, availableAt, limitations: [...limitations, 'AVAILABLE_AFTER_DECISION_AS_OF'] };
  }
  if (mode === 'owner' && provenance?.origin && OWNER_INELIGIBLE_ORIGINS.has(provenance.origin)) {
    return { eligible: false, limited: false, origin: provenance.origin, availableAt, limitations: [...limitations, 'NON_OWNER_FIXTURE_SOURCE'] };
  }
  const limited = !provenance || provenance.origin === 'LEGACY_UNKNOWN';
  return {
    eligible: true,
    limited,
    origin: provenance?.origin,
    availableAt,
    limitations: limited ? [...limitations, 'LEGACY_OR_UNKNOWN_PROVENANCE'] : limitations,
  };
}

function sourceRef(input: {
  sourceType: DecisionSourceRefV1['sourceType'];
  sourceId: string;
  label: string;
  eventTime?: string;
  provenance?: DataRecordProvenance;
  eligibility: ReturnType<typeof provenanceEligibility>;
}): DecisionSourceRefV1 {
  return {
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    label: input.label,
    eventTime: input.eventTime,
    availableAt: input.eligibility.availableAt,
    origin: input.eligibility.origin,
    eligibility: input.eligibility.eligible ? (input.eligibility.limited ? 'limited' : 'eligible') : 'excluded',
    limitationCodes: input.eligibility.limitations,
  };
}

function eventIsAvailable(eventTime: string | undefined, asOfMs: number): boolean {
  const eventMs = parseTime(eventTime);
  return eventMs == null || eventMs <= asOfMs;
}

function sleepMinutes(log: ContextLog): number | undefined {
  if (log.type !== 'sleep' || typeof log.value !== 'number' || !Number.isFinite(log.value) || log.value <= 0) return undefined;
  const unit = (log.unit ?? '').toLowerCase();
  if (unit.includes('hour') || unit.includes('小时') || unit === 'h' || unit === 'hr') return Math.round(log.value * 60);
  if (unit.includes('minute') || unit.includes('分钟') || unit === 'm' || unit === 'min') return Math.round(log.value);
  return log.value <= 24 ? Math.round(log.value * 60) : Math.round(log.value);
}

function hhmmToMinutes(value: string): number | undefined {
  const [hour, minute] = value.split(':').map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return undefined;
  return hour * 60 + minute;
}

function minutesToHhmm(value: number): string {
  const bounded = Math.max(0, Math.min(24 * 60, Math.round(value)));
  const hour = Math.floor(bounded / 60);
  const minute = bounded % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function deriveOpenWindows(blocks: ScheduleBlock[]) {
  const occupied = blocks
    .filter((block) => block.status !== 'skipped')
    .map((block) => {
      const start = hhmmToMinutes(block.startTime);
      const end = hhmmToMinutes(block.endTime);
      if (start == null || end == null || end <= start) return null;
      return { start: Math.max(DAY_START_MINUTES, start), end: Math.min(DAY_END_MINUTES, end) };
    })
    .filter((range): range is { start: number; end: number } => !!range && range.end > range.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const merged: Array<{ start: number; end: number }> = [];
  occupied.forEach((range) => {
    const previous = merged[merged.length - 1];
    if (!previous || range.start > previous.end) merged.push({ ...range });
    else previous.end = Math.max(previous.end, range.end);
  });

  const windows: Array<{ startTime: string; endTime: string; minutes: number }> = [];
  let cursor = DAY_START_MINUTES;
  merged.forEach((range) => {
    if (range.start > cursor) windows.push({ startTime: minutesToHhmm(cursor), endTime: minutesToHhmm(range.start), minutes: range.start - cursor });
    cursor = Math.max(cursor, range.end);
  });
  if (cursor < DAY_END_MINUTES) windows.push({ startTime: minutesToHhmm(cursor), endTime: minutesToHhmm(DAY_END_MINUTES), minutes: DAY_END_MINUTES - cursor });
  return windows;
}

function latestEligibleState(
  logs: StateCheckIn[],
  mode: 'owner' | 'demo',
  asOfMs: number,
  sourceRefs: DecisionSourceRefV1[],
  excludedSourceIds: string[],
) {
  return logs
    .slice()
    .sort((a, b) => (parseTime(b.timestamp ?? b.createdAt) ?? 0) - (parseTime(a.timestamp ?? a.createdAt) ?? 0))
    .find((log) => {
      const observedAt = log.timestamp ?? log.createdAt;
      const eligibility = provenanceEligibility(log.dataProvenance, mode, log.createdAt, asOfMs);
      sourceRefs.push(sourceRef({ sourceType: 'state', sourceId: log.id, label: 'current_state', eventTime: observedAt, provenance: log.dataProvenance, eligibility }));
      const eligible = eligibility.eligible && eventIsAvailable(observedAt, asOfMs);
      if (!eligible) excludedSourceIds.push(log.id);
      return eligible;
    });
}

function eligibleContexts(
  logs: ContextLog[],
  mode: 'owner' | 'demo',
  asOfMs: number,
  sourceRefs: DecisionSourceRefV1[],
  excludedSourceIds: string[],
) {
  return logs.filter((log) => {
    const observedAt = log.dataProvenance?.eventEndAt ?? log.dataProvenance?.eventStartAt ?? log.createdAt;
    const eligibility = provenanceEligibility(log.dataProvenance, mode, log.createdAt, asOfMs);
    sourceRefs.push(sourceRef({ sourceType: 'context', sourceId: log.id, label: log.label, eventTime: observedAt, provenance: log.dataProvenance, eligibility }));
    const eligible = eligibility.eligible && eventIsAvailable(observedAt, asOfMs);
    if (!eligible) excludedSourceIds.push(log.id);
    return eligible;
  });
}

function eligibleExecutions(
  logs: ExecutionLog[],
  mode: 'owner' | 'demo',
  asOfMs: number,
  sourceRefs: DecisionSourceRefV1[],
  excludedSourceIds: string[],
) {
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  return logs.filter((log) => {
    const eventTime = log.dataProvenance?.eventEndAt ?? log.dataProvenance?.eventStartAt ?? log.createdAt;
    const eventMs = parseTime(eventTime);
    const eligibility = provenanceEligibility(log.dataProvenance, mode, log.createdAt, asOfMs);
    sourceRefs.push(sourceRef({ sourceType: 'execution', sourceId: log.id, label: log.title ?? 'execution', eventTime, provenance: log.dataProvenance, eligibility }));
    const eligible = eligibility.eligible
      && eventIsAvailable(eventTime, asOfMs)
      && eventMs != null
      && eventMs >= asOfMs - sevenDaysMs;
    if (!eligible && (!eligibility.eligible || (eventMs != null && eventMs > asOfMs))) excludedSourceIds.push(log.id);
    return eligible;
  });
}

export function classifyDecisionQuestion(text: string): DecisionQuestionType {
  const value = text.trim().toLowerCase();
  if (/(训练|健身|运动|workout|train|exercise|恢复|recovery|rest)/i.test(value)) return 'training_recovery';
  if (/(文章|阅读|读书|学习|专注|脑子|sql|coding|deep work|read|study|focus)/i.test(value)) return 'cognitive_adjustment';
  if (/(太多|过载|安排不过来|排不开|overload|too much|too many|reschedule today)/i.test(value)) return 'overloaded_day';
  return 'custom';
}

function buildMissingQuestions(
  questionType: DecisionQuestionType,
  snapshot: DecisionContextSnapshotV1,
  answers: DecisionContextAnswersV1,
) {
  const questions: DecisionMissingQuestionV1[] = [];
  if (!snapshot.currentState && (questionType === 'training_recovery' || questionType === 'cognitive_adjustment')) {
    questions.push({
      id: 'current-state',
      kind: 'current_state',
      promptKey: 'adaptiveQuestionCurrentState',
      materialReasonKey: 'adaptiveQuestionCurrentStateReason',
      options: [1, 2, 3, 4, 5].map((value) => ({ value: String(value), labelKey: `adaptiveState${value}` })),
      answeredValue: answers['current-state'],
    });
  }
  const movableBlockExists = snapshot.schedule.blocks.some((block) => block.flexibility !== 'fixed');
  if (!movableBlockExists && questionType !== 'overloaded_day') {
    questions.push({
      id: 'target-flexibility',
      kind: 'constraint',
      promptKey: 'adaptiveQuestionMovable',
      materialReasonKey: 'adaptiveQuestionMovableReason',
      options: [
        { value: 'fixed', labelKey: 'adaptiveFixed' },
        { value: 'movable', labelKey: 'adaptiveMovable' },
        { value: 'optional', labelKey: 'adaptiveOptional' },
      ],
      answeredValue: answers['target-flexibility'],
    });
  }
  if (questionType === 'overloaded_day' && !snapshot.direction?.goalId && !answers['priority']) {
    questions.push({
      id: 'priority',
      kind: 'priority',
      promptKey: 'adaptiveQuestionPriority',
      materialReasonKey: 'adaptiveQuestionPriorityReason',
      options: [
        { value: 'first', labelKey: 'adaptivePriorityFirst' },
        { value: 'deadline', labelKey: 'adaptivePriorityDeadline' },
        { value: 'recovery', labelKey: 'adaptivePriorityRecovery' },
      ],
      answeredValue: answers.priority,
    });
  }
  return questions.filter((question) => !question.answeredValue).slice(0, 2);
}

export function assembleDecisionContext(input: AssembleDecisionContextInput): AssembleDecisionContextResult {
  const asOfMs = parseTime(input.asOf);
  if (asOfMs == null) throw new Error('Decision context requires a valid timezone-aware asOf timestamp.');
  const date = asLocalDate(input.asOf, input.timezone);
  const sourceRefs: DecisionSourceRefV1[] = [];
  const excludedSourceIds: string[] = [];
  const answers = input.answers ?? {};

  const state = latestEligibleState(input.data.stateCheckIns || [], input.mode, asOfMs, sourceRefs, excludedSourceIds);
  const contexts = eligibleContexts(input.data.contextLogs || [], input.mode, asOfMs, sourceRefs, excludedSourceIds);
  const executions = eligibleExecutions(input.data.executionLogs || [], input.mode, asOfMs, sourceRefs, excludedSourceIds);
  const scheduleBlocks = (input.data.scheduleBlocks || [])
    .filter((block) => block.date === date && block.status !== 'skipped')
    .map((block) => ({ ...block }));

  scheduleBlocks.forEach((block) => sourceRefs.push({
    sourceType: 'schedule',
    sourceId: block.id,
    label: block.title,
    eligibility: 'eligible',
  }));

  const latestSleep = contexts
    .map((log) => ({ log, minutes: sleepMinutes(log), time: parseTime(log.dataProvenance?.eventEndAt ?? log.createdAt) ?? 0 }))
    .filter((item): item is { log: ContextLog; minutes: number; time: number } => item.minutes != null)
    .sort((a, b) => b.time - a.time)[0];

  const totalMinutes = executions.reduce((sum, log) => sum + Math.max(0, log.durationMinutes || 0), 0);
  const qualityValues = executions.map((log) => log.qualityRating).filter((value): value is number => typeof value === 'number');
  const averageQuality = qualityValues.length > 0
    ? qualityValues.reduce((sum, value) => sum + value, 0) / qualityValues.length
    : undefined;
  const openWindows = deriveOpenWindows(scheduleBlocks);

  const targetBlock = scheduleBlocks.find((block) => block.id === input.targetId)
    ?? scheduleBlocks.find((block) => block.linkedSkillId === input.targetId || block.linkedGoalId === input.targetId)
    ?? scheduleBlocks.find((block) => block.flexibility !== 'fixed')
    ?? scheduleBlocks[0];
  const skill = input.data.skills.find((item) => item.id === (input.targetId ?? targetBlock?.linkedSkillId));
  const goalId = input.targetId ?? targetBlock?.linkedGoalId ?? skill?.categoryId;
  const category = input.data.categories.find((item) => item.id === goalId);
  const legacyGoal = input.data.goals.find((item) => item.id === goalId);
  const goalLabel = category?.name ?? legacyGoal?.title;

  if (skill) sourceRefs.push({ sourceType: 'skill', sourceId: skill.id, label: skill.name, eligibility: 'eligible' });
  if (goalId && goalLabel) sourceRefs.push({ sourceType: 'goal', sourceId: goalId, label: goalLabel, eligibility: 'eligible' });

  const facts: DecisionContextFactV1[] = [];
  if (state) facts.push({
    id: `fact-state-${state.id}`,
    kind: 'state',
    label: 'current_state',
    value: state.overall,
    unit: '/5',
    sourceIds: [state.id],
    observedAt: state.timestamp ?? state.createdAt,
  });
  if (latestSleep) facts.push({
    id: `fact-sleep-${latestSleep.log.id}`,
    kind: 'sleep',
    label: 'sleep_duration',
    value: latestSleep.minutes,
    unit: 'minutes',
    sourceIds: [latestSleep.log.id],
    observedAt: latestSleep.log.dataProvenance?.eventEndAt ?? latestSleep.log.createdAt,
  });
  if (executions.length > 0) facts.push({
    id: 'fact-recent-load',
    kind: 'recent_load',
    label: 'recent_execution_minutes',
    value: totalMinutes,
    unit: 'minutes',
    sourceIds: executions.map((log) => log.id),
  });
  scheduleBlocks.forEach((block) => facts.push({
    id: `fact-schedule-${block.id}`,
    kind: 'schedule_constraint',
    label: block.title,
    value: `${block.startTime}-${block.endTime}`,
    sourceIds: [block.id],
  }));
  if (answers.priority) facts.push({ id: 'fact-priority-answer', kind: 'priority', label: 'explicit_priority', value: answers.priority, sourceIds: [] });
  if (answers['target-flexibility']) facts.push({ id: 'fact-flexibility-answer', kind: 'schedule_constraint', label: 'explicit_flexibility', value: answers['target-flexibility'], sourceIds: [] });
  if (!state && answers['current-state']) {
    facts.push({ id: 'fact-current-state-answer', kind: 'state', label: 'current_state_answer', value: Number(answers['current-state']), unit: '/5', sourceIds: [] });
  }

  const limitations = Array.from(new Set(sourceRefs.flatMap((ref) => ref.limitationCodes ?? [])));
  const missingness: Array<{ code: string; reason: string }> = [];
  if (!state && !answers['current-state']) missingness.push({ code: 'CURRENT_STATE_MISSING', reason: 'No eligible current state observation is available.' });
  if (!latestSleep) missingness.push({ code: 'SLEEP_MISSING', reason: 'Sleep is unknown, not zero.' });
  if (executions.length === 0) missingness.push({ code: 'RECENT_EXECUTION_MISSING', reason: 'No eligible recent execution was observed.' });

  const snapshot: DecisionContextSnapshotV1 = {
    assembledAt: input.asOf,
    asOf: input.asOf,
    facts,
    currentState: state ? {
      overall: state.overall,
      energy: state.energy,
      focus: state.focus,
      mood: state.mood,
      physical: state.physical,
      stress: state.stress,
      observedAt: state.timestamp ?? state.createdAt,
      sourceId: state.id,
    } : answers['current-state'] ? {
      overall: Number(answers['current-state']),
      observedAt: input.asOf,
      sourceId: 'decision-answer:current-state',
    } : undefined,
    sleepMinutes: latestSleep ? {
      value: latestSleep.minutes,
      observedAt: latestSleep.log.dataProvenance?.eventEndAt ?? latestSleep.log.createdAt ?? input.asOf,
      sourceId: latestSleep.log.id,
    } : undefined,
    recentExecution: executions.length > 0 ? {
      count: executions.length,
      totalMinutes,
      averageQuality,
      sourceIds: executions.map((log) => log.id),
    } : undefined,
    schedule: {
      date,
      blocks: scheduleBlocks,
      fixedCount: scheduleBlocks.filter((block) => block.flexibility === 'fixed').length,
      flexibleCount: scheduleBlocks.filter((block) => block.flexibility !== 'fixed').length,
      remainingPlannedMinutes: scheduleBlocks
        .filter((block) => block.status !== 'completed')
        .reduce((sum, block) => sum + Math.max(0, block.plannedMinutes), 0),
      openWindows,
    },
    direction: goalLabel || skill ? {
      goalId: goalId && goalLabel ? goalId : undefined,
      goalName: goalLabel,
      skillId: skill?.id,
      skillName: skill?.name,
    } : undefined,
    sourceRefs,
    missingness,
    limitations,
  };

  return {
    snapshot,
    missingQuestions: buildMissingQuestions(input.questionType, snapshot, answers),
    excludedSourceIds: Array.from(new Set(excludedSourceIds)),
  };
}
