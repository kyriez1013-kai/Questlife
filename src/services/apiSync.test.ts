declare const process: any;

// @ts-expect-error Test-only Node TypeScript entry.
import handler from '../../api/sync.ts';

let assertions = 0;

function equal(actual: unknown, expected: unknown, name: string) {
  assertions += 1;
  if (actual !== expected) throw new Error(`${name}: expected ${String(expected)}, received ${String(actual)}`);
}

function createResponse() {
  return {
    statusCode: 0,
    body: undefined as any,
    headers: {} as Record<string, string>,
    setHeader(key: string, value: string) { this.headers[key] = value; },
    status(value: number) { this.statusCode = value; return this; },
    json(value: unknown) { this.body = value; return this; },
  };
}

async function callSync(body: unknown, fetchImpl: typeof fetch) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchImpl;
  const response = createResponse();
  try {
    await handler({ method: 'POST', body }, response);
    return response;
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function okEmpty() {
  return new Response('', { status: 201 });
}

async function runApiSyncTests() {
  const previousUrl = process.env.SUPABASE_URL;
  const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_URL = 'https://supabase.example.test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role';

  try {
    const createCalls: Array<{ url: string; init?: RequestInit }> = [];
    const createResult = await callSync({
      anonymousUserId: 'anon-test',
      collections: { executionLogs: [{ id: 'log-1', durationMinutes: 1 }] },
    }, async (input, init) => {
      createCalls.push({ url: String(input), init });
      return okEmpty();
    });
    equal(createResult.statusCode, 200, 'create returns success');
    equal(createResult.body.upserted.executionLogs, 1, 'create reports upsert count');
    equal(createCalls[0]?.init?.method, 'POST', 'create uses upsert POST');
    equal(createCalls[0]?.url.includes('/execution_logs?on_conflict=anonymous_user_id,id'), true, 'create is scoped to allowed table and compound key');

    const updateCalls: Array<{ body?: BodyInit | null }> = [];
    const updateResult = await callSync({
      anonymousUserId: 'anon-test',
      collections: { executionLogs: [{ id: 'log-1', durationMinutes: 40 }] },
    }, async (_input, init) => {
      updateCalls.push({ body: init?.body });
      return okEmpty();
    });
    equal(updateResult.statusCode, 200, 'update returns success');
    equal(String(updateCalls[0]?.body).includes('"durationMinutes":40'), true, 'same-id update sends current payload');

    const deleteCalls: Array<{ url: string; init?: RequestInit }> = [];
    const deleteResult = await callSync({
      anonymousUserId: 'anon-test',
      collections: {},
      deletions: { executionLogs: ['log-1'] },
    }, async (input, init) => {
      deleteCalls.push({ url: String(input), init });
      return new Response(JSON.stringify([{ id: 'log-1' }]), { status: 200 });
    });
    equal(deleteResult.statusCode, 200, 'delete returns success');
    equal(deleteCalls[0]?.init?.method, 'DELETE', 'delete uses DELETE method');
    equal(deleteCalls[0]?.url.includes('/execution_logs?'), true, 'delete is restricted to mapped execution table');
    equal(deleteCalls[0]?.url.includes('anonymous_user_id=eq.anon-test'), true, 'delete includes exact anonymous user filter');
    equal(deleteCalls[0]?.url.includes('id=eq.log-1'), true, 'delete includes exact entity id filter');
    equal(deleteResult.body.deletions.executionLogs.deleted, 1, 'delete reports remote row count');
    equal(deleteResult.body.deletions.executionLogs.acknowledgedIds[0], 'log-1', 'delete acknowledges exact id');

    const repeatedDelete = await callSync({
      anonymousUserId: 'anon-test',
      collections: {},
      deletions: { executionLogs: ['log-1'] },
    }, async () => new Response(JSON.stringify([]), { status: 200 }));
    equal(repeatedDelete.statusCode, 200, 'repeated delete remains successful');
    equal(repeatedDelete.body.deletions.executionLogs.deleted, 0, 'repeated delete reports zero removed rows');
    equal(repeatedDelete.body.deletions.executionLogs.alreadyAbsent, 1, 'repeated delete reports already absent');

    const rejectedType = await callSync({
      anonymousUserId: 'anon-test',
      collections: {},
      deletions: { skills: ['skill-1'] },
    }, async () => { throw new Error('fetch must not be called'); });
    equal(rejectedType.statusCode, 400, 'unknown deletion entity type is rejected');
    equal(rejectedType.body.error, 'invalid_input', 'unknown type fails input validation');

    const failedDelete = await callSync({
      anonymousUserId: 'anon-test',
      collections: {},
      deletions: { stateCheckIns: ['state-1'] },
    }, async () => new Response('temporary failure', { status: 503 }));
    equal(failedDelete.statusCode, 500, 'remote delete failure fails sync request');
    equal(failedDelete.body.error, 'sync_failed', 'remote delete failure cannot be acknowledged');

    console.log(`api/sync: ${assertions} assertions passed`);
  } finally {
    if (previousUrl == null) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = previousUrl;
    if (previousKey == null) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey;
  }
}

await runApiSyncTests();
