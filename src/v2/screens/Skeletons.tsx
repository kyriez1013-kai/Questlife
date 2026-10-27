import React, { useMemo } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { useV2Theme } from '../theme';
import { v2t, type V2Lang } from '../copy';
import { useV2Actions, useV2Select } from '../storeBridge';
import { buildEvidenceCards } from '../model/evidence';
import { localDateKey } from '../model/todayModel';
import { aiPreferencesSnapshot } from '../../services/aiPreferences';
import { Button, Chip, Row, Surface, T, Hairline } from '../components/primitives';
import { EmptyState, EvidenceBadge } from '../components/feedback';

/** Web only: leave v2 for the old interface (flag removed, legacy flag set). Reversible any time. */
export function goLegacy(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const u = new URL(window.location.href);
  u.searchParams.delete('questlife_v2_ui');
  u.searchParams.set('questlife_v11_ui', 'legacy');
  window.location.href = u.toString();
}

const Page = ({ children, title }: { children: React.ReactNode; title: string }) => {
  const t = useV2Theme();
  return (
    <ScrollView contentContainerStyle={{ padding: t.space.lg, gap: t.space.xl, maxWidth: t.layout.maxWidth, width: '100%', alignSelf: 'center' }}>
      <View style={{ minHeight: t.layout.hit, justifyContent: 'center' }}><T level="title" accessibilityRole="header">{title}</T></View>
      {children}
    </ScrollView>
  );
};

export function ScheduleSkeleton({ lang }: { lang: V2Lang }) {
  const t = useV2Theme();
  const blocks = useV2Select((s) => s.data.scheduleBlocks);
  const today = localDateKey(new Date());
  const rows = useMemo(() => (blocks ?? []).filter((b) => b.date === today).sort((a, b) => a.startTime.localeCompare(b.startTime)), [blocks, today]);
  return (
    <Page title={v2t(lang, 'sched.title')}>
      {rows.length === 0 ? <EmptyState title={v2t(lang, 'sched.empty')} /> : (
        <View>
          {rows.map((b, i) => (
            <View key={b.id}>
              {i > 0 ? <Hairline /> : null}
              <Row title={b.title} lines={[`${b.startTime}–${b.endTime} · ${b.plannedMinutes} 分钟（计划）`]} />
            </View>
          ))}
        </View>
      )}
      <Button variant="secondary" label={v2t(lang, 'sched.open')} onPress={goLegacy} />
      <View style={{ height: t.space.xl }} />
    </Page>
  );
}

export function InsightsSkeleton({ lang }: { lang: V2Lang }) {
  const t = useV2Theme();
  const stateCheckIns = useV2Select((s) => s.data.stateCheckIns);
  const contextLogs = useV2Select((s) => s.data.contextLogs);
  const executionLogs = useV2Select((s) => s.data.executionLogs);
  const skills = useV2Select((s) => s.data.skills);
  const cards = useMemo(() => buildEvidenceCards({
    stateCheckIns: stateCheckIns ?? [], contextLogs: contextLogs ?? [], executionLogs: executionLogs ?? [],
    skillNames: Object.fromEntries((skills ?? []).map((s) => [s.id, s.name])),
  }), [stateCheckIns, contextLogs, executionLogs, skills]);
  return (
    <Page title={v2t(lang, 'ins.title')}>
      <T level="body" color="muted">{v2t(lang, 'ins.intro')}</T>
      <View style={{ gap: t.space.md }}>
        {cards.map((c) => (
          <Surface key={c.id} style={{ gap: t.space.xs }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: t.space.md }}>
              <T level="body" style={{ fontWeight: '600' }}>{c.subject}</T>
              <EvidenceBadge level={c.level} lang={lang} />
            </View>
            <T level="caption" color="muted">{c.have}/{c.need} {c.unit}{c.unitNote ? ` · ${c.unitNote}` : ''}</T>
            {c.missing ? <T level="caption" color="muted">{c.missing}</T> : null}
            {c.association && c.level !== 'e0' ? <T level="caption" color="faint">{v2t(lang, 'ev.association')}</T> : null}
          </Surface>
        ))}
      </View>
      <Button variant="secondary" label={v2t(lang, 'ins.advanced')} onPress={goLegacy} />
    </Page>
  );
}

export function MeSkeleton({ lang }: { lang: V2Lang }) {
  const t = useV2Theme();
  const actions = useV2Actions();
  const settings = useV2Select((s) => s.data.settings);
  const goals = useV2Select((s) => (s.data.categories ?? []).length);
  const skillCount = useV2Select((s) => (s.data.skills ?? []).length);
  const themeId = settings.selectedThemeId ?? 'system';
  const ai = aiPreferencesSnapshot();
  return (
    <Page title={v2t(lang, 'me.title')}>
      <Surface style={{ gap: t.space.md }}>
        <T level="caption" color="muted">{v2t(lang, 'me.language')}</T>
        <View style={{ flexDirection: 'row', gap: t.space.sm }}>
          <Chip label="中文" selected={lang === 'zh'} onPress={() => actions.setSettings({ language: 'zh', preferredLanguage: 'zh' })} />
          <Chip label="English" selected={lang === 'en'} onPress={() => actions.setSettings({ language: 'en', preferredLanguage: 'en' })} />
        </View>
        <T level="caption" color="muted">{v2t(lang, 'me.theme')}</T>
        <View style={{ flexDirection: 'row', gap: t.space.sm, flexWrap: 'wrap' }}>
          <Chip label="跟随系统" selected={themeId === 'system'} onPress={() => actions.setSettings({ selectedThemeId: 'system' })} />
          <Chip label="浅色" selected={themeId === 'cleanFocus'} onPress={() => actions.setSettings({ selectedThemeId: 'cleanFocus' })} />
          <Chip label="深色" selected={themeId === 'deepWork'} onPress={() => actions.setSettings({ selectedThemeId: 'deepWork' })} />
        </View>
      </Surface>
      <Surface>
        <Row title={v2t(lang, 'me.goals')} lines={[`${goals} 个目标 · ${skillCount} 个技能`]} onPress={goLegacy} />
        <Hairline />
        <Row title={v2t(lang, 'me.account')} lines={[ai.enabled ? '云端 AI：已开启' : '云端 AI：未开启（默认）']} onPress={goLegacy} />
        <Hairline />
        <Row title={v2t(lang, 'me.health')} lines={['不在首次使用时要求权限']} />
      </Surface>
      <Button variant="ghost" label={v2t(lang, 'me.old')} onPress={goLegacy} />
    </Page>
  );
}
