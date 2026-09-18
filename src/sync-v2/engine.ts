import { canonical, utf8Bytes, validEntity } from "./registry";
import {
  entityKey,
  type Conflict,
  type Entity,
  type Mutation,
  type Projection,
  type RemoteRow,
  type SyncDisk,
  type SyncState,
  type SyncTransport,
} from "./contracts";

export class SyncEngineV2 {
  private queue: Promise<unknown> = Promise.resolve();
  private inFlight: Promise<void> | null = null;
  private userId: string | null = null;
  private epoch = 0;
  private retryAt = 0;
  private failures = 0;
  private listeners = new Set<() => void>();
  private observedVersions: Record<string, number> = {};
  status: "signedOut" | "idle" | "syncing" | "offline" | "error" | "conflict" =
    "signedOut";
  lastError?: string;
  constructor(
    readonly disk: SyncDisk,
    private transport: SyncTransport,
    readonly deviceId: string,
    private uuid: () => string,
    private now = () => new Date().toISOString(),
  ) {}
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  private emit() {
    this.listeners.forEach((listener) => listener());
  }
  private async transaction<T>(
    fn: (state: SyncState) => Promise<T> | T,
  ): Promise<T> {
    const work = async () => {
      const state = await this.disk.read();
      if (state.version !== 2) throw new Error("sync_journal_invalid");
      if (state.pendingApply.length) {
        await this.disk.apply(state.pendingApply);
        state.pendingApply = [];
        await this.disk.write(state);
      }
      const result = await fn(state);
      await this.disk.write(state);
      if (state.pendingApply.length) {
        await this.disk.apply(state.pendingApply);
        state.pendingApply = [];
        await this.disk.write(state);
      }
      this.observedVersions = { ...state.versions };
      this.emit();
      return result;
    };
    const job = this.queue.then(() =>
      this.disk.exclusive ? this.disk.exclusive(work) : work(),
    );
    this.queue = job.catch(() => undefined);
    return job;
  }
  async recover() {
    await this.transaction(() => {});
  }
  private mutation(
    entity: Entity,
    state: SyncState,
    operation: Mutation["operation"] = "upsert",
  ): Mutation {
    return {
      mutationId: this.uuid(),
      deviceId: this.deviceId,
      entityType: entity.entityType,
      entityId: entity.entityId,
      payload: operation === "upsert" ? entity.payload : undefined,
      operation,
      schemaVersion: 1,
      baseRevision:
        state.versions[entityKey(entity.entityType, entity.entityId)] ?? 0,
      createdAt: this.now(),
      attemptCount: 0,
    };
  }
  /** Local changes are explicit, never inferred from an absent row during pull. */
  async commit(changes: Projection[], apply?: () => Promise<void>) {
    const observedVersions = { ...this.observedVersions };
    await this.transaction(async (state) => {
      for (const change of changes) {
        if (
          change.payload &&
          !validEntity(change.entityType, change.entityId, change.payload)
        )
          throw new Error("provenance_or_payload_rejected");
        if (change.entityType === "healthObservations" && !state.healthConsent)
          continue;
        const mutation = this.mutation(
          { ...change, payload: change.payload ?? { id: change.entityId } },
          state,
          change.payload ? "upsert" : "delete",
        );
        mutation.baseRevision =
          observedVersions[entityKey(change.entityType, change.entityId)] ?? 0;
        state.outbox.push(mutation);
      }
      // WAL is durable before the existing Store projection is considered saved.
      state.pendingApply = changes;
      await this.disk.write(state);
      if (apply) await apply();
      else await this.disk.apply(changes);
      state.pendingApply = [];
    }).catch((error) => {
      this.status = "error";
      this.lastError = "local_persistence_failed";
      this.emit();
      throw error;
    });
  }
  async attach(userId: string, local: Entity[]) {
    this.detach();
    await this.transaction((state) => {
      if (state.ownerId && state.ownerId !== userId)
        throw new Error("account_switch_blocked");
      state.ownerId = userId;
      // A new installation has no revision baseline. Seed only absent local IDs;
      // pulling before pushing reconciles them against remote canonical records.
      const pending = new Set(
        state.outbox.map((m) => entityKey(m.entityType, m.entityId)),
      );
      for (const entity of local) {
        const key = entityKey(entity.entityType, entity.entityId);
        if (
          !state.versions[key] &&
          !pending.has(key) &&
          validEntity(entity.entityType, entity.entityId, entity.payload)
        ) {
          if (entity.entityType !== "healthObservations" || state.healthConsent)
            state.outbox.push(this.mutation(entity, state));
        }
      }
    });
    this.userId = userId;
    this.status = "idle";
    this.lastError = undefined;
    this.emit();
  }
  detach() {
    this.epoch++;
    this.userId = null;
    this.status = "signedOut";
    this.emit();
  }
  async setHealthConsent(enabled: boolean) {
    await this.transaction((state) => {
      state.healthConsent = enabled;
      // Opt-out stops pending health upload, but never deletes remote observations.
      if (!enabled) {
        state.outbox = state.outbox.filter(
          (m) => m.entityType !== "healthObservations",
        );
        state.healthSeen = {};
      }
    });
  }
  async clearLocalReplica(changes: Projection[], confirmed: boolean) {
    if (!confirmed || this.userId)
      throw new Error("signout_and_confirmation_required");
    await this.transaction((state) => {
      if (
        this.userId ||
        state.outbox.length ||
        state.conflicts.some((c) => c.resolution === "pending")
      )
        throw new Error("unsynced_data_cannot_be_cleared");
      if (changes.some((c) => c.payload !== null))
        throw new Error("clear_requires_local_removals");
      // This is local eviction, not a user domain delete. Keep account binding;
      // sign-in to the same account rehydrates from cursor zero. Never enqueue.
      state.pendingApply = changes;
      state.cursor = 0;
      state.versions = {};
      state.hydrated = false;
      state.healthConsent = false;
      state.healthSeen = {};
      state.quarantine = [];
      state.conflicts = [];
      state.lastSuccessAt = undefined;
    });
  }
  async queueHealth(entities: Entity[]) {
    if (!this.userId) return;
    await this.transaction((state) => {
      if (!state.healthConsent || state.ownerId !== this.userId) return;
      state.healthSeen ??= {};
      const pending = new Set(
        state.outbox
          .filter((m) => m.entityType === "healthObservations")
          .map((m) => m.entityId),
      );
      // Bound each foreground cycle. Keep full-fidelity backlog locally; no
      // destructive aggregation, truncation or all-history upload at sign-in.
      let added = 0;
      for (const row of entities) {
        if (added >= 100 || pending.size + added >= 200) break;
        const signature = canonical([
          row.payload.importedAt,
          row.payload.value,
          row.payload.unit,
          row.payload.eventStartAt,
          row.payload.eventEndAt,
          row.payload.measurementMethod,
        ]);
        if (
          pending.has(row.entityId) ||
          state.healthSeen[row.entityId] === signature ||
          !validEntity(row.entityType, row.entityId, row.payload)
        )
          continue;
        state.outbox.push(this.mutation(row, state));
        state.healthSeen[row.entityId] = signature;
        added++;
      }
    });
  }
  private acceptRow(state: SyncState, row: RemoteRow, userId: string) {
    const key = entityKey(row.entity_type, row.entity_id);
    if (
      row.user_id !== userId ||
      row.schema_version !== 1 ||
      !Number.isSafeInteger(row.revision) ||
      row.revision < 1 ||
      (!row.deleted_at &&
        !validEntity(row.entity_type, row.entity_id, row.payload))
    ) {
      state.quarantine.push({
        key,
        sequence: row.change_seq,
        reason: "invalid_remote_entity",
      });
      return true;
    }
    if ((state.versions[key] ?? 0) >= row.revision) return true;
    const local = state.outbox.filter(
      (m) => entityKey(m.entityType, m.entityId) === key,
    );
    const latest = local.at(-1);
    const same =
      latest &&
      (latest.operation === "delete"
        ? !!row.deleted_at
        : !row.deleted_at &&
          canonical(latest.payload) === canonical(row.payload));
    // Pull-first reconciliation only for never-sent initial records. Never change
    // a sent mutation: its receipt must match byte-for-byte on ACK-loss retry.
    if (local.length && local.every((m) => m.attemptCount === 0)) {
      if (!same) this.conflict(state, row, local);
      state.outbox = state.outbox.filter((m) => !local.includes(m));
    } else if (local.length) {
      // Pending sent mutations will be resolved by their immutable server receipt.
      return false;
    }
    state.versions[key] = row.revision;
    if (row.entity_type === "healthObservations" && row.payload) {
      state.healthSeen ??= {};
      state.healthSeen[row.entity_id] = canonical([
        row.payload.importedAt,
        row.payload.value,
        row.payload.unit,
        row.payload.eventStartAt,
        row.payload.eventEndAt,
        row.payload.measurementMethod,
      ]);
    }
    state.pendingApply.push({
      entityType: row.entity_type,
      entityId: row.entity_id,
      payload: row.deleted_at ? null : row.payload,
    });
    return true;
  }
  private conflict(state: SyncState, remote: RemoteRow, local: Mutation[]) {
    const conflict: Conflict = {
      id: this.uuid(),
      entityType: remote.entity_type,
      entityId: remote.entity_id,
      local,
      remote,
      deviceId: this.deviceId,
      createdAt: this.now(),
      resolution: "pending",
    };
    state.conflicts.push(conflict);
  }
  async pull() {
    const user = this.userId,
      epoch = this.epoch;
    if (!user) return;
    let more = true;
    while (more && epoch === this.epoch) {
      const cursor = (await this.disk.read()).cursor;
      const rows = await this.transport.pull(user, cursor, 200);
      if (epoch !== this.epoch) return;
      const blocked = await this.transaction((state) => {
        if (epoch !== this.epoch) return true;
        for (const row of rows) {
          if (
            !Number.isSafeInteger(row.change_seq) ||
            row.change_seq <= state.cursor
          )
            throw new Error("invalid_remote_order");
          if (!this.acceptRow(state, row, user)) return true;
          state.cursor = row.change_seq;
        }
        if (rows.length < 200) state.hydrated = true;
        return false;
      });
      more = !blocked && rows.length === 200;
    }
  }
  async push() {
    const user = this.userId,
      epoch = this.epoch;
    if (!user) return;
    // One head per entity per batch. Consecutive edits get the acknowledged base.
    while (epoch === this.epoch) {
      const batch = await this.transaction((state) => {
        if (epoch !== this.epoch) return [];
        const seen = new Set<string>();
        let bytes = 0;
        let selected = 0;
        return state.outbox
          .filter((m) => {
            const key = entityKey(m.entityType, m.entityId);
            if (seen.has(key)) return false;
            seen.add(key);
            if (selected >= 50 || m.lastError === "invalid_mutation")
              return false;
            if (m.entityType === "healthObservations" && !state.healthConsent)
              return false;
            const size = utf8Bytes(JSON.stringify(m));
            if (bytes + size > 500000) return false;
            bytes += size;
            selected++;
            m.attemptCount++;
            m.lastAttemptAt = this.now();
            return true;
          })
          .map((m) => ({ ...m }));
      });
      if (!batch.length || epoch !== this.epoch) break;
      const results = await this.transport.push(user, batch);
      if (epoch !== this.epoch) return;
      await this.transaction((state) => {
        if (epoch !== this.epoch) return;
        for (const result of results) {
          const sent = batch.find((m) => m.mutationId === result.mutationId);
          const current = state.outbox.find(
            (m) => m.mutationId === result.mutationId,
          );
          if (!sent || !current) continue;
          if (result.status === "rejected") {
            current.lastError = "invalid_mutation";
            continue;
          }
          const remote = result.remote;
          if (
            !remote ||
            remote.user_id !== user ||
            remote.entity_type !== sent.entityType ||
            remote.entity_id !== sent.entityId ||
            !Number.isSafeInteger(remote.revision) ||
            (!remote.deleted_at &&
              !validEntity(
                remote.entity_type,
                remote.entity_id,
                remote.payload,
              ))
          )
            throw new Error("invalid_ack");
          const key = entityKey(sent.entityType, sent.entityId);
          const linked = state.outbox.filter(
            (m) => entityKey(m.entityType, m.entityId) === key,
          );
          if (result.status === "conflict") {
            this.conflict(state, remote, linked);
            state.outbox = state.outbox.filter((m) => !linked.includes(m));
            state.pendingApply.push({
              entityType: remote.entity_type,
              entityId: remote.entity_id,
              payload: remote.deleted_at ? null : remote.payload,
            });
          } else {
            state.outbox = state.outbox.filter(
              (m) => m.mutationId !== sent.mutationId,
            );
            const next = state.outbox.find(
              (m) => entityKey(m.entityType, m.entityId) === key,
            );
            if (next && next.attemptCount === 0)
              next.baseRevision = remote.revision;
          }
          state.versions[key] = remote.revision;
        }
      });
      if (results.length !== batch.length) throw new Error("partial_ack_retry");
    }
  }
  async resolve(id: string, resolution: "remote" | "local") {
    await this.transaction((state) => {
      const conflict = state.conflicts.find(
        (c) => c.id === id && c.resolution === "pending",
      );
      if (!conflict) return;
      conflict.resolution = resolution;
      if (resolution === "local") {
        const latest = conflict.local.at(-1)!;
        const next = this.mutation(
          {
            entityType: latest.entityType,
            entityId: latest.entityId,
            payload: latest.payload ?? { id: latest.entityId },
          },
          state,
          latest.operation,
        );
        state.outbox.push(next);
        state.pendingApply.push({
          entityType: latest.entityType,
          entityId: latest.entityId,
          payload: latest.payload ?? null,
        });
      }
    });
  }
  sync(force = false): Promise<void> {
    if (this.inFlight) return this.inFlight;
    if (!this.userId || (!force && Date.now() < this.retryAt))
      return Promise.resolve();
    this.inFlight = (async () => {
      this.status = "syncing";
      this.emit();
      try {
        await this.pull();
        await this.push();
        await this.pull();
        if (!this.userId) return;
        await this.transaction((state) => {
          if (
            !state.outbox.length &&
            !state.conflicts.some((c) => c.resolution === "pending") &&
            !state.quarantine.length
          )
            state.lastSuccessAt = this.now();
        });
        const state = await this.disk.read();
        this.status = state.conflicts.some((c) => c.resolution === "pending")
          ? "conflict"
          : state.quarantine.length || state.outbox.some((m) => m.lastError)
            ? "error"
            : "idle";
        this.failures = 0;
        this.retryAt = 0;
        this.lastError = undefined;
      } catch {
        if (this.userId) {
          this.status = "offline";
          this.lastError = "sync_unavailable";
          this.retryAt =
            Date.now() +
            Math.min(120000, 1000 * 2 ** Math.min(7, this.failures++));
        }
      } finally {
        this.emit();
      }
    })().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }
}
