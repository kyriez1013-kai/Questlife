import React from 'react';
import {
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import QuestIcon from '../components/ui/QuestIcon';
import type { V11ThemeTokens } from '../v11/tokens';
import { V11GlassSheet } from '../v11/components/V11Material';

const WebView = View as any;
const WebPressable = Pressable as any;

export default function V11TodayOverlaySheet({
  children,
  closeLabel,
  onClose,
  reducedMotion,
  theme,
  title,
  visible,
}: {
  children: React.ReactNode;
  closeLabel: string;
  onClose: () => void;
  reducedMotion: boolean;
  theme: V11ThemeTokens;
  title: string;
  visible: boolean;
}) {
  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <WebView
        accessibilityViewIsModal
        dataSet={{
          'v11-motion': reducedMotion ? 'reduced' : 'normal',
          'v11-today-role': 'overlay',
        }}
        style={{
          '--v11-today-primary': theme.glow.primary,
          '--v11-today-text': theme.text.primary,
        }}
      >
        <WebPressable
          accessibilityLabel={closeLabel}
          accessibilityRole="button"
          dataSet={{ 'v11-today-role': 'overlay-scrim' }}
          onPress={onClose}
        />
        <V11GlassSheet
          contentStyle={styles.sheetContent}
          minHeight={220}
          reducedMotion={reducedMotion}
          stage="S2"
          style={styles.sheet}
          theme={theme}
        >
          <WebView dataSet={{ 'v11-today-role': 'overlay-header' }}>
            <Text style={[styles.title, { color: theme.text.primary }]}>
              {title}
            </Text>
            <WebPressable
              accessibilityLabel={closeLabel}
              accessibilityRole="button"
              dataSet={{ 'v11-today-role': 'overlay-close' }}
              onPress={onClose}
            >
              <QuestIcon
                color={theme.text.primary}
                name="plus"
                size={20}
                strokeWidth={1.5}
              />
            </WebPressable>
          </WebView>
          <WebView dataSet={{ 'v11-today-role': 'overlay-content' }}>
            {children}
          </WebView>
        </V11GlassSheet>
      </WebView>
    </Modal>
  );
}

const styles = {
  sheet: {
    width: '100%',
    maxWidth: 430,
    maxHeight: '82%',
  },
  sheetContent: {
    maxHeight: '82%',
    padding: 20,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '500',
  },
} as const;
