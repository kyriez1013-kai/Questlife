/** Retain one explicit user submission until both persistence and local follow-up succeed. */
export class DurableSubmission<T> {
  private pending?: { value: T; acknowledged: boolean };
  private active?: Promise<T>;

  get hasPending() { return !!this.pending || !!this.active; }

  run(create: () => T, wait: () => Promise<void>, retry: () => Promise<void>, finish: (value: T) => Promise<void>): Promise<T> {
    if (this.active) return this.active;
    const attempt = async () => {
      const previous = this.pending;
      const submission = previous ?? (this.pending = { value: create(), acknowledged: false });
      if (!submission.acknowledged) {
        await (previous ? retry() : wait());
        submission.acknowledged = true;
      }
      // The caller's follow-up must be idempotent (for example cache by stable ID).
      await finish(submission.value);
      this.pending = undefined;
      return submission.value;
    };
    this.active = attempt().finally(() => { this.active = undefined; });
    return this.active;
  }
}
