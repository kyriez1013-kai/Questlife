import type { DataRecordOrigin, ScheduleBlock } from '../types';

export const DECISION_EPISODE_CONTRACT_VERSION = 'questlife.decision.episode.v1' as const;
export const DECISION_EVIDENCE_CONTRACT_VERSION = 'questlife.decision.evidence.v1' as const;
export const DECISION_POLICY_VERSION = 'questlife.decision.policy.v1' as const;

export type DecisionEpisodeStatus =
  | 'DRAFT'
  | 'CONTEXT_ASSEMBLING'
  | 'NEEDS_INPUT'
  | 'READY'
  | 'PROPOSED'
  | 'ACCEPTED'
  | 'APPLIED'
  | 'FOLLOW_UP_DUE'
  | 'OUTCOME_RECORDED'
  | 'CLOSED'
  | 'ABSTAINED';

export type DecisionQuestionType =
  | 'training_recovery'
  | 'cognitive_adjustment'
  | 'overloaded_day'
  | 'custom';

export type DecisionOutcomeHorizon = 'two_hours' | 'end_of_day' | 'next_morning';
export type DecisionUsefulness = 'helpful' | 'uncertain' | 'not_helpful';
export type DecisionTaskResult = 'completed' | 'partially_completed' | 'not_completed' | 'not_applicable';

export type DecisionTimeSemanticsV1 = {
  eventTime: string;
  recordedTime: string;
  availableAt: string;
  asOf: string;
  timezone: string;
  observationWindow: {
    start: string;
    end: string;
  };
};

export type DecisionSourceRefV1 = {
  sourceType: 'state' | 'context' | 'execution' | 'schedule' | 'goal' | 'skill' | 'quant' | 'decision_memory';
  sourceId: string;
  label: string;
  eventTime?: string;
  availableAt?: string;
  origin?: DataRecordOrigin;
  eligibility: 'eligible' | 'limited' | 'excluded';
  limitationCodes?: string[];
};

export type DecisionContextFactV1 = {
  id: string;
  kind:
    | 'state'
    | 'sleep'
    | 'recent_load'
    | 'schedule_constraint'
    | 'available_window'
    | 'priority'
    | 'goal_alignment'
    | 'historical_episode';
  label: string;
  value?: number | string | boolean;
  unit?: string;
  sourceIds: string[];
  observedAt?: string;
};

export type DecisionMissingQuestionV1 = {
  id: string;
  kind: 'current_state' | 'constraint' | 'symptom_severity' | 'priority' | 'time_available';
  promptKey: string;
  options: Array<{ value: string; labelKey: string }>;
  materialReasonKey: string;
  answeredValue?: string;
};

export type DecisionContextSnapshotV1 = {
  assembledAt: string;
  asOf: string;
  facts: DecisionContextFactV1[];
  currentState?: {
    overall: number;
    energy?: number;
    focus?: number;
    mood?: number;
    physical?: number;
    stress?: number;
    observedAt: string;
    sourceId: string;
  };
  sleepMinutes?: {
    value: number;
    observedAt: string;
    sourceId: string;
  };
  recentExecution?: {
    count: number;
    totalMinutes: number;
    averageQuality?: number;
    sourceIds: string[];
  };
  schedule: {
    date: string;
    blocks: ScheduleBlock[];
    fixedCount: number;
    flexibleCount: number;
    remainingPlannedMinutes: number;
    openWindows: Array<{ startTime: string; endTime: string; minutes: number }>;
  };
  direction?: {
    goalId?: string;
    goalName?: string;
    skillId?: string;
    skillName?: string;
  };
  sourceRefs: DecisionSourceRefV1[];
  missingness: Array<{ code: string; reason: string }>;
  limitations: string[];
};

export type DecisionEvidenceItemV1 = {
  id: string;
  category:
    | 'fact'
    | 'personal_comparison'
    | 'observational_signal'
    | 'joint_evidence'
    | 'historical_analogue'
    | 'historical_decision'
    | 'unknown'
    | 'limitation';
  evidenceLevel?: 'A' | 'B' | 'C' | 'D' | 'E';
  labelKey: string;
  values?: Record<string, string | number>;
  sourceIds: string[];
  supportCount?: number;
  counterexampleCount?: number;
  limitationCodes?: string[];
};

