import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Polygon } from 'react-native-svg';
import type { Lang } from '../../i18n';
import { t } from '../../i18n';
import type { V11ThemeTokens } from '../../v11/tokens';
import PersonalTerminalIcon from './PersonalTerminalIcon';
import type {
  PersonalTerminalSeries,
} from './personalTerminalPresentation';
import {
  buildDecisionPresentation,
  buildDriverTimeline,
  buildInterpretationOperatorOptions,
  buildScenarioComparisonPresentation,
  similarPeriodOutcome,
  type QuantInterpretationOperatorAction,
} from './quantInterpretationPresentation';
import {
  DriverTimeline,
  ScenarioBranchVisual,
} from './PersonalTerminalInterpretationVisuals';
import type {
  QuantDecisionCandidate,
  QuantDriverCandidate,
  QuantInterpretationBundle,
  QuantInterpretationClaim,
  QuantSimilarPeriod,
} from './quantInterpretation';

const WebView = View as any;
const WebPressable = Pressable as any;

export type QuantInterpretationView =
  | 'drivers'
  | 'driver'
  | 'similar'
  | 'recovery'
  | 'scenario'
  | 'decision'
  | 'analyst'
  | 'next';

function template(language: Lang, key: string, values: Record<string, string | number> = {}) {
  return Object.entries(values).reduce(
    (result, [name, value]) => result.replace(new RegExp(`\\{${name}\\}`, 'g'), String(value)),
    t(language, key),
  );
}

function number(value: number | null, digits = 1) {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-AU', { maximumFractionDigits: digits }).format(value);
}

function signed(value: number | null, digits = 1) {
  if (value == null) return '—';
  return `${value > 0 ? '+' : ''}${number(value, digits)}`;
}

