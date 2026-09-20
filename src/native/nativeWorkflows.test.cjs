// Run with QUESTLIFE_UI_TEST_RUNTIME pointing at an isolated React 19.1 test runtime.
// Native hosts and external services are mocked; production storage is never opened.
const assert = require('node:assert/strict');
const { test, afterEach } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const runtime = process.env.QUESTLIFE_UI_TEST_RUNTIME;
if (!runtime) throw new Error('Set QUESTLIFE_UI_TEST_RUNTIME to the isolated node_modules directory');
const React = require(path.join(runtime, 'react'));
const { create, act } = require(path.join(runtime, 'react-test-renderer'));
global.IS_REACT_ACT_ENVIRONMENT = true;
const rn = {
  Platform: { OS: 'android', select: values => values.android ?? values.default },
  StyleSheet: { create: styles => styles, hairlineWidth: 1, absoluteFillObject: {} },
  Appearance: { getColorScheme: () => 'light' },
  Keyboard: { dismiss() {} },
  Alert: { alert: (...args) => alerts.push(args) },
  Linking: { openSettings: async () => {} },
  AppState: { addEventListener: () => ({ remove() {} }) },
};
for (const name of ['View','Text','TextInput','Pressable','TouchableOpacity','ScrollView','Modal','KeyboardAvoidingView','Switch','ActivityIndicator']) rn[name] = name;
let store;
let alerts = [];
let route = { params: {} };
let navigations = [];
const navigation = { navigate: (...args) => navigations.push(args), goBack() {} };
let calendarCalls = [];
let calendarStatuses = {};
let calendarStatusHook;
let calendarRetries = [];
let calendarOpens = [];
let calendars = [];
let permission = 'granted';
let failCalendar = false;
let quietWrites = [];
let pushToken = null;
let authUserId = '11111111-1111-4111-8111-111111111111';
const authListeners = new Set();
let pushRegistrations = [];
let pushRetirements = [];
let registrationAccepted = false;
let retirementStatus = 'disabled';
let pushTokenHook;
let shareCalls=[];
let shareHook;
let shareAvailable=true;
let exportFiles=new Map();
let exportDeletes=[];
let exportWriteFailure=false;
let exportSequence=0;
let pickedBackup={canceled:true};
let restoreCalls=[];
let restoreFailure=false;
const fileUri=(parent,name)=>`${typeof parent==='string'?parent:parent.uri}/${name}`;
class ExportFile {
  constructor(parent,name){this.uri=name === undefined ? parent : fileUri(parent,name);this.name=name;}
  get exists(){return exportFiles.has(this.uri);}
  get size(){return Buffer.byteLength(exportFiles.get(this.uri)?.text??'');}
  get modificationTime(){return exportFiles.get(this.uri)?.modified??null;}
  create(){if(this.exists)throw Error('TEST_FILE_EXISTS');exportFiles.set(this.uri,{text:'',modified:Date.now()});}
  write(text){exportFiles.set(this.uri,{text,modified:Date.now()});if(exportWriteFailure)throw Error('TEST_WRITE_FAILED');}
  async text(){return exportFiles.get(this.uri)?.text??'';}
  delete(){exportDeletes.push(this.uri);exportFiles.delete(this.uri);}
}
class ExportDirectory {
  constructor(parent,name){this.uri=fileUri(parent,name);}
  create(){}
  list(){return [...exportFiles.keys()].filter(uri=>uri.startsWith(this.uri+'/')).map(uri=>new ExportFile(this,uri.slice(this.uri.length+1)));}
}
rn.Share={share:()=>{throw Error('Native exports must share a file URI, never JSON text');}};
const switchAccount = id => { authUserId=id; for(const listener of authListeners) listener(id ? {userId:id} : null); };
const pushRegistry = {
  registerNativePushToken: async (token, expectedUserId) => { pushRegistrations.push({token,expectedUserId}); if(!registrationAccepted) throw Error('TEST_NO_REMOTE_ACK'); },
  syncDevicePushRegistration: async input => { pushRetirements.push(input); return {status:retirementStatus}; },
};
const constants = { expoConfig: { version:'test' }, easConfig: { projectId:'TEST_PROJECT' } };
let device = { data: { calendar: { events: [] }, health: { permission:'not_requested', imported:0, enabledMetrics:[] }, reminderKinds:{} }, error: false };
const services = { calendarSource: {
  permission: async () => permission,
  requestPermission: async () => permission,
  listCalendars: async () => calendars,
  getBlockExportStatus: async (calendarId,blockId,current) => calendarStatusHook ? calendarStatusHook(calendarId,blockId,current) : calendarStatuses[calendarId] ?? {state:'not_exported',permission},
  retryOperation: async (...args) => {calendarRetries.push(args);if(failCalendar)throw Error('TEST_RETRY_FAILURE');},
  open: async record => {calendarOpens.push(record);},
  createForBlock: async (...args) => { calendarCalls.push(args); if (failCalendar) throw new Error('test_os_write_failed'); },
}, deviceRepository: { read: async () => device.data, update: async fn => { device.data=fn(device.data); quietWrites.push(device.data.notificationQuietHours); return device.data; } },
notifications: () => ({ permission: async () => 'denied', requestPermission: async () => permission, getPushToken: async () => pushTokenHook ? pushTokenHook() : pushToken }) };
const originalLoad = Module._load;
const component = name => props => React.createElement(name, props, props.children);
Module._load = function(request, parent, isMain) {
  if (request === 'react') return React;
  if (request === 'react/jsx-runtime') return require(path.join(runtime, 'react/jsx-runtime'));
  if (request === 'react-native') return rn;
  if (request === 'react-native-safe-area-context') return { SafeAreaView:'SafeAreaView' };
  if (request === '@react-native-community/datetimepicker') return component('DateTimePicker');
  if (request === '@react-navigation/native') return { useNavigation: () => navigation, useRoute: () => route, useFocusEffect: React.useEffect };
  if (request === 'expo-constants') return constants;
  if (request === 'expo-file-system') return {File:ExportFile,Directory:ExportDirectory,Paths:{cache:'file:///TEST_CACHE'}};
  if (request === 'expo-document-picker') return {getDocumentAsync:async()=>pickedBackup};
  if (/\/sync-v2\/runtime$/.test(request)) return {readSyncState:async()=>({ownerId:authUserId}),restoreRecordBackup:async text=>{if(restoreFailure)throw Error('TEST_RESTORE_BLOCKED');restoreCalls.push(text);}};
  if (request === 'expo-sharing') return {isAvailableAsync:async()=>shareAvailable,shareAsync:async(...args)=>{shareCalls.push(args);if(shareHook)await shareHook();}};
  if (request === 'expo-crypto') return {randomUUID:()=>`11111111-1111-4111-8111-${String(++exportSequence).padStart(12,'0')}`};
  if (/\/store$/.test(request)) return { useStore: () => store };
  if (/\/useQuestTheme$/.test(request)) return { useQuestTheme: () => require('../design/tokens.ts').getQuestTheme(store?.data?.settings?.selectedThemeId ?? 'cleanFocus') };
  if (/\/useDeviceData$/.test(request)) return { useDeviceData: () => device };
  if (/\/platform\/services$/.test(request)) return services;
  if (/\/sync-v2\/supabase$/.test(request)) return { authService: { getUserId: async () => authUserId,
    subscribe: listener => { authListeners.add(listener); return () => authListeners.delete(listener); } } };
  if (/\/sync-v2\/pushRegistry$/.test(request)) return pushRegistry;
  if (/\/useExternalCalendarBlocks$/.test(request)) return { useExternalCalendarBlocks: () => [] };
  if (/\/storage$/.test(request)) return { today: () => '2026-09-20' };
  if (/\/analytics$/.test(request)) return { trackEvent() {} };
  if (/\/TimePickerInput$/.test(request)) return originalLoad.call(this, path.resolve(__dirname, '../components/TimePickerInput.native.tsx'), parent, isMain);
  if (/\/decisionService$/.test(request)) return { isDecisionDebugEnabled: () => false };
  if (/\/featureFlag$/.test(request)) return { getV11ProductLanguage: lang => lang, getV11ProductThemeId: theme => theme, isV11ProductEnabled:()=>false };
  if (/\/(GoalForm|SkillForm|AccountSyncSection|ScheduleProposalReview)$/.test(request)) return component(request.split('/').at(-1));
  if (/\/BottomSheetForm$/.test(request)) return props => props.visible ? React.createElement('Sheet', props, props.children) : null;
  if (/\/QuestPrimitives$/.test(request)) return new Proxy({}, { get: (_, name) => name === '__esModule' ? true : props => React.createElement(name, props, props.children, props.trailing) });
  if (/\/Quest(Button|Input|Pill|Icon|Card|EntityIcon|SegmentedControl|ProgressBar)$/.test(request)) return component(request.split('/').at(-1));
  if (/\/NativeControls$/.test(request)) return { NativeAction: component('NativeAction'), NativeSection: component('NativeSection'), useNativeTheme: () => ({ environment:{canvas:'test'}, text:{primary:'test',secondary:'test'}, border:{subtle:'test'} }) };
  return originalLoad.call(this, request, parent, isMain);
};
for (const extension of ['.ts', '.tsx']) require.extensions[extension] = (module, filename) => {
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop:true } }).outputText;
  module._compile(code, filename);
};
const { DEFAULT_DATA } = require('../types.ts');
const validation = require('./nativeWorkflowValidation.ts');
const initial = { title:'TEST calendar', startAt:'2026-09-20T09:00:00+08:00', endAt:'2026-09-20T10:00:00+08:00', linkedScheduleBlockId:'TEST_BLOCK' };
const block = { id:'TEST_BLOCK', title:'TEST plan', date:'2026-09-20', startTime:'09:00', endTime:'10:00', plannedMinutes:60, taskType:'deep_study', flexibility:'flexible', rigidity:'medium', status:'planned', source:'manual', createdAt:1 };
let tree;
const fresh = () => { store = { data:structuredClone(DEFAULT_DATA), setSettings: patch => Object.assign(store.data.settings, patch) }; store.data.settings.language='en'; alerts=[]; navigations=[]; calendarCalls=[]; calendars=[]; permission='granted'; failCalendar=false; device.data.calendar.events=[]; device.data.notificationQuietHours=undefined; quietWrites=[]; pushToken=null; constants.easConfig.projectId='TEST_PROJECT'; rn.Platform.OS='android';
  authUserId='11111111-1111-4111-8111-111111111111'; device.data.notificationsEnabled=true; pushRegistrations=[]; pushRetirements=[]; registrationAccepted=false; retirementStatus='disabled'; pushTokenHook=undefined;
  shareCalls=[];shareHook=undefined;shareAvailable=true;exportFiles=new Map();exportDeletes=[];exportWriteFailure=false;exportSequence=0;
  pickedBackup={canceled:true};restoreCalls=[];restoreFailure=false;
  calendarStatuses={};calendarStatusHook=undefined;calendarRetries=[];calendarOpens=[];
};
const render = async (file, props={}) => { await act(async () => { tree=create(React.createElement(require(file).default, props)); }); return tree; };
const button = label => tree.root.findAll(node => node.type === 'QuestButton' && node.props.label === label)[0];
afterEach(async () => { if(tree) await act(async () => tree.unmount()); tree=undefined; });

