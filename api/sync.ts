/** Retired anonymous sync ingress. Sync V2 uses authenticated, RLS-bound RPCs. */
export default async function handler(_req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(410).json({ ok: false, error: 'legacy_sync_retired' });
}
