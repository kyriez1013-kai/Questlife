import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useStore } from '../store';
import type { StateCheckIn } from '../types';
import type { V11ThemeTokens } from '../v11/tokens';
import { V11Pill } from '../v11/components/V11Material';
import { V11CategoricalChip, V11DiscreteNumericRail, V11InlineButton } from '../v11/components/V11SheetControls';
import V11RebaselineIcon from '../v11-stage2-rebaseline/V11RebaselineIcon';
import { useDeviceData } from '../platform/useDeviceData';
import { ACTIONS_BY_TYPE, coinFlipEligible, followUpDue, type StateAction } from './actions';
import { buildStateCheckIn, latestStateLayerRow, type StateAnswers } from './checkIn';
import { classifyState, baselineHistory, effectiveType } from './classifyState';
import {
  ACTION_COPY, ENERGY_SCALE, OPEN_LOOPS_LABEL, PULL_LABEL, SCIENCE_LINE, TENSION_SCALE, TYPE_MEANING, TYPE_NAME, sl, type Lang,
} from './copy';
import { baselineLine, notUsedLine, reasonLine } from './explain';
import { MIN_OUTCOME_N, outcomeFor, pendingFollowUp, summarizeOutcomes } from './outcomes';
import { gatherPassiveSignals, localYmd, type PassiveSignals } from './signals';
import { STATE_TYPES, type OpenLoops, type Pull, type Scale5, type StateLayerPayload, type StateType } from './types';
import StateBrainDumpSheet from './StateBrainDumpSheet';
import StateReorderSheet from './StateReorderSheet';
import type { AppliedPlan } from './useStateLayerActions';
import { useStateLayerPlan, errorReason } from './useStateLayerActions';
import './state-layer.styles';

const WebView0 = View as any;
const WebText = Text as any;
const WebPressable0 = Pressable as any;

