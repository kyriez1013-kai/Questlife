import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { t, type Lang } from '../i18n';
import V11RebaselineIcon from '../v11-stage2-rebaseline/V11RebaselineIcon';
import type { V11ThemeTokens } from '../v11/tokens';
import { v11Spacing, v11Typography } from '../v11/tokens';
import type { V11AdvancedMode, V11InsightCopy, V11TrendPoint } from './insightsPresentation';
import {
  V11BeforeAfterPair,
  V11DistributionBars,
  V11RangeList,
  V11TrendCanvas,
} from './V11InsightsVisuals';

const WebPressable = Pressable as any;
const WebView = View as any;

function copy(language: Lang, value: V11InsightCopy) {
  if (value.kind === 'text') return value.text;
  return Object.entries(value.values || {}).reduce(
    (result, [key, replacement]) => result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(replacement)),
    t(language, value.key),
  );
}

function applyValues(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(new RegExp(`\\{${key}\\}`, 'g'), value),
    template,
  );
}

function ModeVisual({
  language,
  mode,
  onSelectTrend,
  theme,
}: {
  language: Lang;
  mode: V11AdvancedMode;
  onSelectTrend: (point: V11TrendPoint) => void;
  theme: V11ThemeTokens;
}) {
  const payload = mode.payload;
  if (!payload) return null;

  if (payload.kind === 'ability') {
    return (
      <V11RangeList
        accessibilityLabel={t(language, 'stage3AbilityVisualLabel')}
        rows={payload.dimensions.map((dimension) => ({
          id: dimension.key,
          label: t(language, dimension.key),
          value: dimension.score,
          reference: dimension.isBaseline,
        }))}
        theme={theme}
      />
    );
  }

  if (payload.kind === 'tomorrow') {
    return (
      <V11RangeList
        accessibilityLabel={t(language, 'stage3TomorrowVisualLabel')}
        rows={[
          { id: 'energy', label: t(language, 'energy'), value: payload.energy / 5 },
          { id: 'focus', label: t(language, 'focus'), value: payload.focus / 5 },
        ]}
        theme={theme}
      />
    );
  }

  if (payload.kind === 'monthly') {
    const current = payload.months[0];
    const previous = payload.months[1];
    if (!current || !previous) return null;
    return (
      <V11BeforeAfterPair
        accessibilityLabel={t(language, 'stage3MonthlyVisualLabel')}
        left={{ label: previous.month, value: `${previous.totalHours.toFixed(1)}h` }}
        right={{ label: current.month, value: `${current.totalHours.toFixed(1)}h` }}
        theme={theme}
      />
    );
  }

  if (payload.kind === 'growth') {
    return (
      <V11DistributionBars
        accessibilityLabel={t(language, 'stage3GrowthVisualLabel')}
        rows={payload.weeks.map((week) => ({
          id: week.weekLabel,
          label: week.weekLabel,
          value: week.totalMins,
          meta: `${week.totalMins}m`,
        }))}
        theme={theme}
      />
    );
  }

  if (payload.kind === 'anomalies') {
    return (
      <View style={{ gap: v11Spacing.sm }}>
        {payload.anomalies.map((anomaly, index) => (
          <View
            key={`${anomaly.type}-${index}`}
            style={{
              borderTopColor: theme.questTheme.colors.border,
              borderTopWidth: index === 0 ? 0 : 1,
              paddingTop: index === 0 ? 0 : v11Spacing.sm,
            }}
          >
            <Text style={{ color: theme.text.primary, ...v11Typography.body }}>
              {applyValues(t(language, anomaly.descKey), anomaly.descValues)}
            </Text>
          </View>
        ))}
      </View>
    );
  }

  if (payload.kind === 'combination') {
    return (
      <V11DistributionBars
        accessibilityLabel={t(language, 'stage3CombinationVisualLabel')}
        rows={payload.buckets.map((bucket) => ({
          id: bucket.label,
          label: bucket.label,
          value: bucket.avgQuality,
          meta: `${bucket.avgQuality.toFixed(1)} / 5 · n=${bucket.count}`,
        }))}
        theme={theme}
      />
    );
  }

  if (payload.kind === 'self_knowledge') {
    return (
      <V11DistributionBars
        accessibilityLabel={t(language, 'stage3SelfKnowledgeVisualLabel')}
        rows={payload.weeks.map((week) => ({
          id: week.week,
          label: week.week,
          value: week.error,
          meta: `${Math.round(week.error)}m`,
        }))}
        theme={theme}
      />
    );
  }

  if (payload.kind === 'weekly_execution') {
    return (
      <View style={{ gap: v11Spacing.lg }}>
        <V11TrendCanvas
          accessibilityLabel={t(language, 'stage3TrendVisualLabel')}
          baselineMinutes={null}
          onSelectPoint={onSelectTrend}
          points={payload.points}
          theme={theme}
        />
        {payload.allocation.length > 0 ? (
          <V11DistributionBars
            accessibilityLabel={t(language, 'stage3AllocationVisualLabel')}
            rows={payload.allocation.map((row) => ({
              id: row.id,
              label: row.label,
              value: row.minutes,
              meta: `${row.minutes}m`,
            }))}
            theme={theme}
          />
        ) : null}
      </View>
    );
  }

  if (payload.kind === 'rescue') {
    return (
      <V11DistributionBars
        accessibilityLabel={t(language, 'stage3RescueVisualLabel')}
        rows={[
          { id: 'started', label: t(language, 'rescueStarts'), value: payload.total, meta: String(payload.total) },
          { id: 'completed', label: t(language, 'completed'), value: payload.completed, meta: String(payload.completed) },
        ]}
        theme={theme}
      />
    );
  }

  return (
    <V11DistributionBars
      accessibilityLabel={t(language, 'stage3SystemLoopVisualLabel')}
      rows={[
        { id: 'goals', label: t(language, 'goalsWithSkills'), value: payload.activeGoals, meta: `${payload.activeGoals}/${payload.totalGoals}` },
        { id: 'skills', label: t(language, 'skillsWithLogs'), value: payload.skillsWithLogs, meta: `${payload.skillsWithLogs}/${payload.totalSkills}` },
        { id: 'schedule', label: t(language, 'scheduledBlocksThisWeek'), value: payload.scheduledBlocksThisWeek, meta: String(payload.scheduledBlocksThisWeek) },
        { id: 'logs', label: t(language, 'executionLogsThisWeek'), value: payload.executionLogsThisWeek, meta: String(payload.executionLogsThisWeek) },
      ]}
      theme={theme}
    />
  );
}

