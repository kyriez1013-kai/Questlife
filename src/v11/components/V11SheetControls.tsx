import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import type { V11ThemeTokens } from '../tokens';
import { v11Radius, v11Spacing, v11Typography } from '../tokens';
import '../../v11-stage2-rebaseline/v11-stage2-rebaseline.css';

const WebPressable = Pressable as any;
const WebText = Text as any;
const WebTextInput = TextInput as any;
const WebView = View as any;

type ControlStatus = 'default' | 'success' | 'error';
type ControlTone = 'default' | 'neutral';

function controlVariables(theme: V11ThemeTokens, tone: ControlTone = 'default') {
  const neutral = tone === 'neutral';
  return {
    '--v11-control-surface': neutral ? theme.control.neutralSurface : theme.control.surface,
    '--v11-control-elevated': neutral ? theme.control.neutralElevatedSurface : theme.control.elevatedSurface,
    '--v11-control-selected': neutral ? theme.control.neutralSelectedSurface : theme.control.selectedSurface,
    '--v11-control-pressed': neutral ? theme.control.neutralPressedSurface : theme.control.pressedSurface,
    '--v11-control-text': theme.control.primaryText,
    '--v11-control-text-secondary': theme.control.secondaryText,
    '--v11-control-selected-text': neutral ? theme.control.neutralSelectedText : theme.control.selectedText,
    '--v11-control-border': neutral ? theme.control.neutralBorder : theme.control.borderSubtle,
    '--v11-control-border-selected': neutral ? theme.control.neutralSelectedBorder : theme.control.borderSelected,
    '--v11-control-focus': theme.control.focus,
    '--v11-control-disabled': theme.control.disabledSurface,
    '--v11-control-disabled-text': theme.control.disabledText,
    '--v11-control-error': theme.control.error,
    '--v11-control-primary-action': neutral ? theme.control.neutralAction : theme.control.primaryAction,
    '--v11-control-primary-action-text': neutral ? theme.control.neutralActionText : theme.control.primaryActionText,
    '--v11-control-secondary-action': neutral ? theme.control.neutralSurface : theme.control.secondaryAction,
    '--v11-control-secondary-action-text': theme.control.secondaryActionText,
  } as any;
}

export type V11DiscreteOption<T extends number = number> = {
  value: T;
  label: string;
};

