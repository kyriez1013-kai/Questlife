import React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useV2Theme } from '../theme';
import { v2t, type V2Lang } from '../copy';
import { T, Button } from './primitives';

/** Evidence level label. Always text + a shaped marker (filled steps), never color alone. */
export type BadgeLevel = 'e0' | 'e1' | 'e2' | 'e3' | 'prior' | 'sample';
const STEPS: Record<BadgeLevel, number> = { e0: 0, e1: 1, e2: 2, e3: 3, prior: 0, sample: 0 };

export function EvidenceBadge({ level, lang, testID }: { level: BadgeLevel; lang: V2Lang; testID?: string }) {
  const t = useV2Theme();
  const color = level === 'sample' ? t.color.sample : level === 'prior' ? t.color.evidence.prior : t.color.evidence[level];
  const filled = STEPS[level];
  return (
    <View testID={testID} accessibilityLabel={v2t(lang, level === 'sample' ? 'ev.sample' : (`ev.${level}` as 'ev.e0'))}
      style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.sm, alignSelf: 'flex-start' }}>
      <View style={{ flexDirection: 'row', gap: 2 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {[0, 1, 2].map((i) => (
          <View key={i} style={{
            width: 10, height: 6, borderRadius: 3,
            backgroundColor: i < filled ? color : 'transparent',
            borderWidth: 1, borderColor: color,
            opacity: level === 'prior' ? 0.55 : 1,
          }} />
        ))}
      </View>
      <T level="caption" style={{ color, fontWeight: '600' }}>{v2t(lang, level === 'sample' ? 'ev.sample' : (`ev.${level}` as 'ev.e0'))}</T>
    </View>
  );
}

export function SampleBadge({ lang }: { lang: V2Lang }) {
  const t = useV2Theme();
  return (
    <View testID="sample-badge" style={{ alignSelf: 'flex-start', paddingHorizontal: t.space.sm, paddingVertical: 2, borderRadius: t.radius.sm, backgroundColor: t.color.sampleSoft, borderWidth: 1, borderStyle: 'dashed', borderColor: t.color.sample }}>
      <T level="caption" style={{ color: t.color.sample, fontWeight: '700' }}>{v2t(lang, 'ev.sample')}</T>
    </View>
  );
}

/** Local persistence status. Failure is loud and offers recovery; success is quiet. */
export function SyncBadge({ pending, failed, lang, onRetry }: { pending: number; failed: boolean; lang: V2Lang; onRetry?: () => void }) {
  const t = useV2Theme();
  if (failed) {
    return (
      <Pressable testID="sync-failed" accessibilityRole="button" accessibilityLabel={`${v2t(lang, 'sync.failed')}，${v2t(lang, 'today.persist.retry')}`} onPress={onRetry}
        style={{ minHeight: t.layout.hit, justifyContent: 'center', flexDirection: 'row', alignItems: 'center', gap: t.space.sm }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.color.danger }} />
        <T level="caption" color="danger" style={{ fontWeight: '600' }}>{v2t(lang, 'sync.failed')} · {v2t(lang, 'today.persist.retry')}</T>
      </Pressable>
    );
  }
  return (
    <View testID={pending > 0 ? 'sync-pending' : 'sync-saved'} style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.sm }} accessibilityLabel={v2t(lang, pending > 0 ? 'sync.pending' : 'sync.saved')}>
      {pending > 0 ? <ActivityIndicator size="small" color={t.color.inkMuted} /> : <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.color.success }} />}
      <T level="caption" color="muted">{v2t(lang, pending > 0 ? 'sync.pending' : 'sync.saved')}</T>
    </View>
  );
}

export function EmptyState({ title, body, action, testID }: { title: string; body?: string; action?: { label: string; onPress: () => void }; testID?: string }) {
  const t = useV2Theme();
  return (
    <View testID={testID} style={{ paddingVertical: t.space.lg, gap: t.space.sm }}>
      <T level="body" color="muted">{title}</T>
      {body ? <T level="caption" color="faint">{body}</T> : null}
      {action ? <View style={{ marginTop: t.space.sm }}><Button variant="secondary" label={action.label} onPress={action.onPress} /></View> : null}
    </View>
  );
}

/** Error with a recovery path. `actions` are ordered; the first is the primary. */
export function ErrorState({ title, body, actions, testID }: { title: string; body?: string; actions: Array<{ label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'ghost' }>; testID?: string }) {
  const t = useV2Theme();
  return (
    <View testID={testID} accessibilityRole="alert" style={{ gap: t.space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.sm }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: t.color.danger }} />
        <T level="title" accessibilityRole="header">{title}</T>
      </View>
      {body ? <T level="body" color="muted">{body}</T> : null}
      <View style={{ gap: t.space.sm }}>
        {actions.map((a, i) => <Button key={a.label} label={a.label} onPress={a.onPress} variant={a.variant ?? (i === 0 ? 'primary' : 'secondary')} fullWidth />)}
      </View>
    </View>
  );
}

export function Toast({ message, testID }: { message: string | null; testID?: string }) {
  const t = useV2Theme();
  if (!message) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: t.layout.tabHeight + 96, alignItems: 'center' }}>
      <View testID={testID} accessibilityRole="alert" style={{ backgroundColor: t.color.ink, paddingHorizontal: t.space.lg, paddingVertical: t.space.md, borderRadius: t.radius.pill }}>
        <T level="body" style={{ color: t.color.bg, fontWeight: '600' }}>{message}</T>
      </View>
    </View>
  );
}
