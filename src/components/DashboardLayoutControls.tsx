import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DashboardPresetId, DashboardSurface } from '../types';
import { getLanguage, t } from '../i18n';
import { getQuestTheme, QuestTheme } from '../design/tokens';
import QuestButton from './ui/QuestButton';
import QuestCard from './ui/QuestCard';
import QuestPill from './ui/QuestPill';
import AddCardGallery from './dashboard/AddCardGallery';
import {
  DASHBOARD_PRESETS,
  getDashboardCardsForSurface,
  normalizeDashboardPreferences,
} from '../utils/dashboardCards';

type Props = {
  surface: DashboardSurface;
  questTheme?: QuestTheme;
  language?: 'zh' | 'en';
  preferences?: ReturnType<typeof normalizeDashboardPreferences>;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  onPreset: (preset: DashboardPresetId) => void;
  onVisibility: (cardId: string, visible: boolean) => void;
  onReset: () => void;
};

export default function DashboardLayoutControls({
  surface,
  questTheme,
  language,
  preferences,
  editing,
  onEditingChange,
  onPreset,
  onVisibility,
  onReset,
}: Props) {
  const q = questTheme ?? getQuestTheme();
  const lang = getLanguage(language);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const normalized = normalizeDashboardPreferences(preferences);
  const prefs = surface === 'today' ? normalized.todayCards : normalized.insightsCards;
  const prefById = useMemo(() => new Map(prefs.map((pref) => [pref.cardId, pref])), [prefs]);
  const cards = getDashboardCardsForSurface(surface);
  const hiddenCards = cards.filter((card) => prefById.get(card.id)?.visible === false);

  return (
    <QuestCard questTheme={q} variant="flat" style={styles.shell} className="control-center dashboard-controls">
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.kicker, { color: q.colors.textMuted }]}>{t(lang, 'controlCenter')}</Text>
          <Text style={[styles.title, { color: q.colors.text }]}>{t(lang, surface === 'today' ? 'todayCards' : 'insightsCards')}</Text>
          <Text style={[styles.subtitle, { color: q.colors.textMuted }]}>{t(lang, editing ? 'editModeHint' : 'personalizeDashboard')}</Text>
        </View>
        <QuestButton
          questTheme={q}
          variant={editing ? 'primary' : 'secondary'}
          icon={editing ? 'check' : 'settings'}
          label={editing ? t(lang, 'exitEditMode') : t(lang, 'enterEditMode')}
          onPress={() => {
            setGalleryOpen(false);
            onEditingChange(!editing);
          }}
        />
      </View>

      {editing ? (
        <>
          <View style={[styles.hintBox, { backgroundColor: q.colors.surfaceSoft, borderColor: q.colors.border }]}> 
            <Text style={[styles.hintText, { color: q.colors.textMuted }]}>{t(lang, 'dragToReorder')} · {t(lang, 'tapToResize')}</Text>
          </View>

          <Text style={[styles.sectionTitle, { color: q.colors.text }]}>{t(lang, 'applyDashboardPreset')}</Text>
          <View style={styles.wrap}>
            {DASHBOARD_PRESETS.map((preset) => (
              <QuestPill
                key={preset.id}
                questTheme={q}
                active={normalized.activePreset === preset.id}
                label={t(lang, preset.titleKey)}
                onPress={() => onPreset(preset.id)}
              />
            ))}
          </View>

          <View style={styles.actionsRow}>
            <QuestButton
              questTheme={q}
              variant="secondary"
              icon="plus"
              label={t(lang, 'addCardGallery')}
              onPress={() => setGalleryOpen((value) => !value)}
            />
            <QuestButton questTheme={q} variant="ghost" icon="settings" label={t(lang, 'resetLayout')} onPress={onReset} />
          </View>

          {galleryOpen ? (
            <View style={styles.galleryWrap}>
              <Text style={[styles.sectionTitle, { color: q.colors.text }]}>{t(lang, 'hiddenCardGallery')}</Text>
              <AddCardGallery
                hiddenCards={hiddenCards}
                questTheme={q}
                language={lang}
                onAddCard={(cardId) => onVisibility(cardId, true)}
              />
            </View>
          ) : null}
        </>
      ) : null}
    </QuestCard>
  );
}

const styles = StyleSheet.create({
  shell: { marginTop: 12, gap: 12 },
  topRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  kicker: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  title: { fontSize: 17, fontWeight: '900', lineHeight: 23 },
  subtitle: { fontSize: 12, fontWeight: '800', lineHeight: 18, marginTop: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '900', marginTop: 2 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  hintBox: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  hintText: { fontSize: 12, fontWeight: '800', lineHeight: 17 },
  galleryWrap: { gap: 10 },
});
