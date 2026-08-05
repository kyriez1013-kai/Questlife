import React, { useEffect, useId } from 'react';
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
import {
  v11Motion,
  v11SheetLayout,
  v11Typography,
} from '../v11/tokens';
import { V11GlassSheet } from '../v11/components/V11Material';
import V11RebaselineIcon from './V11RebaselineIcon';
import {
  isV11SheetGeometryDebugEnabled,
  publishV11SheetGeometryDebug,
} from './v11SheetGeometry';
import { scheduleV11SheetControlAudit } from '../v11/sheetControlAudit';
import './v11-stage2-rebaseline.css';

const WebView = View as any;
const WebPressable = Pressable as any;
const WebScrollView = ScrollView as any;
const WebText = Text as any;

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
  const instanceId = useId();
  const debugSafeArea = isV11SheetGeometryDebugEnabled();

  useEffect(() => {
    if (!visible || !debugSafeArea || typeof window === 'undefined') return;
    const timeout = window.setTimeout(
      publishV11SheetGeometryDebug,
      reducedMotion ? 0 : v11Motion.duration.standard + 40,
    );
    return () => window.clearTimeout(timeout);
  }, [children, debugSafeArea, footer, reducedMotion, sheet, title, visible]);

  useEffect(() => {
    if (!visible) return;
    const timeout = scheduleV11SheetControlAudit(
      reducedMotion ? 0 : v11Motion.duration.standard + 40,
    );
    return () => {
      if (timeout != null && typeof window !== 'undefined') window.clearTimeout(timeout);
    };
  }, [children, footer, reducedMotion, sheet, title, visible]);

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
            '--v11-sheet-content-padding-bottom': `${v11SheetLayout.contentPaddingBottom}px`,
            '--v11-sheet-content-padding-inline': `${v11SheetLayout.contentPaddingInline}px`,
            '--v11-sheet-content-padding-inline-narrow': `${v11SheetLayout.contentPaddingInlineNarrow}px`,
            '--v11-sheet-content-padding-top': `${v11SheetLayout.contentPaddingTop}px`,
            '--v11-sheet-footer-gap': `${v11SheetLayout.footerGap}px`,
            '--v11-sheet-header-action-slot': `${v11SheetLayout.headerActionSlot}px`,
            '--v11-sheet-header-gap': `${v11SheetLayout.headerGap}px`,
            '--v11-sheet-viewport-inset-inline': `${v11SheetLayout.viewportInsetInline}px`,
            '--v11-sheet-viewport-inset-top': `${v11SheetLayout.viewportInsetTop}px`,
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
              paddingTop: 0,
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
              dataSet={{
                'v11-component-name': `V11Stage2ProductionSheet:${sheet}`,
                'v11-debug-safe-area': debugSafeArea ? 'true' : 'false',
                'v11-rebaseline-role': 'sheet-content-safe',
                'v11-sheet-instance': instanceId,
              }}
            >
              <WebView dataSet={{ 'v11-rebaseline-role': 'sheet-header' }}>
                <WebView dataSet={{ 'v11-rebaseline-role': 'sheet-header-copy' }}>
                  <WebText
                    dataSet={{ 'v11-geometry-node': 'sheet-title' }}
                    style={{
                      color: theme.text.primary,
                      ...v11Typography.title,
                    }}
                  >
                    {title}
                  </WebText>
                </WebView>
                <WebView dataSet={{ 'v11-rebaseline-role': 'sheet-header-action-slot' }}>
                  <WebPressable
                    accessibilityLabel={closeLabel}
                    accessibilityRole="button"
                    dataSet={{ 'v11-rebaseline-role': 'icon-button' }}
                    onPress={onClose}
                  >
                    <V11RebaselineIcon name="close" size={19} color={theme.text.secondary} />
                  </WebPressable>
                </WebView>
              </WebView>
              <WebScrollView
                contentContainerStyle={{
                  paddingTop: v11SheetLayout.contentPaddingTop,
                  paddingBottom: footer
                    ? v11SheetLayout.footerGap
                    : v11SheetLayout.contentPaddingBottom,
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
                <WebView dataSet={{ 'v11-rebaseline-role': 'production-sheet-footer' }}>
                  {footer}
                </WebView>
              ) : null}
            </WebView>
          </V11GlassSheet>
        </WebView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
