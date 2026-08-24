import type { QuantProductBundleV1, QuantProductParseFailureCode } from '../quant-product/quantProductContract';
import { parseQuantProductBundleV1 } from '../quant-product/quantProductContract';

export type InsightsV3FixtureId =
  | 'empty'
  | 'sparse-1'
  | 'sparse-3'
  | 'forming'
  | 'sparse-10'
  | 'mature'
  | 'drivers'
  | 'similar'
  | 'recovery'
  | 'scenario'
  | 'research-filtered'
  | 'goal'
  | 'skill';

export type InsightsV3BundleLoadResult =
  | {
    ok: true;
    bundle: QuantProductBundleV1;
    fixtureId: InsightsV3FixtureId;
    phase: 'initial' | 'detail';
    warnings: string[];
    durationMs: number;
  }
  | {
    ok: false;
    code: QuantProductParseFailureCode | 'UNSAFE_FIXTURE_PROVENANCE' | 'DETAIL_NOT_AVAILABLE' | 'LOAD_FAILED';
    fixtureId: InsightsV3FixtureId;
    phase: 'initial' | 'detail';
    issues: string[];
    durationMs: number;
  };

type JsonModule = { default?: unknown } & Record<string, unknown>;
type Loader = () => Promise<JsonModule>;
type FixtureSource = { initial: Loader; detail?: Loader; initialIsFull?: boolean };

const fixtureSources: Record<InsightsV3FixtureId, FixtureSource> = {
  empty: {
    initial: () => import('../quant-product/fixtures/no_data_compact.json'),
  },
  'sparse-1': {
    initial: () => import('../quant-product/fixtures/one_observation_full.json'),
    initialIsFull: true,
  },
  'sparse-3': {
    initial: () => import('../quant-product/fixtures/three_observations_full.json'),
    initialIsFull: true,
  },
  forming: {
    initial: () => import('../quant-product/fixtures/forming_history_full.json'),
    initialIsFull: true,
  },
  'sparse-10': {
    initial: () => import('../quant-product/fixtures/ten_observations_full.json'),
    initialIsFull: true,
  },
  mature: {
    initial: () => import('../quant-product/fixtures/mature_market_compact.json'),
    detail: () => import('../quant-product/fixtures/mature_market_full.json'),
  },
  drivers: {
    initial: () => import('../quant-product/fixtures/driver_analysis_compact.json'),
    detail: () => import('../quant-product/fixtures/driver_analysis_full.json'),
  },
  similar: {
    initial: () => import('../quant-product/fixtures/similar_periods_compact.json'),
    detail: () => import('../quant-product/fixtures/similar_periods_full.json'),
  },
  recovery: {
    initial: () => import('../quant-product/fixtures/recovery_compact.json'),
    detail: () => import('../quant-product/fixtures/recovery_full.json'),
  },
  scenario: {
    initial: () => import('../quant-product/fixtures/scenario_compact.json'),
    detail: () => import('../quant-product/fixtures/scenario_full.json'),
  },
  'research-filtered': {
    initial: () => import('../quant-product/fixtures/research_filtered_compact.json'),
  },
  goal: {
    initial: () => import('../quant-product/fixtures/goal_full.json'),
    initialIsFull: true,
  },
  skill: {
    initial: () => import('../quant-product/fixtures/skill_full.json'),
    initialIsFull: true,
  },
};

const loadCache = new Map<string, Promise<InsightsV3BundleLoadResult>>();

function now() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function modulePayload(module: JsonModule): unknown {
  return module.default ?? module;
}

export function isInsightsV3FixtureId(value: string | null): value is InsightsV3FixtureId {
  return value != null && Object.prototype.hasOwnProperty.call(fixtureSources, value);
}

export function resolveInsightsV3FixtureId(search: string): InsightsV3FixtureId | null {
  const value = new URLSearchParams(search.startsWith('?') ? search : `?${search}`).get('quantProductFixture');
  return isInsightsV3FixtureId(value) ? value : null;
}

export function isSafeReviewBundle(bundle: QuantProductBundleV1) {
  return bundle.metadata.synthetic_only === true && bundle.metadata.contains_real_user_data === false;
}

