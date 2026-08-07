export type PersistenceLockManager = {
  request<T>(
    name: string,
    options: { mode: 'exclusive' },
    callback: () => T | PromiseLike<T>,
  ): Promise<T>;
};

/**
 * Serializes writes within one tab and, when Web Locks is available, across
 * every tab on the same origin.
 */
export function createPersistenceWriteQueue(
  lockName: string,
  getLockManager: () => PersistenceLockManager | undefined,
) {
  let localQueue: Promise<void> = Promise.resolve();

  return function enqueuePersistenceWrite<T>(task: () => T | Promise<T>): Promise<T> {
    const run = async () => {
      const lockManager = getLockManager();
      if (!lockManager) return task();
      return lockManager.request(lockName, { mode: 'exclusive' }, task);
    };
    const result = localQueue.then(run, run);
    localQueue = result.then(() => undefined, () => undefined);
    return result;
  };
}
