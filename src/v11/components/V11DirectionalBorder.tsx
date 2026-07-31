import React, {
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  LayoutChangeEvent,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import {
  V11ThemeTokens,
  v11DirectionalBorder,
} from '../tokens';

const WebView = View as any;

export type V11DirectionalBorderProps = {
  radius: number;
  theme: V11ThemeTokens;
  strength?: number;
};

export default function V11DirectionalBorder({
  radius,
  strength = 1,
  theme,
}: V11DirectionalBorderProps) {
  const gradientId = `v11DirectionalBorder${useId().replace(/:/g, '')}`;
  const edgeRef = useRef<HTMLElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const strokeWidth = v11DirectionalBorder.strokeWidth;
  const inset = strokeWidth / 2;
  const rectWidth = Math.max(0, size.width - strokeWidth);
  const rectHeight = Math.max(0, size.height - strokeWidth);
  const isPill = radius >= size.height / 2;
  const resolvedRadius = isPill
    ? rectHeight / 2
    : Math.min(Math.max(0, radius - inset), rectHeight / 2);

  const handleLayout = (event: LayoutChangeEvent) => {
    if (Platform.OS === 'web') return;
    const { width, height } = event.nativeEvent.layout;
    setSize((current) => (
      current.width === width && current.height === height
        ? current
        : { width, height }
    ));
  };

  useLayoutEffect(() => {
    if (Platform.OS !== 'web') return;
    const element = edgeRef.current;
    if (!element) return;

    const syncSize = () => {
      const { width, height } = element.getBoundingClientRect();
      setSize((current) => (
        current.width === width && current.height === height
          ? current
          : { width, height }
      ));
    };

    syncSize();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(syncSize);
      observer.observe(element);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', syncSize);
    return () => window.removeEventListener('resize', syncSize);
  }, []);

  return (
    <WebView
      ref={edgeRef}
      pointerEvents="none"
      dataSet={{
        'v11-component': 'directional-border',
        'v11-stroke-width': String(strokeWidth),
      }}
      onLayout={handleLayout}
      style={[StyleSheet.absoluteFill, { borderRadius: radius, zIndex: 3 }]}
    >
      {size.width > 0 && size.height > 0 ? (
        <Svg
          pointerEvents="none"
          width={size.width}
          height={size.height}
          viewBox={`0 0 ${size.width} ${size.height}`}
          preserveAspectRatio="none"
        >
          <Defs>
            <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              {v11DirectionalBorder.stops.map((stop, index) => (
                <Stop
                  key={stop.offset}
                  offset={stop.offset}
                  stopColor={index < 2 ? theme.material.highlight : theme.text.primary}
                  stopOpacity={stop.opacity * strength}
                />
              ))}
            </LinearGradient>
          </Defs>
          <Rect
            x={inset}
            y={inset}
            width={rectWidth}
            height={rectHeight}
            rx={resolvedRadius}
            ry={resolvedRadius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={strokeWidth}
            vectorEffect="non-scaling-stroke"
          />
        </Svg>
      ) : null}
    </WebView>
  );
}
