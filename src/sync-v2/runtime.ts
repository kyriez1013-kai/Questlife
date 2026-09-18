import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";
import { AppState, Platform } from "react-native";
import type { AppData } from "../types";
import { SyncEngineV2 } from "./engine";
import {
  APP_ENTITY_TYPES,
  emptySyncState,
  type Projection,
  type SyncState,
} from "./contracts";
import { authConfigured, authService, supabaseClient } from "./supabase";
import { getSyncDevice } from "./device";
import { appEntities } from "./registry";
import { localChanges } from "./projection";
import { supabaseTransport } from "./transport";
import { deviceRepository } from "../platform/services";
import type { HealthObservationV1 } from "../platform/contracts";
import type { Payload } from "./contracts";

export const SYNC_JOURNAL_KEY = "questlife.sync.v2.journal";
let enginePromise: Promise<SyncEngineV2> | undefined;
let project: ((changes: Projection[]) => Promise<void>) | undefined;
let getLocalData: (() => AppData) | undefined;
let debounce: ReturnType<typeof setTimeout> | undefined;
export async function readSyncState(): Promise<SyncState> {
  const raw = await AsyncStorage.getItem(SYNC_JOURNAL_KEY);
  if (!raw) return emptySyncState();
  const state = JSON.parse(raw);
  if (
    state.version !== 2 ||
    !Array.isArray(state.outbox) ||
    !Array.isArray(state.pendingApply)
  )
    throw new Error("sync_journal_invalid");
  return state;
}
export function getSyncEngine() {
  if (!enginePromise)
    enginePromise = getSyncDevice().then(
      (device) =>
        new SyncEngineV2(
          {
            exclusive: async (job) => {
              if (
                Platform.OS === "web" &&
                typeof navigator !== "undefined" &&
                navigator.locks
              )
                return navigator.locks.request(SYNC_JOURNAL_KEY, job);
              return job();
            },
            read: readSyncState,
            write: (state) =>
              AsyncStorage.setItem(SYNC_JOURNAL_KEY, JSON.stringify(state)),
            apply: (changes) => {
              if (!project) throw new Error("sync_projection_not_ready");
              return (async () => {
                const health = changes.filter(
                  (c) => c.entityType === "healthObservations",
                );
                if (health.length)
                  await deviceRepository.update((data) => {
                    const rows = new Map(
                      data.observations.map((row) => [row.id, row]),
                    );
                    health.forEach((change) => {
                      if (change.payload)
                        rows.set(
                          change.entityId,
                          change.payload as unknown as HealthObservationV1,
                        );
                      else rows.delete(change.entityId);
                    });
                    return { ...data, observations: [...rows.values()] };
                  }, "remote_sync");
                await project!(changes);
              })();
            },
          },
          supabaseTransport,
          device.id,
          randomUUID,
        ),
    );
  return enginePromise;
}
export function requestSync(force = false) {
  if (debounce) clearTimeout(debounce);
  debounce = setTimeout(
    () => {
      void getSyncEngine()
        .then(async (engine) => {
          const state = await readSyncState();
          if (
            state.healthConsent &&
            (await authService.getUserId()) === state.ownerId
          ) {
            const device = await deviceRepository.read();
            await engine.queueHealth(
              device.observations.map((payload) => ({
                entityType: "healthObservations",
                entityId: payload.id,
                payload: payload as unknown as Payload,
              })),
            );
          }
          await engine.sync(force);
        })
        .catch(() => undefined);
    },
    force ? 0 : 750,
  );
}
export async function persistWithSync(
  base: AppData,
  next: AppData,
  source: string,
  save: () => Promise<AppData>,
): Promise<AppData> {
  const engine = await getSyncEngine();
  let committed = next;
  await engine.commit(
    localChanges(base, next, source === "store.explicit_delete"),
    async () => {
      committed = await save();
    },
  );
  requestSync();
  return committed;
}
export async function clearLocalReplica(confirmed: boolean) {
  if (!confirmed || !getLocalData || (await authService.getUserId()))
    throw new Error("signout_required");
  const data = getLocalData();
  const device = await deviceRepository.read();
  const changes: Projection[] = APP_ENTITY_TYPES.flatMap((entityType) =>
    (data[entityType] ?? []).map((row) => ({
      entityType,
      entityId: row.id,
      payload: null,
    })),
  );
  changes.push(
    ...device.observations.map((row) => ({
      entityType: "healthObservations" as const,
      entityId: row.id,
      payload: null,
    })),
  );
  await (await getSyncEngine()).clearLocalReplica(changes, true);
  // Stop the OS reader so clearing a local Health copy does not immediately
  // re-import it. System permissions and source records remain untouched.
  await deviceRepository.update((current) => ({
    ...current,
    observations: [],
    health: {
      ...current.health,
      connected: false,
      connectionRevision: (current.health.connectionRevision ?? 0) + 1,
      imported: 0,
    },
  }));
}
/** Called once by Store after hydration. No screen owns cloud lifecycle. */
export async function startSyncRuntime(
  getData: () => AppData,
  apply: (changes: Projection[]) => Promise<void>,
) {
  project = apply;
  getLocalData = getData;
  const engine = await getSyncEngine();
  await engine.recover();
  let disposed = false;
  let channel:
    ReturnType<ReturnType<typeof supabaseClient>["channel"]> | undefined;
  let authGeneration = 0;
  const connect = async () => {
    const generation = ++authGeneration;
    engine.detach();
    if (channel) {
      await supabaseClient().removeChannel(channel);
      channel = undefined;
    }
    const session = await authService.getSession();
    if (disposed || generation !== authGeneration || !session) return;
    try {
      await engine.attach(session.userId, appEntities(getData()));
      if (disposed || generation !== authGeneration) {
        engine.detach();
        return;
      }
      const device = await getSyncDevice();
      const { error } = await supabaseClient()
        .from("questlife_sync_devices")
        .upsert({
          user_id: session.userId,
          device_id: device.id,
          platform: device.platform,
          app_version: device.appVersion,
          last_seen_at: new Date().toISOString(),
        });
      if (error) engine.lastError = "device_registration_failed";
      channel = supabaseClient()
        .channel(`questlife-sync-${device.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "questlife_sync_entities",
            filter: `user_id=eq.${session.userId}`,
          },
          () => requestSync(),
        )
        .subscribe();
      requestSync(true);
    } catch {
      engine.detach();
      engine.status = "error";
      engine.lastError = "account_or_schema_unavailable";
    }
  };
  const unsubscribe = authService.subscribe(() => {
    setTimeout(() => {
      void connect().catch(() => undefined);
    }, 0);
  });
  const foreground = () => {
    if (authConfigured()) supabaseClient().auth.startAutoRefresh();
    requestSync(true);
  };
  const sub = AppState.addEventListener("change", (state) => {
    if (state === "active") foreground();
    else if (authConfigured()) supabaseClient().auth.stopAutoRefresh();
  });
  const retry = setInterval(() => requestSync(), 15000);
  const stopHealth = deviceRepository.subscribe((origin) => {
    if (origin !== "remote_sync") requestSync();
  });
  if (Platform.OS === "web" && typeof window !== "undefined")
    window.addEventListener("online", foreground);
  await connect();
  return () => {
    disposed = true;
    authGeneration++;
    engine.detach();
    unsubscribe();
    sub.remove();
    stopHealth();
    clearInterval(retry);
    if (channel) void supabaseClient().removeChannel(channel);
    if (Platform.OS === "web" && typeof window !== "undefined")
      window.removeEventListener("online", foreground);
  };
}
