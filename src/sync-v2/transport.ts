import { supabaseClient } from "./supabase";
import type {
  Mutation,
  PushResult,
  RemoteRow,
  SyncTransport,
} from "./contracts";
export function wireMutation(m: Mutation) {
  // Retry bookkeeping must never change the idempotent server request.
  const {
    attemptCount: _attempts,
    lastAttemptAt: _last,
    lastError: _error,
    ...wire
  } = m;
  return wire;
}

async function captureAccountClient(userId: string) {
  const client = supabaseClient();
  // getSession refreshes expired credentials. Capture primitives before any
  // further await; the SDK's global session can change during dispatch.
  const { data, error } = await client.auth.getSession();
  const accessToken = data.session?.access_token;
  if (error || !accessToken || data.session?.user.id !== userId)
    throw new Error("sync_account_mismatch");
  const verified = await client.auth.getUser(accessToken);
  if (verified.error || verified.data.user?.id !== userId)
    throw new Error("sync_account_unverified");
  return { client, accessToken };
}

async function accountBoundClient(userId: string, signal: AbortSignal) {
  let abort!: () => void;
  const expired = new Promise<never>((_resolve, reject) => {
    abort = () => reject(new Error("sync_auth_timeout"));
    signal.addEventListener("abort", abort, { once: true });
  });
  try {
    if (signal.aborted) throw new Error("sync_auth_timeout");
    // Auth has no AbortSignal API. A late auth response cannot dispatch an RPC
    // after the transport deadline, even when the auth request is still pending.
    return await Promise.race([captureAccountClient(userId), expired]);
  } finally {
    signal.removeEventListener("abort", abort);
  }
}

export const supabaseTransport: SyncTransport = {
  async push(userId, mutations) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const { client, accessToken } = await accountBoundClient(userId, controller.signal);
      const { data, error } = await client
        .rpc("questlife_sync_push", { mutations: mutations.map(wireMutation) })
        .setHeader("Authorization", `Bearer ${accessToken}`)
        .abortSignal(controller.signal);
      if (error || !Array.isArray(data)) throw new Error("push_failed");
      return data as PushResult[];
    } finally {
      clearTimeout(timer);
    }
  },
  async pull(userId, cursor, limit) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const { client, accessToken } = await accountBoundClient(userId, controller.signal);
      const { data, error } = await client
        .from("questlife_sync_entities")
        .select("*")
        .eq("user_id", userId)
        .gt("change_seq", cursor)
        .order("change_seq")
        .limit(limit)
        .setHeader("Authorization", `Bearer ${accessToken}`)
        .abortSignal(controller.signal);
      if (error || !Array.isArray(data)) throw new Error("pull_failed");
      return data as RemoteRow[];
    } finally {
      clearTimeout(timer);
    }
  },
};
