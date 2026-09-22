// Native hosts/services are mocked. No production storage, calendar or account is opened.
// QUESTLIFE_UI_TEST_RUNTIME must point to an isolated React 19.1 test runtime.
const assert = require('node:assert/strict');
const { test, afterEach } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const runtime = process.env.QUESTLIFE_UI_TEST_RUNTIME;
if (!runtime) throw Error('Set QUESTLIFE_UI_TEST_RUNTIME to an isolated React 19.1 node_modules directory');
const React = require(path.join(runtime, 'react'));
const { create, act } = require(path.join(runtime, 'react-test-renderer'));
global.IS_REACT_ACT_ENVIRONMENT = true;
const root = path.resolve(__dirname, '../..');
let store, tree, external, alerts, writes, wait, retry, waits, retries, calendar, device, calendarWrites, statuses, statusHook;
const rn = {
  Platform: { OS: 'android', select: options => options.android ?? options.default },
  StyleSheet: { create: value => value, hairlineWidth: 1 },
  Appearance: { getColorScheme: () => 'light' },
  useWindowDimensions: () => ({ width: 375, height: 667 }),
  Keyboard: { dismiss() {} },
  Alert: { alert: (...args) => alerts.push(args) },
  AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) },
  Linking: { openSettings: async () => {} },
};
for (const host of ['View', 'Text', 'TextInput', 'TouchableOpacity', 'ScrollView', 'Pressable']) rn[host] = host;
const component = name => props => React.createElement(name, props, props.children);
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === 'react') return React;
  if (request === 'react/jsx-runtime') return require(path.join(runtime, 'react/jsx-runtime'));
  if (request === 'react-native') return rn;
  if (request === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView' };
  if (request === '@react-native-community/datetimepicker') return component('DateTimePicker');
  if (request === '@react-navigation/native') return { useRoute: () => ({ params: {} }) };
  if (/\/store$/.test(request)) return { useStore: () => store };
  if (/\/storage$/.test(request)) return { today: () => '2026-09-22' };
  if (/\/useQuestTheme$/.test(request)) return { useQuestTheme: () => require(path.join(root, 'src/design/tokens.ts')).getQuestTheme(store.data.settings.selectedThemeId) };
  if (/\/useExternalCalendarBlocks$/.test(request)) return { useExternalCalendarBlocks: () => external };
  if (/\/useDeviceData$/.test(request)) return { useDeviceData: () => device };
  if (/\/platform\/services$/.test(request)) return { calendarSource: new Proxy({}, { get: (_, key) => calendar[key] }) };
  if (/\/featureFlag$/.test(request)) return { getV11ProductLanguage: value => value, getV11ProductThemeId: value => value };
  if (/\/decisionService$/.test(request)) return { isDecisionDebugEnabled: () => false };
  if (/\/BottomSheetForm$/.test(request)) return props => props.visible ? React.createElement('Sheet', props, props.children, React.createElement('Footer', {}, props.footer)) : null;
  if (/\/QuestPrimitives$/.test(request)) return new Proxy({}, { get: (_, name) => name === '__esModule' ? true : props => React.createElement(name, props, props.children, props.trailing) });
  if (/\/Quest(Button|Input|Pill|Icon|EntityIcon|SegmentedControl)$/.test(request)) return component(request.split('/').at(-1));
  if (/\/ScheduleProposalReview$/.test(request)) return component('ScheduleProposalReview');
  return originalLoad.call(this, request, parent, isMain);
};
for (const extension of ['.ts', '.tsx']) require.extensions[extension] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
};
const { DEFAULT_DATA } = require(path.join(root, 'src/types.ts'));
const { scheduleDayContext, canMoveScheduleBlock } = require(path.join(root, 'src/native/NativeScheduleFields.tsx'));
const block = { id: 'TEST_BLOCK', title: 'TEST plan', date: '2026-09-22', startTime: '09:00', endTime: '10:00', plannedMinutes: 60, taskType: 'deep_study', flexibility: 'flexible', rigidity: 'medium', status: 'planned', source: 'manual', createdAt: 1 };
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
function fresh(blocks = []) {
  writes = []; alerts = []; external = []; waits = 0; retries = 0; calendarWrites = []; statuses = {}; statusHook = undefined;
  rn.Platform.OS = 'android'; wait = async () => {}; retry = async () => {};
  store = {
    data: structuredClone(DEFAULT_DATA),
    addScheduleBlock(input) { const value = { ...input, id: 'TEST_CREATED', createdAt: 2 }; writes.push(['create', value]); store.data.scheduleBlocks = [...store.data.scheduleBlocks, value]; return value; },
    updateScheduleBlock(id, patch) { writes.push(['edit', id, patch]); store.data.scheduleBlocks = store.data.scheduleBlocks.map(row => row.id === id ? { ...row, ...patch } : row); },
    deleteScheduleBlock(id) { writes.push(['delete', id]); store.data.scheduleBlocks = store.data.scheduleBlocks.filter(row => row.id !== id); },
    createExecutionLog(input) { const log = { ...input, id: 'TEST_LOG', createdAt: 3 }; writes.push(['log', log]); return log; },
    waitForExecutionLog: async () => {},
    waitForLocalWrites: async () => { waits++; await wait(); },
    retryLocalWrites: async () => { retries++; await retry(); },
  };
  store.data.settings.language = 'en'; store.data.settings.selectedThemeId = 'cleanFocus'; store.data.scheduleBlocks = structuredClone(blocks);
  store.data.skills = []; store.data.categories = []; store.data.moduleSkillLinks = [];
  device = { data: { calendar: { events: [], connected: true, lastSyncedAt: '2026-09-22T08:00:00+08:00' } }, error: false };
  calendar = {
    permission: async () => 'granted', requestPermission: async () => 'granted',
    listCalendars: async () => [{ id: 'TEST_CAL', title: 'TEST Calendar', source: 'TEST device', writable: true }],
    getBlockExportStatus: async (id, ...args) => statusHook ? statusHook(id, ...args) : statuses[id] ?? { state: 'not_exported', permission: 'granted' },
    createForBlock: async (...args) => { calendarWrites.push(args); },
    retryOperation: async (...args) => { calendarWrites.push(args); },
    open: async () => {},
  };
}
const render = async (file = 'src/screens/ScheduleScreen.tsx', props = {}) => {
  await act(async () => { tree = create(React.createElement(require(path.join(root, file)).default, props)); });
};
const button = label => tree.root.findAll(node => node.type === 'QuestButton' && node.props.label?.toLowerCase() === label.toLowerCase())[0];
const text = () => tree.root.findAllByType('Text').map(node => node.children.filter(value => typeof value === 'string' || typeof value === 'number').join('')).join('\n');
const press = async label => { const target = button(label); assert.ok(target, `Missing ${label}`); await act(async () => target.props.onPress()); };
const confirm = async () => { await act(async () => alerts.at(-1)[2][1].onPress()); };
const field = () => tree.root.findByType(require(path.join(root, 'src/native/NativeScheduleFields.tsx')).default);
const input = async (placeholder, value) => { await act(async () => tree.root.findAll(node => node.type === 'QuestInput' && node.props.placeholder === placeholder)[0].props.onChangeText(value)); };
const refresh = async () => { await act(async () => tree.update(React.createElement(require(path.join(root, 'src/screens/ScheduleScreen.tsx')).default))); };
const actions = async (title = block.title) => { await act(async () => tree.root.findAll(node => ['QuestButton', 'Pressable'].includes(node.type) && node.props.accessibilityLabel === `Block actions: ${title}`)[0].props.onPress()); };
afterEach(async () => { if (tree) await act(async () => tree.unmount()); tree = undefined; });

