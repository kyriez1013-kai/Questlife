import React from 'react';
import {
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import type { V11ThemeTokens } from '../v11/tokens';
import { V11GlassSheet } from '../v11/components/V11Material';
import V11RebaselineIcon from './V11RebaselineIcon';
import './v11-stage2-rebaseline.css';

const WebView = View as any;
const WebPressable = Pressable as any;

export default function V11Stage2ProductionSheet({
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
          'v11-rebaseline-role': 'overlay',
          'v11-sheet': 'production',
        }}
        onStartShouldSetResponder={() => true}
      >
        <WebPressable
          accessibilityLabel={closeLabel}
          accessibilityRole="button"
          dataSet={{ 'v11-rebaseline-role': 'scrim' }}
          onPress={onClose}
        />
        <V11GlassSheet
          accessibilityLabel={title}
          contentStyle={{
            maxHeight: '82%',
            paddingHorizontal: 20,
            paddingTop: 14,
            paddingBottom: 24,
            gap: 16,
          }}
          minHeight={350}
          reducedMotion={reducedMotion}
          stage="S2"
          style={{ width: '100%', maxWidth: 680, maxHeight: '82%' }}
          theme={theme}
        >
          <WebView dataSet={{ 'v11-rebaseline-role': 'sheet-handle' }} />
          <WebView dataSet={{ 'v11-rebaseline-role': 'sheet-header' }}>
            <Text
              numberOfLines={2}
              style={{ flex: 1, flexShrink: 1, minWidth: 0, color: theme.text.primary, fontSize: 20, lineHeight: 27, fontWeight: '500' }}
            >
              {title}
            </Text>
            <WebPressable
              accessibilityLabel={closeLabel}
              accessibilityRole="button"
              dataSet={{ 'v11-rebaseline-role': 'icon-button' }}
              onPress={onClose}
            >
              <V11RebaselineIcon name="close" size={19} color={theme.text.secondary} />
            </WebPressable>
          </WebView>
          <WebView dataSet={{ 'v11-rebaseline-role': 'production-sheet-content' }}>
            {children}
          </WebView>
        </V11GlassSheet>
      </WebView>
    </Modal>
  );
}
