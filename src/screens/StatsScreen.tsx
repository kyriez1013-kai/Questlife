// V2.3: "数据" Tab
// 顺序:
//   1. 顶部 stats (累计分钟 / 累计小时 / 活跃天数 / 连续记录 / 本周达标天数)
//   2. 📈 本周平均状态  (existing)
//   3. 📊 近 7 天        (新, 柱状图)
//   4. 🔍 本周规律        (新, 文字洞察)
//   5. 🥇 本周技能分配    (新, 占比列表)
//   6. 🎯 技能雷达        (保留)
//   7. 🔥 近 8 周热力图   (从 16 周缩到 8 周, 移到最底)
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Rect } from 'react-native-svg';
import { useStore } from '../store';
import { theme } from '../theme';
import { DashboardCardSize, PatternMemory, Skill } from '../types';
import { getLanguage, progressTypeLabel, t, taskTypeLabel } from '../i18n';
import { getAppCoreLoopStatus } from '../utils/coreLoop';
import { trackEvent } from '../utils/analytics';
import { getQuestTheme, questLayout } from '../design/tokens';
import { useQuestTheme } from '../design/useQuestTheme';
import QuestCard from '../components/ui/QuestCard';
import QuestEntityIcon from '../components/ui/QuestEntityIcon';
import { getSkillSemanticIcon } from '../design/entityIcons';
import { generateInsightsSummary, InsightsSummaryResult } from '../utils/insightsEngine';
import { InsightCardsBlock } from './StatsScreenInsights';
import { displayEntityName } from '../utils/displayName';
import { buildMetacognitionSummary, getLiveExecutionLogs, MetacognitionSummary } from '../utils/metacognition';
import { buildObjectiveContextBrief, ObjectiveContextBrief } from '../utils/objectiveContextBrief';
import DashboardCardShell from '../components/dashboard/DashboardCardShell';
import {
  QuestGroupedSurface,
  QuestContextBar,
  QuestSectionHeader,
} from '../components/ui/QuestPrimitives';
import QuestSegmentedControl from '../components/ui/QuestSegmentedControl';

const FIXED_INSIGHTS_CARD_SIZES: Record<string, DashboardCardSize> = {
  main_judgement: 'large',
  advanced_signals: 'large',
};

const FIXED_INSIGHTS_CARD_ORDER: Record<string, number> = {
  main_judgement: 10,
  advanced_signals: 90,
};

const WEEKDAY_KEYS = ['weekdaySun', 'weekdayMon', 'weekdayTue', 'weekdayWed', 'weekdayThu', 'weekdayFri', 'weekdaySat'];

const fmtDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function StatsScreen() {
  const {
    data,
  } = useStore();
  const [insightsView, setInsightsView] = useState<'overview' | 'trends' | 'patterns' | 'advanced'>('overview');
  const lang = getLanguage(data.settings.language);
  const questTheme = useQuestTheme(data.settings.selectedThemeId);
  const accent = questTheme.colors.primary;
  const logs = useMemo(() => getLiveExecutionLogs(data.executionLogs || [], { skills: data.skills }), [data.executionLogs, data.skills]);
  const timeLogs = useMemo(() => logs.filter((log) => (log.durationMinutes ?? 0) > 0), [logs]);
  const appLoop = useMemo(() => getAppCoreLoopStatus({ ...data, executionLogs: logs }, lang), [data, logs, lang]);
  useEffect(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const weekStartStr = fmtDate(weekStart);
    trackEvent('insights_opened', {
      logsThisWeek: logs.filter((log) => log.date >= weekStartStr).length,
      skillsCount: data.skills.length,
      goalsCount: data.categories.length,
    }, { page: 'insights' });
  }, [data.categories.length, data.skills.length, logs]);

  // ───────── 近 7 天聚合 (含今天) ─────────
  const last7 = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days: {
      date: string;
      label: string;     // 周X
      dayNum: number;    // 日期数字 1-31
      minutes: number;
      avgQuality: number | null;
    }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const ds = fmtDate(d);
      const dayActions = logs.filter((a) => a.date === ds);
      const dayTimeActions = timeLogs.filter((a) => a.date === ds);
      const minutes = dayTimeActions.reduce((s, a) => s + (a.durationMinutes ?? 0), 0);
      const rated = dayActions.filter((a) => a.qualityRating != null);
      const avgQuality = rated.length > 0
        ? rated.reduce((s, a) => s + (a.qualityRating as number), 0) / rated.length
        : null;
      days.push({
        date: ds,
        label: t(lang, WEEKDAY_KEYS[d.getDay()]),
        dayNum: d.getDate(),
        minutes,
        avgQuality,
      });
    }
    return days;
  }, [logs, timeLogs, lang]);

  // ───────── 本周平均状态 (过去 7 天) ─────────
  const weeklyQuality = useMemo(() => {
    const ratedInWindow = logs.filter((a) => {
      if (a.qualityRating == null) return false;
      return last7.some((d) => d.date === a.date);
    });
    if (ratedInWindow.length === 0) return null;
    const sum = ratedInWindow.reduce((s, a) => s + (a.qualityRating as number), 0);
    return { avg: sum / ratedInWindow.length, count: ratedInWindow.length };
  }, [logs, last7]);

  // ───────── 本周规律洞察 ─────────
  const insight = useMemo(() => {
    const daysWithData = last7.filter((d) => d.minutes > 0);
    if (daysWithData.length < 3) {
      return { locked: true as const, daysHave: daysWithData.length };
    }
    const totalMin = last7.reduce((s, d) => s + d.minutes, 0);
    const best = last7.reduce((p, c) => (c.minutes > p.minutes ? c : p));
    return {
      locked: false as const,
      bestLabel: lang === 'zh' ? `周${best.label}` : best.label,
      bestMinutes: best.minutes,
      avgPerDay: Math.round(totalMin / 7),
    };
  }, [last7, lang]);

  // ───────── 本周技能分配 ─────────
  const weeklySkillShare = useMemo(() => {
    const dates = new Set(last7.map((d) => d.date));
    const skillIds = new Set(data.skills.map((skill) => skill.id));
    const inWindow = timeLogs.filter((a) => dates.has(a.date) && a.linkedSkillId && skillIds.has(a.linkedSkillId));
    const totalMin = inWindow.reduce((s, a) => s + (a.durationMinutes ?? 0), 0);
    if (totalMin === 0) return null;
    const bySkill = new Map<string, number>();
    inWindow.forEach((a) => {
      const sid = a.linkedSkillId;
      if (!sid) return;
      bySkill.set(sid, (bySkill.get(sid) ?? 0) + (a.durationMinutes ?? 0));
    });
    const rows = (Array.from(bySkill.entries())
      .map(([sid, min]) => {
        const skill = data.skills.find((s) => s.id === sid);
        return { skill, label: displayEntityName(skill?.name ?? sid, lang), icon: skill?.icon, color: skill?.color ?? accent, minutes: min, percent: min / totalMin };
      }) as { skill?: Skill; label: string; icon?: string; color: string; minutes: number; percent: number }[]);
    rows.sort((a, b) => b.minutes - a.minutes);
    return { rows, totalMin };
  }, [timeLogs, data.skills, last7, lang, accent]);

  const selfKnowledge = useMemo(() => {
    const predicted = logs.filter((log) => log.predictedDurationMinutes != null && log.durationMinutes != null);
    if (predicted.length < 3) return null;
    const durationError = predicted.reduce((sum, log) => sum + Math.abs((log.durationMinutes ?? 0) - (log.predictedDurationMinutes ?? 0)), 0) / predicted.length;
    const qualityLogs = logs.filter((log) => log.predictedQualityRating != null && log.qualityRating != null);
    const qualityError = qualityLogs.length > 0
      ? qualityLogs.reduce((sum, log) => sum + Math.abs((log.qualityRating ?? 0) - (log.predictedQualityRating ?? 0)), 0) / qualityLogs.length
      : null;
    const level = durationError > 30
      ? t(lang, 'cognitiveBeginner')
      : durationError > 15
        ? t(lang, 'fuzzySignal')
        : durationError > 8
          ? t(lang, 'gettingClearer')
          : t(lang, 'flowCalibration');
    const weekMap = new Map<string, { total: number; count: number }>();
    predicted.forEach((log) => {
      const d = new Date(`${log.date}T00:00:00`);
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const key = fmtDate(d);
      const row = weekMap.get(key) ?? { total: 0, count: 0 };
      row.total += Math.abs((log.durationMinutes ?? 0) - (log.predictedDurationMinutes ?? 0));
      row.count += 1;
      weekMap.set(key, row);
    });
    const weeks = Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([week, row]) => ({ week, error: row.count > 0 ? row.total / row.count : 0 }));
    return { durationError, qualityError, level, weeks };
  }, [logs, lang]);

  const rescueStats = useMemo(() => {
    const rescueLogs = data.rescueLogs || [];
    const dates = new Set(last7.map((d) => d.date));
    const thisWeek = rescueLogs.filter((log) => dates.has(log.date));
    const completed = thisWeek.filter((log) => log.activationStepCompleted).length;
    const latest = rescueLogs.slice().sort((a, b) => (b.startedAt || '').localeCompare(a.startedAt || ''))[0];
    const triggerCounts = new Map<string, number>();
    thisWeek.forEach((log) => {
      const trigger = log.triggerType ?? 'unknown';
      triggerCounts.set(trigger, (triggerCounts.get(trigger) ?? 0) + 1);
    });
    const topTrigger = Array.from(triggerCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
    return {
      total: thisWeek.length,
      completed,
      completionRate: thisWeek.length > 0 ? Math.round((completed / thisWeek.length) * 100) : 0,
      latest,
      topTrigger,
    };
  }, [data.rescueLogs, last7]);

  const weeklyTaskTypeShare = useMemo(() => {
    const dates = new Set(last7.map((d) => d.date));
    const inWindow = timeLogs.filter((a) => dates.has(a.date));
    const totalMin = inWindow.reduce((s, a) => s + (a.durationMinutes ?? 0), 0);
    if (totalMin === 0) return null;
    const byType = new Map<string, number>();
    inWindow.forEach((log) => {
      const skill = log.linkedSkillId ? data.skills.find((s) => s.id === log.linkedSkillId) : undefined;
      const type = log.taskType ?? skill?.taskType ?? 'deep_study';
      byType.set(type, (byType.get(type) ?? 0) + (log.durationMinutes ?? 0));
    });
    return {
      rows: Array.from(byType.entries()).map(([type, minutes]) => ({ type, minutes, percent: minutes / totalMin })).sort((a, b) => b.minutes - a.minutes),
      totalMin,
    };
  }, [timeLogs, data.skills, last7]);

  const weeklyMetricShare = useMemo(() => {
    const dates = new Set(last7.map((d) => d.date));
    const inWindow = timeLogs.filter((a) => dates.has(a.date));
    const totalMin = inWindow.reduce((s, a) => s + (a.durationMinutes ?? 0), 0);
    if (inWindow.length === 0) return null;
    const byMetric = new Map<string, { minutes: number; count: number }>();
    inWindow.forEach((log) => {
      const skill = log.linkedSkillId ? data.skills.find((s) => s.id === log.linkedSkillId) : undefined;
      const metric = log.metricUpdate?.metricType ?? log.progressUpdate?.progressType ?? skill?.metricConfig?.metricType ?? skill?.progressType ?? 'none';
      const row = byMetric.get(metric) ?? { minutes: 0, count: 0 };
      row.minutes += log.durationMinutes ?? 0;
      row.count += 1;
      byMetric.set(metric, row);
    });
    return Array.from(byMetric.entries())
      .map(([metric, row]) => ({ metric, ...row, percent: totalMin > 0 ? row.minutes / totalMin : 0 }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [timeLogs, data.skills, last7]);

  // ───────── 本周达标天数 ─────────
  const weeklyHitDays = useMemo(() => {
    let n = 0;
    for (const d of last7) {
      const hit = data.skills.some((sk) => {
        if (sk.dailyTargetMinutes <= 0) return false;
        const sumThisDay = timeLogs
          .filter((a) => a.date === d.date && a.linkedSkillId === sk.id)
          .reduce((s, a) => s + (a.durationMinutes ?? 0), 0);
        return sumThisDay >= sk.dailyTargetMinutes;
      });
      if (hit) n++;
    }
    return n;
  }, [timeLogs, data.skills, last7]);

  // ───────── 8 周热力图 (8x7 = 56 天) ─────────
  const heat = useMemo(() => {
    const days = 56;
    const map = new Map<string, number>();
    timeLogs.forEach((a) => map.set(a.date, (map.get(a.date) ?? 0) + (a.durationMinutes ?? 0)));
    const cells: { date: string; value: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const ds = fmtDate(d);
      cells.push({ date: ds, value: map.get(ds) ?? 0 });
    }
    return cells;
  }, [timeLogs]);

  // ───────── 顶部 stats ─────────
  const totalMin = timeLogs.reduce((s, a) => s + (a.durationMinutes ?? 0), 0);
  const activeDays = new Set(logs.map((a) => a.date)).size;
  const streak = useMemo(() => {
    const set = new Set(logs.map((a) => a.date));
    let n = 0;
    const d = new Date();
    while (true) {
      const ds = fmtDate(d);
      if (set.has(ds)) {
        n++;
        d.setDate(d.getDate() - 1);
      } else {
        if (n === 0) {
          d.setDate(d.getDate() - 1);
          if (set.has(fmtDate(d))) continue;
        }
        break;
      }
    }
    return n;
  }, [logs]);

  // ── 新增：引擎分析结果（不影响现有卡片）─────────────────────────────────
  const engineInsights = useMemo(
    (): InsightsSummaryResult => generateInsightsSummary(
      timeLogs,
      data.stateCheckIns || [],
      data.skills,
    ),
    [timeLogs, data.stateCheckIns, data.skills],
  );
  const dataHealthLevel = logs.length >= 20 && activeDays >= 7
    ? 'high'
    : logs.length >= 7 || activeDays >= 3
      ? 'medium'
      : 'low';
  const dataHealthLabelKey = dataHealthLevel === 'high'
    ? 'confidenceHigh'
    : dataHealthLevel === 'medium'
      ? 'confidenceMedium'
      : 'confidenceLow';
  const dataHealthColor = dataHealthLevel === 'high'
    ? questTheme.colors.success
    : dataHealthLevel === 'medium'
      ? questTheme.colors.warning
      : questTheme.colors.textSubtle;
  const metacognition = useMemo(() => buildMetacognitionSummary({
    executionLogs: logs,
    stateCheckIns: data.stateCheckIns || [],
    skills: data.skills,
    goals: data.categories,
    contextLogs: data.contextLogs || [],
  }), [data.categories, data.contextLogs, data.skills, data.stateCheckIns, logs]);
  const objectiveContextBrief = useMemo(
    () => buildObjectiveContextBrief(data.contextLogs || []),
    [data.contextLogs],
  );
  const patternMemoryGroups = useMemo(() => {
    const byRecency = (a: PatternMemory, b: PatternMemory) => (
      (b.lastSeenAt || b.updatedAt || '').localeCompare(a.lastSeenAt || a.updatedAt || '')
    );
    const patterns = data.patternMemory || [];
    return {
      accepted: patterns.filter((pattern) => pattern.status === 'accepted').sort(byRecency),
      candidate: patterns.filter((pattern) => pattern.status === 'candidate').sort(byRecency),
      archived: patterns.filter((pattern) => pattern.status === 'archived').sort(byRecency),
    };
  }, [data.patternMemory]);
  const hasStateTrendEvidence = metacognition.stateTrend.direction !== 'unknown';
  const hasStatePatternEvidence = metacognition.statePatterns.status === 'ok' && metacognition.statePatterns.patterns.length > 0;
  const hasBodyContextEvidence = objectiveContextBrief.status !== 'empty';
  const hasBehaviorEvidence = metacognition.behaviorLinks.length > 0;
  const trendSampleCount = timeLogs.filter((log) => last7.some((day) => day.date === log.date)).length;
  const trendActiveDays = last7.filter((day) => day.minutes > 0).length;
  const hasComparableTrend = trendSampleCount >= 3 && trendActiveDays >= 3;
  const trendRange = `${last7[0]?.date ?? ''} – ${last7[last7.length - 1]?.date ?? ''}`;
  const advancedSignalCount = [
    engineInsights.abilityRadar.status === 'ok',
    engineInsights.tomorrowPrediction.status === 'ok',
    engineInsights.monthlyTrend.status === 'ok',
    engineInsights.growthCurve.status === 'ok',
    engineInsights.anomalies.status === 'ok' && engineInsights.anomalies.anomalies.length > 0,
    engineInsights.combination.status === 'ok',
    !!selfKnowledge,
  ].filter(Boolean).length;
  const hasAdvancedEvidence = advancedSignalCount > 0
    || hasComparableTrend
    || rescueStats.total > 0;
  const mainInsight = useMemo(() => {
    if (metacognition.status === 'ok') {
      return {
        titleKey: metacognition.currentPattern.titleKey,
        bodyKey: metacognition.currentPattern.bodyKey,
        nextKey: metacognition.currentPattern.nextActionKey,
        confidence: metacognition.currentPattern.confidence,
        sourceKey: 'evidenceFromPatterns',
      };
    }
    const topPattern = metacognition.statePatterns.patterns[0];
    if (topPattern) {
      return {
        titleKey: topPattern.labelKey,
        titleValues: topPattern.labelValues,
        bodyKey: topPattern.evidenceKey,
        bodyValues: topPattern.evidenceValues,
        nextKey: topPattern.nextActionKey,
        nextValues: topPattern.nextActionValues,
        confidence: topPattern.confidence,
        sourceKey: 'evidenceFromPatterns',
      };
    }
    if (objectiveContextBrief.status !== 'empty') {
      return {
        titleKey: 'bodyContext',
        bodyKey: objectiveContextBrief.cognitiveLoadSuggestionKey,
        nextKey: objectiveContextBrief.recommendedActionKey,
        confidence: objectiveContextBrief.confidence,
        sourceKey: 'evidenceFromContext',
      };
    }
    if (logs.length > 0) {
      return {
        titleKey: 'evidenceFromRecentExecution',
        bodyKey: 'recentFeedbackEvidence',
        nextKey: 'continueOneMoreRecord',
        confidence: dataHealthLevel,
        sourceKey: 'evidenceFromRecentExecution',
      };
    }
    return {
      titleKey: 'dataStillAccumulating',
      bodyKey: 'notEnoughForDetailedInsights',
      nextKey: 'recordBeforeAfterAction',
      confidence: 'low' as const,
      sourceKey: 'oneClearJudgement',
    };
  }, [dataHealthLevel, logs.length, metacognition, objectiveContextBrief]);
  const mainInsightColor = mainInsight.confidence === 'high'
    ? questTheme.colors.success
    : mainInsight.confidence === 'medium'
      ? questTheme.colors.warning
      : questTheme.colors.textSubtle;
  const overviewEvidence = useMemo(() => {
    const rows: { id: string; source: string; detail: string }[] = [];
    if (hasStateTrendEvidence) {
      rows.push({
        id: 'state-trend',
        source: t(lang, 'evidenceFromState'),
        detail: t(lang, trendLabelKey(metacognition.stateTrend.direction)),
      });
    }
    const topPattern = metacognition.statePatterns.patterns[0];
    if (topPattern) {
      rows.push({
        id: `state-pattern-${topPattern.id}`,
        source: t(lang, 'evidenceFromPatterns'),
        detail: applyValues(t(lang, topPattern.evidenceKey), topPattern.evidenceValues),
      });
    }
    if (hasBodyContextEvidence) {
      rows.push({
        id: 'body-context',
        source: t(lang, 'evidenceFromContext'),
        detail: t(lang, objectiveContextBrief.cognitiveLoadSuggestionKey),
      });
    }
    const behaviorLink = metacognition.behaviorLinks[0];
    if (behaviorLink) {
      rows.push({
        id: `behavior-${behaviorLink.label}-${behaviorLink.evidence}`,
        source: t(lang, 'evidenceFromRecentExecution'),
        detail: `${behaviorLink.label} · ${t(lang, 'associatedNotCausal')}`,
      });
    }
    return rows.slice(0, 3);
  }, [
    hasBodyContextEvidence,
    hasStateTrendEvidence,
    lang,
    metacognition.behaviorLinks,
    metacognition.statePatterns.patterns,
    metacognition.stateTrend.direction,
    objectiveContextBrief.cognitiveLoadSuggestionKey,
  ]);
  const insightsCardVisible = (_cardId: string) => true;
  const insightsCardSize = (cardId: keyof typeof FIXED_INSIGHTS_CARD_SIZES) => FIXED_INSIGHTS_CARD_SIZES[cardId];
  const insightsCardWrapperStyle = (cardId: string) => {
    const size = FIXED_INSIGHTS_CARD_SIZES[cardId as keyof typeof FIXED_INSIGHTS_CARD_SIZES] ?? 'large';
    return {
      width: '100%',
      flexBasis: '100%',
      maxWidth: '100%',
      flexGrow: size === 'large' ? 1 : 0,
      order: FIXED_INSIGHTS_CARD_ORDER[cardId as keyof typeof FIXED_INSIGHTS_CARD_SIZES] ?? 500,
      marginTop: size === 'small' ? questTheme.spacing.xxs : questTheme.spacing.xs,
    } as any;
  };
  const insightsDashboardShellProps = (cardId: string) => {
    const size = FIXED_INSIGHTS_CARD_SIZES[cardId as keyof typeof FIXED_INSIGHTS_CARD_SIZES] ?? 'large';
    return ({
    surface: 'insights' as const,
    card: {
      id: cardId,
      surface: 'insights' as const,
      titleKey: cardId,
      descriptionKey: cardId,
      domainTags: [],
      defaultSize: size,
      allowedSizes: [size],
      defaultVisible: true,
      priority: FIXED_INSIGHTS_CARD_ORDER[cardId as keyof typeof FIXED_INSIGHTS_CARD_SIZES] ?? 500,
    },
    preference: { cardId, visible: true, order: FIXED_INSIGHTS_CARD_ORDER[cardId as keyof typeof FIXED_INSIGHTS_CARD_SIZES] ?? 500, size },
    editMode: false,
    selected: false,
    questTheme,
    language: lang,
    style: insightsCardWrapperStyle(cardId),
    });
  };
  const mainJudgementCardSize = insightsCardSize('main_judgement');
  const advancedSignalsCardSize = insightsCardSize('advanced_signals');
  const TileGrid = View as any;

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: questTheme.colors.background }]}>
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
        <QuestContextBar
          questTheme={questTheme}
          primary={t(lang, 'last7Days')}
          secondary={`${logs.length} ${t(lang, 'logsToday')} · ${activeDays} ${t(lang, 'activeDays')}`}
          trailing={<View style={[styles.dataHealthPill, { borderColor: dataHealthColor, backgroundColor: dataHealthColor + '22' }]}>
            <Text style={[styles.dataHealthText, { color: dataHealthColor }]}>{t(lang, 'dataHealth')}: {t(lang, dataHealthLabelKey)}</Text>
          </View>}
        />

        <QuestSegmentedControl
          value={insightsView}
          options={(['overview', 'trends', 'patterns', 'advanced'] as const).map((value) => ({
            value,
            label: t(lang, `insights_${value}`),
          }))}
          onChange={setInsightsView}
          questTheme={questTheme}
          accessibilityLabel={t(lang, 'insights')}
          style={styles.insightsTabs}
        />

        <TileGrid
          nativeID="insights-dashboard-grid"
          className="dashboard-tile-grid insights-dashboard-tile-grid"
          style={styles.dashboardTileGrid}
        >

        {insightsView === 'overview' && insightsCardVisible('main_judgement') ? (
        <DashboardCardShell {...insightsDashboardShellProps('main_judgement')}>
        <QuestCard
          questTheme={questTheme}
          variant="hero"
          style={[styles.primaryPanel, {
            backgroundColor: questTheme.colors.surfaceElevated,
            borderColor: questTheme.colors.borderStrong,
            borderLeftWidth: 4,
            borderLeftColor: mainInsightColor,
          }]}
          className="insight-card metacognition-summary-card"
        >
          <View style={styles.primaryHeader}>
            <Text style={[styles.decisionKicker, { color: questTheme.colors.textMuted, flex: 1 }]}>{t(lang, 'mainInsight')}</Text>
            <View style={[styles.dataHealthPill, { borderColor: mainInsightColor, backgroundColor: mainInsightColor + '22' }]}>
              <Text style={[styles.dataHealthText, { color: mainInsightColor }]}>{t(lang, mainInsight.confidence === 'high' ? 'confidenceHigh' : mainInsight.confidence === 'medium' ? 'confidenceMedium' : 'confidenceLow')}</Text>
            </View>
          </View>
          <Text style={[styles.primaryTitle, { color: questTheme.colors.text }]}>{applyValues(t(lang, mainInsight.titleKey), mainInsight.titleValues)}</Text>
          {mainJudgementCardSize !== 'small' ? (
          <Text style={[styles.metaBody, { color: questTheme.colors.textMuted }]}>{applyValues(t(lang, mainInsight.bodyKey), mainInsight.bodyValues)}</Text>
          ) : null}
          {mainJudgementCardSize === 'large' ? (
          <Text style={[styles.metaBody, { color: questTheme.colors.textSubtle }]}>{t(lang, mainInsight.sourceKey)}</Text>
          ) : null}
          {overviewEvidence.length > 0 ? (
            <View style={{ marginTop: questTheme.spacing.sm, gap: questTheme.spacing.xs }}>
              <Text style={[styles.nextActionLabel, { color: questTheme.colors.textMuted }]}>{t(lang, 'keyEvidence')}</Text>
              {overviewEvidence.map((item) => (
                <View
                  key={item.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: questTheme.spacing.sm,
                    paddingVertical: questTheme.spacing.xs,
                    borderTopWidth: 1,
                    borderTopColor: questTheme.colors.divider,
                  }}
                >
                  <Text style={[styles.evidenceSource, { color: questTheme.colors.textSubtle }]}>{item.source}</Text>
                  <Text style={[styles.evidenceDetail, { color: questTheme.colors.text }]}>{item.detail}</Text>
                </View>
              ))}
            </View>
          ) : null}
          <View style={[styles.nextActionBox, { backgroundColor: questTheme.colors.surfaceMuted, borderColor: questTheme.colors.border }]}>
            <Text style={[styles.nextActionLabel, { color: questTheme.colors.textMuted }]}>{t(lang, 'next')}</Text>
            <Text style={[styles.nextActionText, { color: questTheme.colors.primary }]}>{applyValues(t(lang, mainInsight.nextKey), mainInsight.nextValues)}</Text>
          </View>
        </QuestCard>
        </DashboardCardShell>
        ) : null}

        {insightsView === 'trends' ? (
          <View style={styles.insightsLayer}>
            <QuestSectionHeader questTheme={questTheme} title={t(lang, 'insights_trends')} subtitle={t(lang, 'last7Days')} />
            {hasComparableTrend ? (
              <>
                <QuestGroupedSurface questTheme={questTheme} style={{ padding: questTheme.spacing.sm }}>
                  <Text style={[styles.trendContextText, { color: questTheme.colors.text }]}>
                    {t(lang, 'sampleRange')}: {trendRange}
                  </Text>
                  <Text style={[styles.trendContextText, { color: questTheme.colors.textMuted }]}>
                    {t(lang, 'dataSource')}: {t(lang, 'recordedExecutionDuration')} · {t(lang, 'sampleN')}: {trendSampleCount} · {t(lang, 'activeDays')}: {trendActiveDays}
                  </Text>
                  <Text style={[styles.trendContextText, { color: questTheme.colors.textSubtle }]}>
                    {t(lang, 'trendLimitation')}: {t(lang, 'trendLimitedToLoggedDuration')}
                  </Text>
                </QuestGroupedSurface>
                <DailyBarChart days={last7} accent={accent} lang={lang} questTheme={questTheme} />
                {weeklySkillShare ? (
                  <View style={[styles.shareCard, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border }]}>
                    {weeklySkillShare.rows.slice(0, 5).map(({ label, color, minutes, percent }) => (
                      <View key={label} style={styles.shareRow}>
                        <Text style={[styles.shareName, { color: questTheme.colors.text }]}>{label} · {(minutes / 60).toFixed(1)}h · {(percent * 100).toFixed(0)}%</Text>
                        <View style={[styles.shareBarBg, { backgroundColor: questTheme.colors.surfaceSoft }]}>
                          <View style={[styles.shareBarFg, { width: `${percent * 100}%`, backgroundColor: color }]} />
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}
              </>
            ) : (
              <QuestGroupedSurface questTheme={questTheme} style={{ padding: questTheme.spacing.md }}>
                <Text style={[styles.insightLine, { color: questTheme.colors.text }]}>
                  {t(lang, 'dataStillAccumulating')}
                </Text>
                <Text style={[styles.insightLine, { color: questTheme.colors.textMuted }]}>
                  {t(lang, 'trendNeedsComparableDays')
                    .replace('{days}', String(trendActiveDays))
                    .replace('{samples}', String(trendSampleCount))}
                </Text>
                <Text style={[styles.trendContextText, { color: questTheme.colors.textSubtle }]}>
                  {t(lang, 'dataSource')}: {t(lang, 'recordedExecutionDuration')} · {t(lang, 'sampleRange')}: {trendRange}
                </Text>
              </QuestGroupedSurface>
            )}
          </View>
        ) : null}

        {insightsView === 'patterns' ? (
          <View style={styles.insightsLayer}>
            <QuestSectionHeader questTheme={questTheme} title={t(lang, 'insights_patterns')} />
            <View style={styles.patternStatusGrid}>
              {([
                ['acceptedPatterns', patternMemoryGroups.accepted.length, questTheme.colors.success],
                ['candidatePatterns', patternMemoryGroups.candidate.length, questTheme.colors.warning],
                ['archivedPatterns', patternMemoryGroups.archived.length, questTheme.colors.textSubtle],
              ] as const).map(([labelKey, count, color]) => (
                <View key={labelKey} style={[styles.patternStatusCell, { backgroundColor: questTheme.colors.surfaceMuted, borderColor: questTheme.colors.border }]}>
                  <Text style={[styles.patternStatusCount, { color }]}>{count}</Text>
                  <Text style={[styles.patternStatusLabel, { color: questTheme.colors.textMuted }]}>{t(lang, labelKey)}</Text>
                </View>
              ))}
            </View>
            {patternMemoryGroups.accepted.length > 0 ? (
              <PatternMemoryGroup
                titleKey="acceptedPatterns"
                descriptionKey="acceptedPatternMeaning"
                patterns={patternMemoryGroups.accepted}
                questTheme={questTheme}
                lang={lang}
              />
            ) : null}
            {patternMemoryGroups.candidate.length > 0 || hasStatePatternEvidence || hasBehaviorEvidence ? (
              <>
                <PatternMemoryGroup
                  titleKey="candidatePatterns"
                  descriptionKey="candidatePatternCaution"
                  patterns={patternMemoryGroups.candidate}
                  questTheme={questTheme}
                  lang={lang}
                />
                {hasStatePatternEvidence ? <StatePatternsPanel metacognition={metacognition} questTheme={questTheme} lang={lang} /> : null}
                {hasBehaviorEvidence ? <BehaviorLinksPanel metacognition={metacognition} questTheme={questTheme} lang={lang} /> : null}
              </>
            ) : null}
            {patternMemoryGroups.archived.length > 0 ? (
              <PatternMemoryGroup
                titleKey="archivedPatterns"
                descriptionKey="archivedPatternMeaning"
                patterns={patternMemoryGroups.archived}
                questTheme={questTheme}
                lang={lang}
              />
            ) : null}
            {patternMemoryGroups.accepted.length === 0
              && patternMemoryGroups.candidate.length === 0
              && patternMemoryGroups.archived.length === 0
              && !hasStatePatternEvidence
              && !hasBehaviorEvidence ? (
              <QuestGroupedSurface questTheme={questTheme} style={{ padding: questTheme.spacing.md }}>
                <Text style={[styles.insightLine, { color: questTheme.colors.text }]}>{t(lang, 'dataStillAccumulating')}</Text>
                <Text style={[styles.insightLine, { color: questTheme.colors.textMuted }]}>{t(lang, 'notEnoughForDetailedInsights')}</Text>
              </QuestGroupedSurface>
            ) : null}
          </View>
        ) : null}

        {insightsView === 'advanced' && insightsCardVisible('advanced_signals') ? (
        <DashboardCardShell {...insightsDashboardShellProps('advanced_signals')}>
        <QuestSectionHeader
          questTheme={questTheme}
          title={t(lang, 'advancedAnalysis')}
          subtitle={t(lang, 'advancedSignals')}
        />

        {advancedSignalsCardSize !== 'large' ? (
          <QuestCard questTheme={questTheme} variant="flat" style={[styles.insightCard, { backgroundColor: questTheme.colors.surfaceMuted, borderColor: questTheme.colors.borderStrong }]} className="insight-card">
            <Text style={[styles.insightLine, { color: questTheme.colors.textMuted }]}>{t(lang, 'advancedSignals')}</Text>
          </QuestCard>
        ) : null}

        {advancedSignalsCardSize === 'large' && !hasAdvancedEvidence ? (
          <QuestGroupedSurface questTheme={questTheme} style={{ padding: questTheme.spacing.md }}>
            <Text style={[styles.insightLine, { color: questTheme.colors.text }]}>{t(lang, 'dataStillAccumulating')}</Text>
            <Text style={[styles.insightLine, { color: questTheme.colors.textMuted }]}>{t(lang, 'notEnoughForDetailedInsights')}</Text>
          </QuestGroupedSurface>
        ) : null}

        {advancedSignalsCardSize === 'large' && hasAdvancedEvidence ? (
          <>
            <QuestGroupedSurface questTheme={questTheme} style={{ padding: questTheme.spacing.sm }}>
              <Text style={[styles.trendContextText, { color: questTheme.colors.text }]}>{t(lang, 'advancedEvidenceContext')}</Text>
              <Text style={[styles.trendContextText, { color: questTheme.colors.textMuted }]}>
                {t(lang, 'dataSource')}: {t(lang, 'recordedExecutionAndState')} · {t(lang, 'sampleN')}: {logs.length} / {(data.stateCheckIns || []).length}
              </Text>
              <Text style={[styles.trendContextText, { color: questTheme.colors.textMuted }]}>
                {t(lang, 'advancedAvailableSignals')}: {advancedSignalCount}
              </Text>
              <Text style={[styles.trendContextText, { color: questTheme.colors.textSubtle }]}>{t(lang, 'advancedEvidenceLimitation')}</Text>
            </QuestGroupedSurface>

            <InsightCardsBlock insights={engineInsights} questTheme={questTheme} lang={lang} selfKnowledge={selfKnowledge} />

            {weeklyQuality && weeklyQuality.count >= 3 ? (
              <>
                <Text style={[styles.h2, { color: questTheme.colors.text }]}>{t(lang, 'weeklyAverageState')}</Text>
                <View style={[styles.qCard, { backgroundColor: questTheme.colors.surfaceElevated, borderColor: questTheme.colors.borderStrong }]}>
                  <Text style={[styles.qBig, { color: questTheme.colors.text }]}>
                    {weeklyQuality.avg.toFixed(1)} <Text style={[styles.qOf, { color: questTheme.colors.textMuted }]}>/ 5.0</Text>{' '}
                  </Text>
                  <Text style={[styles.qSub, { color: questTheme.colors.textMuted }]}>{t(lang, 'total')} {weeklyQuality.count} {t(lang, 'validRecords')}</Text>
                </View>
              </>
            ) : null}

            {hasComparableTrend ? (
              <>
                <Text style={[styles.h2, { color: questTheme.colors.text }]}>{t(lang, 'last7Days')}</Text>
                <DailyBarChart days={last7} accent={accent} lang={lang} questTheme={questTheme} />
              </>
            ) : null}

            {rescueStats.total > 0 ? (
              <>
                <Text style={[styles.h2, { color: questTheme.colors.text }]}>{t(lang, 'rescueStarts')}</Text>
                <QuestCard questTheme={questTheme} variant="flat" style={[styles.insightCard, { backgroundColor: questTheme.colors.surfaceMuted, borderColor: questTheme.colors.borderStrong, borderLeftWidth: 3, borderLeftColor: questTheme.colors.warning }]} className="rescue-summary-card insight-card">
                  <Text style={[styles.insightLine, { color: questTheme.colors.text }]}>
                    {t(lang, 'week')}: <Text style={[styles.insightStrong, { color: questTheme.colors.primary }]}>{rescueStats.total}</Text>
                    {' · '}{t(lang, 'rescueCompletionRate')}: <Text style={[styles.insightStrong, { color: questTheme.colors.primary }]}>{rescueStats.completionRate}%</Text>
                  </Text>
                  <Text style={[styles.insightLine, { color: questTheme.colors.text }]}>
                    {t(lang, 'latestRescue')}: {rescueStats.latest?.startedAt ? new Date(rescueStats.latest.startedAt).toLocaleString() : t(lang, 'notEnoughRescueData')}
                  </Text>
                  <Text style={[styles.insightLine, { color: questTheme.colors.textMuted }]}>
                    {rescueStats.topTrigger ? `${rescueStats.topTrigger} · ` : ''}{t(lang, 'rescueInsightPlaceholder')}
                  </Text>
                </QuestCard>
              </>
            ) : null}

            {hasComparableTrend ? <View style={styles.statRow}>
              <Stat questTheme={questTheme} label={t(lang, 'weeklyExecutionTime')} value={fmt(last7.reduce((s, d) => s + d.minutes, 0))} accent={accent} />
              <Stat questTheme={questTheme} label={t(lang, 'totalHours')} value={(totalMin / 60).toFixed(1)} accent={accent} />
            </View> : null}
            {hasComparableTrend ? <View style={styles.statRow}>
              <Stat questTheme={questTheme} label={t(lang, 'activeDays')} value={String(activeDays)} accent={accent} />
              <Stat questTheme={questTheme} label={t(lang, 'streak')} value={`${streak} ${t(lang, 'days')}`} accent={accent} />
              <Stat questTheme={questTheme} label={t(lang, 'weeklyHit')} value={`${weeklyHitDays}/7`} accent={accent} />
            </View> : null}

            {!insight.locked ? (
              <>
                <Text style={[styles.h2, { color: questTheme.colors.text }]}>{t(lang, 'weeklyPatterns')}</Text>
                <View style={[styles.insightCard, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border }]}>
                  <>
                    <Text style={[styles.insightLine, { color: questTheme.colors.text }]}>
                    {t(lang, 'weeklyInvestment')}: <Text style={[styles.insightStrong, { color: questTheme.colors.primary }]}>{insight.bestLabel}</Text>
                    {' · '}<Text style={[styles.insightStrong, { color: questTheme.colors.primary }]}>{insight.bestMinutes} {t(lang, 'minutes')}</Text>
                  </Text>
                  <Text style={[styles.insightLine, { color: questTheme.colors.text }]}>
                      {t(lang, 'averageQuality')}: <Text style={[styles.insightStrong, { color: questTheme.colors.primary }]}>{insight.avgPerDay} {t(lang, 'minutes')}</Text>
                    </Text>
                  </>
                </View>
              </>
            ) : null}

            {hasComparableTrend && weeklySkillShare ? (
              <>
              <Text style={[styles.h2, { color: questTheme.colors.text }]}>{t(lang, 'timeBySkill')}</Text>
              <View style={[styles.shareCard, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border }]}>
                {weeklySkillShare.rows.map(({ label, icon, color, minutes, percent, skill }) => (
                  <View key={label} style={styles.shareRow}>
                    <View style={styles.shareHeaderRow}>
                      <QuestEntityIcon icon={icon} systemIcon={getSkillSemanticIcon(skill)} color={color} questTheme={questTheme} size="sm" />
                      <Text style={[styles.shareName, { color: questTheme.colors.text }]} numberOfLines={1}>
                        {label} · {(minutes / 60).toFixed(1)}h · {(percent * 100).toFixed(0)}%
                      </Text>
                    </View>
                    <View style={[styles.shareBarBg, { backgroundColor: questTheme.colors.surfaceSoft }]}>
                      <View
                        style={[
                          styles.shareBarFg,
                          { width: `${percent * 100}%`, backgroundColor: color },
                        ]}
                      />
                    </View>
                  </View>
                ))}
              </View>
              </>
            ) : null}

        {hasComparableTrend && weeklyTaskTypeShare ? (
          <>
          <Text style={[styles.h2, { color: questTheme.colors.text }]}>{t(lang, 'timeByTaskType')}</Text>
          <View style={[styles.shareCard, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border }]}>
            {weeklyTaskTypeShare.rows.map(({ type, minutes, percent }) => (
              <View key={type} style={styles.shareRow}>
                <Text style={[styles.shareName, { color: questTheme.colors.text }]}>{taskTypeLabel(lang, type as any)} · {(minutes / 60).toFixed(1)}h · {(percent * 100).toFixed(0)}%</Text>
                <View style={[styles.shareBarBg, { backgroundColor: questTheme.colors.surfaceSoft }]}>
                  <View style={[styles.shareBarFg, { width: `${percent * 100}%`, backgroundColor: accent }]} />
                </View>
              </View>
            ))}
          </View>
          </>
        ) : null}

        {hasComparableTrend && weeklyMetricShare ? (
          <>
          <Text style={[styles.h2, { color: questTheme.colors.text }]}>{t(lang, 'metricDistribution')}</Text>
          <View style={[styles.shareCard, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border }]}>
            {weeklyMetricShare.map(({ metric, minutes, count, percent }) => (
              <View key={metric} style={styles.shareRow}>
                <Text style={[styles.shareName, { color: questTheme.colors.text }]}>{progressTypeLabel(lang, metric as any)} · {count} · {(minutes / 60).toFixed(1)}h · {(percent * 100).toFixed(0)}%</Text>
                <View style={[styles.shareBarBg, { backgroundColor: questTheme.colors.surfaceSoft }]}>
                  <View style={[styles.shareBarFg, { width: `${percent * 100}%`, backgroundColor: accent }]} />
                </View>
              </View>
            ))}
          </View>
          </>
        ) : null}

        {/* 8 周热力图 */}
        {hasComparableTrend ? (
          <>
            <Text style={[styles.h2, { color: questTheme.colors.text }]}>{t(lang, 'heatmap8Weeks')}</Text>
            <Heatmap cells={heat} lang={lang} questTheme={questTheme} accent={accent} />
          </>
        ) : null}

        {/* 系统闭环概览（系统健康度，开发者/高级用户参考）*/}
        <QuestCard questTheme={questTheme} variant="data" style={[styles.loopCard, { backgroundColor: questTheme.colors.surfaceElevated, borderColor: questTheme.colors.borderStrong, borderLeftWidth: 3, borderLeftColor: questTheme.colors.primary }]} className="system-loop-card insight-card">
          <Text style={[styles.h2Inline, { color: questTheme.colors.text }]}>{t(lang, 'systemLoopOverview')}</Text>
          <View style={styles.loopGrid}>
            <LoopStat questTheme={questTheme} label={t(lang, 'goalsWithSkills')} value={`${appLoop.activeGoals} / ${appLoop.totalGoals}`} />
            <LoopStat questTheme={questTheme} label={t(lang, 'skillsWithMetrics')} value={`${appLoop.skillsWithMetrics} / ${appLoop.totalSkills}`} />
            <LoopStat questTheme={questTheme} label={t(lang, 'skillsWithLogs')} value={`${appLoop.skillsWithLogs} / ${appLoop.totalSkills}`} />
            <LoopStat questTheme={questTheme} label={t(lang, 'scheduledBlocksThisWeek')} value={String(appLoop.scheduledBlocksThisWeek)} />
            <LoopStat questTheme={questTheme} label={t(lang, 'executionLogsThisWeek')} value={String(appLoop.executionLogsThisWeek)} />
          </View>
          <Text style={[styles.loopNext, { color: questTheme.colors.primary }]}>{t(lang, 'next')}: {appLoop.nextBestAction || t(lang, 'keepLoggingForInsights')}</Text>
        </QuestCard>
          </>
        ) : null}
        </DashboardCardShell>
        ) : null}
        </TileGrid>
      </ScrollView>
    </SafeAreaView>
  );
}

