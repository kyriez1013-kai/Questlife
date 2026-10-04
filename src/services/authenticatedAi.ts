import { apiUrl } from '../platform/apiUrl';
import { aiPreferencesRevision, aiPreferencesSnapshot, loadAiPreferences, subscribeAiPreferences } from './aiPreferences';

export type AiFailure = 'authentication_required' | 'local_account_mismatch' | 'account_changed'
  | 'ai_rate_limited' | 'request_too_large' | 'ai_budget_unavailable' | 'ai_disabled' | 'service_unavailable';

export class AiRequestError extends Error {
  constructor(public readonly code: AiFailure) { super(code); }
}

let observedAuth: any;
let observedUser: string | null = null;
let generation = 0;
let stopObservation: (() => void) | undefined;
const pending = new Set<AbortController>();

function invalidate() {
  generation += 1;
  pending.forEach((controller) => controller.abort());
}
subscribeAiPreferences(invalidate);

/** Normal Web/native calls share the existing session and local replica owner. */
export async function authenticatedAiPost(path: '/api/parse' | '/api/brief', body: object): Promise<any> {
  const { authConfigured, supabaseClient } = await import('../sync-v2/supabase');
  if (!authConfigured()) throw new AiRequestError('service_unavailable');
  const auth = supabaseClient().auth;
  if (observedAuth !== auth) {
    stopObservation?.();
    invalidate();
    observedAuth = auth;
    observedUser = null;
    const { data } = auth.onAuthStateChange((event, session) => {
      const user = session?.user.id ?? null;
      if (user !== observedUser || event === 'SIGNED_OUT') invalidate();
      observedUser = user;
    });
    stopObservation = () => data.subscription.unsubscribe();
  }
  const { data, error } = await auth.getSession();
  const session = data.session;
  if (error || !session?.access_token) throw new AiRequestError('authentication_required');
  await loadAiPreferences();
  const preference = aiPreferencesSnapshot();
  const consentRevision = aiPreferencesRevision();
  if (!preference.enabled || preference.ownerId !== session.user.id) throw new AiRequestError('ai_disabled');
  if (observedUser !== session.user.id) { invalidate(); observedUser = session.user.id; }
  const currentGeneration = generation;
  const { readSyncState } = await import('../sync-v2/runtime');
  const state = await readSyncState();
  if (state.ownerId !== session.user.id) throw new AiRequestError('local_account_mismatch');
  if (generation !== currentGeneration) throw new AiRequestError('account_changed');
  const controller = new AbortController();
  pending.add(controller);
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    const response = await fetch(apiUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(body), signal: controller.signal, cache: 'no-store',
    });
    const result = await response.json().catch(() => null);
    const current = await auth.getSession();
    const currentState = await readSyncState();
    if (generation !== currentGeneration || consentRevision !== aiPreferencesRevision() || current.error || current.data.session?.user.id !== session.user.id
      || currentState.ownerId !== session.user.id || currentState.healthConsent !== state.healthConsent) {
      throw new AiRequestError('account_changed');
    }
    if (!response.ok || !result?.ok) {
      const code: AiFailure = response.status === 401 ? 'authentication_required'
        : response.status === 429 ? 'ai_rate_limited' : response.status === 413 ? 'request_too_large'
          : result?.error === 'ai_budget_unavailable' ? 'ai_budget_unavailable' : 'service_unavailable';
      throw new AiRequestError(code);
    }
    return result;
  } catch (error) {
    if (error instanceof AiRequestError) throw error;
    if (generation !== currentGeneration) throw new AiRequestError('account_changed');
    throw new AiRequestError('service_unavailable');
  } finally {
    clearTimeout(timeout);
    pending.delete(controller);
  }
}
