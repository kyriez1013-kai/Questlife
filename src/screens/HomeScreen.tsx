// V2.2: "今日" Tab
// 结构:
//   1. 顶部 stats 卡片 (今日记录 / 已投入 / 累计XP)
//   2. 晨间状态横幅 (每天首次, 未设置时显示)
//   3. ＋记录进展 大按钮
//   4. ★今日技能进度 (新增) - 按大目标分组, 每行点击 → 预选该技能记录
//   5. 今日记录列表 (保留, 按大目标分组)
//
// 庆祝动效:
//   提交记录时若某技能"今日累计"首次跨过 100% 目标线, 屏幕中央弹一个 1.5s 浮层.
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert,
  Animated, Easing, Keyboard, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStore } from '../store';
import { appAccent, theme } from '../theme';
import { getQuestTheme, getStateToneColor } from '../design/tokens';
import { getSurfaceStyle } from '../design/surfaces';
import { today } from '../storage';
import {
  skillMinutesOnDate, skillStreak, skillTotalMinutes, skillMilestones,
  Skill, Category, Action, Quality, QUALITY_OPTIONS, HOUR_MILESTONES, TaskType, ExecutionLog, StateCheckIn,
  DomainRecordingField,
} from '../types';
import BottomSheetForm from '../components/BottomSheetForm';
import { adjustScheduleBlock, generateScheduleBlocksFromSkills } from '../scheduleAdjust';
import { calculatePredictionDelta, formatMetricUpdateSummary, progressTypeForSkill } from '../progress';
import {
  getLanguage, healthLabel, qualityLabel, sourceLabel, statusLabel, t, taskTypeLabel,
} from '../i18n';
import { trackEvent } from '../utils/analytics';
import QuestButton from '../components/ui/QuestButton';
import QuestCard from '../components/ui/QuestCard';
import QuestIcon from '../components/ui/QuestIcon';
import QuestPill from '../components/ui/QuestPill';
import QuestProgressBar from '../components/ui/QuestProgressBar';
import QuestInput from '../components/ui/QuestInput';
import QuestEntityIcon from '../components/ui/QuestEntityIcon';
import { getSkillSemanticIcon } from '../design/entityIcons';
import { getPredictionSchemaForSkill, isStrengthPredictionSkill, strengthVolume } from '../utils/prediction';
import { getRecordingFieldsForSkill } from '../domainTemplates';
import HomeSmartCapture from './HomeSmartCapture';
import { confirmAction } from '../utils/confirm';
import { displayEntityName } from '../utils/displayName';
import { buildTodayCommand, TodayCommandAction } from '../utils/todayCommand';
import { parseHealthContextText, ParsedHealthContext } from '../utils/healthContextParser';
import { buildObjectiveContextBrief, ObjectiveContextBrief } from '../utils/objectiveContextBrief';
import { buildMetacognitionSummary } from '../utils/metacognition';
import { buildDailyOperatingBrief } from '../utils/dailyOperatingBrief';
import DashboardLayoutControls from '../components/DashboardLayoutControls';
import { getDashboardPreference, normalizeDashboardPreferences } from '../utils/dashboardCards';

// 晨间状态选项
const DAILY_STATE_OPTIONS = [
  { value: 1, emoji: '😴', label: '很差' },
  { value: 2, emoji: '😕', label: '较差' },
  { value: 3, emoji: '😐', label: '一般' },
  { value: 4, emoji: '😊', label: '不错' },
  { value: 5, emoji: '🔥', label: '极佳' },
] as const;
type DailyStateValue = 1 | 2 | 3 | 4 | 5;
type HealthStatus = 'normal' | 'tired' | 'sick' | 'recovery' | 'high';

interface CurrentState {
  id: string;
  timestamp: string;
  energy: number;
  focus: number;
  mood: number;
  health: HealthStatus;
  note?: string;
}

interface TaskRecommendation {
  adjustedMinutes: number;
  adjustmentLabel: string;
  reason: string;
  intensity: 'minimum' | 'reduced' | 'normal' | 'challenge' | 'protected';
}

interface ActiveSession {
  id: string;
  startedAt: string;
  linkedSkillId?: string;
  linkedGoalId?: string;
  linkedModuleId?: string;
  linkedScheduleBlockId?: string;
  title: string;
  taskType?: TaskType;
  source: 'timer';
}

const TASK_TYPE_LABELS: Record<TaskType, string> = {
  deep_study: '深度学习',
  light_review: '轻复习',
  strength_training: '力量训练',
  cardio_recovery: '恢复/轻运动',
  admin: '行政事务',
  life_maintenance: '生活维持',
  creative_building: '创造/搭建',
};

const HEALTH_OPTIONS: { value: HealthStatus; label: string }[] = [
  { value: 'normal', label: '正常' },
  { value: 'tired', label: '疲惫' },
  { value: 'sick', label: '生病' },
  { value: 'recovery', label: '恢复' },
  { value: 'high', label: '很好' },
];

function inferTaskType(skill: Skill): TaskType {
  if (skill.taskType) return skill.taskType;
  const n = skill.name.toLowerCase();
  if (/python|sql|finance|study|学习|考试/.test(n)) return 'deep_study';
  if (/卧推|硬拉|深蹲|健身|gym|bench|deadlift|squat/.test(n)) return 'strength_training';
  if (/walk|stretch|散步|拉伸|恢复/.test(n)) return 'cardio_recovery';
  if (/cook|cooking|做饭|吃饭|shower|洗澡|clean|清洁|打扫/.test(n)) return 'life_maintenance';
  return 'deep_study';
}

function defaultCurrentState(dailyState?: DailyStateValue | null): CurrentState {
  const value = dailyState ?? 3;
  return {
    id: `state-${Date.now()}`,
    timestamp: new Date().toISOString(),
    energy: value,
    focus: value,
    mood: value,
    health: value <= 2 ? 'tired' : value >= 5 ? 'high' : 'normal',
  };
}

function currentStateKey(dateStr: string) {
  return `questlife_current_state_${dateStr}`;
}

function stateHistoryKey(dateStr: string) {
  return `questlife_state_history_${dateStr}`;
}

const ACTIVE_SESSION_KEY = 'questlife_active_session';
type StrengthExerciseDraft = { id: string; exerciseName: string; weight: string; sets: string; reps: string; rpe: string; note: string };

function adjustTaskRecommendation(skill: Skill, currentState?: CurrentState | null): TaskRecommendation {
  const originalMinutes = skill.dailyTargetMinutes;
  const state = currentState ?? defaultCurrentState(3);
  const type = inferTaskType(skill);
  const round = (factor: number) => Math.max(0, Math.round(originalMinutes * factor));
  const normal: TaskRecommendation = {
    adjustedMinutes: originalMinutes,
    adjustmentLabel: '正常',
    reason: '当前状态适合按原计划推进。',
    intensity: 'normal',
  };

  if (type === 'deep_study') {
    if (state.health === 'sick' || state.health === 'recovery') {
      return { adjustedMinutes: round(0.3), adjustmentLabel: '最低可执行版', reason: '恢复优先，只保留轻量推进。', intensity: 'minimum' };
    }
    if (state.energy <= 2 || state.focus <= 2) {
      return { adjustedMinutes: round(0.5), adjustmentLabel: '降级', reason: '当前专注/精力较低，建议降低认知负荷。', intensity: 'reduced' };
    }
    if (state.energy >= 4 && state.focus >= 4) {
      return { adjustedMinutes: round(1.15), adjustmentLabel: '高输出窗口', reason: '当前状态适合深度学习。', intensity: 'challenge' };
    }
    return normal;
  }

  if (type === 'light_review') {
    if (state.health === 'sick' || state.health === 'recovery') {
      return { adjustedMinutes: round(0.5), adjustmentLabel: '轻量复习', reason: '恢复期保留复习触感，不追求高强度。', intensity: 'reduced' };
    }
    if (state.energy <= 2 || state.focus <= 2) {
      return { adjustedMinutes: round(0.7), adjustmentLabel: '轻量', reason: '保留复习节奏，不强求高强度。', intensity: 'reduced' };
    }
    return normal;
  }

  if (type === 'strength_training') {
    if (state.health === 'sick') {
      return { adjustedMinutes: 0, adjustmentLabel: '建议取消', reason: '生病状态不建议高强度力量训练。', intensity: 'minimum' };
    }
    if (state.health === 'recovery' || state.energy <= 2) {
      return { adjustedMinutes: round(0.5), adjustmentLabel: '降级训练', reason: '降低训练强度，避免透支。', intensity: 'reduced' };
    }
    if (state.energy >= 4 && state.mood >= 4 && (state.health === 'normal' || state.health === 'high')) {
      return { adjustedMinutes: round(1.1), adjustmentLabel: '可挑战', reason: '当前身体状态较好，可以小幅挑战。', intensity: 'challenge' };
    }
    return normal;
  }

  if (type === 'cardio_recovery') {
    if (state.health === 'sick' || state.health === 'recovery' || state.energy <= 2) {
      return { adjustedMinutes: originalMinutes, adjustmentLabel: '恢复友好', reason: '轻运动可作为恢复任务。', intensity: 'protected' };
    }
    return normal;
  }

  if (type === 'admin') {
    if (state.focus <= 2) {
      return { adjustedMinutes: round(0.7), adjustmentLabel: '可延后', reason: '当前专注较低，行政任务可缩短或移到稍后。', intensity: 'reduced' };
    }
    return normal;
  }

  if (type === 'life_maintenance') {
    return {
      adjustedMinutes: originalMinutes,
      adjustmentLabel: '必要任务',
      reason: '生活维持任务不应被状态倍率随意压缩。',
      intensity: 'protected',
    };
  }

  if (type === 'creative_building') {
    if (state.focus <= 2 || state.mood <= 2) {
      return { adjustedMinutes: round(0.5), adjustmentLabel: '降级搭建', reason: '当前专注/情绪较低，适合降低创造负荷。', intensity: 'reduced' };
    }
    if (state.energy >= 4 && state.focus >= 4 && state.mood >= 4) {
      return { adjustedMinutes: round(1.2), adjustmentLabel: '创造窗口', reason: '当前状态适合推进创造/搭建任务。', intensity: 'challenge' };
    }
  }

  return normal;
}

function dailyStateKey(dateStr: string) {
  return `daily_state_${dateStr}`;
}

type TodayModeValue = 'normal' | 'lowEnergy' | 'sick' | 'examSprint' | 'recovery' | 'highOutput';

const TODAY_MODE_OPTIONS: { value: TodayModeValue; label: string }[] = [
  { value: 'normal', label: '正常' },
  { value: 'lowEnergy', label: '低能量' },
  { value: 'sick', label: '生病' },
  { value: 'examSprint', label: '考试冲刺' },
  { value: 'recovery', label: '恢复' },
  { value: 'highOutput', label: '高输出' },
];

const TODAY_MODE_STRATEGY: Record<TodayModeValue, {
  title: string;
  description: string;
  minimum: string;
  planNote?: string;
}> = {
  normal: {
    title: '正常执行',
    description: '按当前计划推进，保持稳定节奏。',
    minimum: '完成 1 个核心任务即可，不要求满分。',
  },
  lowEnergy: {
    title: '低能量模式',
    description: '今天减少任务压力，优先完成最重要的一件事。',
    minimum: '只完成 15-20 分钟轻量任务。',
  },
  sick: {
    title: '生病 / 恢复模式',
    description: '今天不追求高强度，保留最低行动，优先恢复。',
    minimum: '只做 10-15 分钟复习或记录。',
  },
  examSprint: {
    title: '考试冲刺',
    description: '今天优先考试相关任务，其他目标自动降级。',
    minimum: '完成一轮核心公式 / 概念复习。',
    planNote: '考试相关任务优先；非考试任务可降级',
  },
  recovery: {
    title: '恢复模式',
    description: '今天重点是恢复节奏，不把低输出视为失败。',
    minimum: '完成一个低压力任务并记录状态。',
  },
  highOutput: {
    title: '高输出模式',
    description: '今天状态较好，可以挑战更高投入。',
    minimum: '至少完成原计划，挑战额外任务可选。',
  },
};

function todayModeKey(dateStr: string) {
  return `questlife_today_mode_${dateStr}`;
}

function currentWeekDates(base: string) {
  const d = new Date(`${base}T00:00:00`);
  const start = new Date(d);
  start.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(start);
    x.setDate(start.getDate() + i);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  });
}

