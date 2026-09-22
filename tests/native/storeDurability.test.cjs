// Actual Store + SyncEngine, disposable in-memory disk. No user files or network.
const assert = require('node:assert/strict');
const { test, afterEach } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const runtime = process.env.QUESTLIFE_UI_TEST_RUNTIME;
if (!runtime) throw Error('QUESTLIFE_UI_TEST_RUNTIME is required');
const React = require(path.join(runtime, 'react'));
const { create, act } = require(path.join(runtime, 'react-test-renderer'));
global.IS_REACT_ACT_ENVIRONMENT = true;
let disk, journal, engine, store, tree, sequence, commitCalls, failSave, failBeforeCommit, gate, project;
const clone = value => structuredClone(value);
const original = Module._load;
Module._load = function(request, parent, main) {
  if (request === 'react') return React;
  if (request === 'react/jsx-runtime') return require(path.join(runtime, 'react/jsx-runtime'));
  if (request === 'react-native') return { Platform: { OS: 'android' }, Appearance: { getColorScheme: () => 'light' } };
  if (/\/storage$/.test(request)) return {
    loadData: async () => clone(disk), hasSyncAccountBinding: async () => true,
    uid: () => `TEST_${++sequence}`, today: () => '2026-09-22', readPersistedDataForDebug: async () => clone(disk),
    persist: async (next, options) => {
      if (gate) await gate.promise;
      if (failSave) { failSave = false; throw Error('TEST_DISK_FULL'); }
      disk = rebaseAppDataWrite(options.base, next, disk);
      return clone(disk);
    },
  };
  if (request === './notifications') return { scheduleSkillReminder: async () => {}, cancelSkillReminder: async () => {}, rescheduleAllReminders: async () => {} };
  if (/\/analytics$/.test(request)) return { trackEvent() {} };
  if (/\/syncService$/.test(request)) return { scheduleServerSync() {} };
  if (/\/syncDeletionOutbox$/.test(request)) return { enqueueServerDeletions: async () => {} };
  if (/\/persistenceTrace$/.test(request)) return { installPersistenceDebugBridge: () => () => {} };
  if (/\/sync-v2\/runtime$/.test(request)) return {
    getSyncEngine: async () => engine,
    startSyncRuntime: async (_read, apply) => { project = apply; return () => {}; },
    persistWithSync: async (base, next, source, save) => {
      commitCalls++;
      if (failBeforeCommit) { failBeforeCommit = false; throw Error('TEST_JOURNAL_FAILURE'); }
      let committed;
      await engine.commit(localChanges(base, next, source === 'store.explicit_delete'), async () => { committed = await save(); });
      return committed;
    },
  };
  return original.call(this, request, parent, main);
};
for (const extension of ['.ts', '.tsx']) require.extensions[extension] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText, file);
const { DEFAULT_DATA } = require('../../src/types.ts');
const { rebaseAppDataWrite } = require('../../src/utils/persistenceConsistency.ts');
const { emptySyncState } = require('../../src/sync-v2/contracts.ts');
const { SyncEngineV2 } = require('../../src/sync-v2/engine.ts');
const { localChanges, projectAppData } = require('../../src/sync-v2/projection.ts');
const { StoreProvider, useStore } = require('../../src/store.tsx');
const { DurableSubmission } = require('../../src/utils/durableSubmission.ts');
const Observer = () => { store = useStore(); return null; };
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
async function mount() { await act(async () => { tree = create(React.createElement(StoreProvider, {}, React.createElement(Observer))); }); }
async function fresh() {
  disk = clone(DEFAULT_DATA); journal = emptySyncState(); sequence = 0; commitCalls = 0; failSave = false; failBeforeCommit = false; gate = undefined;
  engine = new SyncEngineV2({ read: async () => clone(journal), write: async state => { journal = clone(state); },
    apply: async changes => { await project(changes); } },
  { push: async () => { throw Error('NO_NETWORK_ALLOWED'); }, pull: async () => { throw Error('NO_NETWORK_ALLOWED'); } }, 'TEST_DEVICE', () => `TEST_OP_${++sequence}`);
  await mount(); assert.equal(store.loading, false);
}
afterEach(async () => { if (tree) await act(async () => tree.unmount()); tree = undefined; });
const plan = { title: 'TEST plan', date: '2026-09-22', startTime: '09:00', endTime: '10:00', plannedMinutes: 60,
  taskType: 'deep_study', flexibility: 'flexible', rigidity: 'medium', status: 'planned', source: 'manual' };