export default function V11InsightsAdvancedCanvas({
  language,
  mode,
  onOpenDetail,
  onSelectTrend,
  theme,
}: {
  language: Lang;
  mode: V11AdvancedMode;
  onOpenDetail: () => void;
  onSelectTrend: (point: V11TrendPoint) => void;
  theme: V11ThemeTokens;
}) {
  return (
    <WebView dataSet={{ 'v11-insights-role': 'advanced-canvas' }} style={{ gap: v11Spacing.lg }}>
      <View style={{ gap: v11Spacing.xs }}>
        <Text style={{ color: theme.text.metadata, ...v11Typography.label }}>{t(language, 'stage3AnalysisQuestion')}</Text>
        <Text style={{ color: theme.text.primary, fontSize: 30, lineHeight: 38, fontWeight: '400' }}>
          {t(language, mode.titleKey)}
        </Text>
        <Text style={{ color: theme.text.secondary, ...v11Typography.body }}>{copy(language, mode.summary)}</Text>
      </View>

      {mode.status === 'available' ? (
        <ModeVisual language={language} mode={mode} onSelectTrend={onSelectTrend} theme={theme} />
      ) : (
        <View style={{ minHeight: 180, justifyContent: 'center', gap: v11Spacing.sm }}>
          <Text style={{ color: theme.text.primary, fontSize: 20, lineHeight: 28, fontWeight: '400' }}>
            {t(language, 'dataStillAccumulating')}
          </Text>
          <Text style={{ color: theme.text.secondary, ...v11Typography.body }}>
            {copy(language, mode.limitation)}
          </Text>
          <Text style={{ color: theme.text.metadata, ...v11Typography.metadata }}>
            {t(language, 'sampleN')}: {mode.sampleSize}
          </Text>
        </View>
      )}

      <WebPressable
        accessibilityLabel={t(language, 'stage3OpenAnalysisDetail')}
        accessibilityRole="button"
        dataSet={{ 'v11-insights-role': 'inline-link' }}
        onPress={onOpenDetail}
      >
        <Text style={{ color: theme.text.secondary, ...v11Typography.body }}>{t(language, 'stage3OpenAnalysisDetail')}</Text>
        <V11RebaselineIcon color={theme.text.secondary} name="arrow" size={17} />
      </WebPressable>
    </WebView>
  );
}
