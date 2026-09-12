import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View, type ViewStyle } from 'react-native';
import type * as Existing from './V11SheetControls';
import type { V11ThemeTokens } from '../tokens';
type Props<K extends keyof typeof Existing> = React.ComponentProps<(typeof Existing)[K]>;
type Option<T> = { value: T; label: string };
export type V11DiscreteOption<T extends number = number> = Option<T>;
const row: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' };
const hit: ViewStyle = { minHeight: 44, minWidth: 44, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center' };
function Choice({ label, selected, disabled, onPress, theme }: { label: string; selected?: boolean; disabled?: boolean; onPress: () => void; theme: V11ThemeTokens }) {
  return <Pressable accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked: !!selected, disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [hit, { flexShrink: 1, backgroundColor: selected ? theme.control.neutralSelectedSurface : pressed ? theme.control.neutralPressedSurface : theme.control.neutralSurface, borderWidth: selected ? 1 : 0, borderColor: theme.control.neutralSelectedBorder, opacity: disabled ? 0.5 : 1 }]}><Text style={{ fontSize: 13, color: selected ? theme.control.neutralSelectedText : theme.control.primaryText }}>{label}</Text></Pressable>;
}
export function V11DiscreteNumericRail<T extends number>(p: { disabled?: boolean; label?: string; onChange: (v: T) => void; options: Option<T>[]; theme: V11ThemeTokens; value: T }) {
  return <View style={{ gap: 8, marginVertical: 8 }}>{p.label ? <Text style={{ color: p.theme.text.primary, fontSize: 14 }}>{p.label} · {p.options.find(o => o.value === p.value)?.label}</Text> : null}<View style={row}>{p.options.map(o => <Choice key={o.value} {...p} label={`${o.value} ${o.label}`} selected={p.value === o.value} onPress={() => p.onChange(o.value)} />)}</View></View>;
}
export function V11CategoricalChip(p: Props<'V11CategoricalChip'>) { return <Choice {...p} />; }
export function V11CompactValueSelector<T extends string | number | null>(p: { columns?: number; disabled?: boolean; onChange: (v: T) => void; options: Option<T>[]; theme: V11ThemeTokens; value: T | undefined }) {
  return <View style={row}>{p.options.map((o, i) => <Choice key={i} {...p} label={o.label} selected={Object.is(p.value, o.value)} onPress={() => p.onChange(o.value)} />)}</View>;
}
export function V11SegmentedSelector<T extends string>(p: { disabled?: boolean; onChange: (v:T) => void; options: Option<T>[]; theme: V11ThemeTokens; value: T }) { return <V11CompactValueSelector {...p} />; }
export function V11CheckboxControl(p: Props<'V11CheckboxControl'>) {
  return <Pressable accessibilityRole="checkbox" accessibilityLabel={p.accessibilityLabel} accessibilityState={{ checked: p.checked, disabled: p.disabled }} disabled={p.disabled} onPress={p.onPress} style={[hit, { backgroundColor: p.checked ? p.theme.control.neutralSelectedSurface : p.theme.control.neutralSurface }]}><Text style={{ color: p.theme.text.primary }}>{p.checked ? '\u2713' : '\u25a1'}</Text></Pressable>;
}
export function V11StatusChip(p: Props<'V11StatusChip'>) { return <Text style={{ color: p.theme.text.secondary, fontSize: 12, paddingVertical: 8 }}>{p.label}</Text>; }
export function V11TextField({ disabled, status, style, theme, tone, visualState, onFocus, onBlur, ...p }: Props<'V11TextField'>) {
  const [focus, setFocus] = useState(false);
  return <TextInput {...p} accessibilityLabel={p.accessibilityLabel ?? p.placeholder} editable={!disabled} onFocus={e => { setFocus(true); onFocus?.(e); }} onBlur={e => { setFocus(false); onBlur?.(e); }} placeholderTextColor={theme.control.placeholder} style={[{ minHeight: 48, padding: 12, fontSize: 15, color: theme.text.primary, backgroundColor: theme.control.neutralSurface, borderRadius: 8, borderWidth: 1, borderColor: status === 'error' ? theme.control.error : focus ? theme.control.focus : theme.control.neutralBorder, textAlignVertical: p.multiline ? 'top' : 'center' }, style]} />;
}
export function V11SheetButton(p: Props<'V11SheetButton'>) {
  const disabled = p.disabled || p.loading;
  const bg = p.variant === 'primary' ? p.theme.control.neutralAction : p.theme.control.neutralSurface;
  const fg = p.variant === 'primary' ? p.theme.control.neutralActionText : p.theme.text.primary;
  return <Pressable accessibilityLabel={p.accessibilityLabel ?? p.label} accessibilityRole="button" accessibilityState={{ disabled, busy: p.loading }} onPress={p.onPress} disabled={disabled} style={({ pressed }) => [hit, { flexDirection: 'row', gap: 8, backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.75 : 1 }, p.style]}>{p.loading ? <ActivityIndicator color={fg} /> : null}<Text style={{ color: fg, fontSize: 15, flexShrink: 1 }}>{p.label}</Text></Pressable>;
}
export function V11ComposerAction(p: Props<'V11ComposerAction'>) { return <Pressable accessibilityRole="button" accessibilityLabel={p.label} accessibilityState={{ disabled: p.disabled || p.loading, busy: p.loading }} disabled={p.disabled || p.loading} onPress={p.onPress} style={[hit, { width: 48, backgroundColor: p.theme.control.neutralSurface }]}>{p.loading ? <ActivityIndicator color={p.theme.text.primary} /> : p.children}</Pressable>; }
export function V11InlineButton(p: Props<'V11InlineButton'>) { return <Pressable accessibilityRole="button" accessibilityLabel={p.label} onPress={p.onPress} style={hit}><Text style={{ color: p.tone === 'danger' ? p.theme.control.error : p.theme.text.primary }}>{p.label}</Text></Pressable>; }
export function V11SelectionRow(p: Props<'V11SelectionRow'>) { return <Pressable accessibilityRole="radio" accessibilityState={{ checked: p.selected }} onPress={p.onPress} style={[hit, { alignItems: 'stretch', backgroundColor: p.selected ? p.theme.control.neutralSelectedSurface : p.theme.control.neutralSurface }]}>{p.children}</Pressable>; }
export function V11StickySheetFooter(p: Props<'V11StickySheetFooter'>) { return <View style={{ gap: 8 }}>{p.message ? <Text accessibilityLiveRegion="polite" style={{ color: p.messageStatus === 'error' ? p.theme.control.error : p.theme.text.secondary }}>{p.message}</Text> : null}<View style={[row, { flexWrap: 'nowrap' }]}><V11SheetButton label={p.cancelLabel} onPress={p.onCancel} theme={p.theme} variant="secondary" style={{ flex: 1 }} /><V11SheetButton label={p.saveLabel} onPress={p.onSave} disabled={p.disabled} loading={p.saving} theme={p.theme} variant="primary" style={{ flex: 1 }} /></View></View>; }
