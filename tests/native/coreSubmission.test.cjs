// Real owner sheet/domain functions, isolated receipts and fake records only.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { test, afterEach } = require('node:test');
const ts = require('typescript');
const runtime = process.env.QUESTLIFE_UI_TEST_RUNTIME;
if (!runtime) throw Error('QUESTLIFE_UI_TEST_RUNTIME required');
const React = require(path.join(runtime, 'react'));
const { create, act } = require(path.join(runtime, 'react-test-renderer'));
global.IS_REACT_ACT_ENVIRONMENT = true;
const host = name => props => React.createElement(name, props, props.children);
const realLoad = Module._load;
let events = [], platform = 'web', calendarEvents = [], calendarReads = 0, calendarFailure;
Module._load = function(request, parent, main) {
  if (request === 'react') return React;
  if (request === 'react/jsx-runtime') return require(path.join(runtime, 'react/jsx-runtime'));
  if (request === 'react-native') return { Text: 'Text', View: 'View', Platform: { get OS() { return platform; } }, StyleSheet: { create: value => value } };
  if (request.endsWith('/V11Stage2ProductionSheet') || request.endsWith('/BottomSheetForm')) return host('Sheet');
  if (request.endsWith('/V11SheetControls')) return Object.fromEntries(['V11CategoricalChip', 'V11DiscreteNumericRail', 'V11SheetButton', 'V11StickySheetFooter'].map(name => [name, host(name)]));
  if (request === './AdaptiveDecisionWorkspace' || request === './NativeDecisionWorkspace') return host('Workspace');
  if (request === './ownerQuantRuntime') return { loadOwnerQuantArtifacts: async () => { throw Error('NO_NETWORK_EXPECTED'); } };
  if (request === './telemetry') return { recordAdaptiveDecisionTelemetry: value => events.push(value) };
  if (request.endsWith('/readPlanCalendar')) return { readPlanCalendar: async () => {
    calendarReads++; if (calendarFailure) throw calendarFailure; return calendarEvents;
  } };
  return realLoad.call(this, request, parent, main);
};
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText, file);
const { DEFAULT_DATA } = require('../../src/types.ts');
const { createDecisionEpisode, transitionDecisionEpisode } = require('../../src/adaptive-decision/decisionEpisode.ts');
const { createDecisionPlanPatch, applyDecisionPlanPatch, undoDecisionPlanPatch } = require('../../src/adaptive-decision/planPatch.ts');
const { decisionEpisodeToResult } = require('../../src/adaptive-decision/decisionEngine.ts');
const Core = require('../../src/adaptive-decision/QuestLifeCoreOwnerSheet.tsx').default;
const { CalendarPlanUnavailableError } = require('../../src/platform/calendar/planAvailability.ts');
let tree, props, applied, undone, separateWrites, closed, waited, retried, wait, retry;
const workspace = () => tree.root.findByType('Workspace').props;
const deferred = () => { let resolve; const promise = new Promise(done => resolve = done); return { promise, resolve }; };
const theme = { mode: 'light', text: { primary: '#111', secondary: '#333', metadata: '#555' }, control: { error: '#900' } };
async function render(os = 'web') {
  platform = os;
  applied = undone = separateWrites = closed = waited = retried = 0; events = [];
  calendarEvents = []; calendarReads = 0; calendarFailure = undefined;
  wait = retry = async () => {};
  const now = new Date().toISOString();
  const block = { id: 'TEST_BLOCK', title: 'TEST only', date: '2099-11-05', startTime: '09:00', endTime: '10:00', plannedMinutes: 60, taskType: 'deep_study', flexibility: 'movable', rigidity: 'medium', status: 'planned', source: 'manual', createdAt: 1 };
  const patch = createDecisionPlanPatch({ id: 'TEST_PATCH', date: block.date, generatedAt: now, before: [block], after: [{ ...block, startTime: '11:00', endTime: '12:00' }] });
  let episode = createDecisionEpisode({ id: 'TEST_EPISODE', questionType: 'custom', questionText: 'TEST only', subjectKind: 'owner', now, timezone: 'UTC', observationWindowStart: now });
  for (const status of ['CONTEXT_ASSEMBLING', 'READY', 'PROPOSED']) episode = transitionDecisionEpisode(episode, status, now);
  episode.candidateActions = [{ id: 'TEST_ACTION', kind: 'move', titleKey: 'stateLayerPlanTitle', descriptionKey: 'stateLayerPlanDescription', exactEffectKey: 'stateLayerPlanEffect', protectsKey: 'stateLayerPlanProtects', feasibilityKey: 'stateLayerPlanFeasible', uncertaintyKey: 'stateLayerPlanUncertainty', reversible: true, outcomeHorizon: 'two_hours', outcomeFields: ['state'], evidenceItemIds: [], constraintIds: [], policyTrace: [], planPatch: patch }];
  props = {
    data: { ...structuredClone(DEFAULT_DATA), scheduleBlocks: [block] }, decisionResults: [decisionEpisodeToResult({ episode, headline: 'TEST' })],
    lang: 'en', visible: true, reducedMotion: true, theme,
    onClose: () => closed++,
    onAddDecisionResult: result => { separateWrites++; props.decisionResults.push(result); return result; },
    onUpdateDecisionEpisode: (id, next) => { separateWrites++; props.decisionResults = props.decisionResults.map(row => row.id === id ? { ...row, decisionEpisode: next } : row); },
    onApplySchedulePatch: (p, result) => { applied++; props.data.scheduleBlocks = applyDecisionPlanPatch(props.data.scheduleBlocks, p); if (result) props.decisionResults = [result]; },
    onUndoSchedulePatch: (p, next) => { undone++; props.data.scheduleBlocks = undoDecisionPlanPatch(props.data.scheduleBlocks, p); if (next) props.decisionResults = props.decisionResults.map(row => row.id === next.id ? { ...row, decisionEpisode: next } : row); },
    waitForLocalWrites: async () => { waited++; await wait(); }, retryLocalWrites: async () => { retried++; await retry(); },
  };
  await act(async () => { tree = create(React.createElement(Core, props)); });
  assert.equal(workspace().episode.status, 'PROPOSED');
}
afterEach(async () => { if (tree) await act(async () => tree.unmount()); tree = undefined; });

