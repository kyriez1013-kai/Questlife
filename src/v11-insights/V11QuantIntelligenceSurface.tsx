import React from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { t, type Lang } from '../i18n';
import { V11GlassSheet, V11Pill } from '../v11/components/V11Material';
import type { V11EvidenceStage, V11ThemeTokens } from '../v11/tokens';
import { v11Spacing, v11Typography } from '../v11/tokens';
import V11RebaselineIcon from '../v11-stage2-rebaseline/V11RebaselineIcon';
import V11InsightsAdvancedCanvas from './V11InsightsAdvancedCanvas';
import type {
  V11AdvancedMode,
  V11AdvancedModeId,
  V11InsightCopy,
  V11InsightsEvidenceItem,
  V11InsightsPresentation,
  V11PatternFilter,
  V11PatternRow,
  V11TrendPoint,
} from './insightsPresentation';
import {
  V11BaselineBand,
  V11EvidenceMeter,
  V11EvidenceStageMarker,
  V11SignalCard,
  V11TrendCanvas,
} from './V11InsightsVisuals';

const WebView = View as any;
const WebPressable = Pressable as any;
const WebScrollView = ScrollView as any;
const WebText = Text as any;

function resolveCopy(language: Lang, value: V11InsightCopy) {
  if (value.kind === 'text') return value.text;
  return Object.entries(value.values || {}).reduce(
    (result, [key, replacement]) => result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(replacement)),
    t(language, value.key),
  );
}

function stageLabel(language: Lang, stage: V11EvidenceStage) {
  return t(language, `stage3Evidence${stage}`);
}

function comparisonLabel(
  language: Lang,
  comparison: V11InsightsPresentation['overview']['comparison'],
) {
  if (comparison.status === 'unavailable') return t(language, 'stage35BaselineNotStarted');
  if (comparison.status === 'early') return t(language, 'stage35BaselineForming');
  if (comparison.direction === 'improving') return t(language, 'stage35ComparedHigher');
  if (comparison.direction === 'declining') return t(language, 'stage35ComparedLower');
  if (comparison.direction === 'stable') return t(language, 'stage35ComparedRange');
  if (comparison.direction === 'mixed') return t(language, 'stage35ComparedMixed');
  return t(language, 'stage35BaselineForming');
}

function evidenceCountLabel(language: Lang, count: number) {
  return t(language, 'stage35EvidenceCount').replace('{count}', String(count));
}

function EvidenceRow({
  item,
  language,
  onPress,
  theme,
}: {
  item: V11InsightsEvidenceItem;
  language: Lang;
  onPress: () => void;
  theme: V11ThemeTokens;
}) {
  return (
    <WebPressable
      accessibilityLabel={resolveCopy(language, item.title)}
      accessibilityRole="button"
      dataSet={{ 'v11-insights-role': 'quant-evidence-row' }}
      onPress={onPress}
    >
      <WebView dataSet={{ 'v11-insights-role': 'quant-evidence-index' }}>
        <V11RebaselineIcon color={theme.text.metadata} name="activity" size={16} />
      </WebView>
      <WebView dataSet={{ 'v11-insights-role': 'quant-evidence-copy' }}>
        <Text style={{ color: theme.text.metadata, ...v11Typography.metadata }}>{resolveCopy(language, item.title)}</Text>
        <Text numberOfLines={2} style={{ color: theme.text.secondary, ...v11Typography.body }}>{resolveCopy(language, item.detail)}</Text>
      </WebView>
      <V11RebaselineIcon color={theme.text.secondary} name="arrow" size={15} />
    </WebPressable>
  );
}

