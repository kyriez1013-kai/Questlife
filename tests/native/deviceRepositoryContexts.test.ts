import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {KeyValueStorage} from '../../src/platform/contracts';
import {DeviceRepository,DEVICE_DATA_KEY,DEVICE_PENDING_KEY} from '../../src/platform/deviceRepository';

function webLocks() {
  let tail:Promise<unknown>=Promise.resolve();let active=0;const names:string[]=[];
  return {names,get active(){return active;},request<T>(name:string,options:{mode:string},run:()=>Promise<T>) {
    names.push(name);assert.equal(options.mode,'exclusive');
    const job=tail.then(async()=>{assert.equal(active,0);active++;try{return await run();}finally{active--;}});
    tail=job.catch(()=>undefined);return job;
  }};
}
async function browser(locks:unknown,run:()=>Promise<void>) {
  const originalNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator');const originalDocument=Object.getOwnPropertyDescriptor(globalThis,'document');
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{locks}});Object.defineProperty(globalThis,'document',{configurable:true,value:{}});
  try {await run();} finally {
    if(originalNavigator)Object.defineProperty(globalThis,'navigator',originalNavigator);else Reflect.deleteProperty(globalThis,'navigator');
    if(originalDocument)Object.defineProperty(globalThis,'document',originalDocument);else Reflect.deleteProperty(globalThis,'document');
  }
}
const wrapper=(values:Map<string,string>,locks:ReturnType<typeof webLocks>):KeyValueStorage=>({getItem:async key=>{assert.equal(locks.active,1);return values.get(key)??null;},setItem:async(key,value)=>{assert.equal(locks.active,1);values.set(key,value);}});

test('independent web storage wrappers lock the whole latest-read/update transaction',async()=>{
  const locks=webLocks();await browser(locks,async()=>{
    const values=new Map<string,string>();const a=new DeviceRepository(wrapper(values,locks)),b=new DeviceRepository(wrapper(values,locks));
    let release!:()=>void;let entered!:()=>void;const started=new Promise<void>(r=>{entered=r;});
    const first=a.update(async d=>{entered();await new Promise<void>(r=>{release=r;});return {...d,notificationQuietHours:{startMinute:1320,endMinute:480}};});await started;
    let secondEntered=false;const second=b.update(d=>{secondEntered=true;assert.equal(d.notificationQuietHours?.startMinute,1320);return {...d,notificationsEnabled:true};});
    await Promise.resolve();await Promise.resolve();assert.equal(secondEntered,false);release();await first;await second;
    const data=await a.read();assert.equal(data.notificationsEnabled,true);assert.equal(data.notificationQuietHours?.startMinute,1320);assert.ok(locks.names.every(name=>name===DEVICE_PENDING_KEY));
  });
});
test('another web context cannot read partial bucket/metadata writes while owner holds lock',async()=>{
  const locks=webLocks();await browser(locks,async()=>{
    const values=new Map<string,string>();const a=new DeviceRepository(wrapper(values,locks)),b=new DeviceRepository(wrapper(values,locks));
    let release!:()=>void;let entered!:()=>void;const started=new Promise<void>(r=>{entered=r;});
    const writing=a.update(async d=>{entered();await new Promise<void>(r=>{release=r;});return {...d,notificationsEnabled:true};});await started;
    let finished=false;const reading=b.read().then(d=>{finished=true;return d;});await Promise.resolve();await Promise.resolve();assert.equal(finished,false);
    release();await writing;assert.equal((await reading).notificationsEnabled,true);
  });
});
test('next web context recovers interrupted journal before merging its own mutation',async()=>{
  const locks=webLocks();await browser(locks,async()=>{
    const values=new Map<string,string>();const failing=wrapper(values,locks);const write=failing.setItem;
    failing.setItem=async(key,value)=>{if(key===DEVICE_DATA_KEY)throw new Error('TEST_CONTEXT_CRASH');return write(key,value);};
    await assert.rejects(new DeviceRepository(failing).update(d=>({...d,notificationQuietHours:{startMinute:100,endMinute:200}})),/TEST_CONTEXT_CRASH/);
    const b=new DeviceRepository(wrapper(values,locks));await b.update(d=>{assert.equal(d.notificationQuietHours?.startMinute,100);return {...d,notificationsEnabled:true};});
    const result=await b.read();assert.equal(result.notificationsEnabled,true);assert.equal(result.notificationQuietHours?.endMinute,200);assert.equal(values.get(DEVICE_PENDING_KEY),'null');
  });
});
test('browser without origin lock fails closed before reading, replaying or mutating storage',async()=>{
  await browser(undefined,async()=>{
    let accesses=0;const storage:KeyValueStorage={getItem:async()=>{accesses++;return null;},setItem:async()=>{accesses++;}};const repo=new DeviceRepository(storage);
    await assert.rejects(repo.read(),/device_cross_context_lock_unavailable/);await assert.rejects(repo.update(d=>({...d,notificationsEnabled:true})),/device_cross_context_lock_unavailable/);assert.equal(accesses,0);
  });
});
test('lock request failure is not silently downgraded to unsafe in-process writes',async()=>{
  await browser({request:async()=>{throw new Error('TEST_LOCK_DENIED');}},async()=>{
    let accesses=0;const repo=new DeviceRepository({getItem:async()=>{accesses++;return null;},setItem:async()=>{accesses++;}});
    await assert.rejects(repo.update(d=>({...d,notificationsEnabled:true})),/TEST_LOCK_DENIED/);assert.equal(accesses,0);
  });
});
