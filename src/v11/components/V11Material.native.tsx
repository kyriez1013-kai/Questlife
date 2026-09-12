import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import V11DirectionalBorder from './V11DirectionalBorder';
import type { V11PillProps, V11GlassSheetProps } from './V11Material';
export type { V11PillProps, V11GlassSheetProps } from './V11Material';

function Material({ children, theme, style, contentStyle, fallback, radius, minHeight, onPress, accessibilityLabel }: V11GlassSheetProps & { radius: number; minHeight: number }) {
  const content = <>
    <View style={{ borderRadius: radius, overflow: 'hidden', minHeight }}>
      {fallback ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: theme.material.fallback }]} />
        : <BlurView pointerEvents="none" intensity={28} tint={theme.mode === 'dark' ? 'dark' : 'light'} experimentalBlurMethod="dimezisBlurView" style={StyleSheet.absoluteFill} />}
      <View style={[{ minHeight, justifyContent: 'center', backgroundColor: fallback ? 'transparent' : theme.material.glassBase }, contentStyle]}>{children}</View>
      <LinearGradient pointerEvents="none" colors={[theme.material.highlight, 'transparent']} style={{ position: 'absolute', top: 0, left: radius / 2, right: radius / 2, height: 1, opacity: theme.material.upperHighlightOpacity }} />
    </View>
    <V11DirectionalBorder radius={radius} theme={theme} />
  </>;
  const shell = [{ minHeight, borderRadius: radius, shadowColor: theme.material.shadow, shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, shadowOpacity: theme.material.outerShadowOpacity, elevation: 3 }, style];
  return onPress ? <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={({ pressed }) => [shell, { opacity: pressed ? 0.85 : 1 }]}>{content}</Pressable> : <View style={shell}>{content}</View>;
}
export function V11Pill({ height = 64, ...props }: V11PillProps) { return <Material {...props} radius={height / 2} minHeight={height} />; }
export function V11GlassSheet({ minHeight = 160, radius = 24, ...props }: V11GlassSheetProps) { return <Material {...props} radius={radius} minHeight={minHeight} />; }
