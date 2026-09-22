import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { ScheduleBlock } from '../types';
import type { QuestTheme } from '../design/tokens';
import { t, type Lang } from '../i18n';
import { scheduleCopy } from './nativeScheduleCopy';

const HOUR_HEIGHT = 64;
const minute = (time: string) => { const [h, m] = time.split(':').map(Number); return h * 60 + m; };

// Geometry only. Minimum hit areas get separate lanes, not fabricated duration.
export function nativeTimelineLayout(blocks: ScheduleBlock[]) {
  const valid = blocks.filter(block => minute(block.endTime) > minute(block.startTime));
  const start = Math.min(7, ...valid.map(block => Math.floor(minute(block.startTime) / 60)));
  const end = Math.max(23, ...valid.map(block => Math.ceil(minute(block.endTime) / 60)));
  const lanes: number[] = [];
  const items = [...valid].sort((a, b) => minute(a.startTime) - minute(b.startTime) || a.id.localeCompare(b.id)).map(block => {
    const top = (minute(block.startTime) - start * 60) * HOUR_HEIGHT / 60;
    const durationHeight = (minute(block.endTime) - minute(block.startTime)) * HOUR_HEIGHT / 60;
    const height = Math.max(52, durationHeight);
    let lane = lanes.findIndex(bottom => bottom <= top);
    if (lane < 0) lane = lanes.length;
    lanes[lane] = top + height + 4;
    return { block, top, height, durationHeight, lane };
  });
  return { start, end, items, laneCount: Math.max(1, lanes.length), height: Math.max((end - start) * HOUR_HEIGHT, ...lanes, 0) + 16 };
}

export default function NativeDayTimeline({ blocks, now, isToday, theme: q, lang, onSelect, onLayout }: {
  blocks: ScheduleBlock[]; now: Date; isToday: boolean; theme: QuestTheme; lang: Lang;
  onSelect: (block: ScheduleBlock) => void; onLayout: (y: number, nowOffset: number) => void;
}) {
  const { width } = useWindowDimensions();
  const layout = nativeTimelineLayout(blocks);
  const visibleWidth = Math.max(240, Math.min(width - 32, 820));
  const laneWidth = Math.max(116, (visibleWidth - 50) / layout.laneCount);
  const canvasWidth = Math.max(visibleWidth, 50 + laneWidth * layout.laneCount);
  const nowOffset = (now.getHours() * 60 + now.getMinutes() - layout.start * 60) * HOUR_HEIGHT / 60;
  const nowVisible = isToday && nowOffset >= 0 && nowOffset <= (layout.end - layout.start) * HOUR_HEIGHT;
  return <View nativeID="v11-schedule-day-instrument" onLayout={event => onLayout(event.nativeEvent.layout.y, Math.max(0, nowOffset))}>
    <ScrollView horizontal showsHorizontalScrollIndicator={layout.laneCount > 2} contentContainerStyle={{ minWidth: visibleWidth }}>
      <View style={{ height: layout.height, width: canvasWidth }}>
        {Array.from({ length: (layout.end - layout.start) * 4 + 1 }, (_, index) => {
          const hour = layout.start + index / 4;
          return <View key={index} pointerEvents="none" style={{ position: 'absolute', top: index * HOUR_HEIGHT / 4, left: 0, right: 0, flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ width: 43, color: q.colors.textMuted, fontSize: q.typography.captionSize }}>{index % 4 === 0 ? `${hour}:00` : ''}</Text>
            <View style={{ height: StyleSheet.hairlineWidth, width: index % 4 === 0 ? canvasWidth - 43 : 5, backgroundColor: q.colors.border }} />
          </View>;
        })}
        {layout.items.map(({ block, top, height, durationHeight, lane }) => <Pressable key={block.id}
          accessibilityRole="button" accessibilityLabel={`${scheduleCopy(lang, 'actions')}: ${block.title}`}
          accessibilityHint={`${block.startTime}-${block.endTime}`} onPress={() => onSelect(block)}
          style={({ pressed }) => ({ position: 'absolute', top, left: 50 + lane * laneWidth, width: laneWidth - 6, height,
            paddingLeft: 8, paddingRight: 4, paddingTop: 4, backgroundColor: pressed ? q.colors.primarySoft : q.colors.surfaceSoft })}>
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: 2, height: durationHeight, backgroundColor: q.colors.primary }} />
          <Text numberOfLines={1} style={{ color: q.colors.text, fontSize: q.typography.bodySize }}>{block.title}</Text>
          <Text numberOfLines={1} style={{ color: q.colors.textMuted, fontSize: q.typography.captionSize }}>{block.startTime}-{block.endTime}</Text>
        </Pressable>)}
        {nowVisible ? <View pointerEvents="none" style={{ position: 'absolute', top: nowOffset, left: 0, right: 0, flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ width: 50, fontSize: q.typography.captionSize, color: q.colors.primary, backgroundColor: q.colors.surface }}>{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: q.colors.primary }} />
        </View> : null}
      </View>
    </ScrollView>
    {!blocks.length ? <Text style={{ color: q.colors.textMuted, fontSize: q.typography.captionSize }}>{t(lang, 'noBlocksToday')}</Text> : null}
  </View>;
}
