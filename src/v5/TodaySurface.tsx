import React, { useRef, useState } from 'react';
import { useStore } from '../store';
import type { Lang } from '../i18n';
import { t } from '../i18n';
import type { TodayCommand } from '../utils/todayCommand';
import type { V11ThemeTokens } from '../v11/tokens';
import type { V11IntegratedPlanRow, V11IntegratedUtilityAction } from '../v11-stage2-rebaseline/V11IntegratedTodaySurface';
import QuestIcon from './PrototypeIcon';
import V11Icon from '../v11-stage2-rebaseline/V11RebaselineIcon';
import { latestStateLayerRow } from '../state-layer/checkIn';
import { effectiveType } from '../state-layer/classifyState';
import { localYmd } from '../state-layer/signals';
import { ACTION_COPY, ENERGY_SCALE, sl } from '../state-layer/copy';
import { followUpDue } from '../state-layer/actions';
import { pendingFollowUp } from '../state-layer/outcomes';
import StateReorderSheet from '../state-layer/StateReorderSheet';
import StateBrainDumpSheet from '../state-layer/StateBrainDumpSheet';
import { useStateLayerPlan, type AppliedPlan } from '../state-layer/useStateLayerActions';
import { DurableSubmission } from '../utils/durableSubmission';
import StateStrip, { FiveChoices } from './StateStrip';
import { demandLabel, v5t } from './copy';
import { emptyToday } from './round2Presentation';
import './v5.css';

type Props = {
  lang:Lang; theme:V11ThemeTokens; reducedMotion:boolean; command:TodayCommand;
  title:string; reason:string; onCapture:()=>void; onPrimary:()=>void; onLog:()=>void;
  onFinish:()=>void; onSchedule:()=>void; onHistory:(id?:string)=>void; onDetails:()=>void;
  active?:{title:string;startedAt:string}|null; planRows:V11IntegratedPlanRow[];
  utilities:V11IntegratedUtilityAction[]; instantRead:React.ReactNode;
};

