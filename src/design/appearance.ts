export type QuestAppearancePreference = 'system' | 'light' | 'dark';

export const defaultQuestAppearancePreference: QuestAppearancePreference = 'system';

const LEGACY_LIGHT_APPEARANCES = new Set([
  'cleanFocus',
  'forestGrowth',
  'oceanCalm',
  'warmRecovery',
]);

const LEGACY_DARK_APPEARANCES = new Set([
  'deepWork',
]);

const OBSOLETE_APPEARANCE_KEYS = [
  'accentColor',
  'accentPalette',
  'appearanceMode',
  'backgroundColor',
  'backgroundStyle',
  'colorScheme',
  'paletteId',
  'surfaceStyle',
  'themeId',
  'themePalette',
] as const;

export function normalizeAppearancePreference(value: unknown): QuestAppearancePreference {
  if (value === 'system' || value === 'light' || value === 'dark') return value;
  if (typeof value === 'string' && LEGACY_LIGHT_APPEARANCES.has(value)) return 'light';
  if (typeof value === 'string' && LEGACY_DARK_APPEARANCES.has(value)) return 'dark';
  return defaultQuestAppearancePreference;
}

/**
 * Migrates appearance preferences only. The caller owns all non-appearance
 * settings and application data, which remain untouched.
 */
export function migrateAppearanceSettings(
  settings: Record<string, unknown> | null | undefined,
): Record<string, unknown> & { selectedThemeId: QuestAppearancePreference } {
  const source = settings && typeof settings === 'object' && !Array.isArray(settings) ? settings : {};
  const legacyPreference = source.selectedThemeId
    ?? source.appearanceMode
    ?? source.colorScheme
    ?? source.themeId;
  const migrated: Record<string, unknown> & { selectedThemeId: QuestAppearancePreference } = {
    ...source,
    selectedThemeId: normalizeAppearancePreference(legacyPreference),
  };

  OBSOLETE_APPEARANCE_KEYS.forEach((key) => {
    delete migrated[key];
  });

  return migrated;
}

export function appearanceSettingsChanged(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown>,
): boolean {
  return JSON.stringify(before ?? {}) !== JSON.stringify(after);
}
