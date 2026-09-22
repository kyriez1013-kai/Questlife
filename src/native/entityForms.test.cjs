// Component tests use mocked native hosts and an in-memory Store, never user data.
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
let store, writes, closed, alerts, tree, wait, retry, navigations, intents, confirmation;
const host = name => props => React.createElement(name, props, props.children);
const rn = { Platform: { OS: 'android' }, Appearance: { getColorScheme: () => 'light' }, StyleSheet: { create: value => value, hairlineWidth: 0.5 }, Keyboard: { dismiss() {} }, Alert: { alert: value => alerts.push(value) } };
rn.FlatList = props => React.createElement('FlatList', props, props.ListHeaderComponent,
  props.data.length ? props.data.map((item, index) => React.createElement(React.Fragment, { key: props.keyExtractor(item) }, props.renderItem({ item, index }))) : props.ListEmptyComponent);
for (const name of ['View', 'Text', 'TextInput', 'TouchableOpacity', 'Switch', 'Pressable', 'ScrollView']) rn[name] = name;
const original = Module._load;
Module._load = function(request, parent, main) {
  if (request === 'react') return React;
  if (request === 'react/jsx-runtime') return require(path.join(runtime, 'react/jsx-runtime'));
  if (request === 'react-native') return rn;
  if (request === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView' };
  if (request === '@react-navigation/native') return { useRoute: () => ({ params: { categoryId: 'TEST_GOAL', skillId: 'TEST_SKILL' } }), useNavigation: () => ({ goBack() {}, navigate: (...args) => navigations.push(args) }) };
  if (request === 'react-native-svg') return { __esModule: true, default: 'Svg', Polyline: 'Polyline', Circle: 'Circle', Line: 'Line', Text: 'SvgText' };
  if (/\/intentBus$/.test(request)) return { deliverNotificationIntent: value => intents.push(value) };
  if (/\/storage$/.test(request)) return { uid: () => 'TEST_CRITERION', today: () => '2026-09-22' };
  if (/\/store$/.test(request)) return { useStore: () => store };
  if (/\/useQuestTheme$/.test(request)) return { useQuestTheme: () => require('../design/tokens.ts').getQuestTheme(store.data.settings.selectedThemeId) };
  if (/\/featureFlag$/.test(request)) return { getV11ProductLanguage: x => x, getV11ProductThemeId: x => x, isV11ProductEnabled: () => true };
  if (/\/(AccountSyncSection|RecordBackupActions)$/.test(request)) return host(request.split('/').at(-1));
  if (/\/NativeControls$/.test(request)) return { useNativeTheme: () => ({ type: { secondary: {} }, text: { secondary: '#626262' } }) };
  if (/\/analytics$/.test(request)) return { trackEvent() {} };
  if (/\/confirm$/.test(request)) return { confirmAction: value => { confirmation=value; } };
  if (/\/BottomSheetForm$/.test(request)) return props => props.visible ? React.createElement('Sheet', props, props.children, React.createElement('Footer', {}, props.footer)) : null;
  if (/\/QuestPrimitives$/.test(request)) return { QuestGroupedSurface: host('QuestGroupedSurface'), QuestContextBar: host('QuestContextBar') };
  if (/\/(QuestButton|QuestPill|QuestInput|QuestIcon|QuestCard|QuestProgressBar|QuestEntityIcon|V11RebaselineIcon|EmojiPicker|ColorPicker|TimePickerInput)$/.test(request)) return host(request.split('/').at(-1));
  return original.call(this, request, parent, main);
};
for (const extension of ['.ts', '.tsx']) require.extensions[extension] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText, file);
const { DEFAULT_DATA } = require('../types.ts');
const { t } = require('../i18n.ts');
const fresh = (lang = 'en', theme = 'cleanFocus') => {
  writes=[]; closed=0; alerts=[]; navigations=[]; intents=[]; confirmation=undefined; wait=async()=>{}; retry=async()=>{}; rn.Platform.OS='android';
  store={data:structuredClone(DEFAULT_DATA),waitForLocalWrites:()=>wait(),retryLocalWrites:()=>retry()};
  store.data.settings.language=lang;store.data.settings.selectedThemeId=theme;
  for (const name of ['addCategory','updateCategory','applyDomainTemplateToGoal','addSkill','updateSkill','deleteSkillFromLibrary','createSkillAndAttachToModule','addModule','updateModule','deleteModule','addExistingSkillToModule','removeSkillFromModule']) store[name]=(...args)=>{writes.push({name,args});return {id:'TEST_ENTITY'};};
};
const render=async(file,props={})=>{await act(async()=>{tree=create(React.createElement(require(file).default,{visible:true,onClose:()=>closed++,...props}));});};
const button=label=>tree.root.findAll(node=>node.type==='QuestButton'&&node.props.label===label)[0];
const input=label=>tree.root.findAll(node=>node.type==='QuestInput'&&node.props.accessibilityLabel===label)[0];
const disclose=async(label)=>act(async()=>tree.root.findAll(node=>node.type==='Pressable'&&node.props.accessibilityLabel===label)[0].props.onPress());
afterEach(async()=>{if(tree)await act(async()=>tree.unmount());tree=undefined;});