export type DecisionEvidencePacketV1 = {
  contractVersion: typeof DECISION_EVIDENCE_CONTRACT_VERSION;
  target: string;
  asOf: string;
  eligibility: 'eligible' | 'limited' | 'abstained';
  availableLevels: Array<'A' | 'B' | 'C' | 'D' | 'E'>;
  highestEvidenceLevel?: 'A' | 'B' | 'C' | 'D' | 'E';
  fact?: {
    value: number;
    unit: string;
    observedAt: string;
    sourceId: string;
  };
  personalReference?: {
    value?: number;
    low?: number;
    high?: number;
    unit: string;
    observationCount: number;
    independentPeriodCount: number;
    sourceIds: string[];
  };
  currentDeviation?: number;
  trend?: {
    direction: 'higher' | 'lower' | 'flat' | 'unavailable';
    absolute?: number;
    sourceIds: string[];
  };
  ewma?: {
    short?: number;
    long?: number;
    observedAt?: string;
    sourceIds: string[];
    limitationCodes: string[];
  };
  jointModel?: {
    observedDeviation: number;
    modelAssociated: number;
    unexplainedResidual: number;
    completeObservationCount: number;
    drivers: Array<{
      id: string;
      label: string;
      contribution: number;
      lagPeriods: number;
      supportCount: number;
      counterexampleCount: number;
      stability: string;
      limitationCodes: string[];
    }>;
    limitationCodes: string[];
  };
  similarPeriods: Array<{
    id: string;
    startAt: string;
    endAt: string;
    distance: number;
    matchingFeatures: string[];
    differentFeatures: string[];
    supportCount: number;
    counterexampleCount: number;
  }>;
  recovery?: {
    semantics: 'historical_analogue' | 'validated_forecast';
    episodeCount: number;
    path: Array<{ offsetDays: number; medianDeviation: number; lowDeviation: number; highDeviation: number }>;
    forecastAllowed: boolean;
    limitationCodes: string[];
  };
  scenarioBranches: Array<{
    id: string;
    action: string;
    comparablePeriodCount: number;
    observedOutcomeChange?: number;
    supportCount: number;
    counterexampleCount: number;
    missingOutcomeCount: number;
    limitationCodes: string[];
  }>;
  items: DecisionEvidenceItemV1[];
  missingness: string[];
  limitations: string[];
  sourceArtifactIds: string[];
};

export type DecisionSafetyStatusV1 = {
  level: 'normal' | 'needs_clarification' | 'blocked';
  matchedTerms: string[];
  reasonCodes: string[];
  userMessageKey?: string;
};

export type DecisionPlanOperationV1 =
  | {
      id: string;
      type: 'update';
      blockId: string;
      before: ScheduleBlock;
      after: ScheduleBlock;
      reasonKey: string;
    }
  | {
      id: string;
      type: 'add';
      blockId: string;
      before: null;
      after: ScheduleBlock;
      reasonKey: string;
    }
  | {
      id: string;
      type: 'remove';
      blockId: string;
      before: ScheduleBlock;
      after: null;
      reasonKey: string;
    };

export type DecisionPlanPatchV1 = {
  id: string;
  generatedAt: string;
  date: string;
  operations: DecisionPlanOperationV1[];
  unplacedBlockIds: string[];
  beforeSnapshot: ScheduleBlock[];
  afterSnapshot: ScheduleBlock[];
  confirmedAt?: string;
  appliedAt?: string;
};

export type DecisionCandidateActionV1 = {
  id: string;
  kind: 'continue' | 'shorten' | 'move' | 'protect' | 'recover' | 'low_intensity' | 'switch_task' | 'leave_unplaced' | 'abstain';
  titleKey: string;
  descriptionKey: string;
  exactEffectKey: string;
  values?: Record<string, string | number>;
  protectsKey: string;
  feasibilityKey: string;
  uncertaintyKey: string;
  reversible: boolean;
  outcomeHorizon: DecisionOutcomeHorizon;
  outcomeFields: Array<'state' | 'task_result' | 'usefulness' | 'fatigue' | 'carryover'>;
  evidenceItemIds: string[];
  constraintIds: string[];
  planPatch: DecisionPlanPatchV1;
  policyTrace: Array<{ criterion: string; outcome: 'pass' | 'limited' | 'blocked'; reason: string }>;
};

export type DecisionFollowUpPlanV1 = {
  id: string;
  horizon: DecisionOutcomeHorizon;
  dueAt: string;
  requiredFields: DecisionCandidateActionV1['outcomeFields'];
  status: 'pending' | 'due' | 'completed' | 'skipped';
};

export type DecisionFollowUpOutcomeV1 = {
  id: string;
  recordedAt: string;
  state?: number;
  fatigue?: number;
  taskResult?: DecisionTaskResult;
  usefulness?: DecisionUsefulness;
  carryover?: 'none' | 'some' | 'significant';
  note?: string;
};

export type DecisionUndoStateV1 = {
  available: boolean;
  usedAt?: string;
  restoredSnapshotHash?: string;
};

export type DecisionLeverageReportV1 = {
  fixtureOnly: boolean;
  contextItemsAutoAssembled: number;
  questionsAvoided: number;
  questionsAsked: number;
  userTaps: number;
  decisionTimeMs: number;
  planActionsApplied: number;
  followUpCompleted: boolean;
  outcomeAvailable: boolean;
};

