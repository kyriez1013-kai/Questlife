import React from 'react';
import { ActivityIndicator, Platform, Pressable, View } from 'react-native';
import { useV2Theme } from '../theme';
import { v2t, type V2Lang } from '../copy';
import { canSave, type CaptureEvent, type CaptureState } from '../model/captureMachine';
import type { V2Entry } from '../model/localParse';
import { Sheet } from '../components/Sheet';
import { Button, Surface, T } from '../components/primitives';
import { ErrorState } from '../components/feedback';
import { NumberField, StateDial, TextField } from '../components/inputs';

type Props = {
  lang: V2Lang;
  state: CaptureState;
  dispatch: (e: CaptureEvent) => void;
  skillName: (id: string | null) => string | null;
  onSave: () => void;
  onCancel: () => void;
  onRetryParse: () => void;
  onManual: () => void;
  onKeepRaw: () => void;
  onRetrySave: () => void;
  onLater: () => void;
};

function copyText(text: string): boolean {
  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fall through */ }
  return false;
}

function RawQuote({ text, lang }: { text: string; lang: V2Lang }) {
  const t = useV2Theme();
  return (
    <T testID="cap-raw" level="body" color="muted" accessibilityRole="text" style={{ paddingLeft: t.space.md, borderLeftWidth: 2, borderLeftColor: t.color.hairline }}>{`${v2t(lang, 'cap.raw')}：${text}`}</T>
  );
}

function EntryCard({ entry, index, lang, dispatch, skillName }: { entry: V2Entry; index: number; lang: V2Lang; dispatch: (e: CaptureEvent) => void; skillName: (id: string | null) => string | null }) {
  const t = useV2Theme();
  const edit = (patch: Partial<V2Entry>) => dispatch({ type: 'EDIT', index, patch });
  const header = (label: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: t.layout.hit - 14 }}>
      <T level="caption" color="muted" style={{ fontWeight: '700' }}>{label}</T>
      <Pressable testID={`entry-remove-${index}`} accessibilityRole="button" accessibilityLabel="移除这一项" onPress={() => dispatch({ type: 'REMOVE', index })}
        style={{ minWidth: t.layout.hit, minHeight: t.layout.hit, alignItems: 'center', justifyContent: 'center', marginRight: -t.space.md }}>
        <T level="body" color="muted">✕</T>
      </Pressable>
    </View>
  );
  if (entry.kind === 'state') {
    return (
      <Surface style={{ gap: t.space.xs, padding: t.space.md }}>
        {header(v2t(lang, 'cap.entry.state'))}
        <StateDial testID={`entry-state-${index}`} lang={lang} value={entry.overall} onChange={(n) => edit({ overall: n } as Partial<V2Entry>)} />
      </Surface>
    );
  }
  if (entry.kind === 'note') {
    return (
      <Surface style={{ gap: t.space.xs, padding: t.space.md }}>
        {header(v2t(lang, 'cap.entry.note'))}
        <TextField testID={`entry-title-${index}`} label={v2t(lang, 'cap.raw')} value={entry.title} onChange={(s) => edit({ title: s } as Partial<V2Entry>)} />
      </Surface>
    );
  }
  const matched = skillName(entry.skillId);
  const hasStrength = entry.weightKg != null || entry.sets != null || entry.reps != null;
  const [showStrength, setShowStrength] = React.useState(hasStrength);
  return (
    <Surface style={{ gap: t.space.sm, padding: t.space.md }}>
      {header(v2t(lang, 'cap.entry.action'))}
      <TextField testID={`entry-title-${index}`} label={v2t(lang, 'cap.field.name')} value={entry.title} onChange={(s) => edit({ title: s, skillId: matched && s === matched ? entry.skillId : null } as Partial<V2Entry>)} />
      <T level="caption" color="muted">{matched ? v2t(lang, 'cap.matched', { name: matched }) : v2t(lang, 'cap.unmatched')}</T>
      <View style={{ flexDirection: 'row', gap: t.space.sm, alignItems: 'flex-end' }}>
        <NumberField testID={`entry-min-${index}`} label="分钟" value={entry.durationMinutes} onChange={(n) => edit({ durationMinutes: n } as Partial<V2Entry>)} />
        {showStrength ? (
          <>
            <NumberField testID={`entry-kg-${index}`} label="kg" value={entry.weightKg} onChange={(n) => edit({ weightKg: n } as Partial<V2Entry>)} />
            <NumberField testID={`entry-sets-${index}`} label="组" value={entry.sets} onChange={(n) => edit({ sets: n } as Partial<V2Entry>)} />
            <NumberField testID={`entry-reps-${index}`} label="次/组" value={entry.reps} onChange={(n) => edit({ reps: n } as Partial<V2Entry>)} />
          </>
        ) : (
          <View style={{ flex: 3 }}><Button testID={`entry-add-strength-${index}`} variant="ghost" label={v2t(lang, 'cap.addStrength')} onPress={() => setShowStrength(true)} /></View>
        )}
      </View>
      {entry.durationMinutes == null ? <T level="caption" color="faint">{v2t(lang, 'cap.field.emptyHint')}</T> : null}
    </Surface>
  );
}

