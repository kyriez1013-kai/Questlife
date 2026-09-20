import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Lang } from '../../i18n';
import type { QuestTheme } from '../../design/tokens';
import { getQuestVisualFoundation } from '../../design/visualFoundation';
import QuestCard from '../../components/ui/QuestCard';
import type { QuantProductBundleV1 } from '../../quant-product/quantProductContract';
import type { QuantAnalysisExtensionV1 } from '../../quant-product/quantAnalysisContract';
import { adaptQuantProductBundleV1 } from '../../quant-product/quantProductV1Adapter';
import { iv3, type InsightsV3CopyKey } from '../../insights-v3/insightsV3I18n';
import { availabilityLabel, availableChartKinds, buildPersonalContext, contractQuickRanges, defaultChartKind, defaultRangeSelection, evidenceStageLabel, formatDateTime, formatQuantValue, instrumentLabel, selectDefaultInstrumentId, selectSeriesPoints, sourceClassLabel, unitLabel, type InsightsV3ChartKind, type InsightsV3RangeSelection } from '../../insights-v3/insightsV3Presentation';
import type { InsightsV3ChartHandle } from '../../insights-v3/InsightsV3Chart';
import type { InsightsV3FixtureId } from '../../insights-v3/insightsV3Source';
import type { PersonalTerminalIconName } from '../../v11-insights/personal-terminal/PersonalTerminalIcon';
import { moveInsightsV3WatchlistItem, orderedInsightsV3Watchlist, toggleInsightsV3PinnedItem } from '../../insights-v3/insightsV3WatchlistPreferences';
import { InsightButton, InsightSection, InsightSheet, InsightToggle, insightsStyles } from './InsightsControls';
import { InsightsRangeEditor } from './InsightsRangeEditor';
import { InsightsDetails, type InsightsDetailKind } from './InsightsDetails';
import NativeInsightsChart from './NativeInsightsChart';
import { nativeChartModel } from './nativeInsightsChartModel';
import { comparisonBlock, comparisonInWindow, insightsFailureKind, matchingAnalysis, nativeRangeLabel, renderableKinds, type NativeInsightsLoadState } from './nativeInsightsPresentation';
import { ni } from './nativeInsightsStrings';

type Tool = InsightsDetailKind | 'watchlist' | 'range' | 'compare' | 'indicators' | 'samples' | 'analyst';
export type NativeInsightsWorkspaceProps = {
  q: QuestTheme; lang: Lang; bundle: QuantProductBundleV1 | null; analysis?: QuantAnalysisExtensionV1 | null;
  state: NativeInsightsLoadState; sample: boolean; sampleError?: boolean; deviceError?: boolean;
  onRefresh: () => void; onSample: (id: InsightsV3FixtureId) => void; onExitSample: () => void;
};
const chartNames: Record<InsightsV3ChartKind, InsightsV3CopyKey> = { line: 'chartLine', candle: 'chartCandle', bar: 'chartBar', point: 'chartPoint' };
const chartIcons: Record<InsightsV3ChartKind, PersonalTerminalIconName> = { line: 'chart', candle: 'candle', bar: 'bar', point: 'market' };
const details: Array<{ kind: InsightsDetailKind; copy: InsightsV3CopyKey; icon: PersonalTerminalIconName }> = [
  { kind: 'jointAnalysis', copy: 'jointAnalysis', icon: 'analyst' }, { kind: 'drivers', copy: 'drivers', icon: 'compare' },
  { kind: 'similar', copy: 'similar', icon: 'calendar' }, { kind: 'recovery', copy: 'recovery', icon: 'chart' }, { kind: 'scenario', copy: 'scenario', icon: 'decision' },
];

