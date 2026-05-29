// V2.4: "技能" Tab — 列表 (内嵌在 SkillsStack 里)
// - 按 Category 分组, 可折叠/展开
// - 点击技能行 → 导航到 SkillDetail
// - 长按技能行 → 删除
// - + 按钮 → 打开 SkillForm 创建新技能
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../store';
import { appAccent, theme } from '../theme';
import { Skill, Category, skillTotalMinutes, skillStreak, skillMinutesOnDate } from '../types';
import { today } from '../storage';
import SkillForm from '../components/SkillForm';

export default function SkillsScreen() {
  const { data, deleteSkill } = useStore();
  const nav = useNavigation<any>();
  const accent = appAccent(data.settings.accentColor);
  const todayStr = today();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // SkillForm 状态: 只用于创建
  const [creating, setCreating] = useState(false);
  const [presetCatId, setPresetCatId] = useState<string | undefined>(undefined);

  const openCreate = (cid?: string) => {
    if (data.categories.length === 0) {
      Alert.alert('请先建一个大目标', '技能必须挂在大目标下。去「目标」Tab 新建一个吧。');
      return;
    }
    setPresetCatId(cid);
    setCreating(true);
  };

  const goDetail = (skillId: string) => nav.navigate('SkillDetail', { skillId });

  const askDelete = (s: Skill) => {
    Alert.alert('删除技能', `确认删除「${s.name}」?`, [
      { text: '取消' },
      { text: '删除', style: 'destructive', onPress: () => deleteSkill(s.id) },
    ]);
  };

  const grouped = data.categories.map((cat) => ({
    cat,
    skills: data.skills.filter((s) => s.categoryId === cat.id),
  }));

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <View style={styles.headerRow}>
          <Text style={styles.h1}>技能</Text>
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: accent }]} onPress={() => openCreate()}>
            <Text style={styles.addBtnText}>+ 技能</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.sub}>点击技能查看详情 · 长按删除</Text>

        {data.categories.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>请先到「目标」Tab 新建一个大目标</Text>
            <Text style={styles.emptyDesc}>技能必须挂在大目标下</Text>
          </View>
        )}

        {grouped.map(({ cat, skills }) => {
          const isCollapsed = collapsed[cat.id] === true;
          const catTodayMin = skills.reduce((s, sk) => s + skillMinutesOnDate(sk.id, todayStr, data.actions), 0);
          const catTotalMin = skills.reduce((s, sk) => s + skillTotalMinutes(sk.id, data.actions), 0);
          return (
            <View key={cat.id} style={styles.group}>
              {/* 视觉降级: 纯文字小标题, 不再是卡片行 */}
              <View style={styles.groupHeader}>
                <TouchableOpacity
                  onPress={() => setCollapsed((c) => ({ ...c, [cat.id]: !c[cat.id] }))}
                  style={styles.groupHeaderTitle}
                  activeOpacity={0.6}
                >
                  <Text style={styles.groupCaret}>{isCollapsed ? '▸' : '▾'}</Text>
                  <Text style={styles.groupName}>
                    {cat.emoji ?? '🎯'} {cat.name}
                  </Text>
                  <Text style={styles.groupMeta}>· {skills.length}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => openCreate(cat.id)} hitSlop={8}>
                  <Text style={[styles.smallPlus, { color: accent }]}>+</Text>
                </TouchableOpacity>
              </View>

              {!isCollapsed && skills.length === 0 && (
                <Text style={styles.emptySkillTip}>该大目标下还没有技能，点 + 添加</Text>
              )}

              {!isCollapsed && skills.map((s) => (
                <SkillCard
                  key={s.id}
                  skill={s}
                  actions={data.actions}
                  todayStr={todayStr}
                  onPress={() => goDetail(s.id)}
                  onDelete={() => askDelete(s)}
                />
              ))}
            </View>
          );
        })}
      </ScrollView>

      {/* 仅用于创建; 编辑在 SkillDetailScreen */}
      <SkillForm
        visible={creating}
        onClose={() => setCreating(false)}
        presetCategoryId={presetCatId}
      />
    </SafeAreaView>
  );
}

