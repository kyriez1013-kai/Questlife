import React, { useEffect, useRef, useState } from 'react';
import { AppState, Linking, Text, View } from 'react-native';
import BottomSheetForm from '../components/BottomSheetForm';
import QuestButton from '../components/ui/QuestButton';
import { useStore } from '../store';
import { useQuestTheme } from '../design/useQuestTheme';
import { getLanguage } from '../i18n';
import type { ScheduleBlock } from '../types';
import type { CalendarExportStatus, DeviceCalendar, PermissionState } from '../platform/contracts';
import { calendarSource } from '../platform/services';
import { useDeviceData } from '../platform/useDeviceData';
import { nativeCopy as c } from '../platform/nativeI18n';
import { workflowCopy } from './nativeWorkflowCopy';
import { confirmAction } from '../utils/confirm';

const planKey = (block: ScheduleBlock | undefined) => JSON.stringify(block ? [block.id, block.title, block.date, block.startTime, block.endTime, block.status] : null);
const statusCopy = {
  not_exported: 'calendarNotExported', synced: 'calendarCurrent', needs_review: 'calendarNeedsReview',
  pending: 'calendarPending', retry: 'calendarRetryStatus', ambiguous: 'calendarAmbiguous',
  inactive: 'calendarInactive', deleted: 'calendarDeleted',
} as const;

