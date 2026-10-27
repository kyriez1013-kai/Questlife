import React from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useV2Theme, textStyle } from '../theme';
import { v2t, type V2Lang } from '../copy';
import { T } from './primitives';

/**
 * State dial: five equal tap targets. Meaning = number + word + position (colour only reinforces).
 * Selected segment is filled with the state colour at low alpha and an ink outline.
 */
export function StateDial({ value, onChange, lang, disabled, testID }: { value: number | null; onChange: (n: 1 | 2 | 3 | 4 | 5) => void; lang: V2Lang; disabled?: boolean; testID?: string }) {
  const t = useV2Theme();
  return (
    <View testID={testID} accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: t.space.sm }}>
      {([1, 2, 3, 4, 5] as const).map((n) => {
        const selected = value === n;
        const c = t.color.state[n - 1];
        return (
          <Pressable
            key={n}
            testID={`state-${n}`}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled: !!disabled }}
            accessibilityLabel={`${n}，${v2t(lang, `state.${n}` as 'state.1')}`}
            disabled={disabled}
            onPress={() => onChange(n)}
            style={({ pressed }) => ({
              flex: 1, minHeight: 60, borderRadius: t.radius.md, alignItems: 'center', justifyContent: 'center', gap: 1,
              backgroundColor: selected ? `${c}22` : t.color.surfaceAlt,
              borderWidth: selected ? 2 : 1, borderColor: selected ? t.color.ink : t.color.hairline,
              opacity: pressed ? 0.85 : disabled ? 0.5 : 1,
            })}
          >
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c }} />
            <T level="body" style={{ fontWeight: '700' }}>{n}</T>
            <T level="caption" color="muted">{v2t(lang, `state.${n}` as 'state.1')}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Composer: one input + send, sized for the thumb zone. Enter submits.
 * The send button stays inline with the input so it is never hidden behind the keyboard.
 */
export function Composer({ value, onChange, onSubmit, placeholder, sendLabel, autoFocus, busy, testID, focusKey }: {
  value: string; onChange: (s: string) => void; onSubmit: () => void; placeholder: string; sendLabel: string; autoFocus?: boolean; busy?: boolean; testID?: string;
  /** bump this number to move focus into the input (e.g. after "记一笔") */
  focusKey?: number;
}) {
  const t = useV2Theme();
  const inputRef = React.useRef<TextInput>(null);
  React.useEffect(() => { if (focusKey) inputRef.current?.focus(); }, [focusKey]);
  const can = value.trim().length > 0 && !busy;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.sm, minHeight: 56, paddingLeft: t.space.lg, paddingRight: t.space.xs, borderRadius: t.radius.pill, backgroundColor: t.color.surface, borderWidth: 1, borderColor: t.color.hairline }}>
      <TextInput
        ref={inputRef}
        testID={testID ?? 'composer-input'}
        value={value}
        onChangeText={onChange}
        onSubmitEditing={() => { if (can) onSubmit(); }}
        placeholder={placeholder}
        placeholderTextColor={t.color.inkFaint}
        returnKeyType="send"
        autoFocus={autoFocus}
        accessibilityLabel={placeholder}
        style={[textStyle(t, 'body'), { flex: 1, minHeight: 48, paddingVertical: 0, outlineStyle: 'none' } as never]}
      />
      <Pressable
        testID="composer-send"
        accessibilityRole="button"
        accessibilityLabel={sendLabel}
        accessibilityState={{ disabled: !can }}
        disabled={!can}
        onPress={onSubmit}
        style={({ pressed }) => ({
          minWidth: 48, height: 48, paddingHorizontal: t.space.lg, borderRadius: t.radius.pill, alignItems: 'center', justifyContent: 'center',
          backgroundColor: can ? t.color.primary : t.color.surfaceAlt, opacity: pressed ? 0.85 : 1,
        })}
      >
        <T level="body" style={{ fontWeight: '600', color: can ? t.color.onPrimary : t.color.inkMuted }}>{sendLabel}</T>
      </Pressable>
    </View>
  );
}

/** Numeric field for the confirm sheet. Empty string means "not recorded" — never coerced to 0. */
export function NumberField({ label, value, onChange, unitHint, testID }: { label: string; value: number | null; onChange: (n: number | null) => void; unitHint?: string; testID?: string }) {
  const t = useV2Theme();
  const [text, setText] = React.useState(value == null ? '' : String(value));
  React.useEffect(() => { setText(value == null ? '' : String(value)); }, [value]);
  return (
    <View style={{ flex: 1, gap: t.space.xs, minWidth: 64 }}>
      <T level="caption" color="muted">{label}</T>
      <TextInput
        testID={testID}
        value={text}
        inputMode="decimal"
        keyboardType="decimal-pad"
        placeholder={unitHint ?? '—'}
        placeholderTextColor={t.color.inkFaint}
        accessibilityLabel={label}
        onChangeText={(s) => {
          setText(s);
          const trimmed = s.trim();
          if (trimmed === '') return onChange(null);
          const n = Number(trimmed);
          if (Number.isFinite(n) && n >= 0) onChange(n);
        }}
        style={[textStyle(t, 'body'), { minHeight: 48, paddingHorizontal: t.space.md, borderRadius: t.radius.sm, backgroundColor: t.color.surfaceAlt, borderWidth: 1, borderColor: t.color.hairline, outlineStyle: 'none' } as never]}
      />
    </View>
  );
}

export function TextField({ label, value, onChange, placeholder, testID }: { label: string; value: string; onChange: (s: string) => void; placeholder?: string; testID?: string }) {
  const t = useV2Theme();
  return (
    <View style={{ gap: t.space.xs }}>
      <T level="caption" color="muted">{label}</T>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={t.color.inkFaint}
        accessibilityLabel={label}
        style={[textStyle(t, 'body'), { minHeight: 48, paddingHorizontal: t.space.md, borderRadius: t.radius.sm, backgroundColor: t.color.surfaceAlt, borderWidth: 1, borderColor: t.color.hairline, outlineStyle: 'none' } as never]}
      />
    </View>
  );
}
