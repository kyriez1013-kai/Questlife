import React, { useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { useStore } from '../store';
import { getLanguage } from '../i18n';
import { useQuestTheme } from '../design/useQuestTheme';

/** Web/PWA: says plainly that what is shown is this device's data and sync waits for the network. */
export default function OfflineNotice() {
  const { data } = useStore();
  const q = useQuestTheme(data.settings.selectedThemeId);
  const lang = getLanguage(data.settings.language);
  const [offline, setOffline] = useState(() => Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.onLine === false);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const update = () => setOffline(navigator.onLine === false);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  if (!offline) return null;
  return (
    <View nativeID="questlife-offline-notice" style={{ paddingHorizontal: q.spacing.md, paddingVertical: q.spacing.xs, backgroundColor: q.colors.surfaceElevated, borderBottomWidth: 1, borderBottomColor: q.colors.border }}>
      <Text accessibilityRole="alert" style={{ color: q.colors.text, fontSize: q.typography.captionSize }}>
        {lang === 'en'
          ? 'Offline — showing what is saved on this device. New records stay here and sync when you are back online.'
          : '离线中：显示的是这台设备上的数据。新记录先存在本机，联网后再同步。'}
      </Text>
    </View>
  );
}

/** Registers the offline shell only in the production web build; the dev server never gets a worker. */
export function registerServiceWorker() {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  if (typeof __DEV__ !== 'undefined' && __DEV__) return;
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => undefined); });
}
