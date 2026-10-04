import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Module, { createRequire } from 'node:module';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const out = mkdtempSync(join(tmpdir(), 'questlife-ai-boundary-'));
// Vercel compiles server entries without Expo's strict settings; preserve the
// explicit discriminant narrowing under that compiler mode too.
const serverTypes = spawnSync(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'),
  '--noEmit', '--module', 'commonjs', '--target', 'es2022', '--moduleResolution', 'node',
  '--esModuleInterop', '--skipLibCheck', '--strictNullChecks', 'false',
  join(root, 'api/parse.ts'), join(root, 'api/brief.ts'),
], { cwd: root, stdio: 'inherit' });
if (serverTypes.status !== 0) { rmSync(out, { recursive: true, force: true }); process.exit(serverTypes.status ?? 1); }
const compiled = spawnSync(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'),
  '--module', 'commonjs', '--target', 'es2022', '--moduleResolution', 'node', '--jsx', 'react-jsx',
  '--esModuleInterop', '--resolveJsonModule', '--skipLibCheck', '--strict', '--rootDir', root, '--outDir', out,
  join(root, 'api/parse.ts'), join(root, 'api/brief.ts'), join(root, 'src/services/authenticatedAi.ts'),
], { cwd: root, stdio: 'inherit' });
if (compiled.status !== 0) { rmSync(out, { recursive: true, force: true }); process.exit(compiled.status ?? 1); }
symlinkSync(join(root, 'node_modules'), join(out, 'node_modules'), 'dir');
const require = createRequire(join(out, 'test.cjs'));
const UID = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const HOST = 'https://ai-auth.example.test';
const publicKey = 'sb_publishable_test_only';
const serverKey = 'sb_secret_test_only';
const bearer = 'test-bearer-not-a-credential';
Object.assign(process.env, { SUPABASE_URL: HOST, SUPABASE_ANON_KEY: publicKey,
  SUPABASE_SERVICE_ROLE_KEY: serverKey, DEEPSEEK_API_KEY: 'model-test-only', EXPO_PUBLIC_API_ORIGIN: 'https://app.example.test' });
const minimalBrief = { mode: 'instant_micro', trigger: 'manual', now: '2026-10-05T00:00:00Z', current_state: null,
  today_context: { recent_context_logs: [] }, profile: { active_goals: [], modules: [], skills: [],
    known_baselines: {}, confirmed_patterns: [], chronotype: 'unknown' },
  history_index: { last_7_days: [], last_28_days: {} }, schedule_today: [] };
const actualBrief = { headline_insight: 'Isolated fixture', readiness: { score: null, band: 'unknown' },
  prescription: { do_first: { step: 'Observe', why: 'No data', duration_min: null }, schedule_adjustments: [] }, confidence: 0.1 };
let session = { user: { id: UID }, access_token: bearer };
let state = { ownerId: UID, healthConsent: false };
let observer;
const auth = { getSession: async () => ({ data: { session }, error: null }),
  onAuthStateChange: (callback) => { observer = callback; return { data: { subscription: { unsubscribe() {} } } }; } };
const originalLoad = Module._load;
const preferenceStorage = new Map([['questlife.ai.consent.v1', JSON.stringify({version:1,ownerId:UID,enabled:true,includeImportedContext:false})]]);
Module._load = function (name, parent, isMain) {
  if (name === '@react-native-async-storage/async-storage') return {
    getItem: async key => preferenceStorage.get(key) ?? null,
    setItem: async (key,value) => { preferenceStorage.set(key,value); },
  };
  if (parent?.filename.endsWith('/services/authenticatedAi.js')) {
    if (name === '../sync-v2/supabase') return { authConfigured: () => true, supabaseClient: () => ({ auth }) };
    if (name === '../sync-v2/runtime') return { readSyncState: async () => ({ ...state }) };
  }
  return originalLoad.call(this, name, parent, isMain);
};
const parse = require(join(out, 'api/parse.js')).default;
const brief = require(join(out, 'api/brief.js')).default;
const { authenticatedAiPost } = require(join(out, 'src/services/authenticatedAi.js'));
const { saveAiPreferences, aiPreferencesSnapshot } = require(join(out, 'src/services/aiPreferences.js'));
const { aiBriefForCloud } = require(join(out, 'src/services/aiBriefPrivacy.js'));
const originalFetch = globalThis.fetch;
const originalWarn = console.warn, originalError = console.error, originalLog = console.log;
let calls = [], logs = [], budget = { status: 'claimed' }, budgetFailure = false, modelContent, clientHook, memoryRows = [];
const json = (value, status = 200) => new Response(JSON.stringify(value), { status });
const sink = () => ({ statusCode: 0, body: null, headers: {}, setHeader(k,v) { this.headers[k]=v; },
  status(code) { this.statusCode=code;return this; }, json(body) { this.body=body;return this; } });
