import { resolveBackendUrl } from './QuestLifeBackendConfig';
// Preview and release Web calls stay on their authenticated current origin.
// The explicit backend origin belongs to the native entry only.
export function apiUrl(path: string): string { return resolveBackendUrl(path, 'web'); }
export function nativeSyncConfigured(): boolean { return false; }
