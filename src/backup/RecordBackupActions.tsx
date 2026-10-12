import React, { useRef, useState } from 'react';
import { useInteractionBusyState } from '../components/AsyncInteractionBoundary';
import { Platform, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { useStore } from '../store';
import { useQuestTheme } from '../design/useQuestTheme';
import { getLanguage } from '../i18n';
import QuestButton from '../components/ui/QuestButton';
import { confirmAction } from '../utils/confirm';
import { readSyncState, restoreRecordBackup } from '../sync-v2/runtime';
import { backupCopy as c } from './copy';
import { MAX_BACKUP_BYTES, createRecordBackup, parseRecordBackup } from './records';

export default function RecordBackupActions() {
  const { data, loading } = useStore();
  const q = useQuestTheme(data.settings.selectedThemeId), lang = getLanguage(data.settings.language);
  const lock = useRef(false);
  const [busy, setBusy] = useInteractionBusyState();
  const [status, setStatus] = useState<'ready' | 'restored' | 'failed' | 'interrupted' | null>(null);
  const perform = async (job: () => Promise<'ready' | 'restored' | 'interrupted' | null>) => {
    if (lock.current || loading) return;
    lock.current = true; setBusy(true); setStatus(null);
    try { setStatus(await job()); } catch { setStatus('failed'); }
    finally { lock.current = false; setBusy(false); }
  };
  const save = () => void perform(async () => {
    const backup = createRecordBackup(data, (await readSyncState()).ownerId);
    if (Platform.OS === 'web') {
      const url = URL.createObjectURL(new Blob([JSON.stringify(backup)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = `questlife-backup-${Date.now()}.json`;
      document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
    } else {
      const { shareNativeRecordFile } = await import('../native/nativeRecordExport');
      if (await shareNativeRecordFile(backup, c(lang, 'save')) === 'unavailable') throw new Error('share_unavailable');
    }
    return 'ready';
  });
  const restore = () => void perform(async () => {
    const selected = await DocumentPicker.getDocumentAsync({ type: 'application/json', multiple: false, copyToCacheDirectory: true, base64: false });
    if (selected.canceled) return null;
    const asset = selected.assets[0];
    if (!asset) throw new Error('backup_file_unavailable');
    let text: string;
    const file = Platform.OS === 'web' ? null : new File(asset.uri);
    try {
      if (asset.size != null && asset.size > MAX_BACKUP_BYTES) throw new Error('backup_too_large');
      if (Platform.OS === 'web') {
        if (!asset.file) throw new Error('backup_file_unavailable');
        if (asset.file.size > MAX_BACKUP_BYTES) throw new Error('backup_too_large');
        text = await asset.file.text();
      } else {
        if (file!.size > MAX_BACKUP_BYTES) throw new Error('backup_too_large');
        text = await file!.text();
      }
    } finally {
      if (file) {
        // Delete only the SDK 54 picker copy, never a provider original or other cache file.
        const pickerDirectory = new URL(new Directory(Paths.cache, 'DocumentPicker').uri);
        pickerDirectory.pathname = pickerDirectory.pathname.replace(/\/?$/, '/');
        const picked = new URL(file.uri), parent = new URL('.', picked);
        const name = decodeURIComponent(picked.pathname.slice(parent.pathname.length));
        if (parent.href === pickerDirectory.href && name && !/[\\/]/.test(name) && file.exists) file.delete();
      } else if (asset.uri.startsWith('blob:')) URL.revokeObjectURL(asset.uri);
    }
    parseRecordBackup(text);
    const confirmed = await new Promise<boolean>(resolve => confirmAction({ title: c(lang, 'restore'), message: c(lang, 'confirmRestore'),
      confirmText: c(lang, 'restore'), cancelText: c(lang, 'cancel'), onConfirm: () => resolve(true), onCancel: () => resolve(false) }));
    if (!confirmed) return null;
    try { await restoreRecordBackup(text); }
    catch { return 'interrupted'; }
    return 'restored';
  });
  return <View style={{ gap: q.spacing.sm, paddingVertical: q.spacing.md }}>
    <Text accessibilityRole="header" style={{ color: q.colors.text, fontSize: q.typography.cardTitleSize }}>{c(lang, 'title')}</Text>
    <Text style={{ color: q.colors.textSecondary, fontSize: q.typography.bodySize }}>{c(lang, 'scope')}</Text>
    <QuestButton questTheme={q} variant="secondary" label={c(lang, 'save')} disabled={loading || busy} onPress={() => confirmAction({
      title: c(lang, 'save'), message: c(lang, 'confirmSave'), confirmText: c(lang, 'save'), cancelText: c(lang, 'cancel'), onConfirm: save })} />
    <QuestButton questTheme={q} variant="secondary" label={c(lang, 'restore')} disabled={loading || busy} loading={busy} onPress={restore} />
    <Text style={{ color: q.colors.textSecondary, fontSize: q.typography.captionSize }}>{c(lang, 'limit')}</Text>
    {status ? <Text accessibilityRole={status === 'failed' || status === 'interrupted' ? 'alert' : undefined} accessibilityLiveRegion="polite"
      style={{ color: q.colors.text, fontSize: q.typography.bodySize }}>{c(lang, status)}</Text> : null}
  </View>;
}
