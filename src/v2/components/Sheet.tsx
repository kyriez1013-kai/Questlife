import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, ScrollView, View } from 'react-native';
import { useV2Theme } from '../theme';

/**
 * Bottom sheet as an in-tree overlay (NOT RN <Modal>): same behaviour on Web and iOS,
 * no opaque-fallback surprises, parent state survives. Footer is sticky so the primary
 * action is never pushed under the keyboard or the fold.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled?.().then((v) => { if (alive) setReduced(!!v); }).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v: boolean) => setReduced(!!v));
    return () => { alive = false; (sub as { remove?: () => void } | undefined)?.remove?.(); };
  }, []);
  return reduced;
}

export function Sheet({ open, onClose, children, footer, testID, dismissable = true, maxHeightPct = 0.88 }: {
  open: boolean; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; testID?: string; dismissable?: boolean; maxHeightPct?: number;
}) {
  const t = useV2Theme();
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(open ? 1 : 0)).current;
  const [mounted, setMounted] = React.useState(open);

  useEffect(() => {
    if (open) setMounted(true);
    const anim = Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: reduced ? t.motion.fast : t.motion.base,
      easing: Easing.bezier(...t.motion.easing),
      useNativeDriver: true,
    });
    anim.start(({ finished }) => { if (finished && !open) setMounted(false); });
    return () => anim.stop();
  }, [open, reduced, progress, t.motion]);

  if (!mounted) return null;
  const translateY = reduced ? 0 : progress.interpolate({ inputRange: [0, 1], outputRange: [48, 0] });
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end', zIndex: 50 }}>
      <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: t.color.overlay, opacity: progress }}>
        <Pressable accessibilityLabel="关闭" accessibilityRole="button" style={{ flex: 1 }} onPress={dismissable ? onClose : undefined} />
      </Animated.View>
      <Animated.View
        testID={testID}
        accessibilityViewIsModal
        style={{
          alignSelf: 'center', width: '100%', maxWidth: t.layout.maxWidth, maxHeight: `${Math.round(maxHeightPct * 100)}%` as never,
          backgroundColor: t.color.bg, borderTopLeftRadius: t.radius.lg, borderTopRightRadius: t.radius.lg,
          opacity: progress, transform: [{ translateY }],
          borderWidth: t.surfaceStyle === 'flat' ? 1 : 0, borderBottomWidth: 0, borderColor: t.color.hairline,
        }}
      >
        <View style={{ alignItems: 'center', paddingTop: t.space.sm }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: t.color.hairline }} />
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: t.space.lg, paddingTop: t.space.sm, paddingBottom: t.space.md, gap: t.space.md }} style={{ flexShrink: 1 }}>
          {children}
        </ScrollView>
        {footer ? <View style={{ padding: t.space.lg, paddingTop: t.space.sm, borderTopWidth: 1, borderTopColor: t.color.hairline, backgroundColor: t.color.bg, gap: t.space.sm }}>{footer}</View> : null}
      </Animated.View>
    </View>
  );
}
