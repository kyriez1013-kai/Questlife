import type { PatternMemory, StateCheckIn } from '../types';
import type {
  TodayDecisionPatternReference,
  TodayDecisionPresentation,
} from '../utils/todayDecisionPresentation';
import type { TodayCommand } from '../utils/todayCommand';
import {
  buildV11TodayPresentation,
  type V11TodayPresentation,
} from '../v11/todayPresentation';

export type RebaselineScenario = 's0' | 's1' | 's3';

export type RebaselinePlanRow = {
  id: string;
  titleKey: string;
  metaKey: string;
  time: string;
  status: 'next' | 'later' | 'done';
};

export type RebaselineExecutionRow = {
  id: string;
  titleKey: string;
  metaKey: string;
  resultKey: string;
  timeKey: string;
};

export type RebaselineFixture = {
  scenario: RebaselineScenario;
  decision: V11TodayPresentation;
  stateCheckIns: StateCheckIn[];
  patternMemory: PatternMemory[];
  instantFeedback: 'useful' | 'not_useful' | null;
  latestRecordKey?: string;
  latestRecordMetaKey?: string;
  plan: RebaselinePlanRow[];
  recent: RebaselineExecutionRow[];
};

const fixtureDate = '2026-07-31';

function state(
  id: string,
  date: string,
  overall: number,
  timestamp: string,
): StateCheckIn {
  return {
    id,
    date,
    timestamp,
    overall,
    energy: overall,
    focus: overall,
    mood: overall,
    createdAt: timestamp,
  };
}

function acceptedPattern(): PatternMemory {
  return {
    id: 'fixture-pattern-low-friction-starter',
    createdAt: '2026-07-10T09:00:00.000Z',
    updatedAt: '2026-07-30T20:30:00.000Z',
    lastSeenAt: '2026-07-30T20:30:00.000Z',
    status: 'accepted',
    label: 'Low-friction starter',
    description: 'A short SQL review has repeatedly preceded a steadier focus state.',
    patternType: 'action_state_effect',
    evidenceBasis: 'personal_pattern',
    confidence: 0.78,
    sampleN: 4,
    support: [
      {
        sourceType: 'execution',
        sourceId: 'fixture-log-sql-1',
        ts: '2026-07-28T09:20:00.000Z',
        summary: 'Short SQL review followed by a higher recorded focus state.',
      },
      {
        sourceType: 'after_state',
        sourceId: 'fixture-state-after-1',
        ts: '2026-07-30T09:40:00.000Z',
        summary: 'Recorded state moved from 2 to 3 after a short starter.',
      },
    ],
  };
}

function command(
  scenario: RebaselineScenario,
): TodayCommand {
  if (scenario === 's0') {
    return {
      type: 'empty_state',
      titleKey: 'rebaselineRecordStateAction',
      reasonKey: 'rebaselineNoStateReason',
      primaryAction: 'start',
      secondaryActions: [],
      confidence: 'low',
    };
  }

  if (scenario === 's3') {
    return {
      type: 'start_skill',
      titleKey: 'rebaselineStartSqlReview',
      reasonKey: 'rebaselinePatternReason',
      primaryAction: 'start',
      secondaryActions: ['log'],
      linkedGoalId: 'fixture-goal-sql',
      linkedModuleId: 'fixture-module-review',
      linkedSkillId: 'fixture-skill-sql-review',
      plannedMinutes: 10,
      confidence: 'high',
    };
  }

  return {
    type: 'continue_plan',
    titleKey: 'rebaselineContinueSqlPractice',
    reasonKey: 'rebaselinePlanReason',
    primaryAction: 'start',
    secondaryActions: ['log'],
    linkedGoalId: 'fixture-goal-sql',
    linkedModuleId: 'fixture-module-practice',
    linkedSkillId: 'fixture-skill-sql-practice',
    scheduleBlockId: 'fixture-block-sql',
    plannedMinutes: 20,
    confidence: 'medium',
  };
}

function patternReference(
  scenario: RebaselineScenario,
): TodayDecisionPatternReference[] {
  if (scenario !== 's3') return [];
  return [{
    pattern_id: 'fixture-pattern-low-friction-starter',
    label: 'Low-friction starter',
    status: 'accepted',
    used_as: 'primary_evidence',
  }];
}

