import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions, type ViewStyle } from 'react-native';
import { getNativeFoundation, nativeControlColumns } from '../../design/nativeFoundation';
import type * as Existing from './V11SheetControls';
import type { V11ThemeTokens } from '../tokens';

type Props<K extends keyof typeof Existing> = React.ComponentProps<(typeof Existing)[K]>;
type Option<T> = { value: T; label: string };
export type V11DiscreteOption<T extends number = number> = Option<T>;

function useControls(theme: V11ThemeTokens, tone: 'default' | 'neutral' = 'default') {
  return useMemo(() => {
    const f = getNativeFoundation(theme.questTheme);
    const c = theme.control;
    const neutral = tone === 'neutral';
    return {
      f,
      surface: neutral ? c.neutralSurface : c.surface,
      pressed: neutral ? c.neutralPressedSurface : c.pressedSurface,
      selected: neutral ? c.neutralSelectedSurface : c.selectedSurface,
      border: neutral ? c.neutralBorder : c.borderSubtle,
      selectedBorder: neutral ? c.neutralSelectedBorder : c.borderSelected,
      selectedText: neutral ? c.neutralSelectedText : c.selectedText,
      action: neutral ? c.neutralAction : c.primaryAction,
      actionText: neutral ? c.neutralActionText : c.primaryActionText,
      hit: {
        minHeight: f.layout.touch, minWidth: f.layout.touch,
        paddingHorizontal: f.layout.gap, paddingVertical: f.spacing.sm,
        borderRadius: f.layout.radius, alignItems: 'center', justifyContent: 'center',
        borderWidth: StyleSheet.hairlineWidth, flexShrink: 1,
      } satisfies ViewStyle,
      row: { flexDirection: 'row', alignItems: 'stretch', gap: f.spacing.sm, flexWrap: 'wrap' } satisfies ViewStyle,
    };
  }, [theme, tone]);
}

function Choice({ label, selected, disabled, onPress, theme, tone, accessibilityRole = 'radio', visualState, density, style }: {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
  theme: V11ThemeTokens;
  tone?: 'default' | 'neutral';
  accessibilityRole?: 'radio' | 'checkbox' | 'button';
  visualState?: 'default' | 'pressed';
  density?: 'default' | 'compact';
  style?: ViewStyle;
}) {
  const c = useControls(theme, tone);
  return <Pressable
    accessibilityRole={accessibilityRole}
    accessibilityLabel={label}
    accessibilityState={accessibilityRole === 'button' ? { selected: !!selected, disabled: !!disabled } : { checked: !!selected, disabled: !!disabled }}
    disabled={disabled}
    onPress={onPress}
    style={({ pressed }) => [c.hit, {
      paddingHorizontal: density === 'compact' ? c.f.spacing.sm : c.f.layout.gap,
      backgroundColor: disabled ? theme.control.disabledSurface : selected ? c.selected : pressed || visualState === 'pressed' ? c.pressed : c.surface,
      borderColor: selected ? c.selectedBorder : c.border,
    }, style]}
  >
    <Text style={[c.f.type.secondary, { flexShrink: 1, textAlign: 'center', color: disabled ? theme.control.disabledText : selected ? c.selectedText : theme.control.primaryText, fontWeight: selected ? '600' : '400' }]}>{label}</Text>
  </Pressable>;
}

export function V11DiscreteNumericRail<T extends number>(p: { disabled?: boolean; label?: string; onChange: (v: T) => void; options: Option<T>[]; theme: V11ThemeTokens; value: T }) {
  const c = useControls(p.theme);
  return <View style={{ gap: c.f.spacing.sm, marginVertical: c.f.spacing.sm }}>
    {p.label ? <Text style={[c.f.type.body, { color: p.theme.text.primary }]}>{p.label}</Text> : null}
    <View accessibilityRole="radiogroup" accessibilityLabel={p.label} style={c.row}>
      {p.options.map(o => <Choice key={o.value} disabled={p.disabled} theme={p.theme} label={`${o.value} · ${o.label}`} selected={p.value === o.value} onPress={() => p.onChange(o.value)} />)}
    </View>
  </View>;
}

export function V11CategoricalChip(p: Props<'V11CategoricalChip'>) {
  return <Choice {...p} accessibilityRole={p.accessibilityRole ?? 'checkbox'} />;
}

