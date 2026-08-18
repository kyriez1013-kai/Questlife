export const SERVER_SYNC_COLLECTIONS = [
  'executionLogs',
  'contextLogs',
  'stateCheckIns',
  'decisionResults',
  'patternMemory',
] as const;

export type ServerSyncCollection = typeof SERVER_SYNC_COLLECTIONS[number];

export type ServerDeletionEntry = {
  collection: ServerSyncCollection;
  id: string;
  queuedAt: string;
};

export type ServerDeletionOutbox = {
  version: 1;
  entries: ServerDeletionEntry[];
};

export type ServerDeletionRequest = Partial<Record<ServerSyncCollection, string[]>>;

export type ServerDeletionResult = Partial<Record<ServerSyncCollection, {
  requested: number;
  deleted: number;
  alreadyAbsent: number;
  acknowledgedIds: string[];
}>>;

export type AsyncKeyValueStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

export const SERVER_DELETION_OUTBOX_KEY = 'questlife.serverDeletionOutbox.v1';
export const MAX_DELETIONS_PER_SYNC = 100;

const COLLECTION_SET = new Set<string>(SERVER_SYNC_COLLECTIONS);

export function emptyDeletionOutbox(): ServerDeletionOutbox {
  return { version: 1, entries: [] };
}

export function parseDeletionOutbox(raw: string | null): ServerDeletionOutbox {
  if (!raw) return emptyDeletionOutbox();
  try {
    const parsed = JSON.parse(raw) as Partial<ServerDeletionOutbox>;
    const entries = Array.isArray(parsed.entries)
      ? parsed.entries.filter((entry): entry is ServerDeletionEntry => (
        !!entry
        && COLLECTION_SET.has(String(entry.collection))
        && typeof entry.id === 'string'
        && entry.id.length > 0
        && entry.id.length <= 200
        && typeof entry.queuedAt === 'string'
      ))
      : [];
    return { version: 1, entries };
  } catch {
    return emptyDeletionOutbox();
  }
}

export function addDeletionEntries(
  outbox: ServerDeletionOutbox,
  entries: Array<Pick<ServerDeletionEntry, 'collection' | 'id'> & { queuedAt?: string }>,
  now = new Date().toISOString(),
): ServerDeletionOutbox {
  const next = outbox.entries.slice();
  const existing = new Set(next.map((entry) => `${entry.collection}\u0000${entry.id}`));
  entries.forEach((entry) => {
    const id = entry.id.trim();
    const key = `${entry.collection}\u0000${id}`;
    if (!id || id.length > 200 || existing.has(key)) return;
    next.push({ collection: entry.collection, id, queuedAt: entry.queuedAt ?? now });
    existing.add(key);
  });
  return { version: 1, entries: next };
}

export function buildDeletionRequest(
  outbox: ServerDeletionOutbox,
  limit = MAX_DELETIONS_PER_SYNC,
): ServerDeletionRequest {
  const request: ServerDeletionRequest = {};
  outbox.entries.slice(0, Math.max(0, limit)).forEach((entry) => {
    const ids = request[entry.collection] ?? [];
    ids.push(entry.id);
    request[entry.collection] = ids;
  });
  return request;
}

export function acknowledgedDeletionEntries(result: unknown): Array<Pick<ServerDeletionEntry, 'collection' | 'id'>> {
  if (!result || typeof result !== 'object') return [];
  const entries: Array<Pick<ServerDeletionEntry, 'collection' | 'id'>> = [];
  SERVER_SYNC_COLLECTIONS.forEach((collection) => {
    const value = (result as ServerDeletionResult)[collection];
    if (!value || !Array.isArray(value.acknowledgedIds)) return;
    value.acknowledgedIds.forEach((id) => {
      if (typeof id === 'string' && id.length > 0 && id.length <= 200) entries.push({ collection, id });
    });
  });
  return entries;
}

export function removeAcknowledgedDeletions(
  outbox: ServerDeletionOutbox,
  acknowledged: Array<Pick<ServerDeletionEntry, 'collection' | 'id'>>,
): ServerDeletionOutbox {
  const keys = new Set(acknowledged.map((entry) => `${entry.collection}\u0000${entry.id}`));
  if (keys.size === 0) return outbox;
  return {
    version: 1,
    entries: outbox.entries.filter((entry) => !keys.has(`${entry.collection}\u0000${entry.id}`)),
  };
}

export function countDeletionRequest(request: ServerDeletionRequest): number {
  return SERVER_SYNC_COLLECTIONS.reduce((count, collection) => count + (request[collection]?.length ?? 0), 0);
}

export function createDeletionOutboxStore(storage: AsyncKeyValueStorage) {
  let operationQueue: Promise<unknown> = Promise.resolve();

  function serialize<T>(operation: () => Promise<T>): Promise<T> {
    const next = operationQueue.then(operation, operation);
    operationQueue = next.then(() => undefined, () => undefined);
    return next;
  }

  async function loadUnqueued() {
    return parseDeletionOutbox(await storage.getItem(SERVER_DELETION_OUTBOX_KEY));
  }

  async function saveUnqueued(outbox: ServerDeletionOutbox) {
    await storage.setItem(SERVER_DELETION_OUTBOX_KEY, JSON.stringify(outbox));
    return outbox;
  }

  return {
    load: () => serialize(loadUnqueued),
    enqueue: (entries: Array<Pick<ServerDeletionEntry, 'collection' | 'id'>>) => serialize(async () => {
      const current = await loadUnqueued();
      return saveUnqueued(addDeletionEntries(current, entries));
    }),
    acknowledge: (entries: Array<Pick<ServerDeletionEntry, 'collection' | 'id'>>) => serialize(async () => {
      const current = await loadUnqueued();
      return saveUnqueued(removeAcknowledgedDeletions(current, entries));
    }),
  };
}
