import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import { getLanguage } from '../i18n';
import { useQuestTheme } from '../design/useQuestTheme';
import { isDarkTheme } from '../design/surfaces';
import { getQuestVisualFoundation } from '../design/visualFoundation';
import QuestIcon, { type V5IconName as QuestIconName } from './PrototypeIcon';
import { stateCalendar, calendarSummary } from '../state-layer/calendar';
import { localYmd } from '../state-layer/signals';
import { TYPE_NAME } from '../state-layer/copy';
import StateInsightsSection from '../state-layer/StateInsightsSection';
import { buildOwnerQuantSnapshot, loadOwnerQuantArtifacts, type OwnerQuantRuntimeArtifacts } from '../adaptive-decision/ownerQuantRuntime';
import { withDeviceObservations } from '../platform/health/normalization';
import { useDeviceData } from '../platform/useDeviceData';
import { authService } from '../sync-v2/supabase';
import { adaptQuantProductBundleV1 } from '../quant-product/quantProductV1Adapter';
import { availableChartKinds, buildPersonalContext, formatQuantValue, instrumentLabel, isChartKindRenderable, rangeLabel, selectSeriesPoints, seriesForInstrument, type InsightsV3ChartKind, type InsightsV3RangeSelection } from '../insights-v3/insightsV3Presentation';
import InsightsV3Chart, { type InsightsV3ChartHandle, type InsightsV3ComparisonSeries } from '../insights-v3/InsightsV3Chart';
import { InsightsDetails, type InsightsDetailKind } from '../native/insights/InsightsDetails';
import { AnalystPanel, AnalyzeOverviewPanel } from '../insights-v3/InsightsV3Analysis';
import { typeColor } from '../state-layer/StateLayerToday';
import V11Stage2ProductionSheet from '../v11-stage2-rebaseline/V11Stage2ProductionSheet';
import { getV11ThemeTokens } from '../v11/tokens';
import useV11ReducedMotion from '../v11/useV11ReducedMotion';
import { withinThreeSeconds } from './round2Presentation';

