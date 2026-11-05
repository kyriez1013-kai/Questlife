import React,{useEffect,useRef,useState} from 'react';
import type {Lang} from '../i18n';
import {authService} from '../sync-v2/supabase';
import {requestSync} from '../sync-v2/runtime';
import {manageShortcut,type ShortcutStatus} from './shortcutClient';
import {useDeviceData} from '../platform/useDeviceData';
import './v5.css';

export default function ShortcutSettings({lang,dark}:{lang:Lang;dark:boolean}){
  const [status,setStatus]=useState<ShortcutStatus|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [token,setToken]=useState('');const [copied,setCopied]=useState(false);const [deleting,setDeleting]=useState(false);
  const {data:device}=useDeviceData();const generation=useRef(0);const pendingAction=useRef('status');
  const text=(zh:string,en:string)=>lang==='zh'?zh:en;
  const run=async(action:string)=>{if(busy)return;const gen=generation.current;pendingAction.current=action;setBusy(true);setError('');try{const s=await manageShortcut(action);if(gen!==generation.current)return;setStatus(s);if(s.token)setToken(s.token);if(action==='revoke')setToken('');if(action==='delete_health'){setDeleting(false);requestSync(true);}}catch(e){if(gen===generation.current)setError((e as Error).message);}finally{if(gen===generation.current)setBusy(false);}};
  useEffect(()=>{void run('status');let initial=true;const stop=authService.subscribe(()=>{if(initial){initial=false;return;}generation.current++;setToken('');setStatus(null);setBusy(false);setError('signin');});return()=>{generation.current++;stop();};},[]);
  const latest=status?.lastSync.health??device.observations.filter(o=>o.sourcePlatform==='shortcut').map(o=>o.importedAt).sort().at(-1);
  return <section id="v5-shortcuts" className="ql-v5 v5-shortcuts v5-glass" data-theme={dark?'dark':'light'}>
    <h2>{text('手表与快捷指令','Watch and Shortcuts')}</h2><p className="v5-meta">{text('只写令牌：签到、待确认原文、回访、经同意的健康样本及日历占用。不会自动修改计划。','Write-only token for check-ins, pending text, follow-ups, consented health samples and calendar availability. Never adjusts plans automatically.')}</p>
    <a className="v5-link" href="/shortcuts.html" target="_blank" rel="noreferrer">{text('五个快捷指令 · 逐步设置','Set up the five Shortcuts')}</a>
    <div className="v5-inline"><span>{status?text(status.active?'令牌已启用':'令牌未启用',status.active?'Token enabled':'Token disabled'):text('尚未连接','Not connected')}</span><button className="v5-button" disabled={busy} onClick={()=>void run('rotate')}>{text(status?.active?'重新生成':'生成个人令牌',status?.active?'Rotate token':'Create token')}</button>{status?.active?<button className="v5-link" disabled={busy} onClick={()=>void run('revoke')}>{text('撤销','Revoke')}</button>:null}</div>
    {token?<div><p className="v5-meta">{text('只在这次显示。保存在你的快捷指令中，不要分享。重新生成后，旧令牌立即失效。','Shown once. Store in your Shortcut, never share. Rotation invalidates the old token.')}</p><input className="v5-search" type="password" readOnly value={token} aria-label={text('个人只写令牌','Personal write-only token')}/><button className="v5-link" onClick={async()=>{try{await navigator.clipboard.writeText(token);setCopied(true);}catch{setError('clipboard');}}}>{text(copied?'已复制':'复制令牌',copied?'Copied':'Copy token')}</button></div>:null}
    <div className="v5-row"><div className="v5-row-body"><strong>{text('Apple 健康','Apple Health')}</strong><p className="v5-meta">{text('通过 iOS 快捷指令同步（睡眠、步数、静息心率、HRV）','Sync sleep, steps, resting heart rate and HRV via iOS Shortcuts')}</p><p className="v5-meta">{latest?`${text('最近同步','Last sync')} ${new Date(latest).toLocaleString()}`:text('尚无快捷指令健康同步','No Shortcut health sync yet')}</p></div><label><input type="checkbox" checked={!!status?.healthConsent} disabled={!status||busy} onChange={e=>void run(e.target.checked?'health_on':'health_off')}/>{text('同意云同步','Cloud consent')}</label></div>
    <p className="v5-meta">{text('关闭后拒绝新健康写入，已同步样本保留。原生 App 的健康授权是独立入口。','Turning off rejects new health writes, retaining prior samples. Native health authorization remains separate.')}</p>
    <button className="v5-link" disabled={!status||busy} onClick={()=>setDeleting(true)}>{text('删除快捷指令已同步的健康数据','Delete health data synced by Shortcuts')}</button>
    {deleting?<div role="alert"><p>{text('仅删除当前账号中来源为 shortcut 的健康样本。会同步删除到其他客户端，不能撤销；其他来源和执行记录不受影响。','Delete only this account\'s shortcut-source samples across clients. This cannot be undone; other sources and execution records are unaffected.')}</p><div className="v5-inline"><button className="v5-button" disabled={busy} onClick={()=>void run('delete_health')}>{text('确认删除','Confirm deletion')}</button><button className="v5-button secondary" disabled={busy} onClick={()=>setDeleting(false)}>{text('取消','Cancel')}</button></div></div>:null}
    {status?.lastSync.calendar?<p className="v5-meta">{text('日历缓存更新','Calendar cache updated')} {new Date(status.lastSync.calendar).toLocaleString()}</p>:null}
    {busy?<p role="status">{text('正在确认…','Confirming…')}</p>:null}
    {error?<div role="alert" className="v5-error"><p>{error==='signin'?text('请先在账号区登录，再刷新连接状态。','Sign in under Account, then refresh connection status.'):error==='account'?text('账号与本地副本不一致，请先处理账号切换。','Account differs from the local replica. Resolve account switching first.'):error==='clipboard'?text('无法访问剪贴板，请使用输入框系统复制。','Clipboard unavailable. Use the input\'s system Copy command.'):text('快捷指令服务暂不可用。若尚未安装候选迁移，请按交接说明完成；否则可重试。','Shortcut service is unavailable. Install the candidate migration if pending, otherwise retry.')}</p><button className="v5-link" disabled={busy} onClick={()=>void run(error==='signin'?'status':pendingAction.current)}>{text('重试','Retry')}</button></div>:null}
    {status?.deleted!=null&&status.deleted>0?<p role="status">{text('已确认删除','Deletion confirmed')}: {status.deleted}</p>:null}
  </section>;
}
