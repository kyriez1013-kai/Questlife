import React, { useState } from 'react';
import { Platform, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { NativeDateFieldProps } from './NativeDateField';
import { InsightButton } from './InsightsControls';
import { localDateKey, parseLocalDate } from './nativeInsightsPresentation';

export default function NativeDateField({ q, lang, label, value, onChange }: NativeDateFieldProps) {
  const [open, setOpen] = useState(false);
  return <View style={{ gap: q.spacing.sm }}>
    <InsightButton q={q} icon="calendar" label={`${label} · ${value}`} onPress={() => setOpen(current => !current)} />
    {open ? <DateTimePicker accessibilityLabel={label} value={parseLocalDate(value) ?? new Date()} mode="date" display={Platform.OS === 'ios' ? 'inline' : 'default'} themeVariant={q.id === 'deepWork' ? 'dark' : 'light'} locale={lang === 'zh' ? 'zh-CN' : 'en-AU'} onChange={(event, date) => { if (Platform.OS === 'android') setOpen(false); if (event.type !== 'dismissed' && date) onChange(localDateKey(date)); }} /> : null}
  </View>;
}
