import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {AppData,Skill} from '../../src/types';
import type {NotificationRequest} from '../../src/platform/contracts';
import {emptyDeviceData} from '../../src/platform/deviceRepository';
import {normalizeQuietHours,outsideQuietHours} from '../../src/platform/notifications/quietHours';
import {planLocalNotifications} from '../../src/platform/notifications/planner';

const request=(hour:number,minute=0,kind:NotificationRequest['kind']='morning_state'):NotificationRequest=>({id:'questlife:TEST_QUIET',kind,at:new Date(2026,8,20,hour,minute).toISOString(),title:'TEST',body:'TEST'});
const overnight={startMinute:22*60,endMinute:8*60};
test('quiet settings absent or equal endpoints are disabled',()=>{
  assert.equal(normalizeQuietHours(undefined),null);assert.equal(normalizeQuietHours({startMinute:0,endMinute:0}),null);
  assert.equal(outsideQuietHours(request(23),undefined)?.at,request(23).at);
});
test('invalid and fractional quiet minutes fail closed',()=>{
  for(const setting of [{startMinute:-1,endMinute:60},{startMinute:0,endMinute:1440},{startMinute:.5,endMinute:60},{startMinute:NaN,endMinute:60},{}]){
    assert.equal(normalizeQuietHours(setting),'invalid');assert.equal(outsideQuietHours(request(12),setting),null);
  }
});
test('overnight reminder is deferred to next local day, not UTC arithmetic',()=>{
  const at=new Date(outsideQuietHours(request(23),overnight)!.at);assert.equal(at.getDate(),21);assert.equal(at.getHours(),8);assert.equal(at.getMinutes(),0);
});
test('after-midnight reminder defers within the same local day',()=>{
  const at=new Date(outsideQuietHours(request(4),overnight)!.at);assert.equal(at.getDate(),20);assert.equal(at.getHours(),8);
});
test('quiet start is inclusive and end is exclusive',()=>{
  assert.notEqual(outsideQuietHours(request(22),overnight)?.at,request(22).at);assert.equal(outsideQuietHours(request(8),overnight)?.at,request(8).at);
});
test('same-day quiet window defers exactly to its end',()=>{
  const at=new Date(outsideQuietHours(request(13),{startMinute:12*60,endMinute:14*60+15})!.at);assert.equal(at.getDate(),20);assert.equal(at.getHours(),14);assert.equal(at.getMinutes(),15);
});
test('quiet scheduled-block start is suppressed rather than delivered late',()=>assert.equal(outsideQuietHours(request(23,0,'accepted_block'),overnight),null));
test('daily reminder adjusts both occurrence and native repeating trigger',()=>{
  const result=outsideQuietHours({...request(23,0,'skill_reminder'),daily:{hour:23,minute:0}},overnight)!;
  assert.deepEqual(result.daily,{hour:8,minute:0});assert.equal(new Date(result.at).getDate(),21);
});
test('planner applies quiet hours to skills and snoozes through the same policy',()=>{
  const data={skills:[{id:'S',reminderEnabled:true,reminderHour:23,reminderMinute:0} as Skill],scheduleBlocks:[],decisionResults:[]} as unknown as AppData;
  const device={...emptyDeviceData(),notificationsEnabled:true,notificationQuietHours:overnight,reminderKinds:{morning_state:true},snoozedNotifications:[request(23)]};
  const plan=planLocalNotifications(data,device,new Date(2026,8,20,20),'en');assert.equal(plan.length,3);
  for (const row of plan) assert.equal(new Date(row.at).getHours(),8);
});
test('DST transition uses local quiet endpoint',()=>{
  for (const date of [new Date(2026,2,7,23),new Date(2026,9,31,23)]) {
    const at=new Date(outsideQuietHours({...request(23),at:date.toISOString()},overnight)!.at);
    assert.equal(at.getHours(),8);assert.equal(at.getDate(),date.getDate()===31?1:8);assert.ok(at>date);
  }
});
test('quiet endpoint in repeated DST hour never moves a notification into the past',()=>{
  if (process.env.TZ!=='America/New_York') return;
  const secondOccurrence='2026-11-01T01:15:00-05:00';
  const result=outsideQuietHours({...request(1),at:secondOccurrence},{startMinute:30,endMinute:90})!;
  assert.equal(result.at,'2026-11-01T06:30:00.000Z');assert.ok(Date.parse(result.at)>Date.parse(secondOccurrence));
});
test('corrupt snooze time cannot block valid reminders during reconciliation',()=>{
  const data={skills:[],scheduleBlocks:[],decisionResults:[]} as unknown as AppData;
  const plan=planLocalNotifications(data,{...emptyDeviceData(),notificationsEnabled:true,reminderKinds:{morning_state:true},snoozedNotifications:[{...request(23),at:'INVALID'}]},new Date(2026,8,20,20),'en');
  assert.equal(plan.length,1);assert.equal(plan[0].id,'questlife:morning_state');
});
