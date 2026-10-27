import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { t as legacyT } from '../../i18n';
import { useV2Theme } from '../theme';
import { v2t, type V2Lang } from '../copy';
import { shallowEqual, useV2Actions, useV2Select } from '../storeBridge';
import { buildTodayModel, localDateKey, recordRow } from '../model/todayModel';
import { FIRST_USE_STORAGE_KEY, type FirstSuggestion, type FirstUseRecord } from '../model/firstUse';
import { TodayView } from './TodayView';
import { CaptureSheet } from './CaptureSheet';
import { useCapture } from './useCapture';
import { Sheet } from '../components/Sheet';
import { Button, Row, T } from '../components/primitives';
import { Toast } from '../components/feedback';

const WEEKDAY_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function dateLabel(now: Date, lang: V2Lang): string {
  const part = now.getHours() < 11 ? '上午' : now.getHours() < 14 ? '中午' : now.getHours() < 18 ? '下午' : '晚上';
  if (lang === 'en') return now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
  return `${now.getMonth() + 1}月${now.getDate()}日 ${WEEKDAY_ZH[now.getDay()]} ${part}`;
}

function useNow(ms: number): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), ms); return () => clearInterval(id); }, [ms]);
  return now;
}

function format(lang: V2Lang, key: string, values?: Record<string, string | number>): string {
  let s = legacyT(lang, key);
  Object.entries(values ?? {}).forEach(([k, v]) => { s = s.replace(`{${k}}`, String(v)); });
  return s;
}

