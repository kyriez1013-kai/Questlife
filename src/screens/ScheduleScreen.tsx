import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { useStore } from '../store';
import {
  flexibilityLabel, getLanguage, progressTypeLabel, qualityLabel, rigidityLabel, sourceLabel, statusLabel, t, taskTypeLabel,
} from '../i18n';
import { today } from '../storage';
import { theme } from '../theme';
import { ExecutionLog, Quality, QUALITY_OPTIONS, ScheduleBlock, TaskType } from '../types';
import BottomSheetForm from '../components/BottomSheetForm';
import { generateScheduleBlocksFromSkills } from '../scheduleAdjust';
import { formatMetricSummary, progressTypeForSkill } from '../progress';
import { questLayout, QuestTheme } from '../design/tokens';
import { useQuestTheme } from '../design/useQuestTheme';
import { isStrengthPredictionSkill, strengthVolume } from '../utils/prediction';
import QuestButton from '../components/ui/QuestButton';
import { QuestSectionHeader } from '../components/ui/QuestPrimitives';
import QuestIcon from '../components/ui/QuestIcon';
import QuestInput from '../components/ui/QuestInput';
import QuestPill from '../components/ui/QuestPill';
import QuestSegmentedControl from '../components/ui/QuestSegmentedControl';
import ScheduleProposalReview from '../components/schedule/ScheduleProposalReview';
import ScheduleDayTimeline from '../components/schedule/ScheduleDayTimeline';
import SchedulePlanCompilerSheet from '../components/schedule/SchedulePlanCompilerSheet';
import { buildScheduleV3Fixture } from '../components/schedule/scheduleV3Fixtures';
import { confirmAction } from '../utils/confirm';
import {
  buildScheduleProposalPatch,
  ScheduleProposal,
  ScheduleProposalStatus,
} from '../utils/scheduleProposal';
import { isDecisionDebugEnabled } from '../services/decisionService';
import { getScheduleV3Fixture, getV11ProductLanguage, getV11ProductThemeId } from '../v11/featureFlag';
import {
  compileScheduleDay,
  deriveScheduleOpenWindows,
  ScheduleCompilerResult,
  scheduleTimeToMinutes,
} from '../utils/scheduleCompiler';

const TASK_TYPES: TaskType[] = [
  'deep_study',
  'light_review',
  'strength_training',
  'cardio_recovery',
  'admin',
  'life_maintenance',
  'creative_building',
];

const FLEX = ['fixed', 'flexible', 'movable'] as const;
const RIGID = ['low', 'medium', 'high'] as const;

function minutesBetween(start: string, end: string) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0;
  return Math.max(0, eh * 60 + em - (sh * 60 + sm));
}

function weekDates(base: string) {
  const d = new Date(`${base}T00:00:00`);
  const start = new Date(d);
  start.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(start);
    x.setDate(start.getDate() + i);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  });
}

const WEEKDAY_FULL_KEYS = ['weekdayFullSun', 'weekdayFullMon', 'weekdayFullTue', 'weekdayFullWed', 'weekdayFullThu', 'weekdayFullFri', 'weekdayFullSat'];

function minuteOfDay(time: string) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

function optionalNumber(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function dateWithWeekday(date: string, lang: 'zh' | 'en') {
  const d = new Date(`${date}T00:00:00`);
  return `${date} · ${t(lang, WEEKDAY_FULL_KEYS[d.getDay()])}`;
}

function shiftScheduleDate(date: string, days: number) {
  const next = new Date(`${date}T00:00:00`);
  next.setDate(next.getDate() + days);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
}

function scheduleCopy(lang: 'zh' | 'en', key: string, values: Record<string, string | number> = {}) {
  return Object.entries(values).reduce(
    (copy, [name, value]) => copy.replace(new RegExp(`\\{${name}\\}`, 'g'), String(value)),
    t(lang, key),
  );
}

function scheduleDurationLabel(lang: 'zh' | 'en', minutes: number) {
  if (minutes < 60) return `${minutes}${t(lang, 'scheduleMinuteShort')}`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder
    ? `${hours}${t(lang, 'scheduleHourShort')} ${remainder}${t(lang, 'scheduleMinuteShort')}`
    : `${hours}${t(lang, 'scheduleHourShort')}`;
}

function resolveScheduleDayBounds(blocks: ScheduleBlock[]) {
  const starts = blocks.map((block) => scheduleTimeToMinutes(block.startTime)).filter(Number.isFinite);
  const ends = blocks.map((block) => scheduleTimeToMinutes(block.endTime)).filter(Number.isFinite);
  const dayStartMinutes = Math.max(0, Math.min(7 * 60, starts.length ? Math.floor(Math.min(...starts) / 60) * 60 : 7 * 60));
  const dayEndMinutes = Math.min(24 * 60, Math.max(23 * 60, ends.length ? Math.ceil(Math.max(...ends) / 60) * 60 : 23 * 60));
  return { dayStartMinutes, dayEndMinutes };
}

function monthCells(base: string) {
  const source = new Date(`${base}T00:00:00`);
  const first = new Date(source.getFullYear(), source.getMonth(), 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - mondayOffset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
      inMonth: date.getMonth() === source.getMonth(),
    };
  });
}

function blocksOverlap(block: ScheduleBlock, all: ScheduleBlock[]) {
  const start = minuteOfDay(block.startTime);
  const end = minuteOfDay(block.endTime);
  return all.some((candidate) => (
    candidate.id !== block.id
    && minuteOfDay(candidate.startTime) < end
    && minuteOfDay(candidate.endTime) > start
  ));
}

