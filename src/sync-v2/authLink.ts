export type AuthLink = { code: string; flowId?: string } | { error: true };

/** Only a one-time code for our exact callback may enter the SDK. Access tokens
 * in fragments and arbitrary links are not an alternative login path. */
export function parseAuthLink(value: string, expected: string): AuthLink | null {
  let url: URL, target: URL;
  try { url = new URL(value); target = new URL(expected); } catch { return null; }
  if (url.protocol !== target.protocol || url.host !== target.host || url.pathname !== target.pathname
    || url.username || url.password) return null;
  if (url.hash) {
    const fragment = new URLSearchParams(url.hash.slice(1));
    return fragment.has('error') || fragment.has('error_code') ? { error: true } : null;
  }
  if (url.searchParams.has('error') || url.searchParams.has('error_code')) return { error: true };
  const code = url.searchParams.get('code');
  const flowId = url.searchParams.get('sb_flow_id');
  if (!code) return null;
  if (!/^[A-Za-z0-9_-]{8,4096}$/.test(code) || url.searchParams.getAll('code').length !== 1
    || url.searchParams.getAll('sb_flow_id').length > 1
    || (flowId !== null && !/^[A-Za-z0-9_-]{8,64}$/.test(flowId))) return { error: true };
  return { code, ...(flowId ? { flowId } : {}) };
}

export function authLinkConsumer(exchange: (code: string, flowId?: string) => Promise<void>) {
  const seen = new Set<string>();
  return async (link: AuthLink | null) => {
    if (!link) return;
    if ('error' in link) throw new Error('auth_link_failed');
    if (seen.has(link.code)) return;
    seen.add(link.code);
    if (seen.size > 32) seen.delete(seen.values().next().value!);
    await exchange(link.code, link.flowId);
  };
}
