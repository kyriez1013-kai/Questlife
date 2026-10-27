import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useV2Theme } from '../theme';
import { v2t, type V2Lang } from '../copy';
import { buildSampleToday } from '../model/sample';
import { TodayView } from './TodayView';
import { Button, T } from '../components/primitives';

/**
 * Example mode. Everything here is in-memory and visibly fake: a permanent band, a dashed frame,
 * an "示例" badge instead of the sync badge, and all actions disabled. It never reads or writes the Store.
 */
export function SampleTour({ lang, onExit }: { lang: V2Lang; onExit: () => void }) {
  const t = useV2Theme();
  const now = useMemo(() => new Date(), []);
  const model = useMemo(() => buildSampleToday(now), [now]);
  return (
    <View testID="sample-tour" style={{ flex: 1, borderWidth: 3, borderStyle: 'dashed', borderColor: t.color.sample, backgroundColor: t.color.bg }}>
      <View style={{ backgroundColor: t.color.sampleSoft, paddingHorizontal: t.space.lg, paddingVertical: t.space.md, gap: t.space.xs }}>
        <T testID="sample-band" level="body" style={{ color: t.color.sample, fontWeight: '700' }}>{v2t(lang, 'sample.band')}</T>
        <T level="caption" style={{ color: t.color.sample }}>{v2t(lang, 'sample.note')}</T>
      </View>
      <TodayView
        lang={lang}
        model={model}
        dateLabel={v2t(lang, 'sample.today.title')}
        command={{ title: '继续：卧推', reason: '示例：根据你最近 3 次卧推的节奏。' }}
        persistence={{ pending: 0, failed: false }}
        onRetryPersist={() => undefined}
        onLogState={() => undefined}
        stateSaving={false}
        stateError={null}
        composer=""
        onComposer={() => undefined}
        onSubmitComposer={() => undefined}
        onPrimary={() => undefined}
        onDoneLog={() => undefined}
        onQuick={() => undefined}
        sample
      />
      <View style={{ padding: t.space.lg, backgroundColor: t.color.bg, borderTopWidth: 1, borderTopColor: t.color.hairline }}>
        <Button testID="sample-exit" size="lg" fullWidth label={v2t(lang, 'sample.exit')} onPress={onExit} />
      </View>
    </View>
  );
}
