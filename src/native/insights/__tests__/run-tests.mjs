import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const out = mkdtempSync(join(tmpdir(), 'questlife-native-insights-test-'));
const compile = spawnSync(process.execPath, ['node_modules/typescript/bin/tsc', '--strict', '--module', 'commonjs', '--target', 'es2022', '--moduleResolution', 'node', '--jsx', 'react-jsx', '--resolveJsonModule', '--esModuleInterop', '--skipLibCheck', '--rootDir', 'src', '--outDir', out, 'src/native/insights/__tests__/nativeInsights.test.ts'], { stdio: 'inherit' });
if (compile.status) process.exit(compile.status);
for (const TZ of ['Asia/Shanghai', 'America/Los_Angeles']) {
  const result = spawnSync(process.execPath, ['--test', join(out, 'native/insights/__tests__/nativeInsights.test.js')], { stdio: 'inherit', env: { ...process.env, TZ, NODE_PATH: join(process.cwd(), 'node_modules') } });
  if (result.status) process.exit(result.status);
}
