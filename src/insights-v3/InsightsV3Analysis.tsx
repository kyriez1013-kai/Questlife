import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { Lang } from '../i18n';
import type { QuestVisualFoundation } from '../design/visualFoundation';
import type { QuantProductBundleV1, QuantProductInstrumentV1, QuantProductSeriesV1 } from '../quant-product/quantProductContract';
import { actionLabel, driverRelationshipCopy, evidenceStageLabel, featureLabel, formatDateTime, formatQuantValue, formatSignedValue, instrumentLabel, sourceClassLabel, type InsightsV3RangeSelection } from './insightsV3Presentation';
import { iv3, type InsightsV3CopyKey } from './insightsV3I18n';

const WebView = View as any;
const WebPressable = Pressable as any;

function Section({ children, title, foundation }: { children: React.ReactNode; title: string; foundation: QuestVisualFoundation }) {
  return (
    <WebView dataSet={{ 'insights-v3-role': 'analysis-section' }}>
      <Text style={{ color: foundation.text.metadata }}>{title}</Text>
      {children}
    </WebView>
  );
}

function StatRow({ label, value, foundation }: { label: string; value: string; foundation: QuestVisualFoundation }) {
  return (
    <WebView dataSet={{ 'insights-v3-role': 'stat-row' }}>
      <Text style={{ color: foundation.text.secondary }}>{label}</Text>
      <Text style={{ color: foundation.text.primary }}>{value}</Text>
    </WebView>
  );
}

function Limitation({ children, foundation }: { children: React.ReactNode; foundation: QuestVisualFoundation }) {
  return (
    <WebView dataSet={{ 'insights-v3-role': 'limitation' }}>
      <Text style={{ color: foundation.text.secondary }}>{children}</Text>
    </WebView>
  );
}

function findInstrument(bundle: QuantProductBundleV1, id: string) {
  return bundle.instruments.find((row) => row.instrument_id === id) || null;
}

export function DriversPanel({ bundle, foundation, lang }: { bundle: QuantProductBundleV1; foundation: QuestVisualFoundation; lang: Lang }) {
  const analysis = bundle.interpretation?.driver_analysis;
  if (!analysis || analysis.status.state !== 'AVAILABLE') return <Limitation foundation={foundation}>{iv3(lang, 'deepUnavailable')}</Limitation>;
  return (
    <>
      <Limitation foundation={foundation}>{iv3(lang, 'driverLimit')}</Limitation>
      <Section foundation={foundation} title={iv3(lang, 'driverTitle')}>
        {analysis.candidates.map((candidate) => {
          const source = findInstrument(bundle, candidate.driver_instrument_id);
          return (
            <WebView dataSet={{ 'insights-v3-role': 'analysis-row' }} key={candidate.candidate_id}>
              <WebView style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: foundation.text.metadata }}>{iv3(lang, 'candidateRank', { rank: candidate.rank })}</Text>
                <Text style={{ color: foundation.text.primary }}>{source ? instrumentLabel(lang, source) : iv3(lang, 'instrumentGeneric')}</Text>
                <Text style={{ color: foundation.text.secondary }}>{driverRelationshipCopy(lang, candidate)}</Text>
                <Text style={{ color: foundation.text.metadata }}>
                  {iv3(lang, 'supportCounter', { support: candidate.support_count, counter: candidate.counterexample_count })}
                </Text>
              </WebView>
              <WebView dataSet={{ 'insights-v3-role': 'analysis-row-meta' }}>
                <Text style={{ color: foundation.text.primary }}>{iv3(lang, 'driverIndependentPeriods', { count: candidate.independent_period_count })}</Text>
                <Text style={{ color: foundation.text.metadata }}>{evidenceStageLabel(lang, candidate.evidence.stage)}</Text>
              </WebView>
            </WebView>
          );
        })}
      </Section>
    </>
  );
}