export default function ScheduleScreen() {
  const store = useStore();
  const route = useRoute<any>();
  const scheduleFixtureId = getScheduleV3Fixture();
  const lang = getV11ProductLanguage(getLanguage(store.data.settings.language));
  const scheduleFixture = useMemo(
    () => scheduleFixtureId ? buildScheduleV3Fixture(scheduleFixtureId, today(), lang) : null,
    [lang, scheduleFixtureId],
  );
  const [fixtureBlocks, setFixtureBlocks] = useState<ScheduleBlock[]>(() => scheduleFixture?.scheduleBlocks ?? []);
  useEffect(() => {
    setFixtureBlocks(scheduleFixture?.scheduleBlocks ?? []);
  }, [scheduleFixture]);
  const data = scheduleFixture ? {
    ...store.data,
    categories: scheduleFixture.categories,
    skills: scheduleFixture.skills,
    modules: [],
    moduleSkillLinks: [],
    scheduleBlocks: fixtureBlocks,
    executionLogs: [],
  } : store.data;
  const addScheduleBlock: typeof store.addScheduleBlock = scheduleFixture
    ? (input) => {
      const block: ScheduleBlock = {
        ...input,
        id: `schedule-v3-fixture-user-${Date.now()}`,
        createdAt: Date.now(),
      };
      setFixtureBlocks((current) => [...current, block]);
      return block;
    }
    : store.addScheduleBlock;
  const updateScheduleBlock: typeof store.updateScheduleBlock = scheduleFixture
    ? (id, patch) => setFixtureBlocks((current) => current.map((block) => block.id === id ? { ...block, ...patch } : block))
    : store.updateScheduleBlock;
  const deleteScheduleBlock: typeof store.deleteScheduleBlock = scheduleFixture
    ? (id) => setFixtureBlocks((current) => current.filter((block) => block.id !== id))
    : store.deleteScheduleBlock;
  const createExecutionLog: typeof store.createExecutionLog = scheduleFixture
    ? (input) => {
      if (input.linkedScheduleBlockId) {
        setFixtureBlocks((current) => current.map((block) => block.id === input.linkedScheduleBlockId ? { ...block, status: 'completed' } : block));
      }
      return {
        ...input,
        id: input.id ?? `schedule-v3-fixture-log-${Date.now()}`,
        date: input.date ?? today(),
        durationMinutes: input.durationMinutes ?? 0,
        source: input.source ?? 'schedule_log',
        createdAt: input.createdAt ?? new Date().toISOString(),
        appliedToProgress: input.appliedToProgress ?? false,
      } as ExecutionLog;
    }
    : store.createExecutionLog;
  const questTheme = useQuestTheme(getV11ProductThemeId(data.settings.selectedThemeId));
  const accent = questTheme.colors.primary;
  const scheduleV3Styles = useMemo(() => ({
    dateNavigator: {
      minHeight: questLayout.controlMinHeight,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: questTheme.spacing.sm,
      paddingVertical: questTheme.spacing.sm,
      borderBottomWidth: 1,
    },
    iconButton: { width: questLayout.controlMinHeight, paddingHorizontal: 0 },
    dateNavigatorLabel: {
      flex: 1,
      textAlign: 'center' as const,
      fontSize: questTheme.typography.compactBodySize,
      lineHeight: questTheme.typography.compactBodyLineHeight,
      fontWeight: questTheme.typography.weightBold,
    },
    planStatusSurface: {
      marginTop: questTheme.spacing.md,
      padding: questTheme.spacing.lg,
      borderRadius: questTheme.radius.lg,
      borderWidth: 1,
    },
    planStatusTopRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, gap: questTheme.spacing.sm },
    planStatusEyebrow: { fontSize: questTheme.typography.metaSize, lineHeight: questTheme.typography.metaLineHeight, fontWeight: questTheme.typography.weightBold },
    planStatusTitle: { marginTop: questTheme.spacing.md, fontSize: questTheme.typography.titleSize, lineHeight: questTheme.typography.titleLineHeight, fontWeight: questTheme.typography.weightBold },
    planStatusMeta: { marginTop: questTheme.spacing.xs, fontSize: questTheme.typography.helperSize, lineHeight: questTheme.typography.helperLineHeight },
    currentNextStrip: { flexDirection: 'row' as const, alignItems: 'stretch' as const, marginTop: questTheme.spacing.lg, borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: questTheme.spacing.sm },
    currentNextItem: { flex: 1, minWidth: 0, paddingHorizontal: questTheme.spacing.sm },
    currentNextLabel: { fontSize: questTheme.typography.metaSize, lineHeight: questTheme.typography.metaLineHeight },
    currentNextValue: { marginTop: questTheme.spacing.xs, fontSize: questTheme.typography.compactBodySize, lineHeight: questTheme.typography.compactBodyLineHeight, fontWeight: questTheme.typography.weightMedium },
    currentNextDivider: { width: 1 },
    planActions: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, alignItems: 'center' as const, gap: questTheme.spacing.sm, marginTop: questTheme.spacing.lg },
    planPrimaryAction: { flexGrow: 1, flexBasis: 210 },
    planHelper: { marginTop: questTheme.spacing.sm, fontSize: questTheme.typography.helperSize, lineHeight: questTheme.typography.helperLineHeight },
    timelineLegend: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, alignItems: 'center' as const, gap: questTheme.spacing.md, paddingVertical: questTheme.spacing.md },
    legendItem: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: questTheme.spacing.xs },
    legendText: { fontSize: questTheme.typography.metaSize, lineHeight: questTheme.typography.metaLineHeight },
    timelineHint: { flexGrow: 1, minWidth: 160, fontSize: questTheme.typography.metaSize, lineHeight: questTheme.typography.metaLineHeight, textAlign: 'right' as const },
  }), [questTheme]);
  const [view, setView] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [selectedDate, setSelectedDate] = useState(today());
  const [open, setOpen] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(today());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [taskType, setTaskType] = useState<TaskType>('deep_study');
  const [flexibility, setFlexibility] = useState<ScheduleBlock['flexibility']>('flexible');
  const [rigidity, setRigidity] = useState<ScheduleBlock['rigidity']>('medium');
  const [placementLocked, setPlacementLocked] = useState(false);
  const [editingSeedBlock, setEditingSeedBlock] = useState<ScheduleBlock | null>(null);
  const [linkedGoalId, setLinkedGoalId] = useState<string | undefined>();
  const [linkedSkillId, setLinkedSkillId] = useState<string | undefined>();
  const [notes, setNotes] = useState('');
  const [logBlock, setLogBlock] = useState<ScheduleBlock | null>(null);
  const [logMinutes, setLogMinutes] = useState('');
  const [logQuality, setLogQuality] = useState<Quality | null>(null);
  const [logNote, setLogNote] = useState('');
  const [logNewCurrentValue, setLogNewCurrentValue] = useState('');
  const [logPerformanceValue, setLogPerformanceValue] = useState('');
  const [logPerformanceUnit, setLogPerformanceUnit] = useState('');
  const [logPerformanceNote, setLogPerformanceNote] = useState('');
  const [logStrengthWeight, setLogStrengthWeight] = useState('');
  const [logStrengthReps, setLogStrengthReps] = useState('');
  const [logStrengthSets, setLogStrengthSets] = useState('3');
  const [logStrengthRpe, setLogStrengthRpe] = useState('');
  const [logStateValue, setLogStateValue] = useState('');
  const [logAmountAdded, setLogAmountAdded] = useState('');
  const [logNewCurrentAmount, setLogNewCurrentAmount] = useState('');
  const [logBinaryCompleted, setLogBinaryCompleted] = useState(true);
  const [logQualitativeText, setLogQualitativeText] = useState('');
  const [logChecklistIds, setLogChecklistIds] = useState<string[]>([]);
  const [proposalStatuses, setProposalStatuses] = useState<Record<string, ScheduleProposalStatus>>({});
  const [proposalUndo, setProposalUndo] = useState<{ proposalId: string; block: ScheduleBlock } | null>(null);
  const [pendingPlan, setPendingPlan] = useState<ScheduleCompilerResult | null>(null);
  const [compilerOpen, setCompilerOpen] = useState(false);
  const [nowMinutes, setNowMinutes] = useState(() => {
    if (scheduleFixture) return scheduleFixture.nowMinutes;
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  const proposalReview = route.params?.scheduleProposalReview as {
    proposals?: ScheduleProposal[];
    qualityGrade?: 'excellent' | 'good' | 'weak' | 'bad';
    evidenceBasis?: 'population_prior' | 'personal_pattern' | 'mixed';
  } | undefined;
  const scheduleProposals = useMemo(() => (
    (proposalReview?.proposals || []).map((proposal) => ({
      ...proposal,
      status: proposalStatuses[proposal.id] || proposal.status,
    }))
  ), [proposalReview?.proposals, proposalStatuses]);

  const week = useMemo(() => weekDates(selectedDate), [selectedDate]);
  const generatedBlocks = useMemo(
    () => generateScheduleBlocksFromSkills(data.skills, week, data.scheduleBlocks || []),
    [data.skills, week, data.scheduleBlocks]
  );
  const allBlocks = useMemo(
    () => [...(data.scheduleBlocks || []), ...generatedBlocks],
    [data.scheduleBlocks, generatedBlocks]
  );
  const dayBlocks = useMemo(
    () => allBlocks.filter((b) => b.date === selectedDate).sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [allBlocks, selectedDate]
  );
  const { dayStartMinutes, dayEndMinutes } = useMemo(() => resolveScheduleDayBounds(dayBlocks), [dayBlocks]);
  const persistedScheduleIds = useMemo(() => new Set((data.scheduleBlocks || []).map((block) => block.id)), [data.scheduleBlocks]);
  const fixedDayBlocks = useMemo(() => dayBlocks.filter((block) => block.flexibility === 'fixed'), [dayBlocks]);
  const flexibleCandidates = useMemo(() => dayBlocks
    .filter((block) => block.flexibility !== 'fixed')
    .map((block) => {
      const skill = block.linkedSkillId ? data.skills.find((item) => item.id === block.linkedSkillId) : undefined;
      const explicitGoalId = block.linkedGoalId ?? skill?.categoryId ?? skill?.goalId ?? skill?.linkedGoalIds?.[0];
      const goal = explicitGoalId ? data.categories.find((item) => item.id === explicitGoalId) : undefined;
      return {
        block,
        persisted: persistedScheduleIds.has(block.id),
        preferredStartTime: block.source === 'skill_rule' ? block.startTime : undefined,
        deadlineAt: goal?.targetDate ? `${goal.targetDate}T23:59:59` : undefined,
      };
    }), [data.categories, data.skills, dayBlocks, persistedScheduleIds]);
  const openWindows = useMemo(() => (
    pendingPlan?.openWindows ?? deriveScheduleOpenWindows(dayStartMinutes, dayEndMinutes, dayBlocks)
  ), [dayBlocks, dayEndMinutes, dayStartMinutes, pendingPlan?.openWindows]);
  const openMinutes = useMemo(() => openWindows.reduce((sum, window) => sum + window.endMinutes - window.startMinutes, 0), [openWindows]);
  const overlapCount = useMemo(() => dayBlocks.filter((block) => blocksOverlap(block, dayBlocks)).length, [dayBlocks]);
  const planStatus = pendingPlan
    ? pendingPlan.unplaced.length > 0 ? 'needs_adjustment' : 'proposal'
    : dayBlocks.length === 0
      ? 'none'
      : overlapCount > 0
        ? 'needs_adjustment'
        : 'accepted';

  useEffect(() => {
    if (scheduleFixture) {
      setNowMinutes(scheduleFixture.nowMinutes);
      return undefined;
    }
    const updateNow = () => {
      const now = new Date();
      setNowMinutes(now.getHours() * 60 + now.getMinutes());
    };
    const timer = setInterval(updateNow, 30_000);
    return () => clearInterval(timer);
  }, [scheduleFixture]);

  useEffect(() => {
    setPendingPlan(null);
    setCompilerOpen(false);
  }, [selectedDate]);

  const nowInfo = useMemo(() => {
    const active = selectedDate === today()
      ? dayBlocks.find((b) => minuteOfDay(b.startTime) <= nowMinutes && nowMinutes < minuteOfDay(b.endTime))
      : undefined;
    const next = selectedDate === today()
      ? dayBlocks.find((b) => minuteOfDay(b.startTime) > nowMinutes)
      : dayBlocks[0];
    return { active, next };
  }, [dayBlocks, nowMinutes, selectedDate]);

  const openCreateBlock = () => {
    setEditingBlockId(null);
    setEditingSeedBlock(null);
    setTitle('');
    setDate(selectedDate);
    setStartTime('09:00');
    setEndTime('10:00');
    setTaskType('deep_study');
    setFlexibility('flexible');
    setRigidity('medium');
    setPlacementLocked(false);
    setLinkedGoalId(undefined);
    setLinkedSkillId(undefined);
    setNotes('');
    setPendingPlan(null);
    setCompilerOpen(false);
    setOpen(true);
  };

  const openEditBlock = (block: ScheduleBlock) => {
    const persisted = persistedScheduleIds.has(block.id);
    setEditingBlockId(persisted ? block.id : null);
    setEditingSeedBlock(block);
    setTitle(block.title);
    setDate(block.date);
    setStartTime(block.startTime);
    setEndTime(block.endTime);
    setTaskType(block.taskType);
    setFlexibility(block.flexibility);
    setRigidity(block.rigidity);
    setPlacementLocked(block.flexibility === 'fixed' ? true : block.placementLocked ?? persisted);
    setLinkedGoalId(block.linkedGoalId);
    setLinkedSkillId(block.linkedSkillId);
    setNotes(block.notes ?? '');
    setPendingPlan(null);
    setCompilerOpen(false);
    setOpen(true);
  };

  const submit = () => {
    const plannedMinutes = minutesBetween(startTime, endTime);
    if (!title.trim()) { Alert.alert(t(lang, 'enterTitle')); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { Alert.alert(t(lang, 'invalidDate')); return; }
    if (plannedMinutes <= 0) { Alert.alert(t(lang, 'invalidTimeRange')); return; }
    const input = {
      title: title.trim(),
      date,
      startTime,
      endTime,
      plannedMinutes,
      taskType,
      flexibility,
      rigidity,
      placementLocked: flexibility === 'fixed' ? true : placementLocked,
      linkedGoalId,
      linkedSkillId,
      status: editingSeedBlock?.status ?? 'planned',
      notes: notes.trim() || undefined,
      source: editingSeedBlock?.source ?? 'manual',
    } satisfies Omit<ScheduleBlock, 'id' | 'createdAt'>;
    if (editingBlockId) {
      updateScheduleBlock(editingBlockId, input);
    } else {
      addScheduleBlock(input);
    }
    setOpen(false);
    setEditingBlockId(null);
    setEditingSeedBlock(null);
    setPendingPlan(null);
    setSelectedDate(date);
    setTitle('');
    setNotes('');
  };

  const requestDeleteBlock = (block: ScheduleBlock) => {
    confirmAction({
      title: `${t(lang, 'delete')} ${block.title}`,
      message: `${block.date} · ${block.startTime}-${block.endTime}`,
      cancelText: t(lang, 'cancel'),
      confirmText: t(lang, 'delete'),
      destructive: true,
      onConfirm: () => {
        deleteScheduleBlock(block.id);
        setPendingPlan(null);
      },
    });
  };

  const openLogBlock = (block: ScheduleBlock) => {
    setLogBlock(block);
    setLogMinutes(String(block.plannedMinutes));
    setLogQuality(null);
    setLogNote('');
    setLogNewCurrentValue('');
    setLogPerformanceValue('');
    setLogPerformanceUnit('');
    setLogPerformanceNote('');
    setLogStrengthWeight('');
    setLogStrengthReps('');
    setLogStrengthSets('3');
    setLogStrengthRpe('');
    setLogStateValue('');
    setLogAmountAdded('');
    setLogNewCurrentAmount('');
    setLogBinaryCompleted(true);
    setLogQualitativeText('');
    setLogChecklistIds([]);
  };

  const submitLogBlock = () => {
    if (!logBlock) return;
    const durationMinutes = parseInt(logMinutes, 10);
    if (!durationMinutes || durationMinutes <= 0) {
      Alert.alert(t(lang, 'invalidMinutes'));
      return;
    }
    const skill = logBlock.linkedSkillId ? data.skills.find((item) => item.id === logBlock.linkedSkillId) : undefined;
    const link = skill ? (data.moduleSkillLinks || []).find((item) => item.skillId === skill.id) : undefined;
    const metricType = skill ? progressTypeForSkill(skill) : 'time_based';
    const newCurrentValue = optionalNumber(logNewCurrentValue);
    const performanceValue = optionalNumber(logPerformanceValue);
    const strengthWeight = optionalNumber(logStrengthWeight);
    const strengthReps = optionalNumber(logStrengthReps);
    const strengthSets = optionalNumber(logStrengthSets);
    const strengthRpe = optionalNumber(logStrengthRpe);
    const stateValue = optionalNumber(logStateValue);
    const amountAdded = optionalNumber(logAmountAdded);
    const newCurrentAmount = optionalNumber(logNewCurrentAmount);
    const isStrengthLog = isStrengthPredictionSkill(skill);
    const totalVolume = strengthVolume(strengthWeight, strengthReps, strengthSets);
    const strengthSet = strengthWeight != null || strengthReps != null
      ? { weight: strengthWeight, reps: strengthReps, sets: strengthSets ?? 1, rpe: strengthRpe }
      : undefined;
    const performanceUnit = logPerformanceUnit.trim() || skill?.metricConfig?.unit || (isStrengthLog ? 'kg' : undefined);
    const effectivePerformanceValue = metricType === 'performance_log'
      ? performanceValue
        ?? (skill?.metricConfig?.primaryMetric === 'volume' ? totalVolume : strengthWeight)
        ?? totalVolume
      : undefined;
    const targetValueUpdate = metricType === 'target_value'
      ? (newCurrentValue ?? (isStrengthLog ? strengthWeight : undefined))
      : undefined;
    createExecutionLog({
      date: logBlock.date,
      durationMinutes,
      title: logBlock.title,
      note: logNote.trim() || undefined,
      linkedSkillId: logBlock.linkedSkillId,
      linkedGoalId: logBlock.linkedGoalId ?? link?.goalId,
      linkedModuleId: link?.moduleId,
      linkedScheduleBlockId: logBlock.id,
      source: 'schedule_log',
      taskType: logBlock.taskType,
      qualityRating: logQuality ?? undefined,
      actualData: strengthSet ? {
        kind: 'strength_training',
        exerciseName: skill?.name ?? logBlock.title,
        strength: {
          weight: strengthWeight,
          reps: strengthReps,
          sets: strengthSets,
          rpe: strengthRpe,
          volume: totalVolume,
        },
      } : undefined,
      progressUpdate: {
        progressType: metricType,
        valueAdded: metricType === 'time_based' ? durationMinutes : metricType === 'frequency' ? 1 : undefined,
        newCurrentValue: metricType === 'target_value' ? targetValueUpdate : undefined,
        completedCurriculumItemIds: metricType === 'checklist' || metricType === 'curriculum' ? logChecklistIds : undefined,
        performanceData: metricType === 'performance_log' ? {
          performanceType: skill?.metricConfig?.performanceType,
          values: effectivePerformanceValue != null ? [{ metric: skill?.metricConfig?.primaryMetric ?? 'custom', value: effectivePerformanceValue, unit: performanceUnit }] : undefined,
          strengthSets: strengthSet ? [strengthSet] : undefined,
          totalVolume,
          notes: logPerformanceNote.trim() || logNote.trim() || undefined,
        } : undefined,
        qualitativeSummary: metricType === 'qualitative' ? logQualitativeText.trim() || undefined : undefined,
        stateValue: metricType === 'state_based' ? stateValue : undefined,
        amountAdded: metricType === 'money_based' ? amountAdded : undefined,
        newCurrentAmount: metricType === 'money_based' ? newCurrentAmount : undefined,
        completed: metricType === 'binary' ? logBinaryCompleted : undefined,
      },
      metricUpdate: {
        metricType,
        minutesAdded: metricType === 'time_based' ? durationMinutes : undefined,
        countAdded: metricType === 'frequency' ? 1 : undefined,
        newCurrentValue: metricType === 'target_value' ? targetValueUpdate : undefined,
        completedChecklistItemIds: metricType === 'checklist' || metricType === 'curriculum' ? logChecklistIds : undefined,
        performanceValue: metricType === 'performance_log' ? effectivePerformanceValue : undefined,
        performanceUnit: metricType === 'performance_log' ? performanceUnit : undefined,
        performanceNote: metricType === 'performance_log' ? logPerformanceNote.trim() || undefined : undefined,
        performanceData: metricType === 'performance_log' ? {
          performanceType: skill?.metricConfig?.performanceType,
          values: effectivePerformanceValue != null ? [{ metric: skill?.metricConfig?.primaryMetric ?? 'custom', value: effectivePerformanceValue, unit: performanceUnit }] : undefined,
          strengthSets: strengthSet ? [strengthSet] : undefined,
          totalVolume,
          notes: logPerformanceNote.trim() || logNote.trim() || undefined,
        } : undefined,
        qualityValue: metricType === 'quality_score' ? logQuality ?? undefined : undefined,
        stateValue: metricType === 'state_based' ? stateValue : undefined,
        amountAdded: metricType === 'money_based' ? amountAdded : undefined,
        newCurrentAmount: metricType === 'money_based' ? newCurrentAmount : undefined,
        markCompleted: metricType === 'binary' ? logBinaryCompleted : undefined,
        qualitativeText: metricType === 'qualitative' ? logQualitativeText.trim() || undefined : undefined,
      },
    });
    setLogBlock(null);
  };

  const canApplyScheduleProposal = (proposalId: string) => {
    const proposal = scheduleProposals.find((item) => item.id === proposalId);
    if (!proposal || proposal.status !== 'pending') return false;
    if (proposalReview?.qualityGrade === 'bad') return false;
    if (proposalReview?.qualityGrade === 'weak' && !isDecisionDebugEnabled()) return false;
    const block = proposal.blockId ? data.scheduleBlocks.find((item) => item.id === proposal.blockId) : undefined;
    const result = buildScheduleProposalPatch(proposal, block);
    if (!result.ok) return false;
    if (proposalReview?.evidenceBasis === 'population_prior' && (!proposal.blockId || proposal.reason.length < 8)) return false;
    return true;
  };

  const applyScheduleProposal = (proposalId: string) => {
    const proposal = scheduleProposals.find((item) => item.id === proposalId);
    if (!proposal || !canApplyScheduleProposal(proposalId)) {
      setProposalStatuses((current) => ({ ...current, [proposalId]: 'failed' }));
      return;
    }
    const block = proposal.blockId ? data.scheduleBlocks.find((item) => item.id === proposal.blockId) : undefined;
    const result = buildScheduleProposalPatch(proposal, block);
    if (!result.ok || !block || !result.patch) {
      setProposalStatuses((current) => ({ ...current, [proposalId]: 'failed' }));
      return;
    }
    setProposalUndo({ proposalId, block });
    updateScheduleBlock(block.id, result.patch);
    setProposalStatuses((current) => ({ ...current, [proposalId]: 'applied' }));
  };

  const dismissScheduleProposal = (proposalId: string) => {
    setProposalStatuses((current) => ({ ...current, [proposalId]: 'dismissed' }));
  };

  const undoScheduleProposal = () => {
    if (!proposalUndo) return;
    updateScheduleBlock(proposalUndo.block.id, {
      ...proposalUndo.block,
      notes: proposalUndo.block.notes,
    });
    setProposalStatuses((current) => ({ ...current, [proposalUndo.proposalId]: 'pending' }));
    setProposalUndo(null);
  };

  const compileCurrentDay = () => {
    const notBeforeMinutes = selectedDate === today()
      ? Math.min(dayEndMinutes, Math.ceil(nowMinutes / 15) * 15)
      : dayStartMinutes;
    const result = compileScheduleDay({
      date: selectedDate,
      fixedBlocks: fixedDayBlocks,
      flexibleBlocks: flexibleCandidates,
      dayStartMinutes,
      dayEndMinutes,
      notBeforeMinutes,
      mode: dayBlocks.length > 0 ? 'replan' : 'initial',
    });
    setPendingPlan(result);
    setCompilerOpen(true);
  };

  const deployPendingPlan = () => {
    if (!pendingPlan || pendingPlan.placements.length === 0 || pendingPlan.unplaced.length > 0) return;
    pendingPlan.placements.forEach((placement) => {
      const sourceBlock = placement.candidate.block;
      if (placement.candidate.persisted) {
        updateScheduleBlock(sourceBlock.id, {
          startTime: placement.startTime,
          endTime: placement.endTime,
          plannedMinutes: placement.endMinutes - placement.startMinutes,
          status: placement.changed && sourceBlock.status === 'planned' ? 'adjusted' : sourceBlock.status,
        });
        return;
      }
      const { id: _id, createdAt: _createdAt, ...input } = sourceBlock;
      addScheduleBlock({
        ...input,
        startTime: placement.startTime,
        endTime: placement.endTime,
        plannedMinutes: placement.endMinutes - placement.startMinutes,
        status: 'planned',
        placementLocked: false,
      });
    });
    setCompilerOpen(false);
    setPendingPlan(null);
  };

  const adjustPlanBlock = (blockId: string) => {
    const block = pendingPlan?.placements.find((placement) => placement.candidate.block.id === blockId)?.candidate.block
      ?? pendingPlan?.unplaced.find((item) => item.candidate.block.id === blockId)?.candidate.block
      ?? dayBlocks.find((item) => item.id === blockId);
    if (!block) return;
    setCompilerOpen(false);
    openEditBlock(block);
  };

  const planStatusKey = planStatus === 'proposal'
    ? 'schedulePlanReady'
    : planStatus === 'accepted'
      ? 'schedulePlanDeployed'
      : planStatus === 'needs_adjustment'
        ? 'schedulePlanNeedsAdjustment'
        : 'schedulePlanNotDeployed';
  const planStatusMeta = planStatus === 'proposal'
    ? scheduleCopy(lang, 'scheduleProposalCount', { count: pendingPlan?.placements.length ?? 0 })
    : planStatus === 'needs_adjustment'
      ? scheduleCopy(lang, 'scheduleAffectedCount', { count: pendingPlan?.unplaced.length ?? overlapCount })
      : `${t(lang, 'scheduleOpenCapacity')} · ${scheduleDurationLabel(lang, openMinutes)}`;
  const hasFlexibleItems = flexibleCandidates.length > 0;
  const primaryPlanLabel = pendingPlan
    ? t(lang, 'scheduleReviewPlan')
    : hasFlexibleItems
      ? t(lang, 'scheduleReplanRemaining')
      : t(lang, 'addBlock');
  const primaryPlanIcon = pendingPlan || hasFlexibleItems ? 'calendar' : 'plus';
  const runPrimaryPlanAction = pendingPlan
    ? () => setCompilerOpen(true)
    : hasFlexibleItems
      ? compileCurrentDay
      : openCreateBlock;

  return (
    <SafeAreaView nativeID="v11-schedule-screen" edges={['top']} style={[styles.safe, { backgroundColor: questTheme.colors.background }]}>
      <ScrollView
        style={[styles.container, { backgroundColor: questTheme.colors.background }]}
        contentContainerStyle={{
          paddingHorizontal: questTheme.spacing.md,
          paddingTop: questTheme.spacing.sm,
          paddingBottom: questLayout.contentBottomInset + questTheme.spacing.lg,
          maxWidth: questLayout.contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
        }}
      >
        <View style={[scheduleV3Styles.dateNavigator, { borderBottomColor: questTheme.colors.divider }]}>
          <QuestButton
            questTheme={questTheme}
            variant="ghost"
            icon="chevronLeft"
            accessibilityLabel={t(lang, 'previous')}
            onPress={() => setSelectedDate((value) => shiftScheduleDate(value, -1))}
            style={scheduleV3Styles.iconButton}
          />
          <Text style={[scheduleV3Styles.dateNavigatorLabel, { color: questTheme.colors.text }]}>{dateWithWeekday(selectedDate, lang)}</Text>
          <QuestButton
            questTheme={questTheme}
            variant="ghost"
            icon="chevronRight"
            accessibilityLabel={t(lang, 'next')}
            onPress={() => setSelectedDate((value) => shiftScheduleDate(value, 1))}
            style={scheduleV3Styles.iconButton}
          />
        </View>

        <QuestSegmentedControl
          value={view}
          options={(['day', 'week', 'month', 'year'] as const).map((value) => ({ value, label: t(lang, value) }))}
          onChange={setView}
          questTheme={questTheme}
          accessibilityLabel={t(lang, 'schedule')}
          style={styles.switcher}
        />

        {view === 'day' ? (
          <>
            <View style={[scheduleV3Styles.planStatusSurface, { backgroundColor: questTheme.colors.surfaceElevated, borderColor: questTheme.colors.cardBorder }]}>
              <View style={scheduleV3Styles.planStatusTopRow}>
                <Text style={[scheduleV3Styles.planStatusEyebrow, { color: questTheme.colors.textMuted }]}>{t(lang, 'schedulePlan')}</Text>
                <QuestPill
                  questTheme={questTheme}
                  variant={planStatus === 'accepted' ? 'success' : planStatus === 'needs_adjustment' ? 'warning' : planStatus === 'proposal' ? 'default' : 'muted'}
                  label={planStatus === 'proposal'
                    ? t(lang, 'scheduleProposed')
                    : planStatus === 'accepted'
                      ? t(lang, 'scheduleAccepted')
                      : planStatus === 'needs_adjustment'
                        ? t(lang, 'scheduleNeedsAdjustmentShort')
                        : t(lang, 'noSchedule')}
                />
              </View>
              <Text style={[scheduleV3Styles.planStatusTitle, { color: questTheme.colors.text }]}>{t(lang, planStatusKey)}</Text>
              <Text style={[scheduleV3Styles.planStatusMeta, { color: questTheme.colors.textMuted }]}>{planStatusMeta}</Text>

              <View style={[scheduleV3Styles.currentNextStrip, { borderTopColor: questTheme.colors.divider, borderBottomColor: questTheme.colors.divider }]}>
                <View style={scheduleV3Styles.currentNextItem}>
                  <Text style={[scheduleV3Styles.currentNextLabel, { color: questTheme.colors.textSubtle }]}>{t(lang, 'currentBlock')}</Text>
                  <Text numberOfLines={1} style={[scheduleV3Styles.currentNextValue, { color: questTheme.colors.text }]}>{nowInfo.active?.title ?? t(lang, 'noCurrentBlock')}</Text>
                </View>
                <View style={[scheduleV3Styles.currentNextDivider, { backgroundColor: questTheme.colors.divider }]} />
                <View style={scheduleV3Styles.currentNextItem}>
                  <Text style={[scheduleV3Styles.currentNextLabel, { color: questTheme.colors.textSubtle }]}>{t(lang, 'nextBlock')}</Text>
                  <Text numberOfLines={1} style={[scheduleV3Styles.currentNextValue, { color: questTheme.colors.text }]}>{nowInfo.next?.title ?? t(lang, 'noNextBlock')}</Text>
                </View>
              </View>

              <View style={scheduleV3Styles.planActions}>
                <QuestButton
                  questTheme={questTheme}
                  variant="primary"
                  icon={primaryPlanIcon}
                  label={primaryPlanLabel}
                  onPress={runPrimaryPlanAction}
                  style={scheduleV3Styles.planPrimaryAction}
                />
                {pendingPlan || hasFlexibleItems ? (
                  <QuestButton questTheme={questTheme} variant="ghost" icon="plus" label={t(lang, 'addBlock')} onPress={openCreateBlock} />
                ) : null}
              </View>
              {!hasFlexibleItems ? (
                <Text style={[scheduleV3Styles.planHelper, { color: questTheme.colors.textMuted }]}>
                  {dayBlocks.length === 0 ? t(lang, 'scheduleAddBeforeCompile') : t(lang, 'scheduleNoFlexibleItems')}
                </Text>
              ) : null}
            </View>

            <View style={scheduleV3Styles.timelineLegend}>
              <View style={scheduleV3Styles.legendItem}>
                <QuestIcon name="lock" size={16} color={questTheme.colors.borderStrong} />
                <Text style={[scheduleV3Styles.legendText, { color: questTheme.colors.textMuted }]}>{t(lang, 'scheduleFixed')}</Text>
              </View>
              <View style={scheduleV3Styles.legendItem}>
                <QuestIcon name="unlock" size={16} color={questTheme.colors.primary} />
                <Text style={[scheduleV3Styles.legendText, { color: questTheme.colors.textMuted }]}>{t(lang, 'scheduleFlexible')}</Text>
              </View>
              <Text style={[scheduleV3Styles.timelineHint, { color: questTheme.colors.textSubtle }]}>{t(lang, 'scheduleTapBlockToEdit')}</Text>
            </View>

            <ScheduleDayTimeline
              blocks={dayBlocks}
              proposalPlacements={pendingPlan?.placements}
              dayStartMinutes={dayStartMinutes}
              dayEndMinutes={dayEndMinutes}
              nowMinutes={selectedDate === today() ? nowMinutes : undefined}
              language={lang}
              questTheme={questTheme}
              skills={data.skills}
              modules={data.modules || []}
              goals={data.categories}
              moduleSkillLinks={data.moduleSkillLinks || []}
              onBlockPress={(block, proposed) => proposed ? setCompilerOpen(true) : openEditBlock(block)}
            />

            {scheduleProposals.length > 0 ? (
              <>
                <QuestSectionHeader
                  questTheme={questTheme}
                  title={t(lang, 'reviewScheduleProposal')}
                  subtitle={t(lang, 'confirmBeforeApply')}
                  style={styles.scheduleSectionHeader}
                />
                <ScheduleProposalReview
                  questTheme={questTheme}
                  language={lang}
                  proposals={scheduleProposals}
                  scheduleBlocks={data.scheduleBlocks}
                  canApply={canApplyScheduleProposal}
                  onApply={applyScheduleProposal}
                  onDismiss={dismissScheduleProposal}
                  canUndo={!!proposalUndo}
                  onUndo={undoScheduleProposal}
                />
              </>
            ) : null}
          </>
        ) : view === 'week' ? (
          <WeekInstrument
            dates={week}
            blocks={allBlocks}
            selectedDate={selectedDate}
            lang={lang}
            questTheme={questTheme}
            onSelect={(nextDate) => { setSelectedDate(nextDate); setView('day'); }}
          />
        ) : view === 'month' ? (
          <MonthInstrument
            baseDate={selectedDate}
            blocks={allBlocks}
            lang={lang}
            questTheme={questTheme}
            onSelect={(nextDate) => { setSelectedDate(nextDate); setView('day'); }}
          />
        ) : (
          <YearInstrument
            baseDate={selectedDate}
            blocks={allBlocks}
            lang={lang}
            questTheme={questTheme}
            onSelect={(nextDate) => { setSelectedDate(nextDate); setView('month'); }}
          />
        )}
      </ScrollView>

      <SchedulePlanCompilerSheet
        visible={compilerOpen}
        plan={pendingPlan}
        language={lang}
        questTheme={questTheme}
        onClose={() => setCompilerOpen(false)}
        onDeploy={deployPendingPlan}
        onAdjust={adjustPlanBlock}
      />

      <BottomSheetForm visible={open} onClose={() => { setOpen(false); setEditingBlockId(null); setEditingSeedBlock(null); }}>
        <Text style={[styles.h2, { color: questTheme.colors.text }]}>{editingBlockId ? `${t(lang, 'edit')} ${t(lang, 'schedulePlan')}` : t(lang, 'addBlock')}</Text>
        <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'title')}</Text>
        <QuestInput questTheme={questTheme} value={title} onChangeText={setTitle} placeholder={t(lang, 'scheduleTitlePlaceholder')} />
        <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'date')}</Text>
        <QuestInput questTheme={questTheme} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
        <View style={styles.timeRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'start')}</Text>
            <QuestInput questTheme={questTheme} value={startTime} onChangeText={setStartTime} placeholder="09:00" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'end')}</Text>
            <QuestInput questTheme={questTheme} value={endTime} onChangeText={setEndTime} placeholder="10:00" />
          </View>
        </View>
        <Text style={[styles.calc, { color: questTheme.colors.textMuted }]}>{t(lang, 'planned')}: {minutesBetween(startTime, endTime)}m</Text>

        <ChipGroup questTheme={questTheme} title={t(lang, 'taskType')} values={TASK_TYPES} labels={Object.fromEntries(TASK_TYPES.map((v) => [v, taskTypeLabel(lang, v)]))} value={taskType} onChange={(v) => v && setTaskType(v)} accent={accent} />
        <ChipGroup questTheme={questTheme} title={t(lang, 'flexibility')} values={FLEX} labels={Object.fromEntries(FLEX.map((v) => [v, flexibilityLabel(lang, v)]))} value={flexibility} onChange={(v) => v && setFlexibility(v)} accent={accent} />
        <ChipGroup questTheme={questTheme} title={t(lang, 'rigidity')} values={RIGID} labels={Object.fromEntries(RIGID.map((v) => [v, rigidityLabel(lang, v)]))} value={rigidity} onChange={(v) => v && setRigidity(v)} accent={accent} />
        <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'scheduleLockPlacement')}</Text>
        <QuestButton
          questTheme={questTheme}
          variant={placementLocked || flexibility === 'fixed' ? 'secondary' : 'ghost'}
          icon={placementLocked || flexibility === 'fixed' ? 'lock' : 'unlock'}
          label={placementLocked || flexibility === 'fixed' ? t(lang, 'scheduleLockPlacement') : t(lang, 'scheduleUnlockPlacement')}
          onPress={() => setPlacementLocked((value) => !value)}
          disabled={flexibility === 'fixed'}
        />
        <Text style={[styles.calc, { color: questTheme.colors.textMuted }]}>
          {flexibility === 'fixed'
            ? t(lang, 'scheduleFixedCannotMove')
            : placementLocked
              ? t(lang, 'schedulePlacementLocked')
              : t(lang, 'schedulePlacementFlexible')}
        </Text>

        <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'linkedGoalOptional')}</Text>
        <ChipGroup questTheme={questTheme} values={data.categories.map((c) => c.id)} labels={Object.fromEntries(data.categories.map((c) => [c.id, c.name]))} value={linkedGoalId} onChange={setLinkedGoalId} accent={accent} allowNone noneLabel={t(lang, 'none')} />
        <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'linkedSkillOptional')}</Text>
        <ChipGroup questTheme={questTheme} values={data.skills.map((s) => s.id)} labels={Object.fromEntries(data.skills.map((s) => [s.id, s.name]))} value={linkedSkillId} onChange={setLinkedSkillId} accent={accent} allowNone noneLabel={t(lang, 'none')} />

        <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'notes')}</Text>
        <QuestInput questTheme={questTheme} value={notes} onChangeText={setNotes} style={{ height: 70, textAlignVertical: 'top' }} multiline />
        {editingSeedBlock && persistedScheduleIds.has(editingSeedBlock.id) ? (
          <View style={styles.sheetActions}>
            <QuestButton
              questTheme={questTheme}
              variant="ghost"
              icon="play"
              label={t(lang, 'logProgress')}
              onPress={() => { setOpen(false); openLogBlock(editingSeedBlock); }}
              style={{ flex: 1 }}
            />
            <QuestButton
              questTheme={questTheme}
              variant="danger"
              label={t(lang, 'delete')}
              onPress={() => { setOpen(false); requestDeleteBlock(editingSeedBlock); }}
              style={{ flex: 1 }}
            />
          </View>
        ) : null}
        <QuestButton questTheme={questTheme} variant="primary" icon={editingBlockId ? undefined : 'plus'} label={editingBlockId ? t(lang, 'save') : t(lang, 'createBlock')} onPress={submit} style={{ marginTop: 18 }} />
      </BottomSheetForm>

      <BottomSheetForm visible={!!logBlock} onClose={() => setLogBlock(null)}>
        <Text style={[styles.h2, { color: questTheme.colors.text }]}>{t(lang, 'logProgress')}</Text>
        {logBlock ? (
          <>
            <Text style={[styles.logSheetTitle, { color: questTheme.colors.text }]}>{logBlock.title}</Text>
            <Text style={[styles.blockMeta, { color: questTheme.colors.textMuted }]}>{logBlock.startTime}-{logBlock.endTime} · {taskTypeLabel(lang, logBlock.taskType)} · {statusLabel(lang, logBlock.status)}</Text>
            <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'sessionDurationOptional')}</Text>
            <QuestInput questTheme={questTheme} value={logMinutes} onChangeText={setLogMinutes} keyboardType="number-pad" placeholder="30" />
            <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'optionalQuality')}</Text>
            <View style={styles.qualityRow}>
              {QUALITY_OPTIONS.map((q) => {
                const on = logQuality === q.value;
                return (
                  <TouchableOpacity
                    key={q.value}
                    style={[styles.qualityChip, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border }, on && { borderColor: accent, backgroundColor: questTheme.colors.primarySoft }]}
                    onPress={() => setLogQuality(on ? null : q.value)}
                    accessibilityRole="button"
                    accessibilityLabel={qualityLabel(lang, q.value)}
                    accessibilityState={{ selected: on }}
                  >
                    <Text style={[styles.qualityEmoji, { color: questTheme.colors.text }]}>{q.value}</Text>
                    <Text style={[styles.qualityText, { color: questTheme.colors.textMuted }]}>{qualityLabel(lang, q.value)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {(() => {
              const skill = logBlock.linkedSkillId ? data.skills.find((item) => item.id === logBlock.linkedSkillId) : undefined;
              const metricType = skill ? progressTypeForSkill(skill) : 'none';
              const isStrengthLog = isStrengthPredictionSkill(skill);
              const checklistItems = skill?.metricConfig?.checklistItems ?? skill?.curriculumItems ?? [];
              if (!skill) return <Text style={[styles.metricHint, { color: questTheme.colors.textMuted }]}>{t(lang, 'noNumericProgress')}</Text>;
              if (metricType === 'time_based') return <Text style={[styles.metricHint, { color: questTheme.colors.textMuted }]}>{t(lang, 'metricDescTime')}</Text>;
              if (metricType === 'target_value') {
                return (
                  <View>
                    <Text style={[styles.metricHint, { color: questTheme.colors.textMuted }]}>{t(lang, 'metricDescTarget')}</Text>
                    <Text style={[styles.blockMeta, { color: questTheme.colors.textMuted }]}>
                      {(skill.metricConfig?.currentValue ?? skill.currentValue ?? 0)}{skill.metricConfig?.unit ?? skill.unit ?? ''} / {(skill.metricConfig?.targetValue ?? skill.targetValue ?? 0)}{skill.metricConfig?.unit ?? skill.unit ?? ''}
                    </Text>
                    <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'newCurrentValue')}</Text>
                    <QuestInput questTheme={questTheme} value={logNewCurrentValue} onChangeText={setLogNewCurrentValue} keyboardType="decimal-pad" placeholder={t(lang, 'newCurrentValue')} />
                    {isStrengthLog ? (
                      <View style={styles.timeRow}>
                        <QuestInput questTheme={questTheme} value={logStrengthWeight} onChangeText={setLogStrengthWeight} keyboardType="decimal-pad" placeholder={t(lang, 'actualWorkingWeight')} style={{ flex: 1 }} />
                        <QuestInput questTheme={questTheme} value={logStrengthReps} onChangeText={setLogStrengthReps} keyboardType="number-pad" placeholder={t(lang, 'actualReps')} style={{ flex: 1 }} />
                        <QuestInput questTheme={questTheme} value={logStrengthSets} onChangeText={setLogStrengthSets} keyboardType="number-pad" placeholder={t(lang, 'actualSets')} style={{ flex: 1 }} />
                      </View>
                    ) : null}
                  </View>
                );
              }
              if (metricType === 'frequency') return <Text style={[styles.metricHint, { color: questTheme.colors.textMuted }]}>{t(lang, 'metricDescFrequency')}</Text>;
              if (metricType === 'checklist' || metricType === 'curriculum') {
                return (
                  <View>
                    <Text style={[styles.metricHint, { color: questTheme.colors.textMuted }]}>{t(lang, 'metricDescChecklist')}</Text>
                    {checklistItems.length === 0 ? <Text style={[styles.blockMeta, { color: questTheme.colors.textMuted }]}>{t(lang, 'noProgressItems')}</Text> : checklistItems.map((item) => {
                      const checked = logChecklistIds.includes(item.id);
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.checkRow}
                          onPress={() => setLogChecklistIds((ids) => checked ? ids.filter((id) => id !== item.id) : [...ids, item.id])}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: checked || item.completed }}
                          accessibilityLabel={item.title}
                        >
                          <Text style={styles.checkMark}>{checked || item.completed ? '✓' : '○'}</Text>
                          <Text style={[styles.blockMeta, { color: questTheme.colors.textMuted }]}>{item.title}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              }
              if (metricType === 'performance_log') {
                return (
                  <View>
                    <Text style={[styles.metricHint, { color: questTheme.colors.textMuted }]}>{isStrengthLog ? t(lang, 'actualPerformance') : t(lang, 'metricDescPerformance')}</Text>
                    {isStrengthLog ? (
                      <View style={styles.timeRow}>
                        <QuestInput questTheme={questTheme} value={logStrengthWeight} onChangeText={setLogStrengthWeight} keyboardType="decimal-pad" placeholder={t(lang, 'actualWorkingWeight')} style={{ flex: 1 }} />
                        <QuestInput questTheme={questTheme} value={logStrengthReps} onChangeText={setLogStrengthReps} keyboardType="number-pad" placeholder={t(lang, 'actualReps')} style={{ flex: 1 }} />
                        <QuestInput questTheme={questTheme} value={logStrengthSets} onChangeText={setLogStrengthSets} keyboardType="number-pad" placeholder={t(lang, 'actualSets')} style={{ flex: 1 }} />
                      </View>
                    ) : (
                      <>
                        <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'performanceValue')}</Text>
                        <QuestInput questTheme={questTheme} value={logPerformanceValue} onChangeText={setLogPerformanceValue} keyboardType="decimal-pad" placeholder={t(lang, 'performanceValue')} />
                      </>
                    )}
                    <QuestInput questTheme={questTheme} value={logStrengthRpe} onChangeText={setLogStrengthRpe} keyboardType="decimal-pad" placeholder={t(lang, 'actualRPE')} />
                    <QuestInput questTheme={questTheme} value={logPerformanceUnit} onChangeText={setLogPerformanceUnit} placeholder={skill.metricConfig?.unit ?? '%'} />
                    <QuestInput questTheme={questTheme} value={logPerformanceNote} onChangeText={setLogPerformanceNote} style={{ height: 60, textAlignVertical: 'top' }} multiline placeholder={t(lang, 'notes')} />
                  </View>
                );
              }
              if (metricType === 'quality_score') return <Text style={[styles.metricHint, { color: questTheme.colors.textMuted }]}>{t(lang, 'metricDescQuality')}</Text>;
              if (metricType === 'state_based') {
                return (
                  <View>
                    <Text style={[styles.metricHint, { color: questTheme.colors.textMuted }]}>{t(lang, 'metricDescState')}</Text>
                    <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'stateMetric')}</Text>
                    <QuestInput questTheme={questTheme} value={logStateValue} onChangeText={setLogStateValue} keyboardType="decimal-pad" placeholder={skill.metricConfig?.stateMetric ?? t(lang, 'stateMetric')} />
                  </View>
                );
              }
              if (metricType === 'money_based') {
                return (
                  <View>
                    <Text style={[styles.metricHint, { color: questTheme.colors.textMuted }]}>{t(lang, 'metricDescMoney')}</Text>
                    <View style={styles.timeRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'amountAdded')}</Text>
                        <QuestInput questTheme={questTheme} value={logAmountAdded} onChangeText={setLogAmountAdded} keyboardType="decimal-pad" placeholder="100" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'newCurrentAmount')}</Text>
                        <QuestInput questTheme={questTheme} value={logNewCurrentAmount} onChangeText={setLogNewCurrentAmount} keyboardType="decimal-pad" placeholder="500" />
                      </View>
                    </View>
                  </View>
                );
              }
              if (metricType === 'binary') {
                return (
                  <TouchableOpacity
                    style={styles.checkRow}
                    onPress={() => setLogBinaryCompleted((value) => !value)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: logBinaryCompleted }}
                    accessibilityLabel={t(lang, 'metricDescBinary')}
                  >
                    <Text style={styles.checkMark}>{logBinaryCompleted ? '✓' : '○'}</Text>
                    <Text style={[styles.metricHint, { color: questTheme.colors.textMuted }]}>{t(lang, 'metricDescBinary')}</Text>
                  </TouchableOpacity>
                );
              }
              if (metricType === 'qualitative') {
                return (
                  <View>
                    <Text style={[styles.metricHint, { color: questTheme.colors.textMuted }]}>{t(lang, 'metricDescQualitative')}</Text>
                    <QuestInput questTheme={questTheme} value={logQualitativeText} onChangeText={setLogQualitativeText} style={{ height: 70, textAlignVertical: 'top' }} multiline placeholder={t(lang, 'qualitativeSummary')} />
                  </View>
                );
              }
              return <Text style={[styles.metricHint, { color: questTheme.colors.textMuted }]}>{t(lang, 'noNumericProgress')}</Text>;
            })()}
            <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'notes')}</Text>
            <QuestInput questTheme={questTheme} value={logNote} onChangeText={setLogNote} style={{ height: 70, textAlignVertical: 'top' }} multiline />
            <View style={styles.sheetActions}>
              <TouchableOpacity style={[styles.saveBtn, styles.cancelBtn, { backgroundColor: questTheme.colors.surfaceSoft, borderColor: questTheme.colors.border }]} onPress={() => setLogBlock(null)}>
                <Text style={[styles.cancelText, { color: questTheme.colors.text }]}>{t(lang, 'cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: accent, flex: 1 }]} onPress={submitLogBlock}>
                <Text style={styles.saveText}>{t(lang, 'logProgress')}</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}
      </BottomSheetForm>
    </SafeAreaView>
  );
}

