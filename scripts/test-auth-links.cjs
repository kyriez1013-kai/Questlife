const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { createHash, webcrypto } = require('node:crypto');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = { exports, URL, URLSearchParams, TextEncoder, ...globals };
  vm.runInNewContext(code, context, { filename: file });
  return { ...exports, context };
}
const { parseAuthLink, authLinkConsumer } = load('src/sync-v2/authLink.ts');
const web = 'https://questlife-v1-release.vercel.app/';
const native = 'questlife://auth/callback';
test('exact Web/native PKCE callbacks preserve code and flow ID', () => {
  for (const base of [web, native]) {
    const result = parseAuthLink(`${base}?code=valid-test-code&sb_flow_id=flowtest123`, base);
    assert.equal(result.code, 'valid-test-code'); assert.equal(result.flowId, 'flowtest123');
  }
});
test('foreign origin, path, credentials, implicit tokens and unrelated links rejected', () => {
  for (const url of ['https://other.example/?code=valid-test-code', `${web}other?code=valid-test-code`,
    'https://user@questlife-v1-release.vercel.app/?code=valid-test-code', `${web}#access_token=test`, web])
    assert.equal(parseAuthLink(url, web), null);
  assert.equal(parseAuthLink('questlife://capture?code=valid-test-code', native), null);
});
test('malformed, duplicated, oversized codes and error callbacks fail closed', () => {
  for (const query of ['code=x', 'code=valid-test-code&code=another-test-code', `code=${'x'.repeat(4097)}`,
    'code=valid-test-code&sb_flow_id=../../path', 'code=valid-test-code&sb_flow_id=flowtest123&sb_flow_id=flowtest456', 'error_code=expired'])
    assert.equal(parseAuthLink(`${web}?${query}`, web)?.error, true);
  assert.equal(parseAuthLink(`${web}#error=access_denied&error_code=otp_expired`, web)?.error, true);
});
test('duplicate warm/cold callback delivery exchanges once, failures propagate without tokens', async () => {
  let calls = 0; const use = authLinkConsumer(async () => { calls++; });
  await use({code:'same-test-code'}); await use({code:'same-test-code'}); await use(null);
  assert.equal(calls, 1); await assert.rejects(use({error:true}), /auth_link_failed/);
  const broken = authLinkConsumer(async () => { throw Error('controlled failure'); });
  await assert.rejects(broken({code:'test-code'}), /controlled failure/);
});
test('native crypto bridge preserves available crypto and uses Expo SHA-256 only', async () => {
  const crypto = {};
  const bridge = load('src/sync-v2/pkceCrypto.native.ts', { crypto, require: name => {
    assert.equal(name, 'expo-crypto'); return { getRandomValues: value => webcrypto.getRandomValues(value),
      CryptoDigestAlgorithm:{SHA256:'SHA-256'}, digest: (algorithm, data) => webcrypto.subtle.digest(algorithm, data) };
  } });
  bridge.ensurePkceCrypto(); bridge.ensurePkceCrypto();
  const bytes = new TextEncoder().encode('rfc7636-test');
  assert.equal(Buffer.from(await crypto.subtle.digest('SHA-256', bytes)).toString('hex'), createHash('sha256').update(bytes).digest('hex'));
  await assert.rejects(crypto.subtle.digest('SHA-1', bytes), /unsupported_digest/);
  assert.ok(crypto.getRandomValues(new Uint8Array(32)).some(value => value !== 0));
});
test('official Supabase SDK sends S256 and stores a verifier, not a plain challenge', async () => {
  const {createClient} = require('@supabase/supabase-js'); const disk = new Map(); let request;
  const client = createClient('https://test.invalid', 'sb_publishable_TEST', {
    auth:{flowType:'pkce',persistSession:true,autoRefreshToken:false,detectSessionInUrl:false,
      storage:{getItem:key=>disk.get(key)??null,setItem:(key,value)=>disk.set(key,value),removeItem:key=>disk.delete(key)}},
    global:{fetch:async(url,options)=>{request={url:String(url),body:JSON.parse(options.body)};return new Response('{}',{status:200,headers:{'content-type':'application/json'}});}},
  });
  const response = await client.auth.signInWithOtp({email:'disposable@example.com',options:{emailRedirectTo:native}});
  assert.equal(response.error,null);assert.equal(request.body.code_challenge_method,'s256');
  assert.equal(request.body.code_challenge.length,43);assert.ok([...disk.keys()].some(key=>key.includes('code-verifier')));
  assert.ok(decodeURIComponent(request.url).includes(native));await client.removeAllChannels();client.realtime.disconnect();
});

