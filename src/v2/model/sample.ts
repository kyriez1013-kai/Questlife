import type { ContextLog, ExecutionLog, StateCheckIn } from '../../types';
import { buildTodayModel, localDateKey, type TodayModel, type TodaySlices } from './todayModel';

/**
 * Example data. It lives ONLY in memory, is rendered inside a sample-only shell, and is never passed to the Store.
 * Ids are prefixed `sample-` so a leak into persistence would be detectable by `isSampleId`.
 */
export const isSampleId = (id: string) => id.startsWith('sample-');

export function buildSampleSlices(now: Date): TodaySlices {
  const day = 86400000;
  const iso = (t: number) => new Date(t).toISOString();
  const key = (t: number) => localDateKey(new Date(t));
  const states: StateCheckIn[] = [6, 5, 4, 3, 2, 1, 0].map((d, i) => ({
    id: `sample-s${i}`, date: key(now.getTime() - d * day), timestamp: iso(now.getTime() - d * day - 3600000),
    createdAt: iso(now.getTime() - d * day - 3600000), timeBlock: 'morning' as const, overall: [3, 4, 2, 4, 3, 4, 4][i], energy: [3, 4, 2, 4, 3, 4, 4][i],
  }));
  const sleeps: ContextLog[] = [6, 5, 4, 3, 2, 1, 0].map((d, i) => ({
    id: `sample-c${i}`, type: 'sleep' as const, label: '睡眠', date: key(now.getTime() - d * day), createdAt: iso(now.getTime() - d * day - 7200000),
    value: [400, 450, 340, 470, 410, 460, 455][i], unit: '分钟', source: 'manual' as const,
  }));
  const logs: ExecutionLog[] = [5, 3, 1].map((d, i) => ({
    id: `sample-e${i}`, date: key(now.getTime() - d * day), durationMinutes: [45, 50, 40][i], title: '卧推', source: 'manual' as const,
    createdAt: iso(now.getTime() - d * day - 5400000), structuredData: { weightKg: [57.5, 60, 60][i], sets: 5, reps: 5 },
  }));
  return {
    executionLogs: logs, stateCheckIns: states, contextLogs: sleeps, scheduleBlocks: [], rawCaptures: [],
    skills: [], categories: [], moduleSkillLinks: [],
  };
}

export function buildSampleToday(now: Date): TodayModel {
  return buildTodayModel(buildSampleSlices(now), now);
}
