import React, { useEffect, useMemo, useRef } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import QuestIcon from '../components/ui/QuestIcon';
import type { V11TodayPresentation } from '../v11/todayPresentation';
import {
  getV11ThemeTokens,
  V11ThemeMode,
  v11Typography,
} from '../v11/tokens';
import V11GlowOrb from '../v11/components/V11GlowOrb';
import { V11Pill } from '../v11/components/V11Material';
import { V11IntervalRange } from '../v11/components/V11MicroInstruments';
import '../v11/v11-components.css';
import './v11-today.css';

const WebView = View as any;
const WebPressable = Pressable as any;
const WebText = Text as any;

export type V11TodayRow = {
  id: string;
  title: string;
  metadata?: string;
  trailing?: string;
  onPress?: () => void;
};

export type V11TodayLabels = {
  capture: string;
  collapseEvidence: string;
  currentState: string;
  emptyReading: string;
  evidence: string;
  evidenceStage: string;
  expandEvidence: string;
  noEvidence: string;
  plan: string;
  recentExecution: string;
  stateOutOfFive: string;
  updateState: string;
};

export type V11TodaySurfaceProps = {
  captureSlot?: React.ReactNode;
  contextLine?: string;
  decision: V11TodayPresentation;
  expanded: boolean;
  formatCopy: (copy: V11TodayPresentation['judgement']) => string;
  labels: V11TodayLabels;
  language: 'zh' | 'en';
  onCapture: () => void;
  onExecute: () => void;
  onOpenState: () => void;
  onToggleEvidence: () => void;
  planRows?: V11TodayRow[];
  recentRows?: V11TodayRow[];
  reducedMotion: boolean;
  secondarySlot?: React.ReactNode;
  themeMode: V11ThemeMode;
  topLine: string;
};

function RollingReading({
  reducedMotion,
  value,
}: {
  reducedMotion: boolean;
  value: number;
}) {
  const glyphs = String(value).split('');

  return (
    <WebView
      accessibilityLabel={String(value)}
      accessibilityRole="text"
      dataSet={{
        'v11-motion': reducedMotion ? 'reduced' : 'normal',
        'v11-today-role': 'rolling-reading',
      }}
    >
      {glyphs.map((glyph, index) => (
        <WebText
          key={`${glyph}-${index}`}
          dataSet={{ 'v11-today-role': 'rolling-glyph' }}
          style={[
            v11Typography.reading,
            { animationDelay: reducedMotion ? '0ms' : `${80 + index * 24}ms` } as any,
          ]}
        >
          {glyph}
        </WebText>
      ))}
    </WebView>
  );
}

function V11DayTrack({
  accessibilityLabel,
  color,
  mutedColor,
  reducedMotion,
}: {
  accessibilityLabel: string;
  color: string;
  mutedColor: string;
  reducedMotion: boolean;
}) {
  const cursorRef = useRef<any>(null);
  const initialProgress = useMemo(() => {
    const now = new Date();
    return (now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60) / 1440;
  }, []);

  useEffect(() => {
    const node = cursorRef.current;
    if (!node || reducedMotion || Platform.OS !== 'web') return;
    let frame = 0;
    const update = () => {
      const now = new Date();
      const progress = (
        now.getHours() * 3600
        + now.getMinutes() * 60
        + now.getSeconds()
        + now.getMilliseconds() / 1000
      ) / 86400;
      node.style.setProperty('--v11-day-progress', String(progress));
      frame = window.requestAnimationFrame(update);
    };
    frame = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(frame);
  }, [reducedMotion]);

  return (
    <WebView
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      dataSet={{ 'v11-today-role': 'day-track' }}
      style={{
        '--v11-day-color': color,
        '--v11-day-muted': mutedColor,
      }}
    >
      <V11IntervalRange
        accessibilityLabel={accessibilityLabel}
        color={color}
        current={initialProgress}
        end={0.8}
        mutedColor={mutedColor}
        size={56}
        start={0.26}
      />
      <WebView
        ref={cursorRef}
        dataSet={{ 'v11-today-role': 'day-cursor' }}
        style={{ '--v11-day-progress': String(initialProgress) }}
      />
    </WebView>
  );
}

