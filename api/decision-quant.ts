/** Same-origin privacy boundary for the isolated QuestLife Quant runtime. */

import { z } from 'zod';

declare const process: any;

const MAX_BODY_BYTES = 1_900_000;
const UPSTREAM_TIMEOUT_MS = 15_000;
const LooseRecord = z.record(z.string(), z.unknown());
const RequestSchema = z.object({
  runtimeVersion: z.literal('questlife.owner-quant-runtime-client.v1'),
  subjectId: z.string().min(1).max(200),
  configuredTimezone: z.string().min(1).max(100),
  asOf: z.string().datetime({ offset: true }),
  appData: LooseRecord,
}).strict();

function send(res: any, status: number, body: Record<string, unknown>) {
  res.status(status).json(body);
}

function runtimeUrl(): string | null {
  const raw = String(process.env.QUESTLIFE_QUANT_RUNTIME_URL ?? '').trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { ok: false, error: 'method_not_allowed' });
  }
  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
  if (rawBody.length > MAX_BODY_BYTES) return send(res, 413, { ok: false, error: 'payload_too_large' });
  let input: unknown;
  try {
    input = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return send(res, 400, { ok: false, error: 'invalid_json' });
  }
  const parsed = RequestSchema.safeParse(input);
  if (!parsed.success) {
    return send(res, 400, {
      ok: false,
      error: 'invalid_request',
      issues: parsed.error.issues.slice(0, 6).map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }
  const url = runtimeUrl();
  if (!url) return send(res, 503, { ok: false, error: 'quant_runtime_not_configured' });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const token = String(process.env.QUESTLIFE_QUANT_RUNTIME_TOKEN ?? '').trim();
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        mode: 'owner',
        subject_id: parsed.data.subjectId,
        configured_timezone: parsed.data.configuredTimezone,
        as_of: parsed.data.asOf,
        app_data: parsed.data.appData,
      }),
    });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : { ok: false, error: 'empty_runtime_response' };
    if (!response.ok) {
      return send(res, response.status >= 500 ? 502 : response.status, {
        ok: false,
        error: 'quant_runtime_rejected_request',
        runtimeStatus: response.status,
        runtimeError: typeof payload?.error === 'string' ? payload.error : undefined,
      });
    }
    return send(res, 200, payload);
  } catch (error) {
    return send(res, 502, {
      ok: false,
      error: error instanceof DOMException && error.name === 'AbortError'
        ? 'quant_runtime_timeout'
        : 'quant_runtime_unavailable',
    });
  } finally {
    clearTimeout(timeout);
  }
}
