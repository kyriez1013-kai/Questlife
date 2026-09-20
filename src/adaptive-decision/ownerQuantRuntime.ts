import type { AppData } from '../types';
import { apiUrl } from '../platform/apiUrl';
import {
  parseQuantAnalysisExtensionV1,
  type QuantAnalysisExtensionV1,
} from '../quant-product/quantAnalysisContract';
import {
  parseQuantProductBundleV1,
  type QuantProductBundleV1,
} from '../quant-product/quantProductContract';

export const OWNER_QUANT_RUNTIME_VERSION = 'questlife.owner-quant-runtime-client.v1' as const;

const REQUEST_TIMEOUT_MS = 22_000;
const MAX_CLIENT_CACHE_ENTRIES = 4;
const CACHE_TTL_MS = 60_000;
const PRIVATE_KEYS = new Set([
  'description',
  'doNot',
  'firstStep',
  'headlineInsight',
  'label',
  'name',
  'note',
  'notes',
  'orphanedSkillName',
  'rawText',
  'text',
  'title',
]);
const PRIVATE_CONTAINERS = new Set(['actualData', 'parsed', 'predictionData']);
const STRUCTURED_KEYS = new Set([
  'durationMinutes',
  'extraWeight',
  'isCustomAction',
  'quality',
  'reps',
  'rpe',
  'sets',
  'source',
  'weight',
]);
const REGISTERED_CONTEXT_LABELS = new Set([
  'sleep_duration',
  'deep_sleep',
  'rem_sleep',
  'resting_heart_rate',
  'hrv',
  'steps',
  'workout_minutes',
  'caffeine',
]);
const SNAPSHOT_COLLECTIONS: Array<keyof AppData> = [
  'goals',
  'categories',
  'modules',
  'moduleSkillLinks',
  'skills',
  'actions',
  'executionLogs',
  'effortUnits',
  'contributionLinks',
  'rescueLogs',
  'stateCheckIns',
  'contextLogs',
  'decisionResults',
  'patternMemory',
  'scheduleBlocks',
  'rawCaptures',
];

type FetchLike = typeof fetch;

export type OwnerQuantRuntimeArtifacts = {
  status: 'available' | 'no_eligible_data' | 'unavailable';
  product?: QuantProductBundleV1;
  analysis?: QuantAnalysisExtensionV1;
  eligibleObservationCount: number;
  excludedObservationCount: number;
  cacheHit: boolean;
  sourceSnapshotHash?: string;
  limitations: string[];
};

function cleanValue(value: unknown, parentKey?: string): unknown {
  if (Array.isArray(value)) return value.map((item) => cleanValue(item, parentKey));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => {
    if (PRIVATE_KEYS.has(key) || PRIVATE_CONTAINERS.has(key)) return [];
    if (parentKey === 'structuredData' && !STRUCTURED_KEYS.has(key)) return [];
    const cleaned = cleanValue(child, key);
    return cleaned === undefined ? [] : [[key, cleaned]];
  }));
}

function containsHealthSource(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsHealthSource);
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, child]) => {
    if (typeof child === 'string') {
      if (['source', 'sourcePlatform'].includes(key) && ['healthkit', 'health_connect', 'sensor'].includes(child)) return true;
      if (['id', 'schemaVersion', 'protocolVersion', 'instrumentVersion'].includes(key)
        && /^(health:|healthkit:|health_connect:|questlife\.(health|sleep)\.)/.test(child)) return true;
    }
    if (key === 'sourceIds' && Array.isArray(child)
      && child.some((id) => typeof id === 'string' && /^(health:|healthkit:|health_connect:)/.test(id))) return true;
    return containsHealthSource(child);
  });
}

