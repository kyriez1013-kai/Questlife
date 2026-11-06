import React, { useState } from 'react';
import type { AppData, ScheduleBlock } from '../types';
import type { Lang } from '../i18n';
import QuestIcon from '../components/ui/QuestIcon';
import { addDays, localYmd } from '../state-layer/signals';
import { durationLabel } from './round2Presentation';

type Props = { data:AppData; lang:Lang; dark:boolean; date:string; onDate:(value:string)=>void; view:'day'|'week'|'month'|'year'; onView:(value:Props['view'])=>void; blocks:ScheduleBlock[]; onAdd:()=>void; onSelect:(block:ScheduleBlock)=>void; proposals:React.ReactNode; hasProposals:boolean; onCalendar:()=>void };
const minute=(s:string)=>Number(s.slice(0,2))*60+Number(s.slice(3,5));
export default function V5ScheduleSurface(p:Props) {
  const text=(zh:string,en:string)=>p.lang==='zh'?zh:en;
  const [review,setReview]=useState(false);
  const current=new Date(); const selected=new Date(`${p.date}T12:00:00`);
  const monday=addDays(p.date,-(selected.getDay()+6)%7);
  const week=Array.from({length:7},(_,i)=>addDays(monday,i));
  const rows=p.blocks.filter(b=>b.date===p.date&&b.status!=='skipped');
  const hours=Array.from({length:25},(_,i)=>i);
  const nowOffset=(current.getHours()*60+current.getMinutes())/60*32;
  const scrollStart=p.date===localYmd(current)?Math.max(0,nowOffset-56):8*32;
  const positionTimeline=(el:HTMLDivElement|null)=>{
    if(!el||el.dataset.positioned)return;
    const timeline=el.firstElementChild as HTMLElement|null;
    // End-of-day needs a viewport tail so the current time can still sit near the top.
    if(timeline)timeline.style.height=`${24*32+Math.max(0,el.clientHeight-56)}px`;
    el.scrollTop=scrollStart;el.dataset.positioned='true';
  };
  const event=(b:ScheduleBlock,all:ScheduleBlock[])=>{
    const overlap=all.filter(r=>r.id!==b.id&&minute(r.startTime)<minute(b.endTime)&&minute(r.endTime)>minute(b.startTime));
    const lane=overlap.length&&overlap.some(r=>r.id<b.id)?1:0;
    return <button key={b.id} className="v5-event" style={{top:minute(b.startTime)/60*32,height:Math.max(24,b.plannedMinutes/60*32),left:overlap.length?(lane?'51%':'7px'):'7px',right:overlap.length&&!lane?'51%':'1px'}} onClick={()=>p.onSelect(b)} aria-label={`${b.title} ${b.startTime}–${b.endTime}${overlap.length?text(' 时间重叠',' Overlapping'):''}`}><strong>{b.title}</strong><span>{b.startTime}–{b.endTime} · {durationLabel(b.plannedMinutes,p.lang)}</span></button>;
  };
  return <main className="ql-v5 v5-schedule" data-theme={p.dark?'dark':'light'} data-testid="v5-schedule">
    <header className="v5-schedule-head"><label className="v5-schedule-month"><h1>{selected.toLocaleDateString(p.lang==='zh'?'zh-CN':'en-GB',{year:'numeric',month:'long'})}</h1><span>⌄</span><input aria-label={text('选择日期','Choose date')} type="date" value={p.date} onChange={e=>{if(e.target.value)p.onDate(e.target.value)}}/></label><button className="v5-round" aria-label={text('添加日程','Add schedule')} onClick={p.onAdd}><QuestIcon name="plus" color="currentColor"/></button></header>
    <div className="v5-segments" role="group" aria-label={text('时间尺度','Time scale')}>{(['day','week','month','year'] as const).map((v,i)=><button key={v} aria-pressed={p.view===v} onClick={()=>p.onView(v)}>{text(['日','周','月','年'][i],['Day','Week','Month','Year'][i])}</button>)}</div>
    <div className="v5-schedule-tools">{p.hasProposals?<button className="v5-pill" onClick={()=>setReview(!review)}><QuestIcon name="activity" size={16} color="currentColor"/>{text('调整建议','Review changes')}</button>:null}<button className="v5-pill" onClick={p.onCalendar}><QuestIcon name="calendar" size={16} color="currentColor"/>{text('日历同步','Calendar sync')}</button></div>
    {review?p.proposals:null}
    <div className="v5-week">{week.map(date=><button key={date} aria-pressed={p.date===date} onClick={()=>p.onDate(date)}><small>{new Date(`${date}T12:00:00`).toLocaleDateString(p.lang==='zh'?'zh-CN':'en-GB',{weekday:'narrow'})}</small><b>{Number(date.slice(-2))}</b></button>)}</div>
    <div className="v5-day-head"><strong>{selected.toLocaleDateString(p.lang==='zh'?'zh-CN':'en-GB',{month:'long',day:'numeric',weekday:'short'})}</strong><span>{rows.length?text(`${rows.length} 项计划 · ${durationLabel(rows.reduce((n,b)=>n+b.plannedMinutes,0),p.lang)}`,`${rows.length} plans`):text('暂无计划','No plans')}</span></div>
    {p.view==='day'?<section className="v5-timeline-card v5-glass"><div className="v5-timeline-scroll" key={p.date} ref={positionTimeline}><div className="v5-timeline" style={{height:24*32}}>{hours.map(h=><div className="v5-hour" key={h}><span>{String(h).padStart(2,'0')}:00</span></div>)}{rows.map(b=>event(b,rows))}{p.date===localYmd(current)?<div className="v5-nowline" style={{top:nowOffset}}><span>{text('现在','Now')}</span></div>:null}{!rows.length?<div className="v5-timeline-empty" style={{top:scrollStart+150}}><span>{text('今天还没有安排','No plans for today')}</span><button className="v5-pill" onClick={p.onAdd}>{text('添加','Add')}</button></div>:null}</div></div><p className="v5-timeline-note">{text('每格 1 小时 · 计划 ≠ 实际执行','One hour per line · plans are not execution')}</p></section>:null}
    {p.view==='week'?<section className="v5-glass v5-timeline-card"><div className="v5-week-grid">{week.map(date=><div key={date} className="v5-week-column">{p.blocks.filter(b=>b.date===date&&b.status!=='skipped').map(b=><button key={b.id} className="v5-week-event" style={{top:minute(b.startTime)/1440*320,height:Math.max(24,b.plannedMinutes/1440*320)}} onClick={()=>p.onSelect(b)} title={`${b.title} ${b.startTime}–${b.endTime}`}>{b.startTime}<br/>{b.title}</button>)}</div>)}</div><p className="v5-timeline-note">{text('七日时间分配 · 00:00–24:00','Seven days · 00:00–24:00')}</p></section>:null}
    {p.view==='month'?<div className="v5-month-grid">{Array.from({length:new Date(selected.getFullYear(),selected.getMonth()+1,0).getDate()},(_,i)=>{const date=localYmd(new Date(selected.getFullYear(),selected.getMonth(),i+1));const n=p.blocks.filter(b=>b.date===date).length;return <button key={date} style={i===0?{gridColumnStart:(new Date(`${date}T12:00:00`).getDay()+6)%7+1}:undefined} onClick={()=>{p.onDate(date);p.onView('day')}}>{i+1}<small>{n?text(`${n} 项`,`${n} plans`):''}</small></button>})}</div>:null}
    {p.view==='year'?<div className="v5-year-grid">{Array.from({length:12},(_,i)=>{const date=`${selected.getFullYear()}-${String(i+1).padStart(2,'0')}-01`;const n=p.blocks.filter(b=>b.date.startsWith(date.slice(0,7))).length;return <button key={date} onClick={()=>{p.onDate(date);p.onView('month')}}>{text(`${i+1} 月`,new Date(`${date}T12:00:00`).toLocaleDateString('en',{month:'short'}))}<div className="v5-meta">{n?text(`${n} 项计划`,`${n} plans`):text('尚无安排','No plans')}</div></button>})}</div>:null}
    <section className="v5-unplaced v5-glass"><QuestIcon name="calendar" size={20} color="currentColor"/><div><strong>{text('待安排事项','Unscheduled')}</strong><p>{text('为下一件事选择开始与结束时间','Choose a time for the next action')}</p></div><button className="v5-pill" onClick={p.onAdd}>{text('添加','Add')}</button></section>
  </main>;
}
