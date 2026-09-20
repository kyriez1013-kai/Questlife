import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import noDataBundle from '../quant-product/fixtures/no_data_compact.json';
import formingBundle from '../quant-product/fixtures/forming_history_full.json';
import analysisExtension from '../quant-product/fixtures/analysis_extension_v1.json';
import { DEFAULT_DATA, type AppData } from '../types';
import {
  buildOwnerQuantSnapshot,
  clearOwnerQuantRuntimeCacheForTests,
  requestOwnerQuantArtifacts,
} from './ownerQuantRuntime';

const AS_OF = formingBundle.metadata.as_of;

function data(): AppData {
  return {
    ...DEFAULT_DATA,
    categories: [{ id: 'goal-private', name: 'PRIVATE GOAL', createdAt: 1 }],
    contextLogs: [{
      id: 'context-steps',
      type: 'body',
      label: 'steps',
      value: 4321,
      unit: 'steps',
      rawText: 'PRIVATE RAW TEXT',
    }],
    executionLogs: [{
      id: 'execution-1',
      date: AS_OF.slice(0, 10),
      durationMinutes: 20,
      source: 'manual',
      createdAt: AS_OF,
      appliedToProgress: true,
      note: 'PRIVATE NOTE',
    }],
  };
}

function response(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function availablePayload(body: Record<string, any>) {
  return {
    ok: true,
    as_of: AS_OF,
    eligible_observation_count: 12,
    excluded_observation_count: 2,
    cache_hit: false,
    source_snapshot_hash: 'owner-hash',
    request_context: {
      subject_id: body.subjectId,
      as_of: body.asOf,
      configured_timezone: body.configuredTimezone,
      snapshot_hash: createHash('sha256').update(JSON.stringify(body.appData)).digest('hex'),
    },
    product: {
      ...formingBundle,
      metadata: { ...formingBundle.metadata, subject_id: body.subjectId, synthetic_only: false, contains_real_user_data: true },
    },
    analysis: {
      ...analysisExtension,
      base_bundle_id: formingBundle.metadata.bundle_id,
      as_of: AS_OF,
      generated_at: AS_OF,
      synthetic_only: false,
      contains_real_user_data: true,
    },
    limitations: ['OBSERVATIONAL_NOT_CAUSAL'],
  };
}

async function main() {
  const snapshot = buildOwnerQuantSnapshot(data());
  const serialized = JSON.stringify(snapshot);
  assert.ok(!serialized.includes('PRIVATE GOAL'));
  assert.ok(!serialized.includes('PRIVATE RAW TEXT'));
  assert.ok(!serialized.includes('PRIVATE NOTE'));
  assert.equal((snapshot.contextLogs as Array<Record<string, unknown>>)[0].label, 'steps');

  clearOwnerQuantRuntimeCacheForTests();
  let calls = 0;
  const fetchAvailable: typeof fetch = async (_url, init) => {
    calls += 1;
    return response(availablePayload(JSON.parse(String(init?.body))));
  };
  const first = await requestOwnerQuantArtifacts({
    data: data(),
    subjectId: 'owner-test',
    timezone: 'UTC',
    asOf: AS_OF,
    fetchImpl: fetchAvailable as typeof fetch,
  });
  assert.equal(first.status, 'available');
  assert.equal(first.eligibleObservationCount, 12);
  assert.ok(first.product);
  assert.ok(first.analysis);
  first.product.metadata.subject_id = 'mutated-caller-copy';
  const cached = await requestOwnerQuantArtifacts({
    data: data(),
    subjectId: 'owner-test',
    timezone: 'UTC',
    asOf: AS_OF,
    fetchImpl: fetchAvailable as typeof fetch,
  });
  assert.equal(cached.cacheHit, true);
  assert.equal(calls, 1);
  assert.equal(cached.product?.metadata.subject_id, 'owner-test', 'callers cannot mutate cached artifacts');

  const changedData = data();
  changedData.executionLogs = [...changedData.executionLogs, {
    id: 'execution-2',
    date: AS_OF.slice(0, 10),
    durationMinutes: 10,
    source: 'manual',
    createdAt: AS_OF,
    appliedToProgress: true,
  }];
  const invalidated = await requestOwnerQuantArtifacts({
    data: changedData,
    subjectId: 'owner-test',
    timezone: 'UTC',
    asOf: AS_OF,
    fetchImpl: fetchAvailable as typeof fetch,
  });
  assert.equal(invalidated.cacheHit, false);
  assert.equal(calls, 2, 'new eligible owner data must invalidate the client artifact cache');

  clearOwnerQuantRuntimeCacheForTests();
  const empty = await requestOwnerQuantArtifacts({
    data: { ...DEFAULT_DATA },
    subjectId: 'owner-empty',
    timezone: 'UTC',
    asOf: noDataBundle.metadata.as_of,
    fetchImpl: (async () => response({
      ok: true,
      eligible_observation_count: 0,
      excluded_observation_count: 3,
      cache_hit: false,
      product: {
        ...noDataBundle,
        metadata: { ...noDataBundle.metadata, subject_id: 'owner-empty', synthetic_only: false, contains_real_user_data: false },
      },
      analysis: null,
    })) as typeof fetch,
  });
  assert.equal(empty.status, 'no_eligible_data');
  assert.equal(empty.product, undefined);

  clearOwnerQuantRuntimeCacheForTests();
  const failed = await requestOwnerQuantArtifacts({
    data: data(),
    subjectId: 'owner-failed',
    timezone: 'UTC',
    asOf: AS_OF,
    fetchImpl: (async () => response({ ok: false }, 502)) as typeof fetch,
  });
  assert.equal(failed.status, 'unavailable');
  assert.ok(failed.limitations.includes('QUANT_RUNTIME_HTTP_502'));

  const healthData = data();
  healthData.contextLogs.push(
    { id: 'health:healthkit:private', type: 'body', label: 'steps', value: 9999, source: 'healthkit' },
    { id: 'derived-sleep', type: 'sleep', label: 'sleep_duration', value: 100, dataProvenance: {
      schemaVersion: 'questlife.data.provenance.v1', origin: 'DERIVED', confirmation: 'NOT_REQUIRED',
      captureMethod: 'import', recordedAt: AS_OF, availableAt: AS_OF, sourceIds: ['health:raw-sleep'],
    } },
    { id: 'sensor-row', type: 'body', label: 'steps', value: 50, source: 'sensor' },
  );
  assert.equal((buildOwnerQuantSnapshot(healthData).contextLogs as unknown[]).length, 1);
  assert.equal((buildOwnerQuantSnapshot(healthData, true).contextLogs as unknown[]).length, 4);
  assert.equal(healthData.contextLogs.length, 4, 'redaction must not modify local health history');

  const base = { data: data(), subjectId: 'owner-integrity', timezone: 'UTC', asOf: AS_OF };
  const corruptions: Array<[string, (payload: ReturnType<typeof availablePayload>) => void]> = [
    ['forged subject', (p) => { p.product.metadata.subject_id = 'other-account'; }],
    ['wrong as-of', (p) => { p.as_of = '2020-01-01T00:00:00Z'; }],
    ['wrong snapshot receipt', (p) => { p.request_context.snapshot_hash = 'wrong'; }],
    ['wrong timezone receipt', (p) => { p.request_context.configured_timezone = 'Asia/Shanghai'; }],
    ['missing count', (p) => { delete (p as any).eligible_observation_count; }],
    ['negative count', (p) => { p.eligible_observation_count = -1; }],
    ['fractional count', (p) => { p.eligible_observation_count = 0.5; }],
    ['false insufficiency', (p) => { p.product.metadata.contains_real_user_data = false; }],
    ['synthetic bundle', (p) => { p.product.metadata.synthetic_only = true; }],
  ];
  for (const [name, corrupt] of corruptions) {
    clearOwnerQuantRuntimeCacheForTests();
    const rejected = await requestOwnerQuantArtifacts({ ...base, fetchImpl: async (_url, init) => {
      const payload = availablePayload(JSON.parse(String(init?.body)));
      corrupt(payload);
      return response(payload);
    } });
    assert.equal(rejected.status, 'unavailable', name);
    assert.equal(rejected.product, undefined, name);
  }
  clearOwnerQuantRuntimeCacheForTests();
  const unrelatedAnalysis = await requestOwnerQuantArtifacts({ ...base, fetchImpl: async (_url, init) => {
    const payload = availablePayload(JSON.parse(String(init?.body)));
    payload.analysis.base_bundle_id = 'another-bundle';
    return response(payload);
  } });
  assert.equal(unrelatedAnalysis.status, 'available');
  assert.equal(unrelatedAnalysis.analysis, undefined);
  assert.ok(unrelatedAnalysis.limitations.includes('QUANT_ANALYSIS_CONTEXT_MISMATCH'));

  clearOwnerQuantRuntimeCacheForTests();
  calls = 0;
  await requestOwnerQuantArtifacts({ ...base, fetchImpl: fetchAvailable });
  const corrected = data();
  corrected.executionLogs[0].durationMinutes = 40;
  await requestOwnerQuantArtifacts({ ...base, data: corrected, fetchImpl: fetchAvailable });
  const deleted = data();
  deleted.executionLogs = [];
  await requestOwnerQuantArtifacts({ ...base, data: deleted, fetchImpl: fetchAvailable });
  await requestOwnerQuantArtifacts({ ...base, timezone: 'Asia/Shanghai', fetchImpl: fetchAvailable });
  await requestOwnerQuantArtifacts({ ...base, subjectId: 'another-owner', fetchImpl: fetchAvailable });
  assert.equal(calls, 5, 'correction, deletion, timezone and subject changes must miss cache');
  await requestOwnerQuantArtifacts({ ...base, fetchImpl: fetchAvailable });
  assert.equal(calls, 6, 'cache is bounded to four entries');
  const differentTime = await requestOwnerQuantArtifacts({ ...base, asOf: '2026-01-09T07:59:00+11:00', fetchImpl: fetchAvailable });
  assert.equal(calls, 7, 'as-of changes must miss cache');
  assert.equal(differentTime.status, 'unavailable', 'previous as-of artifacts cannot be reused');
  const realNow = Date.now;
  try {
    Date.now = () => realNow() + 61_000;
    await requestOwnerQuantArtifacts({ ...base, fetchImpl: fetchAvailable });
    assert.equal(calls, 8, 'cache expires');
  } finally {
    Date.now = realNow;
  }

  clearOwnerQuantRuntimeCacheForTests();
  for (const status of [401, 403, 410, 502, 503]) {
    const result = await requestOwnerQuantArtifacts({ ...base, fetchImpl: async () => response({ ok: false }, status) });
    assert.equal(result.status, 'unavailable', `HTTP ${status} is a service/auth error, not insufficient observations`);
  }
  const timedOut = await requestOwnerQuantArtifacts({ ...base, timeoutMs: 5, fetchImpl: async (_url, init) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  }) });
  assert.ok(timedOut.limitations.includes('QUANT_RUNTIME_TIMEOUT'));

  let finish!: (value: Response) => void;
  const pending = requestOwnerQuantArtifacts({ ...base, fetchImpl: async (_url, init) => {
    const payload = availablePayload(JSON.parse(String(init?.body)));
    return new Promise<Response>((resolve) => { finish = () => resolve(response(payload)); });
  } });
  clearOwnerQuantRuntimeCacheForTests();
  finish(response({}));
  assert.equal((await pending).product, undefined, 'invalidated in-flight responses cannot return or repopulate cache');

  console.log('owner Quant runtime provider: snapshot, consent, identity, as-of, receipt, cache and failure tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
