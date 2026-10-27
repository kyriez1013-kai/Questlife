import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useV2Theme } from '../theme';
import { v2t, type V2Lang, type V2Key } from '../copy';
import type { TodayModel } from '../model/todayModel';
import type { FirstSuggestion } from '../model/firstUse';
import type { QuickCaptureSuggestion } from '../../platform/quickCapture';
import { T, Surface, Button, Chip, Row, Hairline } from '../components/primitives';
import { EvidenceBadge, SampleBadge, SyncBadge, EmptyState } from '../components/feedback';
import { StateDial, Composer } from '../components/inputs';

export type TodayViewProps = {
  lang: V2Lang;
  model: TodayModel;
  dateLabel: string;
  command: { title: string; reason: string };
  firstSuggestion?: FirstSuggestion | null;
  persistence: { pending: number; failed: boolean };
  onRetryPersist: () => void;
  onLogState: (n: 1 | 2 | 3 | 4 | 5) => void;
  stateSaving: boolean;
  stateError: string | null;
  composer: string;
  onComposer: (s: string) => void;
  onSubmitComposer: () => void;
  composerBusy?: boolean;
  composerFocusKey?: number;
  onPrimary: () => void;
  onDoneLog: () => void;
  onQuick: (q: QuickCaptureSuggestion) => void;
  sample?: boolean;
};

function actionLabelKey(a: TodayModel['action']): V2Key {
  return (`action.${a}`) as V2Key;
}

