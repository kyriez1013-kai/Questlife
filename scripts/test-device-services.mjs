import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const out = mkdtempSync(join(tmpdir(), 'questlife-device-services-'));
const tests = ['tests/native/deviceServices.test.ts','tests/native/healthChanges.test.ts','tests/native/quietHours.test.ts','tests/native/notificationFollowUp.test.ts','tests/native/notificationClock.test.ts','tests/native/deviceRepositoryContexts.test.ts','tests/native/recordIntegrity.test.ts'];
tests.push('tests/native/calendarDurability.test.ts');
const roots = [...tests, 'src/platform/health/HealthSource.android.ts', 'src/platform/health/HealthSource.ios.ts', 'src/platform/calendar/CalendarDriver.native.ts', 'src/platform/notifications/NotificationDriver.native.ts'];
const compiled = spawnSync(process.execPath, ['node_modules/typescript/bin/tsc', '--module', 'commonjs', '--target', 'es2022', '--moduleResolution', 'node', '--jsx', 'react-jsx', '--resolveJsonModule', '--esModuleInterop', '--skipLibCheck', '--rootDir', '.', '--outDir', out, ...roots], { stdio: 'inherit' });
if (compiled.status !== 0) process.exit(compiled.status ?? 1);
for (const TZ of ['UTC', 'Asia/Shanghai', 'America/New_York']) {
  console.log(`Device service fixtures: ${TZ}`);
  const result = spawnSync(process.execPath, ['--test', ...tests.map(path=>join(out,path.replace(/\.ts$/,'.js')))], { stdio: 'inherit', env: { ...process.env, TZ, NODE_PATH: join(process.cwd(), 'node_modules') } });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
