import { Buffer } from 'node:buffer';
import { z } from 'zod';
import { verifySupabaseBearer } from './_lib/supabaseAuth';

const RequestSchema = z.object({ deviceId: z.string().min(5).max(200), requestId: z.string().uuid(),
  action: z.enum(['send', 'receipt']) }).strict();

/** Authenticated manual test only: one registered own-device, no caller-supplied content. */
export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Vary', 'Authorization');
  const send = (status: number, body: Record<string, unknown>) => res.status(status).json(body);
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(405, { ok: false, error: 'method_not_allowed' }); }
  let input: z.infer<typeof RequestSchema>;
  try {
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
    if (Buffer.byteLength(raw, 'utf8') > 1024) return send(413, { ok: false, error: 'payload_too_large' });
    input = RequestSchema.parse(JSON.parse(raw));
  } catch { return send(400, { ok: false, error: 'invalid_request' }); }
  const auth = await verifySupabaseBearer(req);
  if (!auth.ok) return send(auth.status, { ok: false, error: auth.error });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  const rpc = async (name: string, args: Record<string, unknown>) => {
    const response = await fetch(`${process.env.SUPABASE_URL!.replace(/\/$/, '')}/rest/v1/rpc/${name}`, {
      method: 'POST', signal: controller.signal, redirect: 'error', cache: 'no-store',
      headers: { apikey: process.env.SUPABASE_ANON_KEY!, Authorization: `Bearer ${auth.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });
    if (!response.ok) throw new Error('push_registry_unavailable');
    return response.json();
  };
  const expo = async (action: 'send' | 'getReceipts', body: unknown) => {
    const accessToken = process.env.EXPO_PUSH_ACCESS_TOKEN;
    const response = await fetch(`https://exp.host/--/api/v2/push/${action}`, {
      method: 'POST', signal: controller.signal, redirect: 'error', cache: 'no-store',
      headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error('push_provider_unavailable');
    return response.json();
  };
  try {
    const claim = await rpc('questlife_push_test_claim', {
      p_device_id: input.deviceId, p_request_id: input.requestId, p_send: input.action === 'send',
    });
    if (claim.status === 'disabled' || claim.status === 'not_found') return send(409, { ok: false, error: 'push_not_available' });
    if (claim.status === 'rate_limited') return send(429, { ok: false, error: 'push_rate_limited' });
    const finish = async (status: string, ticketId?: string) => rpc('questlife_push_test_finish', {
      p_device_id: input.deviceId, p_registration_id: claim.registrationId, p_request_id: input.requestId,
      p_status: status, p_ticket_id: ticketId ?? null,
    });
    if (input.action === 'send' && claim.status === 'claimed') {
      if (typeof claim.token !== 'string' || !/^(ExpoPushToken|ExponentPushToken)\[[A-Za-z0-9_-]{10,200}\]$/.test(claim.token)
        || !z.string().uuid().safeParse(claim.registrationId).success) throw new Error('invalid_binding');
      const result = await expo('send', { to: claim.token, title: 'QuestLife', body: 'Open QuestLife.',
        ttl: 60, sound: null, channelId: 'questlife', data: { source: 'questlife', kind: 'push_test', registrationId: claim.registrationId } });
      const ticket = result?.data;
      if (ticket?.status === 'ok' && typeof ticket.id === 'string' && ticket.id.length <= 200) {
        const saved = await finish('accepted', ticket.id);
        return send(202, { ok: true, status: saved.status === 'accepted' ? 'accepted' : 'superseded', delivered: false });
      }
      await finish(ticket?.details?.error === 'DeviceNotRegistered' ? 'device_unregistered' : 'failed');
      return send(502, { ok: false, error: 'push_provider_rejected', delivered: false });
    }
    if (input.action === 'receipt' && claim.status === 'accepted' && typeof claim.ticketId === 'string') {
      const result = await expo('getReceipts', { ids: [claim.ticketId] });
      const receipt = result?.data?.[claim.ticketId];
      if (!receipt) return send(202, { ok: true, status: 'receipt_pending', delivered: false });
      const status = receipt.status === 'ok' ? 'provider_accepted'
        : receipt.details?.error === 'DeviceNotRegistered' ? 'device_unregistered' : 'failed';
      const saved = await finish(status);
      return send(200, { ok: true, status: saved.status, delivered: false });
    }
    const allowed = ['pending', 'accepted', 'provider_accepted', 'failed', 'device_unregistered', 'retired'];
    if (!allowed.includes(claim.status)) throw new Error('invalid_push_status');
    return send(200, { ok: true, status: claim.status, delivered: false });
  } catch {
    // A lost provider ACK is not permission to resend. The durable claim remains pending.
    return send(503, { ok: false, error: 'push_unavailable', delivered: false });
  } finally { clearTimeout(timeout); }
}
