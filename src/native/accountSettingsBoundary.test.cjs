// Render real AccountSyncSection, but never call real auth, sync or storage.
const assert=require('node:assert/strict');
const {test,afterEach}=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const runtime=process.env.QUESTLIFE_UI_TEST_RUNTIME;
if(!runtime)throw Error('Set QUESTLIFE_UI_TEST_RUNTIME to the isolated node_modules directory');
const React=require(path.join(runtime,'react'));
const {create,act}=require(path.join(runtime,'react-test-renderer'));
global.IS_REACT_ACT_ENVIRONMENT=true;
const rn={Platform:{OS:'android'},Appearance:{getColorScheme:()=> 'light'},Alert:{alert:(...args)=>alerts.push(args)}};
for(const name of ['View','Text','Switch'])rn[name]=name;
let configured,session,snapshot,store,alerts,clears,signouts,failClear,webPrompts;
const engine={status:'signedOut',subscribe:()=>()=>{}};
const originalLoad=Module._load;
const host=name=>props=>React.createElement(name,props,props.children);
Module._load=function(request,parent,isMain){
  if(request==='react')return React;
  if(request==='react/jsx-runtime')return require(path.join(runtime,'react/jsx-runtime'));
  if(request==='react-native')return rn;
  if(/\/store$/.test(request))return {useStore:()=>store};
  if(/\/useQuestTheme$/.test(request))return {useQuestTheme:()=>require('../design/tokens.ts').getQuestTheme('cleanFocus')};
  if(request==='./supabase')return {authConfigured:()=>configured,authService:{getSession:async()=>session,subscribe:()=>()=>{},signOut:async()=>{signouts++;}},supabaseClient:()=>({from:()=>({select:()=>({eq:async()=>({data:[],error:null})})})})};
  if(request==='./runtime')return {getSyncEngine:async()=>engine,readSyncState:async()=>snapshot,requestSync(){},clearLocalReplica:async confirmed=>{clears.push(confirmed);if(failClear)throw Error('TEST_CLEAR_FAILURE');}};
  if(/\/QuestPrimitives$/.test(request))return {QuestGroupedSurface:host('QuestGroupedSurface'),QuestSectionHeader:host('QuestSectionHeader')};
  if(/\/Quest(Input|Button)$/.test(request))return host(request.split('/').at(-1));
  return originalLoad.call(this,request,parent,isMain);
};
for(const ext of ['.ts','.tsx'])require.extensions[ext]=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,filename);
const Account=require('../sync-v2/AccountSyncSection.tsx').default;
const {DEFAULT_DATA}=require('../types.ts');
let tree;
const originalWindow=global.window;
const setup=()=>{configured=true;session=null;snapshot={ownerId:'TEST_OWNER',outbox:[],conflicts:[]};store={data:structuredClone(DEFAULT_DATA)};store.data.settings.language='en';rn.Platform.OS='android';alerts=[];clears=[];signouts=0;failClear=false;webPrompts=[];global.window={confirm:message=>{webPrompts.push(message);throw Error('Native must not call Web confirm');}};};
const render=async()=>{await act(async()=>{tree=create(React.createElement(Account));});};
const clearButton=()=>tree.root.findAll(node=>node.type==='QuestButton'&&node.props.label==='Clear local record copies')[0];
afterEach(async()=>{if(tree)await act(async()=>tree.unmount());tree=undefined;global.window=originalWindow;});

for(const platform of ['android','ios'])test(`${platform} local clear uses native confirmation and existing scoped handler only`,async()=>{
  setup();rn.Platform.OS=platform;await render();assert.ok(clearButton());
  await act(async()=>clearButton().props.onPress());assert.deepEqual(clears,[]);assert.equal(webPrompts.length,0);
  assert.match(alerts[0][1],/not cloud or system Calendar data/);assert.match(alerts[0][1],/migration recovery backups remain/);
  await act(async()=>alerts[0][2][1].onPress());assert.deepEqual(clears,[true]);assert.equal(signouts,0);
});
test('cancelling native clear never invokes the handler',async()=>{
  setup();await render();await act(async()=>clearButton().props.onPress());await act(async()=>alerts[0][2][0].onPress?.());assert.deepEqual(clears,[]);assert.equal(signouts,0);
});
test('Web local clear uses browser confirmation, not a silent native alert',async()=>{
  setup();rn.Platform.OS='web';global.window.confirm=message=>{webPrompts.push(message);return false;};await render();
  await act(async()=>clearButton().props.onPress());assert.deepEqual(clears,[]);assert.equal(alerts.length,0);
  global.window.confirm=()=>true;await act(async()=>clearButton().props.onPress());assert.deepEqual(clears,[true]);assert.equal(signouts,0);
});
test('signed-in, unconfigured and unbound states do not expose local clear',async()=>{
  for(const state of [{session:{userId:'TEST_OWNER'}},{configured:false},{ownerId:undefined}]){
    setup();if('session'in state)session=state.session;if('configured'in state)configured=state.configured;if('ownerId'in state)snapshot.ownerId=state.ownerId;
    await render();assert.equal(clearButton(),undefined);assert.deepEqual(clears,[]);assert.equal(signouts,0);
    await act(async()=>tree.unmount());tree=undefined;
  }
});
test('pending changes and unresolved conflicts disable local clear',async()=>{
  for(const state of [{outbox:[{id:'TEST_PENDING'}]},{conflicts:[{resolution:'pending'}]}]){
    setup();Object.assign(snapshot,state);await render();assert.equal(clearButton().props.disabled,true);assert.deepEqual(clears,[]);
    await act(async()=>tree.unmount());tree=undefined;
  }
});
test('failed local clear displays failure without signing out',async()=>{
  setup();failClear=true;await render();await act(async()=>clearButton().props.onPress());await act(async()=>alerts[0][2][1].onPress());
  assert.ok(tree.root.findAll(node=>node.type==='Text'&&node.props.accessibilityRole==='alert').length);assert.equal(signouts,0);
});
