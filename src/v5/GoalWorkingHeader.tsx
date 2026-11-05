import React, { useRef, useState } from 'react';
import { useStore } from '../store';
import type { Category } from '../types';
import type { Lang } from '../i18n';
import { t } from '../i18n';
import { DurableSubmission } from '../utils/durableSubmission';
import { v5t } from './copy';

export default function GoalWorkingHeader(p:{goal:Category;lang:Lang;onEditCriterion:(id?:string)=>void;onLibrary:()=>void}) {
  const {updateCategory,waitForLocalWrites,retryLocalWrites,data}=useStore();
  const submission=useRef(new DurableSubmission<void>());
  const [status,setStatus]=useState<'idle'|'saving'|'error'>('idle');
  const key=`questlife:v5:required-state-hint:${p.goal.id}`;
  const [dismissed,setDismissed]=useState(()=>{try{return localStorage.getItem(key)==='1'}catch{return false}});
  const linked=new Set((data.moduleSkillLinks??[]).filter(l=>l.goalId===p.goal.id).map(l=>l.skillId));
  const missing=data.skills.some(s=>(s.categoryId===p.goal.id||linked.has(s.id))&&(!s.requiredState||s.requiredState==='unknown'));
  const save=async(id?:string)=>{
    if(status==='saving')return;setStatus('saving');
    try{await submission.current.run(()=>{if(id)updateCategory(p.goal.id,{outcomeCriteria:p.goal.outcomeCriteria?.map(c=>c.id===id?{...c,completed:!c.completed}:c)});},waitForLocalWrites,retryLocalWrites,async()=>{});setStatus('idle');}catch{setStatus('error');}
  };
  return <section className="ql-v5 v5-detail-criteria">
    <div className="v5-section-head"><h2>{v5t(p.lang,'criteria')}</h2><button className="v5-link" onClick={()=>p.onEditCriterion()}>{t(p.lang,'addCriterion')}</button></div>
    {(p.goal.outcomeCriteria??[]).map(c=><div className="v5-row" key={c.id}><button className="v5-check" role="checkbox" aria-checked={!!c.completed} aria-label={`${c.title}: ${v5t(p.lang,c.completed?'criterionDone':'criterionOpen')}`} disabled={status!=='idle'} onClick={()=>void save(c.id)}>{c.completed?'✓':'○'}</button><div className="v5-row-body"><strong>{c.title}</strong><div className="v5-meta">{v5t(p.lang,c.completed?'criterionDone':'criterionOpen')}</div></div><button className="v5-link" onClick={()=>p.onEditCriterion(c.id)}>{t(p.lang,'edit')}</button></div>)}
    {status==='saving'?<p role="status">{v5t(p.lang,'saving')}</p>:status==='error'?<p role="alert">{v5t(p.lang,'failed')}<button className="v5-link" onClick={()=>void save()}>{v5t(p.lang,'retry')}</button></p>:null}
    {missing&&!dismissed?<div className="v5-hint"><span>{v5t(p.lang,'requiredHint')}</span><button className="v5-link" onClick={()=>{setDismissed(true);try{localStorage.setItem(key,'1')}catch{}}}>{v5t(p.lang,'dismiss')}</button></div>:null}
    <button className="v5-link" onClick={p.onLibrary}>{v5t(p.lang,'library')}</button>
  </section>;
}