function SkillCard({
  skill: s, actions, todayStr, onPress, onDelete,
}: { skill: Skill; actions: any[]; todayStr: string; onPress: () => void; onDelete: () => void }) {
  const totalMin = skillTotalMinutes(s.id, actions);
  const totalHours = totalMin / 60;
  const streak = skillStreak(s.id, actions);
  const todayMin = skillMinutesOnDate(s.id, todayStr, actions);
  const targetHours = s.totalTargetHours;
  const totalProgress = targetHours ? Math.min(1, totalHours / targetHours) : null;
  const totalPercent = totalProgress !== null ? (totalProgress * 100).toFixed(1) : null;

  const dailyRatio = s.dailyTargetMinutes > 0 ? todayMin / s.dailyTargetMinutes : 0;
  const dailyOverflow = dailyRatio > 1;
  const dailyBarWidth = Math.min(100, dailyRatio * 100);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} onLongPress={onDelete}>
      <View style={styles.row}>
        <View style={[styles.iconBox, { backgroundColor: s.color }]}>
          <Text style={{ fontSize: 22 }}>{s.icon ?? '🧩'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{s.name}</Text>
          <Text style={styles.line}>
            累计 {totalHours.toFixed(1)}h
            {targetHours ? ` / 目标 ${targetHours}h` : ''}
            {totalPercent !== null ? ` · ${totalPercent}%` : ''}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.streak}>🔥 连续 {streak} 天</Text>
            {s.reminderEnabled && s.reminderHour != null && s.reminderMinute != null && (
              <Text style={styles.reminder}>
                ⏰ {String(s.reminderHour).padStart(2,'0')}:{String(s.reminderMinute).padStart(2,'0')}
              </Text>
            )}
          </View>
        </View>
        <Text style={styles.chev}>›</Text>
      </View>

      {totalProgress !== null && (
        <View style={styles.barBg}>
          <View style={[styles.barFg, { width: `${totalProgress * 100}%`, backgroundColor: s.color }]} />
        </View>
      )}

      <View style={styles.dailyRow}>
        <Text style={styles.dailyLabel}>今日</Text>
        <View style={styles.dailyBarBg}>
          <View
            style={[
              styles.dailyBarFg,
              { width: `${dailyBarWidth}%`, backgroundColor: dailyOverflow ? theme.success : s.color },
            ]}
          />
        </View>
        {dailyOverflow ? (
          <View style={styles.overChip}>
            <Text style={styles.overChipText}>✅ 超额完成</Text>
          </View>
        ) : (
          <Text style={styles.dailyText}>{todayMin} / {s.dailyTargetMinutes}m</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  container: { flex: 1, backgroundColor: theme.bg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  h1: { color: theme.text, fontSize: 34, fontWeight: '800' },
  sub: { color: theme.textDim, marginTop: 4, marginBottom: 16 },
  addBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: theme.radius.md, ...theme.shadow },
  addBtnText: { color: '#fff', fontWeight: '700' },
  emptyBox: { backgroundColor: theme.card, padding: 20, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border, ...theme.shadow },
  emptyTitle: { color: theme.text, fontSize: 15, fontWeight: '600' },
  emptyDesc: { color: theme.textDim, marginTop: 6 },
  emptySkillTip: { color: theme.textDim, fontStyle: 'italic', fontSize: 12, paddingVertical: 8, paddingHorizontal: 4 },
  group: { marginBottom: 12 },
  groupHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 4, paddingVertical: 6, marginTop: 6, marginBottom: 4,
  },
  groupHeaderTitle: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  groupCaret: { color: theme.textDim, fontSize: 10, width: 12 },
  groupName: { color: theme.textDim, fontSize: 13, fontWeight: '600', letterSpacing: 0.3 },
  groupMeta: { color: theme.textDim, fontSize: 12, opacity: 0.7 },
  smallPlus: { color: theme.primary, fontSize: 18, fontWeight: '700', paddingHorizontal: 6 },
  card: { backgroundColor: theme.card, padding: 14, borderRadius: theme.radius.lg, marginBottom: 8, borderWidth: 1, borderColor: theme.border, ...theme.shadow },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  name: { color: theme.text, fontSize: 16, fontWeight: '600' },
  line: { color: theme.textDim, fontSize: 12, marginTop: 4 },
  metaRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  streak: { color: theme.accent, fontSize: 12, fontWeight: '600' },
  reminder: { color: theme.primary, fontSize: 12, fontWeight: '600' },
  chev: { color: theme.textDim, fontSize: 22 },
  barBg: { height: 6, backgroundColor: theme.cardAlt, borderRadius: 3, marginTop: 10, overflow: 'hidden' },
  barFg: { height: '100%', borderRadius: 3 },
  dailyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
  dailyLabel: { color: theme.textDim, fontSize: 11, width: 32 },
  dailyBarBg: { flex: 1, height: 6, backgroundColor: theme.cardAlt, borderRadius: 3, overflow: 'hidden' },
  dailyBarFg: { height: '100%', borderRadius: 3 },
  dailyText: { color: theme.textDim, fontSize: 11, minWidth: 70, textAlign: 'right' },
  overChip: { backgroundColor: theme.success + '33', borderColor: theme.success, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  overChipText: { color: theme.success, fontSize: 11, fontWeight: '700' },
});
