// Node's built-in TypeScript runner requires the extension; Expo typecheck does not.
// @ts-expect-error Test-only Node TypeScript entry.
import { createPersistenceWriteQueue, type PersistenceLockManager } from './persistenceLock.ts';

function equal(actual: unknown, expected: unknown, name: string) {
  if (actual !== expected) throw new Error(`${name}: expected ${String(expected)}, received ${String(actual)}`);
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

class FakeCrossTabLockManager implements PersistenceLockManager {
  private queue: Promise<void> = Promise.resolve();
  active = 0;
  maxActive = 0;

  request<T>(
    _name: string,
    _options: { mode: 'exclusive' },
    callback: () => T | PromiseLike<T>,
  ): Promise<T> {
    const result = this.queue.then(async () => {
      this.active += 1;
      this.maxActive = Math.max(this.maxActive, this.active);
      try {
        return await callback();
      } finally {
        this.active -= 1;
      }
    });
    this.queue = result.then(() => undefined, () => undefined);
    return result;
  }
}

async function runPersistenceLockTests() {
  const lockManager = new FakeCrossTabLockManager();
  const tabA = createPersistenceWriteQueue('questlife.test', () => lockManager);
  const tabB = createPersistenceWriteQueue('questlife.test', () => lockManager);
  const shared = { count: 0 };

  await Promise.all([
    tabA(async () => {
      const before = shared.count;
      await wait(15);
      shared.count = before + 1;
    }),
    tabB(async () => {
      const before = shared.count;
      await wait(1);
      shared.count = before + 1;
    }),
  ]);

  equal(shared.count, 2, 'cross-tab writes do not lose an update');
  equal(lockManager.maxActive, 1, 'only one cross-tab writer is active');

  const fallbackQueue = createPersistenceWriteQueue('questlife.test', () => undefined);
  const order: number[] = [];
  await Promise.all([
    fallbackQueue(async () => { await wait(5); order.push(1); }),
    fallbackQueue(async () => { order.push(2); }),
  ]);
  equal(order.join(','), '1,2', 'per-tab fallback preserves write order');
}

await runPersistenceLockTests();