export function V11DiscreteNumericRail<T extends number>({
  disabled = false,
  label,
  onChange,
  options,
  theme,
  value,
}: {
  disabled?: boolean;
  label?: string;
  onChange: (value: T) => void;
  options: V11DiscreteOption<T>[];
  theme: V11ThemeTokens;
  value: T;
}) {
  const selectedMeaning = options.find((option) => option.value === value)?.label ?? '';

  return (
    <WebView
      dataSet={{
        'v11-control': 'numeric-rail',
        'v11-control-file': 'src/v11/components/V11SheetControls.tsx',
        'v11-has-label': label ? 'true' : 'false',
      }}
      style={controlVariables(theme)}
    >
      {label ? (
        <WebView dataSet={{ 'v11-control-role': 'numeric-heading' }}>
          <Text style={{ color: theme.control.primaryText, fontSize: 14, fontWeight: '600' }}>{label}</Text>
          <Text style={{ color: theme.control.secondaryText, fontSize: 12 }}>{value} · {selectedMeaning}</Text>
        </WebView>
      ) : null}
      <WebView accessibilityRole="radiogroup" dataSet={{ 'v11-control-role': 'numeric-options' }}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <WebPressable
              accessibilityLabel={`${label ? `${label} ` : ''}${option.value} ${option.label}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled }}
              dataSet={{
                'v11-control': 'numeric-option',
                'v11-control-file': 'src/v11/components/V11SheetControls.tsx',
                'v11-disabled': disabled ? 'true' : 'false',
                'v11-selected': selected ? 'true' : 'false',
              }}
              disabled={disabled}
              key={option.value}
              onPress={() => onChange(option.value)}
            >
              <WebText
                dataSet={{ 'v11-control-role': 'numeric-value' }}
                style={{ color: selected ? theme.control.selectedText : theme.control.primaryText }}
              >
                {option.value}
              </WebText>
              <WebText
                dataSet={{ 'v11-control-role': 'numeric-label' }}
                numberOfLines={2}
                style={{ color: theme.control.secondaryText }}
              >
                {option.label}
              </WebText>
            </WebPressable>
          );
        })}
      </WebView>
    </WebView>
  );
}

export function V11CategoricalChip({
  accessibilityRole = 'checkbox',
  density = 'default',
  disabled = false,
  label,
  onPress,
  selected,
  theme,
  tone = 'default',
  visualState = 'default',
}: {
  accessibilityRole?: 'checkbox' | 'radio' | 'button';
  density?: 'default' | 'compact';
  disabled?: boolean;
  label: string;
  onPress: () => void;
  selected: boolean;
  theme: V11ThemeTokens;
  tone?: ControlTone;
  visualState?: 'default' | 'pressed';
}) {
  const checkedState = accessibilityRole === 'button'
    ? { selected, disabled }
    : accessibilityRole === 'checkbox'
      ? { checked: selected, disabled }
      : { checked: selected, disabled };

  return (
    <WebPressable
      accessibilityLabel={label}
      accessibilityRole={accessibilityRole}
      accessibilityState={checkedState}
      dataSet={{
        'v11-control': 'categorical-chip',
        'v11-control-file': 'src/v11/components/V11SheetControls.tsx',
        'v11-density': density,
        'v11-disabled': disabled ? 'true' : 'false',
        'v11-preview-state': visualState,
        'v11-selected': selected ? 'true' : 'false',
      }}
      disabled={disabled}
      onPress={onPress}
      style={controlVariables(theme, tone)}
    >
      <WebText
        dataSet={{ 'v11-control-role': 'chip-indicator' }}
        style={{ color: disabled ? theme.control.disabledText : selected ? theme.control.selectedText : theme.control.secondaryText }}
      >
        {selected ? '✓' : ''}
      </WebText>
      <WebText
        dataSet={{ 'v11-control-role': 'chip-label' }}
        style={{ color: disabled ? theme.control.disabledText : selected ? theme.control.selectedText : theme.control.secondaryText }}
      >
        {label}
      </WebText>
    </WebPressable>
  );
}

export function V11CompactValueSelector<T extends string | number | null>({
  columns,
  disabled = false,
  onChange,
  options,
  theme,
  value,
}: {
  columns?: number;
  disabled?: boolean;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  theme: V11ThemeTokens;
  value: T | undefined;
}) {
  const columnCount = Math.max(1, Math.min(columns ?? options.length, options.length));

  return (
    <WebView
      accessibilityRole="radiogroup"
      dataSet={{
        'v11-control': 'compact-value-selector',
        'v11-control-file': 'src/v11/components/V11SheetControls.tsx',
      }}
      style={[
        controlVariables(theme, 'neutral'),
        { gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` } as any,
      ]}
    >
      {options.map((option, index) => {
        const selected = Object.is(option.value, value);
        return (
          <WebPressable
            accessibilityLabel={option.label}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected, disabled }}
            dataSet={{
              'v11-control': 'compact-value-option',
              'v11-control-file': 'src/v11/components/V11SheetControls.tsx',
              'v11-disabled': disabled ? 'true' : 'false',
              'v11-selected': selected ? 'true' : 'false',
            }}
            disabled={disabled}
            key={`${String(option.value)}:${index}`}
            onPress={() => onChange(option.value)}
          >
            <Text style={{ color: selected ? theme.control.selectedText : theme.control.secondaryText }}>
              {option.label}
            </Text>
          </WebPressable>
        );
      })}
    </WebView>
  );
}

export function V11CheckboxControl({
  accessibilityLabel,
  checked,
  disabled = false,
  onPress,
  theme,
  tone = 'default',
}: {
  accessibilityLabel: string;
  checked: boolean;
  disabled?: boolean;
  onPress: () => void;
  theme: V11ThemeTokens;
  tone?: ControlTone;
}) {
  return (
    <WebPressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      dataSet={{
        'v11-control': 'checkbox',
        'v11-control-file': 'src/v11/components/V11SheetControls.tsx',
        'v11-disabled': disabled ? 'true' : 'false',
        'v11-selected': checked ? 'true' : 'false',
      }}
      disabled={disabled}
      onPress={onPress}
      style={controlVariables(theme, tone)}
    >
      <WebText style={{ color: disabled ? theme.control.disabledText : checked ? theme.control.selectedText : theme.control.secondaryText }}>
        {checked ? '✓' : ''}
      </WebText>
    </WebPressable>
  );
}

