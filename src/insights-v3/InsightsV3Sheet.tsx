import React from 'react';
import { Text, View } from 'react-native';
import type { Lang } from '../i18n';
import type { QuestVisualFoundation } from '../design/visualFoundation';
import V11Stage2ProductionSheet from '../v11-stage2-rebaseline/V11Stage2ProductionSheet';
import type { V11ThemeTokens } from '../v11/tokens';
import { iv3 } from './insightsV3I18n';

const WebView = View as any;
const WebText = Text as any;

export default function InsightsV3Sheet({
  children,
  eyebrow,
  foundation,
  lang,
  onClose,
  open,
  reducedMotion,
  theme,
  title,
}: {
  children: React.ReactNode;
  eyebrow?: string;
  foundation: QuestVisualFoundation;
  lang: Lang;
  onClose: () => void;
  open: boolean;
  reducedMotion: boolean;
  theme: V11ThemeTokens;
  title: string;
}) {
  return (
    <V11Stage2ProductionSheet
      closeLabel={iv3(lang, 'close')}
      minHeight={360}
      onClose={onClose}
      reducedMotion={reducedMotion}
      sheet="production"
      theme={theme}
      title={title}
      visible={open}
    >
      <WebView dataSet={{ 'insights-v3-role': 'sheet-body' }}>
        {eyebrow ? (
          <WebText dataSet={{ 'insights-v3-role': 'sheet-eyebrow' }} style={{ color: foundation.text.metadata }}>
            {eyebrow}
          </WebText>
        ) : null}
        {children}
      </WebView>
    </V11Stage2ProductionSheet>
  );
}
