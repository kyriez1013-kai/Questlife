import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import BottomSheetForm from '../BottomSheetForm';
import QuestButton from '../ui/QuestButton';
import QuestIcon from '../ui/QuestIcon';
import { questLayout, type QuestTheme } from '../../design/tokens';
import { t } from '../../i18n';
import type { ScheduleCompilerResult, SchedulePlacement, ScheduleUnplaced } from '../../utils/scheduleCompiler';

type Props = {
  visible: boolean;
  plan: ScheduleCompilerResult | null;
  language: 'zh' | 'en';
  questTheme: QuestTheme;
  onClose: () => void;
  onDeploy: () => void;
  onAdjust: (id: string) => void;
};

function reasonKey(placement: SchedulePlacement) {
  if (placement.reason === 'preferred_window') return 'scheduleReasonPreferred';
  if (placement.reason === 'existing_placement') return 'scheduleReasonExisting';
  return 'scheduleReasonEarliest';
}

function unplacedReasonKey(item: ScheduleUnplaced) {
  return item.reason === 'insufficient_capacity'
    ? 'scheduleInsufficientCapacity'
    : 'scheduleInsufficientContinuousTime';
}

export default function SchedulePlanCompilerSheet({
  visible,
  plan,
  language,
  questTheme,
  onClose,
  onDeploy,
  onAdjust,
}: Props) {
  const q = questTheme;
  const [expandedReasonId, setExpandedReasonId] = useState<string | null>(null);
  const canDeploy = !!plan && plan.placements.length > 0 && plan.unplaced.length === 0;
  const footer = (
    <View style={{ flexDirection: 'row', gap: q.spacing.sm }}>
      <QuestButton questTheme={q} variant="ghost" label={t(language, 'cancel')} onPress={onClose} style={{ flex: 1 }} />
      <QuestButton questTheme={q} variant="primary" label={t(language, 'scheduleDeployPlan')} onPress={onDeploy} disabled={!canDeploy} style={{ flex: 1.4 }} />
    </View>
  );

  return (
    <BottomSheetForm visible={visible} onClose={onClose} footer={footer} closeAccessibilityLabel={t(language, 'close')}>
      <Text style={{ color: q.colors.text, fontSize: q.typography.titleSize, lineHeight: q.typography.titleLineHeight, fontWeight: q.typography.weightBold }}>
        {plan?.mode === 'replan' ? t(language, 'scheduleReplanReview') : t(language, 'schedulePlanReview')}
      </Text>
      <Text style={{ color: q.colors.textMuted, fontSize: q.typography.helperSize, lineHeight: q.typography.helperLineHeight, marginTop: q.spacing.xs }}>
        {t(language, 'scheduleProposalExplanation')}
      </Text>

      {plan ? (
        <>
          <Text style={{ color: q.colors.text, fontSize: q.typography.sectionTitleSize, lineHeight: q.typography.sectionTitleLineHeight, fontWeight: q.typography.weightBold, marginTop: q.spacing.section }}>
            {t(language, 'scheduleInputsConsidered')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: q.spacing.sm, marginTop: q.spacing.sm }}>
            {[
              `${plan.fixedBlocks.length} ${t(language, 'scheduleFixed')}`,
              `${plan.placements.length + plan.unplaced.length} ${t(language, 'scheduleFlexible')}`,
              `${plan.openWindows.length} ${t(language, 'scheduleAvailableWindows')}`,
            ].map((label) => (
              <View key={label} style={{ borderRadius: q.radius.pill, backgroundColor: q.colors.chipBg, borderWidth: 1, borderColor: q.colors.chipBorder, paddingHorizontal: q.spacing.md, paddingVertical: q.spacing.sm }}>
                <Text style={{ color: q.colors.textMuted, fontSize: q.typography.metaSize, lineHeight: q.typography.metaLineHeight }}>{label}</Text>
              </View>
            ))}
          </View>

          <Text style={{ color: q.colors.text, fontSize: q.typography.sectionTitleSize, lineHeight: q.typography.sectionTitleLineHeight, fontWeight: q.typography.weightBold, marginTop: q.spacing.section }}>
            {t(language, 'scheduleProposedChanges')}
          </Text>
          {plan.placements.length === 0 && plan.unplaced.length === 0 ? (
            <Text style={{ color: q.colors.textMuted, fontSize: q.typography.helperSize, lineHeight: q.typography.helperLineHeight, marginTop: q.spacing.sm }}>
              {t(language, 'scheduleNoFlexibleItems')}
            </Text>
          ) : null}
          <View style={{ marginTop: q.spacing.sm, borderTopWidth: 1, borderTopColor: q.colors.divider }}>
            {plan.placements.map((placement) => {
              const expanded = expandedReasonId === placement.candidate.block.id;
              return (
                <View key={placement.candidate.block.id} style={{ borderBottomWidth: 1, borderBottomColor: q.colors.divider, paddingVertical: q.spacing.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: q.spacing.sm }}>
                    <View style={{ minWidth: q.spacing.xxl * 2 }}>
                      <Text style={{ color: q.colors.primary, fontSize: q.typography.compactBodySize, lineHeight: q.typography.compactBodyLineHeight, fontWeight: q.typography.weightBold }}>
                        {placement.startTime}
                      </Text>
                      <Text style={{ color: q.colors.textSubtle, fontSize: q.typography.metaSize, lineHeight: q.typography.metaLineHeight }}>{placement.endTime}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ color: q.colors.text, fontSize: q.typography.compactBodySize, lineHeight: q.typography.compactBodyLineHeight, fontWeight: q.typography.weightBold }}>
                        {placement.candidate.block.title}
                      </Text>
                      {placement.changed ? (
                        <Text style={{ color: q.colors.textMuted, fontSize: q.typography.metaSize, lineHeight: q.typography.metaLineHeight, marginTop: q.spacing.xs }}>
                          {placement.candidate.block.startTime} → {placement.startTime}
                        </Text>
                      ) : (
                        <Text style={{ color: q.colors.textMuted, fontSize: q.typography.metaSize, lineHeight: q.typography.metaLineHeight, marginTop: q.spacing.xs }}>
                          {t(language, 'scheduleUnchanged')}
                        </Text>
                      )}
                    </View>
                    <Pressable
                      onPress={() => setExpandedReasonId(expanded ? null : placement.candidate.block.id)}
                      accessibilityRole="button"
                      accessibilityLabel={t(language, 'scheduleWhyHere')}
                      style={({ pressed }) => ({ minWidth: questLayout.controlMinHeight, minHeight: questLayout.controlMinHeight, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.72 : 1 })}
                    >
                      <QuestIcon name="activity" size={18} color={q.colors.textMuted} />
                    </Pressable>
                  </View>
                  {expanded ? (
                    <Text style={{ color: q.colors.textSecondary, fontSize: q.typography.helperSize, lineHeight: q.typography.helperLineHeight, marginTop: q.spacing.sm, paddingLeft: q.spacing.xxl * 2 + q.spacing.sm }}>
                      {t(language, reasonKey(placement))}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>

          {plan.unplaced.length ? (
            <>
              <Text style={{ color: q.colors.warning, fontSize: q.typography.sectionTitleSize, lineHeight: q.typography.sectionTitleLineHeight, fontWeight: q.typography.weightBold, marginTop: q.spacing.section }}>
                {plan.unplaced.length} {t(language, 'scheduleUnplaced')}
              </Text>
              <Text style={{ color: q.colors.textMuted, fontSize: q.typography.helperSize, lineHeight: q.typography.helperLineHeight, marginTop: q.spacing.xs }}>
                {t(language, 'scheduleAdjustBeforeDeploy')}
              </Text>
              <View style={{ marginTop: q.spacing.sm, borderTopWidth: 1, borderTopColor: q.colors.divider }}>
                {plan.unplaced.map((item) => (
                  <Pressable
                    key={item.candidate.block.id}
                    onPress={() => onAdjust(item.candidate.block.id)}
                    accessibilityRole="button"
                    style={({ pressed }) => ({
                      minHeight: questLayout.controlMinHeight,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: q.spacing.sm,
                      paddingVertical: q.spacing.sm,
                      borderBottomWidth: 1,
                      borderBottomColor: q.colors.divider,
                      opacity: pressed ? 0.72 : 1,
                    })}
                  >
                    <QuestIcon name="calendar" size={18} color={q.colors.warning} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ color: q.colors.text, fontSize: q.typography.compactBodySize, lineHeight: q.typography.compactBodyLineHeight, fontWeight: q.typography.weightBold }}>
                        {item.candidate.block.title}
                      </Text>
                      <Text style={{ color: q.colors.textMuted, fontSize: q.typography.metaSize, lineHeight: q.typography.metaLineHeight, marginTop: q.spacing.xs }}>
                        {t(language, unplacedReasonKey(item))}
                      </Text>
                    </View>
                    <QuestIcon name="chevronRight" size={18} color={q.colors.textMuted} />
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}
        </>
      ) : null}
    </BottomSheetForm>
  );
}
