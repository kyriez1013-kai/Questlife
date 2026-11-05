import type { AppData, Category, Skill } from '../types';

export function goalPresentation(data:AppData, goal:Category, now:Date) {
  const skillIds=new Set([
    ...data.skills.filter(s=>s.categoryId===goal.id).map(s=>s.id),
    ...(data.moduleSkillLinks??[]).filter(l=>l.goalId===goal.id).map(l=>l.skillId),
  ]);
  const cutoff=+now-7*86400000;
  const logs=data.executionLogs.filter(l=>!l.dataProvenance?.deleted && Date.parse(l.createdAt)>=cutoff && Date.parse(l.createdAt)<=+now && (l.linkedGoalId===goal.id || (l.linkedSkillId&&skillIds.has(l.linkedSkillId))));
  const next=data.scheduleBlocks.filter(b=>b.status!=='completed'&&b.status!=='skipped'&&Date.parse(`${b.date}T${b.endTime}`)>=+now&&(b.linkedGoalId===goal.id||(b.linkedSkillId&&skillIds.has(b.linkedSkillId)))).sort((a,b)=>`${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))[0];
  const criteria=goal.outcomeCriteria??[];
  return { ongoing:goal.goalType==='health'||goal.goalType==='fitness', count:logs.length, minutes:logs.reduce((n,l)=>n+(l.durationMinutes||0),0), criteriaCount:criteria.length, completeCount:criteria.filter(c=>c.completed===true).length, complete:criteria.length>0&&criteria.every(c=>c.completed===true), next, requiredState:data.skills.find(s=>s.id===next?.linkedSkillId)?.requiredState };
}

/** A suggestion from the existing task-type parser, never a saved default. */
export function suggestedRequiredState(taskType:Skill['taskType']):NonNullable<Skill['requiredState']> {
  return taskType==='deep_study'||taskType==='creative_building'?'deep_focus':taskType==='strength_training'?'physical':taskType==='cardio_recovery'?'recovery':taskType==='light_review'||taskType==='admin'||taskType==='life_maintenance'?'light':'unknown';
}
