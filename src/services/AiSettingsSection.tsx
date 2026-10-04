import React, { useEffect, useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { useStore } from '../store';
import { useQuestTheme } from '../design/useQuestTheme';
import { getLanguage, t } from '../i18n';
import { authConfigured, supabaseClient } from '../sync-v2/supabase';
import { readSyncState } from '../sync-v2/runtime';
import { aiPreferencesSnapshot, loadAiPreferences, saveAiPreferences, subscribeAiPreferences } from './aiPreferences';

export function AiPreferencesCoordinator() {
  useEffect(() => { void loadAiPreferences(); }, []);
  return null;
}

export default function AiSettingsSection() {
  const { data } = useStore();
  const theme = useQuestTheme(data.settings.selectedThemeId);
  const lang = getLanguage(data.settings.language);
  const [prefs, setPrefs] = useState(aiPreferencesSnapshot);
  const [owner, setOwner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    const stop = subscribeAiPreferences(() => { if (active) setPrefs(aiPreferencesSnapshot()); });
    void loadAiPreferences();
    if (!authConfigured()) return () => { active = false; stop(); };
    const auth = supabaseClient().auth;
    void auth.getSession().then(({ data }) => { if (active) setOwner(data.session?.user.id ?? null); });
    const { data } = auth.onAuthStateChange((_event, session) => { if (active) setOwner(session?.user.id ?? null); });
    return () => { active = false; stop(); data.subscription.unsubscribe(); };
  }, []);
  const enabled = !!owner && prefs.ownerId === owner && prefs.enabled;
  const update = async (patch: Partial<typeof prefs>) => {
    if (busy || !owner) return;
    setBusy(true); setError(false);
    try {
      const session = await supabaseClient().auth.getSession();
      if (session.error || session.data.session?.user.id !== owner || (await readSyncState()).ownerId !== owner) throw new Error();
      await saveAiPreferences({ ...(prefs.ownerId === owner ? prefs : { ownerId: owner, enabled: false, includeImportedContext: false }), ...patch });
    } catch { setError(true); } finally { setBusy(false); }
  };
  return <View style={{ paddingVertical: 12, gap: 10 }}>
    <Text accessibilityRole="header" style={{ color: theme.colors.text, fontSize: 18 }}>{t(lang, 'aiCloudSettings')}</Text>
    <Text style={{ color: theme.colors.textMuted, fontSize: 14, lineHeight: 21 }}>{t(lang, 'aiCloudConsentNote')}</Text>
    <View style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Text style={{ flex: 1, color: theme.colors.text }}>{t(lang, 'aiCloudEnable')}</Text>
      <Switch accessibilityLabel={t(lang, 'aiCloudEnable')} disabled={!owner || busy} value={enabled} onValueChange={value => void update({ enabled: value })} />
    </View>
    <View style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Text style={{ flex: 1, color: theme.colors.text }}>{t(lang, 'aiCloudIncludeContext')}</Text>
      <Switch accessibilityLabel={t(lang, 'aiCloudIncludeContext')} disabled={!enabled || busy} value={enabled && prefs.includeImportedContext} onValueChange={value => void update({ includeImportedContext: value })} />
    </View>
    <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>{t(lang, owner ? 'aiCloudContextNote' : 'aiCloudSignInFirst')}</Text>
    {error ? <Text accessibilityRole="alert" style={{ color: theme.colors.danger }}>{t(lang, 'aiCloudSaveError')}</Text> : null}
  </View>;
}