function decisionPresentation(
  scenario: RebaselineScenario,
): TodayDecisionPresentation {
  const executableCommand = command(scenario);
  const references = patternReference(scenario);
  return {
    status: 'ready',
    source: 'operating_brief',
    judgement: {
      kind: 'i18n',
      key: scenario === 's0'
        ? 'rebaselineS0Judgement'
        : scenario === 's3'
          ? 'rebaselineS3Judgement'
          : 'rebaselineS1Judgement',
    },
    executableCommand,
    actionLabel: {
      kind: 'i18n',
      key: executableCommand.titleKey,
    },
    actionReason: {
      kind: 'i18n',
      key: executableCommand.reasonKey,
    },
    readiness: {
      band: scenario === 's3' ? 'yellow' : 'unknown',
      score: null,
    },
    details: {
      evidence: scenario === 's0'
        ? []
        : [
            {
              id: 'fixture-evidence-state',
              type: 'state',
              copy: {
                kind: 'i18n',
                key: scenario === 's3'
                  ? 'rebaselineEvidenceLowState'
                  : 'rebaselineEvidenceCurrentState',
              },
              confidence: scenario === 's3' ? 'medium' : 'low',
            },
            {
              id: 'fixture-evidence-plan',
              type: 'schedule',
              copy: {
                kind: 'i18n',
                key: 'rebaselineEvidenceScheduledSql',
              },
              confidence: 'high',
            },
          ],
      confidence: {
        value: scenario === 's3' ? 0.78 : scenario === 's1' ? 0.38 : null,
        label: scenario === 's3' ? 'high' : 'low',
        basis: scenario === 's3' ? 'personal_pattern' : undefined,
      },
      patternReferences: references,
      dataGaps: scenario === 's0' ? ['current_state'] : [],
      feedback: {
        enabled: scenario !== 's0',
        decisionResultId: scenario !== 's0' ? `fixture-decision-${scenario}` : undefined,
        value: scenario === 's3' ? 'useful' : null,
      },
      scheduleProposals: [],
    },
  };
}

function stateRows(scenario: RebaselineScenario): StateCheckIn[] {
  if (scenario === 's0') return [];
  if (scenario === 's1') {
    return [
      state('fixture-state-current', fixtureDate, 3, '2026-07-31T08:20:00.000Z'),
    ];
  }
  return [
    state('fixture-state-current', fixtureDate, 2, '2026-07-31T08:20:00.000Z'),
    state('fixture-state-prior', '2026-07-30', 2, '2026-07-30T08:10:00.000Z'),
  ];
}

const plan: RebaselinePlanRow[] = [
  {
    id: 'fixture-plan-sql',
    titleKey: 'rebaselineSqlPractice',
    metaKey: 'rebaselineTwentyMinuteFocus',
    time: '09:30',
    status: 'next',
  },
  {
    id: 'fixture-plan-walk',
    titleKey: 'rebaselineRecoveryWalk',
    metaKey: 'rebaselineTenMinuteReset',
    time: '13:00',
    status: 'later',
  },
  {
    id: 'fixture-plan-review',
    titleKey: 'rebaselineReviewNotes',
    metaKey: 'rebaselineFifteenMinuteReview',
    time: '18:30',
    status: 'later',
  },
];

const recent: RebaselineExecutionRow[] = [
  {
    id: 'fixture-execution-bench',
    titleKey: 'rebaselineBenchPress',
    metaKey: 'rebaselineBenchMeta',
    resultKey: 'rebaselineQualityFour',
    timeKey: 'rebaselineTimeMorning',
  },
  {
    id: 'fixture-execution-sql',
    titleKey: 'rebaselineSqlReview',
    metaKey: 'rebaselineSqlMeta',
    resultKey: 'rebaselineFocusImproved',
    timeKey: 'rebaselineYesterday',
  },
  {
    id: 'fixture-execution-writing',
    titleKey: 'rebaselineDraftRevision',
    metaKey: 'rebaselineWritingMeta',
    resultKey: 'rebaselineQualityThree',
    timeKey: 'rebaselineTuesday',
  },
];

export function buildRebaselineFixture(
  scenario: RebaselineScenario,
): RebaselineFixture {
  const stateCheckIns = stateRows(scenario);
  const patternMemory = scenario === 's3' ? [acceptedPattern()] : [];
  const decision = decisionPresentation(scenario);

  return {
    scenario,
    decision: buildV11TodayPresentation({
      today: fixtureDate,
      stateCheckIns,
      patternMemory,
      patternReferences: decision.details.patternReferences,
      decision,
    }),
    stateCheckIns,
    patternMemory,
    instantFeedback: scenario === 's3' ? 'useful' : null,
    latestRecordKey: scenario === 's0' ? undefined : 'rebaselineLatestRecord',
    latestRecordMetaKey: scenario === 's0' ? undefined : 'rebaselineLatestRecordMeta',
    plan,
    recent: scenario === 's0' ? [] : recent,
  };
}
