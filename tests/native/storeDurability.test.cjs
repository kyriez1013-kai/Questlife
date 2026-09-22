// Actual Store + SyncEngine, disposable in-memory disk. No user files or network.
const assert = require('node:assert/strict');
const { test, afterEach } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const runtime = process.env.QUESTLIFE_UI_TEST_RUNTIME;
if (!runtime) throw Error('QUESTLIFE_UI_TEST_RUNTIME is required');
const React = require(path.join(runtime, 'react'));
const { create, act } = require(path.join(runtime, 'react-test-renderer'));
global.IS_REACT_ACT_ENVIRONMENT = true;
let disk, journal, engine, store, tree, sequence, commitCalls, failSave, failBeforeCommit, gate, project;
const clone = value => structuredClone(value);
const original = Module._load;
Module._load = function(request, parent, main) {
  if (request === 'react') return React;
  if (request === 'react/jsx-runtime') return require(path.join(runtime, 'react/jsx-runtime'));
  if (request === 'react-native') return { Platform: { OS: 'android' }, Appearance: { getColorScheme: () => 'light' } };
  if (/\/storage$/.test(request)) return {
    loadData: async () => clone(disk), hasSyncAccountBinding: async () => true,
    uid: () => `TEST_${++sequence}`, today: () => '2026-09-22', readPersistedDataForDebug: async () => clone(disk),
    persist: async (next, options) => {
      if (gate) await gate.promise;
      if (failSave) { failSave = false; throw Error('TEST_DISK_FULL'); }
      disk = rebaseAppDataWrite(options.base, next, disk);
      return clone(disk);
    },
  };
  if (request === './notifications') return { scheduleSkillReminder: async () => {}, cancelSkillReminder: async () => {}, rescheduleAllReminders: async () => {} };
  if (/\/analytics$/.test(request)) return { trackEvent() {} };
  if (/\/syncService$/.test(request)) return { scheduleServerSync() {} };
  if (/\/syncDeletionOutbox$/.test(request)) return { enqueueServerDeletions: async () => {} };
  if (/\/persistenceTrace$/.test(request)) return { installPersistenceDebugBridge: () => () => {} };
  if (/\/sync-v2\/runtime$/.test(request)) return {
    getSyncEngine: async () => engine,
    startSyncRuntime: async (_read, apply) => { project = apply; return () => {}; },
    persistWithSync: async (base, next, source, save) => {
      commitCalls++;
      if (failBeforeCommit) { failBeforeCommit = false; throw Error('TEST_JOURNAL_FAILURE'); }
      let committed;
      await engine.commit(localChanges(base, next, source === 'store.explicit_delete'), async () => { committed = await save(); });
      return committed;
    },
  };
  return original.call(this, request, parent, main);
};
for (const extension of ['.ts', '.tsx']) require.extensions[extension] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText, file);
const { DEFAULT_DATA } = require('../../src/types.ts');
const { rebaseAppDataWrite } = require('../../src/utils/persistenceConsistency.ts');
const { emptySyncState } = require('../../src/sync-v2/contracts.ts');
const { SyncEngineV2 } = require('../../src/sync-v2/engine.ts');
const { localChanges, projectAppData } = require('../../src/sync-v2/projection.ts');
const { StoreProvider, useStore } = require('../../src/store.tsx');
const Observer = () => { store = useStore(); return null; };
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
async function mount() { await act(async () => { tree = create(React.createElement(StoreProvider, {}, React.createElement(Observer))); }); }
async function fresh() {
  disk = clone(DEFAULT_DATA); journal = emptySyncState(); sequence = 0; commitCalls = 0; failSave = false; failBeforeCommit = false; gate = undefined;
  engine = new SyncEngineV2({ read: async () => clone(journal), write: async state => { journal = clone(state); },
    apply: async changes => { await project(changes); } },
  { push: async () => { throw Error('NO_NETWORK_ALLOWED'); }, pull: async () => { throw Error('NO_NETWORK_ALLOWED'); } }, 'TEST_DEVICE', () => `TEST_OP_${++sequence}`);
  await mount(); assert.equal(store.loading, false);
}
afterEach(async () => { if (tree) await act(async () => tree.unmount()); tree = undefined; });
const plan = { title: 'TEST plan', date: '2026-09-22', startTime: '09:00', endTime: '10:00', plannedMinutes: 60,
  taskType: 'deep_study', flexibility: 'flexible', rigidity: 'medium', status: 'planned', source: 'manual' };

