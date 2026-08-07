import React from 'react';
import { Text, View } from 'react-native';
import { t, type Lang } from '../i18n';
import V11Stage2ProductionSheet from '../v11-stage2-rebaseline/V11Stage2ProductionSheet';
import type { V11ThemeTokens } from '../v11/tokens';
import { v11Spacing, v11Typography } from '../v11/tokens';
import type {
  V11AdvancedMode,
  V11InsightCopy,
  V11InsightsEvidenceItem,
  V11PatternRow,
  V11TrendPoint,
} from './insightsPresentation';

export type V11InsightsDetailSelection =
  | { kind: 'evidence'; item: V11InsightsEvidenceItem }
  | { kind: 'trend'; item: V11TrendPoint }
  | { kind: 'pattern'; item: V11PatternRow }
  | { kind: 'advanced'; item: V11AdvancedMode }
  | null;

function copy(language: Lang, value: V11InsightCopy) {
  if (value.kind === 'text') return value.text;
  return Object.entries(value.values || {}).reduce(
    (result, [key, replacement]) => result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(replacement)),
    t(language, value.key),
  );
}

function confidenceLabel(language: Lang, value: string) {
  if (value === 'high') return t(language, 'confidenceHigh');
  if (value === 'medium') return t(language, 'confidenceMedium');
  if (value === 'low') return t(language, 'confidenceLow');
  return t(language, 'stage3ConfidenceNotExposed');
}

function DetailRow({
  label,
  theme,
  value,
}: {
  label: string;
  theme: V11ThemeTokens;
  value: string;
}) {
  return (
    <View
      style={{
        borderTopColor: theme.questTheme.colors.border,
        borderTopWidth: 1,
        gap: 5,
        paddingVertical: v11Spacing.md,
      }}
    >
      <Text style={{ color: theme.text.metadata, ...v11Typography.metadata }}>{label}</Text>
      <Text selectable style={{ color: theme.text.primary, ...v11Typography.body }}>{value || '—'}</Text>
    </View>
  );
}

export default function V11InsightsEvidenceSheet({
  language,
  onClose,
  reducedMotion,
  selection,
  theme,
}: {
  language: Lang;
  onClose: () => void;
  reducedMotion: boolean;
  selection: V11InsightsDetailSelection;
  theme: V11ThemeTokens;
}) {
  const title = selection?.kind === 'trend'
    ? t(language, 'stage3TrendObservation')
    : selection?.kind === 'pattern'
      ? t(language, 'stage3PatternDetail')
      : selection?.kind === 'advanced'
        ? t(language, 'stage3AnalysisDetail')
        : t(language, 'stage3EvidenceDetail');

  return (
    <V11Stage2ProductionSheet
      closeLabel={t(language, 'closeDetails')}
      minHeight={360}
      onClose={onClose}
      reducedMotion={reducedMotion}
      sheet="production"
      theme={theme}
      title={title}
      visible={selection != null}
    >
      {selection?.kind === 'evidence' ? (
        <View>
          <Text style={{ color: theme.text.primary, ...v11Typography.title }}>
            {copy(language, selection.item.title)}
          </Text>
          <Text style={{ color: theme.text.secondary, marginTop: v11Spacing.sm, ...v11Typography.body }}>
            {copy(language, selection.item.detail)}
          </Text>
          <DetailRow label={t(language, 'dataSource')} theme={theme} value={t(language, `stage3Source_${selection.item.sourceType}`)} />
          <DetailRow label={t(language, 'sampleN')} theme={theme} value={String(selection.item.sourceIds.length)} />
          {selection.item.observedAt ? (
            <DetailRow label={t(language, 'stage3ObservedAt')} theme={theme} value={new Date(selection.item.observedAt).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-AU')} />
          ) : null}
          <DetailRow label={t(language, 'confidence')} theme={theme} value={confidenceLabel(language, selection.item.confidence)} />
          <DetailRow label={t(language, 'stage3KnownLimitation')} theme={theme} value={copy(language, selection.item.limitation)} />
        </View>
      ) : null}

      {selection?.kind === 'trend' ? (
        <View>
          <Text style={{ color: theme.text.primary, ...v11Typography.title }}>{selection.item.date}</Text>
          <DetailRow
            label={t(language, 'recordedExecutionDuration')}
            theme={theme}
            value={selection.item.minutes == null
              ? t(language, selection.item.observation === 'untimed_execution' ? 'stage3UntimedExecution' : 'stage3MissingObservation')
              : `${selection.item.minutes} ${t(language, 'minutes')}`}
          />
          <DetailRow label={t(language, 'executionLogs')} theme={theme} value={String(selection.item.executionCount)} />
          <DetailRow
            label={t(language, 'averageQuality')}
            theme={theme}
            value={selection.item.averageQuality == null ? '—' : `${selection.item.averageQuality.toFixed(1)} / 5`}
          />
          <DetailRow label={t(language, 'stage3KnownLimitation')} theme={theme} value={t(language, 'trendLimitedToLoggedDuration')} />
        </View>
      ) : null}

      {selection?.kind === 'pattern' ? (
        <View>
          <Text style={{ color: theme.text.primary, ...v11Typography.title }}>{copy(language, selection.item.title)}</Text>
          <Text style={{ color: theme.text.secondary, marginTop: v11Spacing.sm, ...v11Typography.body }}>{copy(language, selection.item.description)}</Text>
          <DetailRow label={t(language, 'stage3PatternStatus')} theme={theme} value={t(language, `stage3Pattern_${selection.item.status}`)} />
          <DetailRow label={t(language, 'sampleN')} theme={theme} value={String(selection.item.evidenceCount)} />
          <DetailRow label={t(language, 'confidence')} theme={theme} value={confidenceLabel(language, selection.item.confidence)} />
          {selection.item.lastSeenAt ? (
            <DetailRow label={t(language, 'stage3LastSupported')} theme={theme} value={new Date(selection.item.lastSeenAt).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-AU')} />
          ) : null}
          <DetailRow
            label={t(language, 'stage3KnownLimitation')}
            theme={theme}
            value={selection.item.caution || t(language, selection.item.status === 'candidate' ? 'stage3CandidatePatternLimitation' : 'stage3AcceptedNotCausal')}
          />
        </View>
      ) : null}

      {selection?.kind === 'advanced' ? (
        <View>
          <Text style={{ color: theme.text.primary, ...v11Typography.title }}>{t(language, selection.item.titleKey)}</Text>
          <Text style={{ color: theme.text.secondary, marginTop: v11Spacing.sm, ...v11Typography.body }}>{copy(language, selection.item.summary)}</Text>
          <DetailRow label={t(language, 'sampleN')} theme={theme} value={String(selection.item.sampleSize)} />
          <DetailRow label={t(language, 'confidence')} theme={theme} value={confidenceLabel(language, selection.item.confidence)} />
          <DetailRow label={t(language, 'stage3KnownLimitation')} theme={theme} value={copy(language, selection.item.limitation)} />
        </View>
      ) : null}
    </V11Stage2ProductionSheet>
  );
}
