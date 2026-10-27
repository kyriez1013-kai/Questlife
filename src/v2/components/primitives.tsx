import React from 'react';
import { ActivityIndicator, Pressable, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { useV2Theme, textStyle } from '../theme';

/** Text with one of the four type levels. */
export function T({ level = 'body', color, style, children, numberOfLines, accessibilityRole, testID }: {
  testID?: string;
  level?: 'display' | 'title' | 'body' | 'caption';
  color?: 'ink' | 'muted' | 'faint' | 'danger' | 'success' | 'primary' | 'onPrimary';
  style?: StyleProp<TextStyle>;
  children?: React.ReactNode;
  numberOfLines?: number;
  accessibilityRole?: 'header' | 'text' | 'alert';
}) {
  const t = useV2Theme();
  const map = { ink: t.color.ink, muted: t.color.inkMuted, faint: t.color.inkFaint, danger: t.color.danger, success: t.color.success, primary: t.color.primary, onPrimary: t.color.onPrimary };
  return <Text testID={testID} accessibilityRole={accessibilityRole} numberOfLines={numberOfLines} style={[textStyle(t, level, color ? map[color] : undefined), style]}>{children}</Text>;
}

/** Surface: flat (hairline) in direction A, soft-shadow card in direction B. */
export function Surface({ children, style, tone = 'surface', padded = true }: {
  children?: React.ReactNode; style?: StyleProp<ViewStyle>; tone?: 'surface' | 'alt'; padded?: boolean;
}) {
  const t = useV2Theme();
  return (
    <View
      style={[
        {
          backgroundColor: tone === 'alt' ? t.color.surfaceAlt : t.color.surface,
          borderRadius: t.radius.md,
          padding: padded ? t.space.lg : 0,
        },
        t.surfaceStyle === 'flat' ? { borderWidth: 1, borderColor: t.color.hairline } : t.shadow ?? { borderWidth: 1, borderColor: t.color.hairline },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({ label, onPress, variant = 'primary', size = 'md', loading, disabled, fullWidth, style, testID, accessibilityLabel }: {
  label: string; onPress?: () => void; variant?: ButtonVariant; size?: 'md' | 'lg'; loading?: boolean; disabled?: boolean; fullWidth?: boolean;
  style?: StyleProp<ViewStyle>; testID?: string; accessibilityLabel?: string;
}) {
  const t = useV2Theme();
  const off = disabled || loading;
  const bg = variant === 'primary' ? t.color.primary : variant === 'danger' ? t.color.dangerSoft : variant === 'secondary' ? t.color.surfaceAlt : 'transparent';
  const fg = variant === 'primary' ? t.color.onPrimary : variant === 'danger' ? t.color.danger : t.color.ink;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: size === 'lg' ? 54 : 48,
          minWidth: t.layout.hit,
          paddingHorizontal: t.space.xl,
          borderRadius: t.radius.pill,
          alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: t.space.sm,
          backgroundColor: bg,
          opacity: off && !loading ? 0.4 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
          alignSelf: fullWidth ? 'stretch' : 'auto',
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : null}
      <Text style={[textStyle(t, 'body', fg), { fontWeight: '600' }]}>{label}</Text>
    </Pressable>
  );
}

/** Selectable pill — min 44pt tall. */
export function Chip({ label, selected, onPress, testID, hint }: { label: string; selected?: boolean; onPress?: () => void; testID?: string; hint?: string }) {
  const t = useV2Theme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={hint ? `${label}，${hint}` : label}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: t.layout.hit, paddingHorizontal: t.space.lg, borderRadius: t.radius.pill,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: selected ? t.color.primary : t.color.surfaceAlt,
        borderWidth: 1, borderColor: selected ? t.color.primary : t.color.hairline,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Text style={[textStyle(t, 'body', selected ? t.color.onPrimary : t.color.ink), { fontWeight: selected ? '600' : '500' }]}>{label}</Text>
    </Pressable>
  );
}

/** Divider-free list row: title (+ right accessory) and detail lines underneath. */
export function Row({ title, lines = [], right, onPress, testID }: { title: string; lines?: string[]; right?: React.ReactNode; onPress?: () => void; testID?: string }) {
  const t = useV2Theme();
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: t.layout.hit, paddingVertical: t.space.md, gap: t.space.md }}>
      <View style={{ flex: 1 }}>
        <T level="body" style={{ fontWeight: '600' }}>{title}</T>
        {lines.map((l, i) => <T key={i} level="caption" color="muted">{l}</T>)}
      </View>
      {right}
    </View>
  );
  return onPress ? <Pressable testID={testID} accessibilityRole="button" onPress={onPress}>{body}</Pressable> : <View testID={testID}>{body}</View>;
}

export function Hairline() {
  const t = useV2Theme();
  return <View style={{ height: 1, backgroundColor: t.color.hairline }} />;
}
