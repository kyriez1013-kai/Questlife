// Isolated native hosts and service doubles. Never opens production storage or OS permission dialogs.
const assert = require('node:assert/strict');
const { test, afterEach } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const runtime = process.env.QUESTLIFE_UI_TEST_RUNTIME;
if (!runtime) throw Error('Set QUESTLIFE_UI_TEST_RUNTIME to an isolated React 19.1 test runtime');
const React = require(path.join(runtime, 'react'));
const { create, act } = require(path.join(runtime, 'react-test-renderer'));
global.IS_REACT_ACT_ENVIRONMENT = true;
const host = name => props => React.createElement(name, props, props.children);
let inputSequence=0;
const InputHost=props=>{const identity=React.useRef(++inputSequence);return React.createElement('QuestInput',{...props,instanceId:identity.current});};
const primitives={QuestGroupedSurface:host('QuestGroupedSurface'),QuestSectionHeader:host('QuestSectionHeader')};
let store, device, tree, calls, alerts, calendars, permission, notificationPermission, readFailure;
let identity, snapshot, syncStatus, otpJob, healthJob, writeJob, pickerJob, shareJob, pushJob, retirementStatus;
let settingsOpened, authConfigured = true;
const authListeners = new Set();
const rn = { Platform: { OS:'ios', select: values => values.ios ?? values.default },
  StyleSheet: { create: styles => styles, hairlineWidth:1 }, Appearance:{getColorScheme:()=> 'light'},
  Alert:{alert:(...args)=>alerts.push(args)}, Linking:{openSettings:async()=>{settingsOpened++;}},
  AppState:{addEventListener:()=>({remove(){}})},
};
for(const name of ['View','Text','TextInput','Pressable','ScrollView','Switch','ActivityIndicator','Modal']) rn[name]=name;
const engine = { get status(){return syncStatus;}, subscribe:()=>()=>{}, detach:()=>calls.push(['detach']),
  setHealthConsent:async value=>{calls.push(['healthConsent',value]);}, resolve:async(...args)=>calls.push(['resolve',...args]) };
