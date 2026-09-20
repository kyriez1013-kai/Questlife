import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getNativeFoundation, useNativeAccessibility } from '../../design/nativeFoundation';
import type ProductionSheet from '../../v11-stage2-rebaseline/V11Stage2ProductionSheet';
import V11RebaselineIcon from '../../v11-stage2-rebaseline/V11RebaselineIcon';
import { V11GlassSheet } from './V11Material.native';

type NativeSheetProps = Omit<React.ComponentProps<typeof ProductionSheet>, 'title'> & { title?: string };

export default function V11NativeSheet({ children, closeLabel, footer, minHeight = 350, onClose, reducedMotion, theme, title, visible }: NativeSheetProps) {
  const f = useMemo(() => getNativeFoundation(theme.questTheme), [theme.questTheme]);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const accessibility = useNativeAccessibility();
  const heading = useRef<Text>(null);
  const closeButton = useRef<View>(null);
  const scrollView = useRef<ScrollView>(null);
  const focusedInput = useRef<ReturnType<typeof TextInput.State.currentlyFocusedInput> | null>(null);
  const scrollOffset = useRef(0);
  const scrollFrame = useRef<number | null>(null);
  const focusFrame = useRef<number | null>(null);
  const isVisible = useRef(visible);
  isVisible.current = visible;
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(f.layout.touch + f.layout.gap * 2);
  const [footerHeight, setFooterHeight] = useState(0);
  const bottomInset = keyboardVisible ? f.spacing.sm : Math.max(insets.bottom, f.spacing.sm);
  const available = viewportHeight || Math.max(0, height - insets.top - f.layout.gap);
  const compact = available < headerHeight + footerHeight + bottomInset + f.layout.touch * 2;
  const close = useCallback(() => { Keyboard.dismiss(); onClose(); }, [onClose]);
  const revealFocusedInput = useCallback(() => {
    if (scrollFrame.current !== null) cancelAnimationFrame(scrollFrame.current);
    scrollFrame.current = requestAnimationFrame(() => {
      scrollFrame.current = null;
      const input = focusedInput.current;
      const scroll = scrollView.current;
      const viewport = scroll?.getNativeScrollRef();
      if (!isVisible.current || !input || !viewport) return;
      input.measureInWindow((_x, inputY, _width, inputHeight) => {
        viewport.measureInWindow((_left, top, _w, viewportHeight) => {
          if (!isVisible.current || focusedInput.current !== input || scrollView.current !== scroll || viewportHeight <= 0) return;
          // Measure against the actual body, not the full screen: pinned
          // footers and keyboard-resized sheets both reduce the usable area.
          const topDelta = inputY - top - f.spacing.sm;
          const bottomDelta = inputY + inputHeight - top - viewportHeight + f.spacing.sm;
          const delta = inputHeight > viewportHeight - f.spacing.sm * 2 || topDelta < 0
            ? topDelta : Math.max(0, bottomDelta);
          if (delta !== 0) scroll?.scrollTo({ y: Math.max(0, scrollOffset.current + delta), animated: !reducedMotion && !accessibility.reduceMotion });
        });
      });
    });
  }, [accessibility.reduceMotion, f.spacing.sm, reducedMotion]);

  useEffect(() => {
    if (!visible) return;
    setKeyboardVisible(Keyboard.isVisible());
    const show = Keyboard.addListener('keyboardDidShow', () => { setKeyboardVisible(true); revealFocusedInput(); });
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, [visible, revealFocusedInput]);

  useEffect(() => () => {
    if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
    if (scrollFrame.current !== null) cancelAnimationFrame(scrollFrame.current);
    focusedInput.current = null;
    scrollOffset.current = 0;
  }, [visible]);

  const focusHeading = () => {
    if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
    focusFrame.current = requestAnimationFrame(() => {
      focusFrame.current = null;
      const target = heading.current ?? closeButton.current;
      if (target) AccessibilityInfo.sendAccessibilityEvent(target, 'focus');
    });
  };
  const header = <View onLayout={event => setHeaderHeight(event.nativeEvent.layout.height)} style={{ paddingHorizontal: f.layout.gutter, paddingVertical: f.layout.gap, flexDirection: 'row', alignItems: 'flex-start', gap: f.layout.gap }}>
    {title ? <Text ref={heading} accessible accessibilityRole="header" style={[f.type.title, { flex: 1, minWidth: 0, color: theme.text.primary, paddingVertical: f.spacing.sm }]}>{title}</Text> : <View style={{ flex: 1 }} />}
    <Pressable ref={closeButton} accessibilityRole="button" accessibilityLabel={closeLabel} onPress={close} style={({ pressed }) => ({ width: f.layout.touch, height: f.layout.touch, flexShrink: 0, justifyContent: 'center', alignItems: 'center', borderRadius: f.layout.radius, backgroundColor: pressed ? f.material.muted : f.material.translucent })}>
      <V11RebaselineIcon name="close" size={f.typography.title} color={theme.text.primary} />
    </Pressable>
  </View>;
  const footerContent = footer ? <View onLayout={event => setFooterHeight(event.nativeEvent.layout.height)} style={{ paddingHorizontal: f.layout.gutter, paddingTop: f.layout.gap, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.control.borderSubtle }}>{footer}</View> : null;

  return <Modal transparent presentationStyle="overFullScreen" animationType={reducedMotion || accessibility.reduceMotion ? 'none' : 'fade'} visible={visible} onRequestClose={close} onShow={focusHeading} statusBarTranslucent navigationBarTranslucent>
    <View style={{ flex: 1 }}>
      <Pressable accessible={false} importantForAccessibility="no-hide-descendants" onPress={close} style={[StyleSheet.absoluteFill, { backgroundColor: f.material.overlay }]} />
      <KeyboardAvoidingView pointerEvents="box-none" behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, paddingTop: insets.top + f.layout.gap }}>
        <View pointerEvents="box-none" onLayout={event => setViewportHeight(event.nativeEvent.layout.height)} style={{ flex: 1, justifyContent: 'flex-end', paddingLeft: insets.left, paddingRight: insets.right }}>
          <V11GlassSheet minHeight={Math.min(minHeight, available)} theme={theme} reducedMotion={reducedMotion} style={{ maxHeight: '100%', width: '100%', maxWidth: f.layout.sheetMaxWidth, alignSelf: 'center' }} contentStyle={{ justifyContent: 'flex-start' }}>
            <View accessibilityViewIsModal onAccessibilityEscape={close} style={{ flexGrow: 1, flexShrink: 1, paddingBottom: bottomInset }}>
              {compact ? null : header}
              <ScrollView
                ref={scrollView}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                contentInsetAdjustmentBehavior="never"
                automaticallyAdjustKeyboardInsets={false}
                nestedScrollEnabled
                onLayout={revealFocusedInput}
                onScroll={event => { scrollOffset.current = event.nativeEvent.contentOffset.y; }}
                scrollEventThrottle={16}
                style={{ flexShrink: 1 }}
                contentContainerStyle={{ paddingBottom: f.layout.gutter }}
              >
                {compact ? header : null}
                <View onFocus={() => { focusedInput.current = TextInput.State.currentlyFocusedInput(); revealFocusedInput(); }} onBlur={() => { focusedInput.current = null; }} style={{ paddingHorizontal: f.layout.gutter }}>{children}</View>
                {compact ? footerContent : null}
              </ScrollView>
              {compact ? null : footerContent}
            </View>
          </V11GlassSheet>
        </View>
      </KeyboardAvoidingView>
    </View>
  </Modal>;
}
