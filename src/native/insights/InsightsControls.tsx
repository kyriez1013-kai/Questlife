import React from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View, type TextStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { questLayout, type QuestTheme } from '../../design/tokens';
import PersonalTerminalIcon, { type PersonalTerminalIconName } from '../../v11-insights/personal-terminal/PersonalTerminalIcon';
import { AsyncInteractionContext, AsyncInteractionGuard } from '../../components/AsyncInteractionBoundary';

export function insightsStyles(q: QuestTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: q.colors.background },
    content: { width: '100%', maxWidth: questLayout.contentMaxWidth, alignSelf: 'center', padding: q.spacing.md, paddingBottom: questLayout.contentBottomInset, gap: q.spacing.md },
    row: { flexDirection: 'row', alignItems: 'center', gap: q.spacing.sm },
    wrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: q.spacing.sm },
    grow: { flex: 1, minWidth: 0 },
    section: { gap: q.spacing.md, paddingVertical: q.spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: q.colors.divider },
    title: { color: q.colors.textPrimary, fontSize: q.typography.screenTitleSize, lineHeight: q.typography.screenTitleLineHeight, fontWeight: q.typography.weightMedium },
    heading: { color: q.colors.textPrimary, fontSize: q.typography.sectionTitleSize, lineHeight: q.typography.sectionTitleLineHeight, fontWeight: q.typography.weightMedium },
    body: { color: q.colors.textSecondary, fontSize: q.typography.bodySize, lineHeight: q.typography.bodyLineHeight },
    meta: { color: q.colors.textMuted, fontSize: q.typography.helperSize, lineHeight: q.typography.helperLineHeight },
    number: { color: q.colors.textPrimary, fontSize: q.typography.displaySize, lineHeight: q.typography.displayLineHeight, fontWeight: q.typography.weightMedium, fontVariant: ['tabular-nums'] },
    input: { minHeight: questLayout.controlMinHeight, borderRadius: q.radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: q.colors.inputBorder, backgroundColor: q.colors.inputBg, padding: q.spacing.sm, color: q.colors.textPrimary, fontSize: q.typography.bodySize },
    divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: q.colors.divider, paddingVertical: q.spacing.sm, gap: q.spacing.xs },
  });
}

export function InsightButton({ q, label, icon, onPress, selected, disabled, busy, compact = false, testID, iconDirection }: {
  q: QuestTheme; label: string; icon?: PersonalTerminalIconName; onPress: () => void; selected?: boolean; disabled?: boolean; busy?: boolean; compact?: boolean; testID?: string; iconDirection?: 'up' | 'down';
}) {
  const [hint, setHint] = React.useState(false);
  const guard = React.useContext(AsyncInteractionGuard);
  const color = disabled ? q.colors.disabledText : q.colors.textPrimary;
  return <View style={{ minWidth: 0, maxWidth: '100%' }}>
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: !!selected, disabled: !!disabled || !!busy, busy: !!busy }}
      disabled={disabled || busy} onPress={() => guard(onPress)} onHoverIn={() => setHint(true)} onHoverOut={() => setHint(false)} onFocus={() => setHint(true)} onBlur={() => setHint(false)}
      style={({ pressed }) => ({ minHeight: questLayout.controlMinHeight, minWidth: questLayout.controlMinHeight, maxWidth: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: q.spacing.sm, paddingHorizontal: compact ? q.spacing.sm : q.spacing.md, paddingVertical: q.spacing.sm, borderRadius: q.radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: selected ? q.colors.primary : q.colors.cardBorder, backgroundColor: selected ? q.colors.chipSelectedBg : pressed ? q.colors.cardSurfaceHover : q.colors.surface })}>
      {busy ? <ActivityIndicator color={color} /> : icon ? <View style={iconDirection ? { transform: [{ rotate: iconDirection === 'up' ? '270deg' : '90deg' }] } : undefined}><PersonalTerminalIcon name={icon} color={color} size={q.typography.screenTitleSize} /></View> : null}
      {!compact ? <Text style={{ color, flexShrink: 1, fontSize: q.typography.bodySize, lineHeight: q.typography.bodyLineHeight }}>{label}</Text> : null}
    </Pressable>
    {compact && hint ? <View pointerEvents="none" style={{ position: 'absolute', top: '100%', right: 0, zIndex: 10, backgroundColor: q.colors.surfaceElevated, padding: q.spacing.sm, borderRadius: q.radius.sm }}><Text style={{ color: q.colors.textPrimary, fontSize: q.typography.helperSize }}>{label}</Text></View> : null}
  </View>;
}

export function InsightToggle({ q, label, value, onChange, disabled = false }: { q: QuestTheme; label: string; value: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  const s = insightsStyles(q);
  return <View style={[s.row, { minHeight: questLayout.controlMinHeight }]}><Text style={[s.body, s.grow]}>{label}</Text><Switch accessibilityLabel={label} value={value} onValueChange={onChange} disabled={disabled} trackColor={{ false: q.colors.disabledBg, true: q.colors.primary }} /></View>;
}

export function InsightSection({ q, title, children }: { q: QuestTheme; title: string; children: React.ReactNode }) {
  const s = insightsStyles(q);
  return <View style={s.section}><Text accessibilityRole="header" style={s.heading}>{title}</Text>{children}</View>;
}

export function InsightStat({ q, label, value, valueStyle }: { q: QuestTheme; label: string; value: string; valueStyle?: TextStyle }) {
  const s = insightsStyles(q);
  return <View style={s.divider}><Text style={s.meta}>{label}</Text><Text selectable style={[s.body, { color: q.colors.textPrimary }, valueStyle]}>{value}</Text></View>;
}

export function InsightSheet({ q, title, closeLabel, onClose, children }: { q: QuestTheme; title: string; closeLabel: string; onClose: () => void; children: React.ReactNode }) {
  const s = insightsStyles(q);
  const pending = React.useRef(new Set<object>());
  const [busy, setBusy] = React.useState(false);
  const report = React.useCallback((key: object, active: boolean) => {
    if (active) pending.current.add(key); else pending.current.delete(key);
    setBusy(pending.current.size > 0);
  }, []);
  const guard = React.useCallback((action: () => void) => { if (!pending.current.size) action(); }, []);
  return <AsyncInteractionContext.Provider value={report}><AsyncInteractionGuard.Provider value={guard}>
    <Modal visible animationType="none" presentationStyle="pageSheet" onRequestClose={() => guard(onClose)}>
    <SafeAreaView style={s.screen}><View style={[s.row, { padding: q.spacing.xl, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: q.colors.divider }]}>
      <Text accessibilityRole="header" style={[s.title, s.grow]}>{title}</Text><InsightButton q={q} label={closeLabel} icon="close" compact disabled={busy} onPress={onClose} />
    </View><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>{children}</ScrollView></SafeAreaView>
  </Modal></AsyncInteractionGuard.Provider></AsyncInteractionContext.Provider>;
}
