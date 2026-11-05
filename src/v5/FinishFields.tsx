import React from 'react';
import type { Lang } from '../i18n';
import { v5t } from './copy';

export default function FinishFields(p:{lang:Lang;minutes:string;note:string;difficulty?:'easier'|'same'|'harder';disabled:boolean;onMinutes:(v:string)=>void;onNote:(v:string)=>void;onDifficulty:(v:'easier'|'same'|'harder')=>void;onFull:()=>void}) {
  return <div className="ql-v5 v5-finish">
    <label>{v5t(p.lang,'actualMinutes')}<input type="number" inputMode="decimal" min="0.1" step="any" value={p.minutes} disabled={p.disabled} onChange={e=>p.onMinutes(e.target.value)}/></label>
    <fieldset disabled={p.disabled}><legend>{v5t(p.lang,'difficulty')}</legend><div className="v5-inline">{(['easier','same','harder'] as const).map(value=><button type="button" className="v5-button secondary" aria-pressed={p.difficulty===value} key={value} onClick={()=>p.onDifficulty(value)}>{v5t(p.lang,value)}</button>)}</div></fieldset>
    <label>{v5t(p.lang,'note')}<textarea rows={2} value={p.note} disabled={p.disabled} onChange={e=>p.onNote(e.target.value)}/></label>
    <button className="v5-link" disabled={p.disabled} onClick={p.onFull}>{v5t(p.lang,'fields')}</button>
  </div>;
}
