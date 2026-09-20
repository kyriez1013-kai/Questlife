import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { SyncEngineV2 } from "../../src/sync-v2/engine";
import {
  emptySyncState,
  entityKey,
  type Mutation,
  type Projection,
  type PushResult,
  type RemoteRow,
  type SyncState,
  type SyncTransport,
} from "../../src/sync-v2/contracts";
import { utf8Bytes, validEntity } from "../../src/sync-v2/registry";
import { AuthService } from "../../src/sync-v2/auth";
import { localChanges, projectAppData } from "../../src/sync-v2/projection";
import { DEFAULT_DATA } from "../../src/types";
import {
  normalizeHealthSample,
  restoreHealthImportTime,
} from "../../src/platform/health/normalization";
import { isPublicSupabaseKey } from "../../src/sync-v2/publicConfig";
import {
  CalendarService,
  type CalendarDriver,
} from "../../src/platform/calendar/CalendarService";
import { HealthCollection } from "../../src/platform/health/HealthCollection";
import { applyHealthChanges } from "../../src/platform/health/changes";
import {
  externalCommitmentIdentity,
  uniqueCommitments,
} from "../../src/platform/calendar/identity";
import {
  emptyDeviceData,
  DeviceRepository,
} from "../../src/platform/deviceRepository";
import {
  planLocalNotifications,
  syncNotificationPlan,
} from "../../src/platform/notifications/planner";
import type {
  ExternalCommitment,
  NotificationService,
} from "../../src/platform/contracts";
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));
const row = (id: string, name = "name"): Projection => ({
  entityType: "categories",
  entityId: id,
  payload: { id, name, createdAt: 1 },
});
class Server implements SyncTransport {
  rows = new Map<string, RemoteRow>();
  receipts = new Map<string, PushResult>();
  seq = 0;
  offline = false;
  loseAck = false;
  async push(user: string, mutations: Mutation[]) {
    if (this.offline) throw Error("offline");
    const results: PushResult[] = mutations.map((m) => {
      const receipt = this.receipts.get(user + m.mutationId);
      if (receipt) return clone(receipt);
      const key = user + entityKey(m.entityType, m.entityId);
      const prior = this.rows.get(key);
      const result: PushResult =
        prior && prior.revision !== m.baseRevision
          ? {
              mutationId: m.mutationId,
              status: "conflict",
              remote: clone(prior),
            }
          : {
              mutationId: m.mutationId,
              status: "applied",
              remote: {
                user_id: user,
                entity_type: m.entityType,
                entity_id: m.entityId,
                payload: m.payload ?? null,
                schema_version: 1,
                revision: m.baseRevision + 1,
                change_seq: ++this.seq,
                origin_device_id: m.deviceId,
                client_mutated_at: m.createdAt,
                server_updated_at: m.createdAt,
                deleted_at: m.operation === "delete" ? m.createdAt : null,
              },
            };
      if (result.status === "applied")
        this.rows.set(key, clone(result.remote!));
      this.receipts.set(user + m.mutationId, clone(result));
      return result;
    });
    if (this.loseAck) {
      this.loseAck = false;
      throw Error("ack lost");
    }
    return results;
  }
  async pull(user: string, cursor: number, limit: number) {
    if (this.offline) throw Error("offline");
    return clone(
      [...this.rows.values()]
        .filter((r) => r.user_id === user && r.change_seq > cursor)
        .sort((a, b) => a.change_seq - b.change_seq)
        .slice(0, limit),
    );
  }
}
function client(server: Server, device = "web:a") {
  let state = emptySyncState();
  const visible = new Map<string, Projection>();
  let failApply = false;
  const disk = {
    read: async () => clone(state),
    write: async (s: SyncState) => {
      state = clone(s);
    },
    apply: async (changes: Projection[]) => {
      if (failApply) {
        failApply = false;
        throw Error("crash");
      }
      changes.forEach((c) => {
        if (c.payload) visible.set(c.entityId, c);
        else visible.delete(c.entityId);
      });
    },
  };
  const make = () => new SyncEngineV2(disk, server, device, randomUUID);
  return {
    engine: make(),
    make,
    disk,
    visible,
    crash: () => {
      failApply = true;
    },
    state: () => state,
  };
}
test("two devices create, edit, delete and repeat tombstone", async () => {
  const server = new Server(),
    a = client(server),
    b = client(server, "ios:b");
  await a.engine.attach("owner", []);
  await b.engine.attach("owner", []);
  await a.engine.commit([row("one")]);
  await a.engine.sync(true);
  await b.engine.sync(true);
  assert.equal(b.visible.get("one")?.payload?.name, "name");
  await b.engine.commit([row("one", "edited")]);
  await b.engine.sync(true);
  await a.engine.sync(true);
  assert.equal(a.visible.get("one")?.payload?.name, "edited");
  await a.engine.commit([{ ...row("one"), payload: null }]);
  await a.engine.sync(true);
  await b.engine.sync(true);
  assert.equal(b.visible.size, 0);
  await a.engine.commit([{ ...row("one"), payload: null }]);
  await a.engine.sync(true);
  await b.engine.sync(true);
  assert.equal(b.visible.size, 0);
});
test("offline mutation survives restart", async () => {
  const s = new Server(),
    a = client(s);
  await a.engine.attach("u", []);
  s.offline = true;
  await a.engine.commit([row("one")]);
  await a.engine.sync(true);
  assert.equal(a.engine.status, "offline");
  a.engine = a.make();
  await a.engine.attach("u", []);
  s.offline = false;
  await a.engine.sync(true);
  assert.equal(a.state().outbox.length, 0);
  assert.equal(s.rows.size, 1);
});
test("rejected head blocks later edits of the same entity but not other entities", async () => {
  const server = new Server(),
    a = client(server);
  await a.engine.attach("u", []);
  await a.engine.commit([row("one")]);
  await a.engine.commit([row("one", "later")]);
  await a.engine.commit([row("two")]);
  const original = server.push.bind(server);
  const seen: string[] = [];
  server.push = async (user, mutations) => {
    seen.push(...mutations.map((m) => m.entityId + ":" + m.payload?.name));
    const output: PushResult[] = [];
    for (const m of mutations)
      output.push(
        m.entityId === "one"
          ? {
              mutationId: m.mutationId,
              status: "rejected",
              error: "invalid_mutation",
            }
          : (await original(user, [m]))[0],
      );
    return output;
  };
  await a.engine.sync(true);
  assert.deepEqual(seen, ["one:name", "two:name"]);
  assert.equal(a.state().outbox.length, 2);
  assert.equal(a.engine.status, "error");
  assert.equal(a.state().lastSuccessAt, undefined);
});
test("Unicode payload limits count UTF-8 bytes, not code units", () => {
  const payload = { id: "large", name: "记录".repeat(30000), createdAt: 1 };
  assert.equal(
    utf8Bytes(JSON.stringify(payload)),
    Buffer.byteLength(JSON.stringify(payload)),
  );
  assert.equal(validEntity("categories", "large", payload), false);
});
test("local replica clear requires signout and confirmation, preserves cloud, restores same account", async () => {
  const s = new Server(),
    a = client(s);
  await a.engine.attach("u", []);
  await a.engine.commit([row("one")]);
  await a.engine.sync(true);
  const removal = { ...row("one"), payload: null };
  await assert.rejects(a.engine.clearLocalReplica([removal], true));
  a.engine.detach();
  await assert.rejects(a.engine.clearLocalReplica([removal], false));
  await a.engine.clearLocalReplica([removal], true);
  assert.equal(a.visible.size, 0);
  assert.equal(a.state().outbox.length, 0);
  assert.equal(a.state().ownerId, "u");
  assert.equal([...s.rows.values()][0].deleted_at, null);
  await assert.rejects(a.engine.attach("other", []));
  await a.engine.attach("u", []);
  await a.engine.sync(true);
  assert.equal(a.visible.size, 1);
});
test("local replica clear never discards unsynced changes", async () => {
  const a = client(new Server());
  await a.engine.commit([row("one")]);
  await assert.rejects(
    a.engine.clearLocalReplica([{ ...row("one"), payload: null }], true),
  );
  assert.equal(a.state().outbox.length, 1);
  assert.equal(a.visible.size, 1);
});
test("only public Supabase keys are accepted by client configuration", () => {
  const jwt = (role: string) =>
    `header.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.signature`;
  assert.equal(isPublicSupabaseKey(jwt("anon")), true);
  assert.equal(isPublicSupabaseKey("sb_publishable_test"), true);
  for (const key of [
    undefined,
    "",
    "sb_secret_hidden",
    jwt("service_role"),
    "not-a-token",
  ])
    assert.equal(isPublicSupabaseKey(key), false);
});
test("explicit Calendar block export retains linkage and does not duplicate on retry", async () => {
  const kv = new Map<string, string>();
  const repo = new DeviceRepository({
    getItem: async (key) => kv.get(key) ?? null,
    setItem: async (key, value) => {
      kv.set(key, value);
    },
  });
  let creates = 0,
    updates = 0;
  let event: any;
  const driver: CalendarDriver = {
    operationId: randomUUID,
    inspect: async () => event ?? null,
    findByMarker: async (_, marker) => event?.operationMarker === marker ? [event] : [],
    available: async () => true,
    permission: async () => "granted",
    calendars: async () => [
      { id: "cal", title: "calendar", writable: true, source: "system" },
    ],
    read: async () => [
      {
        id: "observed",
        externalEventId: "event",
        calendarId: "cal",
        source: "system_calendar",
        title: "Task",
        startAt: "2026-09-18T10:00:00Z",
        endAt: "2026-09-18T11:00:00Z",
        allDay: false,
      },
    ],
    create: async (calendarId, draft, marker) => {
      creates++;
      event = { ...draft, id: 'observed', externalEventId: 'event', calendarId, source: 'system_calendar', allDay: false, operationMarker: marker };
      return "event";
    },
    update: async (_, draft, expected, marker) => {
      updates++;
      event = { ...event, ...draft, operationMarker: marker };
    },
    remove: async () => {},
    open: async () => {},
  };
  const service = new CalendarService(driver, repo);
  const block = {
    id: "block",
    title: "Task",
    date: "2026-09-18",
    startTime: "10:00",
    endTime: "11:00",
    plannedMinutes: 60,
    status: "planned" as const,
    createdAt: 1,
    taskType: "admin" as const,
    flexibility: "fixed" as const,
    rigidity: "high" as const,
  };
  await assert.rejects(
    service.createForBlock("cal", block, { confirmed: false } as never),
  );
  await service.createForBlock("cal", block, { confirmed: true });
  await service.sync(["cal"], "2026-09-18T00:00:00Z", "2026-09-19T00:00:00Z");
  assert.equal(
    (await repo.read()).calendar.events[0].linkedScheduleBlockId,
    "block",
  );
  assert.equal((await repo.read()).calendar.events[0].availability, "unknown");
  await service.createForBlock("cal", block, { confirmed: true });
  assert.equal(creates, 1);
  assert.equal(updates, 0);
});
test("Phase 1 Health import time uses stored first availability, never current time", () => {
  const original = normalizeHealthSample({
    metric: "heart_rate",
    value: 72,
    unit: "bpm",
    startAt: "2026-09-01T01:00:00Z",
    endAt: "2026-09-01T01:00:00Z",
    availableAt: "2026-09-02T00:00:00Z",
    externalId: "record-one",
    platform: "healthkit",
  })!;
  const old = { ...original };
  delete (old as Partial<typeof old>).importedAt;
  const upgraded = restoreHealthImportTime(old);
  assert.equal(upgraded.importedAt, original.availableAt);
  assert.ok(
    upgraded.limitations.includes("LEGACY_IMPORT_TIME_FROM_FIRST_AVAILABLE_AT"),
  );
  assert.deepEqual(restoreHealthImportTime(upgraded), upgraded);
  assert.equal(validEntity("healthObservations", upgraded.id, upgraded), true);
});
test("expiry and sign-out invalidate an in-flight pull without writing remote data", async () => {
  const s = new Server(),
    a = client(s),
    b = client(s);
  await a.engine.attach("u", []);
  await b.engine.attach("u", []);
  await b.engine.commit([row("one")]);
  await b.engine.sync(true);
  let release!: () => void;
  const waiting = new Promise<void>((r) => {
    release = r;
  });
  const original = s.pull.bind(s);
  s.pull = async (...args) => {
    const result = await original(...args);
    await waiting;
    return result;
  };
  const syncing = a.engine.sync(true);
  await new Promise((r) => setTimeout(r, 0));
  a.engine.detach();
  release();
  await syncing;
  assert.equal(a.visible.size, 0);
  assert.equal(a.state().cursor, 0);
  assert.equal(a.engine.status, "signedOut");
});
test("a local edit queued while remote apply finishes retains its observed base revision", async () => {
  const s = new Server(),
    a = client(s),
    b = client(s);
  await a.engine.attach("u", []);
  await b.engine.attach("u", []);
  await a.engine.commit([row("one")]);
  await a.engine.sync(true);
  await b.engine.sync(true);
  await b.engine.commit([row("one", "remote newer")]);
  await b.engine.sync(true);
  const apply = a.disk.apply;
  let signal!: () => void, release!: () => void;
  const entered = new Promise<void>((r) => {
    signal = r;
  });
  const waiting = new Promise<void>((r) => {
    release = r;
  });
  a.disk.apply = async (changes) => {
    signal();
    await waiting;
    await apply(changes);
  };
  const pull = a.engine.pull();
  await entered;
  const edit = a.engine.commit([row("one", "local based on old view")]);
  release();
  await pull;
  await edit;
  assert.equal(a.state().outbox[0].baseRevision, 1);
  await a.engine.sync(true);
  assert.equal(a.state().conflicts.length, 1);
  assert.equal(a.visible.get("one")?.payload?.name, "remote newer");
});
test("lost ACK retries immutable mutation without revision inflation", async () => {
  const s = new Server(),
    a = client(s);
  await a.engine.attach("u", []);
  await a.engine.commit([row("one")]);
  s.loseAck = true;
  await a.engine.sync(true);
  assert.equal(a.state().outbox.length, 1);
  await a.engine.sync(true);
  assert.equal(a.state().outbox.length, 0);
  assert.equal([...s.rows.values()][0].revision, 1);
});
test("lost ACK then another device edits does not skip the newer remote revision", async () => {
  const s = new Server(),
    a = client(s),
    b = client(s);
  await a.engine.attach("u", []);
  await b.engine.attach("u", []);
  await a.engine.commit([row("one")]);
  s.loseAck = true;
  await a.engine.sync(true);
  await b.engine.sync(true);
  await b.engine.commit([row("one", "newer")]);
  await b.engine.sync(true);
  await a.engine.sync(true);
  assert.equal(a.visible.get("one")?.payload?.name, "newer");
  assert.equal(a.state().versions[entityKey("categories", "one")], 2);
});
test("per entity create edit edit delete remains ordered", async () => {
  const s = new Server(),
    a = client(s);
  await a.engine.attach("u", []);
  await a.engine.commit([
    row("one"),
    row("one", "2"),
    row("one", "3"),
    { ...row("one"), payload: null },
  ]);
  await a.engine.sync(true);
  assert.equal(a.state().outbox.length, 0);
  assert.equal([...s.rows.values()][0].revision, 4);
  assert.ok([...s.rows.values()][0].deleted_at);
});
test("concurrent local edit keeps payload in conflict; remote remains canonical", async () => {
  const s = new Server(),
    a = client(s),
    b = client(s);
  await a.engine.attach("u", []);
  await b.engine.attach("u", []);
  await a.engine.commit([row("one")]);
  await a.engine.sync(true);
  await b.engine.sync(true);
  await a.engine.commit([row("one", "A")]);
  await b.engine.commit([row("one", "B")]);
  await b.engine.sync(true);
  await a.engine.sync(true);
  assert.equal(a.engine.status, "conflict");
  assert.equal(a.state().conflicts[0].local[0].payload?.name, "A");
  assert.equal(a.visible.get("one")?.payload?.name, "B");
  await a.engine.resolve(a.state().conflicts[0].id, "local");
  await a.engine.sync(true);
  await b.engine.sync(true);
  assert.equal(b.visible.get("one")?.payload?.name, "A");
});
test("first account merges disjoint and conflicts same id; no local loss", async () => {
  const s = new Server(),
    a = client(s),
    b = client(s);
  await a.engine.attach("u", []);
  await a.engine.commit([row("same", "remote"), row("remote")]);
  await a.engine.sync(true);
  const local = [row("same", "local"), row("local")].map((c) => ({
    ...c,
    payload: c.payload!,
  }));
  await b.engine.attach("u", local);
  await b.engine.sync(true);
  assert.equal(b.state().conflicts.length, 1);
  assert.equal(s.rows.size, 3);
});
test("first account identical rows dedupe without revision change", async () => {
  const s = new Server(),
    a = client(s),
    b = client(s);
  await a.engine.attach("u", []);
  await a.engine.commit([row("one")]);
  await a.engine.sync(true);
  await b.engine.attach("u", [{ ...row("one"), payload: row("one").payload! }]);
  await b.engine.sync(true);
  assert.equal(b.state().conflicts.length, 0);
  assert.equal([...s.rows.values()][0].revision, 1);
});
test("account switch fails closed and signout keeps local data", async () => {
  const s = new Server(),
    a = client(s);
  await a.engine.attach("A", []);
  await a.engine.commit([row("one")]);
  a.engine.detach();
  await a.engine.sync(true);
  assert.equal(s.rows.size, 0);
  await assert.rejects(a.engine.attach("B", []), /account_switch/);
  assert.equal(a.state().outbox.length, 1);
  assert.equal(a.state().ownerId, "A");
});
test("replay crash between journal and projection without duplicate outbox", async () => {
  const s = new Server(),
    a = client(s);
  await a.engine.attach("u", []);
  a.crash();
  await assert.rejects(a.engine.commit([row("one")]));
  assert.equal(a.state().pendingApply.length, 1);
  a.engine = a.make();
  await a.engine.recover();
  assert.equal(a.visible.size, 1);
  assert.equal(a.state().pendingApply.length, 0);
  assert.equal(a.state().outbox.length, 1);
});
test("remote apply crash recovers cursor and projection together", async () => {
  const s = new Server(),
    a = client(s),
    b = client(s);
  await a.engine.attach("u", []);
  await b.engine.attach("u", []);
  await a.engine.commit([row("one")]);
  await a.engine.sync(true);
  b.crash();
  await b.engine.sync(true);
  assert.equal(b.state().pendingApply.length, 1);
  b.engine = b.make();
  await b.engine.recover();
  await b.engine.attach("u", []);
  await b.engine.sync(true);
  assert.equal(b.visible.size, 1);
  assert.equal(b.state().outbox.length, 0);
});
test("malformed remote payload quarantined without crashing hydration", async () => {
  const s = new Server(),
    a = client(s);
  await a.engine.attach("u", []);
  await a.engine.commit([row("one")]);
  await a.engine.sync(true);
  [...s.rows.values()][0].payload = { id: "one", name: 17 };
  const b = client(s);
  await b.engine.attach("u", []);
  await b.engine.sync(true);
  assert.equal(b.visible.size, 0);
  assert.equal(b.state().quarantine.length, 1);
});
test("out of order remote response cannot advance cursor", async () => {
  const s = new Server(),
    a = client(s);
  await a.engine.attach("u", []);
  await a.engine.commit([row("a"), row("b")]);
  await a.engine.sync(true);
  const b = client(s);
  const pull = s.pull.bind(s);
  s.pull = async (...args) => (await pull(...args)).reverse();
  await b.engine.attach("u", []);
  await b.engine.sync(true);
  assert.equal(b.state().cursor, 0);
});
test("provenance firewall rejects nested synthetic and QA", () => {
  for (const fields of [
    { dataProvenance: { origin: "QA_TEST" } },
    { decisionEpisode: { provenance: { syntheticOnly: true } } },
    { trigger: "debug" },
    { isFixture: true },
  ])
    assert.equal(
      validEntity("categories", "one", { ...row("one").payload, ...fields }),
      false,
    );
  assert.equal(
    validEntity("categories", "qa-record", {
      id: "qa-record",
      name: "x",
      createdAt: 1,
    }),
    false,
  );
});
test("absent rows during retention are not deletions; explicit delete is", () => {
  const base = {
    ...DEFAULT_DATA,
    categories: [{ id: "one", name: "n", createdAt: 1 }],
  };
  assert.equal(localChanges(base, DEFAULT_DATA, false).length, 0);
  assert.equal(localChanges(base, DEFAULT_DATA, true)[0].payload, null);
});
test("remote projection idempotent and preserves settings", () => {
  const d = { ...DEFAULT_DATA, settings: { language: "en" as const } };
  const a = projectAppData(d, [row("one")]);
  assert.deepEqual(projectAppData(a, [row("one")]), a);
  assert.equal(a.settings.language, "en");
});
test("Auth abstraction request verify restore signout, no token API", async () => {
  let session: { userId: string; email: string } | null = null;
  let email = "";
  const a = new AuthService({
    session: async () => session,
    subscribe: () => () => {},
    requestOtp: async (e) => {
      email = e;
    },
    verifyOtp: async (e) => {
      session = { userId: "u", email: e };
    },
    signOut: async () => {
      session = null;
    },
  });
  assert.equal(await a.getSession(), null);
  await assert.rejects(a.requestOtp("invalid"));
  await a.requestOtp("user@example.test");
  assert.equal(email, "user@example.test");
  await assert.rejects(a.verifyOtp(email, "x"));
  await a.verifyOtp(email, "123456");
  assert.equal(await a.getUserId(), "u");
  await a.signOut();
  assert.equal(await a.getUserId(), null);
});
function observation(id: string) {
  return normalizeHealthSample({
    metric: "heart_rate",
    value: 70,
    unit: "bpm",
    startAt: "2026-09-18T00:00:00Z",
    endAt: "2026-09-18T00:00:01Z",
    availableAt: "2026-09-18T00:01:00Z",
    externalId: id,
    platform: "healthkit",
  })!;
}
test("Health requires auth and explicit consent; full provenance hydrates another client", async () => {
  const s = new Server(),
    a = client(s),
    b = client(s);
  const h = observation("record-1");
  const entity = {
    entityType: "healthObservations" as const,
    entityId: h.id,
    payload: h as unknown as import("../../src/sync-v2/contracts").Payload,
  };
  await a.engine.queueHealth([entity]);
  assert.equal(a.state().outbox.length, 0);
  await a.engine.attach("u", []);
  await a.engine.queueHealth([entity]);
  assert.equal(a.state().outbox.length, 0);
  await a.engine.setHealthConsent(true);
  await a.engine.queueHealth([entity]);
  await a.engine.sync(true);
  await b.engine.attach("u", []);
  await b.engine.sync(true);
  assert.deepEqual(b.visible.get(h.id)?.payload, clone(h));
  await a.engine.queueHealth([entity]);
  assert.equal(a.state().outbox.length, 0);
});
test("Health backlog is bounded; opt-out clears queued health but not cloud records", async () => {
  const s = new Server(),
    a = client(s);
  await a.engine.attach("u", []);
  await a.engine.setHealthConsent(true);
  const entities = Array.from({ length: 500 }, (_, i) => {
    const h = observation("record-" + i);
    return {
      entityType: "healthObservations" as const,
      entityId: h.id,
      payload: h as unknown as import("../../src/sync-v2/contracts").Payload,
    };
  });
  await a.engine.queueHealth(entities);
  assert.equal(a.state().outbox.length, 100);
  await a.engine.queueHealth(entities);
  assert.equal(a.state().outbox.length, 200);
  await a.engine.queueHealth(entities);
  assert.equal(a.state().outbox.length, 200);
  await a.engine.setHealthConsent(false);
  assert.equal(a.state().outbox.length, 0);
});
test("explicit provider deletion queues a remote Health tombstone without inferring absence", async () => {
  const s = new Server(), a = client(s), b = client(s, "ios:health-b");
  const h = observation("provider-delete-record"), kept = observation("provider-kept-record");
  const entities = [h, kept].map(payload => ({ entityType: "healthObservations" as const, entityId: payload.id, payload }));
  await a.engine.attach("u", []); await a.engine.setHealthConsent(true);
  await a.engine.queueHealth(entities); await a.engine.sync(true);
  await b.engine.attach("u", []); await b.engine.sync(true);
  const source = applyHealthChanges([h, kept], [], [{ kind: "delete", sourceRecordId: h.externalId, sourcePlatform: h.sourcePlatform, metric: h.metric }], "2026-09-20T00:00:00Z");
  await a.engine.queueHealth([], []);
  assert.equal(a.state().outbox.length, 0, "empty snapshots do not delete");
  assert.deepEqual(await a.engine.queueHealth([], source.healthDeletions), []);
  assert.equal(a.state().outbox[0].operation, "delete");
  assert.equal(a.state().outbox[0].payload, undefined);
  await a.engine.sync(true); await b.engine.sync(true);
  assert.equal(s.rows.get("u" + entityKey("healthObservations", h.id))?.payload, null);
  assert.ok(s.rows.get("u" + entityKey("healthObservations", h.id))?.deleted_at);
  assert.equal(b.visible.has(h.id), false); assert.equal(b.visible.has(kept.id), true);
  assert.deepEqual(await a.engine.queueHealth([], source.healthDeletions), source.healthDeletions);
  assert.equal(a.state().outbox.length, 0, "retained explicit marker is deduplicated after ACK");
});
test("Health tombstone lost ACK survives restart with immutable mutation and no duplicate revision", async () => {
  const s = new Server(), a = client(s);
  const h = observation("provider-ack-record");
  await a.engine.attach("u", []); await a.engine.setHealthConsent(true);
  await a.engine.queueHealth([{entityType: "healthObservations", entityId: h.id, payload: h}]); await a.engine.sync(true);
  const deletions = [{observationId: h.id, deletedAt: "2026-09-20T00:00:00Z"}];
  await a.engine.queueHealth([], deletions);
  const original = clone(a.state().outbox[0]);
  s.loseAck = true; await a.engine.sync(true);
  const remote = clone(s.rows.get("u" + entityKey("healthObservations", h.id))!);
  assert.ok(remote.deleted_at); assert.equal(a.state().outbox.length, 1);
  a.engine.detach(); a.engine = a.make(); await a.engine.attach("u", []);
  await a.engine.queueHealth([], deletions);
  assert.equal(a.state().outbox.length, 1);
  assert.equal(a.state().outbox[0].mutationId, original.mutationId);
  assert.equal(a.state().outbox[0].baseRevision, original.baseRevision);
  await a.engine.sync(true);
  assert.equal(a.state().outbox.length, 0);
  assert.deepEqual(s.rows.get("u" + entityKey("healthObservations", h.id)), remote);
  assert.deepEqual(await a.engine.queueHealth([], deletions), deletions);
});
test("Health source metadata-only revisions upload even when measurement value is unchanged", async () => {
  const s = new Server(), a = client(s);
  const h = {...observation("provider-revision-record"), sourceRecordId: "parent-1", sourceModifiedAt: "2026-09-18T00:00:00Z"};
  await a.engine.attach("u", []); await a.engine.setHealthConsent(true);
  await a.engine.queueHealth([{entityType: "healthObservations", entityId: h.id, payload: h}]); await a.engine.sync(true);
  const next = {...h, sourceModifiedAt: "2026-09-19T00:00:00Z"};
  await a.engine.queueHealth([{entityType: "healthObservations", entityId: h.id, payload: next}]);
  assert.equal(a.state().outbox.length, 1);
  await a.engine.sync(true);
  assert.equal(s.rows.get("u" + entityKey("healthObservations", h.id))?.payload?.sourceModifiedAt, next.sourceModifiedAt);
});
test("explicit Health deletion follows pending upsert and source-update child retirement stays exact", async () => {
  const s = new Server(), a = client(s);
  const h = {...observation("provider-child-1"), sourceRecordId: "provider-parent"};
  const next = {...observation("provider-child-2"), sourceRecordId: "provider-parent"};
  await a.engine.attach("u", []); await a.engine.setHealthConsent(true);
  await a.engine.queueHealth([{entityType: "healthObservations", entityId: h.id, payload: h}]);
  const source = applyHealthChanges([h], [], [{kind: "upsert", sourcePlatform: h.sourcePlatform, metric: h.metric, sourceRecordId: "provider-parent", observations: [next]}], "2026-09-20T00:00:00Z");
  assert.equal(source.healthDeletions[0].reason, "source_update");
  await a.engine.queueHealth(source.observations.map(payload => ({entityType: "healthObservations", entityId: payload.id, payload})), source.healthDeletions);
  assert.deepEqual(a.state().outbox.filter(m => m.entityId === h.id).map(m => m.operation), ["upsert", "delete"]);
  await a.engine.sync(true);
  assert.ok(s.rows.get("u" + entityKey("healthObservations", h.id))?.deleted_at);
  assert.equal(s.rows.get("u" + entityKey("healthObservations", next.id))?.deleted_at, null);
});
test("explicit Health deletions respect auth, consent, owner isolation and bounded backlog", async () => {
  const s = new Server(), a = client(s);
  const deletions = Array.from({length: 500}, (_, i) => ({observationId: observation(`provider-bounded-${i}`).id, deletedAt: "2026-09-20T00:00:00Z"}));
  await a.engine.queueHealth([], deletions); assert.equal(a.state().outbox.length, 0);
  await a.engine.attach("u", []); await a.engine.queueHealth([], deletions); assert.equal(a.state().outbox.length, 0);
  await a.engine.setHealthConsent(true);
  await a.engine.queueHealth([], deletions); assert.equal(a.state().outbox.length, 100);
  await a.engine.queueHealth([], deletions); assert.equal(a.state().outbox.length, 200);
  await a.engine.queueHealth([], deletions); assert.equal(a.state().outbox.length, 200);
  await assert.rejects(a.engine.attach("other", []), /account_switch_blocked/);
  await a.engine.queueHealth([], deletions); assert.equal(a.state().outbox.length, 200);
  await a.engine.setHealthConsent(false); assert.equal(a.state().outbox.length, 0);
});
test("Health deletion conflict remains explicit and is never silently requeued over remote winner", async () => {
  const s = new Server(), a = client(s), b = client(s, "ios:health-conflict");
  const h = observation("provider-conflict-record");
  await a.engine.attach("u", []); await a.engine.setHealthConsent(true);
  await a.engine.queueHealth([{entityType: "healthObservations", entityId: h.id, payload: h}]); await a.engine.sync(true);
  await b.engine.attach("u", []); await b.engine.setHealthConsent(true); await b.engine.sync(true);
  const deletions = [{observationId: h.id, deletedAt: "2026-09-20T00:00:00Z"}];
  await a.engine.queueHealth([], deletions);
  await b.engine.queueHealth([{entityType: "healthObservations", entityId: h.id, payload: {...h, value: 80}}]); await b.engine.sync(true);
  await a.engine.sync(true);
  assert.equal(a.state().conflicts.at(-1)?.resolution, "pending");
  await a.engine.queueHealth([], deletions);
  assert.equal(a.state().outbox.length, 0);
  assert.equal(s.rows.get("u" + entityKey("healthObservations", h.id))?.payload?.value, 80);
  await a.engine.resolve(a.state().conflicts.at(-1)!.id, "remote");
  assert.deepEqual(await a.engine.queueHealth([], deletions), deletions);
  assert.equal(a.state().outbox.length, 0, "an explicit remote conflict choice does not auto-delete again");
});
test("10k Health observations: one sample edit writes one bounded partition, no AppData", async () => {
  const values = new Map<string, string>();
  const writes: { key: string; bytes: number }[] = [];
  const storage = {
    getItem: async (k: string) => values.get(k) ?? null,
    setItem: async (k: string, v: string) => {
      values.set(k, v);
      writes.push({ key: k, bytes: Buffer.byteLength(v) });
    },
  };
  const collection = new HealthCollection(storage);
  const rows = Array.from({ length: 10000 }, (_, i) =>
    observation("sample-" + i),
  );
  let start = performance.now();
  await collection.write([], rows);
  const initialMs = performance.now() - start;
  writes.length = 0;
  const next = rows.slice();
  next[50] = { ...next[50], value: 71 };
  start = performance.now();
  await collection.write(rows, next);
  const updateMs = performance.now() - start;
  assert.equal(writes.length, 1);
  assert.ok(writes.every((w) => w.key.startsWith("questlife.health.")));
  assert.equal((await collection.read()).length, 10000);
  console.log(
    JSON.stringify({
      health: 10000,
      initialMs,
      updateMs,
      changedBytes: writes[0].bytes,
      wholeBlobBytes: Buffer.byteLength(JSON.stringify(rows)),
      storage: "isolated memory KV, not device disk",
    }),
  );
});
test("provider Calendar identity dedupes only real provider IDs; title coincidence does not merge", () => {
  const base: ExternalCommitment = {
    id: "a",
    externalEventId: "ios-local",
    calendarId: "local-calendar",
    source: "system_calendar",
    title: "same",
    startAt: "2026-09-18T10:00:00Z",
    endAt: "2026-09-18T11:00:00Z",
    allDay: false,
    ownership: "external",
    lastSyncedAt: "2026-09-18T00:00:00Z",
    provider: "icloud",
    providerCalendarId: "global-cal",
    providerEventId: "global-event",
  };
  assert.equal(
    uniqueCommitments([
      base,
      {
        ...base,
        id: "b",
        externalEventId: "other-local",
        calendarId: "other-calendar",
      },
    ]).length,
    1,
  );
  assert.notEqual(
    externalCommitmentIdentity({ ...base, providerEventId: undefined }),
    externalCommitmentIdentity({
      ...base,
      providerEventId: undefined,
      externalEventId: "another",
    }),
  );
});
test("remote ScheduleBlock reschedules device effects and tombstone cancels", async () => {
  const values = new Map<string, string>();
  const repo = new DeviceRepository({
    getItem: async (k) => values.get(k) ?? null,
    setItem: async (k, v) => {
      values.set(k, v);
    },
  });
  await repo.update((d) => ({
    ...d,
    notificationsEnabled: true,
    reminderKinds: { accepted_block: true },
  }));
  const effects = new Map<string, string>();
  const cancelled: string[] = [];
  const service = {
    cancel: async (id: string) => {
      cancelled.push(id);
      effects.delete(id);
    },
    reschedule: async (r: { id: string; at: string }) => {
      effects.delete(r.id);
      effects.set(r.id, r.at);
      return r.id;
    },
  } as unknown as NotificationService;
  const payload = {
    id: "block",
    title: "item",
    date: "2026-09-20",
    startTime: "10:00",
    endTime: "11:00",
    plannedMinutes: 60,
    status: "planned",
    taskType: "admin",
    flexibility: "fixed",
    rigidity: "high",
    createdAt: 1,
  };
  let app = projectAppData(DEFAULT_DATA, [
    { entityType: "scheduleBlocks", entityId: "block", payload },
  ]);
  const now = new Date("2026-09-18T00:00:00Z");
  await syncNotificationPlan(
    repo,
    service,
    planLocalNotifications(app, await repo.read(), now, "en"),
    () => true,
    () => now.getTime(),
  );
  assert.equal(effects.size, 1);
  app = projectAppData(app, [
    {
      entityType: "scheduleBlocks",
      entityId: "block",
      payload: { ...payload, startTime: "12:00" },
    },
  ]);
  await syncNotificationPlan(
    repo,
    service,
    planLocalNotifications(app, await repo.read(), now, "en"),
    () => true,
    () => now.getTime(),
  );
  assert.equal(new Date([...effects.values()][0]).getHours(), 12);
  assert.equal(effects.size, 1);
  app = projectAppData(app, [
    { entityType: "scheduleBlocks", entityId: "block", payload: null },
  ]);
  await syncNotificationPlan(
    repo,
    service,
    planLocalNotifications(app, await repo.read(), now, "en"),
    () => true,
    () => now.getTime(),
  );
  assert.equal(effects.size, 0);
  assert.ok(cancelled.includes("questlife:block:block"));
});
test("scale 1000 / 10000 synthetic isolated clients, no owner storage", async () => {
  for (const count of [1000, 10000]) {
    const s = new Server(),
      a = client(s),
      b = client(s);
    await a.engine.attach("scale-local-only", []);
    await b.engine.attach("scale-local-only", []);
    const changes = Array.from({ length: count }, (_, i) => row(`scale-${i}`));
    const applyStart = performance.now();
    await a.engine.commit(changes);
    const localApply = performance.now() - applyStart;
    await a.engine.sync(true);
    const hydrateStart = performance.now();
    await b.engine.sync(true);
    const hydrate = performance.now() - hydrateStart;
    await a.engine.commit(
      changes
        .slice(0, 100)
        .map((c) => ({ ...c, payload: { ...c.payload!, name: "updated" } })),
    );
    const pushStart = performance.now();
    await a.engine.sync(true);
    const push100 = performance.now() - pushStart;
    const pullStart = performance.now();
    await b.engine.sync(true);
    const incremental = performance.now() - pullStart;
    assert.equal(b.visible.size, count);
    console.log(
      JSON.stringify({
        count,
        localApplyMs: localApply,
        hydrateMs: hydrate,
        push100Ms: push100,
        incrementalMs: incremental,
        transport: "in-memory deterministic",
        ownerWrites: 0,
      }),
    );
  }
});
