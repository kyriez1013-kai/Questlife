// @ts-expect-error Node test execution requires the explicit extension.
import { migrateAppearanceSettings } from './appearance.ts';

function equal(actual: unknown, expected: unknown, name: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${name}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

function absent(record: Record<string, unknown>, key: string, name: string) {
  if (key in record) throw new Error(`${name}: ${key} must be removed`);
}

export function runAppearanceMigrationTests() {
  const legacyBlue = migrateAppearanceSettings({
    selectedThemeId: 'cleanFocus',
    accentColor: '#007AFF',
  });
  equal(legacyBlue.selectedThemeId, 'light', 'legacy blue appearance maps to canonical light');
  absent(legacyBlue, 'accentColor', 'legacy blue accent');

  const legacyBackground = migrateAppearanceSettings({
    selectedThemeId: 'oceanCalm',
    backgroundStyle: 'blueMist',
    themePalette: 'ocean',
  });
  equal(legacyBackground.selectedThemeId, 'light', 'alternative background maps to canonical light');
  absent(legacyBackground, 'backgroundStyle', 'legacy background style');
  absent(legacyBackground, 'themePalette', 'legacy palette');

  equal(migrateAppearanceSettings({ selectedThemeId: 'dark' }).selectedThemeId, 'dark', 'dark preserved');
  equal(migrateAppearanceSettings({ selectedThemeId: 'light' }).selectedThemeId, 'light', 'light preserved');
  equal(migrateAppearanceSettings({ selectedThemeId: 'system' }).selectedThemeId, 'system', 'system preserved');
  equal(migrateAppearanceSettings({ selectedThemeId: 'unknown-era-theme' }).selectedThemeId, 'system', 'unknown fails safely');

  const goals = [{ id: 'goal-1', name: 'Keep me' }];
  const settings = {
    selectedThemeId: 'warmRecovery',
    language: 'zh',
    dashboardPreferences: { activePreset: 'learning' },
    onboardingCompleted: true,
  };
  const appData = { goals, settings };
  const migratedData = { ...appData, settings: migrateAppearanceSettings(appData.settings) };
  equal(migratedData.goals, goals, 'unrelated entity data unchanged');
  equal(migratedData.settings.language, 'zh', 'language unchanged');
  equal(migratedData.settings.dashboardPreferences, { activePreset: 'learning' }, 'dashboard preferences unchanged');
  equal(migratedData.settings.onboardingCompleted, true, 'onboarding state unchanged');

  const once = migrateAppearanceSettings({ selectedThemeId: 'deepWork', accentColor: '#A78BFA', language: 'en' });
  const twice = migrateAppearanceSettings(once);
  equal(twice, once, 'migration idempotent');

  equal(migrateAppearanceSettings(undefined), { selectedThemeId: 'system' }, 'fresh canonical default');
}

runAppearanceMigrationTests();
console.log('appearance migration tests passed: 9 cases');