for (const lang of ['zh','en']) for (const theme of ['cleanFocus','deepWork']) test(`goal pinned footer and optional disclosure ${lang}/${theme}`,async()=>{
  fresh(lang,theme);await render('../components/GoalForm.tsx');
  assert.equal(tree.root.findByType('Footer').findAllByType('QuestButton').length,2);
  assert.equal(tree.root.findAllByType('EmojiPicker').length,0);
  await disclose(t(lang,'advancedSettings'));
  assert.ok(input(t(lang,'targetDate')));
  await act(async()=>input(t(lang,'name')).props.onChangeText('TEST goal'));
  await act(async()=>button(t(lang,'create')).props.onPress());
  assert.equal(writes[0].args[0].name,'TEST goal');assert.equal(closed,1);
});

test('goal stays open until durable local receipt; repeated submit cannot duplicate',async()=>{
  fresh();let resolve;wait=()=>new Promise(r=>{resolve=r;});await render('../components/GoalForm.tsx');
  await act(async()=>input('Name').props.onChangeText('TEST goal'));
  await act(async()=>{button('Create').props.onPress();button('Create').props.onPress();});
  assert.equal(writes.length,1);assert.equal(closed,0);assert.equal(button('Create').props.loading,true);
  await act(async()=>resolve());assert.equal(closed,1);
});

test('goal failed ACK retries original queued mutation without creating a second entity',async()=>{
  fresh();wait=async()=>{throw Error('disk');};let retried=0;retry=async()=>{retried++;};await render('../components/GoalForm.tsx');
  await act(async()=>input('Name').props.onChangeText('TEST goal'));
  await act(async()=>button('Create').props.onPress());assert.equal(closed,0);
  assert.ok(tree.root.findAll(node=>node.props.accessibilityRole==='alert').length);
  await act(async()=>button('Retry save').props.onPress());assert.equal(retried,1);assert.equal(writes.length,1);assert.equal(closed,1);
});

test('skill draft survives unrelated goal updates and optional disclosure toggling',async()=>{
  fresh();await render('../components/SkillForm.tsx');await act(async()=>input('Name').props.onChangeText('TEST skill draft'));
  store.data={...store.data,categories:[{id:'TEST_GOAL',name:'TEST goal',createdAt:1}]};
  await act(async()=>tree.update(React.createElement(require('../components/SkillForm.tsx').default,{visible:true,onClose:()=>closed++})));
  assert.equal(input('Name').props.value,'TEST skill draft');
  await disclose(t('en','progressType'));await disclose(t('en','progressType'));
  assert.equal(input('Name').props.value,'TEST skill draft');
});

test('removing the final goal clears parent and module; failure retry preserves exact skill payload',async()=>{
  fresh();store.data.categories=[{id:'TEST_GOAL',name:'TEST goal',createdAt:1}];store.data.modules=[{id:'TEST_MODULE',goalId:'TEST_GOAL',name:'TEST module'}];
  await render('../components/SkillForm.tsx',{presetCategoryId:'TEST_GOAL',presetModuleId:'TEST_MODULE',linkOnCreate:true});
  await act(async()=>input('Name').props.onChangeText('TEST skill'));
  await disclose(t('en','linkedGoals'));
  await act(async()=>tree.root.findAll(node=>node.type==='QuestPill'&&node.props.label==='TEST goal')[0].props.onPress());
  wait=async()=>{throw Error('disk');};await act(async()=>button('Create').props.onPress());
  assert.equal(writes[0].name,'addSkill');assert.equal(writes[0].args[0].categoryId,undefined);assert.equal(writes[0].args[0].moduleId,undefined);
  assert.equal(writes[0].args[0].dailyTargetMinutes,30);
  await act(async()=>button('Retry save').props.onPress());assert.equal(writes.length,1);assert.equal(closed,1);
});