test('capacity uses merged compiler windows, not duration sums or skipped time', () => {
  fresh();
  const context = scheduleDayContext(block.date, [block, { ...block, id: 'overlap', startTime: '09:30', endTime: '11:00', plannedMinutes: 999 }, { ...block, id: 'skip', startTime: '11:00', endTime: '23:00', status: 'skipped' }, { ...block, id: 'other-day', date: '2026-09-23' }]);
  assert.equal(context.freeMinutes, 840); assert.equal(context.longestMinutes, 720); assert.equal(context.plannedMinutes, 150); assert.equal(context.conflictCount, 2);
});
test('move authority excludes fixed, locked, completed and skipped blocks', () => {
  assert.equal(canMoveScheduleBlock(block), true);
  for (const patch of [{ flexibility: 'fixed' }, { placementLocked: true }, { status: 'completed' }, { status: 'skipped' }]) assert.equal(canMoveScheduleBlock({ ...block, ...patch }), false);
  assert.equal(canMoveScheduleBlock({ ...block, status: 'adjusted', flexibility: 'movable' }), true);
});
test('native create footer stays outside fields and waits for durable ACK', async () => {
  fresh(); const ack = deferred(); wait = () => ack.promise; await render(); await press('Add block');
  const title = tree.root.findAllByType('QuestInput')[0]; await act(async () => title.props.onChangeText('TEST new block'));
  assert.equal(tree.root.findByType('Footer').findAllByType('QuestButton').length, 1);
  await press('Create block'); assert.equal(writes.length, 1); assert.equal(waits, 1); assert.equal(tree.root.findAllByType('Sheet').length, 1);
  assert.equal(button('Save').props.loading, true);
  await act(async () => tree.root.findByType('Sheet').props.onClose()); assert.equal(tree.root.findAllByType('Sheet').length, 1);
  await act(async () => ack.resolve()); assert.equal(tree.root.findAllByType('Sheet').length, 0);
});
test('failed create retries the original persistence operation without a second block', async () => {
  fresh(); wait = async () => { throw Error('TEST disk full'); }; await render(); await press('Add block');
  await act(async () => tree.root.findAllByType('QuestInput')[0].props.onChangeText('TEST new block'));
  await press('Create block'); assert.ok(button('Retry save')); assert.match(text(), /draft is still here/); assert.equal(writes.length, 1);
  wait = async () => {}; await press('Retry save'); assert.equal(retries, 1); assert.equal(writes.length, 1); assert.equal(store.data.scheduleBlocks.length, 1); assert.equal(tree.root.findAllByType('Sheet').length, 0);
});
test('native edit preserves source, fixed authority, lock and completed status', async () => {
  fresh([{ ...block, status: 'completed', flexibility: 'fixed', placementLocked: true, source: 'skill_rule' }]); await render(); await actions();
  assert.equal(button('Move block'), undefined); await press('Edit'); assert.equal(field().props.disabled, true);
  await act(async () => tree.root.findAllByType('QuestInput')[0].props.onChangeText('TEST renamed'));
  await press('Save'); const saved = store.data.scheduleBlocks[0];
  assert.equal(saved.status, 'completed'); assert.equal(saved.source, 'skill_rule'); assert.equal(saved.flexibility, 'fixed'); assert.equal(saved.placementLocked, true); assert.equal(saved.date, block.date);
});
test('native block actions are contextual; day rows do not repeat edit/delete controls', async () => {
  fresh([block]); await render(); assert.equal(button('Edit'), undefined); assert.equal(button('Delete'), undefined);
  await actions(); assert.ok(button('Edit')); assert.ok(button('Move block')); assert.ok(button('Delete'));
});
test('external constraints never expose app edit, move, delete or execution writes', async () => {
  fresh(); external = [{ ...block, id: 'external', flexibility: 'fixed', placementLocked: true }]; await render(); await actions();
  for (const label of ['Edit', 'Move block', 'Delete', 'Log progress']) assert.equal(button(label), undefined);
  assert.match(text(), /External calendar constraint/); assert.equal(writes.length, 0);
});
test('move destination shows actual conflict details and requires confirmation', async () => {
  fresh([block, { ...block, id: 'other', title: 'TEST fixed appointment', date: '2026-09-23', flexibility: 'fixed' }]); await render(); await actions(); await press('Move block');
  await act(async () => field().props.onDate('2026-09-23'));
  assert.match(text(), /TEST fixed appointment/); assert.match(text(), /Time conflicts: 1/);
  await press('Save'); assert.equal(writes.length, 0); await confirm();
  assert.equal(writes[0][0], 'edit'); assert.equal(store.data.scheduleBlocks[0].date, '2026-09-23'); assert.equal(store.data.scheduleBlocks[0].status, 'planned');
});
test('confirmation rejects a remote edit or a changed conflict set', async () => {
  fresh([block, { ...block, id: 'other', title: 'TEST overlap' }]); await render(); await actions(); await press('Edit'); await press('Save');
  store.data.scheduleBlocks = [...store.data.scheduleBlocks, { ...block, id: 'new-remote', title: 'TEST remote conflict' }]; await refresh(); await confirm();
  assert.equal(writes.length, 0); assert.match(alerts.at(-1)[1], /conflicts changed/);
});
test('stale editor cannot overwrite a remote status transition', async () => {
  fresh([block]); await render(); await actions(); await press('Edit');
  store.data.scheduleBlocks = [{ ...block, status: 'completed' }]; await refresh(); await press('Save'); assert.equal(writes.length, 0);
});
test('delete keeps sheet and original operation on persistence failure', async () => {
  fresh([block]); wait = async () => { throw Error('TEST disk full'); }; await render(); await actions(); await press('Delete'); await confirm();
  assert.equal(writes.length, 1); assert.ok(button('Retry save')); assert.equal(tree.root.findAllByType('Sheet').length, 1);
  wait = async () => {}; await press('Retry save'); assert.equal(writes.length, 1); assert.equal(retries, 1); assert.equal(tree.root.findAllByType('Sheet').length, 0);
});
test('record duration starts unknown; failed record retries without recreating execution', async () => {
  fresh([block]); wait = async () => { throw Error('TEST disk full'); }; await render(); await actions(); await press('Log progress');
  const duration = tree.root.findAll(node => node.type === 'QuestInput' && node.props.placeholder === '30')[0]; assert.equal(duration.props.value, '');
  await act(async () => duration.props.onChangeText('23')); await press('Log progress'); assert.equal(writes.length, 1); assert.equal(writes[0][1].durationMinutes, 23); assert.equal(writes[0][1].qualityRating, undefined);
  assert.ok(button('Retry saving record')); wait = async () => {}; await press('Retry saving record'); assert.equal(writes.length, 1); assert.equal(retries, 1); assert.equal(tree.root.findAllByType('Sheet').length, 0);
});
test('native week has seven full-width 44-point day targets and real free-time context', async () => {
  fresh([block]); await render(); await act(async () => tree.root.findByType('QuestSegmentedControl').props.onChange('week'));
  const week = tree.root.find(node => node.props.nativeID === 'v11-schedule-week-instrument'); const days = week.findAllByType('TouchableOpacity'); assert.equal(days.length, 7);
  for (const day of days) assert.ok(day.props.style.minHeight >= 44);
  assert.match(text(), /Unscheduled time/); assert.match(text(), /07:00-23:00/);
  await act(async () => days[1].props.onPress()); assert.ok(tree.root.find(node => node.props.nativeID === 'v11-schedule-day-instrument'));
});
test('early-morning blocks are not relabelled as six oclock or given proportional now overlays', async () => {
  fresh([{ ...block, startTime: '01:15', endTime: '02:00', plannedMinutes: 45 }]); await render(); assert.match(text(), /1:00/);
  const timeline = tree.root.find(node => node.props.nativeID === 'v11-schedule-day-instrument');
  assert.equal(timeline.findAll(node => Array.isArray(node.props.style) && node.props.style.some(style => style && typeof style.top === 'string' && style.top.endsWith('%'))).length, 0);
});
test('timeline keeps blank time, real duration and non-overlapping minimum targets', () => {
  const { nativeTimelineLayout } = require(path.join(root, 'src/native/NativeDayTimeline.tsx'));
  const layout = nativeTimelineLayout([block,
    { ...block, id:'short', startTime:'09:05', endTime:'09:10' },
    { ...block, id:'later', startTime:'14:00', endTime:'15:00' }]);
  assert.equal(layout.start,7);assert.equal(layout.end,23);assert.equal(layout.laneCount,2);
  assert.equal(layout.items[2].top-layout.items[0].top,5*64);
  assert.equal(layout.items[0].durationHeight,64);assert.ok(layout.items[1].durationHeight<6);
  for(const item of layout.items) assert.ok(item.height>=44);
  assert.notEqual(layout.items[0].lane,layout.items[1].lane);
  assert.equal(nativeTimelineLayout([]).height,16*64+16);
});
test('calendar sheet pins close, names calendar and exact plan in OS-write confirmation', async () => {
  fresh([block]); await render('src/native/NativeScheduleCalendarSheet.tsx', { blockId: block.id, onClose() {} });
  assert.equal(tree.root.findByType('Footer').findAllByType('QuestButton').length, 1); assert.match(text(), /Last import/);
  await press('Create calendar event'); assert.match(alerts.at(-1)[1], /TEST Calendar/); assert.match(alerts.at(-1)[1], /09:00-10:00/); assert.equal(calendarWrites.length, 0);
  await confirm(); assert.equal(calendarWrites.length, 1);
});
test('calendar refresh failures do not leave a writable stale status', async () => {
  fresh([block]); await render('src/native/NativeScheduleCalendarSheet.tsx', { blockId: block.id, onClose() {} });
  assert.equal(button('Create calendar event').props.disabled, false);
  calendar.permission = async () => { throw Error('TEST permission refresh failed'); }; await press('Refresh');
  assert.equal(button('Create calendar event').props.disabled, true, text());
  await act(async () => button('Create calendar event').props.onPress()); assert.equal(alerts.length, 0); assert.equal(calendarWrites.length, 0);
});
test('native date fields keep midnight end as 24:00 and never silently repair reversed ranges', async () => {
  fresh(); const changed = []; const q = require(path.join(root, 'src/design/tokens.ts')).getQuestTheme('deepWork');
  await render('src/native/NativeScheduleFields.tsx', { date: block.date, start: '23:00', end: '23:30', onDate() {}, onStart() {}, onEnd: value => changed.push(value), theme: q, lang: 'en' });
  const fields = tree.root.findAllByType(require(path.join(root, 'src/native/NativeDateTimeField.tsx')).default);
  await act(async () => fields[2].props.onChange(new Date(`${block.date}T00:00:00`))); assert.deepEqual(changed, ['24:00']);
});
test('Chinese and dark native context renders translated UI without changing stored blocks', async () => {
  fresh([block]); store.data.settings.language = 'zh'; store.data.settings.selectedThemeId = 'deepWork'; const before = structuredClone(store.data.scheduleBlocks); await render();
  assert.match(text(), /未安排时间/); assert.deepEqual(store.data.scheduleBlocks, before);
});
