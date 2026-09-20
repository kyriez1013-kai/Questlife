import "react-native-url-polyfill/auto";
import {
  createClient,
  processLock,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { sessionStorage } from "./sessionStorage";
import { AuthService, type IdentitySession } from "./auth";
import { isPublicSupabaseKey } from "./publicConfig";
import { Linking, Platform } from 'react-native';
import { ensurePkceCrypto } from './pkceCrypto';
import { authLinkConsumer, parseAuthLink } from './authLink';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
let client: SupabaseClient | undefined;
export const authConfigured = () =>
  !!url && /^https:\/\/[^/?#]+\/?$/.test(url) && isPublicSupabaseKey(key);
export function supabaseClient(): SupabaseClient {
  if (!authConfigured()) throw new Error("auth_not_configured");
  if (!client)
    client = createClient(url!, key!, {
      auth: {
        storage: sessionStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
        lock: processLock,
      },
    });
  return client;
}
const identity = (
  session: { user: { id: string; email?: string } } | null,
): IdentitySession | null =>
  session ? { userId: session.user.id, email: session.user.email } : null;
export const authService = new AuthService({
  async session() {
    if (!authConfigured()) return null;
    const { data, error } = await supabaseClient().auth.getSession();
    if (error) throw new Error("session_unavailable");
    return identity(data.session);
  },
  subscribe(listener) {
    if (!authConfigured()) return () => {};
    const { data } = supabaseClient().auth.onAuthStateChange(
      (_event, session) => listener(identity(session)),
    );
    return () => data.subscription.unsubscribe();
  },
  async requestOtp(email) {
    ensurePkceCrypto();
    const { error } = await supabaseClient().auth.signInWithOtp({ email, options: { emailRedirectTo: authRedirectUrl() } });
    if (error) throw new Error("otp_request_failed");
  },
  async verifyOtp(email, token) {
    const { error } = await supabaseClient().auth.verifyOtp({
      email,
      token,
      type: "email",
    });
    if (error) throw new Error("otp_verify_failed");
  },
  async signOut() {
    const { signOutWithPushRetirement } = await import('./pushRegistry');
    await signOutWithPushRetirement();
  },
});

export function authRedirectUrl() {
  return Platform.OS === 'web' ? `${window.location.origin}/` : 'questlife://auth/callback';
}

const consumeLink = authLinkConsumer(async (code, flowId) => {
  const { error } = await supabaseClient().auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined);
  if (error) throw new Error('auth_link_failed');
});

export function listenForAuthLinks(onError: () => void) {
  if (!authConfigured()) return () => {};
  let active = true;
  const accept = async (value: string) => {
    if (!active) return;
    const link = parseAuthLink(value, authRedirectUrl());
    if (!link) return;
    try { await consumeLink(link); } catch { if (active) onError(); }
    finally {
      if (Platform.OS === 'web') {
        const clean = new URL(window.location.href);
        for (const key of ['code', 'sb_flow_id', 'error', 'error_code', 'error_description']) clean.searchParams.delete(key);
        if ('error' in link) clean.hash = '';
        window.history.replaceState(window.history.state, '', clean.toString());
      }
    }
  };
  if (Platform.OS === 'web') void accept(window.location.href);
  else void Linking.getInitialURL().then(value => { if (value) void accept(value); }).catch(() => { if (active) onError(); });
  const sub = Platform.OS === 'web' ? null : Linking.addEventListener('url', event => void accept(event.url));
  return () => { active = false; sub?.remove(); };
}