export function buildOwnerQuantSnapshot(data: AppData, healthConsent = false): Record<string, unknown> {
  const snapshot = Object.fromEntries(SNAPSHOT_COLLECTIONS.map((collection) => {
    if (collection === 'rawCaptures') return [collection, []];
    const rows = Array.isArray(data[collection]) ? data[collection] as unknown[] : [];
    const source = healthConsent ? rows : rows.filter((row) => !containsHealthSource(row));
    const cleaned = cleanValue(source, String(collection)) as Array<Record<string, unknown>>;
    if (collection === 'contextLogs') {
      source.forEach((row, index) => {
        const label = row && typeof row === 'object' ? (row as Record<string, unknown>).label : undefined;
        if (typeof label === 'string' && REGISTERED_CONTEXT_LABELS.has(label) && cleaned[index]) {
          cleaned[index].label = label;
        }
      });
    }
    return [collection, cleaned];
  }));
  return { ...snapshot, settings: {} };
}

function finiteCount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new Error('Invalid Quant observation count.');
  }
  return value;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

const responseCache = new Map<string, { result: OwnerQuantRuntimeArtifacts; expiresAt: number }>();
const pendingRequests = new Set<AbortController>();
let cacheGeneration = 0;

function clearRuntimeCache(): void {
  cacheGeneration += 1;
  responseCache.clear();
  pendingRequests.forEach((controller) => controller.abort());
}

export function clearOwnerQuantRuntimeCacheForTests(): void {
  clearRuntimeCache();
}

function unavailable(code: string): OwnerQuantRuntimeArtifacts {
  return { status: 'unavailable', eligibleObservationCount: 0, excludedObservationCount: 0, cacheHit: false, limitations: [code] };
}

function copyArtifacts(value: OwnerQuantRuntimeArtifacts): OwnerQuantRuntimeArtifacts {
  return JSON.parse(JSON.stringify(value)) as OwnerQuantRuntimeArtifacts;
}

async function snapshotDigest(serialized: string): Promise<string> {
  if (globalThis.crypto?.subtle) {
    const hash = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(serialized));
    return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  const crypto = await import('expo-crypto');
  return crypto.digestStringAsync(crypto.CryptoDigestAlgorithm.SHA256, serialized);
}

type RequestInput = {
  data: AppData;
  subjectId: string;
  timezone: string;
  asOf: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  healthConsent?: boolean;
};

/** Explicit fetch injection is the transport test seam; normal calls always authenticate. */
export async function requestOwnerQuantArtifacts(input: RequestInput): Promise<OwnerQuantRuntimeArtifacts> {
  if (!input.fetchImpl) return authenticatedRequest(input);
  return performRequest(input);
}

