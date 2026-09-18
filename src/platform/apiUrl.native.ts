import { resolveBackendUrl } from './QuestLifeBackendConfig';
const origin = process.env.EXPO_PUBLIC_API_ORIGIN;
export function apiUrl(path: string): string {
  return resolveBackendUrl(path, 'native', origin);
}
export function nativeSyncConfigured(): boolean { return !!origin && /^https:\/\/[^/]+\/?$/.test(origin); }
