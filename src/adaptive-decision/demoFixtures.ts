import analysisExtension from '../quant-product/fixtures/analysis_extension_v1.json';
import driverBundle from '../quant-product/fixtures/driver_analysis_full.json';
import type {
  Category,
  ContextLog,
  DataRecordProvenance,
  ExecutionLog,
  ScheduleBlock,
  Skill,
  StateCheckIn,
} from '../types';
import type { Lang } from '../i18n';
import type { DecisionEngineData } from './decisionEngine';
import type { DecisionQuestionType, DecisionFollowUpOutcomeV1 } from './decisionEpisode';

export type AdaptiveDecisionDemoScenarioId = 'training' | 'cognitive' | 'overloaded';

export type AdaptiveDecisionDemoFixture = {
  id: AdaptiveDecisionDemoScenarioId;
  questionType: DecisionQuestionType;
  questionText: string;
  title: string;
  description: string;
  now: string;
  timezone: string;
  observationWindowStart: string;
  data: DecisionEngineData;
  quantProduct: unknown;
  quantAnalysis: unknown;
  sampleOutcome: Omit<DecisionFollowUpOutcomeV1, 'id' | 'recordedAt'>;
  initialAnswers?: Record<string, string>;
};

const DEMO_NOW = '2025-05-02T07:59:00+08:00';

function provenance(at: string): DataRecordProvenance {
  return {
    schemaVersion: 'questlife.data.provenance.v1',
    origin: 'DEBUG_FIXTURE',
    confirmation: 'NOT_REQUIRED',
    captureMethod: 'manual_form',
    recordedAt: at,
    availableAt: at,
    timezone: 'Asia/Shanghai',
    protocolVersion: 'adaptive-decision-demo-v1',
    instrumentVersion: 'adaptive-decision-demo-v1',
  };
}

function scheduleBlock(input: {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  minutes: number;
  flexibility: ScheduleBlock['flexibility'];
  rigidity?: ScheduleBlock['rigidity'];
  taskType: ScheduleBlock['taskType'];
  linkedGoalId?: string;
  linkedSkillId?: string;
}): ScheduleBlock {
  return {
    id: input.id,
    title: input.title,
    date: '2025-05-02',
    startTime: input.startTime,
    endTime: input.endTime,
    plannedMinutes: input.minutes,
    linkedGoalId: input.linkedGoalId,
    linkedSkillId: input.linkedSkillId,
    taskType: input.taskType,
    flexibility: input.flexibility,
    rigidity: input.rigidity ?? (input.flexibility === 'fixed' ? 'high' : 'medium'),
    status: 'planned',
    createdAt: 1,
    source: 'manual',
  };
}

function state(overall: number, focus: number, energy: number): StateCheckIn {
  const at = '2025-05-02T07:40:00+08:00';
  return {
    id: 'demo-state-current',
    date: '2025-05-02',
    timestamp: at,
    overall,
    focus,
    energy,
    mood: 3,
    physical: overall,
    stress: 4,
    createdAt: at,
    dataProvenance: provenance(at),
  };
}

function sleep(hours: number): ContextLog {
  const at = '2025-05-02T06:45:00+08:00';
  return {
    id: 'demo-sleep-current',
    date: '2025-05-02',
    createdAt: at,
    type: 'sleep',
    label: 'sleep duration',
    value: hours,
    unit: 'hours',
    source: 'manual',
    dataProvenance: {
      ...provenance(at),
      eventStartAt: '2025-05-02T01:15:00+08:00',
      eventEndAt: at,
    },
  };
}

function execution(id: string, title: string, minutes: number, at: string): ExecutionLog {
  return {
    id,
    date: at.slice(0, 10),
    durationMinutes: minutes,
    title,
    source: 'manual',
    qualityRating: 3,
    createdAt: at,
    appliedToProgress: true,
    dataProvenance: provenance(at),
  };
}

function category(id: string, name: string): Category {
  return { id, name, createdAt: 1 };
}

function skill(id: string, name: string, goalId: string, taskType: Skill['taskType']): Skill {
  return {
    id,
    name,
    color: '#8C9FB7',
    totalXP: 0,
    dailyTargetMinutes: 45,
    createdAt: 1,
    categoryId: goalId,
    goalId,
    progressType: 'time_based',
    taskType,
  };
}

