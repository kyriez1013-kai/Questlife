import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, '..');
const quantRoot = resolve(
  process.env.QUESTLIFE_QUANT_REPO || resolve(appRoot, '..', 'QuestLife-Quant'),
);
const sourceDir = resolve(quantRoot, 'artifacts', 'v0.4.1');
const targetDir = resolve(
  appRoot,
  'src',
  'v11-insights',
  'personal-terminal',
  'v041-fixtures',
);

function quantStableHash(path) {
  const script = [
    'import hashlib,json,sys',
    'value=json.load(open(sys.argv[1], encoding="utf-8"))',
    'canonical=json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",",":"))',
    'print(hashlib.sha256(canonical.encode("utf-8")).hexdigest())',
  ].join(';');
  return execFileSync(process.env.PYTHON || 'python3', ['-c', script, path], {
    encoding: 'utf8',
  }).trim();
}

const sourceManifest = JSON.parse(await readFile(resolve(sourceDir, 'manifest.json'), 'utf8'));
if (sourceManifest.syntheticOnly !== true || sourceManifest.containsRealUserData !== false) {
  throw new Error('Refusing to sync a fixture release that is not explicitly synthetic-only.');
}

await mkdir(targetDir, { recursive: true });
for (const scenario of sourceManifest.scenarios) {
  const sourcePath = resolve(sourceDir, scenario.file);
  const sourceBytes = await readFile(sourcePath);
  const payload = JSON.parse(sourceBytes.toString('utf8'));
  const actualHash = quantStableHash(sourcePath);
  if (actualHash !== scenario.presentationHash) {
    throw new Error(`Hash mismatch for ${scenario.file}: ${actualHash}`);
  }
  if (payload.source?.containsRealUserData !== false || payload.source?.syntheticOnly !== true) {
    throw new Error(`Unsafe source metadata in ${scenario.file}`);
  }
  await copyFile(sourcePath, resolve(targetDir, scenario.file));
  scenario.sourceFileSha256 = createHash('sha256').update(sourceBytes).digest('hex');
}

const bridgeManifest = {
  bridgeVersion: 'questlife-app-quant-v0.4.1-fixture-bridge',
  sourceReleaseVersion: sourceManifest.releaseVersion,
  quantCommit: sourceManifest.quantCommit,
  syntheticOnly: true,
  containsRealUserData: false,
  runtimeDependencyOnSiblingRepository: false,
  scenarios: sourceManifest.scenarios,
};
await writeFile(
  resolve(targetDir, 'manifest.json'),
  `${JSON.stringify(bridgeManifest, null, 2)}\n`,
  'utf8',
);

console.log(`Synced ${sourceManifest.scenarios.length} verified V0.4.1 fixtures from ${sourceDir}`);
