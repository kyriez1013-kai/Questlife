import { resolveBackendUrl } from './QuestLifeBackendConfig';
export function apiUrl(path: string): string { return resolveBackendUrl(path, 'web', process.env.EXPO_PUBLIC_API_ORIGIN); }
export function nativeSyncConfigured(): boolean { return false; }