export function TodayView(p: TodayViewProps) {
  const t = useV2Theme();
  const { model, lang } = p;
  const [editingState, setEditingState] = useState(false);
  const showDial = !model.state || editingState;
  const stateColor = model.state ? t.color.state[Math.max(0, Math.min(4, model.state.overall - 1))] : t.color.inkFaint;
  const sample = !!p.sample;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        testID="today-scroll"
        contentContainerStyle={{ padding: t.space.lg, paddingBottom: t.space.xl, gap: t.space.xl, maxWidth: t.layout.maxWidth, width: '100%', alignSelf: 'center' }}
        keyboardShouldPersistTaps="handled"
      >
        {/* header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: t.layout.hit }}>
          <T level="title" accessibilityRole="header">{p.dateLabel}</T>
          {sample ? <SampleBadge lang={lang} /> : <SyncBadge pending={p.persistence.pending} failed={p.persistence.failed} lang={lang} onRetry={p.onRetryPersist} />}
        </View>

        {/* hero: how am I now */}
        <View testID="hero-state" style={{ gap: t.space.md }}>
          {model.state ? (
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <T level="caption" color="muted">{v2t(lang, 'today.state.logged')}</T>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: t.space.md }}>
                  <T level="display" testID="state-word" style={{ color: t.color.ink }}>{model.state.label}</T>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: stateColor }} accessibilityElementsHidden />
                </View>
                <T level="caption" color="muted">{model.state.overall}/5 · {model.state.timeLabel}</T>
              </View>
              <Button testID="state-update" variant="secondary" label={v2t(lang, 'today.state.update')} onPress={() => setEditingState((v) => !v)} />
            </View>
          ) : (
            <View>
              <T level="caption" color="muted">{v2t(lang, 'today.state.none')}</T>
              <T level="display">{v2t(lang, 'today.state.ask')}</T>
            </View>
          )}
          {showDial ? (
            <StateDial
              testID="state-dial"
              lang={lang}
              value={model.state?.overall ?? null}
              disabled={p.stateSaving || sample}
              onChange={(n) => { setEditingState(false); p.onLogState(n); }}
            />
          ) : null}
          {p.stateSaving ? <T level="caption" color="muted">{v2t(lang, 'cap.saving')}</T> : null}
          {p.stateError ? <T level="caption" color="danger" accessibilityRole="alert">{p.stateError}</T> : null}
        </View>

        {/* next step: todayCommand is the authority */}
        <Surface tone="alt" style={{ gap: t.space.md }}>
          <T level="caption" color="muted">{v2t(lang, 'today.next.kicker')}</T>
          <T testID="next-title" level="title">{p.firstSuggestion && model.command.type === 'empty_state' ? p.firstSuggestion.title : p.command.title}</T>
          <T level="body" color="muted">{p.firstSuggestion && model.command.type === 'empty_state' ? p.firstSuggestion.body : p.command.reason}</T>
          {p.firstSuggestion && model.command.type === 'empty_state' ? <EvidenceBadge level="prior" lang={lang} /> : null}
          <View style={{ flexDirection: 'row', gap: t.space.sm, flexWrap: 'wrap' }}>
            <Button testID="next-primary" label={v2t(lang, actionLabelKey(model.action))} onPress={p.onPrimary} disabled={sample} />
            {model.action !== 'log' && model.action !== 'create_goal' ? (
              <Button testID="next-done-log" variant="ghost" label={v2t(lang, 'today.done.log')} onPress={p.onDoneLog} disabled={sample} />
            ) : null}
          </View>
        </Surface>

        {model.hint ? (
          <T testID="unlock-hint" level="caption" color="muted" style={{ marginTop: -t.space.md }}>▸ {model.hint}</T>
        ) : null}

        {/* records: actual and predicted stay separate; missing is missing */}
        <View testID="records" style={{ gap: t.space.xs }}>
          <T level="caption" color="muted">{v2t(lang, 'today.records')}</T>
          {model.records.length === 0 ? (
            <EmptyState title={v2t(lang, 'today.records.empty')} />
          ) : (
            <View>
              {model.records.map((r, i) => (
                <View key={r.id}>
                  {i > 0 ? <Hairline /> : null}
                  <Row
                    testID={`record-${r.id}`}
                    title={r.title}
                    lines={[
                      r.actual.length ? `${v2t(lang, 'today.actual')} ${r.actual.join(' · ')}` : `${v2t(lang, 'today.actual')} ${v2t(lang, 'today.missing')}`,
                      ...(r.predicted.length ? [r.predicted.join(' · ')] : []),
                    ]}
                    right={<T level="caption" color="faint">{r.timeLabel}</T>}
                  />
                </View>
              ))}
            </View>
          )}
        </View>

        {/* evidence: what your data can and cannot say yet */}
        <View testID="evidence" style={{ gap: t.space.sm }}>
          <T level="caption" color="muted">{v2t(lang, 'today.evidence.title')}</T>
          {model.evidence.slice(0, 3).map((c) => (
            <Surface key={c.id} style={{ gap: t.space.xs }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: t.space.md }}>
                <T level="body" style={{ fontWeight: '600' }}>{c.subject}</T>
                <EvidenceBadge level={sample ? 'sample' : c.level} lang={lang} />
              </View>
              <T level="caption" color="muted">{c.have}/{c.need} {c.unit}{c.unitNote ? ` · ${c.unitNote}` : ''}</T>
              {c.missing ? <T level="caption" color="muted">{c.missing}</T> : null}
              {c.association && c.level !== 'e0' ? <T level="caption" color="faint">{v2t(lang, 'ev.association')}</T> : null}
            </Surface>
          ))}
        </View>
      </ScrollView>

      {/* thumb zone: quick chips + composer, always visible */}
      <View style={{ paddingHorizontal: t.space.lg, paddingTop: t.space.sm, paddingBottom: t.space.md, gap: t.space.sm, backgroundColor: t.color.bg, borderTopWidth: 1, borderTopColor: t.color.hairline, alignItems: 'center' }}>
        <View style={{ width: '100%', maxWidth: t.layout.maxWidth, gap: t.space.sm }}>
          {model.quick.length > 0 && !sample ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: t.space.sm, alignItems: 'center' }} keyboardShouldPersistTaps="handled">
              <T level="caption" color="muted">{v2t(lang, 'composer.quick')}</T>
              {model.quick.map((q) => <Chip key={q.id} testID={`quick-${q.id}`} label={q.label} onPress={() => p.onQuick(q)} />)}
            </ScrollView>
          ) : null}
          <Composer
            value={p.composer}
            onChange={p.onComposer}
            onSubmit={p.onSubmitComposer}
            busy={p.composerBusy || sample}
            focusKey={p.composerFocusKey}
            placeholder={v2t(lang, 'composer.placeholder')}
            sendLabel={v2t(lang, 'composer.send')}
          />
        </View>
      </View>
    </View>
  );
}