export function V11StatusChip({
  label,
  theme,
}: {
  label: string;
  theme: V11ThemeTokens;
}) {
  return (
    <WebView
      accessibilityLabel={label}
      accessibilityRole="text"
      dataSet={{
        'v11-component': 'status-chip',
        'v11-control-file': 'src/v11/components/V11SheetControls.tsx',
      }}
      style={controlVariables(theme)}
    >
      <Text style={{ color: theme.control.secondaryText }}>{label}</Text>
    </WebView>
  );
}

export function V11SegmentedSelector<T extends string>({
  disabled = false,
  onChange,
  options,
  theme,
  value,
}: {
  disabled?: boolean;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  theme: V11ThemeTokens;
  value: T;
}) {
  return (
    <WebView
      accessibilityRole="radiogroup"
      dataSet={{ 'v11-control': 'segmented-selector', 'v11-control-file': 'src/v11/components/V11SheetControls.tsx' }}
      style={controlVariables(theme)}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <WebPressable
            accessibilityLabel={option.label}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected, disabled }}
            dataSet={{
              'v11-control': 'segment',
              'v11-control-file': 'src/v11/components/V11SheetControls.tsx',
              'v11-disabled': disabled ? 'true' : 'false',
              'v11-selected': selected ? 'true' : 'false',
            }}
            disabled={disabled}
            key={option.value}
            onPress={() => onChange(option.value)}
          >
            <Text
              numberOfLines={2}
              style={{ color: disabled ? theme.control.disabledText : selected ? theme.control.selectedText : theme.control.secondaryText }}
            >
              {option.label}
            </Text>
          </WebPressable>
        );
      })}
    </WebView>
  );
}

export function V11TextField({
  disabled = false,
  status = 'default',
  style,
  theme,
  tone = 'default',
  visualState = 'default',
  onBlur,
  onFocus,
  ...props
}: TextInputProps & {
  disabled?: boolean;
  status?: ControlStatus;
  style?: TextInputProps['style'];
  theme: V11ThemeTokens;
  tone?: ControlTone;
  visualState?: 'default' | 'focused';
}) {
  const [focused, setFocused] = useState(false);

  return (
    <WebTextInput
      {...props}
      accessibilityLabel={props.accessibilityLabel ?? props.placeholder}
      dataSet={{
        'v11-control': props.multiline ? 'textarea' : 'text-input',
        'v11-control-file': 'src/v11/components/V11SheetControls.tsx',
        'v11-disabled': disabled ? 'true' : 'false',
        'v11-focused': focused ? 'true' : 'false',
        'v11-preview-state': visualState,
        'v11-status': status,
      }}
      editable={!disabled}
      onBlur={(event: any) => {
        setFocused(false);
        onBlur?.(event);
      }}
      onFocus={(event: any) => {
        setFocused(true);
        onFocus?.(event);
      }}
      placeholderTextColor={props.placeholderTextColor ?? theme.control.placeholder}
      style={[
        controlVariables(theme, tone),
        {
          minHeight: props.multiline ? 88 : 48,
          width: '100%',
          minWidth: 0,
          borderRadius: v11Radius.control,
          paddingHorizontal: v11Spacing.md,
          paddingVertical: v11Spacing.sm,
          color: disabled ? theme.control.disabledText : theme.control.primaryText,
          backgroundColor: disabled ? theme.control.disabledSurface : theme.control.surface,
          borderColor: status === 'error'
            ? theme.control.error
            : focused
              ? theme.control.focus
              : theme.control.borderSubtle,
          borderWidth: focused || status === 'error' ? 2 : 1,
          fontSize: v11Typography.body.fontSize,
          lineHeight: v11Typography.body.lineHeight,
        },
        style,
      ]}
    />
  );
}

