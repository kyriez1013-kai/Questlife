import type { AppData, ContextLog, ExecutionLog, RawCapture, ScheduleBlock, Skill, StateCheckIn, Category, ModuleSkillLink } from '../../types';
import { buildTodayCommand, type TodayCommand, type TodayCommandAction } from '../../utils/todayCommand';
import { QuickCaptureSuggestionEngineV1, type QuickCaptureSuggestion } from '../../platform/quickCapture';
import { buildEvidenceCards, unlockHint, type EvidenceCard } from './evidence';

/**
 * Today view-model. `todayCommand` stays the single authority for the next step;
 * this file only reshapes data for display. Missing is missing: nothing is defaulted to 0.
 */
export type TodaySlices = {
  executionLogs: ExecutionLog[];
  stateCheckIns: StateCheckIn[];
  scheduleBlocks: ScheduleBlock[];
  rawCaptures: RawCapture[];
  contextLogs: ContextLog[];
  skills: Skill[];
  categories: Category[];
  moduleSkillLinks: ModuleSkillLink[];
};

export type TodayRecordRow = {
  id: string;
  title: string;
  /** actual values only, each with its own unit */
  actual: string[];
  /** predicted values, shown separately and only when they exist */
  predicted: string[];
  timeLabel: string;
};

export type TodayModel = {
  dateKey: string;
  command: TodayCommand;
  action: TodayCommandAction;
  state: { overall: number; label: string; timeLabel: string } | null;
  pendingCapture: RawCapture | null;
  records: TodayRecordRow[];
  quick: QuickCaptureSuggestion[];
  evidence: EvidenceCard[];
  hint: string | null;
  nextBlock: ScheduleBlock | null;
};

export function localDateKey(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function hhmm(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const STATE_LABEL = ['', '很差', '较差', '一般', '不错', '极佳'];
export const stateLabel = (n: number) => STATE_LABEL[Math.max(1, Math.min(5, Math.round(n)))] ?? '';

const alive = (x: { dataProvenance?: { deleted?: boolean } }) => !x.dataProvenance?.deleted;

export function recordRow(log: ExecutionLog, skillName?: string): TodayRecordRow {
  const actual: string[] = [];
  const sd = (log.structuredData ?? {}) as Record<string, unknown>;
  if (log.durationMinutes > 0) actual.push(`${log.durationMinutes} 分钟`);
  if (typeof sd.weightKg === 'number') actual.push(`${sd.weightKg} kg`);
  if (typeof sd.sets === 'number' && typeof sd.reps === 'number') actual.push(`${sd.sets} 组 × ${sd.reps} 次`);
  else if (typeof sd.sets === 'number') actual.push(`${sd.sets} 组`);
  if (log.qualityRating != null) actual.push(`质量 ${log.qualityRating}/5`);
  const predicted: string[] = [];
  if (log.predictedDurationMinutes != null) predicted.push(`预计 ${log.predictedDurationMinutes} 分钟`);
  if (log.predictedQualityRating != null) predicted.push(`预计质量 ${log.predictedQualityRating}/5`);
  return {
    id: log.id,
    title: skillName ?? log.title ?? log.orphanedSkillName ?? '未命名记录',
    actual,
    predicted,
    timeLabel: hhmm(log.createdAt),
  };
}

export function buildTodayModel(slices: TodaySlices, now: Date): TodayModel {
  const dateKey = localDateKey(now);
  const todayLogs = slices.executionLogs.filter((l) => l.date === dateKey && alive(l));
  const todayBlocks = slices.scheduleBlocks.filter((b) => b.date === dateKey);
  const latestState = slices.stateCheckIns
    .filter((s) => s.date === dateKey && alive(s))
    .sort((a, b) => (b.timestamp ?? b.createdAt).localeCompare(a.timestamp ?? a.createdAt))[0] ?? null;

  // todayCommand is the authority; it only reads these slices of AppData.
  const partial = {
    rawCaptures: slices.rawCaptures,
    executionLogs: slices.executionLogs,
    skills: slices.skills,
    moduleSkillLinks: slices.moduleSkillLinks,
    categories: slices.categories,
  } as unknown as AppData;
  const command = buildTodayCommand({ data: partial, now, scheduleBlocks: todayBlocks, todayLogs, latestState });

  const skillName = (id?: string) => (id ? slices.skills.find((s) => s.id === id)?.name : undefined);
  const pending = command.type === 'finish_pending_capture'
    ? (slices.rawCaptures.filter((c) => c.parseStatus === 'pending' || c.parseStatus === 'failed' || (c.parseStatus === 'done' && !c.parsed?.entriesDismissed))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null)
    : null;

  const evidence = buildEvidenceCards({
    stateCheckIns: slices.stateCheckIns,
    contextLogs: slices.contextLogs,
    executionLogs: slices.executionLogs,
    skillNames: Object.fromEntries(slices.skills.map((s) => [s.id, s.name])),
  });

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return (h || 0) * 60 + (m || 0); };
  const nextBlock = todayBlocks
    .filter((b) => b.status !== 'completed' && b.status !== 'skipped' && toMin(b.endTime) > nowMin)
    .sort((a, b) => toMin(a.startTime) - toMin(b.startTime))[0] ?? null;

  const quick = QuickCaptureSuggestionEngineV1({
    data: { ...(partial as AppData), scheduleBlocks: slices.scheduleBlocks, rawCaptures: slices.rawCaptures } as AppData,
    now,
  });

  return {
    dateKey,
    command,
    action: command.primaryAction,
    state: latestState ? { overall: latestState.overall, label: stateLabel(latestState.overall), timeLabel: hhmm(latestState.timestamp ?? latestState.createdAt) } : null,
    pendingCapture: pending,
    records: todayLogs
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 8)
      .map((l) => recordRow(l, skillName(l.linkedSkillId))),
    quick,
    evidence,
    hint: unlockHint(evidence),
    nextBlock,
  };
}
