const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const out = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/todayCommand.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: out });
const states = ['calm_energy', 'tense_energy', 'low_fuel', 'overload', 'low_arousal', 'unclear'];
const demands = ['deep_focus', 'light', 'physical', 'recovery', 'social', 'unknown'];
const matrix = [
  ['match','match','match','match','match','unknown'],
  ['match','match','match','match','match','unknown'],
  ['recover','match','recover','match','match','unknown'],
  ['brain_dump','match','match','match','brain_dump','unknown'],
  ['probe_5','match','match','match','match','unknown'],
  ['unknown','unknown','unknown','unknown','unknown','unknown'],
];
test('all 36 combinations match the approved table', () => states.forEach((s,i) => demands.forEach((d,j) => assert.equal(out.matchStateToTask(s,d),matrix[i][j]))));
const now = new Date(2026,10,5,9,20);
const date = '2026-11-05';
const block = {id:'isolated-task',date,title:'Design',startTime:'09:30',endTime:'10:15',plannedMinutes:45,linkedSkillId:'qa-skill'};
const data = {categories:[],skills:[{id:'qa-skill',requiredState:'deep_focus'}],stateCheckIns:[]};
const input = {data,now,scheduleBlocks:[block],todayLogs:[]};
test('without a check-in, V5 returns the exact legacy command', () => {
  for (const variant of [input,{...input,scheduleBlocks:[]},{...input,data:{...data,rawCaptures:[{id:'qa-raw',parseStatus:'pending'}]}},{...input,latestState:{overall:1}}]) {
    assert.equal(JSON.stringify(out.buildTodayCommand(variant)),JSON.stringify(out.buildTodayCommand({...variant,stateAware:true})));
  }
});
function withState(type, extra = {}) { return {...input,stateAware:true,data:{...data,stateCheckIns:[{id:'qa-state',date,timestamp:now.toISOString(),stateLayer:{classification:{type},...extra}}]}}; }
test('overload changes the same command, retaining target links and planned duration', () => {
  const c = out.buildTodayCommand(withState('overload'));
  assert.equal(c.stateAdvice.kind,'brain_dump'); assert.equal(c.scheduleBlockId,block.id); assert.equal(c.plannedMinutes,45);
});
test('original plan choice suppresses this task only', () => {
  assert.equal(out.buildTodayCommand(withState('overload',{originalPlanChoices:[{taskId:block.id}]})).stateAdvice,undefined);
  assert.equal(out.buildTodayCommand(withState('overload',{originalPlanChoices:[{taskId:'other'}]})).stateAdvice.kind,'brain_dump');
});
test('correction wins; unknown requirement and yesterday do not imply mismatch', () => {
  assert.equal(out.buildTodayCommand(withState('overload',{correction:{type:'calm_energy'}})).stateAdvice,undefined);
  const q = withState('overload'); q.data.skills=[{id:'qa-skill'}];
  assert.equal(out.buildTodayCommand(q).stateAdvice,undefined);
  q.data.skills=data.skills; q.data.stateCheckIns[0].date='2026-11-04';
  assert.equal(out.buildTodayCommand(q).stateAdvice,undefined);
});
test('running session and pending confirmation remain protected', () => {
  const q=withState('overload'); q.activeSession={title:'Already running',linkedSkillId:'qa-skill'};
  assert.equal(out.buildTodayCommand(q).titleValues.title,'Already running');
  delete q.activeSession; q.data.rawCaptures=[{id:'qa-capture',parseStatus:'pending'}];
  assert.equal(out.buildTodayCommand(q).primaryAction,'finish_pending_capture');
});
