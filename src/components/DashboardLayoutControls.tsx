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
  onAddCard?: (cardId: string) => void;
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
  onAddCard,
  onReset,
}: Props) {
  const q = questTheme ?? getQuestTheme();
  const lang = getLanguage(language);
  const WebView = View as any;
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [presetOpen, setPresetOpen] = useState(false);
  const normalized = normalizeDashboardPreferences(preferences);
  const prefs = surface === 'today' ? normalized.todayCards : normalized.insightsCards;
  const prefById = useMemo(() => new Map(prefs.map((pref) => [pref.cardId, pref])), [prefs]);
  const cards = getDashboardCardsForSurface(surface);
  const hiddenCards = cards.filter((card) => prefById.get(card.id)?.visible === false);

  return (
    <WebView style={styles.wrapper} className="control-center dashboard-controls">
      {!editing ? (
        <View style={styles.normalRow}>
          <Text style={[styles.normalHint, { color: q.colors.textMuted }]}>{t(lang, 'longPressToEdit')}</Text>
          <QuestButton
            questTheme={q}
            variant="ghost"
            icon="settings"
            label={t(lang, 'editDashboard')}
            onPress={() => {
              setGalleryOpen(false);
              setPresetOpen(false);
              onEditingChange(true);
            }}
          />
        </View>
      ) : (
        <WebView style={[styles.editBar, { backgroundColor: q.colors.surfaceElevated, borderColor: q.colors.borderStrong }]} className="dashboard-floating-edit-bar">
          <View style={{ flex: 1, minWidth: 160 }}>
            <Text style={[styles.kicker, { color: q.colors.textMuted }]}>{t(lang, 'editingDashboard')}</Text>
            <Text style={[styles.hintText, { color: q.colors.textMuted }]}>{t(lang, 'dragCardToMove')} · {t(lang, 'tapCornerToResize')}</Text>
          </View>
          <View style={styles.actionsRow}>
            <QuestButton
              questTheme={q}
              variant="secondary"
              icon="plus"
              label={t(lang, 'addCard')}
              onPress={() => {
                setGalleryOpen((value) => !value);
                setPresetOpen(false);
              }}
            />
            <QuestButton
              questTheme={q}
              variant="ghost"
              icon="settings"
              label={t(lang, 'presetMenu')}
              onPress={() => {
                setPresetOpen((value) => !value);
                setGalleryOpen(false);
              }}
            />
            <QuestButton questTheme={q} variant="ghost" icon="settings" label={t(lang, 'resetLayout')} onPress={onReset} />
            <QuestButton
              questTheme={q}
              variant="primary"
              icon="check"
              label={t(lang, 'doneEditing')}
              onPress={() => {
                setGalleryOpen(false);
                setPresetOpen(false);
                onEditingChange(false);
              }}
            />
          </View>
        </WebView>
      )}

      {editing && presetOpen ? (
        <QuestCard questTheme={q} variant="flat" style={styles.popoverPanel} className="dashboard-preset-popover">
          <Text style={[styles.sectionTitle, { color: q.colors.text }]}>{t(lang, 'applyPresetCompact')}</Text>
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
        </QuestCard>
      ) : null}

      {editing && galleryOpen ? (
        <QuestCard questTheme={q} variant="flat" style={styles.popoverPanel} className="dashboard-card-gallery-popover">
          <Text style={[styles.sectionTitle, { color: q.colors.text }]}>{t(lang, 'cardGallery')}</Text>
          <AddCardGallery
            hiddenCards={hiddenCards}
            questTheme={q}
            language={lang}
            onAddCard={(cardId) => (onAddCard ? onAddCard(cardId) : onVisibility(cardId, true))}
          />
        </QuestCard>
      ) : null}
    </WebView>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginTop: 8, marginBottom: 8, gap: 8, zIndex: 20 },
  normalRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, minHeight: 34 },
  normalHint: { fontSize: 11, fontWeight: '800', flexShrink: 1 },
  editBar: {
    position: 'sticky' as any,
    top: 8,
    zIndex: 30,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  kicker: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  sectionTitle: { fontSize: 13, fontWeight: '900', marginTop: 2 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', justifyContent: 'flex-end' },
  hintText: { fontSize: 12, fontWeight: '800', lineHeight: 17 },
  popoverPanel: { gap: 10 },
});
