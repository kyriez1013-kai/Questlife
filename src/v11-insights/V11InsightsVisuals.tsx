import React, { useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, {
  Circle,
  Line,
  Path,
  Polyline,
  Rect,
} from 'react-native-svg';
import type { V11ThemeTokens, V11EvidenceStage } from '../v11/tokens';
import type { V11TrendPoint } from './insightsPresentation';

const WebView = View as any;
const WebPressable = Pressable as any;

const PLOT_WIDTH = 640;
const PLOT_HEIGHT = 196;
const PLOT_LEFT = 28;
const PLOT_RIGHT = 18;
const PLOT_TOP = 22;
const PLOT_BOTTOM = 28;

export function V11EvidenceStageMarker({
  accessibilityLabel,
  stage,
  theme,
}: {
  accessibilityLabel: string;
  stage: V11EvidenceStage;
  theme: V11ThemeTokens;
}) {
  const active = Number(stage.slice(1));
  return (
    <WebView
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      dataSet={{ 'v11-insights-visual': 'evidence-stage' }}
      style={styles.stageMarker}
    >
      {(['S0', 'S1', 'S2', 'S3'] as const).map((value, index) => (
        <View
          key={value}
          style={[
            styles.stageTick,
            {
              backgroundColor: index <= active
                ? theme.glow.primary
                : theme.questTheme.colors.border,
              opacity: index <= active ? 0.34 + index * 0.18 : 0.45,
            },
          ]}
        />
      ))}
    </WebView>
  );
}

function plotGeometry(points: V11TrendPoint[]) {
  const values = points
    .map((point) => point.minutes)
    .filter((value): value is number => value != null);
  const maximum = Math.max(1, ...values);
  const usableWidth = PLOT_WIDTH - PLOT_LEFT - PLOT_RIGHT;
  const usableHeight = PLOT_HEIGHT - PLOT_TOP - PLOT_BOTTOM;
  const denominator = Math.max(1, points.length - 1);
  return points.map((point, index) => ({
    ...point,
    x: PLOT_LEFT + index / denominator * usableWidth,
    y: point.minutes == null
      ? PLOT_HEIGHT - PLOT_BOTTOM
      : PLOT_TOP + (1 - point.minutes / maximum) * usableHeight,
  }));
}

function consecutiveSegments(points: ReturnType<typeof plotGeometry>) {
  const segments: string[][] = [];
  let current: string[] = [];
  points.forEach((point) => {
    if (point.minutes == null) {
      if (current.length > 0) segments.push(current);
      current = [];
      return;
    }
    current.push(`${point.x},${point.y}`);
  });
  if (current.length > 0) segments.push(current);
  return segments;
}

export function V11TrendCanvas({
  accessibilityLabel,
  baselineMinutes,
  compact = false,
  onSelectPoint,
  points,
  selectedDate,
  theme,
}: {
  accessibilityLabel: string;
  baselineMinutes: number | null;
  compact?: boolean;
  onSelectPoint: (point: V11TrendPoint) => void;
  points: V11TrendPoint[];
  selectedDate?: string | null;
  theme: V11ThemeTokens;
}) {
  const geometry = useMemo(() => plotGeometry(points), [points]);
  const segments = useMemo(() => consecutiveSegments(geometry), [geometry]);
  const values = points.map((point) => point.minutes).filter((value): value is number => value != null);
  const maximum = Math.max(1, ...values);
  const usableHeight = PLOT_HEIGHT - PLOT_TOP - PLOT_BOTTOM;
  const baselineY = baselineMinutes == null
    ? null
    : PLOT_TOP + (1 - Math.min(1, baselineMinutes / maximum)) * usableHeight;

  return (
    <WebView
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      dataSet={{ 'v11-insights-visual': 'trend-canvas' }}
      style={[styles.trendWrap, compact && styles.trendWrapCompact]}
    >
      <Svg height="100%" preserveAspectRatio="none" viewBox={`0 0 ${PLOT_WIDTH} ${PLOT_HEIGHT}`} width="100%">
        {Array.from({ length: 13 }, (_, index) => {
          const x = PLOT_LEFT + index / 12 * (PLOT_WIDTH - PLOT_LEFT - PLOT_RIGHT);
          return (
            <Line
              key={index}
              stroke={theme.questTheme.colors.border}
              strokeOpacity={index % 2 === 0 ? 0.58 : 0.28}
              strokeWidth={index % 2 === 0 ? 0.8 : 0.45}
              x1={x}
              x2={x}
              y1={PLOT_TOP}
              y2={PLOT_HEIGHT - PLOT_BOTTOM}
            />
          );
        })}
        {baselineY != null ? (
          <Line
            stroke={theme.text.secondary}
            strokeDasharray="5 5"
            strokeOpacity={0.62}
            strokeWidth={0.8}
            x1={PLOT_LEFT}
            x2={PLOT_WIDTH - PLOT_RIGHT}
            y1={baselineY}
            y2={baselineY}
          />
        ) : null}
        {segments.map((segment, index) => (
          segment.length > 1 ? (
            <Polyline
              key={index}
              fill="none"
              points={segment.join(' ')}
              stroke={theme.glow.primary}
              strokeLinejoin="round"
              strokeWidth={1.35}
            />
          ) : null
        ))}
        {geometry.map((point) => {
          const selected = point.date === selectedDate;
          if (point.observation === 'missing') {
            return (
              <Circle
                key={point.date}
                cx={point.x}
                cy={point.y}
                fill="none"
                r={2.5}
                stroke={theme.questTheme.colors.border}
                strokeWidth={0.8}
              />
            );
          }
          if (point.observation === 'untimed_execution') {
            return (
              <Path
                key={point.date}
                d={`M ${point.x - 3} ${point.y} L ${point.x + 3} ${point.y}`}
                stroke={theme.text.metadata}
                strokeWidth={1}
              />
            );
          }
          return (
            <Circle
              key={point.date}
              cx={point.x}
              cy={point.y}
              fill={theme.glow.primary}
              r={selected ? 5 : 3.2}
              stroke={selected ? theme.text.primary : theme.glow.primary}
              strokeWidth={selected ? 1.25 : 0}
            />
          );
        })}
      </Svg>
      <View style={styles.trendHitRow}>
        {points.map((point) => (
          <WebPressable
            accessibilityLabel={`${point.date}`}
            accessibilityRole="button"
            key={point.date}
            onPress={() => onSelectPoint(point)}
            style={styles.trendHit}
          >
            <Text style={[styles.trendDay, { color: theme.text.metadata }]}>{point.dayLabel}</Text>
          </WebPressable>
        ))}
      </View>
    </WebView>
  );
}

export function V11EvidenceMeter({
  accessibilityLabel,
  activeDays,
  theme,
  windowDays = 7,
}: {
  accessibilityLabel: string;
  activeDays: number;
  theme: V11ThemeTokens;
  windowDays?: number;
}) {
  const safeWindow = Math.max(1, Math.round(windowDays));
  const safeActive = Math.max(0, Math.min(safeWindow, Math.round(activeDays)));

  return (
    <WebView
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      dataSet={{ 'v11-insights-visual': 'evidence-meter' }}
      style={styles.evidenceMeter}
    >
      {Array.from({ length: safeWindow }, (_, index) => (
        <View
          key={index}
          style={[
            styles.evidenceSegment,
            {
              backgroundColor: index < safeActive
                ? theme.glow.primary
                : theme.questTheme.colors.border,
              opacity: index < safeActive ? 0.78 : 0.52,
            },
          ]}
        />
      ))}
    </WebView>
  );
}

export function V11BaselineBand({
  accessibilityLabel,
  baselineMinutes,
  currentMinutes,
  observedRangeMinutes,
  theme,
}: {
  accessibilityLabel: string;
  baselineMinutes: number | null;
  currentMinutes: number | null;
  observedRangeMinutes: { min: number; max: number } | null;
  theme: V11ThemeTokens;
}) {
  const scaleMax = Math.max(
    1,
    baselineMinutes ?? 0,
    currentMinutes ?? 0,
    observedRangeMinutes?.max ?? 0,
  );
  const percentage = (value: number) => Math.max(0, Math.min(100, value / scaleMax * 100));
  const rangeLeft = observedRangeMinutes ? percentage(observedRangeMinutes.min) : 0;
  const rangeRight = observedRangeMinutes ? percentage(observedRangeMinutes.max) : 0;
  const rangeWidth = Math.max(2, rangeRight - rangeLeft);

  return (
    <WebView
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      dataSet={{ 'v11-insights-visual': 'baseline-band' }}
      style={styles.baselineBand}
    >
      <View style={[styles.baselineTrack, { backgroundColor: theme.questTheme.colors.border }]}>
        {observedRangeMinutes ? (
          <View
            style={[
              styles.baselineRange,
              {
                backgroundColor: theme.glow.supporting,
                left: `${rangeLeft}%`,
                width: `${rangeWidth}%`,
              },
            ]}
          />
        ) : null}
        {baselineMinutes != null ? (
          <View
            style={[
              styles.baselineReference,
              {
                backgroundColor: theme.text.secondary,
                left: `${percentage(baselineMinutes)}%`,
              },
            ]}
          />
        ) : null}
        {currentMinutes != null ? (
          <View
            style={[
              styles.baselineCurrent,
              {
                backgroundColor: theme.glow.primary,
                borderColor: theme.text.primary,
                left: `${percentage(currentMinutes)}%`,
              },
            ]}
          />
        ) : null}
      </View>
    </WebView>
  );
}

export function V11SignalCard({
  accessibilityLabel,
  body,
  evidence,
  onPress,
  status,
  theme,
  title,
}: {
  accessibilityLabel: string;
  body: string;
  evidence: string;
  onPress: () => void;
  status: string;
  theme: V11ThemeTokens;
  title: string;
}) {
  return (
    <WebPressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      dataSet={{ 'v11-insights-visual': 'signal-card' }}
      onPress={onPress}
      style={[styles.signalCard, { borderTopColor: theme.questTheme.colors.border }]}
    >
      <View style={styles.signalMetaRow}>
        <Text style={[styles.signalMeta, { color: theme.text.metadata }]}>{status}</Text>
        <Text style={[styles.signalMeta, { color: theme.text.metadata }]}>{evidence}</Text>
      </View>
      <Text style={[styles.signalTitle, { color: theme.text.primary }]}>{title}</Text>
      <Text style={[styles.signalBody, { color: theme.text.secondary }]} numberOfLines={3}>{body}</Text>
    </WebPressable>
  );
}

export function V11RangeList({
  accessibilityLabel,
  rows,
  theme,
}: {
  accessibilityLabel: string;
  rows: Array<{ id: string; label: string; value: number; reference?: boolean }>;
  theme: V11ThemeTokens;
}) {
  return (
    <WebView
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      dataSet={{ 'v11-insights-visual': 'range-list' }}
      style={styles.rangeList}
    >
      {rows.map((row) => {
        const safeValue = Math.max(0, Math.min(1, row.value));
        return (
          <View key={row.id} style={styles.rangeRow}>
            <View style={styles.rangeHeader}>
              <Text style={[styles.rangeLabel, { color: row.reference ? theme.text.metadata : theme.text.secondary }]} numberOfLines={2}>
                {row.label}
              </Text>
              <Text style={[styles.rangeValue, { color: row.reference ? theme.text.metadata : theme.text.primary }]}>
                {row.reference ? '—' : `${Math.round(safeValue * 100)}`}
              </Text>
            </View>
            <View style={[styles.rangeTrack, { backgroundColor: theme.questTheme.colors.border }]}> 
              {row.reference ? null : (
                <View style={[styles.rangeFill, { backgroundColor: theme.glow.primary, width: `${safeValue * 100}%` }]} />
              )}
            </View>
          </View>
        );
      })}
    </WebView>
  );
}

export function V11DistributionBars({
  accessibilityLabel,
  rows,
  theme,
}: {
  accessibilityLabel: string;
  rows: Array<{ id: string; label: string; value: number; meta?: string }>;
  theme: V11ThemeTokens;
}) {
  const maximum = Math.max(1, ...rows.map((row) => Math.max(0, row.value)));
  return (
    <WebView
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      dataSet={{ 'v11-insights-visual': 'distribution-bars' }}
      style={styles.distribution}
    >
      {rows.map((row) => (
        <View key={row.id} style={styles.distributionRow}>
          <View style={styles.distributionLabelRow}>
            <Text style={[styles.distributionLabel, { color: theme.text.secondary }]} numberOfLines={2}>{row.label}</Text>
            <Text style={[styles.distributionMeta, { color: theme.text.metadata }]}>{row.meta}</Text>
          </View>
          <View style={[styles.distributionTrack, { backgroundColor: theme.questTheme.colors.border }]}> 
            <View
              style={[
                styles.distributionFill,
                {
                  backgroundColor: theme.glow.primary,
                  width: `${Math.max(2, row.value / maximum * 100)}%`,
                },
              ]}
            />
          </View>
        </View>
      ))}
    </WebView>
  );
}

export function V11BeforeAfterPair({
  accessibilityLabel,
  left,
  right,
  theme,
}: {
  accessibilityLabel: string;
  left: { label: string; value: string };
  right: { label: string; value: string };
  theme: V11ThemeTokens;
}) {
  return (
    <WebView
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      dataSet={{ 'v11-insights-visual': 'before-after' }}
      style={styles.beforeAfter}
    >
      {[left, right].map((item, index) => (
        <View key={`${item.label}-${index}`} style={styles.beforeAfterColumn}>
          <Text style={[styles.beforeAfterLabel, { color: theme.text.metadata }]}>{item.label}</Text>
          <Text style={[styles.beforeAfterValue, { color: theme.text.primary }]}>{item.value}</Text>
        </View>
      ))}
      <View style={styles.beforeAfterArrow}>
        <Svg height="20" viewBox="0 0 48 20" width="48">
          <Line x1="3" x2="42" y1="10" y2="10" stroke={theme.text.secondary} strokeWidth={0.8} />
          <Path d="M 37 5 L 43 10 L 37 15" fill="none" stroke={theme.text.secondary} strokeWidth={0.8} />
        </Svg>
      </View>
    </WebView>
  );
}

const styles = StyleSheet.create({
  stageMarker: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stageTick: { width: 18, height: 2 },
  trendWrap: { width: '100%', height: 236, position: 'relative' },
  trendWrapCompact: { height: 190 },
  trendHitRow: { position: 'absolute', left: 8, right: 4, bottom: 0, height: 44, flexDirection: 'row' },
  trendHit: { minWidth: 44, minHeight: 44, flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 2 },
  trendDay: { fontSize: 10, lineHeight: 14, letterSpacing: 0.4 },
  evidenceMeter: { width: '100%', minHeight: 12, flexDirection: 'row', alignItems: 'center', gap: 4 },
  evidenceSegment: { height: 4, flex: 1, minWidth: 8 },
  baselineBand: { width: '100%', minHeight: 28, justifyContent: 'center', paddingHorizontal: 6 },
  baselineTrack: { position: 'relative', width: '100%', height: 2 },
  baselineRange: { position: 'absolute', top: -4, height: 10, opacity: 0.24 },
  baselineReference: { position: 'absolute', top: -7, width: 1, height: 16, opacity: 0.8 },
  baselineCurrent: { position: 'absolute', top: -6, width: 12, height: 12, marginLeft: -6, borderRadius: 6, borderWidth: 1 },
  signalCard: { width: '100%', minHeight: 132, paddingVertical: 14, gap: 8, borderTopWidth: 1 },
  signalMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  signalMeta: { flexShrink: 1, fontSize: 10, lineHeight: 14, letterSpacing: 0.6 },
  signalTitle: { fontSize: 17, lineHeight: 23, fontWeight: '500' },
  signalBody: { fontSize: 12, lineHeight: 18 },
  rangeList: { width: '100%', gap: 12 },
  rangeRow: { width: '100%', gap: 7 },
  rangeHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  rangeLabel: { flex: 1, fontSize: 12, lineHeight: 17 },
  rangeValue: { fontSize: 14, lineHeight: 18, fontWeight: '500' },
  rangeTrack: { height: 2, width: '100%' },
  rangeFill: { height: 2 },
  distribution: { width: '100%', gap: 14 },
  distributionRow: { gap: 7 },
  distributionLabelRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  distributionLabel: { flex: 1, fontSize: 12, lineHeight: 17 },
  distributionMeta: { fontSize: 10, lineHeight: 14 },
  distributionTrack: { height: 8, width: '100%', overflow: 'hidden', borderRadius: 4 },
  distributionFill: { height: '100%', borderRadius: 4 },
  beforeAfter: { minHeight: 116, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  beforeAfterColumn: { flex: 1, gap: 8 },
  beforeAfterLabel: { fontSize: 10, lineHeight: 14, letterSpacing: 0.6 },
  beforeAfterValue: { fontSize: 28, lineHeight: 34, fontWeight: '400' },
  beforeAfterArrow: { width: 48, alignItems: 'center', justifyContent: 'center' },
});