test('backup shares a versioned file with exact record and account binding', async () => {
  fresh(); await render('../backup/RecordBackupActions.tsx');
  await act(async()=>button('Save restorable backup').props.onPress()); assert.equal(shareCalls.length,0);
  await act(async()=>alerts.at(-1)[2][1].onPress());
  const saved=JSON.parse(exportFiles.get(shareCalls[0][0]).text);
  assert.equal(saved.format,'questlife.records.backup.v1'); assert.equal(saved.ownerId,authUserId); assert.deepEqual(saved.data,store.data);
});
test('first launch exposes recovery before Today can create a decision record', async () => {
  fresh(); authUserId=null; await render('../screens/OnboardingScreen.tsx');
  assert.equal(button('Choose backup to restore'),undefined);
  await act(async()=>button('Backup and restore').props.onPress());
  assert.ok(button('Choose backup to restore')); assert.equal(store.data.decisionResults.length,0);
  assert.deepEqual(restoreCalls,[]); assert.equal(store.data.settings.onboardingCompleted,undefined);
});
test('cancelled backup picker never restores', async () => {
  fresh(); await render('../backup/RecordBackupActions.tsx'); await act(async()=>button('Choose backup to restore').props.onPress());
  assert.deepEqual(restoreCalls,[]); assert.equal(alerts.length,0);
});
test('backup restore validates and requires separate confirmation', async () => {
  fresh(); const text=JSON.stringify(require('../backup/records.ts').createRecordBackup(store.data,authUserId));
  const uri='file:///TEST_CACHE/input.json';exportFiles.set(uri,{text,modified:Date.now()});pickedBackup={canceled:false,assets:[{uri,size:Buffer.byteLength(text)}]};
  await render('../backup/RecordBackupActions.tsx');await act(async()=>button('Choose backup to restore').props.onPress());
  assert.equal(restoreCalls.length,0);assert.equal(button('Choose backup to restore').props.disabled,true);
  await act(async()=>alerts.at(-1)[2][1].onPress());assert.deepEqual(restoreCalls,[text]);assert.equal(button('Choose backup to restore').props.disabled,false);
});
test('malformed backup does not reach confirmation or restore boundary', async () => {
  fresh(); const uri='file:///TEST_CACHE/bad.json';exportFiles.set(uri,{text:'{}',modified:Date.now()});pickedBackup={canceled:false,assets:[{uri,size:2}]};
  await render('../backup/RecordBackupActions.tsx');await act(async()=>button('Choose backup to restore').props.onPress());assert.equal(alerts.length,0);assert.equal(restoreCalls.length,0);
  assert.ok(tree.root.findAll(node=>node.type==='Text'&&node.props.accessibilityRole==='alert').length);
});
test('calendar draft rejects blank, invalid, reversed and zero-length values', () => {
  assert.equal(validation.validCalendarDraft(initial), true);
  for(const patch of [{title:' '},{startAt:'bad'},{endAt:'bad'},{endAt:initial.startAt},{endAt:'2026-09-19T10:00:00+08:00'}]) assert.equal(validation.validCalendarDraft({...initial,...patch}),false);
});
test('schedule validation uses real local dates and bounded wall times', () => {
  assert.equal(validation.validScheduleDate('2028-02-29'),true);
  for(const date of ['2026-02-29','2026-13-01','2026-04-31','2026-9-20']) assert.equal(validation.validScheduleDate(date),false);
  assert.equal(validation.scheduleMinutes('23:30','24:00'),30);
  for(const [start,end] of [['24:00','25:00'],['09:61','11:00'],['bad','10:00'],['10:00','09:00']]) assert.equal(validation.scheduleMinutes(start,end),0);
});
test('conflicts exclude self, skipped, adjacent and other dates, including moved target day', () => {
  const draft={...block,date:'2026-09-28'};
  const others=[{...draft,id:'overlap'},{...draft,id:'adjacent',startTime:'10:00',endTime:'11:00'},{...draft,id:'skip',status:'skipped'},block];
  assert.deepEqual(validation.scheduleConflicts(draft,others,block.id).map(row=>row.id),['overlap']);
});
test('calendar status matches exact owned link/title/times, never cloud or external records', () => {
  const event={...initial,title:block.title,startAt:new Date(`${block.date}T09:00:00`).toISOString(),endAt:new Date(`${block.date}T10:00:00`).toISOString(),ownership:'questlife',allDay:false};
  assert.equal(validation.calendarMatchesBlock(event,block),true);
  for(const patch of [{title:'changed'},{ownership:'external'},{linkedScheduleBlockId:undefined},{allDay:true},{endAt:'2026-09-21T10:00:00Z'}]) assert.equal(validation.calendarMatchesBlock({...event,...patch},block),false);
});
test('calendar editor disables invalid save and preserves draft metadata', async () => {
  fresh();const writes=[];
  await render('./NativeCalendarEditor.tsx',{initial:{...initial,title:''},lang:'en',onSave:async value=>writes.push(value),onClose(){}});
  assert.equal(button('Save').props.disabled,true);
  await act(async()=>tree.root.findByType('QuestInput').props.onChangeText(' TEST updated '));
  await act(async()=>button('Save').props.onPress());
  assert.equal(writes.length,1);assert.equal(writes[0].title,'TEST updated');assert.equal(writes[0].linkedScheduleBlockId,'TEST_BLOCK');
});
test('calendar editor locks duplicate save and dismissal until write completes', async () => {
  fresh();let release;let writes=0;let closed=0;
  await render('./NativeCalendarEditor.tsx',{initial,lang:'en',onSave:()=>{writes++;return new Promise(resolve=>{release=resolve;});},onClose:()=>closed++});
  await act(async()=>{button('Save').props.onPress();button('Save').props.onPress();});
  await act(async()=>tree.root.findByType('Modal').props.onRequestClose());
  assert.equal(writes,1);assert.equal(closed,0);
  await act(async()=>release());assert.equal(closed,1);
});
test('calendar write failure keeps editor and entered title available for retry', async () => {
  fresh();let closed=false;
  await render('./NativeCalendarEditor.tsx',{initial,lang:'en',editing:true,onSave:async()=>{throw Error('TEST');},onClose:()=>{closed=true;}});
  await act(async()=>button('Save').props.onPress());
  assert.equal(closed,false);assert.equal(tree.root.findByType('QuestInput').props.value,initial.title);
  assert.ok(tree.root.findAll(node=>node.props.accessibilityRole==='alert').length);
  assert.equal(button('Save').props.loading,false);
});
test('native time field ignores Android cancellation and uses theme-aware iOS picker', async () => {
  fresh();const q=require('../design/tokens.ts').getQuestTheme('deepWork');const changes=[];
  await render('./NativeDateTimeField.tsx',{value:new Date(initial.startAt),mode:'time',label:'TEST time',onChange:value=>changes.push(value),theme:q,lang:'en'});
  await act(async()=>tree.root.findByType('QuestButton').props.onPress());
  await act(async()=>tree.root.findByType('DateTimePicker').props.onChange({type:'dismissed'},new Date()));
  assert.equal(changes.length,0);assert.equal(tree.root.findAllByType('DateTimePicker').length,0);
  rn.Platform.OS='ios';await act(async()=>tree.root.findByType('QuestButton').props.onPress());
  assert.equal(tree.root.findByType('DateTimePicker').props.themeVariant,'dark');
});
for (const lang of ['zh','en']) for (const mode of ['date','time']) test(`native ${mode} display uses explicit Intl locale for ${lang}`, async () => {
  fresh();const value=new Date(2026,8,20,17,6);const timestamp=value.getTime();const changes=[];
  value.toLocaleDateString=()=>{throw Error('Date locale shortcuts must not format native labels');};
  value.toLocaleTimeString=()=>{throw Error('Date locale shortcuts must not format native labels');};
  const props={value,mode,label:'TEST field',onChange:next=>changes.push(next),theme:require('../design/tokens.ts').getQuestTheme('cleanFocus'),lang};
  await render('./NativeDateTimeField.tsx',props);
  const expected=new Intl.DateTimeFormat(lang==='zh'?'zh-CN':'en-AU',mode==='date'
    ? {year:'numeric',month:'numeric',day:'numeric'} : {hour:'2-digit',minute:'2-digit'}).format(value);
  assert.equal(tree.root.findByType('QuestButton').props.label,expected);
  assert.equal(tree.root.findByType('QuestButton').props.accessibilityLabel,`TEST field: ${expected}`);
  assert.equal(value.getTime(),timestamp);assert.deepEqual(changes,[]);
  if(mode==='time') {
    await act(async()=>tree.update(React.createElement(require('./NativeDateTimeField.tsx').default,{...props,displayValue:'24:00'})));
    assert.equal(tree.root.findByType('QuestButton').props.label,'24:00');
  }
});
for (const [lang,theme] of [['en','cleanFocus'],['zh','deepWork']]) test(`shared time-picker adapter preserves clock props and ${lang}/${theme} preferences`, async()=>{
  fresh();store.data.settings.language=lang;store.data.settings.selectedThemeId=theme;rn.Platform.OS='ios';const changes=[];
  await render('../components/TimePickerInput.native.tsx',{hour:17,minute:6,onChange:(...clock)=>changes.push(clock)});
  const field=tree.root.findByType(require('./NativeDateTimeField.tsx').default);
  assert.equal(field.props.lang,lang);assert.equal(field.props.value.getHours(),17);assert.equal(field.props.value.getMinutes(),6);
  assert.equal(field.props.label,require('../i18n.ts').t(lang,'dailyReminder'));assert.equal(button('17:06').props.label,'17:06');
  await act(async()=>button('17:06').props.onPress());
  assert.equal(tree.root.findByType('DateTimePicker').props.themeVariant,theme==='deepWork'?'dark':'light');
  const next=new Date(2026,8,20,0,5);await act(async()=>tree.root.findByType('DateTimePicker').props.onChange({type:'set'},next));
  assert.deepEqual(changes,[[0,5]]);
});
test('schedule calendar sheet has no automatic write and only writes chosen writable calendar', async () => {
  fresh();store.data.scheduleBlocks=[block];calendars=[{id:'READ',title:'TEST read-only',source:'test',writable:false},{id:'WRITE',title:'TEST writable',source:'test',writable:true}];
  await render('./NativeScheduleCalendarSheet.tsx',{blockId:block.id,onClose(){}});
  assert.equal(calendarCalls.length,0);assert.equal(button('External commitment').props.disabled,true);
  await act(async()=>button('Create calendar event').props.onPress());
  assert.equal(calendarCalls.length,0);await act(async()=>alerts.at(-1)[2][1].onPress());
  assert.equal(calendarCalls.length,1);assert.equal(calendarCalls[0][0],'WRITE');assert.deepEqual(calendarCalls[0][2],{confirmed:true});
});
test('calendar sheet keeps failed writes retryable and never displays Saved', async () => {
  fresh();store.data.scheduleBlocks=[block];calendars=[{id:'WRITE',title:'TEST writable',source:'test',writable:true}];failCalendar=true;
  await render('./NativeScheduleCalendarSheet.tsx',{blockId:block.id,onClose(){}});
  await act(async()=>button('Create calendar event').props.onPress());
  await act(async()=>alerts.at(-1)[2][1].onPress());
  assert.ok(tree.root.findAll(node=>node.props.accessibilityRole==='alert').length);
  assert.equal(JSON.stringify(tree.toJSON()).includes('Saved:'),false);
});
test('native skill library searches and opens the real edit form without navigating', async () => {
  fresh();store.data.skills=[{id:'TEST_A',name:'TEST Alpha',taskType:'deep_study',totalXP:0,progressType:'time_based'},{id:'TEST_B',name:'TEST Beta',taskType:'admin',totalXP:0,progressType:'time_based'}];
  await render('../screens/SkillLibraryScreen.tsx');
  await act(async()=>tree.root.findByType('QuestInput').props.onChangeText('alpha'));
  assert.equal(tree.root.findAll(node=>node.type==='TouchableOpacity' && node.props.accessibilityLabel==='TEST Beta').length,0);
  const edit=tree.root.findAll(node=>node.type==='TouchableOpacity' && node.props.accessibilityLabel==='Edit: TEST Alpha')[0];
  let stopped=false;await act(async()=>edit.props.onPress({stopPropagation:()=>{stopped=true;}}));
  assert.equal(stopped,true);assert.equal(navigations.length,0);
  assert.equal(tree.root.findAllByType('SkillForm').find(node=>node.props.initial?.id==='TEST_A').props.visible,true);
});
test('native Settings changes actual preference actions without a web Preferences route', async () => {
  fresh();await render('./NativeSettingsScreen.tsx',{navigation});
  const controls=tree.root.findAllByType('QuestSegmentedControl');
  await act(async()=>controls[0].props.onChange('deepWork'));
  await act(async()=>controls[1].props.onChange('zh'));
  assert.equal(store.data.settings.selectedThemeId,'deepWork');assert.equal(store.data.settings.language,'zh');assert.equal(navigations.length,0);
});
test('native schedule opens native date/time fields, creates without execution, and confirms conflicts', async () => {
  fresh();store.data.skills=[];store.data.scheduleBlocks=[block];const saved=[];
  store.addScheduleBlock=value=>saved.push(value);
  store.updateScheduleBlock=()=>{};store.deleteScheduleBlock=()=>{};
  store.createExecutionLog=()=>{throw Error('Planning must not create execution');};
  await render('../screens/ScheduleScreen.tsx');
  await act(async()=>button('Add Block').props.onPress());
  assert.equal(tree.root.findAllByType(require('./NativeScheduleFields.tsx').default).length,1);
  await act(async()=>tree.root.findAllByType('QuestInput')[0].props.onChangeText('TEST conflicting plan'));
  await act(async()=>button('Create Block').props.onPress());
  assert.equal(saved.length,0);assert.equal(alerts.length,1);
  await act(async()=>alerts[0][2][1].onPress());
  assert.equal(saved.length,1);assert.equal(saved[0].plannedMinutes,60);assert.equal(saved[0].status,'planned');
});
test('native schedule edits preserve completion/source and deletion requires confirmation', async () => {
  fresh();const original={...block,status:'completed',source:'skill_rule'};store.data.skills=[];store.data.scheduleBlocks=[original];const writes=[];const removed=[];
  store.updateScheduleBlock=(id,patch)=>writes.push([id,patch]);store.deleteScheduleBlock=id=>removed.push(id);
  await render('../screens/ScheduleScreen.tsx');
  await act(async()=>button('Edit').props.onPress());
  const fields=tree.root.findByType(require('./NativeScheduleFields.tsx').default);
  await act(async()=>{fields.props.onStart('11:00');fields.props.onEnd('12:30');});
  await act(async()=>button('Save').props.onPress());
  assert.equal(writes[0][0],block.id);assert.equal(writes[0][1].status,'completed');assert.equal(writes[0][1].source,'skill_rule');assert.equal(writes[0][1].plannedMinutes,90);
  await act(async()=>button('Delete').props.onPress());assert.equal(removed.length,0);
  await act(async()=>alerts.at(-1)[2][1].onPress());assert.deepEqual(removed,[block.id]);
});
test('remote schedule edit while editor is open refuses stale overwrite', async () => {
  fresh();store.data.skills=[];store.data.scheduleBlocks=[block];let writes=0;store.updateScheduleBlock=()=>writes++;
  await render('../screens/ScheduleScreen.tsx');
  await act(async()=>button('Edit').props.onPress());
  store.data.scheduleBlocks=[{...block,title:'TEST remote changed'}];
  await act(async()=>tree.update(React.createElement(require('../screens/ScheduleScreen.tsx').default)));
  await act(async()=>button('Save').props.onPress());assert.equal(writes,0);assert.equal(alerts.length,1);
});
test('web schedule retains canonical text entry and has no native calendar action', async () => {
  fresh();rn.Platform.OS='web';store.data.skills=[];store.data.scheduleBlocks=[];
  await render('../screens/ScheduleScreen.tsx');
  await act(async()=>button('Add Block').props.onPress());
  assert.equal(tree.root.findAllByType(require('./NativeScheduleFields.tsx').default).length,0);
  assert.equal(tree.root.findAllByType('QuestInput').filter(node=>node.props.placeholder==='YYYY-MM-DD').length,1);
  assert.equal(button('System Calendar'),undefined);
});
test('calendar permission denied exposes recovery without offering writes', async () => {
  fresh();permission='denied';store.data.scheduleBlocks=[block];
  await render('./NativeScheduleCalendarSheet.tsx',{blockId:block.id,onClose(){}});
  assert.ok(button('Permissions'));assert.ok(button('Connect'));assert.equal(button('Create calendar event'),undefined);assert.equal(calendarCalls.length,0);
});
test('Goal list exposes create, detail, library and confirmed deletion actions', async () => {
  fresh();store.data.categories=[{id:'TEST_GOAL',name:'TEST goal',createdAt:1}];store.data.skills=[];store.data.moduleSkillLinks=[];let removed;
  store.deleteCategory=(...args)=>{removed=args;};
  await render('../screens/GoalTreeScreen.tsx');
  const t=require('../i18n.ts').t;
  await act(async()=>button(t('en','addQuest')).props.onPress());assert.equal(tree.root.findByType('GoalForm').props.visible,true);
  await act(async()=>button(t('en','skillLibrary')).props.onPress());assert.deepEqual(navigations.at(-1),['SkillLibrary']);
  const row=tree.root.findAll(node=>node.type==='TouchableOpacity'&&node.props.accessibilityLabel?.startsWith('TEST goal'))[0];
  await act(async()=>row.props.onPress());assert.deepEqual(navigations.at(-1),['GoalDetail',{categoryId:'TEST_GOAL'}]);
  await act(async()=>row.props.onLongPress());assert.equal(removed,undefined);
  await act(async()=>alerts.at(-1)[2][1].onPress());assert.deepEqual(removed,['TEST_GOAL','transfer']);
});
test('real Goal form creates and edits through canonical store actions', async () => {
  fresh();const t=require('../i18n.ts').t;const writes=[];
  store.addCategory=value=>{writes.push(value);return {...value,id:'TEST_GOAL'};};
  store.updateCategory=(id,value)=>writes.push({id,...value});
  await render('../components/GoalForm.tsx',{visible:true,onClose(){}});
  await act(async()=>tree.root.findAllByType('QuestInput')[0].props.onChangeText('TEST goal'));
  await act(async()=>button(t('en','create')).props.onPress());assert.equal(writes[0].name,'TEST goal');
  await act(async()=>tree.update(React.createElement(require('../components/GoalForm.tsx').default,{visible:true,onClose(){},initial:{...writes[0],id:'TEST_GOAL'}})));
  await act(async()=>tree.root.findAllByType('QuestInput')[0].props.onChangeText('TEST renamed'));
  await act(async()=>button('Save').props.onPress());assert.equal(writes[1].id,'TEST_GOAL');assert.equal(writes[1].name,'TEST renamed');
});
test('real Skill form creates module-linked skill and edits through canonical actions', async () => {
  fresh();const t=require('../i18n.ts').t;const writes=[];
  store.data.categories=[{id:'TEST_GOAL',name:'TEST goal',createdAt:1}];store.data.modules=[{id:'TEST_MODULE',goalId:'TEST_GOAL',name:'TEST module',createdAt:1}];
  store.createSkillAndAttachToModule=(...args)=>writes.push(args);
  store.updateSkill=(...args)=>writes.push(args);
  await render('../components/SkillForm.tsx',{visible:true,onClose(){},presetCategoryId:'TEST_GOAL',presetModuleId:'TEST_MODULE',linkOnCreate:true});
  await act(async()=>tree.root.findAllByType('QuestInput')[0].props.onChangeText('TEST skill'));
  await act(async()=>button(t('en','create')).props.onPress());
  assert.equal(writes[0][0],'TEST_GOAL');assert.equal(writes[0][1],'TEST_MODULE');assert.equal(writes[0][2].name,'TEST skill');
  await act(async()=>tree.update(React.createElement(require('../components/SkillForm.tsx').default,{visible:true,onClose(){},initial:{...writes[0][2],id:'TEST_SKILL',totalXP:0,createdAt:1}})));
  await act(async()=>tree.root.findAllByType('QuestInput')[0].props.onChangeText('TEST skill edited'));
  await act(async()=>button('Save').props.onPress());assert.equal(writes[1][0],'TEST_SKILL');assert.equal(writes[1][1].name,'TEST skill edited');
});
test('Goal detail module CRUD and skill linking stay reachable', async () => {
  fresh();route={params:{categoryId:'TEST_GOAL'}};const t=require('../i18n.ts').t;const writes=[];
  store.data.categories=[{id:'TEST_GOAL',name:'TEST goal',createdAt:1}];store.data.modules=[];store.data.skills=[];store.data.moduleSkillLinks=[];
  store.addModule=value=>writes.push(['create',value]);store.updateModule=(...args)=>writes.push(['edit',...args]);store.deleteModule=id=>writes.push(['delete',id]);
  store.addExistingSkillToModule=(...args)=>writes.push(['link',...args]);store.removeSkillFromModule=(...args)=>writes.push(['unlink',...args]);
  await render('../screens/GoalDetailScreen.tsx');
  await act(async()=>button(t('en','addModule')).props.onPress());
  await act(async()=>tree.root.findAllByType('QuestInput')[0].props.onChangeText('TEST module'));
  await act(async()=>button('Save').props.onPress());assert.equal(writes[0][1].name,'TEST module');
  store.data.modules=[{...writes[0][1],id:'TEST_MODULE',createdAt:1}];store.data.skills=[{id:'TEST_SKILL',name:'TEST skill',totalXP:0,createdAt:1,progressType:'time_based'}];
  await act(async()=>tree.update(React.createElement(require('../screens/GoalDetailScreen.tsx').default)));
  const edit=tree.root.findAll(node=>node.type==='TouchableOpacity'&&node.props.accessibilityLabel===`${t('en','editModule')}: TEST module`)[0];
  await act(async()=>edit.props.onPress());await act(async()=>tree.root.findAllByType('QuestInput')[0].props.onChangeText('TEST module edited'));
  await act(async()=>button('Save').props.onPress());assert.equal(writes[1][0],'edit');assert.equal(writes[1][1],'TEST_MODULE');
  await act(async()=>button(t('en','addExistingSkill')).props.onPress());
  const link=tree.root.findAll(node=>node.type==='TouchableOpacity'&&node.props.accessibilityLabel===`${t('en','addExistingSkill')}: TEST skill`)[0];
  await act(async()=>link.props.onPress());assert.deepEqual(writes.at(-1),['link','TEST_GOAL','TEST_MODULE','TEST_SKILL']);
  const remove=tree.root.findAll(node=>node.type==='TouchableOpacity'&&node.props.accessibilityLabel===`${t('en','deleteModule')}: TEST module`)[0];
  await act(async()=>remove.props.onPress({stopPropagation(){}}));await act(async()=>alerts.at(-1)[2][1].onPress());assert.deepEqual(writes.at(-1),['delete','TEST_MODULE']);
});
test('quiet hours enable, edit overnight hours, and disable using equal minutes', async () => {
  fresh();await render('./NativeNotificationPreferences.tsx');
  await act(async()=>tree.root.findByType('Switch').props.onValueChange(true));
  assert.deepEqual(quietWrites.at(-1),{startMinute:1320,endMinute:420});
  await act(async()=>tree.update(React.createElement(require('./NativeNotificationPreferences.tsx').default)));
  const fields=tree.root.findAllByType(require('./NativeDateTimeField.tsx').default);assert.equal(fields.length,2);
  const next=new Date();next.setHours(23,30,0,0);
  await act(async()=>fields[0].props.onChange(next));assert.deepEqual(quietWrites.at(-1),{startMinute:1410,endMinute:420});
  await act(async()=>tree.update(React.createElement(require('./NativeNotificationPreferences.tsx').default)));
  await act(async()=>tree.root.findByType('Switch').props.onValueChange(false));assert.deepEqual(quietWrites.at(-1),{startMinute:1410,endMinute:1410});
});
test('production push callback without remote ACK never claims registration or delivery', async () => {
  fresh();pushToken='ExpoPushToken[TEST_ONLY]';await render('./NativeNotificationPreferences.tsx');
  await act(async()=>button('Connect this device').props.onPress());
  const output=JSON.stringify(tree.toJSON());assert.ok(output.includes('Push setup did not complete'));assert.equal(output.includes('Remote registration confirmed'),false);assert.equal(output.includes(pushToken),false);assert.equal(pushRegistrations.length,1);
});
test('push requires a non-null real provider token and acknowledged registration', async () => {
  fresh();let registrations=0;await render('./NativeNotificationPreferences.tsx',{registerPushToken:async()=>{registrations++;}});
  await act(async()=>button('Connect this device').props.onPress());assert.equal(registrations,0);assert.ok(JSON.stringify(tree.toJSON()).includes('Push setup did not complete'));
  pushToken='ExpoPushToken[TEST_ONLY]';await act(async()=>button('Connect this device').props.onPress());assert.equal(registrations,1);assert.ok(JSON.stringify(tree.toJSON()).includes('Push delivery has not been verified'));
});
test('failed push registration never shows remote success', async () => {
  fresh();pushToken='ExpoPushToken[TEST_ONLY]';await render('./NativeNotificationPreferences.tsx',{registerPushToken:async()=>{throw Error('TEST_REMOTE_FAILURE');}});
  await act(async()=>button('Connect this device').props.onPress());assert.equal(JSON.stringify(tree.toJSON()).includes('Remote registration confirmed'),false);
});
test('Settings passes the production registration callback and captures current account', async () => {
  fresh();registrationAccepted=true;pushToken='ExpoPushToken[TEST_ONLY_123]';await render('./NativeSettingsScreen.tsx',{navigation});
  assert.equal(tree.root.findByType(require('./NativeNotificationPreferences.tsx').default).props.registerPushToken,pushRegistry.registerNativePushToken);
  await act(async()=>button('Connect this device').props.onPress());
  assert.deepEqual(pushRegistrations,[{token:pushToken,expectedUserId:authUserId}]);
  assert.ok(JSON.stringify(tree.toJSON()).includes('Remote registration confirmed'));
  assert.equal(JSON.stringify(tree.toJSON()).includes(pushToken),false);
});
test('push cannot register while signed out or reminders are disabled', async () => {
  fresh();authUserId=null;pushToken='ExpoPushToken[TEST_ONLY_123]';await render('./NativeNotificationPreferences.tsx');
  assert.equal(button('Connect this device').props.disabled,true);
  await act(async()=>button('Connect this device').props.onPress());assert.equal(pushRegistrations.length,0);
  await act(async()=>switchAccount('11111111-1111-4111-8111-111111111111'));
  device.data.notificationsEnabled=false;
  await act(async()=>tree.update(React.createElement(require('./NativeNotificationPreferences.tsx').default)));
  assert.equal(button('Connect this device').props.disabled,true);
  await act(async()=>button('Connect this device').props.onPress());assert.equal(pushRegistrations.length,0);
});
test('account switch while OS token acquisition is pending never registers for B', async () => {
  fresh();registrationAccepted=true;let release;
  pushTokenHook=()=>new Promise(resolve=>{release=resolve;});
  await render('./NativeNotificationPreferences.tsx');
  await act(async()=>button('Connect this device').props.onPress());
  assert.equal(typeof release,'function');
  await act(async()=>{switchAccount('22222222-2222-4222-8222-222222222222');release('ExpoPushToken[TEST_ONLY_123]');});
  assert.equal(pushRegistrations.length,0);assert.equal(JSON.stringify(tree.toJSON()).includes('Remote registration confirmed'),false);
});
test('late registration ACK is not displayed after account switch or logout', async () => {
  fresh();pushToken='ExpoPushToken[TEST_ONLY_123]';let release;
  await render('./NativeNotificationPreferences.tsx',{registerPushToken:()=>new Promise(resolve=>{release=resolve;})});
  await act(async()=>button('Connect this device').props.onPress());
  await act(async()=>{switchAccount(null);release();});
  assert.equal(JSON.stringify(tree.toJSON()).includes('Remote registration confirmed'),false);
});
test('denied OS permission retires registration without requesting a push token', async () => {
  fresh();permission='denied';pushTokenHook=()=>{throw Error('Must not request token');};
  await render('./NativeNotificationPreferences.tsx');
  await act(async()=>button('Connect this device').props.onPress());
  assert.equal(pushRegistrations.length,0);assert.equal(pushRetirements.length,1);
  assert.equal(pushRetirements[0].permissionGranted,false);
});
test('Settings reminder disable invokes retirement with no token', async () => {
  fresh();await render('./NativeSettingsScreen.tsx',{navigation});
  const toggle=tree.root.findAll(node=>node.type==='Switch'&&node.props.accessibilityLabel===require('../platform/nativeI18n.ts').nativeCopy('en','enableReminders'))[0];
  await act(async()=>toggle.props.onValueChange(false));
  assert.equal(device.data.notificationsEnabled,false);
  assert.deepEqual(pushRetirements,[{expectedUserId:authUserId,expoPushToken:null,notificationsEnabled:false,permissionGranted:false}]);
});
test('failed push retirement keeps reminders disabled and exposes a Settings error', async () => {
  fresh();retirementStatus='retirement_pending';await render('./NativeSettingsScreen.tsx',{navigation});
  const toggle=tree.root.findAll(node=>node.type==='Switch'&&node.props.accessibilityLabel===require('../platform/nativeI18n.ts').nativeCopy('en','enableReminders'))[0];
  await act(async()=>toggle.props.onValueChange(false));
  assert.equal(device.data.notificationsEnabled,false);
  assert.ok(tree.root.findAll(node=>node.type==='Text'&&node.props.accessibilityRole==='alert').length>0);
});
test('module reorder preserves IDs and goal membership without replacing modules', async () => {
  fresh();route={params:{categoryId:'TEST_GOAL'}};store.data.categories=[{id:'TEST_GOAL',name:'TEST goal',createdAt:1}];
  store.data.modules=[{id:'TEST_A',goalId:'TEST_GOAL',name:'TEST A',createdAt:1},{id:'TEST_B',goalId:'TEST_GOAL',name:'TEST B',createdAt:2}];
  store.data.skills=[];store.data.moduleSkillLinks=[];const writes=[];store.updateModule=(id,patch)=>writes.push([id,patch]);
  await render('../screens/GoalDetailScreen.tsx');
  const edit=tree.root.findAll(node=>node.type==='TouchableOpacity'&&node.props.accessibilityLabel==='Edit Module: TEST B')[0];
  await act(async()=>edit.props.onPress());assert.equal(button('Down').props.disabled,true);
  await act(async()=>button('Up').props.onPress());
  assert.deepEqual(writes,[['TEST_B',{order:0}],['TEST_A',{order:1}]]);
});

