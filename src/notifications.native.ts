import type {Skill} from './types';
import {deviceRepository,notifications} from './platform/services';
const service=()=>notifications('en');
export async function requestPermission(){return await service().requestPermission()==='granted';}
export async function cancelSkillReminder(id:string){await service().cancel(`questlife:skill:${id}`);}
export async function scheduleSkillReminder(skill:Skill){
  if(!skill.reminderEnabled){await cancelSkillReminder(skill.id);return;}
  // Explicit skill edits authorize this reminder; the coordinator alone schedules it.
  if(await requestPermission())await deviceRepository.update(d=>({...d,notificationsEnabled:true}));
}
// Foreground scheduling reads Store skills; launching must never request permissions.
export async function rescheduleAllReminders(_skills:Skill[]){}
export async function cancelAllReminders(){const d=await deviceRepository.read();for(const id of d.scheduledNotificationIds??[])await service().cancel(id);await deviceRepository.update(s=>({...s,notificationsEnabled:false,scheduledNotificationIds:[]}));}
