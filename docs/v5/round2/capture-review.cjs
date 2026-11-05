/* Run from the repo root after deploy:candidate. Only normal UI; no storage injection. */
const {createRequire}=require('node:module');
const fs=require('node:fs/promises');
const path=require('node:path');
const req=createRequire('/Users/kyrie/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=req('playwright');
const sharp=req('sharp');
const root=process.cwd(),out=path.join(root,'docs/v5/round2');
const url='https://questlife-v1-release.vercel.app/';
const tabs=[['Today','今日','today'],['Goals','目标','goals'],['Schedule','日程','schedule'],['Insights','分析','analysis'],['Personal','个人','personal']];
const selectors={Today:['.v5-date','.v5-capture','.v5-strip','.v5-main','[role=tablist]'],Goals:['.v5-page-head','.v5-segments','.v5-empty','[role=tablist]'],Schedule:['.v5-schedule-head','.v5-segments','.v5-week','.v5-timeline-card','.v5-unplaced','[role=tablist]'],Insights:['.v5-analysis-top','.v5-segments','.v5-chart-panel','.v5-summary','.v5-insight','.v5-analysis-tools','[role=tablist]'],Personal:['.v5-profile','.v5-personal-group','.v5-health','[role=tablist]']};

async function compare(reference,actual,name){
  const a=await sharp(reference).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const b=await sharp(actual).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  if(a.info.width!==393||b.info.width!==393||a.info.height!==852||b.info.height!==852)throw Error('Unexpected screenshot geometry');
  await sharp({create:{width:786,height:852,channels:4,background:'#ffffff'}}).composite([{input:reference,left:0,top:0},{input:actual,left:393,top:0}]).png().toFile(path.join(out,`pair-${name}.png`));
  const pixels=Buffer.alloc(a.data.length);
  for(let i=0;i<pixels.length;i++)pixels[i]=Math.round((a.data[i]+b.data[i])/2);
  await sharp(pixels,{raw:{width:393,height:852,channels:4}}).png().toFile(path.join(out,`overlay-${name}.png`));
}

(async()=>{
  const browser=await chromium.launch({headless:true,channel:'chrome'});
  try{
    const context=await browser.newContext({viewport:{width:393,height:852},locale:'zh-CN',timezoneId:'Australia/Sydney',colorScheme:'light'});
    const page=await context.newPage();page.setDefaultTimeout(10000);
    const errors=[],warnings=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(['warning','error'].includes(m.type()))warnings.push({type:m.type(),message:m.text()})});
    await page.goto(url,{waitUntil:'domcontentloaded'});
    await page.getByText('开始（约 30 秒）',{exact:true}).click();
    await page.getByText('稍后',{exact:true}).click();
    const version=await page.evaluate(async()=>{const r=await fetch('/version.json',{cache:'no-store'});return r.json()});
    const reference=await browser.newPage({viewport:{width:2200,height:1100}});
    await reference.goto('file://'+path.join(root,'docs/v5/prototype/index.html'));
    await reference.locator('#scenario').selectOption('first');
    const evidence={url,version,startedAt:new Date().toISOString(),browser:await browser.version(),device:'Chrome desktop mobile viewport; not a physical iPhone',data:'Fresh anonymous visitor; onboarding skipped; no seeded records',pages:[],errors,warnings};
    for(const [name,label,id] of tabs){
      await page.getByRole('tab',{name:label,exact:true}).click();
      await page.getByTestId('v5-'+(name==='Insights'?'insights':id)).waitFor({state:'visible'});
      await page.waitForTimeout(name==='Insights'?3500:300);
      const actual=path.join(out,`after-${name}-empty.png`),ref=path.join(out,`reference-${name}-first.png`);
      await page.screenshot({path:actual});await reference.locator('#'+id).screenshot({path:ref});
      await compare(ref,actual,name+'-empty');
      const body=await page.locator('body').innerText();
      const measurements=await page.evaluate(ss=>ss.map(selector=>{const el=[...document.querySelectorAll(selector)].find(e=>e.getBoundingClientRect().width>0);if(!el)return {selector,missing:true};const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {selector,x:r.x,y:r.y,width:r.width,height:r.height,padding:s.padding,radius:s.borderRadius,shadow:s.boxShadow,background:s.backgroundImage,blur:s.backdropFilter}}),selectors[name]);
      evidence.pages.push({name,label,url:page.url(),screenshot:path.basename(actual),reference:path.basename(ref),overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),containsQALabel:/QA Candidate Backup Roundtrip|Disposable release verification/.test(body),body,measurements});
    }
    await page.getByRole('button',{name:/外观与语言/}).click();
    await page.getByRole('button',{name:'深色',exact:true}).click();
    await page.getByRole('button',{name:'关闭',exact:true}).click();
    await page.getByRole('tab',{name:'今日',exact:true}).click();
    await page.screenshot({path:path.join(out,'after-Today-dark-empty.png')});
    evidence.dark={source:'Real Personal appearance control',screenshot:'after-Today-dark-empty.png',reference:'No original dark frame exists. No false pixel comparison.'};
    const legacy=await context.newPage();await legacy.goto(url+'?v5_ui=0',{waitUntil:'domcontentloaded'});await legacy.getByRole('tab',{name:'日程',exact:true}).click();
    evidence.rollback={url:legacy.url(),v5ScheduleVisible:await legacy.getByTestId('v5-schedule').isVisible(),body:(await legacy.locator('body').innerText()).slice(0,1000)};
    await page.setViewportSize({width:1280,height:900});await page.getByRole('tab',{name:'日程',exact:true}).click();await page.screenshot({path:path.join(out,'after-Schedule-desktop.png')});
    evidence.desktop={width:1280,height:900,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),screenshot:'after-Schedule-desktop.png'};
    evidence.finishedAt=new Date().toISOString();
    await fs.writeFile(path.join(out,'deployed-browser-evidence.json'),JSON.stringify(evidence,null,2));
    console.log(JSON.stringify({version,pages:evidence.pages.map(p=>({name:p.name,overflow:p.overflow,containsQALabel:p.containsQALabel})),rollback:evidence.rollback,errors,warnings},null,2));
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
