import React, { Suspense, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import type { QuestTheme } from '../design/tokens';
import QuestButton from './ui/QuestButton';

type Props = {
  load: () => Promise<{ default: React.ComponentType }>;
  lang: 'zh' | 'en';
  questTheme: QuestTheme;
};

class ScreenLoadBoundary extends React.Component<{ children: React.ReactNode; fallback: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export default function RetryableScreen({ load, lang, questTheme: q }: Props) {
  const [attempt, setAttempt] = useState(0);
  // React.lazy retains a rejected promise; a user retry needs a fresh lazy type.
  const Screen = useMemo(() => React.lazy(load), [load, attempt]);
  const fallback = (
    <View style={{ flex: 1, justifyContent: 'center', padding: q.spacing.lg, gap: q.spacing.md }}>
      <Text accessibilityRole="alert" style={{ color: q.colors.text, fontSize: q.typography.bodySize }}>
        {lang === 'zh' ? '这个页面暂时无法加载。' : 'This page could not load.'}
      </Text>
      <Text style={{ color: q.colors.textMuted, fontSize: q.typography.captionSize }}>
        {lang === 'zh'
          ? '请检查网络后重试，或先使用其他页面。已有记录未因此删除。'
          : 'Check your connection and retry, or use another tab. This has not deleted your saved records.'}
      </Text>
      <QuestButton questTheme={q} variant="secondary" label={lang === 'zh' ? '重试加载' : 'Retry loading'} onPress={() => setAttempt(value => value + 1)} />
    </View>
  );
  return (
    <ScreenLoadBoundary key={attempt} fallback={fallback}>
      <Suspense fallback={<ActivityIndicator accessibilityLabel={lang === 'zh' ? '正在加载页面' : 'Loading page'} color={q.colors.primary} style={{ flex: 1 }} />}>
        <Screen />
      </Suspense>
    </ScreenLoadBoundary>
  );
}