test('invalid skill target remains open without writes',async()=>{
  fresh();await render('../components/SkillForm.tsx');await act(async()=>input('Name').props.onChangeText('TEST skill'));
  await act(async()=>input(t('en','dailyTarget')).props.onChangeText('0'));
  await act(async()=>button('Create').props.onPress());assert.equal(writes.length,0);assert.equal(closed,0);assert.ok(alerts.length);
});

test('web keeps expanded fields and one set of actions',async()=>{
  fresh();rn.Platform.OS='web';await render('../components/GoalForm.tsx');
  assert.ok(input(t('en','targetDate')));assert.equal(tree.root.findByType('Footer').findAllByType('QuestButton').length,0);
  assert.equal(tree.root.findAll(node=>node.type==='QuestButton'&&node.props.label==='Create').length,1);
});

const goalDetail=async()=>{
  store.data.categories=[{id:'TEST_GOAL',name:'TEST goal',createdAt:1,goalType:'custom',progressModel:'criteria_weighted',outcomeCriteria:[]}];
  await render('../screens/GoalDetailScreen.tsx');
};
test('empty native Goal Detail is unframed and has no invented progress bar or percentage',async()=>{
  fresh();await goalDetail();
  assert.equal(tree.root.findAllByType('QuestProgressBar').length,0);
  assert.equal(tree.root.findAllByType('Text').some(node=>node.children.filter(value=>typeof value==='string'||typeof value==='number').join('').includes('0%')),false);
  const summary=tree.root.findAll(node=>node.type==='QuestGroupedSurface'&&node.props.className==='v11-goal-summary')[0];
  assert.equal(summary.props.style.at(-1).borderWidth,0);
  await act(async()=>button(t('en','addModule')).props.onPress());
  assert.equal(tree.root.findByType('Footer').findAllByType('QuestButton').length,2);
  assert.ok(input(t('en','moduleName')));
});
for (const platform of ['android','web']) for (const lang of ['zh','en']) test(`untracked module does not imply zero progress ${platform}/${lang}`,async()=>{
  fresh(lang);rn.Platform.OS=platform;
  store.data.modules=[{id:'TEST_MODULE',goalId:'TEST_GOAL',name:'TEST module'}];
  store.data.skills=[{id:'TEST_SKILL',name:'TEST skill',totalXP:0,dailyTargetMinutes:30,progressType:'none'}];
  store.data.moduleSkillLinks=[{id:'TEST_LINK',goalId:'TEST_GOAL',moduleId:'TEST_MODULE',skillId:'TEST_SKILL'}];
  await goalDetail();
  const text=()=>tree.root.findAllByType('Text').map(node=>node.children.filter(v=>typeof v==='string'||typeof v==='number').join('')).join('\n');
  const moduleGroup=()=>tree.root.findAll(node=>node.type==='QuestGroupedSurface'&&node.props.className==='v11-module-group')[0];
  const before=JSON.stringify(store.data);
  assert.equal(moduleGroup().findAllByType('QuestProgressBar').length,0);
  assert.ok(!text().includes('0%'));
  const label=require('../i18n.ts').progressTypeLabel(lang,'none');
  assert.ok(!text().includes(`${label} · ${label}`));
  assert.equal(JSON.stringify(store.data),before);assert.equal(writes.length,0);
  for (const progressType of ['qualitative','time_based','quality_score','state_based','performance_log']) {
    store.data.skills=[{...store.data.skills[0],progressType}];
    await act(async()=>tree.update(React.createElement(require('../screens/GoalDetailScreen.tsx').default)));
    assert.equal(moduleGroup().findAllByType('QuestProgressBar').length,0,progressType);
    assert.ok(!text().includes('0%'),progressType);
  }
  store.data.skills=[{...store.data.skills[0],progressType:'time_based',targetHours:10,completedHours:2.5}];
  await act(async()=>tree.update(React.createElement(require('../screens/GoalDetailScreen.tsx').default)));
  assert.equal(moduleGroup().findByType('QuestProgressBar').props.value,25);
  assert.ok(text().includes('25%'));assert.equal(writes.length,0);
});
test('module save retains draft and Sheet on failed ACK; retry does not create a second module',async()=>{
  fresh();await goalDetail();await act(async()=>button(t('en','addModule')).props.onPress());
  await act(async()=>input(t('en','moduleName')).props.onChangeText('TEST module'));
  wait=async()=>{throw Error('disk');};await act(async()=>button(t('en','save')).props.onPress());
  assert.equal(writes.length,1);assert.equal(writes[0].name,'addModule');assert.equal(writes[0].args[0].name,'TEST module');
  await act(async()=>tree.root.findByType('Sheet').props.onClose());assert.equal(tree.root.findAllByType('Sheet').length,1);
  let retried=0;retry=async()=>{retried++;};await act(async()=>button('Retry save').props.onPress());
  assert.equal(writes.length,1);assert.equal(retried,1);assert.equal(tree.root.findAllByType('Sheet').length,0);
});
test('criterion rejects invalid numbers and preserves its identity across failed save retry',async()=>{
  fresh();await goalDetail();await act(async()=>button(t('en','addCriterion')).props.onPress());
  await act(async()=>input(t('en','criterionTitle')).props.onChangeText('TEST criterion'));
  const current=()=>tree.root.findAll(node=>node.type==='QuestInput'&&node.props.placeholder==='0')[0];
  await act(async()=>current().props.onChangeText('not a number'));await act(async()=>button(t('en','save')).props.onPress());
  assert.equal(writes.length,0);assert.ok(alerts.length);
  await act(async()=>current().props.onChangeText('2'));wait=async()=>{throw Error('disk');};
  await act(async()=>button(t('en','save')).props.onPress());assert.equal(writes.length,1);
  const saved=writes[0].args[1].outcomeCriteria[0];assert.equal(saved.currentValue,2);
  await act(async()=>button('Retry save').props.onPress());assert.equal(writes.length,1);assert.equal(saved.id,'TEST_CRITERION');
  assert.equal(tree.root.findAllByType('Sheet').length,0);
});

