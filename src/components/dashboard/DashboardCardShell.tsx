import React from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { getLanguage, t } from '../../i18n';
import { DashboardCardPreference, DashboardCardSize, DashboardSurface } from '../../types';
import { getQuestTheme, QuestTheme } from '../../design/tokens';
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
  onEnterEdit?: () => void;
  onRemove?: () => void;
  onResize?: (size: DashboardCardSize) => void;
  onDragStart?: () => void;
  onDragEnter?: () => void;
  onDragEnd?: () => void;
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
  onEnterEdit,
  onRemove,
  onResize,
  onDragStart,
  onDragEnter,
  onDragEnd,
}: Props) {
  const q = questTheme ?? getQuestTheme();
  const lang = getLanguage(language);
  const size = preference?.size ?? card.defaultSize;
  const nextSize = getNextDashboardCardSize(card, size);
  const CardContainer = View as any;
  const TilePressable = Pressable as any;
  const tileClassName = [
    'dashboard-tile',
    `dashboard-tile-${size}`,
    `dashboard-tile-${card.id}`,
    editMode ? 'dashboard-tile-editing' : '',
    selected ? 'dashboard-tile-selected' : '',
  ].filter(Boolean).join(' ');

  const content = (
    <CardContainer
      className={`dashboard-card-shell ${surface}-dashboard-card dashboard-card-${card.id} ${editMode ? 'dashboard-card-editing' : ''}`}
      style={[
        styles.shell,
        size === 'small' ? styles.small : size === 'large' ? styles.large : styles.medium,
        {
          borderColor: selected ? q.colors.primary : editMode ? q.colors.borderStrong : 'transparent',
          backgroundColor: editMode ? q.colors.surfaceSoft : 'transparent',
          shadowColor: q.colors.cardShadow,
        },
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
            accessibilityLabel={t(lang, 'selectCardToMove')}
            onPress={onSelect}
            style={[
              styles.moveHandle,
              {
                backgroundColor: selected ? q.colors.primarySoft : q.colors.surfaceElevated,
                borderColor: selected ? q.colors.primary : q.colors.borderStrong,
              },
            ]}
          >
            <Text style={[styles.moveText, { color: selected ? q.colors.primary : q.colors.textMuted }]}>↕</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            accessibilityLabel={t(lang, 'resizeCard')}
            onPress={() => onResize?.(nextSize)}
            style={[styles.resizeHandle, { backgroundColor: q.colors.primarySoft, borderColor: q.colors.primary }]}
          >
            <View style={styles.gripMarks}>
              <View style={[styles.gripMark, { backgroundColor: q.colors.primary }]} />
              <View style={[styles.gripMark, styles.gripMarkMiddle, { backgroundColor: q.colors.primary }]} />
              <View style={[styles.gripMark, styles.gripMarkLong, { backgroundColor: q.colors.primary }]} />
            </View>
            <Text style={[styles.sizeLabel, { color: q.colors.primary }]}>{t(lang, size === 'small' ? 'sizeSmall' : size === 'medium' ? 'sizeMedium' : 'sizeLarge')}</Text>
          </TouchableOpacity>
          {selected ? (
            <View style={[styles.selectedPill, { backgroundColor: q.colors.primarySoft, borderColor: q.colors.primary }]}> 
              <Text style={[styles.selectedText, { color: q.colors.primary }]}>{t(lang, 'dragToMove')}</Text>
            </View>
          ) : null}
        </>
      ) : null}
    </CardContainer>
  );

  return (
    <TilePressable
      className={tileClassName}
      delayLongPress={320}
      onLongPress={onEnterEdit}
      onPress={editMode ? onSelect : undefined}
      onPointerDown={editMode ? onDragStart : undefined}
      onPointerEnter={editMode ? onDragEnter : undefined}
      onPointerUp={editMode ? onDragEnd : undefined}
      style={({ pressed }: { pressed: boolean }) => [
        styles.touchShell,
        size === 'large' ? styles.tileLarge : size === 'small' ? styles.tileSmall : styles.tileMedium,
        editMode && styles.tileEditing,
        selected && styles.tileSelected,
        pressed && editMode ? { transform: [{ scale: 0.992 }] } : null,
        style,
      ]}
    >
      {content}
    </TilePressable>
  );
}

const styles = StyleSheet.create({
  touchShell: { width: '100%' },
  tileSmall: { minHeight: 76 },
  tileMedium: { minHeight: 118 },
  tileLarge: { minHeight: 168 },
  tileEditing: { cursor: 'grab' } as any,
  tileSelected: { cursor: 'grabbing' } as any,
  shell: {
    position: 'relative',
    borderWidth: 1,
    borderRadius: 18,
    minHeight: '100%' as any,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  small: { padding: 3 },
  medium: { padding: 5 },
  large: { padding: 7 },
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
  moveHandle: {
    position: 'absolute',
    top: -8,
    left: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  moveText: { fontSize: 16, lineHeight: 18, fontWeight: '900' },
  resizeHandle: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 46,
    paddingHorizontal: 8,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    zIndex: 5,
  },
  gripMarks: { width: 16, height: 14, justifyContent: 'flex-end', alignItems: 'flex-end', gap: 2 },
  gripMark: { width: 6, height: 2, borderRadius: 999, transform: [{ rotate: '-45deg' }] },
  gripMarkMiddle: { width: 10 },
  gripMarkLong: { width: 14 },
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
