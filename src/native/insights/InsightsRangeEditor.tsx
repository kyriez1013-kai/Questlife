import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import type { Lang } from '../../i18n';
import type { QuestTheme } from '../../design/tokens';
import type { QuantProductSeriesV1 } from '../../quant-product/quantProductContract';
import { iv3 } from '../../insights-v3/insightsV3I18n';
import { selectSeriesPoints, type InsightsV3RangeSelection } from '../../insights-v3/insightsV3Presentation';
import { InsightButton, insightsStyles } from './InsightsControls';
import NativeDateField from './NativeDateField';
import { customSelection, localDateKey } from './nativeInsightsPresentation';
import { ni } from './nativeInsightsStrings';

export function InsightsRangeEditor({ q, lang, series, asOf, range, onApply }: { q: QuestTheme; lang: Lang; series: QuantProductSeriesV1; asOf: string; range: InsightsV3RangeSelection; onApply: (range: InsightsV3RangeSelection) => void }) {
  const [mode, setMode] = useState<'days' | 'observations' | 'calendar'>(range.kind === 'last_n_observations' ? 'observations' : range.kind === 'calendar' ? 'calendar' : 'days');
  const [amount, setAmount] = useState(String(range.kind === 'last_n_days' ? range.days : range.kind === 'last_n_observations' ? range.count : 30));
  const [start, setStart] = useState(range.kind === 'calendar' ? range.start : localDateKey(series.points[0]?.observed_at ?? asOf));
  const [end, setEnd] = useState(range.kind === 'calendar' ? range.end : localDateKey(asOf));
  const next = customSelection(mode, amount, start, end); const s = insightsStyles(q);
  return <>
    <View style={s.wrap}>{(['days', 'observations', 'calendar'] as const).map(item => <InsightButton key={item} q={q} label={iv3(lang, item === 'days' ? 'customDays' : item === 'observations' ? 'customObservations' : 'customCalendar')} selected={item === mode} onPress={() => setMode(item)} />)}</View>
    {mode === 'calendar' ? <><NativeDateField q={q} lang={lang} label={iv3(lang, 'from')} value={start} onChange={setStart} /><NativeDateField q={q} lang={lang} label={iv3(lang, 'to')} value={end} onChange={setEnd} /></>
      : <><Text style={s.body}>{iv3(lang, 'rangeAmount')}</Text><View style={s.row}><InsightButton compact q={q} label={iv3(lang, 'decreaseValue')} icon="remove" disabled={!next || Number(amount) <= 1} onPress={() => setAmount(String(Number(amount) - 1))} /><TextInput accessibilityLabel={iv3(lang, 'rangeAmount')} keyboardType="number-pad" value={amount} onChangeText={setAmount} style={[s.input, s.grow]} /><InsightButton compact q={q} label={iv3(lang, 'increaseValue')} icon="add" disabled={!next || Number(amount) >= Number.MAX_SAFE_INTEGER} onPress={() => setAmount(String(Number(amount) + 1))} /></View></>}
    <Text accessibilityLiveRegion="polite" style={s.body}>{next ? ni(lang, 'rangeCount', { count: selectSeriesPoints(series, next, asOf).length }) : ni(lang, mode === 'calendar' ? 'invalidDates' : 'invalidCount')}</Text>
    <InsightButton q={q} label={iv3(lang, 'apply')} icon="check" disabled={!next} onPress={() => { if (next) onApply(next); }} />
  </>;
}