test('native midnight picker keeps the day-end boundary reachable', async () => {
  fresh();const ends=[];const starts=[];
  await render('./NativeScheduleFields.tsx',{date:block.date,start:'23:00',end:'23:30',onDate(){},onStart:value=>starts.push(value),onEnd:value=>ends.push(value),theme:require('../design/tokens.ts').getQuestTheme('cleanFocus'),lang:'en'});
  const fields=tree.root.findAllByType(require('./NativeDateTimeField.tsx').default);
  const midnight=new Date(`${block.date}T00:00:00`);
  await act(async()=>{fields[1].props.onChange(midnight);fields[2].props.onChange(midnight);});
  assert.deepEqual(starts,['00:00']);assert.deepEqual(ends,['24:00']);
  assert.equal(validation.scheduleMinutes('23:00',ends[0]),60);
});

test('moving a schedule to a future day confirms target-day conflicts and preserves identity', async () => {
  fresh();store.data.skills=[];const future={...block,id:'TEST_FUTURE',date:'2026-09-28'};
  store.data.scheduleBlocks=[block,future];const writes=[];
  store.updateScheduleBlock=(id,patch)=>writes.push([id,patch]);
  store.createExecutionLog=()=>{throw Error('Moving a plan must not record execution');};
  await render('../screens/ScheduleScreen.tsx');
  await act(async()=>button('Edit').props.onPress());
  await act(async()=>tree.root.findByType(require('./NativeScheduleFields.tsx').default).props.onDate(future.date));
  await act(async()=>button('Save').props.onPress());
  assert.equal(writes.length,0);assert.equal(alerts.length,1);
  await act(async()=>alerts[0][2][1].onPress());
  assert.equal(writes.length,1);assert.equal(writes[0][0],block.id);assert.equal(writes[0][1].date,future.date);
  assert.equal(writes[0][1].source,block.source);assert.equal(writes[0][1].status,block.status);
});

