import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useStore } from '../../store';
import { getLanguage } from '../../i18n';
import { useQuestTheme } from '../../design/useQuestTheme';
import { buildOwnerQuantSnapshot, loadOwnerQuantArtifacts } from '../../adaptive-decision/ownerQuantRuntime';
import { withDeviceObservations } from '../../platform/health/normalization';
import { useDeviceData } from '../../platform/useDeviceData';
import { hasInsightsV3DetailBundle, loadInsightsV3DetailBundle, loadInsightsV3InitialBundle, type InsightsV3FixtureId } from '../../insights-v3/insightsV3Source';
import { loadInsightsV3AnalysisExtension } from '../../insights-v3/insightsV3AnalysisSource';
import type { QuantProductBundleV1 } from '../../quant-product/quantProductContract';
import type { QuantAnalysisExtensionV1 } from '../../quant-product/quantAnalysisContract';
import { authService } from '../../sync-v2/supabase';
import { initialInsightsLoadState, settleInsightsLoad } from './nativeInsightsPresentation';
import NativeInsightsWorkspace from './NativeInsightsWorkspace';
import RecordBackupActions from '../../backup/RecordBackupActions';
import type { InsightsEntrances } from './nativeInsightsCatalog';

export default function NativeInsightsExperience(entrances: InsightsEntrances) {
  const { data } = useStore(); const device = useDeviceData(); const q = useQuestTheme(data.settings.selectedThemeId); const lang = getLanguage(data.settings.language);
  const observations = useMemo(() => withDeviceObservations(data, device.data.observations), [data, device.data.observations]);
  const snapshot = useMemo(() => JSON.stringify(buildOwnerQuantSnapshot(observations, true)), [observations]);
  const [owner, setOwner] = useState(initialInsightsLoadState);
  const [example, setExample] = useState<{ bundle: QuantProductBundleV1; analysis: QuantAnalysisExtensionV1 | null } | null>(null);
  const [mode, setMode] = useState<'owner' | 'sample'>('owner'); const [exampleBusy, setExampleBusy] = useState(false); const [exampleError, setExampleError] = useState(false);
  const request = useRef(0); const exampleRequest = useRef(0); const pending = useRef(false);
  const latest = useRef(observations); latest.current = observations;
  const latestSnapshot = useRef(snapshot); latestSnapshot.current = snapshot;
  const focused = useIsFocused();
  const [foreground, setForeground] = useState(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const source = useRef<{ snapshot: string; userId: string | null | undefined } | null>(null);
  useEffect(() => {
    let active = true; let observed = false;
    let knownUser: string | null | undefined;
    const observe = (id: string | null) => {
      if (!active || knownUser === id) return;
      knownUser = id; request.current += 1; pending.current = false;
      setOwner(initialInsightsLoadState); setUserId(id);
    };
    const stop = authService.subscribe(session => {
      observed = true;
      observe(session?.userId ?? null);
    });
    void authService.getUserId().then(id => { if (!observed) observe(id); })
      .catch(() => { if (!observed) observe(null); });
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') { request.current += 1; pending.current = false; }
      setForeground(state === 'active');
    });
    return () => { active = false; stop(); subscription.remove(); request.current += 1; exampleRequest.current += 1; };
  }, []);
  const refresh = useCallback(async () => {
    if (pending.current || mode !== 'owner' || !focused || !foreground || userId === undefined) return;
    pending.current = true; const ticket = ++request.current;
    setOwner(current => ({ ...current, busy: true, failure: false }));
    try {
      const result = await loadOwnerQuantArtifacts({ data: latest.current, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, asOf: new Date().toISOString() });
      if (ticket === request.current && latestSnapshot.current === snapshot) setOwner(current => settleInsightsLoad(current, result));
    } catch {
      if (ticket === request.current && latestSnapshot.current === snapshot) setOwner(current => settleInsightsLoad(current, { status: 'unavailable', eligibleObservationCount: 0, excludedObservationCount: 0, cacheHit: false, limitations: ['QUANT_RUNTIME_UNAVAILABLE'] }));
    } finally { if (ticket === request.current) pending.current = false; }
  }, [snapshot, userId, mode, focused, foreground]);
  useEffect(() => {
    // Invalidate old requests immediately; only unchanged account/data may retain a prior result on failure.
    request.current += 1; pending.current = false;
    if (source.current?.snapshot !== snapshot || source.current.userId !== userId) setOwner(initialInsightsLoadState);
    source.current = { snapshot, userId };
    void refresh();
    return () => { request.current += 1; pending.current = false; };
  }, [snapshot, userId, refresh]);
  const sample = async (id: InsightsV3FixtureId) => {
    request.current += 1; const ticket = ++exampleRequest.current; pending.current = false;
    setOwner(current => ({ ...current, busy: false })); setMode('sample'); setExample(null); setExampleBusy(true); setExampleError(false);
    try {
      const result = hasInsightsV3DetailBundle(id) ? await loadInsightsV3DetailBundle(id) : await loadInsightsV3InitialBundle(id);
      if (!result.ok) throw new Error('example_rejected');
      const extension = await loadInsightsV3AnalysisExtension(id, result.bundle.metadata.bundle_id);
      if (ticket === exampleRequest.current) setExample({ bundle: result.bundle, analysis: extension.ok ? extension.extension : null });
    } catch { if (ticket === exampleRequest.current) setExampleError(true); }
    finally { if (ticket === exampleRequest.current) setExampleBusy(false); }
  };
  const exit = () => { request.current += 1; exampleRequest.current += 1; pending.current = false; setExampleBusy(false); setExample(null); setExampleError(false); setMode('owner'); };
  const bundle = mode === 'sample' ? example?.bundle ?? null : owner.result?.product ?? null;
  return <NativeInsightsWorkspace {...entrances} renderImport={() => <RecordBackupActions />} key={`${mode}:${bundle?.metadata.subject_id ?? 'empty'}`} q={q} lang={lang} bundle={bundle} analysis={mode === 'sample' ? example?.analysis : owner.result?.analysis} state={mode === 'sample' ? { ...initialInsightsLoadState, attempted: true, busy: exampleBusy } : owner} sample={mode === 'sample'} sampleError={exampleError} deviceError={device.error} onRefresh={() => void refresh()} onSample={id => void sample(id)} onExitSample={exit} />;
}
