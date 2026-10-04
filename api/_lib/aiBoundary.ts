import { serverUrl, verifySupabaseBearer } from './supabaseAuth';

export function readAiBody(req: any, res: any, maxBytes: number): Record<string, any> | null {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const serialized = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
    if (Buffer.byteLength(serialized, 'utf8') > maxBytes) {
      res.status(413).json({ ok: false, error: 'request_too_large' });
      return null;
    }
    const body = JSON.parse(serialized);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    return body;
  } catch {
    res.status(400).json({ ok: false, error: 'invalid_input' });
    return null;
  }
}

export async function authorizeAi(req: any, res: any, endpoint: 'parse' | 'brief') {
  const auth = await verifySupabaseBearer(req);
  if (!auth.ok) {
    res.status(auth.status).json({ ok: false, error: auth.error });
    return null;
  }
  const url = serverUrl(process.env.SUPABASE_URL);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    res.status(503).json({ ok: false, error: 'ai_budget_unavailable' });
    return null;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(new URL('/rest/v1/rpc/questlife_ai_claim', url), {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_user_id: auth.userId, p_endpoint: endpoint }),
      signal: controller.signal, redirect: 'error', cache: 'no-store',
    });
    if (!response.ok) throw new Error();
    const result = await response.json();
    if (result?.status === 'rate_limited') {
      const retry = typeof result.retry_after === 'number' && Number.isFinite(result.retry_after)
        ? Math.min(86400, Math.max(1, Math.ceil(result.retry_after))) : 60;
      res.setHeader('Retry-After', String(retry));
      res.status(429).json({ ok: false, error: 'ai_rate_limited', retry_after: retry });
      return null;
    }
    if (result?.status !== 'claimed') throw new Error();
    return auth;
  } catch {
    res.status(503).json({ ok: false, error: 'ai_budget_unavailable' });
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