test('Store exposes pending until local disk and durable outbox acknowledge create/update/delete', async () => {
  await fresh(); gate = deferred(); let block;
  await act(async () => { block = store.addScheduleBlock(plan); });
  assert.equal(store.localPersistence.pending, 1); assert.equal(disk.scheduleBlocks.length, 0);
  await act(async () => { gate.resolve(); await store.waitForLocalWrites(); }); gate = undefined;
  assert.equal(store.localPersistence.pending, 0); assert.equal(disk.scheduleBlocks[0].id, block.id);
  await act(async () => { store.updateScheduleBlock(block.id, { title: 'TEST updated' }); await store.waitForLocalWrites(); });
  assert.equal(disk.scheduleBlocks[0].title, 'TEST updated');
  await act(async () => { store.deleteScheduleBlock(block.id); await store.waitForLocalWrites(); });
  assert.equal(disk.scheduleBlocks.length, 0); assert.equal(journal.outbox.length, 3);
  assert.equal(journal.outbox.at(-1).operation, 'delete'); assert.equal(journal.outbox.at(-1).entityId, block.id);
});

test('failed journal queues later edits; retry preserves ID and exact mutation order', async () => {
  await fresh(); failBeforeCommit = true; let block;
  await act(async () => { block = store.addScheduleBlock(plan); await assert.rejects(store.waitForLocalWrites(), /JOURNAL/); });
  await act(async () => { store.updateScheduleBlock(block.id, { title: 'TEST edited while waiting' }); });
  assert.equal(disk.scheduleBlocks.length, 0); assert.deepEqual(store.localPersistence, { pending: 2, failed: true });
  await act(async () => { await store.retryLocalWrites(); });
  assert.equal(disk.scheduleBlocks.length, 1); assert.equal(disk.scheduleBlocks[0].id, block.id);
  assert.equal(disk.scheduleBlocks[0].title, 'TEST edited while waiting'); assert.equal(journal.outbox.length, 2);
  assert.equal(commitCalls, 3); assert.deepEqual(store.localPersistence, { pending: 0, failed: false });
});

for (const operation of ['create', 'update', 'delete']) test(`durable WAL recovery after ${operation} failure does not enqueue a duplicate`, async () => {
  await fresh(); let block;
  if (operation !== 'create') await act(async () => { block = store.addScheduleBlock(plan); await store.waitForLocalWrites(); });
  const before = commitCalls; failSave = true;
  await act(async () => {
    if (operation === 'create') block = store.addScheduleBlock(plan);
    else if (operation === 'update') store.updateScheduleBlock(block.id, { title: 'TEST recovered' });
    else store.deleteScheduleBlock(block.id);
    await assert.rejects(store.waitForLocalWrites(), /DISK_FULL/);
  });
  const outboxLength = journal.outbox.length;
  await act(async () => { await store.retryLocalWrites(); });
  assert.equal(journal.outbox.length, outboxLength); assert.equal(commitCalls, before + 1);
  assert.equal(disk.scheduleBlocks.length, operation === 'delete' ? 0 : 1);
  if (operation === 'update') assert.equal(disk.scheduleBlocks[0].title, 'TEST recovered');
  assert.equal(journal.pendingApply.length, 0);
});

test('queued deletion is not resurrected by the preceding ACK, including mounted reload', async () => {
  await fresh(); gate = deferred(); let block;
  await act(async () => { block = store.addScheduleBlock(plan); store.deleteScheduleBlock(block.id); });
  assert.equal(store.data.scheduleBlocks.length, 0);
  await act(async () => { gate.resolve(); await store.waitForLocalWrites(); });
  assert.equal(store.data.scheduleBlocks.length, 0); assert.equal(disk.scheduleBlocks.length, 0);
  await act(async () => tree.unmount()); await mount(); assert.equal(store.data.scheduleBlocks.length, 0);
  assert.equal(journal.outbox.length, 2);
});