function WeekInstrument({ dates, blocks, selectedDate, lang, questTheme, onSelect }: {
  dates: string[];
  blocks: ScheduleBlock[];
  selectedDate: string;
  lang: 'zh' | 'en';
  questTheme: QuestTheme;
  onSelect: (date: string) => void;
}) {
  const rows = dates.map((date) => {
    const dayBlocks = blocks.filter((block) => block.date === date);
    return {
      date,
      blocks: dayBlocks,
      minutes: dayBlocks.reduce((sum, block) => sum + block.plannedMinutes, 0),
    };
  });
  const maxMinutes = Math.max(60, ...rows.map((row) => row.minutes));
  return (
    <View nativeID="v11-schedule-week-instrument" style={[styles.weekInstrument, { borderColor: questTheme.colors.border, backgroundColor: questTheme.colors.surface }]}>
      <View style={styles.weekAxis}>
        <Text style={[styles.weekAxisLabel, { color: questTheme.colors.textMuted }]}>{t(lang, 'totalPlanned')}</Text>
        <Text style={[styles.weekAxisLabel, { color: questTheme.colors.textMuted }]}>{Math.round(maxMinutes / 60)}h</Text>
      </View>
      <View style={styles.weekColumns}>
        {rows.map((row) => {
          const day = new Date(`${row.date}T00:00:00`);
          const selected = row.date === selectedDate;
          const height = row.minutes > 0 ? Math.max(6, (row.minutes / maxMinutes) * 112) : 2;
          return (
            <TouchableOpacity
              key={row.date}
              style={styles.weekColumn}
              onPress={() => onSelect(row.date)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${row.date} · ${row.blocks.length} ${t(lang, 'blocks')} · ${t(lang, 'totalPlanned')} ${row.minutes}m`}
            >
              <View style={styles.weekColumnPlot}>
                <View style={[styles.weekDensityBar, {
                  height,
                  backgroundColor: selected ? questTheme.colors.primary : questTheme.colors.textSubtle,
                  opacity: row.minutes > 0 ? 0.88 : 0.28,
                }]} />
                {row.blocks.slice(0, 4).map((block, index) => (
                  <View
                    key={block.id}
                    style={[styles.weekEventTick, {
                      bottom: Math.min(108, (minuteOfDay(block.startTime) - 6 * 60) / (18 * 60) * 108),
                      backgroundColor: block.status === 'completed' ? questTheme.colors.success : questTheme.colors.primary,
                      opacity: 1 - index * 0.16,
                    }]}
                  />
                ))}
              </View>
              <Text style={[styles.weekDayLabel, { color: selected ? questTheme.colors.primary : questTheme.colors.text }]}>
                {t(lang, WEEKDAY_FULL_KEYS[day.getDay()]).slice(0, lang === 'zh' ? 1 : 3)}
              </Text>
              <Text style={[styles.weekDayDate, { color: questTheme.colors.textMuted }]}>{row.date.slice(8)}</Text>
              <Text style={[styles.weekDayMinutes, { color: questTheme.colors.textMuted }]}>{row.minutes ? `${row.minutes}m` : '—'}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function MonthInstrument({ baseDate, blocks, lang, questTheme, onSelect }: {
  baseDate: string;
  blocks: ScheduleBlock[];
  lang: 'zh' | 'en';
  questTheme: QuestTheme;
  onSelect: (date: string) => void;
}) {
  const cells = monthCells(baseDate);
  const source = new Date(`${baseDate}T00:00:00`);
  const monthLabel = source.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'long' });
  const maxMinutes = Math.max(60, ...cells.map((cell) => blocks.filter((block) => block.date === cell.date).reduce((sum, block) => sum + block.plannedMinutes, 0)));
  const mondayFirstKeys = ['weekdayFullMon', 'weekdayFullTue', 'weekdayFullWed', 'weekdayFullThu', 'weekdayFullFri', 'weekdayFullSat', 'weekdayFullSun'];
  return (
    <View nativeID="v11-schedule-month-instrument" style={[styles.monthInstrument, { borderColor: questTheme.colors.border, backgroundColor: questTheme.colors.surface }]}>
      <View style={styles.instrumentHeader}>
        <Text style={[styles.instrumentTitle, { color: questTheme.colors.text }]}>{monthLabel}</Text>
        <Text style={[styles.instrumentMeta, { color: questTheme.colors.textMuted }]}>{t(lang, 'schedulePlan')}</Text>
      </View>
      <View style={styles.monthWeekdays}>
        {mondayFirstKeys.map((key) => (
          <Text key={key} style={[styles.monthWeekday, { color: questTheme.colors.textMuted }]}>{t(lang, key).slice(0, lang === 'zh' ? 1 : 2)}</Text>
        ))}
      </View>
      <View style={styles.monthGrid}>
        {cells.map((cell) => {
          const dayBlocks = blocks.filter((block) => block.date === cell.date);
          const minutes = dayBlocks.reduce((sum, block) => sum + block.plannedMinutes, 0);
          const density = minutes / maxMinutes;
          const isToday = cell.date === today();
          return (
            <TouchableOpacity
              key={cell.date}
              style={[styles.monthCell, {
                borderColor: isToday ? questTheme.colors.primary : questTheme.colors.border,
                opacity: cell.inMonth ? 1 : 0.38,
              }]}
              onPress={() => onSelect(cell.date)}
              accessibilityRole="button"
              accessibilityLabel={`${cell.date} · ${dayBlocks.length} ${t(lang, 'blocks')} · ${minutes}m`}
            >
              <Text style={[styles.monthDate, { color: isToday ? questTheme.colors.primary : questTheme.colors.text }]}>{Number(cell.date.slice(8))}</Text>
              <View style={[styles.monthDensityTrack, { backgroundColor: questTheme.colors.surfaceSoft }]}>
                <View style={[styles.monthDensityFill, { width: `${Math.max(0, density * 100)}%`, backgroundColor: questTheme.colors.primary }]} />
              </View>
              {dayBlocks.length > 0 ? <Text style={[styles.monthCount, { color: questTheme.colors.textMuted }]}>{dayBlocks.length}</Text> : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function YearInstrument({ baseDate, blocks, lang, questTheme, onSelect }: {
  baseDate: string;
  blocks: ScheduleBlock[];
  lang: 'zh' | 'en';
  questTheme: QuestTheme;
  onSelect: (date: string) => void;
}) {
  const year = Number(baseDate.slice(0, 4));
  const rows = Array.from({ length: 12 }, (_, month) => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    const monthBlocks = blocks.filter((block) => block.date.startsWith(prefix));
    return {
      month,
      blocks: monthBlocks,
      minutes: monthBlocks.reduce((sum, block) => sum + block.plannedMinutes, 0),
    };
  });
  const maxMinutes = Math.max(60, ...rows.map((row) => row.minutes));
  return (
    <View nativeID="v11-schedule-year-instrument" style={[styles.yearInstrument, { borderColor: questTheme.colors.border, backgroundColor: questTheme.colors.surface }]}>
      <View style={styles.instrumentHeader}>
        <Text style={[styles.instrumentTitle, { color: questTheme.colors.text }]}>{year}</Text>
        <Text style={[styles.instrumentMeta, { color: questTheme.colors.textMuted }]}>{t(lang, 'totalPlanned')}</Text>
      </View>
      <View style={styles.yearGrid}>
        {rows.map((row) => {
          const density = row.minutes / maxMinutes;
          const label = new Date(year, row.month, 1).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short' });
          return (
            <TouchableOpacity
              key={row.month}
              style={[styles.yearMonth, { borderColor: questTheme.colors.border }]}
              onPress={() => onSelect(`${year}-${String(row.month + 1).padStart(2, '0')}-01`)}
              accessibilityRole="button"
              accessibilityLabel={`${label} · ${row.blocks.length} ${t(lang, 'blocks')} · ${row.minutes}m`}
            >
              <View style={styles.yearMonthTop}>
                <Text style={[styles.yearMonthLabel, { color: questTheme.colors.text }]}>{label}</Text>
                <Text style={[styles.yearMonthMeta, { color: questTheme.colors.textMuted }]}>{row.blocks.length}</Text>
              </View>
              <View style={[styles.yearDensityTrack, { backgroundColor: questTheme.colors.surfaceSoft }]}>
                <View style={[styles.yearDensityFill, { width: `${Math.max(0, density * 100)}%`, backgroundColor: questTheme.colors.primary }]} />
              </View>
              <Text style={[styles.yearMonthMeta, { color: questTheme.colors.textMuted }]}>{row.minutes ? `${Math.round(row.minutes / 60 * 10) / 10}h` : '—'}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function ChipGroup<T extends string>({ title, values, labels, value, onChange, accent, questTheme, allowNone, noneLabel = 'None' }: {
  title?: string; values: readonly T[]; labels?: Record<string, string>; value?: T; onChange: (v: T | undefined) => void; accent: string; questTheme: QuestTheme; allowNone?: boolean; noneLabel?: string;
}) {
  return (
    <>
      {title ? <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{title}</Text> : null}
      <View style={styles.chipsRow}>
        {allowNone ? (
          <TouchableOpacity
            style={[
              styles.chip,
              { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border },
              !value && { backgroundColor: accent, borderColor: accent },
            ]}
            onPress={() => onChange(undefined)}
            accessibilityRole="button"
            accessibilityLabel={noneLabel}
            accessibilityState={{ selected: !value }}
          >
            <Text style={[styles.chipText, { color: !value ? questTheme.colors.primaryText : questTheme.colors.text }]}>{noneLabel}</Text>
          </TouchableOpacity>
        ) : null}
        {values.map((v) => {
          const on = value === v;
          return (
            <TouchableOpacity
              key={v}
              style={[
                styles.chip,
                { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border },
                on && { backgroundColor: accent, borderColor: accent },
              ]}
              onPress={() => onChange(v)}
              accessibilityRole="button"
              accessibilityLabel={labels?.[v] ?? v}
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.chipText, { color: on ? questTheme.colors.primaryText : questTheme.colors.text }]}>{labels?.[v] ?? v}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  container: { flex: 1, backgroundColor: theme.bg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  h1: { color: theme.text, fontSize: 34, fontWeight: '800' },
  h2: { color: theme.text, fontSize: 20, fontWeight: '800' },
  sub: { color: theme.textDim, marginTop: 4, maxWidth: 230 },
  addBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: theme.radius.md, ...theme.shadow },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  switcher: { marginTop: 2, marginBottom: 8 },
  dateTitle: { color: theme.text, fontSize: 18, fontWeight: '800', marginTop: 16, marginBottom: 10 },
  firstSectionHeader: { marginTop: 10 },
  nowNextGroup: { marginBottom: 2 },
  scheduleSectionHeader: { marginTop: 14 },
  jumpBtn: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 7 },
  jumpText: { fontSize: 12, fontWeight: '900' },
  empty: { color: theme.textDim, backgroundColor: theme.card, borderRadius: theme.radius.lg, padding: 14, borderWidth: 1, borderColor: theme.border, ...theme.shadow },
  emptyInline: { color: theme.textDim, fontSize: 13, marginBottom: 10 },
  timelineSurface: { position: 'relative', backgroundColor: theme.card, borderRadius: 18, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' },
  // minHeight 是空档位的下限;有日程块时内容会自然撑高,这里只收紧空档位的高度
  hourRow: { flexDirection: 'row', minHeight: 56, borderBottomWidth: 1, borderBottomColor: theme.border },
  hourLabel: { width: 58, color: theme.textDim, fontSize: 11, fontWeight: '700', paddingTop: 7, textAlign: 'center' },
  hourContent: { flex: 1, paddingVertical: 4, paddingRight: 8, gap: 4 },
  timelineBlock: { backgroundColor: theme.cardAlt, borderRadius: 4, padding: 8, borderLeftWidth: 2, borderLeftColor: theme.primary },
  blockTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  blockAction: { alignSelf: 'flex-start', marginTop: 4 },
  blockActionsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 },
  logBlockBtn: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, marginTop: 8 },
  logBlockText: { fontSize: 11, fontWeight: '900' },
  nowLine: { position: 'absolute', left: 50, right: 8, flexDirection: 'row', alignItems: 'center', zIndex: 10 },
  nowDot: { width: 8, height: 8, borderRadius: 4 },
  nowRule: { height: 2, flex: 1 },
  nowLabel: { fontSize: 10, fontWeight: '800', marginLeft: 6, backgroundColor: theme.card, paddingHorizontal: 4 },
  timeline: { gap: 10 },
  blockCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.card, borderRadius: theme.radius.lg, padding: 14, borderWidth: 1, borderColor: theme.border, ...theme.shadow },
  time: { color: theme.text, fontWeight: '800', width: 92 },
  blockTitle: { color: theme.text, fontSize: 14, fontWeight: '800', flex: 1 },
  blockMeta: { color: theme.textDim, fontSize: 11, marginTop: 3 },
  status: { color: theme.textDim, fontSize: 11, fontWeight: '800' },
  weekGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18 },
  weekDay: { width: '31.8%', minHeight: 88, backgroundColor: theme.card, borderRadius: theme.radius.lg, padding: 12, borderWidth: 1, borderColor: theme.border },
  weekDate: { color: theme.text, fontWeight: '800' },
  weekTotal: { color: theme.textDim, marginTop: 8, fontSize: 12 },
  weekBlock: { color: theme.text, marginTop: 6, fontSize: 11, fontWeight: '700' },
  weekInstrument: { marginTop: 18, borderWidth: 1, borderRadius: 18, paddingHorizontal: 10, paddingVertical: 14, overflow: 'hidden' },
  weekAxis: { minHeight: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(127,127,127,0.18)' },
  weekAxisLabel: { fontSize: 10, lineHeight: 14 },
  weekColumns: { height: 176, flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  weekColumn: { flex: 1, minWidth: 0, minHeight: 154, alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 1 },
  weekColumnPlot: { height: 116, width: '100%', alignItems: 'center', justifyContent: 'flex-end', position: 'relative' },
  weekDensityBar: { width: '46%', minWidth: 3, borderRadius: 2 },
  weekEventTick: { position: 'absolute', left: 1, right: 1, height: 1 },
  weekDayLabel: { marginTop: 7, fontSize: 10, lineHeight: 13, fontWeight: '700' },
  weekDayDate: { fontSize: 10, lineHeight: 13 },
  weekDayMinutes: { fontSize: 9, lineHeight: 12, marginTop: 1 },
  instrumentHeader: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 4 },
  instrumentTitle: { fontSize: 17, lineHeight: 22, fontWeight: '700' },
  instrumentMeta: { fontSize: 10, lineHeight: 14 },
  monthInstrument: { marginTop: 18, borderWidth: 1, borderRadius: 18, padding: 10, overflow: 'hidden' },
  monthWeekdays: { flexDirection: 'row', paddingVertical: 6 },
  monthWeekday: { width: '14.2857%', textAlign: 'center', fontSize: 10, lineHeight: 14 },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  monthCell: { width: '14.2857%', minHeight: 54, borderTopWidth: 1, paddingHorizontal: 4, paddingVertical: 5 },
  monthDate: { fontSize: 11, lineHeight: 15, fontWeight: '700' },
  monthDensityTrack: { height: 3, marginTop: 7, overflow: 'hidden' },
  monthDensityFill: { height: '100%' },
  monthCount: { fontSize: 9, lineHeight: 12, marginTop: 4 },
  yearInstrument: { marginTop: 18, borderWidth: 1, borderRadius: 18, padding: 12, overflow: 'hidden' },
  yearGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  yearMonth: { flexGrow: 1, flexBasis: '30%', minWidth: 88, minHeight: 78, borderTopWidth: 1, paddingHorizontal: 7, paddingVertical: 9 },
  yearMonthTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 },
  yearMonthLabel: { fontSize: 12, lineHeight: 16, fontWeight: '700' },
  yearMonthMeta: { fontSize: 9, lineHeight: 13 },
  yearDensityTrack: { height: 4, marginVertical: 12, overflow: 'hidden' },
  yearDensityFill: { height: '100%' },
  placeholderCard: { marginTop: 10, backgroundColor: theme.card, borderRadius: theme.radius.lg, padding: 14, borderWidth: 1, borderColor: theme.border, ...theme.shadow },
  placeholderTitle: { color: theme.text, fontSize: 18, fontWeight: '800' },
  placeholderText: { color: theme.textDim, marginTop: 8, lineHeight: 20 },
  label: { color: theme.textDim, marginTop: 14, marginBottom: 6, fontWeight: '700' },
  input: { backgroundColor: theme.card, borderRadius: theme.radius.md, padding: 12, color: theme.text, borderWidth: 1, borderColor: theme.border },
  timeRow: { flexDirection: 'row', gap: 10 },
  calc: { color: theme.textDim, marginTop: 10, fontSize: 12 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: questLayout.controlMinHeight, justifyContent: 'center', paddingHorizontal: 11, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card },
  chipText: { color: theme.text, fontSize: 12, fontWeight: '700' },
  chipTextOn: { color: '#fff' },
  saveBtn: { marginTop: 18, paddingVertical: 14, borderRadius: theme.radius.md, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '800' },
  logSheetTitle: { color: theme.text, fontSize: 16, fontWeight: '900', marginTop: 8 },
  qualityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  qualityChip: { flexGrow: 1, alignItems: 'center', borderWidth: 1, borderColor: theme.border, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 8, backgroundColor: theme.card },
  qualityEmoji: { fontSize: 18 },
  qualityText: { color: theme.textDim, fontSize: 11, fontWeight: '800', marginTop: 2 },
  metricHint: { color: theme.textDim, fontSize: 12, lineHeight: 18, marginTop: 12 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  checkMark: { color: theme.primary, fontSize: 18, fontWeight: '900', width: 22 },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border },
  cancelText: { color: theme.text, fontWeight: '800' },
});