test('module reorder is scoped to its goal and preserves shared skill links', async () => {
  fresh();route={params:{categoryId:'TEST_GOAL'}};
  store.data.categories=[{id:'TEST_GOAL',name:'TEST goal',createdAt:1},{id:'TEST_OTHER',name:'TEST other',createdAt:1}];
  store.data.modules=[{id:'TEST_A',goalId:'TEST_GOAL',name:'TEST A',createdAt:1,order:0},{id:'TEST_B',goalId:'TEST_GOAL',name:'TEST B',createdAt:2,order:1},{id:'TEST_C',goalId:'TEST_OTHER',name:'TEST C',createdAt:3,order:7}];
  store.data.skills=[{id:'TEST_SKILL',name:'TEST skill',totalXP:0,createdAt:1,progressType:'time_based'}];
  store.data.moduleSkillLinks=[{id:'TEST_LINK',goalId:'TEST_GOAL',moduleId:'TEST_B',skillId:'TEST_SKILL',createdAt:1},{id:'TEST_OTHER_LINK',goalId:'TEST_OTHER',moduleId:'TEST_C',skillId:'TEST_SKILL',createdAt:1}];
  const links=structuredClone(store.data.moduleSkillLinks);const skills=structuredClone(store.data.skills);const other=structuredClone(store.data.modules[2]);
  store.updateModule=(id,patch)=>{assert.deepEqual(Object.keys(patch),['order']);store.data.modules=store.data.modules.map(row=>row.id===id?{...row,...patch}:row);};
  await render('../screens/GoalDetailScreen.tsx');
  await act(async()=>tree.root.findAll(node=>node.type==='TouchableOpacity'&&node.props.accessibilityLabel==='Edit Module: TEST B')[0].props.onPress());
  await act(async()=>button('Up').props.onPress());
  assert.equal(store.data.modules.find(row=>row.id==='TEST_B').order,0);
  assert.deepEqual(store.data.moduleSkillLinks,links);assert.deepEqual(store.data.skills,skills);assert.deepEqual(store.data.modules[2],other);
});

