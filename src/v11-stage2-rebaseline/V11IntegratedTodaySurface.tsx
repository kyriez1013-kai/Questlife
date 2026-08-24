import React, { useEffect } from 'react';
import {
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import type { V11TodayPresentation } from '../v11/todayPresentation';
import {
  getV11ThemeTokens,
  v11Spacing,
  v11Typography,
  type V11ThemeMode,
} from '../v11/tokens';
import V11GlowOrb from '../v11/components/V11GlowOrb';
import { V11Pill } from '../v11/components/V11Material';
import V11RebaselineIcon from './V11RebaselineIcon';
import './v11-stage2-rebaseline.css';

const WebView = View as any;
const WebPressable = Pressable as any;
const WebText = Text as any;

export type V11IntegratedPlanRow = {
  id: string;
  metadata?: string;
  onDone?: () => void;
  onStart?: () => void;
  time?: string;
  title: string;
};

export type V11IntegratedUtilityAction = {
  id: string;
  label: string;
  metadata?: string;
  onPress: () => void;
};

export type V11IntegratedLatestRecord = {
  accessibilityLabel: string;
  metadata?: string;
  onDelete?: () => void;
  onPress?: () => void;
  title: string;
};

export type V11IntegratedTodayLabels = {
  capture: string;
  collapseDetails: string;
  currentState: string;
  decisionEvidence: string;
  deleteRecord: string;
  directLog: string;
  done: string;
  evidenceStage: string;
  expandDetails: string;
  feedbackSaved: string;
  feedbackSaving: string;
  generating: string;
  instantRead: string;
  instantReadUnavailable: string;
  latestRecord: string;
  noLatestRecord: string;
  notUseful: string;
  plan: string;
  planPreview: string;
  start: string;
  threeItemsMaximum: string;
  updateState: string;
  useful: string;
};

type InstantReadProps = {
  expanded: boolean;
  feedback: 'useful' | 'not_useful' | null;
  feedbackStatus: 'idle' | 'saving' | 'saved' | 'error';
  firstStep?: string;
  headline?: string;
  onFeedback: (feedback: 'useful' | 'not_useful') => void;
  onToggle: () => void;
  source?: string;
  status: 'idle' | 'loading' | 'ready' | 'fallback' | 'error';
};

type Props = {
  capturePlaceholder: string;
  contextDate: string;
  contextMeta: string;
  debugPerformance: boolean;
  decision: V11TodayPresentation;
  expanded: boolean;
  formatCopy: (copy: V11TodayPresentation['judgement']) => string;
  instantRead: InstantReadProps;
  labels: V11IntegratedTodayLabels;
  latestRecord?: V11IntegratedLatestRecord;
  onCapture: () => void;
  onDecisionDetails: () => void;
  onDirectLog: () => void;
  onOpenState: () => void;
  onPrimaryAction: () => void;
  onToggleExpanded: () => void;
  performanceMode: string;
  planRows: V11IntegratedPlanRow[];
  reducedMotion: boolean;
  stateLabel: string;
  themeMode: V11ThemeMode;
  utilityActions: V11IntegratedUtilityAction[];
};

function useIntegratedPerformanceMeasurement({
  enabled,
  evidenceStage,
  layer,
  mode,
  reducedMotion,
  theme,
}: {
  enabled: boolean;
  evidenceStage: string;
  layer: 'l1' | 'l2';
  mode: string;
  reducedMotion: boolean;
  theme: V11ThemeMode;
}) {
  useEffect(() => {
    if (!enabled || Platform.OS !== 'web' || typeof window === 'undefined') return;
    let cancelled = false;
    let frame = 0;
    let previous: number | null = null;
    const intervals: number[] = [];
    const tick = (now: number) => {
      if (cancelled) return;
      if (previous != null) intervals.push(now - previous);
      previous = now;
      if (intervals.length < 300) {
        frame = window.requestAnimationFrame(tick);
        return;
      }
      const sorted = [...intervals].sort((a, b) => a - b);
      const quantile = (value: number) => (
        sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * value))]
      );
      const result = {
        composition: 'integrated-real-store',
        evidenceStage,
        frames: intervals.length,
        glowOrbs: 2,
        layer,
        max: sorted[sorted.length - 1],
        mean: intervals.reduce((sum, value) => sum + value, 0) / intervals.length,
        mode,
        over20: intervals.filter((value) => value > 20).length,
        over32: intervals.filter((value) => value > 32).length,
        p50: quantile(0.5),
        p95: quantile(0.95),
        p99: quantile(0.99),
        reducedMotion,
        theme,
      };
      (window as any).__questlifeV11IntegratedPerformance = result;
      console.info('[v11-integrated-performance]', JSON.stringify(result));
    };
    frame = window.requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [enabled, evidenceStage, layer, mode, reducedMotion, theme]);
}

