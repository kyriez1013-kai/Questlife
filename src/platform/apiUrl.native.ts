const origin = process.env.EXPO_PUBLIC_API_ORIGIN;
export function apiUrl(path: string): string {
  if (!origin || !/^https:\/\/[^/]+\/?$/.test(origin)) throw new Error('native_api_origin_not_configured');
  if (!path.startsWith('/api/')) throw new Error('invalid_api_path');
  return origin.replace(/\/$/, '') + path;
}
export function nativeSyncConfigured(): boolean { return !!origin && /^https:\/\/[^/]+\/?$/.test(origin); }
