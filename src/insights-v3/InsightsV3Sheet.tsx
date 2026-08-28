import React from 'react';
import { View } from 'react-native';
import type { Lang } from '../i18n';
import type { V11ThemeTokens } from '../v11/tokens';
import V11Stage2ProductionSheet from '../v11-stage2-rebaseline/V11Stage2ProductionSheet';
import { iv3 } from './insightsV3I18n';

const WebView = View as any;

export default function InsightsV3Sheet({
  children,
  lang,
  onClose,
  open,
  reducedMotion,
  theme,
  title,
}: {
  children: React.ReactNode;
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
      minHeight={260}
      onClose={onClose}
      reducedMotion={reducedMotion}
      sheet="record"
      theme={theme}
      title={title}
      visible={open}
    >
      <WebView dataSet={{ 'insights-v3-role': 'sheet-body' }}>
        {children}
      </WebView>
    </V11Stage2ProductionSheet>
  );
}
