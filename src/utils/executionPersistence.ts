/** Keep synchronous Store callers compatible while allowing forms to await/retry ACK. */
export class ExecutionPersistence {
  private writes = new Map<string, { run: () => Promise<void>; promise: Promise<void>; failed: boolean }>();

  register(id: string, run: () => Promise<void>): void {
    const previous = this.writes.get(id);
    if (previous && !previous.failed) return;
    const entry = { run: previous?.run ?? run, promise: Promise.resolve(), failed: false };
    entry.promise = Promise.resolve().then(entry.run).then(() => {
      if (this.writes.get(id) === entry) this.writes.delete(id);
    }).catch(error => {
      entry.failed = true;
      throw error;
    });
    // Most legacy callers intentionally do not await; the form still receives rejection.
    void entry.promise.catch(() => undefined);
    this.writes.set(id, entry);
  }

  has(id: string): boolean { return this.writes.has(id); }
  retry(id: string): void {
    const entry = this.writes.get(id);
    if (entry?.failed) this.register(id, entry.run);
  }
  wait(id: string): Promise<void> {
    return this.writes.get(id)?.promise ?? Promise.resolve();
  }
}
