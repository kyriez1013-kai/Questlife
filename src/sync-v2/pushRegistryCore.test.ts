import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { PushRegistry, emptyPushJournal, type PushJournal, type PushSession, type PushRegistryDriver } from './pushRegistryCore';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const TOKEN = 'ExpoPushToken[fixture_token_123456789]';
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));

async function main() {
  let checks = 0;
  const passed = (name: string) => { checks++; console.log(`PASS push core: ${name}`); };
  let state: PushJournal = emptyPushJournal();
  let session: PushSession | null = { userId: A, accessToken: 'fixture-bearer-A' };
  let online = true;
  let storageAvailable = true;
  let now = 1_800_000_000_000;
  let registered: { owner: string; id: unknown; generation: unknown; token: unknown } | undefined;
  let registrationHook: (() => Promise<void>) | undefined;
  const calls: Array<{ owner: string; name: string; args: Record<string, unknown> }> = [];
  const driver: PushRegistryDriver = {
    read: async () => copy(state),
    write: async (next) => { if (!storageAvailable) throw new Error('disk'); state = copy(next); },
    session: async () => session,
    device: async () => ({ id: 'ios:fixture-device', platform: 'ios', appVersion: '1.0.0' }),
    digest: async (token) => createHash('sha256').update(token).digest('hex'),
    uuid: randomUUID, now: () => now,
    rpc: async (identity, name, args) => {
      calls.push({ owner: identity.userId, name, args });
      if (!online) throw new Error('offline');
      if (name === 'questlife_push_register') {
        registered = { owner: identity.userId, id: args.p_registration_id, generation: args.p_generation, token: args.p_token };
        await registrationHook?.();
        return { status: 'registered', expiresAt: new Date(now + 86_400_000).toISOString() };
      }
      if (name === 'questlife_push_retire') {
        assert.equal(identity.userId, state.binding?.userId);
        if (registered) {
          assert.equal(registered.owner, identity.userId);
          assert.equal(registered.id, args.p_registration_id);
        }
        registered = undefined;
        return { status: 'retired' };
      }
      return {};
    },
  };
  let registry = new PushRegistry(driver);
  const input = { expectedUserId: A, token: TOKEN, enabled: true };
  assert.equal((await registry.reconcile(input)).status, 'registered');
  assert.ok(!JSON.stringify(state).includes(TOKEN));
  assert.ok(!JSON.stringify(state).includes('fixture-bearer'));
  assert.equal(await registry.matches(state.binding!.registrationId), true);
  const priorCalls = calls.length;
  assert.equal((await registry.reconcile(input)).status, 'registered');
  assert.equal(calls.length, priorCalls, 'unchanged bindings avoid repeated registration');
  assert.equal((await registry.reconcile({ ...input, enabled: false })).status, 'disabled');
  assert.equal(registered, undefined);
  passed('token-free persistence, unchanged binding reuse and preference disable');

  await registry.reconcile(input);
  online = false;
  assert.equal(await registry.prepareSignOut(), false);
  assert.equal(state.signOutUserId, A);
  assert.equal(state.binding?.phase, 'retiring');
  session = { userId: B, accessToken: 'fixture-bearer-B' };
  const beforeB = calls.length;
  assert.equal((await registry.reconcile({ ...input, expectedUserId: B })).status, 'account_mismatch');
  assert.equal((await registry.retry()).ready, false);
  assert.equal(calls.length, beforeB, 'B never receives or sends A token/retirement credentials');
  assert.equal(await registry.matches(state.binding!.registrationId), false);
  registry = new PushRegistry(driver);
  session = { userId: A, accessToken: 'fixture-bearer-A-new-session' };
  online = true;
  assert.deepEqual(await registry.retry(), { ready: true, signOutUserId: A });
  assert.equal(registered, undefined);
  session = null;
  await registry.completeSignOut(A);
  assert.equal(state.signOutUserId, null);
  passed('offline sign-out, A/B isolation and restart retirement retry');
  assert.equal((await registry.reconcile(input)).status, 'auth_required');
  passed('no session fails closed');

  session = { userId: A, accessToken: 'fixture-bearer-A' };
  registrationHook = async () => { online = false; throw new Error('ACK lost after server commit'); };
  assert.equal((await registry.reconcile(input)).status, 'retirement_pending');
  assert.ok(registered, 'lost ACK is an uncertain server write, not success or a safe absence');
  assert.equal(state.binding?.phase, 'retiring');
  registry = new PushRegistry(driver);
  online = true;
  registrationHook = undefined;
  assert.equal((await registry.retry()).ready, true);
  assert.equal(registered, undefined);
  passed('lost registration ACK and crash recovery');

  let entered!: () => void;
  let release!: () => void;
  const ready = new Promise<void>((resolve) => { entered = resolve; });
  registrationHook = async () => { entered(); await new Promise<void>((resolve) => { release = resolve; }); };
  const registering = registry.reconcile(input);
  await ready;
  const signingOut = registry.prepareSignOut();
  release();
  await registering;
  assert.equal(await signingOut, true);
  assert.equal(registered, undefined, 'queued sign-out retires even a just-completed registration');
  await registry.completeSignOut(A);
  passed('in-flight registration followed by queued sign-out');
  registrationHook = async () => { session = { userId: B, accessToken: 'fixture-bearer-B' }; };
  assert.equal((await registry.reconcile(input)).status, 'unavailable');
  assert.equal(registered, undefined, 'late A response is retired with captured A identity');
  assert.equal(calls.at(-1)?.owner, A);
  passed('late account response retires with captured original bearer');
  session = { userId: A, accessToken: 'fixture-bearer-A' };
  registrationHook = undefined;
  storageAvailable = false;
  const beforeStorageFailure = calls.length;
  assert.equal((await registry.reconcile(input)).status, 'unavailable');
  assert.equal(calls.length, beforeStorageFailure, 'durable intent failure prevents network registration');
  passed('durable storage failure prevents registration');
  storageAvailable = true;
  await registry.reconcile(input);
  const id = state.binding!.registrationId;
  now += 86_400_001;
  assert.equal(await registry.matches(id), false, 'expired bindings cannot authorize a push tap');
  passed('expired lease rejects notification intent');
  console.log(`Push registry core: ${checks}/${checks} scenario groups passed (mock driver).`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
