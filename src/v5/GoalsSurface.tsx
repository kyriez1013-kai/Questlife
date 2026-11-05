import React, { useState } from 'react';
import type { AppData, Category } from '../types';
import type { Lang } from '../i18n';
import { t } from '../i18n';
import QuestIcon from '../components/ui/QuestIcon';
import V11Icon from '../v11-stage2-rebaseline/V11RebaselineIcon';
import { demandLabel, v5t } from './copy';
import { goalPresentation } from './goalPresentation';
import { durationLabel } from './round2Presentation';
import './v5.css';

export default function V5GoalsSurface(p:{data:AppData;lang:Lang;dark:boolean;onOpen:(id:string)=>void;onAdd:()=>void;onLibrary:()=>void;onDelete:(goal:Category)=>void}) {
  const [filter,setFilter]=useState<'all'|'active'|'completed'>('all');
  const [search,setSearch]=useState(false); const [query,setQuery]=useState('');
  const now=new Date();
  const rows=p.data.categories.map(goal=>({goal,...goalPresentation(p.data,goal,now)}));
  const minutes=p.data.executionLogs.filter(l=>!l.dataProvenance?.deleted&&Date.parse(l.createdAt)>=+now-7*86400000&&Date.parse(l.createdAt)<=+now).reduce((n,l)=>n+(l.durationMinutes||0),0);
  const visible=rows.filter(r=>r.goal.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())&&(filter==='all'||(filter==='completed'?r.complete:!r.complete)));
  return <main className="ql-v5 v5-goals" data-theme={p.dark?'dark':'light'} data-testid="v5-goals">
    <header className="v5-page-head"><div><h1>{t(p.lang,'quest')}</h1>{minutes>0?<span className="v5-meta">{v5t(p.lang,'weekly')} {durationLabel(minutes,p.lang)}</span>:null}</div><div className="v5-inline">
      <button className="v5-round" aria-label={v5t(p.lang,'search')} onClick={()=>setSearch(!search)}><V11Icon name="search" size={21} color="currentColor"/></button>
      <details className="v5-menu"><summary className="v5-round" aria-label={v5t(p.lang,'add')}><QuestIcon name="plus" size={22} color="currentColor"/></summary><div className="v5-glass"><button className="v5-link" onClick={p.onAdd}>{t(p.lang,'addQuest')}</button><button className="v5-link" onClick={p.onLibrary}>{v5t(p.lang,'library')}</button></div></details>
    </div></header>
    {search?<input className="v5-search" autoFocus aria-label={v5t(p.lang,'search')} value={query} onChange={e=>setQuery(e.target.value)}/>:null}
    <div className="v5-segments" role="group" aria-label={v5t(p.lang,'all')}>{(['all','active','completed'] as const).map(f=><button key={f} aria-pressed={filter===f} onClick={()=>setFilter(f)}>{v5t(p.lang,f)}</button>)}</div>
    {([false,true] as const).map(ongoing=>{const list=visible.filter(r=>r.ongoing===ongoing);return list.length?<section key={String(ongoing)} className="v5-goal-group"><h2>{v5t(p.lang,ongoing?'ongoing':'project')}</h2>{list.map(r=><article className="v5-glass v5-goal-card" key={r.goal.id}>
      <button className="v5-goal-open" onClick={()=>p.onOpen(r.goal.id)}><div className="v5-inline"><span className="v5-icon-tile"><QuestIcon name={ongoing?'activity':'target'} size={25} color="currentColor"/></span><div className="v5-row-body"><span className="v5-meta">{v5t(p.lang,ongoing?'ongoing':'project')}</span><h3>{r.goal.name}</h3></div><V11Icon name="arrow" size={18} color="currentColor"/></div>
      {r.goal.description||r.goal.vision?<p>{r.goal.description||r.goal.vision}</p>:null}
      {r.criteriaCount?<div className="v5-inline v5-goal-evidence"><span>{v5t(p.lang,'criteria')}</span><strong>{r.completeCount}/{r.criteriaCount}</strong></div>:null}
      <div className="v5-meta">{r.count} {p.lang==='zh'?'次执行':'sessions'} · {r.minutes} {v5t(p.lang,'minutes')}</div>
      {r.next?<div className="v5-next"><span className="v5-meta">{v5t(p.lang,'nextPlan')} · {r.next.date} {r.next.startTime}</span><span>{r.next.title}</span>{r.requiredState&&r.requiredState!=='unknown'?<span className="v5-tag">{demandLabel(p.lang,r.requiredState)}</span>:null}</div>:null}</button>
      <details className="v5-goal-menu"><summary aria-label={`${t(p.lang,'more')} ${r.goal.name}`}>···</summary><button className="v5-link" onClick={()=>p.onDelete(r.goal)}>{t(p.lang,'delete')}</button></details>
    </article>)}</section>:null;})}
    {!visible.length?<section className="v5-empty v5-glass"><QuestIcon name="target" size={30} color="currentColor"/><h2>{query?(p.lang==='zh'?'没有匹配的方向':'No matching directions'):filter==='completed'?(p.lang==='zh'?'尚无已完成的目标':'No completed goals yet'):p.lang==='zh'?'给一个方向，定义结果':'Give a direction a result'}</h2><p>{query?(p.lang==='zh'?'试试其他名称':'Try another name'):filter==='completed'?(p.lang==='zh'?'按完成条件确认结果；执行时长不是完成比例。':'Confirm results against your criteria, not time spent.'):p.lang==='zh'?'先确定想达成什么，再关联需要练习的技能。':'Define what you want to achieve, then link the skills to practise.'}</p>{!query&&filter!=='completed'?<button className="v5-button" onClick={p.onAdd}>{p.lang==='zh'?'创建目标':'Create goal'}</button>:null}</section>:null}
  </main>;
}
