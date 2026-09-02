import type { AppData } from '../types';
import { getAnonymousUserId } from '../utils/analytics';
import {
  parseQuantAnalysisExtensionV1,
  type QuantAnalysisExtensionV1,
} from '../quant-product/quantAnalysisContract';
import {
  parseQuantProductBundleV1,
  type QuantProductBundleV1,
} from '../quant-product/quantProductContract';

export const OWNER_QUANT_RUNTIME_VERSION = 'questlife.owner-quant-runtime-client.v1' as const;

const REQUEST_TIMEOUT_MS = 12_000;
const MAX_CLIENT_CACHE_ENTRIES = 4;
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

export function buildOwnerQuantSnapshot(data: AppData): Record<string, unknown> {
  const snapshot = Object.fromEntries(SNAPSHOT_COLLECTIONS.map((collection) => {
    if (collection === 'rawCaptures') return [collection, []];
    const source = Array.isArray(data[collection]) ? data[collection] as unknown[] : [];
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

function hashText(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function finiteCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

const responseCache = new Map<string, OwnerQuantRuntimeArtifacts>();

export function clearOwnerQuantRuntimeCacheForTests(): void {
  responseCache.clear();
}

export async function requestOwnerQuantArtifacts(input: {
  data: AppData;
  subjectId: string;
  timezone: string;
  asOf: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
}): Promise<OwnerQuantRuntimeArtifacts> {
  const snapshot = buildOwnerQuantSnapshot(input.data);
  const serializedSnapshot = JSON.stringify(snapshot);
  const cacheKey = `${input.subjectId}:${input.timezone}:${input.asOf}:${hashText(serializedSnapshot)}`;
  const cached = responseCache.get(cacheKey);
  if (cached) return { ...cached, cacheHit: true };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? REQUEST_TIMEOUT_MS);
  try {
    const response = await (input.fetchImpl ?? fetch)('/api/decision-quant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        runtimeVersion: OWNER_QUANT_RUNTIME_VERSION,
        subjectId: input.subjectId,
        configuredTimezone: input.timezone,
        asOf: input.asOf,
        appData: snapshot,
      }),
    });
    if (!response.ok) {
      return {
        status: 'unavailable',
        eligibleObservationCount: 0,
        excludedObservationCount: 0,
        cacheHit: false,
        limitations: [`QUANT_RUNTIME_HTTP_${response.status}`],
      };
    }
    const raw = asRecord(await response.json());
    if (!raw?.ok) throw new Error('Invalid Quant runtime response.');
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
    if (parsedProduct.bundle.metadata.synthetic_only) {
      return {
        status: 'unavailable',
        eligibleObservationCount: 0,
        excludedObservationCount,
        cacheHit: Boolean(raw.cache_hit),
        limitations: ['SYNTHETIC_QUANT_EXCLUDED_FROM_OWNER_MODE'],
      };
    }
    if (!parsedProduct.bundle.metadata.contains_real_user_data || eligibleObservationCount === 0) {
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
    const result: OwnerQuantRuntimeArtifacts = {
      status: 'available',
      product: parsedProduct.bundle,
      analysis: parsedAnalysis?.ok === true ? parsedAnalysis.extension : undefined,
      eligibleObservationCount,
      excludedObservationCount,
      cacheHit: Boolean(raw.cache_hit),
      sourceSnapshotHash: typeof raw.source_snapshot_hash === 'string' ? raw.source_snapshot_hash : undefined,
      limitations: Array.from(new Set(limitations)),
    };
    if (responseCache.size >= MAX_CLIENT_CACHE_ENTRIES) {
      responseCache.delete(responseCache.keys().next().value as string);
    }
    responseCache.set(cacheKey, result);
    return result;
  } catch (error) {
    return {
      status: 'unavailable',
      eligibleObservationCount: 0,
      excludedObservationCount: 0,
      cacheHit: false,
      limitations: [error instanceof DOMException && error.name === 'AbortError'
        ? 'QUANT_RUNTIME_TIMEOUT'
        : 'QUANT_RUNTIME_UNAVAILABLE'],
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function loadOwnerQuantArtifacts(input: {
  data: AppData;
  timezone: string;
  asOf: string;
}): Promise<OwnerQuantRuntimeArtifacts> {
  const subjectId = await getAnonymousUserId();
  return requestOwnerQuantArtifacts({ ...input, subjectId });
}