const occupied = (start = '11:00', end = '12:00') => ({
  id: 'ISOLATED_SYSTEM_EVENT', externalEventId: 'ISOLATED_SYSTEM_EVENT', calendarId: 'ISOLATED_CALENDAR',
  title: 'Isolated Calendar commitment', startAt: new Date(`2099-11-05T${start}:00`).toISOString(),
  endAt: new Date(`2099-11-05T${end}:00`).toISOString(), ownership: 'external',
  availability: 'busy', allDay: false, source: 'system_calendar', lastSyncedAt: new Date().toISOString(),
});

test('native Core rejects an external Calendar collision with no internal block at that time', async () => {
  await render('ios'); calendarEvents = [occupied()];
  await act(async () => workspace().onApply());
  assert.equal(applied, 0); assert.equal(waited, 0);
  assert.equal(workspace().episode.status, 'PROPOSED');
  assert.match(workspace().error, /calendar/i);
});

test('native Core rechecks Calendar on Apply instead of trusting an earlier free preview', async () => {
  await render('ios');
  calendarEvents = [occupied()]; // Created externally after this preview was shown.
  await act(async () => workspace().onApply());
  assert.equal(applied, 0); assert.equal(calendarReads, 1);
  calendarEvents = []; await act(async () => workspace().onApply());
  assert.equal(applied, 1); assert.equal(calendarReads, 2);
});

test('native Core Undo refuses to restore a slot that became occupied externally', async () => {
  await render('ios'); await act(async () => workspace().onApply());
  await act(async () => tree.update(React.createElement(Core, props)));
  calendarEvents = [occupied('09:00', '10:00')];
  await act(async () => workspace().onUndo());
  assert.equal(undone, 0); assert.equal(workspace().episode.status, 'APPLIED');
  assert.match(workspace().error, /calendar/i);
});