export default function NativeScheduleCalendarSheet({ blockId, onClose }: { blockId: string; onClose: () => void }) {
  const { data } = useStore();
  const block = data.scheduleBlocks.find(row => row.id === blockId);
  const latestBlock = useRef<ScheduleBlock | undefined>(block);
  latestBlock.current = block;
  const q = useQuestTheme(data.settings.selectedThemeId);
  const lang = getLanguage(data.settings.language);
  const device = useDeviceData();
  const [calendars, setCalendars] = useState<DeviceCalendar[]>([]);
  const [permission, setPermission] = useState<PermissionState>('not_requested');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [planChanged, setPlanChanged] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [statusError, setStatusError] = useState(false);
  const [snapshot, setSnapshot] = useState<{ key: string; calendar: typeof device.data.calendar; rows: Record<string, CalendarExportStatus> }>();
  const currentKey = planKey(block);
  const running = useRef(false);
  const run = async (job: () => Promise<unknown>) => {
    if (running.current) return;
    running.current = true; setBusy(true); setError(false);
    try { await job(); } catch { setError(true); } finally { running.current = false; setBusy(false); setRefreshVersion(value => value + 1); }
  };
  const load = async (request: boolean) => {
    const next = await (request ? calendarSource.requestPermission() : calendarSource.permission());
    setPermission(next);
    setCalendars(next === 'granted' ? await calendarSource.listCalendars() : []);
  };
  useEffect(() => {
    void run(() => load(false));
    const subscription = AppState.addEventListener('change', next => { if (next === 'active') void run(() => load(false)); });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    let active = true;
    setStatusError(false);
    const current = latestBlock.current;
    void Promise.all(calendars.map(async calendar => [calendar.id, await calendarSource.getBlockExportStatus(calendar.id, blockId, current)] as const))
      .then(rows => { if (active) setSnapshot({ key: currentKey, calendar: device.data.calendar, rows: Object.fromEntries(rows) }); })
      .catch(() => { if (active) { setSnapshot(undefined); setStatusError(true); } });
    return () => { active = false; };
  }, [calendars, blockId, currentKey, device.data.calendar, refreshVersion]);
  const confirmWrite = (calendarId: string, status: CalendarExportStatus, retry: boolean) => {
    if (running.current) return;
    const expectedKey = currentKey;
    setPlanChanged(false);
    confirmAction({ title: c(lang, 'calendar'), message: workflowCopy(lang, retry && status.operation?.kind === 'delete' ? 'calendarRetryDeleteConfirm' : 'calendarWriteConfirm'),
      confirmText: workflowCopy(lang, retry ? 'calendarRetry' : 'calendarWrite'), cancelText: c(lang, 'cancel'),
      destructive: retry && status.operation?.kind === 'delete',
      onConfirm: () => {
        if (planKey(latestBlock.current) !== expectedKey) { setPlanChanged(true); return; }
        void run(async () => {
          const current = latestBlock.current;
          const next = await calendarSource.getBlockExportStatus(calendarId, blockId, current);
          if (planKey(latestBlock.current) !== expectedKey) { setPlanChanged(true); return; }
          if (retry) {
            if (!status.operation || next.operation?.id !== status.operation.id || !['pending', 'retry'].includes(next.state)) throw new Error('calendar_retry_state_changed');
            await calendarSource.retryOperation(status.operation.id, { confirmed: true }, current);
          } else {
            if (!current || !['not_exported', 'needs_review', 'deleted'].includes(next.state)) throw new Error('calendar_export_state_changed');
            await calendarSource.createForBlock(calendarId, current, { confirmed: true });
          }
        });
      },
    });
  };
  const note = (value: string) => <Text style={{ color: q.colors.textMuted, fontSize: q.typography.bodySize, lineHeight: q.typography.bodyLineHeight }}>{value}</Text>;
  return <BottomSheetForm visible onClose={() => { if (!running.current) onClose(); }}>
    <View style={{ gap: q.spacing.md }}>
      <Text accessibilityRole="header" style={{ color: q.colors.text, fontSize: q.typography.sectionTitleSize }}>{c(lang, 'calendar')}</Text>
      <Text style={{ color: q.colors.text, fontSize: q.typography.cardTitleSize }}>{workflowCopy(lang, 'calendarAppPlan')}</Text>
      {note(block?.title ?? c(lang, 'unavailable'))}
      {block ? note(`${block.date} · ${block.startTime} - ${block.endTime}`) : null}
      {note(workflowCopy(lang, 'calendarAccountSeparate'))}
      {note(c(lang, 'calendarPurpose'))}
      {note(workflowCopy(lang, 'calendarSeparate'))}
      {note(`${c(lang, 'permissions')}: ${c(lang, permission)}`)}
      {permission !== 'granted' ? <QuestButton questTheme={q} label={c(lang, 'connect')} loading={busy} onPress={() => void run(() => load(true))} /> : null}
      {permission === 'denied' ? <QuestButton questTheme={q} variant="ghost" icon="settings" label={c(lang, 'permissions')} disabled={busy} onPress={() => void run(() => Linking.openSettings())} /> : null}
      <QuestButton questTheme={q} variant="ghost" label={c(lang, 'refresh')} disabled={busy} onPress={() => void run(() => load(false))} />
      {permission === 'granted' && !busy && !calendars.length ? note(c(lang, 'noCalendars')) : null}
      {calendars.map(calendar => {
        const status = snapshot?.key === currentKey && snapshot.calendar === device.data.calendar ? snapshot.rows[calendar.id] : undefined;
        const retry = !!status?.operation && (status.state === 'pending' || status.state === 'retry');
        const canExport = !!status && !!block && ['not_exported', 'needs_review', 'deleted'].includes(status.state);
        const writtenAt = status?.mapping?.record.lastSyncedAt;
        return <View key={calendar.id} style={{ gap: q.spacing.sm, paddingVertical: q.spacing.sm, borderBottomWidth: 1, borderColor: q.colors.border }}>
          {note(`${calendar.title} · ${calendar.source}`)}
          {note(workflowCopy(lang, 'calendarDeviceStatus'))}
          {note(workflowCopy(lang, status ? statusCopy[status.state] : 'calendarChecking'))}
          {status?.state === 'synced' && writtenAt && Number.isFinite(Date.parse(writtenAt)) ? note(`${workflowCopy(lang, 'calendarLastWrite')}: ${new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-AU', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(writtenAt))}`) : null}
          <QuestButton questTheme={q} variant="secondary" icon="calendar" loading={busy}
            disabled={busy || !calendar.writable || permission !== 'granted' || status?.permission !== 'granted' || !(retry || canExport)}
            label={!calendar.writable ? c(lang, 'externalEvent') : retry ? workflowCopy(lang, status?.operation?.kind === 'delete' ? 'calendarRetryDelete' : 'calendarRetry') : c(lang, status?.mapping && status.state !== 'deleted' ? 'change' : 'createEvent')}
            onPress={() => { if (status && calendar.writable && permission === 'granted' && status.permission === 'granted' && (retry || canExport)) confirmWrite(calendar.id, status, retry); }} />
          {status?.mapping && (status.state === 'ambiguous' || status.state === 'needs_review' || status.state === 'inactive') ? <QuestButton questTheme={q} variant="ghost" label={c(lang, 'open')} disabled={busy || permission !== 'granted'} onPress={() => void run(() => calendarSource.open(status.mapping!.record))} /> : null}
        </View>;
      })}
      {planChanged ? <Text accessibilityRole="alert" style={{ color: q.colors.text, fontSize: q.typography.bodySize }}>{workflowCopy(lang, 'calendarPlanChanged')}</Text> : null}
      {error || statusError || device.error ? <Text accessibilityRole="alert" style={{ color: q.colors.text, fontSize: q.typography.bodySize }}>{c(lang, 'eventError')}</Text> : null}
      <QuestButton questTheme={q} variant="ghost" label={c(lang, 'cancel')} disabled={busy} onPress={onClose} />
    </View>
  </BottomSheetForm>;
}
