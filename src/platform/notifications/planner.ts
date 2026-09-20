import type {AppData} from '../../types';
import type {DeviceData} from '../deviceRepository';
import {DeviceRepository} from '../deviceRepository';
import type {NotificationRequest,NotificationService,QuickActionIntent} from '../contracts';
import {nativeCopy as c} from '../nativeI18n';
import {outsideQuietHours} from './quietHours';
import {markDecisionFollowUpDue} from '../../adaptive-decision/followUp';
import {isNotificationKind} from './NotificationService';

function followUpPlan(data:AppData,entityId:string|undefined,now:Date) {
  const episode=data.decisionResults.find(result=>result.id===entityId)?.decisionEpisode;
  if (!episode || episode.subject.kind!=='owner' || episode.provenance.syntheticOnly || !['APPLIED','FOLLOW_UP_DUE'].includes(episode.status)) return undefined;
  const plan=markDecisionFollowUpDue(episode,now.toISOString(),data.executionLogs).followUpPlan;
  return plan && ['pending','due'].includes(plan.status) ? plan : undefined;
}

export function planLocalNotifications(data:AppData,device:DeviceData,now:Date,lang:'zh'|'en'):NotificationRequest[] {
  if(!device.notificationsEnabled)return [];
  const requests:NotificationRequest[]=[];const kinds=device.reminderKinds??{};
  const add=(r:NotificationRequest)=>{
    if (!Number.isFinite(Date.parse(r.at)) || Date.parse(r.at)<=now.getTime()) return;
    const allowed=outsideQuietHours(r,device.notificationQuietHours);
    if (allowed && Date.parse(allowed.at)>now.getTime()) requests.push(allowed);
  };
  for(const skill of data.skills){
    if(kinds.skill_reminder === false || !skill.reminderEnabled || !Number.isInteger(skill.reminderHour) || !Number.isInteger(skill.reminderMinute) || skill.reminderHour! < 0 || skill.reminderHour! > 23 || skill.reminderMinute! < 0 || skill.reminderMinute! > 59)continue;
    if(skill.reminderHour == null || skill.reminderMinute == null)continue;
    const at=new Date(now);at.setHours(skill.reminderHour,skill.reminderMinute,0,0);if(at<=now)at.setDate(at.getDate()+1);
    add({id:`questlife:skill:${skill.id}`,kind:'skill_reminder',entityId:skill.id,at:at.toISOString(),title:'QuestLife',body:c(lang,'open'),daily:{hour:skill.reminderHour,minute:skill.reminderMinute}});
  }
  if(kinds.accepted_block) data.scheduleBlocks.filter(b=>b.status==='planned' && !b.id.startsWith('generated')).forEach(b=>{const at=new Date(`${b.date}T${b.startTime}:00`);if(Number.isFinite(at.getTime()))add({id:`questlife:block:${b.id}`,entityId:b.id,kind:'accepted_block',at:at.toISOString(),title:'QuestLife',body:c(lang,'accepted_block')});});
  if(kinds.decision_followup)data.decisionResults.forEach(result=>{
    const plan=followUpPlan(data,result.id,now);
    if(plan?.status==='pending')add({id:`questlife:followup:${result.id}`,entityId:result.id,kind:'decision_followup',at:plan.dueAt,title:'QuestLife',body:c(lang,'followup')});
  });
  for(const [kind,hour] of [['morning_state',8],['end_of_day',21]] as const){
    if(!kinds[kind])continue;const at=new Date(now);at.setHours(hour,0,0,0);if(at<=now)at.setDate(at.getDate()+1);
    add({id:`questlife:${kind}`,kind,at:at.toISOString(),title:'QuestLife',body:c(lang,kind==='morning_state'?'stateCheck':'review')});
  }
  device.snoozedNotifications?.filter(r=>notificationTargetEnabled(data,device,r,now)).forEach(r=>{
    const plan=r.kind==='decision_followup'?followUpPlan(data,r.entityId,now):undefined;
    const at=plan && Date.parse(plan.dueAt)>Date.parse(r.at)?plan.dueAt:r.at;
    add({...r,at,title:'QuestLife',body:c(lang,'open'),daily:undefined});
  });
  return [...new Map(requests.map(r=>[r.id,r])).values()].sort((a,b)=>a.at.localeCompare(b.at)||a.id.localeCompare(b.id)).slice(0,24);
}
export function notificationTargetEnabled(data: AppData, device: DeviceData, intent: Pick<QuickActionIntent,'kind'|'entityId'>, now=new Date()) {
  if (!isNotificationKind(intent.kind)) return false;
  if (!device.notificationsEnabled) return false;
  if (intent.kind === 'skill_reminder') return device.reminderKinds?.skill_reminder !== false && data.skills.some(s=>s.id===intent.entityId && s.reminderEnabled);
  if (!device.reminderKinds?.[intent.kind]) return false;
  if (intent.kind === 'accepted_block') return data.scheduleBlocks.some(b=>b.id===intent.entityId && b.status==='planned' && !b.id.startsWith('generated'));
  if (intent.kind === 'decision_followup') return !!followUpPlan(data,intent.entityId,now);
  return true;
}
export async function syncNotificationPlan(repo:DeviceRepository,service:NotificationService,requests:NotificationRequest[],isCurrent:()=>boolean=()=>true,now:()=>number=()=>Date.now()) {
  if (!isCurrent()) return;
  const future=(request:NotificationRequest)=>Number.isFinite(Date.parse(request.at)) && Date.parse(request.at)>now();
  const state=await repo.read();const desired=new Set(requests.filter(future).map(r=>r.id));
  const failures:unknown[]=[];
  const cancel=async(id:string)=>{
    try {
      await service.cancel(id);
      await repo.update(d=>({...d,scheduledNotificationIds:(d.scheduledNotificationIds??[]).filter(value=>value!==id)}));
    } catch(error) {failures.push(error);}
  };
  for(const id of state.scheduledNotificationIds??[])if(!desired.has(id)) {
    if (!isCurrent()) return;
    await cancel(id);
  }
  for(const request of requests){
    if (!isCurrent()) return;
    if (!future(request)) {if(desired.has(request.id))await cancel(request.id);continue;}
    try {
      // Register intent before OS scheduling so a crash cannot leave an untracked ID.
      await repo.update(d=>isCurrent()?({...d,scheduledNotificationIds:[...new Set([...(d.scheduledNotificationIds??[]),request.id])]}):d);
      if (!isCurrent()) return;
      if (!future(request)) {await cancel(request.id);continue;}
      await service.reschedule(request);
      if (!isCurrent()) {await cancel(request.id);return;}
    } catch(error) {
      // Time may cross the deadline during an awaited permission/storage call.
      // An expired request is cleanup, not a reason to abandon later reminders.
      if (!future(request)) await cancel(request.id);
      else failures.push(error);
    }
  }
  await repo.update(d=>isCurrent()?({...d,notificationError:failures.length?'notification_schedule_failed':undefined}):d);
  if(failures.length)throw failures[0];
}