function strings(lang: Lang) {
  return lang === 'zh' ? {
    training: {
      title: '训练还是恢复',
      description: '低状态、较短睡眠和近期训练负荷同时存在。',
      question: '我现在状态不好，今天还要不要训练？',
      workout: '力量训练',
      reading: 'SQL 阅读',
      fixed: '固定晚间承诺',
      goal: '稳定提升力量',
      skill: '力量训练',
    },
    cognitive: {
      title: '继续还是调整任务',
      description: '专注较低，阅读任务后还有固定承诺。',
      question: '我现在脑子很慢，但还有文章要读，应该继续吗？',
      reading: '阅读研究文章',
      fixed: '固定会议',
      admin: '整理阅读笔记',
      goal: '完成研究阅读',
      skill: '深度阅读',
    },
    overloaded: {
      title: '重新安排今天',
      description: '两个固定承诺和三项灵活任务超过可用容量。',
      question: '今天事情太多，怎么调整？',
      priority: '完成 SQL 核心章节',
      admin: '处理行政事项',
      workout: '力量训练',
      fixedMorning: '固定课程',
      fixedEvening: '固定晚间承诺',
      goal: '完成 SQL 课程',
      skill: 'SQL 学习',
    },
  } : {
    training: {
      title: 'Train or recover',
      description: 'Low state, shorter sleep and recent training load are present together.',
      question: 'I feel off. Should I still train today?',
      workout: 'Strength training',
      reading: 'SQL reading',
      fixed: 'Fixed evening commitment',
      goal: 'Build strength consistently',
      skill: 'Strength training',
    },
    cognitive: {
      title: 'Continue or adjust',
      description: 'Focus is low and a fixed commitment follows the reading block.',
      question: 'My thinking is slow, but I still have an article to read. Should I continue?',
      reading: 'Read research article',
      fixed: 'Fixed meeting',
      admin: 'Organise reading notes',
      goal: 'Complete research reading',
      skill: 'Deep reading',
    },
    overloaded: {
      title: 'Replan today',
      description: 'Two fixed commitments and three flexible tasks exceed available capacity.',
      question: 'There is too much today. How should I adjust it?',
      priority: 'Complete core SQL chapter',
      admin: 'Life admin',
      workout: 'Strength training',
      fixedMorning: 'Fixed class',
      fixedEvening: 'Fixed evening commitment',
      goal: 'Complete SQL course',
      skill: 'SQL study',
    },
  };
}

