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
export const supabaseTransport: SyncTransport = {
  async push(_userId, mutations) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const { data, error } = await supabaseClient()
        .rpc("questlife_sync_push", { mutations: mutations.map(wireMutation) })
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
      const { data, error } = await supabaseClient()
        .from("questlife_sync_entities")
        .select("*")
        .eq("user_id", userId)
        .gt("change_seq", cursor)
        .order("change_seq")
        .limit(limit)
        .abortSignal(controller.signal);
      if (error || !Array.isArray(data)) throw new Error("pull_failed");
      return data as RemoteRow[];
    } finally {
      clearTimeout(timer);
    }
  },
};
