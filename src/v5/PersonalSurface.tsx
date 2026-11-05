import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { getLanguage } from '../i18n';
import QuestIcon, { type V5IconName as QuestIconName } from './PrototypeIcon';
import AccountSyncSection from '../sync-v2/AccountSyncSection';
import { authService } from '../sync-v2/supabase';
import { readSyncState } from '../sync-v2/runtime';
import SettingsScreen from '../screens/SettingsScreen';
import RecordBackupActions from '../backup/RecordBackupActions';
import ShortcutSettings from './ShortcutSettings';
import V11Stage2ProductionSheet from '../v11-stage2-rebaseline/V11Stage2ProductionSheet';
import { getV11ThemeTokens } from '../v11/tokens';
import { useQuestTheme } from '../design/useQuestTheme';
import { isDarkTheme } from '../design/surfaces';
import useV11ReducedMotion from '../v11/useV11ReducedMotion';
import { useDeviceData } from '../platform/useDeviceData';

export default function V5PersonalSurface() {
  const {data,setSettings}=useStore();const lang=getLanguage(data.settings.language);const text=(zh:string,en:string)=>lang==='zh'?zh:en;
  const {data:device}=useDeviceData();
  const healthReceived=device.observations.filter(o=>o.sourcePlatform==='shortcut').map(o=>o.importedAt).sort().at(-1);
  const q=useQuestTheme(data.settings.selectedThemeId);const dark=isDarkTheme(q);const theme=getV11ThemeTokens(dark?'dark':'light');const reduced=useV11ReducedMotion();
  const entry=new URLSearchParams(window.location.search).get('v5_section');
  const [sheet,setSheet]=useState<string|null>(entry==='shortcuts'?'health':entry==='account'?'account':null);
  const [signed,setSigned]=useState(false);const [synced,setSynced]=useState<string|undefined>();
  useEffect(()=>{let live=true;const refresh=async()=>{const [id,s]=await Promise.all([authService.getUserId(),readSyncState()]);if(live){setSigned(!!id);setSynced(s?.lastSuccessAt)}};void refresh().catch(()=>{});const stop=authService.subscribe(()=>void refresh().catch(()=>{}));return()=>{live=false;stop()};},[]);
  const titles:Record<string,string>={account:text('账号与同步','Account and sync'),health:text('健康与快捷指令','Health and Shortcuts'),records:text('记录与数据','Records and data'),appearance:text('外观与语言','Appearance and language'),settings:text('偏好与隐私','Preferences and privacy')};
  const row=(icon:QuestIconName,title:string,sub:string,value:string,key:string)=><button className="v5-personal-row" onClick={()=>setSheet(key)}><QuestIcon name={icon} size={19} color="currentColor"/><div><strong>{title}</strong>{sub?<small>{sub}</small>:null}</div><span>{value} ›</span></button>;
  return <div className="v5-scroll"><main className="ql-v5 v5-page" data-theme={dark?'dark':'light'} data-testid="v5-personal">
    <section className="v5-profile v5-glass"><div className="v5-icon-tile"><QuestIcon name="person" size={26} color="currentColor"/></div><div><h1>{text('你的 QuestLife','Your QuestLife')}</h1><p>{text(signed?'账号已连接':'账号尚未连接',signed?'Account connected':'Account not connected')}<br/>{text('查看与管理数据来源','View and manage data sources')}</p></div><button className="v5-pill" onClick={()=>setSheet('account')}>{text('账号','Account')}</button></section>
    <h2 className="v5-personal-section">{text('记录与同步','Records and sync')}</h2><section className="v5-personal-group v5-glass">{row('cloud',text('账号同步','Account sync'),synced?text('最近同步 ','Last synced ')+new Date(synced).toLocaleString():text('连接账号后跨设备同步','Connect for cross-device sync'),text(signed?'已连接':'未连接',signed?'Connected':'Not connected'),'account')}{row('book',text('记录与数据','Records and data'),text('导出、导入与恢复','Export, import and restore'),text('管理','Manage'),'records')}</section>
    <h2 className="v5-personal-section">{text('健康与设备','Health and devices')}</h2><section className="v5-health v5-glass"><div className="v5-inline"><QuestIcon name="heartPulse" size={19} color="currentColor"/><strong>{text('Apple 健康','Apple Health')}</strong></div><p>{text('通过 iOS 快捷指令同步睡眠、步数、静息心率与 HRV。健康上传需要独立同意。','Sync sleep, steps, resting heart rate and HRV through iOS Shortcuts. Health upload needs separate consent.')}</p><p>{healthReceived?text('本设备最近收到：','Last received on this device: ')+new Date(healthReceived).toLocaleString():text('本设备尚未收到快捷指令健康数据','No Shortcut health data received on this device')}</p>{row('cloud',text('健康云同步','Health cloud sync'),text('查看授权与同步状态','Consent and sync status'),text('管理','Manage'),'health')}{row('calendar',text('日历与手表','Calendar and Watch'),text('五项快捷指令设置','Set up five Shortcuts'),'','health')}</section>
    <h2 className="v5-personal-section">{text('偏好与隐私','Preferences and privacy')}</h2><section className="v5-personal-group v5-glass">{row('settings',text('外观与语言','Appearance and language'),'',text(dark?'深色':'浅色',dark?'Dark':'Light'),'appearance')}{row('bell',text('通知与提醒','Notifications'),'',text('管理','Manage'),'settings')}{row('shield',text('隐私与数据控制','Privacy and data controls'),'','','settings')}</section><button className="v5-link" style={{width:'100%',fontSize:10}} onClick={()=>setSheet('settings')}>{text('QuestLife · 关于与版本','QuestLife · About')} ›</button>
    <V11Stage2ProductionSheet visible={!!sheet} onClose={()=>setSheet(null)} title={titles[sheet??'']??titles.settings} closeLabel={text('关闭','Close')} theme={theme} reducedMotion={reduced}><div className="ql-v5 v5-sheet-content" data-theme={dark?'dark':'light'}>
      {sheet==='account'?<AccountSyncSection/>:sheet==='health'?<ShortcutSettings lang={lang} dark={dark}/>:sheet==='records'?<RecordBackupActions/>:sheet==='appearance'?<><div className="v5-segments">{(['cleanFocus','deepWork'] as const).map((id,i)=><button key={id} aria-pressed={q.id===id} onClick={()=>setSettings({selectedThemeId:id})}>{text(['浅色','深色'][i],['Light','Dark'][i])}</button>)}</div><div className="v5-segments">{(['zh','en'] as const).map(l=><button key={l} aria-pressed={lang===l} onClick={()=>setSettings({language:l})}>{l==='zh'?'中文':'English'}</button>)}</div></>:sheet==='settings'?<SettingsScreen/>:null}
    </div></V11Stage2ProductionSheet>
  </main></div>;
}
