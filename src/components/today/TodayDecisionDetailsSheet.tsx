import React from 'react';
import { Text, View } from 'react-native';
import { QuestTheme } from '../../design/tokens';
import { t } from '../../i18n';
import { TodayDecisionCopy, TodayDecisionEvidenceItem, TodayDecisionPatternReference, TodayDecisionPresentation } from '../../utils/todayDecisionPresentation';
import { isV11TodayEnabled } from '../../v11/featureFlag';
import { getV11ThemeTokens } from '../../v11/tokens';
import useV11ReducedMotion from '../../v11/useV11ReducedMotion';
import V11Stage2ProductionSheet from '../../v11-stage2-rebaseline/V11Stage2ProductionSheet';
import BottomSheetForm from '../BottomSheetForm';
import { V11CategoricalChip, V11SheetButton, V11StatusChip } from '../../v11/components/V11SheetControls';
import QuestButton from '../ui/QuestButton';
import { QuestEvidenceRow, QuestSectionHeader } from '../ui/QuestPrimitives';
import QuestPill from '../ui/QuestPill';

type Props = {
  visible: boolean;
  onClose: () => void;
  presentation: TodayDecisionPresentation;
  questTheme: QuestTheme;
  language: 'zh' | 'en';
  formatCopy: (copy: TodayDecisionCopy) => string;
  onFeedback?: (feedback: 'useful' | 'not_useful') => void;
  refreshing?: boolean;
  onRefresh?: () => void;
};

function confidenceKey(value: TodayDecisionPresentation['details']['confidence']['label']) {
  if (value === 'high') return 'confidenceHigh';
  if (value === 'medium') return 'confidenceMedium';
  return 'confidenceLow';
}

function evidenceLabelKey(type: TodayDecisionEvidenceItem['type']) {
  if (type === 'state') return 'evidenceFromState';
  if (type === 'sleep' || type === 'recovery') return 'evidenceFromContext';
  if (type === 'pattern') return 'evidenceFromPatterns';
  if (type === 'recent_execution') return 'evidenceFromRecentExecution';
  if (type === 'schedule') return 'evidenceFromSchedule';
  return 'keyEvidence';
}

function patternStatusKey(reference: TodayDecisionPatternReference) {
  return reference.status === 'accepted' ? 'confirmedPattern' : 'unconfirmedPattern';
}

function patternUseKey(reference: TodayDecisionPatternReference) {
  if (reference.used_as === 'primary_evidence') return 'decisionPrimaryEvidence';
  if (reference.used_as === 'supporting_evidence') return 'decisionSupportingEvidence';
  return 'decisionCautionReference';
}

function evidenceBasisKey(value: TodayDecisionPresentation['details']['confidence']['basis']) {
  if (value === 'personal_pattern') return 'basedOnConfirmedPattern';
  if (value === 'population_prior') return 'populationPriorOnly';
  return 'basedOnContextAndHistory';
}