const authService = { getUserId:async()=>identity?.userId??null, getSession:async()=>identity,
  subscribe:listener=>{authListeners.add(listener);return()=>authListeners.delete(listener);},
  requestOtp:async email=>{calls.push(['otp',email]);if(otpJob)await otpJob.promise;},
  verifyOtp:async(...args)=>calls.push(['verify',...args]), signOut:async()=>calls.push(['signOut']),
};
const services = {
  healthSync:{connect:async metrics=>{calls.push(['healthConnect',metrics]);if(healthJob)await healthJob.promise;},
    sync:async full=>calls.push(['healthSync',full]),disconnect:async()=>calls.push(['healthDisconnect'])},
  calendarSource:{permission:async()=>{if(readFailure)throw Error('TEST_READ_FAILED');return permission;},
    requestPermission:async()=>{calls.push(['calendarPermission']);return permission;},listCalendars:async()=>calendars,
    sync:async(...args)=>calls.push(['calendarSync',...args]),disconnect:async()=>calls.push(['calendarDisconnect']),
    open:async record=>calls.push(['calendarOpen',record]),delete:async(...args)=>calls.push(['calendarDelete',...args]),
    retryOperation:async(...args)=>calls.push(['calendarRetry',...args]),
    create:async(...args)=>calls.push(['calendarCreate',...args]),update:async(...args)=>calls.push(['calendarUpdate',...args]),
  },
  deviceRepository:{update:async fn=>{if(writeJob)await writeJob.promise;device.data=fn(device.data);calls.push(['deviceWrite',device.data]);return device.data;}},
  notifications:()=>({permission:async()=>notificationPermission,
    requestPermission:async()=>{calls.push(['notificationPermission']);return notificationPermission;},
    getPushToken:async()=>{if(pushJob)await pushJob.promise;return 'ExpoPushToken[TEST]';}}),
};
const originalLoad = Module._load;
Module._load = function(request,parent,isMain){
  if(request==='react')return React;
  if(request==='react/jsx-runtime')return require(path.join(runtime,'react/jsx-runtime'));
  if(request==='react-native')return rn;
  if(request==='react-native-safe-area-context')return {SafeAreaView:'SafeAreaView'};
  if(request==='react-native-svg')return new Proxy({}, {get:(_,key)=>key==='__esModule'?true:String(key)});
  if(request==='@react-navigation/native')return {useFocusEffect:callback=>React.useEffect(callback,[callback])};
  if(request==='expo-constants')return {expoConfig:{version:'TEST'},easConfig:{projectId:'TEST_PROJECT'}};
  if(request==='expo-document-picker')return {getDocumentAsync:async()=>pickerJob?pickerJob.promise:{canceled:true}};
  if(request==='expo-file-system')return {File:class{get size(){return 0;}async text(){return '{}';}}};
  if(/\/store$/.test(request))return {useStore:()=>store};
  if(/\/useQuestTheme$/.test(request))return {useQuestTheme:()=>require('../design/tokens.ts').getQuestTheme(store.data.settings.selectedThemeId)};
  if(/\/useDeviceData$/.test(request))return {useDeviceData:()=>device};
  if(/\/platform\/services$/.test(request))return services;
  if(/\/sync-v2\/supabase$/.test(request)||(request==='./supabase'&&parent?.filename.includes('/sync-v2/')))return {authService,authConfigured:()=>authConfigured,
    supabaseClient:()=>({from:()=>({select:()=>({eq:async()=>({data:[],error:null})})})})};
  if(/\/sync-v2\/runtime$/.test(request)||(request==='./runtime'&&parent?.filename.includes('/sync-v2/')))return {getSyncEngine:async()=>engine,readSyncState:async()=>snapshot,
    requestSync:(...args)=>calls.push(['requestSync',...args]),clearLocalReplica:async value=>calls.push(['clearLocal',value]),
    restoreRecordBackup:async value=>calls.push(['restore',value])};
  if(/\/sync-v2\/pushRegistry$/.test(request))return {
    registerNativePushToken:async(...args)=>calls.push(['pushRegister',...args]),
    syncDevicePushRegistration:async args=>{calls.push(['pushRetire',args]);return {status:retirementStatus};}};
  if(/\/nativeRecordExport$/.test(request))return {shareNativeRecordFile:async(...args)=>{calls.push(['share',...args]);if(shareJob)await shareJob.promise;return 'shared';}};
  if(/\/BottomSheetForm$/.test(request))return host('Sheet');
  if(/\/NativeDateTimeField$/.test(request))return host('DateTimeField');
  if(/\/NativeCalendarEditor$/.test(request))return host('CalendarEditor');
  if(/\/QuestInput$/.test(request))return InputHost;
  if(/\/QuestButton$/.test(request))return host('QuestButton');
  if(/\/QuestPrimitives$/.test(request))return primitives;
  return originalLoad.call(this,request,parent,isMain);
};
for(const ext of ['.ts','.tsx'])require.extensions[ext]=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,esModuleInterop:true},
}).outputText,file);
const Screen = require('./NativeSettingsScreen.tsx').default;
const Row = require('./NativeSettingsRow.tsx').default;
const Sheet = require('./NativeSettingsSheet.tsx').default;
const { DEFAULT_DATA } = require('../types.ts');
const { nativeCopy:c } = require('../platform/nativeI18n.ts');
const { syncCopy } = require('../sync-v2/copy.ts');
const { workflowCopy } = require('./nativeWorkflowCopy.ts');
const fresh = (language='en',theme='cleanFocus')=>{
  store={data:structuredClone(DEFAULT_DATA),loading:false,setSettings:patch=>Object.assign(store.data.settings,patch)};
  store.data.settings.language=language;store.data.settings.selectedThemeId=theme;
  device={error:false,data:{health:{permission:'not_requested',connected:false,imported:0,enabledMetrics:[]},
    calendar:{connected:false,events:[],selectedIds:[],pendingOperations:[]},notificationsEnabled:false,reminderKinds:{}}};
  calls=[];alerts=[];calendars=[];permission='not_requested';notificationPermission='not_requested';readFailure=false;
  identity=null;snapshot={ownerId:null,outbox:[],conflicts:[],healthConsent:false};syncStatus='signedOut';
  otpJob=healthJob=writeJob=pickerJob=shareJob=pushJob=undefined;retirementStatus='disabled';settingsOpened=0;authConfigured=true;
};
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const render=async()=>{await act(async()=>{tree=create(React.createElement(Screen,{navigation:{navigate:(...args)=>calls.push(['navigate',...args])}}));});};
const refresh=async()=>{await act(async()=>tree.update(React.createElement(Screen,{navigation:{navigate:(...args)=>calls.push(['navigate',...args])}})));};
const open=async key=>{
  if(key==='health'||key==='calendar'){
    if(!tree.root.findAllByType(Row).some(row=>row.props.label===c(store.data.settings.language,key)))await open('settingsSources');
  }
  await act(async()=>tree.root.findAllByType(Row).find(row=>row.props.label===c(store.data.settings.language,key)).props.onPress());
};
const close=async()=>act(async()=>tree.root.findByType('Sheet').props.onClose());
const button=label=>tree.root.findAll(node=>(node.type==='Pressable'&&node.props.accessibilityLabel===label)||(node.type==='QuestButton'&&node.props.label===label))[0];
const toggle=label=>tree.root.findAll(node=>node.type==='Switch'&&node.props.accessibilityLabel===label)[0];
const text=()=>tree.root.findAllByType('Text').map(node=>node.props.children).filter(value=>typeof value==='string').join('\n');
const press=async label=>act(async()=>button(label).props.onPress());
const switchValue=async(label,value)=>act(async()=>toggle(label).props.onValueChange(value));
const tab=async label=>act(async()=>tree.root.findAll(node=>node.type==='Pressable'&&node.props.accessibilityRole==='tab'&&node.props.accessibilityLabel===label)[0].props.onPress());
afterEach(async()=>{if(tree)await act(async()=>tree.unmount());tree=undefined;});

