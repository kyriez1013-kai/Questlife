import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { t, type Lang } from '../../i18n';
import { V11GlassSheet } from '../../v11/components/V11Material';
import type { V11ThemeTokens } from '../../v11/tokens';
import { v11Typography } from '../../v11/tokens';
import V11RebaselineIcon from '../../v11-stage2-rebaseline/V11RebaselineIcon';
import type { V11InsightCopy } from '../insightsPresentation';
import type {
  QuantTerminalEvidence,
  QuantTerminalMetric,
  QuantTerminalPoint,
  QuantTerminalSignal,
} from './quantTerminalPresentation';

const WebView = View as any;
const WebPressable = Pressable as any;
const WebScrollView = ScrollView as any;

export type QuantInspectorSelection =
  | { kind: 'point'; metric: QuantTerminalMetric; point: QuantTerminalPoint }
  | { kind: 'signal'; signal: QuantTerminalSignal }
  | { kind: 'evidence'; evidence: QuantTerminalEvidence }
  | null;

function copy(language: Lang, value: V11InsightCopy) {
  if (value.kind === 'text') return value.text;
  return Object.entries(value.values || {}).reduce(
    (result, [key, replacement]) => result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(replacement)),
    t(language, value.key),
  );
}

function sourceCount(selection: Exclude<QuantInspectorSelection, null>) {
  if (selection.kind === 'point') return selection.point.sourceIds.length;
  if (selection.kind === 'signal') return selection.signal.sourceIds.length;
  return selection.evidence.sourceIds.length;
}

function title(language: Lang, selection: Exclude<QuantInspectorSelection, null>) {
  if (selection.kind === 'point') return t(language, 'quantInspectorObservation');
  if (selection.kind === 'signal') return copy(language, selection.signal.title);
  return copy(language, selection.evidence.title);
}

function limitation(selection: Exclude<QuantInspectorSelection, null>): V11InsightCopy {
  if (selection.kind === 'point') return selection.metric.limitation;
  if (selection.kind === 'signal') return selection.signal.limitation;
  return selection.evidence.limitation;
}

