import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_ID_KEY = 'questlife_anonymous_user_id';
const SESSION_ID_KEY = 'questlife_session_id';
const MAX_PROPERTIES_BYTES = 8_000;
const TEXT_FIELD_BLOCKLIST = new Set([
  'name',
  'title',
  'note',
  'notes',
  'description',
  'vision',
  'qualitativeText',
  'performanceNote',
]);

type EventProperties = Record<string, unknown>;

function randomId(prefix: string) {
  const cryptoObj = typeof globalThis !== 'undefined' ? (globalThis as any).crypto : undefined;
  const uuid = cryptoObj?.randomUUID?.();
  if (uuid) return `${prefix}_${uuid}`;
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

function getWebStorage(kind: 'local' | 'session'): Storage | null {
  try {
    if (typeof globalThis === 'undefined') return null;
    const storage = kind === 'local' ? (globalThis as any).localStorage : (globalThis as any).sessionStorage;
    return storage ?? null;
  } catch {
    return null;
  }
}

async function getStoredId(key: string, prefix: string, storageKind: 'local' | 'session') {
  const webStorage = getWebStorage(storageKind);
  const existing = webStorage?.getItem(key) ?? await AsyncStorage.getItem(key);
  if (existing) return existing;
  const id = randomId(prefix);
  webStorage?.setItem(key, id);
  await AsyncStorage.setItem(key, id);
  return id;
}

export async function getAnonymousUserId() {
  return getStoredId(USER_ID_KEY, 'anon', 'local');
}

export async function getSessionId() {
  return getStoredId(SESSION_ID_KEY, 'sess', 'session');
}

function cleanValue(value: unknown, depth = 0): unknown {
  if (value == null) return undefined;
  if (typeof value === 'function' || typeof value === 'symbol') return undefined;
  if (typeof value === 'string') return value.length > 200 ? `${value.slice(0, 200)}…` : value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'boolean') return value;
  if (depth > 3) return undefined;
  if (Array.isArray(value)) {
    return value.slice(0, 30).map((item) => cleanValue(item, depth + 1)).filter((item) => item !== undefined);
  }
  if (typeof value === 'object') {
    const out: EventProperties = {};
    Object.entries(value as EventProperties).forEach(([key, item]) => {
      if (TEXT_FIELD_BLOCKLIST.has(key)) return;
      const cleaned = cleanValue(item, depth + 1);
      if (cleaned !== undefined) out[key] = cleaned;
    });
    return out;
  }
  return undefined;
}

export function sanitizeAnalyticsProperties(properties: EventProperties = {}) {
  const cleaned = (cleanValue(properties) ?? {}) as EventProperties;
  const json = JSON.stringify(cleaned);
  if (json.length <= MAX_PROPERTIES_BYTES) return cleaned;
  return {
    truncated: true,
    originalBytes: json.length,
  };
}

export function trackEvent(
  _eventName: string,
  _properties: EventProperties = {},
  _options: { page?: string; appVersion?: string } = {}
) {
  // Retain caller compatibility, without sending anonymous service-role writes
  // or manufacturing tracking identifiers. Product records use Sync V2.
}