export function SimilarPanel({
  bundle,
  foundation,
  lang,
  onJump,
}: {
  bundle: QuantProductBundleV1;
  foundation: QuestVisualFoundation;
  lang: Lang;
  onJump: (range: InsightsV3RangeSelection) => void;
}) {
  const similar = bundle.interpretation?.similar_periods;
  if (!similar || similar.status.state !== 'AVAILABLE') return <Limitation foundation={foundation}>{iv3(lang, 'deepUnavailable')}</Limitation>;
  return (
    <>
      <Limitation foundation={foundation}>{iv3(lang, 'similarIntro')} {iv3(lang, 'similarLimit')}</Limitation>
      <Section foundation={foundation} title={iv3(lang, 'similarTitle')}>
        {similar.periods.map((period) => (
          <WebView dataSet={{ 'insights-v3-role': 'period-row' }} key={period.period_id}>
            <Text style={{ color: foundation.text.primary }}>
              {formatDateTime(lang, period.start_at)} — {formatDateTime(lang, period.end_at)}
            </Text>
            <Text style={{ color: foundation.text.secondary }}>
              {iv3(lang, 'periodMatch', { items: period.matching_feature_keys.map((key) => featureLabel(lang, key)).join(' · ') })}
            </Text>
            <Text style={{ color: foundation.text.metadata }}>
              {iv3(lang, 'periodDifference', { items: period.different_feature_keys.map((key) => featureLabel(lang, key)).join(' · ') })}
            </Text>
            <Text style={{ color: foundation.text.secondary }}>
              {iv3(lang, period.subsequent_series.length ? 'periodFollowup' : 'periodNoFollowup', { count: period.subsequent_series.length })}
            </Text>
            <WebPressable
              accessibilityRole="button"
              dataSet={{ 'insights-v3-role': 'inline-action' }}
              onPress={() => onJump({
                kind: 'calendar',
                start: period.timeline_jump.start?.slice(0, 10) || period.start_at.slice(0, 10),
                end: period.timeline_jump.end?.slice(0, 10) || period.end_at.slice(0, 10),
              })}
            >
              <Text style={{ color: foundation.interaction.primary }}>{iv3(lang, 'jumpToPeriod')}</Text>
            </WebPressable>
          </WebView>
        ))}
      </Section>
    </>
  );
}

export function RecoveryPanel({ bundle, foundation, lang }: { bundle: QuantProductBundleV1; foundation: QuestVisualFoundation; lang: Lang }) {
  const recovery = bundle.interpretation?.recovery;
  if (!recovery || recovery.status.state !== 'AVAILABLE') return <Limitation foundation={foundation}>{iv3(lang, 'deepUnavailable')}</Limitation>;
  return (
    <>
      <Limitation foundation={foundation}>{iv3(lang, 'recoveryIntro')} {iv3(lang, 'recoveryLimit')}</Limitation>
      <Section foundation={foundation} title={iv3(lang, 'recoveryTitle')}>
        {recovery.reference_path.map((point) => (
          <WebView dataSet={{ 'insights-v3-role': 'trajectory-row' }} key={point.offset_days}>
            <WebView style={{ flex: 1 }}>
              <Text style={{ color: foundation.text.primary }}>{iv3(lang, 'dayOffset', { day: point.offset_days })}</Text>
              <Text style={{ color: foundation.text.secondary }}>
                {iv3(lang, 'historicalRange', {
                  low: formatSignedValue(point.low_deviation, '', lang),
                  high: formatSignedValue(point.high_deviation, '', lang),
                  mid: formatSignedValue(point.median_deviation, '', lang),
                })}
              </Text>
            </WebView>
            <Text style={{ color: foundation.text.metadata }}>{iv3(lang, 'episodeCount', { count: point.episode_count })}</Text>
          </WebView>
        ))}
      </Section>
    </>
  );
}

export function ScenarioPanel({ bundle, foundation, lang }: { bundle: QuantProductBundleV1; foundation: QuestVisualFoundation; lang: Lang }) {
  const scenario = bundle.interpretation?.scenario;
  if (!scenario || scenario.status.state !== 'AVAILABLE') return <Limitation foundation={foundation}>{iv3(lang, 'deepUnavailable')}</Limitation>;
  return (
    <>
      <Limitation foundation={foundation}>{iv3(lang, 'scenarioIntro')} {iv3(lang, 'scenarioLimit')}</Limitation>
      <Section foundation={foundation} title={iv3(lang, 'scenarioTitle')}>
        {scenario.branches.map((branch) => (
          <WebView dataSet={{ 'insights-v3-role': 'analysis-row' }} key={branch.branch_id}>
            <WebView style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: foundation.text.primary }}>{actionLabel(lang, branch.action_value)}</Text>
              <Text style={{ color: foundation.text.secondary }}>{iv3(lang, 'comparablePeriods', { count: branch.comparable_period_count })}</Text>
              <Text style={{ color: foundation.text.metadata }}>{iv3(lang, 'supportCounter', { support: branch.support_count, counter: branch.counterexample_count })}</Text>
            </WebView>
            <Text style={{ color: foundation.text.primary }}>
              {iv3(lang, 'observedOutcome', { value: formatSignedValue(branch.observed_outcome_change, '', lang) })}
            </Text>
          </WebView>
        ))}
      </Section>
    </>
  );
}