export function TodayScreen({ lang }: { lang: V2Lang }) {
  const th = useV2Theme();
  const actions = useV2Actions();
  // slice subscriptions: this screen re-renders only when one of these arrays (or persistence status) changes
  const executionLogs = useV2Select((s) => s.data.executionLogs ?? EMPTY);
  const stateCheckIns = useV2Select((s) => s.data.stateCheckIns ?? EMPTY);
  const scheduleBlocks = useV2Select((s) => s.data.scheduleBlocks ?? EMPTY);
  const rawCaptures = useV2Select((s) => s.data.rawCaptures ?? EMPTY);
  const contextLogs = useV2Select((s) => s.data.contextLogs ?? EMPTY);
  const skills = useV2Select((s) => s.data.skills ?? EMPTY);
  const categories = useV2Select((s) => s.data.categories ?? EMPTY);
  const moduleSkillLinks = useV2Select((s) => s.data.moduleSkillLinks ?? EMPTY);
  const persistence = useV2Select((s) => s.localPersistence, shallowEqual);
  const now = useNow(60000);

  const model = useMemo(
    () => buildTodayModel({ executionLogs, stateCheckIns, scheduleBlocks, rawCaptures, contextLogs, skills, categories, moduleSkillLinks }, now),
    [executionLogs, stateCheckIns, scheduleBlocks, rawCaptures, contextLogs, skills, categories, moduleSkillLinks, now],
  );

  const [composer, setComposer] = useState('');
  const [focusKey, setFocusKey] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [stateSaving, setStateSaving] = useState(false);
  const [stateError, setStateError] = useState<string | null>(null);
  const [rescueOpen, setRescueOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [first, setFirst] = useState<FirstSuggestion | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(FIRST_USE_STORAGE_KEY).then((raw) => {
      if (!alive || !raw) return;
      try {
        const rec = JSON.parse(raw) as FirstUseRecord;
        if (rec?.version === 1 && rec.date === localDateKey(new Date())) setFirst(rec.suggestion);
      } catch { /* advisory only */ }
    }).catch(() => undefined);
    return () => { alive = false; };
  }, []);

  const capture = useCapture({
    onSaved: (n) => { setComposer(''); flash(`${v2t(lang, 'cap.saved')}${n > 1 ? ` · ${n}` : ''}`); },
    onRawSaved: () => setComposer(''),
    onError: (m) => flash(m),
  });

  const copy = useMemo(() => {
    const c = model.command;
    if (c.type === 'empty_state') return { title: '今天先记一件事', reason: '写一句话就行，不用先建目标。' };
    return { title: format(lang, c.titleKey, c.titleValues), reason: format(lang, c.reasonKey, c.reasonValues) };
  }, [model.command, lang]);

  const skillName = useCallback((id: string | null) => (id ? skills.find((s) => s.id === id)?.name ?? null : null), [skills]);
  const linkedName = model.command.linkedSkillId ? skillName(model.command.linkedSkillId) : null;

  const logState = useCallback(async (n: 1 | 2 | 3 | 4 | 5) => {
    setStateSaving(true);
    setStateError(null);
    const d = new Date();
    try {
      actions.createStateCheckIn({
        date: localDateKey(d), timestamp: d.toISOString(), overall: n, energy: n,
        timeBlock: d.getHours() < 11 ? 'morning' : d.getHours() < 14 ? 'midday' : d.getHours() < 18 ? 'afternoon' : d.getHours() < 22 ? 'evening' : 'night',
        label: n <= 1 ? 'very_low' : n === 2 ? 'low' : n === 3 ? 'normal' : n === 4 ? 'good' : 'great',
      });
      await actions.waitForLocalWrites();
      flash(v2t(lang, 'today.state.saved'));
    } catch {
      setStateError('没保存成功。再点一次状态重试。');
    } finally {
      setStateSaving(false);
    }
  }, [actions, flash, lang]);

  const onPrimary = useCallback(() => {
    switch (model.action) {
      case 'finish_pending_capture':
        if (model.pendingCapture) void capture.resume(model.pendingCapture);
        break;
      case 'rescue': setRescueOpen(true); break;
      case 'review_feedback': setReviewOpen(true); break;
      case 'start':
        if (linkedName || model.command.titleValues?.title) setComposer(`${linkedName ?? String(model.command.titleValues?.title)} `);
        setFocusKey((k) => k + 1);
        break;
      default:
        setFocusKey((k) => k + 1);
    }
  }, [model.action, model.pendingCapture, model.command.titleValues, linkedName, capture]);

  const onDoneLog = useCallback(() => {
    if (linkedName) setComposer(`${linkedName} `);
    setFocusKey((k) => k + 1);
  }, [linkedName]);

  return (
    <View style={{ flex: 1 }}>
      <TodayView
        lang={lang}
        model={model}
        dateLabel={dateLabel(now, lang)}
        command={copy}
        firstSuggestion={first}
        persistence={persistence}
        onRetryPersist={() => { void actions.retryLocalWrites().catch(() => undefined); }}
        onLogState={logState}
        stateSaving={stateSaving}
        stateError={stateError}
        composer={composer}
        onComposer={setComposer}
        onSubmitComposer={() => { void capture.submit(composer); }}
        composerBusy={capture.state.phase !== 'idle'}
        composerFocusKey={focusKey}
        onPrimary={onPrimary}
        onDoneLog={onDoneLog}
        onQuick={(q) => { void capture.submit(q.label); }}
      />
      <CaptureSheet
        lang={lang}
        state={capture.state}
        dispatch={capture.dispatch}
        skillName={skillName}
        onSave={() => { void capture.save(); }}
        onCancel={capture.cancel}
        onRetryParse={() => { void capture.retryParse(); }}
        onManual={capture.manual}
        onKeepRaw={() => { void capture.keepRawOnly(); }}
        onRetrySave={() => { void capture.retrySave(); }}
        onLater={capture.cancel}
      />
      <RescueSheet open={rescueOpen} onClose={() => setRescueOpen(false)} skill={linkedName} lang={lang} onDone={() => { setRescueOpen(false); flash('做到了，已保存到本机'); }} />
      <Sheet open={reviewOpen} onClose={() => setReviewOpen(false)} testID="review-sheet" footer={<Button fullWidth label="好" onPress={() => setReviewOpen(false)} />}>
        <T level="title" accessibilityRole="header">{v2t(lang, 'action.review_feedback')}</T>
        {executionLogs.filter((l) => l.date === model.dateKey).slice(-1).map((l) => {
          const r = recordRow(l, skillName(l.linkedSkillId ?? null) ?? undefined);
          return <Row key={l.id} title={r.title} lines={[r.actual.length ? `${v2t(lang, 'today.actual')} ${r.actual.join(' · ')}` : `${v2t(lang, 'today.actual')} ${v2t(lang, 'today.missing')}`, ...r.predicted]} right={<T level="caption" color="faint">{r.timeLabel}</T>} />;
        })}
      </Sheet>
      <Toast message={toast} testID="toast" />
      <View pointerEvents="none" style={{ height: 0, backgroundColor: th.color.bg }} />
    </View>
  );
}