function trendLabelKey(direction: MetacognitionSummary['stateTrend']['direction']) {
  if (direction === 'improving') return 'stateImproving';
  if (direction === 'declining') return 'stateDeclining';
  if (direction === 'stable') return 'stateStable';
  if (direction === 'mixed') return 'stateMixed';
  return 'dataNotEnoughForMetacognition';
}

function deltaText(value?: number, inverse = false) {
  if (value == null || !Number.isFinite(value)) return '—';
  const effective = inverse ? -value : value;
  if (Math.abs(effective) < 0.1) return '→ 0';
  return `${effective > 0 ? '↑' : '↓'} ${Math.abs(value).toFixed(1)}`;
}

function PredictionGapLine({
  metacognition,
  questTheme,
  lang,
}: {
  metacognition: MetacognitionSummary;
  questTheme: ReturnType<typeof getQuestTheme>;
  lang: 'zh' | 'en';
}) {
  const { predictionGap } = metacognition;
  const tendencyKey = predictionGap.tendency === 'overestimate'
    ? 'likelyOverestimating'
    : predictionGap.tendency === 'underestimate'
      ? 'likelyUnderestimating'
      : 'planningAccurate';
  const details = predictionGap.status === 'ok'
    ? [
      predictionGap.durationErrorAvg != null ? `${t(lang, 'durationChange')}: ${Math.abs(predictionGap.durationErrorAvg).toFixed(0)}m` : null,
      predictionGap.qualityErrorAvg != null ? `${t(lang, 'qualityChange')}: ${Math.abs(predictionGap.qualityErrorAvg).toFixed(1)}` : null,
    ].filter(Boolean).join(' · ')
    : t(lang, 'dataNotEnoughForMetacognition');

  return (
    <View style={[styles.predictionGapLine, { backgroundColor: questTheme.colors.surfaceMuted, borderColor: questTheme.colors.border }]}>
      <Text style={[styles.predictionGapLabel, { color: questTheme.colors.textMuted }]}>{t(lang, 'predictionGap')}</Text>
      <Text style={[styles.predictionGapText, { color: questTheme.colors.text }]}>{t(lang, tendencyKey)} · {details}</Text>
    </View>
  );
}

