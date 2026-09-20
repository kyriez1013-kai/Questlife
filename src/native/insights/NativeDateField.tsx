import React from 'react';
import { Text, TextInput, View } from 'react-native';
import type { QuestTheme } from '../../design/tokens';
import type { Lang } from '../../i18n';
import { insightsStyles } from './InsightsControls';
import { ni } from './nativeInsightsStrings';

export type NativeDateFieldProps = { q: QuestTheme; lang: Lang; label: string; value: string; onChange: (value: string) => void };
export default function NativeDateField({ q, lang, label, value, onChange }: NativeDateFieldProps) {
  const s = insightsStyles(q);
  return <View style={{ gap: q.spacing.xs }}><Text style={s.body}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} placeholder={ni(lang, 'dateFormat')} placeholderTextColor={q.colors.textMuted} style={s.input} autoCapitalize="none" /></View>;
}