function minuteOfDay(time: string) {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function optionalNumber(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function timeBlockForDate(date = new Date()): NonNullable<StateCheckIn['timeBlock']> {
  const hour = date.getHours();
  if (hour < 6) return 'night';
  if (hour < 11) return 'morning';
  if (hour < 14) return 'midday';
  if (hour < 18) return 'afternoon';
  if (hour < 22) return 'evening';
  return 'night';
}

function stateLabelForValue(value: number): NonNullable<StateCheckIn['label']> {
  if (value <= 1) return 'very_low';
  if (value === 2) return 'low';
  if (value === 3) return 'normal';
  if (value === 4) return 'good';
  return 'great';
}

function formatTimer(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function metricPlanCopy(skill: Skill, adjustedMinutes: number, lang: 'zh' | 'en') {
  const type = skill.metricConfig?.metricType ?? skill.progressType ?? 'time_based';
  const map: Record<string, string> = {
    time_based: t(lang, 'todayMetricTime').replace('{minutes}', String(adjustedMinutes)),
    target_value: t(lang, 'todayMetricTarget'),
    frequency: t(lang, 'todayMetricFrequency'),
    checklist: t(lang, 'todayMetricChecklist'),
    curriculum: t(lang, 'todayMetricChecklist'),
    performance_log: t(lang, 'todayMetricPerformance'),
    quality_score: t(lang, 'todayMetricQuality'),
    state_based: t(lang, 'todayMetricState'),
    money_based: t(lang, 'todayMetricMoney'),
    binary: t(lang, 'todayMetricBinary'),
    qualitative: t(lang, 'todayMetricQualitative'),
    none: t(lang, 'metricNoTrackingDesc'),
  };
  return map[type] ?? map.time_based;
}

// Streak 里程碑: 命中这些数字时触发顶部横幅
const STREAK_MILESTONES = [3, 7, 14, 30];

export default function HomeScreen() {
  const {
    data,
    createExecutionLog,
    deleteExecutionLog,
    createRescueLog,
    completeRescueStep,
    completeActivationStep,
    createStateCheckIn,
    addContextLogs,
    setSettings,
    setDashboardPreset,
    setDashboardCardVisibility,
    moveDashboardCard,
    setDashboardCardSize,
    resetDashboardLayout,
  } = useStore();
  const [dashboardEditing, setDashboardEditing] = useState(false);
  const navigation = useNavigation<any>();
  const questTheme = getQuestTheme(data.settings.selectedThemeId);
  const accent = appAccent(data.settings.accentColor ?? questTheme.colors.primary);
  const lang = getLanguage(data.settings.language);
  const themedCard = {
    ...getSurfaceStyle(questTheme, 'elevated'),
    shadowColor: questTheme.colors.cardShadow,
  };

  const dailyStateOptions = [
    { value: 1 as DailyStateValue, emoji: '😴', label: t(lang, 'veryBad') },
    { value: 2 as DailyStateValue, emoji: '😕', label: t(lang, 'bad') },
    { value: 3 as DailyStateValue, emoji: '😐', label: t(lang, 'average') },
    { value: 4 as DailyStateValue, emoji: '😊', label: t(lang, 'good') },
    { value: 5 as DailyStateValue, emoji: '🔥', label: t(lang, 'great') },
  ];
  const healthOptions = [
    { value: 'normal' as HealthStatus, label: healthLabel(lang, 'normal') },
    { value: 'tired' as HealthStatus, label: healthLabel(lang, 'tired') },
    { value: 'sick' as HealthStatus, label: healthLabel(lang, 'sick') },
    { value: 'recovery' as HealthStatus, label: healthLabel(lang, 'recovery') },
    { value: 'high' as HealthStatus, label: healthLabel(lang, 'high') },
  ];
  const todayModeOptions = [
    { value: 'normal' as TodayModeValue, label: t(lang, 'normalMode') },
    { value: 'lowEnergy' as TodayModeValue, label: t(lang, 'lowEnergyMode') },
    { value: 'sick' as TodayModeValue, label: t(lang, 'sickMode') },
    { value: 'examSprint' as TodayModeValue, label: t(lang, 'examSprintMode') },
    { value: 'recovery' as TodayModeValue, label: t(lang, 'recoveryMode') },
    { value: 'highOutput' as TodayModeValue, label: t(lang, 'highOutputMode') },
  ];
  const todayModeStrategy = {
    normal: { title: t(lang, 'normalStrategyTitle'), description: t(lang, 'normalStrategyDesc'), minimum: t(lang, 'normalMinimum') },
    lowEnergy: { title: t(lang, 'lowEnergyStrategyTitle'), description: t(lang, 'lowEnergyStrategyDesc'), minimum: t(lang, 'lowEnergyMinimum') },
    sick: { title: t(lang, 'sickStrategyTitle'), description: t(lang, 'sickStrategyDesc'), minimum: t(lang, 'sickMinimum') },
    examSprint: { title: t(lang, 'examStrategyTitle'), description: t(lang, 'examStrategyDesc'), minimum: t(lang, 'examMinimum'), planNote: t(lang, 'examPlanNote') },
    recovery: { title: t(lang, 'recoveryStrategyTitle'), description: t(lang, 'recoveryStrategyDesc'), minimum: t(lang, 'recoveryMinimum') },
    highOutput: { title: t(lang, 'highOutputStrategyTitle'), description: t(lang, 'highOutputStrategyDesc'), minimum: t(lang, 'highOutputMinimum') },
  } as Record<TodayModeValue, { title: string; description: string; minimum: string; planNote?: string }>;

  const [modal, setModal] = useState(false);
  const [logType, setLogType] = useState<'skill' | 'schedule' | 'custom'>('skill');
  const [logSource, setLogSource] = useState<'manual' | 'schedule_block' | 'quick_log' | 'timer' | 'one_tap' | undefined>();
  const [skillId, setSkillId] = useState<string | null>(null);
  const [scheduleBlockId, setScheduleBlockId] = useState<string | null>(null);
  const [timerSessionId, setTimerSessionId] = useState<string | null>(null);
  const [minutes, setMinutes] = useState('30');
  const [note, setNote] = useState('');
  const [predictedMinutes, setPredictedMinutes] = useState('30');
  const [predictedValue, setPredictedValue] = useState('');
  const [predictedStrengthWeight, setPredictedStrengthWeight] = useState('');
  const [predictedStrengthReps, setPredictedStrengthReps] = useState('');
  const [predictedStrengthSets, setPredictedStrengthSets] = useState('3');
  const [predictedStrengthRpe, setPredictedStrengthRpe] = useState('');
  const [predictedQuality, setPredictedQuality] = useState<Quality | null>(3);
  const [lastPredictionDelta, setLastPredictionDelta] = useState<{ durationDeltaMinutes?: number; qualityDelta?: number } | null>(null);
  const [quality, setQuality] = useState<Quality | null>(null);
  const [difficulty, setDifficulty] = useState<Quality | null>(null);
  const [mentalCost, setMentalCost] = useState<Quality | null>(null);
  const [physicalCost, setPhysicalCost] = useState<Quality | null>(null);
  const [emotionalCost, setEmotionalCost] = useState<Quality | null>(null);
  const [newCurrentValue, setNewCurrentValue] = useState('');
  const [performanceValue, setPerformanceValue] = useState('');
  const [strengthWeight, setStrengthWeight] = useState('');
  const [strengthReps, setStrengthReps] = useState('');
  const [strengthSets, setStrengthSets] = useState('3');
  const [strengthRpe, setStrengthRpe] = useState('');
  const [stateValue, setStateValue] = useState('');
  const [amountAdded, setAmountAdded] = useState('');
  const [newCurrentAmount, setNewCurrentAmount] = useState('');
  const [frequencyCompleted, setFrequencyCompleted] = useState(true);
  const [binaryCompleted, setBinaryCompleted] = useState(false);
  const [qualitativeSummary, setQualitativeSummary] = useState('');
  const [completedCurriculumItemIds, setCompletedCurriculumItemIds] = useState<string[]>([]);
  const [schemaValues, setSchemaValues] = useState<Record<string, string | number | boolean>>({});
  const [showPrediction, setShowPrediction] = useState(false);
  const [showDetailedPrediction, setShowDetailedPrediction] = useState(false);
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);
  const [strengthLogMode, setStrengthLogMode] = useState<'simple' | 'session'>('simple');
  const [sessionType, setSessionType] = useState('push');
  const [exerciseEntries, setExerciseEntries] = useState<StrengthExerciseDraft[]>([]);

  // 庆祝动效
  const [celebrate, setCelebrate] = useState<{ skill: Skill } | null>(null);
  const celebrateOpacity = useRef(new Animated.Value(0)).current;
  const celebrateScale = useRef(new Animated.Value(0.6)).current;

  // 顶部横幅 (成就 & Streak 共用, 成就优先)
  type TopBanner =
    | { type: 'achievement'; skillName: string; skillIcon?: string; hours: number }
    | { type: 'streak'; skillName: string; streak: number };
  const [topBanner, setTopBanner] = useState<TopBanner | null>(null);
  const bannerOpacity = useRef(new Animated.Value(0)).current;
  const bannerTranslateY = useRef(new Animated.Value(-60)).current;

  // 晨间状态: null=尚未加载, undefined=今日未设置, number=已设置
  const [dailyState, setDailyState] = useState<DailyStateValue | undefined | null>(null);
  const [todayMode, setTodayMode] = useState<TodayModeValue>('normal');
  const [currentState, setCurrentState] = useState<CurrentState | null>(null);
  const [stateHistory, setStateHistory] = useState<CurrentState[]>([]);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [timerNow, setTimerNow] = useState(Date.now());
  const [stateModal, setStateModal] = useState(false);
  const [stateEnergy, setStateEnergy] = useState<DailyStateValue>(3);
  const [stateFocus, setStateFocus] = useState<DailyStateValue>(3);
  const [stateMood, setStateMood] = useState<DailyStateValue>(3);
  const [stateOverall, setStateOverall] = useState<DailyStateValue>(3);
  const [statePhysical, setStatePhysical] = useState<DailyStateValue>(3);
  const [stateStress, setStateStress] = useState<DailyStateValue>(3);
  const [stateHealth, setStateHealth] = useState<HealthStatus>('normal');
  const [stateNote, setStateNote] = useState('');
  const [contextSleepQuality, setContextSleepQuality] = useState<DailyStateValue>(3);
  const [contextSick, setContextSick] = useState(false);
  const [contextPostWorkout, setContextPostWorkout] = useState(false);
  const [contextAfterExam, setContextAfterExam] = useState(false);
  const [contextCaffeine, setContextCaffeine] = useState(false);
  const [contextSocialDrain, setContextSocialDrain] = useState(false);
  const [contextPasteText, setContextPasteText] = useState('');
  const [contextPreview, setContextPreview] = useState<ParsedHealthContext | null>(null);
  const [contextSaveStatus, setContextSaveStatus] = useState<'idle' | 'saved' | 'saved_sleep'>('idle');
  const [planExpanded, setPlanExpanded] = useState(false);
  const [recordsExpanded, setRecordsExpanded] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  // zone-3 section collapse state (default collapsed for clean first-screen view)
  const [stateCardOpen,  setStateCardOpen]  = useState(false);
  const [budgetCardOpen, setBudgetCardOpen] = useState(false);
  const [planCardOpen,   setPlanCardOpen]   = useState(false);
  const [rescueOpen, setRescueOpen] = useState(false);
  const [rescueStep, setRescueStep] = useState<'intro' | 'body' | 'activation' | 'done'>('intro');
  const [activeRescueId, setActiveRescueId] = useState<string | null>(null);
  const [rescueBodyAction, setRescueBodyAction] = useState('');
  const [rescueActivationAction, setRescueActivationAction] = useState('');

  useEffect(() => {
    AsyncStorage.getItem(ACTIVE_SESSION_KEY)
      .then((raw) => setActiveSession(raw ? JSON.parse(raw) as ActiveSession : null))
      .catch(() => setActiveSession(null));
  }, []);

  useEffect(() => {
    if (!activeSession) return undefined;
    const id = setInterval(() => setTimerNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [activeSession]);

  const todayStr = today();
  const todayLogs = (data.executionLogs || []).filter((a) => a.date === todayStr);
  const todayMinutes = todayLogs.reduce((sum, a) => sum + a.durationMinutes, 0);
  const todayRescueLogs = (data.rescueLogs || []).filter((log) => log.date === todayStr);
  const completedRescuesToday = todayRescueLogs.filter((log) => log.activationStepCompleted).length;
  const unfinishedRescue = todayRescueLogs.slice().reverse().find((log) => !log.activationStepCompleted);
  const objectiveContextBrief = useMemo(
    () => buildObjectiveContextBrief(data.contextLogs || []),
    [data.contextLogs],
  );
  const contextCountCutoff = Date.now() - 48 * 60 * 60 * 1000;
  const savedContextCountToday = (data.contextLogs || []).filter((log) => {
    const time = new Date(log.createdAt ?? log.date ?? 0).getTime();
    return Number.isFinite(time) && time >= contextCountCutoff;
  }).length;
  const todayStateCheckIns = (data.stateCheckIns || []).filter((row) => row.date === todayStr);
  const latestStateCheckIn = todayStateCheckIns.slice().sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
  const effectiveCurrentState: CurrentState | null = latestStateCheckIn
    ? {
        id: latestStateCheckIn.id,
        timestamp: latestStateCheckIn.timestamp,
        energy: latestStateCheckIn.energy ?? latestStateCheckIn.overall,
        focus: latestStateCheckIn.focus ?? latestStateCheckIn.overall,
        mood: latestStateCheckIn.mood ?? latestStateCheckIn.overall,
        health: latestStateCheckIn.context?.sick ? 'sick' : 'normal',
        note: latestStateCheckIn.note,
      }
    : currentState;
  const stateSummaryLabel = latestStateCheckIn
    ? (dailyStateOptions.find((item) => item.value === latestStateCheckIn.overall)?.label ?? t(lang, 'average'))
    : currentState
      ? (dailyStateOptions.find((item) => item.value === Math.round((currentState.energy + currentState.focus + currentState.mood) / 3))?.label ?? t(lang, 'average'))
      : t(lang, 'notLogged');
  const stateSummaryTime = latestStateCheckIn
    ? t(lang, 'loggedAt').replace('{time}', new Date(latestStateCheckIn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    : '';
  const currentTimeBlock = timeBlockForDate();

  // 最近解锁的成就 (按解锁时间戳找最新一条)
  const latestAchievement = useMemo(() => {
    let best: { skillName: string; skillIcon?: string; hours: number; ts: number } | null = null;
    for (const skill of data.skills) {
      for (const m of skillMilestones(skill.id, data.actions)) {
        if (m.unlocked && m.unlockedTs != null) {
          if (!best || m.unlockedTs > best.ts) {
            best = { skillName: skill.name, skillIcon: skill.icon, hours: m.hours, ts: m.unlockedTs };
          }
        }
      }
    }
    return best;
  }, [data.skills, data.actions]);

  const catOf = useCallback((sid?: string) => {
    if (!sid) return undefined;
    const s = data.skills.find((sk) => sk.id === sid);
    if (!s) return undefined;
    return data.categories.find((c) => c.id === s.categoryId);
  }, [data.skills, data.categories]);

  // ───────── 派生: 今日技能进度 (按大目标分组) ─────────
  const skillProgressByCategory = useMemo(() => {
    return data.categories
      .map((cat) => ({
        cat,
        skills: data.skills.filter((s) => s.categoryId === cat.id),
      }))
      .filter((g) => g.skills.length > 0);
  }, [data.categories, data.skills]);

  const dailyStateOption = dailyState != null
    ? dailyStateOptions.find((o) => o.value === dailyState)
    : undefined;
  const todayStrategy = todayModeStrategy[todayMode];

  // 今日执行记录按 category 分组
  const displayedTodayLogs = useMemo(() => {
    const sorted = todayLogs.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return recordsExpanded ? sorted : sorted.slice(0, 3);
  }, [recordsExpanded, todayLogs]);

  const groupedToday = useMemo(() => {
    const map = new Map<string, ExecutionLog[]>();
    displayedTodayLogs.forEach((log) => {
      const sk = data.skills.find((s) => s.id === log.linkedSkillId);
      const catId = log.linkedGoalId ?? sk?.categoryId ?? 'unknown';
      const arr = map.get(catId) ?? [];
      arr.push(log);
      map.set(catId, arr);
    });
    return Array.from(map.entries()).map(([catId, logs]) => ({
      cat: data.categories.find((c) => c.id === catId),
      logs,
    }));
  }, [displayedTodayLogs, data.categories, data.skills]);

  const findPrimaryLink = useCallback((sid?: string) => {
    if (!sid) return undefined;
    return (data.moduleSkillLinks || []).find((link) => link.skillId === sid);
  }, [data.moduleSkillLinks]);

  const contributionLabelsForLog = useCallback((logId: string) => {
    const effortIds = (data.effortUnits || [])
      .filter((unit) => unit.executionLogId === logId)
      .map((unit) => unit.id);
    if (effortIds.length === 0) return [];
    const labels = (data.contributionLinks || [])
      .filter((link) => link.executionLogId === logId || effortIds.includes(link.effortUnitId))
      .map((link) => {
        if (link.targetType === 'skill') return displayEntityName(data.skills.find((skill) => skill.id === link.targetId)?.name, lang);
        if (link.targetType === 'module') return displayEntityName(data.modules.find((module) => module.id === link.targetId)?.name, lang);
        return displayEntityName(data.categories.find((goal) => goal.id === link.targetId)?.name, lang);
      })
      .filter((value): value is string => Boolean(value));
    return Array.from(new Set(labels)).slice(0, 3);
  }, [data.categories, data.contributionLinks, data.effortUnits, data.modules, data.skills, lang]);

  // ───────── 执行记录弹窗 ─────────
  const openModal = useCallback((presetSkillId?: string, preset?: Partial<{
    logType: 'skill' | 'schedule' | 'custom';
    source: 'manual' | 'schedule_block' | 'quick_log' | 'timer' | 'one_tap';
    scheduleBlockId: string | null;
    minutes: number;
    title: string;
    timerSessionId: string | null;
  }>) => {
    const presetSkill = presetSkillId ? data.skills.find((item) => item.id === presetSkillId) : data.skills[0];
    const shouldPredict = preset?.source === 'timer' && !isStrengthPredictionSkill(presetSkill);
    setModal(true);
    setLogType(preset?.logType ?? (presetSkillId ? 'skill' : 'skill'));
    setLogSource(preset?.source);
    setSkillId(presetSkillId ?? data.skills[0]?.id ?? null);
    setScheduleBlockId(preset?.scheduleBlockId ?? null);
    setTimerSessionId(preset?.timerSessionId ?? null);
    setMinutes(String(preset?.minutes ?? 30));
    setPredictedMinutes(String(preset?.minutes ?? 30));
    setPredictedValue('');
    setPredictedStrengthWeight('');
    setPredictedStrengthReps('');
    setPredictedStrengthSets('3');
    setPredictedStrengthRpe('');
    setPredictedQuality(3);
    setLastPredictionDelta(null);
    setNote('');
    setQuality(null);
    setDifficulty(null);
    setMentalCost(null);
    setPhysicalCost(null);
    setEmotionalCost(null);
    setNewCurrentValue('');
    setPerformanceValue('');
    setStrengthWeight('');
    setStrengthReps('');
    setStrengthSets('3');
    setStrengthRpe('');
    setStateValue('');
    setAmountAdded('');
    setNewCurrentAmount('');
    setFrequencyCompleted(true);
    setBinaryCompleted(false);
    setQualitativeSummary('');
    setCompletedCurriculumItemIds([]);
    setSchemaValues({});
    setShowPrediction(shouldPredict);
    setShowDetailedPrediction(false);
    setShowAdvancedFields(false);
    setStrengthLogMode('simple');
    setSessionType('push');
    setExerciseEntries([{
      id: `exercise-${Date.now()}`,
      exerciseName: presetSkill?.name ?? '',
      weight: '',
      sets: '3',
      reps: '',
      rpe: '',
      note: '',
    }]);
    trackEvent('prediction_started', {
      skillType: presetSkill?.taskType,
      metricType: presetSkill ? progressTypeForSkill(presetSkill) : undefined,
      hasPredictionSchema: !!presetSkill,
    }, { page: 'today' });
  }, [data.skills]);

  const closeModal = useCallback(() => setModal(false), []);

  const startSession = useCallback(async (payload: Omit<ActiveSession, 'id' | 'startedAt' | 'source'>) => {
    if (activeSession) {
      Alert.alert(t(lang, 'finishCurrentTimerFirst'));
      return;
    }
    const session: ActiveSession = {
      id: `session-${Date.now()}`,
      startedAt: new Date().toISOString(),
      source: 'timer',
      ...payload,
    };
    await AsyncStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
    setActiveSession(session);
    setTimerNow(Date.now());
    const skill = session.linkedSkillId ? data.skills.find((item) => item.id === session.linkedSkillId) : undefined;
    trackEvent('timer_started', {
      taskType: session.taskType ?? skill?.taskType,
      metricType: skill?.metricConfig?.metricType ?? skill?.progressType,
      hasScheduleBlock: !!session.linkedScheduleBlockId,
    }, { page: 'today' });
  }, [activeSession, data.skills, lang]);

  const finishSession = useCallback(() => {
    if (!activeSession) return;
    const durationMinutes = Math.max(1, Math.round((Date.now() - new Date(activeSession.startedAt).getTime()) / 60000));
    openModal(activeSession.linkedSkillId, {
      logType: activeSession.linkedScheduleBlockId ? 'schedule' : activeSession.linkedSkillId ? 'skill' : 'custom',
      source: 'timer',
      scheduleBlockId: activeSession.linkedScheduleBlockId ?? null,
      minutes: durationMinutes,
      title: activeSession.title,
      timerSessionId: activeSession.id,
    });
    const skill = activeSession.linkedSkillId ? data.skills.find((item) => item.id === activeSession.linkedSkillId) : undefined;
    trackEvent('timer_finished', {
      durationMinutes,
      taskType: activeSession.taskType ?? skill?.taskType,
      metricType: skill?.metricConfig?.metricType ?? skill?.progressType,
    }, { page: 'today' });
  }, [activeSession, data.skills, openModal]);

  const oneTapComplete = useCallback((payload: {
    skill?: Skill;
    block?: any;
    defaultMinutes?: number;
  }) => {
    const skill = payload.skill ?? (payload.block?.linkedSkillId ? data.skills.find((item) => item.id === payload.block.linkedSkillId) : undefined);
    const link = findPrimaryLink(skill?.id);
    const durationMinutes = payload.defaultMinutes
      ?? payload.block?.plannedMinutes
      ?? skill?.defaultDurationMinutes
      ?? skill?.dailyTargetMinutes
      ?? 30;
    const progressType = skill?.metricConfig?.metricType ?? skill?.progressType ?? 'none';
    createExecutionLog({
      date: todayStr,
      durationMinutes,
      title: payload.block?.title ?? skill?.name ?? t(lang, 'customLog'),
      linkedSkillId: skill?.id,
      linkedGoalId: payload.block?.linkedGoalId ?? link?.goalId,
      linkedModuleId: link?.moduleId,
      linkedScheduleBlockId: payload.block?.id,
      source: 'one_tap',
      taskType: payload.block?.taskType ?? skill?.taskType,
      predictedDurationMinutes: durationMinutes,
      predictedQualityRating: 3,
      qualityRating: 3,
      predictionDelta: { durationDeltaMinutes: 0, qualityDelta: 0 },
      metricUpdate: {
        metricType: progressType,
        minutesAdded: progressType === 'time_based' ? durationMinutes : undefined,
        countAdded: progressType === 'frequency' ? 1 : undefined,
        qualityValue: progressType === 'quality_score' ? 3 : undefined,
        markCompleted: progressType === 'binary' ? true : undefined,
      },
      progressUpdate: {
        progressType,
        valueAdded: progressType === 'time_based' ? durationMinutes : progressType === 'frequency' ? 1 : undefined,
        completed: progressType === 'binary' ? true : undefined,
      },
    });
    Alert.alert(t(lang, 'oneTapLogged'));
  }, [createExecutionLog, data.skills, findPrimaryLink, lang, todayStr]);

  const submit = () => {
    if (logType === 'skill' && !skillId) { Alert.alert(t(lang, 'selectOneSkill')); return; }
    const schemaMinutes = optionalNumber(schemaValues.durationMinutes);
    const m = parseInt(minutes, 10) || schemaMinutes || 0;
    if (!m || m <= 0) { Alert.alert(t(lang, 'invalidMinutes')); return; }
    const selectedBlock = scheduleBlockId ? todayScheduleBlocks.find((b) => b.id === scheduleBlockId) : undefined;
    const effectiveSkillId = logType === 'schedule' ? (selectedBlock?.linkedSkillId ?? skillId ?? undefined) : (skillId ?? undefined);

    // 庆祝判定: 提交前后是否跨过 100% 目标
    const skill = data.skills.find((s) => s.id === effectiveSkillId);
    if (skill && skill.dailyTargetMinutes > 0) {
      const target = adjustTaskRecommendation(skill, effectiveCurrentState).adjustedMinutes;
      const beforeMin = skillMinutesOnDate(skill.id, todayStr, data.actions);
      const beforeDone = beforeMin >= target;
      const afterDone = beforeMin + m >= target;
      if (!beforeDone && afterDone) {
        setCelebrate({ skill });
      }
    }

    // 小时里程碑检测: 提交后是否首次跨越 10/25/50/100/200/300h
    let triggeredAchievement = false;
    if (skill) {
      const beforeMin = skillTotalMinutes(skill.id, data.actions);
      const afterMin = beforeMin + m;
      const newMilestone = HOUR_MILESTONES.find(
        (h) => beforeMin < h * 60 && afterMin >= h * 60
      );
      if (newMilestone) {
        setTopBanner({ type: 'achievement', skillName: skill.name, skillIcon: skill.icon, hours: newMilestone });
        triggeredAchievement = true;
      }
    }

    // Streak 里程碑 (仅在没有成就横幅时显示, 避免重叠)
    if (!triggeredAchievement && skill) {
      const beforeStreak = skillStreak(skill.id, data.actions);
      const fakeAction: Action = {
        id: '__sim__',
        skillIds: [skill.id],
        minutes: m,
        date: todayStr,
        createdAt: Date.now(),
      };
      const afterStreak = skillStreak(skill.id, [...data.actions, fakeAction]);
      if (afterStreak > beforeStreak && STREAK_MILESTONES.includes(afterStreak)) {
        setTopBanner({ type: 'streak', skillName: skill.name, streak: afterStreak });
      }
    }

    const progressType = skill?.metricConfig?.metricType ?? skill?.progressType ?? 'time_based';
    const selectedRecordingFields = getRecordingFieldsForSkill(skill);
    const hasDomainSchema = selectedRecordingFields.length > 0;
    const parsedNewCurrentValue = optionalNumber(newCurrentValue) ?? optionalNumber(schemaValues.weight) ?? optionalNumber(schemaValues.amount);
    const parsedPerformanceValue = optionalNumber(performanceValue) ?? optionalNumber(schemaValues.weight) ?? optionalNumber(schemaValues.score) ?? optionalNumber(schemaValues.mockScore);
    const parsedStateValue = optionalNumber(stateValue) ?? optionalNumber(schemaValues.afterState);
    const parsedAmountAdded = optionalNumber(amountAdded) ?? optionalNumber(schemaValues.amount);
    const parsedNewCurrentAmount = optionalNumber(newCurrentAmount);
    const parsedStrengthWeight = optionalNumber(strengthWeight) ?? optionalNumber(schemaValues.weight);
    const parsedStrengthReps = optionalNumber(strengthReps) ?? optionalNumber(schemaValues.reps);
    const parsedStrengthSets = optionalNumber(strengthSets) ?? optionalNumber(schemaValues.sets);
    const parsedStrengthRpe = optionalNumber(strengthRpe) ?? optionalNumber(schemaValues.rpe);
    const parsedPredictedValue = optionalNumber(predictedValue);
    const parsedPredictedStrengthWeight = optionalNumber(predictedStrengthWeight);
    const parsedPredictedStrengthReps = optionalNumber(predictedStrengthReps);
    const parsedPredictedStrengthSets = optionalNumber(predictedStrengthSets);
    const parsedPredictedStrengthRpe = optionalNumber(predictedStrengthRpe);
    const predictionSchema = getPredictionSchemaForSkill(skill);
    const isStrengthLog = isStrengthPredictionSkill(skill);
    const actualVolume = strengthVolume(parsedStrengthWeight, parsedStrengthReps, parsedStrengthSets);
    const predictedVolume = strengthVolume(parsedPredictedStrengthWeight, parsedPredictedStrengthReps, parsedPredictedStrengthSets);
    const strengthSet = parsedStrengthWeight != null || parsedStrengthReps != null
      ? {
          weight: parsedStrengthWeight,
          reps: parsedStrengthReps,
          sets: parsedStrengthSets ?? 1,
          rpe: parsedStrengthRpe,
        }
      : undefined;
    const parsedExercises = exerciseEntries
      .map((entry) => ({
        id: entry.id,
        exerciseName: entry.exerciseName.trim(),
        weight: optionalNumber(entry.weight),
        sets: optionalNumber(entry.sets),
        reps: optionalNumber(entry.reps),
        rpe: optionalNumber(entry.rpe),
        note: entry.note.trim() || undefined,
      }))
      .filter((entry) => entry.exerciseName || entry.weight != null || entry.sets != null || entry.reps != null);
    const primarySessionExercise = strengthLogMode === 'session' ? parsedExercises[0] : undefined;
    const predictedDurationMinutes = showPrediction && predictionSchema.showDuration ? optionalNumber(predictedMinutes) : undefined;
    const schemaQuality = optionalNumber(schemaValues.quality) ?? optionalNumber(schemaValues.understanding) ?? optionalNumber(schemaValues.decisionQuality) ?? optionalNumber(schemaValues.recoveryEffect);
    const predictedQualityRating = showPrediction ? predictedQuality ?? undefined : undefined;
    const effectiveStrengthWeight = primarySessionExercise?.weight ?? parsedStrengthWeight;
    const effectiveStrengthReps = primarySessionExercise?.reps ?? parsedStrengthReps;
    const effectiveStrengthSets = primarySessionExercise?.sets ?? parsedStrengthSets;
    const effectiveStrengthRpe = primarySessionExercise?.rpe ?? parsedStrengthRpe;
    const effectiveStrengthVolume = strengthVolume(effectiveStrengthWeight, effectiveStrengthReps, effectiveStrengthSets);
    const effectivePerformanceValue = progressType === 'performance_log'
      ? parsedPerformanceValue
        ?? (skill?.metricConfig?.primaryMetric === 'volume' ? effectiveStrengthVolume : effectiveStrengthWeight)
        ?? effectiveStrengthVolume
      : undefined;
    const targetValueUpdate = progressType === 'target_value'
      ? (parsedNewCurrentValue ?? (isStrengthLog ? effectiveStrengthWeight : undefined))
      : undefined;
    const predictionData = !showPrediction ? undefined : isStrengthLog
      ? {
          kind: 'strength_training',
          exerciseName: skill?.name,
          strength: {
            weight: showDetailedPrediction ? parsedPredictedStrengthWeight : undefined,
            reps: showDetailedPrediction ? parsedPredictedStrengthReps : undefined,
            sets: showDetailedPrediction ? parsedPredictedStrengthSets : undefined,
            rpe: showDetailedPrediction ? parsedPredictedStrengthRpe : undefined,
            volume: showDetailedPrediction ? predictedVolume : undefined,
          },
          predictedQualityRating,
        }
      : predictionSchema.kind === 'target_value'
        ? { kind: 'target_value', predictedValue: parsedPredictedValue, predictedQualityRating }
        : predictionSchema.kind === 'frequency'
          ? { kind: 'frequency', plannedCount: 1, predictedQualityRating }
          : predictionSchema.kind === 'checklist'
            ? { kind: 'checklist', plannedItems: completedCurriculumItemIds.length, predictedQualityRating }
            : predictionSchema.kind === 'qualitative' || predictionSchema.kind === 'none'
              ? { kind: predictionSchema.kind, predictedQualityRating }
              : undefined;
    const actualData = isStrengthLog
      ? {
          kind: 'strength_training',
          exerciseName: primarySessionExercise?.exerciseName || skill?.name,
          sessionType: strengthLogMode === 'session' ? sessionType : undefined,
          exercises: strengthLogMode === 'session' ? parsedExercises : undefined,
          strength: {
            weight: effectiveStrengthWeight,
            reps: effectiveStrengthReps,
            sets: effectiveStrengthSets,
            rpe: effectiveStrengthRpe,
            volume: effectiveStrengthVolume,
          },
        }
      : undefined;
    const predictionDelta = showPrediction ? calculatePredictionDelta({
      durationMinutes: m,
      predictedDurationMinutes,
      qualityRating: quality ?? undefined,
      predictedQualityRating,
    }) : undefined;
    createExecutionLog({
      date: todayStr,
      durationMinutes: m,
      title: selectedBlock?.title ?? skill?.name ?? (note.trim() || t(lang, 'customLog')),
      note: note.trim() || undefined,
      linkedSkillId: effectiveSkillId,
      linkedScheduleBlockId: selectedBlock?.id,
      linkedGoalId: selectedBlock?.linkedGoalId,
      linkedModuleId: findPrimaryLink(effectiveSkillId)?.moduleId,
      source: logSource ?? (logType === 'schedule' ? 'schedule_block' : logType === 'skill' ? 'quick_log' : 'manual'),
      taskType: selectedBlock?.taskType ?? skill?.taskType,
      predictedDurationMinutes,
      predictedQualityRating,
      predictionData,
      actualData,
      predictionDelta,
      qualityRating: quality ?? (schemaQuality as Quality | undefined),
      difficultyRating: difficulty ?? (optionalNumber(schemaValues.difficulty) as Quality | undefined),
      actualMentalCost: mentalCost ? mentalCost * 20 : optionalNumber(schemaValues.mentalCost) != null ? optionalNumber(schemaValues.mentalCost)! * 20 : undefined,
      actualPhysicalCost: physicalCost ? physicalCost * 20 : optionalNumber(schemaValues.physicalCost) != null ? optionalNumber(schemaValues.physicalCost)! * 20 : undefined,
      actualEmotionalCost: emotionalCost ? emotionalCost * 20 : undefined,
      structuredData: hasDomainSchema ? schemaValues : undefined,
      domainTemplateId: skill?.domainTemplateId,
      domain: catOf(skill?.id)?.domain,
      stateSnapshot: effectiveCurrentState ? {
        energy: effectiveCurrentState.energy,
        focus: effectiveCurrentState.focus,
        mood: effectiveCurrentState.mood,
        health: effectiveCurrentState.health,
        timestamp: effectiveCurrentState.timestamp,
      } : undefined,
      progressUpdate: {
        progressType,
        valueAdded: progressType === 'time_based' ? m : progressType === 'frequency' && frequencyCompleted ? 1 : undefined,
        newCurrentValue: progressType === 'target_value' ? targetValueUpdate : undefined,
        completedCurriculumItemIds: progressType === 'curriculum' || progressType === 'checklist' ? completedCurriculumItemIds : undefined,
        performanceData: progressType === 'performance_log' ? {
          performanceType: skill?.metricConfig?.performanceType,
          values: effectivePerformanceValue != null ? [{ metric: skill?.metricConfig?.primaryMetric ?? 'custom', value: effectivePerformanceValue, unit: skill?.metricConfig?.unit }] : undefined,
          strengthSets: effectiveStrengthWeight != null || effectiveStrengthReps != null ? [{ weight: effectiveStrengthWeight, reps: effectiveStrengthReps, sets: effectiveStrengthSets ?? 1, rpe: effectiveStrengthRpe }] : strengthSet ? [strengthSet] : undefined,
          totalVolume: effectiveStrengthVolume ?? actualVolume,
          notes: note.trim() || undefined,
        } : undefined,
        stateValue: progressType === 'state_based' ? parsedStateValue : undefined,
        amountAdded: progressType === 'money_based' ? parsedAmountAdded : undefined,
        newCurrentAmount: progressType === 'money_based' ? parsedNewCurrentAmount : undefined,
        completed: progressType === 'binary' ? binaryCompleted : undefined,
        qualitativeSummary: progressType === 'qualitative' ? qualitativeSummary.trim() || undefined : undefined,
      },
      metricUpdate: {
        metricType: progressType,
        minutesAdded: progressType === 'time_based' ? m : undefined,
        newCurrentValue: progressType === 'target_value' ? targetValueUpdate : undefined,
        countAdded: progressType === 'frequency' && frequencyCompleted ? 1 : undefined,
        completedChecklistItemIds: progressType === 'curriculum' || progressType === 'checklist' ? completedCurriculumItemIds : undefined,
        performanceValue: progressType === 'performance_log' ? effectivePerformanceValue : undefined,
        performanceUnit: progressType === 'performance_log' ? skill?.metricConfig?.unit : undefined,
        performanceNote: progressType === 'performance_log' ? note.trim() || undefined : undefined,
        performanceData: progressType === 'performance_log' ? {
          performanceType: skill?.metricConfig?.performanceType,
          values: effectivePerformanceValue != null ? [{ metric: skill?.metricConfig?.primaryMetric ?? 'custom', value: effectivePerformanceValue, unit: skill?.metricConfig?.unit }] : undefined,
          strengthSets: effectiveStrengthWeight != null || effectiveStrengthReps != null ? [{ weight: effectiveStrengthWeight, reps: effectiveStrengthReps, sets: effectiveStrengthSets ?? 1, rpe: effectiveStrengthRpe }] : strengthSet ? [strengthSet] : undefined,
          totalVolume: effectiveStrengthVolume ?? actualVolume,
          notes: note.trim() || undefined,
        } : undefined,
        qualityValue: progressType === 'quality_score' ? quality ?? undefined : undefined,
        stateValue: progressType === 'state_based' ? parsedStateValue : undefined,
        amountAdded: progressType === 'money_based' ? parsedAmountAdded : undefined,
        newCurrentAmount: progressType === 'money_based' ? parsedNewCurrentAmount : undefined,
        markCompleted: progressType === 'binary' ? binaryCompleted : undefined,
        qualitativeText: progressType === 'qualitative' ? qualitativeSummary.trim() || undefined : undefined,
      },
    });
    setLastPredictionDelta(predictionDelta ?? null);
    if (predictionDelta) {
      const lines: string[] = [];
      if (predictionDelta.durationDeltaMinutes != null) {
        lines.push(t(lang, 'durationPredictionLine')
          .replace('{predicted}', String(predictedDurationMinutes ?? '—'))
          .replace('{actual}', String(m))
          .replace('{delta}', predictionDelta.durationDeltaMinutes > 0 ? `+${predictionDelta.durationDeltaMinutes}` : String(predictionDelta.durationDeltaMinutes)));
      }
      if (predictionDelta.qualityDelta != null) {
        lines.push(t(lang, 'qualityPredictionLine')
          .replace('{predicted}', String(predictedQualityRating ?? '—'))
          .replace('{actual}', String(quality ?? '—'))
          .replace('{delta}', predictionDelta.qualityDelta > 0 ? `+${predictionDelta.qualityDelta}` : String(predictionDelta.qualityDelta)));
      }
      const feedback = (predictionDelta.durationDeltaMinutes ?? 0) > 0 || (predictionDelta.qualityDelta ?? 0) > 0
        ? t(lang, 'predictionBetter')
        : Math.abs(predictionDelta.durationDeltaMinutes ?? 0) <= 5 && Math.abs(predictionDelta.qualityDelta ?? 0) === 0
          ? t(lang, 'predictionClose')
          : t(lang, 'predictionBelow');
      Alert.alert(t(lang, 'predictionResult'), `${lines.join('\n')}\n${feedback}`);
    }
    if (logSource === 'timer' && timerSessionId) {
      AsyncStorage.removeItem(ACTIVE_SESSION_KEY).then(() => setActiveSession(null)).catch(() => setActiveSession(null));
    }
    setLogSource(undefined);
    setTimerSessionId(null);
    setModal(false);
  };

  // 庆祝浮层动画: 200ms fade-in + scale → 1100ms 停留 → 200ms fade-out
  useEffect(() => {
    if (!celebrate) return;
    celebrateOpacity.setValue(0);
    celebrateScale.setValue(0.6);
    Animated.parallel([
      Animated.timing(celebrateOpacity, {
        toValue: 1, duration: 200, useNativeDriver: true, easing: Easing.out(Easing.quad),
      }),
      Animated.spring(celebrateScale, {
        toValue: 1, friction: 5, tension: 80, useNativeDriver: true,
      }),
    ]).start();
    const fadeOut = setTimeout(() => {
      Animated.timing(celebrateOpacity, {
        toValue: 0, duration: 250, useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setCelebrate(null);
      });
    }, 1250);
    return () => clearTimeout(fadeOut);
  }, [celebrate, celebrateOpacity, celebrateScale]);

  // 顶部横幅动画: 220ms 进 → 2.6s 停留 → 240ms 出 ≈ 3s
  useEffect(() => {
    if (!topBanner) return;
    bannerOpacity.setValue(0);
    bannerTranslateY.setValue(-60);
    Animated.parallel([
      Animated.timing(bannerOpacity, {
        toValue: 1, duration: 220, useNativeDriver: true, easing: Easing.out(Easing.quad),
      }),
      Animated.timing(bannerTranslateY, {
        toValue: 0, duration: 220, useNativeDriver: true, easing: Easing.out(Easing.cubic),
      }),
    ]).start();
    const hide = setTimeout(() => {
      Animated.parallel([
        Animated.timing(bannerOpacity, { toValue: 0, duration: 240, useNativeDriver: true }),
        Animated.timing(bannerTranslateY, {
          toValue: -60, duration: 240, useNativeDriver: true, easing: Easing.in(Easing.cubic),
        }),
      ]).start(({ finished }) => { if (finished) setTopBanner(null); });
    }, 2600);
    return () => clearTimeout(hide);
  }, [topBanner, bannerOpacity, bannerTranslateY]);

  // 每次切回 Tab 都重新读今日状态 (支持跨天切换场景)
  useFocusEffect(
    useCallback(() => {
      const dateStr = today(); // 重新取, 防止跨天
      AsyncStorage.getItem(dailyStateKey(dateStr)).then((raw) => {
        if (raw) {
          setDailyState(parseInt(raw, 10) as DailyStateValue);
        } else {
          setDailyState(undefined); // 今天未设置 → 显示横幅
        }
      }).catch(() => setDailyState(undefined));

      AsyncStorage.getItem(todayModeKey(dateStr)).then((raw) => {
        const found = TODAY_MODE_OPTIONS.some((m) => m.value === raw);
        setTodayMode(found ? (raw as TodayModeValue) : 'normal');
      }).catch(() => setTodayMode('normal'));

      AsyncStorage.getItem(currentStateKey(dateStr)).then((raw) => {
        setCurrentState(raw ? JSON.parse(raw) as CurrentState : null);
      }).catch(() => setCurrentState(null));

      AsyncStorage.getItem(stateHistoryKey(dateStr)).then((raw) => {
        setStateHistory(raw ? JSON.parse(raw) as CurrentState[] : []);
      }).catch(() => setStateHistory([]));
    }, [])
  );

  const persistCurrentState = useCallback(async (entry: CurrentState) => {
    const dateStr = today();
    const nextHistory = [entry, ...stateHistory].slice(0, 8);
    await AsyncStorage.multiSet([
      [currentStateKey(dateStr), JSON.stringify(entry)],
      [stateHistoryKey(dateStr), JSON.stringify(nextHistory)],
    ]);
    setCurrentState(entry);
    setStateHistory(nextHistory);
  }, [stateHistory]);

  const selectDailyState = useCallback(async (val: DailyStateValue) => {
    const dateStr = today();
    await AsyncStorage.setItem(dailyStateKey(dateStr), String(val));
    setDailyState(val);
    await persistCurrentState(defaultCurrentState(val));
  }, [persistCurrentState]);

  const selectTodayMode = useCallback(async (mode: TodayModeValue) => {
    const dateStr = today();
    await AsyncStorage.setItem(todayModeKey(dateStr), mode);
    setTodayMode(mode);
  }, []);

  const openStateModal = useCallback(() => {
    const state = effectiveCurrentState ?? defaultCurrentState(dailyState);
    const latest = latestStateCheckIn;
    setStateOverall((latest?.overall ?? Math.round((state.energy + state.focus + state.mood) / 3)) as DailyStateValue);
    setStateEnergy((latest?.energy ?? state.energy) as DailyStateValue);
    setStateFocus((latest?.focus ?? state.focus) as DailyStateValue);
    setStateMood((latest?.mood ?? state.mood) as DailyStateValue);
    setStatePhysical((latest?.physical ?? 3) as DailyStateValue);
    setStateStress((latest?.stress ?? 3) as DailyStateValue);
    setStateHealth(state.health);
    setContextSleepQuality((latest?.context?.sleepQuality ?? 3) as DailyStateValue);
    setContextSick(!!latest?.context?.sick);
    setContextPostWorkout(!!latest?.context?.postWorkout);
    setContextAfterExam(!!latest?.context?.afterExam);
    setContextCaffeine(!!latest?.context?.caffeine);
    setContextSocialDrain(!!latest?.context?.socialDrain);
    setStateNote(latest?.note ?? state.note ?? '');
    setStateModal(true);
  }, [dailyState, effectiveCurrentState, latestStateCheckIn]);

  const saveStateCheckIn = useCallback(async (overall: DailyStateValue, details?: Partial<StateCheckIn>) => {
    const now = new Date();
    const checkIn = createStateCheckIn({
      date: today(),
      timestamp: now.toISOString(),
      timeBlock: timeBlockForDate(now),
      overall,
      label: stateLabelForValue(overall),
      ...details,
    });
    trackEvent('state_checkin_saved', {
      overall,
      label: checkIn.label,
      timeBlock: checkIn.timeBlock,
      hasDetails: !!details?.energy || !!details?.focus || !!details?.mood || !!details?.physical || !!details?.stress,
      hasContext: !!details?.context && Object.values(details.context).some(Boolean),
    }, { page: 'today' });
    Alert.alert(t(lang, 'stateCheckInSaved'));
  }, [createStateCheckIn, lang]);

  const saveStateAssessment = useCallback(async () => {
    const avg = Math.round((stateEnergy + stateFocus + stateMood) / 3) as DailyStateValue;
    const entry: CurrentState = {
      id: `state-${Date.now()}`,
      timestamp: new Date().toISOString(),
      energy: stateEnergy,
      focus: stateFocus,
      mood: stateMood,
      health: stateHealth,
      note: stateNote.trim() || undefined,
    };
    await AsyncStorage.setItem(dailyStateKey(today()), String(avg));
    setDailyState(avg);
    await persistCurrentState(entry);
    await saveStateCheckIn(stateOverall, {
      energy: stateEnergy,
      focus: stateFocus,
      mood: stateMood,
      physical: statePhysical,
      stress: stateStress,
      context: {
        sleepQuality: contextSleepQuality,
        sick: contextSick,
        postWorkout: contextPostWorkout,
        afterExam: contextAfterExam,
        caffeine: contextCaffeine,
        socialDrain: contextSocialDrain,
      },
      note: stateNote.trim() || undefined,
    });
    setStateModal(false);
  }, [contextAfterExam, contextCaffeine, contextPostWorkout, contextSick, contextSleepQuality, contextSocialDrain, persistCurrentState, saveStateCheckIn, stateEnergy, stateFocus, stateMood, stateHealth, stateNote, stateOverall, statePhysical, stateStress]);

  const todayScheduleBlocks = useMemo(
    () => {
      const generated = generateScheduleBlocksFromSkills(data.skills, currentWeekDates(todayStr), data.scheduleBlocks || []);
      return [...(data.scheduleBlocks || []), ...generated]
        .filter((b) => b.date === todayStr)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
    },
    [data.scheduleBlocks, data.skills, todayStr]
  );

  const nextAction = useMemo(() => {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const active = todayScheduleBlocks.find((block) => (
      minuteOfDay(block.startTime) <= nowMinutes && nowMinutes < minuteOfDay(block.endTime)
    ));
    if (active) {
      return {
        title: t(lang, 'activeBlockNow'),
        body: `${active.startTime}-${active.endTime} · ${active.title}`,
        block: active,
      };
    }
    const upcoming = todayScheduleBlocks.find((block) => minuteOfDay(block.startTime) > nowMinutes);
    if (upcoming) {
      return {
        title: t(lang, 'upcomingBlock'),
        body: `${upcoming.startTime}-${upcoming.endTime} · ${upcoming.title}`,
        block: upcoming,
      };
    }
    if ((data.categories || []).length === 0) return { title: t(lang, 'nextAction'), body: t(lang, 'createGoalNextAction') };
    if ((data.skills || []).length === 0) return { title: t(lang, 'nextAction'), body: t(lang, 'createSkillNextAction') };
    if (todayScheduleBlocks.length === 0) return { title: t(lang, 'nextAction'), body: t(lang, 'scheduleSkillNextAction') };
    return { title: t(lang, 'nextAction'), body: t(lang, 'noActiveBlockNextAction') };
  }, [todayScheduleBlocks, data.categories, data.skills, lang]);

  const nowFocus = useMemo(() => {
    if (activeSession) {
      const skill = activeSession.linkedSkillId ? data.skills.find((s) => s.id === activeSession.linkedSkillId) : undefined;
      return {
        type: 'active_session' as const,
        title: activeSession.title,
        icon: '🟢',
        linkedSkillId: activeSession.linkedSkillId,
        linkedGoalId: activeSession.linkedGoalId,
        linkedModuleId: activeSession.linkedModuleId,
        linkedScheduleBlockId: activeSession.linkedScheduleBlockId,
        taskType: activeSession.taskType,
        metricType: skill ? progressTypeForSkill(skill) : undefined,
        suggestionText: `${t(lang, 'running')} ${formatTimer(timerNow - new Date(activeSession.startedAt).getTime())}`,
        plannedMinutes: undefined,
      };
    }
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const activeBlock = todayScheduleBlocks.find((block) => (
      block.status !== 'completed' && minuteOfDay(block.startTime) <= nowMinutes && nowMinutes < minuteOfDay(block.endTime)
    ));
    const nextBlock = activeBlock ?? todayScheduleBlocks.find((block) => block.status !== 'completed');
    if (nextBlock) {
      const skill = nextBlock.linkedSkillId ? data.skills.find((s) => s.id === nextBlock.linkedSkillId) : undefined;
      return {
        type: 'schedule_block' as const,
        title: nextBlock.title,
        icon: skill?.icon ?? '🗓️',
        linkedSkillId: nextBlock.linkedSkillId,
        linkedGoalId: nextBlock.linkedGoalId,
        linkedScheduleBlockId: nextBlock.id,
        taskType: nextBlock.taskType,
        metricType: skill ? progressTypeForSkill(skill) : undefined,
        suggestionText: skill ? metricPlanCopy(skill, nextBlock.plannedMinutes, lang) : `${nextBlock.startTime}-${nextBlock.endTime}`,
        plannedMinutes: nextBlock.plannedMinutes,
      };
    }
    const unloggedSkill = data.skills.find((skill) => !todayLogs.some((log) => log.linkedSkillId === skill.id));
    const skill = unloggedSkill ?? data.skills[0];
    if (skill) {
      const link = findPrimaryLink(skill.id);
      const plannedMinutes = skill.defaultDurationMinutes ?? skill.dailyTargetMinutes ?? 30;
      return {
        type: 'skill' as const,
        title: skill.name,
        icon: skill.icon,
        linkedSkillId: skill.id,
        linkedGoalId: link?.goalId,
        linkedModuleId: link?.moduleId,
        taskType: skill.taskType,
        metricType: progressTypeForSkill(skill),
        suggestionText: metricPlanCopy(skill, plannedMinutes, lang),
        plannedMinutes,
      };
    }
    return {
      type: 'fallback' as const,
      title: t(lang, 'logProgress'),
      icon: '＋',
      suggestionText: t(lang, 'noActiveBlockNextAction'),
    };
  }, [activeSession, data.skills, findPrimaryLink, lang, timerNow, todayLogs, todayScheduleBlocks]);

  const latestFeedbackLog = useMemo(() => {
    const latest = todayLogs.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (!latest) return undefined;
    const ageMs = Date.now() - new Date(latest.createdAt).getTime();
    return ageMs <= 30 * 60 * 1000 ? latest : undefined;
  }, [todayLogs]);

  const todayCommand = useMemo(() => buildTodayCommand({
    data,
    now: new Date(),
    scheduleBlocks: todayScheduleBlocks,
    todayLogs,
    latestFeedback: latestFeedbackLog ? { executionLogId: latestFeedbackLog.id } : undefined,
    latestState: latestStateCheckIn,
    activeSession,
  }), [activeSession, data, latestFeedbackLog, latestStateCheckIn, todayLogs, todayScheduleBlocks]);

  const metacognitionSummary = useMemo(() => buildMetacognitionSummary({
    executionLogs: data.executionLogs || [],
    stateCheckIns: data.stateCheckIns || [],
    skills: data.skills || [],
    goals: data.categories || [],
    contextLogs: data.contextLogs || [],
    now: new Date(),
  }), [data.categories, data.contextLogs, data.executionLogs, data.skills, data.stateCheckIns]);

  const dailyOperatingBrief = useMemo(() => buildDailyOperatingBrief({
    contextLogs: data.contextLogs || [],
    stateCheckIns: data.stateCheckIns || [],
    executionLogs: data.executionLogs || [],
    goals: data.categories || [],
    modules: data.modules || [],
    skills: data.skills || [],
    scheduleBlocks: todayScheduleBlocks,
    todayCommand,
    objectiveContextBrief,
    metacognitionSummary,
    now: new Date(),
  }), [data.categories, data.contextLogs, data.executionLogs, data.modules, data.skills, data.stateCheckIns, metacognitionSummary, objectiveContextBrief, todayCommand, todayScheduleBlocks]);

  const formatCommandCopy = useCallback((key: string, values?: Record<string, string | number>) => {
    let copy = t(lang, key);
    Object.entries(values || {}).forEach(([name, value]) => {
      copy = copy.replace(`{${name}}`, String(value));
    });
    return copy;
  }, [lang]);

  const commandTargetSkill = todayCommand.linkedSkillId ? data.skills.find((item) => item.id === todayCommand.linkedSkillId) : undefined;

  const trackNowFocusAction = useCallback((action: 'start_timer' | 'one_tap' | 'log_progress') => {
    trackEvent('today_now_focus_clicked', {
      focusType: nowFocus.type,
      taskType: nowFocus.taskType,
      metricType: nowFocus.metricType,
      action,
    }, { page: 'today' });
  }, [nowFocus]);

  const energyBudgetRows = useMemo(() => {
    // v1 uses 240 minutes as default daily execution budget. Future versions should make it configurable.
    const budgetMinutes = 240;
    const rows = todayScheduleBlocks.length > 0
      ? todayScheduleBlocks.map((block) => {
          const skill = block.linkedSkillId ? data.skills.find((item) => item.id === block.linkedSkillId) : undefined;
          const actual = todayLogs.filter((log) => log.linkedScheduleBlockId === block.id || (!!skill && log.linkedSkillId === skill.id)).reduce((sum, log) => sum + log.durationMinutes, 0);
          return {
            id: block.id,
            label: block.title,
            planned: block.plannedMinutes,
            completed: block.status === 'completed' || actual > 0,
            over: Math.max(0, actual - block.plannedMinutes),
          };
        })
      : data.skills.slice(0, 5).map((skill) => {
          const planned = skill.defaultDurationMinutes ?? skill.dailyTargetMinutes ?? 30;
          const actual = todayLogs.filter((log) => log.linkedSkillId === skill.id).reduce((sum, log) => sum + log.durationMinutes, 0);
          return {
            id: skill.id,
            label: `${skill.icon ?? '🧩'} ${skill.name}`,
            planned,
            completed: actual > 0,
            over: Math.max(0, actual - planned),
          };
        });
    const allocated = Math.min(100, Math.round(rows.reduce((sum, row) => sum + row.planned, 0) / budgetMinutes * 100));
    return { rows, allocated, remaining: Math.max(0, 100 - allocated), budgetMinutes };
  }, [todayScheduleBlocks, data.skills, todayLogs]);

  const bodyActionOptions = useMemo(() => [
    t(lang, 'standUp'),
    t(lang, 'takeSipOfWater'),
    t(lang, 'washFace'),
    t(lang, 'putPhoneOnDesk'),
    t(lang, 'openWindow'),
    t(lang, 'walkToDoor'),
    t(lang, 'takeDeepBreaths'),
  ], [lang]);

  const genericActivationOptions = useMemo(() => [
    t(lang, 'openComputer'),
    t(lang, 'openProject'),
    t(lang, 'writeOneSentence'),
    t(lang, 'clearDeskTwoMinutes'),
    t(lang, 'takeShower'),
    t(lang, 'walkOutsideTwoMinutes'),
    t(lang, 'lookAtTodayPlan'),
  ], [lang]);

  const getRescueTarget = useCallback(() => {
    const block = todayScheduleBlocks.find((item) => item.status !== 'completed' && item.linkedSkillId)
      ?? todayScheduleBlocks.find((item) => item.status !== 'completed');
    const skill = block?.linkedSkillId
      ? data.skills.find((item) => item.id === block.linkedSkillId)
      : data.skills[0];
    const link = skill ? findPrimaryLink(skill.id) : undefined;
    return { block, skill, link };
  }, [data.skills, findPrimaryLink, todayScheduleBlocks]);

  const makeActivationAction = useCallback((skill?: Skill) => {
    if (!skill) return genericActivationOptions[0] ?? t(lang, 'lookAtTodayPlan');
    const type = skill.taskType;
    if (type === 'deep_study' || type === 'light_review') {
      return lang === 'zh'
        ? `打开 ${skill.name}，只看 2 分钟，不要求完成。`
        : `Open ${skill.name} for 2 minutes. Completion is not required.`;
    }
    if (type === 'creative_building') {
      return lang === 'zh'
        ? '打开项目，只写下一步要做什么。'
        : 'Open the project and write the next step only.';
    }
    if (type === 'strength_training' || type === 'cardio_recovery') {
      return lang === 'zh'
        ? '换衣服或活动 2 分钟，不要求训练。'
        : 'Change clothes or move for 2 minutes. Training is not required.';
    }
    if (type === 'admin' || type === 'life_maintenance') {
      return lang === 'zh'
        ? '只处理一个最小生活动作。'
        : 'Handle one tiny life-maintenance action.';
    }
    return genericActivationOptions[0] ?? t(lang, 'lookAtTodayPlan');
  }, [genericActivationOptions, lang]);

  const openRescueFlow = useCallback((existingId?: string) => {
    const existing = existingId ? (data.rescueLogs || []).find((log) => log.id === existingId) : undefined;
    const bodyAction = existing?.bodyAction ?? bodyActionOptions[(todayRescueLogs.length + todayLogs.length) % bodyActionOptions.length] ?? t(lang, 'standUp');
    const target = getRescueTarget();
    const activationAction = existing?.activationAction ?? makeActivationAction(target.skill);
    setActiveRescueId(existing?.id ?? null);
    setRescueBodyAction(bodyAction);
    setRescueActivationAction(activationAction);
    setRescueStep(existing ? (existing.rescueStepCompleted ? 'activation' : 'body') : 'intro');
    setRescueOpen(true);
    trackEvent('cant_start_clicked', {
      logsToday: todayLogs.length,
      hasScheduleToday: todayScheduleBlocks.length > 0,
      skillsCount: data.skills.length,
      goalsCount: data.categories.length,
    }, { page: 'today' });
  }, [bodyActionOptions, data.categories.length, data.rescueLogs, data.skills.length, getRescueTarget, lang, makeActivationAction, todayLogs.length, todayRescueLogs.length, todayScheduleBlocks.length]);

  const startRescue = useCallback(() => {
    const target = getRescueTarget();
    const log = createRescueLog({
      date: todayStr,
      startedAt: new Date().toISOString(),
      triggerType: 'brain_off',
      bodyAction: rescueBodyAction,
      activationAction: rescueActivationAction,
      linkedSkillId: target.skill?.id,
      linkedGoalId: target.block?.linkedGoalId ?? target.link?.goalId,
      linkedModuleId: target.link?.moduleId,
      linkedScheduleBlockId: target.block?.id,
      beforeState: effectiveCurrentState ? {
        energy: effectiveCurrentState.energy,
        focus: effectiveCurrentState.focus,
        mood: effectiveCurrentState.mood,
      } : undefined,
    });
    setActiveRescueId(log.id);
    setRescueStep('body');
    trackEvent('rescue_started', {
      triggerType: 'brain_off',
      logsToday: todayLogs.length,
      hasScheduleToday: todayScheduleBlocks.length > 0,
    }, { page: 'today' });
  }, [createRescueLog, effectiveCurrentState, getRescueTarget, rescueActivationAction, rescueBodyAction, todayLogs.length, todayScheduleBlocks.length, todayStr]);

  const finishBodyAction = useCallback(() => {
    if (!activeRescueId) return;
    completeRescueStep(activeRescueId, rescueBodyAction);
    setRescueStep('activation');
    trackEvent('rescue_body_action_completed', {
      bodyAction: rescueBodyAction,
      triggerType: 'brain_off',
    }, { page: 'today' });
  }, [activeRescueId, completeRescueStep, rescueBodyAction]);

  const finishActivation = useCallback(() => {
    if (!activeRescueId) return;
    const target = getRescueTarget();
    const skill = target.skill;
    completeActivationStep(activeRescueId, rescueActivationAction);
    setRescueStep('done');
    trackEvent('rescue_activation_completed', {
      activationActionType: skill?.taskType ?? 'generic',
      hasLinkedSkill: !!skill,
      hasLinkedScheduleBlock: !!target.block,
      taskType: skill?.taskType,
      metricType: skill ? progressTypeForSkill(skill) : undefined,
    }, { page: 'today' });
    trackEvent('rescue_completed', {
      completed: true,
      triggerType: 'brain_off',
      hadLinkedSkill: !!skill,
      hadLinkedScheduleBlock: !!target.block,
    }, { page: 'today' });
  }, [activeRescueId, completeActivationStep, getRescueTarget, rescueActivationAction]);

  const goToGoals = () => navigation.navigate('Quest');
  const runTodayCommand = useCallback((action: TodayCommandAction = todayCommand.primaryAction) => {
    if (action === 'create_goal') {
      goToGoals();
      return;
    }
    if (action === 'rescue') {
      openRescueFlow(unfinishedRescue?.id);
      return;
    }
    if (action === 'review_feedback') {
      setRecordsExpanded(true);
      return;
    }
    if (action === 'finish_pending_capture') {
      return;
    }
    if (action === 'log') {
      openModal(todayCommand.linkedSkillId, {
        logType: todayCommand.scheduleBlockId ? 'schedule' : todayCommand.linkedSkillId ? 'skill' : 'custom',
        scheduleBlockId: todayCommand.scheduleBlockId ?? null,
        minutes: todayCommand.plannedMinutes,
      });
      return;
    }
    startSession({
      linkedSkillId: todayCommand.linkedSkillId,
      linkedGoalId: todayCommand.linkedGoalId,
      linkedModuleId: todayCommand.linkedModuleId,
      linkedScheduleBlockId: todayCommand.scheduleBlockId,
      title: commandTargetSkill?.name ?? formatCommandCopy(todayCommand.titleKey, todayCommand.titleValues),
      taskType: commandTargetSkill?.taskType,
    });
  }, [commandTargetSkill, formatCommandCopy, openModal, openRescueFlow, startSession, todayCommand, unfinishedRescue?.id]);

  const parseContextInput = useCallback(() => {
    const parsed = parseHealthContextText(contextPasteText);
    setContextPreview(parsed);
    setContextSaveStatus('idle');
  }, [contextPasteText]);

  const saveContextPreview = useCallback(() => {
    if (!contextPreview || contextPreview.contextLogs.length === 0) return;
    const hasSleepContext = contextPreview.contextLogs.some((log) => log.type === 'sleep' && log.label === 'sleep_duration');
    addContextLogs(contextPreview.contextLogs);
    setContextSaveStatus(hasSleepContext ? 'saved_sleep' : 'saved');
    setContextPasteText('');
    setContextPreview(null);
  }, [addContextLogs, contextPreview]);

  const formatContextMetricValue = useCallback((key: string, value?: number | string, unit?: string) => {
    if (value == null) return '';
    if (typeof value === 'number' && ['sleepDuration', 'deepSleep', 'remSleep'].includes(key)) {
      const hours = Math.floor(value / 60);
      const minutes = Math.round(value % 60);
      if (hours > 0 && minutes > 0) return `${hours}${t(lang, 'hoursShort')} ${minutes}${t(lang, 'minutesShort')}`;
      if (hours > 0) return `${hours}${t(lang, 'hoursShort')}`;
      return `${minutes}${t(lang, 'minutesShort')}`;
    }
    return `${value}${unit ? ` ${unit}` : ''}`;
  }, [lang]);

  const contextMetricRows = useMemo(() => {
    const metrics = contextPreview?.summary ?? objectiveContextBrief.metrics;
    return [
      { key: 'sleepDuration', value: metrics.sleepMinutes, unit: t(lang, 'minutes') },
      { key: 'deepSleep', value: metrics.deepSleepMinutes, unit: t(lang, 'minutes') },
      { key: 'remSleep', value: metrics.remMinutes, unit: t(lang, 'minutes') },
      { key: 'restingHeartRate', value: metrics.restingHeartRate, unit: 'bpm' },
      { key: 'hrv', value: metrics.hrv, unit: 'ms' },
      { key: 'steps', value: metrics.steps, unit: t(lang, 'stepsUnit') },
      { key: 'workoutMinutes', value: metrics.workoutMinutes, unit: t(lang, 'minutes') },
      { key: 'caffeine', value: metrics.caffeineCount, unit: t(lang, 'countUnit') },
    ].filter((row) => row.value != null);
  }, [contextPreview, objectiveContextBrief.metrics, lang]);

  const modalSkill = skillId ? data.skills.find((item) => item.id === skillId) : undefined;
  const modalPredictionSchema = getPredictionSchemaForSkill(modalSkill);
  const modalIsStrength = isStrengthPredictionSkill(modalSkill);
  const modalSchemaFields = getRecordingFieldsForSkill(modalSkill);
  const saveDisabled = logType === 'skill' && !skillId;
  const saveDisabledReason = saveDisabled ? t(lang, 'selectSkillFirst') : '';
  const modalInputStyle = {
    backgroundColor: questTheme.colors.surfaceElevated,
    borderColor: questTheme.colors.border,
    color: questTheme.colors.text,
  };
  const dashboardPreferences = useMemo(
    () => normalizeDashboardPreferences(data.settings.dashboardPreferences),
    [data.settings.dashboardPreferences]
  );
  const todayCardPref = useCallback(
    (cardId: string) => getDashboardPreference(dashboardPreferences, 'today', cardId),
    [dashboardPreferences]
  );
  const todayCardVisible = useCallback((cardId: string) => todayCardPref(cardId)?.visible !== false, [todayCardPref]);
  const todayCardWrapperStyle = useCallback((cardId: string) => {
    const pref = todayCardPref(cardId);
    const size = pref?.size ?? 'medium';
    return {
      order: pref?.order ?? 500,
      marginTop: size === 'small' ? questTheme.spacing.sm : size === 'large' ? questTheme.spacing.lg : questTheme.spacing.md,
    } as any;
  }, [questTheme.spacing.lg, questTheme.spacing.md, questTheme.spacing.sm, todayCardPref]);

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: questTheme.colors.background }]}>
      <ScrollView
        style={[styles.container, { backgroundColor: questTheme.colors.background }]}
        contentContainerStyle={{ padding: 16, paddingBottom: 190, maxWidth: 960, width: '100%', alignSelf: 'center' }}
      >
        <DashboardLayoutControls
          surface="today"
          questTheme={questTheme}
          language={lang}
          preferences={dashboardPreferences}
          editing={dashboardEditing}
          onEditingChange={setDashboardEditing}
          onPreset={setDashboardPreset}
          onVisibility={(cardId, visible) => setDashboardCardVisibility('today', cardId, visible)}
          onMove={(cardId, direction) => moveDashboardCard('today', cardId, direction)}
          onSize={(cardId, size) => setDashboardCardSize('today', cardId, size)}
          onReset={() => resetDashboardLayout('today')}
        />

        {/* ═══ ZONE 1: Smart Capture (input always first by default) ═════════ */}
        {todayCardVisible('smart_capture') ? (
          <View style={todayCardWrapperStyle('smart_capture')}>
            <HomeSmartCapture />
          </View>
        ) : null}

        {todayCardVisible('daily_operating_brief') ? (
        <View style={todayCardWrapperStyle('daily_operating_brief')}>
        <QuestCard questTheme={questTheme} variant="hero" style={styles.dailyBriefCard}>
          <View style={styles.dailyBriefHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.strategyKicker, { color: questTheme.colors.textMuted }]}>{t(lang, 'dailyOperatingBrief')}</Text>
              <Text style={[styles.dailyBriefTitle, { color: questTheme.colors.text }]}>
                {formatCommandCopy(dailyOperatingBrief.mainJudgementKey, dailyOperatingBrief.mainJudgementValues)}
              </Text>
            </View>
            <QuestPill
              questTheme={questTheme}
              active
              variant={dailyOperatingBrief.recommendedIntensity === 'high' ? 'success' : dailyOperatingBrief.recommendedIntensity === 'normal' ? 'default' : dailyOperatingBrief.recommendedIntensity === 'low' ? 'warning' : 'danger'}
              label={t(lang, dailyOperatingBrief.modeLabelKey)}
            />
          </View>
          <View style={[styles.dailyBriefAction, { backgroundColor: questTheme.colors.surfaceSoft, borderColor: questTheme.colors.border }]}>
            <QuestIcon name="zap" size={16} color={questTheme.colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.dailyBriefMeta, { color: questTheme.colors.textMuted }]}>{t(lang, 'firstAction')}</Text>
              <Text style={[styles.dailyBriefActionText, { color: questTheme.colors.text }]}>
                {formatCommandCopy(dailyOperatingBrief.firstActionKey, dailyOperatingBrief.firstActionValues)}
              </Text>
            </View>
          </View>
          <View style={styles.dailyBriefSection}>
            <Text style={[styles.dailyBriefMeta, { color: questTheme.colors.textMuted }]}>{t(lang, 'whyThis')}</Text>
            <View style={styles.dailyBriefChipRow}>
              {dailyOperatingBrief.whyKeys.slice(0, 3).map((key) => (
                <View key={key} style={[styles.dailyBriefChip, { backgroundColor: questTheme.colors.surfaceSoft, borderColor: questTheme.colors.border }]}>
                  <Text style={[styles.dailyBriefChipText, { color: questTheme.colors.textMuted }]}>
                    {formatCommandCopy(key, dailyOperatingBrief.whyValues)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
          {dailyOperatingBrief.avoidKeys.length > 0 ? (
            <View style={styles.dailyBriefSection}>
              <Text style={[styles.dailyBriefMeta, { color: questTheme.colors.textMuted }]}>{t(lang, 'avoidToday')}</Text>
              <View style={styles.dailyBriefChipRow}>
                {dailyOperatingBrief.avoidKeys.slice(0, 2).map((key) => (
                  <View key={key} style={[styles.dailyBriefChip, { backgroundColor: questTheme.colors.warningSoft, borderColor: questTheme.colors.border }]}>
                    <Text style={[styles.dailyBriefChipText, { color: questTheme.colors.text }]}>
                      {formatCommandCopy(key)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
          <View style={styles.dailyBriefFooter}>
            <Text style={[styles.dailyBriefMeta, { color: questTheme.colors.textSubtle }]}>
              {t(lang, 'confidence')}: {t(lang, dailyOperatingBrief.confidence === 'high' ? 'confidenceHigh' : dailyOperatingBrief.confidence === 'medium' ? 'confidenceMedium' : 'confidenceLow')}
            </Text>
            <Text style={[styles.dailyBriefMeta, { color: questTheme.colors.textSubtle }]}>{t(lang, 'briefNotMedical')}</Text>
          </View>
        </QuestCard>
        </View>
        ) : null}

        {todayCardVisible('body_context') ? (
        <View style={todayCardWrapperStyle('body_context')}>
        <QuestCard questTheme={questTheme} variant="flat" style={styles.contextBridgeCard}>
          <View style={styles.contextBridgeHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.strategyKicker, { color: questTheme.colors.textMuted }]}>{t(lang, 'bodySleepContext')}</Text>
              <Text style={[styles.contextBriefTitle, { color: questTheme.colors.text }]}>
                {t(lang, 'recoveryStatus')}: {t(lang, `recoveryStatus_${objectiveContextBrief.recoveryStatus}`)}
              </Text>
              <Text style={[styles.contextBriefBody, { color: questTheme.colors.textMuted }]}>
                {t(lang, objectiveContextBrief.cognitiveLoadSuggestionKey)}
              </Text>
            </View>
            <View style={[styles.contextCountPill, { backgroundColor: questTheme.colors.surfaceSoft, borderColor: questTheme.colors.border }]}>
              <Text style={[styles.contextCountText, { color: questTheme.colors.textMuted }]}>
                {savedContextCountToday} {t(lang, 'contextLogs')}
              </Text>
            </View>
          </View>
          <Text style={[styles.contextBriefBody, { color: questTheme.colors.primary }]}>
            {t(lang, 'recommendedAction')}: {t(lang, objectiveContextBrief.recommendedActionKey)}
          </Text>
          {objectiveContextBrief.avoidKeys.length > 0 ? (
            <Text style={[styles.contextBriefBody, { color: questTheme.colors.textSubtle }]}>
              {t(lang, 'avoidToday')}: {objectiveContextBrief.avoidKeys.map((key) => t(lang, key)).join(' · ')}
            </Text>
          ) : null}
          {objectiveContextBrief.status !== 'empty' ? (
            <Text style={[styles.contextBriefBody, { color: questTheme.colors.textSubtle }]}>{t(lang, 'contextNotMedical')}</Text>
          ) : null}
          <View style={styles.contextInputRow}>
            <QuestInput
              questTheme={questTheme}
              value={contextPasteText}
              onChangeText={(text) => {
                setContextPasteText(text);
                setContextSaveStatus('idle');
              }}
              placeholder={t(lang, 'pasteHealthContext')}
              multiline
              style={styles.contextInput}
            />
            <QuestButton
              questTheme={questTheme}
              variant="secondary"
              icon="activity"
              label={t(lang, 'parseContext')}
              disabled={contextPasteText.trim().length === 0}
              onPress={parseContextInput}
            />
          </View>
          {contextPreview ? (
            <View style={[styles.contextPreviewBox, { backgroundColor: questTheme.colors.surfaceSoft, borderColor: questTheme.colors.border }]}>
              <Text style={[styles.contextPreviewTitle, { color: questTheme.colors.text }]}>
                {contextPreview.contextLogs.length > 0
                  ? t(lang, 'contextPreviewFound').replace('{count}', String(contextPreview.contextLogs.length))
                  : t(lang, 'contextPreviewEmpty')}
              </Text>
              {contextMetricRows.length > 0 ? (
                <View style={styles.contextMetricWrap}>
                  {contextMetricRows.map((row) => (
                    <View key={row.key} style={[styles.contextMetricPill, { borderColor: questTheme.colors.border, backgroundColor: questTheme.colors.surface }]}>
                      <Text style={[styles.contextMetricText, { color: questTheme.colors.textMuted }]}>
                        {t(lang, row.key)} · {formatContextMetricValue(row.key, row.value, row.unit)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {contextPreview.contextLogs.length === 0 ? (
                <Text style={[styles.contextBriefBody, { color: questTheme.colors.textMuted }]}>
                  {t(lang, 'tryInputExamples')}
                </Text>
              ) : null}
              <QuestButton
                questTheme={questTheme}
                variant="primary"
                icon="check"
                label={t(lang, 'saveContext')}
                disabled={contextPreview.contextLogs.length === 0}
                onPress={saveContextPreview}
              />
            </View>
          ) : null}
          {contextSaveStatus === 'saved' || contextSaveStatus === 'saved_sleep' ? (
            <Text style={[styles.contextBriefBody, { color: questTheme.colors.success }]}>
              {t(lang, contextSaveStatus === 'saved_sleep' ? 'sleepContextSaved' : 'contextSaved')}
            </Text>
          ) : null}
        </QuestCard>
        </View>
        ) : null}

        {/* ═══ ZONE 2: Now Focus — timer if active, else top-priority action ═ */}
        {todayCardVisible('recent_feedback') ? (
        <View style={todayCardWrapperStyle('recent_feedback')}>
        {data.settings.firstQuestCreated && !data.settings.firstSystemWelcomeDismissed ? (
          <View style={[styles.welcomeCard, themedCard]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionTitle, { color: questTheme.colors.text }]}>{t(lang, 'firstSystemReady')}</Text>
              <Text style={[styles.actionNote, { color: questTheme.colors.textMuted }]}>{t(lang, 'firstSystemReadyBody')}</Text>
            </View>
            <View style={styles.welcomeActions}>
              <TouchableOpacity
                style={[styles.compactBtn, { backgroundColor: accent }]}
                onPress={() => {
                  setSettings({ firstSystemWelcomeDismissed: true });
                  openModal(data.skills[0]?.id);
                }}
              >
                <Text style={[styles.compactBtnText, { color: questTheme.colors.primaryText }]}>{t(lang, 'startFirstAction')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setSettings({ firstSystemWelcomeDismissed: true })}>
                <Text style={[styles.timerFinishText, { color: questTheme.colors.textMuted }]}>{t(lang, 'later')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {activeSession ? (
          <View style={[styles.timerBar, themedCard]}>
            <QuestIcon name="activity" size={18} color={questTheme.colors.success} />
            <Text style={[styles.timerText, { color: questTheme.colors.text }]}>
              {activeSession.title} · {t(lang, 'running')} {formatTimer(timerNow - new Date(activeSession.startedAt).getTime())}
            </Text>
            <TouchableOpacity style={[styles.timerFinishBtn, { borderColor: accent }]} onPress={finishSession}>
              <Text style={[styles.timerFinishText, { color: accent }]}>{t(lang, 'finish')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={[styles.nowFocusCard, themedCard, {
          borderColor: todayCommand.type === 'rescue' ? questTheme.colors.warning : questTheme.colors.borderStrong,
          borderLeftWidth: 4,
          borderLeftColor: todayCommand.type === 'rescue' ? questTheme.colors.warning : questTheme.colors.primary,
        }]}>
          <View style={styles.nowFocusHeading}>
            <View style={[styles.nowFocusIconShell, { backgroundColor: todayCommand.type === 'rescue' ? questTheme.colors.warningSoft : questTheme.colors.primarySoft }]}>
              <QuestIcon
                name={todayCommand.type === 'rescue' ? 'lifeBuoy' : todayCommand.type === 'continue_plan' ? 'calendar' : todayCommand.type === 'review_feedback' ? 'barChart' : 'target'}
                size={22}
                color={todayCommand.type === 'rescue' ? questTheme.colors.warning : accent}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.strategyKicker, { color: questTheme.colors.textMuted }]}>{t(lang, 'commandCenter')}</Text>
              <Text style={[styles.nowFocusTitle, { color: questTheme.colors.text }]}>{formatCommandCopy(todayCommand.titleKey, todayCommand.titleValues)}</Text>
            </View>
          </View>
          <Text style={[styles.nextActionText, { color: questTheme.colors.textMuted }]}>
            {t(lang, 'because')} {formatCommandCopy(todayCommand.reasonKey, todayCommand.reasonValues)}
          </Text>
          <Text style={[styles.commandStateLine, { color: questTheme.colors.textMuted }]}>
            {t(lang, 'currentState')}: {stateSummaryLabel}{stateSummaryTime ? ` · ${stateSummaryTime}` : ''}
          </Text>
          <View style={styles.nowFocusActions}>
            <QuestButton
              questTheme={questTheme}
              variant={todayCommand.primaryAction === 'rescue' ? 'emergency' : 'primary'}
              icon={todayCommand.primaryAction === 'rescue' ? 'lifeBuoy' : todayCommand.primaryAction === 'create_goal' ? 'plus' : todayCommand.primaryAction === 'review_feedback' ? 'barChart' : 'play'}
              label={t(lang, todayCommand.primaryAction === 'rescue'
                ? 'rescueTwoMinutes'
                : todayCommand.primaryAction === 'create_goal'
                  ? 'createFirstGoal'
                  : todayCommand.primaryAction === 'review_feedback'
                    ? 'reviewLatestFeedback'
                    : todayCommand.primaryAction === 'finish_pending_capture'
                      ? 'finishCurrentCapture'
                      : 'startNow')}
              onPress={() => runTodayCommand()}
            />
            <QuestButton
              questTheme={questTheme}
              variant="secondary"
              icon="plus"
              label={t(lang, 'logSomething')}
              onPress={() => runTodayCommand('log')}
            />
            {todayCommand.linkedSkillId ? (
              <QuestButton
                questTheme={questTheme}
                variant="ghost"
                icon="activity"
                label={t(lang, 'reduceToFiveMinutes')}
                onPress={() => {
                  openModal(todayCommand.linkedSkillId, {
                    logType: todayCommand.scheduleBlockId ? 'schedule' : 'skill',
                    scheduleBlockId: todayCommand.scheduleBlockId ?? null,
                    minutes: 5,
                  });
                }}
              />
            ) : null}
          </View>
        </View>
        </View>
        ) : null}

        {todayCardVisible('rescue_strip') ? (
        <View style={todayCardWrapperStyle('rescue_strip')}>
        <TouchableOpacity
          style={[styles.rescueStrip, {
            backgroundColor: questTheme.colors.surfaceSubtle,
            borderColor: questTheme.colors.warningSoft,
            borderLeftWidth: 2,
            borderLeftColor: questTheme.colors.warning,
          }]}
          onPress={() => openRescueFlow(unfinishedRescue?.id)}
          activeOpacity={0.82}
        >
          <View style={[styles.rescueIconShell, { backgroundColor: questTheme.colors.warningSoft }]}>
            <QuestIcon name="lifeBuoy" size={16} color={questTheme.colors.warning} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rescueStripTitle, { color: questTheme.colors.text }]}>{t(lang, 'cantStartCompactTitle')}</Text>
            <Text style={[styles.rescueStripText, { color: questTheme.colors.textMuted }]}>
              {t(lang, 'cantStartCompactSubtitle')} · {t(lang, 'rescueTodayCount').replace('{count}', String(completedRescuesToday))}
            </Text>
          </View>
          <View style={[styles.rescueMiniButton, { borderColor: questTheme.colors.warningSoft }]}>
            <Text style={[styles.rescueMiniButtonText, { color: questTheme.colors.warning }]}>{t(lang, 'rescueStartAction')}</Text>
          </View>
        </TouchableOpacity>
        </View>
        ) : null}

        {/* ═══ ZONE 3: Today data — header always visible, cards collapsible ═ */}
        <Text style={[styles.h1, { color: questTheme.colors.text, marginTop: questTheme.spacing.xl }]}>{t(lang, 'today')}</Text>
        <Text style={[styles.sub, { color: questTheme.colors.textMuted }]}>
          {todayStr} · {t(lang, 'todayInvested')} {todayMinutes} {t(lang, 'minutes')} · {todayLogs.length} {t(lang, 'logsToday')}
        </Text>
        <Text style={[styles.sub, { color: questTheme.colors.textMuted }]}>
          {t(lang, 'currentState')}: {stateSummaryLabel}{stateSummaryTime ? ` · ${stateSummaryTime}` : ''} · {t(lang, currentTimeBlock)}
        </Text>

        {/* ── Plan card (collapsible) ─────────────────────────────────────── */}
        {todayCardVisible('today_plan') ? (
        <View style={todayCardWrapperStyle('today_plan')}>
        <TouchableOpacity
          onPress={() => setPlanCardOpen((v) => !v)}
          style={[styles.sectionToggleRow, { borderColor: questTheme.colors.divider, backgroundColor: questTheme.colors.surfaceSubtle }]}
          activeOpacity={0.75}
        >
          <Text style={[styles.sectionToggleLabel, { color: questTheme.colors.text }]}>{t(lang, 'sectionPlanCard')}</Text>
          <Text style={[styles.sectionToggleChev, { color: questTheme.colors.textMuted }]}>{planCardOpen ? t(lang, 'expandTap') : t(lang, 'collapseTap')}</Text>
        </TouchableOpacity>
        {planCardOpen && (
        <View style={[styles.compactPlanCard, themedCard]}>
          <Text style={[styles.planTitle, { color: questTheme.colors.text }]}>{t(lang, 'todayPlan')}</Text>
          {(todayScheduleBlocks.length > 0 ? todayScheduleBlocks : data.skills).slice(0, planExpanded ? undefined : 3).map((item: any) => {
            const isBlock = !!item.startTime;
            const skill = isBlock
              ? (item.linkedSkillId ? data.skills.find((s) => s.id === item.linkedSkillId) : undefined)
              : item as Skill;
            const title = isBlock ? item.title : (skill?.name ?? '');
            const planned = isBlock ? item.plannedMinutes : (skill?.defaultDurationMinutes ?? skill?.dailyTargetMinutes ?? 30);
            return (
              <View key={item.id} style={[styles.compactPlanRow, { borderTopColor: questTheme.colors.border }]}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {skill ? <QuestEntityIcon icon={skill.icon} systemIcon={getSkillSemanticIcon(skill)} color={skill.color} questTheme={questTheme} size="sm" /> : null}
                    <Text style={[styles.compactPlanTitle, { color: questTheme.colors.text, flex: 1 }]} numberOfLines={1}>{title}</Text>
                  </View>
                  <Text style={[styles.compactPlanMeta, { color: questTheme.colors.textMuted }]}>
                    {skill ? metricPlanCopy(skill, planned, lang) : `${t(lang, 'planned')} ${planned} ${t(lang, 'minutes')}`}
                    {isBlock ? ` · ${statusLabel(lang, item.status)}` : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.iconActionBtn, { backgroundColor: questTheme.colors.surfaceSoft, borderColor: questTheme.colors.border }]}
                  onPress={() => startSession({
                    linkedSkillId: skill?.id ?? item.linkedSkillId,
                    linkedGoalId: item.linkedGoalId ?? findPrimaryLink(skill?.id)?.goalId,
                    linkedModuleId: findPrimaryLink(skill?.id)?.moduleId,
                    linkedScheduleBlockId: isBlock ? item.id : undefined,
                    title: isBlock ? item.title : skill?.name ?? t(lang, 'logProgress'),
                    taskType: item.taskType ?? skill?.taskType,
                  })}
                >
                  <QuestIcon name="play" size={14} color={questTheme.colors.text} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.iconActionBtn, { backgroundColor: questTheme.colors.surfaceSoft, borderColor: questTheme.colors.border }]} onPress={() => oneTapComplete({ block: isBlock ? item : undefined, skill, defaultMinutes: planned })}>
                  <QuestIcon name="check" size={15} color={questTheme.colors.text} />
                </TouchableOpacity>
              </View>
            );
          })}
          {(todayScheduleBlocks.length > 0 ? todayScheduleBlocks.length : data.skills.length) > 3 ? (
            <TouchableOpacity
              style={styles.expandPlanBtn}
              onPress={() => {
                const count = todayScheduleBlocks.length > 0 ? todayScheduleBlocks.length : data.skills.length;
                if (!planExpanded) trackEvent('today_plan_expanded', { tasksCount: count }, { page: 'today' });
                setPlanExpanded((value) => !value);
              }}
            >
              <Text style={[styles.expandPlanText, { color: accent }]}>
                {planExpanded ? t(lang, 'collapseTasks') : t(lang, 'expandAllTasks').replace('{count}', String(todayScheduleBlocks.length > 0 ? todayScheduleBlocks.length : data.skills.length))}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
        )}
        </View>
        ) : null}

        {/* ── State card (collapsible) ────────────────────────────────────── */}
        {todayCardVisible('state_checkin') ? (
        <View style={todayCardWrapperStyle('state_checkin')}>
        <TouchableOpacity
          onPress={() => setStateCardOpen((v) => !v)}
          style={[styles.sectionToggleRow, { borderColor: questTheme.colors.divider, backgroundColor: questTheme.colors.surfaceSubtle }]}
          activeOpacity={0.75}
        >
          <Text style={[styles.sectionToggleLabel, { color: questTheme.colors.text }]}>{t(lang, 'sectionStateCard')}</Text>
          <Text style={[styles.sectionToggleChev, { color: questTheme.colors.textMuted }]}>{stateSummaryLabel} {stateCardOpen ? t(lang, 'expandTap') : t(lang, 'collapseTap')}</Text>
        </TouchableOpacity>
        {stateCardOpen && (
        <View style={[styles.stateCheckInCard, themedCard]}>
          <View style={styles.currentStateTop}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.strategyKicker, { color: questTheme.colors.textMuted }]}>{t(lang, 'currentState')}</Text>
              <Text style={[styles.currentStateTitle, { color: questTheme.colors.text }]}>{t(lang, 'logStateNow')}</Text>
            </View>
            <TouchableOpacity style={[styles.stateUpdateBtn, { borderColor: accent }]} onPress={openStateModal}>
              <Text style={[styles.stateUpdateText, { color: accent }]}>＋ {t(lang, 'detailedCheckIn')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.quickStateGrid}>
            {dailyStateOptions.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.quickStateBtn, { backgroundColor: questTheme.colors.surfaceSoft }]}
                onPress={() => saveStateCheckIn(opt.value)}
              >
                <View style={[styles.stateToneDot, { backgroundColor: getStateToneColor(opt.value, questTheme) }]} />
                <Text style={[styles.stateLabel, { color: questTheme.colors.textMuted }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        )}
        </View>
        ) : null}



        {/* 今日记录 */}
        {todayCardVisible('today_records') ? (
        <View style={todayCardWrapperStyle('today_records')}>
        <Text style={[styles.h2, { color: questTheme.colors.text }]}>{t(lang, 'todayLogs')}</Text>
        {data.categories.length === 0 ? (
          <TouchableOpacity style={[styles.emptyCta, { borderColor: accent, backgroundColor: questTheme.colors.surface }]} onPress={goToGoals}>
            <Text style={[styles.emptyCtaText, { color: accent }]}>{t(lang, 'noSkillsMsg')}</Text>
          </TouchableOpacity>
        ) : todayLogs.length === 0 ? (
          <Text style={[styles.empty, { color: questTheme.colors.textMuted, backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border }]}>{t(lang, 'noLogsToday')}</Text>
        ) : (
          groupedToday.map(({ cat, logs }) => (
            <View key={cat?.id ?? 'unknown'} style={styles.groupBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <QuestEntityIcon icon={cat?.emoji} systemIcon="target" color={cat?.color} questTheme={questTheme} size="sm" />
                <Text style={[styles.groupHeader, { color: questTheme.colors.text }]}>{cat?.name ?? t(lang, 'uncategorized')}</Text>
              </View>
              {logs.map((a) => {
                const skill = data.skills.find((s) => s.id === a.linkedSkillId);
                const contributionLabels = contributionLabelsForLog(a.id);
                return (
                  <TouchableOpacity
                    key={a.id}
                    style={[styles.actionCard, { backgroundColor: questTheme.colors.surfaceElevated, borderColor: questTheme.colors.border }]}
                    onLongPress={() => {
                      confirmAction({
                        title: t(lang, 'deleteRecord'),
                        cancelText: t(lang, 'cancel'),
                        confirmText: t(lang, 'delete'),
                        destructive: true,
                        onConfirm: () => deleteExecutionLog(a.id),
                      });
                    }}
                  >
                    <View style={[styles.dot, { backgroundColor: skill?.color ?? accent }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.actionTitle, { color: questTheme.colors.text }]}>
                        {displayEntityName(skill?.name ?? a.orphanedSkillName ?? a.title ?? `(${t(lang, 'deleted')})`, lang)} · {formatMetricUpdateSummary(a, skill, lang)}
                        {a.qualityRating ? ` · ${t(lang, 'quality')} ${a.qualityRating}/5` : ''}
                      </Text>
                      <Text style={[styles.actionNote, { color: questTheme.colors.textMuted }]}>
                        {(a.durationMinutes ?? 0) > 0 ? `${a.durationMinutes} ${t(lang, 'minutes')}` : t(lang, 'scDurationNotRecorded')}
                      </Text>
                      {contributionLabels.length > 0 ? (
                        <Text style={[styles.actionNote, { color: questTheme.colors.textMuted }]}>
                          {t(lang, 'contributesTo')}: {contributionLabels.join(' · ')}
                        </Text>
                      ) : null}
                      {a.note ? <Text style={[styles.actionNote, { color: questTheme.colors.textMuted }]}>{a.note}</Text> : null}
                    </View>
                    <TouchableOpacity
                      onPress={() => confirmAction({
                        title: t(lang, 'deleteRecord'),
                        cancelText: t(lang, 'cancel'),
                        confirmText: t(lang, 'delete'),
                        destructive: true,
                        onConfirm: () => deleteExecutionLog(a.id),
                      })}
                      style={[styles.logDeleteBtn, { borderColor: questTheme.colors.border, backgroundColor: questTheme.colors.surfaceSoft }]}
                    >
                      <Text style={[styles.logDeleteText, { color: questTheme.colors.textMuted }]}>×</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))
        )}
        {todayLogs.length > 3 ? (
          <TouchableOpacity
            style={[styles.expandPlanBtn, { alignSelf: 'flex-start' }]}
            onPress={() => setRecordsExpanded((value) => !value)}
          >
            <Text style={[styles.expandPlanText, { color: accent }]}> 
              {recordsExpanded ? t(lang, 'hideDetails') : t(lang, 'showMoreRecords').replace('{count}', String(todayLogs.length - 3))}
            </Text>
          </TouchableOpacity>
        ) : null}
        {todayLogs.length > 0 && <Text style={[styles.tip, { color: questTheme.colors.textMuted }]}>{t(lang, 'longPressDelete')}</Text>}
        </View>
        ) : null}

        {todayCardVisible('detailed_data') ? (
        <View style={todayCardWrapperStyle('detailed_data')}>
        <TouchableOpacity
          onPress={() => setDetailsOpen((v) => !v)}
          style={[styles.sectionToggleRow, { borderColor: questTheme.colors.divider, backgroundColor: questTheme.colors.surfaceSubtle }]}
          activeOpacity={0.75}
        >
          <Text style={[styles.sectionToggleLabel, { color: questTheme.colors.text }]}>{t(lang, 'detailedData')}</Text>
          <Text style={[styles.sectionToggleChev, { color: questTheme.colors.textMuted }]}>{detailsOpen ? t(lang, 'hideDetails') : t(lang, 'showAdvancedFields')}</Text>
        </TouchableOpacity>
        {detailsOpen ? (
          <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.modeRow}
        >
          {todayModeOptions.map((mode) => {
            const selected = todayMode === mode.value;
            return (
              <TouchableOpacity
                key={mode.value}
                style={[
                  styles.modeChip,
                  selected && { backgroundColor: accent, borderColor: accent },
                ]}
                onPress={() => selectTodayMode(mode.value)}
                activeOpacity={0.75}
              >
                <Text style={[styles.modeChipText, selected && styles.modeChipTextOn]}>
                  {mode.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={[styles.strategyCard, themedCard]}>
          <Text style={[styles.strategyKicker, { color: questTheme.colors.textMuted }]}>{t(lang, 'executionStrategy')}</Text>
          <Text style={[styles.strategyTitle, { color: questTheme.colors.text }]}>{todayStrategy.title}</Text>
          <Text style={[styles.strategyDesc, { color: questTheme.colors.textMuted }]}>{todayStrategy.description}</Text>
          <View style={[styles.minimumBox, { backgroundColor: questTheme.colors.surfaceSoft }]}>
            <Text style={[styles.minimumLabel, { color: questTheme.colors.text }]}>{t(lang, 'minimumDay')}</Text>
            <Text style={[styles.minimumText, { color: questTheme.colors.textMuted }]}>{todayStrategy.minimum}</Text>
          </View>
        </View>

        {/* ── Budget card (collapsible) ────────────────────────────────────── */}
        <TouchableOpacity
          onPress={() => setBudgetCardOpen((v) => !v)}
          style={[styles.sectionToggleRow, { borderColor: questTheme.colors.divider, backgroundColor: questTheme.colors.surfaceSubtle }]}
          activeOpacity={0.75}
        >
          <Text style={[styles.sectionToggleLabel, { color: questTheme.colors.text }]}>{t(lang, 'sectionBudgetCard')}</Text>
          <Text style={[styles.sectionToggleChev, { color: questTheme.colors.textMuted }]}>{energyBudgetRows.allocated}% {budgetCardOpen ? t(lang, 'expandTap') : t(lang, 'collapseTap')}</Text>
        </TouchableOpacity>
        {budgetCardOpen && (
        <View style={[styles.energyCard, themedCard]}>
          <View style={styles.sectionTitleRow}>
            <QuestIcon name="activity" size={18} color={accent} />
            <Text style={[styles.planTitle, { color: questTheme.colors.text, marginBottom: 0 }]}>{t(lang, 'todayEnergyBudget')}</Text>
          </View>
          <Text style={[styles.planMessage, { color: accent }]}>
            {t(lang, 'allocated')} {energyBudgetRows.allocated}% · {t(lang, 'remaining')} {energyBudgetRows.remaining}%
          </Text>
          <QuestProgressBar value={energyBudgetRows.allocated} questTheme={questTheme} color={accent} style={{ marginTop: 8, marginBottom: 12 }} />
          {energyBudgetRows.rows.map((row) => {
            const pct = Math.min(100, Math.round(row.planned / energyBudgetRows.budgetMinutes * 100));
            return (
              <View key={row.id} style={styles.energyRow}>
                <Text style={[styles.energyName, { color: questTheme.colors.text }]} numberOfLines={1}>{row.completed ? '✓ ' : ''}{row.label}</Text>
                <View style={[styles.energyMiniBar, { backgroundColor: questTheme.colors.surfaceSoft }]}>
                  <View style={[styles.energyMiniFill, { width: `${pct}%`, backgroundColor: row.completed ? questTheme.colors.success : accent }]} />
                </View>
                <Text style={[styles.energyPct, { color: questTheme.colors.textMuted }]}>{pct}%</Text>
                {row.over > 0 ? <Text style={[styles.energyOver, { color: questTheme.colors.success }]}>{t(lang, 'overByMinutes').replace('{minutes}', String(row.over))}</Text> : null}
              </View>
            );
          })}
          <Text style={[styles.planNote, { color: questTheme.colors.textMuted }]}>{t(lang, 'energyBudgetHint')}</Text>
        </View>
        )}

        <View style={styles.statRow}>
          <Stat questTheme={questTheme} accent={accent} label={t(lang, 'logsToday')} value={String(todayLogs.length)} />
          <Stat questTheme={questTheme} accent={accent} label={t(lang, 'todayInvested')} value={`${todayMinutes}m`} />
          {/* 最近成就卡片替代原"累计 XP" */}
          <View style={[styles.stat, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border }]}>
            {latestAchievement ? (
              <>
                <Text style={[styles.statValue, { color: accent }]}>
                  {latestAchievement.hours}h
                </Text>
                <Text style={[styles.achieveName, { color: questTheme.colors.textMuted }]} numberOfLines={1}>
                  {latestAchievement.skillName}
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.statValue, { color: questTheme.colors.textMuted, fontSize: 13 }]}>{t(lang, 'keepGoing')}</Text>
                <Text style={[styles.achieveName, { color: questTheme.colors.textMuted }]}>{t(lang, 'firstAchievement')}</Text>
              </>
            )}
            <Text style={[styles.statLabel, { color: questTheme.colors.textMuted }]}>{t(lang, 'latestAchievement')}</Text>
          </View>
        </View>

        {/* ★ 今日技能进度 */}
        {skillProgressByCategory.length > 0 && (
          <>
        <Text style={[styles.h2, { color: questTheme.colors.text }]}>{t(lang, 'skillProgressToday')}</Text>
            {skillProgressByCategory.map(({ cat, skills }) => (
              <View key={cat.id} style={styles.groupBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <QuestEntityIcon icon={cat.emoji} systemIcon="target" color={cat.color} questTheme={questTheme} size="sm" />
                  <Text style={[styles.groupHeader, { color: questTheme.colors.text }]}>{cat.name}</Text>
                </View>
                {skills.map((s) => (
                  <SkillProgressRow
                    key={s.id}
                    skill={s}
                    logs={data.executionLogs || []}
                    todayStr={todayStr}
                    targetMinutes={adjustTaskRecommendation(s, effectiveCurrentState).adjustedMinutes}
                    lang={lang}
                    questTheme={questTheme}
                    onPress={() => openModal(s.id)}
                  />
                ))}
              </View>
            ))}
          </>
        )}

          </View>
        ) : null}
        </View>
        ) : null}
      </ScrollView>

      {/* 顶部横幅: 成就 / Streak — pointerEvents none 不挡交互 */}
      {topBanner && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.topBanner,
            topBanner.type === 'achievement' ? styles.topBannerAchievement : styles.topBannerStreak,
            { opacity: bannerOpacity, transform: [{ translateY: bannerTranslateY }] },
          ]}
        >
          <Text style={[
            styles.topBannerText,
            { color: topBanner.type === 'achievement' ? theme.accent : theme.accent },
          ]}>
            {topBanner.type === 'achievement'
              ? t(lang, 'achievementReached').replace('{name}', topBanner.skillName).replace('{hours}', String(topBanner.hours))
              : t(lang, 'streakReached').replace('{name}', topBanner.skillName).replace('{days}', String(topBanner.streak))}
          </Text>
        </Animated.View>
      )}

      {/* 庆祝浮层 — 全屏居中, pointerEvents none, 不挡其他交互 */}
      {celebrate && (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            styles.celebrateBg,
            { opacity: celebrateOpacity },
          ]}
        >
          <Animated.View style={[styles.celebrateCard, { transform: [{ scale: celebrateScale }] }]}>
            <Text style={styles.celebrateEmoji}>{celebrate.skill.icon ?? '🎉'}</Text>
            <Text style={styles.celebrateTitle}>{celebrate.skill.name}</Text>
            <Text style={styles.celebrateLine}>{t(lang, 'targetReached')}</Text>
          </Animated.View>
        </Animated.View>
      )}

      {/* 执行记录 Modal — 用 BottomSheetForm, 与编辑表单一致 */}
      <BottomSheetForm
        visible={modal}
        onClose={closeModal}
        footer={(
          <View>
            {saveDisabledReason ? <Text style={[styles.modalFooterHint, { color: questTheme.colors.disabledText }]}>{saveDisabledReason}</Text> : null}
            <View style={styles.modalFooterActions}>
              <QuestButton questTheme={questTheme} variant="ghost" label={t(lang, 'cancel')} onPress={closeModal} style={{ flex: 1 }} />
              <QuestButton questTheme={questTheme} variant="primary" label={t(lang, 'logProgress')} onPress={submit} disabled={saveDisabled} style={{ flex: 1 }} />
            </View>
          </View>
        )}
      >
        <Text style={[styles.h2, { color: questTheme.colors.text }]}>{t(lang, 'logProgress')}</Text>

        <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'executionLog')}</Text>
        <View style={styles.chipsRow}>
          {[
            { value: 'skill' as const, label: t(lang, 'logSkill') },
            { value: 'schedule' as const, label: t(lang, 'logSchedule') },
            { value: 'custom' as const, label: t(lang, 'customLog') },
          ].map((opt) => {
            const on = logType === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => {
                  setLogType(opt.value);
                  if (opt.value === 'schedule') {
                    const first = todayScheduleBlocks[0];
                    setScheduleBlockId(first?.id ?? null);
                    setSkillId(first?.linkedSkillId ?? data.skills[0]?.id ?? null);
                    if (first) setMinutes(String(first.plannedMinutes));
                  }
                }}
                style={[styles.chip, on && { backgroundColor: accent, borderColor: accent }]}
              >
                <Text style={[styles.chipText, { color: questTheme.colors.text }, on && { color: questTheme.colors.primaryText, fontWeight: '700' }]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {logType === 'schedule' ? (
          <>
            <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'todaysSchedule')}</Text>
            <View style={styles.chipsRow}>
              {todayScheduleBlocks.length === 0 ? (
                <Text style={[styles.empty, { color: questTheme.colors.textMuted, backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border }]}>
                  {t(lang, 'noScheduleToday')}
                </Text>
              ) : todayScheduleBlocks.map((block) => {
                const on = scheduleBlockId === block.id;
                return (
                  <TouchableOpacity
                    key={block.id}
                    onPress={() => {
                      setScheduleBlockId(block.id);
                      setSkillId(block.linkedSkillId ?? null);
                      setMinutes(String(block.plannedMinutes));
                    }}
                    style={[styles.chip, on && { backgroundColor: accent, borderColor: accent }]}
                  >
                    <Text style={[styles.chipText, { color: questTheme.colors.text }, on && { color: questTheme.colors.primaryText, fontWeight: '700' }]}>
                      {block.startTime} {block.title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : null}

        {logType !== 'custom' ? <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'selectSkill')}</Text> : null}
        <View style={styles.chipsRow}>
          {logType !== 'custom' && data.skills.map((s) => {
            const on = s.id === skillId;
            const cat = catOf(s.id);
            return (
              <TouchableOpacity
                key={s.id}
                onPress={() => setSkillId(s.id)}
                style={[styles.chip, { backgroundColor: questTheme.colors.surfaceElevated, borderColor: questTheme.colors.border }, on && { backgroundColor: s.color ?? accent, borderColor: s.color ?? accent }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                  <QuestEntityIcon icon={s.icon} systemIcon={getSkillSemanticIcon(s)} color={s.color} questTheme={questTheme} size="sm" />
                  <Text style={[styles.chipText, { color: questTheme.colors.text }, on && { color: questTheme.colors.primaryText, fontWeight: '700' }]}>
                    {cat ? `${cat.name} → ` : ''}{s.name}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={[styles.predictionBox, { backgroundColor: questTheme.colors.surfaceSoft, borderColor: questTheme.colors.border }]}>
          <TouchableOpacity style={styles.modalSectionHeader} onPress={() => setShowPrediction((value) => !value)} activeOpacity={0.75}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.minimumLabel, { color: questTheme.colors.text }]}>{t(lang, 'sessionPrediction')}</Text>
              <Text style={[styles.planReason, { color: questTheme.colors.textMuted }]}>{t(lang, 'predictionOptional')}</Text>
            </View>
            <Text style={[styles.modalToggleText, { color: accent }]}>{showPrediction ? t(lang, 'skipPrediction') : t(lang, 'predictionOptional')}</Text>
          </TouchableOpacity>

          {showPrediction && modalPredictionSchema.showDuration ? (
            <>
              <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>
                {modalIsStrength ? t(lang, 'sessionDurationOptional') : t(lang, 'predictedMinutes')}
              </Text>
              <QuestInput
                questTheme={questTheme}
                value={predictedMinutes}
                onChangeText={setPredictedMinutes}
                keyboardType="number-pad"
                placeholder="45"
              />
            </>
          ) : null}

          {showPrediction && modalPredictionSchema.showTargetValue && !modalIsStrength ? (
            <>
              <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'targetValueLog')}</Text>
              <QuestInput
                questTheme={questTheme}
                value={predictedValue}
                onChangeText={setPredictedValue}
                keyboardType="decimal-pad"
                placeholder="95"
              />
            </>
          ) : null}

          {showPrediction && modalIsStrength ? (
            <TouchableOpacity style={[styles.modalMiniToggle, { borderColor: questTheme.colors.border }]} onPress={() => setShowDetailedPrediction((value) => !value)}>
              <Text style={[styles.modalMiniToggleText, { color: accent }]}>
                {showDetailedPrediction ? t(lang, 'hideAdvancedFields') : t(lang, 'detailedPrediction')}
              </Text>
            </TouchableOpacity>
          ) : null}

          {showPrediction && modalPredictionSchema.showStrength && showDetailedPrediction ? (
            <>
              <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'expectedWorkingWeight')}</Text>
              <View style={styles.timeRow}>
                <QuestInput questTheme={questTheme} value={predictedStrengthWeight} onChangeText={setPredictedStrengthWeight} keyboardType="decimal-pad" placeholder="75" style={{ flex: 1 }} />
                <QuestInput questTheme={questTheme} value={predictedStrengthReps} onChangeText={setPredictedStrengthReps} keyboardType="number-pad" placeholder={t(lang, 'expectedReps')} style={{ flex: 1 }} />
                <QuestInput questTheme={questTheme} value={predictedStrengthSets} onChangeText={setPredictedStrengthSets} keyboardType="number-pad" placeholder={t(lang, 'expectedSets')} style={{ flex: 1 }} />
              </View>
              <QuestInput questTheme={questTheme} value={predictedStrengthRpe} onChangeText={setPredictedStrengthRpe} keyboardType="decimal-pad" placeholder={t(lang, 'expectedRPE')} />
            </>
          ) : null}

          {showPrediction && modalPredictionSchema.showQuality ? (
            <>
              <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'optionalQuality')}</Text>
              <View style={styles.qRow}>
                {QUALITY_OPTIONS.map((q) => {
                  const on = predictedQuality === q.value;
                  return (
                    <TouchableOpacity
                      key={q.value}
                      onPress={() => setPredictedQuality(on ? null : q.value)}
                      style={[
                        styles.qBox,
                        { backgroundColor: questTheme.colors.surfaceElevated, borderColor: questTheme.colors.border },
                        on && { borderColor: accent, backgroundColor: questTheme.colors.primarySoft },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.qEmoji, { color: questTheme.colors.text }]}>{q.value}</Text>
                      <Text style={[styles.qLabel, { color: questTheme.colors.textMuted }, on && { color: questTheme.colors.text, fontWeight: '800' }]}>{qualityLabel(lang, q.value)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          ) : null}
        </View>

        <View style={styles.modalSectionHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.minimumLabel, { color: questTheme.colors.text }]}>{t(lang, 'actualRecord')}</Text>
            <Text style={[styles.planReason, { color: questTheme.colors.textMuted }]}>{t(lang, 'recordedWithoutPrediction')}</Text>
          </View>
          <TouchableOpacity style={[styles.modalMiniToggle, { borderColor: questTheme.colors.border }]} onPress={() => setShowAdvancedFields((value) => !value)}>
            <Text style={[styles.modalMiniToggleText, { color: accent }]}>
              {showAdvancedFields ? t(lang, 'hideAdvancedFields') : t(lang, 'showAdvancedFields')}
            </Text>
          </TouchableOpacity>
        </View>

        {modalIsStrength ? (
          <View style={[styles.chipsRow, { marginTop: 8 }]}>
            {[
              { value: 'simple' as const, label: t(lang, 'simpleStrengthLog') },
              { value: 'session' as const, label: t(lang, 'trainingSessionLog') },
            ].map((opt) => {
              const on = strengthLogMode === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setStrengthLogMode(opt.value)}
                  style={[styles.chip, { backgroundColor: questTheme.colors.surfaceElevated, borderColor: questTheme.colors.border }, on && { backgroundColor: accent, borderColor: accent }]}
                >
                  <Text style={[styles.chipText, { color: questTheme.colors.text }, on && { color: questTheme.colors.primaryText, fontWeight: '700' }]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}

        <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>
          {modalIsStrength ? t(lang, 'sessionDurationOptional') : t(lang, 'actualMinutes')}
        </Text>
        <QuestInput
          questTheme={questTheme}
          value={minutes}
          onChangeText={setMinutes}
          keyboardType="number-pad"
          placeholder="30"
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
          blurOnSubmit
        />

        <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'optionalQuality')}</Text>
        <View style={styles.qRow}>
          {QUALITY_OPTIONS.map((q) => {
            const on = quality === q.value;
            return (
              <TouchableOpacity
                key={q.value}
                onPress={() => setQuality(on ? null : q.value)} // 再点一次取消
                style={[styles.qBox, { backgroundColor: questTheme.colors.surfaceElevated, borderColor: questTheme.colors.border }, on && { borderColor: accent, backgroundColor: questTheme.colors.primarySoft }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.qEmoji, { color: questTheme.colors.text }]}>{q.value}</Text>
                <Text style={[styles.qLabel, { color: questTheme.colors.textMuted }, on && { color: questTheme.colors.text, fontWeight: '800' }]}>{qualityLabel(lang, q.value)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {showAdvancedFields ? (
          <>
            <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'difficulty')}</Text>
            <View style={styles.qRow}>
              {QUALITY_OPTIONS.map((q) => {
                const on = difficulty === q.value;
                return (
                  <TouchableOpacity
                    key={q.value}
                    onPress={() => setDifficulty(on ? null : q.value)}
                    style={[styles.qBox, { backgroundColor: questTheme.colors.surfaceElevated, borderColor: questTheme.colors.border }, on && { borderColor: accent, backgroundColor: questTheme.colors.primarySoft }]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.qEmoji, { color: questTheme.colors.text }]}>{q.value}</Text>
                    <Text style={[styles.qLabel, { color: questTheme.colors.textMuted }, on && { color: questTheme.colors.text, fontWeight: '800' }]}>{qualityLabel(lang, q.value)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {[['mentalCost', mentalCost, setMentalCost], ['physicalCost', physicalCost, setPhysicalCost], ['emotionalCost', emotionalCost, setEmotionalCost]].map(([key, value, setter]) => (
              <View key={key as string}>
                <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, key as string)}</Text>
                <View style={styles.qRow}>
                  {QUALITY_OPTIONS.map((q) => {
                    const on = value === q.value;
                    return (
                      <TouchableOpacity
                        key={q.value}
                        onPress={() => (setter as React.Dispatch<React.SetStateAction<Quality | null>>)(on ? null : q.value)}
                        style={[styles.qBox, { backgroundColor: questTheme.colors.surfaceElevated, borderColor: questTheme.colors.border }, on && { borderColor: accent, backgroundColor: questTheme.colors.primarySoft }]}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.qEmoji, { color: questTheme.colors.text }]}>{q.value}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </>
        ) : null}

        {(() => {
          const selectedSkill = data.skills.find((s) => s.id === skillId);
          const rawSchemaFields = getRecordingFieldsForSkill(selectedSkill);
          if (!selectedSkill || logType === 'custom' || rawSchemaFields.length === 0) return null;
          const quickKeys = modalIsStrength
            ? new Set(['weight', 'sets', 'reps', 'quality'])
            : new Set(['durationMinutes', 'quality', 'wordCount', 'amount']);
          const schemaFields = showAdvancedFields
            ? rawSchemaFields
            : rawSchemaFields.filter((field) => field.required || quickKeys.has(field.key)).slice(0, 4);
          const setSchemaValue = (key: string, value: string | number | boolean) => {
            setSchemaValues((current) => ({ ...current, [key]: value }));
          };
          const renderField = (field: DomainRecordingField) => {
            const label = lang === 'en' ? field.label : field.labelZh;
            const value = schemaValues[field.key];
            if (field.type === 'select') {
              return (
                <View key={field.key}>
                  <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{label}</Text>
                  <View style={styles.chipsRow}>
                    {(field.options || []).map((option) => {
                      const on = value === option.value;
                      return (
                        <TouchableOpacity
                          key={option.value}
                          onPress={() => setSchemaValue(field.key, option.value)}
                          style={[styles.chip, { backgroundColor: questTheme.colors.surfaceElevated, borderColor: questTheme.colors.border }, on && { backgroundColor: accent, borderColor: accent }]}
                        >
                          <Text style={[styles.chipText, { color: questTheme.colors.text }, on && { color: questTheme.colors.primaryText }]}>{lang === 'en' ? option.label : option.labelZh}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            }
            if (field.type === 'rating') {
              const max = field.key === 'rpe' ? 10 : 5;
              return (
                <View key={field.key}>
                  <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{label}</Text>
                  <View style={styles.qRow}>
                    {Array.from({ length: max }, (_, index) => index + 1).map((rating) => {
                      const on = Number(value) === rating;
                      return (
                        <TouchableOpacity
                          key={rating}
                          onPress={() => setSchemaValue(field.key, rating)}
                          style={[styles.qBox, { backgroundColor: questTheme.colors.surfaceElevated, borderColor: questTheme.colors.border }, on && { borderColor: accent, backgroundColor: questTheme.colors.primarySoft }]}
                        >
                          <Text style={[styles.qEmoji, { color: questTheme.colors.text }]}>{rating}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            }
            if (field.type === 'boolean') {
              const on = Boolean(value);
              return (
                <TouchableOpacity key={field.key} style={styles.curriculumRow} onPress={() => setSchemaValue(field.key, !on)}>
                  <Text style={styles.curriculumCheck}>{on ? '✓' : '○'}</Text>
                  <Text style={[styles.planReason, { color: questTheme.colors.text }]}>{label}</Text>
                </TouchableOpacity>
              );
            }
            return (
              <View key={field.key}>
                <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{label}{field.unit ? ` (${field.unit})` : ''}</Text>
                <QuestInput
                  questTheme={questTheme}
                  value={value == null ? '' : String(value)}
                  onChangeText={(text) => setSchemaValue(field.key, field.type === 'number' || field.type === 'duration' ? text : text)}
                  keyboardType={field.type === 'number' || field.type === 'duration' ? 'decimal-pad' : 'default'}
                  placeholder={field.defaultValue == null ? label : String(field.defaultValue)}
                  style={field.type === 'text' ? { minHeight: 58, textAlignVertical: 'top' } : undefined}
                  multiline={field.type === 'text'}
                />
              </View>
            );
          };
          return (
            <View style={[styles.progressUpdateBox, { backgroundColor: questTheme.colors.surfaceSoft, borderColor: questTheme.colors.border }]}>
              <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'domainTemplate')}</Text>
              <Text style={[styles.planReason, { color: questTheme.colors.textMuted }]}>
                {showAdvancedFields ? t(lang, 'advancedFields') : t(lang, 'quickLog')}
              </Text>
              {schemaFields.map(renderField)}
            </View>
          );
        })()}

        {modalIsStrength && strengthLogMode === 'session' ? (
          <View style={[styles.progressUpdateBox, { backgroundColor: questTheme.colors.surfaceSoft, borderColor: questTheme.colors.border }]}>
            <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'trainingSessionLog')}</Text>
            <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'sessionType')}</Text>
            <View style={styles.chipsRow}>
              {['push', 'pull', 'legs', 'upper', 'lower', 'full_body', 'custom'].map((value) => {
                const on = sessionType === value;
                return (
                  <TouchableOpacity
                    key={value}
                    onPress={() => setSessionType(value)}
                    style={[styles.chip, { backgroundColor: questTheme.colors.surfaceElevated, borderColor: questTheme.colors.border }, on && { backgroundColor: accent, borderColor: accent }]}
                  >
                    <Text style={[styles.chipText, { color: questTheme.colors.text }, on && { color: questTheme.colors.primaryText, fontWeight: '700' }]}>{value.replace('_', ' ')}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {exerciseEntries.slice(0, 5).map((entry, index) => (
              <View key={entry.id} style={[styles.exerciseEntryCard, { backgroundColor: questTheme.colors.surfaceElevated, borderColor: questTheme.colors.border }]}>
                <View style={styles.modalSectionHeader}>
                  <Text style={[styles.minimumLabel, { color: questTheme.colors.text }]}>{t(lang, 'exerciseName')} {index + 1}</Text>
                  {exerciseEntries.length > 1 ? (
                    <TouchableOpacity onPress={() => setExerciseEntries((current) => current.filter((item) => item.id !== entry.id))}>
                      <Text style={[styles.modalMiniToggleText, { color: questTheme.colors.danger }]}>{t(lang, 'delete')}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                <QuestInput
                  questTheme={questTheme}
                  value={entry.exerciseName}
                  onChangeText={(text) => setExerciseEntries((current) => current.map((item) => item.id === entry.id ? { ...item, exerciseName: text } : item))}
                  placeholder={t(lang, 'exerciseName')}
                />
                <View style={styles.timeRow}>
                  <QuestInput questTheme={questTheme} value={entry.weight} onChangeText={(text) => setExerciseEntries((current) => current.map((item) => item.id === entry.id ? { ...item, weight: text } : item))} keyboardType="decimal-pad" placeholder={t(lang, 'actualWorkingWeight')} style={{ flex: 1 }} />
                  <QuestInput questTheme={questTheme} value={entry.sets} onChangeText={(text) => setExerciseEntries((current) => current.map((item) => item.id === entry.id ? { ...item, sets: text } : item))} keyboardType="number-pad" placeholder={t(lang, 'actualSets')} style={{ flex: 1 }} />
                  <QuestInput questTheme={questTheme} value={entry.reps} onChangeText={(text) => setExerciseEntries((current) => current.map((item) => item.id === entry.id ? { ...item, reps: text } : item))} keyboardType="number-pad" placeholder={t(lang, 'actualReps')} style={{ flex: 1 }} />
                </View>
                {showAdvancedFields ? (
                  <QuestInput
                    questTheme={questTheme}
                    value={entry.rpe}
                    onChangeText={(text) => setExerciseEntries((current) => current.map((item) => item.id === entry.id ? { ...item, rpe: text } : item))}
                    keyboardType="decimal-pad"
                    placeholder={t(lang, 'actualRPE')}
                  />
                ) : null}
              </View>
            ))}
            {exerciseEntries.length < 5 ? (
              <QuestButton
                questTheme={questTheme}
                variant="secondary"
                icon="plus"
                label={t(lang, 'addExercise')}
                onPress={() => setExerciseEntries((current) => [...current, { id: `exercise-${Date.now()}`, exerciseName: '', weight: '', sets: '3', reps: '', rpe: '', note: '' }])}
                style={{ marginTop: 10 }}
              />
            ) : null}
          </View>
        ) : null}

        {(() => {
          const selectedSkill = data.skills.find((s) => s.id === skillId);
          if (!selectedSkill || logType === 'custom') return null;
          const progressType = selectedSkill.metricConfig?.metricType ?? selectedSkill.progressType ?? 'time_based';
          const checklistItems = selectedSkill.metricConfig?.checklistItems ?? selectedSkill.curriculumItems ?? [];
          return (
            <View style={[styles.progressUpdateBox, { backgroundColor: questTheme.colors.surfaceSoft, borderColor: questTheme.colors.border }]}>
              <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{modalIsStrength ? t(lang, 'actualPerformance') : t(lang, 'progressUpdate')}</Text>
              {progressType === 'time_based' ? (
                <Text style={styles.planReason}>
                  {t(lang, 'metricDescTime')}{'\n'}{t(lang, 'appliedToProgress')}: +{minutes || 0} {t(lang, 'minutes')}
                </Text>
              ) : progressType === 'target_value' ? (
                <>
                  <Text style={styles.planReason}>{t(lang, 'metricDescTarget')}</Text>
                  <Text style={styles.planReason}>
                    {(selectedSkill.metricConfig?.currentValue ?? selectedSkill.currentValue ?? 0)}{selectedSkill.metricConfig?.unit ?? selectedSkill.unit ?? ''} / {(selectedSkill.metricConfig?.targetValue ?? selectedSkill.targetValue ?? 0)}{selectedSkill.metricConfig?.unit ?? selectedSkill.unit ?? ''}
                  </Text>
                  <QuestInput
                    questTheme={questTheme}
                    value={newCurrentValue}
                    onChangeText={setNewCurrentValue}
                    keyboardType="decimal-pad"
                    placeholder={t(lang, 'newCurrentValue')}
                  />
                  {modalIsStrength && strengthLogMode === 'simple' ? (
                    <View style={styles.timeRow}>
                      <QuestInput questTheme={questTheme} value={strengthWeight} onChangeText={setStrengthWeight} keyboardType="decimal-pad" placeholder={t(lang, 'actualWorkingWeight')} style={{ flex: 1 }} />
                      <QuestInput questTheme={questTheme} value={strengthReps} onChangeText={setStrengthReps} keyboardType="number-pad" placeholder={t(lang, 'actualReps')} style={{ flex: 1 }} />
                      <QuestInput questTheme={questTheme} value={strengthSets} onChangeText={setStrengthSets} keyboardType="number-pad" placeholder={t(lang, 'actualSets')} style={{ flex: 1 }} />
                    </View>
                  ) : null}
                </>
              ) : progressType === 'frequency' ? (
                <TouchableOpacity style={styles.curriculumRow} onPress={() => setFrequencyCompleted((value) => !value)}>
                  <Text style={styles.curriculumCheck}>{frequencyCompleted ? '✓' : '○'}</Text>
                  <Text style={styles.planReason}>{t(lang, 'metricDescFrequency')}</Text>
                </TouchableOpacity>
              ) : progressType === 'curriculum' || progressType === 'checklist' ? (
                <>
                  <Text style={styles.planReason}>{t(lang, 'metricDescChecklist')}</Text>
                  {checklistItems.length === 0 ? (
                    <Text style={styles.planReason}>{t(lang, 'noProgressItems')}</Text>
                  ) : (
                    checklistItems.map((item) => {
                      const checked = completedCurriculumItemIds.includes(item.id);
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.curriculumRow}
                          onPress={() => setCompletedCurriculumItemIds((ids) => (
                            checked ? ids.filter((id) => id !== item.id) : [...ids, item.id]
                          ))}
                        >
                          <Text style={styles.curriculumCheck}>{checked || item.completed ? '✓' : '○'}</Text>
                          <Text style={styles.planReason}>{item.title}</Text>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </>
              ) : progressType === 'performance_log' ? (
                <>
                  <Text style={styles.planReason}>{t(lang, 'metricDescPerformance')}</Text>
                  {!modalIsStrength ? (
                    <QuestInput questTheme={questTheme} value={performanceValue} onChangeText={setPerformanceValue} keyboardType="decimal-pad" placeholder={t(lang, 'performanceValue')} />
                  ) : null}
                  {selectedSkill.metricConfig?.performanceType === 'strength' && strengthLogMode === 'simple' ? (
                    <View style={styles.timeRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'actualWorkingWeight')}</Text>
                        <QuestInput questTheme={questTheme} value={strengthWeight} onChangeText={setStrengthWeight} keyboardType="decimal-pad" placeholder="75" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'actualReps')}</Text>
                        <QuestInput questTheme={questTheme} value={strengthReps} onChangeText={setStrengthReps} keyboardType="number-pad" placeholder="5" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'actualSets')}</Text>
                        <QuestInput questTheme={questTheme} value={strengthSets} onChangeText={setStrengthSets} keyboardType="number-pad" placeholder="3" />
                      </View>
                    </View>
                  ) : null}
                  <QuestInput questTheme={questTheme} value={strengthRpe} onChangeText={setStrengthRpe} keyboardType="decimal-pad" placeholder={t(lang, 'actualRPE')} />
                </>
              ) : progressType === 'quality_score' ? (
                <Text style={styles.planReason}>{t(lang, 'metricDescQuality')}{'\n'}{t(lang, 'qualityScore')}: {quality ? `${quality}/5` : t(lang, 'quality')}</Text>
              ) : progressType === 'state_based' ? (
                <>
                  <Text style={styles.planReason}>{t(lang, 'metricDescState')}</Text>
                  <QuestInput questTheme={questTheme} value={stateValue} onChangeText={setStateValue} keyboardType="decimal-pad" placeholder={t(lang, 'stateMetric')} />
                </>
              ) : progressType === 'money_based' ? (
                <>
                  <Text style={styles.planReason}>{t(lang, 'metricDescMoney')}</Text>
                  <View style={styles.timeRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>{t(lang, 'amountAdded')}</Text>
                      <QuestInput questTheme={questTheme} value={amountAdded} onChangeText={setAmountAdded} keyboardType="decimal-pad" placeholder="100" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>{t(lang, 'newCurrentAmount')}</Text>
                      <QuestInput questTheme={questTheme} value={newCurrentAmount} onChangeText={setNewCurrentAmount} keyboardType="decimal-pad" placeholder="500" />
                    </View>
                  </View>
                </>
              ) : progressType === 'binary' ? (
                <TouchableOpacity style={styles.curriculumRow} onPress={() => setBinaryCompleted((value) => !value)}>
                  <Text style={styles.curriculumCheck}>{binaryCompleted ? '✓' : '○'}</Text>
                  <Text style={styles.planReason}>{t(lang, 'metricDescBinary')}</Text>
                </TouchableOpacity>
              ) : progressType === 'qualitative' ? (
                <>
                  <Text style={styles.planReason}>{t(lang, 'metricDescQualitative')}</Text>
                  <QuestInput
                    questTheme={questTheme}
                    value={qualitativeSummary}
                    onChangeText={setQualitativeSummary}
                    style={{ height: 70, textAlignVertical: 'top' }}
                    multiline
                    placeholder={t(lang, 'qualitativeSummary')}
                  />
                </>
              ) : (
                <Text style={styles.planReason}>{t(lang, 'noNumericProgress')}</Text>
              )}
            </View>
          );
        })()}

        <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'noteOptional')}</Text>
        <QuestInput
          questTheme={questTheme}
          value={note}
          onChangeText={setNote}
          style={{ height: 80, textAlignVertical: 'top' }}
          multiline
          placeholder={t(lang, 'notePlaceholder')}
        />

      </BottomSheetForm>

      <BottomSheetForm visible={stateModal} onClose={() => setStateModal(false)}>
        <Text style={styles.h2}>{t(lang, 'detailedCheckIn')}</Text>
        <Text style={styles.stateFormHint}>{t(lang, 'logStateNow')}</Text>

        <Text style={styles.label}>{t(lang, 'overall')}</Text>
        <View style={styles.ratingRow}>
          {dailyStateOptions.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.ratingBtn, stateOverall === opt.value && { borderColor: accent, backgroundColor: accent + '18' }]}
              onPress={() => setStateOverall(opt.value)}
            >
              <Text style={styles.ratingEmoji}>{opt.emoji}</Text>
              <Text style={styles.ratingText}>{opt.value}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>{t(lang, 'energy')}</Text>
        <View style={styles.ratingRow}>
          {dailyStateOptions.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.ratingBtn, stateEnergy === opt.value && { borderColor: accent, backgroundColor: accent + '18' }]}
              onPress={() => setStateEnergy(opt.value)}
            >
              <Text style={styles.ratingEmoji}>{opt.emoji}</Text>
              <Text style={styles.ratingText}>{opt.value}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>{t(lang, 'focus')}</Text>
        <View style={styles.ratingRow}>
          {dailyStateOptions.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.ratingBtn, stateFocus === opt.value && { borderColor: accent, backgroundColor: accent + '18' }]}
              onPress={() => setStateFocus(opt.value)}
            >
              <Text style={styles.ratingEmoji}>{opt.emoji}</Text>
              <Text style={styles.ratingText}>{opt.value}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>{t(lang, 'mood')}</Text>
        <View style={styles.ratingRow}>
          {dailyStateOptions.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.ratingBtn, stateMood === opt.value && { borderColor: accent, backgroundColor: accent + '18' }]}
              onPress={() => setStateMood(opt.value)}
            >
              <Text style={styles.ratingEmoji}>{opt.emoji}</Text>
              <Text style={styles.ratingText}>{opt.value}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>{t(lang, 'physical')}</Text>
        <View style={styles.ratingRow}>
          {dailyStateOptions.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.ratingBtn, statePhysical === opt.value && { borderColor: accent, backgroundColor: accent + '18' }]}
              onPress={() => setStatePhysical(opt.value)}
            >
              <Text style={styles.ratingEmoji}>{opt.emoji}</Text>
              <Text style={styles.ratingText}>{opt.value}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>{t(lang, 'stress')}</Text>
        <View style={styles.ratingRow}>
          {dailyStateOptions.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.ratingBtn, stateStress === opt.value && { borderColor: accent, backgroundColor: accent + '18' }]}
              onPress={() => setStateStress(opt.value)}
            >
              <Text style={styles.ratingEmoji}>{opt.emoji}</Text>
              <Text style={styles.ratingText}>{opt.value}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>{t(lang, 'health')}</Text>
        <View style={styles.chipsRow}>
          {healthOptions.map((opt) => {
            const on = stateHealth === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, on && { backgroundColor: accent, borderColor: accent }]}
                onPress={() => setStateHealth(opt.value)}
              >
                <Text style={[styles.chipText, { color: questTheme.colors.text }, on && { color: questTheme.colors.primaryText, fontWeight: '700' }]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>{t(lang, 'sleepQuality')}</Text>
        <View style={styles.ratingRow}>
          {dailyStateOptions.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.ratingBtn, contextSleepQuality === opt.value && { borderColor: accent, backgroundColor: accent + '18' }]}
              onPress={() => setContextSleepQuality(opt.value)}
            >
              <Text style={styles.ratingEmoji}>{opt.emoji}</Text>
              <Text style={styles.ratingText}>{opt.value}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.chipsRow}>
          {[
            { key: 'sick', label: t(lang, 'healthSick'), value: contextSick, set: setContextSick },
            { key: 'postWorkout', label: t(lang, 'postWorkout'), value: contextPostWorkout, set: setContextPostWorkout },
            { key: 'afterExam', label: t(lang, 'afterExam'), value: contextAfterExam, set: setContextAfterExam },
            { key: 'caffeine', label: t(lang, 'caffeine'), value: contextCaffeine, set: setContextCaffeine },
            { key: 'socialDrain', label: t(lang, 'socialDrain'), value: contextSocialDrain, set: setContextSocialDrain },
          ].map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.chip, item.value && { backgroundColor: accent, borderColor: accent }]}
              onPress={() => item.set(!item.value)}
            >
              <Text style={[styles.chipText, { color: questTheme.colors.text }, item.value && { color: questTheme.colors.primaryText, fontWeight: '700' }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>{t(lang, 'noteOptional')}</Text>
        <TextInput
          value={stateNote}
          onChangeText={setStateNote}
          style={[styles.input, { height: 72, textAlignVertical: 'top' }]}
          multiline
          placeholder={t(lang, 'stateNoteExample')}
          placeholderTextColor={theme.textDim}
        />

        {stateHistory.length > 0 ? (
          <View style={styles.historyBox}>
            <Text style={styles.historyTitle}>{t(lang, 'currentState')}</Text>
            {stateHistory.slice(0, 3).map((h) => (
              <Text key={h.id} style={styles.historyLine}>
                {new Date(h.timestamp).toLocaleTimeString()} · {t(lang, 'energy')} {h.energy} / {t(lang, 'focus')} {h.focus} / {t(lang, 'mood')} {h.mood} · {healthOptions.find((o) => o.value === h.health)?.label}
              </Text>
            ))}
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <TouchableOpacity style={[styles.btn, styles.btnGhost, { flex: 1 }]} onPress={() => setStateModal(false)}>
            <Text style={styles.btnGhostText}>{t(lang, 'cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { flex: 1, backgroundColor: accent }]} onPress={saveStateAssessment}>
            <Text style={styles.btnText}>{t(lang, 'save')}</Text>
          </TouchableOpacity>
        </View>
      </BottomSheetForm>

      <Modal visible={rescueOpen} animationType="slide" onRequestClose={() => setRescueOpen(false)}>
        <SafeAreaView edges={['top', 'bottom']} style={styles.rescueModal}>
          <View style={styles.rescueModalInner}>
            <Text style={styles.rescueKicker}>{t(lang, 'brainOffRescue')}</Text>
            {rescueStep === 'intro' ? (
              <>
                <Text style={styles.rescueTitle}>{t(lang, 'stopAnalyzing')}</Text>
                <Text style={styles.rescueBody}>{t(lang, 'stopAnalyzingBody')}</Text>
                <TouchableOpacity style={[styles.rescuePrimaryBtn, { backgroundColor: accent }]} onPress={startRescue}>
                  <Text style={styles.rescuePrimaryText}>{t(lang, 'startThirtySeconds')}</Text>
                </TouchableOpacity>
              </>
            ) : rescueStep === 'body' ? (
              <>
                <Text style={styles.rescueTitle}>{t(lang, 'doOnlyThis')}</Text>
                <Text style={styles.rescueActionText}>{rescueBodyAction}</Text>
                <TouchableOpacity style={[styles.rescuePrimaryBtn, { backgroundColor: accent }]} onPress={finishBodyAction}>
                  <Text style={styles.rescuePrimaryText}>{t(lang, 'bodyActionDone')}</Text>
                </TouchableOpacity>
              </>
            ) : rescueStep === 'activation' ? (
              <>
                <Text style={styles.rescueTitle}>{t(lang, 'minimumStart')}</Text>
                <Text style={styles.rescueActionText}>{rescueActivationAction}</Text>
                <TouchableOpacity style={[styles.rescuePrimaryBtn, { backgroundColor: accent }]} onPress={finishActivation}>
                  <Text style={styles.rescuePrimaryText}>{t(lang, 'completeMinimumStart')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.rescueTitle}>{t(lang, 'youDidNotBreakTheChain')}</Text>
                <Text style={styles.rescueBody}>{t(lang, 'youDidNotBreakTheChainBody')}</Text>
                <TouchableOpacity style={[styles.rescuePrimaryBtn, { backgroundColor: accent }]} onPress={() => setRescueOpen(false)}>
                  <Text style={styles.rescuePrimaryText}>{t(lang, 'backToToday')}</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={styles.rescueCloseBtn} onPress={() => setRescueOpen(false)}>
              <Text style={styles.rescueCloseText}>{t(lang, 'cancel')}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ───────── 单个技能的今日进度行 ─────────
function SkillProgressRow({
  skill, logs, todayStr, targetMinutes, lang, questTheme, onPress,
}: { skill: Skill; logs: ExecutionLog[]; todayStr: string; targetMinutes: number; lang: 'zh' | 'en'; questTheme: ReturnType<typeof getQuestTheme>; onPress: () => void }) {
  const todayMin = logs
    .filter((log) => log.linkedSkillId === skill.id && log.date === todayStr)
    .reduce((sum, log) => sum + log.durationMinutes, 0);
  const target = targetMinutes;
  const ratio = target > 0 ? todayMin / target : 0;
  const done = todayMin >= target && target > 0;
  const barWidth = Math.min(100, ratio * 100);
  const untouched = todayMin === 0;

  return (
    <TouchableOpacity style={[styles.skillRow, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border }]} onPress={onPress} activeOpacity={0.7}>
      <QuestEntityIcon icon={skill.icon} systemIcon={getSkillSemanticIcon(skill)} color={skill.color} questTheme={questTheme} size="md" />
      <View style={{ flex: 1 }}>
        <View style={styles.skillTopRow}>
          <Text style={[styles.skillName, { color: questTheme.colors.text }]}>{skill.name}</Text>
          {done ? (
            <View style={[styles.overChip, { backgroundColor: questTheme.colors.successSoft, borderColor: questTheme.colors.success }]}>
            <Text style={[styles.overChipText, { color: questTheme.colors.success }]}>{t(lang, 'overCompleted')}</Text>
            </View>
          ) : untouched ? (
            <Text style={[styles.untouchedHint, { color: questTheme.colors.textMuted }]}>{t(lang, 'noLogsToday')}</Text>
          ) : (
            <Text style={[styles.skillMeta, { color: questTheme.colors.textMuted }]}>{todayMin} / {target}m</Text>
          )}
        </View>
        <View style={[styles.skillBarBg, { backgroundColor: questTheme.colors.surfaceSoft }]}>
          <View
            style={[
              styles.skillBarFg,
              {
                width: `${barWidth}%`,
                backgroundColor: done ? questTheme.colors.success : skill.color,
              },
            ]}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function Stat({
  label, value, questTheme, accent,
}: { label: string; value: string; questTheme: ReturnType<typeof getQuestTheme>; accent: string }) {
  return (
    <View style={[styles.stat, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border }]}>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: questTheme.colors.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  container: { flex: 1, backgroundColor: theme.bg },
  h1: { color: theme.text, fontSize: 34, fontWeight: '800' },
  h2: { color: theme.text, fontSize: 18, fontWeight: '600', marginTop: 24, marginBottom: 12 },
  sub: { color: theme.textDim, marginTop: 4 },
  welcomeCard: { marginTop: 12, borderRadius: theme.radius.lg, padding: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12, ...theme.shadow },
  welcomeActions: { alignItems: 'flex-end', gap: 8 },
  compactBtn: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  compactBtnText: { fontSize: 12, fontWeight: '900' },
  timerBar: { marginTop: 12, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: theme.radius.lg, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, ...theme.shadow },
  timerText: { color: theme.text, fontSize: 13, fontWeight: '900', flex: 1 },
  timerFinishBtn: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 },
  timerFinishText: { fontSize: 12, fontWeight: '900' },
  modeRow: { gap: 8, paddingTop: 16, paddingBottom: 4 },
  modeChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
  },
  modeChipText: { color: theme.textDim, fontSize: 13, fontWeight: '700' },
  modeChipTextOn: { color: '#fff' },
  nowFocusCard: {
    marginTop: 12,
    backgroundColor: theme.card,
    borderRadius: theme.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
    ...theme.shadow,
  },
  nowFocusHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nowFocusIconShell: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  nowFocusTitle: { color: theme.text, fontSize: 24, fontWeight: '900', lineHeight: 30 },
  nowFocusActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  dailyBriefCard: { marginTop: 12, gap: 10 },
  dailyBriefHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dailyBriefTitle: { fontSize: 16, fontWeight: '900', lineHeight: 22, marginTop: 2 },
  dailyBriefAction: { borderWidth: 1, borderRadius: 14, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 9 },
  dailyBriefActionText: { fontSize: 13, fontWeight: '900', lineHeight: 18 },
  dailyBriefMeta: { fontSize: 11, fontWeight: '800', lineHeight: 16 },
  dailyBriefSection: { gap: 6 },
  dailyBriefChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dailyBriefChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
  dailyBriefChipText: { fontSize: 10, fontWeight: '900', lineHeight: 14 },
  dailyBriefFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  contextBridgeCard: { marginTop: 12, gap: 10 },
  contextBridgeHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  contextBriefTitle: { fontSize: 15, fontWeight: '900', lineHeight: 21, marginTop: 2 },
  contextBriefBody: { fontSize: 12, fontWeight: '800', lineHeight: 18, marginTop: 2 },
  contextCountPill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
  contextCountText: { fontSize: 10, fontWeight: '900' },
  contextInputRow: { gap: 8 },
  contextInput: { minHeight: 62, textAlignVertical: 'top' },
  contextPreviewBox: { borderWidth: 1, borderRadius: 14, padding: 10, gap: 8 },
  contextPreviewTitle: { fontSize: 12, fontWeight: '900' },
  contextMetricWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  contextMetricPill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
  contextMetricText: { fontSize: 10, fontWeight: '900' },
  nowFocusBtn: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 9 },
  nowFocusBtnText: { fontSize: 12, fontWeight: '900' },
  nowFocusPrimary: { borderRadius: 16, paddingHorizontal: 13, paddingVertical: 10 },
  nowFocusPrimaryText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  compactPlanCard: {
    marginTop: 12,
    backgroundColor: theme.card,
    borderRadius: theme.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.border,
    ...theme.shadow,
  },
  compactPlanRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderTopWidth: 1, borderTopColor: theme.border },
  compactPlanTitle: { color: theme.text, fontSize: 14, fontWeight: '900' },
  compactPlanMeta: { color: theme.textDim, fontSize: 11, fontWeight: '700', marginTop: 3 },
  expandPlanBtn: { alignSelf: 'flex-start', paddingVertical: 8 },
  expandPlanText: { fontSize: 12, fontWeight: '900' },
  stateCheckInCard: {
    marginTop: 12,
    backgroundColor: theme.card,
    borderRadius: theme.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.border,
    ...theme.shadow,
  },
  quickStateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  quickStateBtn: { width: '18%', minWidth: 56, alignItems: 'center', backgroundColor: theme.cardAlt, borderRadius: 14, paddingVertical: 9 },
  stateToneDot: { width: 18, height: 18, borderRadius: 9, marginBottom: 5 },
  strategyCard: {
    marginTop: 12,
    backgroundColor: theme.card,
    borderRadius: theme.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
    ...theme.shadow,
  },
  strategyKicker: { color: theme.textDim, fontSize: 11, fontWeight: '800', letterSpacing: 0.4, marginBottom: 8 },
  strategyTitle: { color: theme.text, fontSize: 20, fontWeight: '800' },
  strategyDesc: { color: theme.textDim, fontSize: 14, lineHeight: 21, marginTop: 6 },
  minimumBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: theme.radius.md,
    backgroundColor: theme.cardAlt,
  },
  minimumLabel: { color: theme.text, fontSize: 13, fontWeight: '800', marginBottom: 4 },
  minimumText: { color: theme.textDim, fontSize: 13, lineHeight: 19 },
  predictionBox: { marginTop: 14, padding: 12, borderRadius: theme.radius.md, backgroundColor: theme.cardAlt },
  modalSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'space-between' },
  modalToggleText: { fontSize: 11, fontWeight: '900', textAlign: 'right', maxWidth: 108 },
  modalMiniToggle: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start' },
  modalMiniToggleText: { fontSize: 11, fontWeight: '900' },
  modalFooterActions: { flexDirection: 'row', gap: 10 },
  modalFooterHint: { fontSize: 12, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  exerciseEntryCard: { borderWidth: 1, borderRadius: theme.radius.md, padding: 10, marginTop: 10, gap: 8 },
  currentStateCard: {
    marginTop: 12,
    backgroundColor: theme.card,
    borderRadius: theme.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
    ...theme.shadow,
  },
  currentStateTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  currentStateTitle: { color: theme.text, fontSize: 15, fontWeight: '800' },
  currentStateTime: { color: theme.textDim, fontSize: 12, marginTop: 10, lineHeight: 18 },
  stateUpdateBtn: { borderWidth: 1, borderRadius: theme.radius.md, paddingHorizontal: 10, paddingVertical: 8 },
  stateUpdateText: { fontSize: 12, fontWeight: '800' },
  stateMetricRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  stateMetric: { color: theme.text, fontSize: 12, fontWeight: '700', backgroundColor: theme.cardAlt, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12 },
  stateHistoryText: { color: theme.textDim, fontSize: 11, marginTop: 10 },
  rescueEntryCard: {
    marginTop: 12,
    backgroundColor: theme.card,
    borderRadius: theme.radius.lg,
    padding: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...theme.shadow,
  },
  rescueEntryTitle: { color: theme.text, fontSize: 19, fontWeight: '900' },
  rescueEntryText: { color: theme.textDim, fontSize: 13, lineHeight: 19, marginTop: 5 },
  rescueSummaryText: { color: theme.textDim, fontSize: 12, fontWeight: '800', marginTop: 8 },
  rescueEntryArrow: { fontSize: 24, fontWeight: '900' },
  rescueIconShell: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rescueStrip: { marginTop: 10, minHeight: 52, backgroundColor: theme.cardAlt, borderRadius: theme.radius.md, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1 },
  rescueStripTitle: { color: theme.text, fontSize: 13, fontWeight: '900' },
  rescueStripText: { color: theme.textDim, fontSize: 11, lineHeight: 15, marginTop: 1 },
  rescueMiniButton: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  rescueMiniButtonText: { fontSize: 11, fontWeight: '900' },
  rescueModal: { flex: 1, backgroundColor: theme.bg },
  rescueModalInner: { flex: 1, padding: 24, justifyContent: 'center' },
  rescueKicker: { color: theme.textDim, fontSize: 12, fontWeight: '900', marginBottom: 16, letterSpacing: 0.5 },
  rescueTitle: { color: theme.text, fontSize: 34, fontWeight: '900', lineHeight: 40 },
  rescueBody: { color: theme.textDim, fontSize: 16, lineHeight: 25, marginTop: 18 },
  rescueActionText: { color: theme.text, fontSize: 28, fontWeight: '900', lineHeight: 36, marginTop: 26 },
  rescuePrimaryBtn: { marginTop: 34, borderRadius: 22, paddingVertical: 16, alignItems: 'center' },
  rescuePrimaryText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  rescueCloseBtn: { alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 12, marginTop: 16 },
  rescueCloseText: { color: theme.textDim, fontSize: 13, fontWeight: '800' },
  nextActionCard: {
    marginTop: 12,
    backgroundColor: theme.card,
    borderRadius: theme.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
    ...theme.shadow,
  },
  nextActionTitle: { color: theme.text, fontSize: 18, fontWeight: '900' },
  nextActionText: { color: theme.textDim, fontSize: 13, lineHeight: 20, marginTop: 6 },
  commandStateLine: { color: theme.textDim, fontSize: 12, fontWeight: '700', marginTop: 8 },
  nextActionBtn: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, marginTop: 12 },
  nextActionBtnText: { fontSize: 12, fontWeight: '900' },
  schedulePreviewCard: {
    marginTop: 12,
    backgroundColor: theme.card,
    borderRadius: theme.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
    ...theme.shadow,
  },
  energyCard: {
    marginTop: 12,
    backgroundColor: theme.card,
    borderRadius: theme.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
    ...theme.shadow,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  energyBarBg: { height: 8, backgroundColor: theme.cardAlt, borderRadius: 4, overflow: 'hidden', marginTop: 8, marginBottom: 12 },
  energyBarFg: { height: '100%', borderRadius: 4 },
  energyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  energyName: { color: theme.text, fontSize: 12, fontWeight: '800', width: 92 },
  energyMiniBar: { flex: 1, height: 7, backgroundColor: theme.cardAlt, borderRadius: 4, overflow: 'hidden' },
  energyMiniFill: { height: '100%', borderRadius: 4 },
  energyPct: { color: theme.textDim, fontSize: 11, fontWeight: '800', width: 34, textAlign: 'right' },
  energyOver: { color: theme.success, fontSize: 10, fontWeight: '800' },
  scheduleBlockRow: { flexDirection: 'row', gap: 12, backgroundColor: theme.cardAlt, borderRadius: theme.radius.md, padding: 12 },
  scheduleTime: { color: theme.text, fontSize: 12, fontWeight: '800', width: 88 },
  quickActionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  iconActionBtn: { width: 34, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card },
  iconActionText: { color: theme.text, fontSize: 14, fontWeight: '900' },
  statRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  stat: { flex: 1, backgroundColor: theme.card, padding: 14, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border, ...theme.shadow },
  // zone-3 collapsible section toggle rows
  sectionToggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 12, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: theme.radius.md, borderWidth: 1,
  },
  sectionToggleLabel: { fontSize: 14, fontWeight: '700' },
  sectionToggleChev: { fontSize: 13 },
  statValue: { color: theme.primary, fontSize: 22, fontWeight: '700' },
  statLabel: { color: theme.textDim, fontSize: 12, marginTop: 2 },
  // 晨间状态横幅
  stateBanner: {
    marginTop: 16,
    backgroundColor: theme.card,
    borderRadius: theme.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  stateBannerTitle: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  stateRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  stateBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: theme.cardAlt,
    gap: 4,
  },
  stateEmoji: { fontSize: 26 },
  stateLabel: { color: theme.textDim, fontSize: 10, fontWeight: '600' },

  bigBtn: { marginTop: 16, paddingVertical: 18, borderRadius: theme.radius.lg, alignItems: 'center', ...theme.shadow },
  bigBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  emptyCta: { backgroundColor: theme.card, padding: 16, borderRadius: theme.radius.lg, borderWidth: 1, borderStyle: 'dashed' },
  emptyCtaText: { textAlign: 'center', fontWeight: '700' },
  empty: { color: theme.textDim, fontStyle: 'italic', backgroundColor: theme.card, padding: 14, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.border },
  groupBox: { marginBottom: 14 },
  groupHeader: { color: theme.text, fontWeight: '700', marginBottom: 8, fontSize: 14 },

  // 今日计划
  planCard: {
    marginTop: 16,
    backgroundColor: theme.card,
    borderRadius: theme.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  planTitle: { color: theme.text, fontSize: 17, fontWeight: '700', marginBottom: 6 },
  planMessage: { color: theme.primary, fontSize: 14, fontWeight: '600', marginBottom: 12 },
  planModeNote: { color: theme.textDim, fontSize: 12, lineHeight: 18, marginTop: -4, marginBottom: 10 },
  planList: { gap: 10 },
  planItem: { color: theme.text, fontSize: 14, lineHeight: 20 },
  planNote: { color: theme.textDim, fontSize: 12, marginTop: 10 },
  planSkillCard: { backgroundColor: theme.cardAlt, borderRadius: theme.radius.md, padding: 12 },
  planSkillTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  planSkillName: { color: theme.text, fontSize: 15, fontWeight: '800', flex: 1 },
  planType: { color: theme.textDim, fontSize: 12, marginTop: 6 },
  planMinutes: { color: theme.text, fontSize: 13, fontWeight: '700', marginTop: 6 },
  planReason: { color: theme.textDim, fontSize: 12, lineHeight: 18, marginTop: 5 },
  adjustBadge: { backgroundColor: theme.border, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  adjustBadgeProtected: { backgroundColor: theme.success + '24' },
  adjustBadgeChallenge: { backgroundColor: theme.accent + '24' },
  adjustBadgeText: { color: theme.text, fontSize: 11, fontWeight: '800' },

  // 今日技能进度行
  skillRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.card, padding: 12, borderRadius: theme.radius.lg, marginBottom: 8, borderWidth: 1, borderColor: theme.border, ...theme.shadow },
  skillIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  skillTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  skillName: { color: theme.text, fontSize: 15, fontWeight: '600', flex: 1 },
  skillMeta: { color: theme.textDim, fontSize: 12 },
  untouchedHint: { color: theme.textDim, fontSize: 11, fontStyle: 'italic' },
  skillBarBg: { height: 6, backgroundColor: theme.cardAlt, borderRadius: 3, overflow: 'hidden' },
  skillBarFg: { height: '100%', borderRadius: 3 },
  overChip: { backgroundColor: theme.success + '33', borderColor: theme.success, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  overChipText: { color: theme.success, fontSize: 11, fontWeight: '700' },

  // 今日记录
  actionCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.card, padding: 14, borderRadius: theme.radius.lg, marginBottom: 8, borderWidth: 1, borderColor: theme.border, ...theme.shadow },
  dot: { width: 10, height: 10, borderRadius: 5 },
  actionTitle: { color: theme.text, fontSize: 15, fontWeight: '600' },
  actionNote: { color: theme.textDim, marginTop: 4, fontSize: 13 },
  logDeleteBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  logDeleteText: { fontSize: 16, fontWeight: '900', lineHeight: 19 },
  tip: { color: theme.textDim, fontSize: 11, textAlign: 'center', marginTop: 12 },

  // 顶部横幅 (成就 / Streak 共用基础样式)
  topBanner: {
    position: 'absolute',
    top: 0, left: 16, right: 16,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    shadowOpacity: 0.45,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    elevation: 6,
    zIndex: 100,
  },
  topBannerAchievement: {
    backgroundColor: theme.card,
    borderWidth: 1.5,
    borderColor: theme.accent,
    shadowColor: theme.accent,
  },
  topBannerStreak: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.accent,
    shadowColor: theme.accent,
  },
  topBannerText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  // 最近成就卡片内辅助文字
  achieveName: { color: theme.textDim, fontSize: 11, marginTop: 2 },

  // 庆祝浮层
  celebrateBg: { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
  celebrateCard: {
    backgroundColor: theme.card,
    borderColor: theme.success,
    borderWidth: 2,
    paddingVertical: 28,
    paddingHorizontal: 36,
    borderRadius: 22,
    alignItems: 'center',
    shadowColor: theme.success,
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 20,
    elevation: 8,
  },
  celebrateEmoji: { fontSize: 56 },
  celebrateTitle: { color: theme.text, fontSize: 18, fontWeight: '700', marginTop: 8 },
  celebrateLine: { color: theme.success, fontSize: 16, fontWeight: '700', marginTop: 4 },

  // Modal 表单内通用
  label: { color: theme.textDim, marginTop: 12, marginBottom: 6 },
  stateFormHint: { color: theme.textDim, fontSize: 13, lineHeight: 20, marginTop: 6 },
  ratingRow: { flexDirection: 'row', gap: 8 },
  ratingBtn: { flex: 1, alignItems: 'center', borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card, borderRadius: theme.radius.md, paddingVertical: 8 },
  ratingEmoji: { fontSize: 20 },
  ratingText: { color: theme.textDim, fontSize: 11, fontWeight: '800', marginTop: 2 },
  historyBox: { backgroundColor: theme.cardAlt, borderRadius: theme.radius.md, padding: 12, marginTop: 14 },
  historyTitle: { color: theme.text, fontSize: 13, fontWeight: '800', marginBottom: 6 },
  historyLine: { color: theme.textDim, fontSize: 12, lineHeight: 18 },
  // 质量评分按钮
  qRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  qBox: {
    minWidth: 48,
    flexGrow: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
    alignItems: 'center',
    gap: 4,
  },
  qBoxOn: { borderColor: theme.primary, borderWidth: 2, backgroundColor: theme.cardAlt },
  qEmoji: { fontSize: 24 },
  qLabel: { color: theme.textDim, fontSize: 10 },
  qLabelOn: { color: theme.text, fontWeight: '700' },
  input: { backgroundColor: theme.card, borderRadius: 8, padding: 12, color: theme.text, borderWidth: 1, borderColor: theme.border },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card },
  chipText: { color: theme.text, fontSize: 13 },
  progressUpdateBox: { backgroundColor: '#151925', borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 12, marginTop: 12, gap: 8 },
  curriculumRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  curriculumCheck: { color: theme.accent, fontWeight: '800', width: 18 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  btn: { backgroundColor: theme.primary, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.border },
  btnGhostText: { color: theme.text, fontWeight: '600' },
});
