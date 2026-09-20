import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {AppData,DecisionResult,ExecutionLog,ScheduleBlock} from '../../src/types';
import type {KeyValueStorage,NotificationRequest} from '../../src/platform/contracts';
import {createDecisionEpisode,type DecisionCandidateActionV1,type DecisionEpisodeV1} from '../../src/adaptive-decision/decisionEpisode';
import {createDecisionPlanPatch,scheduleBlockWithDuration} from '../../src/adaptive-decision/planPatch';
import {DeviceRepository,emptyDeviceData} from '../../src/platform/deviceRepository';
import {createNotificationService} from '../../src/platform/notifications/NotificationService';
import {notificationTargetEnabled,planLocalNotifications,syncNotificationPlan} from '../../src/platform/notifications/planner';

const now=new Date('2026-09-02T12:00:00Z');
const appliedAt='2026-09-02T09:00:00Z';
const block:ScheduleBlock={id:'TEST_BLOCK',title:'TEST',date:'2026-09-02',startTime:'19:00',endTime:'20:00',plannedMinutes:60,taskType:'strength_training',flexibility:'movable',rigidity:'medium',status:'planned',createdAt:1};
const patch={...createDecisionPlanPatch({id:'TEST_PATCH',date:block.date,generatedAt:appliedAt,before:[block],after:[scheduleBlockWithDuration(block,30)]}),appliedAt};
const action:DecisionCandidateActionV1={id:'TEST_ACTION',kind:'shorten',titleKey:'test',descriptionKey:'test',exactEffectKey:'test',protectsKey:'test',feasibilityKey:'test',uncertaintyKey:'test',reversible:true,outcomeHorizon:'two_hours',outcomeFields:['state','fatigue','task_result','usefulness'],evidenceItemIds:[],constraintIds:[block.id],planPatch:patch,policyTrace:[]};
const episode:DecisionEpisodeV1={...createDecisionEpisode({id:'TEST_EPISODE',subjectKind:'owner',questionType:'training_recovery',targetId:block.id,now:appliedAt,timezone:'Asia/Shanghai',observationWindowStart:appliedAt}),status:'APPLIED',selectedActionId:action.id,candidateActions:[action],appliedPlanPatch:patch};
const execution:ExecutionLog={id:'TEST_EXECUTION',date:block.date,linkedScheduleBlockId:block.id,source:'timer',durationMinutes:30,createdAt:'2026-09-02T11:30:00Z',dataProvenance:{schemaVersion:'questlife.data.provenance.v1',origin:'OWNER_OBSERVED',confirmation:'USER_ENTERED',captureMethod:'timer',recordedAt:'2026-09-02T11:30:00Z',availableAt:'2026-09-02T11:30:00Z',eventStartAt:'2026-09-02T11:00:00Z',eventEndAt:'2026-09-02T11:30:00Z',timezone:'Asia/Shanghai'}};
const result=(value:DecisionEpisodeV1):DecisionResult=>({id:'TEST_RESULT',createdAt:value.createdAt,mode:'daily_brief',trigger:'manual',source:'legacy_fallback',schemaVersion:value.contractVersion,headlineInsight:'',evidenceBasis:'mixed',decisionEpisode:value});
const data=(logs:ExecutionLog[]=[execution],value=episode)=>({skills:[],scheduleBlocks:[block],decisionResults:[result(value)],executionLogs:logs} as unknown as AppData);
const device=()=>({...emptyDeviceData(),notificationsEnabled:true,reminderKinds:{decision_followup:true}});
const intent={kind:'decision_followup' as const,entityId:'TEST_RESULT'};
const legacy:DecisionEpisodeV1={...episode,followUpPlan:{id:'TEST_LEGACY',horizon:'two_hours',dueAt:'2026-09-02T14:00:00Z',requiredFields:['state'],status:'pending'}};
const snooze:NotificationRequest={id:'questlife:snooze:TEST_RESULT',...intent,at:'2026-09-02T12:10:00Z',title:'TEST_PRIVATE',body:'TEST_PRIVATE'};

