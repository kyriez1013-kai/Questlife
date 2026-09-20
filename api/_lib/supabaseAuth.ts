import { isPublicSupabaseKey } from '../../src/sync-v2/publicConfig';

type AuthResult =
  | { ok: true; userId: string; accessToken: string }
  | { ok: false; status: 401 | 503; error: string };

export function serverUrl(raw: string | undefined): URL | null {
  try {
    const url = new URL(raw ?? '');
    const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    if (url.username || url.password || url.hash) return null;
    if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) return null;
    return url;
  } catch {
    return null;
  }
}

/** The bearer is verified remotely, never decoded locally as proof of identity. */
export async function verifySupabaseBearer(req: any): Promise<AuthResult> {
  const headers = req.headers ?? {};
  const values = Object.entries(headers).filter(([key]) => key.toLowerCase() === 'authorization');
  const authorization = values.length === 1 ? values[0][1] : undefined;
  const match = typeof authorization === 'string'
    ? /^Bearer ([A-Za-z0-9._~+\/-]+=*)$/i.exec(authorization)
    : null;
  if (!match || match[1].length > 8192) {
    return { ok: false, status: 401, error: 'authentication_required' };
  }
  const url = serverUrl(process.env.SUPABASE_URL);
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || url.pathname !== '/' || url.search || !isPublicSupabaseKey(key)) {
    return { ok: false, status: 503, error: 'authentication_not_configured' };
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(new URL('/auth/v1/user', url), {
      headers: { apikey: key!, Authorization: `Bearer ${match[1]}` },
      signal: controller.signal,
      redirect: 'error',
      cache: 'no-store',
    });
    if (!response.ok) {
      return response.status === 401 || response.status === 403
        ? { ok: false, status: 401, error: 'invalid_access_token' }
        : { ok: false, status: 503, error: 'authentication_unavailable' };
    }
    const user: unknown = await response.json();
    const id = user && typeof user === 'object' && 'id' in user ? user.id : undefined;
    if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return { ok: false, status: 503, error: 'authentication_unavailable' };
    }
    return { ok: true, userId: id, accessToken: match[1] };
  } catch {
    return { ok: false, status: 503, error: 'authentication_unavailable' };
  } finally {
    clearTimeout(timeout);
  }
}
