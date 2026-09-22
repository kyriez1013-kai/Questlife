import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'questlife-local-ack-'));
try {
  execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', '--module', 'commonjs', '--target', 'es2022',
    '--moduleResolution', 'node', '--skipLibCheck', '--esModuleInterop', '--outDir', dir,
    'src/utils/localMutationPersistence.ts', 'src/utils/localMutationPersistence.test.ts'], { stdio: 'inherit' });
  execFileSync(process.execPath, ['--test', join(dir, 'localMutationPersistence.test.js')], { stdio: 'inherit' });
  execFileSync(process.execPath, ['--test', 'tests/native/storeDurability.test.cjs'], { stdio: 'inherit', env: { ...process.env,
    QUESTLIFE_UI_TEST_RUNTIME: process.env.QUESTLIFE_UI_TEST_RUNTIME ?? '/tmp/questlife-native-workflows-test-runtime/node_modules' } });
} finally { rmSync(dir, { recursive: true, force: true }); }
