// Node's built-in TypeScript runner requires the extension; Expo typecheck does not.
// @ts-expect-error Test-only Node TypeScript entry.
import { isV11InsightsMode, isV11PersonalTerminalMode, isV11ProductMode, isV11TodayMode, resolveV11ProductMode } from './featureSelection.ts';

function equal(actual: unknown, expected: unknown, name: string) {
  if (actual !== expected) throw new Error(`${name}: expected ${String(expected)}, received ${String(actual)}`);
}

function runFeatureSelectionTests() {
  const defaultMode = resolveV11ProductMode(null);
  equal(defaultMode, 'owner_beta', 'root route selects owner beta');
  equal(isV11ProductMode(defaultMode), true, 'root enables V11 product');
  equal(isV11TodayMode(defaultMode), true, 'root enables V11 Today');
  equal(isV11InsightsMode(defaultMode), true, 'root enables V11 Insights');
  equal(isV11PersonalTerminalMode(defaultMode), true, 'root enables Personal Terminal');

  const explicitOwnerBeta = resolveV11ProductMode('v11-marathon');
  equal(explicitOwnerBeta, 'owner_beta', 'existing owner beta link remains valid');

  const legacy = resolveV11ProductMode('legacy');
  equal(legacy, 'legacy', 'legacy route selects rollback');
  equal(isV11ProductMode(legacy), false, 'legacy disables V11 product');
  equal(isV11TodayMode(legacy), false, 'legacy disables V11 Today');
  equal(isV11InsightsMode(legacy), false, 'legacy disables V11 Insights');

  const stage2 = resolveV11ProductMode('stage2');
  equal(isV11TodayMode(stage2), true, 'stage2 keeps V11 Today');
  equal(isV11InsightsMode(stage2), false, 'stage2 keeps legacy Insights');

  const insights = resolveV11ProductMode('stage3-insights');
  equal(isV11TodayMode(insights), false, 'insights route keeps legacy Today');
  equal(isV11InsightsMode(insights), true, 'insights route enables V11 Insights');
  equal(isV11PersonalTerminalMode(insights), false, 'insights route excludes Personal Terminal');

  const personalTerminal = resolveV11ProductMode('stage3-personal-terminal');
  equal(isV11TodayMode(personalTerminal), true, 'personal terminal route enables V11 Today');
  equal(isV11PersonalTerminalMode(personalTerminal), true, 'personal terminal route enables Personal Terminal');

  const insightsV3 = resolveV11ProductMode('insights-v3');
  equal(insightsV3, 'insights_v3', 'Insights V3 route is explicit');
  equal(isV11TodayMode(insightsV3), false, 'Insights V3 keeps legacy Today');
  equal(isV11InsightsMode(insightsV3), true, 'Insights V3 owns only Insights');
  equal(isV11PersonalTerminalMode(insightsV3), false, 'Insights V3 excludes prior Personal Terminal');

  const reconstruction = resolveV11ProductMode('insights-reconstruction');
  equal(reconstruction, 'insights_reconstruction', 'reconstruction route is isolated');
  equal(isV11TodayMode(reconstruction), false, 'reconstruction route keeps legacy Today');
  equal(isV11InsightsMode(reconstruction), true, 'reconstruction route owns only Insights');
  equal(isV11PersonalTerminalMode(reconstruction), false, 'reconstruction route excludes prior Personal Terminal');

  const unknown = resolveV11ProductMode('unrecognized-route');
  equal(unknown, 'owner_beta', 'unknown route fails open to current product');
}

runFeatureSelectionTests();
