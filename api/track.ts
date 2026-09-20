/** Anonymous service-role telemetry is retired; it is not an account write API. */
export default async function handler(_req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(410).json({ ok: false, error: 'legacy_analytics_retired' });
}