test('module skill opens detail and unlink requires confirmation without deleting the library record', async () => {
  fresh();route={params:{categoryId:'TEST_GOAL'}};
  store.data.categories=[{id:'TEST_GOAL',name:'TEST goal',createdAt:1}];
  store.data.modules=[{id:'TEST_MODULE',goalId:'TEST_GOAL',name:'TEST module',createdAt:1}];
  store.data.skills=[{id:'TEST_SKILL',name:'TEST skill',totalXP:0,createdAt:1,progressType:'time_based'}];
  store.data.moduleSkillLinks=[{id:'TEST_LINK',goalId:'TEST_GOAL',moduleId:'TEST_MODULE',skillId:'TEST_SKILL',createdAt:1}];
  const removed=[];store.removeSkillFromModule=(...args)=>removed.push(args);
  store.deleteSkillFromLibrary=()=>{throw Error('Unlink must not delete a library record');};
  await render('../screens/GoalDetailScreen.tsx');
  const row=tree.root.findAll(node=>node.type==='TouchableOpacity'&&node.props.accessibilityLabel?.startsWith('TEST skill ·'))[0];
  await act(async()=>row.props.onPress());assert.deepEqual(navigations.at(-1),['SkillDetail',{skillId:'TEST_SKILL'}]);
  const label=`${require('../i18n.ts').t('en','removeFromModule')}: TEST skill`;
  await act(async()=>tree.root.findAll(node=>node.type==='TouchableOpacity'&&node.props.accessibilityLabel===label)[0].props.onPress({stopPropagation(){}}));
  assert.equal(removed.length,0);await act(async()=>alerts.at(-1)[2][1].onPress());
  assert.deepEqual(removed,[['TEST_MODULE','TEST_SKILL']]);assert.equal(store.data.skills[0].id,'TEST_SKILL');
});