for(const lang of ['en','zh'])for(const theme of ['cleanFocus','deepWork'])test(`compact index, lazy details and token-sized wrapping rows (${lang}, ${theme})`,async()=>{
  fresh(lang,theme);await render();
  assert.equal(tree.root.findAllByType('Sheet').length,0);assert.equal(tree.root.findAllByType('Switch').length,0);
  assert.equal(tree.root.findAllByType('QuestInput').length,0);assert.equal(tree.root.findAllByType('CalendarEditor').length,0);
  const rows=tree.root.findAllByType(Row);assert.equal(rows.length,7);assert.equal(rows[0].props.label,c(lang,'appearanceLanguage'));
  for(const row of rows){const pressable=row.findByType('Pressable');const style=pressable.props.style({pressed:false});assert.ok(style.minHeight>=44);
    for(const label of row.findAllByType('Text'))assert.equal(label.props.numberOfLines,undefined);}
  assert.deepEqual(calls,[]);await open('appearanceLanguage');assert.equal(tree.root.findAllByType('Sheet').length,1);
  await close();assert.equal(tree.root.findAllByType('Sheet').length,0);
});
test('existing Insights destination lands on an explicit Sources entry without prompting or navigating',async()=>{
  fresh();await render();await open('settingsSources');assert.equal(tree.root.findAllByType('Switch').length,0);
  assert.deepEqual(calls,[]);await open('health');await press(c('en','settingsBackSources'));
  await open('calendar');assert.deepEqual(calls,[]);await close();assert.equal(tree.root.findAllByType('Sheet').length,0);
});
test('health metric selection is local until explicit connect and retains OS unknown access',async()=>{
  fresh();device.data.health.permission='read_access_unknown';await render();assert.ok(text().includes(c('en','read_access_unknown')));
  await open('health');assert.equal(tree.root.findAllByType('Switch').length,8);assert.deepEqual(calls,[]);
  await switchValue('Steps',false);await press('Connect');
  assert.equal(calls[0][0],'healthConnect');assert.equal(calls[0][1].includes('steps'),false);assert.equal(calls[1][0],'healthSync');
  assert.equal(calls.some(call=>call[0]==='healthConsent'),false);
});
test('health failure keeps details mounted during work and preserves selection for retry',async()=>{
  fresh();healthJob=deferred();await render();await open('health');await switchValue('Steps',false);await press('Connect');
  await close();assert.equal(tree.root.findAllByType('Sheet').length,1);
  await act(async()=>healthJob.reject(Error('TEST_DENIED')));assert.ok(text().includes(c('en','settingsActionError')));
  assert.equal(toggle('Steps').props.value,false);await close();assert.equal(tree.root.findAllByType('Sheet').length,0);
});
test('denied, unavailable, permission read failure and empty calendars are distinct',async()=>{
  fresh();permission='denied';notificationPermission='unavailable';await render();
  assert.ok(text().includes('Denied'));assert.ok(text().includes('Unavailable on this platform'));
  await open('calendar');await press('Permissions');assert.equal(settingsOpened,1);assert.equal(calls.length,0);
  await close();permission='granted';await open('calendar');await press('Connect');assert.ok(text().includes(c('en','noCalendars')));
  await close();readFailure=true;store.data.settings.language='zh';await refresh();assert.ok(text().includes(c('zh','settingsPermissionError')));
});
test('calendar events and pending retries are disclosed separately, with exact current block confirmation',async()=>{
  fresh();permission='granted';calendars=[{id:'C',title:'TEST calendar',source:'TEST source',writable:true}];
  const record={id:'E',calendarId:'C',title:'TEST external',ownership:'external',startAt:'2026-09-22T09:00:00Z',endAt:'2026-09-22T10:00:00Z',lastSyncedAt:'2026-09-22T00:00:00Z'};
  device.data.calendar.events=[record];device.data.calendar.pendingOperations=[{id:'OP',state:'failed',kind:'update',linkedScheduleBlockId:'B',expected:record}];
  store.data.scheduleBlocks=[{id:'B',title:'TEST current plan'}];await render();assert.equal(text().includes('TEST external'),false);
  await open('calendar');assert.equal(text().includes('TEST external'),false);await tab('Events (1)');assert.ok(text().includes('TEST external'));
  assert.equal(button('Edit'),undefined);assert.equal(button('Delete'),undefined);await press('Open');assert.deepEqual(calls.at(-1),['calendarOpen',record]);
  await tab('Pending (1)');await press(workflowCopy('en','calendarRetry'));assert.equal(calls.some(call=>call[0]==='calendarRetry'),false);
  await act(async()=>alerts.at(-1)[2][1].onPress());assert.deepEqual(calls.at(-1),['calendarRetry','OP',{confirmed:true},store.data.scheduleBlocks[0]]);
});
test('notification opt-in stays explicit and disable retains remote retirement handling',async()=>{
  fresh();notificationPermission='denied';await render();await open('notifications');assert.deepEqual(calls,[]);
  await switchValue('Enable local reminders',true);assert.equal(calls.filter(call=>call[0]==='deviceWrite').length,0);
  notificationPermission='granted';await switchValue('Enable local reminders',true);assert.equal(device.data.notificationsEnabled,true);
  retirementStatus='error';await switchValue('Enable local reminders',false);assert.equal(device.data.notificationsEnabled,false);
  assert.equal(calls.at(-1)[0],'pushRetire');assert.ok(text().includes(c('en','settingsActionError')));
});
test('quiet-hour save and push registration cannot be dismissed while pending',async()=>{
  fresh();identity={userId:'TEST_OWNER'};device.data.notificationsEnabled=true;notificationPermission='granted';writeJob=deferred();await render();await open('notifications');
  await switchValue(workflowCopy('en','quietHours'),true);await close();assert.equal(tree.root.findAllByType('Sheet').length,1);
  await act(async()=>writeJob.resolve());assert.deepEqual(device.data.notificationQuietHours,{startMinute:1320,endMinute:420});
  pushJob=deferred();await press(workflowCopy('en','pushRequest'));await close();assert.equal(tree.root.findAllByType('Sheet').length,1);
  await act(async()=>pushJob.resolve());assert.equal(calls.at(-1)[0],'pushRegister');await close();assert.equal(tree.root.findAllByType('Sheet').length,0);
});
test('account email survives parent rerender and cannot be lost during pending OTP',async()=>{
  fresh();otpJob=deferred();await render();await open('account');const input=tree.root.findByType('QuestInput');const inputId=input.props.instanceId;
  await act(async()=>input.props.onChangeText('test@example.invalid'));await refresh();assert.equal(tree.root.findByType('QuestInput').props.instanceId,inputId);
  store.data.settings.selectedThemeId='deepWork';store.data.settings.language='zh';await refresh();
  assert.equal(tree.root.findByType('QuestInput').props.instanceId,inputId);
  store.data.settings.language='en';await refresh();
  assert.equal(tree.root.findByType('QuestInput').props.value,'test@example.invalid');await press(syncCopy('en','request'));await close();assert.equal(tree.root.findAllByType('Sheet').length,1);
  await act(async()=>otpJob.resolve());assert.equal(tree.root.findAllByType('QuestInput').length,2);assert.ok(text().includes(syncCopy('en','sent')));
  await close();assert.equal(tree.root.findAllByType('QuestInput').length,0);
});
test('offline account is not an OS denial; health cloud consent and sign-out handlers remain separate',async()=>{
  fresh();identity={userId:'TEST_OWNER',email:'test@example.invalid'};snapshot.ownerId='TEST_OWNER';syncStatus='offline';await render();await open('account');
  assert.ok(text().includes(syncCopy('en','offline')));assert.equal(toggle(syncCopy('en','health')).props.value,false);
  await switchValue(syncCopy('en','health'),true);assert.deepEqual(calls.slice(-2),[['healthConsent',true],['requestSync']]);
  await press(syncCopy('en','signOut'));assert.deepEqual(calls.slice(-2),[['detach'],['signOut']]);
});
test('unconfigured account remains local-only, without showing a pretend integration',async()=>{
  fresh();authConfigured=false;await render();await open('account');assert.ok(text().includes(syncCopy('en','unconfigured')));
  assert.equal(tree.root.findAllByType('QuestInput').length,0);assert.deepEqual(calls,[]);
});
test('calendar editor is nested in the source sheet, preserves the exact write and blocks parent dismissal',async()=>{
  fresh();permission='granted';calendars=[{id:'C',title:'TEST calendar',source:'TEST source',writable:true}];await render();await open('calendar');
  await press('Create calendar event · TEST calendar');const editor=tree.root.findByType('CalendarEditor');
  assert.equal(tree.root.findByType('Sheet').findAllByType('CalendarEditor').length,1);await close();assert.equal(tree.root.findAllByType('Sheet').length,1);
  const draft={title:'TEST event',startAt:'2026-09-22T09:00:00Z',endAt:'2026-09-22T10:00:00Z'};
  await act(async()=>editor.props.onSave(draft));assert.deepEqual(calls.at(-1),['calendarCreate','C',draft,{confirmed:true}]);
  await act(async()=>editor.props.onClose());await close();assert.equal(tree.root.findAllByType('Sheet').length,0);
});
test('appearance and language keep their existing settings actions without a navigation detour',async()=>{
  fresh();await render();await open('appearanceLanguage');const {t}=require('../i18n.ts');
  const {themeOptions}=require('../design/tokens.ts');await tab(t('en',themeOptions[1].i18nKey));assert.equal(store.data.settings.selectedThemeId,themeOptions[1].id);
  await tab(t('en','languageChinese'));assert.equal(store.data.settings.language,'zh');assert.deepEqual(calls,[]);
});
test('record sharing and backup picker keep the sheet alive until completion',async()=>{
  fresh();await render();await open('settingsRecords');shareJob=deferred();
  const {t}=require('../i18n.ts');await press(t('en','exportLocalRecords'));assert.equal(calls.length,0);
  await act(async()=>alerts.at(-1)[2][1].onPress());await close();assert.equal(tree.root.findAllByType('Sheet').length,1);
  await act(async()=>shareJob.resolve());pickerJob=deferred();await press('Choose backup to restore');await close();assert.equal(tree.root.findAllByType('Sheet').length,1);
  await act(async()=>pickerJob.resolve({canceled:true}));assert.equal(calls.some(call=>call[0]==='restore'),false);
  await close();assert.equal(tree.root.findAllByType('Sheet').length,0);
});
test('record recovery reuses the existing account component',async()=>{
  fresh();await render();await open('settingsRecords');await press(syncCopy('en','account'));
  assert.equal(tree.root.findAllByType(require('../sync-v2/AccountSyncSection.tsx').default).length,1);
  assert.equal(tree.root.findAllByType(require('../backup/RecordBackupActions.tsx').default).length,0);
});
test('Insights import keeps both close and account navigation blocked while the file picker owns a request',async()=>{
  fresh(); pickerJob=deferred(); let closed=0, navigated=0;
  const {InsightSheet,InsightButton}=require('./insights/InsightsControls.tsx');
  const Backup=require('../backup/RecordBackupActions.tsx').default;
  const q=require('../design/tokens.ts').getQuestTheme('cleanFocus');
  await act(async()=>{tree=create(React.createElement(InsightSheet,{q,title:'TEST import',closeLabel:'Close',onClose:()=>closed++},
    React.createElement(InsightButton,{q,label:'Account',onPress:()=>navigated++}), React.createElement(Backup)));});
  await press('Choose backup to restore');
  await act(async()=>{tree.root.findByType('Modal').props.onRequestClose();tree.root.findAllByType('Pressable').find(row=>row.props.accessibilityLabel==='Account').props.onPress();});
  assert.equal(closed,0);assert.equal(navigated,0);
  assert.equal(tree.root.findAllByType('Pressable').find(row=>row.props.accessibilityLabel==='Close').props.disabled,true);
  await act(async()=>pickerJob.resolve({canceled:true}));
  await act(async()=>tree.root.findByType('Modal').props.onRequestClose());assert.equal(closed,1);
});
