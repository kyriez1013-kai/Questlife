import React, { createContext, useContext, useMemo } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { getNativeFoundation, nativeMaterialKind, useNativeAccessibility } from '../../design/nativeFoundation';
import { questLayout } from '../../design/tokens';
import { v11EvidenceVisual } from '../tokens';
import type { V11PillProps, V11GlassSheetProps } from './V11Material';
export type { V11PillProps, V11GlassSheetProps } from './V11Material';

type NativeGlassModule = typeof import('expo-glass-effect');
let nativeGlass: NativeGlassModule | null | undefined;
const MaterialDepthContext = createContext(false);

export function resolveNativeGlass(platform: string, version: string | number) {
  if (platform !== 'ios' || !(Number.parseInt(String(version), 10) >= 26)) return undefined;
  if (nativeGlass !== undefined) return nativeGlass ?? undefined;
  nativeGlass = null;
  try {
    // Do not evaluate the native view manager in an older installed binary.
    if (!requireOptionalNativeModule('ExpoGlassEffect')) return undefined;
    const glass: NativeGlassModule = require('expo-glass-effect');
    if (glass.isGlassEffectAPIAvailable() && glass.isLiquidGlassAvailable()) nativeGlass = glass;
  } catch {
    // Missing native registration or an unavailable beta API keeps the frost.
  }
  return nativeGlass ?? undefined;
}

function Material({ children, theme, style, contentStyle, fallback, radius, minHeight, onPress, accessibilityLabel, reducedMotion, stage = 'S3', sheet = false }: V11GlassSheetProps & { radius: number; minHeight: number; sheet?: boolean }) {
  const f = useMemo(() => getNativeFoundation(theme.questTheme), [theme.questTheme]);
  const accessibility = useNativeAccessibility();
  const nested = useContext(MaterialDepthContext);
  const opaque = accessibility.reduceTransparency || fallback || nested || sheet;
  const glass = opaque ? undefined : resolveNativeGlass(Platform.OS, Platform.Version);
  const kind = nativeMaterialKind({ platform: Platform.OS, reduceTransparency: accessibility.reduceTransparency, fallback, nested, sheet, glassAvailable: !!glass });
  const Glass = glass?.GlassView;
  const interactive = !reducedMotion && !accessibility.reduceMotion && !!onPress;
  const height = Math.max(onPress ? f.layout.touch : 0, minHeight);
  const shape = { borderRadius: radius };
  const shell = [
    {
      ...shape,
      shadowColor: f.material.shadow,
      shadowOffset: f.surface.shadowOffset,
      shadowRadius: f.surface.shadowRadius,
      shadowOpacity: nested ? 0 : f.surface.shadowOpacity,
      elevation: nested ? 0 : f.surface.elevation,
    },
    style,
    { minHeight: height, minWidth: onPress ? f.layout.touch : 0 },
  ];
  const content = (
    <MaterialDepthContext.Provider value>
      <View style={[shape, { overflow: 'hidden', minHeight: height, flexGrow: 1, flexShrink: 1 }]}>
        <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
          {kind === 'glass' && Glass ? <Glass key={interactive ? 'interactive' : 'static'} glassEffectStyle="regular" colorScheme={theme.mode} isInteractive={interactive} style={[StyleSheet.absoluteFill, shape]} /> : null}
          {kind === 'blur' ? <BlurView intensity={f.surface.blurIntensity} tint={theme.mode === 'dark' ? 'systemMaterialDark' : 'systemMaterialLight'} style={StyleSheet.absoluteFill} /> : null}
          <LinearGradient
            colors={f.surface.colors}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { opacity: kind === 'opaque' ? 1 : kind === 'glass' ? f.surface.glassVeilOpacity : f.surface.frostOpacity }]}
          />
          <View style={[StyleSheet.absoluteFill, shape, { borderWidth: StyleSheet.hairlineWidth, borderColor: f.surface.edge }]} />
          <View style={[StyleSheet.absoluteFill, shape, { borderTopWidth: StyleSheet.hairlineWidth, borderColor: f.surface.highlight, opacity: f.surface.edgeOpacity * v11EvidenceVisual[stage].edgeStrength }]} />
        </View>
        <View style={[{ justifyContent: 'center', flexGrow: 1, flexShrink: 1 }, contentStyle, { minHeight: height }]}>{children}</View>
      </View>
    </MaterialDepthContext.Provider>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={shell}>
      {({ pressed }) => <>
        {content}
        {pressed ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, shape, { backgroundColor: f.interaction.pressed }]} /> : null}
      </>}
    </Pressable>
  ) : <View style={shell}>{content}</View>;
}

export function V11Pill({ height = questLayout.editCardMinHeight.medium, ...props }: V11PillProps) {
  return <Material {...props} radius={Math.max(questLayout.controlMinHeight, height) / 2} minHeight={height} />;
}

export function V11GlassSheet({ minHeight = questLayout.editCardMinHeight.large * 2, radius, ...props }: V11GlassSheetProps) {
  return <Material {...props} radius={radius ?? props.theme.questTheme.radius.xxl} minHeight={minHeight} sheet />;
}
