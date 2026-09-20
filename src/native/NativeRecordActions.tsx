import React, { useRef, useState } from 'react';
import { Platform, Text } from 'react-native';
import { useStore } from '../store';
import { useQuestTheme } from '../design/useQuestTheme';
import { getLanguage, t } from '../i18n';
import { confirmAction } from '../utils/confirm';
import { syncCopy } from '../sync-v2/copy';
import QuestButton from '../components/ui/QuestButton';
import { NativeSection } from './NativeControls';
import { workflowCopy } from './nativeWorkflowCopy';
import { shareNativeRecordFile } from './nativeRecordExport';

export default function NativeRecordActions({ onOpenAccount }: { onOpenAccount?: () => void } = {}) {
  const { data, loading } = useStore();
  const q = useQuestTheme(data.settings.selectedThemeId);
  const lang = getLanguage(data.settings.language);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<'idle' | 'shared' | 'cancelled' | 'unavailable' | 'error'>('idle');
  const running = useRef(false);
  const available = Platform.OS === 'android' || Platform.OS === 'ios';
  const note = (value: string) => <Text style={{ color: q.colors.textMuted, fontSize: q.typography.bodySize, lineHeight: q.typography.bodyLineHeight }}>{value}</Text>;
  const share = async () => {
    if (loading || running.current || !available) return;
    running.current = true; setBusy(true); setStatus('idle');
    try {
      setStatus(await shareNativeRecordFile(data, t(lang, 'exportLocalRecords')));
    } catch { setStatus('error'); }
    finally { running.current = false; setBusy(false); }
  };
  return <NativeSection title={t(lang, 'storage')}>
    {note(workflowCopy(lang, 'nativeExportScope'))}
    <QuestButton questTheme={q} variant="secondary" label={t(lang, 'exportLocalRecords')} loading={busy} disabled={loading || busy || !available}
      onPress={() => {
        if (loading || running.current || !available) return;
        setStatus('idle');
        confirmAction({ title: t(lang, 'exportLocalRecords'), message: workflowCopy(lang, 'nativeExportConfirm'),
          confirmText: t(lang, 'exportLocalRecords'), cancelText: t(lang, 'cancel'), onConfirm: () => void share(), onCancel: () => setStatus('cancelled') });
      }} />
    {!available ? note(workflowCopy(lang, 'nativeExportUnavailable')) : null}
    {status !== 'idle' ? <Text accessibilityRole={status === 'error' ? 'alert' : undefined} accessibilityLiveRegion="polite"
      style={{ color: q.colors.text, fontSize: q.typography.bodySize, lineHeight: q.typography.bodyLineHeight }}>
      {workflowCopy(lang, status === 'error' ? 'nativeExportFailed' : status === 'cancelled' ? 'nativeExportCancelled' : status === 'unavailable' ? 'nativeExportUnavailable' : 'nativeExportResult')}
    </Text> : null}
    <Text accessibilityRole="header" style={{ color: q.colors.text, fontSize: q.typography.cardTitleSize }}>{t(lang, 'recordRecovery')}</Text>
    {note(t(lang, 'recordRecoveryLimit'))}
    {onOpenAccount ? <QuestButton questTheme={q} variant="secondary" label={syncCopy(lang, 'account')} disabled={busy} onPress={onOpenAccount} /> : null}
    <Text accessibilityRole="header" style={{ color: q.colors.text, fontSize: q.typography.cardTitleSize }}>{syncCopy(lang, 'clearLocal')}</Text>
    {note(workflowCopy(lang, 'localClearScope'))}
    {note(syncCopy(lang, 'clearLimit'))}
  </NativeSection>;
}
