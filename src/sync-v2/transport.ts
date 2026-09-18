import { supabaseClient } from './supabase';
import type { Mutation, PushResult, RemoteRow, SyncTransport } from './contracts';
export function wireMutation(m: Mutation) {
  // Retry bookkeeping must never change the idempotent server request.
  const { attemptCount: _attempts, lastAttemptAt: _last, lastError: _error, ...wire } = m;
  return wire;
}
export const supabaseTransport: SyncTransport = {
  async push(_userId, mutations) {
    const { data, error } = await supabaseClient().rpc('questlife_sync_push', { mutations: mutations.map(wireMutation) }).abortSignal(AbortSignal.timeout(20000));
    if (error || !Array.isArray(data)) throw new Error('push_failed');
    return data as PushResult[];
  },
  async pull(userId, cursor, limit) {
    const { data, error } = await supabaseClient().from('questlife_sync_entities').select('*').eq('user_id', userId).gt('change_seq', cursor).order('change_seq').limit(limit).abortSignal(AbortSignal.timeout(20000));
    if (error || !Array.isArray(data)) throw new Error('pull_failed');
    return data as RemoteRow[];
  },
};
