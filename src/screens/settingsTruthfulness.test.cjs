// Isolated screen/DOM harness. No real storage, sessions, network, or user records.
const assert = require('node:assert/strict');
const { test, afterEach } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const runtime = process.env.QUESTLIFE_UI_TEST_RUNTIME;
if (!runtime) throw Error('Set QUESTLIFE_UI_TEST_RUNTIME to the isolated node_modules directory');
const React = require(path.join(runtime, 'react'));
const { create, act } = require(path.join(runtime, 'react-test-renderer'));
global.IS_REACT_ACT_ENVIRONMENT = true;
global.__DEV__ = false;
const rn = { Platform:{OS:'web'}, Appearance:{getColorScheme:()=> 'light'}, StyleSheet:{create:value=>value}, Linking:{}, Alert:{} };
for (const name of ['View','Text','ScrollView','TouchableOpacity']) rn[name]=name;
const constants = {expoConfig:{version:'TEST_BUILD_1.2.3'}};
let store;
const component = name => props => React.createElement(name, props, props.children, props.trailing);
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === 'react') return React;
  if (request === 'react/jsx-runtime') return require(path.join(runtime,'react/jsx-runtime'));
  if (request === 'react-native') return rn;
  if (request === 'react-native-safe-area-context') return {SafeAreaView:'SafeAreaView'};
  if (request === '@react-navigation/native') return {useFocusEffect:React.useEffect};
  if (request === 'expo-constants') return constants;
  if (/\/store$/.test(request)) return {useStore:()=>store};
  if (/\/useQuestTheme$/.test(request)) return {useQuestTheme:()=>require('../design/tokens.ts').getQuestTheme('cleanFocus')};
  if (/\/AccountSyncSection$/.test(request)) return component('AccountSyncSection');
  if (/\/analytics$/.test(request)) return {trackEvent(){}};
  if (/\/storage$/.test(request)) return {today:()=> '2026-09-20',uid:()=> 'TEST_ID'};
  if (/\/decisionService$/.test(request)) return {isDecisionAIEnabled:()=>false,isDecisionAIShadowEnabled:()=>false,isDecisionDailyBriefEnabled:()=>false};
  if (/\/featureFlag$/.test(request)) return {getV11ProductLanguage:value=>value,getV11ProductThemeId:value=>value,isV11PersonalTerminalEnabled:()=>false};
  if (/\/QuestPrimitives$/.test(request)) return {QuestCompactRow:component('QuestCompactRow'),QuestGroupedSurface:component('QuestGroupedSurface'),QuestSectionHeader:component('QuestSectionHeader')};
  if (/\/Quest(Input|Button|Pill|SegmentedControl)$/.test(request)) return component(request.split('/').at(-1));
  return originalLoad.call(this,request,parent,isMain);
};
for (const extension of ['.ts','.tsx']) require.extensions[extension]=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,filename);
const { DEFAULT_DATA } = require('../types.ts');
const { t } = require('../i18n.ts');
const Settings = require('./SettingsScreen.tsx').default;
let tree;
let allowDownload;
let downloads;
let prompts;
const originalCreate = URL.createObjectURL;
const originalRevoke = URL.revokeObjectURL;
const originalWindow = global.window;
const originalDocument = global.document;
const setup = () => {
  store={data:structuredClone(DEFAULT_DATA),loading:false};store.data.settings.language='en';
  store.data.rawCaptures=[];store.data.executionLogs=[];store.data.contextLogs=[];
  rn.Platform.OS='web';constants.expoConfig.version='TEST_BUILD_1.2.3';allowDownload=false;downloads=[];prompts=[];
  URL.createObjectURL=blob=>{downloads.push({blob});return 'blob:TEST_ONLY';};URL.revokeObjectURL=()=>{};
  global.window={location:{search:''},localStorage:{getItem:()=>null},confirm:message=>{prompts.push(message);return allowDownload;},setTimeout:fn=>fn()};
  global.document={createElement:tag=>{assert.equal(tag,'a');return {click(){Object.assign(downloads.at(-1),{filename:this.download,href:this.href,clicked:true});}};}};
};
const render = async () => { await act(async()=>{tree=create(React.createElement(Settings));}); };
const row = key => tree.root.findAll(node=>node.type==='QuestCompactRow'&&node.props.title===t(store.data.settings.language,key))[0];
const exportButton = () => tree.root.findAll(node=>node.type==='QuestButton'&&node.props.label===t(store.data.settings.language,'exportLocalRecords'))[0];
const visibleText = () => tree.root.findAllByType('Text').map(node=>node.children.filter(child=>typeof child==='string').join('')).join('\n');
afterEach(async()=>{
  if(tree) await act(async()=>tree.unmount());tree=undefined;
  URL.createObjectURL=originalCreate;URL.revokeObjectURL=originalRevoke;
  global.window=originalWindow;global.document=originalDocument;
});

