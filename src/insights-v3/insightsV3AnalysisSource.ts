import type { QuantAnalysisExtensionV1 } from '../quant-product/quantAnalysisContract';
import { parseQuantAnalysisExtensionV1 } from '../quant-product/quantAnalysisContract';
import type { InsightsV3FixtureId } from './insightsV3Source';

type JsonModule = { default?: unknown } & Record<string, unknown>;
type Loader = () => Promise<JsonModule>;

const sources: Partial<Record<InsightsV3FixtureId, Loader>> = {
  'sparse-1': () => import('../quant-product/fixtures/one_observation_analysis_v1.json'),
  forming: () => import('../quant-product/fixtures/forming_history_analysis_v1.json'),
  mature: () => import('../quant-product/fixtures/mature_market_analysis_v1.json'),
  drivers: () => import('../quant-product/fixtures/analysis_extension_v1.json'),
};

export type InsightsV3AnalysisLoadResult =
  | { ok: true; extension: QuantAnalysisExtensionV1; durationMs: number }
  | { ok: false; code: 'NOT_AVAILABLE' | 'INVALID_CONTRACT' | 'BASE_BUNDLE_MISMATCH' | 'UNSAFE_PROVENANCE' | 'LOAD_FAILED'; issues: string[]; durationMs: number };

const cache = new Map<string, Promise<InsightsV3AnalysisLoadResult>>();

function now() {
  return typeof performance === 'undefined' ? Date.now() : performance.now();
}

function payload(module: JsonModule) {
  return module.default ?? module;
}

export function hasInsightsV3AnalysisExtension(fixtureId: InsightsV3FixtureId) {
  return Boolean(sources[fixtureId]);
}

export function loadInsightsV3AnalysisExtension(
  fixtureId: InsightsV3FixtureId,
  baseBundleId: string,
): Promise<InsightsV3AnalysisLoadResult> {
  const key = `${fixtureId}:${baseBundleId}`;
  const existing = cache.get(key);
  if (existing) return existing;
  const pending = (async (): Promise<InsightsV3AnalysisLoadResult> => {
    const startedAt = now();
    const loader = sources[fixtureId];
    if (!loader) return { ok: false, code: 'NOT_AVAILABLE', issues: ['No analysis extension is registered for this fixture.'], durationMs: now() - startedAt };
    try {
      const module = await loader();
      const parsed = parseQuantAnalysisExtensionV1(payload(module));
      if (parsed.ok === false) return { ok: false, code: 'INVALID_CONTRACT', issues: parsed.issues, durationMs: now() - startedAt };
      if (parsed.extension.base_bundle_id !== baseBundleId) {
        return { ok: false, code: 'BASE_BUNDLE_MISMATCH', issues: ['Analysis extension does not match the active Product Bundle.'], durationMs: now() - startedAt };
      }
      if (!parsed.extension.synthetic_only || parsed.extension.contains_real_user_data) {
        return { ok: false, code: 'UNSAFE_PROVENANCE', issues: ['Review analysis accepts synthetic, non-owner evidence only.'], durationMs: now() - startedAt };
      }
      return { ok: true, extension: parsed.extension, durationMs: now() - startedAt };
    } catch (error) {
      return {
        ok: false,
        code: 'LOAD_FAILED',
        issues: [error instanceof Error ? error.message : 'Unknown analysis extension failure.'],
        durationMs: now() - startedAt,
      };
    }
  })();
  cache.set(key, pending);
  return pending;
}

export function clearInsightsV3AnalysisCacheForTests() {
  cache.clear();
}