test('notification planner derives future follow-up from real execution without reopening owner sheet',()=>{
  const app=data();const before=JSON.stringify(app);const plan=planLocalNotifications(app,device(),now,'en');
  assert.equal(plan.length,1);assert.equal(plan[0].at,'2026-09-02T13:30:00.000Z');assert.equal(JSON.stringify(app),before);
});
test('legacy apply-timed plan without actual execution cannot schedule or accept actions',()=>{
  assert.deepEqual(planLocalNotifications(data([],legacy),device(),now,'en'),[]);
  assert.equal(notificationTargetEnabled(data([],legacy),device(),intent,now),false);
});
test('corrected execution moves both base reminder and snooze past the new horizon',()=>{
  const corrected={...execution,dataProvenance:{...execution.dataProvenance!,eventEndAt:'2026-09-02T12:30:00Z',recordedAt:'2026-09-02T12:30:00Z',availableAt:'2026-09-02T12:30:00Z'}};
  const plan=planLocalNotifications(data([corrected],legacy),{...device(),snoozedNotifications:[{...snooze,at:'2026-09-02T13:10:00Z'}]},new Date('2026-09-02T13:00:00Z'),'en');
  assert.ok(plan.length>0);for(const request of plan)assert.ok(Date.parse(request.at)>=Date.parse('2026-09-02T14:30:00Z'));
});
test('deleted, ambiguous and unrelated execution invalidate scheduled and snoozed follow-ups',()=>{
  for(const logs of [[{...execution,dataProvenance:{...execution.dataProvenance!,deleted:true}}],[execution,{...execution,id:'TEST_AMBIGUOUS'}],[{...execution,linkedScheduleBlockId:'OTHER'}]]){
    assert.deepEqual(planLocalNotifications(data(logs,legacy),{...device(),snoozedNotifications:[snooze]},now,'en'),[]);
    assert.equal(notificationTargetEnabled(data(logs,legacy),device(),intent,now),false);
  }
});
test('revalidated due target accepts action even when stored plan was absent',()=>{
  const at=new Date('2026-09-02T14:00:00Z');assert.equal(notificationTargetEnabled(data(),device(),intent,at),true);
  assert.deepEqual(planLocalNotifications(data(),device(),at,'en'),[]);
});
test('closed and synthetic episodes cannot retain otherwise matching legacy reminders',()=>{
  for(const value of [{...legacy,status:'CLOSED' as const},{...legacy,provenance:{...legacy.provenance,syntheticOnly:true}},{...legacy,provenance:{...legacy.provenance,origin:'QA_TEST' as const}}]){
    assert.equal(notificationTargetEnabled(data([execution],value),device(),intent,now),false);
    assert.deepEqual(planLocalNotifications(data([execution],value),device(),now,'en'),[]);
  }
});
test('execution-derived horizon still goes through device local quiet-hour normalization',()=>{
  const due=new Date('2026-09-02T13:30:00Z');const hour=due.getHours();
  const plan=planLocalNotifications(data(),{...device(),notificationQuietHours:{startMinute:hour*60,endMinute:(hour+1)%24*60}},now,'en');
  assert.equal(plan.length,1);assert.equal(new Date(plan[0].at).getMinutes(),0);assert.equal(new Date(plan[0].at).getHours(),(hour+1)%24);
});
test('reconciliation cancels existing legacy follow-up after execution invalidation',async()=>{
  const values=new Map<string,string>();const storage:KeyValueStorage={getItem:async key=>values.get(key)??null,setItem:async(key,value)=>{values.set(key,value);}};
  const repo=new DeviceRepository(storage);const id='questlife:followup:TEST_RESULT';await repo.update(d=>({...d,...device(),scheduledNotificationIds:[id]}));
  const cancelled:string[]=[];const service=createNotificationService({permission:async()=> 'granted',schedule:async r=>r.id,cancel:async id=>{cancelled.push(id);},subscribe:()=>()=>{},token:async()=>null});
  await syncNotificationPlan(repo,service,planLocalNotifications(data([],legacy),device(),now,'en'));
  assert.deepEqual(cancelled,[id]);assert.deepEqual((await repo.read()).scheduledNotificationIds,[]);
});
