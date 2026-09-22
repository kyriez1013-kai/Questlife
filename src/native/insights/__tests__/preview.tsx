import React, { useEffect, useState } from 'react';
import { AppRegistry, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getQuestTheme } from '../../../design/tokens';
import { isInsightsV3FixtureId, hasInsightsV3DetailBundle, loadInsightsV3DetailBundle, loadInsightsV3InitialBundle, type InsightsV3FixtureId } from '../../../insights-v3/insightsV3Source';
import { loadInsightsV3AnalysisExtension } from '../../../insights-v3/insightsV3AnalysisSource';
import type { QuantProductBundleV1 } from '../../../quant-product/quantProductContract';
import type { QuantAnalysisExtensionV1 } from '../../../quant-product/quantAnalysisContract';
import NativeInsightsWorkspace from '../NativeInsightsWorkspace';
import { initialInsightsLoadState } from '../nativeInsightsPresentation';
import { createInsightsEntrances } from '../nativeInsightsCatalog';

function Preview() {
  const [events, setEvents] = useState<string[]>([]);
  const record = (event: string) => setEvents(current => [...current, event]);
  const entrances = createInsightsEntrances({ navigate: (name, params) => record(`navigate:${name}:${params?.screen ?? ''}`) }, intent => record(`intent:${intent.kind}:${intent.action}`));
  const params = new URLSearchParams(location.search);
  const initial = params.get('fixture'); const [id, setId] = useState<InsightsV3FixtureId | null>(isInsightsV3FixtureId(initial) ? initial : null);
  const [bundle, setBundle] = useState<QuantProductBundleV1 | null>(null); const [analysis, setAnalysis] = useState<QuantAnalysisExtensionV1 | null>(null); const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true; setBundle(null); setAnalysis(null);
    if (!id) return;
    setBusy(true);
    void (async () => {
      const result = hasInsightsV3DetailBundle(id) ? await loadInsightsV3DetailBundle(id) : await loadInsightsV3InitialBundle(id);
      if (!result.ok) throw new Error('fixture_rejected');
      const extension = await loadInsightsV3AnalysisExtension(id, result.bundle.metadata.bundle_id);
      if (active) { setBundle(result.bundle); setAnalysis(extension.ok ? extension.extension : null); setBusy(false); }
    })();
    return () => { active = false; };
  }, [id]);
  const failure = ['error', 'signed-out', 'unconfigured'].includes(params.get('state') ?? '');
  return <SafeAreaProvider><NativeInsightsWorkspace {...entrances} renderImport={() => <Text>Preview boundary: native backup picker is not mounted.</Text>} key={id ?? 'owner'} q={getQuestTheme(params.get('theme') === 'dark' ? 'dark' : 'light')} lang={params.get('lang') === 'zh' ? 'zh' : 'en'} bundle={bundle} analysis={analysis} sample={id !== null} state={{ ...initialInsightsLoadState, busy: busy || params.get('state') === 'loading', attempted: params.get('state') === 'empty', failure, result: failure ? { status: 'unavailable', eligibleObservationCount: 0, excludedObservationCount: 0, cacheHit: false, limitations: [params.get('state') === 'signed-out' ? 'QUANT_AUTH_REQUIRED' : params.get('state') === 'unconfigured' ? 'QUANT_AUTH_NOT_CONFIGURED' : 'QUANT_RUNTIME_UNAVAILABLE'] } : null }} onRefresh={() => record('analysis:explicit-load')} onSample={setId} onExitSample={() => setId(null)} /><Text accessibilityLabel="Preview action log">{events.join('\n')}</Text></SafeAreaProvider>;
}
AppRegistry.registerComponent('NativeInsightsPreview', () => Preview);
AppRegistry.runApplication('NativeInsightsPreview', { rootTag: document.getElementById('root') });
