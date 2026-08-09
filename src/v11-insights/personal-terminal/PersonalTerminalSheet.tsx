import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { Lang } from '../../i18n';
import { t } from '../../i18n';
import { V11GlassSheet } from '../../v11/components/V11Material';
import type { V11ThemeTokens } from '../../v11/tokens';
import V11RebaselineIcon from '../../v11-stage2-rebaseline/V11RebaselineIcon';

const WebView = View as any;
const WebPressable = Pressable as any;
const WebScrollView = ScrollView as any;

export default function PersonalTerminalSheet({
  children,
  eyebrow,
  language,
  onClose,
  open,
  reducedMotion,
  subtitle,
  theme,
  title,
}: {
  children: React.ReactNode;
  eyebrow: string;
  language: Lang;
  onClose: () => void;
  open: boolean;
  reducedMotion: boolean;
  subtitle?: string;
  theme: V11ThemeTokens;
  title: string;
}) {
  if (!open) return null;
  return (
    <WebView dataSet={{ 'personal-terminal-role': 'sheet-layer' }}>
      <WebPressable
        accessibilityLabel={t(language, 'close')}
        accessibilityRole="button"
        dataSet={{ 'personal-terminal-role': 'sheet-scrim' }}
        onPress={onClose}
      />
      <V11GlassSheet
        contentStyle={{ minHeight: 0, flex: 1 }}
        minHeight={240}
        reducedMotion={reducedMotion}
        stage="S3"
        theme={theme}
      >
        <WebView dataSet={{ 'personal-terminal-role': 'sheet-header' }}>
          <WebView>
            <Text style={{ color: theme.text.metadata }}>{eyebrow}</Text>
            <Text style={{ color: theme.text.primary }}>{title}</Text>
            {subtitle ? <Text style={{ color: theme.text.secondary }}>{subtitle}</Text> : null}
          </WebView>
          <WebPressable accessibilityLabel={t(language, 'close')} accessibilityRole="button" onPress={onClose}>
            <V11RebaselineIcon color={theme.text.primary} name="close" size={18} />
          </WebPressable>
        </WebView>
        <WebScrollView dataSet={{ 'personal-terminal-role': 'sheet-scroll' }} showsVerticalScrollIndicator={false}>
          {children}
        </WebScrollView>
      </V11GlassSheet>
    </WebView>
  );
}