export function hasInsightsV3DetailBundle(fixtureId: InsightsV3FixtureId) {
  return Boolean(fixtureSources[fixtureId].detail);
}

export function isInsightsV3InitialFullBundle(fixtureId: InsightsV3FixtureId) {
  return Boolean(fixtureSources[fixtureId].initialIsFull);
}

function debugEnabled() {
  return typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('debugInsightsV3') === '1';
}

function recordMetric(result: InsightsV3BundleLoadResult) {
  if (!debugEnabled() || typeof window === 'undefined') return;
  const target = window as typeof window & { __questlifeInsightsV3Metrics?: Record<string, unknown> };
  const current = target.__questlifeInsightsV3Metrics || {};
  const metric = {
    ok: result.ok,
    durationMs: Math.round(result.durationMs * 10) / 10,
    bundleMode: result.ok ? result.bundle.metadata.mode : null,
    measuredAt: new Date().toISOString(),
  };
  target.__questlifeInsightsV3Metrics = {
    ...current,
    [`${result.fixtureId}:${result.phase}`]: metric,
  };
  console.info('[insights-v3 bundle]', JSON.stringify({ phase: result.phase, fixtureId: result.fixtureId, ...metric }));
}

async function loadFixture(
  fixtureId: InsightsV3FixtureId,
  phase: 'initial' | 'detail',
): Promise<InsightsV3BundleLoadResult> {
  const cacheKey = `${fixtureId}:${phase}`;
  const cached = loadCache.get(cacheKey);
  if (cached) return cached;

  const pending = (async (): Promise<InsightsV3BundleLoadResult> => {
    const startedAt = now();
    const source = fixtureSources[fixtureId];
    const loader = phase === 'detail' ? source.detail : source.initial;
    if (!loader) {
      const result: InsightsV3BundleLoadResult = {
        ok: false,
        code: 'DETAIL_NOT_AVAILABLE',
        fixtureId,
        phase,
        issues: ['No validated detail bundle is registered for this fixture.'],
        durationMs: now() - startedAt,
      };
      recordMetric(result);
      return result;
    }
    try {
      const module = await loader();
      const parsed = parseQuantProductBundleV1(modulePayload(module));
      if (parsed.ok === false) {
        const result: InsightsV3BundleLoadResult = {
          ok: false,
          code: parsed.code,
          fixtureId,
          phase,
          issues: parsed.issues,
          durationMs: now() - startedAt,
        };
        if (debugEnabled()) console.warn('[insights-v3 contract rejected]', result.code, result.issues);
        recordMetric(result);
        return result;
      }
      if (!isSafeReviewBundle(parsed.bundle)) {
        const result: InsightsV3BundleLoadResult = {
          ok: false,
          code: 'UNSAFE_FIXTURE_PROVENANCE',
          fixtureId,
          phase,
          issues: ['Fixture mode accepts synthetic, non-owner bundles only.'],
          durationMs: now() - startedAt,
        };
        recordMetric(result);
        return result;
      }
      const result: InsightsV3BundleLoadResult = {
        ok: true,
        bundle: parsed.bundle,
        fixtureId,
        phase,
        warnings: parsed.warnings,
        durationMs: now() - startedAt,
      };
      recordMetric(result);
      return result;
    } catch (error) {
      const result: InsightsV3BundleLoadResult = {
        ok: false,
        code: 'LOAD_FAILED',
        fixtureId,
        phase,
        issues: [error instanceof Error ? error.message : 'Unknown bundle load failure.'],
        durationMs: now() - startedAt,
      };
      if (debugEnabled()) console.warn('[insights-v3 bundle load failed]', result.issues[0]);
      recordMetric(result);
      return result;
    }
  })();
  loadCache.set(cacheKey, pending);
  return pending;
}

export function loadInsightsV3InitialBundle(fixtureId: InsightsV3FixtureId) {
  return loadFixture(fixtureId, 'initial');
}

export function loadInsightsV3DetailBundle(fixtureId: InsightsV3FixtureId) {
  return loadFixture(fixtureId, 'detail');
}

export function clearInsightsV3BundleCacheForTests() {
  loadCache.clear();
}
