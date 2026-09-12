import React from 'react';
import { ActivityIndicator, Pressable, Text, View, StyleSheet } from 'react-native';
import type Existing from './V11IntegratedTodaySurface';
export type { V11IntegratedPlanRow, V11IntegratedLatestRecord, V11IntegratedUtilityAction } from './V11IntegratedTodaySurface';
import { getV11ThemeTokens } from '../v11/tokens';
import { V11Pill } from '../v11/components/V11Material';
import V11RebaselineIcon from './V11RebaselineIcon';

type Props = React.ComponentProps<typeof Existing>;
export default function V11IntegratedTodaySurface(p: Props) {
  const theme = getV11ThemeTokens(p.themeMode);
  const labels = p.labels;
  const text = { color: theme.text.primary };
  const muted = { color: theme.text.secondary };
  const reading = p.decision.reading.kind === 'state' ? p.decision.reading.value : null;
  const button = (label: string, onPress: () => void, selected = false) => <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={({ pressed }) => [s.hit, { backgroundColor: selected ? theme.control.neutralSelectedSurface : pressed ? theme.control.neutralPressedSurface : 'transparent' }]}><Text style={[s.body, text]}>{label}</Text></Pressable>;
  return <View style={s.content}>
    <View style={s.row}><View style={s.grow}><Text style={[s.context, text]}>{p.contextDate}</Text><Text style={[s.meta, muted]}>{p.contextMeta}</Text></View><Text style={[s.meta, muted]}>{labels.evidenceStage} · {p.decision.evidenceStage}</Text></View>
    <View style={{ gap: 8 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={p.capturePlaceholder} onPress={p.onCapture} style={({ pressed }) => [s.capture, { backgroundColor: pressed ? theme.control.neutralPressedSurface : theme.control.neutralSurface }]}>
        <V11RebaselineIcon name="capture" size={18} color={theme.text.secondary} />
        <View style={s.grow}><Text style={[s.body, text]}>{labels.capture}</Text><Text numberOfLines={2} style={[s.meta, muted]}>{p.capturePlaceholder}</Text></View>
        <V11RebaselineIcon name="arrow" size={16} color={theme.text.secondary} />
      </Pressable>
      <View style={s.row}><Pressable accessibilityRole="button" accessibilityLabel={p.latestRecord?.accessibilityLabel ?? labels.noLatestRecord} disabled={!p.latestRecord?.onPress} onPress={p.latestRecord?.onPress} style={[s.grow, s.hit, { alignItems: 'flex-start' }]}><Text style={[s.meta, muted]}>{labels.latestRecord}</Text><Text numberOfLines={2} style={[s.body, text]}>{p.latestRecord?.title ?? labels.noLatestRecord}</Text>{p.latestRecord?.metadata ? <Text style={[s.meta, muted]}>{p.latestRecord.metadata}</Text> : null}</Pressable>{p.latestRecord?.onDelete ? button(labels.deleteRecord, p.latestRecord.onDelete) : null}</View>
    </View>
    <View style={{ gap: 20, paddingVertical: 8 }}>
      <Text style={[s.judgement, text]}>{p.formatCopy(p.decision.judgement)}</Text>
      <V11Pill theme={theme} height={80} stage={p.decision.evidenceStage} reducedMotion={p.reducedMotion} onPress={p.onPrimaryAction} accessibilityLabel={p.formatCopy(p.decision.actionLabel)} contentStyle={{ paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={s.grow}><Text style={[s.body, text]}>{p.formatCopy(p.decision.actionLabel)}</Text><Text style={[s.meta, muted]}>{p.formatCopy(p.decision.actionReason)}</Text></View><V11RebaselineIcon name="arrow" size={20} color={theme.text.primary} />
      </V11Pill>
      <View style={[s.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}>{button(labels.directLog, p.onDirectLog)}{p.decisionAction ? button(p.decisionAction.label, p.decisionAction.onPress) : null}</View>
    </View>
    <View style={[s.row, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.control.neutralBorder, paddingTop: 12 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={p.expanded ? labels.collapseDetails : labels.expandDetails} accessibilityState={{ expanded: p.expanded }} onPress={p.onToggleExpanded} style={[s.grow, { minHeight: 44 }]}><Text style={[s.meta, muted]}>{labels.currentState}</Text><Text style={[s.context, text]}>{reading == null ? p.stateLabel : `${reading} / 5 · ${p.stateLabel}`}</Text></Pressable>
      {button(labels.updateState, p.onOpenState)}
    </View>
    {!p.expanded && p.planRows.length ? <Pressable onPress={p.onToggleExpanded} accessibilityRole="button" accessibilityLabel={labels.expandDetails} style={s.hit}><Text style={[s.body, muted]}>{labels.planPreview} · {p.planRows.slice(0,3).map(r => r.title).join(' / ')}</Text></Pressable> : null}
    {p.expanded ? <View style={{ gap: 16 }}>
      <View>{button(labels.instantRead + (p.instantRead.feedbackStatus === 'saved' ? ` · ${labels.feedbackSaved}` : ''), p.instantRead.onToggle)}
        {p.instantRead.expanded ? <View style={{ gap: 10 }}>
          {p.instantRead.status === 'loading' ? <ActivityIndicator color={theme.text.primary} /> : <Text style={[s.body, text]}>{p.instantRead.headline ?? labels.instantReadUnavailable}</Text>}
          {p.instantRead.firstStep ? <Text style={[s.body, muted]}>{p.instantRead.firstStep}</Text> : null}
          {p.instantRead.headline ? <View style={s.row}>{(['useful','not_useful'] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: p.instantRead.feedback === value, disabled: p.instantRead.feedbackStatus === 'saving' }} disabled={p.instantRead.feedbackStatus === 'saving'} onPress={() => p.instantRead.onFeedback(value)} style={[s.hit, { backgroundColor: p.instantRead.feedback === value ? theme.control.neutralSelectedSurface : theme.control.neutralSurface }]}><Text style={text}>{value === 'useful' ? labels.useful : labels.notUseful}</Text></Pressable>)}</View> : null}
        </View> : null}
      </View>
      {p.planRows.length ? <View style={{ gap: 8 }}><Text style={[s.body, text]}>{labels.plan}</Text>{p.planRows.slice(0,3).map(r => <View key={r.id} style={s.row}><View style={s.grow}><Text style={[s.body, text]}>{r.title}</Text><Text style={[s.meta, muted]}>{[r.time,r.metadata].filter(Boolean).join(' · ')}</Text></View>{r.onStart ? button(labels.start,r.onStart) : null}{r.onDone ? button(labels.done,r.onDone) : null}</View>)}</View> : null}
      {button(labels.decisionEvidence, p.onDecisionDetails)}
      {p.utilityActions.map(a => <View key={a.id}>{button(a.label,a.onPress)}{a.metadata ? <Text style={[s.meta, muted]}>{a.metadata}</Text> : null}</View>)}
    </View> : null}
  </View>;
}
const s = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20, gap: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  grow: { flex: 1, minWidth: 0 },
  context: { fontSize: 20, lineHeight: 27 },
  meta: { fontSize: 12, lineHeight: 18 },
  body: { fontSize: 15, lineHeight: 21 },
  judgement: { fontSize: 25, lineHeight: 33, fontWeight: '400' },
  hit: { minWidth: 44, minHeight: 44, justifyContent: 'center', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, flexShrink: 1 },
  capture: { minHeight: 68, borderRadius: 20, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center' },
});