function PatternRow({
  language,
  onPress,
  pattern,
  theme,
}: {
  language: Lang;
  onPress: () => void;
  pattern: V11PatternRow;
  theme: V11ThemeTokens;
}) {
  return (
    <WebPressable
      accessibilityLabel={resolveCopy(language, pattern.title)}
      accessibilityRole="button"
      dataSet={{ 'v11-insights-role': 'quant-pattern-row' }}
      onPress={onPress}
    >
      <WebView dataSet={{ 'v11-insights-role': 'quant-pattern-status' }}>
        <Text style={{ color: theme.text.metadata, ...v11Typography.metadata }}>{t(language, `stage35Pattern_${pattern.status}`)}</Text>
        <Text style={{ color: theme.text.primary }}>{pattern.evidenceCount}</Text>
        <Text style={{ color: theme.text.metadata, ...v11Typography.metadata }}>{t(language, 'stage35Observations')}</Text>
      </WebView>
      <WebView dataSet={{ 'v11-insights-role': 'quant-pattern-copy' }}>
        <Text style={{ color: theme.text.primary }}>{resolveCopy(language, pattern.title)}</Text>
        <Text numberOfLines={2} style={{ color: theme.text.secondary, ...v11Typography.body }}>{resolveCopy(language, pattern.description)}</Text>
      </WebView>
      <V11RebaselineIcon color={theme.text.secondary} name="arrow" size={16} />
    </WebPressable>
  );
}