test('native Settings explicitly exports a JSON file with recovery and clear limits', async()=>{
  fresh();const before=structuredClone(store.data);await render('./NativeSettingsScreen.tsx',{navigation});
  assert.ok(button('Export local records'));assert.equal(shareCalls.length,0);
  await act(async()=>button('Export local records').props.onPress());
  assert.equal(shareCalls.length,0);assert.match(alerts.at(-1)[1],/receiving app may upload/);
  await act(async()=>alerts.at(-1)[2][1].onPress());
  assert.equal(shareCalls.length,1);assert.deepEqual(JSON.parse(exportFiles.get(shareCalls[0][0]).text),before);assert.deepEqual(store.data,before);
  assert.equal(shareCalls[0][1].mimeType,'application/json');assert.equal(shareCalls[0][1].UTI,'public.json');
  const text=tree.root.findAllByType('Text').flatMap(node=>node.children.filter(child=>typeof child==='string')).join(' ');
  assert.match(text,/does not confirm that the destination saved it/);assert.match(text,/File recovery uses a file created by Backup and restore/);assert.match(text,/never signs you out automatically/);
});
test('cancelled native export confirmation does not share or alter records', async()=>{
  fresh();const before=structuredClone(store.data);await render('./NativeRecordActions.tsx');
  await act(async()=>button('Export local records').props.onPress());
  await act(async()=>alerts.at(-1)[2][0].onPress?.());
  assert.equal(shareCalls.length,0);assert.deepEqual(store.data,before);
});
test('native share-sheet return and failure never claim a destination saved the file', async()=>{
  fresh();rn.Platform.OS='ios';await render('./NativeRecordActions.tsx');
  await act(async()=>button('Export local records').props.onPress());await act(async()=>alerts.at(-1)[2][1].onPress());
  assert.ok(tree.root.findAllByType('Text').some(node=>node.children.some(child=>typeof child==='string'&&child.includes('does not confirm that the destination saved it'))));
  shareHook=async()=>{throw Error('TEST_SHARE_FAILURE');};
  await act(async()=>button('Export local records').props.onPress());await act(async()=>alerts.at(-1)[2][1].onPress());
  assert.ok(tree.root.findAll(node=>node.type==='Text'&&node.props.accessibilityRole==='alert').length);
});
test('native export blocks duplicate shares and stays disabled while awaiting the OS', async()=>{
  fresh();let release;shareHook=()=>new Promise(resolve=>{release=resolve;});await render('./NativeRecordActions.tsx');
  await act(async()=>button('Export local records').props.onPress());
  await act(async()=>{alerts.at(-1)[2][1].onPress();alerts.at(-1)[2][1].onPress();});
  assert.equal(shareCalls.length,1);assert.equal(button('Export local records').props.disabled,true);
  await act(async()=>release());assert.equal(button('Export local records').props.disabled,false);
});
test('native record actions never invoke a browser downloader and block unsupported platforms or hydration', async()=>{
  fresh();store.loading=true;await render('./NativeRecordActions.tsx');
  await act(async()=>button('Export local records').props.onPress());assert.equal(alerts.length,0);assert.equal(shareCalls.length,0);
  store.loading=false;rn.Platform.OS='web';await act(async()=>tree.update(React.createElement(require('./NativeRecordActions.tsx').default)));
  assert.equal(button('Export local records').props.disabled,true);
  await act(async()=>button('Export local records').props.onPress());assert.equal(alerts.length,0);assert.equal(shareCalls.length,0);
});
test('longitudinal export shares only a short file URI while retaining complete multi-megabyte JSON',async()=>{
  fresh();store.data.rawCaptures=[{id:'TEST_LARGE_EXPORT',text:'记录'.repeat(400000)}];const before=structuredClone(store.data);
  await render('./NativeRecordActions.tsx');await act(async()=>button('Export local records').props.onPress());await act(async()=>alerts.at(-1)[2][1].onPress());
  assert.equal(shareCalls.length,1);const [uri,options]=shareCalls[0];assert.equal(typeof uri,'string');assert.ok(uri.length<200);
  assert.ok(Buffer.byteLength(exportFiles.get(uri).text)>2*1024*1024);assert.deepEqual(JSON.parse(exportFiles.get(uri).text),before);
  assert.equal(options.message,undefined);assert.deepEqual(store.data,before);
});
test('unavailable file sharing creates no temporary file and reports its platform limitation',async()=>{
  fresh();shareAvailable=false;await render('./NativeRecordActions.tsx');await act(async()=>button('Export local records').props.onPress());await act(async()=>alerts.at(-1)[2][1].onPress());
  assert.equal(exportFiles.size,0);assert.equal(shareCalls.length,0);assert.match(sheetText(),/Nothing was exported/);
});
test('failed JSON write removes only its partial temporary export and never invokes sharing',async()=>{
  fresh();exportWriteFailure=true;const before=structuredClone(store.data);await render('./NativeRecordActions.tsx');
  await act(async()=>button('Export local records').props.onPress());await act(async()=>alerts.at(-1)[2][1].onPress());
  assert.equal(exportFiles.size,0);assert.equal(exportDeletes.length,1);assert.equal(shareCalls.length,0);assert.deepEqual(store.data,before);
});
test('export prunes only old owned JSON cache files and retains the URI after sharing',async()=>{
  fresh();const dir='file:///TEST_CACHE/questlife-record-exports';const old=`${dir}/questlife-local-records-aaaaaaaa.json`;const recent=`${dir}/questlife-local-records-bbbbbbbb.json`;const unrelated=`${dir}/other.json`;
  exportFiles.set(old,{text:'TEST_OLD',modified:Date.now()-2*86400000});exportFiles.set(recent,{text:'TEST_RECENT',modified:Date.now()});exportFiles.set(unrelated,{text:'TEST_UNRELATED',modified:0});
  await render('./NativeRecordActions.tsx');await act(async()=>button('Export local records').props.onPress());await act(async()=>alerts.at(-1)[2][1].onPress());
  assert.deepEqual(exportDeletes,[old]);assert.ok(exportFiles.has(recent));assert.ok(exportFiles.has(unrelated));assert.ok(exportFiles.has(shareCalls[0][0]));
});
test('native recovery entry opens the existing Account and Sync surface without a data write',async()=>{
  fresh();let opened=0;const before=structuredClone(store.data);await render('./NativeRecordActions.tsx',{onOpenAccount:()=>{opened++;}});
  await act(async()=>button('Account & Sync').props.onPress());assert.equal(opened,1);assert.equal(shareCalls.length,0);assert.deepEqual(store.data,before);
});