for (const lang of ['en','zh']) test(`Settings ${lang} shows build version and truthful browser/account/source boundaries`,async()=>{
  setup();store.data.settings.language=lang;await render();
  assert.equal(row('version').props.body,'QuestLife TEST_BUILD_1.2.3');
  assert.equal(row('storage').props.body,t(lang,'storageText'));
  assert.doesNotMatch(row('storage').props.body,/anonymous|匿名/);
  assert.match(row('healthDataSource').props.body,/Web/);
  assert.match(row('calendarDataSource').props.body,/Web/);
  assert.equal(row('calendarDataSource').props.trailing.props.label,t(lang,'sourceUnavailable'));
  assert.equal(row('recordRecovery').props.body,t(lang,'recordRecoveryLimit'));
  assert.equal(tree.root.findAllByType('AccountSyncSection').length,1);
});
test('missing build version is reported as unavailable rather than v0.2',async()=>{
  setup();delete constants.expoConfig.version;await render();
  assert.equal(row('version').props.body,t('en','versionText'));assert.doesNotMatch(row('version').props.body,/v0\.2/);
});
test('cancelled local export does not read storage, download or change records',async()=>{
  setup();await render();const before=structuredClone(store.data);
  await act(async()=>exportButton().props.onPress());
  assert.equal(prompts.length,1);assert.match(prompts[0],/unencrypted/);assert.equal(downloads.length,0);assert.deepEqual(store.data,before);
});
test('confirmed export uses the existing downloader and contains exactly current app records',async()=>{
  setup();allowDownload=true;store.data.categories=[{id:'TEST_EXPORT',name:'TEST record',createdAt:1}];await render();const before=structuredClone(store.data);
  await act(async()=>exportButton().props.onPress());
  assert.equal(downloads.length,1);assert.equal(downloads[0].clicked,true);assert.match(downloads[0].filename,/^questlife-local-records-.*\.json$/);
  assert.deepEqual(JSON.parse(await downloads[0].blob.text()),before);assert.deepEqual(store.data,before);
  assert.ok(visibleText().includes('Browser download requested'));
  assert.equal(visibleText().includes('Snapshot downloaded'),false);
});
test('unavailable or failing download reports failure without claiming success',async()=>{
  setup();allowDownload=true;await render();global.document=undefined;
  await act(async()=>exportButton().props.onPress());
  assert.ok(visibleText().includes('Download could not start'));
  assert.equal(downloads.length,0);
  global.document={createElement(){throw Error('TEST_DOM_FAILURE');}};
  await act(async()=>exportButton().props.onPress());
  assert.ok(visibleText().includes('Download could not start'));
  assert.equal(visibleText().includes('Browser download requested'),false);
});
test('export cannot run during hydration',async()=>{
  setup();allowDownload=true;store.loading=true;await render();
  assert.equal(exportButton().props.disabled,true);await act(async()=>exportButton().props.onPress());
  assert.equal(downloads.length,0);assert.equal(prompts.length,0);
});
test('native Preferences does not expose a browser download or mislabel native sources unavailable',async()=>{
  setup();rn.Platform.OS='ios';await render();
  assert.equal(exportButton(),undefined);assert.equal(row('healthDataSource').props.body,t('en','nativeSourceStatus'));
  assert.equal(row('calendarDataSource').props.trailing,undefined);
});