const invoke = async (handler, body, token = bearer, method = 'POST') => {
  const res = sink(); await handler({ body, method, headers: token === null ? {} : { authorization: `Bearer ${token}` } }, res); return res;
};
globalThis.fetch = async (input, init = {}) => {
  const url = String(input), headers = new Headers(init.headers);
  calls.push({ url, headers, body: init.body, method: init.method });
  if (url === `${HOST}/auth/v1/user`) return headers.get('authorization') === `Bearer ${bearer}` ? json({ id: UID }) : json({},401);
  if (url === `${HOST}/rest/v1/rpc/questlife_ai_claim`) {
    assert.equal(headers.get('apikey'), serverKey);
    assert.equal(JSON.parse(init.body).p_user_id, UID);
    return json(budget, budgetFailure ? 503 : 200);
  }
  if (url.startsWith(`${HOST}/rest/v1/questlife_sync_entities?`)) {
    const query = new URL(url).searchParams;
    assert.equal(query.get('user_id'), `eq.${UID}`); assert.equal(query.get('deleted_at'),'is.null');
    assert.equal(headers.get('authorization'),`Bearer ${bearer}`); assert.equal(headers.get('apikey'),publicKey);
    return json(query.get('entity_type') === 'eq.patternMemory' ? memoryRows : []);
  }
  if (url === 'https://api.deepseek.com/chat/completions') return json({ choices: [{ message: {
    content: modelContent ?? JSON.stringify(JSON.parse(init.body).messages[0].content.includes('single-line entry')
      ? { type: 'misc', entries: [], fields: {}, insight: {} } : actualBrief) }, finish_reason: 'stop' }] });
  if (url === 'https://app.example.test/api/parse' || url === '/api/parse') {
    if (clientHook) await clientHook();
    return json({ ok: true, entries: [] });
  }
  throw new Error(`Unexpected test request ${url}`);
};
let passed = 0;
async function check(name, job) { calls=[]; logs=[];budget={status:'claimed'};budgetFailure=false;modelContent=undefined;clientHook=undefined;
  memoryRows=[];
  await job();passed++;originalLog(`PASS ${name}`); }
