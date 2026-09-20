import { z } from 'zod';
import { PushRegistry, emptyPushJournal, type PushJournal, type PushSession, type PushRegistrationStatus } from './pushRegistryCore';

const JOURNAL_KEY = 'questlife.push.registry.v1';
const BindingSchema = z.object({
  userId: z.string().uuid(), deviceId: z.string().min(5).max(200), registrationId: z.string().uuid(),
  generation: z.number().int().positive().safe(), fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  phase: z.enum(['registering', 'active', 'retiring']), renewAfter: z.number().finite(), expiresAt: z.number().finite(),
}).strict();
const JournalSchema = z.object({ version: z.literal(1), generation: z.number().int().nonnegative().safe(),
  binding: BindingSchema.nullable(), signOutUserId: z.string().uuid().nullable() }).strict();
let registry: Promise<PushRegistry> | undefined;

async function currentSession(): Promise<PushSession | null> {
  const { authConfigured, supabaseClient } = await import('./supabase');
  if (!authConfigured()) return null;
  const { data, error } = await supabaseClient().auth.getSession();
  if (error) throw new Error('push_session_unavailable');
  return data.session ? { userId: data.session.user.id, accessToken: data.session.access_token } : null;
}
async function eligible(userId: string): Promise<boolean> {
  const { readSyncState } = await import('./runtime');
  const { deviceRepository } = await import('../platform/services');
  const state = await readSyncState();
  const device = await deviceRepository.read();
  return state.ownerId === userId && device.notificationsEnabled === true;
}
function getRegistry(): Promise<PushRegistry> {
  if (!registry) registry = (async () => {
    const { sessionStorage } = await import('./sessionStorage');
    const { getSyncDevice } = await import('./device');
    const crypto = await import('expo-crypto');
    return new PushRegistry({
      read: async () => {
        const raw = await sessionStorage.getItem(JOURNAL_KEY);
        // Zod's required fields infer as optional when the legacy test compiler disables strictNullChecks.
        return raw ? JournalSchema.parse(JSON.parse(raw)) as PushJournal : emptyPushJournal();
      },
      write: (state) => sessionStorage.setItem(JOURNAL_KEY, JSON.stringify(JournalSchema.parse(state))),
      session: currentSession, device: getSyncDevice, now: Date.now, uuid: crypto.randomUUID,
      digest: (value) => crypto.digestStringAsync(crypto.CryptoDigestAlgorithm.SHA256, value),
      rpc: async (session, name, args) => {
        if (name === 'questlife_push_register' && (!await eligible(session.userId)
          || (await currentSession())?.userId !== session.userId)) throw new Error('push_context_changed');
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        try {
          // Capture the bearer for this account; an SDK-global session switch must not retarget the RPC.
          const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL!.replace(/\/$/, '')}/rest/v1/rpc/${name}`, {
            method: 'POST', headers: { apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
              Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json' },
            signal: controller.signal, redirect: 'error', cache: 'no-store', body: JSON.stringify(args),
          });
          if (!response.ok) throw new Error('push_registry_unavailable');
          const result = await response.json();
          return result ?? {};
        } finally { clearTimeout(timeout); }
      },
    });
  })().catch((error) => { registry = undefined; throw error; });
  return registry;
}

export async function syncDevicePushRegistration(input: {
  expectedUserId: string | null; expoPushToken: string | null;
  notificationsEnabled: boolean; permissionGranted: boolean;
}): Promise<{ status: PushRegistrationStatus }> {
  try {
    const enabled = input.expectedUserId !== null && input.notificationsEnabled && input.permissionGranted
      && await eligible(input.expectedUserId);
    return await (await getRegistry()).reconcile({ expectedUserId: input.expectedUserId,
      token: input.expoPushToken, enabled });
  } catch { return { status: 'unavailable' }; }
}

/** Settings callback: completion means the authenticated registry acknowledged this token. */
export async function registerNativePushToken(token: string, expectedUserId: string): Promise<void> {
  const result = await syncDevicePushRegistration({ expectedUserId, expoPushToken: token,
    notificationsEnabled: true, permissionGranted: true });
  if (result.status !== 'registered') throw new Error(`push_${result.status}`);
}

async function finishSignOut(userId: string): Promise<void> {
  const { supabaseClient } = await import('./supabase');
  const session = await currentSession();
  if (session && session.userId !== userId) {
    // A's retirement was acknowledged; never sign out a newer B session.
    await (await getRegistry()).completeSignOut(userId);
    return;
  }
  if (session) {
    const { error } = await supabaseClient().auth.signOut({ scope: 'local' });
    if (error) throw new Error('signout_failed');
  }
  await (await getRegistry()).completeSignOut(userId);
}

export async function signOutWithPushRetirement(): Promise<void> {
  const session = await currentSession();
  if (!session) return;
  if (!await (await getRegistry()).prepareSignOut()) throw new Error('push_retirement_pending');
  await finishSignOut(session.userId);
}

/** Called on startup/foreground and the existing sync retry tick, never by a hosted cron. */
export async function retryPendingPushRetirement(): Promise<void> {
  const active = await currentSession();
  const current = await getRegistry();
  if (active && !await eligible(active.userId)) {
    await current.reconcile({ expectedUserId: active.userId, token: null, enabled: false });
  }
  const result = await current.retry();
  if (result.ready && result.signOutUserId) await finishSignOut(result.signOutUserId);
}

export async function matchesCurrentPushRegistration(registrationId: unknown): Promise<boolean> {
  try {
    const session = await currentSession();
    return !!session && await eligible(session.userId) && await (await getRegistry()).matches(registrationId);
  } catch { return false; }
}
