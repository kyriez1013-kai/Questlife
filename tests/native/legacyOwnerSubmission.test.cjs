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
let events = [];
Module._load = function(request, parent, main) {
  if (request === 'react') return React;
  if (request === 'react/jsx-runtime') return require(path.join(runtime, 'react/jsx-runtime'));
  if (request === 'react-native') return { Text: 'Text', View: 'View', Pressable: 'Pressable', StyleSheet: { create: value => value } };
  if (request.endsWith('/V11Stage2ProductionSheet')) return host('Sheet');
  if (request.endsWith('/V11SheetControls')) return Object.fromEntries(['V11CategoricalChip', 'V11DiscreteNumericRail', 'V11SheetButton', 'V11StickySheetFooter', 'V11TextField'].map(name => [name, host(name)]));
  if (request === './telemetry') return { recordAdaptiveDecisionTelemetry: value => events.push(value) };
  return realLoad.call(this, request, parent, main);
};
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText, file);
const { DEFAULT_DATA } = require('../../src/types.ts');
const { createDecisionEpisode, transitionDecisionEpisode } = require('../../src/adaptive-decision/decisionEpisode.ts');
const { createDecisionPlanPatch, applyDecisionPlanPatch, undoDecisionPlanPatch } = require('../../src/adaptive-decision/planPatch.ts');
const { decisionEpisodeToResult, selectDecisionAction } = require('../../src/adaptive-decision/decisionEngine.ts');
const OwnerSheet = require('../../src/adaptive-decision/AdaptiveDecisionLoopOwnerSheet.tsx').default;
let tree, props, applied, undone, separateWrites, closed, waited, retried, wait, retry;
const sheet = () => tree.root.findByType('Sheet').props;
const footer = () => sheet().footer?.props;
const deferred = () => { let resolve; const promise = new Promise(done => resolve = done); return { promise, resolve }; };
const theme = { mode: 'light', text: { primary: '#111', secondary: '#333', metadata: '#555' }, control: { error: '#900' } };
async function render() {
  applied = undone = separateWrites = closed = waited = retried = 0; events = [];
  wait = retry = async () => {};
  const now = new Date().toISOString();
  const block = { id: 'TEST_BLOCK', title: 'TEST only', date: '2099-11-05', startTime: '09:00', endTime: '10:00', plannedMinutes: 60, taskType: 'deep_study', flexibility: 'movable', rigidity: 'medium', status: 'planned', source: 'manual', createdAt: 1 };
  const patch = createDecisionPlanPatch({ id: 'TEST_PATCH', date: block.date, generatedAt: now, before: [block], after: [{ ...block, startTime: '11:00', endTime: '12:00' }] });
  let episode = createDecisionEpisode({ id: 'TEST_EPISODE', questionType: 'custom', questionText: 'TEST only', subjectKind: 'owner', now, timezone: 'UTC', observationWindowStart: now });
  for (const status of ['CONTEXT_ASSEMBLING', 'READY', 'PROPOSED']) episode = transitionDecisionEpisode(episode, status, now);
  episode.candidateActions = [{ id: 'TEST_ACTION', kind: 'move', titleKey: 'stateLayerPlanTitle', descriptionKey: 'stateLayerPlanDescription', exactEffectKey: 'stateLayerPlanEffect', protectsKey: 'stateLayerPlanProtects', feasibilityKey: 'stateLayerPlanFeasible', uncertaintyKey: 'stateLayerPlanUncertainty', reversible: true, outcomeHorizon: 'two_hours', outcomeFields: ['state'], evidenceItemIds: [], constraintIds: [], policyTrace: [], planPatch: patch }];
  episode = selectDecisionAction(episode, 'TEST_ACTION', now);
  props = {
    data: { ...structuredClone(DEFAULT_DATA), scheduleBlocks: [block] }, decisionResults: [decisionEpisodeToResult({ episode, headline: 'TEST' })],
    lang: 'en', visible: true, reducedMotion: true, theme,
    onClose: () => closed++,
    onAddDecisionResult: result => { separateWrites++; props.decisionResults = [...props.decisionResults, result]; return result; },
    onUpdateDecisionEpisode: (id, next) => { separateWrites++; props.decisionResults = props.decisionResults.map(row => row.id === id ? { ...row, decisionEpisode: next } : row); },
    onApplySchedulePatch: (p, result) => { applied++; props.data.scheduleBlocks = applyDecisionPlanPatch(props.data.scheduleBlocks, p); if (result) props.decisionResults = [result]; },
    onUndoSchedulePatch: (p, next) => { undone++; props.data.scheduleBlocks = undoDecisionPlanPatch(props.data.scheduleBlocks, p); if (next) props.decisionResults = props.decisionResults.map(row => row.id === next.id ? { ...row, decisionEpisode: next } : row); },
    waitForLocalWrites: async () => { waited++; await wait(); }, retryLocalWrites: async () => { retried++; await retry(); },
  };
  await act(async () => { tree = create(React.createElement(OwnerSheet, props)); });
  assert.match(footer().saveLabel, /apply/i);
}
afterEach(async () => { if (tree) await act(async () => tree.unmount()); tree = undefined; });

