import type {AppData} from '../../types';
import type {DeviceData} from '../deviceRepository';
import {DeviceRepository} from '../deviceRepository';
import type {NotificationRequest,NotificationService} from '../contracts';
import {nativeCopy as c} from '../nativeI18n';

export function planLocalNotifications(data:AppData,device:DeviceData,now:Date,lang:'zh'|'en'):NotificationRequest[] {
  if(!device.notificationsEnabled)return [];
  const requests:NotificationRequest[]=[];const kinds=device.reminderKinds??{};
  const add=(r:NotificationRequest)=>{if(Date.parse(r.at)>now.getTime())requests.push(r);};
  for(const skill of data.skills){
    if(!skill.reminderEnabled || skill.reminderHour==null || skill.reminderMinute==null)continue;
    const at=new Date(now);at.setHours(skill.reminderHour,skill.reminderMinute,0,0);if(at<=now)at.setDate(at.getDate()+1);
    add({id:`questlife:skill:${skill.id}`,kind:'skill_reminder',entityId:skill.id,at:at.toISOString(),title:'QuestLife',body:c(lang,'open'),daily:{hour:skill.reminderHour,minute:skill.reminderMinute}});
  }
  if(kinds.accepted_block) data.scheduleBlocks.filter(b=>b.status==='planned' && !b.id.startsWith('generated')).forEach(b=>{const at=new Date(`${b.date}T${b.startTime}:00`);if(Number.isFinite(at.getTime()))add({id:`questlife:block:${b.id}`,entityId:b.id,kind:'accepted_block',at:at.toISOString(),title:'QuestLife',body:c(lang,'accepted_block')});});
  if(kinds.decision_followup)data.decisionResults.forEach(result=>{
    const episode=result.decisionEpisode;const plan=episode?.followUpPlan;
    if(episode?.subject.kind==='owner' && !episode.provenance.syntheticOnly && plan?.status==='pending')add({id:`questlife:followup:${result.id}`,entityId:result.id,kind:'decision_followup',at:plan.dueAt,title:'QuestLife',body:c(lang,'followup')});
  });
  for(const [kind,hour] of [['morning_state',8],['end_of_day',21]] as const){
    if(!kinds[kind])continue;const at=new Date(now);at.setHours(hour,0,0,0);if(at<=now)at.setDate(at.getDate()+1);
    add({id:`questlife:${kind}`,kind,at:at.toISOString(),title:'QuestLife',body:c(lang,kind==='morning_state'?'stateCheck':'review')});
  }
  device.snoozedNotifications?.filter(r=>r.kind==='skill_reminder'||kinds[r.kind]).forEach(add);
  return requests.sort((a,b)=>a.at.localeCompare(b.at)||a.id.localeCompare(b.id)).slice(0,24);
}
export async function syncNotificationPlan(repo:DeviceRepository,service:NotificationService,requests:NotificationRequest[]) {
  const state=await repo.read();const desired=new Set(requests.map(r=>r.id));
  for(const id of state.scheduledNotificationIds??[])if(!desired.has(id))await service.cancel(id);
  const scheduled=[...(state.scheduledNotificationIds??[]).filter(id=>desired.has(id))];
  for(const request of requests){await service.reschedule(request);if(!scheduled.includes(request.id))scheduled.push(request.id);
    // Persist each successful ID so an interrupted run can still cancel it.
    await repo.update(d=>({...d,scheduledNotificationIds:[...scheduled]}));
  }
  await repo.update(d=>({...d,scheduledNotificationIds:scheduled,notificationError:undefined}));
}
