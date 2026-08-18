/**
 * Server sync for locally persisted Decision AI evidence data.
 *
 * Trigger model (chosen for reliability with the smallest change surface):
 * every AppData change already flows through the persist() effect in
 * store.tsx, so scheduleServerSync() is called there and debounces a POST to
 * /api/sync. A pagehide/visibilitychange flush covers the "user closes the
 * tab before the debounce fires" case on web (the production platform).
 * Timers were rejected (fire when nothing changed / miss tab close) and a
 * background-only trigger was rejected (RN Web AppState does not reliably
 * fire on tab close).
 *
 * Upserts are idempotent server-side, so re-sending recent records is safe;
 * no watermark bookkeeping that could silently skip records.
 */
import type { AppData } from '../types';
import { getAnonymousUserId } from '../utils/analytics';
import {
  acknowledgeServerDeletions,
  loadServerDeletionOutbox,
} from './syncDeletionOutbox';
import {
  acknowledgedDeletionEntries,
  buildDeletionRequest,
  countDeletionRequest,
} from './syncDeletionOutboxCore';
import type { ServerDeletionResult } from './syncDeletionOutboxCore';

declare const __DEV__: boolean;

const SYNC_DISABLED_KEY = 'questlife_sync_disabled';
const DEBOUNCE_MS = 10_000;
const RETRY_MS = 30_000;
const MAX_RECORDS = 400;

let pendingData: AppData | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let lastSyncedFingerprint = '';
let listenersInstalled = false;
let syncInFlight = false;

export type SyncStatus = {
  lastAttemptAt?: string;
  lastSuccessAt?: string;
  lastError?: string;
  lastUpserted?: Record<string, number>;
  lastDeletions?: ServerDeletionResult;
};

const status: SyncStatus = {};

export function getServerSyncStatus(): SyncStatus {
  return { ...status };
}

function isSyncDisabled() {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage?.getItem(SYNC_DISABLED_KEY) === 'true';
  } catch {
    return false;
  }
}

function recentByCreatedAt<T extends { createdAt?: string }>(records: T[] = [], limit = MAX_RECORDS): T[] {
  return records
    .slice()
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .slice(0, limit);
}

function buildCollections(data: AppData) {
  return {
    executionLogs: recentByCreatedAt(data.executionLogs || []),
    contextLogs: recentByCreatedAt(data.contextLogs || []),
    stateCheckIns: recentByCreatedAt(data.stateCheckIns || []),
    decisionResults: recentByCreatedAt(data.decisionResults || []),
    patternMemory: (data.patternMemory || []).slice(0, MAX_RECORDS),
  };
}

function fingerprint(payload: unknown) {
  try {
    return JSON.stringify(payload);
  } catch {
    return `unserializable-${Date.now()}`;
  }
}

function scheduleRetry() {
  if (retryTimer || !pendingData) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    if (pendingData) void runSync(pendingData);
  }, RETRY_MS);
}

async function runSync(data: AppData, opts: { keepalive?: boolean } = {}) {
  if (isSyncDisabled() || syncInFlight) return;
  syncInFlight = true;
  status.lastAttemptAt = new Date().toISOString();
  try {
    const collections = buildCollections(data);
    const totalRecords = Object.values(collections).reduce((sum, list) => sum + list.length, 0);
    const deletionOutbox = await loadServerDeletionOutbox();
    const deletions = buildDeletionRequest(deletionOutbox);
    const totalDeletions = countDeletionRequest(deletions);
    if (totalRecords === 0 && totalDeletions === 0) return;
    const print = fingerprint({ collections, deletions });
    if (print === lastSyncedFingerprint) return;

    const anonymousUserId = await getAnonymousUserId();
    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anonymousUserId, collections, deletions }),
      keepalive: opts.keepalive,
    });
    const json = await response.json().catch(() => null);
    if (response.ok && json?.ok) {
      const acknowledged = acknowledgedDeletionEntries(json.deletions);
      const remainingOutbox = await acknowledgeServerDeletions(acknowledged);
      lastSyncedFingerprint = print;
      status.lastSuccessAt = new Date().toISOString();
      status.lastUpserted = json.upserted;
      status.lastDeletions = json.deletions;
      status.lastError = undefined;
      if (remainingOutbox.entries.length > 0) scheduleRetry();
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.log('[sync] ok', { upserted: json.upserted, deletions: json.deletions });
      }
    } else {
      status.lastError = String(json?.error || `sync_http_${response.status}`);
      scheduleRetry();
      if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('[sync] failed', status.lastError);
    }
  } catch (error: any) {
    status.lastError = String(error?.message || error);
    scheduleRetry();
    if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('[sync] unavailable', status.lastError);
  } finally {
    syncInFlight = false;
  }
}

function installFlushListeners() {
  if (listenersInstalled || typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
  listenersInstalled = true;
  const flush = () => {
    if (!pendingData) return;
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    // keepalive lets the request survive the page being torn down.
    void runSync(pendingData, { keepalive: true });
  };
  window.addEventListener('pagehide', flush);
  window.addEventListener('visibilitychange', () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') flush();
  });
}

/** Debounced entry point — call with the latest AppData after each persist. */
export function scheduleServerSync(data: AppData) {
  pendingData = data;
  installFlushListeners();
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    if (pendingData) void runSync(pendingData);
  }, DEBOUNCE_MS);
}
