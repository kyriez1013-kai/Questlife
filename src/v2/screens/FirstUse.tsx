import React, { useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useV2Theme } from '../theme';
import { v2t, type V2Lang, type V2Key } from '../copy';
import {
  buildFirstSuggestion, energyToOverall, remainingAnswers, sleepToValue, SLEEP_SELF_RATING_UNIT, FIRST_USE_STORAGE_KEY,
  type EnergyAnswer, type FirstUseAnswers, type FirstUsePartial, type FocusAnswer, type SleepAnswer, type FirstUseRecord,
} from '../model/firstUse';
import { localDateKey } from '../model/todayModel';
import { useV2Actions } from '../storeBridge';
import { T, Button, Chip, Surface } from '../components/primitives';
import { EvidenceBadge, ErrorState } from '../components/feedback';

type Step = 'welcome' | 'questions' | 'result';

const SLEEP: SleepAnswer[] = ['bad', 'ok', 'good'];
const ENERGY: EnergyAnswer[] = ['low', 'mid', 'high'];
const FOCUS: FocusAnswer[] = ['training', 'study', 'work', 'chores', 'recover', 'other'];

export function FirstUse({ lang, onSample, onDone }: { lang: V2Lang; onSample: () => void; onDone: () => void }) {
  const t = useV2Theme();
  const actions = useV2Actions();
  const [step, setStep] = useState<Step>('welcome');
  const [answers, setAnswers] = useState<FirstUsePartial>({});
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  // created once; a retry only re-attempts the durable write, it never creates a second check-in
  const created = useRef(false);

  const remaining = remainingAnswers(answers);
  const complete = remaining === 0;
  const suggestion = complete ? buildFirstSuggestion(answers as FirstUseAnswers) : null;

  const finish = async () => {
    if (!complete || saving) return;
    setSaving(true);
    setFailed(false);
    try {
      const a = answers as FirstUseAnswers;
      if (!created.current) {
        const now = new Date();
        const date = localDateKey(now);
        const overall = energyToOverall(a.energy);
        const hour = now.getHours();
        actions.createStateCheckIn({
          date, timestamp: now.toISOString(), overall, energy: overall,
          timeBlock: hour < 11 ? 'morning' : hour < 14 ? 'midday' : hour < 18 ? 'afternoon' : hour < 22 ? 'evening' : 'night',
          label: overall === 2 ? 'low' : overall === 3 ? 'normal' : 'good',
        });
        actions.addContextLog({
          date, type: 'sleep', label: '睡眠自评', value: sleepToValue(a.sleep), unit: SLEEP_SELF_RATING_UNIT, source: 'manual',
        });
        created.current = true;
      } else {
        await actions.retryLocalWrites();
      }
      await actions.waitForLocalWrites(); // ACK: only now do we move on
      const record: FirstUseRecord = { version: 1, completedAt: new Date().toISOString(), answers: a, suggestion: buildFirstSuggestion(a), date: localDateKey(new Date()) };
      try { await AsyncStorage.setItem(FIRST_USE_STORAGE_KEY, JSON.stringify(record)); } catch { /* the suggestion is advisory; records are already durable */ }
      actions.setSettings({ onboardingCompleted: true, onboardingVersion: 2 });
      onDone();
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  const group = (key: 'sleep' | 'energy' | 'focus', title: V2Key, options: string[], labelOf: (o: string) => V2Key) => (
    <View style={{ gap: t.space.md }}>
      <T level="body" style={{ fontWeight: '600' }}>{v2t(lang, title)}</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm }}>
        {options.map((o) => (
          <Chip key={o} testID={`fu-${key}-${o}`} label={v2t(lang, labelOf(o))} selected={answers[key] === o} onPress={() => setAnswers((p) => ({ ...p, [key]: o }))} />
        ))}
      </View>
    </View>
  );

  if (step === 'welcome') {
    return (
      <View testID="fu-welcome" style={{ flex: 1, padding: t.space.xl, justifyContent: 'space-between', maxWidth: t.layout.maxWidth, width: '100%', alignSelf: 'center' }}>
        <View style={{ paddingTop: t.space.huge, gap: t.space.xl }}>
          <T level="caption" color="muted" style={{ fontWeight: '700', letterSpacing: 1 }}>QUESTLIFE</T>
          <T level="display" accessibilityRole="header">{v2t(lang, 'fu.welcome.title')}</T>
          <T level="body" color="muted">{v2t(lang, 'fu.welcome.body')}</T>
        </View>
        <View style={{ gap: t.space.md }}>
          <Button testID="fu-start" size="lg" fullWidth label={v2t(lang, 'fu.welcome.start')} onPress={() => setStep('questions')} />
          <Button testID="fu-sample" variant="ghost" fullWidth label={v2t(lang, 'fu.welcome.sample')} onPress={onSample} />
          <T level="caption" color="faint" style={{ textAlign: 'center' }}>{v2t(lang, 'fu.welcome.privacy')}</T>
        </View>
      </View>
    );
  }

  if (step === 'questions') {
    return (
      <View testID="fu-questions" style={{ flex: 1, maxWidth: t.layout.maxWidth, width: '100%', alignSelf: 'center' }}>
        <ScrollView contentContainerStyle={{ padding: t.space.xl, gap: t.space.xl }} keyboardShouldPersistTaps="handled">
          <Button variant="ghost" label={`‹ ${v2t(lang, 'fu.back')}`} onPress={() => setStep('welcome')} style={{ alignSelf: 'flex-start', marginLeft: -t.space.lg }} />
          <T level="display" accessibilityRole="header">{v2t(lang, 'fu.q.title')}</T>
          {group('sleep', 'fu.q.sleep', SLEEP, (o) => `fu.sleep.${o}` as V2Key)}
          {group('energy', 'fu.q.energy', ENERGY, (o) => `fu.energy.${o}` as V2Key)}
          {group('focus', 'fu.q.focus', FOCUS, (o) => `fu.focus.${o}` as V2Key)}
        </ScrollView>
        <View style={{ padding: t.space.xl, paddingTop: t.space.md, gap: t.space.sm, borderTopWidth: 1, borderTopColor: t.color.hairline, backgroundColor: t.color.bg }}>
          {!complete ? <T testID="fu-remaining" level="caption" color="muted" style={{ textAlign: 'center' }}>{v2t(lang, 'fu.q.remaining', { n: remaining })}</T> : null}
          <Button testID="fu-submit" size="lg" fullWidth disabled={!complete} label={v2t(lang, 'fu.q.submit')} onPress={() => setStep('result')} />
        </View>
      </View>
    );
  }

  return (
    <View testID="fu-result" style={{ flex: 1, padding: t.space.xl, justifyContent: 'space-between', maxWidth: t.layout.maxWidth, width: '100%', alignSelf: 'center' }}>
      <View style={{ paddingTop: t.space.xl, gap: t.space.lg }}>
        <Button variant="ghost" label={`‹ ${v2t(lang, 'fu.back')}`} onPress={() => setStep('questions')} style={{ alignSelf: 'flex-start', marginLeft: -t.space.lg }} />
        <T level="caption" color="muted" style={{ fontWeight: '700' }}>{v2t(lang, 'fu.result.kicker')}</T>
        <T testID="fu-suggestion-title" level="display" accessibilityRole="header">{suggestion?.title}</T>
        <T testID="fu-suggestion-body" level="body">{suggestion?.body}</T>
        <EvidenceBadge level="prior" lang={lang} />
        <Surface tone="alt"><T level="caption" color="muted">{v2t(lang, 'fu.result.basis')}</T></Surface>
        {failed ? (
          <ErrorState testID="fu-save-failed" title={v2t(lang, 'cap.err.save.title')} body={v2t(lang, 'fu.result.saveFailed')} actions={[{ label: v2t(lang, 'fu.result.retry'), onPress: finish }]} />
        ) : null}
      </View>
      <View style={{ gap: t.space.md }}>
        <T level="caption" color="faint" style={{ textAlign: 'center' }}>{v2t(lang, 'fu.result.next')}</T>
        <Button testID="fu-finish" size="lg" fullWidth loading={saving} label={saving ? v2t(lang, 'fu.result.saving') : v2t(lang, 'fu.result.cta')} onPress={finish} />
        <T level="caption" color="faint" style={{ textAlign: 'center' }}>{v2t(lang, 'fu.later.health')}</T>
      </View>
    </View>
  );
}
