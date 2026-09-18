export function resolveBackendUrl(path: string, platform: 'web' | 'native', origin?: string): string {
  if (!/^\/api\/[a-z0-9/_-]+$/i.test(path)) throw new Error('invalid_api_path');
  if (platform === 'web' && !origin) return path;
  if (!origin || !/^https:\/\/[^/?#]+\/?$/.test(origin)) throw new Error('native_api_origin_not_configured');
  return origin.replace(/\/$/, '') + path;
}
