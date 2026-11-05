// Real state-layer hook and sheet with isolated Store receipts. No personal data.
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
const RealDate = Date;
global.Date = class extends RealDate {
  constructor(...args) { super(...(args.length ? args : ['2026-11-05T09:00:00'])); }
  static now() { return new RealDate('2026-11-05T09:00:00').getTime(); }
};
const host = name => props => React.createElement(name, props, props.children);
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === 'react') return React;
  if (request === 'react/jsx-runtime') return require(path.join(runtime, 'react/jsx-runtime'));
  if (request === 'react-native') return { Text: 'Text', View: 'View', Pressable: 'Pressable' };
  if (request === '../store') return { useStore: () => store };
  if (request.endsWith('/V11Stage2ProductionSheet')) return host('Sheet');
  if (request.endsWith('/V11SheetControls')) return { V11StickySheetFooter: host('Footer') };
  return originalLoad.call(this, request, parent, isMain);
};
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, file);
const { applyDecisionPlanPatch, undoDecisionPlanPatch } = require('../../src/adaptive-decision/planPatch.ts');
const { useStateLayerPlan } = require('../../src/state-layer/useStateLayerActions.ts');
const Reorder = require('../../src/state-layer/StateReorderSheet.tsx').default;
let tree, hook, store, applyCount, undoCount, retryCount, episodeCount, wait, closed, applied;
const deferred = () => { let resolve; const promise = new Promise(done => resolve = done); return { promise, resolve }; };
const block = (id, start, taskType) => ({ id, title: id, date: '2026-11-05', startTime: `${start}:00`, endTime: `${start + 1}:00`,
  plannedMinutes: 60, taskType, flexibility: 'movable', rigidity: 'medium', status: 'planned', createdAt: 1, source: 'manual' });
const initial = () => [block('qa-deep', 20, 'deep_study'), block('qa-shallow', 21, 'admin')];
const patch = () => hook.preview({ date: '2026-11-05', before: store.data.scheduleBlocks, after: initial().map((b, i) => ({ ...b, startTime: `${21 - i}:00`, endTime: `${22 - i}:00` })) });
function Probe() { hook = useStateLayerPlan(); return null; }
const footer = () => tree.root.findByType('Sheet').props.footer.props;
async function render(sheet = false) {
  applyCount = undoCount = retryCount = episodeCount = closed = 0; applied = []; wait = async () => {};
  store = {
    data: { scheduleBlocks: initial(), executionLogs: [], decisionResults: [] },
    waitForLocalWrites: () => wait(), retryLocalWrites: async () => { retryCount++; },
    applyDecisionSchedulePatch: (p, result) => { applyCount++; store.data = { ...store.data, scheduleBlocks: applyDecisionPlanPatch(store.data.scheduleBlocks, p),
      decisionResults: result ? [...store.data.decisionResults, result] : store.data.decisionResults }; },
    undoDecisionSchedulePatch: (p, episode) => { undoCount++; if (episode) episodeCount++; store.data = { ...store.data, scheduleBlocks: undoDecisionPlanPatch(store.data.scheduleBlocks, p),
      decisionResults: episode ? store.data.decisionResults.map(row => row.id === episode.id ? { ...row, decisionEpisode: episode } : row) : store.data.decisionResults }; },
    addDecisionResult: result => { store.data = { ...store.data, decisionResults: [...store.data.decisionResults, result] }; },
    updateDecisionEpisode: (id, episode) => { episodeCount++; store.data = { ...store.data, decisionResults: store.data.decisionResults.map(row => row.id === id ? { ...row, decisionEpisode: episode } : row) }; },
  };
  await act(async () => { tree = create(sheet ? React.createElement(Reorder, { visible: true, lang: 'en', ruleId: 'qa', type: 'overload', reducedMotion: true,
    theme: { text: { primary: '#111', secondary: '#333', metadata: '#555' } }, onClose: () => closed++, onApplied: value => applied.push(value) }) : React.createElement(Probe)); });
}
afterEach(async () => { if (tree) await act(async () => tree.unmount()); tree = null; });