test('legacy owner Apply remains pending through optimistic parent refresh until ACK', async () => {
  await render(); const gate = deferred(); wait = () => gate.promise; let task;
  await act(async () => { task = footer().onSave(); });
  await act(async () => { void footer().onSave(); });
  assert.equal(applied, 1);
  await act(async () => tree.update(React.createElement(OwnerSheet, props)));
  assert.equal(events.some(row => row.name === 'decision_plan_applied'), false);
  for (const option of tree.root.findAllByType('Pressable').filter(row => row.props.accessibilityRole === 'radio')) assert.equal(option.props.disabled, true);
  assert.equal(footer().saving, true);
  await act(async () => sheet().onClose()); assert.equal(closed, 0);
  await act(async () => { gate.resolve(); await task; });
  assert.match(footer().cancelLabel, /Undo/); assert.equal(waited, 1); assert.equal(separateWrites, 0);
});

test('legacy owner failed Apply retains one patch and episode through retry', async () => {
  await render(); wait = async () => { throw Error('TEST_ACK'); };
  await act(async () => footer().onSave());
  assert.match(footer().saveLabel, /apply/i);
  assert.equal(events.some(row => row.name === 'decision_plan_applied'), false);
  assert.equal(tree.root.findAllByType('V11SheetButton').at(-1).props.label, 'Retry');
  await act(async () => footer().onCancel());
  assert.ok(footer(), 'failed mutation cannot be replaced by another proposal');
  await act(async () => footer().onSave());
  assert.equal(applied, 1); assert.equal(separateWrites, 0); assert.equal(retried, 1);
  assert.equal(props.decisionResults[0].id, 'TEST_EPISODE');
  assert.equal(events.filter(row => row.name === 'decision_plan_applied').length, 1);
});

test('legacy owner renders the recognized state-layer question rather than its storage marker', async () => {
  await render(); const episode = structuredClone(props.decisionResults[0].decisionEpisode);
  episode.question.text = 'state_layer'; episode.candidateActions[0].id = 'state-layer-plan';
  props.decisionResults = [{ ...props.decisionResults[0], decisionEpisode: episode }];
  await act(async () => tree.update(React.createElement(OwnerSheet, props)));
  const copy = tree.root.findAllByType('Text').map(node => node.props.children).filter(value => typeof value === 'string');
  assert.ok(copy.includes('How could today fit your current state?')); assert.ok(!copy.includes('state_layer'));
});

test('legacy owner Undo never reports completion or repeats mutation before retry ACK', async () => {
  await render(); await act(async () => footer().onSave());
  await act(async () => tree.update(React.createElement(OwnerSheet, props)));
  wait = async () => { throw Error('TEST_ACK'); };
  await act(async () => footer().onCancel());
  assert.ok(footer(), 'receipt remains until Undo is durable');
  assert.equal(events.some(row => row.name === 'decision_undo_used'), false);
  await act(async () => sheet().onClose()); assert.equal(closed, 0);
  await act(async () => footer().onCancel());
  assert.equal(undone, 1); assert.equal(retried, 1); assert.equal(separateWrites, 0);
  assert.equal(props.data.scheduleBlocks[0].startTime, '09:00');
});

test('legacy owner rejects an intervening plan edit without queueing any write', async () => {
  await render(); props.data.scheduleBlocks[0].notes = 'TEST intervening edit';
  await act(async () => footer().onSave());
  assert.equal(applied, 0); assert.equal(waited, 0); assert.equal(separateWrites, 0);
  assert.equal(events.some(row => row.name === 'decision_plan_applied'), false);
  await act(async () => sheet().onClose()); assert.equal(closed, 1);
});

async function followUp() {
  await render(); await act(async () => footer().onSave());
  const episode = props.decisionResults[0].decisionEpisode;
  const at = hours => new Date(Date.now() - hours * 3600000).toISOString();
  const date = at(24).slice(0, 10);
  episode.appliedPlanPatch.appliedAt = at(26); episode.appliedPlanPatch.operations[0].after.date = date;
  props.data.executionLogs = [{ id: 'TEST_EXECUTION', linkedScheduleBlockId: 'TEST_BLOCK', date,
    dataProvenance: { origin: 'OWNER_OBSERVED', confirmation: 'USER_ENTERED', eventStartAt: at(25), eventEndAt: at(24), recordedAt: at(23), availableAt: at(23) } }];
  await act(async () => tree.unmount());
  await act(async () => { tree = create(React.createElement(OwnerSheet, props)); });
  await act(async () => tree.root.findByType('V11DiscreteNumericRail').props.onChange(4));
}

for (const action of ['onSave', 'onCancel']) test(`legacy owner follow-up ${action} waits and retries the same persisted outcome`, async () => {
  await followUp(); wait = async () => { throw Error('TEST_ACK'); }; const before = separateWrites;
  await act(async () => footer()[action]());
  assert.ok(footer(), 'follow-up stays open before receipt');
  assert.equal(tree.root.findByType('V11DiscreteNumericRail').props.disabled, true);
  const pending = structuredClone(props.decisionResults[0].decisionEpisode);
  await act(async () => tree.update(React.createElement(OwnerSheet, props)));
  assert.ok(footer(), 'optimistic result cannot hide the retry');
  await act(async () => footer()[action]());
  assert.equal(footer(), undefined); assert.equal(retried, 1);
  assert.equal(separateWrites, before + 1); assert.deepEqual(props.decisionResults[0].decisionEpisode, pending);
});