test('native Core unavailable Calendar blocks Apply with a distinct actionable message and retry', async () => {
  await render('ios'); calendarFailure = new CalendarPlanUnavailableError();
  await act(async () => workspace().onApply());
  assert.equal(applied, 0); assert.equal(waited, 0);
  assert.match(workspace().error, /availability could not be confirmed/i);
  assert.match(workspace().error, /Settings/);
  assert.equal(workspace().busy, false);
  calendarFailure = undefined; await act(async () => workspace().onApply());
  assert.equal(applied, 1); assert.equal(workspace().episode.status, 'APPLIED');
});

test('an ACK-only retry cannot revalidate and apply the same decision a second time', async () => {
  await render('ios'); wait = async () => { throw Error('ACK_LOST'); };
  await act(async () => workspace().onApply());
  assert.equal(calendarReads, 1); assert.equal(applied, 1);
  calendarFailure = new CalendarPlanUnavailableError();
  await act(async () => workspace().onApply());
  assert.equal(calendarReads, 1); assert.equal(applied, 1); assert.equal(retried, 1);
  assert.equal(workspace().episode.status, 'APPLIED');
});

test('Core does not show Applied or emit success until the local receipt arrives', async () => {
  await render(); const gate = deferred(); wait = () => gate.promise;
  let task;
  await act(async () => { task = workspace().onApply(); });
  assert.equal(workspace().episode.status, 'PROPOSED');
  assert.equal(workspace().busy, true);
  assert.equal(events.some(row => row.name === 'decision_plan_applied'), false);
  await act(async () => tree.root.findByType('Sheet').props.onClose()); assert.equal(closed, 0);
  await act(async () => { gate.resolve(); await task; });
  assert.equal(workspace().episode.status, 'APPLIED');
  assert.equal(waited, 1); assert.equal(separateWrites, 0);
});

test('Core failed Apply retries the same episode and patch without another mutation', async () => {
  await render(); wait = async () => { throw Error('TEST_ACK_MISSING'); };
  await act(async () => workspace().onApply());
  assert.equal(workspace().episode.status, 'PROPOSED');
  assert.match(workspace().error, /retry/i);
  await act(async () => tree.root.findByType('Sheet').props.onClose()); assert.equal(closed, 0);
  await act(async () => workspace().onSelectAction('TEST_ACTION')); // cannot replace an unacknowledged submission
  await act(async () => tree.root.findByType('V11SheetButton').props.onPress());
  assert.equal(workspace().episode.status, 'APPLIED');
  assert.equal(applied, 1); assert.equal(separateWrites, 0); assert.equal(retried, 1);
  assert.equal(props.decisionResults.length, 1); assert.equal(props.decisionResults[0].id, 'TEST_EPISODE');
  assert.equal(events.filter(row => row.name === 'decision_plan_applied').length, 1);
});

test('native Core retains the receipt across repeated taps and retry failure', async () => {
  await render('ios'); const gate = deferred(); wait = () => gate.promise;
  let task;
  await act(async () => { task = workspace().onApply(); void workspace().onApply(); });
  assert.equal(applied, 1); assert.equal(workspace().episode.status, 'PROPOSED');
  await act(async () => tree.root.findByType('Sheet').props.onClose()); assert.equal(closed, 0);
  await act(async () => { gate.resolve(); await task; });
  await act(async () => tree.update(React.createElement(Core, props)));
  wait = retry = async () => { throw Error('TEST_DISK_FAILURE'); };
  await act(async () => workspace().onUndo());
  await act(async () => tree.root.findByType('V11SheetButton').props.onPress());
  assert.equal(workspace().episode.status, 'APPLIED'); assert.equal(undone, 1);
  retry = async () => {};
  await act(async () => tree.root.findByType('V11SheetButton').props.onPress());
  assert.equal(workspace().episode.status, 'PROPOSED'); assert.equal(undone, 1); assert.equal(retried, 2);
});

