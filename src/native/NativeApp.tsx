import 'react-native-gesture-handler';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StoreProvider, useStore } from '../store';
import { getLanguage, t } from '../i18n';
import { useQuestTheme } from '../design/useQuestTheme';
import { getNativeFoundation } from '../design/nativeFoundation';
import QuestIcon from '../components/ui/QuestIcon';
import HomeScreen from '../screens/HomeScreen';
import GoalTreeScreen from '../screens/GoalTreeScreen';
import GoalDetailScreen from '../screens/GoalDetailScreen';
import SkillDetailScreen from '../screens/SkillDetailScreen';
import SkillLibraryScreen from '../screens/SkillLibraryScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import SettingsScreen from '../screens/SettingsScreen';
import StatsScreen from '../screens/StatsScreen';
import OnboardingScreen from '../screens/OnboardingScreen';

const Tabs = createBottomTabNavigator();
const Goals = createNativeStackNavigator();
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
  const existing = data.categories.length || data.skills.length || data.executionLogs?.length;
  if (loading) return <View style={{ flex: 1, backgroundColor: f.environment.canvas, justifyContent: 'center' }}><ActivityIndicator color={f.interaction.primary} /></View>;
  if (data.settings.onboardingRestartRequested || (!data.settings.onboardingCompleted && !existing)) return <OnboardingScreen />;
  return <NavigationContainer theme={{ ...DefaultTheme, colors: { ...DefaultTheme.colors, background: f.environment.canvas, card: f.environment.navigation, text: f.text.primary, border: f.border.subtle, primary: f.interaction.primary } }}>
    <Tabs.Navigator screenOptions={{ headerShown: false, tabBarHideOnKeyboard: true, tabBarActiveTintColor: f.interaction.navigationActive, tabBarInactiveTintColor: f.interaction.navigationInactive, tabBarStyle: { backgroundColor: f.environment.navigation, height: 56 + insets.bottom, paddingBottom: insets.bottom, borderTopColor: f.border.subtle }, tabBarLabelStyle: { fontSize: 11 } }}>
      <Tabs.Screen name="Today" component={HomeScreen} options={{ tabBarLabel: t(lang,'today'), tabBarIcon: ({color}) => <QuestIcon name="home" color={color} size={20} /> }} />
      <Tabs.Screen name="Quest" component={GoalStack} options={{ tabBarLabel: t(lang,'goals'), tabBarIcon: ({color}) => <QuestIcon name="target" color={color} size={20} /> }} />
      <Tabs.Screen name="Schedule" component={ScheduleScreen} options={{ tabBarLabel: t(lang,'schedule'), tabBarIcon: ({color}) => <QuestIcon name="calendar" color={color} size={20} /> }} />
      <Tabs.Screen name="Insights" component={StatsScreen} options={{ tabBarLabel: t(lang,'insights'), tabBarIcon: ({color}) => <QuestIcon name="barChart" color={color} size={20} /> }} />
      <Tabs.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: t(lang,'settings'), tabBarIcon: ({color}) => <QuestIcon name="settings" color={color} size={20} /> }} />
    </Tabs.Navigator>
  </NavigationContainer>;
}
export default function NativeApp() {
  return <SafeAreaProvider><StoreProvider><StatusBar style="auto" /><Content /></StoreProvider></SafeAreaProvider>;
}