const calendar=(start,end)=>[{date:'2026-11-05',shortcutCalendar:{syncedAt:'2026-11-05T08:00:00',events:[{id:'shortcut-calendar:isolated',title:'Unavailable',calendarId:'isolated',externalEventId:'isolated',ownership:'external',availability:'busy',startAt:`2026-11-05T${start}:00`,endAt:`2026-11-05T${end}:00`,lastSyncedAt:'2026-11-05T08:00:00'}]}}];
test('new synced calendar occupancy after preview blocks Apply without persisting external blocks',async()=>{
  await render();const p=patch();store.data={...store.data,contextLogs:calendar('21:00','22:00')};await act(async()=>tree.update(React.createElement(Probe)));
  await assert.rejects(hook.confirmAndApply({patch:p,headline:'QA',ruleId:'qa'}));assert.equal(applyCount,0);assert.equal(store.data.scheduleBlocks.length,2);
});
test('Undo checks newly synced occupancy as well as internal edits',async()=>{
  await render();const result=await hook.confirmAndApply({patch:patch(),headline:'QA',ruleId:'qa'});store.data={...store.data,contextLogs:calendar('20:00','21:00')};await act(async()=>tree.update(React.createElement(Probe)));
  await assert.rejects(hook.undo(result));assert.equal(undoCount,0);
});

test('Apply ACK retry retains the same episode and never reapplies the schedule', async () => {
  await render(); const input = { patch: patch(), headline: 'QA', ruleId: 'qa' };
  wait = async () => { throw Error('ACK_MISSING'); };
  await assert.rejects(hook.confirmAndApply(input), /ACK_MISSING/);
  const id = store.data.decisionResults[0].id;
  const result = await hook.confirmAndApply(input);
  assert.equal(result.episode.id, id);
  assert.equal(applyCount, 1); assert.equal(store.data.decisionResults.length, 1); assert.equal(retryCount, 1);
});

test('concurrent Apply calls share a single pending confirmation', async () => {
  await render(); const gate = deferred(); wait = () => gate.promise;
  const input = { patch: patch(), headline: 'QA', ruleId: 'qa' };
  const a = hook.confirmAndApply(input); const b = hook.confirmAndApply(input);
  assert.equal(applyCount, 1); assert.equal(store.data.decisionResults.length, 1);
  gate.resolve(); assert.equal((await a).episode.id, (await b).episode.id);
});

test('Undo ACK retry saves the original result without executing Undo twice', async () => {
  await render(); const result = await hook.confirmAndApply({ patch: patch(), headline: 'QA', ruleId: 'qa' });
  await act(async () => tree.update(React.createElement(Probe)));
  wait = async () => { throw Error('UNDO_ACK_MISSING'); };
  await assert.rejects(hook.undo(result), /UNDO_ACK_MISSING/);
  await act(async () => tree.update(React.createElement(Probe)));
  await hook.undo(result);
  assert.equal(undoCount, 1); assert.equal(episodeCount, 1); assert.equal(retryCount, 1);
  assert.deepEqual(store.data.scheduleBlocks, initial());
});

test('conflict at Apply rejects without writing any episode or schedule', async () => {
  await render(); const input = { patch: patch(), headline: 'QA', ruleId: 'qa' };
  store.data = { ...store.data, scheduleBlocks: store.data.scheduleBlocks.map(b => ({ ...b, notes: 'new edit' })) };
  await act(async () => tree.update(React.createElement(Probe)));
  await assert.rejects(hook.confirmAndApply(input));
  assert.equal(applyCount, 0); assert.equal(store.data.decisionResults.length, 0);
});

for (const change of ['edit', 'execution']) test(`Undo preserves intervening ${change}`, async () => {
  await render(); const result = await hook.confirmAndApply({ patch: patch(), headline: 'QA', ruleId: 'qa' });
  store.data = change === 'edit'
    ? { ...store.data, scheduleBlocks: store.data.scheduleBlocks.map(b => ({ ...b, notes: 'new edit' })) }
    : { ...store.data, executionLogs: [{ id: 'qa-execution', linkedScheduleBlockId: 'qa-deep' }] };
  await act(async () => tree.update(React.createElement(Probe)));
  await assert.rejects(hook.undo(result));
  assert.equal(undoCount, 0); assert.equal(episodeCount, 0);
});

test('reorder sheet retains the confirmed preview and retry after optimistic schedule changes', async () => {
  await render(true); wait = async () => { throw Error('SAVE_FAILED'); };
  const before = tree.root.findAllByType('Text').map(node => node.children.join('')).join('|');
  await act(async () => footer().onSave());
  assert.equal(applied.length, 0);
  assert.equal(footer().disabled, false, 'retry must remain reachable after live preview becomes unchanged');
  assert.equal(footer().cancelDisabled, true);
  assert.match(footer().saveLabel, /Retry/);
  await act(async () => tree.root.findByType('Sheet').props.onClose()); assert.equal(closed, 0);
  const after = tree.root.findAllByType('Text').map(node => node.children.join('')).join('|');
  assert.ok(before.includes('20:00')); assert.ok(after.includes('20:00'));
  await act(async () => footer().onSave());
  assert.equal(applied.length, 1); assert.equal(applyCount, 1); assert.equal(store.data.decisionResults.length, 1);
});
