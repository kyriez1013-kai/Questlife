import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,mkdirSync,readFileSync,readdirSync,lstatSync} from 'node:fs';
import {tmpdir} from 'node:os';import path from 'node:path';
const root=process.cwd();const project='questlife-v1-release';const id='prj_fVGFV7DzxfkLqbBpSo8P7NH9oqxX';const team='team_gzSW9d2JQQ2apxZFPg92CFbM';const scope='kyrie-z-s-projects';const fixed='https://questlife-v1-release.vercel.app';
const run=(cmd,args,cwd=root,env=process.env)=>{console.log(`> ${cmd} ${args.join(' ')}`);const p=spawnSync(cmd,args,{cwd,env,encoding:'utf8',maxBuffer:30*1024*1024,timeout:20*60000});if(p.stdout)process.stdout.write(p.stdout);if(p.stderr)process.stderr.write(p.stderr);if(p.error||p.status!==0)throw Error(`${cmd} failed (${p.status}): ${p.error?.message||'see output'}`);return (cmd==='vercel'&&args.includes('inspect')?p.stdout+p.stderr:p.stdout).trim();};
if(run('git',['status','--porcelain']))throw Error('Commit this worktree before deployment. Nothing uploaded.');
if(run('git',['branch','--show-current'])!=='feature/v5-ui')throw Error('Only feature/v5-ui may deploy this candidate.');
const commit=run('git',['rev-parse','HEAD']);
const inspected=run('vercel',['project','inspect',project,'--scope',scope,'--non-interactive']);
if(!inspected.includes(id)||!inspected.includes(project))throw Error('Candidate identity was not verified.');
// Public compiled endpoint, never environment-variable values or secrets.
const html=await(await fetch(fixed)).text();const hosts=new Set();
for(const match of html.matchAll(/<script[^>]+src="([^"]+)"/g)){const js=await(await fetch(new URL(match[1],fixed))).text();for(const h of js.matchAll(/https:\/\/([a-z0-9]+)\.supabase\.co/g))hosts.add(h[1]);}
if(hosts.size!==1||!hosts.has('gttcoocfkqwvsqfwxpyo'))throw Error('Candidate public data binding mismatch; no deployment.');
console.log('Verified candidate-only Supabase binding.');
run('npx',['tsc','--noEmit']);run('npm',['run','build'],root,{...process.env,EXPO_NO_DOTENV:'1'});
const scratch=mkdtempSync(path.join(tmpdir(),'questlife-v5-deploy-'));const upload=path.join(scratch,'source');mkdirSync(upload);
const roots=['src','api','public','assets','plugins','index.ts','App.tsx','App.web.tsx','package.json','package-lock.json','app.json','tsconfig.json','react-native.config.js','vercel.json','.vercelignore','scripts/patch-metro-image-input.cjs'];
const forbidden=p=>/(^|\/)\.env[^/]*|(^|\/)docs\/quant(\/|$)|QUESTLIFE_QUANT_UI_CONTRACT\.md|\.(p8|p12|jks|mobileprovision|keystore)$/.test(p);
const files=run('git',['ls-tree','-r','--name-only',commit,'--',...roots]).split('\n').filter(Boolean);
if(files.some(forbidden))throw Error('Upload manifest contains a restricted file.');
writeFileSync(path.join(scratch,'upload-manifest.txt'),files.join('\n'));
run('git',['archive','--format=tar',`--output=${path.join(scratch,'committed.tar')}`,commit,'--',...roots]);
run('tar',['-xf',path.join(scratch,'committed.tar'),'-C',upload]);
const walk=dir=>readdirSync(dir).flatMap(name=>{const f=path.join(dir,name),s=lstatSync(f);if(s.isSymbolicLink())throw Error('Symlink refused in upload');return s.isDirectory()?walk(f):[f];});
for(const f of walk(upload)){if(forbidden(path.relative(upload,f)))throw Error('Restricted extracted path');if(/\.(tsx?|jsx?|json|html)$/.test(f)){const body=readFileSync(f,'utf8');if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|sk-(?:proj-)?[A-Za-z0-9_-]{40,}|sb_secret_[A-Za-z0-9_-]{20,}/.test(body))throw Error(`Potential secret: ${path.relative(upload,f)}; value not printed`);}}
const version={product:'QuestLife V5 candidate',commit,builtAt:new Date().toISOString(),migration:'shortcut inbox requires manual candidate SQL installation'};
writeFileSync(path.join(upload,'public/version.json'),JSON.stringify(version,null,2));
const worker=path.join(upload,'public/sw.js');writeFileSync(worker,readFileSync(worker,'utf8').replace("'questlife-shell-v1'",`'questlife-v5-${commit.slice(0,12)}'`));
mkdirSync(path.join(upload,'.vercel'));writeFileSync(path.join(upload,'.vercel/project.json'),JSON.stringify({projectId:id,orgId:team,projectName:project}));
const context=run('vercel',['project','inspect','--scope',scope,'--non-interactive'],upload);if(!context.includes(id))throw Error('Upload context mismatch');
const deployed=run('vercel',['deploy',upload,'--prod','--yes','--project',id,'--scope',scope,'--meta',`sourceCommit=${commit}`],upload);
const urls=[...deployed.matchAll(/https:\/\/[^\s]+\.vercel\.app/g)].map(m=>m[0]);if(!urls.length)throw Error('Deployment URL missing');const deployment=urls.at(-1);
const details=run('vercel',['inspect',deployment,'--scope',scope],upload);
let verified=false;for(let i=0;i<12;i++){const r=await fetch(`${fixed}/version.json?v=${commit}`,{cache:'no-store'});try{if(r.ok&&(await r.json()).commit===commit){verified=true;break;}}catch{}await new Promise(r=>setTimeout(r,5000));}
if(!verified)throw Error('Fixed candidate URL did not return the source version');
const result={...version,url:fixed,deployment,deploymentId:details.match(/dpl_[A-Za-z0-9]+/)?.[0]??null,uploadManifest:path.join(scratch,'upload-manifest.txt')};writeFileSync(path.join(scratch,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));console.log(`Receipt: ${scratch}/result.json`);
