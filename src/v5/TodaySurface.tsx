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
import { emptyToday, durationLabel } from './round2Presentation';
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
  const now=new Date(), date=localYmd(now);
  const row=latestStateLayerRow(data.stateCheckIns||[],date), state=row&&effectiveType(row);
  const requested=typeof window!=='undefined'?new URLSearchParams(window.location.search).get('followup'):null;
  const pending=pendingFollowUp(requested?(data.stateCheckIns||[]).filter(r=>r.id===requested):data.stateCheckIns||[],now,followUpDue);
  const plan=useStateLayerPlan();
  const [reorder,setReorder]=useState(false), [brain,setBrain]=useState(false);
  const [applied,setApplied]=useState<AppliedPlan|null>(null);
  const [busy,setBusy]=useState(false), [error,setError]=useState(false), [undoError,setUndoError]=useState(false);
  const submission=useRef(new DurableSubmission<void>()), pendingFinish=useRef<()=>void>(()=>undefined);
  const task=p.command.scheduleBlockId?data.scheduleBlocks.find(b=>b.id===p.command.scheduleBlockId):undefined;
  const skill=data.skills.find(s=>s.id===p.command.linkedSkillId), advice=p.command.stateAdvice;
  const empty=emptyToday(data,!!p.active,p.command.primaryAction==='finish_pending_capture');
  const act=async(write:()=>void,finish=()=>undefined as void)=>{
    if(busy)return;setBusy(true);setError(false);
    if(!submission.current.hasPending)pendingFinish.current=finish;
    try{await submission.current.run(write,waitForLocalWrites,retryLocalWrites,async()=>pendingFinish.current());}
    catch{setError(true);}finally{setBusy(false);}
  };
  const markChoice=(action:'brain_dump'|'rest_20'|'probe_5')=>{
    if(!row?.stateLayer)return;
    updateStateCheckIn(row.id,{stateLayer:{...row.stateLayer,choice:{actionId:action,at:new Date().toISOString(),slot:'primary',randomized:false}}});
  };
  const adjust=()=>setReorder(true);
  const original=()=>{
    if(!row?.stateLayer||!task)return;
    void act(()=>updateStateCheckIn(row.id,{stateLayer:{...row.stateLayer!,originalPlanChoices:[...(row.stateLayer!.originalPlanChoices||[]),{taskId:task.id,at:new Date().toISOString()}]}}));
  };
  const title=empty?v5t(p.lang,'emptyAction'):p.active?.title??(advice?.kind==='brain_dump'?v5t(p.lang,'dump'):advice?.kind==='recover'?v5t(p.lang,'recover'):advice?.kind==='probe_5'?`${v5t(p.lang,'probe')}：${advice.taskTitle}`:task?.title??skill?.name??p.title);
  const logs=data.executionLogs.filter(l=>!l.dataProvenance?.deleted).slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  const elapsed=p.active?Math.max(0,Math.floor((+now-Date.parse(p.active.startedAt))/60000)):undefined;
  const subtitle=empty?v5t(p.lang,'emptyActionReason'):p.active?`${v5t(p.lang,'running')} · ${durationLabel(elapsed??0,p.lang)}`:task&&!advice?`${task.startTime}–${task.endTime} · ${durationLabel(task.plannedMinutes,p.lang)}`:p.reason;
  const latestApplied=applied??data.decisionResults?.filter(r=>r.decisionEpisode?.status==='APPLIED'&&r.decisionEpisode?.appliedPlanPatch?.date===date&&r.decisionEpisode?.question.text==='state_layer').map(r=>({episode:r.decisionEpisode!,patch:r.decisionEpisode!.appliedPlanPatch!}))[0];
  const undo=async()=>{if(!latestApplied||busy)return;setBusy(true);setUndoError(false);try{await plan.undo(latestApplied);setApplied(null);}catch{setUndoError(true);}finally{setBusy(false);}};
  const primary=empty?p.onCapture:p.active?p.onFinish:advice&&advice.kind!=='probe_5'?adjust:advice?.kind==='probe_5'?()=>void act(()=>markChoice('probe_5'),p.onPrimary):p.onPrimary;
  const primaryLabel=empty?v5t(p.lang,'quickNote'):p.active?v5t(p.lang,'finish'):advice||p.command.primaryAction==='start'?v5t(p.lang,'start'):v5t(p.lang,p.command.primaryAction==='finish_pending_capture'?'confirmCapture':p.command.primaryAction==='review_feedback'?'reviewFeedback':p.command.primaryAction==='rescue'?'rescue':'log');
  return <main className="ql-v5 v5-today v5-today-compact" data-theme={p.theme.mode} data-testid="v5-today">
    <header className="v5-date"><div className="v5-date-stamp v5-glass"><span>{now.toLocaleDateString('en',{month:'short'}).toUpperCase()}</span><b>{now.getDate()}</b></div><div><strong>{now.toLocaleDateString(p.lang==='zh'?'zh-CN':'en-GB',{weekday:'long'})} · {t(p.lang,now.getHours()<12?'morning':now.getHours()<18?'afternoon':'evening')}</strong><div className="v5-meta">{now.toLocaleDateString(p.lang==='zh'?'zh-CN':'en-GB',{year:'numeric',month:'long'})}</div></div></header>
    <button className="v5-capture v5-glass" onClick={p.onCapture}><QuestIcon name="edit" size={21}/><span>{v5t(p.lang,'capture')}</span><span className="v5-round"><QuestIcon name="plus" size={22}/></span></button>
    <section className="v5-section v5-now-section">
      <div className="v5-section-head"><h2>{v5t(p.lang,'nowGroup')}</h2><button className="v5-link" onClick={p.onDetails}>{v5t(p.lang,'evidence')}<V11Icon name="arrow" size={13} color="currentColor"/></button></div>
      <div className="v5-glass v5-group">
        <StateStrip lang={p.lang} theme={p.theme} reducedMotion={p.reducedMotion}/>
        <div className="v5-working-row v5-next-action" data-testid="v5-main-action">
          <QuestIcon name={p.active?'play':advice?'brain':'cube'} size={21}/>
          <div className="v5-row-body">{advice?<span className="v5-tag">{v5t(p.lang,'suggest')}</span>:null}<h1 title={title}>{title}</h1><p className="v5-meta" title={subtitle}>{subtitle}</p></div>
          <button className="v5-pill" disabled={busy} onClick={primary}>{primaryLabel}</button>
        </div>
        {advice&&task&&!p.active?<div className="v5-working-row v5-adjust-row"><QuestIcon name="calendar" size={19}/><div className="v5-row-body"><strong>{task.title}</strong><p className="v5-meta">{task.startTime}–{task.endTime} · {v5t(p.lang,'confirmPlan')}</p></div><button className="v5-pill" disabled={busy} onClick={adjust}>{v5t(p.lang,'adjustShort')}</button></div>:null}
        {pending?.stateLayer?.choice?<div className="v5-followup"><strong>{sl(p.lang,'followUpTitle',{action:ACTION_COPY[p.lang][pending.stateLayer.choice.actionId].title})}</strong><FiveChoices label={sl(p.lang,'energy')} labels={ENERGY_SCALE[p.lang]} disabled={busy} onChange={energy=>void act(()=>updateStateCheckIn(pending.id,{stateLayer:{...pending.stateLayer!,choice:{...pending.stateLayer!.choice!,energyFollowUp:{energy,at:new Date().toISOString()}}}}))}/><button className="v5-link" onClick={()=>void act(()=>updateStateCheckIn(pending.id,{stateLayer:{...pending.stateLayer!,choice:{...pending.stateLayer!.choice!,followUpDismissedAt:new Date().toISOString()}}}))}>{sl(p.lang,'followUpDismiss')}</button></div>:null}
        {latestApplied?<div className="v5-working-row"><span className="v5-row-body v5-meta">{sl(p.lang,'rpApplied')}</span><button className="v5-pill" disabled={busy} onClick={()=>void undo()}>{sl(p.lang,'rpUndo')}</button>{undoError?<span role="alert">{v5t(p.lang,'failed')}<button className="v5-link" onClick={()=>void undo()}>{v5t(p.lang,'retry')}</button></span>:null}</div>:null}
      </div>
      {busy?<p role="status" className="v5-meta">{v5t(p.lang,'saving')}</p>:null}{error?<p className="v5-error" role="alert">{v5t(p.lang,'failed')}<button className="v5-link" onClick={()=>void act(()=>undefined)}>{v5t(p.lang,'retry')}</button></p>:null}
      <details className="v5-today-more"><summary>{v5t(p.lang,'more')}<V11Icon name="arrow" size={14} color="currentColor"/></summary><div className="v5-inline"><button className="v5-link" onClick={p.onLog}>{v5t(p.lang,'log')}</button>{advice?<button className="v5-link" disabled={busy} onClick={original}>{v5t(p.lang,'original')}</button>:null}<button className="v5-link" onClick={()=>void act(()=>markChoice('brain_dump'),()=>setBrain(true))}>{sl(p.lang,'bdTitle')}</button><button className="v5-link" onClick={adjust} disabled={!state||state==='unclear'}>{sl(p.lang,'reorder')}</button>{p.utilities.filter(a=>a.id!=='finish-session'&&a.id!=='activity-history').map(a=><button className="v5-link" key={a.id} onClick={a.onPress}>{a.label}</button>)}</div>{row?.stateLayer?.choice&&!pending?<a className="v5-link" href={`shortcuts://run-shortcut?name=${encodeURIComponent('QL回访提醒')}&input=text&text=${encodeURIComponent(`${window.location.origin}/?followup=${encodeURIComponent(row.id)}`)}`}>{v5t(p.lang,'remindFollowup')}</a>:null}{p.instantRead}</details>
    </section>
    <section className="v5-section"><div className="v5-section-head"><h2>{v5t(p.lang,'todayGroup')}</h2><button className="v5-link" onClick={p.onSchedule}>{v5t(p.lang,'fullPlan')}</button></div><div className="v5-group v5-glass">
      {p.planRows.length?p.planRows.slice(0,3).map(r=>{const b=data.scheduleBlocks.find(b=>b.id===r.id),s=data.skills.find(s=>s.id===(b?.linkedSkillId??r.id));return <button className="v5-working-row" key={r.id} onClick={p.onSchedule}><span className="v5-row-time">{b?.startTime??r.time?.split(/[-–]/)[0]??''}</span><span className="v5-row-body"><strong>{r.title}</strong><span className="v5-meta">{b?durationLabel(b.plannedMinutes,p.lang):r.metadata}</span></span>{s?.requiredState&&s.requiredState!=='unknown'?<span className="v5-tag">{demandLabel(p.lang,s.requiredState)}</span>:null}<V11Icon name="arrow" size={16} color="currentColor"/></button>}):<div className="v5-working-row"><QuestIcon name="calendar" size={20}/><span className="v5-row-body">{v5t(p.lang,'noPlan')}</span><button className="v5-pill" onClick={p.onSchedule}>{v5t(p.lang,'add')}</button></div>}
    </div></section>
    {logs.length>0?<section className="v5-section"><div className="v5-section-head"><h2>{v5t(p.lang,'recentGroup')}</h2><button className="v5-link" onClick={()=>p.onHistory()}>{v5t(p.lang,'history')}</button></div><div className="v5-group v5-glass">{logs.slice(0,3).map(l=><button className="v5-working-row" key={l.id} onClick={()=>p.onHistory(l.id)}><V11Icon name="activity" size={20} color="currentColor"/><span className="v5-row-body"><strong>{l.title??data.skills.find(s=>s.id===l.linkedSkillId)?.name??t(p.lang,'customLog')}</strong><span className="v5-meta">{new Date(l.createdAt).toLocaleString(p.lang==='zh'?'zh-CN':'en-GB',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}{l.durationMinutes>0?` · ${durationLabel(l.durationMinutes,p.lang)}`:''}</span></span><V11Icon name="arrow" size={16} color="currentColor"/></button>)}</div></section>:null}
    <StateBrainDumpSheet checkInId={row?.id} lang={p.lang} theme={p.theme} reducedMotion={p.reducedMotion} visible={brain} onClose={()=>setBrain(false)} onDone={(_,plan)=>{setBrain(false);if(plan)setApplied(plan);}} ruleId={row?.stateLayer?.classification?.ruleId??'brain_dump'}/>
    {state&&state!=='unclear'?<StateReorderSheet preparationMinutes={advice?.kind==='recover'?20:advice?.kind==='brain_dump'?10:undefined} visible={reorder} onClose={()=>setReorder(false)} onApplied={plan=>{setApplied(plan);setReorder(false);void act(()=>markChoice(advice?.kind==='recover'?'rest_20':'brain_dump'),()=>{if(advice?.kind==='brain_dump')setBrain(true);});}} lang={p.lang} theme={p.theme} reducedMotion={p.reducedMotion} ruleId={row?.stateLayer?.classification?.ruleId??state} type={state}/>:null}
  </main>;
}
