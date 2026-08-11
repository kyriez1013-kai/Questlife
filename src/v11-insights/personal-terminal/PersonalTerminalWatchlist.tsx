import React, { useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import type { Lang } from '../../i18n';
import { t } from '../../i18n';
import type { V11ThemeTokens } from '../../v11/tokens';
import PersonalTerminalIcon from './PersonalTerminalIcon';
import type { PersonalTerminalCatalogItem, PersonalTerminalCatalogGroup } from './personalTerminalWorkspace';

const WebView = View as any;
const WebPressable = Pressable as any;

function copy(language: Lang, value: PersonalTerminalCatalogItem['label']) {
  if (value.kind === 'text') return value.text;
  return Object.entries(value.values || {}).reduce(
    (result, [key, replacement]) => result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(replacement)),
    t(language, value.key),
  );
}

function reading(value: number | null) {
  if (value == null) return '—';
  if (Math.abs(value) >= 1000) return `${Math.round(value / 100) / 10}k`;
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function MiniSparkline({ item, language, theme }: { item: PersonalTerminalCatalogItem; language: Lang; theme: V11ThemeTokens }) {
  const points = useMemo(() => {
    if (item.miniSeries.length < 2) return '';
    const values = item.miniSeries.map((row) => row.value);
    const low = Math.min(...values);
    const high = Math.max(...values);
    const span = Math.max(1, high - low);
    return item.miniSeries.map((row, index) => {
      const x = index / Math.max(1, item.miniSeries.length - 1) * 78 + 3;
      const y = 21 - (row.value - low) / span * 17;
      return `${x},${y}`;
    }).join(' ');
  }, [item.miniSeries]);
  if (!points) return <WebView dataSet={{ 'personal-terminal-workspace-role': 'sparkline-empty' }} />;
  return (
    <Svg accessibilityLabel={t(language, 'personalTerminalMiniTrend')} height={24} viewBox="0 0 84 24" width={84}>
      <Polyline fill="none" points={points} stroke={theme.glow.primary} strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.25} />
    </Svg>
  );
}

function orderedItems(catalog: PersonalTerminalCatalogItem[], order: string[], pinnedIds: string[]) {
  const byId = new Map(catalog.map((item) => [item.id, item]));
  const ordered = order.flatMap((id) => byId.get(id) ? [byId.get(id)!] : []);
  return [
    ...ordered.filter((item) => pinnedIds.includes(item.id)),
    ...ordered.filter((item) => !pinnedIds.includes(item.id)),
  ];
}

