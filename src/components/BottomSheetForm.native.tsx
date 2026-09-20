import React from 'react';
import type { BottomSheetFormProps } from './BottomSheetForm';
import { useStore } from '../store';
import { useQuestTheme } from '../design/useQuestTheme';
import { getLanguage, t } from '../i18n';
import { getV11ThemeTokens } from '../v11/tokens';
import V11NativeSheet from '../v11/components/V11NativeSheet.native';

export type { BottomSheetFormProps } from './BottomSheetForm';

export default function BottomSheetForm({ visible, onClose, children, footer, closeAccessibilityLabel }: BottomSheetFormProps) {
  const { data } = useStore();
  const questTheme = useQuestTheme(data.settings.selectedThemeId);
  const theme = getV11ThemeTokens(questTheme.id === 'deepWork' ? 'dark' : 'light');
  const language = getLanguage(data.settings.language);

  return <V11NativeSheet
    visible={visible}
    onClose={onClose}
    closeLabel={closeAccessibilityLabel ?? t(language, 'closeDetails')}
    footer={footer}
    theme={theme}
    minHeight={0}
    reducedMotion={false}
  >
    {children}
  </V11NativeSheet>;
}
