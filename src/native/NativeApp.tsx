import 'react-native-gesture-handler';
import React, {useCallback, useRef} from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StoreProvider, useStore } from '../store';
import { getLanguage, t } from '../i18n';
import { useQuestTheme } from '../design/useQuestTheme';
import { getNativeFoundation } from '../design/nativeFoundation';
import { isDarkTheme } from '../design/surfaces';
import QuestIcon from '../components/ui/QuestIcon';
import HomeScreen from '../screens/HomeScreen';
import GoalTreeScreen from '../screens/GoalTreeScreen';
import GoalDetailScreen from '../screens/GoalDetailScreen';
import SkillDetailScreen from '../screens/SkillDetailScreen';
import SkillLibraryScreen from '../screens/SkillLibraryScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import SettingsScreen from '../screens/SettingsScreen';
import NativeInsightsScreen from './NativeInsightsScreen';
import NativeSettingsScreen from './NativeSettingsScreen';
import NativeLicensesScreen from './NativeLicensesScreen';
import ForegroundSources from '../platform/ForegroundSources';
import NotificationCoordinator from '../platform/notifications/NotificationCoordinator';
import ShortcutCoordinator from '../platform/shortcuts/ShortcutCoordinator.native';
import {nativeCopy} from '../platform/nativeI18n';
import OnboardingScreen from '../screens/OnboardingScreen';

const Tabs = createBottomTabNavigator();
const Goals = createNativeStackNavigator();
const Settings = createNativeStackNavigator();
const navigationRef=createNavigationContainerRef<any>();
function SettingsStack(){const {data}=useStore();const lang=getLanguage(data.settings.language);return <Settings.Navigator><Settings.Screen name="NativeSettings" component={NativeSettingsScreen} options={{headerShown:false}}/><Settings.Screen name="Preferences" component={SettingsScreen} options={{title:nativeCopy(lang,'preferences')}}/><Settings.Screen name="Licenses" component={NativeLicensesScreen} options={{title:nativeCopy(lang,'licenses')}}/></Settings.Navigator>;}
function GoalStack() {
  return <Goals.Navigator screenOptions={{ headerShown: false }}>
    <Goals.Screen name="GoalsList" component={GoalTreeScreen} />
    <Goals.Screen name="GoalDetail" component={GoalDetailScreen} />
    <Goals.Screen name="SkillLibrary" component={SkillLibraryScreen} />
    <Goals.Screen name="SkillDetail" component={SkillDetailScreen} />
  </Goals.Navigator>;
}
function Content() {
  const { data, loading } = useStore();
  const theme = useQuestTheme(data.settings.selectedThemeId);
  const f = getNativeFoundation(theme);
  const lang = getLanguage(data.settings.language);
  const insets = useSafeAreaInsets();
  const pendingToday = useRef(false);
  const navigateToday=useCallback(()=>{if(navigationRef.isReady())navigationRef.navigate('Today');else pendingToday.current=true;},[]);
  const existing = data.categories.length || data.skills.length || data.executionLogs?.length;
  if (loading) return <View style={{ flex: 1, backgroundColor: f.environment.canvas, justifyContent: 'center' }}><ActivityIndicator color={f.interaction.primary} /></View>;
  if (data.settings.onboardingRestartRequested || (!data.settings.onboardingCompleted && !existing)) return <OnboardingScreen />;
  return <NavigationContainer ref={navigationRef} onReady={()=>{if(pendingToday.current){pendingToday.current=false;navigateToday();}}} linking={{prefixes:['questlife://'],filter:url=>!url.startsWith('questlife://auth/callback'),config:{screens:{Settings:{path:'settings',screens:{NativeSettings:''}}}}}} theme={{ ...DefaultTheme, colors: { ...DefaultTheme.colors, background: f.environment.canvas, card: f.environment.navigation, text: f.text.primary, border: f.border.subtle, primary: f.interaction.primary } }}>
    <StatusBar style={isDarkTheme(theme)?'light':'dark'}/><ForegroundSources/><NotificationCoordinator navigateToday={navigateToday}/><ShortcutCoordinator navigateToday={navigateToday}/>
    <Tabs.Navigator screenOptions={{ headerShown: false, tabBarHideOnKeyboard: true, tabBarActiveTintColor: f.interaction.navigationActive, tabBarInactiveTintColor: f.interaction.navigationInactive, tabBarStyle: { backgroundColor: f.environment.navigation, height: 56 + insets.bottom, paddingBottom: insets.bottom, borderTopColor: f.border.subtle }, tabBarLabelStyle: { fontSize: 11 } }}>
      <Tabs.Screen name="Today" component={HomeScreen} options={{ tabBarLabel: t(lang,'today'), tabBarIcon: ({color}) => <QuestIcon name="home" color={color} size={20} /> }} />
      <Tabs.Screen name="Quest" component={GoalStack} options={{ tabBarLabel: t(lang,'goals'), tabBarIcon: ({color}) => <QuestIcon name="target" color={color} size={20} /> }} />
      <Tabs.Screen name="Schedule" component={ScheduleScreen} options={{ tabBarLabel: t(lang,'schedule'), tabBarIcon: ({color}) => <QuestIcon name="calendar" color={color} size={20} /> }} />
      <Tabs.Screen name="Insights" component={NativeInsightsScreen} options={{ tabBarLabel: t(lang,'insights'), tabBarIcon: ({color}) => <QuestIcon name="barChart" color={color} size={20} /> }} />
      <Tabs.Screen name="Settings" component={SettingsStack} options={{ tabBarLabel: t(lang,'settings'), tabBarIcon: ({color}) => <QuestIcon name="settings" color={color} size={20} /> }} />
    </Tabs.Navigator>
  </NavigationContainer>;
}
export default function NativeApp() {
  if (__DEV__ && process.env.EXPO_PUBLIC_NATIVE_CHART_QA === 'true') {
    const Fixture = require('./NativeChartFixture').default;
    return <SafeAreaProvider><Fixture/></SafeAreaProvider>;
  }
  return <SafeAreaProvider><StoreProvider><StatusBar style="auto" /><Content /></StoreProvider></SafeAreaProvider>;
}
