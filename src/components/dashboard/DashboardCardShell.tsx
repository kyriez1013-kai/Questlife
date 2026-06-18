import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { getLanguage, t } from '../../i18n';
import { DashboardCardPreference, DashboardCardSize, DashboardSurface } from '../../types';
import { getQuestTheme, QuestTheme } from '../../design/tokens';
import QuestIcon from '../ui/QuestIcon';
import { DashboardCardMeta, getNextDashboardCardSize } from '../../utils/dashboardCards';

type Props = {
  surface: DashboardSurface;
  card: DashboardCardMeta;
  preference?: DashboardCardPreference;
  editMode: boolean;
  selected?: boolean;
  questTheme?: QuestTheme;
  language?: 'zh' | 'en';
  style?: ViewStyle | ViewStyle[];
  children: React.ReactNode;
  onSelect?: () => void;
  onRemove?: () => void;
  onResize?: (size: DashboardCardSize) => void;
};

export default function DashboardCardShell({
  surface,
  card,
  preference,
  editMode,
  selected,
  questTheme,
  language,
  style,
  children,
  onSelect,
  onRemove,
  onResize,
}: Props) {
  const q = questTheme ?? getQuestTheme();
  const lang = getLanguage(language);
  const size = preference?.size ?? card.defaultSize;
  const nextSize = getNextDashboardCardSize(card, size);
  const CardContainer = View as any;

  const content = (
    <CardContainer
      className={`dashboard-card-shell ${surface}-dashboard-card dashboard-card-${card.id} ${editMode ? 'dashboard-card-editing' : ''}`}
      style={[
        styles.shell,
        size === 'small' ? styles.small : size === 'large' ? styles.large : styles.medium,
        {
          borderColor: selected ? q.colors.primary : editMode ? q.colors.borderStrong : 'transparent',
          backgroundColor: editMode ? q.colors.surfaceSubtle : 'transparent',
        },
        style,
      ]}
    >
      {children}
      {editMode ? (
        <>
          <TouchableOpacity
            activeOpacity={0.8}
            accessibilityLabel={t(lang, 'removeCard')}
            onPress={onRemove}
            style={[styles.removeBadge, { backgroundColor: q.colors.dangerSoft, borderColor: q.colors.danger }]}
          >
            <Text style={[styles.removeText, { color: q.colors.danger }]}>×</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            accessibilityLabel={t(lang, 'resizeCard')}
            onPress={() => onResize?.(nextSize)}
            style={[styles.resizeHandle, { backgroundColor: q.colors.primarySoft, borderColor: q.colors.primary }]}
          >
            <QuestIcon name="settings" size={13} color={q.colors.primary} strokeWidth={2.5} />
            <Text style={[styles.sizeLabel, { color: q.colors.primary }]}>{t(lang, size === 'small' ? 'sizeSmall' : size === 'medium' ? 'sizeMedium' : 'sizeLarge')}</Text>
          </TouchableOpacity>
          {selected ? (
            <View style={[styles.selectedPill, { backgroundColor: q.colors.primarySoft, borderColor: q.colors.primary }]}> 
              <Text style={[styles.selectedText, { color: q.colors.primary }]}>{t(lang, 'cardReordered')}</Text>
            </View>
          ) : null}
        </>
      ) : null}
    </CardContainer>
  );

  if (!editMode) return content;
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onSelect} style={styles.touchShell}>
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchShell: { width: '100%' },
  shell: {
    position: 'relative',
    borderWidth: 1,
    borderRadius: 18,
  },
  small: { padding: 4 },
  medium: { padding: 6 },
  large: { padding: 8 },
  removeBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  removeText: { fontSize: 18, lineHeight: 20, fontWeight: '900' },
  resizeHandle: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    zIndex: 5,
  },
  sizeLabel: { fontSize: 10, fontWeight: '900' },
  selectedPill: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  selectedText: { fontSize: 10, fontWeight: '900' },
});