function StateTrendStrip({
  metacognition,
  questTheme,
  lang,
}: {
  metacognition: MetacognitionSummary;
  questTheme: ReturnType<typeof getQuestTheme>;
  lang: 'zh' | 'en';
}) {
  const rows = [
    { key: 'energy', labelKey: 'energy', value: metacognition.stateTrend.energyDelta },
    { key: 'focus', labelKey: 'focus', value: metacognition.stateTrend.focusDelta },
    { key: 'mood', labelKey: 'mood', value: metacognition.stateTrend.moodDelta },
    { key: 'stress', labelKey: 'stress', value: metacognition.stateTrend.stressDelta, inverse: true },
  ];
  return (
    <QuestCard questTheme={questTheme} variant="flat" style={[styles.metaStrip, { backgroundColor: questTheme.colors.surfaceMuted, borderColor: questTheme.colors.borderStrong }]} className="state-trend-card insight-card">
      <View style={styles.metaSectionHeader}>
        <Text style={[styles.metaSectionTitle, { color: questTheme.colors.text }]}>{t(lang, 'stateTrend')}</Text>
        <Text style={[styles.metaSectionMeta, { color: questTheme.colors.textMuted }]}>{t(lang, trendLabelKey(metacognition.stateTrend.direction))}</Text>
      </View>
      <View style={styles.stateDeltaGrid}>
        {rows.map((row) => (
          <View key={row.key} style={[styles.stateDelta, { backgroundColor: questTheme.colors.surfaceSubtle, borderColor: questTheme.colors.border }]}>
            <Text style={[styles.stateDeltaLabel, { color: questTheme.colors.textMuted }]}>{t(lang, row.labelKey)}</Text>
            <Text style={[styles.stateDeltaValue, { color: questTheme.colors.text }]}>{deltaText(row.value, row.inverse)}</Text>
          </View>
        ))}
      </View>
    </QuestCard>
  );
}

