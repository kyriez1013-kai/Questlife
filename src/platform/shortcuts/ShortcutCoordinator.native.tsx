import { useCallback, useEffect, useRef } from 'react';
import { Linking, Platform } from 'react-native';
import * as QuickActions from 'expo-quick-actions';
import { useQuickActionCallback } from 'expo-quick-actions/hooks';
import { useStore } from '../../store';
import { getLanguage } from '../../i18n';
import { deliverNotificationIntent } from '../notifications/intentBus';
import { deepLinkIntent, shortcutIntent } from './intent';
import { shortcutLabel } from './strings';
import type { QuickActionIntent } from '../contracts';

export default function ShortcutCoordinator({ navigateToday }: { navigateToday: () => void }) {
  const { data } = useStore();
  const lang = getLanguage(data.settings.language);
  const last = useRef({ id: '', at: 0 });
  const deliver = useCallback((intent: QuickActionIntent | null) => {
    if (!intent) return;
    const now = Date.now();
    if (last.current.id === intent.notificationId && now - last.current.at < 700) return;
    last.current = { id: intent.notificationId, at: now };
    navigateToday();
    deliverNotificationIntent(intent);
  }, [navigateToday]);
  useQuickActionCallback((action) => deliver(shortcutIntent(action.id)));
  useEffect(() => {
    let active = true;
    void QuickActions.isSupported().then((supported) => {
      if (!supported || !active) return;
      return QuickActions.setItems([
        { id: 'capture', title: shortcutLabel(lang, 'capture'), icon: Platform.OS === 'ios' ? 'compose' : undefined },
        { id: 'state', title: shortcutLabel(lang, 'state'), icon: Platform.OS === 'ios' ? 'update' : undefined },
        { id: 'history', title: shortcutLabel(lang, 'history'), icon: Platform.OS === 'ios' ? 'time' : undefined },
        { id: 'decision', title: shortcutLabel(lang, 'decision'), icon: Platform.OS === 'ios' ? 'task' : undefined },
      ]);
    }).catch(() => { /* Unsupported launcher leaves the in-app entries available. */ });
    return () => { active = false; };
  }, [lang]);
  useEffect(() => {
    let active = true;
    void Linking.getInitialURL().then((url) => { if (active && url) deliver(deepLinkIntent(url)); })
      .catch(() => { /* The normal navigation remains available without an initial URL. */ });
    const subscription = Linking.addEventListener('url', ({ url }) => deliver(deepLinkIntent(url)));
    return () => { active = false; subscription.remove(); };
  }, [deliver]);
  return null;
}
