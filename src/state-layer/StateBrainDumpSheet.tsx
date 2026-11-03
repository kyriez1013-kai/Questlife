import React, { useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useStore } from '../store';
import type { V11ThemeTokens } from '../v11/tokens';
import V11Stage2ProductionSheet from '../v11-stage2-rebaseline/V11Stage2ProductionSheet';
import { V11CategoricalChip, V11SegmentedSelector, V11StickySheetFooter, V11TextField } from '../v11/components/V11SheetControls';
import { brainDumpBlock, freeSlots, slotIsFree, splitBrainDump, validClock } from './brainDump';
import { sl, type Lang } from './copy';
import { localYmd } from './signals';
import { STATE_LAYER_VERSION, type BrainDumpChoice, type BrainDumpItem } from './types';
import { errorReason, useStateLayerPlan, type AppliedPlan } from './useStateLayerActions';

const WebView = View as any;
const MINUTES = 30;

type Draft = { text: string; choice?: BrainDumpChoice; time?: string; custom?: string };

/**
 * 清空脑子: list → now / schedule / drop → a real ContextLog record. Scheduled items are shown with
 * their exact times before the confirm button and go through the same planPatch chain (undoable).
 */
export default function StateBrainDumpSheet({
  checkInId,
  lang,
  onClose,
  onDone,
  reducedMotion,
  ruleId,
  theme,
  visible,
}: {
  checkInId?: string;
  lang: Lang;
  onClose: () => void;
  onDone: (message: string, applied?: AppliedPlan) => void;
  reducedMotion: boolean;
  ruleId: string;
  theme: V11ThemeTokens;
  visible: boolean;
}) {
  const { data, addContextLog, waitForLocalWrites, retryLocalWrites } = useStore();
  const plan = useStateLayerPlan();
  const [text, setText] = useState('');
  const [items, setItems] = useState<Draft[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedOnce, setFailedOnce] = useState(false);
  const now = new Date();
  const date = localYmd(now);
  const blocks = data.scheduleBlocks || [];

  const reset = () => { setText(''); setItems(null); setError(null); setBusy(false); setFailedOnce(false); };
  const close = () => { reset(); onClose(); };

  const timeOf = (d: Draft) => d.time ?? (d.custom && validClock(d.custom) ? d.custom : undefined);
  const takenExcept = (index: number) => (items ?? []).flatMap((d, i) => (i !== index && d.choice === 'schedule' && timeOf(d) ? [timeOf(d)!] : []));
  const update = (index: number, patch: Partial<Draft>) => setItems((list) => (list ?? []).map((d, i) => (i === index ? { ...d, ...patch } : d)));

  const problems = useMemo(() => (items ?? []).map((d, i) => {
    if (!d.choice) return 'choice';
    if (d.choice !== 'schedule') return null;
    const time = timeOf(d);
    if (!time || !slotIsFree({ now: new Date(), date, blocks, time, minutes: MINUTES, taken: takenExcept(i) })) return 'time';
    return null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [items, blocks, date]);

  // Writes happen once; a failed ACK is retried with retryLocalWrites (never re-created).
  const written = useRef<{ message: string; applied?: AppliedPlan } | null>(null);
  const finish = async () => {
    if (!items) return;
    if (!written.current) {
      if (problems.some((p) => p === 'choice')) { setError(sl(lang, 'bdNeedsChoice')); return; }
      if (problems.some((p) => p === 'time')) { setError(sl(lang, 'bdInvalidTime')); return; }
    }
    setBusy(true);
    setError(null);
    try {
      if (!written.current) {
        const stamp = Date.now();
        const record: BrainDumpItem[] = items.map((d, i) => ({
          text: d.text,
          choice: d.choice!,
          ...(d.choice === 'schedule' ? { time: timeOf(d)!, minutes: MINUTES, scheduleBlockId: `block-braindump-${stamp.toString(36)}-${i}` } : {}),
        }));
        const scheduled = record.filter((r) => r.choice === 'schedule');
        let applied: AppliedPlan | undefined;
        if (scheduled.length) {
          const added = scheduled.map((r) => brainDumpBlock({ id: r.scheduleBlockId!, date, title: r.text, time: r.time!, minutes: MINUTES, createdAt: stamp }));
          const dayBefore = blocks.filter((b) => b.date === date);
          const patch = plan.preview({ date, before: dayBefore, after: [...dayBefore, ...added] });
          applied = await plan.confirmAndApply({ patch, headline: sl(lang, 'bdTitle'), ruleId, skipWait: true });
        }
        addContextLog({
          date,
          type: 'custom',
          label: '清空脑子',
          value: record.length,
          unit: '件',
          source: 'manual',
          brainDump: { v: STATE_LAYER_VERSION, ...(checkInId ? { checkInId } : {}), items: record },
        });
        const count = (c: BrainDumpChoice) => record.filter((r) => r.choice === c).length;
        written.current = { message: sl(lang, 'bdSaved', { n: record.length, now: count('now'), schedule: count('schedule'), drop: count('drop') }), applied };
      } else {
        retryLocalWrites();
      }
      await waitForLocalWrites();
      const done = written.current!;
      written.current = null;
      reset();
      onDone(done.message, done.applied);
    } catch (e) {
      setFailedOnce(true);
      setError(`${sl(lang, 'saveFailed')}：${errorReason(e)}`);
      setBusy(false);
    }
  };

  const listStep = items !== null;
  return (
    <V11Stage2ProductionSheet
      closeLabel={sl(lang, 'close')}
      footer={(
        <V11StickySheetFooter
          cancelLabel={listStep ? (lang === 'zh' ? '上一步' : 'Back') : sl(lang, 'cancel')}
          cancelDisabled={busy}
          disabled={busy || (!listStep && !splitBrainDump(text).length)}
          message={error ?? undefined}
          messageStatus={error ? 'error' : 'default'}
          onCancel={() => (listStep ? setItems(null) : close())}
          onSave={() => {
            if (!listStep) { setItems(splitBrainDump(text).map((t) => ({ text: t }))); return; }
            void finish();
          }}
          saveLabel={listStep ? (failedOnce ? sl(lang, 'retry') : sl(lang, 'bdDone')) : sl(lang, 'bdSplit')}
          saving={busy}
          theme={theme}
        />
      )}
      onClose={close}
      reducedMotion={reducedMotion}
      theme={theme}
      title={sl(lang, 'bdTitle')}
      visible={visible}
    >
      <WebView dataSet={{ 'sl-role': 'sheet-body' }}>
        {!listStep ? (
          <>
            <Text style={{ color: theme.text.secondary, fontSize: 13, lineHeight: 19 }}>{sl(lang, 'bdPrompt')}</Text>
            <V11TextField multiline nativeID="sl-brain-dump-input" onChangeText={setText} placeholder={sl(lang, 'bdPlaceholder')} theme={theme} value={text} style={{ minHeight: 150 }} />
          </>
        ) : (
          items!.map((d, i) => {
            const slots = d.choice === 'schedule' ? freeSlots({ now: new Date(), date, blocks, minutes: MINUTES, count: 3, taken: takenExcept(i) }) : [];
            return (
              <WebView dataSet={{ 'sl-role': 'dump-item' }} key={`${i}-${d.text}`}>
                <Text style={{ color: theme.text.primary, fontSize: 14.5, lineHeight: 20, fontWeight: '500' }}>{d.text}</Text>
                <V11SegmentedSelector<BrainDumpChoice>
                  onChange={(choice) => update(i, { choice, ...(choice !== 'schedule' ? { time: undefined, custom: undefined } : {}) })}
                  options={[
                    { value: 'now', label: sl(lang, 'bdNow') },
                    { value: 'schedule', label: sl(lang, 'bdSchedule') },
                    { value: 'drop', label: sl(lang, 'bdDrop') },
                  ]}
                  theme={theme}
                  value={(d.choice ?? '') as BrainDumpChoice}
                />
                {d.choice === 'schedule' ? (
                  <WebView dataSet={{ 'sl-role': 'chips-wrap' }}>
                    <Text style={{ color: theme.text.metadata, fontSize: 11.5, lineHeight: 16, width: '100%' }}>
                      {slots.length ? `${sl(lang, 'bdPickTime')}（${MINUTES} ${lang === 'zh' ? '分钟' : 'min'}）` : sl(lang, 'bdNoSlot')}
                    </Text>
                    {slots.map((slot) => (
                      <V11CategoricalChip accessibilityRole="radio" density="compact" key={slot} label={slot} onPress={() => update(i, { time: d.time === slot ? undefined : slot, custom: undefined })} selected={d.time === slot} theme={theme} />
                    ))}
                    <V11TextField
                      onChangeText={(custom) => update(i, { custom, time: undefined })}
                      placeholder={sl(lang, 'bdCustomTime')}
                      status={problems[i] === 'time' && d.custom ? 'error' : 'default'}
                      style={{ width: 132, minHeight: 40 }}
                      theme={theme}
                      value={d.custom ?? ''}
                    />
                  </WebView>
                ) : null}
              </WebView>
            );
          })
        )}
        {listStep && items!.some((d) => d.choice === 'schedule' && timeOf(d)) ? (
          <Text style={{ color: theme.text.secondary, fontSize: 12.5, lineHeight: 18 }}>
            {sl(lang, 'bdPreviewSchedule')}：{items!.filter((d) => d.choice === 'schedule' && timeOf(d)).map((d) => `${timeOf(d)} ${d.text}`).join(lang === 'zh' ? '；' : '; ')}
          </Text>
        ) : null}
      </WebView>
    </V11Stage2ProductionSheet>
  );
}