function CompactRows({
  rows,
  theme,
}: {
  rows: V11TodayRow[];
  theme: ReturnType<typeof getV11ThemeTokens>;
}) {
  return (
    <WebView dataSet={{ 'v11-today-role': 'compact-rows' }}>
      {rows.slice(0, 3).map((row) => (
        <WebPressable
          accessibilityRole={row.onPress ? 'button' : undefined}
          key={row.id}
          onPress={row.onPress}
          dataSet={{ 'v11-today-role': 'compact-row' }}
        >
          <WebView style={{ minWidth: 0, flex: 1 }}>
            <Text
              numberOfLines={1}
              style={[styles.rowTitle, { color: theme.text.primary }]}
            >
              {row.title}
            </Text>
            {row.metadata ? (
              <Text
                numberOfLines={1}
                style={[styles.rowMeta, { color: theme.text.secondary }]}
              >
                {row.metadata}
              </Text>
            ) : null}
          </WebView>
          {row.trailing ? (
            <Text style={[styles.rowMeta, { color: theme.text.metadata }]}>
              {row.trailing}
            </Text>
          ) : null}
        </WebPressable>
      ))}
    </WebView>
  );
}

export default function V11TodaySurface({
  captureSlot,
  contextLine,
  decision,
  expanded,
  formatCopy,
  labels,
  language,
  onCapture,
  onExecute,
  onOpenState,
  onToggleEvidence,
  planRows = [],
  recentRows = [],
  reducedMotion,
  secondarySlot,
  themeMode,
  topLine,
}: V11TodaySurfaceProps) {
  const theme = getV11ThemeTokens(themeMode);
  const readingAvailable = decision.reading.kind === 'state'
    && decision.reading.value != null;
  const evidenceLabel = expanded ? labels.collapseEvidence : labels.expandEvidence;
  const judgement = formatCopy(decision.judgement);
  const actionLabel = formatCopy(decision.actionLabel);
  const cssVariables = {
    '--v11-today-bg': theme.field.background,
    '--v11-today-field-near': theme.field.near,
    '--v11-today-field-middle': theme.field.middle,
    '--v11-today-field-far': theme.field.far,
    '--v11-today-grid': theme.field.grid,
    '--v11-today-text': theme.text.primary,
    '--v11-today-secondary': theme.text.secondary,
    '--v11-today-metadata': theme.text.metadata,
    '--v11-today-primary': theme.glow.primary,
    '--v11-today-supporting': theme.glow.supporting,
    '--v11-today-soft': theme.questTheme.colors.cardSurface,
  } as any;

  return (
    <WebView
      dataSet={{
        'v11-evidence-stage': decision.evidenceStage.toLowerCase(),
        'v11-language': language,
        'v11-motion': reducedMotion ? 'reduced' : 'normal',
        'v11-theme': themeMode,
        'v11-today-role': 'surface',
      }}
      style={cssVariables}
    >
      <WebView dataSet={{ 'v11-today-role': 'field' }} pointerEvents="none" />
      <V11GlowOrb
        stage={decision.evidenceStage}
        style={styles.primaryGlow}
        theme={theme}
      />
      <V11GlowOrb
        stage={decision.evidenceStage === 'S3' ? 'S2' : decision.evidenceStage}
        style={styles.supportingGlow}
        theme={theme}
        tone="supporting"
      />

      <WebView dataSet={{ 'v11-today-role': 'top-line' }}>
        <Text style={[styles.topLine, { color: theme.text.metadata }]}>
          {topLine}
        </Text>
        <WebText
          dataSet={{ 'v11-today-role': 'stage-label' }}
          style={[styles.topLine, { color: theme.text.metadata }]}
        >
          {labels.evidenceStage} · {decision.evidenceStage}
        </WebText>
      </WebView>

      <WebView dataSet={{ 'v11-today-role': 'decision-core' }}>
        <WebPressable
          accessibilityLabel={readingAvailable ? evidenceLabel : labels.updateState}
          accessibilityRole="button"
          accessibilityState={{ expanded: readingAvailable ? expanded : undefined }}
          dataSet={{ 'v11-today-role': 'reading-button' }}
          onPress={readingAvailable ? onToggleEvidence : onOpenState}
        >
          {readingAvailable ? (
            <>
              <RollingReading
                reducedMotion={reducedMotion}
                value={decision.reading.value as number}
              />
              <Text style={[styles.readingUnit, { color: theme.text.secondary }]}>
                {labels.stateOutOfFive}
              </Text>
            </>
          ) : (
            <Text style={[styles.emptyReading, { color: theme.text.primary }]}>
              {labels.emptyReading}
            </Text>
          )}
        </WebPressable>

        {readingAvailable ? (
          <WebPressable
            accessibilityLabel={labels.updateState}
            accessibilityRole="button"
            dataSet={{ 'v11-today-role': 'state-update' }}
            onPress={onOpenState}
          >
            <QuestIcon
              color={theme.text.primary}
              name="activity"
              size={19}
              strokeWidth={1.5}
            />
          </WebPressable>
        ) : null}

        <Text style={[styles.judgement, { color: theme.text.primary }]}>
          {judgement}
        </Text>
        {contextLine ? (
          <Text style={[styles.contextLine, { color: theme.text.secondary }]}>
            {contextLine}
          </Text>
        ) : null}

        <V11Pill
          accessibilityLabel={actionLabel}
          contentStyle={styles.actionContent}
          onPress={onExecute}
          reducedMotion={reducedMotion}
          stage={decision.evidenceStage}
          style={styles.actionPill}
          theme={theme}
        >
          <WebView dataSet={{ 'v11-today-role': 'action-copy' }}>
            <Text style={[styles.actionIndex, { color: theme.text.metadata }]}>
              01
            </Text>
            <Text style={[styles.actionLabel, { color: theme.text.primary }]}>
              {actionLabel}
            </Text>
          </WebView>
          <QuestIcon
            color={theme.text.primary}
            name="play"
            size={18}
            strokeWidth={1.5}
          />
        </V11Pill>
      </WebView>

      <WebView
        accessibilityElementsHidden={!expanded}
        dataSet={{
          'v11-expanded': expanded ? 'true' : 'false',
          'v11-today-role': 'evidence-expand',
        }}
        importantForAccessibility={expanded ? 'auto' : 'no-hide-descendants'}
      >
        <WebView dataSet={{ 'v11-today-role': 'evidence-inner' }}>
          <Text style={[styles.sectionLabel, { color: theme.text.metadata }]}>
            {labels.evidence}
          </Text>
          {(decision.evidence.length ? decision.evidence.map((item) => ({
            id: item.id,
            text: formatCopy(item.copy),
          })) : [{
            id: 'empty',
            text: labels.noEvidence,
          }]).slice(0, 4).map((item, index) => (
            <WebView
              key={item.id}
              dataSet={{ 'v11-today-role': 'evidence-row' }}
              style={{ animationDelay: reducedMotion ? '0ms' : `${80 + index * 40}ms` } as any}
            >
              <Text style={[styles.evidenceIndex, { color: theme.text.metadata }]}>
                {String(index + 1).padStart(2, '0')}
              </Text>
              <Text style={[styles.evidenceCopy, { color: theme.text.secondary }]}>
                {item.text}
              </Text>
            </WebView>
          ))}

          <V11DayTrack
            accessibilityLabel={labels.currentState}
            color={theme.glow.primary}
            mutedColor={theme.questTheme.colors.border}
            reducedMotion={reducedMotion}
          />

          {planRows.length ? (
            <WebView dataSet={{ 'v11-today-role': 'secondary-section' }}>
              <Text style={[styles.sectionLabel, { color: theme.text.metadata }]}>
                {labels.plan}
              </Text>
              <CompactRows rows={planRows} theme={theme} />
            </WebView>
          ) : null}

          {recentRows.length ? (
            <WebView dataSet={{ 'v11-today-role': 'secondary-section' }}>
              <Text style={[styles.sectionLabel, { color: theme.text.metadata }]}>
                {labels.recentExecution}
              </Text>
              <CompactRows rows={recentRows} theme={theme} />
            </WebView>
          ) : null}

          {secondarySlot}
        </WebView>
      </WebView>

      {captureSlot ?? (
        <WebPressable
          accessibilityLabel={labels.capture}
          accessibilityRole="button"
          dataSet={{ 'v11-today-role': 'capture-trigger' }}
          onPress={onCapture}
        >
          <QuestIcon
            color={theme.text.primary}
            name="plus"
            size={22}
            strokeWidth={1.5}
          />
        </WebPressable>
      )}
    </WebView>
  );
}

const styles = StyleSheet.create({
  topLine: v11Typography.metadata,
  judgement: v11Typography.judgement,
  contextLine: v11Typography.body,
  readingUnit: {
    ...v11Typography.body,
    paddingBottom: 13,
  },
  emptyReading: {
    fontSize: 34,
    lineHeight: 43,
    fontWeight: '400',
    letterSpacing: -0.8,
  },
  actionPill: {
    width: '100%',
  },
  actionContent: {
    minHeight: 72,
    paddingHorizontal: 22,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  actionIndex: v11Typography.metadata,
  actionLabel: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
    flex: 1,
  },
  sectionLabel: v11Typography.label,
  evidenceIndex: v11Typography.metadata,
  evidenceCopy: {
    ...v11Typography.body,
    flex: 1,
  },
  rowTitle: v11Typography.body,
  rowMeta: v11Typography.metadata,
  primaryGlow: {
    position: 'absolute',
    top: 102,
    left: -74,
  },
  supportingGlow: {
    position: 'absolute',
    top: 392,
    right: -126,
  },
});