export default function V11QuantTerminalInspector({
  language,
  onClose,
  reducedMotion,
  selection,
  theme,
}: {
  language: Lang;
  onClose: () => void;
  reducedMotion: boolean;
  selection: QuantInspectorSelection;
  theme: V11ThemeTokens;
}) {
  const [deep, setDeep] = useState(false);

  useEffect(() => setDeep(false), [selection]);
  if (!selection) return null;

  const sourceTotal = sourceCount(selection);
  const description = selection.kind === 'point'
    ? `${selection.point.date} · ${selection.point.value ?? '—'} ${t(language, selection.metric.unitKey)}`
    : selection.kind === 'signal'
      ? copy(language, selection.signal.detail)
      : copy(language, selection.evidence.detail);

  return (
    <WebView dataSet={{ 'quant-terminal-role': 'inspector-layer' }}>
      <WebPressable
        accessibilityLabel={t(language, 'closeDetails')}
        accessibilityRole="button"
        dataSet={{ 'quant-terminal-role': 'inspector-scrim' }}
        onPress={onClose}
      />
      <V11GlassSheet
        contentStyle={{ flex: 1 }}
        minHeight={320}
        reducedMotion={reducedMotion}
        stage={selection.kind === 'signal' && selection.signal.status === 'supported' ? 'S3' : 'S2'}
        style={{ width: '100%' }}
        theme={theme}
      >
        <WebView dataSet={{ 'quant-terminal-role': 'inspector-header' }}>
          <WebView>
            <Text style={{ color: theme.text.metadata, ...v11Typography.metadata }}>
              {deep ? t(language, 'quantDeepAnalysis') : t(language, 'quantObjectInspector')}
            </Text>
            <Text style={{ color: theme.text.primary, fontSize: 20, lineHeight: 27, fontWeight: '500' }}>
              {title(language, selection)}
            </Text>
          </WebView>
          <WebPressable accessibilityLabel={t(language, 'closeDetails')} accessibilityRole="button" onPress={onClose}>
            <V11RebaselineIcon color={theme.text.primary} name="close" size={18} />
          </WebPressable>
        </WebView>

        <WebScrollView
          contentContainerStyle={{ paddingBottom: 28 }}
          dataSet={{ 'quant-terminal-role': 'inspector-scroll' }}
          showsVerticalScrollIndicator={false}
        >
          <WebView dataSet={{ 'quant-terminal-role': 'inspector-question' }}>
            <Text style={{ color: theme.text.metadata, ...v11Typography.metadata }}>
              {selection.kind === 'signal'
                ? t(language, 'quantInspectorSignalQuestion')
                : selection.kind === 'point'
                  ? t(language, 'quantInspectorPointQuestion')
                  : t(language, 'quantInspectorEvidenceQuestion')}
            </Text>
            <Text style={{ color: theme.text.primary, ...v11Typography.title }}>{description}</Text>
          </WebView>

          <WebView dataSet={{ 'quant-terminal-role': 'inspector-grid' }}>
            <WebView>
              <Text style={{ color: theme.text.metadata, ...v11Typography.metadata }}>{t(language, 'quantSourceCount')}</Text>
              <Text style={{ color: theme.text.primary }}>{sourceTotal}</Text>
            </WebView>
            <WebView>
              <Text style={{ color: theme.text.metadata, ...v11Typography.metadata }}>{t(language, 'quantDataType')}</Text>
              <Text style={{ color: theme.text.primary }}>
                {t(language, selection.kind === 'point'
                  ? selection.metric.sourceKind === 'recorded' ? 'quantRecorded' : 'quantDerived'
                  : selection.kind === 'signal' ? 'quantInferred' : `quant${selection.evidence.sourceKind[0].toUpperCase()}${selection.evidence.sourceKind.slice(1)}`)}
              </Text>
            </WebView>
            {selection.kind === 'signal' ? (
              <>
                <WebView>
                  <Text style={{ color: theme.text.metadata, ...v11Typography.metadata }}>{t(language, 'quantEvidenceSupport')}</Text>
                  <Text style={{ color: theme.text.primary }}>{selection.signal.evidenceCount}</Text>
                </WebView>
                {selection.signal.counterexampleCount != null ? (
                  <WebView>
                    <Text style={{ color: theme.text.metadata, ...v11Typography.metadata }}>{t(language, 'quantCounterexamples')}</Text>
                    <Text style={{ color: theme.text.primary }}>{selection.signal.counterexampleCount}</Text>
                  </WebView>
                ) : null}
                {selection.signal.lastSeenAt ? (
                  <WebView>
                    <Text style={{ color: theme.text.metadata, ...v11Typography.metadata }}>{t(language, 'quantLastObserved')}</Text>
                    <Text style={{ color: theme.text.primary }}>{selection.signal.lastSeenAt.slice(0, 10)}</Text>
                  </WebView>
                ) : null}
              </>
            ) : null}
          </WebView>

          {deep ? (
            <WebView dataSet={{ 'quant-terminal-role': 'deep-analysis' }}>
              <Text style={{ color: theme.text.metadata, ...v11Typography.metadata }}>{t(language, 'quantFocusedModel')}</Text>
              <Text style={{ color: theme.text.primary, ...v11Typography.body }}>
                {selection.kind === 'signal'
                  ? t(language, 'quantSignalModelDescription')
                  : selection.kind === 'point'
                    ? t(language, 'quantPointModelDescription')
                    : t(language, 'quantEvidenceModelDescription')}
              </Text>
              <Text style={{ color: theme.text.metadata, ...v11Typography.metadata }}>{t(language, 'stage3KnownLimitation')}</Text>
              <Text style={{ color: theme.text.secondary, ...v11Typography.body }}>{copy(language, limitation(selection))}</Text>
            </WebView>
          ) : null}
        </WebScrollView>

        <WebPressable
          accessibilityLabel={t(language, deep ? 'quantHideDeepAnalysis' : 'quantOpenDeepAnalysis')}
          accessibilityRole="button"
          dataSet={{ 'quant-terminal-role': 'inspector-action' }}
          onPress={() => setDeep((value) => !value)}
        >
          <Text style={{ color: theme.text.primary }}>
            {t(language, deep ? 'quantHideDeepAnalysis' : 'quantOpenDeepAnalysis')}
          </Text>
          <V11RebaselineIcon color={theme.text.primary} name={deep ? 'chevron-down' : 'arrow'} size={17} />
        </WebPressable>
      </V11GlassSheet>
    </WebView>
  );
}