test('Core failed Undo keeps Applied until retry ACK and never undoes twice', async () => {
  await render(); await act(async () => workspace().onApply());
  await act(async () => tree.update(React.createElement(Core, props)));
  wait = async () => { throw Error('TEST_UNDO_ACK_MISSING'); };
  await act(async () => workspace().onUndo());
  assert.equal(workspace().episode.status, 'APPLIED');
  assert.match(workspace().error, /retry/i);
  await act(async () => workspace().onUndo());
  assert.equal(workspace().episode.status, 'PROPOSED');
  assert.equal(undone, 1); assert.equal(separateWrites, 0); assert.equal(retried, 1);
  assert.equal(props.data.scheduleBlocks[0].startTime, '09:00');
  assert.equal(props.decisionResults[0].decisionEpisode.undoState.available, false);
});

test('Core conflict does not queue a receipt or report success', async () => {
  await render(); props.data.scheduleBlocks[0].notes = 'Intervening edit';
  await act(async () => workspace().onApply());
  assert.equal(applied, 0); assert.equal(waited, 0);
  assert.equal(workspace().episode.status, 'PROPOSED');
  assert.ok(workspace().error);
  await act(async () => tree.root.findByType('Sheet').props.onClose()); assert.equal(closed, 1);
});

async function showFollowUp() {
  await render(); await act(async () => workspace().onApply());
  const episode = props.decisionResults[0].decisionEpisode;
  const at = hours => new Date(Date.now() - hours * 3600000).toISOString();
  const date = at(24).slice(0, 10);
  episode.appliedPlanPatch.appliedAt = at(26);
  episode.appliedPlanPatch.operations[0].after.date = date;
  // Disposable test origin emulates the qualified record contract, never sent anywhere.
  props.data.executionLogs = [{ id: 'TEST_EXECUTED', linkedScheduleBlockId: 'TEST_BLOCK', date,
    dataProvenance: { origin: 'OWNER_OBSERVED', confirmation: 'USER_ENTERED', eventStartAt: at(25), eventEndAt: at(24), recordedAt: at(23), availableAt: at(23) } }];
  await act(async () => tree.unmount());
  await act(async () => { tree = create(React.createElement(Core, props)); });
  assert.ok(tree.root.findByType('Sheet').props.footer);
  await act(async () => tree.root.findByType('V11DiscreteNumericRail').props.onChange(4));
}

test('Core outcome waits for receipt and failed retry preserves one recorded outcome', async () => {
  await showFollowUp(); wait = async () => { throw Error('TEST_OUTCOME_ACK_MISSING'); };
  const before = separateWrites;
  await act(async () => tree.root.findByType('Sheet').props.footer.props.onSave());
  assert.ok(tree.root.findByType('Sheet').props.footer, 'form must not switch to saved memory before ACK');
  const pending = structuredClone(props.decisionResults[0].decisionEpisode);
  await act(async () => tree.root.findByType('Sheet').props.onClose()); assert.equal(closed, 0);
  await act(async () => tree.root.findByType('Sheet').props.footer.props.onSave());
  assert.equal(tree.root.findByType('Sheet').props.footer, undefined);
  assert.deepEqual(props.decisionResults[0].decisionEpisode, pending);
  assert.equal(separateWrites, before + 1); assert.equal(retried, 1);
  assert.equal(events.filter(row => row.name === 'decision_follow_up_completed').length, 1);
});

test('Core skip cannot claim completion before its receipt', async () => {
  await showFollowUp(); wait = async () => { throw Error('TEST_SKIP_ACK_MISSING'); };
  await act(async () => tree.root.findByType('Sheet').props.footer.props.onCancel());
  assert.ok(tree.root.findByType('Sheet').props.footer);
  await act(async () => tree.root.findByType('Sheet').props.footer.props.onCancel());
  assert.equal(tree.root.findByType('Sheet').props.footer, undefined);
  assert.equal(retried, 1);
});
