import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LocalMutationPersistence } from './localMutationPersistence';

function deferred() {
  let resolve!: () => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<void>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

test('register stays synchronous and create/update/delete run in durable ACK order', async () => {
  const writes = new LocalMutationPersistence();
  const gate = deferred(); const events: string[] = [];
  assert.equal(writes.register('create', async () => { events.push('create'); await gate.promise; events.push('create:ack'); }), undefined);
  writes.register('update', async () => { events.push('update:ack'); });
  writes.register('delete', async () => { events.push('delete:ack'); });
  assert.deepEqual(events, []);
  assert.deepEqual(writes.getSnapshot(), { pending: 3, failed: false });
  await Promise.resolve(); assert.deepEqual(events, ['create']);
  gate.resolve(); await writes.waitAll();
  assert.deepEqual(events, ['create', 'create:ack', 'update:ack', 'delete:ack']);
  assert.deepEqual(writes.getSnapshot(), { pending: 0, failed: false });
});

test('a failed head blocks following jobs without discarding them', async () => {
  const writes = new LocalMutationPersistence(); const events: string[] = [];
  const failure = new Error('TEST_DISK_FULL'); let attempts = 0;
  writes.register('create', async () => { events.push('create'); if (++attempts === 1) throw failure; });
  writes.register('update', async () => { events.push('update'); });
  writes.register('delete', async () => { events.push('delete'); });
  await assert.rejects(writes.wait('delete'), error => error === failure);
  assert.deepEqual(events, ['create']);
  assert.deepEqual(writes.getSnapshot(), { pending: 3, failed: true });
  writes.retry('delete'); writes.retry('missing');
  await Promise.resolve(); assert.deepEqual(events, ['create']);
  writes.retry(); await writes.waitAll();
  assert.deepEqual(events, ['create', 'create', 'update', 'delete']);
});

test('waiters before and after failure reject promptly, including blocked IDs and waitAll', async () => {
  const writes = new LocalMutationPersistence(); const gate = deferred();
  const failure = new Error('TEST_FAILURE');
  writes.register('head', () => gate.promise);
  writes.register('tail', async () => {});
  const before = [writes.wait('head'), writes.wait('head'), writes.wait('tail'), writes.waitAll()];
  gate.reject(failure);
  await Promise.all(before.map(promise => assert.rejects(promise, error => error === failure)));
  for (const promise of [writes.wait('head'), writes.wait('tail'), writes.waitAll()]) {
    await assert.rejects(promise, error => error === failure);
  }
  await writes.wait('unknown');
});

test('repeated retries do not duplicate an in-flight attempt and retain the original closure', async () => {
  const writes = new LocalMutationPersistence(); const gate = deferred(); let attempts = 0; let replacementCalls = 0;
  writes.register('same', async () => { if (++attempts === 1) throw Error('TEST_FIRST_FAILURE'); await gate.promise; });
  await assert.rejects(writes.wait('same'));
  writes.retry('same'); writes.retry('same'); writes.retry();
  writes.register('same', async () => { replacementCalls++; });
  const ack = writes.wait('same');
  await Promise.resolve(); assert.equal(attempts, 2); assert.equal(replacementCalls, 0);
  gate.resolve(); await ack;
  writes.retry('same'); writes.retry();
  assert.equal(attempts, 2); assert.equal(writes.has('same'), false);
});

test('registering the same pending ID is a no-op; registering its failed ID retries the same payload', async () => {
  const writes = new LocalMutationPersistence(); let attempts = 0; let replacementCalls = 0;
  writes.register('id', async () => { if (++attempts === 1) throw Error('TEST_FAILURE'); });
  writes.register('id', async () => { replacementCalls++; });
  assert.equal(writes.getSnapshot().pending, 1);
  await assert.rejects(writes.wait('id'));
  writes.register('id', async () => { replacementCalls++; });
  await writes.wait('id');
  assert.equal(attempts, 2); assert.equal(replacementCalls, 0);
});

test('registering another ID behind failure does not automatically retry the head', async () => {
  const writes = new LocalMutationPersistence(); let attempts = 0; let tailCalls = 0;
  writes.register('head', async () => { attempts++; throw Error('TEST_FAILURE'); });
  await assert.rejects(writes.wait('head'));
  writes.register('tail', async () => { tailCalls++; });
  writes.register('tail', async () => { tailCalls++; });
  await assert.rejects(writes.wait('tail'));
  assert.equal(attempts, 1); assert.equal(tailCalls, 0);
  assert.deepEqual(writes.getSnapshot(), { pending: 2, failed: true });
});

test('lost ACK recovery belongs to the same run closure and does not duplicate its durable write', async () => {
  const writes = new LocalMutationPersistence(); const durable = new Set<string>();
  let attempts = 0; let commits = 0; let laterCalls = 0;
  writes.register('record', async () => {
    attempts++;
    if (durable.has('record')) return;
    commits++; durable.add('record');
    throw Error('TEST_ACK_LOST_AFTER_COMMIT');
  });
  writes.register('later', async () => { laterCalls++; });
  await assert.rejects(writes.waitAll(), /ACK_LOST/);
  assert.equal(laterCalls, 0);
  writes.retry('record'); await writes.waitAll();
  assert.equal(attempts, 2); assert.equal(commits, 1); assert.equal(laterCalls, 1);
});

test('a later failure cannot invalidate already successful IDs or ACK promises', async () => {
  const writes = new LocalMutationPersistence();
  writes.register('success', async () => {});
  const success = writes.wait('success');
  writes.register('failure', async () => { throw Error('TEST_LATER_FAILURE'); });
  await success; await assert.rejects(writes.wait('failure'));
  await success; await writes.wait('success');
  assert.equal(writes.has('success'), false);
  assert.deepEqual(writes.getSnapshot(), { pending: 1, failed: true });
});

test('waitAll captures the current tail and later writes do not postpone it', async () => {
  const writes = new LocalMutationPersistence(); const first = deferred(); const later = deferred();
  writes.register('first', () => first.promise);
  const captured = writes.waitAll();
  writes.register('later', () => later.promise);
  first.resolve(); await captured;
  assert.equal(writes.has('later'), true);
  assert.deepEqual(writes.getSnapshot(), { pending: 1, failed: false });
  later.resolve(); await writes.waitAll();
});

test('an empty waitAll resolves even when a later registration fails', async () => {
  const writes = new LocalMutationPersistence(); const empty = writes.waitAll();
  writes.register('later', async () => { throw Error('TEST_LATER_FAILURE'); });
  await empty; await assert.rejects(writes.waitAll()); await empty;
});

test('a later failure does not reject a captured waitAll or extend it across ID reuse', async () => {
  const writes = new LocalMutationPersistence(); const first = deferred(); let reused = false;
  writes.register('same', () => first.promise);
  const captured = writes.waitAll();
  const stop = writes.subscribe(() => {
    if (!writes.getSnapshot().pending && !reused) {
      reused = true;
      writes.register('same', async () => { throw Error('TEST_REUSED_ID_FAILURE'); });
    }
  });
  first.resolve(); await captured;
  await assert.rejects(writes.wait('same')); await captured; stop();
});

test('snapshot references stay stable until pending or failed changes', async () => {
  const writes = new LocalMutationPersistence(); const observed: unknown[] = []; let attempts = 0;
  const getSnapshot = writes.getSnapshot; const subscribe = writes.subscribe;
  const initial = getSnapshot(); assert.equal(initial, getSnapshot()); assert.ok(Object.isFrozen(initial));
  const stop = subscribe(() => { assert.equal(getSnapshot(), getSnapshot()); observed.push(getSnapshot()); });
  writes.register('id', async () => { if (++attempts === 1) throw Error('TEST_FAILURE'); });
  const pending = getSnapshot(); assert.notEqual(pending, initial);
  writes.register('id', async () => {}); writes.retry('id');
  assert.equal(getSnapshot(), pending);
  await assert.rejects(writes.wait('id'));
  const failed = getSnapshot(); assert.notEqual(failed, pending);
  await assert.rejects(writes.waitAll()); assert.equal(getSnapshot(), failed);
  writes.retry(); await writes.waitAll();
  assert.deepEqual(observed, [{ pending: 1, failed: false }, { pending: 1, failed: true }, { pending: 1, failed: false }, { pending: 0, failed: false }]);
  stop(); writes.register('unobserved', async () => {}); await writes.waitAll(); assert.equal(observed.length, 4);
});

test('reentrant listeners can register, unsubscribe and retry without overlap or recursive delivery', async () => {
  const writes = new LocalMutationPersistence(); const events: string[] = [];
  let attempts = 0; let depth = 0; let maxDepth = 0; let appended = false;
  const stop = writes.subscribe(() => {
    depth++; maxDepth = Math.max(maxDepth, depth);
    if (!appended && writes.has('first')) {
      appended = true;
      writes.register('second', async () => { events.push('second'); });
    }
    if (writes.getSnapshot().failed) writes.retry();
    depth--;
  });
  let removableCalls = 0;
  const removeSelf = writes.subscribe(() => { removableCalls++; removeSelf(); });
  writes.register('first', async () => { events.push('first'); if (++attempts === 1) throw Error('TEST_RETRY'); });
  await assert.rejects(writes.waitAll());
  await writes.waitAll();
  assert.deepEqual(events, ['first', 'first', 'second']); assert.equal(maxDepth, 1); assert.equal(removableCalls, 1);
  stop();
});

test('throwing or removed listeners cannot break persistence or later subscribers', async () => {
  const writes = new LocalMutationPersistence(); let laterCalls = 0; let removedCalls = 0;
  let remove = () => {};
  writes.subscribe(() => { remove(); throw Error('TEST_OBSERVER_FAILURE'); });
  remove = writes.subscribe(() => { removedCalls++; });
  writes.subscribe(() => { laterCalls++; });
  assert.doesNotThrow(() => writes.register('id', async () => {}));
  await writes.wait('id');
  assert.equal(removedCalls, 0); assert.equal(laterCalls, 2);
  assert.deepEqual(writes.getSnapshot(), { pending: 0, failed: false });
});

test('synchronous throws and non-Error rejection values remain retryable', async () => {
  const writes = new LocalMutationPersistence(); let attempts = 0;
  writes.register('id', () => { if (++attempts === 1) throw undefined; return Promise.resolve(); });
  let rejected = false;
  await writes.wait('id').then(() => assert.fail('Expected rejection'), error => { rejected = true; assert.equal(error, undefined); });
  assert.equal(rejected, true); assert.equal(writes.getSnapshot().failed, true);
  writes.retry(); await writes.waitAll(); assert.equal(attempts, 2);
});

test('ignored run and ACK failures do not emit unhandled rejections for legacy callers', async () => {
  const writes = new LocalMutationPersistence(); const unhandled: unknown[] = [];
  const listener = (reason: unknown) => { unhandled.push(reason); };
  process.on('unhandledRejection', listener);
  try {
    writes.register('head', async () => { throw Error('TEST_IGNORED'); });
    writes.register('tail', async () => {});
    void writes.wait('head'); void writes.wait('tail'); void writes.waitAll();
    await new Promise<void>(resolve => setImmediate(resolve));
    void writes.wait('head'); void writes.wait('tail'); void writes.waitAll();
    writes.retry();
    await new Promise<void>(resolve => setImmediate(resolve));
    assert.deepEqual(unhandled, []); assert.equal(writes.getSnapshot().failed, true);
  } finally { process.off('unhandledRejection', listener); }
});

test('successful writes release tracked entries and permit reuse without a growing ACK history', async () => {
  const writes = new LocalMutationPersistence(); let calls = 0;
  for (let index = 0; index < 2000; index++) writes.register(`id-${index}`, async () => { calls++; });
  await writes.waitAll();
  assert.equal(calls, 2000); assert.deepEqual(writes.getSnapshot(), { pending: 0, failed: false });
  for (let index = 0; index < 2000; index++) assert.equal(writes.has(`id-${index}`), false);
  writes.register('id-0', async () => { calls++; }); await writes.wait('id-0');
  assert.equal(calls, 2001); assert.equal(writes.has('id-0'), false);
});
