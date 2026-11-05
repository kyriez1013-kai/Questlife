// Disposable unsigned browser. All answers below are isolated QA inputs, not Owner data.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');const fs=require('node:fs');
const url=process.env.QA_URL||'https://questlife-v1-release.vercel.app/';
const out=process.env.QA_OUT||'/tmp/questlife-v5-final-qa';fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const context=await browser.newContext({viewport:{width:390,height:844},locale:'zh-CN',timezoneId:'Australia/Sydney'});const page=await context.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto(url,{waitUntil:'load'});await page.evaluate(()=>navigator.serviceWorker.ready);
 const version=await page.evaluate(async()=>await(await fetch('/version.json',{cache:'no-store'})).json());
 const cached=await page.evaluate(async()=>{const keys=await caches.keys();return (await Promise.all(keys.map(async k=>(await(await caches.open(k)).keys()).map(r=>new URL(r.url).pathname)))).flat();});
 assert.ok(cached.some(p=>p.includes('/index-')&&p.endsWith('.js')));assert.equal(cached.some(p=>p.startsWith('/api/')),false);
 await context.setOffline(true);await page.reload({waitUntil:'load'});await page.getByTestId('fs-welcome').waitFor();
 await page.getByRole('button',{name:'开始（约 30 秒）',exact:true}).click();await page.getByTestId('fs-sleep-good').click();await page.getByTestId('fs-state-high').click();await page.getByTestId('fs-focus-recover').click();await page.getByRole('button',{name:'看今天的建议',exact:true}).click();await page.getByRole('button',{name:'好，进入今天',exact:true}).click();
 await page.getByTestId('v5-today').waitFor();await page.locator('#questlife-offline-notice').waitFor();
 await page.getByRole('button',{name:'记一下',exact:true}).click();await page.getByRole('button',{name:/^精力 4 /}).click();await page.getByRole('button',{name:/^紧绷 2 /}).click();await page.getByTestId('v5-state-strip').getByRole('group',{name:'精力',exact:true}).waitFor({state:'detached'});
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('questlife.v1')).stateCheckIns.map(r=>r.id));await page.reload({waitUntil:'load'});try{await page.getByRole('button',{name:'不是这样',exact:true}).waitFor({timeout:8000});}catch(e){await page.screenshot({path:`${out}/offline-failure.png`});console.log(JSON.stringify({body:await page.locator('body').innerText(),errors,stored:await page.evaluate(()=>{const d=JSON.parse(localStorage.getItem('questlife.v1'));return {onboarding:d.settings.onboardingCompleted,states:d.stateCheckIns.map(r=>({id:r.id,date:r.date,hasLayer:!!r.stateLayer}))};})}));throw e;}const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('questlife.v1')).stateCheckIns.map(r=>r.id));assert.deepEqual(after,before);
 await page.screenshot({path:`${out}/offline-saved-state.png`});await context.setOffline(false);await page.locator('#questlife-offline-notice').waitFor({state:'detached'});
 await page.goto(new URL('?v5_ui=0',url).href);assert.equal(await page.getByTestId('v5-today').count(),0);assert.equal(await page.getByRole('tablist').count(),1);
 const result={environment:'Chrome isolated context; no account, no device proof',version,firstVisitOfflineBoot:true,offlineOnboarding:true,offlineCheckInReloadPreservesIds:true,onlineNoticeClears:true,rollbackFlag:true,apiCached:false,errors};assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/offline-results.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
