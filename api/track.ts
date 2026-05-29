declare const process: any;

const MAX_BODY_BYTES = 16_000;
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

function send(res: any, status: number, body: Record<string, unknown>) {
  res.status(status).json(body);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function sanitizeProperties(value: unknown, depth = 0): Record<string, unknown> {
  if (!isObject(value) || depth > 3) return {};
  const out: Record<string, unknown> = {};
  Object.entries(value).forEach(([key, item]) => {
    if (TEXT_FIELD_BLOCKLIST.has(key)) return;
    if (item == null || typeof item === 'function' || typeof item === 'symbol') return;
    if (typeof item === 'string') {
      out[key] = item.length > 200 ? `${item.slice(0, 200)}…` : item;
      return;
    }
    if (typeof item === 'number') {
      if (Number.isFinite(item)) out[key] = item;
      return;
    }
    if (typeof item === 'boolean') {
      out[key] = item;
      return;
    }
    if (Array.isArray(item)) {
      out[key] = item
        .slice(0, 30)
        .map((entry) => (isObject(entry) ? sanitizeProperties(entry, depth + 1) : entry))
        .filter((entry) => entry != null && typeof entry !== 'function' && typeof entry !== 'symbol');
      return;
    }
    if (isObject(item)) out[key] = sanitizeProperties(item, depth + 1);
  });
  return out;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { ok: false, error: 'method_not_allowed' });
  }

  try {
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
    if (raw.length > MAX_BODY_BYTES) return send(res, 413, { ok: false, error: 'payload_too_large' });
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!isObject(body)) return send(res, 400, { ok: false, error: 'invalid_body' });

    const anonymousUserId = typeof body.anonymousUserId === 'string' ? body.anonymousUserId.trim() : '';
    const eventName = typeof body.eventName === 'string' ? body.eventName.trim() : '';
    if (!anonymousUserId) return send(res, 400, { ok: false, error: 'missing_anonymous_user_id' });
    if (!eventName || eventName.length > 100) return send(res, 400, { ok: false, error: 'invalid_event_name' });
    if (body.properties != null && !isObject(body.properties)) {
      return send(res, 400, { ok: false, error: 'invalid_properties' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      console.warn('[analytics] Supabase env missing');
      return send(res, 503, { ok: false, error: 'analytics_not_configured' });
    }

    const properties = sanitizeProperties(body.properties ?? {});
    const insertPayload = {
      anonymous_user_id: anonymousUserId,
      event_name: eventName,
      event_time: typeof body.eventTime === 'string' ? body.eventTime : new Date().toISOString(),
      app_version: typeof body.appVersion === 'string' ? body.appVersion.slice(0, 50) : undefined,
      session_id: typeof body.sessionId === 'string' ? body.sessionId.slice(0, 120) : undefined,
      page: typeof body.page === 'string' ? body.page.slice(0, 120) : undefined,
      properties,
    };

    const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/analytics_events`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(insertPayload),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[analytics] Supabase insert failed', response.status, text);
      return send(res, 500, { ok: false, error: 'insert_failed' });
    }

    return send(res, 200, { ok: true });
  } catch (error) {
    console.error('[analytics] track route failed', error);
    return send(res, 500, { ok: false, error: 'server_error' });
  }
}
