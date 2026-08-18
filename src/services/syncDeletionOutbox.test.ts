// @ts-expect-error Test-only Node TypeScript entry.
import { acknowledgedDeletionEntries, buildDeletionRequest, countDeletionRequest, createDeletionOutboxStore, emptyDeletionOutbox, parseDeletionOutbox, SERVER_DELETION_OUTBOX_KEY } from './syncDeletionOutboxCore.ts';

let assertions = 0;

function equal(actual: unknown, expected: unknown, name: string) {
  assertions += 1;
  if (actual !== expected) throw new Error(`${name}: expected ${String(expected)}, received ${String(actual)}`);
}

function memoryStorage(seed: Record<string, string> = {}) {
  const values = new Map(Object.entries(seed));
  return {
    values,
    storage: {
      getItem: async (key: string) => values.get(key) ?? null,
      setItem: async (key: string, value: string) => { values.set(key, value); },
    },
  };
}

async function runSyncDeletionOutboxTests() {
  const memory = memoryStorage();
  const store = createDeletionOutboxStore(memory.storage);

  await store.enqueue([{ collection: 'executionLogs', id: 'log-create-update-delete' }]);
  await store.enqueue([{ collection: 'executionLogs', id: 'log-create-update-delete' }]);
  const deduped = await store.load();
  equal(deduped.entries.length, 1, 'repeated explicit delete is deduplicated');
  equal(deduped.entries[0]?.collection, 'executionLogs', 'explicit entity type is retained');

  const refreshedStore = createDeletionOutboxStore(memory.storage);
  const restored = await refreshedStore.load();
  equal(restored.entries.length, 1, 'outbox is restored after app refresh');
  equal(buildDeletionRequest(restored).executionLogs?.[0], 'log-create-update-delete', 'restored delete is retried');

  const afterFailedRequest = await refreshedStore.load();
  equal(afterFailedRequest.entries.length, 1, 'failed request without acknowledgement retains outbox');

  const acknowledgements = acknowledgedDeletionEntries({
    executionLogs: {
      requested: 1,
      deleted: 1,
      alreadyAbsent: 0,
      acknowledgedIds: ['log-create-update-delete'],
    },
  });
  await refreshedStore.acknowledge(acknowledgements);
  equal((await refreshedStore.load()).entries.length, 0, 'server acknowledgement clears exact outbox entry');

  await refreshedStore.enqueue([
    { collection: 'executionLogs', id: 'execution-1' },
    { collection: 'contextLogs', id: 'context-1' },
    { collection: 'stateCheckIns', id: 'state-1' },
    { collection: 'decisionResults', id: 'decision-1' },
    { collection: 'patternMemory', id: 'pattern-1' },
  ]);
  const allFive = buildDeletionRequest(await refreshedStore.load());
  equal(countDeletionRequest(allFive), 5, 'all five synced entity types are supported');
  equal(allFive.contextLogs?.[0], 'context-1', 'context delete remains explicitly typed');
  equal(allFive.stateCheckIns?.[0], 'state-1', 'state delete remains explicitly typed');
  equal(allFive.decisionResults?.[0], 'decision-1', 'decision delete remains explicitly typed');
  equal(allFive.patternMemory?.[0], 'pattern-1', 'pattern delete remains explicitly typed');

  const malformed = parseDeletionOutbox(JSON.stringify({
    version: 1,
    entries: [
      { collection: 'skills', id: 'must-not-pass', queuedAt: '2026-08-18T00:00:00.000Z' },
      { collection: 'executionLogs', id: '', queuedAt: '2026-08-18T00:00:00.000Z' },
    ],
  }));
  equal(malformed.entries.length, 0, 'unknown or empty deletion entries fail closed');
  equal(parseDeletionOutbox('{broken').entries.length, 0, 'corrupt outbox fails closed without inferred deletes');

  const untouched = emptyDeletionOutbox();
  equal(buildDeletionRequest(untouched).executionLogs, undefined, 'missing records never infer deletions');
  equal(memory.values.has(SERVER_DELETION_OUTBOX_KEY), true, 'outbox uses a dedicated persisted key');

  console.log(`syncDeletionOutbox: ${assertions} assertions passed`);
}

await runSyncDeletionOutboxTests();
