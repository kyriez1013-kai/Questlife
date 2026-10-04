import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'questlife.ai.consent.v1';
export type AiPreferences = { ownerId: string | null; enabled: boolean; includeImportedContext: boolean };
const empty: AiPreferences = { ownerId: null, enabled: false, includeImportedContext: false };
let current = { ...empty };
let loaded: Promise<AiPreferences> | undefined;
let revision = 0;
const listeners = new Set<() => void>();

export function aiPreferencesSnapshot() { return { ...current }; }
export function aiPreferencesRevision() { return revision; }
export function subscribeAiPreferences(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }

export function loadAiPreferences(): Promise<AiPreferences> {
  if (!loaded) loaded = AsyncStorage.getItem(KEY).then(raw => {
    const value = raw ? JSON.parse(raw) : null;
    current = value?.version === 1 && typeof value.ownerId === 'string'
      ? { ownerId: value.ownerId, enabled: value.enabled === true, includeImportedContext: value.includeImportedContext === true }
      : { ...empty };
    listeners.forEach(listener => listener());
    return aiPreferencesSnapshot();
  }).catch(() => { current = { ...empty }; loaded = undefined; return aiPreferencesSnapshot(); });
  return loaded;
}

export async function saveAiPreferences(value: AiPreferences): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify({ version: 1, ...value }));
  current = { ...value };
  loaded = Promise.resolve(aiPreferencesSnapshot());
  revision += 1;
  listeners.forEach(listener => listener());
}