export default function PersonalTerminalWatchlist({
  activeSeriesId,
  catalog,
  editMode,
  language,
  onAdd,
  onMove,
  onRemove,
  onSelect,
  onToggleEdit,
  onTogglePin,
  order,
  pinnedIds,
  theme,
}: {
  activeSeriesId: string;
  catalog: PersonalTerminalCatalogItem[];
  editMode: boolean;
  language: Lang;
  onAdd: () => void;
  onMove: (sourceId: string, targetId: string) => void;
  onRemove: (id: string) => void;
  onSelect: (id: string) => void;
  onToggleEdit: (next: boolean) => void;
  onTogglePin: (id: string) => void;
  order: string[];
  pinnedIds: string[];
  theme: V11ThemeTokens;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const draggingIdRef = useRef<string | null>(null);
  const lastTargetIdRef = useRef<string | null>(null);
  const items = useMemo(() => orderedItems(catalog, order, pinnedIds), [catalog, order, pinnedIds]);
  const groups = useMemo(() => {
    const result = new Map<PersonalTerminalCatalogGroup, PersonalTerminalCatalogItem[]>();
    items.forEach((item) => result.set(item.group, [...(result.get(item.group) || []), item]));
    return result;
  }, [items]);

  return (
    <WebView dataSet={{ 'personal-terminal-workspace-role': 'watchlist' }}>
      <WebView dataSet={{ 'personal-terminal-workspace-role': 'watchlist-header' }}>
        <WebView>
          <Text style={{ color: theme.text.primary }}>{t(language, 'personalTerminalWatchlist')}</Text>
          <Text style={{ color: theme.text.metadata }}>{t(language, 'personalTerminalWatchlistHint')}</Text>
        </WebView>
        <WebView>
          <WebPressable accessibilityLabel={t(language, 'personalTerminalAddInstrument')} accessibilityRole="button" onPress={onAdd}>
            <PersonalTerminalIcon color={theme.text.primary} name="add" size={16} />
          </WebPressable>
          <WebPressable accessibilityLabel={t(language, editMode ? 'personalTerminalFinishWatchlistEdit' : 'personalTerminalEditWatchlist')} accessibilityRole="button" onPress={() => onToggleEdit(!editMode)}>
            <PersonalTerminalIcon color={theme.text.primary} name={editMode ? 'check' : 'edit'} size={16} />
          </WebPressable>
        </WebView>
      </WebView>

      {!items.length ? (
        <WebPressable accessibilityRole="button" dataSet={{ 'personal-terminal-workspace-role': 'watchlist-empty' }} onPress={onAdd}>
          <PersonalTerminalIcon color={theme.text.secondary} name="add" size={18} />
          <Text style={{ color: theme.text.primary }}>{t(language, 'personalTerminalWatchlistEmpty')}</Text>
        </WebPressable>
      ) : [...groups.entries()].map(([group, rows]) => (
        <WebView dataSet={{ 'personal-terminal-watchlist-group': group }} key={group}>
          <Text style={{ color: theme.text.metadata }}>{t(language, `personalTerminalWatchlistGroup_${group}`)}</Text>
          {rows.map((item) => {
            const selected = item.id === activeSeriesId;
            const pinned = pinnedIds.includes(item.id);
            const currentIndex = order.indexOf(item.id);
            return (
              <WebPressable
                accessibilityLabel={`${copy(language, item.label)} · ${reading(item.current)}`}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                dataSet={{
                  'personal-terminal-dragging': draggingId === item.id ? 'true' : 'false',
                  'personal-terminal-editing': editMode ? 'true' : 'false',
                  'personal-terminal-pinned': pinned ? 'true' : 'false',
                  'personal-terminal-selected': selected ? 'true' : 'false',
                  'personal-terminal-watchlist-item-id': item.id,
                  'personal-terminal-workspace-role': 'watchlist-row',
                }}
                draggable={editMode}
                key={item.id}
                onDragEnd={() => { draggingIdRef.current = null; lastTargetIdRef.current = null; setDraggingId(null); }}
                onDragOver={(event: any) => event.preventDefault?.()}
                onDragStart={(event: any) => {
                  draggingIdRef.current = item.id;
                  setDraggingId(item.id);
                  event.dataTransfer?.setData('text/plain', item.id);
                }}
                onDrop={(event: any) => {
                  event.preventDefault?.();
                  const sourceId = draggingId || event.dataTransfer?.getData('text/plain');
                  if (sourceId) onMove(sourceId, item.id);
                  draggingIdRef.current = null;
                  lastTargetIdRef.current = null;
                  setDraggingId(null);
                }}
                onLongPress={() => onToggleEdit(true)}
                onPointerDown={(event: any) => {
                  if (!editMode || event.target?.closest?.('[data-personal-terminal-workspace-role="watchlist-actions"]')) return;
                  event.preventDefault?.();
                  draggingIdRef.current = item.id;
                  lastTargetIdRef.current = item.id;
                  setDraggingId(item.id);
                  event.currentTarget?.setPointerCapture?.(event.pointerId);
                }}
                onPointerMove={(event: any) => {
                  const sourceId = draggingIdRef.current;
                  if (!editMode || !sourceId || typeof document === 'undefined') return;
                  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest?.('[data-personal-terminal-watchlist-item-id]');
                  const targetId = target?.getAttribute?.('data-personal-terminal-watchlist-item-id');
                  if (targetId && targetId !== sourceId && targetId !== lastTargetIdRef.current) {
                    lastTargetIdRef.current = targetId;
                    onMove(sourceId, targetId);
                  }
                }}
                onPointerUp={(event: any) => {
                  if (!draggingIdRef.current) return;
                  event.currentTarget?.releasePointerCapture?.(event.pointerId);
                  draggingIdRef.current = null;
                  lastTargetIdRef.current = null;
                  setDraggingId(null);
                }}
                onPointerCancel={() => {
                  draggingIdRef.current = null;
                  lastTargetIdRef.current = null;
                  setDraggingId(null);
                }}
                onPress={() => { if (!editMode) onSelect(item.id); }}
              >
                {editMode ? <PersonalTerminalIcon color={theme.text.metadata} name="drag" size={15} /> : null}
                <WebView dataSet={{ 'personal-terminal-workspace-role': 'watchlist-copy' }}>
                  <Text numberOfLines={1} style={{ color: selected ? theme.text.primary : theme.text.secondary }}>{copy(language, item.label)}</Text>
                  <Text numberOfLines={1} style={{ color: theme.text.metadata }}>
                    {t(language, `personalTerminalResolution_${item.scope}`)} · {item.observationCount} {t(language, 'personalMarketObservationsShort')}
                  </Text>
                </WebView>
                <MiniSparkline item={item} language={language} theme={theme} />
                <WebView dataSet={{ 'personal-terminal-workspace-role': 'watchlist-value' }}>
                  <Text style={{ color: theme.text.primary }}>{reading(item.current)}</Text>
                  <Text style={{ color: theme.text.metadata }}>{item.deviationAbsolute == null ? '—' : `${item.deviationAbsolute > 0 ? '+' : ''}${reading(item.deviationAbsolute)}`}</Text>
                </WebView>
                {editMode ? (
                  <WebView dataSet={{ 'personal-terminal-workspace-role': 'watchlist-actions' }}>
                    <WebPressable accessibilityLabel={t(language, pinned ? 'personalTerminalUnpinInstrument' : 'personalTerminalPinInstrument')} accessibilityRole="button" onPress={(event: any) => { event.stopPropagation?.(); onTogglePin(item.id); }}>
                      <PersonalTerminalIcon color={pinned ? theme.glow.primary : theme.text.metadata} name="pin" size={14} />
                    </WebPressable>
                    <WebPressable accessibilityLabel={t(language, 'personalTerminalMoveInstrumentUp')} accessibilityRole="button" disabled={currentIndex <= 0} onPress={(event: any) => { event.stopPropagation?.(); if (currentIndex > 0) onMove(item.id, order[currentIndex - 1]); }}>
                      <PersonalTerminalIcon color={theme.text.secondary} name="trend-up" size={14} />
                    </WebPressable>
                    <WebPressable accessibilityLabel={t(language, 'personalTerminalMoveInstrumentDown')} accessibilityRole="button" disabled={currentIndex < 0 || currentIndex >= order.length - 1} onPress={(event: any) => { event.stopPropagation?.(); if (currentIndex >= 0 && currentIndex < order.length - 1) onMove(item.id, order[currentIndex + 1]); }}>
                      <PersonalTerminalIcon color={theme.text.secondary} name="trend-down" size={14} />
                    </WebPressable>
                    <WebPressable accessibilityLabel={t(language, 'personalTerminalRemoveInstrument')} accessibilityRole="button" onPress={(event: any) => { event.stopPropagation?.(); onRemove(item.id); }}>
                      <PersonalTerminalIcon color={theme.text.secondary} name="remove" size={14} />
                    </WebPressable>
                  </WebView>
                ) : null}
              </WebPressable>
            );
          })}
        </WebView>
      ))}
    </WebView>
  );
}

export function PersonalTerminalWatchlistStrip({
  activeSeriesId,
  catalog,
  language,
  onOpen,
  onSelect,
  order,
  pinnedIds,
  theme,
}: {
  activeSeriesId: string;
  catalog: PersonalTerminalCatalogItem[];
  language: Lang;
  onOpen: () => void;
  onSelect: (id: string) => void;
  order: string[];
  pinnedIds: string[];
  theme: V11ThemeTokens;
}) {
  const items = useMemo(() => {
    const ordered = orderedItems(catalog, order, pinnedIds);
    const pinned = ordered.filter((item) => pinnedIds.includes(item.id));
    return (pinned.length ? pinned : ordered).slice(0, 5);
  }, [catalog, order, pinnedIds]);

  if (!items.length) return null;

  return (
    <WebView
      accessibilityLabel={t(language, 'personalTerminalWatchlist')}
      accessibilityRole="list"
      dataSet={{ 'personal-terminal-workspace-role': 'mobile-watchlist-strip' }}
    >
      {items.map((item) => {
        const selected = item.id === activeSeriesId;
        return (
          <WebPressable
            accessibilityLabel={`${copy(language, item.label)} · ${reading(item.current)}`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            dataSet={{
              'personal-terminal-selected': selected ? 'true' : 'false',
              'personal-terminal-workspace-role': 'mobile-watchlist-item',
            }}
            key={item.id}
            onPress={() => onSelect(item.id)}
          >
            <WebView>
              <Text numberOfLines={1} style={{ color: selected ? theme.text.primary : theme.text.secondary }}>{copy(language, item.label)}</Text>
              <Text style={{ color: theme.text.primary }}>{reading(item.current)}</Text>
            </WebView>
            <MiniSparkline item={item} language={language} theme={theme} />
          </WebPressable>
        );
      })}
      <WebPressable
        accessibilityLabel={t(language, 'personalTerminalManageWatchlist')}
        accessibilityRole="button"
        dataSet={{ 'personal-terminal-workspace-role': 'mobile-watchlist-manage' }}
        onPress={onOpen}
      >
        <PersonalTerminalIcon color={theme.text.secondary} name="watchlist" size={15} />
      </WebPressable>
    </WebView>
  );
}