export type DecisionEpisodeV1 = {
  contractVersion: typeof DECISION_EPISODE_CONTRACT_VERSION;
  id: string;
  subject: {
    kind: 'owner' | 'demo';
    subjectId?: string;
  };
  status: DecisionEpisodeStatus;
  question: {
    type: DecisionQuestionType;
    text?: string;
    targetId?: string;
    targetLabel?: string;
  };
  targetOutcome: {
    horizon: DecisionOutcomeHorizon;
    fields: DecisionCandidateActionV1['outcomeFields'];
  };
  time: DecisionTimeSemanticsV1;
  contextSnapshot?: DecisionContextSnapshotV1;
  missingContext: DecisionMissingQuestionV1[];
  contextSources: DecisionSourceRefV1[];
  candidateActions: DecisionCandidateActionV1[];
  selectedActionId?: string;
  evidencePacket?: DecisionEvidencePacketV1;
  limitations: string[];
  safetyStatus: DecisionSafetyStatusV1;
  proposedPlanPatch?: DecisionPlanPatchV1;
  appliedPlanPatch?: DecisionPlanPatchV1;
  undoState: DecisionUndoStateV1;
  followUpPlan?: DecisionFollowUpPlanV1;
  followUpOutcomes: DecisionFollowUpOutcomeV1[];
  leverage?: DecisionLeverageReportV1;
  provenance: {
    origin: DataRecordOrigin;
    sourceIds: string[];
    syntheticOnly: boolean;
    containsRealUserData: boolean;
  };
  methodVersion: typeof DECISION_POLICY_VERSION;
  createdAt: string;
  updatedAt: string;
};

const ALLOWED_TRANSITIONS: Record<DecisionEpisodeStatus, DecisionEpisodeStatus[]> = {
  DRAFT: ['CONTEXT_ASSEMBLING', 'ABSTAINED'],
  CONTEXT_ASSEMBLING: ['NEEDS_INPUT', 'READY', 'ABSTAINED'],
  NEEDS_INPUT: ['CONTEXT_ASSEMBLING', 'READY', 'ABSTAINED'],
  READY: ['PROPOSED', 'ABSTAINED'],
  PROPOSED: ['ACCEPTED', 'READY', 'ABSTAINED'],
  ACCEPTED: ['APPLIED', 'PROPOSED', 'ABSTAINED'],
  APPLIED: ['FOLLOW_UP_DUE', 'PROPOSED', 'CLOSED'],
  FOLLOW_UP_DUE: ['OUTCOME_RECORDED', 'PROPOSED', 'CLOSED'],
  OUTCOME_RECORDED: ['CLOSED'],
  CLOSED: [],
  ABSTAINED: ['CLOSED'],
};

export class DecisionEpisodeTransitionError extends Error {
  constructor(from: DecisionEpisodeStatus, to: DecisionEpisodeStatus) {
    super(`Invalid Decision Episode transition: ${from} -> ${to}`);
    this.name = 'DecisionEpisodeTransitionError';
  }
}

export function canTransitionDecisionEpisode(from: DecisionEpisodeStatus, to: DecisionEpisodeStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function transitionDecisionEpisode(
  episode: DecisionEpisodeV1,
  status: DecisionEpisodeStatus,
  updatedAt: string,
): DecisionEpisodeV1 {
  if (episode.status === status) return episode;
  if (!canTransitionDecisionEpisode(episode.status, status)) {
    throw new DecisionEpisodeTransitionError(episode.status, status);
  }
  return { ...episode, status, updatedAt };
}

export function createDecisionEpisode(input: {
  id: string;
  questionType: DecisionQuestionType;
  questionText?: string;
  targetId?: string;
  subjectKind: 'owner' | 'demo';
  subjectId?: string;
  now: string;
  timezone: string;
  observationWindowStart: string;
  origin?: DataRecordOrigin;
}): DecisionEpisodeV1 {
  return {
    contractVersion: DECISION_EPISODE_CONTRACT_VERSION,
    id: input.id,
    subject: { kind: input.subjectKind, subjectId: input.subjectId },
    status: 'DRAFT',
    question: { type: input.questionType, text: input.questionText, targetId: input.targetId },
    targetOutcome: { horizon: 'end_of_day', fields: ['task_result', 'usefulness'] },
    time: {
      eventTime: input.now,
      recordedTime: input.now,
      availableAt: input.now,
      asOf: input.now,
      timezone: input.timezone,
      observationWindow: { start: input.observationWindowStart, end: input.now },
    },
    missingContext: [],
    contextSources: [],
    candidateActions: [],
    limitations: [],
    safetyStatus: { level: 'normal', matchedTerms: [], reasonCodes: [] },
    undoState: { available: false },
    followUpOutcomes: [],
    provenance: {
      origin: input.origin ?? (input.subjectKind === 'demo' ? 'DEBUG_FIXTURE' : 'OWNER_OBSERVED'),
      sourceIds: [],
      syntheticOnly: input.subjectKind === 'demo',
      containsRealUserData: input.subjectKind === 'owner',
    },
    methodVersion: DECISION_POLICY_VERSION,
    createdAt: input.now,
    updatedAt: input.now,
  };
}
