import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import type { V11ThemeTokens } from '../v11/tokens';
import { v11Spacing, v11Typography } from '../v11/tokens';
import { V11GlassSheet } from '../v11/components/V11Material';
import V11RebaselineIcon from './V11RebaselineIcon';
import './v11-stage2-rebaseline.css';

const WebView = View as any;
const WebPressable = Pressable as any;
const WebScrollView = ScrollView as any;

export default function V11Stage2ProductionSheet({
  children,
  closeLabel,
  footer,
  onClose,
  reducedMotion,
  sheet = 'production',
  theme,
  title,
  visible,
}: {
  children: React.ReactNode;
  closeLabel: string;
  footer?: React.ReactNode;
  onClose: () => void;
  reducedMotion: boolean;
  sheet?: 'capture' | 'record' | 'state' | 'production';
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
        style={{ flex: 1 }}
      >
        <WebView
          accessibilityViewIsModal
          dataSet={{
            'v11-motion': reducedMotion ? 'reduced' : 'normal',
            'v11-rebaseline-role': 'overlay',
            'v11-sheet': sheet,
            'v11-theme': theme.mode,
          }}
          onStartShouldSetResponder={() => true}
          style={{
            '--v11-rebaseline-bg': theme.field.background,
            '--v11-rebaseline-elevated': theme.questTheme.colors.surfaceElevated,
            '--v11-rebaseline-overlay': theme.questTheme.colors.overlay,
            '--v11-rebaseline-primary': theme.glow.primary,
            '--v11-rebaseline-text': theme.text.primary,
          } as any}
        >
          <WebPressable
            accessible={false}
            aria-hidden="true"
            dataSet={{ 'v11-rebaseline-role': 'scrim' }}
            onPress={onClose}
            tabIndex={-1}
          />
          <V11GlassSheet
            accessibilityLabel={title}
            contentStyle={{
              paddingHorizontal: 0,
              paddingTop: v11Spacing.sm,
              paddingBottom: 0,
              gap: 0,
            }}
            minHeight={350}
            reducedMotion={reducedMotion}
            stage="S2"
            style={{ maxWidth: 680 }}
            theme={theme}
          >
            <WebView dataSet={{ 'v11-rebaseline-role': 'sheet-handle' }} />
            <WebView
              dataSet={{ 'v11-rebaseline-role': 'sheet-header' }}
              style={{ paddingHorizontal: v11Spacing.lg, paddingTop: v11Spacing.sm, paddingBottom: v11Spacing.sm }}
            >
              <Text
                numberOfLines={2}
                style={{
                  flex: 1,
                  flexShrink: 1,
                  minWidth: 0,
                  color: theme.text.primary,
                  ...v11Typography.title,
                }}
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
            <WebScrollView
              contentContainerStyle={{
                paddingHorizontal: v11Spacing.lg,
                paddingTop: v11Spacing.xs,
                paddingBottom: footer ? v11Spacing.lg : v11Spacing.section,
              }}
              dataSet={{ 'v11-rebaseline-role': 'production-sheet-scroll' }}
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              style={{ minHeight: 0, flexShrink: 1 }}
            >
              <WebView dataSet={{ 'v11-rebaseline-role': 'production-sheet-content' }}>
                {children}
              </WebView>
            </WebScrollView>
            {footer ? (
              <WebView
                dataSet={{ 'v11-rebaseline-role': 'production-sheet-footer' }}
                style={{ paddingHorizontal: v11Spacing.lg, paddingTop: v11Spacing.sm }}
              >
                {footer}
              </WebView>
            ) : null}
          </V11GlassSheet>
        </WebView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
