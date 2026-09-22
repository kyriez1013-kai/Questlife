export type LocalMutationPersistenceSnapshot = Readonly<{ pending: number; failed: boolean }>;

type Waiter = { resolve: () => void; reject: (error: unknown) => void };
type Write = {
  id: string;
  run: () => Promise<void>;
  state: 'queued' | 'running' | 'failed';
  error?: unknown;
  waiters: Set<Waiter>;
};

/** Ordered local ACKs for synchronous Store mutations; run owns durable recovery. */
export class LocalMutationPersistence {
  private writes = new Map<string, Write>();
  private tail?: Write;
  private listeners = new Set<() => void>();
  private snapshot: LocalMutationPersistenceSnapshot = Object.freeze({ pending: 0, failed: false });
  private notifying = false;
  private notifyAgain = false;

  register(id: string, run: () => Promise<void>): void {
    const previous = this.writes.get(id);
    if (previous) {
      if (previous.state === 'failed') this.retry(id);
      return;
    }
    const entry: Write = { id, run, state: 'queued', waiters: new Set() };
    this.writes.set(id, entry);
    this.tail = entry;
    this.publish();
    this.startNext();
  }

  has(id: string): boolean { return this.writes.has(id); }

  wait(id: string): Promise<void> {
    return this.waitFor(this.writes.get(id));
  }

  /** The current tail is a FIFO barrier; later registrations cannot extend it. */
  waitAll(): Promise<void> {
    return this.waitFor(this.tail);
  }

  retry(id?: string): void {
    const head = this.head();
    if (!head || head.state !== 'failed' || (id !== undefined && head.id !== id)) return;
    head.state = 'queued';
    delete head.error;
    this.publish();
    this.startNext();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  /** Pending includes the failed head and every write blocked behind it. */
  getSnapshot = (): LocalMutationPersistenceSnapshot => this.snapshot;

  private head(): Write | undefined {
    return this.writes.values().next().value;
  }

  private waitFor(entry: Write | undefined): Promise<void> {
    if (!entry) return Promise.resolve();
    const promise = new Promise<void>((resolve, reject) => {
      const head = this.head();
      if (head?.state === 'failed') reject(head.error);
      else entry.waiters.add({ resolve, reject });
    });
    // Legacy callers may ignore an ACK; explicit awaiters still see rejection.
    void promise.catch(() => undefined);
    return promise;
  }

  private startNext(): void {
    const entry = this.head();
    if (!entry || entry.state !== 'queued') return;
    entry.state = 'running';
    void Promise.resolve().then(entry.run).then(() => {
      this.writes.delete(entry.id);
      if (this.tail === entry) this.tail = undefined;
      for (const waiter of entry.waiters) waiter.resolve();
      entry.waiters.clear();
      this.publish();
      this.startNext();
    }, error => {
      entry.state = 'failed';
      entry.error = error;
      // Blocked ACKs fail promptly too, without discarding their queued writes.
      for (const pending of this.writes.values()) {
        for (const waiter of pending.waiters) waiter.reject(error);
        pending.waiters.clear();
      }
      this.publish();
    });
  }

  private publish(): void {
    const pending = this.writes.size;
    const failed = this.head()?.state === 'failed';
    if (pending === this.snapshot.pending && failed === this.snapshot.failed) return;
    this.snapshot = Object.freeze({ pending, failed });
    if (this.notifying) { this.notifyAgain = true; return; }
    this.notifying = true;
    try {
      do {
        this.notifyAgain = false;
        for (const listener of [...this.listeners]) {
          if (!this.listeners.has(listener)) continue;
          // Observers cannot turn a durable ACK into a write failure.
          try { listener(); } catch { /* Keep later observers and the queue live. */ }
        }
      } while (this.notifyAgain);
    } finally { this.notifying = false; }
  }
}