function date(language: Lang, value: string) {
  return new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function interpretationConstruct(language: Lang, value: string) {
  return t(language, `quantInterpretationConstruct_${value.replace(/[^a-zA-Z0-9]+/g, '_')}`);
}

function evidenceStatus(language: Lang, value: QuantDriverCandidate['evidence_status']) {
  return t(language, `quantInterpretationEvidence_${value}`);
}

function actionLabel(language: Lang, value: string) {
  if (value === 'gather_information') return t(language, 'quantInterpretationAction_gather_more_information');
  return t(language, `quantInterpretationAction_${value.replace(/[^a-zA-Z0-9]+/g, '_')}`);
}

function observationLabel(language: Lang, value: string) {
  return t(language, `quantInterpretationObservation_${value.replace(/[^a-zA-Z0-9]+/g, '_')}`);
}

function unitLabel(language: Lang, value: string) {
  if (value === 'minutes') return t(language, 'minutes');
  if (value === 'binary') return t(language, 'quantInterpretationBinaryUnit');
  return value;
}

function codeKey(prefix: string, value: string) {
  return `${prefix}_${value.replace(/[^a-zA-Z0-9]+/g, '_')}`;
}

function temporalRelationship(language: Lang, value: string) {
  const days = value.match(/-> P(\d+)D ->/)?.[1];
  if (days) return template(language, 'quantInterpretationPrecedesTargetDays', { days });
  return t(language, 'quantInterpretationTemporalRelationshipUnavailable');
}

function rankingReason(language: Lang, candidate: QuantDriverCandidate) {
  if (candidate.ranking_reason.startsWith('registered_signal:')) {
    return template(language, 'quantInterpretationRankingReasonRegistered', {
      rank: candidate.rank,
      status: evidenceStatus(language, candidate.evidence_status),
    });
  }
  return t(language, 'quantInterpretationRankingReasonConservative');
}

function totalMissing(candidate: QuantDriverCandidate) {
  return Object.values(candidate.missingness).reduce((sum, value) => sum + value, 0);
}

function driverDirection(language: Lang, value: number | null) {
  if (value == null) return t(language, 'quantInterpretationDirectionUnknown');
  if (value > 0) return t(language, 'quantInterpretationDirectionHigher');
  if (value < 0) return t(language, 'quantInterpretationDirectionLower');
  return t(language, 'quantInterpretationDirectionStable');
}

function interpretationCode(language: Lang, value: string) {
  return t(language, codeKey('quantInterpretationCode', value));
}

function alternativeExplanation(language: Lang, value: string) {
  return t(language, codeKey('quantInterpretationAlternative', value));
}

function uncertaintyLabel(language: Lang, value: string) {
  if (value.startsWith('observe:')) return observationLabel(language, value);
  return interpretationCode(language, value);
}

function dominantDriver(bundle: QuantInterpretationBundle) {
  return bundle.driver_analysis.candidates[0] ?? null;
}

function DriverEvidenceBar({ candidate }: { candidate: QuantDriverCandidate }) {
  const total = Math.max(1, candidate.support_count + candidate.counterexample_count);
  return (
    <WebView dataSet={{ 'quant-interpretation-role': 'evidence-bar' }}>
      <WebView style={{ flex: candidate.support_count / total }} />
      <WebView style={{ flex: candidate.counterexample_count / total }} />
    </WebView>
  );
}

function DriverRow({
  candidate,
  language,
  onPress,
  theme,
}: {
  candidate: QuantDriverCandidate;
  language: Lang;
  onPress: () => void;
  theme: V11ThemeTokens;
}) {
  const currentFitUnavailable = candidate.evidence_status === 'INSUFFICIENT';
  return (
    <WebPressable
      accessibilityLabel={`${interpretationConstruct(language, candidate.driver_construct)} · ${evidenceStatus(language, candidate.evidence_status)}`}
      accessibilityRole="button"
      dataSet={{ 'quant-interpretation-role': 'driver-row' }}
      onPress={onPress}
    >
      <Text style={{ color: theme.text.metadata }}>{String(candidate.rank).padStart(2, '0')}</Text>
      <WebView>
        <WebView dataSet={{ 'quant-interpretation-role': 'row-heading' }}>
          <Text numberOfLines={1} style={{ color: theme.text.primary }}>{interpretationConstruct(language, candidate.driver_construct)}</Text>
          <Text style={{ color: theme.text.secondary }}>{signed(candidate.observed_recent_change)}</Text>
        </WebView>
        <Text numberOfLines={1} style={{ color: theme.text.secondary }}>{evidenceStatus(language, candidate.evidence_status)}</Text>
        {currentFitUnavailable ? (
          <Text style={{ color: theme.text.metadata }}>{t(language, 'quantInterpretationCurrentInputMissing')}</Text>
        ) : (
          <>
            <DriverEvidenceBar candidate={candidate} />
            <Text style={{ color: theme.text.metadata }}>
              {template(language, 'quantInterpretationSupportCounter', {
                support: candidate.support_count,
                counter: candidate.counterexample_count,
              })}
            </Text>
          </>
        )}
      </WebView>
      <PersonalTerminalIcon color={theme.text.secondary} name="open" size={14} />
    </WebPressable>
  );
}

function SimilarPeriodRow({
  language,
  onPress,
  period,
  theme,
}: {
  language: Lang;
  onPress: () => void;
  period: QuantSimilarPeriod;
  theme: V11ThemeTokens;
}) {
  const outcome = similarPeriodOutcome(period);
  const values = period.subsequent_trajectory.map((point) => point.baseline_deviation).filter((value): value is number => value != null);
  const path = values.length > 1
    ? values.map((value, index) => {
      const x = 4 + index * (54 / (values.length - 1));
      const y = 18 - Math.max(-1, Math.min(1, value)) * 12;
      return `${index ? 'L' : 'M'}${x},${y}`;
    }).join(' ')
    : '';
  return (
    <WebPressable accessibilityRole="button" dataSet={{ 'quant-interpretation-role': 'similar-row' }} onPress={onPress}>
      <Svg accessibilityRole="image" height={38} viewBox="0 0 62 38" width={62}>
        <Line stroke={theme.questTheme.colors.border} strokeWidth={1} x1={3} x2={59} y1={18} y2={18} />
        {path ? <Path d={path} fill="none" stroke={theme.glow.primary} strokeWidth={1.4} /> : null}
      </Svg>
      <WebView>
        <Text style={{ color: theme.text.primary }}>{date(language, period.start_at)} — {date(language, period.end_at)}</Text>
        <Text numberOfLines={1} style={{ color: theme.text.secondary }}>
          {template(language, 'quantInterpretationSimilarityDistance', { distance: number(period.distance, 2) })}
        </Text>
        <Text style={{ color: theme.text.metadata }}>
          {t(language, 'quantInterpretationSimilarityBasis')}: {period.matching_feature_keys.slice(0, 3).map((key) => interpretationConstruct(language, key)).join(' · ')}
        </Text>
        <Text style={{ color: theme.text.metadata }}>
          {t(language, 'quantInterpretationMajorDifferences')}: {period.different_feature_keys.length
            ? period.different_feature_keys.slice(0, 2).map((key) => interpretationConstruct(language, key)).join(' · ')
            : t(language, 'quantInterpretationNoMajorRecordedDifference')}
        </Text>
        <Text style={{ color: theme.text.secondary }}>
          {t(language, 'quantInterpretationWhatFollowed')}: {outcome.change == null
            ? t(language, 'quantInterpretationFollowupUnavailable')
            : template(language, 'quantInterpretationFollowupChange', { change: signed(outcome.change) })}
        </Text>
      </WebView>
      <PersonalTerminalIcon color={theme.text.secondary} name="open" size={14} />
    </WebPressable>
  );
}

function RecoveryMap({
  bundle,
  language,
  theme,
}: {
  bundle: QuantInterpretationBundle;
  language: Lang;
  theme: V11ThemeTokens;
}) {
  const recovery = bundle.recovery_trajectory;
  const allValues = recovery.episodes.flatMap((episode) => episode.points.map((point) => point.baseline_deviation).filter((value): value is number => value != null));
  const minimum = Math.min(-0.5, ...allValues, ...recovery.reference_path.map((point) => point.low_deviation));
  const maximum = Math.max(0.5, ...allValues, ...recovery.reference_path.map((point) => point.high_deviation));
  const width = 320;
  const height = 180;
  const left = 30;
  const right = 12;
  const top = 16;
  const bottom = 28;
  const horizon = Math.max(1, ...recovery.reference_path.map((point) => point.offset_days));
  const x = (offset: number) => left + (offset / horizon) * (width - left - right);
  const y = (value: number) => top + ((maximum - value) / Math.max(0.001, maximum - minimum)) * (height - top - bottom);
  const linePath = (values: Array<{ offset_days: number; value: number }>) => values.map((point, index) => `${index ? 'L' : 'M'}${x(point.offset_days)},${y(point.value)}`).join(' ');
  const high = recovery.reference_path.map((point) => `${x(point.offset_days)},${y(point.high_deviation)}`);
  const low = recovery.reference_path.slice().reverse().map((point) => `${x(point.offset_days)},${y(point.low_deviation)}`);
  return (
    <WebView dataSet={{ 'quant-interpretation-role': 'recovery-map' }}>
      <WebView dataSet={{ 'quant-interpretation-role': 'section-heading' }}>
        <WebView>
          <Text style={{ color: theme.text.metadata }}>{t(language, 'quantInterpretationHistoricalAnalogue')}</Text>
          <Text style={{ color: theme.text.primary }}>{t(language, 'quantInterpretationRecoveryMap')}</Text>
        </WebView>
        <Text style={{ color: theme.text.secondary }}>
          {template(language, 'quantInterpretationEpisodeCount', { count: recovery.episodes.length })}
        </Text>
      </WebView>
      {recovery.reference_path.length ? (
        <Svg accessibilityLabel={t(language, 'quantInterpretationRecoveryMapAccessibility')} accessibilityRole="image" height={height} viewBox={`0 0 ${width} ${height}`} width="100%">
          <Line stroke={theme.questTheme.colors.border} strokeDasharray="3 4" strokeWidth={1} x1={left} x2={width - right} y1={y(0)} y2={y(0)} />
          {high.length ? <Polygon fill={theme.glow.primary} opacity={0.09} points={[...high, ...low].join(' ')} /> : null}
          {recovery.episodes.map((episode) => {
            const values = episode.points.filter((point) => point.baseline_deviation != null).map((point) => ({ offset_days: point.offset_days, value: point.baseline_deviation! }));
            return values.length > 1 ? <Path d={linePath(values)} fill="none" key={episode.period_id} opacity={0.2} stroke={theme.text.secondary} strokeWidth={1} /> : null;
          })}
          <Path
            d={linePath(recovery.reference_path.map((point) => ({ offset_days: point.offset_days, value: point.median_deviation })))}
            fill="none"
            stroke={theme.glow.primary}
            strokeDasharray="6 4"
            strokeWidth={2}
          />
          <Circle cx={left} cy={y(bundle.driver_analysis.target_movement.deviation ?? 0)} fill={theme.glow.supporting} r={3.5} />
          {Array.from({ length: horizon + 1 }, (_, index) => (
            <React.Fragment key={index}>
              <Line stroke={theme.questTheme.colors.border} strokeWidth={0.75} x1={x(index)} x2={x(index)} y1={height - bottom} y2={height - bottom + 4} />
            </React.Fragment>
          ))}
        </Svg>
      ) : (
        <WebView dataSet={{ 'quant-interpretation-role': 'empty-state' }}>
          <Text style={{ color: theme.text.primary }}>{t(language, 'quantInterpretationNoRecoveryPath')}</Text>
          <Text style={{ color: theme.text.secondary }}>{t(language, 'quantInterpretationNoRecoveryPathBody')}</Text>
        </WebView>
      )}
      <Text style={{ color: theme.text.metadata }}>{t(language, 'quantInterpretationAnalogueNotForecast')}</Text>
    </WebView>
  );
}

function ClaimText({ claim, language, theme }: { claim: QuantInterpretationClaim; language: Lang; theme: V11ThemeTokens }) {
  const values = claim.values;
  let body = t(language, 'quantInterpretationClaimUncertainty');
  if (claim.statement_key === 'target_below_or_above_reference') {
    body = template(language, 'quantInterpretationClaimMovement', {
      current: number(values.current as number | null),
      baseline: number(values.baseline as number | null),
      deviation: signed(values.deviation as number | null),
    });
  } else if (claim.statement_key === 'registered_driver_fit') {
    body = template(language, 'quantInterpretationClaimDriver', {
      driver: interpretationConstruct(language, String(values.driver)),
      support: Number(values.support || 0),
      counter: Number(values.counterexamples || 0),
    });
  } else if (claim.statement_key === 'driver_counterexamples_present') {
    body = template(language, 'quantInterpretationClaimCounter', {
      driver: interpretationConstruct(language, String(values.driver)),
      count: Number(values.count || 0),
    });
  } else if (claim.statement_key === 'similar_periods_found') {
    body = template(language, 'quantInterpretationClaimSimilar', { count: Number(values.count || 0) });
  } else if (claim.statement_key === 'historical_analogue_trajectory') {
    body = template(language, 'quantInterpretationClaimFollowed', { count: Number(values.episode_count || 0) });
  } else if (claim.statement_key === 'current_evidence_risk_tradeoff') {
    const action = String(values.candidate_id || '').replace(/^decision:/, '').replace(/-/g, '_');
    body = action === 'gather_information' || action === 'gather_more_information'
      ? t(language, 'quantInterpretationClaimGatherInformation')
      : template(language, 'quantInterpretationClaimDecision', { action: actionLabel(language, action) });
  }
  return (
    <WebView dataSet={{ 'quant-interpretation-role': 'claim-row' }}>
      <Text style={{ color: theme.text.metadata }}>{t(language, `quantInterpretationSection_${claim.section}`)}</Text>
      <Text style={{ color: theme.text.primary }}>{body}</Text>
      <Text style={{ color: theme.text.secondary }}>
        {template(language, 'quantInterpretationEvidenceReferences', { count: claim.evidence_ids.length })}
      </Text>
    </WebView>
  );
}

function DecisionRow({
  candidate,
  language,
  leading,
  theme,
}: {
  candidate: QuantDecisionCandidate;
  language: Lang;
  leading: boolean;
  theme: V11ThemeTokens;
}) {
  return (
    <WebView dataSet={{ 'quant-interpretation-leading': leading ? 'true' : 'false', 'quant-interpretation-role': 'decision-row' }}>
      <WebView dataSet={{ 'quant-interpretation-role': 'row-heading' }}>
        <Text style={{ color: theme.text.primary }}>{actionLabel(language, candidate.action_key)}</Text>
        <Text style={{ color: leading ? theme.glow.primary : theme.text.metadata }}>
          {t(language, leading ? 'quantInterpretationLeadingCandidate' : `quantInterpretationDecisionStatus_${candidate.status}`)}
        </Text>
      </WebView>
      <Text style={{ color: theme.text.secondary }}>
        {template(language, 'quantInterpretationDecisionEvidence', {
          evidence: candidate.evidence_ids.length,
          analogues: candidate.analogue_period_ids.length,
        })}
      </Text>
      <Text style={{ color: theme.text.secondary }}>
        {t(language, 'quantInterpretationOutcomeToObserve')}: {observationLabel(language, candidate.outcome_to_observe)}
      </Text>
      <Text style={{ color: theme.text.metadata }}>
        {t(language, 'quantInterpretationDownside')}: {t(language, codeKey('quantInterpretationCode', candidate.downside_risk))}
      </Text>
      <Text style={{ color: theme.text.metadata }}>
        {t(language, 'quantInterpretationReversibility')}: {t(language, codeKey('quantInterpretationCode', candidate.reversibility))}
      </Text>
      <Text style={{ color: theme.text.metadata }}>{t(language, 'quantInterpretationActionNotOptimal')}</Text>
    </WebView>
  );
}

export function PersonalTerminalInterpretationStrip({
  bundle,
  language,
  onOpen,
  onSelectDriver,
  theme,
}: {
  bundle: QuantInterpretationBundle;
  language: Lang;
  onOpen: (view: QuantInterpretationView) => void;
  onSelectDriver: (candidate: QuantDriverCandidate) => void;
  theme: V11ThemeTokens;
}) {
  const driver = dominantDriver(bundle);
  return (
    <WebView dataSet={{ 'quant-interpretation-role': 'strip' }}>
      <WebPressable accessibilityRole="button" dataSet={{ 'quant-interpretation-role': 'strip-heading' }} onPress={() => onOpen('analyst')}>
        <WebView>
          <Text style={{ color: theme.text.metadata }}>{t(language, 'quantInterpretationAnalyst')}</Text>
          <Text numberOfLines={2} style={{ color: theme.text.primary }}>
            {bundle.driver_analysis.status === 'INSUFFICIENT'
              ? t(language, 'quantInterpretationInsufficientSummary')
              : template(language, 'quantInterpretationCurrentDeviation', {
                deviation: signed(bundle.driver_analysis.target_movement.deviation),
                target: interpretationConstruct(language, bundle.driver_analysis.context.target_construct),
              })}
          </Text>
        </WebView>
        <PersonalTerminalIcon color={theme.text.secondary} name="open" size={14} />
      </WebPressable>
      {driver ? (
        <WebPressable accessibilityRole="button" dataSet={{ 'quant-interpretation-role': 'driver-cue' }} onPress={() => onSelectDriver(driver)}>
          <PersonalTerminalIcon color={theme.text.secondary} name="signal" size={15} />
          <WebView>
            <Text style={{ color: theme.text.metadata }}>{t(language, 'quantInterpretationStrongestCurrentFit')}</Text>
            <Text numberOfLines={1} style={{ color: theme.text.primary }}>{interpretationConstruct(language, driver.driver_construct)}</Text>
            <Text numberOfLines={1} style={{ color: theme.text.secondary }}>{evidenceStatus(language, driver.evidence_status)}</Text>
          </WebView>
          <PersonalTerminalIcon color={theme.text.secondary} name="open" size={14} />
        </WebPressable>
      ) : (
        <WebPressable accessibilityRole="button" dataSet={{ 'quant-interpretation-role': 'driver-cue' }} onPress={() => onOpen('next')}>
          <PersonalTerminalIcon color={theme.text.secondary} name="research" size={15} />
          <Text style={{ color: theme.text.primary }}>{t(language, 'quantInterpretationInsufficientSummary')}</Text>
          <PersonalTerminalIcon color={theme.text.secondary} name="open" size={14} />
        </WebPressable>
      )}
    </WebView>
  );
}

export function PersonalTerminalInterpretationDesktop({
  bundle,
  language,
  onOpen,
  onOpenToday,
  onOperate,
  onSetAnalogueEnvelope,
  onSelectDriver,
  onSelectPeriod,
  onReturnToCurrent,
  returnToCurrentAvailable,
  series,
  theme,
}: {
  bundle: QuantInterpretationBundle;
  language: Lang;
  onOpen: (view: QuantInterpretationView) => void;
  onSelectDriver: (candidate: QuantDriverCandidate) => void;
  onSelectPeriod: (period: QuantSimilarPeriod) => void;
  onOpenToday: () => void;
  onOperate: (action: QuantInterpretationOperatorAction) => void;
  onSetAnalogueEnvelope: (visible: boolean) => void;
  onReturnToCurrent: () => void;
  returnToCurrentAvailable: boolean;
  series: PersonalTerminalSeries[];
  theme: V11ThemeTokens;
}) {
  const [activeView, setActiveView] = useState<'drivers' | 'driver' | 'similar' | 'recovery' | 'decision'>('drivers');
  const [selectedDriverId, setSelectedDriverId] = useState<string | undefined>();
  const tabs: Array<'drivers' | 'similar' | 'recovery' | 'decision'> = ['drivers', 'similar', 'recovery', 'decision'];
  return (
    <WebView dataSet={{ 'quant-interpretation-role': 'desktop-panel' }}>
      <WebPressable accessibilityRole="button" dataSet={{ 'quant-interpretation-role': 'desktop-heading' }} onPress={() => onOpen('analyst')}>
        <WebView>
          <Text style={{ color: theme.text.metadata }}>{t(language, 'quantInterpretationAnalyst')}</Text>
          <Text style={{ color: theme.text.primary }}>{t(language, 'quantInterpretationStructuredSynthesis')}</Text>
        </WebView>
        <PersonalTerminalIcon color={theme.text.secondary} name="open" size={14} />
      </WebPressable>
      <WebView dataSet={{ 'quant-interpretation-role': 'desktop-tabs' }}>
        {tabs.map((tab) => (
          <WebPressable
            accessibilityRole="tab"
            accessibilityState={{ selected: activeView === tab || (tab === 'drivers' && activeView === 'driver') }}
            dataSet={{ 'quant-interpretation-selected': activeView === tab || (tab === 'drivers' && activeView === 'driver') ? 'true' : 'false' }}
            key={tab}
            onPress={() => {
              setActiveView(tab);
              onSetAnalogueEnvelope(tab === 'recovery');
            }}
          >
            <Text style={{ color: activeView === tab || (tab === 'drivers' && activeView === 'driver') ? theme.text.primary : theme.text.metadata }}>
              {t(language, `quantInterpretationDesktopTab_${tab}`)}
            </Text>
          </WebPressable>
        ))}
      </WebView>
      <PersonalTerminalInterpretationInspector
        bundle={bundle}
        language={language}
        onOpen={onOpen}
        onOpenToday={onOpenToday}
        onOperate={onOperate}
        onReturnToCurrent={onReturnToCurrent}
        onSelectDriver={(candidate) => {
          setSelectedDriverId(candidate.candidate_id);
          setActiveView('driver');
          onSelectDriver(candidate);
        }}
        onSelectPeriod={onSelectPeriod}
        returnToCurrentAvailable={returnToCurrentAvailable}
        selectedDriverId={selectedDriverId}
        series={series}
        theme={theme}
        view={activeView}
      />
    </WebView>
  );
}

export function PersonalTerminalInterpretationInspector({
  bundle,
  language,
  onOpen,
  onOpenToday,
  onOperate,
  onReturnToCurrent,
  onSelectDriver,
  onSelectPeriod,
  returnToCurrentAvailable,
  selectedDriverId,
  series,
  theme,
  view,
}: {
  bundle: QuantInterpretationBundle;
  language: Lang;
  onOpen: (view: QuantInterpretationView) => void;
  onOpenToday: () => void;
  onOperate: (action: QuantInterpretationOperatorAction) => void;
  onReturnToCurrent: () => void;
  onSelectDriver: (candidate: QuantDriverCandidate) => void;
  onSelectPeriod: (period: QuantSimilarPeriod) => void;
  returnToCurrentAvailable: boolean;
  selectedDriverId?: string;
  series: PersonalTerminalSeries[];
  theme: V11ThemeTokens;
  view: QuantInterpretationView;
}) {
  const selectedDriver = bundle.driver_analysis.candidates.find((candidate) => candidate.candidate_id === selectedDriverId)
    ?? dominantDriver(bundle);
  const timeline = buildDriverTimeline(bundle, series, selectedDriver?.candidate_id);
  if (view === 'driver' && selectedDriver) {
    return (
      <WebView dataSet={{ 'quant-interpretation-role': 'inspector' }}>
        <WebView dataSet={{ 'quant-interpretation-role': 'detail-reading' }}>
          <Text style={{ color: theme.text.metadata }}>{interpretationConstruct(language, selectedDriver.driver_construct)}</Text>
          <Text style={{ color: theme.text.primary }}>{signed(selectedDriver.observed_recent_change)}</Text>
          <Text style={{ color: theme.text.secondary }}>{evidenceStatus(language, selectedDriver.evidence_status)}</Text>
        </WebView>
        <DriverEvidenceBar candidate={selectedDriver} />
        <WebView dataSet={{ 'quant-interpretation-role': 'fact-grid' }}>
          <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'quantInterpretationRecent')}</Text><Text style={{ color: theme.text.primary }}>{number(selectedDriver.observed_recent_value)} {unitLabel(language, selectedDriver.unit)}</Text></WebView>
          <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'quantInterpretationReference')}</Text><Text style={{ color: theme.text.primary }}>{number(selectedDriver.observed_reference_value)} {unitLabel(language, selectedDriver.unit)}</Text></WebView>
          <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'quantInterpretationDirection')}</Text><Text style={{ color: theme.text.primary }}>{driverDirection(language, selectedDriver.observed_recent_change)}</Text></WebView>
          <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'quantInterpretationTiming')}</Text><Text style={{ color: theme.text.primary }}>{temporalRelationship(language, selectedDriver.temporal_relationship)}</Text></WebView>
          <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'quantInterpretationSupport')}</Text><Text style={{ color: theme.text.primary }}>{selectedDriver.support_count}</Text></WebView>
          <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'quantInterpretationCounterexamples')}</Text><Text style={{ color: theme.text.primary }}>{selectedDriver.counterexample_count}</Text></WebView>
          <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'quantInterpretationIndependentPeriods')}</Text><Text style={{ color: theme.text.primary }}>{selectedDriver.independent_period_count}</Text></WebView>
          <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'quantInterpretationMissingness')}</Text><Text style={{ color: theme.text.primary }}>{totalMissing(selectedDriver)}</Text></WebView>
        </WebView>
        <DriverTimeline language={language} theme={theme} timeline={timeline} />
        <WebView dataSet={{ 'quant-interpretation-role': 'ranking-reason' }}>
          <Text style={{ color: theme.text.metadata }}>{t(language, 'quantInterpretationWhyRanked')}</Text>
          <Text style={{ color: theme.text.secondary }}>{rankingReason(language, selectedDriver)}</Text>
        </WebView>
        <Text style={{ color: theme.text.metadata }}>{t(language, 'quantInterpretationAssociationNotCause')}</Text>
        <WebView dataSet={{ 'quant-interpretation-role': 'limitation-list' }}>
          <Text style={{ color: theme.text.metadata }}>{t(language, 'quantInterpretationAlternativeExplanations')}</Text>
          <Text style={{ color: theme.text.secondary }}>
            {selectedDriver.alternative_explanations.length
              ? selectedDriver.alternative_explanations.map((value) => alternativeExplanation(language, value)).join(' · ')
              : t(language, 'quantInterpretationAlternativeExplanationsBody')}
          </Text>
          {selectedDriver.limitations.length ? <Text style={{ color: theme.text.metadata }}>{selectedDriver.limitations.map((value) => interpretationCode(language, value)).join(' · ')}</Text> : null}
        </WebView>
      </WebView>
    );
  }
  if (view === 'drivers') {
    return (
      <WebView dataSet={{ 'quant-interpretation-role': 'inspector' }}>
        <WebView dataSet={{ 'quant-interpretation-role': 'target-movement' }}>
          <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'quantInterpretationCurrent')}</Text><Text style={{ color: theme.text.primary }}>{number(bundle.driver_analysis.target_movement.current_value)}</Text></WebView>
          <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'quantInterpretationReference')}</Text><Text style={{ color: theme.text.primary }}>{number(bundle.driver_analysis.target_movement.baseline_value)}</Text></WebView>
          <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'quantInterpretationDeviation')}</Text><Text style={{ color: theme.text.primary }}>{signed(bundle.driver_analysis.target_movement.deviation)}</Text></WebView>
        </WebView>
        <DriverTimeline language={language} theme={theme} timeline={timeline} />
        {bundle.driver_analysis.candidates.map((candidate) => <DriverRow candidate={candidate} key={candidate.candidate_id} language={language} onPress={() => onSelectDriver(candidate)} theme={theme} />)}
        <Text style={{ color: theme.text.metadata }}>{t(language, 'quantInterpretationUnknownFactorRetained')}</Text>
      </WebView>
    );
  }
  if (view === 'similar') {
    return (
      <WebView dataSet={{ 'quant-interpretation-role': 'inspector' }}>
        <Text style={{ color: theme.text.secondary }}>{t(language, 'quantInterpretationSimilarMethod')}</Text>
        {returnToCurrentAvailable ? (
          <WebPressable accessibilityRole="button" dataSet={{ 'quant-interpretation-role': 'return-current' }} onPress={onReturnToCurrent}>
            <PersonalTerminalIcon color={theme.text.primary} name="reset" size={14} />
            <Text style={{ color: theme.text.primary }}>{t(language, 'quantInterpretationReturnToCurrent')}</Text>
          </WebPressable>
        ) : null}
        {bundle.similar_periods.periods.length
          ? bundle.similar_periods.periods.map((period) => <SimilarPeriodRow key={period.period_id} language={language} onPress={() => onSelectPeriod(period)} period={period} theme={theme} />)
          : <WebView dataSet={{ 'quant-interpretation-role': 'empty-state' }}><Text style={{ color: theme.text.primary }}>{t(language, 'quantInterpretationNoSimilarPeriods')}</Text><Text style={{ color: theme.text.secondary }}>{t(language, 'quantInterpretationNoSimilarPeriodsBody')}</Text></WebView>}
        <Text style={{ color: theme.text.metadata }}>{t(language, 'quantInterpretationSimilarityNotIdentity')}</Text>
      </WebView>
    );
  }
  if (view === 'recovery') return (
    <WebView dataSet={{ 'quant-interpretation-role': 'inspector' }}>
      <RecoveryMap bundle={bundle} language={language} theme={theme} />
      <WebPressable accessibilityRole="button" dataSet={{ 'quant-interpretation-role': 'primary-sheet-action' }} onPress={() => onOpen('scenario')}><Text style={{ color: theme.text.primary }}>{t(language, 'quantInterpretationCompareObservedActions')}</Text></WebPressable>
    </WebView>
  );
  if (view === 'scenario') return (
    <WebView dataSet={{ 'quant-interpretation-role': 'inspector' }}>
      <Text style={{ color: theme.text.secondary }}>{t(language, 'quantInterpretationScenarioDescription')}</Text>
      <WebView dataSet={{ 'quant-interpretation-role': 'scenario-grid' }}>
        {buildScenarioComparisonPresentation(bundle).map((branch) => (
          <ScenarioBranchVisual branch={branch} key={branch.actionKey} language={language} theme={theme} />
        ))}
      </WebView>
      <WebView dataSet={{ 'quant-interpretation-role': 'scenario-legend' }}>
        <Text style={{ color: theme.text.secondary }}>{t(language, 'quantInterpretationScenarioOutcomeAxis')}</Text>
        <Text style={{ color: theme.text.metadata }}>{t(language, 'quantInterpretationScenarioLegend')}</Text>
      </WebView>
      <Text style={{ color: theme.text.metadata }}>{t(language, 'quantInterpretationScenarioNonCausal')}</Text>
      <Text style={{ color: theme.text.metadata }}>{t(language, 'quantInterpretationSelectionBias')}</Text>
      <WebPressable accessibilityRole="button" dataSet={{ 'quant-interpretation-role': 'primary-sheet-action' }} onPress={() => onOpen('decision')}><Text style={{ color: theme.text.primary }}>{t(language, 'quantInterpretationReviewDecisionSupport')}</Text></WebPressable>
    </WebView>
  );
  if (view === 'decision') {
    const decision = buildDecisionPresentation(bundle);
    const movement = bundle.driver_analysis.target_movement;
    return (
      <WebView dataSet={{ 'quant-interpretation-role': 'decision-support' }}>
        <WebView dataSet={{ 'quant-interpretation-role': 'decision-section' }}>
          <Text style={{ color: theme.text.metadata }}>{t(language, 'quantInterpretationCurrentState')}</Text>
          <Text style={{ color: theme.text.primary }}>{template(language, 'quantInterpretationClaimMovement', {
            current: number(movement.current_value),
            baseline: number(movement.baseline_value),
            deviation: signed(movement.deviation),
          })}</Text>
        </WebView>
        <WebView dataSet={{ 'quant-interpretation-role': 'decision-section' }}>
          <Text style={{ color: theme.text.metadata }}>{t(language, 'quantInterpretationBestSupportedOption')}</Text>
          {decision.abstains || !decision.leading ? (
            <>
              <Text style={{ color: theme.text.primary }}>{t(language, 'quantInterpretationCannotDistinguishYet')}</Text>
              <Text style={{ color: theme.text.secondary }}>{t(language, 'quantInterpretationAbstentionBody')}</Text>
            </>
          ) : <DecisionRow candidate={decision.leading} language={language} leading theme={theme} />}
        </WebView>
        {decision.alternatives.length ? (
          <WebView dataSet={{ 'quant-interpretation-role': 'decision-section' }}>
            <Text style={{ color: theme.text.metadata }}>{t(language, 'quantInterpretationAlternatives')}</Text>
            {decision.alternatives.map((candidate) => <DecisionRow candidate={candidate} key={candidate.candidate_id} language={language} leading={false} theme={theme} />)}
          </WebView>
        ) : null}
        <WebView dataSet={{ 'quant-interpretation-role': 'decision-section' }}>
          <Text style={{ color: theme.text.metadata }}>{t(language, 'quantInterpretationWhy')}</Text>
          <Text style={{ color: theme.text.secondary }}>{decision.leading
            ? template(language, 'quantInterpretationDecisionEvidence', {
              evidence: decision.leading.evidence_ids.length,
              analogues: decision.leading.analogue_period_ids.length,
            })
            : t(language, 'quantInterpretationWhyAbstain')}</Text>
        </WebView>
        <WebView dataSet={{ 'quant-interpretation-role': 'decision-section' }}>
          <Text style={{ color: theme.text.metadata }}>{t(language, 'quantInterpretationUncertainty')}</Text>
          {[...decision.uncertaintyCodes, ...decision.missingInformation].slice(0, 5).map((value) => (
            <Text key={value} style={{ color: theme.text.secondary }}>· {uncertaintyLabel(language, value)}</Text>
          ))}
        </WebView>
        <WebPressable accessibilityRole="button" dataSet={{ 'quant-interpretation-role': 'next-observation' }} onPress={() => onOpen('next')}>
          <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'quantInterpretationNextUsefulObservation')}</Text><Text style={{ color: theme.text.primary }}>{observationLabel(language, bundle.decision_support.next_useful_observation)}</Text></WebView>
          <PersonalTerminalIcon color={theme.text.secondary} name="open" size={14} />
        </WebPressable>
        <WebPressable accessibilityRole="button" dataSet={{ 'quant-interpretation-role': 'secondary-sheet-action' }} onPress={() => onOpen('scenario')}><Text style={{ color: theme.text.primary }}>{t(language, 'quantInterpretationCompareObservedActions')}</Text></WebPressable>
        <WebPressable accessibilityRole="button" dataSet={{ 'quant-interpretation-role': 'primary-sheet-action' }} onPress={onOpenToday}><Text style={{ color: theme.text.primary }}>{t(language, 'quantInterpretationSendToToday')}</Text></WebPressable>
        <Text style={{ color: theme.text.metadata }}>{t(language, 'quantInterpretationTodayRetainsAuthority')}</Text>
      </WebView>
    );
  }
  if (view === 'next') return (
    <WebView dataSet={{ 'quant-interpretation-role': 'next-observation-detail' }}>
      <PersonalTerminalIcon color={theme.glow.primary} name="research" size={24} />
      <Text style={{ color: theme.text.metadata }}>{t(language, 'quantInterpretationNextUsefulObservation')}</Text>
      <Text style={{ color: theme.text.primary }}>{observationLabel(language, bundle.decision_support.next_useful_observation)}</Text>
      <Text style={{ color: theme.text.secondary }}>{t(language, 'quantInterpretationNextObservationReason')}</Text>
      <Text style={{ color: theme.text.metadata }}>{t(language, 'quantInterpretationNoDataDemand')}</Text>
    </WebView>
  );
  return (
    <WebView dataSet={{ 'quant-interpretation-role': 'inspector' }}>
      <WebView dataSet={{ 'quant-interpretation-role': 'operator' }}>
        <WebView dataSet={{ 'quant-interpretation-role': 'section-heading' }}>
          <WebView>
            <Text style={{ color: theme.text.metadata }}>{t(language, 'quantInterpretationChartOperator')}</Text>
            <Text style={{ color: theme.text.primary }}>{t(language, 'quantInterpretationOperateWorkspace')}</Text>
          </WebView>
        </WebView>
        <WebView dataSet={{ 'quant-interpretation-role': 'operator-grid' }}>
          {buildInterpretationOperatorOptions(bundle).map((option) => (
            <WebPressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !option.enabled }}
              dataSet={{ 'quant-interpretation-enabled': option.enabled ? 'true' : 'false' }}
              disabled={!option.enabled}
              key={option.id}
              onPress={() => onOperate(option.id)}
            >
              <PersonalTerminalIcon color={option.enabled ? theme.text.secondary : theme.text.metadata} name={option.id === 'show_recovery' ? 'chart' : option.id === 'compare_actions' ? 'decision' : option.id === 'next_observation' ? 'research' : option.id === 'find_similar' || option.id === 'compare_previous' ? 'range' : 'signal'} size={15} />
              <Text style={{ color: option.enabled ? theme.text.primary : theme.text.metadata }}>{t(language, `quantInterpretationOperator_${option.id}`)}</Text>
            </WebPressable>
          ))}
        </WebView>
      </WebView>
      {bundle.brief.claims.map((claim) => <ClaimText claim={claim} key={claim.claim_id} language={language} theme={theme} />)}
      <WebPressable accessibilityRole="button" dataSet={{ 'quant-interpretation-role': 'primary-sheet-action' }} onPress={() => onOpen('decision')}><Text style={{ color: theme.text.primary }}>{t(language, 'quantInterpretationReviewDecisionSupport')}</Text></WebPressable>
      <Text style={{ color: theme.text.metadata }}>{t(language, 'quantInterpretationNoLlmNoCausalIdentification')}</Text>
    </WebView>
  );
}
