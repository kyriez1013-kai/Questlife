import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';

if (!process.argv[2]) {
  const dir = mkdtempSync(join(tmpdir(), 'questlife-backup-'));
  try {
    execFileSync(process.execPath, ['scripts/generate-record-validator.cjs', '--check'], { stdio: 'inherit' });
    execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', '--module', 'commonjs', '--target', 'es2022', '--moduleResolution', 'node', '--skipLibCheck', '--esModuleInterop', '--outDir', dir, '--rootDir', 'src', 'src/backup/records.ts', 'src/sync-v2/engine.ts', 'src/sync-v2/projection.ts'], { stdio: 'inherit' });
    mkdirSync(join(dir, 'backup'), { recursive: true });
    copyFileSync('src/backup/validateAppData.cjs', join(dir, 'backup/validateAppData.cjs'));
    execFileSync(process.execPath, [import.meta.filename, dir], { stdio: 'inherit', env: { ...process.env, NODE_PATH: join(process.cwd(), 'node_modules') } });
  } finally { rmSync(dir, { recursive: true, force: true }); }
  process.exit(0);
}
const require = createRequire(import.meta.url), dir = process.argv[2];
const { createRecordBackup, parseRecordBackup, backupProjections, hasRecords } = require(join(dir, 'backup/records.js'));
const { DEFAULT_DATA } = require(join(dir, 'types.js'));
const { emptySyncState } = require(join(dir, 'sync-v2/contracts.js'));
const { SyncEngineV2 } = require(join(dir, 'sync-v2/engine.js'));
const { projectAppData } = require(join(dir, 'sync-v2/projection.js'));
let passed = 0;
const check = async (name, fn) => { await fn(); passed++; console.log(`${name}: PASS`); };
const original = { ...structuredClone(DEFAULT_DATA), categories: [{ id: 'record-category', name: 'Original named goal', createdAt: Date.now(), emoji: '' }] };
const ownerId = randomUUID(), backup = createRecordBackup(original, ownerId);
await check('exact record round trip and account binding', () => { assert.deepEqual(parseRecordBackup(JSON.stringify(backup)), backup); assert.deepEqual(backup.data, original); });
await check('legacy raw export cannot silently lose account binding', () => assert.throws(() => parseRecordBackup(JSON.stringify(original))));
await check('invalid nested field rejected rather than coerced', () => assert.throws(() => createRecordBackup({ ...original, categories: [{ ...original.categories[0], name: 4 }] }, ownerId)));
await check('duplicate IDs rejected', () => assert.throws(() => createRecordBackup({ ...original, categories: [...original.categories, ...original.categories] }, ownerId)));
await check('QA provenance rejected', () => assert.throws(() => createRecordBackup({ ...original, settings: { ...original.settings, origin: 'QA_TEST' } }, ownerId)));
await check('invalid owner binding rejected', () => assert.throws(() => createRecordBackup(original, 'arbitrary-owner')));
await check('unsafe object keys rejected', () => assert.throws(() => parseRecordBackup(JSON.stringify(backup).replace('"settings":{', '"settings":{"__proto__":{},'))));
await check('invalid state value rejected', () => assert.throws(() => createRecordBackup({ ...original, stateCheckIns: [{ id:'state',date:'2026-09-20',timestamp:'2026-09-20T00:00:00Z',createdAt:'2026-09-20T00:00:00Z',overall:0 }] }, ownerId)));
await check('excessive nesting rejected before schema traversal', () => { let nested = {}; for (let i = 0; i < 40; i++) nested = { nested }; assert.throws(() => createRecordBackup({ ...original, settings: nested }, ownerId)); });
function fixture(state = emptySyncState(), remoteRows = []) {
  let disk = structuredClone(state), data = structuredClone(DEFAULT_DATA), fail = false;
  const adapter = { read: async () => structuredClone(disk), write: async value => { disk = structuredClone(value); },
    apply: async changes => { if (fail) throw new Error('controlled_write_failure'); data = projectAppData(data, changes); } };
  const transport = { push: () => { throw Error('restore must not call a server'); }, pull: async (_owner, cursor) => remoteRows.filter(row => row.change_seq > cursor) };
  const engine = new SyncEngineV2(adapter, transport, 'backup-device', randomUUID);
  return { engine, state: () => disk, data: () => data, fail: value => { fail = value; }, restart: () => new SyncEngineV2(adapter, transport, 'backup-device', randomUUID),
    empty: async () => { if (hasRecords(data)) throw new Error('not_empty'); } };
}
await check('restore durable data plus exact account restriction without network', async () => {
  const f = fixture(); await f.engine.restoreRecords(backupProjections(backup), ownerId, f.empty);
  assert.deepEqual(f.data().categories, original.categories); assert.equal(f.state().ownerId, ownerId);
  assert.equal(f.state().outbox.length, 1); assert.deepEqual(f.state().pendingApply, []);
  await assert.rejects(f.engine.attach(randomUUID(), []), /account_switch_blocked/);
});
await check('existing account cannot be replaced', async () => {
  const f = fixture({ ...emptySyncState(), ownerId: randomUUID() }); const before = structuredClone(f.state());
  await assert.rejects(f.engine.restoreRecords(backupProjections(backup), ownerId, f.empty)); assert.deepEqual(f.state(), before);
});
await check('current local records are checked inside transaction', async () => {
  const f = fixture(); await assert.rejects(f.engine.restoreRecords(backupProjections(backup), ownerId, async () => { throw new Error('not_empty'); }));
  assert.equal(f.state().outbox.length, 0); assert.equal(f.state().ownerId, null);
});
await check('failed projection retains recoverable import WAL, no duplicate outbox', async () => {
  const f = fixture(); f.fail(true); await assert.rejects(f.engine.restoreRecords(backupProjections(backup), ownerId, f.empty));
  assert.equal(f.state().pendingApply.length, 1); f.fail(false); await f.restart().recover();
  assert.deepEqual(f.data().categories, original.categories); assert.equal(f.state().outbox.length, 1);
});
await check('second restore cannot replace first', async () => {
  const f = fixture(); await f.engine.restoreRecords(backupProjections(backup), null, f.empty);
  await assert.rejects(f.engine.restoreRecords(backupProjections(backup), null, f.empty)); assert.equal(f.state().outbox.length, 1);
});
await check('Health and delete projections rejected', async () => {
  const f = fixture(); await assert.rejects(f.engine.restoreRecords([{entityType:'healthObservations',entityId:'x',payload:{id:'x'}}], null, f.empty));
  await assert.rejects(f.engine.restoreRecords([{entityType:'categories',entityId:'x',payload:null}], null, f.empty));
});
for (const deleted of [false, true]) await check(`restored stale backup respects remote ${deleted ? 'tombstone' : 'newer record'}`, async () => {
  const remote = { user_id: ownerId, entity_type: 'categories', entity_id: original.categories[0].id,
    payload: deleted ? null : { ...original.categories[0], name: 'Newer server name' },
    schema_version: 1, revision: 2, change_seq: 3, deleted_at: deleted ? new Date().toISOString() : null };
  const f = fixture(emptySyncState(), [remote]);
  await f.engine.restoreRecords(backupProjections(backup), ownerId, f.empty);
  await f.engine.attach(ownerId, []); await f.engine.sync(true);
  assert.equal(f.state().outbox.length, 0);
  assert.equal(f.state().conflicts.length, 1);
  assert.deepEqual(f.data().categories, deleted ? [] : [remote.payload]);
  assert.equal(f.state().conflicts[0].resolution, 'pending');
  const restarted = f.restart(); await restarted.recover();
  assert.deepEqual(f.data().categories, deleted ? [] : [remote.payload]);
});
console.log(`Record backup: ${passed} groups PASS; synthetic local tests, not file-picker/device acceptance.`);
