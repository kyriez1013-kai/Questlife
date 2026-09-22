import { spawnSync, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const output = resolve('reports/release/local-verification');
mkdirSync(output, { recursive: true });
const node = process.execPath;
const suites = [
  ['types', node, ['node_modules/typescript/bin/tsc', '--noEmit']],
  ['platform', node, ['scripts/test-native-platform.mjs']],
  ['device-services', node, ['scripts/test-device-services.mjs']],
  ['sync', node, ['scripts/test-sync-v2.mjs']],
  ['local-mutations', node, ['scripts/test-local-mutations.mjs']],
  ['record-backup', node, ['scripts/test-record-backup.mjs']],
  ['sync-sql', node, ['scripts/test-sync-v2-sql.mjs']],
  ['sync-concurrency', node, ['scripts/test-sync-v2-concurrency.mjs']],
  ['push-postgres', node, ['scripts/test-push-postgres.mjs']],
  ['push-boundary', node, ['scripts/test-push-boundary.mjs']],
  ['health-delete', node, ['scripts/test-health-delete-boundary.mjs']],
  ['auth', node, ['scripts/test-backend-auth.mjs']],
  ['auth-links', node, ['--test', 'scripts/test-auth-links.cjs']],
  ['shortcuts', node, ['scripts/test-shortcuts.mjs']],
  ['android-widget', node, ['--test', 'tests/native/widget.test.cjs']],
  ['android-backup-policy', node, ['--test', 'tests/native/backup-policy.test.cjs']],
  ['insights', node, ['src/native/insights/__tests__/run-tests.mjs']],
  ['workflows', node, ['--test', 'src/native/nativeWorkflows.test.cjs', 'src/native/accountSettingsBoundary.test.cjs', 'src/screens/settingsTruthfulness.test.cjs']],
  ['native-form-settings-schedule', node, ['--test', 'src/native/entityForms.test.cjs', 'src/native/NativeSettings.test.cjs', 'tests/native/scheduleUi.test.cjs']],
  ['materials', node, ['--test', 'tests/native/material.test.cjs']],
  ['decision', 'npm', ['run', 'test:adaptive-decision']],
  ['theme', 'npm', ['run', 'test:theme']],
  ['metro-assets', node, ['--test', 'scripts/test-metro-assets.cjs']],
  ['web-entry-boundary', node, ['--test', 'scripts/test-web-entry-boundary.cjs']],
  ['web', 'npm', ['run', 'build']],
  ['dependency-audit', 'npm', ['audit', '--json']],
];
const report = { sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  generatedAt: new Date().toISOString(), scope: 'local synthetic and component checks; not device/hosted acceptance', results: [] };
for (const [name, command, args] of suites) {
  const started = Date.now();
  const result = spawnSync(command, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, env: { ...process.env,
    QUESTLIFE_UI_TEST_RUNTIME: process.env.QUESTLIFE_UI_TEST_RUNTIME ?? '/tmp/questlife-native-workflows-test-runtime/node_modules',
    NATIVE_MATERIAL_TEST_RUNTIME: process.env.NATIVE_MATERIAL_TEST_RUNTIME ?? '/tmp/questlife-native-material-tests.EdXZ7s',
  } });
  writeFileSync(resolve(output, `${name}.log`), (result.stdout ?? '') + (result.stderr ?? ''));
  report.results.push({ name, status: result.status === 0 ? 'PASS' : 'FAIL', exitCode: result.status, ms: Date.now() - started });
  writeFileSync(resolve(output, 'summary.json'), JSON.stringify(report, null, 2));
  console.log(`${name}: ${result.status === 0 ? 'PASS' : 'FAIL'} (${Date.now() - started}ms)`);
}
process.exitCode = report.results.every(row => row.status === 'PASS') ? 0 : 1;