export function createAdaptiveDecisionDemoFixture(
  id: AdaptiveDecisionDemoScenarioId,
  lang: Lang,
): AdaptiveDecisionDemoFixture {
  const copy = strings(lang);
  if (id === 'training') {
    const goal = category('demo-goal-strength', copy.training.goal);
    const trainingSkill = skill('demo-skill-strength', copy.training.skill, goal.id, 'strength_training');
    return {
      id,
      questionType: 'training_recovery',
      questionText: copy.training.question,
      title: copy.training.title,
      description: copy.training.description,
      now: DEMO_NOW,
      timezone: 'Asia/Shanghai',
      observationWindowStart: '2025-04-02T00:00:00+08:00',
      data: {
        stateCheckIns: [state(2, 2, 2)],
        contextLogs: [sleep(5.5)],
        executionLogs: [
          execution('demo-exec-1', copy.training.workout, 70, '2025-05-01T18:00:00+08:00'),
          execution('demo-exec-2', copy.training.workout, 65, '2025-04-30T18:00:00+08:00'),
          execution('demo-exec-3', copy.training.workout, 55, '2025-04-29T18:00:00+08:00'),
        ],
        scheduleBlocks: [
          scheduleBlock({ id: 'demo-training', title: copy.training.workout, startTime: '18:00', endTime: '19:00', minutes: 60, flexibility: 'movable', taskType: 'strength_training', linkedGoalId: goal.id, linkedSkillId: trainingSkill.id }),
          scheduleBlock({ id: 'demo-reading', title: copy.training.reading, startTime: '20:00', endTime: '20:45', minutes: 45, flexibility: 'flexible', taskType: 'deep_study' }),
          scheduleBlock({ id: 'demo-fixed-evening', title: copy.training.fixed, startTime: '21:00', endTime: '22:00', minutes: 60, flexibility: 'fixed', taskType: 'life_maintenance' }),
        ],
        goals: [],
        categories: [goal],
        skills: [trainingSkill],
      },
      quantProduct: driverBundle,
      quantAnalysis: analysisExtension,
      sampleOutcome: { state: 3, fatigue: 2, taskResult: 'completed', usefulness: 'helpful' },
    };
  }

  if (id === 'cognitive') {
    const goal = category('demo-goal-reading', copy.cognitive.goal);
    const readingSkill = skill('demo-skill-reading', copy.cognitive.skill, goal.id, 'deep_study');
    return {
      id,
      questionType: 'cognitive_adjustment',
      questionText: copy.cognitive.question,
      title: copy.cognitive.title,
      description: copy.cognitive.description,
      now: DEMO_NOW,
      timezone: 'Asia/Shanghai',
      observationWindowStart: '2025-04-02T00:00:00+08:00',
      data: {
        stateCheckIns: [state(2, 1, 2)],
        contextLogs: [sleep(6)],
        executionLogs: [
          execution('demo-read-1', copy.cognitive.reading, 45, '2025-05-01T14:00:00+08:00'),
          execution('demo-read-2', copy.cognitive.admin, 25, '2025-04-30T14:00:00+08:00'),
        ],
        scheduleBlocks: [
          scheduleBlock({ id: 'demo-cognitive-reading', title: copy.cognitive.reading, startTime: '18:00', endTime: '19:00', minutes: 60, flexibility: 'movable', taskType: 'deep_study', linkedGoalId: goal.id, linkedSkillId: readingSkill.id }),
          scheduleBlock({ id: 'demo-cognitive-fixed', title: copy.cognitive.fixed, startTime: '19:30', endTime: '21:00', minutes: 90, flexibility: 'fixed', taskType: 'admin' }),
        ],
        goals: [],
        categories: [goal],
        skills: [readingSkill],
      },
      quantProduct: driverBundle,
      quantAnalysis: analysisExtension,
      sampleOutcome: { state: 3, taskResult: 'partially_completed', usefulness: 'helpful' },
    };
  }

  const goal = category('demo-goal-sql', copy.overloaded.goal);
  const sqlSkill = skill('demo-skill-sql', copy.overloaded.skill, goal.id, 'deep_study');
  return {
    id,
    questionType: 'overloaded_day',
    questionText: copy.overloaded.question,
    title: copy.overloaded.title,
    description: copy.overloaded.description,
    now: DEMO_NOW,
    timezone: 'Asia/Shanghai',
    observationWindowStart: '2025-04-02T00:00:00+08:00',
    data: {
      stateCheckIns: [state(3, 3, 3)],
      contextLogs: [sleep(7)],
      executionLogs: [execution('demo-overload-exec', copy.overloaded.priority, 60, '2025-05-01T10:00:00+08:00')],
      scheduleBlocks: [
        scheduleBlock({ id: 'demo-fixed-morning', title: copy.overloaded.fixedMorning, startTime: '08:00', endTime: '11:00', minutes: 180, flexibility: 'fixed', taskType: 'deep_study' }),
        scheduleBlock({ id: 'demo-priority', title: copy.overloaded.priority, startTime: '11:30', endTime: '14:00', minutes: 150, flexibility: 'flexible', rigidity: 'high', taskType: 'deep_study', linkedGoalId: goal.id, linkedSkillId: sqlSkill.id }),
        scheduleBlock({ id: 'demo-admin', title: copy.overloaded.admin, startTime: '14:15', endTime: '15:45', minutes: 90, flexibility: 'movable', rigidity: 'low', taskType: 'admin' }),
        scheduleBlock({ id: 'demo-overload-training', title: copy.overloaded.workout, startTime: '16:00', endTime: '18:00', minutes: 120, flexibility: 'movable', rigidity: 'low', taskType: 'strength_training' }),
        scheduleBlock({ id: 'demo-fixed-evening', title: copy.overloaded.fixedEvening, startTime: '18:30', endTime: '22:00', minutes: 210, flexibility: 'fixed', taskType: 'life_maintenance' }),
      ],
      goals: [],
      categories: [goal],
      skills: [sqlSkill],
    },
    quantProduct: driverBundle,
    quantAnalysis: analysisExtension,
    sampleOutcome: { state: 3, taskResult: 'completed', carryover: 'some', usefulness: 'helpful' },
    initialAnswers: { priority: 'first' },
  };
}
