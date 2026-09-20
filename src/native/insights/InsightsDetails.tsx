import React, { useState } from 'react';
import { Text, View } from 'react-native';
import type { Lang } from '../../i18n';
import type { QuestTheme } from '../../design/tokens';
import type { QuantProductBundleV1, QuantProductInstrumentV1, QuantProductSeriesV1 } from '../../quant-product/quantProductContract';
import type { QuantAnalysisExtensionV1 } from '../../quant-product/quantAnalysisContract';
import { iv3, type InsightsV3CopyKey } from '../../insights-v3/insightsV3I18n';
import { actionLabel, availabilityLabel, evidenceStageLabel, featureLabel, formatDateTime, formatQuantValue, formatSignedValue, instrumentLabel, sourceClassLabel, unitLabel, type InsightsV3RangeSelection } from '../../insights-v3/insightsV3Presentation';
import { InsightButton, InsightSection, InsightStat, insightsStyles } from './InsightsControls';
import { localDateKey, inRangeEvents } from './nativeInsightsPresentation';
import { ni } from './nativeInsightsStrings';

export type InsightsDetailKind = 'history' | 'evidence' | 'events' | 'drivers' | 'similar' | 'recovery' | 'scenario' | 'jointAnalysis';
type Props = { q: QuestTheme; lang: Lang; bundle: QuantProductBundleV1; instrument: QuantProductInstrumentV1; series: QuantProductSeriesV1 | null; points: QuantProductSeriesV1['points']; range: InsightsV3RangeSelection; analysis: QuantAnalysisExtensionV1 | null; kind: InsightsDetailKind; onJump: (range: InsightsV3RangeSelection) => void; onSelect: (id: string) => void };

