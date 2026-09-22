import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { Lang } from '../../i18n';
import { questLayout, type QuestTheme } from '../../design/tokens';
import { InsightButton, InsightSheet, insightsStyles } from './InsightsControls';
import { filterInsightsCatalog, insightsSourceCatalog, type InsightsEntrances } from './nativeInsightsCatalog';
import { ni } from './nativeInsightsStrings';

export type InsightsSourceWorkspaceProps = InsightsEntrances & {
  q: QuestTheme; lang: Lang; browse: boolean; renderImport: () => React.ReactNode;
};

export default function InsightsSourceWorkspace({ q, lang, browse, renderImport, onOpenSources, onCreateRecord }: InsightsSourceWorkspaceProps) {
  const s = insightsStyles(q);
  const catalog = useMemo(() => insightsSourceCatalog(lang), [lang]);
  const [selectedId, setSelectedId] = useState(catalog[0].id);
  const [sheet, setSheet] = useState<'catalog' | 'import' | null>(null);
  const [query, setQuery] = useState('');
  const selected = catalog.find(row => row.id === selectedId) ?? catalog[0];
  const sourceLabel = (source: typeof selected.source) => ni(lang, source === 'health' ? 'healthSource' : source === 'state' ? 'stateSource' : 'activitySource');
  const sourceAction = () => selected.source === 'health' ? onOpenSources() : onCreateRecord(selected.source);
  return <View style={{ gap: q.spacing.md }}>
    {browse ? <>
      <View style={s.row}><Text accessibilityRole="header" style={[s.heading, s.grow]}>{ni(lang, 'variables')}</Text><InsightButton q={q} icon="watchlist" label={ni(lang, 'allVariables')} onPress={() => { setQuery(''); setSheet('catalog'); }} /></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: q.spacing.sm }}>
        {catalog.map(row => <InsightButton key={row.id} q={q} label={row.label} selected={row.id === selectedId} onPress={() => setSelectedId(row.id)} />)}
      </ScrollView>
      <View style={[s.divider, { gap: q.spacing.sm }]}>
        <View style={s.row}><Text accessibilityRole="header" style={[s.heading, s.grow]}>{selected.label}</Text><Text style={s.meta}>{ni(lang, 'unit')} · {selected.unit}</Text></View>
        <Text style={s.body}>{sourceLabel(selected.source)}</Text>
        <Text style={s.meta}>{ni(lang, 'catalogPending')}</Text>
        <InsightButton q={q} icon={selected.source === 'health' ? 'signal' : 'add'} label={ni(lang, selected.source === 'health' ? 'connectSource' : selected.source === 'state' ? 'recordState' : 'recordActivity')} onPress={sourceAction} />
      </View>
    </> : null}
    <Text accessibilityRole="header" style={s.heading}>{ni(lang, 'yourSources')}</Text>
    <View style={s.wrap}>
      <InsightButton q={q} icon="signal" label={ni(lang, 'manageSources')} onPress={onOpenSources} />
      <InsightButton q={q} icon="evidence" label={ni(lang, 'importHistory')} onPress={() => setSheet('import')} />
      <InsightButton q={q} icon="add" label={ni(lang, 'recordActivity')} onPress={() => onCreateRecord('activity')} />
      <InsightButton q={q} icon="add" label={ni(lang, 'recordState')} onPress={() => onCreateRecord('state')} />
    </View>
    {sheet ? <InsightSheet q={q} title={ni(lang, sheet === 'catalog' ? 'allVariables' : 'importHistory')} closeLabel={ni(lang, 'close')} onClose={() => setSheet(null)}>
      {sheet === 'import' ? <><Text style={s.body}>{ni(lang, 'importScope')}</Text><InsightButton q={q} icon="open" label={ni(lang, 'accountSync')} onPress={() => { setSheet(null); onOpenSources(); }} />{renderImport()}</> : <>
        <TextInput accessibilityLabel={ni(lang, 'searchVariables')} placeholder={ni(lang, 'searchVariables')} placeholderTextColor={q.colors.textMuted} value={query} onChangeText={setQuery} style={s.input} autoCorrect={false} />
        {filterInsightsCatalog(catalog, query).map(row => <Pressable key={row.id} accessibilityRole="button" accessibilityLabel={`${row.label}, ${row.unit}, ${sourceLabel(row.source)}`} accessibilityState={{ selected: selectedId === row.id }} onPress={() => { setSelectedId(row.id); setSheet(null); }} style={[s.divider, { minHeight: questLayout.controlMinHeight }]}>
          <View style={s.row}><Text style={[s.body, s.grow]}>{row.label}</Text><Text style={s.meta}>{row.unit}</Text></View><Text style={s.meta}>{sourceLabel(row.source)}</Text>
        </Pressable>)}
        {!filterInsightsCatalog(catalog, query).length ? <Text style={s.body}>{ni(lang, 'noVariableMatches')}</Text> : null}
      </>}
    </InsightSheet> : null}
  </View>;
}
