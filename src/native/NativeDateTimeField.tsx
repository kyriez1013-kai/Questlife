import React, { useState } from 'react';
import { Keyboard, Platform, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import QuestButton from '../components/ui/QuestButton';
import type { QuestTheme } from '../design/tokens';
import { isDarkTheme } from '../design/surfaces';
import { t, type Lang } from '../i18n';

export default function NativeDateTimeField({ value, mode, label, onChange, theme, lang, disabled = false, displayValue }: {
  value: Date; mode: 'date' | 'time'; label: string; onChange: (value: Date) => void;
  theme: QuestTheme; lang: Lang; disabled?: boolean; displayValue?: string;
}) {
  const [open, setOpen] = useState(false);
  const validValue = Number.isFinite(value.getTime()) ? value : new Date();
  const formatted = displayValue ?? new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-AU', mode === 'date'
    ? { year: 'numeric', month: 'numeric', day: 'numeric' }
    : { hour: '2-digit', minute: '2-digit' }).format(validValue);
  return <View style={{ gap: theme.spacing.xs, flexShrink: 1 }}>
    <Text style={{ color: theme.colors.textMuted, fontSize: theme.typography.captionSize }}>{label}</Text>
    <QuestButton questTheme={theme} variant="secondary" icon={mode === 'date' ? 'calendar' : undefined}
      label={formatted} accessibilityLabel={`${label}: ${formatted}`} disabled={disabled}
      onPress={() => { Keyboard.dismiss(); setOpen(value => !value); }} />
    {open && !disabled ? <>
      <DateTimePicker value={validValue} mode={mode} display={Platform.OS === 'ios' ? 'spinner' : 'default'}
        themeVariant={isDarkTheme(theme) ? 'dark' : 'light'} textColor={theme.colors.text}
        locale={lang === 'zh' ? 'zh-CN' : 'en'} is24Hour
        onChange={(event, next) => {
          if (Platform.OS !== 'ios') setOpen(false);
          if (event.type === 'set' && next) onChange(next);
        }} />
      {Platform.OS === 'ios' ? <QuestButton questTheme={theme} variant="ghost" label={t(lang, 'done')} onPress={() => setOpen(false)} /> : null}
    </> : null}
  </View>;
}