export function InsightsDetails({ q, lang, bundle, instrument, series, points, range, analysis, kind, onJump, onSelect }: Props) {
  const s = insightsStyles(q); const [limit, setLimit] = useState(40);
  const value = (v: number | null | undefined, unit = instrument.unit) => `${formatQuantValue(v, unit, lang)} ${unitLabel(unit, lang)}`.trim();
  const signed = (v: number | null | undefined) => formatSignedValue(v, instrument.unit, lang);
  const date = (v: string | null) => v ? formatDateTime(lang, v, true) : ni(lang, 'none');
  const label = (id: string) => { const row = bundle.instruments.find(item => item.instrument_id === id); return row ? instrumentLabel(lang, row) : iv3(lang, 'instrumentGeneric'); };
  const stat = (key: string, name: string, result: string) => <InsightStat key={key} q={q} label={name} value={result} />;
  const codes = (items: string[]) => items.length ? <InsightSection q={q} title={ni(lang, 'reasonCodes')}><Text selectable style={s.meta}>{[...new Set(items)].join('\n')}</Text></InsightSection> : null;
  const missing = (counts: Record<string, number | undefined>) => Object.entries(counts).map(([key, count]) => stat(key, key, String(count)));
  const evidence = (item: QuantProductInstrumentV1['evidence']) => <>
    {stat('stage', iv3(lang, 'evidence'), evidenceStageLabel(lang, item.stage))}
    <Text style={s.body}>{iv3(lang, 'observationEvidence', { count: item.observation_count, periods: item.independent_period_count })}</Text>
    <Text style={s.body}>{iv3(lang, 'supportCounter', { support: item.support_count, counter: item.counterexample_count })}</Text>
    {missing(item.missingness.counts)}{codes(item.limitation_codes)}
  </>;

  if (kind === 'history') return <>
    <Text style={s.meta}>{ni(lang, 'localTime')}</Text>
    {!points.length ? <Text style={s.body}>{ni(lang, 'noRangePoints')}</Text> : [...points].reverse().slice(0, limit).map(row => <View key={row.observation_id} style={s.divider}>
      <Text style={s.heading}>{value(row.value, row.unit)}</Text><Text style={s.body}>{date(row.observed_at)}</Text><Text style={s.meta}>{sourceClassLabel(lang, row.source_class)}</Text><Text selectable style={s.meta}>{row.observation_id}</Text>
    </View>)}
    {points.length > limit ? <InsightButton q={q} icon="add" label={ni(lang, 'showMore')} onPress={() => setLimit(current => current + 40)} /> : null}
  </>;
  if (kind === 'events') {
    const events = series ? inRangeEvents(series, range, bundle.metadata.as_of) : [];
    const labels: Record<string, InsightsV3CopyKey> = { PLAN: 'planEvent', EXECUTION: 'executionEvent', STATE_OBSERVATION: 'stateEvent', CONTEXT_OBSERVATION: 'contextEvent', ENTITY_CHANGE: 'entityEvent' };
    return <><Text style={s.body}>{iv3(lang, 'planNotExecution')}</Text>{events.length ? [...events].reverse().slice(0, limit).map(row => <View key={row.event_id} style={s.divider}><Text style={s.heading}>{iv3(lang, labels[row.event_type])}</Text><Text style={s.body}>{date(row.timestamp)}</Text></View>) : <Text style={s.body}>{iv3(lang, 'noEvents')}</Text>}{events.length > limit ? <InsightButton q={q} icon="add" label={ni(lang, 'showMore')} onPress={() => setLimit(n => n + 40)} /> : null}</>;
  }
  if (kind === 'evidence') return <>
    {evidence(instrument.evidence)}
    <InsightSection q={q} title={iv3(lang, 'reference')}>
      {stat('reference', instrument.reference.kind, value(instrument.reference.value, instrument.reference.unit))}
      {stat('referenceStatus', ni(lang, 'referenceStatus'), instrument.reference.status)}
      {stat('range', ni(lang, 'referenceRange'), `${value(instrument.reference.low, instrument.reference.unit)} / ${value(instrument.reference.high, instrument.reference.unit)}`)}
      {stat('window', iv3(lang, 'analysisWindow'), `${date(instrument.reference.window_start)} / ${date(instrument.reference.window_end)}`)}
      <Text style={s.body}>{iv3(lang, 'baselineNotTarget')}</Text>
    </InsightSection>
    <InsightSection q={q} title={ni(lang, 'provenance')}>
      {stat('unit', ni(lang, 'unit'), instrument.unit)}{stat('scale', ni(lang, 'scale'), instrument.scale)}
      {stat('method', ni(lang, 'method'), `${instrument.provenance.method} · ${instrument.provenance.method_version}`)}
      {stat('bundle', ni(lang, 'bundle'), bundle.metadata.bundle_id)}
      {stat('asof', ni(lang, 'measuredAt'), date(instrument.latest?.observed_at ?? null))}
      {stat('source', ni(lang, 'source'), instrument.latest ? sourceClassLabel(lang, instrument.latest.source_class) : ni(lang, 'none'))}
      {stat('availability', ni(lang, 'status'), availabilityLabel(lang, instrument.availability.state))}
    </InsightSection>
    <Text style={s.body}>{iv3(lang, 'missingNotZero')}</Text><Text style={s.body}>{iv3(lang, 'observationNotCausal')}</Text>
    {codes([...instrument.availability.reason_codes, ...bundle.limitation_codes])}
  </>;

  const interpretation = bundle.interpretation;
  if (kind !== 'jointAnalysis' && interpretation && interpretation.target_instrument_id !== instrument.instrument_id) return <>
    <Text style={s.body}>{ni(lang, 'targetMismatch')}</Text><Text style={s.heading}>{label(interpretation.target_instrument_id)}</Text>
    <InsightButton q={q} icon="open" label={ni(lang, 'analyzeTarget')} onPress={() => onSelect(interpretation.target_instrument_id)} />
  </>;
  const unavailable = (status?: { state: QuantProductInstrumentV1['availability']['state']; reason_codes: string[] }) => <><Text style={s.body}>{status ? availabilityLabel(lang, status.state) : ni(lang, 'noAnalysis')}</Text>{status ? codes(status.reason_codes) : null}</>;
  const windowNote = <Text style={s.meta}>{ni(lang, 'analysisWindowNote')} {iv3(lang, 'asOf', { date: date(bundle.metadata.as_of) })}</Text>;

  if (kind === 'drivers') {
    const drivers = interpretation?.driver_analysis;
    if (!drivers || drivers.status.state !== 'AVAILABLE') return unavailable(drivers?.status);
    return <>{windowNote}<Text style={s.body}>{iv3(lang, 'driverLimit')}</Text>{drivers.candidates.map(row => <InsightSection key={row.candidate_id} q={q} title={label(row.driver_instrument_id)}>
      <Text style={s.body}>{iv3(lang, 'candidateRank', { rank: row.rank })}</Text><Text style={s.body}>{iv3(lang, 'lag', { value: row.lag_key })}</Text>{evidence(row.evidence)}{codes(row.limitation_codes)}
    </InsightSection>)}{codes(drivers.unresolved_explanation_keys)}</>;
  }
  if (kind === 'similar') {
    const similar = interpretation?.similar_periods;
    if (!similar || similar.status.state !== 'AVAILABLE') return unavailable(similar?.status);
    return <>{windowNote}<Text style={s.body}>{iv3(lang, 'similarLimit')}</Text>{similar.periods.map(period => <InsightSection key={period.period_id} q={q} title={`${date(period.start_at)} / ${date(period.end_at)}`}>
      <Text style={s.body}>{iv3(lang, 'periodMatch', { items: period.matching_feature_keys.map(key => featureLabel(lang, key)).join(' · ') })}</Text>
      <Text style={s.body}>{iv3(lang, 'periodDifference', { items: period.different_feature_keys.map(key => featureLabel(lang, key)).join(' · ') })}</Text>
      <Text style={s.meta}>{iv3(lang, 'periodFollowup', { count: period.subsequent_series.length })}</Text>
      <InsightButton q={q} icon="calendar" label={iv3(lang, 'jumpToPeriod')} onPress={() => onJump({ kind: 'calendar', start: localDateKey(period.timeline_jump.start ?? period.start_at), end: localDateKey(period.timeline_jump.end ?? period.end_at) })} />
    </InsightSection>)}</>;
  }
  if (kind === 'recovery') {
    const recovery = interpretation?.recovery;
    if (!recovery || recovery.status.state !== 'AVAILABLE') return unavailable(recovery?.status);
    return <>{windowNote}<Text style={s.body}>{iv3(lang, 'recoveryLimit')}</Text>{recovery.reference_path.map(point => <View key={point.offset_days} style={s.divider}>
      <Text style={s.heading}>{iv3(lang, 'dayOffset', { day: point.offset_days })}</Text><Text style={s.body}>{iv3(lang, 'historicalRange', { low: signed(point.low_deviation), high: signed(point.high_deviation), mid: signed(point.median_deviation) })}</Text><Text style={s.meta}>{iv3(lang, 'episodeCount', { count: point.episode_count })}</Text>
    </View>)}{codes(recovery.limitation_codes)}</>;
  }
  if (kind === 'scenario') {
    const scenario = interpretation?.scenario;
    if (!scenario || scenario.status.state !== 'AVAILABLE') return unavailable(scenario?.status);
    return <>{windowNote}<Text style={s.body}>{iv3(lang, 'scenarioLimit')}</Text>{scenario.branches.map(branch => <InsightSection key={branch.branch_id} q={q} title={actionLabel(lang, branch.action_value)}>
      <Text style={s.body}>{iv3(lang, 'comparablePeriods', { count: branch.comparable_period_count })}</Text><Text style={s.heading}>{iv3(lang, 'observedOutcome', { value: signed(branch.observed_outcome_change) })}</Text>{evidence(branch.evidence)}{stat('missing', ni(lang, 'missing'), String(branch.missing_outcome_count))}{codes(branch.limitation_codes)}
    </InsightSection>)}{codes([...scenario.confounding_warning_keys, scenario.selection_bias_warning_key])}</>;
  }
  const joint = analysis?.joint_analyses.find(row => row.target_instrument_id === instrument.instrument_id && row.target_unit === instrument.unit);
  if (!joint) return unavailable();
  return <>{windowNote}<Text style={s.body}>{iv3(lang, 'jointAnalysisLimit')}</Text>
    {stat('status', iv3(lang, 'modelStatus'), availabilityLabel(lang, joint.status))}
    {stat('window', iv3(lang, 'analysisWindow'), `${date(joint.window_start)} / ${date(joint.window_end)}`)}
    {stat('complete', iv3(lang, 'completeObservations'), String(joint.complete_observation_count))}{stat('excluded', iv3(lang, 'excludedObservations'), String(joint.excluded_observation_count))}
    {joint.status === 'AVAILABLE' ? <>
      {stat('observed', iv3(lang, 'observedDeviation'), signed(joint.observed_deviation))}{stat('associated', iv3(lang, 'modelAssociatedComponent'), signed(joint.model_attributed_deviation))}{stat('residual', iv3(lang, 'unexplainedResidual'), signed(joint.residual_deviation))}
      {joint.drivers.map(driver => <InsightSection key={driver.driver_id} q={q} title={label(driver.predictor_instrument_id)}>
        {stat('contribution', iv3(lang, 'modelAssociatedComponent'), signed(driver.contribution_target_units))}
        {stat('stability', iv3(lang, 'relationshipStability'), iv3(lang, ({ STABLE: 'stabilityStable', MODERATE: 'stabilityModerate', UNSTABLE: 'stabilityUnstable', INSUFFICIENT: 'stabilityInsufficient' } as const)[driver.stability]))}
        <Text style={s.body}>{iv3(lang, 'lagAndWindow', { lag: driver.lag_periods, window: driver.rolling_periods })}</Text>{stat('missing', iv3(lang, 'missingObservations'), String(driver.missing_observation_count))}{codes(driver.limitation_codes)}
      </InsightSection>)}
      <InsightSection q={q} title={iv3(lang, 'timeAwareValidation')}><Text style={s.body}>{iv3(lang, 'blockedForwardValidation')}</Text>{stat('fold', iv3(lang, 'stabilityWindows'), String(joint.validation.fold_count))}{stat('heldout', iv3(lang, 'heldOutObservations'), String(joint.validation.held_out_observation_count))}{stat('error', iv3(lang, 'heldOutError'), value(joint.validation.held_out_mae))}</InsightSection>
    </> : null}{codes(joint.limitation_codes)}
  </>;
}
