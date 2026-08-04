import React, { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  Text,
  View,
} from 'react-native';
import { t, type Lang } from '../i18n';
import type { V11ThemeTokens } from '../v11/tokens';

const WebView = View as any;
const WebPressable = Pressable as any;
const VALUES = [1, 2, 3, 4, 5] as const;

type CalibrationStatus = 'idle' | 'saving' | 'saved' | 'error';

type Props = {
  accessibilityLabel: string;
  language: Lang;
  onSelect: (value: number) => void;
  reducedMotion: boolean;
  selectedValue: number | null;
  showSelectedMeaning?: boolean;
  status?: CalibrationStatus;
  theme: V11ThemeTokens;
  variant?: 'today' | 'sheet';
};

function stateLabelKey(value: number) {
  return ['veryBad', 'bad', 'average', 'good', 'great'][Math.max(0, Math.min(4, value - 1))];
}

function clampValue(value: number) {
  return Math.max(1, Math.min(5, value));
}

export default function V11CalibrationRail({
  accessibilityLabel,
  language,
  onSelect,
  reducedMotion,
  selectedValue,
  showSelectedMeaning = true,
  status = 'idle',
  theme,
  variant = 'today',
}: Props) {
  const railRef = useRef<any>(null);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const suppressPressRef = useRef(false);
  const [touching, setTouching] = useState(false);
  const [previewValue, setPreviewValue] = useState<number | null>(selectedValue);
  const disabled = status === 'saving';

  useEffect(() => {
    setPreviewValue(selectedValue);
  }, [selectedValue]);

  const valueFromClientX = (clientX: number) => {
    const rect = railRef.current?.getBoundingClientRect?.();
    if (!rect || rect.width <= 0) return previewValue ?? selectedValue ?? 1;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return clampValue(Math.round(ratio * 4) + 1);
  };

  const pointerClientX = (event: any) => (
    event?.nativeEvent?.clientX ?? event?.clientX ?? 0
  );

  const onPointerDown = (event: any) => {
    if (disabled) return;
    const clientX = pointerClientX(event);
    draggingRef.current = true;
    startXRef.current = clientX;
    setTouching(true);
    setPreviewValue(valueFromClientX(clientX));
    event.currentTarget?.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: any) => {
    if (!draggingRef.current || disabled) return;
    const clientX = pointerClientX(event);
    if (Math.abs(clientX - startXRef.current) <= 3) return;
    setPreviewValue(valueFromClientX(clientX));
  };

  const finishPointer = (event: any) => {
    if (!draggingRef.current || disabled) return;
    const nextValue = valueFromClientX(pointerClientX(event));
    draggingRef.current = false;
    setTouching(false);
    setPreviewValue(nextValue);
    suppressPressRef.current = true;
    onSelect(nextValue);
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        suppressPressRef.current = false;
      }, 0);
    } else {
      suppressPressRef.current = false;
    }
  };

  const cancelPointer = () => {
    draggingRef.current = false;
    setTouching(false);
    setPreviewValue(selectedValue);
  };

  const selectFromPress = (value: number) => {
    if (disabled || suppressPressRef.current) return;
    setPreviewValue(value);
    onSelect(value);
  };

  const selectFromKeyboard = (event: any, value: number) => {
    if (disabled) return;
    let nextValue: number | null = null;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') nextValue = clampValue(value - 1);
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') nextValue = clampValue(value + 1);
    if (event.key === 'Home') nextValue = 1;
    if (event.key === 'End') nextValue = 5;
    if (nextValue == null) return;
    event.preventDefault?.();
    setPreviewValue(nextValue);
    onSelect(nextValue);
  };

  const centreLabel = showSelectedMeaning && previewValue != null
    ? `${previewValue} · ${t(language, stateLabelKey(previewValue))}`
    : `3 · ${t(language, 'average')}`;

  return (
    <WebView
      accessibilityLabel={accessibilityLabel}
      dataSet={{
        'v11-calibration-status': status,
        'v11-calibration-touching': touching ? 'true' : 'false',
        'v11-calibration-value': previewValue == null ? 'none' : String(previewValue),
        'v11-calibration-variant': variant,
        'v11-rebaseline-role': 'calibration-rail',
      }}
      onPointerCancel={cancelPointer}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishPointer}
      ref={railRef}
      style={{
        '--v11-calibration-tone': theme.glow.primary,
        '--v11-calibration-text': theme.text.primary,
        '--v11-calibration-secondary': theme.text.secondary,
        '--v11-calibration-metadata': theme.text.metadata,
        '--v11-calibration-surface': theme.questTheme.colors.surfaceElevated,
        '--v11-calibration-border': theme.questTheme.colors.border,
        '--v11-calibration-duration': reducedMotion ? '0.001ms' : '120ms',
      } as any}
    >
      <WebView dataSet={{ 'v11-rebaseline-role': 'calibration-track' }}>
        <WebView dataSet={{ 'v11-rebaseline-role': 'calibration-line' }} pointerEvents="none" />
        {VALUES.map((value) => {
          const selected = previewValue === value;
          return (
            <WebPressable
              accessibilityLabel={`${accessibilityLabel} ${value} ${t(language, stateLabelKey(value))}`}
              accessibilityRole="button"
              accessibilityState={{ disabled, selected }}
              dataSet={{
                'v11-rebaseline-role': 'calibration-stop',
                'v11-selected': selected ? 'true' : 'false',
              }}
              disabled={disabled}
              key={value}
              onKeyDown={(event: any) => selectFromKeyboard(event, value)}
              onPress={() => selectFromPress(value)}
            >
              <Text style={{ color: theme.text.secondary, fontSize: 11, lineHeight: 15, fontWeight: '500' }}>
                {value}
              </Text>
              <WebView dataSet={{ 'v11-rebaseline-role': 'calibration-marker' }} />
            </WebPressable>
          );
        })}
      </WebView>
      <WebView dataSet={{ 'v11-rebaseline-role': 'calibration-labels' }}>
        <Text numberOfLines={2} style={{ color: theme.text.secondary, fontSize: 10, lineHeight: 14 }}>
          {t(language, 'veryBad')}
        </Text>
        <Text numberOfLines={2} style={{ color: previewValue != null ? theme.text.primary : theme.text.secondary, fontSize: 10, lineHeight: 14, textAlign: 'center' }}>
          {centreLabel}
        </Text>
        <Text numberOfLines={2} style={{ color: theme.text.secondary, fontSize: 10, lineHeight: 14, textAlign: 'right' }}>
          {t(language, 'great')}
        </Text>
      </WebView>
    </WebView>
  );
}