function LatestRecord({
  labels,
  record,
  textColor,
  mutedColor,
}: {
  labels: V11IntegratedTodayLabels;
  record?: V11IntegratedLatestRecord;
  textColor: string;
  mutedColor: string;
}) {
  return (
    <WebView dataSet={{ 'v11-rebaseline-role': 'latest-record-production' }}>
      <WebPressable
        accessibilityLabel={record?.accessibilityLabel ?? labels.noLatestRecord}
        accessibilityRole={record?.onPress ? 'button' : undefined}
        accessibilityState={{ disabled: !record?.onPress }}
        dataSet={{ 'v11-rebaseline-role': 'latest-record' }}
        disabled={!record?.onPress}
        onPress={record?.onPress}
      >
        <WebView style={{ flex: 1, flexShrink: 1, minWidth: 0 }}>
          <Text style={{ color: mutedColor, fontSize: 10, lineHeight: 15, letterSpacing: 0.7 }}>
            {labels.latestRecord}
          </Text>
          <Text
            numberOfLines={2}
            style={{ color: record ? textColor : mutedColor, fontSize: 12.5, lineHeight: 18 }}
          >
            {record?.title ?? labels.noLatestRecord}
          </Text>
          {record?.metadata ? (
            <Text numberOfLines={1} style={{ color: mutedColor, fontSize: 10, lineHeight: 15 }}>
              {record.metadata}
            </Text>
          ) : null}
        </WebView>
        {record?.onPress ? (
          <WebView dataSet={{ 'v11-rebaseline-role': 'latest-record-trailing' }}>
            <V11RebaselineIcon name="arrow" size={14} color={mutedColor} />
          </WebView>
        ) : null}
      </WebPressable>
      {record?.onDelete ? (
        <WebPressable
          accessibilityLabel={labels.deleteRecord}
          accessibilityRole="button"
          dataSet={{ 'v11-rebaseline-role': 'latest-delete' }}
          onPress={record.onDelete}
        >
          <V11RebaselineIcon name="close" size={14} color={mutedColor} />
        </WebPressable>
      ) : null}
    </WebView>
  );
}

