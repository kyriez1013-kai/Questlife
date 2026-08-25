import React, { useMemo } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import type { QuestModule, ScheduleBlock, Skill } from '../../types';
import type { QuestTheme } from '../../design/tokens';
import { t } from '../../i18n';
import QuestIcon from '../ui/QuestIcon';
import type { SchedulePlacement, ScheduleWindow } from '../../utils/scheduleCompiler';
import { deriveScheduleOpenWindows, scheduleMinutesToTime, scheduleTimeToMinutes } from '../../utils/scheduleCompiler';

type Language = 'zh' | 'en';

type TimelineBlock = {
  block: ScheduleBlock;
  proposed: boolean;
  lane: number;
  laneCount: number;
};

type Props = {
  blocks: ScheduleBlock[];
  proposalPlacements?: SchedulePlacement[];
  dayStartMinutes: number;
  dayEndMinutes: number;
  nowMinutes?: number;
  language: Language;
  questTheme: QuestTheme;
  skills: Skill[];
  modules: QuestModule[];
  goals: { id: string; name: string }[];
  moduleSkillLinks: { goalId: string; moduleId: string; skillId: string }[];
  onBlockPress: (block: ScheduleBlock, proposed: boolean) => void;
};

function durationLabel(minutes: number, language: Language) {
  if (minutes < 60) return `${minutes}${t(language, 'scheduleMinuteShort')}`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder
    ? `${hours}${t(language, 'scheduleHourShort')} ${remainder}${t(language, 'scheduleMinuteShort')}`
    : `${hours}${t(language, 'scheduleHourShort')}`;
}

function buildDisplayBlocks(blocks: ScheduleBlock[], placements: SchedulePlacement[]) {
  const proposedIds = new Set(placements.map((placement) => placement.candidate.block.id));
  const stable = blocks
    .filter((block) => !proposedIds.has(block.id))
    .map((block) => ({ block, proposed: false }));
  const proposed = placements.map((placement) => ({
    proposed: true,
    block: {
      ...placement.candidate.block,
      startTime: placement.startTime,
      endTime: placement.endTime,
      plannedMinutes: placement.endMinutes - placement.startMinutes,
    },
  }));
  return [...stable, ...proposed].sort((a, b) => (
    a.block.startTime.localeCompare(b.block.startTime) || a.block.id.localeCompare(b.block.id)
  ));
}

function assignTimelineLanes(rows: Array<{ block: ScheduleBlock; proposed: boolean }>): TimelineBlock[] {
  const result: TimelineBlock[] = [];
  let cluster: Array<{ block: ScheduleBlock; proposed: boolean; lane: number }> = [];
  let clusterEnd = -1;

  const flush = () => {
    if (!cluster.length) return;
    const laneCount = Math.max(1, ...cluster.map((item) => item.lane + 1));
    cluster.forEach((item) => result.push({ ...item, laneCount }));
    cluster = [];
    clusterEnd = -1;
  };

  rows.forEach((row) => {
    const start = scheduleTimeToMinutes(row.block.startTime);
    const end = scheduleTimeToMinutes(row.block.endTime);
    if (cluster.length && start >= clusterEnd) flush();
    const laneEnds: number[] = [];
    cluster.forEach((item) => {
      const itemEnd = scheduleTimeToMinutes(item.block.endTime);
      laneEnds[item.lane] = Math.max(laneEnds[item.lane] ?? -1, itemEnd);
    });
    const availableLane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
    const resolvedLane = availableLane === -1 ? laneEnds.length : availableLane;
    cluster.push({ ...row, lane: resolvedLane });
    clusterEnd = Math.max(clusterEnd, end);
  });
  flush();
  return result;
}