function applyValues(template: string, values?: Record<string, any>) {
  if (!values) return template;
  return Object.entries(values).reduce((text, [key, value]) => text.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value)), template);
}

function StatePatternsPanel({
  metacognition,
  questTheme,
  lang,
}: {
  metacognition: MetacognitionSummary;
  questTheme: ReturnType<typeof getQuestTheme>;
  lang: 'zh' | 'en';
}) {
  return (
    <QuestCard questTheme={questTheme} variant="flat" style={[styles.metaStrip, { backgroundColor: questTheme.colors.surfaceMuted, borderColor: questTheme.colors.borderStrong }]} className="state-patterns-card insight-card">
      <View style={styles.metaSectionHeader}>
        <Text style={[styles.metaSectionTitle, { color: questTheme.colors.text }]}>{t(lang, 'statePatterns')}</Text>
        <Text style={[styles.metaSectionMeta, { color: questTheme.colors.textMuted }]}>{t(lang, 'associationNotCausation')}</Text>
      </View>
      {metacognition.statePatterns.status === 'insufficient' || metacognition.statePatterns.patterns.length === 0 ? (
        <Text style={[styles.metaEmpty, { color: questTheme.colors.textMuted }]}>{t(lang, 'statePatternInsufficient')}</Text>
      ) : (
        <View style={styles.behaviorList}>
          {metacognition.statePatterns.patterns.map((pattern) => {
            const confidenceColor = pattern.confidence === 'high'
              ? questTheme.colors.success
              : pattern.confidence === 'medium'
                ? questTheme.colors.warning
                : questTheme.colors.textMuted;
            return (
              <View key={pattern.id} style={[styles.behaviorItem, { borderColor: questTheme.colors.border, backgroundColor: questTheme.colors.surfaceSubtle }]}>
                <View style={styles.patternTitleRow}>
                  <Text style={[styles.behaviorTitle, { color: questTheme.colors.text, flex: 1 }]}>
                    {applyValues(t(lang, pattern.labelKey), pattern.labelValues)}
                  </Text>
                  <View style={[styles.dataHealthPill, { borderColor: confidenceColor, backgroundColor: confidenceColor + '22' }]}>
                    <Text style={[styles.dataHealthText, { color: confidenceColor }]}>
                      {t(lang, pattern.confidence === 'high' ? 'confidenceHigh' : pattern.confidence === 'medium' ? 'confidenceMedium' : 'confidenceLow')}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.behaviorEvidence, { color: questTheme.colors.textMuted }]}>
                  {t(lang, 'patternEvidence')}: {applyValues(t(lang, pattern.evidenceKey), pattern.evidenceValues)}
                </Text>
                <Text style={[styles.behaviorEvidence, { color: questTheme.colors.primary }]}>
                  {t(lang, 'patternNextAction')}: {applyValues(t(lang, pattern.nextActionKey), pattern.nextActionValues)}
                </Text>
                <Text style={[styles.behaviorEvidence, { color: questTheme.colors.textSubtle }]}>
                  {t(lang, 'associationNotCausation')}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </QuestCard>
  );
}

function BodyContextPanel({
  brief,
  questTheme,
  lang,
}: {
  brief: ObjectiveContextBrief;
  questTheme: ReturnType<typeof getQuestTheme>;
  lang: 'zh' | 'en';
}) {
  const confidenceColor = brief.confidence === 'high'
    ? questTheme.colors.success
    : brief.confidence === 'medium'
      ? questTheme.colors.warning
      : questTheme.colors.textMuted;
  const metricRows = [
    { key: 'sleepDuration', value: brief.metrics.sleepMinutes, unit: t(lang, 'minutes') },
    { key: 'deepSleep', value: brief.metrics.deepSleepMinutes, unit: t(lang, 'minutes') },
    { key: 'hrv', value: brief.metrics.hrv, unit: 'ms' },
    { key: 'restingHeartRate', value: brief.metrics.restingHeartRate, unit: 'bpm' },
    { key: 'steps', value: brief.metrics.steps, unit: t(lang, 'stepsUnit') },
    { key: 'workoutMinutes', value: brief.metrics.workoutMinutes, unit: t(lang, 'minutes') },
  ].filter((row) => row.value != null);
  return (
    <QuestCard questTheme={questTheme} variant="flat" style={[styles.metaStrip, { backgroundColor: questTheme.colors.surfaceMuted, borderColor: questTheme.colors.borderStrong }]} className="body-context-card insight-card">
      <View style={styles.metaSectionHeader}>
        <Text style={[styles.metaSectionTitle, { color: questTheme.colors.text }]}>{t(lang, 'bodyContext')}</Text>
        <View style={[styles.dataHealthPill, { borderColor: confidenceColor, backgroundColor: confidenceColor + '22' }]}>
          <Text style={[styles.dataHealthText, { color: confidenceColor }]}>
            {t(lang, brief.confidence === 'high' ? 'confidenceHigh' : brief.confidence === 'medium' ? 'confidenceMedium' : 'confidenceLow')}
          </Text>
        </View>
      </View>
      {brief.status === 'empty' ? (
        <Text style={[styles.metaEmpty, { color: questTheme.colors.textMuted }]}>{t(lang, 'contextNoDataSuggestion')}</Text>
      ) : (
        <>
          <Text style={[styles.metaBody, { color: questTheme.colors.text }]}>
            {t(lang, 'recoveryStatus')}: {t(lang, `recoveryStatus_${brief.recoveryStatus}`)}
          </Text>
          <Text style={[styles.behaviorEvidence, { color: questTheme.colors.textMuted }]}>{t(lang, brief.cognitiveLoadSuggestionKey)}</Text>
          <Text style={[styles.behaviorEvidence, { color: questTheme.colors.primary }]}>
            {t(lang, 'recommendedAction')}: {t(lang, brief.recommendedActionKey)}
          </Text>
          {brief.metrics.sleepMinutes != null ? (
            <Text style={[styles.behaviorEvidence, { color: questTheme.colors.textMuted }]}>{t(lang, 'oneContextRecordGuidance')}</Text>
          ) : null}
          {brief.avoidKeys.length > 0 ? (
            <Text style={[styles.behaviorEvidence, { color: questTheme.colors.textSubtle }]}>
              {t(lang, 'avoidToday')}: {brief.avoidKeys.map((key) => t(lang, key)).join(' · ')}
            </Text>
          ) : null}
          <Text style={[styles.behaviorEvidence, { color: questTheme.colors.textSubtle }]}>{t(lang, 'contextNotMedical')}</Text>
          {metricRows.length > 0 ? (
            <View style={styles.stateDeltaGrid}>
              {metricRows.map((row) => (
                <View key={row.key} style={[styles.stateDelta, { borderColor: questTheme.colors.border, backgroundColor: questTheme.colors.surfaceSubtle }]}>
                  <Text style={[styles.stateDeltaLabel, { color: questTheme.colors.textMuted }]}>{t(lang, row.key)}</Text>
                  <Text style={[styles.stateDeltaValue, { color: questTheme.colors.text }]}>{row.value} {row.unit}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </>
      )}
    </QuestCard>
  );
}

function BehaviorLinksPanel({
  metacognition,
  questTheme,
  lang,
}: {
  metacognition: MetacognitionSummary;
  questTheme: ReturnType<typeof getQuestTheme>;
  lang: 'zh' | 'en';
}) {
  const deltaLabel = (key: 'afterStateEnergy' | 'afterStateFocus' | 'afterStateMood' | 'afterStateBody', value?: 'down' | 'same' | 'up' | 'unknown') => {
    if (!value || value === 'unknown') return null;
    const valueKey = value === 'down' ? 'stateDown' : value === 'same' ? 'stateSame' : 'stateUp';
    return `${t(lang, key)}${t(lang, valueKey)}`;
  };
  const afterStateText = (link: MetacognitionSummary['behaviorLinks'][number]) => {
    const effects = link.stateEffects;
    if (!effects) return null;
    const changes = [
      deltaLabel('afterStateEnergy', effects.energy),
      deltaLabel('afterStateFocus', effects.focus),
      deltaLabel('afterStateMood', effects.mood),
      deltaLabel('afterStateBody', effects.body),
    ].filter(Boolean).join('，');
    if (!changes) return null;
    return t(lang, 'afterStateAssociation')
      .replace('{action}', link.label)
      .replace('{changes}', changes);
  };
  return (
    <QuestCard questTheme={questTheme} variant="flat" style={[styles.metaStrip, { backgroundColor: questTheme.colors.surfaceMuted, borderColor: questTheme.colors.borderStrong }]} className="behavior-links-card insight-card">
      <View style={styles.metaSectionHeader}>
        <Text style={[styles.metaSectionTitle, { color: questTheme.colors.text }]}>{t(lang, 'behaviorLinks')}</Text>
        <Text style={[styles.metaSectionMeta, { color: questTheme.colors.textMuted }]}>{t(lang, 'associatedNotCausal')}</Text>
      </View>
      {metacognition.behaviorLinks.length === 0 ? (
        <Text style={[styles.metaEmpty, { color: questTheme.colors.textMuted }]}>{t(lang, 'noBehaviorLinkYet')} · {t(lang, 'afterStateInsufficient')}</Text>
      ) : (
        <View style={styles.behaviorList}>
          {metacognition.behaviorLinks.map((link) => {
            const [count, avgQuality, avgDuration] = link.evidence.split('|');
            const tone = link.direction === 'positive' ? questTheme.colors.success : link.direction === 'negative' ? questTheme.colors.warning : questTheme.colors.textMuted;
            const afterText = afterStateText(link);
            const afterCount = link.evidence.startsWith('after|') ? link.evidence.split('|')[1] : count;
            const linkTypeKey = link.linkType === 'context_state'
              ? 'contextStateLink'
              : link.linkType === 'context_execution'
                ? 'contextExecutionLink'
                : link.linkType === 'context_state_execution'
                  ? 'possibleContextLink'
                  : 'executionStateLink';
            const displayLabel = link.linkType.startsWith('context') ? t(lang, link.label) : link.label;
            return (
              <View key={`${link.label}-${link.evidence}`} style={[styles.behaviorItem, { borderColor: questTheme.colors.border, backgroundColor: questTheme.colors.surfaceSubtle }]}>
                <Text style={[styles.behaviorTitle, { color: tone }]}>{displayLabel}</Text>
                <Text style={[styles.behaviorEvidence, { color: questTheme.colors.textSubtle }]}>{t(lang, 'observedAssociation')} · {t(lang, linkTypeKey)}</Text>
                {afterText ? (
                  <Text style={[styles.behaviorEvidence, { color: questTheme.colors.textMuted }]}>
                    {afterText} · {t(lang, 'afterStateInsightTitle')} · {afterCount}
                  </Text>
                ) : (
                  <Text style={[styles.behaviorEvidence, { color: questTheme.colors.textMuted }]}>
                    {t(lang, 'behaviorEvidence')
                      .replace('{count}', count)
                      .replace('{quality}', avgQuality)
                      .replace('{duration}', avgDuration)}
                  </Text>
                )}
                <Text style={[styles.behaviorEvidence, { color: questTheme.colors.textSubtle }]}>{t(lang, link.confidence === 'high' ? 'confidenceHigh' : link.confidence === 'medium' ? 'confidenceMedium' : 'confidenceLow')}</Text>
              </View>
            );
          })}
        </View>
      )}
    </QuestCard>
  );
}

function patternConfidenceKey(confidence: number) {
  if (confidence >= 0.75) return 'confidenceHigh';
  if (confidence >= 0.45) return 'confidenceMedium';
  return 'confidenceLow';
}

function patternEvidenceBasisKey(basis: PatternMemory['evidenceBasis']) {
  if (basis === 'personal_pattern') return 'patternEvidencePersonal';
  if (basis === 'mixed') return 'patternEvidenceMixed';
  return 'patternEvidenceGeneral';
}

function PatternMemoryGroup({
  titleKey,
  descriptionKey,
  patterns,
  questTheme,
  lang,
}: {
  titleKey: string;
  descriptionKey: string;
  patterns: PatternMemory[];
  questTheme: ReturnType<typeof getQuestTheme>;
  lang: 'zh' | 'en';
}) {
  return (
    <QuestGroupedSurface questTheme={questTheme} style={{ padding: questTheme.spacing.md }}>
      <View style={styles.patternGroupHeader}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.metaSectionTitle, { color: questTheme.colors.text }]}>{t(lang, titleKey)}</Text>
          <Text style={[styles.patternGroupDescription, { color: questTheme.colors.textMuted }]}>{t(lang, descriptionKey)}</Text>
        </View>
        <Text style={[styles.patternGroupCount, { color: questTheme.colors.textSubtle }]}>{patterns.length}</Text>
      </View>
      {patterns.map((pattern) => {
        const observedAt = pattern.lastSeenAt || pattern.updatedAt;
        const observedLabel = observedAt
          ? new Date(observedAt).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-AU')
          : t(lang, 'notEnoughDataYet');
        return (
          <View key={pattern.id} style={[styles.patternMemoryRow, { borderTopColor: questTheme.colors.divider }]}>
            <Text style={[styles.behaviorTitle, { color: questTheme.colors.text }]}>{pattern.label}</Text>
            <Text style={[styles.patternMemoryDescription, { color: questTheme.colors.textMuted }]}>{pattern.description}</Text>
            <Text style={[styles.behaviorEvidence, { color: questTheme.colors.textSubtle }]}>
              {t(lang, patternConfidenceKey(pattern.confidence))}
              {' · '}{t(lang, 'evidenceCount')}: {pattern.sampleN}
              {' · '}{t(lang, 'lastObserved')}: {observedLabel}
            </Text>
            <Text style={[styles.behaviorEvidence, { color: questTheme.colors.textSubtle }]}>
              {t(lang, patternEvidenceBasisKey(pattern.evidenceBasis))}
            </Text>
            {pattern.caution ? (
              <Text style={[styles.behaviorEvidence, { color: questTheme.colors.warning }]}>{pattern.caution}</Text>
            ) : null}
          </View>
        );
      })}
    </QuestGroupedSurface>
  );
}

// ───────── 近 7 天柱图 ─────────
function DailyBarChart({
  days, accent, lang, questTheme,
}: {
  days: { date: string; label: string; dayNum: number; minutes: number; avgQuality: number | null }[];
  accent: string;
  lang: 'zh' | 'en';
  questTheme: ReturnType<typeof getQuestTheme>;
}) {
  const maxMin = Math.max(60, ...days.map((d) => d.minutes)); // 至少 60 分钟作为最低刻度
  return (
    <View style={[styles.barCard, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border }]}>
      <View style={styles.barChartRow}>
        {days.map((d) => {
          const hPct = (d.minutes / maxMin) * 100;
          return (
            <View key={d.date} style={styles.barCol}>
              <View style={styles.barEmojiSlot}>
                {d.avgQuality != null && (
                  <Text style={[styles.barEmoji, { color: questTheme.colors.textMuted }]}>{d.avgQuality.toFixed(1)}</Text>
                )}
              </View>
              <View style={[styles.barWrap, { backgroundColor: questTheme.colors.surfaceSoft }]}>
                <View
                  style={[
                    styles.barFg,
                    {
                      // min 4px placeholder so zero-bars are visible; primary color with full opacity when data present
                      height: d.minutes > 0 ? `${Math.max(4, hPct)}%` : 4,
                      backgroundColor: questTheme.colors.primary,
                      opacity: d.minutes > 0 ? 1 : 0.15,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.barLabel, { color: questTheme.colors.text }]}>{lang === 'zh' ? `周${d.label}` : d.label}</Text>
              <Text style={[styles.barDate, { color: questTheme.colors.textMuted }]}>{d.dayNum}</Text>
            </View>
          );
        })}
      </View>
      <Text style={[styles.barAxis, { color: questTheme.colors.textMuted }]}>{t(lang, 'maxScale')}: {maxMin} {t(lang, 'minutes')}</Text>
    </View>
  );
}

// ───────── 热力图 (8x7) ─────────
function Heatmap({
  cells, lang, questTheme, accent,
}: {
  cells: { date: string; value: number }[];
  lang: 'zh' | 'en';
  questTheme: ReturnType<typeof getQuestTheme>;
  accent: string;
}) {
  const cellSize = 16;
  const gap = 4;
  const cols = 8;
  const rows = 7;
  const width = cols * (cellSize + gap);
  const height = rows * (cellSize + gap);
  const max = Math.max(60, ...cells.map((c) => c.value));
  const colorFor = (v: number) => {
    if (v === 0) return questTheme.colors.surfaceSoft;
    const t = Math.min(1, v / max);
    return t > 0.75 ? accent : questTheme.colors.primarySoft;
  };
  return (
    <View style={[styles.card, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border }]}>
      <Svg width={width} height={height}>
        {cells.map((c, i) => {
          const col = Math.floor(i / rows);
          const row = i % rows;
          return (
            <Rect
              key={c.date}
              x={col * (cellSize + gap)}
              y={row * (cellSize + gap)}
              width={cellSize}
              height={cellSize}
              rx={3}
              fill={colorFor(c.value)}
            />
          );
        })}
      </Svg>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 6 }}>
        <Text style={[styles.legend, { color: questTheme.colors.textMuted }]}>{t(lang, 'less')}</Text>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <View
            key={t}
            style={{
              width: 12, height: 12, borderRadius: 3,
              backgroundColor: t === 0 ? questTheme.colors.surfaceSoft : t > 0.75 ? accent : questTheme.colors.primarySoft,
            }}
          />
        ))}
        <Text style={[styles.legend, { color: questTheme.colors.textMuted }]}>{t(lang, 'more')}</Text>
      </View>
    </View>
  );
}

function fmt(n: number) {
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

function Stat({
  label, value, accent, questTheme,
}: {
  label: string;
  value: string;
  accent: string;
  questTheme: ReturnType<typeof getQuestTheme>;
}) {
  return (
    <View style={[styles.stat, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border }]}>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: questTheme.colors.textMuted }]}>{label}</Text>
    </View>
  );
}

