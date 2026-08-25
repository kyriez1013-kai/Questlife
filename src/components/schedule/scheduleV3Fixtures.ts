import type { Category, ScheduleBlock, Skill } from '../../types';

export type ScheduleV3FixtureId = 's0' | 's1' | 's2' | 's3' | 's4';

export type ScheduleV3Fixture = {
  nowMinutes: number;
  categories: Category[];
  skills: Skill[];
  scheduleBlocks: ScheduleBlock[];
};

type Language = 'zh' | 'en';

function timeDifference(startTime: string, endTime: string) {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  return endHour * 60 + endMinute - startHour * 60 - startMinute;
}

function scheduleFixtureBlock(
  date: string,
  index: number,
  input: Omit<ScheduleBlock, 'id' | 'date' | 'createdAt'>,
): ScheduleBlock {
  return {
    ...input,
    id: `schedule-v3-fixture-${index}`,
    date,
    createdAt: Date.parse(`${date}T06:${String(index).padStart(2, '0')}:00`),
  };
}

export function buildScheduleV3Fixture(id: ScheduleV3FixtureId, date: string, language: Language): ScheduleV3Fixture {
  const copy = language === 'zh'
    ? {
      goal: '量化分析师',
      sql: 'SQL 练习',
      writing: '写作输出',
      workout: '力量训练',
      reading: '论文阅读',
      meeting: '团队会议',
      class: '课程',
      appointment: '固定预约',
    }
    : {
      goal: 'Quant Analyst',
      sql: 'SQL practice',
      writing: 'Writing output',
      workout: 'Strength training',
      reading: 'Read paper',
      meeting: 'Team meeting',
      class: 'Class',
      appointment: 'Fixed appointment',
    };
  const categories: Category[] = [{ id: 'schedule-v3-goal', name: copy.goal, goalType: 'career', createdAt: 1 }];
  const skill = (idValue: string, name: string, taskType: Skill['taskType']): Skill => ({
    id: idValue,
    name,
    color: '#6F8CA8',
    totalXP: 0,
    dailyTargetMinutes: 30,
    createdAt: 2,
    categoryId: categories[0].id,
    taskType,
    scheduleEnabled: false,
    flexibility: 'flexible',
    rigidity: 'medium',
  });
  const skills: Skill[] = [
    skill('schedule-v3-sql', copy.sql, 'deep_study'),
    skill('schedule-v3-writing', copy.writing, 'creative_building'),
    skill('schedule-v3-workout', copy.workout, 'strength_training'),
    skill('schedule-v3-reading', copy.reading, 'light_review'),
  ];
  const fixed = (index: number, title: string, startTime: string, endTime: string) => scheduleFixtureBlock(date, index, {
    title,
    startTime,
    endTime,
    plannedMinutes: timeDifference(startTime, endTime),
    taskType: 'admin',
    flexibility: 'fixed',
    rigidity: 'high',
    status: 'planned',
    placementLocked: true,
    source: 'manual',
  });
  const flexible = (
    index: number,
    title: string,
    startTime: string,
    endTime: string,
    linkedSkillId: string,
    status: ScheduleBlock['status'] = 'planned',
  ) => scheduleFixtureBlock(date, index, {
    title,
    startTime,
    endTime,
    plannedMinutes: timeDifference(startTime, endTime),
    linkedGoalId: categories[0].id,
    linkedSkillId,
    taskType: skills.find((item) => item.id === linkedSkillId)?.taskType ?? 'deep_study',
    flexibility: 'flexible',
    rigidity: 'medium',
    status,
    placementLocked: false,
    source: 'manual',
  });

  if (id === 's0') return { nowMinutes: 8 * 60 + 30, categories, skills, scheduleBlocks: [] };
  if (id === 's1') {
    return {
      nowMinutes: 8 * 60 + 30,
      categories,
      skills,
      scheduleBlocks: [
        fixed(1, copy.meeting, '10:00', '11:00'),
        fixed(2, copy.class, '14:00', '16:00'),
        flexible(3, copy.sql, '09:00', '09:45', 'schedule-v3-sql'),
        flexible(4, copy.writing, '10:30', '11:30', 'schedule-v3-writing'),
        flexible(5, copy.workout, '14:30', '15:45', 'schedule-v3-workout'),
      ],
    };
  }
  if (id === 's2') {
    return {
      nowMinutes: 8 * 60,
      categories,
      skills,
      scheduleBlocks: [
        fixed(1, copy.meeting, '07:00', '12:00'),
        fixed(2, copy.class, '12:30', '18:00'),
        fixed(3, copy.appointment, '18:30', '22:00'),
        flexible(4, copy.sql, '09:00', '11:00', 'schedule-v3-sql'),
        flexible(5, copy.writing, '14:00', '16:00', 'schedule-v3-writing'),
      ],
    };
  }
  if (id === 's3') {
    return {
      nowMinutes: 14 * 60 + 20,
      categories,
      skills,
      scheduleBlocks: [
        flexible(1, copy.sql, '08:00', '09:00', 'schedule-v3-sql', 'completed'),
        flexible(2, copy.reading, '10:00', '10:45', 'schedule-v3-reading', 'skipped'),
        fixed(3, copy.meeting, '14:00', '15:00'),
        flexible(4, copy.workout, '18:00', '19:15', 'schedule-v3-workout'),
      ],
    };
  }
  return {
    nowMinutes: 11 * 60 + 5,
    categories,
    skills,
    scheduleBlocks: [
      flexible(1, copy.sql, '08:00', '09:00', 'schedule-v3-sql', 'completed'),
      fixed(2, copy.meeting, '10:00', '11:00'),
      flexible(3, copy.writing, '11:30', '12:30', 'schedule-v3-writing'),
      fixed(4, copy.class, '14:00', '16:00'),
      flexible(5, copy.workout, '14:30', '15:45', 'schedule-v3-workout'),
      flexible(6, copy.reading, '16:00', '17:00', 'schedule-v3-reading'),
    ],
  };
}
