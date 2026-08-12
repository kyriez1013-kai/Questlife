// V2.5: "目标" Tab — 大目标列表 (内嵌于 GoalsStack)
// - 点击大目标行 → 导航到 GoalDetail
// - 长按行 → 删除 (含子技能策略)
// - + 大目标 → GoalForm (创建)
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../store';
import { appAccent, theme } from '../theme';
import { Category } from '../types';
import GoalForm from '../components/GoalForm';
import { getLanguage, t } from '../i18n';
import { getQuestTheme, questLayout } from '../design/tokens';
import { getGoalSemanticIcon } from '../design/entityIcons';
import QuestButton from '../components/ui/QuestButton';
import QuestCard from '../components/ui/QuestCard';
import { getV11ProductLanguage, getV11ProductThemeId } from '../v11/featureFlag';
import QuestEmptyState from '../components/ui/QuestEmptyState';
import QuestEntityIcon from '../components/ui/QuestEntityIcon';
import { confirmAction } from '../utils/confirm';
import { QuestContextBar } from '../components/ui/QuestPrimitives';

export default function GoalTreeScreen() {
  const { data, deleteCategory } = useStore();
  const nav = useNavigation<any>();
  const questTheme = getQuestTheme(getV11ProductThemeId(data.settings.selectedThemeId));
  const accent = appAccent(data.settings.accentColor ?? questTheme.colors.primary);
  const lang = getV11ProductLanguage(getLanguage(data.settings.language));

  const [creating, setCreating] = useState(false);

  const goDetail = (categoryId: string) => nav.navigate('GoalDetail', { categoryId });

  const askDelete = (c: Category) => {
    const children = Array.from(new Set((data.moduleSkillLinks || []).filter((l) => l.goalId === c.id).map((l) => l.skillId)));
    if (children.length === 0) {
      confirmAction({
        title: t(lang, 'delete'),
        message: `${t(lang, 'confirmDelete')}「${c.name}」?`,
        cancelText: t(lang, 'cancel'),
        confirmText: t(lang, 'delete'),
        destructive: true,
        onConfirm: () => deleteCategory(c.id, 'transfer'),
      });
      return;
    }
    confirmAction({
      title: `${t(lang, 'delete')}「${c.name}」`,
      message: `${children.length} ${t(lang, 'skillCount')}`,
      cancelText: t(lang, 'cancel'),
      confirmText: t(lang, 'delete'),
      destructive: true,
      onConfirm: () => deleteCategory(c.id, 'transfer'),
    });
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: questTheme.colors.background }]}>
      <ScrollView
        style={[styles.container, { backgroundColor: questTheme.colors.background }]}
        contentContainerStyle={{
          paddingHorizontal: questTheme.spacing.md,
          paddingTop: questTheme.spacing.sm,
          paddingBottom: questLayout.contentBottomInset,
          maxWidth: questLayout.contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
        }}
      >
        <QuestContextBar
          questTheme={questTheme}
          primary={`${data.categories.length} ${t(lang, 'quest')} · ${data.skills.length} ${t(lang, 'skillCount')}`}
          secondary={t(lang, 'questSubtitle')}
          trailing={<View style={styles.headerActions}>
            <QuestButton questTheme={questTheme} variant="ghost" icon="library" label={t(lang, 'skillLibrary')} onPress={() => nav.navigate('SkillLibrary')} />
            <QuestButton questTheme={questTheme} variant="primary" icon="plus" label={t(lang, 'addQuest')} onPress={() => setCreating(true)} />
          </View>}
        />

        {data.categories.length === 0 && (
          <QuestEmptyState questTheme={questTheme} icon="target" title={t(lang, 'noQuests')} body={t(lang, 'noQuestsDesc')} />
        )}

        {data.categories.map((c) => {
          const childCount = new Set((data.moduleSkillLinks || []).filter((l) => l.goalId === c.id).map((l) => l.skillId)).size
            || data.skills.filter((s) => s.categoryId === c.id).length;
          return (
            <TouchableOpacity
              key={c.id}
              onPress={() => goDetail(c.id)}
              onLongPress={() => askDelete(c)}
              accessibilityRole="button"
              accessibilityLabel={`${c.name} · ${childCount} ${t(lang, 'skillCount')}`}
            >
              <QuestCard
                questTheme={questTheme}
                variant="flat"
                style={[styles.card, {
                  backgroundColor: questTheme.colors.surface,
                  borderLeftWidth: 3,
                  borderLeftColor: c.color ?? accent,
                }]}
                className="goal-card goal-row"
              >
                <QuestEntityIcon icon={c.emoji} systemIcon={getGoalSemanticIcon(c)} color={c.color ?? accent} questTheme={questTheme} size="lg" />
                <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.name, { color: questTheme.colors.text }]}>{c.name}</Text>
                {c.description ? <Text style={[styles.desc, { color: questTheme.colors.textMuted }]}>{c.description}</Text> : null}
                  <Text style={[styles.meta, { color: accent }]}>{childCount} {t(lang, 'skillCount')}</Text>
                </View>
                <TouchableOpacity
                  onPress={(event) => {
                    event.stopPropagation?.();
                    askDelete(c);
                  }}
                  style={[styles.deleteBtn, { borderColor: questTheme.colors.border, backgroundColor: questTheme.colors.surfaceSoft }]}
                  accessibilityRole="button"
                  accessibilityLabel={`${t(lang, 'delete')}: ${c.name}`}
                >
                  <Text style={[styles.deleteBtnText, { color: questTheme.colors.textMuted }]}>•••</Text>
                </TouchableOpacity>
              </QuestCard>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 仅用于创建; 编辑在 GoalDetailScreen 内 */}
      <GoalForm visible={creating} onClose={() => setCreating(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  container: { flex: 1, backgroundColor: theme.bg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', gap: 8 },
  h1: { color: theme.text, fontSize: 34, fontWeight: '800' },
  sub: { color: theme.textDim, marginTop: 4, marginBottom: 16 },
  addBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: theme.radius.md, ...theme.shadow },
  addBtnText: { color: '#fff', fontWeight: '700' },
  libraryBtn: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card },
  libraryBtnText: { color: theme.text, fontWeight: '800', fontSize: 12 },
  emptyBox: { backgroundColor: theme.card, padding: 14, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border, ...theme.shadow },
  emptyTitle: { color: theme.text, fontSize: 16, fontWeight: '600' },
  emptyDesc: { color: theme.textDim, marginTop: 8, lineHeight: 22 },
  card: { minHeight: 78, flexDirection: 'row', backgroundColor: theme.card, paddingHorizontal: 10, paddingVertical: 9, borderRadius: theme.radius.lg, marginBottom: 5, alignItems: 'center', gap: 10, borderWidth: 0 },
  iconBox: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.cardAlt },
  name: { color: theme.text, fontSize: 17, lineHeight: 22, fontWeight: '600' },
  desc: { color: theme.textDim, fontSize: 12, lineHeight: 17, marginTop: 4 },
  meta: { color: theme.accent, fontSize: 11, marginTop: 4 },
  deleteBtn: { width: questLayout.controlMinHeight, height: questLayout.controlMinHeight, borderRadius: 22, borderWidth: 0, alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { fontSize: 13, fontWeight: '900', lineHeight: 18, letterSpacing: 0 },
  chev: { color: theme.textDim, fontSize: 24 },
});