export default function NativeInsightsWorkspace({ q, lang, bundle, analysis, state, sample, sampleError, deviceError, onRefresh, onSample, onExitSample }: NativeInsightsWorkspaceProps) {
  const s = insightsStyles(q); const f = useMemo(() => getQuestVisualFoundation(q), [q]);
  const model = useMemo(() => bundle ? adaptQuantProductBundleV1(bundle) : null, [bundle]);
  const validAnalysis = matchingAnalysis(bundle, analysis);
  const failureKind = insightsFailureKind(state.result);
  const [selectedId, setSelectedId] = useState(''); const [hidden, setHidden] = useState<string[]>([]);
  const [watchOrder, setWatchOrder] = useState<string[] | null>(null); const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [rangeOverride, setRangeOverride] = useState<InsightsV3RangeSelection | null>(null);
  const [kindOverride, setKindOverride] = useState<InsightsV3ChartKind | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]); const [tool, setTool] = useState<Tool | null>(null);
  const [showReference, setShowReference] = useState(true); const [showBand, setShowBand] = useState(false); const [showEvents, setShowEvents] = useState(false);
  const [indicatorIds, setIndicatorIds] = useState<string[]>([]); const [ready, setReady] = useState(false);
  const ref = useRef<InsightsV3ChartHandle>(null); const scroll = useRef<ScrollView>(null);
  const onReadyChange = useCallback((value: boolean) => setReady(value), []);
  const selected = model?.instruments.find(row => row.id === selectedId) ?? model?.instruments.find(row => row.id === selectDefaultInstrumentId(model)) ?? null;
  const raw = bundle?.instruments.find(row => row.instrument_id === selected?.id) ?? null;
  const series = selected?.series[0] ?? null;
  const range = rangeOverride ?? defaultRangeSelection(series);
  const kind = kindOverride ?? defaultChartKind(series);
  const kinds = availableChartKinds(series); const renderable = renderableKinds(series, range);
  const points = series && model ? selectSeriesPoints(series, range, model.asOf) : [];
  const personal = selected ? buildPersonalContext(lang, selected) : null;
  const order = [...new Set([...(watchOrder ?? model?.watchlist.map(row => row.instrument_id) ?? []), ...(model?.instruments.map(row => row.id) ?? [])])];
  const ordered = orderedInsightsV3Watchlist({ order, pinnedIds }).flatMap(id => { const row = model?.instruments.find(item => item.id === id); return row ? [row] : []; });
  const indicatorLayers = validAnalysis?.indicator_series.filter(row => row.instrument_id === selected?.id && row.unit === series?.unit && row.points.length && row.points.every(point => Date.parse(point.observed_at) <= Date.parse(bundle!.metadata.as_of))) ?? [];
  const comparisons = selected && series && model ? compareIds.flatMap(id => {
    const row = model.instruments.find(item => item.id === id);
    if (!row || row.id === selected.id || comparisonBlock(selected, row)) return [];
    const overlap = validAnalysis?.compare_overlaps.find(item => item.target_instrument_id === selected.id && item.compare_instrument_id === id);
    return [{ instrumentId: id, label: instrumentLabel(lang, row), matchingWindowKey: overlap?.matching_window_key ?? null, overlapCount: overlap?.overlapping_window_count ?? null, series: comparisonInWindow(series, row.series[0], range, model.asOf) }];
  }) : [];
  const chartModel = series && selected && model ? nativeChartModel({ version: 1, presentation: {
    asOf: model.asOf, series, range, chartKind: kind, foundation: f, lang, targetLabel: instrumentLabel(lang, selected), showEvents, showRawObservations: true,
    showReference: showReference && series.reference.unit === series.unit, showReferenceRange: showBand && series.reference.unit === series.unit,
    comparisonSeries: comparisons,
    indicatorSeries: indicatorLayers.filter(row => indicatorIds.includes(row.indicator_id)).map(row => ({ label: iv3(lang, row.layer_kind === 'EWMA_SHORT' ? 'shortEwmaIndicator' : 'longEwmaIndicator'), series: row })),
  } }, q) : null;

  const selectInstrument = (id: string) => { setSelectedId(id); setRangeOverride(null); setKindOverride(null); setCompareIds([]); setIndicatorIds([]); setReady(false); setTool(null); };
  const applyRange = (next: InsightsV3RangeSelection) => { setRangeOverride(next); setReady(false); setTool(null); scroll.current?.scrollTo({ y: 0, animated: false }); };
  const open = (next: Tool) => setTool(next);
  const toolTitle = tool === 'range' ? ni(lang, 'custom') : tool === 'history' ? ni(lang, 'history') : tool === 'samples' ? ni(lang, 'sampleOpen') : tool === 'events' ? ni(lang, 'events') : tool ? iv3(lang, tool) : '';
  const tools = <View style={s.wrap}>
    <InsightButton q={q} icon="compare" label={iv3(lang, 'compare')} selected={compareIds.length > 0} onPress={() => open('compare')} />
    <InsightButton q={q} icon="indicator" label={iv3(lang, 'indicators')} onPress={() => open('indicators')} />
    <InsightButton q={q} icon="evidence" label={ni(lang, 'history')} onPress={() => open('history')} />
    <InsightButton q={q} icon="analyst" label={iv3(lang, 'analyst')} onPress={() => open('analyst')} />
  </View>;

  return <SafeAreaView edges={['top', 'left', 'right']} style={s.screen}>
    <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
      <View style={s.row}><Text accessibilityRole="header" style={[s.title, s.grow]}>{ni(lang, 'title')}</Text>{!sample ? <InsightButton q={q} compact icon="reset" label={ni(lang, state.attempted ? 'refresh' : 'load')} busy={state.busy} onPress={onRefresh} /> : null}</View>
      {sample ? <QuestCard questTheme={q} variant="flat" style={{ borderRadius: q.radius.sm, gap: q.spacing.sm }}><Text accessibilityRole="header" style={s.heading}>{ni(lang, 'sample')}</Text><Text style={s.body}>{ni(lang, 'sampleBody')}</Text><InsightButton q={q} icon="open" label={ni(lang, 'sampleExit')} onPress={onExitSample} /></QuestCard> : <Text style={s.meta}>{ni(lang, 'consent')}</Text>}
      {deviceError && !sample ? <Text accessibilityRole="alert" style={s.body}>{ni(lang, 'deviceReadError')}</Text> : null}
      {sampleError ? <Text accessibilityRole="alert" style={s.body}>{ni(lang, 'sampleError')}</Text> : null}
      {state.busy ? <View style={s.row}><ActivityIndicator color={q.colors.primary} /><Text accessibilityLiveRegion="polite" style={s.body}>{iv3(lang, 'loading')}</Text></View> : null}
      {state.failure && !sample ? <View style={{ gap: q.spacing.sm }}><Text accessibilityRole="alert" style={s.heading}>{ni(lang, failureKind)}</Text><Text style={s.body}>{ni(lang, `${failureKind}Body`)}</Text>{bundle ? <Text style={s.meta}>{ni(lang, 'retained')}</Text> : null}<InsightButton q={q} icon="reset" label={iv3(lang, 'retry')} busy={state.busy} onPress={onRefresh} /></View> : null}
      {!bundle && !state.failure && !state.busy && !sampleError ? <InsightSection q={q} title={ni(lang, state.attempted ? 'empty' : 'idle')}><Text style={s.body}>{ni(lang, 'emptyBody')}</Text>{!sample ? <InsightButton q={q} icon="analyst" label={ni(lang, 'load')} onPress={onRefresh} /> : null}</InsightSection> : null}
      {bundle?.metadata.staleness.state !== 'CURRENT' && bundle ? <Text style={s.meta}>{ni(lang, bundle.metadata.staleness.state === 'STALE' ? 'stale' : 'unknownFreshness')}</Text> : null}
      {analysis && !validAnalysis ? <Text accessibilityRole="alert" style={s.body}>{ni(lang, 'analysisMismatch')}</Text> : null}

      {selected && model && raw ? <>
        <View style={s.row}><Text accessibilityRole="header" style={[s.heading, s.grow]}>{iv3(lang, 'watchlist')}</Text><InsightButton q={q} icon="watchlist" compact label={ni(lang, 'watchlistManage')} onPress={() => open('watchlist')} /></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: q.spacing.sm, paddingBottom: q.spacing.xs }}>
          {ordered.filter(row => !hidden.includes(row.id)).map(row => <Pressable key={row.id} accessibilityRole="button" accessibilityLabel={`${instrumentLabel(lang, row)}, ${formatQuantValue(row.latest?.value, row.unit, lang)} ${unitLabel(row.unit, lang)}`} accessibilityState={{ selected: row.id === selected.id }} onPress={() => selectInstrument(row.id)} style={{ width: q.spacing.xxl * 6 }}>
            <QuestCard questTheme={q} style={{ flex: 1, borderRadius: q.radius.sm, borderColor: selected.id === row.id ? q.colors.primary : q.colors.cardBorder, gap: q.spacing.xs }}>
              <Text style={s.body}>{instrumentLabel(lang, row)}</Text><Text style={s.heading}>{formatQuantValue(row.latest?.value, row.unit, lang)} {unitLabel(row.unit, lang)}</Text><Text style={s.meta}>{availabilityLabel(lang, row.availability.state)}</Text>
            </QuestCard>
          </Pressable>)}
        </ScrollView>
        {!model.instruments.some(row => !hidden.includes(row.id)) ? <Text style={s.body}>{iv3(lang, 'watchlistEmpty')}</Text> : null}
        <View style={{ gap: q.spacing.xs }}><Text accessibilityRole="header" style={s.heading}>{instrumentLabel(lang, selected)}</Text>
          <Text selectable style={s.number}>{personal?.currentValue}<Text style={s.body}> {personal?.currentUnit}</Text></Text>
          <Text style={s.body}>{personal?.summary}</Text>
          <Text style={s.meta}>{selected.latest ? `${formatDateTime(lang, selected.latest.observed_at, true)} · ${sourceClassLabel(lang, selected.latest.source_class)}` : availabilityLabel(lang, selected.availability.state)}</Text>
        </View>
        <View style={s.wrap}><Text style={s.body}>{personal?.referenceLabel} · {personal?.referenceValue}</Text><Text style={s.meta}>{evidenceStageLabel(lang, selected.evidence.stage)} · {iv3(lang, 'observations', { count: selected.evidence.observation_count })}</Text></View>
        {series ? <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: q.spacing.sm }}>
            {contractQuickRanges(series).map(item => <InsightButton key={item.key} q={q} label={nativeRangeLabel(lang, { kind: 'contract', key: item.key }, series)} selected={range.kind === 'contract' && range.key === item.key} onPress={() => applyRange({ kind: 'contract', key: item.key })} />)}
            <InsightButton q={q} icon="calendar" label={ni(lang, 'custom')} selected={range.kind !== 'contract'} onPress={() => open('range')} />
          </ScrollView>
          <Text style={s.meta}>{nativeRangeLabel(lang, range, series)} · {ni(lang, 'rangeCount', { count: points.length })}</Text>
          <View style={s.wrap}>{kinds.map(item => <InsightButton key={item} q={q} icon={chartIcons[item]} label={iv3(lang, chartNames[item])} selected={kind === item} disabled={!renderable.includes(item)} onPress={() => { setKindOverride(item); setReady(false); }} />)}</View>
          {kinds.includes('candle') && !renderable.includes('candle') ? <Text style={s.meta}>{iv3(lang, 'chartCandleUnavailable')}</Text> : null}
          {chartModel && points.length > 0 && renderable.includes(kind) ? <QuestCard questTheme={q} style={{ padding: q.spacing.sm, borderRadius: q.radius.sm }}><NativeInsightsChart ref={ref} model={chartModel} q={q} onReadyChange={onReadyChange} /></QuestCard>
            : <View style={{ minHeight: q.spacing.xxl * 5, justifyContent: 'center', gap: q.spacing.sm }}><Text style={s.body}>{!points.length ? ni(lang, 'noRangePoints') : kind === 'candle' ? ni(lang, 'noRangeCandle') : ni(lang, 'noSeries')}</Text></View>}
          {points.length === 1 ? <Text style={s.meta}>{iv3(lang, 'sparsePointOnly')}</Text> : null}
          {chartModel ? <View style={{ gap: q.spacing.xs }}><View style={s.row}><View style={{ width: q.spacing.sm, height: q.spacing.sm, backgroundColor: chartModel.colors.line }} /><Text style={[s.meta, s.grow]}>{instrumentLabel(lang, selected)} · {unitLabel(selected.unit, lang)}</Text></View>{chartModel.layers.map(layer => <View key={layer.id} style={s.row}><View style={{ width: q.spacing.sm, height: q.spacing.sm, backgroundColor: layer.color }} /><Text style={[s.meta, s.grow]}>{layer.label} · {unitLabel(layer.unit, lang)}</Text></View>)}</View> : null}
          <View style={s.wrap}>
            <InsightButton q={q} icon="zoom-in" label={iv3(lang, 'zoomIn')} disabled={!ready || !renderable.includes(kind) || !points.length} onPress={() => ref.current?.zoomIn()} />
            <InsightButton q={q} icon="zoom-out" label={iv3(lang, 'zoomOut')} disabled={!ready || !renderable.includes(kind) || !points.length} onPress={() => ref.current?.zoomOut()} />
            <InsightButton q={q} icon="reset" label={ni(lang, 'fit')} disabled={!ready || !renderable.includes(kind) || !points.length} onPress={() => ref.current?.fit()} />
          </View>
        </> : <Text style={s.body}>{ni(lang, 'noSeries')}</Text>}
        {tools}
        <InsightSection q={q} title={iv3(lang, 'analysisTools')}>
          <View style={s.wrap}>{details.map(item => <InsightButton key={item.kind} q={q} icon={item.icon} label={iv3(lang, item.copy)} onPress={() => open(item.kind)} />)}</View>
          <View style={s.wrap}><InsightButton q={q} icon="evidence" label={iv3(lang, 'evidenceDetail')} onPress={() => open('evidence')} /><InsightButton q={q} icon="event" label={ni(lang, 'events')} onPress={() => open('events')} /></View>
          <Text style={s.meta}>{iv3(lang, 'asOf', { date: formatDateTime(lang, model.asOf, true) })}</Text>
        </InsightSection>
      </> : null}
      <InsightButton q={q} icon="research" label={ni(lang, 'sampleOpen')} onPress={() => open('samples')} />
    </ScrollView>

    {tool ? <InsightSheet q={q} title={toolTitle} closeLabel={iv3(lang, 'close')} onClose={() => setTool(null)}>
      {tool === 'samples' ? <><Text style={s.body}>{ni(lang, 'sampleBody')}</Text>{(['sparse-1', 'mature', 'drivers', 'similar', 'recovery', 'scenario'] as const).map(id => <InsightButton key={id} q={q} icon="open" busy={state.busy} label={id === 'sparse-1' ? ni(lang, 'single') : id === 'mature' ? ni(lang, 'mature') : iv3(lang, id)} onPress={() => { setTool(null); onSample(id); }} />)}</>
        : tool === 'watchlist' && model ? <>{ordered.map(row => <View key={row.id} style={s.divider}><InsightToggle q={q} label={instrumentLabel(lang, row)} value={!hidden.includes(row.id)} onChange={enabled => { setHidden(current => enabled ? current.filter(id => id !== row.id) : [...current, row.id]); if (!enabled) setPinnedIds(current => current.filter(id => id !== row.id)); }} />
          <View style={s.wrap}>
            <InsightButton q={q} icon="open" compact label={`${iv3(lang, 'operationSelectInstrument')} · ${instrumentLabel(lang, row)}`} onPress={() => selectInstrument(row.id)} />
            <InsightButton q={q} icon="pin" compact label={`${iv3(lang, pinnedIds.includes(row.id) ? 'unpinInstrument' : 'pinInstrument')} · ${instrumentLabel(lang, row)}`} selected={pinnedIds.includes(row.id)} disabled={hidden.includes(row.id) || (!pinnedIds.includes(row.id) && pinnedIds.length >= 5)} onPress={() => setPinnedIds(current => toggleInsightsV3PinnedItem(current, row.id))} />
            <InsightButton q={q} icon="open" iconDirection="up" compact label={`${iv3(lang, 'moveInstrumentUp')} · ${instrumentLabel(lang, row)}`} disabled={order.indexOf(row.id) <= 0} onPress={() => setWatchOrder(moveInsightsV3WatchlistItem(order, row.id, -1))} />
            <InsightButton q={q} icon="open" iconDirection="down" compact label={`${iv3(lang, 'moveInstrumentDown')} · ${instrumentLabel(lang, row)}`} disabled={order.indexOf(row.id) >= order.length - 1} onPress={() => setWatchOrder(moveInsightsV3WatchlistItem(order, row.id, 1))} />
          </View></View>)}</>
          : tool === 'range' && series && model ? <InsightsRangeEditor q={q} lang={lang} series={series} asOf={model.asOf} range={range} onApply={applyRange} />
            : tool === 'compare' && selected && model ? <><Text style={s.body}>{ni(lang, 'comparisonLimit')}</Text><Text style={s.meta}>{ni(lang, 'comparisonScope')}</Text>{model.instruments.filter(row => row.id !== selected.id).map(row => {
              const blocked = comparisonBlock(selected, row); const active = compareIds.includes(row.id); const compared = comparisons.find(item => item.instrumentId === row.id);
              return <View key={row.id} style={s.divider}><InsightToggle q={q} label={`${instrumentLabel(lang, row)} · ${unitLabel(row.unit, lang)}`} value={active} disabled={!!blocked || (!active && compareIds.length >= 3)} onChange={enabled => setCompareIds(current => enabled ? [...current, row.id] : current.filter(id => id !== row.id))} />
                {blocked ? <Text style={s.meta}>{ni(lang, blocked)}</Text> : null}{compared && !compared.series.points.length ? <Text style={s.meta}>{ni(lang, 'noComparisonPoints')}</Text> : null}
                {compared?.overlapCount != null ? <Text style={s.meta}>{iv3(lang, 'overlapWindows', { count: compared.overlapCount })} · {compared.matchingWindowKey}</Text> : null}
              </View>;
            })}{model.instruments.length < 2 ? <Text style={s.body}>{ni(lang, 'noComparisonPoints')}</Text> : null}</>
              : tool === 'indicators' && series ? <>
                <InsightToggle q={q} label={iv3(lang, 'baselineIndicator')} value={showReference && series.reference.value != null} disabled={series.reference.value == null || series.reference.unit !== series.unit} onChange={setShowReference} />
                <InsightToggle q={q} label={iv3(lang, 'rangeIndicator')} value={showBand} disabled={(series.reference.low == null && !series.range_points.length) || series.reference.unit !== series.unit} onChange={setShowBand} />
                <Text style={s.meta}>{iv3(lang, 'baselineNotTarget')}</Text>
                {!indicatorLayers.length ? <Text style={s.body}>{ni(lang, 'hiddenUnavailable')}</Text> : null}
                {indicatorLayers.map(row => <View key={row.indicator_id} style={s.divider}><InsightToggle q={q} label={iv3(lang, row.layer_kind === 'EWMA_SHORT' ? 'shortEwmaIndicator' : 'longEwmaIndicator')} value={indicatorIds.includes(row.indicator_id)} onChange={enabled => setIndicatorIds(current => enabled ? [...current, row.indicator_id] : current.filter(id => id !== row.indicator_id))} /><Text style={s.meta}>{ni(lang, 'method')} · {row.method} · {row.parameter_key}</Text></View>)}
                <Text style={s.meta}>{iv3(lang, 'ewmaNotForecast')}</Text><InsightToggle q={q} label={iv3(lang, 'eventsIndicator')} value={showEvents} disabled={!series.events.length} onChange={setShowEvents} />
              </>
                : tool === 'analyst' ? <>{selected ? <Text style={s.heading}>{instrumentLabel(lang, selected)}</Text> : null}<View style={s.wrap}><InsightButton q={q} icon="watchlist" label={iv3(lang, 'operationSelectInstrument')} onPress={() => open('watchlist')} /><InsightButton q={q} icon="calendar" label={iv3(lang, 'operationChangeRange')} onPress={() => open('range')} /><InsightButton q={q} icon="compare" label={iv3(lang, 'operationAddCompare')} onPress={() => open('compare')} /></View>{details.map(item => <InsightButton key={item.kind} q={q} icon={item.icon} label={iv3(lang, item.copy)} onPress={() => open(item.kind)} />)}</>
                  : bundle && raw && ['history', 'evidence', 'events', 'drivers', 'similar', 'recovery', 'scenario', 'jointAnalysis'].includes(tool) ? <InsightsDetails key={`${selected?.id}:${tool}`} kind={tool as InsightsDetailKind} q={q} lang={lang} bundle={bundle} analysis={validAnalysis} instrument={raw} series={series} points={points} range={range} onJump={applyRange} onSelect={selectInstrument} />
                    : <Text style={s.body}>{ni(lang, 'noSeries')}</Text>}
    </InsightSheet> : null}
  </SafeAreaView>;
}
