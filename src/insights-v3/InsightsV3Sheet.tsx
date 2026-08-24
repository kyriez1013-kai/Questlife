import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { Lang } from '../i18n';
import type { QuestVisualFoundation } from '../design/visualFoundation';
import { iv3 } from './insightsV3I18n';

const WebView = View as any;
const WebPressable = Pressable as any;
const WebScrollView = ScrollView as any;

export default function InsightsV3Sheet({
  children,
  eyebrow,
  foundation,
  lang,
  onClose,
  open,
  title,
}: {
  children: React.ReactNode;
  eyebrow?: string;
  foundation: QuestVisualFoundation;
  lang: Lang;
  onClose: () => void;
  open: boolean;
  title: string;
}) {
  if (!open) return null;
  return (
    <WebView
      accessibilityViewIsModal
      dataSet={{ 'insights-v3-role': 'sheet-layer' }}
      style={{ '--iv3-sheet': foundation.material.elevated, '--iv3-overlay': foundation.material.overlay } as any}
    >
      <WebPressable
        accessibilityLabel={iv3(lang, 'close')}
        accessibilityRole="button"
        dataSet={{ 'insights-v3-role': 'sheet-scrim' }}
        onPress={onClose}
      />
      <WebView dataSet={{ 'insights-v3-role': 'sheet' }}>
        <WebView dataSet={{ 'insights-v3-role': 'sheet-handle' }} />
        <WebView dataSet={{ 'insights-v3-role': 'sheet-header' }}>
          <WebView style={{ minWidth: 0, flex: 1 }}>
            {eyebrow ? <Text style={{ color: foundation.text.metadata }}>{eyebrow}</Text> : null}
            <Text style={{ color: foundation.text.primary }}>{title}</Text>
          </WebView>
          <WebPressable
            accessibilityLabel={iv3(lang, 'close')}
            accessibilityRole="button"
            dataSet={{ 'insights-v3-role': 'sheet-close' }}
            onPress={onClose}
          >
            <Text style={{ color: foundation.text.primary }}>×</Text>
          </WebPressable>
        </WebView>
        <WebScrollView
          contentContainerStyle={{ paddingBottom: 28 }}
          dataSet={{ 'insights-v3-role': 'sheet-scroll' }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </WebScrollView>
      </WebView>
    </WebView>
  );
}
