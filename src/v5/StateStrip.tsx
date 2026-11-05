import React, { useRef, useState } from 'react';
import { useStore } from '../store';
import { useDeviceData } from '../platform/useDeviceData';
import { buildStateCheckIn, latestStateLayerRow, type StateAnswers } from '../state-layer/checkIn';
import { baselineHistory, classifyState, effectiveType } from '../state-layer/classifyState';
import { gatherPassiveSignals, localYmd } from '../state-layer/signals';
import { ENERGY_SCALE, TENSION_SCALE, TYPE_NAME, SIGNAL_NAME, OPEN_LOOPS_LABEL, PULL_LABEL, sl, type Lang } from '../state-layer/copy';
import { reasonLine, notUsedLine } from '../state-layer/explain';
import { STATE_TYPES, type OpenLoops, type Pull, type Scale5 } from '../state-layer/types';
import type { V11ThemeTokens } from '../v11/tokens';
import V11Stage2ProductionSheet from '../v11-stage2-rebaseline/V11Stage2ProductionSheet';
import { DurableSubmission } from '../utils/durableSubmission';
import { stateDimensions } from './stateEvidence';
import { v5t } from './copy';
import { healthContextView } from '../platform/health/normalization';

export function FiveChoices({label, labels, value, disabled, onChange}: {label:string;labels:string[];value?:number;disabled?:boolean;onChange:(n:Scale5)=>void}) {
  return <div className="v5-rail"><div><span>{label}</span><small className="v5-meta">{value ? labels[value-1] : ''}</small></div>
    <div role="group" aria-label={label}>{labels.map((s,i)=><button type="button" disabled={disabled} aria-pressed={value===i+1} aria-label={`${label} ${i+1} ${s}`} key={s} onClick={()=>onChange((i+1) as Scale5)}>{s}</button>)}</div>
  </div>;
}

