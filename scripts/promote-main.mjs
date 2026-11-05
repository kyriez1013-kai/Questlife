import {spawnSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createInterface} from 'node:readline/promises';

const mode=process.argv[2];
if(!['promote','rollback'].includes(mode))throw Error('Expected promote or rollback');
const root=process.cwd(),scope='kyrie-z-s-projects',team='team_gzSW9d2JQQ2apxZFPg92CFbM';
const candidate={name:'questlife-v1-release',id:'prj_fVGFV7DzxfkLqbBpSo8P7NH9oqxX'};
const archive={name:'questlife-alpha',id:'prj_d6GHMLCs8rR2pUDENVlqS6GDa3xJ'};
const domain='ky11ai.com',fixed='https://questlife-v1-release.vercel.app',tag='archive/main-before-v5';
const steps=mode==='promote'?[
  'Verify the accepted candidate version and both Vercel projects.',
  'Clone GitHub into a temporary directory; merge accepted V5 into remote release, then main. Stop on conflicts.',
  `Create ${tag} at the original remote main. Never force-push.`,
  'Disconnect automatic Git deployment on both Vercel projects to preserve the tested committed-archive deployments.',
  'Atomically push the archive tag, release/questlife-v1 and main. No database migration or data copy.',
  `Move ${domain} to ${candidate.name}; retain the old .vercel.app archive. Verify the accepted version.`,
  'Keep explicit deploy:candidate as the deployment path; Git pushes alone will not deploy.',
]:[
  `Verify ${tag}; in a temporary clone create a new main commit restoring its tree. No history rewrite.`,
  'Disconnect Git auto-deployment before pushing the rollback commit; release remains unchanged.',
  `Move ${domain} back to ${archive.name}; verify the archived deployment serves the domain.`,
];
console.log('PREPARED ONLY. Promotion requires Kyrie to have explicitly said: 确认互换.');
steps.forEach((s,i)=>console.log(`${i+1}. ${s}`));
if(process.argv.includes('--plan'))process.exit(0);
if(!process.stdin.isTTY)throw Error('Interactive confirmation required; no changes made.');
const rl=createInterface({input:process.stdin,output:process.stdout});
const answer=await rl.question('After the required product approval, type yes to execute these steps: ');rl.close();
if(answer!=='yes'){console.log('Cancelled.');process.exit(0);}
const run=(cmd,args,cwd=root,quiet=false)=>{const r=spawnSync(cmd,args,{cwd,encoding:'utf8',maxBuffer:20*1024*1024,timeout:180000});if(!quiet){process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');}if(r.error||r.status!==0)throw Error(`${cmd} failed; stopped without automatic conflict resolution. Temporary clone is retained.`);return (cmd==='vercel'?r.stdout+r.stderr:r.stdout).trim();};
if(run('git',['status','--porcelain'],root,true))throw Error('Commit the candidate worktree first.');
if(run('git',['branch','--show-current'],root,true)!=='feature/v5-ui')throw Error('Run from feature/v5-ui.');
const scratch=mkdtempSync(path.join(tmpdir(),'questlife-v5-main-'));console.log(`Recovery directory: ${scratch}`);
const projectDirs=new Map();
for(const p of [archive,candidate]){
  const dir=path.join(scratch,p.name);mkdirSync(path.join(dir,'.vercel'),{recursive:true});
  writeFileSync(path.join(dir,'.vercel/project.json'),JSON.stringify({orgId:team,projectId:p.id,projectName:p.name}));
  const inspected=run('vercel',['project','inspect','--scope',scope,'--non-interactive'],dir);
  if(!inspected.includes(p.id))throw Error('Project mismatch');projectDirs.set(p.name,dir);
}
const remote=run('git',['remote','get-url','origin'],root,true);
if(!/^(https:\/\/github\.com\/|git@github\.com:)[\w.-]+\/[\w.-]+(?:\.git)?$/.test(remote))throw Error('Unrecognized or credential-bearing origin refused.');
const clone=path.join(scratch,'repository');
run('git',['clone','--filter=blob:none','--no-checkout',remote,clone]);
for(const key of ['user.name','user.email']){const value=run('git',['config',key],root,true);run('git',['config',key,value],clone,true);}
const before=run('git',['rev-parse','origin/main'],clone,true);
writeFileSync(path.join(scratch,'before.json'),JSON.stringify({mode,main:before,domain,at:new Date().toISOString()},null,2));
let accepted;
if(mode==='promote'){
  const response=await fetch(`${fixed}/version.json`,{cache:'no-store'});if(!response.ok)throw Error('Candidate version unavailable');
  accepted=(await response.json()).commit;if(!/^[0-9a-f]{40}$/.test(accepted||''))throw Error('Candidate commit missing');
  run('git',['merge-base','--is-ancestor',accepted,'HEAD'],root,true);
  // Documentation-only commits after deployment are allowed, runtime changes are not.
  const changed=run('git',['diff','--name-only',accepted,'HEAD','--','src','api','public','assets','plugins','App.tsx','App.web.tsx','index.ts','package.json','package-lock.json','vercel.json'],root,true);
  if(changed)throw Error('Current runtime differs from the deployed candidate. Deploy and obtain approval first.');
  if(run('git',['tag','--list',tag],clone,true))throw Error('Archive tag already exists; inspect the previous promotion rather than overwrite it.');
  run('git',['fetch',root,'feature/v5-ui:refs/remotes/accepted/v5'],clone);
  run('git',['checkout','-b','release/questlife-v1','origin/release/questlife-v1'],clone);
  run('git',['merge','--no-ff','accepted/v5','-m','Merge approved QuestLife V5 candidate'],clone);
  run('git',['checkout','-b','main','origin/main'],clone);
  run('git',['merge','--no-ff','release/questlife-v1','-m','Promote approved QuestLife V5'],clone);
  // Remote divergence must not silently replace the runtime that passed acceptance.
  if(run('git',['diff','--name-only',accepted,'HEAD','--','src','api','public','assets','plugins','App.tsx','App.web.tsx','index.ts','package.json','package-lock.json','vercel.json'],clone,true))throw Error('Merged runtime differs from accepted candidate; review and redeploy before promotion. Nothing pushed.');
  run('git',['tag','-a',tag,before,'-m','Archive main before approved V5 promotion'],clone);
}else{
  run('git',['rev-parse',`${tag}^{commit}`],clone,true);
  run('git',['checkout','-b','main','origin/main'],clone);
  run('git',['restore',`--source=${tag}`,'--staged','--worktree','.'],clone);
  run('git',['commit','--allow-empty','-m','Restore archived main after V5 rollback'],clone);
}
for(const p of [archive,candidate])run('vercel',['git','disconnect','--scope',scope,'--non-interactive'],projectDirs.get(p.name));
run('git',mode==='promote'?['push','--atomic','origin',`refs/tags/${tag}`,'release/questlife-v1','main']:['push','origin','main'],clone);
const target=mode==='promote'?candidate:archive;
run('vercel',['domains','add',domain,target.name,'--force','--scope',scope,'--non-interactive'],projectDirs.get(target.name));
let verified=false;
for(let i=0;i<12;i++){
  try{
    if(mode==='promote'){const r=await fetch(`https://${domain}/version.json?verify=${accepted}`,{cache:'no-store'});verified=r.ok&&(await r.json()).commit===accepted;}
    else{const r=await fetch(`https://${domain}/`,{cache:'no-store'});const old=await fetch('https://questlife-alpha-orpin.vercel.app/',{cache:'no-store'});verified=r.ok&&old.ok&&(await r.text())===(await old.text());}
  }catch{}
  if(verified)break;await new Promise(r=>setTimeout(r,5000));
}
writeFileSync(path.join(scratch,'result.json'),JSON.stringify({mode,main:run('git',['rev-parse','HEAD'],clone,true),accepted,domain,verified},null,2));
if(!verified)throw Error(`Domain verification incomplete. Preserve ${scratch}; rollback: npm run rollback:main`);
console.log(`Verified https://${domain}/. Receipt: ${scratch}/result.json. Rollback: npm run rollback:main`);
