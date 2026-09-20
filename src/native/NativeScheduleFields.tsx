import React from 'react';
import { View } from 'react-native';
import type { QuestTheme } from '../design/tokens';
import { t, type Lang } from '../i18n';
import NativeDateTimeField from './NativeDateTimeField';
import { localDateValue, localTimeValue } from './nativeWorkflowValidation';

export default function NativeScheduleFields({ date, start, end, onDate, onStart, onEnd, theme, lang }: {
  date: string; start: string; end: string; onDate: (value: string) => void;
  onStart: (value: string) => void; onEnd: (value: string) => void; theme: QuestTheme; lang: Lang;
}) {
  return <View style={{ gap: theme.spacing.sm }}>
    <NativeDateTimeField theme={theme} lang={lang} mode="date" label={t(lang, 'date')}
      value={new Date(`${date}T12:00:00`)} onChange={value => onDate(localDateValue(value))} />
    <NativeDateTimeField theme={theme} lang={lang} mode="time" label={t(lang, 'start')}
      value={new Date(`${date}T${start}:00`)} onChange={value => onStart(localTimeValue(value))} />
    <NativeDateTimeField theme={theme} lang={lang} mode="time" label={t(lang, 'end')}
      value={new Date(`${date}T${end}:00`)} displayValue={end === '24:00' ? end : undefined}
      onChange={value => {
        const time = localTimeValue(value);
        // Native clocks call midnight 00:00; same-day blocks use 24:00 for their end.
        onEnd(time === '00:00' ? '24:00' : time);
      }} />
  </View>;
}
