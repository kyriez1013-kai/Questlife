import type {
  QuantProductBundleV1,
  QuantProductInstrumentV1,
  QuantProductSeriesV1,
} from './quantProductContract';

export type QuantProductConsumerInstrument = {
  id: string;
  entityId: string;
  scope: QuantProductInstrumentV1['scope'];
  constructKey: string;
  labelKey: string;
  domainKey: string;
  unit: string;
  scale: QuantProductInstrumentV1['scale'];
  latest: QuantProductInstrumentV1['latest'];
  reference: QuantProductInstrumentV1['reference'];
  change: QuantProductInstrumentV1['change'];
  evidence: QuantProductInstrumentV1['evidence'];
  availability: QuantProductInstrumentV1['availability'];
  supportedAnalysisKeys: string[];
  series: QuantProductSeriesV1[];
};

export type QuantProductConsumerModel = {
  contractVersion: string;
  bundleId: string;
  asOf: string;
  stale: boolean;
  mode: QuantProductBundleV1['metadata']['mode'];
  scope: QuantProductBundleV1['metadata']['scope'];
  instruments: QuantProductConsumerInstrument[];
  watchlist: NonNullable<QuantProductBundleV1['personal_market']>['watchlist'];
  signals: QuantProductBundleV1['signals'];
  interpretation: QuantProductBundleV1['interpretation'];
  goalSurfaces: QuantProductBundleV1['goal_surfaces'];
  skillSurfaces: QuantProductBundleV1['skill_surfaces'];
  analystContext: QuantProductBundleV1['analyst_context'];
  limitations: string[];
};

/**
 * Lossless presentation bridge. It performs identity joins and field renaming
 * only; all numerical values, references, changes, candles and evidence remain
 * Quant-owned.
 */
export function adaptQuantProductBundleV1(bundle: QuantProductBundleV1): QuantProductConsumerModel {
  const seriesByInstrument = new Map<string, QuantProductSeriesV1[]>();
  bundle.series.forEach((series) => {
    const rows = seriesByInstrument.get(series.instrument_id) || [];
    rows.push(series);
    seriesByInstrument.set(series.instrument_id, rows);
  });
  return {
    contractVersion: bundle.metadata.contract_version,
    bundleId: bundle.metadata.bundle_id,
    asOf: bundle.metadata.as_of,
    stale: bundle.metadata.staleness.state === 'STALE',
    mode: bundle.metadata.mode,
    scope: bundle.metadata.scope,
    instruments: bundle.instruments.map((instrument) => ({
      id: instrument.instrument_id,
      entityId: instrument.entity_id,
      scope: instrument.scope,
      constructKey: instrument.construct_key,
      labelKey: instrument.label_key,
      domainKey: instrument.domain_key,
      unit: instrument.unit,
      scale: instrument.scale,
      latest: instrument.latest,
      reference: instrument.reference,
      change: instrument.change,
      evidence: instrument.evidence,
      availability: instrument.availability,
      supportedAnalysisKeys: instrument.supported_analysis_keys,
      series: seriesByInstrument.get(instrument.instrument_id) || [],
    })),
    watchlist: bundle.personal_market?.watchlist || [],
    signals: bundle.signals,
    interpretation: bundle.interpretation,
    goalSurfaces: bundle.goal_surfaces,
    skillSurfaces: bundle.skill_surfaces,
    analystContext: bundle.analyst_context,
    limitations: bundle.limitation_codes,
  };
}

export function selectQuantProductInstrument(
  model: QuantProductConsumerModel,
  instrumentId: string,
): QuantProductConsumerInstrument | null {
  return model.instruments.find((instrument) => instrument.id === instrumentId) || null;
}

export function selectQuantProductRange(
  instrument: QuantProductConsumerInstrument,
  rangeKey: string,
): { series: QuantProductSeriesV1; range: QuantProductSeriesV1['supported_ranges'][number] } | null {
  for (const series of instrument.series) {
    const range = series.supported_ranges.find((candidate) => candidate.key === rangeKey);
    if (range) return { series, range };
  }
  return null;
}

export type TodayQuantProductSurface = {
  currentState: QuantProductInstrumentV1['latest'] | null;
  evidence: QuantProductInstrumentV1['evidence'] | null;
  decisionReferenceId: string | null;
  todayCommandAuthority: 'existing_today_command';
};

export function buildTodayQuantProductSurface(bundle: QuantProductBundleV1): TodayQuantProductSurface {
  const currentState = bundle.instruments.find((instrument) => instrument.construct_key.startsWith('state.')) || null;
  return {
    currentState: currentState?.latest || null,
    evidence: currentState?.evidence || null,
    decisionReferenceId: bundle.interpretation?.decision_support?.leading_candidate_id || null,
    todayCommandAuthority: 'existing_today_command',
  };
}