export default function StateStrip({lang,theme,reducedMotion}:{lang:Lang;theme:V11ThemeTokens;reducedMotion:boolean}) {
  const {data,createStateCheckIn,updateStateCheckIn,waitForLocalWrites,retryLocalWrites}=useStore();
  const device=useDeviceData();
  const [editing,setEditing]=useState(false);
  const [draft,setDraft]=useState<Partial<StateAnswers>>({});
  const [details,setDetails]=useState(false);
  const [correction,setCorrection]=useState(false);
  const [optional,setOptional]=useState(false);
  const [status,setStatus]=useState<'idle'|'saving'|'error'>('idle');
  const submission=useRef(new DurableSubmission<void>());
  const afterSave=useRef<()=>void>(()=>undefined);
  const now=new Date();
  const row=latestStateLayerRow(data.stateCheckIns||[],localYmd(now));
  const state=row && effectiveType(row);
  const health=healthContextView(device.data.observations||[]).map(p=>({metric:p.type==='sleep'?'sleep':p.label,value:Number(p.value),unit:p.unit,eventEndAt:p.dataProvenance?.eventEndAt??p.createdAt})).filter((p):p is {metric:string;value:number;unit:string;eventEndAt:string}=>!!p.metric&&!!p.unit&&!!p.eventEndAt&&Number.isFinite(p.value)).map(p=>({...p,metric:p.metric==='hrv_sdnn'?'hrv':p.metric}));
  const signals=gatherPassiveSignals({now,contextLogs:data.contextLogs||[],health,executionLogs:data.executionLogs||[],scheduleBlocks:data.scheduleBlocks||[]});
  const save=async (write:()=>void,done=()=>undefined as void)=>{
    if(status==='saving') return;
    setStatus('saving'); afterSave.current=done;
    try { await submission.current.run(write,waitForLocalWrites,retryLocalWrites,async()=>{afterSave.current();});setStatus('idle'); }
    catch {setStatus('error');}
  };
  const answer=(key:'energy'|'tension',value:Scale5)=>{
    const next={...draft,[key]:value};setDraft(next);
    if(next.energy&&next.tension) void save(()=>{
      const fields=buildStateCheckIn({answers:next as StateAnswers,kind:'check_in',now:new Date(),date:localYmd(new Date()),signals,allCheckIns:data.stateCheckIns||[]});
      createStateCheckIn({...fields,stateLayer:{...fields.stateLayer!,source:'phone'}});
    },()=>{setEditing(false);setDraft({});});
  };
  const update=(patch:{openLoops?:OpenLoops;pull?:Pull})=>{
    if(!row?.stateLayer||row.energy==null) return;
    const answers={energy:row.energy as Scale5,tension:row.stateLayer.tension,openLoops:row.stateLayer.openLoops,pull:row.stateLayer.pull,...patch};
    void save(()=>updateStateCheckIn(row.id,{stateLayer:{...row.stateLayer!,...patch,classification:classifyState({...answers,signals,history:baselineHistory(data.stateCheckIns||[],row.id)})}}));
  };
  const stamp=row ? new Date(row.timestamp).toLocaleTimeString(lang==='zh'?'zh-CN':'en-GB',{hour:'2-digit',minute:'2-digit'}) : '';
  const stale=row ? +now-Date.parse(row.timestamp)>3*3600000 : false;
  const reason=row?.stateLayer?.classification ? reasonLine({energy:row.energy as Scale5,tension:row.stateLayer.tension,openLoops:row.stateLayer.openLoops,pull:row.stateLayer.pull,classification:row.stateLayer.classification,signals},lang) : '';
  const busy=status!=='idle';
  return <>
    <section className="v5-strip v5-glass" aria-label={v5t(lang,'state')} data-testid="v5-state-strip">
      <div className="v5-strip-head">
        <button className="v5-link" onClick={()=>row&&!stale?setDetails(true):setEditing(true)}>
          {row&&state ? <><strong style={stale?{color:'var(--v5-meta)'}:undefined}>{stale?`${stamp} · `:''}{TYPE_NAME[lang][state]}</strong><span className="v5-meta">{stale?` · ${v5t(lang,'recheck')}`:` · ${stamp}`}</span></> : v5t(lang,'state')}
        </button>
        <button className="v5-link" disabled={busy} onClick={()=>{if(row&&!stale){setCorrection(true);setDetails(true);}else setEditing(!editing);}}>{row&&!stale?v5t(lang,'update'):v5t(lang,'check')}</button>
      </div>
      {editing ? <>
        <FiveChoices label={sl(lang,'energy')} labels={ENERGY_SCALE[lang]} value={draft.energy} disabled={busy} onChange={n=>answer('energy',n)} />
        <FiveChoices label={sl(lang,'tension')} labels={TENSION_SCALE[lang]} value={draft.tension} disabled={busy} onChange={n=>answer('tension',n)} />
      </> : null}
      {row&&!editing ? <button className="v5-link v5-meta" onClick={()=>{setOptional(true);setDetails(true);}}>{v5t(lang,'supplement')}</button>:null}
      {status==='saving'?<p role="status" className="v5-meta">{v5t(lang,'saving')}</p>:null}
      {status==='error'?<p role="alert" className="v5-error">{v5t(lang,'failed')} <button className="v5-link" onClick={()=>void save(()=>undefined,afterSave.current)}>{v5t(lang,'retry')}</button></p>:null}
    </section>
    <V11Stage2ProductionSheet visible={details} onClose={()=>{setDetails(false);setCorrection(false);setOptional(false);}} title={v5t(lang,'evidence')} closeLabel={v5t(lang,'close')} theme={theme} reducedMotion={reducedMotion}>
      <div className="ql-v5 v5-sheet-content" data-theme={theme.mode}>
        <p>{reason}</p><span className="v5-tag">{v5t(lang,'rule')}{row?.stateLayer?.classification?.baseline==='personal'?` · ${v5t(lang,'records')} ${row.stateLayer.classification.baselineN}`:''}</span>
        {row?stateDimensions(row,signals,data.executionLogs||[],now).map(d=><div key={d.id} className="v5-row"><div className="v5-row-body"><strong>{v5t(lang,d.id)}</strong><div className="v5-meta">{d.sources.length?v5t(lang,d.sufficient?'sufficient':'limited'):v5t(lang,'missing')}</div>{d.value!=null?<><div className="v5-evidence-meter"><span style={{width:`${d.value/5*100}%`}} /></div><div className="v5-meta">{sl(lang,d.id==='alertness'?'energy':'tension')} {d.value}/5</div></>:null}{d.proxyCount!=null?<div className="v5-meta">{v5t(lang,'switches')}: {d.proxyCount} · {v5t(lang,'proxy')}</div>:null}<div className="v5-meta">{d.sources.map(s=>SIGNAL_NAME[lang][s as keyof typeof SIGNAL_NAME.zh]).join(' · ')}</div></div></div>):null}
        {row?.stateLayer?.classification?<p className="v5-meta">{notUsedLine(row.stateLayer.classification,lang)}</p>:null}
        <div className="v5-inline"><button className="v5-link" onClick={()=>setCorrection(!correction)}>{v5t(lang,'update')}</button><button className="v5-link" onClick={()=>{setDetails(false);setEditing(true);}}>{v5t(lang,'recheck')}</button><button className="v5-link" onClick={()=>setOptional(!optional)}>{v5t(lang,'supplement')}</button></div>
        {correction&&row?.stateLayer ? <div className="v5-inline">{STATE_TYPES.map(type=><button className="v5-button secondary" key={type} disabled={busy} onClick={()=>void save(()=>updateStateCheckIn(row.id,{stateLayer:{...row.stateLayer!,correction:{type,at:new Date().toISOString()}}}),()=>setCorrection(false))}>{TYPE_NAME[lang][type]}</button>)}<small>{v5t(lang,'originalReason')}</small></div>:null}
        {optional&&row?<><p className="v5-meta">{sl(lang,'optional')}</p><div className="v5-inline">{(['none','few','many'] as OpenLoops[]).map(value=><button className="v5-button secondary" key={value} disabled={busy} aria-pressed={row.stateLayer?.openLoops===value} onClick={()=>update({openLoops:value})}>{OPEN_LOOPS_LABEL[lang][value]}</button>)}</div><div className="v5-inline">{(['want_cant','can_dont_want','unsure'] as Pull[]).map(value=><button className="v5-button secondary" key={value} disabled={busy} aria-pressed={row.stateLayer?.pull===value} onClick={()=>update({pull:value})}>{PULL_LABEL[lang][value]}</button>)}</div></>:null}
        {status!=='idle'?<p role="status">{v5t(lang,status==='saving'?'saving':'failed')}{status==='error'?<button className="v5-link" onClick={()=>void save(()=>undefined,afterSave.current)}>{v5t(lang,'retry')}</button>:null}</p>:null}
      </div>
    </V11Stage2ProductionSheet>
  </>;
}