export default function V11QuantIntelligenceSurface({
  advancedMode,
  analysisLabOpen,
  language,
  onAdvancedModeChange,
  onNextAction,
  onOpenAdvancedDetail,
  onOpenEvidence,
  onOpenPattern,
  onPatternFilterChange,
  onSelectTrend,
  onToggleAnalysisLab,
  patternFilter,
  presentation,
  selectedTrendDate,
  stage,
  theme,
}: {
  advancedMode: V11AdvancedMode | undefined;
  analysisLabOpen: boolean;
  language: Lang;
  onAdvancedModeChange: (mode: V11AdvancedModeId) => void;
  onNextAction: () => void;
  onOpenAdvancedDetail: (mode: V11AdvancedMode) => void;
  onOpenEvidence: (item: V11InsightsEvidenceItem) => void;
  onOpenPattern: (pattern: V11PatternRow) => void;
  onPatternFilterChange: (filter: V11PatternFilter) => void;
  onSelectTrend: (point: V11TrendPoint) => void;
  onToggleAnalysisLab: () => void;
  patternFilter: V11PatternFilter;
  presentation: V11InsightsPresentation;
  selectedTrendDate: string | null;
  stage: V11EvidenceStage;
  theme: V11ThemeTokens;
}) {
  const reading = presentation.overview.currentReading;
  const evidence = presentation.overview.evidence;
  const patternRows = presentation.patterns.rows.filter((row) => row.status === patternFilter);
  const trendHasObservations = presentation.trends.sampleCount > 0;
  const availableAnalysis = presentation.advanced.modes.filter((mode) => mode.status === 'available').length;
  const recordedRange = presentation.trends.observedRangeMinutes;

  return (
    <WebView dataSet={{ 'v11-insights-role': 'quant-content' }}>
      <WebView dataSet={{ 'v11-insights-role': 'quant-context' }}>
        <WebView>
          <Text style={{ color: theme.text.metadata, ...v11Typography.metadata }}>{t(language, 'stage35ProductLabel')}</Text>
          <Text style={{ color: theme.text.secondary, fontSize: 12, lineHeight: 17 }}>
            {presentation.range.start} – {presentation.range.end}
          </Text>
        </WebView>
        <WebView dataSet={{ 'v11-insights-role': 'stage-context' }}>
          <V11EvidenceStageMarker
            accessibilityLabel={`${t(language, 'v11EvidenceStage')}: ${stageLabel(language, stage)}`}
            stage={stage}
            theme={theme}
          />
          <Text style={{ color: theme.text.metadata, ...v11Typography.metadata }}>{stageLabel(language, stage)}</Text>
        </WebView>
      </WebView>

      <WebView dataSet={{ 'v11-insights-role': 'quant-primary-grid' }}>
        <WebView dataSet={{ 'v11-insights-role': 'quant-state' }}>
          <Text style={{ color: theme.text.metadata, ...v11Typography.label }}>{t(language, 'stage35CurrentState')}</Text>
          {reading ? (
            <WebView dataSet={{ 'v11-insights-role': 'quant-reading' }}>
              <Text style={{ color: theme.text.primary }}>{reading.value}</Text>
              <Text style={{ color: theme.text.secondary }}>/ {reading.scaleMax}</Text>
            </WebView>
          ) : (
            <WebText dataSet={{ 'v11-insights-role': 'quant-empty-reading' }} style={{ color: theme.text.primary }}>
              {t(language, 'stage35BuildBaseline')}
            </WebText>
          )}
          <WebText dataSet={{ 'v11-insights-role': 'quant-state-status' }} style={{ color: theme.text.primary }}>
            {reading ? t(language, `stage35State${stage}`) : t(language, 'stage35StateS0')}
          </WebText>

          <WebView dataSet={{ 'v11-insights-role': 'quant-baseline-copy' }}>
            <Text style={{ color: theme.text.metadata, ...v11Typography.metadata }}>{t(language, 'stage35PersonalBaseline')}</Text>
            <Text style={{ color: theme.text.secondary, ...v11Typography.body }}>
              {comparisonLabel(language, presentation.overview.comparison)}
            </Text>
          </WebView>

          <V11Pill
            accessibilityLabel={resolveCopy(language, presentation.overview.nextAction)}
            contentStyle={{ paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            height={50}
            onPress={onNextAction}
            stage={stage}
            theme={theme}
          >
            <Text numberOfLines={2} style={{ color: theme.text.primary, flex: 1, fontSize: 14, lineHeight: 19, fontWeight: '500' }}>
              {resolveCopy(language, presentation.overview.nextAction)}
            </Text>
            <V11RebaselineIcon color={theme.text.primary} name="arrow" size={17} />
          </V11Pill>
        </WebView>

        <WebView dataSet={{ 'v11-insights-role': 'quant-timeline' }}>
          <WebView dataSet={{ 'v11-insights-role': 'quant-section-heading' }}>
            <WebView>
              <Text style={{ color: theme.text.metadata, ...v11Typography.label }}>{t(language, 'stage35Timeline')}</Text>
              <Text style={{ color: theme.text.primary }}>{t(language, 'stage35MainTrend')}</Text>
            </WebView>
            <Text style={{ color: theme.text.metadata, ...v11Typography.metadata }}>
              {t(language, 'stage35SevenDayWindow')}
            </Text>
          </WebView>

          {trendHasObservations ? (
            <V11TrendCanvas
              accessibilityLabel={t(language, 'stage3TrendVisualLabel')}
              baselineMinutes={presentation.trends.baselineMinutes}
              compact
              onSelectPoint={onSelectTrend}
              points={presentation.trends.points}
              selectedDate={selectedTrendDate}
              theme={theme}
            />
          ) : (
            <WebView dataSet={{ 'v11-insights-role': 'quant-timeline-empty' }}>
              <Text style={{ color: theme.text.primary }}>{t(language, 'stage35TimelineWaiting')}</Text>
              <Text style={{ color: theme.text.secondary, ...v11Typography.body }}>{t(language, 'stage35TimelineWaitingBody')}</Text>
            </WebView>
          )}

          <WebView dataSet={{ 'v11-insights-role': 'quant-reference' }}>
            <WebView dataSet={{ 'v11-insights-role': 'quant-reference-copy' }}>
              <Text style={{ color: theme.text.metadata, ...v11Typography.metadata }}>{t(language, 'stage35RecordedReference')}</Text>
              <Text style={{ color: theme.text.primary }}>
                {presentation.trends.baselineMinutes != null
                  ? `${Math.round(presentation.trends.baselineMinutes)} ${t(language, 'stage35MinutesUnit')}`
                  : t(language, 'stage35ReferenceForming')}
              </Text>
            </WebView>
            <WebView dataSet={{ 'v11-insights-role': 'quant-reference-copy' }}>
              <Text style={{ color: theme.text.metadata, ...v11Typography.metadata }}>{t(language, 'stage35RecordedRange')}</Text>
              <Text style={{ color: theme.text.primary }}>
                {recordedRange
                  ? `${Math.round(recordedRange.min)}–${Math.round(recordedRange.max)} ${t(language, 'stage35MinutesUnit')}`
                  : '—'}
              </Text>
            </WebView>
          </WebView>
          <V11BaselineBand
            accessibilityLabel={t(language, 'stage35BaselineBandLabel')}
            baselineMinutes={presentation.trends.baselineMinutes}
            currentMinutes={presentation.trends.currentMinutes}
            observedRangeMinutes={presentation.trends.observedRangeMinutes}
            theme={theme}
          />

          <WebView dataSet={{ 'v11-insights-role': 'quant-coverage' }}>
            <WebView>
              <Text style={{ color: theme.text.metadata, ...v11Typography.metadata }}>{t(language, 'stage35Evidence')}</Text>
              <Text style={{ color: theme.text.secondary, ...v11Typography.body }}>
                {t(language, 'stage35CoverageValue')
                  .replace('{observations}', String(presentation.trends.sampleCount))
                  .replace('{days}', String(presentation.trends.activeDays))}
              </Text>
            </WebView>
            <V11EvidenceMeter
              accessibilityLabel={t(language, 'stage35EvidenceMeterLabel')
                .replace('{days}', String(presentation.trends.activeDays))}
              activeDays={presentation.trends.activeDays}
              theme={theme}
            />
          </WebView>
        </WebView>

        <WebView dataSet={{ 'v11-insights-role': 'quant-evidence' }}>
          <Text style={{ color: theme.text.metadata, ...v11Typography.label }}>{t(language, 'stage35KeySignal')}</Text>
          <V11SignalCard
            accessibilityLabel={resolveCopy(language, presentation.overview.primary.title)}
            body={resolveCopy(language, presentation.overview.primary.body)}
            evidence={evidenceCountLabel(language, evidence.length)}
            onPress={() => evidence[0] && onOpenEvidence(evidence[0])}
            status={t(language, `stage35State${stage}`)}
            theme={theme}
            title={resolveCopy(language, presentation.overview.primary.title)}
          />
          {evidence.length > 0 ? (
            <WebView dataSet={{ 'v11-insights-role': 'quant-evidence-list' }}>
              {evidence.slice(0, 3).map((item) => (
                <EvidenceRow
                  item={item}
                  key={item.id}
                  language={language}
                  onPress={() => onOpenEvidence(item)}
                  theme={theme}
                />
              ))}
            </WebView>
          ) : (
            <Text style={{ color: theme.text.secondary, ...v11Typography.body }}>{t(language, 'stage35NoEvidenceBody')}</Text>
          )}
          <Text style={{ color: theme.text.metadata, ...v11Typography.metadata }}>
            {t(language, 'stage35EvidenceNotConfidence')}
          </Text>
        </WebView>
      </WebView>

      <WebView dataSet={{ 'v11-insights-role': 'quant-hypotheses' }}>
        <WebView dataSet={{ 'v11-insights-role': 'quant-section-heading' }}>
          <WebView>
            <Text style={{ color: theme.text.metadata, ...v11Typography.label }}>{t(language, 'stage35Hypotheses')}</Text>
            <Text style={{ color: theme.text.primary }}>{t(language, 'stage35HypothesesTitle')}</Text>
          </WebView>
          <Text style={{ color: theme.text.secondary, ...v11Typography.body }}>{t(language, 'stage35HypothesesCaution')}</Text>
        </WebView>

        <WebView accessibilityRole="tablist" dataSet={{ 'v11-insights-role': 'pattern-filter' }}>
          {(['candidate', 'accepted', 'archived'] as const).map((status) => (
            <WebPressable
              accessibilityRole="tab"
              accessibilityState={{ selected: patternFilter === status }}
              dataSet={{ 'v11-selected': patternFilter === status ? 'true' : 'false' }}
              key={status}
              onPress={() => onPatternFilterChange(status)}
            >
              <Text style={{ color: patternFilter === status ? theme.text.primary : theme.text.metadata }}>
                {t(language, `stage35Pattern_${status}`)} · {presentation.patterns.counts[status]}
              </Text>
            </WebPressable>
          ))}
        </WebView>

        {patternRows.length > 0 ? (
          <WebView dataSet={{ 'v11-insights-role': 'quant-pattern-list' }}>
            {patternRows.map((pattern) => (
              <PatternRow
                key={pattern.id}
                language={language}
                onPress={() => onOpenPattern(pattern)}
                pattern={pattern}
                theme={theme}
              />
            ))}
          </WebView>
        ) : (
          <WebView dataSet={{ 'v11-insights-role': 'quant-inline-empty' }}>
            <Text style={{ color: theme.text.primary }}>{t(language, 'stage35NoHypotheses')}</Text>
            <Text style={{ color: theme.text.secondary, ...v11Typography.body }}>{t(language, 'stage35NoHypothesesBody')}</Text>
          </WebView>
        )}
      </WebView>

      <WebView dataSet={{ 'v11-insights-role': 'quant-lab' }}>
        <WebPressable
          accessibilityLabel={t(language, analysisLabOpen ? 'stage35CloseAnalysisLab' : 'stage35OpenAnalysisLab')}
          accessibilityRole="button"
          dataSet={{ 'v11-insights-role': 'quant-lab-trigger' }}
          onPress={onToggleAnalysisLab}
        >
          <WebView>
            <Text style={{ color: theme.text.metadata, ...v11Typography.label }}>{t(language, 'stage35AnalysisLab')}</Text>
            <Text style={{ color: theme.text.primary }}>{t(language, 'stage35AnalysisLabTitle')}</Text>
            <Text style={{ color: theme.text.secondary, ...v11Typography.body }}>
              {t(language, 'stage35AnalysisAvailable').replace('{count}', String(availableAnalysis))}
            </Text>
          </WebView>
          <V11RebaselineIcon color={theme.text.secondary} name={analysisLabOpen ? 'chevron-up' : 'chevron-down'} size={18} />
        </WebPressable>

        {analysisLabOpen && advancedMode ? (
          <WebView dataSet={{ 'v11-insights-role': 'quant-lab-content' }}>
            <WebScrollView
              contentContainerStyle={{ gap: v11Spacing.xs, paddingRight: v11Spacing.lg }}
              dataSet={{ 'v11-insights-role': 'analysis-mode-strip' }}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {presentation.advanced.modes.map((mode) => (
                <WebPressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: mode.id === advancedMode.id }}
                  dataSet={{ 'v11-selected': mode.id === advancedMode.id ? 'true' : 'false' }}
                  key={mode.id}
                  onPress={() => onAdvancedModeChange(mode.id)}
                >
                  <Text style={{ color: mode.id === advancedMode.id ? theme.text.primary : theme.text.metadata }}>
                    {t(language, mode.titleKey)}
                  </Text>
                </WebPressable>
              ))}
            </WebScrollView>
            <V11GlassSheet contentStyle={{ padding: 20 }} minHeight={360} stage={stage} theme={theme}>
              <V11InsightsAdvancedCanvas
                language={language}
                mode={advancedMode}
                onOpenDetail={() => onOpenAdvancedDetail(advancedMode)}
                onSelectTrend={onSelectTrend}
                theme={theme}
              />
            </V11GlassSheet>
          </WebView>
        ) : null}
      </WebView>
    </WebView>
  );
}