export function V11SheetButton({
  accessibilityLabel,
  disabled = false,
  label,
  loading = false,
  onPress,
  status = 'default',
  style,
  theme,
  tone = 'default',
  variant,
  visualState = 'default',
}: {
  accessibilityLabel?: string;
  disabled?: boolean;
  label: string;
  loading?: boolean;
  onPress: () => void;
  status?: ControlStatus;
  style?: ViewStyle | ViewStyle[];
  theme: V11ThemeTokens;
  tone?: ControlTone;
  variant: 'primary' | 'secondary';
  visualState?: 'default' | 'pressed';
}) {
  const inactive = disabled || loading;
  const primaryForeground = tone === 'neutral'
    ? theme.control.neutralActionText
    : theme.control.primaryActionText;
  const foreground = inactive
    ? theme.control.disabledText
    : variant === 'primary'
      ? primaryForeground
      : theme.control.secondaryActionText;

  return (
    <WebPressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: inactive }}
      dataSet={{
        'v11-control': 'sheet-button',
        'v11-control-file': 'src/v11/components/V11SheetControls.tsx',
        'v11-disabled': inactive ? 'true' : 'false',
        'v11-status': status,
        'v11-variant': variant,
        'v11-preview-state': visualState,
      }}
      disabled={inactive}
      onPress={onPress}
      style={[controlVariables(theme, tone), style]}
    >
      {loading ? <ActivityIndicator color={foreground} size="small" /> : null}
      <Text style={{ color: foreground }}>{label}</Text>
    </WebPressable>
  );
}

export function V11ComposerAction({
  children,
  disabled = false,
  label,
  loading = false,
  onPress,
  theme,
  tone = 'default',
}: {
  children: React.ReactNode;
  disabled?: boolean;
  label: string;
  loading?: boolean;
  onPress: () => void;
  theme: V11ThemeTokens;
  tone?: ControlTone;
}) {
  const inactive = disabled || loading;

  return (
    <WebPressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: inactive }}
      dataSet={{
        'v11-control': 'composer-action',
        'v11-control-file': 'src/v11/components/V11SheetControls.tsx',
        'v11-disabled': inactive ? 'true' : 'false',
      }}
      disabled={inactive}
      onPress={onPress}
      style={controlVariables(theme, tone)}
    >
      {loading
        ? <ActivityIndicator color={tone === 'neutral' ? theme.control.neutralActionText : theme.control.primaryActionText} size="small" />
        : children}
    </WebPressable>
  );
}

export function V11InlineButton({
  label,
  onPress,
  theme,
  tone = 'default',
}: {
  label: string;
  onPress: () => void;
  theme: V11ThemeTokens;
  tone?: 'default' | 'danger';
}) {
  return (
    <WebPressable
      accessibilityLabel={label}
      accessibilityRole="button"
      dataSet={{
        'v11-control': 'inline-button',
        'v11-control-file': 'src/v11/components/V11SheetControls.tsx',
        'v11-tone': tone,
      }}
      onPress={onPress}
      style={controlVariables(theme)}
    >
      <Text style={{ color: tone === 'danger' ? theme.control.error : theme.control.focus }}>{label}</Text>
    </WebPressable>
  );
}

export function V11SelectionRow({
  children,
  onPress,
  selected,
  theme,
}: {
  children: React.ReactNode;
  onPress: () => void;
  selected: boolean;
  theme: V11ThemeTokens;
}) {
  return (
    <WebPressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      dataSet={{
        'v11-control': 'selection-row',
        'v11-control-file': 'src/v11/components/V11SheetControls.tsx',
        'v11-selected': selected ? 'true' : 'false',
      }}
      onPress={onPress}
      style={controlVariables(theme)}
    >
      {children}
    </WebPressable>
  );
}

export function V11StickySheetFooter({
  cancelLabel,
  disabled = false,
  message,
  messageStatus = 'default',
  onCancel,
  onSave,
  saveLabel,
  saving = false,
  theme,
}: {
  cancelLabel: string;
  disabled?: boolean;
  message?: string;
  messageStatus?: ControlStatus;
  onCancel: () => void;
  onSave: () => void;
  saveLabel: string;
  saving?: boolean;
  theme: V11ThemeTokens;
}) {
  return (
    <WebView
      dataSet={{ 'v11-control': 'sticky-sheet-footer', 'v11-control-file': 'src/v11/components/V11SheetControls.tsx' }}
      style={controlVariables(theme)}
    >
      {message ? (
        <WebText
          dataSet={{ 'v11-control-role': 'footer-message', 'v11-status': messageStatus }}
          style={{ color: messageStatus === 'error' ? theme.control.error : theme.control.secondaryText }}
        >
          {message}
        </WebText>
      ) : null}
      <WebView dataSet={{ 'v11-control-role': 'footer-actions' }}>
        <V11SheetButton label={cancelLabel} onPress={onCancel} style={{ flex: 1 }} theme={theme} variant="secondary" />
        <V11SheetButton disabled={disabled} label={saveLabel} loading={saving} onPress={onSave} style={{ flex: 1 }} theme={theme} variant="primary" />
      </WebView>
    </WebView>
  );
}