function LoopStat({ label, value, questTheme }: { label: string; value: string; questTheme: ReturnType<typeof getQuestTheme> }) {
  return (
    <View style={[styles.loopStat, { backgroundColor: questTheme.colors.surfaceSoft }]}>
      <Text style={[styles.loopValue, { color: questTheme.colors.text }]}>{value}</Text>
      <Text style={[styles.loopLabel, { color: questTheme.colors.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  container: { flex: 1, backgroundColor: theme.bg },
  insightsTabs: { marginBottom: 8 },
  insightsLayer: { width: '100%', gap: 8 },
  patternStatusGrid: { flexDirection: 'row', gap: 8 },
  patternStatusCell: { flex: 1, minWidth: 0, minHeight: 58, borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  patternStatusCount: { fontSize: 18, lineHeight: 22, fontWeight: '900' },
  patternStatusLabel: { fontSize: 10, lineHeight: 14, fontWeight: '800', marginTop: 2 },
  patternGroupHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  patternGroupDescription: { fontSize: 11, lineHeight: 17, fontWeight: '700', marginTop: 2 },
  patternGroupCount: { fontSize: 13, lineHeight: 18, fontWeight: '900' },
  patternMemoryRow: { borderTopWidth: 1, paddingTop: 10, marginTop: 10 },
  patternMemoryDescription: { fontSize: 12, lineHeight: 18, fontWeight: '700', marginTop: 3 },
  h1: { color: theme.text, fontSize: 34, fontWeight: '800' },
  h2: { color: theme.text, fontSize: 18, fontWeight: '600', marginTop: 14, marginBottom: 8 },
  sub: { color: theme.textDim, marginTop: 4 },
  dashboardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  dashboardMeta: { fontSize: 12, fontWeight: '800', marginTop: 8, lineHeight: 18 },
  dashboardTileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: questLayout.dashboardGap, alignItems: 'stretch' },
  dashboardTileGridEditing: { userSelect: 'none', WebkitUserSelect: 'none' } as any,
  advancedHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 12, marginTop: 8 },
  advancedTitle: { fontSize: 16, fontWeight: '900', lineHeight: 22 },
  advancedSubtitle: { fontSize: 12, fontWeight: '800', lineHeight: 18, marginTop: 2 },
  primaryPanel: {},
  primaryHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  primaryTitle: { fontSize: 20, fontWeight: '900', lineHeight: 26, marginTop: 2 },
  primaryBody: { fontSize: 15, fontWeight: '800', lineHeight: 22, marginTop: 12 },
  metaBody: { fontSize: 13, fontWeight: '800', lineHeight: 19, marginTop: 4 },
  predictionGapLine: { borderWidth: 1, borderRadius: 12, padding: 10, marginTop: 12, gap: 3 },
  predictionGapLabel: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  predictionGapText: { fontSize: 12, fontWeight: '900', lineHeight: 18 },
  nextActionBox: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, marginTop: 8 },
  nextActionLabel: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  nextActionText: { fontSize: 14, fontWeight: '900', lineHeight: 20, marginTop: 3 },
  evidenceSource: { width: 104, flexShrink: 0, fontSize: 11, fontWeight: '800', lineHeight: 17 },
  evidenceDetail: { flex: 1, minWidth: 0, fontSize: 12, fontWeight: '800', lineHeight: 18 },
  trendContextText: { fontSize: 11, fontWeight: '700', lineHeight: 17 },
  metaStrip: { marginTop: 10, borderWidth: 1 },
  metaSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  metaSectionTitle: { fontSize: 15, fontWeight: '900' },
  metaSectionMeta: { fontSize: 11, fontWeight: '900', flexShrink: 1, textAlign: 'right' },
  stateDeltaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  stateDelta: { flex: 1, minWidth: 104, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  stateDeltaLabel: { fontSize: 11, fontWeight: '900' },
  stateDeltaValue: { fontSize: 14, fontWeight: '900', marginTop: 3 },
  metaEmpty: { fontSize: 12, fontWeight: '800', lineHeight: 18, marginTop: 10 },
  behaviorList: { gap: 8, marginTop: 10 },
  behaviorItem: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  patternTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  behaviorTitle: { fontSize: 13, fontWeight: '900' },
  behaviorEvidence: { fontSize: 11, fontWeight: '800', lineHeight: 16, marginTop: 3 },
  decisionCard: { marginTop: 16 },
  decisionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  decisionKicker: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  decisionTitle: { fontSize: 22, fontWeight: '900', marginTop: 2 },
  dataHealthPill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  dataHealthText: { fontSize: 11, fontWeight: '900' },
  keySignal: { fontSize: 14, fontWeight: '800', lineHeight: 20, marginTop: 14 },
  decisionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  decisionMetric: { width: '23.5%', minWidth: 120, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  decisionValue: { fontSize: 20, fontWeight: '900' },
  decisionLabel: { fontSize: 11, fontWeight: '800', marginTop: 3 },
  statRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  stat: { flex: 1, backgroundColor: theme.card, padding: 11, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border, ...theme.shadow },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { color: theme.textDim, fontSize: 12, marginTop: 2 },
  loopCard: { marginTop: 12, backgroundColor: theme.card, padding: 14, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border, ...theme.shadow },
  h2Inline: { color: theme.text, fontSize: 18, fontWeight: '800' },
  loopGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  loopStat: { width: '31%', minWidth: 92, backgroundColor: theme.cardAlt, borderRadius: 10, padding: 10 },
  loopValue: { color: theme.text, fontSize: 16, fontWeight: '900' },
  loopLabel: { color: theme.textDim, fontSize: 10, fontWeight: '800', marginTop: 4 },
  loopNext: { color: theme.primary, fontSize: 13, fontWeight: '800', marginTop: 12, lineHeight: 19 },
  card: { backgroundColor: theme.card, padding: 16, borderRadius: theme.radius.lg, alignItems: 'center', borderWidth: 1, borderColor: theme.border, ...theme.shadow },
  empty: { color: theme.textDim, fontStyle: 'italic', backgroundColor: theme.card, padding: 14, borderRadius: theme.radius.md },

  // 本周平均状态
  qCard: { backgroundColor: theme.card, padding: 14, borderRadius: theme.radius.lg, alignItems: 'center', borderWidth: 1, borderColor: theme.border, ...theme.shadow },
  qBig: { color: theme.text, fontSize: 36, fontWeight: '700' },
  qOf: { color: theme.textDim, fontSize: 18, fontWeight: '500' },
  qEmoji: { fontSize: 32 },
  qSub: { color: theme.textDim, fontSize: 12, marginTop: 6 },

  // 近 7 天柱图
  barCard: { backgroundColor: theme.card, padding: 14, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border, ...theme.shadow },
  barChartRow: { flexDirection: 'row', alignItems: 'flex-end', height: 160, gap: 6 },
  barCol: { flex: 1, alignItems: 'center', height: '100%' },
  barEmojiSlot: { height: 22, justifyContent: 'flex-end' },
  barEmoji: { fontSize: 16 },
  barWrap: {
    flex: 1, width: '70%', borderRadius: 6,
    backgroundColor: theme.cardAlt,
    justifyContent: 'flex-end', overflow: 'hidden',
    marginTop: 2,
  },
  barFg: { width: '100%', borderRadius: 6 },
  barLabel: { color: theme.text, fontSize: 11, fontWeight: '600', marginTop: 6 },
  barDate: { color: theme.textDim, fontSize: 10 },
  barAxis: { color: theme.textDim, fontSize: 10, textAlign: 'right', marginTop: 8 },

  // 本周规律
  insightCard: { backgroundColor: theme.card, padding: 16, borderRadius: theme.radius.lg, gap: 10, borderWidth: 1, borderColor: theme.border, ...theme.shadow },
  insightLine: { color: theme.text, fontSize: 14, lineHeight: 22 },
  insightStrong: { color: theme.accent, fontWeight: '700' },
  insightLocked: { color: theme.textDim, fontSize: 13, lineHeight: 22, textAlign: 'center' },
  insightLockedSub: { color: theme.textDim, fontSize: 11 },

  // 技能分配
  shareCard: { backgroundColor: theme.card, padding: 14, borderRadius: theme.radius.lg, gap: 12, borderWidth: 1, borderColor: theme.border, ...theme.shadow },
  shareRow: {},
  shareHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  shareName: { color: theme.text, fontSize: 13, fontWeight: '600', flex: 1 },
  shareBarBg: { height: 8, backgroundColor: theme.cardAlt, borderRadius: 4, overflow: 'hidden' },
  shareBarFg: { height: '100%', borderRadius: 4 },

  // 热力图图例
  legend: { color: theme.textDim, fontSize: 11 },
});
