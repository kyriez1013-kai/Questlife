import 'react-native-gesture-handler';
import './src/styles/theme-overrides.css';
import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, useIsFocused } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider, useStore } from './src/store';
import { getLanguage, t } from './src/i18n';
import { appAccent } from './src/theme';
import { getQuestTheme, questLayout } from './src/design/tokens';
import { isDarkTheme } from './src/design/darkSurfaceGuard';
import QuestIcon, { QuestIconName } from './src/components/ui/QuestIcon';
import HomeScreen from './src/screens/HomeScreen';
import GoalTreeScreen from './src/screens/GoalTreeScreen';
import GoalDetailScreen from './src/screens/GoalDetailScreen';
import SkillsScreen from './src/screens/SkillsScreen';
import SkillLibraryScreen from './src/screens/SkillLibraryScreen';
import SkillDetailScreen from './src/screens/SkillDetailScreen';
import ScheduleScreen from './src/screens/ScheduleScreen';
import StatsScreen from './src/screens/StatsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { trackEvent } from './src/utils/analytics';
import { auditDataResidue, isDataResidueDebugEnabled } from './src/utils/dataResidueAudit';
import V11Stage0Screen from './src/v11-stage0/V11Stage0Screen';
import V11Stage1Screen from './src/v11-stage1/V11Stage1Screen';
import V11Stage2RebaselineScreen from './src/v11-stage2-rebaseline/V11Stage2RebaselineScreen';
import V11SheetControlFixtureScreen from './src/v11-stage2-rebaseline/V11SheetControlFixtureScreen';
import V11InsightsScreen from './src/v11-insights/V11InsightsScreen';
import {
  getV11InsightsDebugLanguage,
  getV11InsightsDebugTheme,
  isV11InsightsEnabled,
} from './src/v11/featureFlag';
import PersistenceDebugPanel from './src/components/debug/PersistenceDebugPanel';

const Tab = createBottomTabNavigator();
const SkillsStack = createNativeStackNavigator();
const GoalsStack = createNativeStackNavigator();

function getV11FixtureRoute(): 'stage0' | 'stage1' | 'stage2-rebaseline' | 'stage2-controls' | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const route = new URLSearchParams(window.location.search).get('questlife_v11_ui');
  return route === 'stage0' || route === 'stage1' || route === 'stage2-rebaseline' || route === 'stage2-controls'
    ? route
    : null;
}

function FocusedTabSurface({ children, backgroundColor }: { children: React.ReactNode; backgroundColor: string }) {
  const focused = useIsFocused();

  return (
    <View
      pointerEvents={focused ? 'auto' : 'none'}
      style={{
        flex: 1,
        display: focused ? 'flex' : 'none',
        backgroundColor,
      }}
    >
      {children}
    </View>
  );
}

function TabIcon({ name, focused, color }: { name: QuestIconName; focused: boolean; color: string }) {
  return (
    <View
      style={{
        width: 30,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: focused ? 1 : 0.72,
      }}
    >
      <QuestIcon name={name} size={20} color={color} strokeWidth={focused ? 2.4 : 2} />
    </View>
  );
}

// "技能" Tab 内嵌 Stack: 列表 → 详情
function SkillsTabStack() {
  return (
    <SkillsStack.Navigator screenOptions={{ headerShown: false }}>
      <SkillsStack.Screen name="SkillsList" component={SkillsScreen} />
      <SkillsStack.Screen name="SkillDetail" component={SkillDetailScreen} />
    </SkillsStack.Navigator>
  );
}

// "目标" Tab 内嵌 Stack: 大目标列表 → 大目标详情 → (跨入) 技能详情
// SkillDetail 在两个 Stack 都注册了, 这样从两个入口进都不会出 Tab.
function GoalsTabStack() {
  return (
    <GoalsStack.Navigator screenOptions={{ headerShown: false }}>
      <GoalsStack.Screen name="GoalsList" component={GoalTreeScreen} />
      <GoalsStack.Screen name="GoalDetail" component={GoalDetailScreen} />
      <GoalsStack.Screen name="SkillLibrary" component={SkillLibraryScreen} />
      <GoalsStack.Screen name="SkillDetail" component={SkillDetailScreen} />
    </GoalsStack.Navigator>
  );
}

