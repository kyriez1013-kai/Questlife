// Isolated browser only. Synthetic data never enters an authenticated client.
const {createRequire}=require('node:module');
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const load=require('../tests/v5/load.cjs');const {buildStateCheckIn}=load('src/state-layer/checkIn.ts');
const url=process.env.QA_URL||'http://localhost:8095/';const out=process.env.QA_OUT||'/tmp/questlife-v5-qa';fs.mkdirSync(out,{recursive:true});
const now=new Date('2026-11-05T09:20:00+11:00');const iso=now.toISOString();const date='2026-11-05';
const provenance={schemaVersion:'questlife.data.provenance.v1',origin:'QA_TEST',confirmation:'NOT_REQUIRED',captureMethod:'manual',recordedAt:iso,availableAt:iso,qaRunId:'v5-local-only'};
function seed(scenario,theme,language='zh'){
 const d=Object.fromEntries(['goals','categories','modules','moduleSkillLinks','skills','actions','executionLogs','effortUnits','contributionLinks','rescueLogs','stateCheckIns','contextLogs','decisionResults','patternMemory','scheduleBlocks','rawCaptures'].map(k=>[k,[]]));
 d.settings={selectedThemeId:theme==='dark'?'deepWork':'cleanFocus',language,onboardingCompleted:true,onboardingVersion:1};
 d.categories=[{id:'qa-goal',name:'完成作品集项目',description:'把一个问题，做成可讲清楚的方案',goalType:'project',createdAt:+now,outcomeCriteria:[{id:'qa-criterion',title:'形成可讲解的项目方案',metricType:'binary',weight:1,completed:false},{id:'qa-criterion-2',title:'完成反馈走查并记录修改',metricType:'binary',weight:1,completed:false}]}];
 d.modules=[{id:'qa-module',goalId:'qa-goal',name:'问题与方案',createdAt:+now}];
 d.skills=[{id:'qa-skill',name:'原型设计',color:'#527fa2',createdAt:+now,totalXP:0,dailyTargetMinutes:45,goalId:'qa-goal',categoryId:'qa-goal',moduleId:'qa-module',taskType:'creative_building',requiredState:'deep_focus'}];
 d.moduleSkillLinks=[{id:'qa-link',goalId:'qa-goal',moduleId:'qa-module',skillId:'qa-skill',createdAt:+now}];
 d.scheduleBlocks=scenario==='S3'?[]:[{id:'qa-block',title:'原型设计',date,startTime:'09:30',endTime:'10:15',plannedMinutes:45,linkedGoalId:'qa-goal',linkedSkillId:'qa-skill',taskType:'creative_building',flexibility:'movable',rigidity:'low',status:'planned',createdAt:+now,source:'manual'},{id:'qa-block-2',title:'阅读与笔记',date,startTime:'14:00',endTime:'14:30',plannedMinutes:30,taskType:'light_work',flexibility:'movable',rigidity:'low',status:'planned',createdAt:+now,source:'manual'}];
 d.executionLogs=[{id:'qa-log',date:'2026-11-04',createdAt:'2026-11-04T07:00:00Z',title:'原型设计',linkedGoalId:'qa-goal',linkedSkillId:'qa-skill',durationMinutes:35,quality:4,note:'完成首页原型结构，记录走查反馈。',source:'manual',dataProvenance:provenance}];
 if(scenario!=='S1'){
  const state=buildStateCheckIn({answers:{energy:scenario==='S2'?2:4,tension:scenario==='S2'?5:2,openLoops:scenario==='S2'?'many':undefined},kind:'check_in',now,date,signals:{timeBlock:'morning',missing:['sleep','resting_hr','hrv','training','schedule_load']},allCheckIns:[]});
  d.stateCheckIns=[{...state,id:'qa-state',createdAt:iso,dataProvenance:provenance}];
  if(scenario==='S5')d.stateCheckIns[0].stateLayer.choice={actionId:'brain_dump',at:new Date(+now-25*60000).toISOString(),slot:'primary',randomized:false};
 }
 return d;
}
(async()=>{
const browser=await chromium.launch({channel:'chrome',headless:true});const results=[];let errors=[];
try{
for(const theme of ['light','dark'])for(const s of ['S1','S2','S3','S4','S5']){
 const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'Australia/Sydney',locale:'zh-CN'});const page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));await page.clock.setFixedTime(now);
 await page.goto(url);await page.evaluate(d=>{localStorage.clear();localStorage.setItem('questlife.v1',JSON.stringify(d));},seed(s,theme));await page.reload();await page.getByTestId('v5-today').waitFor();
 if(s==='S4')await page.getByTestId('v5-main-action').getByRole('button',{name:'开始',exact:true}).click();
 await page.waitForTimeout(500);
 const bounds=await page.getByTestId('v5-main-action').boundingBox();const nav=await page.getByRole('tablist').boundingBox();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
 assert.equal(overflow,false,`${s} ${theme}: horizontal overflow`);
 for(const tab of await page.getByRole('tab').all())assert.ok(await tab.locator('[dir="auto"]').evaluate(el=>el.getBoundingClientRect().height>=parseFloat(getComputedStyle(el).lineHeight)),`${s} ${theme}: clipped nav label`);
 assert.ok(bounds.y+bounds.height<=nav.y,`${s} ${theme}: first screen action behind navigation (${bounds.y+bounds.height}/${nav.y})`);
 await page.screenshot({path:path.join(out,`${s}-${theme}.png`)});
 results.push({scenario:s,theme,overflow,mainBottom:bounds.y+bounds.height,navTop:nav.y});
 if(s==='S1'){
  await page.getByRole('button',{name:'记一下',exact:true}).click();await page.getByRole('button',{name:/^精力 4 /}).click();await page.getByRole('button',{name:/^紧绷 2 /}).click();
  await page.getByRole('button',{name:'不是这样',exact:true}).waitFor();await page.reload();await page.getByRole('button',{name:'不是这样',exact:true}).waitFor();results.push({flow:'3-click check-in and reload',passed:true});
  for(const [tab,file] of [['目标','Goals'],['日程','Schedule'],['分析','Insights'],['个人','Personal']]){await page.getByRole('tab',{name:tab,exact:true}).click();await page.waitForTimeout(600);await page.screenshot({path:path.join(out,`${file}-${theme}.png`)});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${file} overflow`);}
  await page.getByRole('tab',{name:'今日',exact:true}).click();await page.getByRole('button',{name:'随手记一句…'}).click();await page.waitForTimeout(300);await page.screenshot({path:path.join(out,`Capture-${theme}.png`)});await page.keyboard.press('Escape');
 }
 if(s==='S2'&&theme==='light'){
  await page.getByRole('button',{name:'按建议调整',exact:true}).click();await page.waitForTimeout(300);await page.screenshot({path:path.join(out,'Plan-preview.png')});
  const btn=page.getByRole('button',{name:'确认重排',exact:true});
  await btn.last().click();await page.waitForTimeout(700);
  const d=await page.evaluate(()=>JSON.parse(localStorage.getItem('questlife.v1')));assert.ok(d.decisionResults.some(r=>r.decisionEpisode?.status==='APPLIED'));
  results.push({flow:'preview-confirm-apply',passed:true});
  await page.reload();await page.getByRole('button',{name:'撤销',exact:true}).click();await page.waitForTimeout(500);
  const undone=await page.evaluate(()=>JSON.parse(localStorage.getItem('questlife.v1')));
  assert.equal(undone.scheduleBlocks.find(b=>b.id==='qa-block').startTime,'09:30');
  assert.ok(undone.decisionResults.some(r=>r.decisionEpisode?.status==='PROPOSED'&&r.decisionEpisode.undoState?.usedAt));
  await page.reload();assert.equal(await page.getByRole('button',{name:'撤销',exact:true}).count(),0);results.push({flow:'reload-undo-reload',passed:true});
 }
 if(s==='S4'&&theme==='light'){
  await page.getByTestId('v5-main-action').getByRole('button',{name:'完成',exact:true}).click();
  await page.getByLabel('实际分钟',{exact:true}).fill('32');await page.getByRole('button',{name:'差不多',exact:true}).click();await page.locator('.v5-finish textarea').fill('隔离验收：保存实际执行与难度');
  await page.screenshot({path:path.join(out,'Finish-light.png')});
  await page.getByRole('button',{name:'记录进展',exact:true}).last().click();await page.waitForTimeout(700);
  const finished=await page.evaluate(()=>JSON.parse(localStorage.getItem('questlife.v1')));
  const log=finished.executionLogs.find(l=>l.note==='隔离验收：保存实际执行与难度');
  assert.ok(log,'finish saved');assert.equal(log.durationMinutes,32);assert.equal(log.structuredData.calibration.subjectiveDifficulty,'same');
  await page.reload();assert.ok(await page.getByText('隔离验收：保存实际执行与难度',{exact:true}).count());results.push({flow:'start-finish-calibration-reload',passed:true});
 }
 await context.close();
}
for(const [width,height,language,theme] of [[375,667,'zh','light'],[393,852,'en','dark'],[1280,900,'zh','light']]){
 const c=await browser.newContext({viewport:{width,height},timezoneId:'Australia/Sydney'});const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.clock.setFixedTime(now);
 await p.goto(url);await p.evaluate(d=>{localStorage.clear();localStorage.setItem('questlife.v1',JSON.stringify(d));},seed('S1',theme,language));await p.reload();await p.getByTestId('v5-today').waitFor();
 for(const [tab,file] of (language==='zh'?[['今日','Today'],['目标','Goals'],['日程','Schedule'],['分析','Insights'],['个人','Personal']]:[['Today','Today'],['Goals','Goals'],['Schedule','Schedule'],['Analysis','Insights'],['Personal','Personal']])){
  await p.getByRole('tab',{name:tab,exact:true}).click();await p.waitForTimeout(400);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width} ${file} overflow`);await p.screenshot({path:path.join(out,`${file}-${width}-${language}-${theme}.png`)});
 }
 results.push({flow:`${width}x${height} ${language} ${theme} five tabs`,passed:true});await c.close();
}
assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({environment:'Chrome desktop emulation; isolated QA data; no device proof',results,errors},null,2));console.log(JSON.stringify({passed:results.length,out}));
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