export default function V11IntegratedTodaySurface({
  capturePlaceholder,
  contextDate,
  contextMeta,
  debugPerformance,
  decision,
  expanded,
  formatCopy,
  instantRead,
  labels,
  latestRecord,
  onCapture,
  onDecisionDetails,
  onDirectLog,
  onOpenState,
  onPrimaryAction,
  onToggleExpanded,
  performanceMode,
  planRows,
  reducedMotion,
  stateLabel,
  themeMode,
  utilityActions,
}: Props) {
  const theme = getV11ThemeTokens(themeMode);
  const layer = expanded ? 'l2' : 'l1';
  const reading = decision.reading.kind === 'state' ? decision.reading.value : null;
  const actionLabel = formatCopy(decision.actionLabel);
  const actionReason = formatCopy(decision.actionReason);
  const judgement = formatCopy(decision.judgement);
  const visiblePlan = planRows.slice(0, 3);
  const cssVariables = {
    '--v11-rebaseline-bg': theme.field.background,
    '--v11-rebaseline-elevated': theme.questTheme.colors.surfaceElevated,
    '--v11-rebaseline-far': theme.field.far,
    '--v11-rebaseline-grid': theme.field.grid,
    '--v11-rebaseline-middle': theme.field.middle,
    '--v11-rebaseline-near': theme.field.near,
    '--v11-rebaseline-primary': theme.glow.primary,
    '--v11-rebaseline-soft': theme.questTheme.colors.cardSurface,
    '--v11-rebaseline-text': theme.text.primary,
    '--v11-rebaseline-neutral-border': theme.control.neutralBorder,
    '--v11-rebaseline-neutral-elevated': theme.control.neutralElevatedSurface,
    '--v11-rebaseline-neutral-pressed': theme.control.neutralPressedSurface,
    '--v11-rebaseline-neutral-surface': theme.control.neutralSurface,
    '--v11-today-context-gap': `${v11Spacing.sm}px`,
    '--v11-today-context-padding': `${v11Spacing.xs}px`,
    '--v11-today-hairline': `${v11Spacing.hairline}px`,
    '--v11-today-top-padding': `${v11Spacing.xl + v11Spacing.sm}px`,
  } as any;

  useIntegratedPerformanceMeasurement({
    enabled: debugPerformance,
    evidenceStage: decision.evidenceStage,
    layer,
    mode: performanceMode,
    reducedMotion,
    theme: themeMode,
  });

  return (
    <WebView
      dataSet={{
        'v11-evidence-stage': decision.evidenceStage.toLowerCase(),
        'v11-layer': layer,
        'v11-motion': reducedMotion ? 'reduced' : 'normal',
        'v11-production': 'true',
        'v11-rebaseline-role': 'production-root',
        'v11-theme': themeMode,
      }}
      style={cssVariables}
    >
      <WebView dataSet={{ 'v11-rebaseline-role': 'field' }} pointerEvents="none" />
      <V11GlowOrb
        stage={decision.evidenceStage}
        style={{ position: 'absolute', top: 126, left: -92 }}
        theme={theme}
      />
      <V11GlowOrb
        stage={decision.evidenceStage === 'S3' ? 'S2' : decision.evidenceStage}
        style={{ position: 'absolute', top: 510, right: -138 }}
        theme={theme}
        tone="supporting"
      />

      <WebView dataSet={{ 'v11-rebaseline-role': 'content' }}>
        <WebView dataSet={{ 'v11-rebaseline-role': 'context-line' }}>
          <WebView dataSet={{ 'v11-rebaseline-role': 'context-copy' }}>
            <WebText
              dataSet={{ 'v11-rebaseline-role': 'context-primary' }}
              style={{ color: theme.text.primary, ...v11Typography.context }}
            >
              {contextDate}
            </WebText>
            <WebText
              dataSet={{ 'v11-rebaseline-role': 'context-meta' }}
              style={{ color: theme.text.secondary, ...v11Typography.metadata }}
            >
              {contextMeta}
            </WebText>
          </WebView>
          <WebText
            dataSet={{ 'v11-rebaseline-role': 'context-stage' }}
            style={{ color: theme.text.metadata, ...v11Typography.metadata }}
          >
            {labels.evidenceStage} · {decision.evidenceStage}
          </WebText>
        </WebView>

        <WebView dataSet={{ 'v11-rebaseline-role': 'capture-group' }}>
          <WebPressable
            accessibilityLabel={capturePlaceholder}
            accessibilityRole="button"
            dataSet={{ 'v11-rebaseline-role': 'capture-entry' }}
            onPress={onCapture}
          >
            <WebView dataSet={{ 'v11-rebaseline-role': 'capture-leading' }}>
              <V11RebaselineIcon name="capture" size={17} color={theme.text.secondary} />
            </WebView>
            <WebView dataSet={{ 'v11-rebaseline-role': 'capture-copy' }}>
              <Text style={{ color: theme.text.primary, fontSize: 12.5, lineHeight: 17, fontWeight: '500' }}>
                {labels.capture}
              </Text>
              <Text
                numberOfLines={1}
                style={{ color: theme.text.secondary, fontSize: 12, lineHeight: 17 }}
              >
                {capturePlaceholder}
              </Text>
            </WebView>
            <WebView dataSet={{ 'v11-rebaseline-role': 'capture-send' }}>
              <V11RebaselineIcon name="arrow" size={16} color={theme.text.secondary} />
            </WebView>
          </WebPressable>
          <LatestRecord
            labels={labels}
            mutedColor={theme.text.metadata}
            record={latestRecord}
            textColor={theme.text.secondary}
          />
        </WebView>

        <WebView dataSet={{ 'v11-rebaseline-role': 'decision-group' }}>
          <WebView dataSet={{ 'v11-rebaseline-role': 'decision-copy' }}>
            <Text style={{ color: theme.text.metadata, fontSize: 10, lineHeight: 15, letterSpacing: 0.8 }}>
              {labels.decisionEvidence}
            </Text>
            <Text style={{ color: theme.text.primary, fontSize: 25, lineHeight: 33, fontWeight: '400' }}>
              {judgement}
            </Text>
          </WebView>

          <WebView dataSet={{ 'v11-rebaseline-role': 'action-stack' }}>
            <V11Pill
              accessibilityLabel={actionLabel}
              contentStyle={{
                paddingVertical: 12,
                paddingLeft: 20,
                paddingRight: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
              height={80}
              onPress={onPrimaryAction}
              reducedMotion={reducedMotion}
              stage={decision.evidenceStage}
              theme={theme}
            >
              <WebView style={{ flex: 1, flexShrink: 1, minWidth: 0 }}>
                <Text numberOfLines={2} style={{ flexShrink: 1, color: theme.text.primary, fontSize: 15, lineHeight: 20, fontWeight: '500' }}>
                  {actionLabel}
                </Text>
                <Text numberOfLines={2} style={{ flexShrink: 1, color: theme.text.secondary, fontSize: 11, lineHeight: 16, marginTop: 2 }}>
                  {actionReason}
                </Text>
              </WebView>
              <WebView dataSet={{ 'v11-rebaseline-role': 'primary-action-trailing' }}>
                <V11RebaselineIcon name="arrow" size={18} color={theme.text.primary} />
              </WebView>
            </V11Pill>
            <WebPressable
              accessibilityRole="button"
              dataSet={{ 'v11-rebaseline-role': 'direct-log' }}
              onPress={onDirectLog}
            >
              <V11RebaselineIcon name="add" size={15} color={theme.text.secondary} />
              <Text style={{ color: theme.text.secondary, fontSize: 12, lineHeight: 18 }}>
                {labels.directLog}
              </Text>
            </WebPressable>
          </WebView>
        </WebView>

        <WebView dataSet={{ 'v11-rebaseline-role': 'state-summary' }}>
          <WebPressable
            accessibilityLabel={expanded ? labels.collapseDetails : labels.expandDetails}
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            dataSet={{ 'v11-rebaseline-role': 'state-reading' }}
            onPress={onToggleExpanded}
          >
            <WebView style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: theme.text.metadata, fontSize: 10, lineHeight: 15, letterSpacing: 0.7 }}>
                {labels.currentState}
              </Text>
              <Text numberOfLines={2} style={{ color: theme.text.primary, fontSize: 22, lineHeight: 29, fontWeight: '400' }}>
                {reading == null ? stateLabel : `${reading} / 5 · ${stateLabel}`}
              </Text>
            </WebView>
            <V11RebaselineIcon
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={17}
              color={theme.text.secondary}
            />
          </WebPressable>
          <WebPressable
            accessibilityLabel={labels.updateState}
            accessibilityRole="button"
            dataSet={{ 'v11-rebaseline-role': 'state-update' }}
            onPress={onOpenState}
          >
            <V11RebaselineIcon name="update" size={17} color={theme.text.primary} />
            <Text style={{ color: theme.text.primary, fontSize: 11, fontWeight: '500' }}>
              {labels.updateState}
            </Text>
          </WebPressable>
        </WebView>

        {visiblePlan.length > 0 ? (
          <WebPressable
            accessibilityLabel={expanded ? labels.collapseDetails : labels.expandDetails}
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            dataSet={{ 'v11-rebaseline-role': 'plan-preview' }}
            onPress={onToggleExpanded}
          >
            <V11RebaselineIcon name="calendar" size={15} color={theme.glow.primary} />
            <Text numberOfLines={2} style={{ flex: 1, flexShrink: 1, minWidth: 0, color: theme.text.secondary, fontSize: 12.5, lineHeight: 18 }}>
              {labels.planPreview}
            </Text>
            <V11RebaselineIcon
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={15}
              color={theme.text.secondary}
            />
          </WebPressable>
        ) : null}

        {expanded ? (
          <WebView dataSet={{ 'v11-rebaseline-role': 'l2' }}>
            {instantRead.status !== 'idle' ? (
              <WebView dataSet={{ 'v11-rebaseline-role': 'instant-read' }}>
                <WebPressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: instantRead.expanded }}
                  dataSet={{ 'v11-rebaseline-role': 'section-heading' }}
                  disabled={instantRead.status === 'loading'}
                  onPress={instantRead.onToggle}
                >
                  <WebView style={{ flex: 1, flexShrink: 1, minWidth: 0 }}>
                    <Text style={{ color: theme.text.primary, fontSize: 16, lineHeight: 22, fontWeight: '500' }}>
                      {labels.instantRead}
                    </Text>
                    <Text numberOfLines={2} style={{ color: theme.text.secondary, fontSize: 12, lineHeight: 18 }}>
                      {instantRead.feedbackStatus === 'saving'
                        ? labels.feedbackSaving
                        : instantRead.feedback
                          ? `${labels.feedbackSaved} · ${instantRead.feedback === 'useful' ? labels.useful : labels.notUseful}`
                          : instantRead.source ?? ''}
                    </Text>
                  </WebView>
                  <V11RebaselineIcon
                    name={instantRead.expanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={theme.text.secondary}
                  />
                </WebPressable>
                {instantRead.status === 'loading' ? (
                  <Text style={{ color: theme.text.secondary, fontSize: 13, lineHeight: 19 }}>
                    {labels.generating}
                  </Text>
                ) : instantRead.status === 'error' || !instantRead.headline ? (
                  <Text style={{ color: theme.text.secondary, fontSize: 13, lineHeight: 19 }}>
                    {labels.instantReadUnavailable}
                  </Text>
                ) : instantRead.expanded ? (
                  <WebView dataSet={{ 'v11-rebaseline-role': 'instant-body' }}>
                    <Text style={{ color: theme.text.primary, fontSize: 14, lineHeight: 21 }}>
                      {instantRead.headline}
                    </Text>
                    {instantRead.firstStep ? (
                      <Text style={{ color: theme.text.secondary, fontSize: 13, lineHeight: 19 }}>
                        {instantRead.firstStep}
                      </Text>
                    ) : null}
                    <WebView dataSet={{ 'v11-rebaseline-role': 'feedback-row' }}>
                      {([
                        ['useful', labels.useful],
                        ['not_useful', labels.notUseful],
                      ] as const).map(([value, label]) => (
                        <WebPressable
                          accessibilityRole="button"
                          accessibilityState={{ selected: instantRead.feedback === value }}
                          dataSet={{
                            'v11-rebaseline-role': 'feedback-choice',
                            'v11-selected': instantRead.feedback === value ? 'true' : 'false',
                          }}
                          disabled={instantRead.feedbackStatus === 'saving'}
                          key={value}
                          onPress={() => instantRead.onFeedback(value)}
                        >
                          <Text style={{ color: theme.text.primary, fontSize: 12, fontWeight: '500' }}>
                            {label}
                          </Text>
                        </WebPressable>
                      ))}
                    </WebView>
                  </WebView>
                ) : null}
              </WebView>
            ) : null}

            {visiblePlan.length > 0 ? (
              <WebView dataSet={{ 'v11-rebaseline-role': 'section' }}>
                <WebView dataSet={{ 'v11-rebaseline-role': 'section-heading' }}>
                  <Text style={{ color: theme.text.primary, fontSize: 16, lineHeight: 22, fontWeight: '500' }}>
                    {labels.plan}
                  </Text>
                  <Text style={{ color: theme.text.metadata, fontSize: 10, letterSpacing: 0.6 }}>
                    {labels.threeItemsMaximum}
                  </Text>
                </WebView>
                {visiblePlan.map((row) => (
                  <WebView dataSet={{ 'v11-rebaseline-role': 'plan-row' }} key={row.id}>
                    {row.time ? (
                      <Text style={{ color: theme.text.metadata, fontSize: 11, width: 42 }}>{row.time}</Text>
                    ) : null}
                    <WebView dataSet={{ 'v11-rebaseline-role': 'plan-rail' }} />
                    <WebView style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={2} style={{ color: theme.text.primary, fontSize: 14, lineHeight: 20, fontWeight: '500' }}>
                        {row.title}
                      </Text>
                      {row.metadata ? (
                        <Text numberOfLines={2} style={{ color: theme.text.secondary, fontSize: 12, lineHeight: 18 }}>
                          {row.metadata}
                        </Text>
                      ) : null}
                    </WebView>
                    <WebView dataSet={{ 'v11-rebaseline-role': 'row-actions' }}>
                      {row.onStart ? (
                        <WebPressable
                          accessibilityLabel={`${labels.start} ${row.title}`}
                          accessibilityRole="button"
                          dataSet={{ 'v11-rebaseline-role': 'row-action' }}
                          onPress={row.onStart}
                        >
                          <Text style={{ color: theme.text.primary, fontSize: 12, fontWeight: '500' }}>
                            {labels.start}
                          </Text>
                        </WebPressable>
                      ) : null}
                      {row.onDone ? (
                        <WebPressable
                          accessibilityLabel={`${labels.done} ${row.title}`}
                          accessibilityRole="button"
                          dataSet={{ 'v11-rebaseline-role': 'row-done' }}
                          onPress={row.onDone}
                        >
                          <Text style={{ color: theme.text.secondary, fontSize: 11, fontWeight: '500' }}>
                            {labels.done}
                          </Text>
                        </WebPressable>
                      ) : null}
                    </WebView>
                  </WebView>
                ))}
              </WebView>
            ) : null}

            <WebPressable
              accessibilityRole="button"
              dataSet={{ 'v11-rebaseline-role': 'evidence-summary' }}
              onPress={onDecisionDetails}
            >
              <V11RebaselineIcon name="insights" size={22} color={theme.glow.primary} />
              <WebView style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: theme.text.primary, fontSize: 14, lineHeight: 20, fontWeight: '500' }}>
                  {labels.decisionEvidence}
                </Text>
                <Text numberOfLines={2} style={{ color: theme.text.secondary, fontSize: 12, lineHeight: 18 }}>
                  {actionReason}
                </Text>
              </WebView>
              <WebView dataSet={{ 'v11-rebaseline-role': 'evidence-summary-trailing' }}>
                <V11RebaselineIcon name="arrow" size={15} color={theme.text.metadata} />
              </WebView>
            </WebPressable>

            {utilityActions.length > 0 ? (
              <WebView dataSet={{ 'v11-rebaseline-role': 'utility-list' }}>
                {utilityActions.map((action) => (
                  <WebPressable
                    accessibilityLabel={action.label}
                    accessibilityRole="button"
                    dataSet={{ 'v11-rebaseline-role': 'utility-row' }}
                    key={action.id}
                    onPress={action.onPress}
                  >
                    <Text style={{ color: theme.text.primary, fontSize: 13, lineHeight: 19, fontWeight: '500' }}>
                      {action.label}
                    </Text>
                    {action.metadata ? (
                      <Text numberOfLines={1} style={{ color: theme.text.metadata, fontSize: 10, lineHeight: 15 }}>
                        {action.metadata}
                      </Text>
                    ) : null}
                  </WebPressable>
                ))}
              </WebView>
            ) : null}

            <WebPressable
              accessibilityLabel={labels.collapseDetails}
              accessibilityRole="button"
              dataSet={{ 'v11-rebaseline-role': 'l2-collapse-end' }}
              onPress={onToggleExpanded}
            >
              <Text style={{ color: theme.text.secondary, fontSize: 12, lineHeight: 18 }}>
                {labels.collapseDetails}
              </Text>
              <V11RebaselineIcon name="chevron-up" size={15} color={theme.text.secondary} />
            </WebPressable>
          </WebView>
        ) : null}
      </WebView>
    </WebView>
  );
}