const sheetText=()=>tree.root.findAllByType('Text').flatMap(node=>node.children.filter(child=>typeof child==='string')).join(' ');
const calendarSheetSetup=()=>{fresh();store.data.scheduleBlocks=[block];calendars=[{id:'WRITE',title:'TEST calendar',source:'test',writable:true}];};
const calendarMapping=()=>({id:'TEST_MAPPING',calendarId:'WRITE',linkedScheduleBlockId:block.id,active:true,record:{...initial,calendarId:'WRITE',externalEventId:'TEST_EVENT',ownership:'questlife',lastSyncedAt:'2026-09-20T02:00:00Z'}});
test('calendar sheet uses durable status and separates current app plan from confirmed device write',async()=>{
  calendarSheetSetup();calendarStatuses.WRITE={state:'synced',permission:'granted',mapping:calendarMapping()};
  await render('./NativeScheduleCalendarSheet.tsx',{blockId:block.id,onClose(){}});
  assert.match(sheetText(),/Current app plan/);assert.match(sheetText(),/2026-09-20 · 09:00 - 10:00/);
  assert.match(sheetText(),/Matches the last confirmed device-calendar write/);assert.match(sheetText(),/Last confirmed write/);
  assert.match(sheetText(),/does not confirm a device-calendar write/);assert.equal(button('Edit').props.disabled,true);
  assert.equal(calendarCalls.length,0);assert.equal(calendarRetries.length,0);
});
for(const state of ['pending','retry'])test(`calendar ${state} can retry only the explicit confirmed operation`,async()=>{
  calendarSheetSetup();calendarStatuses.WRITE={state,permission:'granted',operation:{id:'TEST_OP',kind:'update'},mapping:calendarMapping()};
  await render('./NativeScheduleCalendarSheet.tsx',{blockId:block.id,onClose(){}});
  assert.equal(calendarRetries.length,0);assert.doesNotMatch(sheetText(),/Last confirmed write:/);
  await act(async()=>button('Retry confirmed calendar operation').props.onPress());assert.equal(calendarRetries.length,0);
  await act(async()=>alerts.at(-1)[2][1].onPress());assert.deepEqual(calendarRetries,[['TEST_OP',{confirmed:true},block]]);assert.equal(calendarCalls.length,0);
});
for(const state of ['ambiguous','inactive'])test(`calendar ${state} never silently recreates the OS event`,async()=>{
  calendarSheetSetup();calendarStatuses.WRITE={state,permission:'granted',mapping:calendarMapping()};
  await render('./NativeScheduleCalendarSheet.tsx',{blockId:block.id,onClose(){}});
  assert.equal(button('Edit').props.disabled,true);await act(async()=>button('Edit').props.onPress());
  assert.equal(alerts.length,0);assert.equal(calendarCalls.length,0);assert.equal(calendarRetries.length,0);
  await act(async()=>button('Open').props.onPress());assert.equal(calendarOpens.length,1);assert.equal(calendarCalls.length,0);
});
test('received plan changes refresh calendar status without writing and invalidate open confirmation',async()=>{
  calendarSheetSetup();calendarStatuses.WRITE={state:'synced',permission:'granted',mapping:calendarMapping()};
  const props={blockId:block.id,onClose(){}};await render('./NativeScheduleCalendarSheet.tsx',props);
  store.data.scheduleBlocks=[{...block,title:'TEST remote update',startTime:'11:00',endTime:'12:00'}];calendarStatuses.WRITE={state:'needs_review',permission:'granted',mapping:calendarMapping()};
  await act(async()=>tree.update(React.createElement(require('./NativeScheduleCalendarSheet.tsx').default,props)));
  assert.match(sheetText(),/TEST remote update/);assert.match(sheetText(),/Review before confirming a write/);assert.equal(calendarCalls.length,0);
  await act(async()=>button('Edit').props.onPress());
  store.data.scheduleBlocks=[{...store.data.scheduleBlocks[0],title:'TEST newer remote update'}];
  await act(async()=>tree.update(React.createElement(require('./NativeScheduleCalendarSheet.tsx').default,props)));
  await act(async()=>alerts.at(-1)[2][1].onPress());assert.equal(calendarCalls.length,0);assert.match(sheetText(),/No calendar write was submitted/);
});
test('retry rechecks operation identity and surfaces failure instead of claiming convergence',async()=>{
  calendarSheetSetup();calendarStatuses.WRITE={state:'retry',permission:'granted',operation:{id:'TEST_OLD',kind:'update'}};
  await render('./NativeScheduleCalendarSheet.tsx',{blockId:block.id,onClose(){}});
  await act(async()=>button('Retry confirmed calendar operation').props.onPress());
  calendarStatuses.WRITE={state:'retry',permission:'granted',operation:{id:'TEST_NEW',kind:'update'}};
  await act(async()=>alerts.at(-1)[2][1].onPress());assert.equal(calendarRetries.length,0);
  assert.ok(tree.root.findAll(node=>node.type==='Text'&&node.props.accessibilityRole==='alert').length);
  failCalendar=true;await act(async()=>button('Retry confirmed calendar operation').props.onPress());await act(async()=>alerts.at(-1)[2][1].onPress());
  assert.equal(calendarRetries.length,1);assert.doesNotMatch(sheetText(),/Last confirmed write:/);
});
test('pending calendar deletion has its own destructive retry confirmation',async()=>{
  calendarSheetSetup();calendarStatuses.WRITE={state:'retry',permission:'granted',operation:{id:'TEST_DELETE',kind:'delete'},mapping:calendarMapping()};
  await render('./NativeScheduleCalendarSheet.tsx',{blockId:block.id,onClose(){}});
  await act(async()=>button('Retry confirmed calendar deletion').props.onPress());
  assert.equal(alerts.at(-1)[2][1].style,'destructive');assert.match(alerts.at(-1)[1],/does not delete the app plan or cloud records/);
  assert.equal(calendarRetries.length,0);await act(async()=>alerts.at(-1)[2][1].onPress());assert.equal(calendarRetries[0][0],'TEST_DELETE');
});
