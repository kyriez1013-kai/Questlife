import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { SyncEngineV2 } from '../../src/sync-v2/engine';
import { emptySyncState, entityKey, type Mutation, type Projection, type PushResult, type RemoteRow, type SyncState, type SyncTransport } from '../../src/sync-v2/contracts';
import { validEntity } from '../../src/sync-v2/registry';
import { AuthService } from '../../src/sync-v2/auth';
import { localChanges, projectAppData } from '../../src/sync-v2/projection';
import { DEFAULT_DATA } from '../../src/types';
const clone = <T,>(x:T):T => JSON.parse(JSON.stringify(x));
const row = (id:string, name='name'):Projection => ({entityType:'categories',entityId:id,payload:{id,name,createdAt:1}});
class Server implements SyncTransport {
  rows=new Map<string,RemoteRow>(); receipts=new Map<string,PushResult>();seq=0;offline=false;loseAck=false;
  async push(user:string, mutations:Mutation[]) {
    if(this.offline)throw Error('offline');
    const results:PushResult[]=mutations.map(m=>{
      const receipt=this.receipts.get(user+m.mutationId);if(receipt)return clone(receipt);
      const key=user+entityKey(m.entityType,m.entityId);const prior=this.rows.get(key);
      const result:PushResult=prior&&prior.revision!==m.baseRevision?{mutationId:m.mutationId,status:'conflict',remote:clone(prior)}:{mutationId:m.mutationId,status:'applied',remote:{user_id:user,entity_type:m.entityType,entity_id:m.entityId,payload:m.payload??null,schema_version:1,revision:m.baseRevision+1,change_seq:++this.seq,origin_device_id:m.deviceId,client_mutated_at:m.createdAt,server_updated_at:m.createdAt,deleted_at:m.operation==='delete'?m.createdAt:null}};
      if(result.status==='applied')this.rows.set(key,clone(result.remote!));this.receipts.set(user+m.mutationId,clone(result));return result;
    });
    if(this.loseAck){this.loseAck=false;throw Error('ack lost');}return results;
  }
  async pull(user:string,cursor:number,limit:number) {if(this.offline)throw Error('offline');return clone([...this.rows.values()].filter(r=>r.user_id===user&&r.change_seq>cursor).sort((a,b)=>a.change_seq-b.change_seq).slice(0,limit));}
}
function client(server:Server, device='web:a') {
  let state=emptySyncState();const visible=new Map<string,Projection>();let failApply=false;
  const disk={read:async()=>clone(state),write:async(s:SyncState)=>{state=clone(s);},apply:async(changes:Projection[])=>{if(failApply){failApply=false;throw Error('crash');}changes.forEach(c=>{if(c.payload)visible.set(c.entityId,c);else visible.delete(c.entityId);});}};
  const make=()=>new SyncEngineV2(disk,server,device,randomUUID);
  return {engine:make(),make,disk,visible,crash:()=>{failApply=true;},state:()=>state};
}
test('two devices create, edit, delete and repeat tombstone',async()=>{
  const server=new Server(),a=client(server),b=client(server,'ios:b');await a.engine.attach('owner',[]);await b.engine.attach('owner',[]);
  await a.engine.commit([row('one')]);await a.engine.sync(true);await b.engine.sync(true);assert.equal(b.visible.get('one')?.payload?.name,'name');
  await b.engine.commit([row('one','edited')]);await b.engine.sync(true);await a.engine.sync(true);assert.equal(a.visible.get('one')?.payload?.name,'edited');
  await a.engine.commit([{...row('one'),payload:null}]);await a.engine.sync(true);await b.engine.sync(true);assert.equal(b.visible.size,0);
  await a.engine.commit([{...row('one'),payload:null}]);await a.engine.sync(true);await b.engine.sync(true);assert.equal(b.visible.size,0);
});
test('offline mutation survives restart',async()=>{const s=new Server(),a=client(s);await a.engine.attach('u',[]);s.offline=true;await a.engine.commit([row('one')]);await a.engine.sync(true);assert.equal(a.engine.status,'offline');a.engine=a.make();await a.engine.attach('u',[]);s.offline=false;await a.engine.sync(true);assert.equal(a.state().outbox.length,0);assert.equal(s.rows.size,1);});
test('lost ACK retries immutable mutation without revision inflation',async()=>{const s=new Server(),a=client(s);await a.engine.attach('u',[]);await a.engine.commit([row('one')]);s.loseAck=true;await a.engine.sync(true);assert.equal(a.state().outbox.length,1);await a.engine.sync(true);assert.equal(a.state().outbox.length,0);assert.equal([...s.rows.values()][0].revision,1);});
test('per entity create edit edit delete remains ordered',async()=>{const s=new Server(),a=client(s);await a.engine.attach('u',[]);await a.engine.commit([row('one'),row('one','2'),row('one','3'),{...row('one'),payload:null}]);await a.engine.sync(true);assert.equal(a.state().outbox.length,0);assert.equal([...s.rows.values()][0].revision,4);assert.ok([...s.rows.values()][0].deleted_at);});
test('concurrent local edit keeps payload in conflict; remote remains canonical',async()=>{const s=new Server(),a=client(s),b=client(s);await a.engine.attach('u',[]);await b.engine.attach('u',[]);await a.engine.commit([row('one')]);await a.engine.sync(true);await b.engine.sync(true);await a.engine.commit([row('one','A')]);await b.engine.commit([row('one','B')]);await b.engine.sync(true);await a.engine.sync(true);assert.equal(a.engine.status,'conflict');assert.equal(a.state().conflicts[0].local[0].payload?.name,'A');assert.equal(a.visible.get('one')?.payload?.name,'B');await a.engine.resolve(a.state().conflicts[0].id,'local');await a.engine.sync(true);await b.engine.sync(true);assert.equal(b.visible.get('one')?.payload?.name,'A');});
test('first account merges disjoint and conflicts same id; no local loss',async()=>{const s=new Server(),a=client(s),b=client(s);await a.engine.attach('u',[]);await a.engine.commit([row('same','remote'),row('remote')]);await a.engine.sync(true);const local=[row('same','local'),row('local')].map(c=>({...c,payload:c.payload!}));await b.engine.attach('u',local);await b.engine.sync(true);assert.equal(b.state().conflicts.length,1);assert.equal(s.rows.size,3);});
test('first account identical rows dedupe without revision change',async()=>{const s=new Server(),a=client(s),b=client(s);await a.engine.attach('u',[]);await a.engine.commit([row('one')]);await a.engine.sync(true);await b.engine.attach('u',[{...row('one'),payload:row('one').payload!}]);await b.engine.sync(true);assert.equal(b.state().conflicts.length,0);assert.equal([...s.rows.values()][0].revision,1);});
test('account switch fails closed and signout keeps local data',async()=>{const s=new Server(),a=client(s);await a.engine.attach('A',[]);await a.engine.commit([row('one')]);a.engine.detach();await a.engine.sync(true);assert.equal(s.rows.size,0);await assert.rejects(a.engine.attach('B',[]),/account_switch/);assert.equal(a.state().outbox.length,1);assert.equal(a.state().ownerId,'A');});
test('replay crash between journal and projection without duplicate outbox',async()=>{const s=new Server(),a=client(s);await a.engine.attach('u',[]);a.crash();await assert.rejects(a.engine.commit([row('one')]));assert.equal(a.state().pendingApply.length,1);a.engine=a.make();await a.engine.recover();assert.equal(a.visible.size,1);assert.equal(a.state().pendingApply.length,0);assert.equal(a.state().outbox.length,1);});
test('remote apply crash recovers cursor and projection together',async()=>{const s=new Server(),a=client(s),b=client(s);await a.engine.attach('u',[]);await b.engine.attach('u',[]);await a.engine.commit([row('one')]);await a.engine.sync(true);b.crash();await b.engine.sync(true);assert.equal(b.state().pendingApply.length,1);b.engine=b.make();await b.engine.recover();await b.engine.attach('u',[]);await b.engine.sync(true);assert.equal(b.visible.size,1);assert.equal(b.state().outbox.length,0);});
test('malformed remote payload quarantined without crashing hydration',async()=>{const s=new Server(),a=client(s);await a.engine.attach('u',[]);await a.engine.commit([row('one')]);await a.engine.sync(true);[...s.rows.values()][0].payload={id:'one',name:17};const b=client(s);await b.engine.attach('u',[]);await b.engine.sync(true);assert.equal(b.visible.size,0);assert.equal(b.state().quarantine.length,1);});
test('out of order remote response cannot advance cursor',async()=>{const s=new Server(),a=client(s);await a.engine.attach('u',[]);await a.engine.commit([row('a'),row('b')]);await a.engine.sync(true);const b=client(s);const pull=s.pull.bind(s);s.pull=async(...args)=> (await pull(...args)).reverse();await b.engine.attach('u',[]);await b.engine.sync(true);assert.equal(b.state().cursor,0);});
test('provenance firewall rejects nested synthetic and QA',()=>{for(const fields of [{dataProvenance:{origin:'QA_TEST'}},{decisionEpisode:{provenance:{syntheticOnly:true}}},{trigger:'debug'},{isFixture:true}])assert.equal(validEntity('categories','one',{...row('one').payload,...fields}),false);assert.equal(validEntity('categories','qa-record',{id:'qa-record',name:'x',createdAt:1}),false);});
test('absent rows during retention are not deletions; explicit delete is',()=>{const base={...DEFAULT_DATA,categories:[{id:'one',name:'n',createdAt:1}]};assert.equal(localChanges(base,DEFAULT_DATA,false).length,0);assert.equal(localChanges(base,DEFAULT_DATA,true)[0].payload,null);});
test('remote projection idempotent and preserves settings',()=>{const d={...DEFAULT_DATA,settings:{language:'en' as const}};const a=projectAppData(d,[row('one')]);assert.deepEqual(projectAppData(a,[row('one')]),a);assert.equal(a.settings.language,'en');});
test('Auth abstraction request verify restore signout, no token API',async()=>{let session:{userId:string,email:string}|null=null;let email='';const a=new AuthService({session:async()=>session,subscribe:()=>()=>{},requestOtp:async e=>{email=e;},verifyOtp:async e=>{session={userId:'u',email:e};},signOut:async()=>{session=null;}});assert.equal(await a.getSession(),null);await assert.rejects(a.requestOtp('invalid'));await a.requestOtp('user@example.test');assert.equal(email,'user@example.test');await assert.rejects(a.verifyOtp(email,'x'));await a.verifyOtp(email,'123456');assert.equal(await a.getUserId(),'u');await a.signOut();assert.equal(await a.getUserId(),null);});
test('scale 1000 / 10000 synthetic isolated clients, no owner storage',async()=>{
  for(const count of [1000,10000]){
    const s=new Server(),a=client(s),b=client(s);await a.engine.attach('scale-local-only',[]);await b.engine.attach('scale-local-only',[]);
    const changes=Array.from({length:count},(_,i)=>row(`scale-${i}`));
    const applyStart=performance.now();await a.engine.commit(changes);const localApply=performance.now()-applyStart;
    await a.engine.sync(true);const hydrateStart=performance.now();await b.engine.sync(true);const hydrate=performance.now()-hydrateStart;
    await a.engine.commit(changes.slice(0,100).map(c=>({...c,payload:{...c.payload!,name:'updated'}})));
    const pushStart=performance.now();await a.engine.sync(true);const push100=performance.now()-pushStart;
    const pullStart=performance.now();await b.engine.sync(true);const incremental=performance.now()-pullStart;
    assert.equal(b.visible.size,count);console.log(JSON.stringify({count,localApplyMs:localApply,hydrateMs:hydrate,push100Ms:push100,incrementalMs:incremental,transport:'in-memory deterministic',ownerWrites:0}));
  }
});