test('native cold and warm links use the real SDK session exchange and dispose the OS listener', async () => {
  const sdk = require('@supabase/supabase-js');
  const disk = new Map(); const calls = []; let urlListener, removed = false;
  const user = { id:'00000000-0000-4000-8000-000000000081', aud:'authenticated', role:'authenticated',
    email:'disposable@example.test', created_at:'2026-01-01T00:00:00Z', app_metadata:{}, user_metadata:{} };
  const token = [Buffer.from('{}').toString('base64url'), Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'test'].join('.');
  const response = value => new Response(JSON.stringify(value),{status:200,headers:{'content-type':'application/json'}});
  const module = load('src/sync-v2/supabase.ts', {
    process:{env:{EXPO_PUBLIC_SUPABASE_URL:'https://callback.invalid',EXPO_PUBLIC_SUPABASE_ANON_KEY:'sb_publishable_TEST'}},
    require:name => {
      if(name==='react-native-url-polyfill/auto') return {};
      if(name==='react-native') return {Platform:{OS:'ios'},Linking:{getInitialURL:async()=>`${native}?code=cold-link-code`,
        addEventListener:(_event,listener)=>{urlListener=listener;return {remove(){removed=true;}};}}};
      if(name==='./sessionStorage') return {sessionStorage:{getItem:key=>disk.get(key)??null,setItem:(key,value)=>disk.set(key,value),removeItem:key=>disk.delete(key)}};
      if(name==='./auth') return load('src/sync-v2/auth.ts');
      if(name==='./publicConfig') return load('src/sync-v2/publicConfig.ts');
      if(name==='./authLink') return {parseAuthLink,authLinkConsumer};
      if(name==='./pkceCrypto') return {ensurePkceCrypto(){}};
      if(name==='@supabase/supabase-js') return {...sdk,createClient:(url,key,options)=>sdk.createClient(url,key,{
        ...options,auth:{...options.auth,autoRefreshToken:false},global:{fetch:async(url,options={})=>{
          const body=JSON.parse(options.body??'{}');calls.push({url:String(url),body});
          if(String(url).includes('grant_type=pkce')) return response({access_token:token,refresh_token:'test-refresh',expires_in:3600,token_type:'bearer',user});
          return response({});
        }},
      })};
      throw Error(`Unexpected dependency ${name}`);
    },
  });
  await module.authService.requestOtp('disposable@example.test');
  let errors=0; const stop=module.listenForAuthLinks(()=>{errors++;});
  for(let i=0;i<30 && !(await module.authService.getSession());i++) await new Promise(resolve=>setTimeout(resolve,5));
  assert.equal((await module.authService.getSession()).userId,user.id);
  const exchanged=calls.filter(call=>call.url.includes('grant_type=pkce'));
  assert.equal(exchanged.length,1);assert.equal(exchanged[0].body.auth_code,'cold-link-code');
  assert.ok(exchanged[0].body.code_verifier.length>32);
  urlListener({url:`${native}?code=cold-link-code`});
  urlListener({url:`${native}?error_code=expired`});
  await new Promise(resolve=>setTimeout(resolve,5));
  assert.equal(calls.filter(call=>call.url.includes('grant_type=pkce')).length,1);assert.equal(errors,1);
  assert.equal((await module.authService.getSession()).userId,user.id);
  stop(); assert.equal(removed,true);
  urlListener({url:`${native}?code=after-dispose-code`});
  await new Promise(resolve=>setTimeout(resolve,5));
  assert.equal(calls.filter(call=>call.url.includes('grant_type=pkce')).length,1);
  await module.supabaseClient().removeAllChannels();module.supabaseClient().realtime.disconnect();
});
