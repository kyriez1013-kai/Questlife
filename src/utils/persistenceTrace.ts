import type { AppData } from '../types';

const TRACE_SESSION_KEY = 'questlife.persistence.trace.v1';
const MAX_TRACE_EVENTS = 240;

const COLLECTION_KEYS = [
  'goals',
  'categories',
  'modules',
  'moduleSkillLinks',
  'skills',
  'actions',
  'executionLogs',
  'effortUnits',
  'contributionLinks',
  'rescueLogs',
  'stateCheckIns',
  'contextLogs',
  'decisionResults',
  'patternMemory',
  'scheduleBlocks',
  'rawCaptures',
] as const;

type CollectionKey = typeof COLLECTION_KEYS[number];

export type PersistenceCounts = Record<CollectionKey, number>;

export type PersistenceCollectionDelta = {
  added: string[];
  removed: string[];
  changed: string[];
};

export type PersistenceTraceEvent = {
  timestamp: string;
  route: string;
  featureFlag?: string;
  storageKey: string;
  operation: string;
  source: string;
  caller?: string;
  hydrationStatus: 'loading' | 'hydrated' | 'unknown';
  previousPersistedHash?: string;
  baseHash?: string;
  nextHash: string;
  staleSnapshot: boolean;
  previousCounts?: PersistenceCounts;
  nextCounts: PersistenceCounts;
  delta: Partial<Record<CollectionKey, PersistenceCollectionDelta>>;
};

type Identified = { id?: unknown };

function collection(data: AppData | undefined, key: CollectionKey): Identified[] {
  const value = data?.[key];
  return Array.isArray(value) ? value as Identified[] : [];
}

function itemId(value: Identified, index: number) {
  return typeof value?.id === 'string' ? value.id : `index:${index}`;
}

function itemMap(items: Identified[]) {
  return new Map(items.map((item, index) => [itemId(item, index), item]));
}

function sameValue(a: unknown, b: unknown) {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return a === b;
  }
}

export function summarizePersistenceData(data?: AppData): PersistenceCounts {
  return COLLECTION_KEYS.reduce((summary, key) => {
    summary[key] = collection(data, key).length;
    return summary;
  }, {} as PersistenceCounts);
}

export function hashPersistenceData(data?: AppData) {
  let input = '';
  try {
    input = JSON.stringify(data ?? null);
  } catch {
    input = String(data ?? 'null');
  }
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function diffPersistenceCollections(previous?: AppData, next?: AppData) {
  const delta: Partial<Record<CollectionKey, PersistenceCollectionDelta>> = {};
  COLLECTION_KEYS.forEach((key) => {
    const before = itemMap(collection(previous, key));
    const after = itemMap(collection(next, key));
    const added = Array.from(after.keys()).filter((id) => !before.has(id));
    const removed = Array.from(before.keys()).filter((id) => !after.has(id));
    const changed = Array.from(after.keys()).filter((id) => before.has(id) && !sameValue(before.get(id), after.get(id)));
    if (added.length || removed.length || changed.length) {
      delta[key] = { added, removed, changed };
    }
  });
  return delta;
}

export function isPersistenceDebugEnabled() {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('debugPersistence') === '1'
      || window.localStorage?.getItem('questlife_debug_persistence') === 'true';
  } catch {
    return false;
  }
}

function routeContext() {
  if (typeof window === 'undefined') return { route: 'native' };
  try {
    const query = new URLSearchParams(window.location.search);
    return {
      route: `${window.location.pathname}${window.location.search}`,
      featureFlag: query.get('questlife_v11_ui') || 'legacy',
    };
  } catch {
    return { route: 'web' };
  }
}

function readTrace(): PersistenceTraceEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage?.getItem(TRACE_SESSION_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTrace(events: PersistenceTraceEvent[]) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage?.setItem(TRACE_SESSION_KEY, JSON.stringify(events.slice(-MAX_TRACE_EVENTS)));
  } catch {}
}

export function clearPersistenceTrace() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage?.removeItem(TRACE_SESSION_KEY);
  } catch {}
}

export function recordPersistenceTrace(input: {
  storageKey: string;
  operation: string;
  source?: string;
  caller?: string;
  hydrationStatus?: PersistenceTraceEvent['hydrationStatus'];
  previousPersisted?: AppData;
  base?: AppData;
  next: AppData;
}) {
  if (!isPersistenceDebugEnabled()) return;
  const route = routeContext();
  const previousPersistedHash = input.previousPersisted ? hashPersistenceData(input.previousPersisted) : undefined;
  const baseHash = input.base ? hashPersistenceData(input.base) : undefined;
  const event: PersistenceTraceEvent = {
    timestamp: new Date().toISOString(),
    ...route,
    storageKey: input.storageKey,
    operation: input.operation,
    source: input.source || 'unknown',
    caller: input.caller,
    hydrationStatus: input.hydrationStatus || 'unknown',
    previousPersistedHash,
    baseHash,
    nextHash: hashPersistenceData(input.next),
    staleSnapshot: !!previousPersistedHash && !!baseHash && previousPersistedHash !== baseHash,
    previousCounts: input.previousPersisted ? summarizePersistenceData(input.previousPersisted) : undefined,
    nextCounts: summarizePersistenceData(input.next),
    delta: diffPersistenceCollections(input.previousPersisted, input.next),
  };
  const events = [...readTrace(), event].slice(-MAX_TRACE_EVENTS);
  saveTrace(events);
  console.log('[persistence trace]', JSON.stringify(event, null, 2));
}

function downloadJson(filename: string, value: unknown) {
  if (typeof document === 'undefined') return false;
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  return true;
}

export function installPersistenceDebugBridge(input: {
  getStoreData: () => AppData;
  readPersistedData: () => Promise<AppData | undefined>;
}) {
  if (!isPersistenceDebugEnabled() || typeof window === 'undefined') return () => {};
  const target = window as typeof window & {
    __QUESTLIFE_PERSISTENCE_DEBUG__?: {
      clearTrace: () => void;
      getTrace: () => PersistenceTraceEvent[];
      getStoreSummary: () => { hash: string; counts: PersistenceCounts };
      getPersistedSummary: () => Promise<{ hash?: string; counts?: PersistenceCounts }>;
      downloadSnapshot: (label?: string) => Promise<boolean>;
    };
  };
  target.__QUESTLIFE_PERSISTENCE_DEBUG__ = {
    clearTrace: clearPersistenceTrace,
    getTrace: readTrace,
    getStoreSummary: () => {
      const data = input.getStoreData();
      return { hash: hashPersistenceData(data), counts: summarizePersistenceData(data) };
    },
    getPersistedSummary: async () => {
      const data = await input.readPersistedData();
      return data ? { hash: hashPersistenceData(data), counts: summarizePersistenceData(data) } : {};
    },
    downloadSnapshot: async (label = 'before-test') => {
      const persisted = await input.readPersistedData();
      if (!persisted) return false;
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      return downloadJson(`questlife-${label}-${stamp}.json`, persisted);
    },
  };
  console.log('[persistence trace] debug bridge ready');
  return () => {
    delete target.__QUESTLIFE_PERSISTENCE_DEBUG__;
  };
}
