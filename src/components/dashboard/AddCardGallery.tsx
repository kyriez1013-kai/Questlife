import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getLanguage, t } from '../../i18n';
import { getQuestTheme, QuestTheme } from '../../design/tokens';
import QuestButton from '../ui/QuestButton';
import QuestCard from '../ui/QuestCard';
import { DashboardCardMeta, DashboardDomainTag } from '../../utils/dashboardCards';

type Props = {
  hiddenCards: DashboardCardMeta[];
  questTheme?: QuestTheme;
  language?: 'zh' | 'en';
  onAddCard: (cardId: string) => void;
};

const GROUPS: { tag: DashboardDomainTag; labelKey: string }[] = [
  { tag: 'core', labelKey: 'coreCards' },
  { tag: 'learning', labelKey: 'learningCards' },
  { tag: 'fitness', labelKey: 'fitnessCards' },
  { tag: 'recovery', labelKey: 'recoveryCards' },
  { tag: 'context', labelKey: 'contextCards' },
  { tag: 'state', labelKey: 'stateCards' },
  { tag: 'execution', labelKey: 'executionCards' },
  { tag: 'advanced', labelKey: 'advancedCards' },
];

export default function AddCardGallery({ hiddenCards, questTheme, language, onAddCard }: Props) {
  const q = questTheme ?? getQuestTheme();
  const lang = getLanguage(language);
  const used = new Set<string>();
  const groups = GROUPS.map((group) => ({
    ...group,
    cards: hiddenCards.filter((card) => card.domainTags.includes(group.tag) && !used.has(card.id)),
  })).map((group) => {
    group.cards.forEach((card) => used.add(card.id));
    return group;
  }).filter((group) => group.cards.length > 0);
  const leftovers = hiddenCards.filter((card) => !used.has(card.id));

  if (hiddenCards.length === 0) {
    return (
      <QuestCard questTheme={q} variant="flat" style={styles.empty} className="add-card-gallery empty-state">
        <Text style={[styles.emptyText, { color: q.colors.textMuted }]}>{t(lang, 'allCardsVisible')}</Text>
      </QuestCard>
    );
  }

  return (
    <View style={styles.gallery}>
      {[...groups, ...(leftovers.length > 0 ? [{ tag: 'advanced' as DashboardDomainTag, labelKey: 'advancedCards', cards: leftovers }] : [])].map((group) => (
        <View key={group.labelKey} style={styles.group}>
          <Text style={[styles.groupTitle, { color: q.colors.text }]}>{t(lang, group.labelKey)}</Text>
          <View style={styles.grid}>
            {group.cards.map((card) => (
              <QuestCard key={card.id} questTheme={q} variant="flat" style={styles.card} className="add-card-gallery-item">
                <View style={{ flex: 1 }}>
                  <View style={styles.cardTitleRow}>
                    <Text style={[styles.cardTitle, { color: q.colors.text }]}>{t(lang, card.titleKey)}</Text>
                    <View style={[styles.sizeBadge, { backgroundColor: q.colors.primarySoft, borderColor: q.colors.primary }]}> 
                      <Text style={[styles.sizeBadgeText, { color: q.colors.primary }]}> 
                        {t(lang, 'cardSize')}: {t(lang, card.defaultSize === 'small' ? 'sizeSmall' : card.defaultSize === 'medium' ? 'sizeMedium' : 'sizeLarge')}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.cardDescription, { color: q.colors.textMuted }]}>{t(lang, card.descriptionKey)}</Text>
                </View>
                <QuestButton questTheme={q} variant="secondary" icon="plus" label={t(lang, 'addCard')} onPress={() => onAddCard(card.id)} />
              </QuestCard>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  gallery: { gap: 14 },
  group: { gap: 8 },
  groupTitle: { fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  grid: { gap: 8, flexDirection: 'row', flexWrap: 'wrap' },
  card: { gap: 10, flexGrow: 1, flexBasis: 220, minWidth: 220 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cardTitle: { fontSize: 13, fontWeight: '900' },
  cardDescription: { fontSize: 11, fontWeight: '700', lineHeight: 16, marginTop: 2 },
  sizeBadge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  sizeBadgeText: { fontSize: 10, fontWeight: '900' },
  empty: { marginTop: 4 },
  emptyText: { fontSize: 12, fontWeight: '800' },
});
