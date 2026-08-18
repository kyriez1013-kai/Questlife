import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createDeletionOutboxStore,
  parseDeletionOutbox,
  addDeletionEntries,
  removeAcknowledgedDeletions,
  SERVER_DELETION_OUTBOX_KEY,
} from './syncDeletionOutboxCore';
import type { AsyncKeyValueStorage, ServerDeletionEntry } from './syncDeletionOutboxCore';

function getWebStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

const nativeStorage: AsyncKeyValueStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
};

const nativeOutbox = createDeletionOutboxStore(nativeStorage);

export async function loadServerDeletionOutbox() {
  const webStorage = getWebStorage();
  if (webStorage) return parseDeletionOutbox(webStorage.getItem(SERVER_DELETION_OUTBOX_KEY));
  return nativeOutbox.load();
}

export async function enqueueServerDeletions(entries: Array<Pick<ServerDeletionEntry, 'collection' | 'id'>>) {
  if (entries.length === 0) return loadServerDeletionOutbox();
  const webStorage = getWebStorage();
  if (webStorage) {
    const next = addDeletionEntries(
      parseDeletionOutbox(webStorage.getItem(SERVER_DELETION_OUTBOX_KEY)),
      entries,
    );
    webStorage.setItem(SERVER_DELETION_OUTBOX_KEY, JSON.stringify(next));
    return next;
  }
  return nativeOutbox.enqueue(entries);
}

export async function acknowledgeServerDeletions(entries: Array<Pick<ServerDeletionEntry, 'collection' | 'id'>>) {
  if (entries.length === 0) return loadServerDeletionOutbox();
  const webStorage = getWebStorage();
  if (webStorage) {
    const next = removeAcknowledgedDeletions(
      parseDeletionOutbox(webStorage.getItem(SERVER_DELETION_OUTBOX_KEY)),
      entries,
    );
    webStorage.setItem(SERVER_DELETION_OUTBOX_KEY, JSON.stringify(next));
    return next;
  }
  return nativeOutbox.acknowledge(entries);
}
