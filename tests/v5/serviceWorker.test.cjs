const test=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
function harness(failAsset=false){
 const listeners={},entries=new Map(),deleted=[];let activated=false,claimed=false;
 const html='<link href="/_expo/static/css/v5-123.css"><script src="/_expo/static/js/web/index-123.js"></script><script src="https://other.example/a.js"></script><link href="/api/private">';
 const cache={addAll:async urls=>{if(failAsset)throw Error('network lost');for(const u of urls)entries.set(u,new Response('asset'));},put:async(u,r)=>entries.set(typeof u==='string'?u:u.url,r)};
 const context={URL,Response,Set,Error,self:{location:{origin:'https://qa.example'},addEventListener:(n,fn)=>listeners[n]=fn,skipWaiting:async()=>{activated=true;},clients:{claim:async()=>{claimed=true;}}},caches:{open:async()=>cache,keys:async()=>['questlife-old','unrelated-cache','questlife-shell-v1'],delete:async k=>deleted.push(k),match:async key=>entries.get(key)},fetch:async()=>new Response(html,{headers:{'content-type':'text/html'}})};
 vm.runInNewContext(fs.readFileSync(require.resolve('../../public/sw.js'),'utf8'),context);
 const dispatch=name=>new Promise((resolve,reject)=>listeners[name]({waitUntil:p=>p.then(resolve,reject)}));
 return {listeners,entries,deleted,dispatch,get activated(){return activated;},get claimed(){return claimed;}};
}
test('first install caches entry JS and CSS before activation; excludes API and cross-origin data',async()=>{
 const h=harness();await h.dispatch('install');assert.equal(h.activated,true);
 assert.ok(h.entries.has('/_expo/static/js/web/index-123.js'));assert.ok(h.entries.has('/_expo/static/css/v5-123.css'));assert.ok(h.entries.has('/'));
 assert.equal([...h.entries.keys()].some(k=>k.includes('/api/')||k.includes('other.example')),false);
});
test('incomplete boot assets reject install, not a false offline-ready shell',async()=>{
 const h=harness(true);await assert.rejects(h.dispatch('install'),/network lost/);assert.equal(h.activated,false);assert.equal(h.entries.has('/'),false);
});
test('activation prunes only older QuestLife caches',async()=>{
 const h=harness();await h.dispatch('activate');assert.deepEqual(h.deleted,['questlife-old']);assert.equal(h.claimed,true);
});
test('API, non-GET and cross-origin requests bypass worker cache entirely',()=>{
 const h=harness();for(const request of [{method:'POST',url:'https://qa.example/api/inbox'},{method:'GET',url:'https://qa.example/api/private'},{method:'GET',url:'https://db.example/data'}])h.listeners.fetch({request,respondWith:()=>assert.fail('must bypass cache')});
});
