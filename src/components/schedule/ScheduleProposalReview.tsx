import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Lang, t } from '../../i18n';
import { QuestTheme } from '../../design/tokens';
import { ScheduleBlock } from '../../types';
import {
  buildScheduleProposalPatch,
  previewScheduleProposal,
  ScheduleProposal,
  scheduleProposalActionKey,
} from '../../utils/scheduleProposal';
import QuestButton from '../ui/QuestButton';
import QuestPill from '../ui/QuestPill';
import { QuestGroupedSurface } from '../ui/QuestPrimitives';

type Props = {
  questTheme: QuestTheme;
  language: Lang;
  proposals: ScheduleProposal[];
  scheduleBlocks: ScheduleBlock[];
  canApply: (proposalId: string) => boolean;
  onApply: (proposalId: string) => void;
  onDismiss: (proposalId: string) => void;
  canUndo: boolean;
  onUndo: () => void;
};

function statusKey(proposal: ScheduleProposal) {
  if (proposal.status === 'applied') return 'proposalApplied';
  if (proposal.status === 'dismissed') return 'proposalDismissed';
  if (proposal.status === 'failed') return 'proposalApplyFailed';
  return 'scheduleProposalNotApplied';
}

export default function ScheduleProposalReview({
  questTheme,
  language,
  proposals,
  scheduleBlocks,
  canApply,
  onApply,
  onDismiss,
  canUndo,
  onUndo,
}: Props) {
  return (
    <QuestGroupedSurface questTheme={questTheme} elevated>
      {proposals.map((proposal, index) => {
        const block = proposal.blockId
          ? scheduleBlocks.find((item) => item.id === proposal.blockId)
          : undefined;
        const preview = previewScheduleProposal(proposal, block);
        const applyResult = buildScheduleProposalPatch(proposal, block);
        const applyAllowed = canApply(proposal.id);
        const safetyKey = applyResult.ok
          ? (proposal.status === 'pending' && !applyAllowed ? 'qualityTooWeakForApply' : null)
          : (applyResult.messageKey || 'suggestionOnly');
        return (
          <View
            key={proposal.id}
            style={[
              styles.proposal,
              index > 0 && { borderTopWidth: 1, borderTopColor: questTheme.colors.divider },
            ]}
          >
            <View style={styles.header}>
              <Text style={[styles.title, { color: questTheme.colors.text }]}>
                {t(language, scheduleProposalActionKey(proposal.action))}
              </Text>
              <QuestPill
                questTheme={questTheme}
                variant={proposal.status === 'applied'
                  ? 'success'
                  : proposal.status === 'failed'
                    ? 'danger'
                    : 'muted'}
                label={t(language, statusKey(proposal))}
              />
            </View>
            <Text style={[styles.preview, { color: questTheme.colors.text }]}>
              {block?.title || t(language, 'targetBlock')} · {preview.from || '-'}{preview.to ? ` → ${preview.to}` : ''}
            </Text>
            <Text style={[styles.meta, { color: questTheme.colors.textMuted }]}>
              {t(language, 'reason')}: {proposal.reason}
            </Text>
            {safetyKey ? (
              <Text style={[styles.meta, { color: questTheme.colors.warning }]}>{t(language, safetyKey)}</Text>
            ) : null}
            <View style={styles.actions}>
              <QuestButton
                questTheme={questTheme}
                variant="secondary"
                label={t(language, 'applyProposal')}
                disabled={!applyAllowed}
                onPress={() => onApply(proposal.id)}
              />
              <QuestButton
                questTheme={questTheme}
                variant="ghost"
                label={t(language, 'dismissProposal')}
                disabled={proposal.status !== 'pending'}
                onPress={() => onDismiss(proposal.id)}
              />
            </View>
          </View>
        );
      })}
      {canUndo ? (
        <View style={[styles.undo, { borderTopColor: questTheme.colors.divider }]}>
          <Text style={[styles.meta, { color: questTheme.colors.success }]}>{t(language, 'proposalApplied')}</Text>
          <QuestButton questTheme={questTheme} variant="ghost" label={t(language, 'undoProposal')} onPress={onUndo} />
        </View>
      ) : null}
    </QuestGroupedSurface>
  );
}

const styles = StyleSheet.create({
  proposal: { padding: 14, gap: 6 },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  title: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '800' },
  preview: { fontSize: 13, lineHeight: 19, fontWeight: '700' },
  meta: { fontSize: 12, lineHeight: 18 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 2 },
  undo: {
    minHeight: 44,
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
});