// 根据加载状态和数据决定显示 Onboarding 还是正常 Tabs
function AppContent() {
  const { data, loading } = useStore();
  const v11InsightsEnabled = isV11InsightsEnabled();
  const v11InsightsDebugTheme = getV11InsightsDebugTheme();
  const questTheme = getQuestTheme(
    v11InsightsDebugTheme === 'light'
      ? 'cleanFocus'
      : v11InsightsDebugTheme === 'dark'
        ? 'deepWork'
        : data.settings.selectedThemeId,
  );
  const darkTheme = isDarkTheme(questTheme);
  const RootView = View as any;
  const rootClassName = `questlife-root ${darkTheme ? 'questlife-theme-dark' : 'questlife-theme-light'}`;
  const rootProps = {
    className: rootClassName,
    'data-theme': darkTheme ? 'dark' : questTheme.id,
  };
  const rootStyle = {
    flex: 1,
    backgroundColor: questTheme.colors.background,
    '--ql-bg': questTheme.colors.background,
    '--ql-surface': questTheme.colors.surface,
    '--ql-surface-elevated': questTheme.colors.surfaceElevated,
    '--ql-surface-soft': questTheme.colors.surfaceSoft,
    '--ql-border': questTheme.colors.border,
    '--ql-text': questTheme.colors.text,
    '--ql-text-muted': questTheme.colors.textMuted,
    '--ql-text-subtle': questTheme.colors.textSubtle,
    '--ql-primary': questTheme.colors.primary,
  } as any;
  const accent = appAccent(data.settings.accentColor ?? questTheme.colors.primary);
  const lang = getV11InsightsDebugLanguage() ?? getLanguage(data.settings.language);
  const appOpenedTrackedRef = useRef(false);
  useEffect(() => {
    if (!loading && !appOpenedTrackedRef.current) {
      appOpenedTrackedRef.current = true;
      trackEvent('app_opened', { route: data.categories.length === 0 ? 'Onboarding' : 'Today' }, { page: 'app' });
    }
  }, [loading, data.categories.length]);
  useEffect(() => {
    if (loading || !isDataResidueDebugEnabled()) return;
    try {
      console.log('[data residue audit]', JSON.stringify(auditDataResidue(data), null, 2));
    } catch (error) {
      console.warn('[data residue audit] failed', error);
    }
  }, [loading, data]);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const targets = [document.documentElement, document.body].filter(Boolean);
    targets.forEach((target) => {
      target.classList.toggle('questlife-theme-dark', darkTheme);
      target.classList.toggle('questlife-theme-light', !darkTheme);
      target.setAttribute('data-theme', darkTheme ? 'dark' : questTheme.id);
      target.style.setProperty('--ql-bg', questTheme.colors.background);
      target.style.setProperty('--ql-surface', questTheme.colors.surface);
      target.style.setProperty('--ql-surface-elevated', questTheme.colors.surfaceElevated);
      target.style.setProperty('--ql-surface-soft', questTheme.colors.surfaceSoft);
      target.style.setProperty('--ql-border', questTheme.colors.border);
      target.style.setProperty('--ql-text', questTheme.colors.text);
      target.style.setProperty('--ql-text-muted', questTheme.colors.textMuted);
      target.style.setProperty('--ql-text-subtle', questTheme.colors.textSubtle);
      target.style.setProperty('--ql-primary', questTheme.colors.primary);
    });
  }, [darkTheme, questTheme]);
  const navTheme = {
    ...DefaultTheme,
    dark: false,
    colors: {
      ...DefaultTheme.colors,
      background: questTheme.colors.background,
      card: questTheme.colors.background,
      text: questTheme.colors.text,
      border: questTheme.colors.border,
      primary: accent,
      notification: questTheme.colors.accent,
    },
  };

  // AsyncStorage 读取完成前显示最简 splash，防止老用户闪过 onboarding
  if (loading) {
    return (
      <RootView {...rootProps} style={[rootStyle, { alignItems: 'center', justifyContent: 'center' }]}>
        <QuestIcon name="target" size={42} color={accent} strokeWidth={2.4} />
        <ActivityIndicator color={accent} />
      </RootView>
    );
  }

  const hasExistingCoreData = data.categories.length > 0 || data.skills.length > 0 || (data.executionLogs || []).length > 0;
  const shouldShowOnboarding = !!data.settings.onboardingRestartRequested
    || (!data.settings.onboardingCompleted && !hasExistingCoreData);

  // 新用户或 Settings 里手动重启 → 引导流程
  if (shouldShowOnboarding) {
    return (
      <RootView {...rootProps} style={rootStyle}>
        <OnboardingScreen />
      </RootView>
    );
  }

  // 老用户 / 完成 onboarding 后 → 正常 Tabs
  return (
    <RootView {...rootProps} style={rootStyle}>
      <NavigationContainer theme={navTheme}>
        <Tab.Navigator
          detachInactiveScreens={Platform.OS !== 'web'}
          initialRouteName={v11InsightsEnabled ? 'Insights' : 'Today'}
          screenOptions={{
            headerShown: false,
            lazy: true,
            freezeOnBlur: true,
            sceneStyle: {
              backgroundColor: questTheme.colors.background,
              overflow: 'hidden',
            },
            tabBarActiveTintColor: questTheme.colors.navActive,
            tabBarInactiveTintColor: questTheme.colors.navInactive,
            tabBarStyle: {
              position: 'absolute',
              width: questLayout.navWidthPercent,
              maxWidth: questLayout.navMaxWidth,
              left: '50%',
              transform: 'translateX(-50%)' as any,
              bottom: questLayout.navBottomInset,
              height: questLayout.navHeight,
              paddingBottom: 4,
              paddingTop: 4,
              backgroundColor: questTheme.colors.navBackground,
              borderTopWidth: 1,
              borderTopColor: questTheme.colors.border,
              borderRadius: questLayout.navRadius,
              shadowColor: questTheme.colors.cardShadow,
              shadowOpacity: 0.06,
              shadowOffset: { width: 0, height: -4 },
              shadowRadius: 10,
              elevation: 2,
            },
            tabBarItemStyle: { borderRadius: questLayout.navItemRadius },
            tabBarIconStyle: { marginBottom: 0 },
            tabBarLabelStyle: { fontSize: 10, lineHeight: 12, fontWeight: '700', marginTop: -1 },
          }}
        >
          <Tab.Screen name="Today" options={{ tabBarLabel: t(lang, 'today'), tabBarIcon: ({ focused, color }) => <TabIcon name="home" focused={focused} color={color} /> }}>
            {() => (
              <FocusedTabSurface backgroundColor={questTheme.colors.background}>
                <HomeScreen />
              </FocusedTabSurface>
            )}
          </Tab.Screen>
          <Tab.Screen name="Quest" options={{ popToTopOnBlur: true, tabBarLabel: t(lang, 'quest'), tabBarIcon: ({ focused, color }) => <TabIcon name="target" focused={focused} color={color} /> }}>
            {() => (
              <FocusedTabSurface backgroundColor={questTheme.colors.background}>
                <GoalsTabStack />
              </FocusedTabSurface>
            )}
          </Tab.Screen>
          <Tab.Screen name="Schedule" options={{ tabBarLabel: t(lang, 'schedule'), tabBarIcon: ({ focused, color }) => <TabIcon name="calendar" focused={focused} color={color} /> }}>
            {() => (
              <FocusedTabSurface backgroundColor={questTheme.colors.background}>
                <ScheduleScreen />
              </FocusedTabSurface>
            )}
          </Tab.Screen>
          <Tab.Screen name="Insights" options={{ tabBarLabel: t(lang, 'insights'), tabBarIcon: ({ focused, color }) => <TabIcon name="barChart" focused={focused} color={color} /> }}>
            {() => (
              <FocusedTabSurface backgroundColor={questTheme.colors.background}>
                {v11InsightsEnabled ? <V11InsightsScreen /> : <StatsScreen />}
              </FocusedTabSurface>
            )}
          </Tab.Screen>
          <Tab.Screen name="Settings" options={{ tabBarLabel: t(lang, 'settings'), tabBarIcon: ({ focused, color }) => <TabIcon name="settings" focused={focused} color={color} /> }}>
            {() => (
              <FocusedTabSurface backgroundColor={questTheme.colors.background}>
                <SettingsScreen />
              </FocusedTabSurface>
            )}
          </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>
    </RootView>
  );
}

export default function App() {
  const v11FixtureRoute = getV11FixtureRoute();

  if (v11FixtureRoute) {
    return (
      <SafeAreaProvider>
        <StatusBar style="auto" />
        {v11FixtureRoute === 'stage0'
          ? <V11Stage0Screen />
          : v11FixtureRoute === 'stage1'
            ? <V11Stage1Screen />
            : v11FixtureRoute === 'stage2-controls'
              ? <V11SheetControlFixtureScreen />
              : <V11Stage2RebaselineScreen />}
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="auto" />
        <AppContent />
        <PersistenceDebugPanel />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
