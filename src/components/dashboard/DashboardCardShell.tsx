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
  onDropCard?: (movingCardId?: string) => void;
  onHoverCard?: (targetCardId: string) => void;
  onMoveToCard?: (targetCardId: string) => void;
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
  onDropCard,
  onHoverCard,
  onMoveToCard,
}: Props) {
  const draggingRef = React.useRef(false);
  const q = questTheme ?? getQuestTheme();
  const lang = getLanguage(language);
  const size = preference?.size ?? card.defaultSize;
  const nextSize = getNextDashboardCardSize(card, size);
  const CardContainer = View as any;
  const TilePressable = Pressable as any;
  const DragHandle = View as any;
  const DragSurface = View as any;
  const tileClassName = [
    'dashboard-tile',
    `dashboard-tile-${size}`,
    `dashboard-tile-${card.id}`,
    editMode ? 'dashboard-tile-editing' : '',
    selected ? 'dashboard-tile-selected' : '',
  ].filter(Boolean).join(' ');
  const handleDragStart = (event: any) => {
    event?.dataTransfer?.setData?.('text/plain', card.id);
    if (event?.dataTransfer) event.dataTransfer.effectAllowed = 'move';
    onDragStart?.();
  };
  const handleDragOver = (event: any) => {
    event?.preventDefault?.();
    if (event?.dataTransfer) event.dataTransfer.dropEffect = 'move';
    onDragEnter?.();
  };
  const handleDrop = (event: any) => {
    event?.preventDefault?.();
    onDropCard?.(event?.dataTransfer?.getData?.('text/plain'));
  };
  const getDashboardCardIdFromPoint = (clientX: number, clientY: number) => {
    const tile = document.elementFromPoint(clientX, clientY)?.closest?.('[id^="dashboard-card-"]') as HTMLElement | null;
    return tile?.id?.replace(`dashboard-card-${surface}-`, '');
  };
  const getPointFromNativeEvent = (nativeEvent: any) => {
    const clientX = typeof nativeEvent?.clientX === 'number'
      ? nativeEvent.clientX
      : typeof nativeEvent?.pageX === 'number'
        ? nativeEvent.pageX - (typeof window !== 'undefined' ? window.scrollX : 0)
        : undefined;
    const clientY = typeof nativeEvent?.clientY === 'number'
      ? nativeEvent.clientY
      : typeof nativeEvent?.pageY === 'number'
        ? nativeEvent.pageY - (typeof window !== 'undefined' ? window.scrollY : 0)
        : undefined;
    if (typeof clientX !== 'number' || typeof clientY !== 'number') return undefined;
    return { clientX, clientY };
  };
  const isIgnoredDragTarget = (target?: HTMLElement) => (
    !!target?.closest?.('input, textarea, [contenteditable="true"], [aria-label="移除卡片"], [aria-label="Remove card"], [aria-label="调整大小"], [aria-label="Resize card"]')
  );
  const markDragHover = (clientX: number, clientY: number) => {
    const targetId = getDashboardCardIdFromPoint(clientX, clientY);
    if (targetId && targetId !== card.id) {
      onHoverCard?.(targetId);
      onDragEnter?.();
    }
    return targetId;
  };
  const finishDragAt = (clientX?: number, clientY?: number) => {
    if (typeof clientX === 'number' && typeof clientY === 'number') {
      const targetId = getDashboardCardIdFromPoint(clientX, clientY);
      if (targetId && targetId !== card.id) onMoveToCard?.(targetId);
    }
    draggingRef.current = false;
    document.body.classList.remove('dashboard-dragging');
    onDragEnd?.();
  };
  const beginDrag = (event: any) => {
    if (!editMode) return;
    const target = event?.target as HTMLElement | undefined;
    if (isIgnoredDragTarget(target)) return;
    event?.preventDefault?.();
    event?.stopPropagation?.();
    draggingRef.current = true;
    document.body.classList.add('dashboard-dragging');
    onDragStart?.();
    const pointerId = event?.nativeEvent?.pointerId ?? event?.pointerId;
    const currentTarget = event?.currentTarget;
    currentTarget?.setPointerCapture?.(pointerId);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      markDragHover(moveEvent.clientX, moveEvent.clientY);
    };
    const handlePointerUp = (upEvent: PointerEvent) => {
      finishDragAt(upEvent.clientX, upEvent.clientY);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };
  const handleResponderGrant = (event: any) => {
    if (!editMode) return;
    const target = event?.target as HTMLElement | undefined;
    if (isIgnoredDragTarget(target)) return;
    event?.preventDefault?.();
    event?.stopPropagation?.();
    draggingRef.current = true;
    document.body.classList.add('dashboard-dragging');
    onDragStart?.();
  };
  const handleResponderMove = (event: any) => {
    if (!draggingRef.current) return;
    const point = getPointFromNativeEvent(event?.nativeEvent);
    if (point) markDragHover(point.clientX, point.clientY);
  };
  const handleResponderRelease = (event: any) => {
    if (!draggingRef.current) return;
    const point = getPointFromNativeEvent(event?.nativeEvent);
    finishDragAt(point?.clientX, point?.clientY);
  };

  const content = (
    <CardContainer
      className={`dashboard-card-shell ${surface}-dashboard-card dashboard-card-${card.id} ${editMode ? 'dashboard-card-editing' : ''}`}
      nativeID={`dashboard-card-${surface}-${card.id}`}
      onPointerDown={editMode ? beginDrag : undefined}
      onStartShouldSetResponder={editMode ? () => true : undefined}
      onMoveShouldSetResponder={editMode ? () => true : undefined}
      onResponderGrant={editMode ? handleResponderGrant : undefined}
      onResponderMove={editMode ? handleResponderMove : undefined}
      onResponderRelease={editMode ? handleResponderRelease : undefined}
      onResponderTerminate={editMode ? handleResponderRelease : undefined}
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
          <DragSurface
            accessibilityLabel={t(lang, 'grabToMove')}
            onPointerDown={beginDrag}
            style={styles.dragSurface}
          />
          <TouchableOpacity
            activeOpacity={0.8}
            accessibilityLabel={t(lang, 'removeCard')}
            onPress={onRemove}
            style={[styles.removeBadge, { backgroundColor: q.colors.dangerSoft, borderColor: q.colors.danger }]}
          >
            <Text style={[styles.removeText, { color: q.colors.danger }]}>×</Text>
          </TouchableOpacity>
          <DragHandle
            accessibilityLabel={t(lang, 'dragCardToMove')}
            onPointerDown={beginDrag}
            style={[
              styles.dragHandle,
              {
                backgroundColor: selected ? q.colors.primarySoft : q.colors.surfaceElevated,
                borderColor: selected ? q.colors.primary : q.colors.borderStrong,
              },
            ]}
          >
            <Text style={[styles.dragText, { color: selected ? q.colors.primary : q.colors.textMuted }]}>↕</Text>
          </DragHandle>
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
        </>
      ) : null}
    </CardContainer>
  );

  return (
    <TilePressable
      className={tileClassName}
      data-dashboard-card-id={card.id}
      draggable={editMode}
      delayLongPress={320}
      onLongPress={onEnterEdit}
      onPress={undefined}
      onDragStart={editMode ? handleDragStart : undefined}
      onDragOver={editMode ? handleDragOver : undefined}
      onDrop={editMode ? handleDrop : undefined}
      onDragEnd={editMode ? onDragEnd : undefined}
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
  tileEditing: { cursor: 'grab', userSelect: 'none', WebkitUserSelect: 'none' } as any,
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
  dragHandle: {
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
    cursor: 'grab',
    touchAction: 'none',
    userSelect: 'none',
  } as any,
  dragSurface: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3,
    cursor: 'grab',
    touchAction: 'none',
    userSelect: 'none',
  } as any,
  dragText: { fontSize: 16, lineHeight: 18, fontWeight: '900' },
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
});