export default function V5InsightsSurface() {
  const {data}=useStore();const device=useDeviceData();const lang=getLanguage(data.settings.language);const text=(zh:string,en:string)=>lang==='zh'?zh:en;
  const q=useQuestTheme(data.settings.selectedThemeId);const dark=isDarkTheme(q);const theme=getV11ThemeTokens(dark?'dark':'light');const reduced=useV11ReducedMotion();const foundation=useMemo(()=>getQuestVisualFoundation(q),[q]);
  const [variable,setVariable]=useState('state');const [days,setDays]=useState(30);const [view,setView]=useState('trend');
  const [customRange,setCustomRange]=useState<InsightsV3RangeSelection|null>(null);
  const [compareIds,setCompareIds]=useState<string[]>([]);
  const [layers,setLayers]=useState({observations:true,reference:true,range:false,events:true,short:false,long:false});
  const chart=useRef<InsightsV3ChartHandle>(null);
  const [kind,setKind]=useState<InsightsV3ChartKind>('line');const [tool,setTool]=useState<string|null>(null);const [day,setDay]=useState<string|null>(null);
  const [result,setResult]=useState<OwnerQuantRuntimeArtifacts|null>(null);const [busy,setBusy]=useState(false);const [failed,setFailed]=useState(false);const [account,setAccount]=useState<string|null>(null);
  const ticket=useRef(0);const actual=useMemo(()=>withDeviceObservations(data,device.data.observations),[data,device.data.observations]);
  const snapshot=useMemo(()=>JSON.stringify(buildOwnerQuantSnapshot(actual,true)),[actual]);const latest=useRef(actual);latest.current=actual;
  useEffect(()=>{let active=true;void authService.getUserId().then(id=>{if(active)setAccount(id)});const stop=authService.subscribe(s=>setAccount(s?.userId??null));return()=>{active=false;stop()};},[]);
  const load=useCallback(async()=>{const id=++ticket.current;setBusy(true);setFailed(false);try{const r=await withinThreeSeconds(loadOwnerQuantArtifacts({data:latest.current,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,asOf:new Date().toISOString()}));if(id===ticket.current){setResult(r);setFailed(r.status==='unavailable')}}catch{if(id===ticket.current)setFailed(true)}finally{if(id===ticket.current)setBusy(false)}},[snapshot,account]);
  useEffect(()=>{setResult(null);void load();return()=>{ticket.current++}},[load]);
  const model=useMemo(()=>result?.product?adaptQuantProductBundleV1(result.product):null,[result]);
  const names=Object.fromEntries([...data.skills.map(r=>[`skill:${r.id}`,r.name]),...data.categories.map(r=>[`goal:${r.id}`,r.name])]);
  const selected=model?.instruments.find(i=>i.id===variable);const series=seriesForInstrument(selected??null);const raw=result?.product?.instruments.find(i=>i.instrument_id===variable);
  const range:InsightsV3RangeSelection=customRange??{kind:'last_n_days',days};
  const selectDays=(n:number)=>{setDays(n);setCustomRange(null)};
  const selectVariable=(id:string)=>{setVariable(id);setKind('line');setCompareIds([]);setCustomRange(null);setView('trend')};
  const comparisons:InsightsV3ComparisonSeries[]=compareIds.flatMap(id=>{
    const item=model?.instruments.find(i=>i.id===id);const itemSeries=seriesForInstrument(item??null);
    if(!item||!itemSeries)return [];
    const overlap=result?.analysis?.compare_overlaps.find(r=>r.target_instrument_id===variable&&r.compare_instrument_id===id);
    return [{instrumentId:id,label:instrumentLabel(lang,item,names[item.entityId]),series:itemSeries,matchingWindowKey:overlap?.matching_window_key??null,overlapCount:overlap?.overlapping_window_count??null}];
  });
  const indicators=(result?.analysis?.indicator_series??[]).filter(i=>i.instrument_id===variable&&((i.layer_kind==='EWMA_SHORT'&&layers.short)||(i.layer_kind==='EWMA_LONG'&&layers.long))).map(i=>({label:text(i.layer_kind==='EWMA_SHORT'?'短期平滑':'长期平滑',i.layer_kind==='EWMA_SHORT'?'Short smoothing':'Long smoothing'),series:i}));
  const chartKinds=series?availableChartKinds(series).filter(k=>isChartKindRenderable(series,k,range)):[];
  const renderedKind=chartKinds.includes(kind)?kind:chartKinds[0]??'line';
  const points=series&&model?selectSeriesPoints(series,range,model.asOf):[];
  const personal=selected?buildPersonalContext(lang,selected):null;
  const cal=useMemo(()=>stateCalendar(data.stateCheckIns??[],localYmd(new Date()),days),[data.stateCheckIns,days]);const summary=calendarSummary(cal);
  const rows=(data.stateCheckIns??[]).filter(r=>!r.dataProvenance?.deleted&&cal.some(c=>c.date===r.date));const latestRow=[...rows].sort((a,b)=>b.timestamp.localeCompare(a.timestamp))[0];
  const label=selected?instrumentLabel(lang,selected,names[selected.entityId]):text('状态','State');
  const toolNames:Record<string,string>={compare:text('比较','Compare'),indicators:text('指标','Indicators'),methods:text('分析方法','Methods'),analyst:text('解读','Interpretation'),history:text('历史与记录','History'),correlation:text('相关','Relationships'),distribution:text('分布','Distribution'),drivers:text('关联因素','Associations'),similar:text('相似时期','Similar periods'),recovery:text('恢复轨迹','Recovery'),scenario:text('历史情境','Historical scenarios'),'joint-analysis':text('联合分析','Joint analysis')};
  const needsLogin=result?.limitations.some(c=>c==='QUANT_AUTH_REQUIRED')??false;
  const detailKind:InsightsDetailKind=tool==='history'?'history':tool==='correlation'||tool==='joint-analysis'?'jointAnalysis':(['drivers','similar','recovery','scenario'].includes(tool??'')?tool as InsightsDetailKind:'evidence');
  return <div className="v5-scroll"><main className="ql-v5 v5-page" data-theme={dark?'dark':'light'} data-testid="v5-insights">
    <div className="v5-analysis-top"><label className="v5-glass"><QuestIcon name="barChart" size={17} color="currentColor"/><select aria-label={text('变量','Variable')} value={variable} onChange={e=>selectVariable(e.target.value)}><option value="state">{text('状态','State')}</option>{model?.instruments.map(i=><option key={i.id} value={i.id}>{instrumentLabel(lang,i,names[i.entityId])}</option>)}</select></label><label className="v5-glass"><QuestIcon name="calendar" size={17} color="currentColor"/><select aria-label={text('日期范围','Date range')} value={customRange?'custom':days} onChange={e=>selectDays(Number(e.target.value))}>{customRange?<option value="custom">{rangeLabel(lang,customRange)}</option>:null}{[7,30,90,365].map(n=><option key={n} value={n}>{text(`最近 ${n} 天`,`Last ${n} days`)}</option>)}</select></label></div>
    <div className="v5-segments" role="group" aria-label={text('分析视图','Analysis view')}>{['trend','distribution','compare','correlation'].map((v,i)=><button key={v} aria-pressed={view===v} onClick={()=>{setView(v);if(v!=='trend')setTool(v)}}>{text(['趋势','分布','对比','相关'][i],['Trend','Distribution','Compare','Relationships'][i])}</button>)}</div>
    <section className="v5-chart-panel v5-glass"><div className="v5-chart-title"><strong>{label} · {text(variable==='state'?'签到日历':'实际观察',variable==='state'?'Check-in calendar':'Recorded observations')}</strong>{series?<select aria-label={text('图表类型','Chart type')} value={renderedKind} onChange={e=>setKind(e.target.value as InsightsV3ChartKind)}>{chartKinds.map(k=><option key={k} value={k}>{text(k==='candle'?'区间蜡烛':k==='bar'?'条形':k==='point'?'单点':'折线',k)}</option>)}</select>:<button onClick={()=>setTool('history')}>{text('查看记录','Records')} ↗</button>}</div>
      {variable==='state'?<><div className="v5-calendar" aria-label={text('状态日历','State calendar')}>{cal.map(d=><button key={d.date} data-recorded={!!d.type} style={d.type?{backgroundColor:typeColor(theme,d.type)}:undefined} aria-label={`${d.date} ${d.type?TYPE_NAME[lang][d.type]:text('未记录','Not recorded')}`} onClick={()=>{setDay(d.date);setTool('history')}}>{Number(d.date.slice(-2))}</button>)}</div><p className="v5-meta">{summary.logged?text(`${summary.logged} 天有签到，空格不补。`,`${summary.logged} days recorded; gaps stay empty.`):text('当前范围没有签到。记录当下感受，逐步建立自己的常态。','No check-ins in this range. Record how you feel to build your own baseline.')}</p></>:series&&model&&points.length?<><InsightsV3Chart ref={chart} asOf={model.asOf} chartKind={renderedKind} foundation={foundation} lang={lang} range={range} series={series} targetLabel={label} comparisonSeries={comparisons} indicatorSeries={indicators} showEvents={layers.events} showRawObservations={layers.observations} showReference={layers.reference} showReferenceRange={layers.range}/><div className="v5-chart-actions"><button aria-label={text('缩小','Zoom out')} onClick={()=>chart.current?.zoomOut()}>−</button><button aria-label={text('复位图表','Reset chart')} onClick={()=>chart.current?.fit()}>{text('复位','Reset')}</button><button aria-label={text('放大','Zoom in')} onClick={()=>chart.current?.zoomIn()}>＋</button></div></>:<p className="v5-empty">{failed?text('分析读取失败，请重试。','Analysis failed. Please retry.'):text('当前范围没有合格观察，不绘制趋势。','No eligible observations in this range. No trend is drawn.')}</p>}
      <div className="v5-range-buttons">{[7,30,90,365].map(n=><button key={n} aria-pressed={!customRange&&days===n} onClick={()=>selectDays(n)}>{text(n===365?'1年':`${n}天`,n===365?'1Y':`${n}D`)}</button>)}</div>
    </section>
    <section className="v5-summary v5-glass">{(variable==='state'?[[latestRow?.energy==null?'—':`${latestRow.energy}/5`,text('最近精力','Latest energy')],[latestRow?.stateLayer?.tension==null?'—':`${latestRow.stateLayer.tension}/5`,text('最近紧绷','Latest tension')],[summary.logged?String(summary.logged):'—',text('有记录天数','Recorded days')],[rows.length?String(rows.length):'—',text('签到记录','Check-ins')]]:[[personal?.currentValue??'—',text('当前读数','Current reading')],[personal?.referenceValue??'—',text('个人参考','Personal reference')],[selected?.change?.absolute==null?'—':formatQuantValue(selected.change.absolute,selected.unit,lang),text('相对参考','Change')],[String(points.length),text('实际观察','Observations')]]).map(([value,name])=><div key={name}><strong>{value}</strong><span>{name}</span></div>)}</section>
    <section className="v5-insight v5-glass"><small className="v5-meta">{text('当前分析','Current analysis')}</small><h2>{variable==='state'?(summary.logged?text('保留每次真实感受，观察自己的变化','Keep each real observation'):text('从一次真实签到开始','Start with a real check-in')):personal?.summary??text('等待合格的观察','Waiting for eligible observations')}</h2><p>{variable==='state'?text('依据来自你的签到；不把一次感受当成稳定趋势。','Evidence comes from check-ins, not a trend inferred from a single point.'):text('参考、变化和资格均来自现有分析结果，不表示因果。','References and changes come from the existing analysis, not causal claims.')}</p>{busy?<p role="status">{text('正在读取其他变量…','Loading other variables…')}</p>:needsLogin?<p>{text('登录后可读取账号的同步分析；当前签到保留在本设备。','Sign in to load synced analysis. Local check-ins stay on this device.')} <a href="/?v5_section=account">{text('登录','Sign in')} ↗</a></p>:failed?<div role="alert"><p>{text('其他变量读取未完成，不等于没有数据。','Other variables could not be loaded. This does not mean no data.')}</p><button className="v5-pill" onClick={()=>void load()}>{text('重试','Retry')}</button></div>:null}</section>
    <div className="v5-analysis-tools">{(['compare','indicators','methods','analyst','history'] as const).map((id,i)=><button key={id} onClick={()=>{setDay(null);setTool(id)}}><QuestIcon name={(['compare','barChart','nodes','analyst','book'] as QuestIconName[])[i]} size={21} color="currentColor"/><strong>{toolNames[id]}</strong><small>{text(['其他变量','已有结果','资格与限制','解读与依据','来源与观察'][i],['Variables','Results','Eligibility','Evidence','Observations'][i])}</small></button>)}</div>
    <V11Stage2ProductionSheet visible={!!tool} onClose={()=>{setTool(null);setDay(null);setView('trend')}} title={toolNames[tool??'']??text('依据','Evidence')} closeLabel={text('关闭','Close')} theme={theme} reducedMotion={reduced}><div className="ql-v5 v5-sheet-content" data-theme={dark?'dark':'light'}>
      {variable==='state'?(tool==='history'?<>{rows.filter(r=>!day||r.date===day).length?rows.filter(r=>!day||r.date===day).slice(-40).reverse().map(r=><div className="v5-row" key={r.id}><div><strong>{new Date(r.timestamp).toLocaleString(lang==='zh'?'zh-CN':'en-GB')}</strong><p>{text('精力','Energy')} {r.energy??'—'}/5 · {text('紧绷','Tension')} {r.stateLayer?.tension??'—'}/5</p><small>{text('来源','Source')}: {r.stateLayer?.source==='watch_shortcut'?text('手表快捷指令','Watch Shortcut'):text('本人签到','Self check-in')}</small></div></div>):<p>{text('所选日期没有签到','No check-in for the selected date')}</p>}</>:tool==='distribution'?summary.counts.map(r=><div className="v5-row" key={r.type}><span className="v5-row-body">{TYPE_NAME[lang][r.type]}</span><span>{r.days} {text('天','days')}</span></div>):<StateInsightsSection lang={lang} theme={theme}/>):result?.product&&raw?<>
        {tool==='analyst'?<AnalystPanel bundle={result.product} foundation={foundation} lang={lang}/>:tool==='compare'?<>
          <p>{text('最多选择三个变量，各自保留单位与刻度，不合成为总分。','Choose up to three variables. Units and scales stay independent.')}</p>
          {model?.instruments.filter(i=>i.id!==variable&&seriesForInstrument(i)).map(i=><label className="v5-row v5-choice" key={i.id}><input type="checkbox" checked={compareIds.includes(i.id)} disabled={!compareIds.includes(i.id)&&compareIds.length>=3} onChange={()=>setCompareIds(ids=>ids.includes(i.id)?ids.filter(id=>id!==i.id):[...ids,i.id])}/><span>{instrumentLabel(lang,i,names[i.entityId])}</span></label>)}
          {!model?.instruments.some(i=>i.id!==variable&&seriesForInstrument(i))?<p>{text('当前没有另一个可比较的时间序列。','No other comparable time series is available.')}</p>:null}
        </>:tool==='indicators'?<>
          {(['observations','reference','range','events','short','long'] as const).filter(key=>!['short','long'].includes(key)||result.analysis?.indicator_series.some(i=>i.instrument_id===variable&&i.layer_kind===(key==='short'?'EWMA_SHORT':'EWMA_LONG'))).map((key)=><label className="v5-row v5-choice" key={key}><input type="checkbox" checked={layers[key]} onChange={()=>setLayers(s=>({...s,[key]:!s[key]}))}/><span>{text({observations:'真实观察',reference:'个人参考',range:'参考范围',events:'事件标记',short:'短期平滑',long:'长期平滑'}[key],key)}</span></label>)}
        </>:tool==='methods'?<AnalyzeOverviewPanel analysis={result.analysis?.joint_analyses.find(i=>i.target_instrument_id===variable)??null} analysisError={false} analysisLoading={false} foundation={foundation} instrument={raw} lang={lang} onOpen={setTool}/>:tool==='distribution'?<p>{text('这个变量当前没有分布分析结果，保留真实观察与区间视图。','This variable has no distribution result. Recorded observations and range views remain available.')}</p>:<InsightsDetails q={q} lang={lang} bundle={result.product} instrument={raw} series={series??null} points={points} range={range} analysis={result.analysis??null} kind={detailKind} entityNames={names} onJump={r=>{setCustomRange(r);setTool(null);setView('trend')}} onSelect={id=>{selectVariable(id);setTool(null)}}/>}
      </>:<p>{text('当前变量没有可展示的分析结果。','No analysis results available for this variable.')}</p>}
    </div></V11Stage2ProductionSheet>
  </main></div>;
}