export default function TodayDecisionDetailsSheet({
  visible,
  onClose,
  presentation,
  questTheme,
  language,
  formatCopy,
  onFeedback,
  refreshing = false,
  onRefresh,
}: Props) {
  const { details } = presentation;
  const v11Enabled = isV11TodayEnabled();
  const reducedMotion = useV11ReducedMotion();
  const v11Theme = getV11ThemeTokens(questTheme.id === 'cleanFocus' ? 'light' : 'dark');
  const renderSectionHeader = (title: string) => v11Enabled ? (
    <Text style={{ color: v11Theme.text.primary, fontSize: 15, lineHeight: 21, fontWeight: '600' }}>{title}</Text>
  ) : (
    <QuestSectionHeader questTheme={questTheme} title={title} />
  );
  const renderEvidenceRow = (label: string, value: string, divider = false) => v11Enabled ? (
    <View style={{ paddingVertical: questTheme.spacing.sm, borderBottomWidth: divider ? 1 : 0, borderBottomColor: v11Theme.control.borderSubtle }}>
      <Text style={{ color: v11Theme.text.metadata, fontSize: 11, lineHeight: 16 }}>{label}</Text>
      <Text style={{ color: v11Theme.text.secondary, fontSize: 13, lineHeight: 19, marginTop: 3 }}>{value}</Text>
    </View>
  ) : (
    <QuestEvidenceRow questTheme={questTheme} label={label} value={value} divider={divider} />
  );
  const legacyFooter = (
    <View style={{ flexDirection: 'row', gap: questTheme.spacing.sm }}>
      {onRefresh ? (
        <QuestButton
          questTheme={questTheme}
          variant="ghost"
          label={t(language, refreshing ? 'generatingDailyBrief' : 'refreshBrief')}
          onPress={onRefresh}
          disabled={refreshing}
          loading={refreshing}
          style={{ flex: 1 }}
        />
      ) : null}
      <QuestButton
        questTheme={questTheme}
        variant="secondary"
        label={t(language, 'closeDetails')}
        onPress={onClose}
        style={{ flex: 1 }}
      />
    </View>
  );
  const v11Footer = (
    <View style={{ flexDirection: 'row', gap: questTheme.spacing.sm }}>
      {onRefresh ? (
        <V11SheetButton
          disabled={refreshing}
          label={t(language, refreshing ? 'generatingDailyBrief' : 'refreshBrief')}
          loading={refreshing}
          onPress={onRefresh}
          style={{ flex: 1 }}
          theme={v11Theme}
          variant="secondary"
        />
      ) : null}
      <V11SheetButton
        label={t(language, 'closeDetails')}
        onPress={onClose}
        style={{ flex: 1 }}
        theme={v11Theme}
        variant="secondary"
      />
    </View>
  );

  const content = (
    <>
      {v11Enabled ? (
        <Text
          style={{
            color: questTheme.colors.textMuted,
            fontSize: questTheme.typography.metaSize,
            lineHeight: questTheme.typography.metaLineHeight,
          }}
        >
          {t(language, 'judgementExplanation')}
        </Text>
      ) : (
        <QuestSectionHeader
          questTheme={questTheme}
          title={t(language, 'todayDecisionDetails')}
          subtitle={t(language, 'judgementExplanation')}
        />
      )}

      <View
        style={{
          marginTop: questTheme.spacing.sm,
          paddingVertical: questTheme.spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: questTheme.colors.divider,
        }}
      >
        <Text
          style={{
            color: questTheme.colors.text,
            fontSize: questTheme.typography.titleSize,
            lineHeight: questTheme.typography.titleLineHeight,
            fontWeight: questTheme.typography.weightBold,
          }}
        >
          {formatCopy(presentation.judgement)}
        </Text>
        <Text
          style={{
            color: questTheme.colors.textMuted,
            fontSize: questTheme.typography.bodySize,
            lineHeight: questTheme.typography.bodyLineHeight,
            marginTop: questTheme.spacing.xs,
          }}
        >
          {formatCopy(presentation.actionReason)}
        </Text>
      </View>

      {details.evidence.length > 0 ? (
        <View style={{ marginTop: questTheme.spacing.section }}>
          {renderSectionHeader(t(language, 'keyEvidence'))}
          <View style={{ marginTop: questTheme.spacing.xs }}>
            {details.evidence.map((item, index) => (
              <React.Fragment key={item.id}>
                {renderEvidenceRow(t(language, evidenceLabelKey(item.type)), formatCopy(item.copy), index < details.evidence.length - 1)}
              </React.Fragment>
            ))}
          </View>
        </View>
      ) : null}

      <View style={{ marginTop: questTheme.spacing.section }}>
        {renderSectionHeader(t(language, 'confidence'))}
        {renderEvidenceRow(t(language, 'confidence'), t(language, confidenceKey(details.confidence.label)), !!details.confidence.basis)}
        {details.confidence.basis ? (
          renderEvidenceRow(t(language, 'evidenceBasis'), t(language, evidenceBasisKey(details.confidence.basis)))
        ) : null}
      </View>

      {details.patternReferences.length > 0 ? (
        <View style={{ marginTop: questTheme.spacing.section }}>
          {renderSectionHeader(t(language, 'patternReference'))}
          <View style={{ gap: questTheme.spacing.sm, marginTop: questTheme.spacing.xs }}>
            {details.patternReferences.map((reference, index) => (
              <View
                key={reference.pattern_id || `${reference.label}-${index}`}
                style={{
                  backgroundColor: questTheme.colors.surfaceSoft,
                  borderRadius: questTheme.radius.md,
                  padding: questTheme.spacing.sm,
                  gap: questTheme.spacing.xs,
                }}
              >
                <Text
                  style={{
                    color: questTheme.colors.text,
                    fontSize: questTheme.typography.cardTitleSize,
                    lineHeight: questTheme.typography.cardTitleLineHeight,
                    fontWeight: questTheme.typography.weightBold,
                  }}
                >
                  {reference.label}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: questTheme.spacing.xs }}>
                  {v11Enabled ? (
                    <>
                      <V11StatusChip label={t(language, patternStatusKey(reference))} theme={v11Theme} />
                      <V11StatusChip label={t(language, patternUseKey(reference))} theme={v11Theme} />
                    </>
                  ) : (
                    <>
                      <QuestPill
                        questTheme={questTheme}
                        variant={reference.status === 'accepted' ? 'success' : 'muted'}
                        label={t(language, patternStatusKey(reference))}
                      />
                      <QuestPill
                        questTheme={questTheme}
                        variant="muted"
                        label={t(language, patternUseKey(reference))}
                      />
                    </>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {details.feedback.enabled && onFeedback ? (
        <View style={{ marginTop: questTheme.spacing.section }}>
          {renderSectionHeader(t(language, 'dailyBriefFeedback'))}
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: questTheme.spacing.sm,
              marginTop: questTheme.spacing.xs,
            }}
          >
            {v11Enabled ? (
              <>
                <V11CategoricalChip
                  accessibilityRole="radio"
                  label={t(language, 'useful')}
                  onPress={() => onFeedback('useful')}
                  selected={details.feedback.value === 'useful'}
                  theme={v11Theme}
                />
                <V11CategoricalChip
                  accessibilityRole="radio"
                  label={t(language, 'notUseful')}
                  onPress={() => onFeedback('not_useful')}
                  selected={details.feedback.value === 'not_useful'}
                  theme={v11Theme}
                />
              </>
            ) : (
              <>
                <QuestPill
                  questTheme={questTheme}
                  active={details.feedback.value === 'useful'}
                  variant="success"
                  label={t(language, 'useful')}
                  onPress={() => onFeedback('useful')}
                />
                <QuestPill
                  questTheme={questTheme}
                  active={details.feedback.value === 'not_useful'}
                  variant="danger"
                  label={t(language, 'notUseful')}
                  onPress={() => onFeedback('not_useful')}
                />
              </>
            )}
          </View>
        </View>
      ) : null}
    </>
  );

  if (v11Enabled) {
    return (
      <V11Stage2ProductionSheet
        closeLabel={t(language, 'closeDetails')}
        footer={v11Footer}
        onClose={onClose}
        reducedMotion={reducedMotion}
        sheet="production"
        theme={v11Theme}
        title={t(language, 'todayDecisionDetails')}
        visible={visible}
      >
        {content}
      </V11Stage2ProductionSheet>
    );
  }

  return (
    <BottomSheetForm
      visible={visible}
      onClose={onClose}
      closeAccessibilityLabel={t(language, 'closeDetails')}
      footer={legacyFooter}
    >
      {content}
    </BottomSheetForm>
  );
}
