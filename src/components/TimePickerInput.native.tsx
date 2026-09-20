import React from 'react';
import { useStore } from '../store';
import { useQuestTheme } from '../design/useQuestTheme';
import { getLanguage, t } from '../i18n';
import { getV11ProductLanguage, getV11ProductThemeId } from '../v11/featureFlag';
import NativeDateTimeField from '../native/NativeDateTimeField';

export interface TimePickerInputProps {
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
}

export default function TimePickerInput({ hour, minute, onChange }: TimePickerInputProps) {
  const { data } = useStore();
  const lang = getV11ProductLanguage(getLanguage(data.settings.language));
  const theme = useQuestTheme(getV11ProductThemeId(data.settings.selectedThemeId));
  const value = new Date();
  value.setHours(hour, minute, 0, 0);
  return <NativeDateTimeField value={value} mode="time" label={t(lang, 'dailyReminder')}
    displayValue={`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`}
    theme={theme} lang={lang}
    onChange={selected => onChange(selected.getHours(), selected.getMinutes())} />;
}
