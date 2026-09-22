import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useStore } from '../store';
import { getLanguage } from '../i18n';
import { useQuestTheme } from '../design/useQuestTheme';
import QuestButton from './ui/QuestButton';
import { nativeFormCopy } from '../native/nativeFormCopy';

/** Local durability is distinct from an offline, already durable sync outbox. */
export default function LocalPersistenceNotice() {
  const { data, localPersistence, retryLocalWrites } = useStore();
  const q = useQuestTheme(data.settings.selectedThemeId);
  const lang = getLanguage(data.settings.language);
  const [retrying, setRetrying] = useState(false);
  if (!localPersistence.failed && !retrying) return null;
  return <View style={{ paddingHorizontal: q.spacing.md, paddingVertical: q.spacing.sm, backgroundColor: q.colors.surfaceElevated, borderBottomWidth: 1, borderBottomColor: q.colors.borderStrong }}>
    <Text accessibilityRole="alert" style={{ color: q.colors.text, fontSize: q.typography.bodySize }}>{nativeFormCopy(lang, retrying ? 'pending' : 'failed')}</Text>
    <Text style={{ color: q.colors.textMuted, fontSize: q.typography.captionSize, marginVertical: q.spacing.xs }}>{nativeFormCopy(lang, 'failedBody')}</Text>
    <QuestButton questTheme={q} variant="secondary" label={nativeFormCopy(lang, 'retrySave')} loading={retrying}
      onPress={() => { setRetrying(true); void retryLocalWrites().catch(() => undefined).finally(() => setRetrying(false)); }} />
  </View>;
}