test('Goal and appearance updates receive the same durable receipt and survive remount', async () => {
  await fresh(); let goal;
  await act(async () => { goal = store.addCategory({ name: 'TEST goal', emoji: '' }); store.setSettings({ language: 'en' }); await store.waitForLocalWrites(); });
  assert.equal(disk.categories.some(row => row.id === goal.id), true); assert.equal(disk.settings.language, 'en');
  await act(async () => tree.unmount()); await mount(); assert.equal(store.data.settings.language, 'en');
  assert.equal(store.data.categories.some(row => row.id === goal.id), true);
});

test('an execution retry reuses its original entity and its durable receipt', async () => {
  await fresh(); failSave = true; let record;
  await act(async () => { record = store.createExecutionLog({ id:'TEST_EXECUTION', date:'2026-09-22', title:'TEST only', durationMinutes:7 }); await assert.rejects(store.waitForExecutionLog(record.id)); });
  await act(async () => { store.createExecutionLog(record); await store.waitForExecutionLog(record.id); });
  assert.equal(disk.executionLogs.filter(row => row.id === record.id).length, 1);
  assert.equal(journal.outbox.filter(row => row.entityId === record.id).length, 1);
});
test('WAL replay through the real Store projection cannot erase later optimistic edits', async () => {
  await fresh(); failSave = true; let block;
  await act(async()=>{block=store.addScheduleBlock(plan);await assert.rejects(store.waitForLocalWrites());});
  await act(async()=>{store.updateScheduleBlock(block.id,{title:'TEST later edit'});});
  await act(async()=>{await store.retryLocalWrites();});
  assert.equal(disk.scheduleBlocks[0].title,'TEST later edit');
  assert.equal(store.data.scheduleBlocks[0].title,'TEST later edit');
  assert.equal(journal.outbox.length,2);
});

test('remote projection preserves a queued local edit without persisting it prematurely', async () => {
  await fresh(); let block;
  await act(async () => { block = store.addScheduleBlock(plan); await store.waitForLocalWrites(); });
  failBeforeCommit = true;
  await act(async () => {
    store.updateScheduleBlock(block.id, { title: 'TEST pending local title' });
    await assert.rejects(store.waitForLocalWrites());
  });
  const remote = { ...block, notes: 'TEST remote note' };
  const unrelated = { ...plan, id: 'TEST_REMOTE_ONLY', title: 'TEST independent remote block' };
  await act(async () => { await project([
    { entityType: 'scheduleBlocks', entityId: block.id, payload: remote },
    { entityType: 'scheduleBlocks', entityId: unrelated.id, payload: unrelated },
  ]); });
  assert.equal(disk.scheduleBlocks[0].title, plan.title);
  assert.equal(disk.scheduleBlocks[0].notes, remote.notes);
  assert.equal(store.data.scheduleBlocks[0].title, 'TEST pending local title');
  await act(async () => { await store.retryLocalWrites(); });
  assert.equal(disk.scheduleBlocks[0].title, 'TEST pending local title');
  // Existing writes replace an entity version, not individual remote fields.
  assert.equal(disk.scheduleBlocks[0].notes, undefined);
  assert.equal(store.data.scheduleBlocks[0].notes, undefined);
  assert.deepEqual(disk.scheduleBlocks.find(row => row.id === unrelated.id), unrelated);
  assert.deepEqual(store.data.scheduleBlocks.find(row => row.id === unrelated.id), unrelated);
});

test('WAL recovery cannot resurrect a later explicitly deleted entity in the UI', async () => {
  await fresh(); failSave = true; let block;
  await act(async () => { block = store.addScheduleBlock(plan); await assert.rejects(store.waitForLocalWrites()); });
  await act(async () => { store.deleteScheduleBlock(block.id); });
  assert.equal(store.data.scheduleBlocks.length, 0);
  await act(async () => { await engine.recover(); });
  assert.equal(disk.scheduleBlocks.length, 1);
  assert.equal(store.data.scheduleBlocks.length, 0);
  await act(async () => { await store.retryLocalWrites(); });
  assert.equal(disk.scheduleBlocks.length, 0);
  assert.equal(store.data.scheduleBlocks.length, 0);
  assert.equal(journal.outbox.length, 2);
  assert.equal(journal.outbox.at(-1).operation, 'delete');
});
