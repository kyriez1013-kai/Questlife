import React, { useEffect, useRef, useState } from 'react';
import { Platform, Switch, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { useStore } from '../store';
import { useQuestTheme } from '../design/useQuestTheme';
import { questLayout } from '../design/tokens';
import { getLanguage } from '../i18n';
import { nativeCopy } from '../platform/nativeI18n';
import { deviceRepository, notifications } from '../platform/services';
import { useDeviceData } from '../platform/useDeviceData';
import QuestButton from '../components/ui/QuestButton';
import NativeDateTimeField from './NativeDateTimeField';
import { workflowCopy as c } from './nativeWorkflowCopy';
import { authService } from '../sync-v2/supabase';
import { registerNativePushToken, syncDevicePushRegistration } from '../sync-v2/pushRegistry';

export type RegisterNativePushToken = (token: string, expectedUserId: string) => Promise<void>;

export default function NativeNotificationPreferences({ registerPushToken = registerNativePushToken }: { registerPushToken?: RegisterNativePushToken } = {}) {
  const { data } = useStore();
  const q = useQuestTheme(data.settings.selectedThemeId);
  const lang = getLanguage(data.settings.language);
  const device = useDeviceData();
  const quiet = device.data.notificationQuietHours;
  const startMinute = quiet?.startMinute ?? 22 * 60;
  const endMinute = quiet?.endMinute ?? 7 * 60;
  const enabled = !!quiet && startMinute !== endMinute;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const running = useRef(false);
  const [pushStatus, setPushStatus] = useState<'idle' | 'registered' | 'error'>('idle');
  const [pushBusy, setPushBusy] = useState(false);
  const requestingPush = useRef(false);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const context = useRef({ active: true, revision: 0, ownerId: null as string | null, enabled: false });
  context.current.enabled = device.data.notificationsEnabled === true;
  useEffect(() => {
    let observed = false;
    context.current.active = true;
    const observe = (id: string | null) => {
      if (!context.current.active) return;
      if (context.current.ownerId !== id) {
        context.current.revision++;
        context.current.ownerId = id;
        setPushStatus('idle');
      }
      setOwnerId(id);
    };
    const stop = authService.subscribe(session => { observed = true; observe(session?.userId ?? null); });
    void authService.getUserId().then(id => { if (!observed) observe(id); }).catch(() => observe(null));
    return () => { context.current.active = false; context.current.revision++; stop(); };
  }, []);
  useEffect(() => { context.current.revision++; setPushStatus('idle'); }, [device.data.notificationsEnabled]);
  const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
  const save = async (start: number, end: number) => {
    if (running.current) return;
    running.current = true; setBusy(true); setError(false);
    try {
      await deviceRepository.update(current => ({ ...current, notificationQuietHours: { startMinute: start, endMinute: end } }));
    } catch { setError(true); } finally { running.current = false; setBusy(false); }
  };
  const date = (minute: number) => { const value = new Date(); value.setHours(Math.floor(minute / 60), minute % 60, 0, 0); return value; };
  const minutes = (value: Date) => value.getHours() * 60 + value.getMinutes();
  const requestPush = async () => {
    if (requestingPush.current || !projectId || !context.current.enabled || !context.current.ownerId) return;
    const expectedUserId = context.current.ownerId;
    const revision = context.current.revision;
    const isCurrent = () => context.current.active && context.current.enabled
      && context.current.ownerId === expectedUserId && context.current.revision === revision;
    requestingPush.current = true; setPushBusy(true); setPushStatus('idle');
    try {
      if (await authService.getUserId() !== expectedUserId || !isCurrent()) return;
      const service = notifications(lang);
      const permission = await service.requestPermission();
      if (!isCurrent() || await authService.getUserId() !== expectedUserId) return;
      if (permission !== 'granted') {
        await syncDevicePushRegistration({ expectedUserId, expoPushToken: null,
          notificationsEnabled: true, permissionGranted: false });
        throw new Error('push_permission_denied');
      }
      const token = await service.getPushToken(projectId);
      if (!isCurrent() || await authService.getUserId() !== expectedUserId) return;
      if (!token || !/^(Expo|Exponent)PushToken\[[^\]]+\]$/.test(token)) throw new Error('push_token_unavailable');
      await registerPushToken(token, expectedUserId);
      if (isCurrent() && await authService.getUserId() === expectedUserId) setPushStatus('registered');
    } catch { if (isCurrent()) setPushStatus('error'); }
    finally { requestingPush.current = false; if (context.current.active) setPushBusy(false); }
  };
  return <View style={{ gap: q.spacing.sm }}>
    <View style={{ minHeight: questLayout.controlMinHeight, flexDirection: 'row', alignItems: 'center', gap: q.spacing.sm }}>
      <Text style={{ flex: 1, color: q.colors.text, fontSize: q.typography.bodySize }}>{c(lang, 'quietHours')}</Text>
      <Switch accessibilityLabel={c(lang, 'quietHours')} value={enabled} disabled={busy}
        onValueChange={value => void save(startMinute, value ? (endMinute !== startMinute ? endMinute : (startMinute + 9 * 60) % (24 * 60)) : startMinute)} />
    </View>
    {enabled ? <View style={{ flexDirection: Platform.OS === 'ios' ? 'column' : 'row', gap: q.spacing.sm }}>
      <View style={{ flex: 1 }}><NativeDateTimeField theme={q} lang={lang} disabled={busy} mode="time" label={nativeCopy(lang, 'startTime')}
        value={date(startMinute)} onChange={value => void save(minutes(value), endMinute)} /></View>
      <View style={{ flex: 1 }}><NativeDateTimeField theme={q} lang={lang} disabled={busy} mode="time" label={nativeCopy(lang, 'endTime')}
        value={date(endMinute)} onChange={value => void save(startMinute, minutes(value))} /></View>
    </View> : null}
    <Text style={{ color: q.colors.textMuted, fontSize: q.typography.captionSize }}>{c(lang, 'quietHoursNote')}</Text>
    {error ? <Text accessibilityRole="alert" style={{ color: q.colors.text }}>{c(lang, 'preferenceError')}</Text> : null}
    <Text accessibilityRole="header" style={{ color: q.colors.text, fontSize: q.typography.cardTitleSize, marginTop: q.spacing.md }}>{c(lang, 'push')}</Text>
    <Text accessibilityRole={pushStatus === 'error' ? 'alert' : undefined} style={{ color: q.colors.textMuted, fontSize: q.typography.captionSize }}>
      {c(lang, !projectId ? 'pushUnconfigured' : pushStatus === 'error' ? 'pushError' : pushStatus === 'registered' ? 'pushRegistered' : 'pushIdle')}
    </Text>
    <QuestButton questTheme={q} variant="secondary" label={c(lang, 'pushRequest')} loading={pushBusy} disabled={!projectId || !ownerId || !device.data.notificationsEnabled} onPress={() => void requestPush()} />
  </View>;
}