const EMPTY: never[] = [];

/** Minimal "2 minutes" start flow on the existing rescue APIs: body step → first tiny step, each ACKed. */
function RescueSheet({ open, onClose, onDone, skill, lang }: { open: boolean; onClose: () => void; onDone: () => void; skill: string | null; lang: V2Lang }) {
  const th = useV2Theme();
  const actions = useV2Actions();
  const [step, setStep] = useState<'intro' | 'body' | 'first' | 'error'>('intro');
  const [busy, setBusy] = useState(false);
  const idRef = useRef<string | null>(null);
  useEffect(() => { if (open) { setStep('intro'); idRef.current = null; } }, [open]);
  const body = '站起来，喝口水，走动 1 分钟。';
  const activation = skill ? `只做「${skill}」的第一小步，1 分钟就停。` : '只做眼前最小的一步，1 分钟就停。';

  const run = async (fn: () => void, next: typeof step): Promise<boolean> => {
    setBusy(true);
    try { fn(); await actions.waitForLocalWrites(); setStep(next); return true; } catch { setStep('error'); return false; } finally { setBusy(false); }
  };

  return (
    <Sheet open={open} onClose={onClose} testID="rescue-sheet"
      footer={
        step === 'intro' ? <Button testID="rescue-start" fullWidth size="lg" loading={busy} label="开始 2 分钟" onPress={() => {
          void run(() => {
            const d = new Date();
            const row = actions.createRescueLog({ date: localDateKey(d), startedAt: d.toISOString(), triggerType: 'brain_off', bodyAction: body, activationAction: activation });
            idRef.current = row.id;
          }, 'body');
        }} />
        : step === 'body' ? <Button testID="rescue-body-done" fullWidth size="lg" loading={busy} label="我走动了" onPress={() => { void run(() => { if (idRef.current) actions.completeRescueStep(idRef.current, body); }, 'first'); }} />
        : step === 'first' ? <Button testID="rescue-first-done" fullWidth size="lg" loading={busy} label="我开始了第一小步" onPress={() => { void run(() => { if (idRef.current) actions.completeActivationStep(idRef.current, activation); }, 'intro').then((ok) => { if (ok) onDone(); }); }} />
        : <Button fullWidth label="关闭" onPress={onClose} />
      }>
      <T level="title" accessibilityRole="header">{v2t(lang, 'action.rescue')}</T>
      <T level="body" color="muted">先别想"完成"它。做到这两小步就算赢。</T>
      <View style={{ gap: th.space.md }}>
        <Row title={`① ${body}`} lines={step === 'intro' ? [] : step === 'body' ? ['现在做这一步'] : ['已完成']} />
        <Row title={`② ${activation}`} lines={step === 'first' ? ['现在做这一步'] : []} />
      </View>
      {step === 'error' ? <T level="body" color="danger" accessibilityRole="alert">没保存成功。关闭后可在顶部"没保存成功"处重试。</T> : null}
    </Sheet>
  );
}
