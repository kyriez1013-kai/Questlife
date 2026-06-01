// V2.3: "数据" Tab
// 顺序:
//   1. 顶部 stats (累计分钟 / 累计小时 / 活跃天数 / 连续记录 / 本周达标天数)
//   2. 📈 本周平均状态  (existing)
//   3. 📊 近 7 天        (新, 柱状图)
//   4. 🔍 本周规律        (新, 文字洞察)
//   5. 🥇 本周技能分配    (新, 占比列表)
//   6. 🎯 技能雷达        (保留)
//   7. 🔥 近 8 周热力图   (从 16 周缩到 8 周, 移到最底)
import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Rect } from 'react-native-svg';
import { useStore } from '../store';
import { appAccent, theme } from '../theme';
import { emojiForAvgQuality, Skill } from '../types';
import { getLanguage, progressTypeLabel, t, taskTypeLabel } from '../i18n';
import { getAppCoreLoopStatus } from '../utils/coreLoop';
import { trackEvent } from '../utils/analytics';
import { getQuestTheme } from '../design/tokens';
import QuestCard from '../components/ui/QuestCard';
import QuestEntityIcon from '../components/ui/QuestEntityIcon';
import { getSkillSemanticIcon } from '../design/entityIcons';
import { generateInsightsSummary, InsightsSummaryResult } from '../utils/insightsEngine';
import { InsightCardsBlock } from './StatsScreenInsights';
import { displayEntityName } from '../utils/displayName';

const WEEKDAY_KEYS = ['weekdaySun', 'weekdayMon', 'weekdayTue', 'weekdayWed', 'weekdayThu', 'weekdayFri', 'weekdaySat'];

const fmtDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function StatsScreen() {
  const { data } = useStore();
  const lang = getLanguage(data.settings.language);
  const questTheme = getQuestTheme(data.settings.selectedThemeId);
  const accent = appAccent(data.settings.accentColor ?? questTheme.colors.primary);
  const logs = data.executionLogs || [];
  const timeLogs = useMemo(() => logs.filter((log) => (log.durationMinutes ?? 0) > 0), [logs]);
  const appLoop = useMemo(() => getAppCoreLoopStatus(data, lang), [data, lang]);
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
    const inWindow = timeLogs.filter((a) => dates.has(a.date));
    const totalMin = inWindow.reduce((s, a) => s + (a.durationMinutes ?? 0), 0);
    if (totalMin === 0) return null;
    const bySkill = new Map<string, number>();
    inWindow.forEach((a) => {
      const sid = a.linkedSkillId ?? a.orphanedSkillName ?? a.title ?? t(lang, 'customLog');
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

  const instantInsight = useMemo(() => {
    const weeklyMinutes = last7.reduce((sum, day) => sum + day.minutes, 0);
    const weeklyLogs = logs.filter((log) => last7.some((day) => day.date === log.date));
    const topSkill = weeklySkillShare?.rows[0];
    const todayStr = fmtDate(new Date());
    const todayBlocks = (data.scheduleBlocks || []).filter((block) => block.date === todayStr);
    const done = todayBlocks.filter((block) => block.status === 'completed').length + logs.filter((log) => log.date === todayStr && log.source === 'one_tap').length;
    const remaining = Math.max(0, todayBlocks.length - todayBlocks.filter((block) => block.status === 'completed').length);
    const activeDayCount = new Set(logs.map((log) => log.date)).size;
    return {
      weeklyMinutes,
      weeklyLogCount: weeklyLogs.length,
      topSkill,
      done,
      remaining,
      activeDayCount,
      daysToFirstInsight: Math.max(0, 7 - activeDayCount),
      firstInsightProgress: Math.min(7, activeDayCount),
    };
  }, [data.scheduleBlocks, last7, logs, weeklySkillShare]);

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

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: questTheme.colors.background }]}>
      <ScrollView
        style={[styles.container, { backgroundColor: questTheme.colors.background }]}
        contentContainerStyle={{ padding: 16, paddingBottom: 130, maxWidth: 960, width: '100%', alignSelf: 'center' }}
      >
        <Text style={[styles.h1, { color: questTheme.colors.text }]}>{t(lang, 'insights')}</Text>
        <Text style={[styles.sub, { color: questTheme.colors.textMuted }]}>{t(lang, 'settingsSubtitle')}</Text>

        {/* ── 重排后顺序：有行动价值的分析在上，系统自检在下 ──────────────── */}

        {/* 1. 即时快览（今日概况）*/}
        <View style={styles.instantGrid}>
          <QuestCard questTheme={questTheme} variant="data" style={[styles.instantCard, { backgroundColor: questTheme.colors.surfaceElevated, borderColor: questTheme.colors.border }]} className="summary-card insight-card">
            <Text style={[styles.instantTitle, { color: questTheme.colors.text }]}>{t(lang, 'weeklyOverview')}</Text>
            <Text style={[styles.instantText, { color: questTheme.colors.textMuted }]}>{(instantInsight.weeklyMinutes / 60).toFixed(1)}h · {instantInsight.weeklyLogCount} {t(lang, 'logsToday')} · {streak} {t(lang, 'days')}</Text>
          </QuestCard>
          <QuestCard questTheme={questTheme} variant="data" style={[styles.instantCard, { backgroundColor: questTheme.colors.surfaceElevated, borderColor: questTheme.colors.border }]} className="summary-card insight-card">
            <Text style={[styles.instantTitle, { color: questTheme.colors.text }]}>{t(lang, 'mostFocusedSkill')}</Text>
            <Text style={[styles.instantText, { color: questTheme.colors.textMuted }]}>{instantInsight.topSkill ? `${instantInsight.topSkill.label} · ${(instantInsight.topSkill.percent * 100).toFixed(0)}%` : t(lang, 'notEnoughDataYet')}</Text>
          </QuestCard>
          <QuestCard questTheme={questTheme} variant="data" style={[styles.instantCard, { backgroundColor: questTheme.colors.surfaceElevated, borderColor: questTheme.colors.border }]} className="summary-card insight-card">
            <Text style={[styles.instantTitle, { color: questTheme.colors.text }]}>{t(lang, 'todayCompletion')}</Text>
            <Text style={[styles.instantText, { color: questTheme.colors.textMuted }]}>{instantInsight.done} {t(lang, 'completed')} · {instantInsight.remaining} {t(lang, 'remaining')}</Text>
          </QuestCard>
        </View>

        {/* 2. 本周平均状态 */}
        {weeklyQuality && (
          <>
            <Text style={[styles.h2, { color: questTheme.colors.text }]}>{t(lang, 'weeklyAverageState')}</Text>
            <View style={[styles.qCard, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border }]}>
              <Text style={[styles.qBig, { color: questTheme.colors.text }]}>
                {weeklyQuality.avg.toFixed(1)} <Text style={[styles.qOf, { color: questTheme.colors.textMuted }]}>/ 5.0</Text>{' '}
                <Text style={styles.qEmoji}>{emojiForAvgQuality(weeklyQuality.avg)}</Text>
              </Text>
              <Text style={[styles.qSub, { color: questTheme.colors.textMuted }]}>{t(lang, 'total')} {weeklyQuality.count} {t(lang, 'validRecords')}</Text>
            </View>
          </>
        )}

        {/* 3. 近 7 天柱图 */}
        <Text style={[styles.h2, { color: questTheme.colors.text }]}>{t(lang, 'last7Days')}</Text>
        <DailyBarChart days={last7} accent={accent} lang={lang} questTheme={questTheme} />

        {/* 4. 深度分析卡片（能力地图/成长曲线/多因子/月度/明日预测/异常检测）*/}
        {/* ── 上移：对用户有行动价值的分析，原在 selfKnowledge 之后 ── */}
        <InsightCardsBlock insights={engineInsights} questTheme={questTheme} lang={lang} />

        {/* 5. 自我认知精度 */}
        <Text style={[styles.h2, { color: questTheme.colors.text }]}>{t(lang, 'selfKnowledgeAccuracy')}</Text>
        <QuestCard questTheme={questTheme} variant="flat" style={[styles.insightCard, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border }]} className="self-awareness-card insight-card">
          {!selfKnowledge ? (
            <Text style={[styles.insightLocked, { color: questTheme.colors.textMuted }]}>{t(lang, 'needPredictions')}</Text>
          ) : (
            <>
              <Text style={[styles.insightStrong, { color: questTheme.colors.text }]}>{selfKnowledge.level}</Text>
              <Text style={[styles.insightLine, { color: questTheme.colors.text }]}>{t(lang, 'durationPredictionError')} ±{selfKnowledge.durationError.toFixed(0)} {t(lang, 'minutes')}</Text>
              <Text style={[styles.insightLine, { color: questTheme.colors.text }]}>{t(lang, 'qualityPredictionError')} {selfKnowledge.qualityError == null ? '—' : `±${selfKnowledge.qualityError.toFixed(1)}`}</Text>
              <Text style={[styles.insightLine, { color: questTheme.colors.text }]}>{t(lang, 'last8WeeksTrend')}</Text>
              {selfKnowledge.weeks.map((week) => {
                const bars = Math.max(1, Math.min(8, Math.round(week.error / 5)));
                return <Text key={week.week} style={[styles.insightLine, { color: questTheme.colors.text }]}>{week.week.slice(5)} {'█'.repeat(bars)} ±{week.error.toFixed(0)}m</Text>;
              })}
            </>
          )}
        </QuestCard>

        {/* 6. 启动救援统计 */}
        <Text style={[styles.h2, { color: questTheme.colors.text }]}>{t(lang, 'rescueStarts')}</Text>
        <QuestCard questTheme={questTheme} variant="flat" style={[styles.insightCard, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border }]} className="rescue-summary-card insight-card">
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

        {/* 7. 历史统计数字 */}
        <View style={styles.statRow}>
          <Stat questTheme={questTheme} label={t(lang, 'weeklyExecutionTime')} value={fmt(last7.reduce((s, d) => s + d.minutes, 0))} accent={accent} />
          <Stat questTheme={questTheme} label={t(lang, 'totalHours')} value={(totalMin / 60).toFixed(1)} accent={accent} />
        </View>
        <View style={styles.statRow}>
          <Stat questTheme={questTheme} label={t(lang, 'activeDays')} value={String(activeDays)} accent={accent} />
          <Stat questTheme={questTheme} label={t(lang, 'streak')} value={`${streak} ${t(lang, 'days')}`} accent={accent} />
          <Stat questTheme={questTheme} label={t(lang, 'weeklyHit')} value={`${weeklyHitDays}/7`} accent={accent} />
        </View>

        {/* 8. 本周规律洞察 */}
        <Text style={[styles.h2, { color: questTheme.colors.text }]}>{t(lang, 'weeklyPatterns')}</Text>
        <View style={[styles.insightCard, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border }]}>
          {insight.locked ? (
            <Text style={[styles.insightLocked, { color: questTheme.colors.textMuted }]}>
              {t(lang, 'patternLocked')}{'\n'}
              <Text style={[styles.insightLockedSub, { color: questTheme.colors.textMuted }]}>
                {insight.daysHave} {t(lang, 'days')}
              </Text>
            </Text>
          ) : (
            <>
              <Text style={[styles.insightLine, { color: questTheme.colors.text }]}>
                {t(lang, 'weeklyInvestment')}: <Text style={[styles.insightStrong, { color: questTheme.colors.primary }]}>{insight.bestLabel}</Text>
                {' · '}<Text style={[styles.insightStrong, { color: questTheme.colors.primary }]}>{insight.bestMinutes} {t(lang, 'minutes')}</Text>
              </Text>
              <Text style={[styles.insightLine, { color: questTheme.colors.text }]}>
                {t(lang, 'averageQuality')}: <Text style={[styles.insightStrong, { color: questTheme.colors.primary }]}>{insight.avgPerDay} {t(lang, 'minutes')}</Text>
              </Text>
            </>
          )}
        </View>

        {/* 4. 本周技能分配 */}
        <Text style={[styles.h2, { color: questTheme.colors.text }]}>{t(lang, 'timeBySkill')}</Text>
        {!weeklySkillShare ? (
          <Text style={[styles.empty, { color: questTheme.colors.textMuted, backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border }]}>{t(lang, 'noExecutionInsights')}</Text>
        ) : (
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
        )}

        <Text style={[styles.h2, { color: questTheme.colors.text }]}>{t(lang, 'timeByTaskType')}</Text>
        {!weeklyTaskTypeShare ? (
          <Text style={[styles.empty, { color: questTheme.colors.textMuted, backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border }]}>{t(lang, 'noExecutionInsights')}</Text>
        ) : (
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
        )}

        <Text style={[styles.h2, { color: questTheme.colors.text }]}>{t(lang, 'metricDistribution')}</Text>
        {!weeklyMetricShare ? (
          <Text style={[styles.empty, { color: questTheme.colors.textMuted, backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border }]}>{t(lang, 'noExecutionInsights')}</Text>
        ) : (
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
        )}

        {/* 8 周热力图 */}
        <Text style={[styles.h2, { color: questTheme.colors.text }]}>{t(lang, 'heatmap8Weeks')}</Text>
        <Heatmap cells={heat} lang={lang} questTheme={questTheme} accent={accent} />

        {/* ── 系统自检（下沉：不是用户每次关心的信息）─────────────────────── */}

        {/* 解锁进度提示（新用户友好，老用户可忽略）*/}
        <QuestCard questTheme={questTheme} variant="flat" style={[styles.encourageCard, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border }]} className="summary-card insight-card">
          <Text style={[styles.instantTitle, { color: questTheme.colors.text }]}>{t(lang, 'dayCount').replace('{count}', String(instantInsight.firstInsightProgress))}</Text>
          <Text style={[styles.instantText, { color: questTheme.colors.textMuted }]}>{t(lang, 'moreDaysToInsight').replace('{count}', String(instantInsight.daysToFirstInsight))}</Text>
          <View style={[styles.encourageBarBg, { backgroundColor: questTheme.colors.surfaceSoft }]}>
            <View style={[styles.encourageBarFg, { width: `${(instantInsight.firstInsightProgress / 7) * 100}%`, backgroundColor: questTheme.colors.primary }]} />
          </View>
        </QuestCard>

        {/* 系统闭环概览（系统健康度，开发者/高级用户参考）*/}
        <QuestCard questTheme={questTheme} variant="data" style={[styles.loopCard, { backgroundColor: questTheme.colors.surfaceElevated, borderColor: questTheme.colors.border }]} className="system-loop-card insight-card">
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
      </ScrollView>
    </SafeAreaView>
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
                  <Text style={styles.barEmoji}>{emojiForAvgQuality(d.avgQuality)}</Text>
                )}
              </View>
              <View style={[styles.barWrap, { backgroundColor: questTheme.colors.surfaceSoft }]}>
                <View
                  style={[
                    styles.barFg,
                    {
                      height: `${hPct}%`,
                      backgroundColor: d.minutes > 0 ? accent : 'transparent',
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
  h1: { color: theme.text, fontSize: 34, fontWeight: '800' },
  h2: { color: theme.text, fontSize: 18, fontWeight: '600', marginTop: 24, marginBottom: 12 },
  sub: { color: theme.textDim, marginTop: 4 },
  statRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  stat: { flex: 1, backgroundColor: theme.card, padding: 14, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border, ...theme.shadow },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { color: theme.textDim, fontSize: 12, marginTop: 2 },
  instantGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  instantCard: { width: '31.8%', minHeight: 104, backgroundColor: theme.card, padding: 12, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border, ...theme.shadow },
  instantTitle: { color: theme.text, fontSize: 13, fontWeight: '900', lineHeight: 18 },
  instantText: { color: theme.textDim, fontSize: 12, fontWeight: '700', lineHeight: 18, marginTop: 8 },
  encourageCard: { marginTop: 8, backgroundColor: theme.card, padding: 14, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border, ...theme.shadow },
  encourageBarBg: { height: 8, backgroundColor: theme.cardAlt, borderRadius: 4, overflow: 'hidden', marginTop: 10 },
  encourageBarFg: { height: '100%', borderRadius: 4 },
  loopCard: { marginTop: 16, backgroundColor: theme.card, padding: 16, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border, ...theme.shadow },
  h2Inline: { color: theme.text, fontSize: 18, fontWeight: '800' },
  loopGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  loopStat: { width: '31%', minWidth: 92, backgroundColor: theme.cardAlt, borderRadius: 10, padding: 10 },
  loopValue: { color: theme.text, fontSize: 16, fontWeight: '900' },
  loopLabel: { color: theme.textDim, fontSize: 10, fontWeight: '800', marginTop: 4 },
  loopNext: { color: theme.primary, fontSize: 13, fontWeight: '800', marginTop: 12, lineHeight: 19 },
  card: { backgroundColor: theme.card, padding: 16, borderRadius: theme.radius.lg, alignItems: 'center', borderWidth: 1, borderColor: theme.border, ...theme.shadow },
  empty: { color: theme.textDim, fontStyle: 'italic', backgroundColor: theme.card, padding: 14, borderRadius: theme.radius.md },

  // 本周平均状态
  qCard: { backgroundColor: theme.card, padding: 20, borderRadius: theme.radius.lg, alignItems: 'center', borderWidth: 1, borderColor: theme.border, ...theme.shadow },
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
