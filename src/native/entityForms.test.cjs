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
let store, writes, closed, alerts, tree, wait, retry;
const host = name => props => React.createElement(name, props, props.children);
const rn = { Platform: { OS: 'android' }, Appearance: { getColorScheme: () => 'light' }, StyleSheet: { create: value => value }, Keyboard: { dismiss() {} }, Alert: { alert: value => alerts.push(value) } };
for (const name of ['View', 'Text', 'TextInput', 'TouchableOpacity', 'Switch', 'Pressable', 'ScrollView']) rn[name] = name;
const original = Module._load;
Module._load = function(request, parent, main) {
  if (request === 'react') return React;
  if (request === 'react/jsx-runtime') return require(path.join(runtime, 'react/jsx-runtime'));
  if (request === 'react-native') return rn;
  if (request === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView' };
  if (request === '@react-navigation/native') return { useRoute: () => ({ params: { categoryId: 'TEST_GOAL' } }), useNavigation: () => ({ goBack() {}, navigate() {} }) };
  if (/\/storage$/.test(request)) return { uid: () => 'TEST_CRITERION', today: () => '2026-09-22' };
  if (/\/store$/.test(request)) return { useStore: () => store };
  if (/\/useQuestTheme$/.test(request)) return { useQuestTheme: () => require('../design/tokens.ts').getQuestTheme(store.data.settings.selectedThemeId) };
  if (/\/featureFlag$/.test(request)) return { getV11ProductLanguage: x => x, getV11ProductThemeId: x => x };
  if (/\/analytics$/.test(request)) return { trackEvent() {} };
  if (/\/BottomSheetForm$/.test(request)) return props => props.visible ? React.createElement('Sheet', props, props.children, React.createElement('Footer', {}, props.footer)) : null;
  if (/\/QuestPrimitives$/.test(request)) return { QuestGroupedSurface: host('QuestGroupedSurface') };
  if (/\/(QuestButton|QuestPill|QuestInput|QuestIcon|QuestProgressBar|QuestEntityIcon|V11RebaselineIcon|EmojiPicker|ColorPicker|TimePickerInput)$/.test(request)) return host(request.split('/').at(-1));
  return original.call(this, request, parent, main);
};
for (const extension of ['.ts', '.tsx']) require.extensions[extension] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText, file);
const { DEFAULT_DATA } = require('../types.ts');
const { t } = require('../i18n.ts');
const fresh = (lang = 'en', theme = 'cleanFocus') => {
  writes=[]; closed=0; alerts=[]; wait=async()=>{}; retry=async()=>{}; rn.Platform.OS='android';
  store={data:structuredClone(DEFAULT_DATA),waitForLocalWrites:()=>wait(),retryLocalWrites:()=>retry()};
  store.data.settings.language=lang;store.data.settings.selectedThemeId=theme;
  for (const name of ['addCategory','updateCategory','applyDomainTemplateToGoal','addSkill','updateSkill','createSkillAndAttachToModule','addModule','updateModule','deleteModule','addExistingSkillToModule','removeSkillFromModule']) store[name]=(...args)=>{writes.push({name,args});return {id:'TEST_ENTITY'};};
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
