import "react-native-url-polyfill/auto";
import {
  createClient,
  processLock,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { sessionStorage } from "./sessionStorage";
import { AuthService, type IdentitySession } from "./auth";
import { isPublicSupabaseKey } from "./publicConfig";

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
    const { error } = await supabaseClient().auth.signInWithOtp({ email });
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
    const { error } = await supabaseClient().auth.signOut({ scope: "local" });
    if (error) throw new Error("signout_failed");
  },
});
