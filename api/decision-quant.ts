/** Same-origin privacy boundary for the isolated QuestLife Quant runtime. */

import { z } from 'zod';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { serverUrl, verifySupabaseBearer } from './_lib/supabaseAuth';

const MAX_BODY_BYTES = 1_900_000;
const UPSTREAM_TIMEOUT_MS = 15_000;
const LooseRecord = z.record(z.string(), z.unknown());
const RequestSchema = z.object({
  runtimeVersion: z.literal('questlife.owner-quant-runtime-client.v1'),
  subjectId: z.string().min(1).max(200).optional(),
  configuredTimezone: z.string().min(1).max(100),
  asOf: z.string().datetime({ offset: true }),
  appData: LooseRecord,
}).strict();

function send(res: any, status: number, body: Record<string, unknown>) {
  res.status(status).json(body);
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Vary', 'Authorization');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { ok: false, error: 'method_not_allowed' });
  }
  let input: unknown;
  try {
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
    if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
      return send(res, 413, { ok: false, error: 'payload_too_large' });
    }
    input = JSON.parse(rawBody);
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
  const auth = await verifySupabaseBearer(req);
  if (auth.ok === false) return send(res, auth.status, { ok: false, error: auth.error });
  if (parsed.data.subjectId !== undefined && parsed.data.subjectId !== auth.userId) {
    return send(res, 403, { ok: false, error: 'subject_mismatch' });
  }
  const url = serverUrl(process.env.QUESTLIFE_QUANT_RUNTIME_URL);
  const token = String(process.env.QUESTLIFE_QUANT_RUNTIME_TOKEN ?? '').trim();
  if (!url || !token) return send(res, 503, { ok: false, error: 'quant_runtime_not_configured' });
  const runtimeBody = JSON.stringify({
    mode: 'owner',
    subject_id: auth.userId,
    configured_timezone: parsed.data.configuredTimezone,
    as_of: parsed.data.asOf,
    app_data: parsed.data.appData,
  });
  if (Buffer.byteLength(runtimeBody, 'utf8') > MAX_BODY_BYTES) {
    return send(res, 413, { ok: false, error: 'payload_too_large' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      redirect: 'error',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-QuestLife-Subject-Id': auth.userId,
      },
      body: runtimeBody,
    });
    if (!response.ok) {
      return send(res, 502, {
        ok: false,
        error: 'quant_runtime_rejected_request',
        runtimeStatus: response.status,
      });
    }
    const payload = await response.json();
    const metadata = payload?.product?.metadata;
    const sameTime = (value: unknown) => typeof value === 'string'
      && Date.parse(value) === Date.parse(parsed.data.asOf);
    if (payload?.ok !== true || metadata?.subject_id !== auth.userId
      || !sameTime(payload.as_of) || !sameTime(metadata.as_of)
      || !Number.isSafeInteger(payload.eligible_observation_count) || payload.eligible_observation_count < 0
      || !Number.isSafeInteger(payload.excluded_observation_count) || payload.excluded_observation_count < 0
      || typeof payload.source_snapshot_hash !== 'string' || !payload.source_snapshot_hash
      || metadata.synthetic_only !== false
      || metadata.contains_real_user_data !== (payload.eligible_observation_count > 0)) {
      return send(res, 502, { ok: false, error: 'quant_runtime_invalid_response' });
    }
    if (payload.analysis != null && (payload.analysis.base_bundle_id !== metadata.bundle_id
      || !sameTime(payload.analysis.as_of) || payload.analysis.synthetic_only !== false
      || payload.analysis.contains_real_user_data !== metadata.contains_real_user_data)) {
      return send(res, 502, { ok: false, error: 'quant_runtime_invalid_analysis_context' });
    }
    // Receipt binds the client response to this exact request, not a Quant model hash.
    return send(res, 200, {
      ...payload,
      request_context: {
        subject_id: auth.userId,
        as_of: parsed.data.asOf,
        configured_timezone: parsed.data.configuredTimezone,
        snapshot_hash: createHash('sha256').update(JSON.stringify(parsed.data.appData)).digest('hex'),
      },
    });
  } catch {
    return send(res, 502, {
      ok: false,
      error: controller.signal.aborted
        ? 'quant_runtime_timeout'
        : 'quant_runtime_unavailable',
    });
  } finally {
    clearTimeout(timeout);
  }
}