export default function ScheduleDayTimeline({
  blocks,
  proposalPlacements = [],
  dayStartMinutes,
  dayEndMinutes,
  nowMinutes,
  language,
  questTheme,
  skills,
  modules,
  goals,
  moduleSkillLinks,
  onBlockPress,
}: Props) {
  const { width } = useWindowDimensions();
  const q = questTheme;
  const timelineHeight = width >= 768 ? q.spacing.xxl * 23 : q.spacing.xxl * 20;
  const railWidth = q.spacing.xxl + q.spacing.xl;
  const totalMinutes = Math.max(1, dayEndMinutes - dayStartMinutes);
  const displayRows = useMemo(
    () => assignTimelineLanes(buildDisplayBlocks(blocks, proposalPlacements)),
    [blocks, proposalPlacements],
  );
  const displayBlocks = displayRows.map((row) => row.block);
  const openWindows: ScheduleWindow[] = deriveScheduleOpenWindows(dayStartMinutes, dayEndMinutes, displayBlocks);
  const tickCount = Math.floor(totalMinutes / 15);

  const topFor = (minutes: number) => ((minutes - dayStartMinutes) / totalMinutes) * timelineHeight;
  const contextFor = (block: ScheduleBlock) => {
    const skill = block.linkedSkillId ? skills.find((item) => item.id === block.linkedSkillId) : undefined;
    const link = skill ? moduleSkillLinks.find((item) => item.skillId === skill.id) : undefined;
    const goalId = block.linkedGoalId ?? link?.goalId;
    const goal = goalId ? goals.find((item) => item.id === goalId) : undefined;
    const module = link?.moduleId ? modules.find((item) => item.id === link.moduleId) : undefined;
    return [goal?.name, module?.name, skill?.name].filter(Boolean).join(' › ');
  };

  return (
    <View
      nativeID="schedule-v3-day-timeline"
      style={{
        position: 'relative',
        minHeight: timelineHeight,
        borderRadius: q.radius.lg,
        backgroundColor: q.colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: q.colors.cardBorder,
        overflow: 'hidden',
      }}
    >
      {Array.from({ length: tickCount + 1 }, (_, index) => {
        const minutes = dayStartMinutes + index * 15;
        const major = minutes % 60 === 0;
        const half = minutes % 30 === 0;
        return (
          <View
            key={minutes}
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: topFor(minutes),
              left: 0,
              right: 0,
              height: 1,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Text style={{
              width: railWidth - q.spacing.sm,
              color: major ? q.colors.textMuted : 'transparent',
              fontSize: q.typography.metaSize,
              lineHeight: q.typography.metaLineHeight,
              textAlign: 'right',
              paddingRight: q.spacing.sm,
              transform: [{ translateY: -q.spacing.sm }],
            }}>
              {major ? scheduleMinutesToTime(minutes) : ''}
            </Text>
            <View style={{
              width: major ? q.spacing.md : half ? q.spacing.sm : q.spacing.xs,
              height: 1,
              backgroundColor: major ? q.colors.borderStrong : q.colors.divider,
              opacity: major ? 0.7 : 0.46,
            }} />
            {major ? <View style={{ flex: 1, height: 1, backgroundColor: q.colors.divider, opacity: 0.34 }} /> : null}
          </View>
        );
      })}

      {openWindows.map((window) => {
        const duration = window.endMinutes - window.startMinutes;
        if (duration < 45) return null;
        return (
          <View
            key={`open-${window.startMinutes}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: topFor(window.startMinutes) + q.spacing.xs,
              left: railWidth + q.spacing.sm,
              right: q.spacing.sm,
              minHeight: Math.max(q.spacing.lg, topFor(window.endMinutes) - topFor(window.startMinutes) - q.spacing.sm),
              justifyContent: 'center',
              borderLeftWidth: 1,
              borderLeftColor: q.colors.divider,
              paddingLeft: q.spacing.sm,
            }}
          >
            <Text style={{ color: q.colors.textSubtle, fontSize: q.typography.metaSize, lineHeight: q.typography.metaLineHeight }}>
              {t(language, 'scheduleOpenCapacity')} · {durationLabel(duration, language)}
            </Text>
          </View>
        );
      })}

      {displayRows.map(({ block, proposed, lane, laneCount }) => {
        const start = scheduleTimeToMinutes(block.startTime);
        const end = scheduleTimeToMinutes(block.endTime);
        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= dayStartMinutes || start >= dayEndMinutes) return null;
        const top = topFor(Math.max(dayStartMinutes, start));
        const rawHeight = topFor(Math.min(dayEndMinutes, end)) - top;
        const laneWidth = laneCount > 1 ? `${100 / laneCount}%` : '100%';
        const fixed = block.flexibility === 'fixed';
        const completed = block.status === 'completed';
        const skipped = block.status === 'skipped';
        const context = contextFor(block);
        const borderColor = completed
          ? q.colors.success
          : skipped
            ? q.colors.textSubtle
            : fixed
              ? q.colors.borderStrong
              : q.colors.primary;
        return (
          <View
            key={`${block.id}-${proposed ? 'proposal' : 'accepted'}`}
            style={{
              position: 'absolute',
              top,
              left: railWidth + q.spacing.sm,
              right: q.spacing.sm,
              height: Math.max(q.spacing.xl, rawHeight),
            }}
          >
            <Pressable
              onPress={() => onBlockPress(block, proposed)}
              accessibilityRole="button"
              accessibilityLabel={`${block.title}, ${block.startTime}-${block.endTime}, ${fixed ? t(language, 'scheduleFixed') : t(language, 'scheduleFlexible')}`}
              style={({ pressed }) => ({
                position: 'absolute',
                left: `calc(${lane * (100 / laneCount)}% + ${lane ? q.spacing.xs : 0}px)` as any,
                width: `calc(${laneWidth} - ${laneCount > 1 ? q.spacing.xs : 0}px)` as any,
                minHeight: Math.max(q.spacing.xl, rawHeight),
                borderRadius: q.radius.sm,
                borderLeftWidth: fixed ? q.spacing.xs : 2,
                borderWidth: proposed ? 1 : 0,
                borderStyle: proposed ? 'dashed' : 'solid',
                borderColor,
                backgroundColor: fixed ? q.colors.surfaceMuted : q.colors.surfaceElevated,
                paddingHorizontal: q.spacing.sm,
                paddingVertical: q.spacing.xs,
                opacity: skipped ? 0.58 : pressed ? 0.82 : 1,
                overflow: 'hidden',
              })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: q.spacing.xs }}>
                <QuestIcon
                  name={fixed || block.placementLocked ? 'lock' : 'unlock'}
                  size={q.typography.metaSize + q.spacing.xs}
                  color={borderColor}
                />
                <Text numberOfLines={1} style={{ flex: 1, minWidth: 0, color: q.colors.text, fontSize: q.typography.compactBodySize, lineHeight: q.typography.compactBodyLineHeight, fontWeight: q.typography.weightBold }}>
                  {block.title}
                </Text>
                {proposed ? (
                  <Text style={{ color: q.colors.primary, fontSize: q.typography.metaSize, lineHeight: q.typography.metaLineHeight }}>
                    {t(language, 'scheduleProposed')}
                  </Text>
                ) : null}
              </View>
              {rawHeight >= q.spacing.xl * 2 ? (
                <Text numberOfLines={1} style={{ color: q.colors.textMuted, fontSize: q.typography.metaSize, lineHeight: q.typography.metaLineHeight, marginTop: q.spacing.xs }}>
                  {block.startTime}-{block.endTime} · {durationLabel(block.plannedMinutes, language)}
                </Text>
              ) : null}
              {rawHeight >= q.spacing.xxl * 2 && context ? (
                <Text numberOfLines={1} style={{ color: q.colors.textSubtle, fontSize: q.typography.metaSize, lineHeight: q.typography.metaLineHeight, marginTop: q.spacing.xs }}>
                  {context}
                </Text>
              ) : null}
            </Pressable>
          </View>
        );
      })}

      {nowMinutes != null && nowMinutes >= dayStartMinutes && nowMinutes <= dayEndMinutes ? (
        <View pointerEvents="none" style={{ position: 'absolute', top: topFor(nowMinutes), left: railWidth - q.spacing.xs, right: q.spacing.sm, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: q.spacing.sm, height: q.spacing.sm, borderRadius: q.radius.pill, backgroundColor: q.colors.accent }} />
          <View style={{ flex: 1, height: 1, backgroundColor: q.colors.accent }} />
          <Text style={{ color: q.colors.accentStrong, backgroundColor: q.colors.surfaceSubtle, fontSize: q.typography.metaSize, lineHeight: q.typography.metaLineHeight, paddingLeft: q.spacing.xs }}>
            {t(language, 'scheduleNow')}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