export function CaptureSheet(p: Props) {
  const t = useV2Theme();
  const { state, lang } = p;
  const open = state.phase !== 'idle' && state.phase !== 'saved';
  const [copied, setCopied] = React.useState(false);

  let body: React.ReactNode = null;
  let footer: React.ReactNode = null;

  if (state.phase === 'saving_raw' || state.phase === 'parsing') {
    body = (
      <>
        <T level="title" accessibilityRole="header">{v2t(lang, 'cap.title')}</T>
        <RawQuote text={state.text} lang={lang} />
        <View testID="cap-parsing" style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.md }}>
          <ActivityIndicator color={t.color.inkMuted} />
          <T level="body" color="muted">{v2t(lang, 'cap.parsing')}</T>
        </View>
      </>
    );
    footer = <Button variant="ghost" label={v2t(lang, 'cap.cancel')} onPress={p.onLater} fullWidth />;
  } else if (state.phase === 'parse_failed') {
    body = (
      <>
        <RawQuote text={state.text} lang={lang} />
        <ErrorState
          testID="cap-parse-failed"
          title={v2t(lang, 'cap.err.parse.title')}
          body={v2t(lang, 'cap.err.parse.body')}
          actions={[
            { label: v2t(lang, 'cap.err.parse.retry'), onPress: p.onRetryParse },
            { label: v2t(lang, 'cap.err.parse.manual'), onPress: p.onManual, variant: 'secondary' },
            { label: v2t(lang, 'cap.err.parse.keep'), onPress: p.onKeepRaw, variant: 'ghost' },
          ]}
        />
      </>
    );
  } else if (state.phase === 'save_failed') {
    body = (
      <>
        <RawQuote text={state.text} lang={lang} />
        <ErrorState
          testID="cap-save-failed"
          title={v2t(lang, 'cap.err.save.title')}
          body={v2t(lang, 'cap.err.save.body')}
          actions={[
            { label: v2t(lang, 'cap.err.save.retry'), onPress: p.onRetrySave },
            { label: copied ? v2t(lang, 'cap.copied') : v2t(lang, 'cap.err.save.copy'), onPress: () => { if (copyText(state.text)) setCopied(true); }, variant: 'secondary' },
            { label: v2t(lang, 'cap.err.save.later'), onPress: p.onLater, variant: 'ghost' },
          ]}
        />
      </>
    );
  } else if (state.phase === 'confirm' || state.phase === 'saving') {
    const saving = state.phase === 'saving';
    const entries = state.entries;
    body = (
      <>
        <T level="title" accessibilityRole="header">{v2t(lang, 'cap.title')}</T>
        <RawQuote text={state.text} lang={lang} />
        {state.source === 'local' ? (
          <View testID="cap-banner" accessibilityRole="alert" style={{ padding: t.space.md, borderRadius: t.radius.sm, backgroundColor: t.color.surfaceAlt, gap: 2 }}>
            <T testID="cap-source" level="caption" style={{ fontWeight: '700' }}>{v2t(lang, 'cap.source.local')}</T>
            {state.banner ? <T level="caption" color="muted">{v2t(lang, state.banner === 'offline' ? 'cap.banner.offline' : 'cap.banner.aiOff')}</T> : null}
          </View>
        ) : (
          <View testID="cap-source" style={{ alignSelf: 'flex-start', paddingHorizontal: t.space.md, paddingVertical: t.space.xs, borderRadius: t.radius.pill, backgroundColor: state.source === 'ai' ? t.color.primarySoft : t.color.surfaceAlt }}>
            <T level="caption" style={{ fontWeight: '600' }}>{v2t(lang, state.source === 'ai' ? 'cap.source.ai' : 'cap.source.manual')}</T>
          </View>
        )}
        {entries.length === 0 ? <T level="body" color="muted">{v2t(lang, 'cap.nothing')}</T> : null}
        <View style={{ gap: t.space.sm }}>
          {entries.map((e, i) => <EntryCard key={i} entry={e} index={i} lang={lang} dispatch={p.dispatch} skillName={p.skillName} />)}
        </View>
        <Button testID="cap-add" variant="ghost" label={v2t(lang, 'cap.add')} onPress={() => p.dispatch({ type: 'ADD_ACTION' })} />
      </>
    );
    footer = (
      <View style={{ flexDirection: 'row', gap: t.space.sm, alignItems: 'center' }}>
        <Button testID="cap-cancel" variant="ghost" disabled={saving} label={v2t(lang, 'cap.cancel')} onPress={p.onCancel} />
        <Button
          testID="cap-save"
          size="lg"
          style={{ flex: 1 }}
          loading={saving}
          disabled={!canSave(entries)}
          label={saving ? v2t(lang, 'cap.saving') : entries.length > 1 ? v2t(lang, 'cap.saveN', { n: entries.length }) : v2t(lang, 'cap.save')}
          onPress={p.onSave}
        />
      </View>
    );
  }

  return (
    <Sheet open={open} onClose={p.onLater} dismissable={state.phase !== 'saving'} footer={footer} testID="capture-sheet">
      {body}
    </Sheet>
  );
}
