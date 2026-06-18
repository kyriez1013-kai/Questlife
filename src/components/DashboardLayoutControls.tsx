import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DashboardCardPreference, DashboardPresetId, DashboardSurface } from '../types';
import { getLanguage, t } from '../i18n';
import { getQuestTheme, QuestTheme } from '../design/tokens';
import QuestButton from './ui/QuestButton';
import QuestCard from './ui/QuestCard';
import QuestPill from './ui/QuestPill';
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
  onMove: (cardId: string, direction: 'up' | 'down') => void;
  onSize: (cardId: string, size: 'small' | 'medium' | 'large') => void;
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
  onMove,
  onSize,
  onReset,
}: Props) {
  const q = questTheme ?? getQuestTheme();
  const lang = getLanguage(language);
  const normalized = normalizeDashboardPreferences(preferences);
  const prefs = surface === 'today' ? normalized.todayCards : normalized.insightsCards;
  const prefById = new Map(prefs.map((pref) => [pref.cardId, pref]));
  const cards = getDashboardCardsForSurface(surface);
  const visibleCards = cards
    .map((card) => ({ card, pref: prefById.get(card.id) }))
    .filter((item): item is { card: typeof cards[number]; pref: DashboardCardPreference } => !!item.pref && item.pref.visible)
    .sort((a, b) => a.pref.order - b.pref.order);
  const hiddenCards = cards.filter((card) => prefById.get(card.id)?.visible === false);

  return (
    <QuestCard questTheme={q} variant="flat" style={styles.shell} className="control-center dashboard-controls">
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.kicker, { color: q.colors.textMuted }]}>{t(lang, 'controlCenter')}</Text>
          <Text style={[styles.title, { color: q.colors.text }]}>{t(lang, surface === 'today' ? 'todayCards' : 'insightsCards')}</Text>
          <Text style={[styles.subtitle, { color: q.colors.textMuted }]}>{t(lang, 'personalizeDashboard')}</Text>
        </View>
        <QuestButton
          questTheme={q}
          variant={editing ? 'primary' : 'secondary'}
          icon={editing ? 'check' : 'settings'}
          label={editing ? t(lang, 'doneEditing') : t(lang, 'editLayout')}
          onPress={() => onEditingChange(!editing)}
        />
      </View>

      {editing ? (
        <>
          <Text style={[styles.sectionTitle, { color: q.colors.text }]}>{t(lang, 'dashboardPreset')}</Text>
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
            <QuestButton questTheme={q} variant="ghost" icon="settings" label={t(lang, 'resetLayout')} onPress={onReset} />
          </View>

          <Text style={[styles.sectionTitle, { color: q.colors.text }]}>{t(lang, 'cardVisible')}</Text>
          <View style={styles.list}>
            {visibleCards.map(({ card, pref }) => (
              <View key={card.id} style={[styles.cardRow, { borderColor: q.colors.border, backgroundColor: q.colors.surfaceSubtle }]}>
                <View style={{ flex: 1, minWidth: 130 }}>
                  <Text style={[styles.rowTitle, { color: q.colors.text }]}>{t(lang, card.titleKey)}</Text>
                  <Text style={[styles.rowMeta, { color: q.colors.textMuted }]}>{t(lang, card.descriptionKey)}</Text>
                </View>
                <View style={styles.rowActions}>
                  <QuestButton questTheme={q} variant="ghost" label={t(lang, 'moveUp')} onPress={() => onMove(card.id, 'up')} />
                  <QuestButton questTheme={q} variant="ghost" label={t(lang, 'moveDown')} onPress={() => onMove(card.id, 'down')} />
                  {card.allowedSizes.map((size) => (
                    <QuestPill
                      key={size}
                      questTheme={q}
                      active={pref.size === size}
                      label={t(lang, size === 'small' ? 'sizeSmall' : size === 'medium' ? 'sizeMedium' : 'sizeLarge')}
                      onPress={() => onSize(card.id, size)}
                    />
                  ))}
                  <QuestButton questTheme={q} variant="secondary" label={t(lang, 'hideCard')} onPress={() => onVisibility(card.id, false)} />
                </View>
              </View>
            ))}
          </View>

          {hiddenCards.length > 0 ? (
            <>
              <Text style={[styles.sectionTitle, { color: q.colors.text }]}>{t(lang, 'hiddenCards')}</Text>
              <View style={styles.wrap}>
                {hiddenCards.map((card) => (
                  <QuestButton
                    key={card.id}
                    questTheme={q}
                    variant="ghost"
                    icon="plus"
                    label={`${t(lang, 'showCard')} · ${t(lang, card.titleKey)}`}
                    onPress={() => onVisibility(card.id, true)}
                  />
                ))}
              </View>
            </>
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
  sectionTitle: { fontSize: 13, fontWeight: '900', marginTop: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  list: { gap: 8 },
  cardRow: { borderWidth: 1, borderRadius: 12, padding: 10, gap: 10 },
  rowTitle: { fontSize: 13, fontWeight: '900' },
  rowMeta: { fontSize: 11, fontWeight: '700', lineHeight: 16, marginTop: 2 },
  rowActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, alignItems: 'center' },
});
