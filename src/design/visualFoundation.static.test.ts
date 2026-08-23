import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

function source(relativeUrl: string) {
  return readFileSync(fileURLToPath(new URL(relativeUrl, import.meta.url)), 'utf8');
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const tokens = source('./tokens.ts');
const foundation = source('./visualFoundation.ts');
const settings = source('../screens/SettingsScreen.tsx');
const v11Tokens = source('../v11/tokens.ts');
const legacyFacade = source('../theme.ts');
const productSources = [
  source('../../App.tsx'),
  source('../screens/HomeScreen.tsx'),
  source('../screens/GoalTreeScreen.tsx'),
  source('../screens/ScheduleScreen.tsx'),
  source('../screens/StatsScreen.tsx'),
  settings,
].join('\n');

assert(!/forestGrowth:\s*\{/.test(tokens), 'forestGrowth must not remain a selectable theme definition');
assert(!/oceanCalm:\s*\{/.test(tokens), 'oceanCalm must not remain a selectable theme definition');
assert(!/warmRecovery:\s*\{/.test(tokens), 'warmRecovery must not remain a selectable theme definition');
assert(!/ColorPicker|accentColor|themeSwatches/.test(settings), 'Settings must not expose legacy colour customization');
assert(!/settings\.accentColor/.test(productSources), 'core product surfaces must not consume user accent colour');
assert(!/accentPalette/.test(legacyFacade), 'legacy facade must not expose an app accent palette');
assert(/getQuestVisualFoundation/.test(v11Tokens), 'V11 tokens must consume the canonical visual foundation');

['environment', 'material', 'text', 'border', 'interaction', 'data', 'semantic'].forEach((role) => {
  assert(new RegExp(`${role}:\\s*\\{`).test(foundation), `visual foundation missing ${role} role`);
});

console.log('visual foundation static audit passed');