// Execute the actual callback body without loading every Today visual dependency.
function homeCallback(name, bindings, screen = 'HomeScreen') {
  const file=path.join(__dirname,`../../src/screens/${screen}.tsx`);
  const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const home=source.statements.find(row=>ts.isFunctionDeclaration(row)&&row.name?.text===screen);
  const statement=home.body.statements.find(row=>ts.isVariableStatement(row)&&row.declarationList.declarations.some(declaration=>declaration.name.getText(source)===name));
  assert.ok(statement, `Missing Home callback ${name}`);
  const js=ts.transpileModule(statement.getText(source),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  return new Function('useCallback',...Object.keys(bindings),`${js}\nreturn ${name};`)(fn=>fn,...Object.values(bindings));
}

function captureHelper(name) {
  const file=path.join(__dirname,'../../src/screens/HomeCapturePending.tsx');
  const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const declaration=source.statements.find(row=>ts.isFunctionDeclaration(row)&&row.name?.text===name);
  assert.ok(declaration);
  const js=ts.transpileModule(declaration.getText(source),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  return new Function(`${js}\nreturn ${name};`)();
}

test('parser-proposed quality is not saved as an observation without explicit user selection',async()=>{
  await fresh();const complete=captureHelper('entryWithCompletion');
  const proposal={skillName:'TEST SQL',progressType:'time_based',qualityRating:4,fields:{durationMinutes:40}};
  const original=clone(proposal);
  const completed=complete(proposal,{include:true,createNew:true,moduleId:null});
  assert.equal(completed.qualityRating,undefined);assert.deepEqual(proposal,original);
  await act(async()=>{store.createExecutionLog({id:'TEST_UNRATED',date:plan.date,title:completed.skillName,durationMinutes:completed.fields.durationMinutes,qualityRating:completed.qualityRating});await store.waitForLocalWrites();});
  assert.equal(disk.executionLogs[0].qualityRating,undefined);
  await act(async()=>tree.unmount());tree=undefined;await mount();
  assert.equal(store.data.executionLogs[0].qualityRating,undefined);
});

test('explicit Capture quality and clearing it persist exactly, never falling back to the model',async()=>{
  await fresh();const complete=captureHelper('entryWithCompletion');
  const proposal={skillName:'TEST SQL',progressType:'time_based',qualityRating:4,fields:{durationMinutes:40}};
  let states=[{include:true,createNew:true,moduleId:null}];
  const choose=homeCallback('setQuality',{setEntryStates:fn=>{states=fn(states);}},'HomeCapturePending');
  choose(0,2);assert.equal(complete(proposal,states[0]).qualityRating,2);
  await act(async()=>{store.createExecutionLog({id:'TEST_RATED',date:plan.date,title:'TEST',qualityRating:complete(proposal,states[0]).qualityRating});await store.waitForLocalWrites();});
  assert.equal(disk.executionLogs[0].qualityRating,2);
  choose(0,2);assert.equal(complete(proposal,states[0]).qualityRating,undefined);
});

test('partial strength observations never invent volume or overwrite its known baseline', async () => {
  await fresh(); let skill;
  await act(async () => {
    skill = store.addSkill({name:'TEST bench', progressType:'performance_log', taskType:'strength_training', metricConfig:{metricType:'performance_log', performanceType:'strength', primaryMetric:'weight'}});
    await store.waitForLocalWrites();
    store.createExecutionLog({id:'TEST_UNKNOWN_SETS',date:plan.date,title:'TEST bench',linkedSkillId:skill.id,
      metricUpdate:{metricType:'performance_log',performanceData:{strengthSets:[{weight:80,reps:5}]}}});
    await store.waitForLocalWrites();
  });
  assert.equal(disk.skills.find(row=>row.id===skill.id).metricConfig.bestVolume,undefined);
  await act(async () => {
    store.createExecutionLog({id:'TEST_COMPLETE_SETS',date:plan.date,title:'TEST bench',linkedSkillId:skill.id,
      metricUpdate:{metricType:'performance_log',performanceData:{strengthSets:[{weight:80,reps:5,sets:3}]}}});
    await store.waitForLocalWrites();
    store.createExecutionLog({id:'TEST_PARTIAL_HEAVIER',date:plan.date,title:'TEST bench',linkedSkillId:skill.id,
      metricUpdate:{metricType:'performance_log',performanceData:{strengthSets:[{weight:90,reps:5}]}}});
    await store.waitForLocalWrites();
  });
  await act(async()=>tree.unmount());tree=undefined;await mount();
  const saved=store.data.skills.find(row=>row.id===skill.id);
  assert.equal(saved.metricConfig.bestVolume,1200); assert.equal(saved.metricConfig.bestValue,90);
  assert.equal(store.data.executionLogs.find(row=>row.id==='TEST_UNKNOWN_SETS').metricUpdate.performanceData.strengthSets[0].sets,undefined);
});

test('Store exposes pending until local disk and durable outbox acknowledge create/update/delete', async () => {
  await fresh(); gate = deferred(); let block;
  await act(async () => { block = store.addScheduleBlock(plan); });
  assert.equal(store.localPersistence.pending, 1); assert.equal(disk.scheduleBlocks.length, 0);
  await act(async () => { gate.resolve(); await store.waitForLocalWrites(); }); gate = undefined;
  assert.equal(store.localPersistence.pending, 0); assert.equal(disk.scheduleBlocks[0].id, block.id);
  await act(async () => { store.updateScheduleBlock(block.id, { title: 'TEST updated' }); await store.waitForLocalWrites(); });
  assert.equal(disk.scheduleBlocks[0].title, 'TEST updated');
  await act(async () => { store.deleteScheduleBlock(block.id); await store.waitForLocalWrites(); });
  assert.equal(disk.scheduleBlocks.length, 0); assert.equal(journal.outbox.length, 3);
  assert.equal(journal.outbox.at(-1).operation, 'delete'); assert.equal(journal.outbox.at(-1).entityId, block.id);
});

test('schedule recording without measured duration never copies the plan across refresh', async () => {
  await fresh(); let block;
  await act(async()=>{block=store.addScheduleBlock(plan);await store.waitForLocalWrites();});
  await act(async()=>{store.createExecutionLog({id:'TEST_UNKNOWN_TIME',date:plan.date,linkedScheduleBlockId:block.id,predictedDurationMinutes:60});await store.waitForExecutionLog('TEST_UNKNOWN_TIME');});
  assert.equal(disk.executionLogs[0].durationMinutes,0);
  assert.equal(disk.executionLogs[0].predictionDelta,undefined);
  assert.ok(disk.executionLogs[0].dataProvenance.limitations.includes('DURATION_EXPLICIT_TOUCH_UNKNOWN'));
  assert.equal(disk.scheduleBlocks.find(row=>row.id===block.id).plannedMinutes,60);
  await act(async()=>tree.unmount());tree=undefined;await mount();
  assert.equal(store.data.executionLogs[0].durationMinutes,0);
});

test('explicit actual schedule duration survives write and retry without being replaced by the plan', async () => {
  await fresh(); let block;
  await act(async()=>{block=store.addScheduleBlock(plan);await store.waitForLocalWrites();});
  failSave=true;
  await act(async()=>{store.createExecutionLog({id:'TEST_ACTUAL_TIME',date:plan.date,linkedScheduleBlockId:block.id,durationMinutes:17});await assert.rejects(store.waitForExecutionLog('TEST_ACTUAL_TIME'));});
  await act(async()=>{await store.retryLocalWrites();});
  assert.equal(disk.executionLogs.length,1);assert.equal(disk.executionLogs[0].durationMinutes,17);
  assert.equal(disk.scheduleBlocks.find(row=>row.id===block.id).plannedMinutes,60);
});

test('failed journal queues later edits; retry preserves ID and exact mutation order', async () => {
  await fresh(); failBeforeCommit = true; let block;
  await act(async () => { block = store.addScheduleBlock(plan); await assert.rejects(store.waitForLocalWrites(), /JOURNAL/); });
  await act(async () => { store.updateScheduleBlock(block.id, { title: 'TEST edited while waiting' }); });
  assert.equal(disk.scheduleBlocks.length, 0); assert.deepEqual(store.localPersistence, { pending: 2, failed: true });
  await act(async () => { await store.retryLocalWrites(); });
  assert.equal(disk.scheduleBlocks.length, 1); assert.equal(disk.scheduleBlocks[0].id, block.id);
  assert.equal(disk.scheduleBlocks[0].title, 'TEST edited while waiting'); assert.equal(journal.outbox.length, 2);
  assert.equal(commitCalls, 3); assert.deepEqual(store.localPersistence, { pending: 0, failed: false });
});

for (const operation of ['create', 'update', 'delete']) test(`durable WAL recovery after ${operation} failure does not enqueue a duplicate`, async () => {
  await fresh(); let block;
  if (operation !== 'create') await act(async () => { block = store.addScheduleBlock(plan); await store.waitForLocalWrites(); });
  const before = commitCalls; failSave = true;
  await act(async () => {
    if (operation === 'create') block = store.addScheduleBlock(plan);
    else if (operation === 'update') store.updateScheduleBlock(block.id, { title: 'TEST recovered' });
    else store.deleteScheduleBlock(block.id);
    await assert.rejects(store.waitForLocalWrites(), /DISK_FULL/);
  });
  const outboxLength = journal.outbox.length;
  await act(async () => { await store.retryLocalWrites(); });
  assert.equal(journal.outbox.length, outboxLength); assert.equal(commitCalls, before + 1);
  assert.equal(disk.scheduleBlocks.length, operation === 'delete' ? 0 : 1);
  if (operation === 'update') assert.equal(disk.scheduleBlocks[0].title, 'TEST recovered');
  assert.equal(journal.pendingApply.length, 0);
});

test('queued deletion is not resurrected by the preceding ACK, including mounted reload', async () => {
  await fresh(); gate = deferred(); let block;
  await act(async () => { block = store.addScheduleBlock(plan); store.deleteScheduleBlock(block.id); });
  assert.equal(store.data.scheduleBlocks.length, 0);
  await act(async () => { gate.resolve(); await store.waitForLocalWrites(); });
  assert.equal(store.data.scheduleBlocks.length, 0); assert.equal(disk.scheduleBlocks.length, 0);
  await act(async () => tree.unmount()); await mount(); assert.equal(store.data.scheduleBlocks.length, 0);
  assert.equal(journal.outbox.length, 2);
});

test('Goal and appearance updates receive the same durable receipt and survive remount', async () => {
  await fresh(); let goal;
  await act(async () => { goal = store.addCategory({ name: 'TEST goal', emoji: '' }); store.setSettings({ language: 'en' }); await store.waitForLocalWrites(); });
  assert.equal(disk.categories.some(row => row.id === goal.id), true); assert.equal(disk.settings.language, 'en');
  await act(async () => tree.unmount()); await mount(); assert.equal(store.data.settings.language, 'en');
  assert.equal(store.data.categories.some(row => row.id === goal.id), true);
});

test('an execution retry reuses its original entity and its durable receipt', async () => {
  await fresh(); failSave = true; let record;
  await act(async () => { record = store.createExecutionLog({ id:'TEST_EXECUTION', date:'2026-09-22', title:'TEST only', durationMinutes:7 }); await assert.rejects(store.waitForExecutionLog(record.id)); });
  await act(async () => { store.createExecutionLog(record); await store.waitForExecutionLog(record.id); });
  assert.equal(disk.executionLogs.filter(row => row.id === record.id).length, 1);
  assert.equal(journal.outbox.filter(row => row.entityId === record.id).length, 1);
});
test('WAL replay through the real Store projection cannot erase later optimistic edits', async () => {
  await fresh(); failSave = true; let block;
  await act(async()=>{block=store.addScheduleBlock(plan);await assert.rejects(store.waitForLocalWrites());});
  await act(async()=>{store.updateScheduleBlock(block.id,{title:'TEST later edit'});});
  await act(async()=>{await store.retryLocalWrites();});
  assert.equal(disk.scheduleBlocks[0].title,'TEST later edit');
  assert.equal(store.data.scheduleBlocks[0].title,'TEST later edit');
  assert.equal(journal.outbox.length,2);
});

test('remote projection preserves a queued local edit without persisting it prematurely', async () => {
  await fresh(); let block;
  await act(async () => { block = store.addScheduleBlock(plan); await store.waitForLocalWrites(); });
  failBeforeCommit = true;
  await act(async () => {
    store.updateScheduleBlock(block.id, { title: 'TEST pending local title' });
    await assert.rejects(store.waitForLocalWrites());
  });
  const remote = { ...block, notes: 'TEST remote note' };
  const unrelated = { ...plan, id: 'TEST_REMOTE_ONLY', title: 'TEST independent remote block' };
  await act(async () => { await project([
    { entityType: 'scheduleBlocks', entityId: block.id, payload: remote },
    { entityType: 'scheduleBlocks', entityId: unrelated.id, payload: unrelated },
  ]); });
  assert.equal(disk.scheduleBlocks[0].title, plan.title);
  assert.equal(disk.scheduleBlocks[0].notes, remote.notes);
  assert.equal(store.data.scheduleBlocks[0].title, 'TEST pending local title');
  await act(async () => { await store.retryLocalWrites(); });
  assert.equal(disk.scheduleBlocks[0].title, 'TEST pending local title');
  // Existing writes replace an entity version, not individual remote fields.
  assert.equal(disk.scheduleBlocks[0].notes, undefined);
  assert.equal(store.data.scheduleBlocks[0].notes, undefined);
  assert.deepEqual(disk.scheduleBlocks.find(row => row.id === unrelated.id), unrelated);
  assert.deepEqual(store.data.scheduleBlocks.find(row => row.id === unrelated.id), unrelated);
});

test('WAL recovery cannot resurrect a later explicitly deleted entity in the UI', async () => {
  await fresh(); failSave = true; let block;
  await act(async () => { block = store.addScheduleBlock(plan); await assert.rejects(store.waitForLocalWrites()); });
  await act(async () => { store.deleteScheduleBlock(block.id); });
  assert.equal(store.data.scheduleBlocks.length, 0);
  await act(async () => { await engine.recover(); });
  assert.equal(disk.scheduleBlocks.length, 1);
  assert.equal(store.data.scheduleBlocks.length, 0);
  await act(async () => { await store.retryLocalWrites(); });
  assert.equal(disk.scheduleBlocks.length, 0);
  assert.equal(store.data.scheduleBlocks.length, 0);
  assert.equal(journal.outbox.length, 2);
  assert.equal(journal.outbox.at(-1).operation, 'delete');
});

test('state submission waits for ACK, coalesces taps and triggers follow-up exactly once', async () => {
  await fresh(); gate = deferred(); const submission = new DurableSubmission(); let finished = 0, created = 0, first, second;
  const createState = () => { created++; return store.createStateCheckIn({ date: plan.date, timestamp: `${plan.date}T10:00:00Z`, overall: 2 }); };
  const finish = async () => { finished++; };
  await act(async () => {
    first = submission.run(createState, store.waitForLocalWrites, store.retryLocalWrites, finish);
    second = submission.run(createState, store.waitForLocalWrites, store.retryLocalWrites, finish);
  });
  assert.equal(first, second); assert.equal(submission.hasPending, true);
  assert.equal(created, 1); assert.equal(finished, 0); assert.equal(disk.stateCheckIns.length, 0);
  await act(async () => { gate.resolve(); await first; });
  assert.equal(disk.stateCheckIns.length, 1); assert.equal(finished, 1); assert.equal(submission.hasPending, false);
});

test('failed state submission retries the original observation instead of creating a second one', async () => {
  await fresh(); failSave = true; const submission = new DurableSubmission(); let finished = 0;
  const createState = () => store.createStateCheckIn({ date: plan.date, timestamp: `${plan.date}T10:00:00Z`, overall: 2 });
  const finish = async () => { finished++; };
  await act(async () => { await assert.rejects(submission.run(createState, store.waitForLocalWrites, store.retryLocalWrites, finish)); });
  const id = store.data.stateCheckIns[0].id;
  assert.equal(finished, 0); assert.equal(submission.hasPending, true);
  await act(async () => { await submission.run(() => { throw Error('MUST_NOT_CREATE'); }, store.waitForLocalWrites, store.retryLocalWrites, finish); });
  assert.equal(disk.stateCheckIns.length, 1); assert.equal(disk.stateCheckIns[0].id, id);
  assert.equal(journal.outbox.filter(row => row.entityId === id).length, 1); assert.equal(finished, 1);
});

test('compatibility-cache failure retains the acknowledged state and only retries follow-up', async () => {
  await fresh(); const submission = new DurableSubmission(); let attempts = 0;
  const finish = async () => { if (++attempts === 1) throw Error('TEST_CACHE_FAILURE'); };
  await act(async () => { await assert.rejects(submission.run(() => store.createStateCheckIn({date:plan.date,timestamp:`${plan.date}T10:00:00Z`,overall:2}),store.waitForLocalWrites,store.retryLocalWrites,finish)); });
  const commits = commitCalls;
  await act(async () => { await submission.run(() => { throw Error('MUST_NOT_CREATE'); }, async () => { throw Error('NO_SECOND_ACK'); }, async () => { throw Error('NO_SECOND_RETRY'); }, finish); });
  assert.equal(commitCalls, commits); assert.equal(disk.stateCheckIns.length, 1); assert.equal(attempts, 2);
});

test('distinct Instant Read feedback values survive failed write retry and remount on the same DecisionResult', async () => {
  await fresh(); let result;
  await act(async () => {
    result=store.addDecisionResult({mode:'instant_micro',trigger:'state_checkin',source:'legacy_fallback',schemaVersion:'test',headlineInsight:'TEST isolated'});
    await store.waitForLocalWrites();
    store.updateDecisionResultFeedback(result.id,'useful'); await store.waitForLocalWrites();
  });
  assert.equal(disk.decisionResults[0].userFeedback.rating,'useful');
  failSave=true;
  await act(async()=>{store.updateDecisionResultFeedback(result.id,'not_useful');await assert.rejects(store.waitForLocalWrites());});
  assert.equal(disk.decisionResults[0].userFeedback.rating,'useful');
  await act(async()=>{await store.retryLocalWrites();});
  await act(async()=>tree.unmount());await mount();
  assert.equal(store.data.decisionResults.length,1);assert.equal(store.data.decisionResults[0].id,result.id);
  assert.equal(store.data.decisionResults[0].userFeedback.rating,'not_useful');
});

test('actual Today feedback callback reports saved only after durability and never closes a newer Instant Read', async () => {
  await fresh();let result;
  await act(async()=>{result=store.addDecisionResult({mode:'instant_micro',trigger:'state_checkin',source:'legacy_fallback',schemaVersion:'test',headlineInsight:'TEST'});await store.waitForLocalWrites();});
  let status='idle',expanded=true,rating=null;const request={current:1};
  const bindings={instantDecisionResultId:result.id,instantDecisionRequestRef:request,
    instantFeedbackBusyRef:{current:false},instantFeedbackRetryRef:{current:false},
    setInstantFeedbackStatus:value=>status=value,setInstantDecisionFeedback:value=>rating=value,setInstantReadExpanded:value=>expanded=value,
    updateDecisionResultFeedback:(...args)=>store.updateDecisionResultFeedback(...args),waitForLocalWrites:()=>store.waitForLocalWrites(),retryLocalWrites:()=>store.retryLocalWrites()};
  const feedback=homeCallback('markInstantDecisionFeedback',bindings);
  gate=deferred();let pending;
  await act(async()=>{pending=feedback('useful');});
  assert.equal(status,'saving');assert.equal(rating,'useful');assert.equal(expanded,true);
  await act(async()=>{gate.resolve();await pending;});gate=undefined;
  assert.equal(status,'saved');assert.equal(expanded,false);
  failSave=true;expanded=true;
  await act(async()=>{await feedback('not_useful');});assert.equal(status,'error');assert.equal(expanded,true);
  await act(async()=>{await feedback('not_useful');});assert.equal(status,'saved');assert.equal(disk.decisionResults[0].userFeedback.rating,'not_useful');
  gate=deferred();expanded=true;
  await act(async()=>{pending=feedback('useful');});request.current++;status='idle';
  await act(async()=>{gate.resolve();await pending;});gate=undefined;
  assert.equal(status,'idle');assert.equal(expanded,true);assert.equal(disk.decisionResults.length,1);
});

test('actual Today state callback with real Store emits no success or AI before ACK and retries the same observation', async()=>{
  await fresh();const submission=new DurableSubmission();let notices=0,ai=0,cache=0;
  const bindings={stateSubmission:{current:submission},createStateCheckIn:(...args)=>store.createStateCheckIn(...args),today:()=>plan.date,
    timeBlockForDate:()=> 'morning',stateLabelForValue:()=> 'low',waitForLocalWrites:()=>store.waitForLocalWrites(),retryLocalWrites:()=>store.retryLocalWrites(),
    AsyncStorage:{setItem:async()=>{cache++;}},dailyStateKey:date=>date,persistCurrentState:async()=>{},setDailyState:()=>{},trackEvent:()=>{},
    generateInstantDecisionBrief:()=>ai++,Alert:{alert:()=>notices++},t:()=> 'TEST saved',lang:'en'};
  const save=homeCallback('saveStateCheckIn',bindings);
  failSave=true;
  await act(async()=>{await assert.rejects(save(2,{focus:2},{entry:{id:'TEST_CACHE',timestamp:`${plan.date}T10:00:00Z`},average:2}));});
  assert.equal(ai,0);assert.equal(notices,0);assert.equal(cache,0);
  await act(async()=>{await save(4,{focus:4});});
  assert.equal(disk.stateCheckIns.length,1);assert.equal(disk.stateCheckIns[0].overall,2);
  assert.equal(ai,1);assert.equal(notices,1);assert.equal(cache,1);
});

test('actual Capture submit retains raw input on failed ACK and parses the original record only once after retry', async () => {
  await fresh(); let posting=false,failed=false,input='TEST raw text',parsed=[];
  const submission={current:new DurableSubmission()};
  const submit=homeCallback('submitCapture',{
    isPosting:false,captureSubmission:submission,setIsPosting:value=>posting=value,setPostingFailed:value=>failed=value,
    setInputText:value=>input=value,addRawCapture:(...args)=>store.addRawCapture(...args),updateRawCapture:(...args)=>store.updateRawCapture(...args),
    startCaptureFriction:()=>{},waitForLocalWrites:()=>store.waitForLocalWrites(),retryLocalWrites:()=>store.retryLocalWrites(),
    triggerParse:(id,text)=>parsed.push({id,text}),
  },'HomeSmartCapture');
  failSave=true;
  await act(async()=>{await submit(input,'text');});
  const original=store.data.rawCaptures[0];
  assert.equal(failed,true);assert.equal(posting,false);assert.equal(input,'TEST raw text');assert.equal(parsed.length,0);
  await act(async()=>{await submit('TEST changed text must not replace original','text');});
  assert.equal(failed,false);assert.equal(input,'');assert.equal(disk.rawCaptures.length,1);
  assert.deepEqual(parsed,[{id:original.id,text:'TEST raw text'}]);
  // Unconfirmed raw captures stay local under the existing contract: retry the failed disk write.
  assert.equal(commitCalls,2);
});

test('actual structured quick Capture waits for both writes and never calls the parser', async () => {
  await fresh();let parsed=0,failed=false;const submission={current:new DurableSubmission()};
  const submit=homeCallback('submitCapture',{
    isPosting:false,captureSubmission:submission,setIsPosting:()=>{},setPostingFailed:value=>failed=value,setInputText:()=>{throw Error('DO_NOT_CLEAR_UNRELATED_INPUT');},
    addRawCapture:(...args)=>store.addRawCapture(...args),updateRawCapture:(...args)=>store.updateRawCapture(...args),startCaptureFriction:()=>{},
    waitForLocalWrites:()=>store.waitForLocalWrites(),retryLocalWrites:()=>store.retryLocalWrites(),triggerParse:()=>parsed++,
  },'HomeSmartCapture');
  const payload={type:'study',fields:{},entries:[],insight:{zh:'',en:''},crossLinks:[],matchedSkillIds:[]};
  gate=deferred();let pending;
  await act(async()=>{pending=submit('TEST explicit choice','recent',payload);});
  assert.equal(disk.rawCaptures.length,0);
  await act(async()=>{gate.resolve();await pending;});gate=undefined;
  assert.equal(failed,false);assert.equal(parsed,0);assert.equal(disk.rawCaptures.length,1);
  assert.equal(disk.rawCaptures[0].parseStatus,'done');assert.deepEqual(disk.rawCaptures[0].parsed,payload);
  assert.equal(commitCalls,2);
});

test('capture confirmation retry retains every created entity and publishes feedback only after the whole batch ACK', async()=>{
  await fresh();const submission=new DurableSubmission();let feedback=0,created=0;
  const createBatch=()=>{
    created++;
    const goal=store.addCategory({name:'TEST capture goal',emoji:''});
    const skill=store.addSkill({name:'TEST capture skill',categoryId:goal.id,goalIds:[goal.id],progressType:'time_based',taskType:'deep_study'});
    const capture=store.addRawCapture('TEST batch only');
    const record=store.createExecutionLog({id:`capture-${capture.id}-0`,date:plan.date,title:'TEST batch only',linkedSkillId:skill.id,durationMinutes:7,structuredData:{sourceCaptureId:capture.id,sourceCaptureEntryIndex:0}});
    return {goal,skill,capture,record};
  };
  failSave=true;
  await act(async()=>{await assert.rejects(submission.run(createBatch,store.waitForLocalWrites,store.retryLocalWrites,async()=>{feedback++;}));});
  assert.equal(feedback,0);const ids=[...store.data.categories,...store.data.skills,...store.data.rawCaptures,...store.data.executionLogs].map(row=>row.id);
  await act(async()=>{await submission.run(createBatch,store.waitForLocalWrites,store.retryLocalWrites,async()=>{feedback++;});});
  assert.equal(created,1);assert.equal(feedback,1);
  assert.deepEqual([...disk.categories,...disk.skills,...disk.rawCaptures,...disk.executionLogs].map(row=>row.id),ids);
  assert.equal(journal.pendingApply.length,0);
  // Execution projection legitimately updates Goal/Skill aggregates as a second mutation.
  assert.equal(journal.outbox.filter(row=>row.entityId===disk.executionLogs[0].id).length,1);
});

test('actual after-state callback does not claim saved before ACK and retry keeps the selected meanings', async()=>{
  await fresh();let log;
  await act(async()=>{log=store.createExecutionLog({id:'TEST_AFTER',date:plan.date,title:'TEST',structuredData:{sourceCaptureId:'TEST_RAW'}});await store.waitForLocalWrites();});
  let status='idle',saving=false,failed=false;
  const bindings={afterStateSaving:false,setAfterStateSaving:value=>saving=value,setAfterStateFailed:value=>failed=value,
    afterStateSubmission:{current:new DurableSubmission()},afterStateDraft:{energy:'up',focus:'same',mood:'down'},savedLogIds:[log.id],data:store.data,
    updateExecutionLog:(...args)=>store.updateExecutionLog(...args),waitForLocalWrites:()=>store.waitForLocalWrites(),retryLocalWrites:()=>store.retryLocalWrites(),setAfterStateStatus:value=>status=value};
  const persist=homeCallback('persistAfterState',bindings,'HomeCapturePending');
  failSave=true;await act(async()=>{await persist(false);});
  assert.equal(status,'idle');assert.equal(failed,true);assert.equal(saving,false);
  await act(async()=>{await persist(true);});
  assert.equal(failed,false);assert.equal(status,'saved');assert.equal(disk.executionLogs.length,1);
  assert.deepEqual({...disk.executionLogs[0].structuredData.afterStateDelta,capturedAt:undefined},{energy:'up',focus:'same',mood:'down',skipped:false,capturedAt:undefined});
  await act(async()=>tree.unmount());await mount();assert.equal(store.data.executionLogs[0].structuredData.afterStateDelta.focus,'same');
});