export function V11CompactValueSelector<T extends string | number | null>(p: { columns?: number; disabled?: boolean; onChange: (v: T) => void; options: Option<T>[]; theme: V11ThemeTokens; value: T | undefined }) {
  const c = useControls(p.theme, 'neutral');
  const [width, setWidth] = useState(0);
  const { fontScale } = useWindowDimensions();
  const columns = nativeControlColumns(width, p.columns ?? p.options.length, p.options.length, fontScale, c.f.spacing.sm);
  const optionWidth = width > 0 ? (width - c.f.spacing.sm * (columns - 1)) / columns : undefined;
  return <View accessibilityRole="radiogroup" onLayout={event => setWidth(event.nativeEvent.layout.width)} style={c.row}>
    {p.options.map((o, i) => <Choice key={`${String(o.value)}:${i}`} theme={p.theme} disabled={p.disabled} tone="neutral" label={o.label} selected={Object.is(p.value, o.value)} onPress={() => p.onChange(o.value)} style={{ width: optionWidth, flexGrow: width ? 0 : 1 }} />)}
  </View>;
}

export function V11SegmentedSelector<T extends string>(p: { disabled?: boolean; onChange: (v: T) => void; options: Option<T>[]; theme: V11ThemeTokens; value: T }) {
  return <V11CompactValueSelector {...p} columns={p.options.length} />;
}

export function V11CheckboxControl(p: Props<'V11CheckboxControl'>) {
  const c = useControls(p.theme, p.tone);
  return <Pressable accessibilityRole="checkbox" accessibilityLabel={p.accessibilityLabel} accessibilityState={{ checked: p.checked, disabled: !!p.disabled }} disabled={p.disabled} onPress={p.onPress} style={({ pressed }) => [c.hit, {
    backgroundColor: p.disabled ? p.theme.control.disabledSurface : p.checked ? c.selected : pressed ? c.pressed : c.surface,
    borderColor: p.checked ? c.selectedBorder : c.border,
  }]}>
    <Text accessible={false} style={[c.f.type.body, { color: p.disabled ? p.theme.control.disabledText : p.checked ? c.selectedText : p.theme.text.secondary }]}>{p.checked ? '\u2713' : '\u25a1'}</Text>
  </Pressable>;
}

export function V11StatusChip(p: Props<'V11StatusChip'>) {
  const c = useControls(p.theme);
  return <View style={{ alignSelf: 'flex-start', borderRadius: c.f.layout.radius, paddingHorizontal: c.f.spacing.sm, paddingVertical: c.f.spacing.xs, backgroundColor: c.surface }}>
    <Text style={[c.f.type.metadata, { color: p.theme.text.secondary }]}>{p.label}</Text>
  </View>;
}

export function V11TextField({ disabled, status, style, theme, tone, visualState, onFocus, onBlur, editable, ...p }: Props<'V11TextField'>) {
  const c = useControls(theme, tone);
  const [focus, setFocus] = useState(false);
  const inactive = !!disabled || editable === false;
  return <TextInput
    {...p}
    accessibilityLabel={p.accessibilityLabel ?? p.placeholder}
    accessibilityState={{ ...p.accessibilityState, disabled: inactive }}
    editable={!inactive}
    onFocus={e => { setFocus(true); onFocus?.(e); }}
    onBlur={e => { setFocus(false); onBlur?.(e); }}
    placeholderTextColor={p.placeholderTextColor ?? theme.control.placeholder}
    style={[
      c.f.type.body,
      {
        padding: c.f.layout.gap, minWidth: 0, width: '100%',
        color: inactive ? theme.control.disabledText : theme.text.primary,
        backgroundColor: inactive ? theme.control.disabledSurface : c.surface,
        borderRadius: c.f.layout.radius, borderWidth: 1,
        borderColor: status === 'error' ? theme.control.error : focus || visualState === 'focused' ? theme.control.focus : status === 'success' ? theme.questTheme.colors.success : c.border,
        textAlignVertical: p.multiline ? 'top' : 'center',
      },
      style,
      { minHeight: c.f.layout.touch * (p.multiline ? 2 : 1) },
    ]}
  />;
}

