import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { getQuestTheme, QuestTheme } from '../../design/tokens';
import { getSurfaceStyle } from '../../design/surfaces';
import { guardDarkSurfaceStyle, SurfaceRole } from '../../design/darkSurfaceGuard';

type Props = {
  children: React.ReactNode;
  variant?: 'hero' | 'action' | 'data' | 'emergency' | 'flat';
  questTheme?: QuestTheme;
  style?: ViewStyle | ViewStyle[];
  className?: string;
};

export default function QuestCard({ children, variant = 'data', questTheme, style, className }: Props) {
  const q = questTheme ?? getQuestTheme();
  const surfaceRole: SurfaceRole =
    variant === 'hero' ? 'elevated'
      : variant === 'action' ? 'row'
        : variant === 'flat' ? 'soft'
          : 'card';
  const variantSurface: ViewStyle =
    variant === 'hero'
      ? getSurfaceStyle(q, 'elevated')
      : variant === 'action'
        ? getSurfaceStyle(q, 'row')
        : variant === 'emergency'
          ? { backgroundColor: q.colors.warningSoft, borderColor: q.colors.warning }
        : variant === 'flat'
            ? { ...getSurfaceStyle(q, 'soft'), shadowOpacity: 0, elevation: 0 }
            : getSurfaceStyle(q, 'card');
  const variantPadding: ViewStyle =
    variant === 'hero'
      ? { padding: q.spacing.md }
      : { padding: q.spacing.md };
  const legacyStyle = guardDarkSurfaceStyle(StyleSheet.flatten(style), q, surfaceRole);
  const resolvedStyle: ViewStyle = {
    borderRadius: q.radius.lg,
    borderWidth: variant === 'flat' ? 0 : 1,
    shadowColor: q.colors.cardShadow,
    shadowOpacity: variant === 'hero' ? 0.07 : variant === 'data' ? 0.035 : 0,
    shadowOffset: { width: 0, height: q.spacing.xs },
    shadowRadius: q.spacing.md,
    elevation: variant === 'hero' ? 3 : variant === 'data' ? 1 : 0,
    ...variantSurface,
    ...variantPadding,
    ...legacyStyle,
  };
  const CardView = View as any;
  const webClassName = ['quest-card', `quest-card-${variant}`, className].filter(Boolean).join(' ');
  return (
    <CardView className={webClassName} style={resolvedStyle}>
      {children}
    </CardView>
  );
}
