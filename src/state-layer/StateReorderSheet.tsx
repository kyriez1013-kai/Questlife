import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useStore } from '../store';
import type { V11ThemeTokens } from '../v11/tokens';
import V11Stage2ProductionSheet from '../v11-stage2-rebaseline/V11Stage2ProductionSheet';
import { V11StickySheetFooter } from '../v11/components/V11SheetControls';
import { DEMAND_LABEL, TYPE_NAME, sl, type Lang } from './copy';
import { DEMAND_ORDER, inferDemand, reorderToday } from './reorder';
import { localYmd } from './signals';
import { DEMANDS, type Demand, type StateTypeOrUnclear } from './types';
import { errorReason, useStateLayerPlan, type AppliedPlan } from './useStateLayerActions';

const WebView = View as any;
const WebPressable = Pressable as any;

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
  const now = new Date();
  const date = localYmd(now);
  const blocks = data.scheduleBlocks || [];

  const computed = useMemo(() => {
    if (!visible) return null;
    const result = reorderToday({ type, date, now: new Date(), blocks, demandOverrides: overrides });
    if (result.kind !== 'reordered') return { result, patch: null, problem: null as string | null };
    try {
      return { result, patch: plan.preview({ date, before: result.before, after: result.after }), problem: null };
    } catch (e) {
      return { result, patch: null, problem: errorReason(e) };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, type, date, blocks, overrides]);

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
    const next = DEMANDS[(DEMANDS.indexOf(current) + 1) % DEMANDS.length];
    setOverrides({ ...overrides, [id]: next });
  };

  const confirm = async () => {
    if (!computed?.patch) return;
    setBusy(true);
    setError(null);
    try {
      const applied = await plan.confirmAndApply({ patch: computed.patch, headline: `${sl(lang, 'reorder')} · ${TYPE_NAME[lang][type]}`, ruleId });
      setOverrides({});
      onApplied(applied);
    } catch (e) {
      setError(sl(lang, 'rpApplyFailed', { reason: errorReason(e) }));
    } finally {
      setBusy(false);
    }
  };

  const kind = computed?.result.kind;
  const message = kind === 'cant_fit' ? sl(lang, 'rpCantFit')
    : kind === 'unchanged' ? sl(lang, 'rpNothing')
      : computed?.problem ? sl(lang, 'rpApplyFailed', { reason: computed.problem })
        : null;

  return (
    <V11Stage2ProductionSheet
      closeLabel={sl(lang, 'close')}
      footer={(
        <V11StickySheetFooter
          cancelLabel={sl(lang, 'rpCancel')}
          disabled={!computed?.patch || busy}
          message={error ?? undefined}
          messageStatus={error ? 'error' : 'default'}
          onCancel={onClose}
          onSave={() => { void confirm(); }}
          saveLabel={sl(lang, 'rpConfirm')}
          saving={busy}
          theme={theme}
        />
      )}
      minHeight={300}
      onClose={onClose}
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
        {message ? <Text style={{ color: theme.text.primary, fontSize: 14, lineHeight: 20 }}>{message}</Text> : null}
        {rows.map((r) => (
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