export function V11SheetButton(p: Props<'V11SheetButton'>) {
  const c = useControls(p.theme, p.tone);
  const inactive = !!p.disabled || !!p.loading;
  const foreground = inactive ? p.theme.control.disabledText : p.variant === 'primary' ? c.actionText : p.theme.control.secondaryActionText;
  return <Pressable accessibilityLabel={p.accessibilityLabel ?? p.label} accessibilityRole="button" accessibilityState={{ disabled: inactive, busy: !!p.loading }} onPress={p.onPress} disabled={inactive} style={({ pressed }) => [c.hit, {
    flexDirection: 'row', gap: c.f.spacing.sm,
    backgroundColor: inactive ? p.theme.control.disabledSurface : p.variant === 'primary' ? c.action : pressed || p.visualState === 'pressed' ? c.pressed : c.surface,
    borderColor: p.status === 'error' ? p.theme.control.error : p.status === 'success' ? p.theme.questTheme.colors.success : c.border,
    opacity: !inactive && (pressed || p.visualState === 'pressed') ? 0.8 : 1,
  }, p.style, { minWidth: c.f.layout.touch, minHeight: c.f.layout.touch }]}>
    {p.loading ? <ActivityIndicator color={foreground} /> : null}
    <Text style={[c.f.type.body, { color: foreground, flexShrink: 1, textAlign: 'center' }]}>{p.label}</Text>
  </Pressable>;
}

export function V11ComposerAction(p: Props<'V11ComposerAction'>) {
  const c = useControls(p.theme, p.tone);
  const inactive = !!p.disabled || !!p.loading;
  return <Pressable accessibilityRole="button" accessibilityLabel={p.label} accessibilityState={{ disabled: inactive, busy: !!p.loading }} disabled={inactive} onPress={p.onPress} style={({ pressed }) => [c.hit, {
    width: c.f.layout.touch, height: c.f.layout.touch, flexShrink: 0, padding: 0,
    borderColor: c.border, backgroundColor: inactive ? p.theme.control.disabledSurface : c.action,
    opacity: !inactive && pressed ? 0.8 : 1,
  }]}>{p.loading ? <ActivityIndicator color={p.theme.control.disabledText} /> : p.children}</Pressable>;
}

export function V11InlineButton(p: Props<'V11InlineButton'>) {
  const c = useControls(p.theme);
  return <Pressable accessibilityRole="button" accessibilityLabel={p.label} onPress={p.onPress} style={({ pressed }) => [c.hit, { borderWidth: 0, backgroundColor: pressed ? c.pressed : undefined }]}>
    <Text style={[c.f.type.body, { flexShrink: 1, color: p.tone === 'danger' ? p.theme.control.error : p.theme.control.focus }]}>{p.label}</Text>
  </Pressable>;
}

export function V11SelectionRow(p: Props<'V11SelectionRow'>) {
  const c = useControls(p.theme, 'neutral');
  return <Pressable accessibilityRole="radio" accessibilityState={{ checked: p.selected }} onPress={p.onPress} style={({ pressed }) => [c.hit, {
    alignItems: 'stretch', borderColor: p.selected ? c.selectedBorder : c.border,
    backgroundColor: p.selected ? c.selected : pressed ? c.pressed : c.surface,
  }]}>{p.children}</Pressable>;
}

export function V11StickySheetFooter(p: Props<'V11StickySheetFooter'>) {
  const c = useControls(p.theme);
  const { fontScale } = useWindowDimensions();
  const [width, setWidth] = useState(0);
  const horizontal = width >= c.f.layout.touch * 5 * fontScale;
  return <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ gap: c.f.spacing.sm }}>
    {p.message ? <Text accessibilityLiveRegion="polite" style={[c.f.type.secondary, { color: p.messageStatus === 'error' ? p.theme.control.error : p.theme.text.secondary }]}>{p.message}</Text> : null}
    <View style={{ gap: c.f.spacing.sm, flexDirection: horizontal ? 'row' : 'column', alignItems: 'stretch' }}>
      <V11SheetButton label={p.cancelLabel} onPress={p.onCancel} theme={p.theme} variant="secondary" style={{ flexGrow: 1, flexBasis: horizontal ? 0 : 'auto' }} />
      <V11SheetButton label={p.saveLabel} onPress={p.onSave} disabled={p.disabled} loading={p.saving} theme={p.theme} variant="primary" style={{ flexGrow: 1, flexBasis: horizontal ? 0 : 'auto' }} />
    </View>
  </View>;
}
