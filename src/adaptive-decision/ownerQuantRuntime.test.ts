import assert from 'node:assert/strict';
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

async function main() {
  const snapshot = buildOwnerQuantSnapshot(data());
  const serialized = JSON.stringify(snapshot);
  assert.ok(!serialized.includes('PRIVATE GOAL'));
  assert.ok(!serialized.includes('PRIVATE RAW TEXT'));
  assert.ok(!serialized.includes('PRIVATE NOTE'));
  assert.equal((snapshot.contextLogs as Array<Record<string, unknown>>)[0].label, 'steps');

  clearOwnerQuantRuntimeCacheForTests();
  let calls = 0;
  const fetchAvailable = async () => {
    calls += 1;
    return response({
      ok: true,
      eligible_observation_count: 12,
      excluded_observation_count: 2,
      cache_hit: false,
      source_snapshot_hash: 'owner-hash',
      product: {
        ...formingBundle,
        metadata: { ...formingBundle.metadata, synthetic_only: false, contains_real_user_data: true },
      },
      analysis: {
        ...analysisExtension,
        synthetic_only: false,
        contains_real_user_data: true,
      },
      limitations: ['OBSERVATIONAL_NOT_CAUSAL'],
    });
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
  const cached = await requestOwnerQuantArtifacts({
    data: data(),
    subjectId: 'owner-test',
    timezone: 'UTC',
    asOf: AS_OF,
    fetchImpl: fetchAvailable as typeof fetch,
  });
  assert.equal(cached.cacheHit, true);
  assert.equal(calls, 1);

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
        metadata: { ...noDataBundle.metadata, synthetic_only: false, contains_real_user_data: false },
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

  console.log('owner Quant runtime provider: passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
