export type PushSession = { userId: string; accessToken: string };
export type PushRegistrationStatus = 'registered' | 'disabled' | 'auth_required' | 'account_mismatch' | 'retirement_pending' | 'unavailable';
export type PushBinding = {
  userId: string; deviceId: string; registrationId: string; generation: number;
  fingerprint: string; phase: 'registering' | 'active' | 'retiring'; renewAfter: number; expiresAt: number;
};
export type PushJournal = { version: 1; generation: number; binding: PushBinding | null; signOutUserId: string | null };
export type PushRegistryDriver = {
  read(): Promise<PushJournal>;
  write(state: PushJournal): Promise<void>;
  session(): Promise<PushSession | null>;
  rpc(session: PushSession, name: string, args: Record<string, unknown>): Promise<Record<string, unknown>>;
  device(): Promise<{ id: string; platform: string; appVersion: string }>;
  digest(token: string): Promise<string>;
  uuid(): string;
  now(): number;
};
export const emptyPushJournal = (): PushJournal => ({ version: 1, generation: 0, binding: null, signOutUserId: null });
export const validExpoPushToken = (token: string) => /^(ExpoPushToken|ExponentPushToken)\[[A-Za-z0-9_-]{10,200}\]$/.test(token);

/** Serialized, account-bound retirement journal. It never persists an Expo token or bearer. */
export class PushRegistry {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private driver: PushRegistryDriver) {}
  private exclusive<T>(job: () => Promise<T>): Promise<T> {
    const result = this.queue.then(job);
    this.queue = result.catch(() => undefined);
    return result;
  }
  private async sameAccount(session: PushSession) {
    return (await this.driver.session())?.userId === session.userId;
  }
  private async retire(state: PushJournal, session: PushSession): Promise<boolean> {
    const binding = state.binding;
    if (!binding) return true;
    binding.phase = 'retiring';
    await this.driver.write(state);
    if (binding.userId !== session.userId) return false;
    try {
      const result = await this.driver.rpc(session, 'questlife_push_retire', {
        p_device_id: binding.deviceId, p_registration_id: binding.registrationId, p_generation: binding.generation,
      });
      if (result.status !== 'retired') return false;
      state.binding = null;
      await this.driver.write(state);
      return true;
    } catch { return false; }
  }
  reconcile(input: { expectedUserId: string | null; token: string | null; enabled: boolean }): Promise<{ status: PushRegistrationStatus }> {
    return this.exclusive(async () => {
      try {
        const session = await this.driver.session();
        const state = await this.driver.read();
        if (!session) return { status: 'auth_required' };
        if (session.userId !== input.expectedUserId || (state.binding && state.binding.userId !== session.userId)) return { status: 'account_mismatch' };
        if (state.signOutUserId) return { status: 'retirement_pending' };
        if (!input.enabled || !input.token) {
          return { status: await this.retire(state, session) ? 'disabled' : 'retirement_pending' };
        }
        if (!validExpoPushToken(input.token)) return { status: 'unavailable' };
        const device = await this.driver.device();
        if (!['ios', 'android'].includes(device.platform)) return { status: 'disabled' };
        const fingerprint = await this.driver.digest(input.token);
        if (!await this.sameAccount(session)) return { status: 'account_mismatch' };
        if (state.binding && (state.binding.fingerprint !== fingerprint || state.binding.phase !== 'active' || state.binding.deviceId !== device.id)) {
          if (!await this.retire(state, session)) return { status: 'retirement_pending' };
        }
        if (state.binding && state.binding.renewAfter > this.driver.now()) return { status: 'registered' };
        if (!state.binding) {
          state.generation = Math.max(state.generation + 1, this.driver.now() * 1000);
          state.binding = { userId: session.userId, deviceId: device.id, registrationId: this.driver.uuid(),
            generation: state.generation, fingerprint, phase: 'registering', renewAfter: 0, expiresAt: 0 };
        }
        const binding = state.binding;
        // Intent reaches durable storage before the first network request, including renewals.
        binding.phase = 'registering';
        await this.driver.write(state);
        try {
          if (!await this.sameAccount(session)) throw new Error('account_changed');
          await this.driver.rpc(session, 'questlife_device_touch', {
            p_device_id: device.id, p_platform: device.platform, p_app_version: device.appVersion,
          });
          if (!await this.sameAccount(session)) throw new Error('account_changed');
          const registered = await this.driver.rpc(session, 'questlife_push_register', {
            p_device_id: binding.deviceId, p_registration_id: binding.registrationId, p_generation: binding.generation,
            p_token: input.token, p_enabled: true,
          });
          const expiresAt = typeof registered.expiresAt === 'string' ? Date.parse(registered.expiresAt) : NaN;
          if (registered.status !== 'registered' || !Number.isFinite(expiresAt) || !await this.sameAccount(session)) throw new Error('registration_unconfirmed');
          binding.phase = 'active';
          binding.renewAfter = this.driver.now() + 60 * 60 * 1000;
          binding.expiresAt = expiresAt;
          await this.driver.write(state);
          return { status: 'registered' };
        } catch {
          // Even a lost ACK may mean the token reached the server. Retire, never blindly replay it for another user.
          await this.retire(state, session);
          return { status: state.binding ? 'retirement_pending' : 'unavailable' };
        }
      } catch { return { status: 'unavailable' }; }
    });
  }
  prepareSignOut(): Promise<boolean> {
    return this.exclusive(async () => {
      const session = await this.driver.session();
      if (!session) return true;
      const state = await this.driver.read();
      if (state.signOutUserId && state.signOutUserId !== session.userId) return false;
      state.signOutUserId = session.userId;
      await this.driver.write(state);
      return await this.retire(state, session) && await this.sameAccount(session);
    });
  }
  retry(): Promise<{ signOutUserId: string | null; ready: boolean }> {
    return this.exclusive(async () => {
      const state = await this.driver.read();
      const session = await this.driver.session();
      if (state.binding && (state.binding.phase !== 'active' || state.signOutUserId || state.binding.userId !== session?.userId)) {
        state.binding.phase = 'retiring';
        await this.driver.write(state);
        if (!session || !await this.retire(state, session)) return { signOutUserId: state.signOutUserId, ready: false };
      }
      return { signOutUserId: state.signOutUserId, ready: !state.binding };
    });
  }
  completeSignOut(userId: string): Promise<void> {
    return this.exclusive(async () => {
      const state = await this.driver.read();
      if (!state.binding && state.signOutUserId === userId) {
        state.signOutUserId = null;
        await this.driver.write(state);
      }
    });
  }
  matches(registrationId: unknown): Promise<boolean> {
    return this.exclusive(async () => {
      if (typeof registrationId !== 'string') return false;
      const state = await this.driver.read();
      const session = await this.driver.session();
      return !state.signOutUserId && state.binding?.phase === 'active'
        && state.binding.userId === session?.userId && state.binding.registrationId === registrationId
        && state.binding.expiresAt > this.driver.now();
    });
  }
}
