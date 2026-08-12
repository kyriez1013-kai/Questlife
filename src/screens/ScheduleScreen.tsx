import React, { useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { useStore } from '../store';
import {
  flexibilityLabel, getLanguage, progressTypeLabel, qualityLabel, rigidityLabel, sourceLabel, statusLabel, t, taskTypeLabel,
} from '../i18n';
import { today } from '../storage';
import { appAccent, theme } from '../theme';
import { Quality, QUALITY_OPTIONS, ScheduleBlock, TaskType } from '../types';
import BottomSheetForm from '../components/BottomSheetForm';
import { generateScheduleBlocksFromSkills } from '../scheduleAdjust';
import { formatMetricSummary, progressTypeForSkill } from '../progress';
import { getQuestTheme, questLayout, QuestTheme } from '../design/tokens';
import { systemIcons } from '../design/systemIcons';
import { getSkillSemanticIcon } from '../design/entityIcons';
import { isStrengthPredictionSkill, strengthVolume } from '../utils/prediction';
import QuestButton from '../components/ui/QuestButton';
import { QuestCompactRow, QuestContextBar, QuestGroupedSurface, QuestSectionHeader } from '../components/ui/QuestPrimitives';
import QuestEntityIcon from '../components/ui/QuestEntityIcon';
import QuestIcon from '../components/ui/QuestIcon';
import QuestInput from '../components/ui/QuestInput';
import QuestPill from '../components/ui/QuestPill';
import QuestSegmentedControl from '../components/ui/QuestSegmentedControl';
import ScheduleProposalReview from '../components/schedule/ScheduleProposalReview';
import { confirmAction } from '../utils/confirm';
import {
  buildScheduleProposalPatch,
  ScheduleProposal,
  ScheduleProposalStatus,
} from '../utils/scheduleProposal';
import { isDecisionDebugEnabled } from '../services/decisionService';
import { getV11ProductLanguage, getV11ProductThemeId } from '../v11/featureFlag';

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

const HOURS = Array.from({ length: 19 }, (_, i) => i + 6);
const WEEKDAY_FULL_KEYS = ['weekdayFullSun', 'weekdayFullMon', 'weekdayFullTue', 'weekdayFullWed', 'weekdayFullThu', 'weekdayFullFri', 'weekdayFullSat'];

function hourOf(time: string) {
  return Number(time.split(':')[0]);
}

function minuteOfDay(time: string) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

function optionalNumber(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function closestSectionHour(time: string) {
  const hour = Math.max(6, Math.min(24, hourOf(time)));
  return Math.max(6, Math.min(24, hour));
}

function currentSectionHour() {
  const h = new Date().getHours();
  return Math.max(6, Math.min(24, h));
}

function currentTimeTop() {
  const now = new Date();
  return ((now.getHours() * 60 + now.getMinutes()) - 6 * 60) / (18 * 60);
}

function dateWithWeekday(date: string, lang: 'zh' | 'en') {
  const d = new Date(`${date}T00:00:00`);
  return `${date} · ${t(lang, WEEKDAY_FULL_KEYS[d.getDay()])}`;
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
  const { data, addScheduleBlock, createExecutionLog, updateScheduleBlock, deleteScheduleBlock } = useStore();
  const route = useRoute<any>();
  const lang = getV11ProductLanguage(getLanguage(data.settings.language));
  const questTheme = getQuestTheme(getV11ProductThemeId(data.settings.selectedThemeId));
  const accent = appAccent(data.settings.accentColor ?? questTheme.colors.primary);
  const [view, setView] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [selectedDate, setSelectedDate] = useState(today());
  const [highlightHour, setHighlightHour] = useState<number | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const [open, setOpen] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(today());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [taskType, setTaskType] = useState<TaskType>('deep_study');
  const [flexibility, setFlexibility] = useState<ScheduleBlock['flexibility']>('flexible');
  const [rigidity, setRigidity] = useState<ScheduleBlock['rigidity']>('medium');
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
  const nowInfo = useMemo(() => {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const active = selectedDate === today()
      ? dayBlocks.find((b) => minuteOfDay(b.startTime) <= nowMinutes && nowMinutes < minuteOfDay(b.endTime))
      : undefined;
    const next = selectedDate === today()
      ? dayBlocks.find((b) => minuteOfDay(b.startTime) > nowMinutes)
      : dayBlocks[0];
    return { active, next };
  }, [dayBlocks, selectedDate]);

  const jumpToNow = () => {
    const hour = currentSectionHour();
    setHighlightHour(hour);
    scrollRef.current?.scrollTo({ y: 190 + HOURS.indexOf(hour) * 56, animated: true });
  };

  const openCreateBlock = () => {
    setEditingBlockId(null);
    setTitle('');
    setDate(selectedDate);
    setStartTime('09:00');
    setEndTime('10:00');
    setTaskType('deep_study');
    setFlexibility('flexible');
    setRigidity('medium');
    setLinkedGoalId(undefined);
    setLinkedSkillId(undefined);
    setNotes('');
    setOpen(true);
  };

  const openEditBlock = (block: ScheduleBlock) => {
    setEditingBlockId(block.id);
    setTitle(block.title);
    setDate(block.date);
    setStartTime(block.startTime);
    setEndTime(block.endTime);
    setTaskType(block.taskType);
    setFlexibility(block.flexibility);
    setRigidity(block.rigidity);
    setLinkedGoalId(block.linkedGoalId);
    setLinkedSkillId(block.linkedSkillId);
    setNotes(block.notes ?? '');
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
      linkedGoalId,
      linkedSkillId,
      status: 'planned',
      notes: notes.trim() || undefined,
      source: 'manual',
    } satisfies Omit<ScheduleBlock, 'id' | 'createdAt'>;
    if (editingBlockId) {
      updateScheduleBlock(editingBlockId, input);
    } else {
      addScheduleBlock(input);
    }
    setOpen(false);
    setEditingBlockId(null);
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
      onConfirm: () => deleteScheduleBlock(block.id),
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

  return (
    <SafeAreaView nativeID="v11-schedule-screen" edges={['top']} style={[styles.safe, { backgroundColor: questTheme.colors.background }]}>
      <ScrollView
        ref={scrollRef}
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
        <QuestContextBar
          questTheme={questTheme}
          primary={dateWithWeekday(selectedDate, lang)}
          secondary={t(lang, 'scheduleSubtitle')}
          trailing={<QuestButton questTheme={questTheme} variant="primary" icon="plus" label={t(lang, 'addBlock')} onPress={openCreateBlock} />}
        />

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
            <QuestSectionHeader
              questTheme={questTheme}
              title={t(lang, 'nowNext')}
              subtitle={selectedDate === today()
                ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : dateWithWeekday(selectedDate, lang)}
              trailing={selectedDate === today() ? (
                <QuestButton questTheme={questTheme} variant="ghost" icon="activity" label={t(lang, 'jumpToNow')} onPress={jumpToNow} />
              ) : undefined}
              style={styles.firstSectionHeader}
            />
            <QuestGroupedSurface questTheme={questTheme} elevated className="v11-schedule-now-next" style={styles.nowNextGroup}>
              <QuestCompactRow
                questTheme={questTheme}
                title={`${t(lang, 'currentBlock')}: ${nowInfo.active?.title ?? t(lang, 'noCurrentBlock')}`}
                body={nowInfo.active
                  ? `${nowInfo.active.startTime}-${nowInfo.active.endTime} · ${statusLabel(lang, nowInfo.active.status)}`
                  : t(lang, 'addLightTask')}
                leading={<QuestIcon name="activity" size={18} color={nowInfo.active ? questTheme.colors.primary : questTheme.colors.textMuted} />}
              />
              <QuestCompactRow
                questTheme={questTheme}
                divider
                title={`${t(lang, 'nextBlock')}: ${nowInfo.next?.title ?? t(lang, 'noNextBlock')}`}
                body={nowInfo.next
                  ? `${nowInfo.next.startTime}-${nowInfo.next.endTime} · ${nowInfo.next.plannedMinutes}m`
                  : t(lang, 'noBlocksToday')}
                leading={<QuestIcon name="calendar" size={18} color={nowInfo.next ? questTheme.colors.primary : questTheme.colors.textMuted} />}
              />
            </QuestGroupedSurface>

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

            <QuestSectionHeader
              questTheme={questTheme}
              title={t(lang, 'laterSchedule')}
              subtitle={dayBlocks.length === 0 ? t(lang, 'noBlocksToday') : `${dayBlocks.length} ${t(lang, 'blocks')}`}
              style={styles.scheduleSectionHeader}
            />
            <View nativeID="v11-schedule-day-instrument" style={[styles.timelineSurface, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border }]}>
              {selectedDate === today() && currentTimeTop() >= 0 && currentTimeTop() <= 1 ? (
                <View style={[styles.nowLine, { top: `${currentTimeTop() * 100}%` }]}>
                  <View style={[styles.nowDot, { backgroundColor: questTheme.colors.primary }]} />
                  <View style={[styles.nowRule, { backgroundColor: questTheme.colors.primary }]} />
                  <Text style={[styles.nowLabel, { color: questTheme.colors.primary, backgroundColor: questTheme.colors.surface }]}>{t(lang, 'currentTime')}</Text>
                </View>
              ) : null}
              {HOURS.map((hour) => {
                const blocks = dayBlocks.filter((b) => closestSectionHour(b.startTime) === hour);
                const highlighted = selectedDate === today() && (highlightHour ?? currentSectionHour()) === hour;
                return (
                  <View key={hour} style={[styles.hourRow, { borderBottomColor: questTheme.colors.border }, highlighted && { backgroundColor: questTheme.colors.primarySoft }]}>
                    <Text style={[styles.hourLabel, { color: questTheme.colors.textMuted }]}>{hour}:00</Text>
                    <View style={styles.hourContent}>
                      {blocks.map((b) => {
                        const skill = b.linkedSkillId ? data.skills.find((item) => item.id === b.linkedSkillId) : undefined;
                        const link = skill ? (data.moduleSkillLinks || []).find((item) => item.skillId === skill.id) : undefined;
                        const goal = (b.linkedGoalId ?? link?.goalId)
                          ? data.categories.find((item) => item.id === (b.linkedGoalId ?? link?.goalId))
                          : undefined;
                        const module = link?.moduleId ? (data.modules || []).find((item) => item.id === link.moduleId) : undefined;
                        const contextLabel = [
                          goal?.name,
                          module ? (module.id.includes('-default') ? t(lang, 'defaultModule') : module.name) : undefined,
                          skill?.name,
                        ].filter(Boolean).join(' › ');
                        const persisted = data.scheduleBlocks.some((item) => item.id === b.id);
                        const overlaps = blocksOverlap(b, dayBlocks);
                        return (
                          <View
                            key={b.id}
                            style={[
                              styles.timelineBlock,
                              {
                                minHeight: Math.max(48, Math.min(150, (b.plannedMinutes / 60) * 56)),
                                backgroundColor: questTheme.colors.surfaceSoft,
                                borderLeftColor: b.status === 'completed' ? questTheme.colors.success : questTheme.colors.primary,
                              },
                              overlaps ? { borderRightWidth: 2, borderRightColor: questTheme.colors.warning } : null,
                            ]}
                          >
                            <View style={styles.blockTitleRow}>
                              <QuestEntityIcon icon={skill?.icon} systemIcon={skill ? getSkillSemanticIcon(skill) : systemIcons.schedule} color={skill?.color} questTheme={questTheme} size="sm" />
                              <Text style={[styles.blockTitle, { color: questTheme.colors.text }]} numberOfLines={2}>{b.title}</Text>
                              <QuestPill
                                questTheme={questTheme}
                                variant={b.status === 'completed' ? 'success' : 'muted'}
                                label={statusLabel(lang, b.status)}
                              />
                              {overlaps ? <QuestPill questTheme={questTheme} variant="warning" label={t(lang, 'scheduleOverlap')} /> : null}
                            </View>
                            <Text style={[styles.blockMeta, { color: questTheme.colors.textMuted }]}>
                              {b.startTime}-{b.endTime} · {b.plannedMinutes}m
                            </Text>
                            <Text style={[styles.blockMeta, { color: questTheme.colors.textMuted }]} numberOfLines={2}>
                              {contextLabel || t(lang, 'manualBlock')}
                            </Text>
                            <View style={styles.blockActionsRow}>
                              <QuestButton questTheme={questTheme} variant="ghost" icon="play" label={t(lang, 'logProgress')} onPress={() => openLogBlock(b)} style={styles.blockAction} />
                              {persisted ? (
                                <>
                                  <QuestButton questTheme={questTheme} variant="ghost" label={t(lang, 'edit')} onPress={() => openEditBlock(b)} style={styles.blockAction} />
                                  <QuestButton questTheme={questTheme} variant="ghost" label={t(lang, 'delete')} onPress={() => requestDeleteBlock(b)} style={styles.blockAction} />
                                </>
                              ) : null}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
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

      <BottomSheetForm visible={open} onClose={() => { setOpen(false); setEditingBlockId(null); }}>
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

        <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'linkedGoalOptional')}</Text>
        <ChipGroup questTheme={questTheme} values={data.categories.map((c) => c.id)} labels={Object.fromEntries(data.categories.map((c) => [c.id, c.name]))} value={linkedGoalId} onChange={setLinkedGoalId} accent={accent} allowNone noneLabel={t(lang, 'none')} />
        <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'linkedSkillOptional')}</Text>
        <ChipGroup questTheme={questTheme} values={data.skills.map((s) => s.id)} labels={Object.fromEntries(data.skills.map((s) => [s.id, s.name]))} value={linkedSkillId} onChange={setLinkedSkillId} accent={accent} allowNone noneLabel={t(lang, 'none')} />

        <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'notes')}</Text>
        <QuestInput questTheme={questTheme} value={notes} onChangeText={setNotes} style={{ height: 70, textAlignVertical: 'top' }} multiline />
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