async function performRequest(input: RequestInput, accessToken?: string): Promise<OwnerQuantRuntimeArtifacts> {
  const snapshot = buildOwnerQuantSnapshot(input.data, input.healthConsent === true);
  const serializedSnapshot = JSON.stringify(snapshot);
  // Exact serialized content avoids the old 32-bit hash collision and delimiter ambiguity.
  const cacheKey = JSON.stringify([Boolean(accessToken), input.subjectId, input.timezone, input.asOf, input.healthConsent === true, serializedSnapshot]);
  const generation = cacheGeneration;
  const cached = responseCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return { ...copyArtifacts(cached.result), cacheHit: true };

  const controller = new AbortController();
  pendingRequests.add(controller);
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? REQUEST_TIMEOUT_MS);
  try {
    const response = await (input.fetchImpl ?? fetch)(apiUrl('/api/decision-quant'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      signal: controller.signal,
      cache: 'no-store',
      redirect: 'error',
      body: JSON.stringify({
        runtimeVersion: OWNER_QUANT_RUNTIME_VERSION,
        subjectId: input.subjectId,
        configuredTimezone: input.timezone,
        asOf: input.asOf,
        appData: snapshot,
      }),
    });
    if (!response.ok) {
      if (accessToken && (response.status === 401 || response.status === 403)) clearRuntimeCache();
      return {
        status: 'unavailable',
        eligibleObservationCount: 0,
        excludedObservationCount: 0,
        cacheHit: false,
        limitations: [`QUANT_RUNTIME_HTTP_${response.status}`],
      };
    }
    const raw = asRecord(await response.json());
    if (generation !== cacheGeneration) return unavailable('QUANT_RUNTIME_CONTEXT_CHANGED');
    if (raw?.ok !== true) throw new Error('Invalid Quant runtime response.');
    const receipt = asRecord(raw.request_context);
    if (accessToken || receipt) {
      if (!receipt || receipt.subject_id !== input.subjectId || receipt.as_of !== input.asOf
        || receipt.configured_timezone !== input.timezone
        || receipt.snapshot_hash !== await snapshotDigest(serializedSnapshot)) {
        return unavailable('QUANT_REQUEST_CONTEXT_MISMATCH');
      }
    }
    if (generation !== cacheGeneration) return unavailable('QUANT_RUNTIME_CONTEXT_CHANGED');
    const eligibleObservationCount = finiteCount(raw.eligible_observation_count);
    const excludedObservationCount = finiteCount(raw.excluded_observation_count);
    const parsedProduct = parseQuantProductBundleV1(raw.product);
    if (!parsedProduct.ok && 'issues' in parsedProduct) {
      return {
        status: 'unavailable',
        eligibleObservationCount,
        excludedObservationCount,
        cacheHit: Boolean(raw.cache_hit),
        sourceSnapshotHash: typeof raw.source_snapshot_hash === 'string' ? raw.source_snapshot_hash : undefined,
        limitations: ['QUANT_PRODUCT_CONTRACT_REJECTED', ...parsedProduct.issues.slice(0, 3)],
      };
    }
    const metadata = parsedProduct.bundle.metadata;
    if (metadata.subject_id !== input.subjectId || Date.parse(metadata.as_of) !== Date.parse(input.asOf)
      || (raw.as_of !== undefined && (typeof raw.as_of !== 'string' || Date.parse(raw.as_of) !== Date.parse(input.asOf)))) {
      return unavailable('QUANT_PRODUCT_CONTEXT_MISMATCH');
    }
    if (parsedProduct.bundle.metadata.synthetic_only) {
      return {
        status: 'unavailable',
        eligibleObservationCount: 0,
        excludedObservationCount,
        cacheHit: Boolean(raw.cache_hit),
        limitations: ['SYNTHETIC_QUANT_EXCLUDED_FROM_OWNER_MODE'],
      };
    }
    if (metadata.contains_real_user_data !== (eligibleObservationCount > 0)) {
      return unavailable('QUANT_OBSERVATION_PROVENANCE_MISMATCH');
    }
    if (eligibleObservationCount === 0) {
      return {
        status: 'no_eligible_data',
        eligibleObservationCount: 0,
        excludedObservationCount,
        cacheHit: Boolean(raw.cache_hit),
        sourceSnapshotHash: typeof raw.source_snapshot_hash === 'string' ? raw.source_snapshot_hash : undefined,
        limitations: ['NO_ELIGIBLE_OWNER_QUANT_OBSERVATIONS'],
      };
    }

    const parsedAnalysis = raw.analysis == null ? null : parseQuantAnalysisExtensionV1(raw.analysis);
    const limitations = Array.isArray(raw.limitations)
      ? raw.limitations.filter((item): item is string => typeof item === 'string')
      : [];
    if (parsedAnalysis?.ok === false) limitations.push('QUANT_ANALYSIS_CONTRACT_REJECTED');
    const analysis = parsedAnalysis?.ok === true ? parsedAnalysis.extension : undefined;
    const analysisMatches = analysis && analysis.base_bundle_id === metadata.bundle_id
      && Date.parse(analysis.as_of) === Date.parse(input.asOf)
      && !analysis.synthetic_only && analysis.contains_real_user_data;
    if (analysis && !analysisMatches) limitations.push('QUANT_ANALYSIS_CONTEXT_MISMATCH');
    const result: OwnerQuantRuntimeArtifacts = {
      status: 'available',
      product: parsedProduct.bundle,
      analysis: analysisMatches ? analysis : undefined,
      eligibleObservationCount,
      excludedObservationCount,
      cacheHit: Boolean(raw.cache_hit),
      sourceSnapshotHash: typeof raw.source_snapshot_hash === 'string' ? raw.source_snapshot_hash : undefined,
      limitations: Array.from(new Set(limitations)),
    };
    if (responseCache.size >= MAX_CLIENT_CACHE_ENTRIES) {
      responseCache.delete(responseCache.keys().next().value as string);
    }
    if (generation !== cacheGeneration) return unavailable('QUANT_RUNTIME_CONTEXT_CHANGED');
    responseCache.set(cacheKey, { result: copyArtifacts(result), expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  } catch {
    return {
      status: 'unavailable',
      eligibleObservationCount: 0,
      excludedObservationCount: 0,
      cacheHit: false,
      limitations: [controller.signal.aborted
        ? 'QUANT_RUNTIME_TIMEOUT'
        : 'QUANT_RUNTIME_UNAVAILABLE'],
    };
  } finally {
    clearTimeout(timeout);
    pendingRequests.delete(controller);
  }
}

type SupabaseAuth = ReturnType<typeof import('../sync-v2/supabase').supabaseClient>['auth'];
let observedAuth: SupabaseAuth | undefined;
let observedUser: string | null = null;
let observedConsent: string | null = null;
let stopAuthObservation: (() => void) | undefined;

function observeUser(userId: string | null, force = false): void {
  if (force || userId !== observedUser) {
    clearRuntimeCache();
    observedConsent = null;
  }
  observedUser = userId;
}

async function authenticatedRequest(input: Omit<RequestInput, 'subjectId'> & { subjectId?: string }): Promise<OwnerQuantRuntimeArtifacts> {
  try {
    // Lazy imports keep the injected-fetch tests independent of native/session storage.
    const { authConfigured, supabaseClient } = await import('../sync-v2/supabase');
    if (!authConfigured()) return unavailable('QUANT_AUTH_NOT_CONFIGURED');
    const auth = supabaseClient().auth;
    if (auth !== observedAuth) {
      stopAuthObservation?.();
      clearRuntimeCache();
      observedAuth = auth;
      const { data } = auth.onAuthStateChange((event, session) => {
        observeUser(session?.user.id ?? null, event === 'SIGNED_OUT');
      });
      stopAuthObservation = () => data.subscription.unsubscribe();
    }
    const beforeSession = cacheGeneration;
    const { data, error } = await auth.getSession();
    const session = data.session;
    if (error || !session?.access_token) {
      observeUser(null, true);
      return unavailable('QUANT_AUTH_REQUIRED');
    }
    if (beforeSession !== cacheGeneration && observedUser !== session.user.id) {
      return unavailable('QUANT_RUNTIME_CONTEXT_CHANGED');
    }
    observeUser(session.user.id);
    let generation = cacheGeneration;
    if (input.subjectId !== undefined && input.subjectId !== session.user.id) {
      return unavailable('QUANT_AUTH_SUBJECT_MISMATCH');
    }
    const { readSyncState } = await import('../sync-v2/runtime');
    const state = await readSyncState();
    if (state.ownerId !== session.user.id) {
      clearRuntimeCache();
      return unavailable('QUANT_LOCAL_ACCOUNT_MISMATCH');
    }
    if (generation !== cacheGeneration) return unavailable('QUANT_RUNTIME_CONTEXT_CHANGED');
    const consentKey = JSON.stringify([session.user.id, state.healthConsent === true]);
    if (observedConsent !== consentKey) {
      clearRuntimeCache();
      observedConsent = consentKey;
      generation = cacheGeneration;
    }
    const result = await performRequest({
      ...input,
      subjectId: session.user.id,
      healthConsent: state.healthConsent === true,
    }, session.access_token);
    const current = await auth.getSession();
    const currentState = await readSyncState();
    if (generation !== cacheGeneration || current.error || current.data.session?.user.id !== session.user.id
      || currentState.ownerId !== session.user.id || currentState.healthConsent !== state.healthConsent) {
      clearRuntimeCache();
      return unavailable('QUANT_RUNTIME_CONTEXT_CHANGED');
    }
    return result;
  } catch {
    clearRuntimeCache();
    return unavailable('QUANT_AUTH_OR_CONSENT_UNAVAILABLE');
  }
}

export async function loadOwnerQuantArtifacts(input: {
  data: AppData;
  timezone: string;
  asOf: string;
}): Promise<OwnerQuantRuntimeArtifacts> {
  return authenticatedRequest(input);
}
