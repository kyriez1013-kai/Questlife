import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { t, type Lang } from '../../i18n';
import type { V11ThemeTokens } from '../../v11/tokens';
import { v11Typography } from '../../v11/tokens';
import V11RebaselineIcon from '../../v11-stage2-rebaseline/V11RebaselineIcon';
import type { V11InsightCopy } from '../insightsPresentation';
import QuantTerminalChart from './QuantTerminalChart';
import type {
  QuantTerminalEvidence,
  QuantTerminalMetric,
  QuantTerminalPresentation,
  QuantTerminalSignal,
} from './quantTerminalPresentation';
import V11QuantTerminalInspector, { type QuantInspectorSelection } from './V11QuantTerminalInspector';
import './quant-terminal.css';

const WebView = View as any;
const WebPressable = Pressable as any;
const WebScrollView = ScrollView as any;
const WebText = Text as any;

function copy(language: Lang, value: V11InsightCopy) {
  if (value.kind === 'text') return value.text;
  return Object.entries(value.values || {}).reduce(
    (result, [key, replacement]) => result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(replacement)),
    t(language, value.key),
  );
}

function number(value: number | null) {
  if (value == null) return '—';
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function delta(value: number | null) {
  if (value == null) return '—';
  return `${value > 0 ? '+' : ''}${number(value)}`;
}

function baselineLabel(language: Lang, metric: QuantTerminalMetric) {
  if (metric.baseline.value != null) return number(metric.baseline.value);
  return t(language, `quantBaseline_${metric.baseline.status}`);
}

function SignalRow({
  language,
  onPress,
  signal,
  theme,
}: {
  language: Lang;
  onPress: () => void;
  signal: QuantTerminalSignal;
  theme: V11ThemeTokens;
}) {
  return (
    <WebPressable accessibilityRole="button" dataSet={{ 'quant-terminal-role': 'signal-row' }} onPress={onPress}>
      <WebView dataSet={{ 'quant-terminal-role': 'row-index' }}>
        <Text style={{ color: theme.text.metadata }}>{t(language, `quantSignal_${signal.status}`)}</Text>
        <Text style={{ color: theme.text.primary }}>{signal.evidenceCount}</Text>
      </WebView>
      <WebView dataSet={{ 'quant-terminal-role': 'row-copy' }}>
        <Text numberOfLines={1} style={{ color: theme.text.primary }}>{copy(language, signal.title)}</Text>
        <Text numberOfLines={1} style={{ color: theme.text.secondary }}>{copy(language, signal.detail)}</Text>
      </WebView>
      <V11RebaselineIcon color={theme.text.secondary} name="arrow" size={15} />
    </WebPressable>
  );
}

function EvidenceRow({
  evidence,
  language,
  onPress,
  theme,
}: {
  evidence: QuantTerminalEvidence;
  language: Lang;
  onPress: () => void;
  theme: V11ThemeTokens;
}) {
  return (
    <WebPressable accessibilityRole="button" dataSet={{ 'quant-terminal-role': 'evidence-row' }} onPress={onPress}>
      <WebView dataSet={{ 'quant-terminal-role': 'row-index' }}>
        <Text style={{ color: theme.text.metadata }}>{t(language, `quant${evidence.sourceKind[0].toUpperCase()}${evidence.sourceKind.slice(1)}`)}</Text>
        <Text style={{ color: theme.text.primary }}>{evidence.sourceIds.length}</Text>
      </WebView>
      <WebView dataSet={{ 'quant-terminal-role': 'row-copy' }}>
        <Text numberOfLines={1} style={{ color: theme.text.primary }}>{copy(language, evidence.title)}</Text>
        <Text numberOfLines={1} style={{ color: theme.text.secondary }}>{copy(language, evidence.detail)}</Text>
      </WebView>
      <V11RebaselineIcon color={theme.text.secondary} name="arrow" size={15} />
    </WebPressable>
  );
}

export default function V11QuantTerminal({
  language,
  model,
  onNextAction,
  onInspectorStateChange,
  performanceReadout,
  reducedMotion,
  theme,
}: {
  language: Lang;
  model: QuantTerminalPresentation;
  onNextAction: () => void;
  onInspectorStateChange?: (open: boolean) => void;
  performanceReadout?: string | null;
  reducedMotion: boolean;
  theme: V11ThemeTokens;
}) {
  const [metricId, setMetricId] = useState(model.defaultMetricId);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [inspector, setInspector] = useState<QuantInspectorSelection>(null);

  useEffect(() => {
    onInspectorStateChange?.(inspector != null);
  }, [inspector, onInspectorStateChange]);

  useEffect(() => {
    if (!model.metrics.some((metric) => metric.id === metricId)) setMetricId(model.defaultMetricId);
  }, [metricId, model.defaultMetricId, model.metrics]);

  const metric = useMemo(
    () => model.metrics.find((item) => item.id === metricId) ?? model.metrics[0],
    [metricId, model.metrics],
  );
  if (!metric) return null;

  return (
    <>
      <WebScrollView
        contentContainerStyle={{ paddingBottom: 118 }}
        dataSet={{ 'quant-terminal-role': 'scroll' }}
        showsVerticalScrollIndicator={false}
      >
        <WebView dataSet={{ 'quant-terminal-role': 'content' }}>
          <WebView dataSet={{ 'quant-terminal-role': 'header' }}>
            <WebView>
              <Text style={{ color: theme.text.metadata, ...v11Typography.label }}>{t(language, 'quantTerminalLabel')}</Text>
              <Text style={{ color: theme.text.secondary, ...v11Typography.metadata }}>
                {model.range.start} — {model.range.end}
              </Text>
            </WebView>
            <WebView dataSet={{ 'quant-terminal-role': 'maturity' }}>
              {model.fixture ? (
                <Text style={{ color: theme.text.metadata, ...v11Typography.metadata }}>
                  {t(language, 'quantQaFixture')} · {model.fixture.toUpperCase()}
                </Text>
              ) : null}
              <Text style={{ color: theme.text.primary }}>{t(language, model.maturityKey)}</Text>
            </WebView>
          </WebView>

          <WebView accessibilityRole="tablist" dataSet={{ 'quant-terminal-role': 'metric-selector' }}>
            {model.metrics.map((item) => (
              <WebPressable
                accessibilityRole="tab"
                accessibilityState={{ selected: item.id === metric.id }}
                dataSet={{ 'quant-selected': item.id === metric.id ? 'true' : 'false' }}
                key={item.id}
                onPress={() => {
                  setMetricId(item.id);
                  setSelectedDate(null);
                }}
              >
                <Text style={{ color: item.id === metric.id ? theme.text.primary : theme.text.metadata }}>
                  {t(language, item.labelKey)}
                </Text>
              </WebPressable>
            ))}
          </WebView>

          <WebView dataSet={{ 'quant-terminal-role': 'workspace' }}>
            <WebView dataSet={{ 'quant-terminal-role': 'metric-rail' }}>
              <WebView dataSet={{ 'quant-terminal-role': 'metric-current' }}>
                <Text style={{ color: theme.text.metadata, ...v11Typography.metadata }}>{t(language, 'quantCurrent')}</Text>
                <WebView>
                  <Text style={{ color: theme.text.primary }}>{number(metric.current)}</Text>
                  <Text style={{ color: theme.text.secondary }}>{t(language, metric.unitKey)}</Text>
                </WebView>
              </WebView>
              <WebView dataSet={{ 'quant-terminal-role': 'metric-cell' }}>
                <Text style={{ color: theme.text.metadata }}>{t(language, 'quantBaseline')}</Text>
                <Text style={{ color: theme.text.primary }}>{baselineLabel(language, metric)}</Text>
              </WebView>
              <WebView dataSet={{ 'quant-terminal-role': 'metric-cell' }}>
                <Text style={{ color: theme.text.metadata }}>{t(language, 'quantChange')}</Text>
                <Text style={{ color: theme.text.primary }}>{delta(metric.delta)}</Text>
              </WebView>
              <WebView dataSet={{ 'quant-terminal-role': 'metric-cell' }}>
                <Text style={{ color: theme.text.metadata }}>{t(language, 'quantEvidence')}</Text>
                <Text style={{ color: theme.text.primary }}>{metric.observations}</Text>
              </WebView>
            </WebView>

            <WebView dataSet={{ 'quant-terminal-role': 'canvas' }}>
              <WebView dataSet={{ 'quant-terminal-role': 'canvas-heading' }}>
                <WebView>
                  <Text style={{ color: theme.text.metadata, ...v11Typography.metadata }}>{t(language, 'quantMainTrend')}</Text>
                  <Text style={{ color: theme.text.primary }}>{t(language, metric.labelKey)}</Text>
                </WebView>
                <Text style={{ color: theme.text.metadata }}>
                  {metric.activeDays}/{model.range.days} {t(language, 'quantActiveDays')} · {metric.missingDays} {t(language, 'quantMissing')}
                </Text>
              </WebView>
              <QuantTerminalChart
                language={language}
                metric={metric}
                onSelectPoint={(point) => {
                  setSelectedDate(point.date);
                  setInspector({ kind: 'point', metric, point });
                }}
                selectedDate={selectedDate}
                theme={theme}
              />
              <WebView dataSet={{ 'quant-terminal-role': 'canvas-limitation' }}>
                <Text style={{ color: theme.text.metadata }}>{t(language, `quantBaseline_${metric.baseline.status}`)}</Text>
                <Text numberOfLines={2} style={{ color: theme.text.secondary }}>{copy(language, metric.limitation)}</Text>
              </WebView>
            </WebView>

            <WebView dataSet={{ 'quant-terminal-role': 'side-rail' }}>
              <WebView dataSet={{ 'quant-terminal-role': 'rail-section' }}>
                <WebView dataSet={{ 'quant-terminal-role': 'rail-heading' }}>
                  <Text style={{ color: theme.text.primary }}>{t(language, 'quantSignals')}</Text>
                  <Text style={{ color: theme.text.metadata }}>{model.signals.length}</Text>
                </WebView>
                {model.signals.length > 0 ? model.signals.slice(0, 1).map((signal) => (
                  <SignalRow
                    key={signal.id}
                    language={language}
                    onPress={() => setInspector({ kind: 'signal', signal })}
                    signal={signal}
                    theme={theme}
                  />
                )) : (
                  <Text style={{ color: theme.text.secondary }}>{t(language, 'quantNoSignalYet')}</Text>
                )}
              </WebView>

              <WebView dataSet={{ 'quant-terminal-role': 'rail-section' }}>
                <WebView dataSet={{ 'quant-terminal-role': 'rail-heading' }}>
                  <Text style={{ color: theme.text.primary }}>{t(language, 'quantEvidence')}</Text>
                  <Text style={{ color: theme.text.metadata }}>{model.evidence.length}</Text>
                </WebView>
                {model.evidence.length > 0 ? model.evidence.slice(0, 1).map((evidence) => (
                  <EvidenceRow
                    evidence={evidence}
                    key={evidence.id}
                    language={language}
                    onPress={() => setInspector({ kind: 'evidence', evidence })}
                    theme={theme}
                  />
                )) : (
                  <Text style={{ color: theme.text.secondary }}>{t(language, 'quantEvidenceNextObservation')}</Text>
                )}
              </WebView>
            </WebView>
          </WebView>

          <WebPressable
            accessibilityLabel={copy(language, model.implication)}
            accessibilityRole="button"
            dataSet={{ 'quant-terminal-role': 'implication' }}
            onPress={onNextAction}
          >
            <WebView>
              <Text style={{ color: theme.text.metadata }}>{t(language, 'quantImplication')}</Text>
              <Text numberOfLines={2} style={{ color: theme.text.primary }}>{copy(language, model.implication)}</Text>
            </WebView>
            <V11RebaselineIcon color={theme.text.primary} name="arrow" size={17} />
          </WebPressable>

          {performanceReadout ? (
            <WebText dataSet={{ 'quant-terminal-role': 'performance' }} style={{ color: theme.text.metadata }}>
              {performanceReadout}
            </WebText>
          ) : null}
        </WebView>
      </WebScrollView>

      <V11QuantTerminalInspector
        language={language}
        onClose={() => setInspector(null)}
        reducedMotion={reducedMotion}
        selection={inspector}
        theme={theme}
      />
    </>
  );
}