// Native has no CSS: the same roles get a plain fallback layout (theme surface instead of glass).
const nativeRoles: Record<string, object> = Platform.OS === 'web' ? {} : StyleSheet.create({
  card: { gap: 10, padding: 14, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth },
  'kicker-row': { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  'status-row': { flexDirection: 'row', alignItems: 'center', gap: 8 },
  'footer-row': { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  'chips-row': { flexDirection: 'row', alignItems: 'center', gap: 6 },
  'chips-wrap': { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  'type-row': { flexDirection: 'row', alignItems: 'center', gap: 8 },
  'type-dot': { width: 9, height: 9, borderRadius: 5 },
  'secondary-row': { flexDirection: 'row', gap: 8 },
  'secondary-action': { flex: 1, minHeight: 48, padding: 10, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  rails: { gap: 10 }, rail: { gap: 6 }, 'rail-head': { flexDirection: 'row', justifyContent: 'space-between' },
  optional: { gap: 8 }, evidence: { gap: 4 },
}) as any;
function withNative(Component: any) {
  return function NativeAware({ dataSet, style, ...rest }: any) {
    const role = dataSet?.['sl-role'];
    return <Component dataSet={dataSet} style={role && nativeRoles[role] ? [nativeRoles[role], style] : style} {...rest} />;
  };
}
const WebView = Platform.OS === 'web' ? WebView0 : withNative(View);
const WebPressable = Platform.OS === 'web' ? WebPressable0 : withNative(Pressable);

type SaveStatus = 'idle' | 'saving' | 'error';

export function typeColor(theme: V11ThemeTokens, type: string): string {
  const c = theme.questTheme.colors;
  switch (type) {
    case 'calm_energy': return c.success;
    case 'tense_energy': return c.warning;
    case 'low_fuel': return c.accent;
    case 'overload': return c.danger;
    case 'low_arousal': return c.textMuted;
    default: return c.textSubtle;
  }
}

function scaleOptions(labels: string[]) {
  return labels.map((label, i) => ({ value: (i + 1) as Scale5, label }));
}

/**
 * Today's state card. Sits above the capture bar; never replaces todayCommand. When todayCommand is
 * busy with housekeeping (`compact`), the card shows only the type and reason line.
 */
export default function StateLayerToday({
  compact,
  lang,
  onFollowToday,
  reducedMotion,
  theme,
}: {
  compact: boolean;
  lang: Lang;
  onFollowToday: () => void;
  reducedMotion: boolean;
  theme: V11ThemeTokens;
}) {
  const { data, createStateCheckIn, updateStateCheckIn, waitForLocalWrites, retryLocalWrites } = useStore();
  const { data: device } = useDeviceData();
  const plan = useStateLayerPlan();
  const now = new Date();
  const today = localYmd(now);
  const rows = data.stateCheckIns || [];
  const row = latestStateLayerRow(rows, today);
  const pending = pendingFollowUp(rows, now, followUpDue);

  const [draft, setDraft] = useState<Partial<StateAnswers>>({});
  const [rechecking, setRechecking] = useState(false);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [optionalOpen, setOptionalOpen] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [brainDumpOpen, setBrainDumpOpen] = useState(false);
  const [reorderOpen, setReorderOpen] = useState(false);
  const [applied, setApplied] = useState<{ plan: AppliedPlan; label: string } | null>(null);
  const [fuNext, setFuNext] = useState<boolean | undefined>(undefined);
  const pendingWrite = useRef<(() => Promise<void>) | null>(null);

  const signals: PassiveSignals = useMemo(() => gatherPassiveSignals({
    now,
    contextLogs: data.contextLogs || [],
    health: device.observations || [],
    executionLogs: data.executionLogs || [],
    scheduleBlocks: data.scheduleBlocks || [],
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [data.contextLogs, data.executionLogs, data.scheduleBlocks, device.observations, today]);
  const outcomes = useMemo(() => summarizeOutcomes(rows), [rows]);

  /** Every write waits for the persistence ACK before the UI shows it as saved. */
  const persist = useCallback(async (write: () => void, onSaved?: () => void) => {
    setStatus('saving');
    write();
    pendingWrite.current = async () => {
      await waitForLocalWrites();
      setStatus('idle');
      pendingWrite.current = null;
      onSaved?.();
    };
    try { await pendingWrite.current(); } catch { setStatus('error'); }
  }, [waitForLocalWrites]);

  const retry = useCallback(async () => {
    if (!pendingWrite.current) return;
    setStatus('saving');
    try { retryLocalWrites(); await pendingWrite.current(); } catch { setStatus('error'); }
  }, [retryLocalWrites]);

  const saveCheckIn = useCallback((answers: StateAnswers, kind: StateLayerPayload['kind'], extra: { followUpOf?: string; nextDone?: boolean } = {}) => {
    const fields = buildStateCheckIn({ answers, kind, ...extra, now: new Date(), date: today, signals, allCheckIns: rows });
    void persist(() => { createStateCheckIn(fields); }, () => {
      setDraft({});
      setRechecking(false);
      setOptionalOpen(false);
      setCorrecting(false);
      setFuNext(undefined);
      if (kind === 'follow_up') setNotice(sl(lang, 'followUpSaved'));
    });
  }, [createStateCheckIn, lang, persist, rows, signals, today]);

  const answer = useCallback((key: 'energy' | 'tension', value: Scale5, kind: StateLayerPayload['kind'], followUpOf?: string) => {
    if (status === 'saving') return;
    const next = { ...draft, [key]: value };
    setDraft(next);
    if (next.energy && next.tension) {
      saveCheckIn({ energy: next.energy, tension: next.tension }, kind, followUpOf ? { followUpOf, nextDone: fuNext } : {});
    }
  }, [draft, fuNext, saveCheckIn, status]);

  /** Optional answers update the same row and re-run the rules (same baseline, same signals). */
  const updateOptional = useCallback((patch: { openLoops?: OpenLoops; pull?: Pull }) => {
    if (!row?.stateLayer || row.energy === undefined) return;
    const sl0 = row.stateLayer;
    const openLoops = 'openLoops' in patch ? (patch.openLoops === sl0.openLoops ? undefined : patch.openLoops) : sl0.openLoops;
    const pull = 'pull' in patch ? (patch.pull === sl0.pull ? undefined : patch.pull) : sl0.pull;
    const classification = classifyState({ energy: row.energy as Scale5, tension: sl0.tension, openLoops, pull, signals, history: baselineHistory(rows, row.id) });
    const stateLayer: StateLayerPayload = { ...sl0, openLoops, pull, classification };
    if (!openLoops) delete stateLayer.openLoops;
    if (!pull) delete stateLayer.pull;
    void persist(() => updateStateCheckIn(row.id, { stateLayer }));
  }, [persist, row, rows, signals, updateStateCheckIn]);

  const correct = useCallback((type: StateType) => {
    if (!row?.stateLayer) return;
    void persist(() => updateStateCheckIn(row.id, { stateLayer: { ...row.stateLayer!, correction: { type, at: new Date().toISOString() } } }), () => setCorrecting(false));
  }, [persist, row, updateStateCheckIn]);

  const choose = useCallback((action: StateAction, slot: 'primary' | 'alternate', randomized: boolean) => {
    if (!row?.stateLayer) return;
    const choice = { actionId: action.id, slot, randomized, at: new Date().toISOString() };
    void persist(() => updateStateCheckIn(row.id, { stateLayer: { ...row.stateLayer!, choice } }), () => {
      if (action.opens === 'reorder') setReorderOpen(true);
      else if (action.opens === 'brain_dump') setBrainDumpOpen(true);
      else if (action.opens === 'recheck') { setRechecking(true); setOptionalOpen(true); }
      else if (action.id === 'follow_today') onFollowToday();
    });
  }, [onFollowToday, persist, row, updateStateCheckIn]);

  const dismissFollowUp = useCallback(() => {
    if (!pending?.stateLayer?.choice) return;
    void persist(() => updateStateCheckIn(pending.id, { stateLayer: { ...pending.stateLayer!, choice: { ...pending.stateLayer!.choice!, followUpDismissedAt: new Date().toISOString() } } }));
  }, [pending, persist, updateStateCheckIn]);

  const undoApplied = useCallback(async () => {
    if (!applied) return;
    setStatus('saving');
    try {
      await plan.undo(applied.plan);
      setApplied(null);
      setNotice(sl(lang, 'rpUndone'));
      setStatus('idle');
    } catch (error) {
      setStatus('idle');
      setNotice(sl(lang, 'rpUndoFailed', { reason: errorReason(error) }));
    }
  }, [applied, lang, plan]);

  const nativeCard = Platform.OS === 'web' ? undefined : { backgroundColor: theme.control.neutralSurface, borderColor: theme.control.neutralBorder };
  const type = row ? effectiveType(row) : undefined;
  const classification = row?.stateLayer?.classification;

  const statusLine = status === 'saving'
    ? <Text style={{ color: theme.text.metadata, fontSize: 12 }}>{sl(lang, 'saving')}</Text>
    : status === 'error'
      ? (
        <WebView dataSet={{ 'sl-role': 'status-row' }}>
          <Text style={{ color: theme.control.error, fontSize: 12 }}>{sl(lang, 'saveFailed')}</Text>
          <V11InlineButton label={sl(lang, 'retry')} onPress={() => { void retry(); }} theme={theme} />
        </WebView>
      ) : null;

  const rails = (kind: StateLayerPayload['kind'], followUpOf?: string) => (
    <WebView dataSet={{ 'sl-role': 'rails' }}>
      {(['energy', 'tension'] as const).map((key) => (
        <WebView dataSet={{ 'sl-role': 'rail' }} key={key}>
          <WebView dataSet={{ 'sl-role': 'rail-head' }}>
            <Text style={{ color: theme.text.primary, fontSize: 14, lineHeight: 19, fontWeight: '600' }}>{sl(lang, key)}</Text>
            <Text style={{ color: theme.text.metadata, fontSize: 11, lineHeight: 16 }}>
              {key === 'energy' ? `${sl(lang, 'energyLow')} → ${sl(lang, 'energyHigh')}` : `${sl(lang, 'tensionLow')} → ${sl(lang, 'tensionHigh')}`}
            </Text>
          </WebView>
          <V11DiscreteNumericRail<Scale5>
            disabled={status === 'saving'}
            onChange={(value) => answer(key, value, kind, followUpOf)}
            options={scaleOptions(key === 'energy' ? ENERGY_SCALE[lang] : TENSION_SCALE[lang])}
            theme={theme}
            value={(draft[key] ?? 0) as Scale5}
          />
        </WebView>
      ))}
    </WebView>
  );

  const sheets = (
    <>
      <StateBrainDumpSheet
        checkInId={row?.id}
        lang={lang}
        onClose={() => setBrainDumpOpen(false)}
        onDone={(message, appliedPlan) => {
          setBrainDumpOpen(false);
          setNotice(message);
          if (appliedPlan) setApplied({ plan: appliedPlan, label: sl(lang, 'bdScheduled', { n: appliedPlan.patch.operations.length }) });
        }}
        reducedMotion={reducedMotion}
        ruleId={classification?.ruleId ?? 'brain_dump'}
        theme={theme}
        visible={brainDumpOpen}
      />
      {type && type !== 'unclear' ? (
        <StateReorderSheet
          lang={lang}
          onApplied={(appliedPlan) => {
            setReorderOpen(false);
            setApplied({ plan: appliedPlan, label: sl(lang, 'rpApplied') });
          }}
          onClose={() => setReorderOpen(false)}
          reducedMotion={reducedMotion}
          ruleId={classification?.ruleId ?? type}
          theme={theme}
          type={type}
          visible={reorderOpen}
        />
      ) : null}
    </>
  );

  // ── follow-up (takes the card's place while open) ──
  if (pending && !rechecking) {
    const actionTitle = ACTION_COPY[lang][pending.stateLayer!.choice!.actionId].title;
    return (
      <WebView style={nativeCard} dataSet={{ 'sl-role': 'card', 'sl-mode': 'follow-up' }}>
        <WebView dataSet={{ 'sl-role': 'kicker-row' }}>
          <Text style={{ color: theme.text.metadata, fontSize: 11, lineHeight: 16, letterSpacing: 0.6 }}>{sl(lang, 'followUpTitle', { action: actionTitle })}</Text>
          <V11InlineButton label={sl(lang, 'followUpDismiss')} onPress={dismissFollowUp} theme={theme} />
        </WebView>
        {rails('follow_up', pending.id)}
        <WebView dataSet={{ 'sl-role': 'chips-row' }}>
          <Text style={{ color: theme.text.secondary, fontSize: 12, lineHeight: 17 }}>{sl(lang, 'nextDoneQ')}</Text>
          <V11CategoricalChip density="compact" accessibilityRole="radio" label={sl(lang, 'yes')} onPress={() => setFuNext(fuNext === true ? undefined : true)} selected={fuNext === true} theme={theme} />
          <V11CategoricalChip density="compact" accessibilityRole="radio" label={sl(lang, 'no')} onPress={() => setFuNext(fuNext === false ? undefined : false)} selected={fuNext === false} theme={theme} />
        </WebView>
        {statusLine}
        {sheets}
      </WebView>
    );
  }

  // ── check-in input ──
  if (!row || !type || !classification || rechecking) {
    return (
      <WebView style={nativeCard} dataSet={{ 'sl-role': 'card', 'sl-mode': 'input' }}>
        <WebView dataSet={{ 'sl-role': 'kicker-row' }}>
          <Text style={{ color: theme.text.primary, fontSize: 17, lineHeight: 23, fontWeight: '600' }}>{sl(lang, 'title')}</Text>
          {rechecking ? <V11InlineButton label={sl(lang, 'cancel')} onPress={() => { setRechecking(false); setDraft({}); }} theme={theme} /> : null}
        </WebView>
        {rails('check_in')}
        {statusLine}
        {notice ? <Text style={{ color: theme.text.secondary, fontSize: 12, lineHeight: 17 }}>{notice}</Text> : null}
        {sheets}
      </WebView>
    );
  }

  // ── result ──
  const actions = ACTIONS_BY_TYPE[type];
  const choice = row.stateLayer!.choice;
  const coinFlip = !!data.settings.stateLayerCoinFlip && coinFlipEligible(type) && !choice;
  const lines = {
    reason: reasonLine({ energy: row.energy as Scale5, tension: row.stateLayer!.tension, openLoops: row.stateLayer!.openLoops, pull: row.stateLayer!.pull, signals, classification }, lang),
    notUsed: notUsedLine(classification, lang),
    baseline: baselineLine(classification, lang),
  };
  const personal = (action: StateAction) => {
    const cell = outcomeFor(outcomes, type, action.id);
    if (!cell || cell.n === 0) return null;
    return cell.n < MIN_OUTCOME_N
      ? sl(lang, 'personalCount', { n: cell.n })
      : sl(lang, 'personalSummary', { n: cell.n, up: cell.energyUp, down: cell.tensionDown });
  };
  const primaryPersonal = personal(actions.primary);
  const science = actions.primary.science ? SCIENCE_LINE[lang][actions.primary.science] : null;

  return (
    <WebView style={nativeCard} dataSet={{ 'sl-role': 'card', 'sl-mode': compact ? 'compact' : 'result' }}>
      <WebView dataSet={{ 'sl-role': 'kicker-row' }}>
        <WebView dataSet={{ 'sl-role': 'type-row' }}>
          <WebView dataSet={{ 'sl-role': 'type-dot' }} style={{ backgroundColor: typeColor(theme, type) }} />
          <Text style={{ color: theme.text.primary, fontSize: 15, lineHeight: 21, fontWeight: '600' }}>{TYPE_NAME[lang][type]}</Text>
          <WebText dataSet={{ 'sl-role': 'tag', 'sl-tag': row.stateLayer!.correction ? 'personal' : 'rule' }} style={{ color: theme.text.secondary, fontSize: 11, lineHeight: 15, fontWeight: '600' }}>
            {row.stateLayer!.correction ? sl(lang, 'corrected') : sl(lang, 'ruleTag')}
          </WebText>
        </WebView>
        <V11InlineButton label={correcting ? sl(lang, 'cancel') : sl(lang, 'notThis')} onPress={() => setCorrecting(!correcting)} theme={theme} />
      </WebView>

      {correcting ? (
        <WebView dataSet={{ 'sl-role': 'chips-wrap' }}>
          <Text style={{ color: theme.text.secondary, fontSize: 12, lineHeight: 17, width: '100%' }}>{sl(lang, 'pickType')}</Text>
          {STATE_TYPES.filter((t) => t !== type).map((t) => (
            <V11CategoricalChip accessibilityRole="button" density="compact" key={t} label={TYPE_NAME[lang][t]} onPress={() => correct(t)} selected={false} theme={theme} />
          ))}
        </WebView>
      ) : null}

      <Text style={{ color: theme.text.secondary, fontSize: 13, lineHeight: 19 }}>{lines.reason}</Text>
      {!compact ? (
        <Text style={{ color: theme.text.metadata, fontSize: 11, lineHeight: 16 }}>
          {[TYPE_MEANING[lang][type], lines.baseline, lines.notUsed].filter(Boolean).join(' · ')}
        </Text>
      ) : null}

      {compact ? (
        <Text style={{ color: theme.text.metadata, fontSize: 12, lineHeight: 17 }}>{sl(lang, 'compactNote')}</Text>
      ) : (
        <>
          <V11Pill
            accessibilityLabel={ACTION_COPY[lang][actions.primary.id].title}
            contentStyle={{ paddingVertical: 12, paddingLeft: 20, paddingRight: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}
            height={68}
            onPress={() => choose(actions.primary, 'primary', false)}
            reducedMotion={reducedMotion}
            stage="S1"
            theme={theme}
          >
            <WebView style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={2} style={{ color: theme.text.primary, fontSize: 19, lineHeight: 25, fontWeight: '600' }}>
                {ACTION_COPY[lang][actions.primary.id].title}
              </Text>
              <Text numberOfLines={2} style={{ color: theme.text.secondary, fontSize: 12.5, lineHeight: 17, marginTop: 2 }}>
                {choice?.actionId === actions.primary.id ? `${sl(lang, choice.randomized ? 'chosenRandom' : 'chosen')} · ` : ''}{ACTION_COPY[lang][actions.primary.id].body}
              </Text>
            </WebView>
            <V11RebaselineIcon name="arrow" size={16} color={theme.text.primary} />
          </V11Pill>

          <WebView dataSet={{ 'sl-role': 'evidence' }}>
            {science ? (
              <Text style={{ color: theme.text.metadata, fontSize: 11, lineHeight: 16 }}>
                <WebText dataSet={{ 'sl-role': 'tag-inline', 'sl-tag': 'general' }}>{sl(lang, 'generalTag')}</WebText>{'  '}{science}
              </Text>
            ) : null}
            {primaryPersonal ? (
              <Text style={{ color: theme.text.metadata, fontSize: 11, lineHeight: 16 }}>
                <WebText dataSet={{ 'sl-role': 'tag-inline', 'sl-tag': 'personal' }}>{sl(lang, 'personalTag')}</WebText>{'  '}{primaryPersonal}
              </Text>
            ) : null}
          </WebView>

          <WebView dataSet={{ 'sl-role': 'secondary-row' }}>
            <WebPressable accessibilityRole="button" dataSet={{ 'sl-role': 'secondary-action' }} onPress={() => choose(actions.alternate, 'alternate', false)}>
              <Text style={{ color: theme.text.metadata, fontSize: 11, lineHeight: 15 }}>{sl(lang, 'alternate')}</Text>
              <Text numberOfLines={2} style={{ color: theme.text.primary, fontSize: 13.5, lineHeight: 19, fontWeight: '500' }}>
                {choice?.actionId === actions.alternate.id ? `${sl(lang, choice.randomized ? 'chosenRandom' : 'chosen')} · ` : ''}{ACTION_COPY[lang][actions.alternate.id].title}
              </Text>
            </WebPressable>
            {type !== 'unclear' ? (
              <WebPressable accessibilityRole="button" dataSet={{ 'sl-role': 'secondary-action' }} onPress={() => setReorderOpen(true)}>
                <V11RebaselineIcon name="calendar" size={14} color={theme.text.secondary} />
                <Text style={{ color: theme.text.primary, fontSize: 13.5, lineHeight: 19, fontWeight: '500' }}>{sl(lang, 'reorder')}</Text>
              </WebPressable>
            ) : null}
          </WebView>

          {coinFlip ? (
            <WebView dataSet={{ 'sl-role': 'status-row' }}>
              <V11InlineButton
                label={sl(lang, 'coinFlip')}
                onPress={() => {
                  const pickPrimary = Math.random() < 0.5;
                  choose(pickPrimary ? actions.primary : actions.alternate, pickPrimary ? 'primary' : 'alternate', true);
                }}
                theme={theme}
              />
              <Text style={{ color: theme.text.metadata, fontSize: 11, lineHeight: 16, flex: 1 }}>{sl(lang, 'coinFlipNote')}</Text>
            </WebView>
          ) : null}
        </>
      )}

      {applied ? (
        <WebView dataSet={{ 'sl-role': 'status-row' }}>
          <Text style={{ color: theme.text.secondary, fontSize: 12, lineHeight: 17 }}>{applied.label}</Text>
          <V11InlineButton label={sl(lang, 'rpUndo')} onPress={() => { void undoApplied(); }} theme={theme} />
        </WebView>
      ) : null}
      {notice ? <Text style={{ color: theme.text.secondary, fontSize: 12, lineHeight: 17 }}>{notice}</Text> : null}
      <WebView dataSet={{ 'sl-role': 'footer-row' }}>
        <V11InlineButton label={sl(lang, 'optional')} onPress={() => setOptionalOpen(!optionalOpen)} theme={theme} />
        <V11InlineButton label={sl(lang, 'recheck')} onPress={() => { setRechecking(true); setDraft({}); }} theme={theme} />
      </WebView>
      {optionalOpen ? (
        <WebView dataSet={{ 'sl-role': 'optional' }}>
          <Text style={{ color: theme.text.metadata, fontSize: 11, lineHeight: 16 }}>{sl(lang, 'optionalHint')}</Text>
          <Text style={{ color: theme.text.secondary, fontSize: 12.5, lineHeight: 17 }}>{sl(lang, 'openLoopsQ')}</Text>
          <WebView dataSet={{ 'sl-role': 'chips-wrap' }}>
            {(['none', 'few', 'many'] as OpenLoops[]).map((v) => (
              <V11CategoricalChip accessibilityRole="radio" density="compact" key={v} label={OPEN_LOOPS_LABEL[lang][v]} onPress={() => updateOptional({ openLoops: v })} selected={row.stateLayer!.openLoops === v} theme={theme} />
            ))}
          </WebView>
          <Text style={{ color: theme.text.secondary, fontSize: 12.5, lineHeight: 17 }}>{sl(lang, 'pullQ')}</Text>
          <WebView dataSet={{ 'sl-role': 'chips-wrap' }}>
            {(['want_cant', 'can_dont_want', 'unsure'] as Pull[]).map((v) => (
              <V11CategoricalChip accessibilityRole="radio" density="compact" key={v} label={PULL_LABEL[lang][v]} onPress={() => updateOptional({ pull: v })} selected={row.stateLayer!.pull === v} theme={theme} />
            ))}
          </WebView>
        </WebView>
      ) : null}

      {statusLine}
      {sheets}
    </WebView>
  );
}

export type { StateCheckIn };
