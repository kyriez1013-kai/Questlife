import type { AppData, RawCapture } from '../types';
export type QuickCaptureSuggestion = { id:string; label:string; skillId?:string; scheduleBlockId?:string; reasons:Array<'scheduled_now'|'recurrence'|'time_of_day'|'active_goal'|'recent'> };
export function quickCaptureDraft(data:AppData,suggestion:QuickCaptureSuggestion):RawCapture['parsed']|null {
  const skill=data.skills.find(row=>row.id===suggestion.skillId);
  if(!skill)return null;
  return {type:'misc',fields:{},crossLinks:[],insight:{zh:'',en:''},matchedSkillIds:[skill.id],entries:[{skillName:skill.name,matchedSkillId:skill.id,progressType:skill.progressType??'time_based',fields:{}}]};
}
export function QuickCaptureSuggestionEngineV1(input:{data:AppData;now:Date;activeGoalId?:string;context?:string}):QuickCaptureSuggestion[] {
  const {data,now}=input;
  const date=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const minute=now.getHours()*60+now.getMinutes();
  const minutes=(v:string)=>{const [h,m]=v.split(':').map(Number);return h*60+m;};
  const logs=(data.executionLogs??[]).filter(log=>!log.dataProvenance?.deleted && Date.parse(log.createdAt)<=now.getTime() && (!log.linkedSkillId || data.skills.some(s=>s.id===log.linkedSkillId)));
  const entries=data.skills.map(skill=>{
    const matching=logs.filter(log=>log.linkedSkillId===skill.id);
    const recentCaptures=(data.rawCaptures??[]).filter(capture=>!capture.dataProvenance?.deleted && capture.parseStatus==='done' && Date.parse(capture.createdAt)<=now.getTime() && capture.parsed?.matchedSkillIds?.includes(skill.id));
    const block=data.scheduleBlocks.find(b=>b.linkedSkillId===skill.id && b.date===date && b.status!=='skipped' && b.status!=='completed' && minutes(b.startTime)<=minute && minutes(b.endTime)>minute);
    const similarTime=matching.filter(log=>log.startTime && Math.floor(minutes(log.startTime)/60)===now.getHours()).length;
    const active=!!input.activeGoalId && data.moduleSkillLinks.some(link=>link.skillId===skill.id && data.modules.some(m=>m.id===link.moduleId && m.goalId===input.activeGoalId));
    const recent=Math.max(0,...matching.map(log=>Date.parse(log.createdAt)||0),...recentCaptures.map(capture=>Date.parse(capture.createdAt)||0));
    const reasons:QuickCaptureSuggestion['reasons']=[...(block?['scheduled_now' as const]:[]),...(matching.length>1?['recurrence' as const]:[]),...(similarTime?['time_of_day' as const]:[]),...(active?['active_goal' as const]:[]),...(recent?['recent' as const]:[])];
    return {id:skill.id,label:skill.name,skillId:skill.id,scheduleBlockId:block?.id,reasons,rank:[Number(!!block),matching.length,similarTime,Number(active),recent]};
  }).filter(row=>row.reasons.length>0);
  entries.sort((a,b)=>{for(let i=0;i<a.rank.length;i++){if(a.rank[i]!==b.rank[i])return b.rank[i]-a.rank[i];}return a.id.localeCompare(b.id);});
  return entries.slice(0,3).map(({rank,...row})=>row);
}
