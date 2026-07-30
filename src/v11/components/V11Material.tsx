import React, {
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import {
  V11EvidenceStage,
  V11ThemeTokens,
  v11EvidenceVisual,
  v11Motion,
  v11Radius,
} from '../tokens';
import V11DirectionalBorder from './V11DirectionalBorder';

const WebView = View as any;
const WebPressable = Pressable as any;

type MaterialFrameProps = {
  accessibilityLabel?: string;
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  fallback?: boolean;
  minHeight: number;
  onPress?: () => void;
  radius: number;
  reducedMotion?: boolean;
  stage?: V11EvidenceStage;
  style?: StyleProp<ViewStyle>;
  theme: V11ThemeTokens;
  variant: 'pill' | 'sheet';
};

function MaterialClip({
  children,
  contentStyle,
  fallback,
  radius,
  theme,
  variant,
}: {
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  fallback: boolean;
  radius: number;
  theme: V11ThemeTokens;
  variant: 'pill' | 'sheet';
}) {
  const flattenedStyle = StyleSheet.flatten(contentStyle) ?? {};

  if (Platform.OS === 'web') {
    return React.createElement(
      'div',
      {
        'data-v11-component': 'material-clip',
        'data-v11-material': fallback ? 'fallback' : 'glass',
        'data-v11-variant': variant,
        style: {
          ...flattenedStyle,
          borderRadius: radius,
          backdropFilter: fallback
            ? 'none'
            : `blur(${theme.material.blur}px) saturate(${theme.material.saturation * 100}%)`,
          WebkitBackdropFilter: fallback
            ? 'none'
            : `blur(${theme.material.blur}px) saturate(${theme.material.saturation * 100}%)`,
        },
      },
      children,
    );
  }

  return (
    <View
      style={[
        {
          borderRadius: radius,
          backgroundColor: fallback
            ? theme.material.fallback
            : theme.questTheme.colors.cardSurface,
        },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );
}

function V11MaterialFrame({
  accessibilityLabel,
  children,
  contentStyle,
  fallback = false,
  minHeight,
  onPress,
  radius,
  reducedMotion = false,
  stage = 'S3',
  style,
  theme,
  variant,
}: MaterialFrameProps) {
  const [sweeping, setSweeping] = useState(false);
  const sweepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const evidence = v11EvidenceVisual[stage];

  useEffect(() => () => {
    if (sweepTimerRef.current) clearTimeout(sweepTimerRef.current);
  }, []);

  const trigger = () => {
    if (!reducedMotion) {
      if (sweepTimerRef.current) clearTimeout(sweepTimerRef.current);
      setSweeping(false);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.requestAnimationFrame(() => setSweeping(true));
      } else {
        setSweeping(true);
      }
      sweepTimerRef.current = setTimeout(
        () => setSweeping(false),
        v11Motion.duration.instant,
      );
    }
    onPress?.();
  };

  const frameStyle = [
    {
      minHeight,
      borderRadius: radius,
      '--v11-material-glass': theme.material.glassBase,
      '--v11-material-fallback': theme.material.fallback,
      '--v11-material-highlight': theme.material.highlight,
      '--v11-material-shadow': theme.material.shadow,
      '--v11-material-primary': theme.glow.primary,
      '--v11-material-supporting': theme.glow.supporting,
      '--v11-material-upper-opacity': String(theme.material.upperHighlightOpacity),
      '--v11-material-shadow-opacity': `${Math.round(theme.material.outerShadowOpacity * 100)}%`,
    },
    style,
  ];

  const layers = (
    <>
      <WebView
        pointerEvents="none"
        dataSet={{
          'v11-component': 'material-light-field',
          'v11-variant': variant,
        }}
      />
      <MaterialClip
        contentStyle={contentStyle}
        fallback={fallback}
        radius={radius}
        theme={theme}
        variant={variant}
      >
        {children}
      </MaterialClip>
      <V11DirectionalBorder
        radius={radius}
        strength={evidence.edgeStrength}
        theme={theme}
      />
    </>
  );

  const dataSet = {
    'v11-component': 'material-frame',
    'v11-fallback': fallback ? 'true' : 'false',
    'v11-stage': stage.toLowerCase(),
    'v11-sweeping': sweeping ? 'true' : 'false',
    'v11-variant': variant,
  };

  if (onPress) {
    return (
      <WebPressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        dataSet={dataSet}
        onPress={trigger}
        style={frameStyle}
      >
        {layers}
      </WebPressable>
    );
  }

  return (
    <WebView dataSet={dataSet} style={frameStyle}>
      {layers}
    </WebView>
  );
}

export type V11PillProps = Omit<
  MaterialFrameProps,
  'minHeight' | 'radius' | 'variant'
> & {
  height?: number;
};

export function V11Pill({
  height = 64,
  ...props
}: V11PillProps) {
  return (
    <V11MaterialFrame
      {...props}
      minHeight={height}
      radius={height / 2}
      variant="pill"
    />
  );
}

export type V11GlassSheetProps = Omit<
  MaterialFrameProps,
  'minHeight' | 'radius' | 'variant'
> & {
  minHeight?: number;
  radius?: number;
};

export function V11GlassSheet({
  minHeight = 160,
  radius = v11Radius.sheet,
  ...props
}: V11GlassSheetProps) {
  return (
    <V11MaterialFrame
      {...props}
      minHeight={minHeight}
      radius={radius}
      variant="sheet"
    />
  );
}
