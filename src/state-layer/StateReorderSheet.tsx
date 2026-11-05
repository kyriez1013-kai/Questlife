import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useStore } from '../store';
import type { V11ThemeTokens } from '../v11/tokens';
import V11Stage2ProductionSheet from '../v11-stage2-rebaseline/V11Stage2ProductionSheet';
import { V11SheetButton, V11StickySheetFooter } from '../v11/components/V11SheetControls';
import { DEMAND_LABEL, TYPE_NAME, sl, type Lang } from './copy';
import { DEMAND_ORDER, inferDemand, reorderToday } from './reorder';
import { localYmd } from './signals';
import { DEMANDS, type Demand, type StateTypeOrUnclear } from './types';
import { errorReason, useStateLayerPlan, type AppliedPlan } from './useStateLayerActions';
import type { DecisionPlanPatchV1 } from '../adaptive-decision/decisionEpisode';

const WebView = View as any;
const WebPressable = Pressable as any;
type PreviewRow = { id: string; title: string; fixed: boolean; before: string; after: string; moved: boolean; demand: Demand; inferred: boolean };

/** Preview → explicit confirm → apply (undo lives on the state card). Nothing is applied on open. */
export default function StateReorderSheet({
  lang,
  onApplied,
  onClose,
  reducedMotion,
  ruleId,
  theme,
  type,
  visible,
}: {
  lang: Lang;
  onApplied: (plan: AppliedPlan) => void;
  onClose: () => void;
  reducedMotion: boolean;
  ruleId: string;
  theme: V11ThemeTokens;
  type: Exclude<StateTypeOrUnclear, 'unclear'>;
  visible: boolean;
}) {
  const { data } = useStore();
  const plan = useStateLayerPlan();
  const [overrides, setOverrides] = useState<Record<string, Demand>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{ patch: DecisionPlanPatchV1; rows: PreviewRow[] } | null>(null);
  const inFlight = useRef(false);
  const locked = busy || confirmed !== null;
  const now = new Date();
  const date = localYmd(now);
  const blocks = data.scheduleBlocks || [];

  const computed = useMemo(() => {
    if (!visible) return null;
    const result = reorderToday({ type, date, now: new Date(), blocks, demandOverrides: overrides });
    return { result };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, type, date, blocks, overrides]);
  const [preview, setPreview] = useState<{ source: typeof computed; patch: DecisionPlanPatchV1 | null; problem: string | null } | null>(null);
  const [previewAttempt, setPreviewAttempt] = useState(0);
  const currentPreview = preview?.source === computed ? preview : null;
  useEffect(() => {
    let active = true;
    if (computed?.result.kind !== 'reordered') { setPreview(null); return; }
    setPreview(null);
    void plan.preview({ date, before: computed.result.before, after: computed.result.after }).then(patch => {
      if (active) setPreview({ source: computed, patch, problem: null });
    }).catch(error => {
      if (active) setPreview({ source: computed, patch: null, problem: errorReason(error, lang) });
    });
    return () => { active = false; };
  }, [computed, date, lang, plan.preview, previewAttempt]);

  const rows = useMemo(() => {
    if (!computed) return [];
    const after = computed.result.kind === 'reordered' ? computed.result.after : blocks.filter((b) => b.date === date);
    return after
      .filter((b) => b.status !== 'completed' && b.status !== 'skipped')
      .slice()
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .map((b) => {
        const before = blocks.find((x) => x.id === b.id)!;
        const inferred = inferDemand(before);
        const demand: Demand = overrides[b.id] ?? inferred.demand;
        return {
          id: b.id,
          title: b.title,
          fixed: b.flexibility === 'fixed' || !!b.placementLocked,
          before: `${before.startTime}–${before.endTime}`,
          after: `${b.startTime}–${b.endTime}`,
          moved: before.startTime !== b.startTime,
          demand,
          inferred: !overrides[b.id] && inferred.inferred,
        };
      });
  }, [blocks, computed, date, overrides]);

  const cycleDemand = (id: string, current: Demand) => {
    if (inFlight.current || confirmed) return;
    const next = DEMANDS[(DEMANDS.indexOf(current) + 1) % DEMANDS.length];
    setOverrides({ ...overrides, [id]: next });
  };

  const confirm = async () => {
    const submission = confirmed ?? (currentPreview?.patch ? { patch: currentPreview.patch, rows } : null);
    if (!submission || inFlight.current) return;
    inFlight.current = true;
    setConfirmed(submission);
    setBusy(true);
    setError(null);
    try {
      const applied = await plan.confirmAndApply({ patch: submission.patch, headline: `${sl(lang, 'reorder')} · ${TYPE_NAME[lang][type]}`, ruleId });
      setConfirmed(null);
      setOverrides({});
      onApplied(applied);
    } catch (e) {
      if (!plan.hasPendingApply) setConfirmed(null);
      setError(sl(lang, 'rpApplyFailed', { reason: errorReason(e, lang) }));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  const close = () => { if (!inFlight.current && !confirmed) onClose(); };

  const kind = computed?.result.kind;
  const message = kind === 'cant_fit' ? sl(lang, 'rpCantFit')
    : kind === 'unchanged' ? sl(lang, 'rpNothing')
      : currentPreview?.problem ? sl(lang, 'rpApplyFailed', { reason: currentPreview.problem })
        : kind === 'reordered' && !currentPreview ? sl(lang, 'rpChecking')
        : null;

  return (
    <V11Stage2ProductionSheet
      closeLabel={sl(lang, 'close')}
      footer={(
        <V11StickySheetFooter
          cancelLabel={sl(lang, 'rpCancel')}
          cancelDisabled={locked}
          disabled={(!confirmed && !currentPreview?.patch) || busy}
          message={error ?? undefined}
          messageStatus={error ? 'error' : 'default'}
          onCancel={close}
          onSave={() => { void confirm(); }}
          saveLabel={sl(lang, confirmed && error ? 'retry' : 'rpConfirm')}
          saving={busy}
          theme={theme}
        />
      )}
      minHeight={300}
      onClose={close}
      reducedMotion={reducedMotion}
      theme={theme}
      title={sl(lang, 'rpTitle')}
      visible={visible}
    >
      <WebView dataSet={{ 'sl-role': 'sheet-body' }}>
        <Text style={{ color: theme.text.secondary, fontSize: 12.5, lineHeight: 18 }}>
          {sl(lang, 'rpOrderBasis', { type: TYPE_NAME[lang][type], order: DEMAND_ORDER[type].map((d) => DEMAND_LABEL[lang][d]).join(' → ') })}
          {' · '}{sl(lang, 'rpFixedKept')}
        </Text>
        {message && !confirmed ? <Text style={{ color: theme.text.primary, fontSize: 14, lineHeight: 20 }}>{message}</Text> : null}
        {currentPreview?.problem && !confirmed ? <V11SheetButton label={sl(lang, 'retry')} theme={theme} variant="secondary" onPress={() => setPreviewAttempt(value => value + 1)} /> : null}
        {(confirmed?.rows ?? rows).map((r) => (
          <WebView dataSet={{ 'sl-role': 'plan-row', 'sl-moved': r.moved ? 'true' : 'false' }} key={r.id}>
            <WebView style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ color: theme.text.primary, fontSize: 14, lineHeight: 19, fontWeight: '500' }}>{r.title}</Text>
              <Text style={{ color: r.moved ? theme.text.primary : theme.text.metadata, fontSize: 12, lineHeight: 17 }}>
                {r.moved ? `${r.before} → ${r.after}` : r.after}
                {r.fixed ? ` · ${lang === 'zh' ? '固定' : 'fixed'}` : ''}
              </Text>
            </WebView>
            {!r.fixed ? (
              <WebPressable
                accessibilityLabel={`${DEMAND_LABEL[lang][r.demand]}`}
                accessibilityRole="button"
                accessibilityState={{ disabled: locked }}
                disabled={locked}
                dataSet={{ 'v11-control': 'categorical-chip', 'v11-control-file': 'src/state-layer/StateReorderSheet.tsx', 'v11-density': 'compact', 'v11-selected': 'false', 'sl-role': 'demand-chip' }}
                onPress={() => cycleDemand(r.id, r.demand)}
              >
                <Text style={{ color: theme.text.secondary, fontSize: 12 }}>
                  {DEMAND_LABEL[lang][r.demand]}{r.inferred ? ` · ${sl(lang, 'rpInferred')}` : ''}
                </Text>
              </WebPressable>
            ) : null}
          </WebView>
        ))}
      </WebView>
    </V11Stage2ProductionSheet>
  );
}
