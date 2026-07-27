import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

export function useQuestReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReducedMotion(enabled);
      })
      .catch(() => undefined);

    const subscription = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReducedMotion);
    const mediaQuery = Platform.OS === 'web' && typeof window !== 'undefined'
      ? window.matchMedia?.('(prefers-reduced-motion: reduce)')
      : undefined;
    const onMediaChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    if (mediaQuery) {
      setReducedMotion(mediaQuery.matches);
      mediaQuery.addEventListener?.('change', onMediaChange);
    }

    return () => {
      mounted = false;
      subscription?.remove?.();
      mediaQuery?.removeEventListener?.('change', onMediaChange);
    };
  }, []);

  return reducedMotion;
}
