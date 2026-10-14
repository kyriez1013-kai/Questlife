import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('npm run ios -- [--device <iPhone name or UDID>] [--prepare-only]');
  console.log('Builds the existing candidate in Release mode. Xcode manages your Personal Team signing; no EAS build or paid account is requested.');
  process.exit(0);
}
const prepareOnly = args.includes('--prepare-only');
const deviceIndex = args.indexOf('--device');
const device = deviceIndex >= 0 ? args[deviceIndex + 1] : undefined;
const remaining = args.filter((value, index) => value !== '--prepare-only' &&
  !(deviceIndex >= 0 && (index === deviceIndex || index === deviceIndex + 1)));
if ((deviceIndex >= 0 && (!device || device.startsWith('--'))) || remaining.length) {
  throw new Error('Use --device <name or UDID>, --prepare-only, or --help.');
}
const file = join(homedir(), 'Library/QuestLifeToolchain/secrets/candidate-native.env');
if (!existsSync(file)) throw new Error('Candidate public configuration is missing. Restore the existing candidate configuration before building.');
const config = Object.fromEntries(readFileSync(file, 'utf8').split(/\r?\n/).filter(line => line.trim() && !line.startsWith('#')).map(line => {
  const index = line.indexOf('=');
  if (index < 1) throw new Error('Invalid candidate configuration line.');
  return [line.slice(0, index), line.slice(index + 1).trim()];
}));
const allowed = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY', 'EXPO_PUBLIC_API_ORIGIN'];
if (Object.keys(config).some(key => !allowed.includes(key)) ||
    config.EXPO_PUBLIC_SUPABASE_URL !== 'https://gttcoocfkqwvsqfwxpyo.supabase.co' ||
    config.EXPO_PUBLIC_API_ORIGIN !== 'https://questlife-v1-release.vercel.app' ||
    !/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '')) {
  throw new Error('Candidate configuration must contain only the authorized candidate URLs and publishable key. Values were not logged.');
}
if (process.platform !== 'darwin') throw new Error('Local iPhone builds require macOS and Xcode.');
const developerDir = '/Applications/Xcode.app/Contents/Developer';
if (!existsSync(developerDir)) throw new Error('Install the free Xcode app from the Mac App Store and complete its first launch.');
const env = { ...process.env, ...config, DEVELOPER_DIR: developerDir, EXPO_NO_DOTENV: '1' };
// User-installed CocoaPods must remain discoverable without changing the shell profile.
const userGemHome = spawnSync('gem', ['environment', 'user_gemhome'], { encoding: 'utf8', env });
if (userGemHome.status === 0 && userGemHome.stdout.trim()) {
  env.PATH = `${join(userGemHome.stdout.trim(), 'bin')}:${env.PATH ?? ''}`;
}
// ActiveSupport 6 on Apple's system Ruby does not load Logger transitively.
env.RUBYOPT = [env.RUBYOPT, '-rlogger'].filter(Boolean).join(' ');
const run = (command, argv, cwd = root) => {
  const result = spawnSync(command, argv, { cwd, env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};
// Fail before changing the generated project if Xcode still needs first-launch setup.
run('xcodebuild', ['-checkFirstLaunchStatus']);
run('npx', ['expo', 'prebuild', '--platform', 'ios', '--no-install']);
// SDK 54 prebuild inserts its Android starter script even for iOS-only projects.
const packagePath = join(root, 'package.json');
const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
if (packageJson.scripts?.android === 'expo run:android') {
  delete packageJson.scripts.android;
  writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
}
if (prepareOnly) {
  console.log('Candidate iOS project prepared. This is not an installed or signed application.');
} else {
  run('npx', ['expo', 'run:ios', '--configuration', 'Release', '--no-bundler', '--device', ...(device ? [device] : [])]);
}
