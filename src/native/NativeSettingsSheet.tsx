import React, { useCallback, useRef, useState } from 'react';
import { Text } from 'react-native';
import BottomSheetForm from '../components/BottomSheetForm';
import { nativeCopy } from '../platform/nativeI18n';
import { useNativeTheme } from './NativeControls';
import { AsyncInteractionContext, AsyncInteractionGuard } from '../components/AsyncInteractionBoundary';

export default function NativeSettingsSheet({ children, lang, canClose, onClose }: {
  children: React.ReactNode;
  lang: 'zh' | 'en';
  canClose: () => boolean;
  onClose: () => void;
}) {
  const pending = useRef(new Set<object>());
  const [blocked, setBlocked] = useState(false);
  const f = useNativeTheme();
  const report = useCallback((key: object, busy: boolean) => {
    if (busy) pending.current.add(key);
    else pending.current.delete(key);
  }, []);
  const guard = (action: () => void) => {
    if (pending.current.size || !canClose()) { setBlocked(true); return; }
    action();
  };
  return <AsyncInteractionContext.Provider value={report}>
    <AsyncInteractionGuard.Provider value={guard}>
    <BottomSheetForm visible onClose={() => guard(onClose)} closeAccessibilityLabel={nativeCopy(lang, 'closeSettingsDetails')}>
      {children}
      {blocked ? <Text accessibilityLiveRegion="polite" style={[f.type.secondary, { color: f.text.secondary }]}>{nativeCopy(lang, 'settingsWait')}</Text> : null}
    </BottomSheetForm>
    </AsyncInteractionGuard.Provider>
  </AsyncInteractionContext.Provider>;
}
