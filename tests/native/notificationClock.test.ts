import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {AppData,ScheduleBlock} from '../../src/types';
import type {KeyValueStorage,NotificationRequest} from '../../src/platform/contracts';
import {DeviceRepository,emptyDeviceData} from '../../src/platform/deviceRepository';
import {createNotificationService,type NotificationDriver} from '../../src/platform/notifications/NotificationService';
import {planLocalNotifications,syncNotificationPlan} from '../../src/platform/notifications/planner';

const instant=(hour:number,minute=0)=>new Date(2026,8,20,hour,minute).getTime();
const request=(hour:number,minute=30):NotificationRequest=>({id:`questlife:TEST_CLOCK:${hour}`,kind:'morning_state',at:new Date(instant(hour,minute)).toISOString(),title:'QuestLife',body:'TEST'});
function setup(time=instant(9)) {
  const values=new Map<string,string>();const storage:KeyValueStorage={getItem:async key=>values.get(key)??null,setItem:async(key,value)=>{values.set(key,value);}};
  const calls:string[]=[];let clock=time;
  const driver:NotificationDriver={permission:async()=> 'granted',schedule:async r=>{calls.push(`schedule:${r.id}`);return r.id;},cancel:async id=>{calls.push(`cancel:${id}`);},subscribe:()=>()=>{},token:async()=>null};
  const now=()=>clock;
  return {repo:new DeviceRepository(storage),driver,service:createNotificationService(driver,now),calls,now,advance:(at:number)=>{clock=at;}};
}
test('foreground replan after an earlier block starts includes only the remaining future block',async()=>{
  const block=(hour:number):ScheduleBlock=>({id:`TEST_BLOCK:${hour}`,title:'TEST',date:'2026-09-20',startTime:`${String(hour).padStart(2,'0')}:30`,endTime:`${String(hour+1).padStart(2,'0')}:00`,plannedMinutes:30,taskType:'admin',flexibility:'fixed',rigidity:'high',status:'planned',createdAt:1});
  const data={skills:[],scheduleBlocks:[block(8),block(10)],decisionResults:[]} as unknown as AppData;
  const device={...emptyDeviceData(),notificationsEnabled:true,reminderKinds:{accepted_block:true}};
  assert.equal(planLocalNotifications(data,device,new Date(instant(8)),'en').length,2);
  const fresh=planLocalNotifications(data,device,new Date(instant(9)),'en');assert.equal(fresh.length,1);assert.equal(fresh[0].entityId,'TEST_BLOCK:10');
  const x=setup();await syncNotificationPlan(x.repo,x.service,fresh,()=>true,x.now);assert.ok(x.calls.includes('schedule:questlife:block:TEST_BLOCK:10'));
});
test('stale queued expired request is cancelled without blocking a later reminder',async()=>{
  const x=setup();const expired=request(8),future=request(10);await x.repo.update(d=>({...d,scheduledNotificationIds:[expired.id]}));
  await syncNotificationPlan(x.repo,x.service,[expired,future],()=>true,x.now);
  assert.equal(x.calls.includes(`schedule:${expired.id}`),false);assert.ok(x.calls.includes(`cancel:${expired.id}`));assert.ok(x.calls.includes(`schedule:${future.id}`));assert.deepEqual((await x.repo.read()).scheduledNotificationIds,[future.id]);
});
test('deadline crossing during permission read does not schedule expired notification or abort future one',async()=>{
  const x=setup(instant(8,29));const early=request(8),later=request(10);
  x.driver.permission=async()=>{x.advance(instant(8,31));return 'granted';};
  await syncNotificationPlan(x.repo,x.service,[early,later],()=>true,x.now);
  assert.equal(x.calls.includes(`schedule:${early.id}`),false);assert.ok(x.calls.includes(`schedule:${later.id}`));assert.deepEqual((await x.repo.read()).scheduledNotificationIds,[later.id]);
});
test('deadline crossing during old OS schedule cancellation cannot recreate the expired request',async()=>{
  const x=setup(instant(8,29));const early=request(8),later=request(10);
  x.driver.cancel=async()=>{x.advance(instant(8,31));};
  await syncNotificationPlan(x.repo,x.service,[early,later],()=>true,x.now);
  assert.equal(x.calls.includes(`schedule:${early.id}`),false);assert.ok(x.calls.includes(`schedule:${later.id}`));assert.deepEqual((await x.repo.read()).scheduledNotificationIds,[later.id]);
});
test('one real schedule error remains visible but cannot prevent later future requests',async()=>{
  const x=setup();const first=request(10),second=request(12);
  x.driver.schedule=async r=>{if(r.id===first.id)throw new Error('TEST_OS');x.calls.push(`schedule:${r.id}`);return r.id;};
  await assert.rejects(syncNotificationPlan(x.repo,x.service,[first,second],()=>true,x.now),/TEST_OS/);
  assert.ok(x.calls.includes(`schedule:${second.id}`));assert.deepEqual((await x.repo.read()).scheduledNotificationIds,[first.id,second.id]);assert.equal((await x.repo.read()).notificationError,'notification_schedule_failed');
});
test('failed expired cancellation retains retry ID and still schedules future reminders',async()=>{
  const x=setup();const expired=request(8),later=request(10);await x.repo.update(d=>({...d,scheduledNotificationIds:[expired.id]}));
  x.driver.cancel=async id=>{if(id===expired.id)throw new Error('TEST_CANCEL');};
  await assert.rejects(syncNotificationPlan(x.repo,x.service,[expired,later],()=>true,x.now),/TEST_CANCEL/);
  assert.ok(x.calls.includes(`schedule:${later.id}`));assert.deepEqual((await x.repo.read()).scheduledNotificationIds,[expired.id,later.id]);
});