try {
  console.warn=(...args)=>logs.push(args);console.error=(...args)=>logs.push(args);console.log=(...args)=>logs.push(args);
  await check('both paid routes deny anonymous and invalid bearers before quota/model/memory', async()=>{
    for (const [handler,body] of [[parse,{text:'QA input'}],[brief,minimalBrief]]) for(const token of [null,'forged']) {
      assert.equal((await invoke(handler,body,token)).statusCode,401);
    }
    assert.ok(calls.every(call=>call.url.endsWith('/auth/v1/user')));
  });
  await check('malformed JSON, wrong body shape and UTF8 byte budget do not spend quota', async()=>{
    for(const handler of [parse,brief]) {
      assert.equal((await invoke(handler,'{')).statusCode,400);
      assert.equal((await invoke(handler,[])).statusCode,400);
      assert.equal((await invoke(handler,{text:'中'.repeat(30000)})).statusCode,413);
    }
    assert.equal(calls.length,0);
  });
  await check('atomic quota denial exposes retry, never contacts provider', async()=>{
    budget={status:'rate_limited',retry_after:27};
    for(const [handler,body] of [[parse,{text:'test'}],[brief,minimalBrief]]) {
      const res=await invoke(handler,body);assert.equal(res.statusCode,429);assert.equal(res.headers['Retry-After'],'27');
    }
    assert.ok(calls.every(call=>!call.url.includes('deepseek')));
  });
  await check('missing or failed budget fails closed instead of unmetered inference', async()=>{
    budgetFailure=true;assert.equal((await invoke(parse,{text:'test'})).statusCode,503);
    budgetFailure=false;budget={status:'unexpected'};assert.equal((await invoke(brief,minimalBrief)).statusCode,503);
    assert.ok(calls.every(call=>!call.url.includes('deepseek')));
  });
  await check('authenticated parse retains existing output contract with fixed provider token cap',async()=>{
    const res=await invoke(parse,{text:'isolated QA',debugParse:true});assert.equal(res.statusCode,200);
    assert.equal(res.body.parserMeta.version,'questlife-smart-capture-parser-v1');
    assert.equal(JSON.parse(calls.find(c=>c.url.includes('deepseek')).body).max_tokens,1800);
    assert.deepEqual(logs,[]);
  });
  await check('provider-invalid JSON never logs raw input/output or debug payload',async()=>{
    modelContent='private-health-text-not-for-logs';
    assert.equal((await invoke(parse,{text:modelContent,debugParse:true})).statusCode,422);
    assert.ok(!JSON.stringify(logs).includes(modelContent));
  });
  await check('brief uses verified account RLS memory, ignores forged anonymous ID, never writes duplicate',async()=>{
    const res=await invoke(brief,{...minimalBrief,anonymous_user_id:OTHER,include_imported_context:true});assert.equal(res.statusCode,200);
    assert.equal(res.body.meta.server_memory,'empty');
    assert.equal(calls.filter(c=>c.url.includes('questlife_sync_entities')).length,2);
    assert.ok(!calls.some(c=>c.url.includes('pattern_memory')||c.url.includes('decision_results')));
    const prompt=calls.find(c=>c.url.includes('deepseek')).body;
    assert.ok(!prompt.includes(OTHER));assert.ok(!prompt.includes(bearer));
    assert.ok(calls.every(c=>c.method!=='POST'||c.url.includes('rpc/questlife_ai_claim')||c.url.includes('deepseek')));
  });
  await check('complete brief including synced memory cannot exceed paid input byte budget', async()=>{
    memoryRows=[{payload:{id:'x'.repeat(10000),label:'Isolated quota fixture',status:'accepted',sampleN:1,confidence:0.1}}];
    const input={...minimalBrief,include_imported_context:true,
      profile:{...minimalBrief.profile,known_baselines:{notes:'x'.repeat(62000)}}};
    assert.ok(Buffer.byteLength(JSON.stringify(input))<64*1024);
    assert.equal((await invoke(brief,input)).statusCode,413);
    assert.ok(!calls.some(call=>call.url.includes('deepseek')));
  });
  await check('client signed-out and wrong replica owner never transmit records',async()=>{
    session=null;await assert.rejects(()=>authenticatedAiPost('/api/parse',{text:'private'}),/authentication_required/);
    session={user:{id:UID},access_token:bearer};state.ownerId=OTHER;
    await assert.rejects(()=>authenticatedAiPost('/api/parse',{text:'private'}),/local_account_mismatch/);
    assert.equal(calls.length,0);state.ownerId=UID;
  });
  await check('normal client supplies bearer with no anonymous identity',async()=>{
    const res=await authenticatedAiPost('/api/parse',{text:'isolated'});assert.equal(res.ok,true);
    assert.equal(calls[0].headers.get('authorization'),`Bearer ${bearer}`);
    assert.ok(!calls[0].body.includes('anonymous_user_id'));
  });
  await check('logout/same-account relogin rejects old in-flight result',async()=>{
    clientHook=async()=>{observer('SIGNED_OUT',null);observer('SIGNED_IN',session);};
    await assert.rejects(()=>authenticatedAiPost('/api/parse',{text:'isolated'}),/account_changed/);
  });
  await check('health consent change rejects old in-flight result',async()=>{
    clientHook=async()=>{state.healthConsent=true;};
    await assert.rejects(()=>authenticatedAiPost('/api/parse',{text:'isolated'}),/account_changed/);
  });
  await check('AI preference is persisted, owner-bound and off blocks all client transmission',async()=>{
    await saveAiPreferences({ownerId:UID,enabled:false,includeImportedContext:false});
    await assert.rejects(()=>authenticatedAiPost('/api/parse',{text:'private'}),/ai_disabled/);
    assert.equal(calls.length,0);assert.equal(JSON.parse(preferenceStorage.get('questlife.ai.consent.v1')).enabled,false);
    await saveAiPreferences({ownerId:OTHER,enabled:true,includeImportedContext:true});
    await assert.rejects(()=>authenticatedAiPost('/api/parse',{text:'private'}),/ai_disabled/);
    assert.equal(calls.length,0);
  });
  await check('source-ambiguous context and interpretations excluded without separate consent',async()=>{
    const input={...minimalBrief,today_context:{recent_context_logs:[{source:'healthkit',value:77}],hrv:77},
      profile:{...minimalBrief.profile,confirmed_patterns:[{label:'private health interpretation'}]},
      decision_memory_summary:{private_health:'private'},history_index:{last_28_days:{context_sample_count:1,log_count:2},last_7_days:[{context_events:[{type:'context',value:77}],events:[{type:'context',value:77},{type:'execution',duration:5}]}]}};
    const safe=aiBriefForCloud(input,false);
    assert.ok(!JSON.stringify(safe).includes('77'));assert.ok(!JSON.stringify(safe).includes('private'));
    assert.equal(safe.history_index.last_28_days.log_count,2);assert.equal(safe.history_index.last_7_days[0].events.length,1);
    assert.equal(aiBriefForCloud(input,true).today_context.hrv,77);
    const result=await invoke(brief,safe);assert.equal(result.statusCode,200);
    assert.ok(!calls.some(call=>call.url.includes('questlife_sync_entities')));
    assert.equal(aiPreferencesSnapshot().ownerId,OTHER);
  });
  originalLog(`AI boundary: ${passed}/${passed} isolated scenario groups passed; no live provider or account used.`);
} finally {
  console.warn=originalWarn;console.error=originalError;console.log=originalLog;globalThis.fetch=originalFetch;Module._load=originalLoad;
  rmSync(out,{recursive:true,force:true});
}