const skillDetail=async(logCount=0)=>{
  store.data.skills=[{id:'TEST_SKILL',name:'TEST skill',color:'#1e6b86',dailyTargetMinutes:30,createdAt:1}];
  store.data.executionLogs=Array.from({length:logCount},(_,i)=>({id:`TEST_LOG_${i}`,linkedSkillId:'TEST_SKILL',date:'2026-09-22',createdAt:`2026-09-22T0${i}:00:00Z`,durationMinutes:10+i,note:`note-${i}`}));
  await render('../screens/SkillDetailScreen.tsx');
};
for (const lang of ['zh','en']) for (const theme of ['cleanFocus','deepWork']) test(`native Skill opens the existing Direct Log without writes ${lang}/${theme}`,async()=>{
  fresh(lang,theme);await skillDetail();
  assert.equal(tree.root.findAllByType('QuestCard').length,0);
  assert.equal(tree.root.findAllByType('Svg').length,0);
  await act(async()=>button(t(lang,'logProgressTodayAction')).props.onPress());
  assert.deepEqual(navigations,[['Today']]);
  assert.equal(intents.length,1);assert.equal(intents[0].kind,'skill_reminder');
  assert.equal(intents[0].entityId,'TEST_SKILL');assert.equal(intents[0].action,'OPEN');assert.equal(writes.length,0);
  await disclose(t(lang,'skillProgressDetails'));
  assert.equal(tree.root.findAllByType('Svg').length,0);
});
test('native Skill previews three actual logs and retains History and full configuration entrances',async()=>{
  fresh();await skillDetail(5);
  const texts=()=>tree.root.findAllByType('Text').map(node=>node.children.filter(v=>typeof v==='string').join(''));
  assert.equal(texts().filter(value=>/^note-/.test(value)).length,3);
  assert.ok(texts().includes('note-4'));assert.ok(!texts().includes('note-0'));
  await act(async()=>button(t('en','activityHistory')).props.onPress());
  assert.equal(intents[0].kind,'end_of_day');assert.equal(writes.length,0);
  await disclose(t('en','skillProgressDetails'));
  assert.ok(texts().includes(t('en','executionRules')));
  assert.equal(tree.root.findByType('Svg').props.width,'100%');
  await disclose(t('en','dangerZone'));assert.ok(button(t('en','deleteSkillPermanently')));
});
test('Skill chart changes theme and never emits non-finite geometry for recorded zero durations',async()=>{
  fresh('en','deepWork');await skillDetail();
  store.data.actions=[{id:'TEST_A',skillIds:['TEST_SKILL'],date:'2026-09-21',minutes:0,createdAt:1},{id:'TEST_B',skillIds:['TEST_SKILL'],date:'2026-09-22',minutes:0,createdAt:2}];
  await act(async()=>tree.update(React.createElement(require('../screens/SkillDetailScreen.tsx').default)));
  await disclose(t('en','skillProgressDetails'));
  await act(async()=>tree.root.findAll(node=>node.type==='TouchableOpacity'&&node.props.accessibilityRole==='tab').at(-1).props.onPress());
  assert.ok(!/NaN|Infinity/.test(tree.root.findByType('Polyline').props.points));
  assert.equal(tree.root.findByType('Svg').props.width,'100%');
  const q=require('../design/tokens.ts').getQuestTheme('deepWork');
  assert.ok(tree.root.findAllByType('SvgText').every(node=>node.props.fill===q.colors.textMuted));
});