export default function V5TodaySurface(p:Props) {
  const {data,updateStateCheckIn,waitForLocalWrites,retryLocalWrites}=useStore();
  const now=new Date(); const date=localYmd(now);
  const row=latestStateLayerRow(data.stateCheckIns||[],date); const state=row&&effectiveType(row);
  const requested=typeof window!=='undefined'?new URLSearchParams(window.location.search).get('followup'):null;
  const pending=pendingFollowUp(requested?(data.stateCheckIns||[]).filter(r=>r.id===requested):data.stateCheckIns||[],now,followUpDue);
  const plan=useStateLayerPlan();
  const [reorder,setReorder]=useState(false); const [brain,setBrain]=useState(false);
  const [applied,setApplied]=useState<AppliedPlan|null>(null);
  const [busy,setBusy]=useState(false); const [error,setError]=useState(false);
  const [undoError,setUndoError]=useState(false);
  const submission=useRef(new DurableSubmission<void>());
  const pendingFinish=useRef<()=>void>(()=>undefined);
  const task=p.command.scheduleBlockId ? data.scheduleBlocks.find(b=>b.id===p.command.scheduleBlockId) : undefined;
  const skill=data.skills.find(s=>s.id===p.command.linkedSkillId);
  const goal=data.categories.find(g=>g.id===(task?.linkedGoalId??p.command.linkedGoalId));
  const module=data.modules?.find(m=>m.id===p.command.linkedModuleId);
  const advice=p.command.stateAdvice;
  const empty=emptyToday(data,!!p.active,p.command.primaryAction==='finish_pending_capture');
  const act=async(write:()=>void,finish=()=>undefined as void)=>{
    if(busy)return;setBusy(true);setError(false);
    if (!submission.current.hasPending) pendingFinish.current=finish;
    try {await submission.current.run(write,waitForLocalWrites,retryLocalWrites,async()=>pendingFinish.current());}
    catch{setError(true);}finally{setBusy(false);}
  };
  const markChoice=(action:'brain_dump'|'rest_20'|'probe_5')=>{
    if(!row?.stateLayer)return;
    updateStateCheckIn(row.id,{stateLayer:{...row.stateLayer,choice:{actionId:action,at:new Date().toISOString(),slot:'primary',randomized:false}}});
  };
  const adjust=()=>{
    // Preview first; an action is recorded only after the person chooses it or confirms a plan.
    setReorder(true);
  };
  const original=()=>{
    if(!row?.stateLayer||!task)return;
    void act(()=>updateStateCheckIn(row.id,{stateLayer:{...row.stateLayer!,originalPlanChoices:[...(row.stateLayer!.originalPlanChoices||[]),{taskId:task.id,at:new Date().toISOString()}]}}));
  };
  const title=p.active?.title ?? (advice?.kind==='brain_dump'?v5t(p.lang,'dump'):advice?.kind==='recover'?v5t(p.lang,'recover'):advice?.kind==='probe_5'?`${v5t(p.lang,'probe')}：${advice.taskTitle}`:task?.title??skill?.name??(p.command.primaryAction==='create_goal'?v5t(p.lang,'firstAction'):p.title));
  const planRows=p.planRows.filter(r=>r.id!==task?.id).slice(0,3);
  const blocks=data.scheduleBlocks.filter(b=>b.date===date&&b.status!=='skipped');
  const logs=data.executionLogs.filter(l=>!l.dataProvenance?.deleted).slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  const elapsed=p.active?Math.max(0,Math.floor((+now-Date.parse(p.active.startedAt))/60000)):undefined;
  const displayMinutes=elapsed??(advice?.kind==='brain_dump'?10:advice?.kind==='recover'?20:advice?.kind==='probe_5'?5:p.command.plannedMinutes);
  const heading=p.active?'running':advice&&advice.kind!=='probe_5'?'suggest':task?'next':'recommend';
  const latestApplied=applied??data.decisionResults?.filter(r=>r.decisionEpisode?.status==='APPLIED'&&r.decisionEpisode?.appliedPlanPatch?.date===date&&r.decisionEpisode?.question.text==='state_layer').map(r=>({episode:r.decisionEpisode!,patch:r.decisionEpisode!.appliedPlanPatch!}))[0];
  const undo=async()=>{if(!latestApplied||busy)return;setBusy(true);setUndoError(false);try{await plan.undo(latestApplied);setApplied(null);}catch{setUndoError(true);}finally{setBusy(false);}};
  return <main className="ql-v5 v5-today" data-theme={p.theme.mode} data-testid="v5-today">
    <header className="v5-date"><div className="v5-date-stamp v5-glass"><span>{now.toLocaleDateString('en',{month:'short'}).toUpperCase()}</span><b>{now.getDate()}</b></div><div><strong>{now.toLocaleDateString(p.lang==='zh'?'zh-CN':'en-GB',{weekday:'long'})} · {t(p.lang,now.getHours()<12?'morning':now.getHours()<18?'afternoon':'evening')}</strong><div className="v5-meta">{now.toLocaleDateString(p.lang==='zh'?'zh-CN':'en-GB',{year:'numeric',month:'long'})}</div></div></header>
    <button className="v5-capture v5-glass" onClick={p.onCapture}><QuestIcon name="edit" size={21} color="currentColor"/><span>{v5t(p.lang,'capture')}</span><span className="v5-round" style={{flex:'0 0 44px'}}><QuestIcon name="plus" size={22} color="currentColor"/></span></button>
    <StateStrip lang={p.lang} theme={p.theme} reducedMotion={p.reducedMotion}/>
    {empty ? <section className="v5-main v5-glass v5-empty-action" data-testid="v5-main-action"><div className="v5-main-head">{v5t(p.lang,'recommend')}</div><h1>{p.lang==='zh'?'今天，从一件事开始':'Start today with one thing'}</h1><p>{p.lang==='zh'?'先安排一项行动，或记录已经发生的事。':'Plan one action, or record what already happened.'}</p><button className="v5-button" onClick={p.onSchedule}><QuestIcon name="plus" size={17} color="currentColor"/>{p.lang==='zh'?'安排一件事':'Plan one thing'}<V11Icon name="arrow" size={15} color="currentColor"/></button></section> : <section className="v5-main v5-glass" aria-label={v5t(p.lang,'now')} data-testid="v5-main-action">
      {pending?.stateLayer?.choice ? <div>
        <span className="v5-meta">{sl(p.lang,'followUpTitle',{action:ACTION_COPY[p.lang][pending.stateLayer.choice.actionId].title})}</span>
        <FiveChoices label={sl(p.lang,'energy')} labels={ENERGY_SCALE[p.lang]} disabled={busy} onChange={energy=>void act(()=>updateStateCheckIn(pending.id,{stateLayer:{...pending.stateLayer!,choice:{...pending.stateLayer!.choice!,energyFollowUp:{energy,at:new Date().toISOString()}}}}))}/>
        <button className="v5-link" onClick={()=>void act(()=>updateStateCheckIn(pending.id,{stateLayer:{...pending.stateLayer!,choice:{...pending.stateLayer!.choice!,followUpDismissedAt:new Date().toISOString()}}}))}>{sl(p.lang,'followUpDismiss')}</button>
      </div>:null}
      <div className="v5-main-head"><span>{v5t(p.lang,heading)}</span><span>{task?`${task.startTime}–${task.endTime}`:''}</span><button className="v5-link" onClick={p.onDetails} aria-label={v5t(p.lang,'evidence')}><V11Icon name="arrow" size={18} color="currentColor"/></button></div>
      <div className="v5-main-title"><div className="v5-icon-tile"><QuestIcon name={p.active?'play':advice?'brain':'cube'} size={28} color="currentColor"/></div><div className="v5-title-copy"><h1 title={title}>{[...title].length>(p.lang==='zh'?14:64)?[...title].slice(0,p.lang==='zh'?13:63).join('')+'…':title}</h1><div className="v5-meta">{[goal?.name,module?.name].filter(Boolean).join(' / ')}</div></div>{displayMinutes!=null?<div className="v5-minutes v5-muted"><strong>{displayMinutes}</strong><span className="v5-meta">{v5t(p.lang,'minutes')}</span></div>:null}</div>
      {!task||advice?<p>{advice&&advice.kind!=='probe_5'?v5t(p.lang,'confirmPlan'):p.command.primaryAction==='create_goal'?v5t(p.lang,'firstReason'):[...p.reason].slice(0,p.lang==='zh'?24:100).join('')}</p>:null}
      {advice?<span className="v5-tag">{v5t(p.lang,'rule')}</span>:null}
      {row?.stateLayer?.choice&&!pending?<a className="v5-link v5-meta" href={`shortcuts://run-shortcut?name=${encodeURIComponent('QL回访提醒')}&input=text&text=${encodeURIComponent(`${window.location.origin}/?followup=${encodeURIComponent(row.id)}`)}`}>{p.lang==='zh'?'25 分钟后提醒回访':'Remind me in 25 minutes'}</a>:null}
      <div className="v5-actions">
        <button className="v5-button" disabled={busy} onClick={p.active?p.onFinish:advice&&advice.kind!=='probe_5'?adjust:advice?.kind==='probe_5'?()=>void act(()=>markChoice('probe_5'),p.onPrimary):p.onPrimary}>{p.active?v5t(p.lang,'finish'):advice?v5t(p.lang,advice.kind==='probe_5'?'start':'adjust'):p.command.primaryAction==='create_goal'?v5t(p.lang,'record'):p.command.primaryAction==='start'?v5t(p.lang,'start'):t(p.lang,p.command.primaryAction==='finish_pending_capture'?'confirm':p.command.primaryAction==='review_feedback'?'viewDetails':p.command.primaryAction==='rescue'?'rescue':'logProgress')}</button>
        {!p.active&&(advice||p.command.primaryAction==='start')?<button className="v5-button secondary" disabled={busy} onClick={advice?original:p.onLog}><QuestIcon name="plus" size={15} color="currentColor"/>{v5t(p.lang,advice?'original':'log')}<V11Icon name="arrow" size={13} color="currentColor"/></button>:null}
      </div>
      {busy?<p role="status">{v5t(p.lang,'saving')}</p>:null}{error?<p className="v5-error" role="alert">{v5t(p.lang,'failed')}<button className="v5-link" onClick={()=>void act(()=>undefined)}>{v5t(p.lang,'retry')}</button></p>:null}
      <details className="v5-disclosure"><summary aria-label={v5t(p.lang,'more')} title={v5t(p.lang,'more')}>···</summary><div className="v5-inline"><button className="v5-link" onClick={()=>void act(()=>markChoice('brain_dump'),()=>setBrain(true))}>{sl(p.lang,'bdTitle')}</button><button className="v5-link" onClick={()=>setReorder(true)} disabled={!state||state==='unclear'}>{sl(p.lang,'reorder')}</button>{p.utilities.filter(a=>a.id!=='finish-session'&&a.id!=='activity-history').map(a=><button className="v5-link" key={a.id} onClick={a.onPress}>{a.label}</button>)}</div>{p.instantRead}</details>
      {latestApplied?<div className="v5-inline"><span className="v5-meta">{sl(p.lang,'rpApplied')}</span><button className="v5-link" disabled={busy} onClick={()=>void undo()}>{sl(p.lang,'rpUndo')}</button>{undoError?<span role="alert">{v5t(p.lang,'failed')}<button className="v5-link" onClick={()=>void undo()}>{v5t(p.lang,'retry')}</button></span>:null}</div>:null}
    </section>}
    <section className="v5-section"><div className="v5-section-head"><h2>{v5t(p.lang,'plan')}{blocks.length?<span className="v5-meta"> · {blocks.length} {v5t(p.lang,'items')} · {blocks.reduce((n,b)=>n+b.plannedMinutes,0)} {v5t(p.lang,'minutes')} · {v5t(p.lang,'done')} {blocks.filter(b=>b.status==='completed').length}</span>:null}</h2><button className="v5-link" onClick={p.onSchedule}>{v5t(p.lang,'fullPlan')}</button></div>
      {planRows.length?planRows.map(r=>{const b=data.scheduleBlocks.find(b=>b.id===r.id);const s=data.skills.find(s=>s.id===(b?.linkedSkillId??r.id));return <button className="v5-row" key={r.id} onClick={p.onSchedule}><span className="v5-row-time">{r.time?.split('-')[0]??''}</span><span className="v5-row-body"><strong>{r.title}</strong><br/><span className="v5-meta">{r.metadata}</span></span>{s?.requiredState&&s.requiredState!=='unknown'?<span className="v5-tag">{demandLabel(p.lang,s.requiredState)}</span>:null}<V11Icon name="arrow" size={16} color="currentColor"/></button>}):<button className="v5-row" onClick={p.onSchedule}><span className="v5-row-body v5-meta">{blocks.length?(p.lang==='zh'?'暂无后续安排':'No further plans'):(p.lang==='zh'?'今天没有安排':'No plans today')}</span><span>{v5t(p.lang,'add')}</span></button>}
    </section>
    {logs.length>0?<section className="v5-section"><div className="v5-section-head"><h2>{v5t(p.lang,'recent')}</h2><button className="v5-link" onClick={()=>p.onHistory()}>{v5t(p.lang,'history')}</button></div>{logs.slice(0,3).map(l=><button className="v5-row" key={l.id} onClick={()=>p.onHistory(l.id)}><V11Icon name="activity" size={22} color="currentColor"/><span className="v5-row-body"><strong>{l.title??data.skills.find(s=>s.id===l.linkedSkillId)?.name??t(p.lang,'customLog')}</strong><span className="v5-meta"> · {l.durationMinutes>0?`${l.durationMinutes} ${v5t(p.lang,'minutes')}`:''}</span><br/><span className="v5-meta">{l.note}</span><br/><span className="v5-meta">{new Date(l.createdAt).toLocaleString(p.lang==='zh'?'zh-CN':'en-GB')}</span></span><V11Icon name="arrow" size={16} color="currentColor"/></button>)}</section>:null}
    <StateBrainDumpSheet checkInId={row?.id} lang={p.lang} theme={p.theme} reducedMotion={p.reducedMotion} visible={brain} onClose={()=>setBrain(false)} onDone={(_,plan)=>{setBrain(false);if(plan)setApplied(plan);}} ruleId={row?.stateLayer?.classification?.ruleId??'brain_dump'} />
    {state&&state!=='unclear'?<StateReorderSheet preparationMinutes={advice?.kind==='recover'?20:advice?.kind==='brain_dump'?10:undefined} visible={reorder} onClose={()=>setReorder(false)} onApplied={plan=>{setApplied(plan);setReorder(false);void act(()=>markChoice(advice?.kind==='recover'?'rest_20':'brain_dump'),()=>{if(advice?.kind==='brain_dump')setBrain(true);});}} lang={p.lang} theme={p.theme} reducedMotion={p.reducedMotion} ruleId={row?.stateLayer?.classification?.ruleId??state} type={state}/>:null}
  </main>;
}