const operationKeys: Record<string, InsightsV3CopyKey> = {
  select_instrument: 'operationSelectInstrument',
  change_range: 'operationChangeRange',
  change_chart_type: 'operationChangeView',
  add_compare: 'operationAddCompare',
  show_driver_overlay: 'operationShowDrivers',
  jump_to_similar_period: 'operationJumpSimilar',
  show_analogue_envelope: 'operationShowRecovery',
  return_to_current: 'operationReturnCurrent',
};

export function AnalystPanel({ bundle, foundation, lang }: { bundle: QuantProductBundleV1; foundation: QuestVisualFoundation; lang: Lang }) {
  return (
    <>
      <Limitation foundation={foundation}>{iv3(lang, 'analystBody')}</Limitation>
      <Section foundation={foundation} title={iv3(lang, 'analystTitle')}>
        {bundle.analyst_context.operation_keys.map((key) => operationKeys[key]).filter(Boolean).map((key) => (
          <WebView dataSet={{ 'insights-v3-role': 'operation-row' }} key={key}>
            <Text style={{ color: foundation.text.primary }}>↳</Text>
            <Text style={{ color: foundation.text.secondary }}>{iv3(lang, key)}</Text>
          </WebView>
        ))}
      </Section>
    </>
  );
}

export function EvidencePanel({
  bundle,
  foundation,
  instrument,
  lang,
}: {
  bundle: QuantProductBundleV1;
  foundation: QuestVisualFoundation;
  instrument: QuantProductInstrumentV1;
  lang: Lang;
}) {
  const source = instrument.latest?.source_class || 'validated';
  return (
    <>
      <Section foundation={foundation} title={iv3(lang, 'evidenceTitle')}>
        <StatRow foundation={foundation} label={iv3(lang, 'evidence')} value={evidenceStageLabel(lang, instrument.evidence.stage)} />
        <StatRow foundation={foundation} label={iv3(lang, 'observations', { count: instrument.evidence.observation_count })} value={iv3(lang, 'independentPeriods', { count: instrument.evidence.independent_period_count })} />
        <StatRow foundation={foundation} label={iv3(lang, 'sourceClass', { source: sourceClassLabel(lang, source) })} value={formatDateTime(lang, bundle.metadata.as_of, true)} />
      </Section>
      <Section foundation={foundation} title={iv3(lang, 'limitations')}>
        <Limitation foundation={foundation}>{iv3(lang, 'baselineNotTarget')}</Limitation>
        <Limitation foundation={foundation}>{iv3(lang, 'observationNotCausal')}</Limitation>
        <Limitation foundation={foundation}>{iv3(lang, 'missingNotZero')}</Limitation>
        <Limitation foundation={foundation}>{iv3(lang, 'planNotExecution')}</Limitation>
      </Section>
    </>
  );
}

export function EventsPanel({ series, foundation, lang }: { series: QuantProductSeriesV1 | null; foundation: QuestVisualFoundation; lang: Lang }) {
  const events = series?.events || [];
  if (!events.length) return <Limitation foundation={foundation}>{iv3(lang, 'noEvents')}</Limitation>;
  const labels: Record<string, InsightsV3CopyKey> = {
    PLAN: 'planEvent',
    EXECUTION: 'executionEvent',
    STATE_OBSERVATION: 'stateEvent',
    CONTEXT_OBSERVATION: 'contextEvent',
    ENTITY_CHANGE: 'entityEvent',
  };
  return (
    <Section foundation={foundation} title={iv3(lang, 'eventLog')}>
      {events.map((event) => (
        <WebView dataSet={{ 'insights-v3-role': 'event-row' }} key={event.event_id}>
          <Text style={{ color: foundation.text.primary }}>{iv3(lang, labels[event.event_type])}</Text>
          <Text style={{ color: foundation.text.secondary }}>{formatDateTime(lang, event.timestamp, true)}</Text>
        </WebView>
      ))}
    </Section>
  );
}