for(const lang of ['zh','en']) test(`first launch opens existing account recovery without creating a goal ${lang}`,async()=>{
  fresh(lang);await render('../screens/OnboardingScreen.tsx');
  assert.equal(tree.root.findAllByType('AccountSyncSection').length,0);
  const {syncCopy}=require('../sync-v2/copy.ts');
  await act(async()=>button(syncCopy(lang,'account')).props.onPress());
  assert.equal(tree.root.findAllByType('AccountSyncSection').length,1);
  assert.equal(writes.length,0);assert.equal(store.data.categories.length,0);
  await act(async()=>tree.root.findByType('Sheet').props.onClose());
  assert.equal(tree.root.findAllByType('AccountSyncSection').length,0);
});

for (const lang of ['zh','en']) for (const theme of ['cleanFocus','deepWork']) test(`native skill library uses independent actions and stable searchable rows ${lang}/${theme}`,async()=>{
  fresh(lang,theme);
  store.data.skills=Array.from({length:40},(_,i)=>({id:`TEST_SKILL_${i}`,name:i===17?'TEST 中文长名称 and a long English skill title':'TEST '+i,createdAt:1,totalXP:0,dailyTargetMinutes:30,progressType:'time_based'}));
  await render('../screens/SkillLibraryScreen.tsx');
  const list=tree.root.findByType('FlatList');assert.equal(list.props.data.length,40);assert.equal(list.props.initialNumToRender,10);
  assert.equal(list.props.keyExtractor(store.data.skills[17]),'TEST_SKILL_17');
  assert.equal(tree.root.findAllByType('QuestCard').length,0);
  for(const row of tree.root.findAllByType('TouchableOpacity')) assert.equal(row.findAllByType('QuestButton').length,0);
  await act(async()=>input(t(lang,'searchSkills')).props.onChangeText('中文'));
  assert.deepEqual(tree.root.findByType('FlatList').props.data.map(row=>row.id),['TEST_SKILL_17']);
  const row=tree.root.findAll(node=>node.type==='TouchableOpacity'&&node.props.accessibilityLabel===store.data.skills[17].name)[0];
  await act(async()=>row.props.onPress());assert.deepEqual(navigations.at(-1),['SkillDetail',{skillId:'TEST_SKILL_17'}]);
  await act(async()=>button(t(lang,'edit')).props.onPress());assert.equal(input(t(lang,'name')).props.value,store.data.skills[17].name);
  await act(async()=>button(t(lang,'cancel')).props.onPress());
  await act(async()=>button(t(lang,'delete')).props.onPress());assert.equal(writes.length,0);
  await act(async()=>confirmation.onConfirm());assert.deepEqual(writes[0],{name:'deleteSkillFromLibrary',args:['TEST_SKILL_17']});
});
