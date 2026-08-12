import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../store';
import { theme } from '../theme';
import { getLanguage, progressTypeLabel, t, taskTypeLabel } from '../i18n';
import { formatSkillProgress, getSkillLinkedCount, progressTypeForSkill } from '../progress';
import { Skill } from '../types';
import SkillForm from '../components/SkillForm';
import { getQuestTheme, questLayout } from '../design/tokens';
import { getSkillSemanticIcon } from '../design/entityIcons';
import QuestButton from '../components/ui/QuestButton';
import QuestCard from '../components/ui/QuestCard';
import QuestEntityIcon from '../components/ui/QuestEntityIcon';
import QuestIcon from '../components/ui/QuestIcon';
import { confirmAction } from '../utils/confirm';
import { getV11ProductLanguage, getV11ProductThemeId } from '../v11/featureFlag';
import { QuestContextBar } from '../components/ui/QuestPrimitives';

function fill(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce((out, [key, value]) => out.replace(`{${key}}`, String(value)), template);
}

export default function SkillLibraryScreen() {
  const { data, deleteSkillFromLibrary } = useStore();
  const nav = useNavigation<any>();
  const lang = getV11ProductLanguage(getLanguage(data.settings.language));
  const questTheme = getQuestTheme(getV11ProductThemeId(data.settings.selectedThemeId));
  const [creating, setCreating] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | undefined>();
  const confirmDeleteSkill = (skillId: string, linkedCount: number) => {
    const extra = linkedCount > 0 ? `\n\n${fill(t(lang, 'linkedLocationsCount'), { count: linkedCount })}` : '';
    confirmAction({
      title: t(lang, 'deleteSkillPermanentTitle'),
      message: `${t(lang, 'deleteSkillPermanentBody')}${extra}`,
      cancelText: t(lang, 'cancel'),
      confirmText: t(lang, 'deletePermanently'),
      destructive: true,
      onConfirm: () => deleteSkillFromLibrary(skillId),
    });
  };
  const openSkillMenu = (skill: Skill, linkedCount: number) => {
    confirmDeleteSkill(skill.id, linkedCount);
  };

  return (
    <SafeAreaView nativeID="v11-skill-library-screen" edges={['top']} style={[styles.safe, { backgroundColor: questTheme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: questTheme.colors.border }]}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: questTheme.colors.primary }]}>{t(lang, 'back')}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{
        paddingHorizontal: questTheme.spacing.md,
        paddingTop: questTheme.spacing.sm,
        paddingBottom: questLayout.contentBottomInset,
        maxWidth: questLayout.contentMaxWidth,
        width: '100%',
        alignSelf: 'center',
      }}>
        <QuestContextBar
          questTheme={questTheme}
          primary={t(lang, 'skillLibrary')}
          secondary={`${data.skills.length} ${t(lang, 'skillCount')}`}
          trailing={<QuestButton questTheme={questTheme} variant="primary" icon="plus" label={t(lang, 'createSkill')} onPress={() => setCreating(true)} />}
        />
        {data.skills.map((skill) => {
          const linkedCount = getSkillLinkedCount(skill.id, data.moduleSkillLinks || []);
          return (
            <TouchableOpacity
              key={skill.id}
              onPress={() => nav.navigate('SkillDetail', { skillId: skill.id })}
              activeOpacity={0.75}
            >
              <QuestCard questTheme={questTheme} variant="action" style={styles.card} className="skill-card skill-row v11-skill-library-row">
                <QuestEntityIcon icon={skill.icon} systemIcon={getSkillSemanticIcon(skill)} color={skill.color} questTheme={questTheme} />
                <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: questTheme.colors.text }]}>{skill.name}</Text>
                <Text style={[styles.meta, { color: questTheme.colors.textMuted }]}>
                  {taskTypeLabel(lang, skill.taskType)} · {progressTypeLabel(lang, progressTypeForSkill(skill))}
                </Text>
                <Text style={[styles.meta, { color: questTheme.colors.textMuted }]}>
                  {formatSkillProgress(skill, lang)} · {linkedCount > 0 ? fill(t(lang, 'linkedCount'), { count: linkedCount }) : t(lang, 'notLinkedToAnyGoal')}
                </Text>
                </View>
              <TouchableOpacity
                  style={[styles.moreBtn, { borderColor: questTheme.colors.border, backgroundColor: questTheme.colors.surfaceSoft }]}
                onPress={() => openSkillMenu(skill, linkedCount)}
              >
                  <Text style={[styles.moreText, { color: questTheme.colors.textMuted }]}>•••</Text>
              </TouchableOpacity>
                <QuestIcon name="target" size={17} color={questTheme.colors.textSubtle} />
              </QuestCard>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <SkillForm visible={creating} onClose={() => setCreating(false)} />
      <SkillForm visible={!!editingSkill} onClose={() => setEditingSkill(undefined)} initial={editingSkill} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  header: { paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border },
  backBtn: { padding: 8 },
  backText: { color: theme.primary, fontSize: 16, fontWeight: '600' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  h1: { color: theme.text, fontSize: 34, fontWeight: '800' },
  sub: { color: theme.textDim, marginTop: 4, marginBottom: 16 },
  createBtn: { borderWidth: 1, borderColor: theme.border, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
  createText: { color: theme.primary, fontSize: 12, fontWeight: '900' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.card, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: theme.border, marginBottom: 6 },
  icon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  name: { color: theme.text, fontSize: 16, fontWeight: '800' },
  meta: { color: theme.textDim, fontSize: 12, marginTop: 3 },
  moreBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
  moreText: { color: theme.textDim, fontSize: 16, fontWeight: '900', marginTop: -4 },
  chev: { color: theme.textDim, fontSize: 24 },
});
