import React from 'react';
import { Text, View } from 'react-native';
import type { QuestTheme } from '../design/tokens';
import { flexibilityLabel, t, type Lang } from '../i18n';
import type { ScheduleBlock } from '../types';
import { deriveScheduleOpenWindows, SCHEDULE_DAY_START_MINUTES, SCHEDULE_DAY_END_MINUTES, scheduleMinutesToTime } from '../utils/scheduleCompiler';
import NativeDateTimeField from './NativeDateTimeField';
import { localDateValue, localTimeValue, scheduleConflicts, scheduleMinutes } from './nativeWorkflowValidation';
import { scheduleCopy as c } from './nativeScheduleCopy';

export function scheduleDayContext(date: string, blocks: ScheduleBlock[], excludeId?: string) {
  const active = blocks.filter(block => block.date === date && block.id !== excludeId && block.status !== 'skipped' && scheduleMinutes(block.startTime, block.endTime) > 0);
  const windows = deriveScheduleOpenWindows(SCHEDULE_DAY_START_MINUTES, SCHEDULE_DAY_END_MINUTES, active);
  return {
    plannedMinutes: active.reduce((sum, block) => sum + scheduleMinutes(block.startTime, block.endTime), 0),
    freeMinutes: windows.reduce((sum, window) => sum + window.endMinutes - window.startMinutes, 0),
    longestMinutes: Math.max(0, ...windows.map(window => window.endMinutes - window.startMinutes)),
    conflictCount: active.filter(block => scheduleConflicts(block, active, block.id).length > 0).length,
  };
}

export function canMoveScheduleBlock(block: ScheduleBlock) {
  return block.flexibility !== 'fixed' && !block.placementLocked && (block.status === 'planned' || block.status === 'adjusted');
}

export function NativeScheduleContext({ date, blocks, theme, lang, draft, excludeId, externalIds = [] }: {
  date: string; blocks: ScheduleBlock[]; theme: QuestTheme; lang: Lang;
  draft?: Pick<ScheduleBlock, 'date' | 'startTime' | 'endTime'>; excludeId?: string; externalIds?: string[];
}) {
  const context = scheduleDayContext(date, blocks, excludeId);
  const conflicts = draft ? scheduleConflicts(draft, blocks, excludeId) : [];
  const style = { color: theme.colors.textMuted, fontSize: theme.typography.bodySize, lineHeight: theme.typography.bodyLineHeight };
  return <View style={{ gap: theme.spacing.xs, paddingVertical: theme.spacing.sm }}>
    <Text style={style}>{c(lang, 'free')}: {context.freeMinutes} {t(lang, 'minutes')} · {c(lang, 'longest')}: {context.longestMinutes} {t(lang, 'minutes')}</Text>
    <Text style={style}>{c(lang, 'window')}: {scheduleMinutesToTime(SCHEDULE_DAY_START_MINUTES)}-{scheduleMinutesToTime(SCHEDULE_DAY_END_MINUTES)}</Text>
    {draft && scheduleMinutes(draft.startTime, draft.endTime) > 0 ? <Text accessibilityLiveRegion="polite" style={style}>{c(lang, conflicts.length ? 'conflicts' : 'noConflicts')}{conflicts.length ? `: ${conflicts.length}` : ''}</Text> : null}
    {conflicts.map(block => <Text key={block.id} style={style}>{block.startTime}-{block.endTime} · {block.title} · {externalIds.includes(block.id) ? c(lang, 'external') : flexibilityLabel(lang, block.flexibility)}</Text>)}
  </View>;
}

export default function NativeScheduleFields({ date, start, end, onDate, onStart, onEnd, theme, lang, disabled = false, blocks, excludeId, externalIds }: {
  date: string; start: string; end: string; onDate: (value: string) => void;
  onStart: (value: string) => void; onEnd: (value: string) => void; theme: QuestTheme; lang: Lang;
  disabled?: boolean; blocks?: ScheduleBlock[]; excludeId?: string; externalIds?: string[];
}) {
  return <View style={{ gap: theme.spacing.sm }}>
    <NativeDateTimeField disabled={disabled} theme={theme} lang={lang} mode="date" label={t(lang, 'date')}
      value={new Date(`${date}T12:00:00`)} onChange={value => onDate(localDateValue(value))} />
    <NativeDateTimeField disabled={disabled} theme={theme} lang={lang} mode="time" label={t(lang, 'start')}
      value={new Date(`${date}T${start}:00`)} onChange={value => onStart(localTimeValue(value))} />
    <NativeDateTimeField disabled={disabled} theme={theme} lang={lang} mode="time" label={t(lang, 'end')}
      value={new Date(`${date}T${end}:00`)} displayValue={end === '24:00' ? end : undefined}
      onChange={value => {
        const time = localTimeValue(value);
        // Native clocks call midnight 00:00; same-day blocks use 24:00 for their end.
        onEnd(time === '00:00' ? '24:00' : time);
      }} />
    {scheduleMinutes(start, end) <= 0 ? <Text accessibilityRole="alert" style={{ color: theme.colors.text, fontSize: theme.typography.bodySize }}>{t(lang, 'invalidTimeRange')}</Text> : null}
    {blocks ? <NativeScheduleContext date={date} draft={{ date, startTime: start, endTime: end }} blocks={blocks} excludeId={excludeId} externalIds={externalIds} theme={theme} lang={lang} /> : null}
  </View>;
}
