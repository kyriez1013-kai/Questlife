import React, { useEffect, useState } from 'react';
import { AppRegistry } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getQuestTheme } from '../../../design/tokens';
import { isInsightsV3FixtureId, hasInsightsV3DetailBundle, loadInsightsV3DetailBundle, loadInsightsV3InitialBundle, type InsightsV3FixtureId } from '../../../insights-v3/insightsV3Source';
import { loadInsightsV3AnalysisExtension } from '../../../insights-v3/insightsV3AnalysisSource';
import type { QuantProductBundleV1 } from '../../../quant-product/quantProductContract';
import type { QuantAnalysisExtensionV1 } from '../../../quant-product/quantAnalysisContract';
import NativeInsightsWorkspace from '../NativeInsightsWorkspace';
import { initialInsightsLoadState } from '../nativeInsightsPresentation';

function Preview() {
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
  return <SafeAreaProvider><NativeInsightsWorkspace key={id ?? 'owner'} q={getQuestTheme(params.get('theme') === 'dark' ? 'dark' : 'light')} lang={params.get('lang') === 'zh' ? 'zh' : 'en'} bundle={bundle} analysis={analysis} sample={id !== null} state={{ ...initialInsightsLoadState, busy: busy || params.get('state') === 'loading', attempted: params.get('state') === 'empty', failure: params.get('state') === 'error' }} onRefresh={() => {}} onSample={setId} onExitSample={() => setId(null)} /></SafeAreaProvider>;
}
AppRegistry.registerComponent('NativeInsightsPreview', () => Preview);
AppRegistry.runApplication('NativeInsightsPreview', { rootTag: document.getElementById('root') });
