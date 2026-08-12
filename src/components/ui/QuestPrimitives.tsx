import React from 'react';
import { Text, View, ViewStyle } from 'react-native';
import { getQuestTheme, questLayout, QuestTheme } from '../../design/tokens';

type ThemeProps = {
  questTheme?: QuestTheme;
};

type ScreenHeaderProps = ThemeProps & {
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
};

export function QuestScreenHeader({ title, subtitle, trailing, questTheme, style }: ScreenHeaderProps) {
  const q = questTheme ?? getQuestTheme();
  const Header = View as any;
  return (
    <Header className="quest-screen-header" style={[{
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: q.spacing.md,
      marginBottom: q.spacing.sm,
    }, style]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{
          color: q.colors.text,
          fontSize: q.typography.screenTitleSize,
          lineHeight: q.typography.screenTitleLineHeight,
          fontWeight: q.typography.weightBold,
        }}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{
            color: q.colors.textMuted,
            fontSize: q.typography.metaSize,
            lineHeight: q.typography.metaLineHeight,
            marginTop: q.spacing.xs,
          }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </Header>
  );
}

type ContextBarProps = ThemeProps & {
  primary: string;
  secondary?: string;
  trailing?: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
};

export function QuestContextBar({ primary, secondary, trailing, questTheme, style }: ContextBarProps) {
  const q = questTheme ?? getQuestTheme();
  const Bar = View as any;
  return (
    <Bar className="quest-context-bar" style={[{
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: q.spacing.sm,
      marginBottom: q.spacing.sm,
    }, style]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          numberOfLines={1}
          style={{
            color: q.colors.text,
            fontSize: q.typography.titleSize,
            lineHeight: q.typography.titleLineHeight,
            fontWeight: q.typography.weightBold,
          }}
        >
          {primary}
        </Text>
        {secondary ? (
          <Text
            numberOfLines={1}
            style={{
              color: q.colors.textMuted,
              fontSize: q.typography.metaSize,
              lineHeight: q.typography.metaLineHeight,
              marginTop: q.spacing.xs,
            }}
          >
            {secondary}
          </Text>
        ) : null}
      </View>
      {trailing}
    </Bar>
  );
}

type SectionHeaderProps = ThemeProps & {
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
};

export function QuestSectionHeader({ title, subtitle, trailing, questTheme, style }: SectionHeaderProps) {
  const q = questTheme ?? getQuestTheme();
  const Header = View as any;
  return (
    <Header className="quest-section-header" style={[{
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: q.spacing.sm,
      marginTop: q.spacing.section,
      marginBottom: q.spacing.sm,
    }, style]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{
          color: q.colors.text,
          fontSize: q.typography.sectionTitleSize,
          lineHeight: q.typography.sectionTitleLineHeight,
          fontWeight: q.typography.weightBold,
        }}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{
            color: q.colors.textMuted,
            fontSize: q.typography.helperSize,
            lineHeight: q.typography.helperLineHeight,
            marginTop: q.spacing.xs,
          }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </Header>
  );
}

type GroupedSurfaceProps = ThemeProps & {
  children: React.ReactNode;
  elevated?: boolean;
  className?: string;
  style?: ViewStyle | ViewStyle[];
};

export function QuestGroupedSurface({ children, elevated, className, questTheme, style }: GroupedSurfaceProps) {
  const q = questTheme ?? getQuestTheme();
  const Surface = View as any;
  const webClassName = [
    'quest-grouped-surface',
    elevated ? 'surface-elevated' : 'surface',
    className,
  ].filter(Boolean).join(' ');
  return (
    <Surface className={webClassName} style={[{
      backgroundColor: elevated ? q.colors.surfaceElevated : q.colors.surface,
      borderRadius: q.radius.lg,
      borderWidth: 1,
      borderColor: q.colors.divider,
      overflow: 'hidden',
    }, style]}>
      {children}
    </Surface>
  );
}

type CompactRowProps = ThemeProps & {
  title: string;
  body?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  divider?: boolean;
  style?: ViewStyle | ViewStyle[];
};

export function QuestCompactRow({
  title,
  body,
  leading,
  trailing,
  divider,
  questTheme,
  style,
}: CompactRowProps) {
  const q = questTheme ?? getQuestTheme();
  const Row = View as any;
  return (
    <Row className="quest-compact-row" style={[{
      minHeight: questLayout.controlMinHeight,
      flexDirection: 'row',
      alignItems: 'center',
      gap: q.spacing.sm,
      paddingHorizontal: q.spacing.md,
      paddingVertical: q.spacing.sm,
      borderTopWidth: divider ? 1 : 0,
      borderTopColor: q.colors.divider,
    }, style]}>
      {leading}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{
          color: q.colors.text,
          fontSize: q.typography.compactBodySize,
          lineHeight: q.typography.compactBodyLineHeight,
          fontWeight: q.typography.weightMedium,
        }}>
          {title}
        </Text>
        {body ? (
          <Text style={{
            color: q.colors.textMuted,
            fontSize: q.typography.metaSize,
            lineHeight: q.typography.metaLineHeight,
            marginTop: q.spacing.xs,
          }}>
            {body}
          </Text>
        ) : null}
      </View>
      {trailing}
    </Row>
  );
}

type EvidenceRowProps = ThemeProps & {
  label: string;
  value: string;
  toneColor?: string;
  divider?: boolean;
};

export function QuestEvidenceRow({ label, value, toneColor, divider, questTheme }: EvidenceRowProps) {
  const q = questTheme ?? getQuestTheme();
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: q.spacing.sm,
      paddingVertical: q.spacing.sm,
      borderTopWidth: divider ? 1 : 0,
      borderTopColor: q.colors.divider,
    }}>
      <View style={{
        width: q.spacing.tight,
        height: q.spacing.tight,
        borderRadius: q.radius.pill,
        backgroundColor: toneColor ?? q.colors.primary,
        marginTop: q.spacing.tight,
      }} />
      <View style={{ flex: 1 }}>
        <Text style={{
          color: q.colors.textMuted,
          fontSize: q.typography.metaSize,
          lineHeight: q.typography.metaLineHeight,
          fontWeight: q.typography.weightMedium,
        }}>
          {label}
        </Text>
        <Text style={{
          color: q.colors.text,
          fontSize: q.typography.compactBodySize,
          lineHeight: q.typography.compactBodyLineHeight,
          fontWeight: q.typography.weightMedium,
          marginTop: q.spacing.xs,
        }}>
          {value}
        </Text>
      </View>
    </View>
  );
}
