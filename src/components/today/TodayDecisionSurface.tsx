import React from 'react';
import { Text, View, ViewStyle } from 'react-native';
import { QuestTheme } from '../../design/tokens';
import { t } from '../../i18n';
import { TodayCommand, TodayCommandAction } from '../../utils/todayCommand';
import { TodayDecisionCopy, TodayDecisionPresentation } from '../../utils/todayDecisionPresentation';
import QuestButton from '../ui/QuestButton';
import QuestCard from '../ui/QuestCard';
import QuestIcon from '../ui/QuestIcon';
import QuestPill from '../ui/QuestPill';

type Props = {
  presentation: TodayDecisionPresentation;
  questTheme: QuestTheme;
  language: 'zh' | 'en';
  formatCopy: (copy: TodayDecisionCopy) => string;
  primaryActionLabel: string;
  secondaryActionLabel?: string;
  onExecuteAction: (action: TodayCommandAction, command: TodayCommand) => void;
  onOpenDetails: () => void;
  style?: ViewStyle;
};

function readinessKey(band: TodayDecisionPresentation['readiness']['band']) {
  if (band === 'green') return 'readinessGreen';
  if (band === 'yellow') return 'readinessYellow';
  if (band === 'red') return 'readinessRed';
  return 'readinessUnknown';
}

function readinessVariant(band: TodayDecisionPresentation['readiness']['band']) {
  if (band === 'green') return 'success';
  if (band === 'yellow') return 'warning';
  if (band === 'red') return 'danger';
  return 'muted';
}

export default function TodayDecisionSurface({
  presentation,
  questTheme,
  language,
  formatCopy,
  primaryActionLabel,
  secondaryActionLabel,
  onExecuteAction,
  onOpenDetails,
  style,
}: Props) {
  const command = presentation.executableCommand;
  const secondaryAction = secondaryActionLabel ? command.secondaryActions[0] : undefined;

  return (
    <QuestCard questTheme={questTheme} variant="hero" style={style} className="today-decision-surface">
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: questTheme.spacing.sm,
          maxWidth: '100%',
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{
              color: questTheme.colors.textMuted,
              fontSize: questTheme.typography.metaSize,
              lineHeight: questTheme.typography.metaLineHeight,
              fontWeight: questTheme.typography.weightBold,
            }}
          >
            {t(language, 'dailyDecisionBrief')}
          </Text>
          <Text
            numberOfLines={3}
            style={{
              color: questTheme.colors.text,
              fontSize: questTheme.typography.titleSize,
              lineHeight: questTheme.typography.titleLineHeight,
              fontWeight: questTheme.typography.weightBold,
              marginTop: questTheme.spacing.xxs,
              flexShrink: 1,
            }}
          >
            {formatCopy(presentation.judgement)}
          </Text>
        </View>
        <QuestPill
          questTheme={questTheme}
          active
          variant={readinessVariant(presentation.readiness.band)}
          label={t(language, readinessKey(presentation.readiness.band))}
          style={{ flexShrink: 0 }}
        />
      </View>

      <View
        style={{
          backgroundColor: questTheme.colors.surfaceSoft,
          borderRadius: questTheme.radius.md,
          padding: questTheme.spacing.sm,
          marginTop: questTheme.spacing.sm,
          flexDirection: 'row',
          alignItems: 'center',
          gap: questTheme.spacing.sm,
          maxWidth: '100%',
        }}
      >
        <QuestIcon
          name="zap"
          size={questTheme.typography.sectionTitleSize}
          color={questTheme.colors.primary}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={2}
            style={{
              color: questTheme.colors.text,
              fontSize: questTheme.typography.cardTitleSize,
              lineHeight: questTheme.typography.cardTitleLineHeight,
              fontWeight: questTheme.typography.weightBold,
              flexShrink: 1,
            }}
          >
            {formatCopy(presentation.actionLabel)}
          </Text>
          <Text
            numberOfLines={2}
            style={{
              color: questTheme.colors.textMuted,
              fontSize: questTheme.typography.helperSize,
              lineHeight: questTheme.typography.helperLineHeight,
              marginTop: questTheme.spacing.xxs,
              flexShrink: 1,
            }}
          >
            {formatCopy(presentation.actionReason)}
          </Text>
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: questTheme.spacing.sm,
          marginTop: questTheme.spacing.sm,
          maxWidth: '100%',
        }}
      >
        <QuestButton
          questTheme={questTheme}
          label={primaryActionLabel}
          onPress={() => onExecuteAction(command.primaryAction, command)}
          style={{ flexGrow: 1 }}
        />
        {secondaryAction && secondaryActionLabel ? (
          <QuestButton
            questTheme={questTheme}
            variant="secondary"
            label={secondaryActionLabel}
            onPress={() => onExecuteAction(secondaryAction, command)}
          />
        ) : null}
        <QuestButton
          questTheme={questTheme}
          variant="ghost"
          label={t(language, 'viewEvidence')}
          onPress={onOpenDetails}
        />
      </View>
    </QuestCard>
  );
}
