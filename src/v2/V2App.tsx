import React, { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import QuestIcon, { type QuestIconName } from '../components/ui/QuestIcon';
import { AiPreferencesCoordinator } from '../services/AiSettingsSection';
import { v2Direction, v2DebugMode, v2DebugLang, v2Force, v2InitialView, type V2View, type V2Mode } from './featureFlag';
import { V2ThemeProvider, useV2Theme } from './theme';
import { V2StoreBridge, shallowEqual, useV2Actions, useV2Select } from './storeBridge';
import { v2t, type V2Lang, type V2Key } from './copy';
import { FirstUse } from './screens/FirstUse';
import { SampleTour } from './screens/SampleTour';
import { TodayScreen } from './screens/TodayScreen';
import { ScheduleSkeleton, InsightsSkeleton, MeSkeleton } from './screens/Skeletons';
import { SyncBadge } from './components/feedback';
import { T } from './components/primitives';

function detectLang(): V2Lang {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined') return navigator.language?.toLowerCase().startsWith('zh') ? 'zh' : 'en';
  return 'zh';
}

const TABS: Array<{ id: V2View; key: V2Key; icon: QuestIconName }> = [
  { id: 'today', key: 'tab.today', icon: 'home' },
  { id: 'schedule', key: 'tab.schedule', icon: 'calendar' },
  { id: 'insights', key: 'tab.insights', icon: 'barChart' },
  { id: 'me', key: 'tab.me', icon: 'settings' },
];

function Shell() {
  const t = useV2Theme();
  const insets = useSafeAreaInsets();
  const actions = useV2Actions();
  const loading = useV2Select((s) => s.loading);
  const settings = useV2Select((s) => s.data.settings);
  const hasCore = useV2Select((s) => (s.data.categories?.length ?? 0) > 0 || (s.data.skills?.length ?? 0) > 0 || (s.data.executionLogs?.length ?? 0) > 0);
  const persistence = useV2Select((s) => s.localPersistence, shallowEqual);
  const lang: V2Lang = v2DebugLang() ?? (settings.language === 'en' ? 'en' : settings.language === 'zh' ? 'zh' : detectLang());
  const force = v2Force();
  const [sample, setSample] = useState(force === 'sample');
  const [dismissedFirstUse, setDismissedFirstUse] = useState(false);
  const [view, setView] = useState<V2View>(v2InitialView());
  const [visited, setVisited] = useState<Record<string, boolean>>({ today: true, [v2InitialView()]: true });

  if (loading) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.color.bg }}><ActivityIndicator color={t.color.inkMuted} /></View>;
  }

  const legacyNeedsOnboarding = (!settings.onboardingCompleted && !hasCore) || !!settings.onboardingRestartRequested;
  const needsFirstUse = !dismissedFirstUse && (force === 'firstuse' || legacyNeedsOnboarding);

  let body: React.ReactNode;
  if (sample) {
    body = <SampleTour lang={lang} onExit={() => setSample(false)} />;
  } else if (needsFirstUse) {
    body = <FirstUse lang={lang} onSample={() => setSample(true)} onDone={() => { setDismissedFirstUse(true); actions.setSettings({ onboardingRestartRequested: false }); }} />;
  } else {
    body = (
      <View style={{ flex: 1 }}>
        {persistence.failed ? (
          <View testID="persist-banner" style={{ paddingHorizontal: t.space.lg, backgroundColor: t.color.dangerSoft, alignItems: 'center' }}>
            <SyncBadge pending={persistence.pending} failed lang={lang} onRetry={() => { void actions.retryLocalWrites().catch(() => undefined); }} />
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          <View style={{ flex: 1, display: view === 'today' ? 'flex' : 'none' }}><TodayScreen lang={lang} /></View>
          {visited.schedule ? <View style={{ flex: 1, display: view === 'schedule' ? 'flex' : 'none' }}><ScheduleSkeleton lang={lang} /></View> : null}
          {visited.insights ? <View style={{ flex: 1, display: view === 'insights' ? 'flex' : 'none' }}><InsightsSkeleton lang={lang} /></View> : null}
          {visited.me ? <View style={{ flex: 1, display: view === 'me' ? 'flex' : 'none' }}><MeSkeleton lang={lang} /></View> : null}
        </View>
        <View
          accessibilityRole="tablist"
          style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: t.color.hairline, backgroundColor: t.color.bg, paddingBottom: insets.bottom, height: t.layout.tabHeight + insets.bottom, justifyContent: 'center' }}
        >
          <View style={{ flexDirection: 'row', width: '100%', maxWidth: t.layout.maxWidth }}>
            {TABS.map((tab) => {
              const active = view === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  testID={`tab-${tab.id}`}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={v2t(lang, tab.key)}
                  onPress={() => { setView(tab.id); setVisited((v) => ({ ...v, [tab.id]: true })); }}
                  style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: t.layout.hit }}
                >
                  <QuestIcon name={tab.icon} size={22} color={active ? t.color.ink : t.color.inkFaint} strokeWidth={active ? 2.4 : 2} />
                  <T level="caption" style={{ color: active ? t.color.ink : t.color.inkMuted, fontWeight: active ? '700' : '500' }}>{v2t(lang, tab.key)}</T>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View testID="v2-root" style={{ flex: 1, backgroundColor: t.color.bg, paddingTop: insets.top }}>
      {body}
    </View>
  );
}

/** Mounted by App.web.tsx when ?questlife_v2_ui is set. Must be inside <StoreProvider>. */
export default function V2App() {
  return (
    <V2StoreBridge>
      <ThemeFromSettings />
    </V2StoreBridge>
  );
}

/** Appearance: URL debug param > saved setting (deepWork=dark, cleanFocus=light) > system. */
function ThemeFromSettings() {
  const themeId = useV2Select((s) => s.data.settings.selectedThemeId);
  const forced: V2Mode | null = v2DebugMode() ?? (themeId === 'deepWork' ? 'dark' : themeId === 'cleanFocus' ? 'light' : null);
  return (
    <V2ThemeProvider direction={v2Direction()} forcedMode={forced}>
      <ThemedChrome />
    </V2ThemeProvider>
  );
}

function ThemedChrome() {
  const t = useV2Theme();
  return (
    <>
      <StatusBar style={t.mode === 'dark' ? 'light' : 'dark'} />
      <AiPreferencesCoordinator />
      <Shell />
    </>
  );
}
