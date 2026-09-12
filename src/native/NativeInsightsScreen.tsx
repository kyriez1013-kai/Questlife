import React,{useMemo,useRef,useState} from 'react';
import {ScrollView,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useStore} from '../store';
import {getLanguage} from '../i18n';
import {loadOwnerQuantArtifacts,type OwnerQuantRuntimeArtifacts} from '../adaptive-decision/ownerQuantRuntime';
import {adaptQuantProductBundleV1} from '../quant-product/quantProductV1Adapter';
import {withDeviceObservations} from '../platform/health/normalization';
import {useDeviceData} from '../platform/useDeviceData';
import {nativeCopy as c} from '../platform/nativeI18n';
import QuantChart from '../platform/charts/QuantChart';
import {NativeAction,NativeSection,useNativeTheme} from './NativeControls';
import {instrumentLabel,formatQuantValue,unitLabel,rangeLabel,evidenceStageLabel,type InsightsV3ChartKind} from '../insights-v3/insightsV3Presentation';
import {iv3} from '../insights-v3/insightsV3I18n';
import type {InsightsV3ChartHandle} from '../insights-v3/InsightsV3Chart';

export default function NativeInsightsScreen() {
  const {data}=useStore();const lang=getLanguage(data.settings.language);const f=useNativeTheme();const device=useDeviceData();
  const [result,setResult]=useState<OwnerQuantRuntimeArtifacts|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState(false);
  const [selected,setSelected]=useState('');const [range,setRange]=useState('');const [kind,setKind]=useState<InsightsV3ChartKind>('line');const [compare,setCompare]=useState(false);
  const [showIndicators,setShowIndicators]=useState(false);
  const ref=useRef<InsightsV3ChartHandle>(null);
  const model=useMemo(()=>result?.product?adaptQuantProductBundleV1(result.product):null,[result]);
  const instrument=model?.instruments.find(i=>i.id===selected)??model?.instruments[0];
  const series=instrument?.series[0];const selectedRange=series?.supported_ranges.find(r=>r.key===range)??series?.supported_ranges.find(r=>r.key===series.default_range_key)??series?.supported_ranges[0];
  const refresh=async()=>{if(busy)return;setBusy(true);setError(false);try{setResult(await loadOwnerQuantArtifacts({data:withDeviceObservations(data,device.data.observations),timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,asOf:new Date().toISOString()}));}catch{setError(true);}finally{setBusy(false);}};
  const comparisons=compare?(model?.instruments??[]).filter(i=>i.id!==instrument?.id&&i.unit===instrument?.unit&&i.series.length).slice(0,2).map(i=>({instrumentId:i.id,label:instrumentLabel(lang,i),matchingWindowKey:null,overlapCount:null,series:i.series[0]})):[];
  const supported=series?.supported_chart_types??[];
  const indicators=(result?.analysis?.indicator_series??[]).filter(item=>item.instrument_id===instrument?.id&&item.points.length>0).map(item=>({label:iv3(lang,item.layer_kind==='EWMA_SHORT'?'shortEwmaIndicator':'longEwmaIndicator'),series:item}));
  const actualKind=supported.includes(kind.toUpperCase() as never)?kind:'line';
  return <SafeAreaView edges={['top','left','right']} style={{flex:1,backgroundColor:f.environment.canvas}}>
    <ScrollView contentContainerStyle={{padding:20,gap:16}}>
      <View style={{flexDirection:'row',alignItems:'center',gap:12}}><Text accessibilityRole="header" style={{flex:1,fontSize:22,color:f.text.primary}}>{c(lang,'quant')}</Text><NativeAction label={c(lang,'refresh')} busy={busy} onPress={()=>void refresh()}/></View>
      <Text style={{fontSize:13,lineHeight:19,color:f.text.secondary}}>{c(lang,'analysisConsent')}</Text>
      {!instrument?<Text style={{fontSize:16,lineHeight:24,color:f.text.primary}}>{c(lang,error||result?.status==='unavailable'?'runtimeUnavailable':'dataUnavailable')}</Text>:<>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}}>{model!.instruments.map(i=><NativeAction key={i.id} selected={i.id===instrument.id} label={instrumentLabel(lang,i)} onPress={()=>{setSelected(i.id);setRange('');setKind('line');}}/>)}</ScrollView>
        <Text style={{fontSize:32,color:f.text.primary}}>{formatQuantValue(instrument.latest?.value??null,instrument.unit,lang)} <Text style={{fontSize:13}}>{unitLabel(instrument.unit,lang)}</Text></Text>
        {series&&selectedRange?<>
          <ScrollView horizontal contentContainerStyle={{gap:8}}>{series.supported_ranges.map(r=><NativeAction key={r.key} selected={r.key===selectedRange.key} label={rangeLabel(lang,{kind:'contract',key:r.key})} onPress={()=>setRange(r.key)}/>)}</ScrollView>
          <QuantChart ref={ref} model={{version:1,presentation:{asOf:model!.asOf,series,range:{kind:'contract',key:selectedRange.key},chartKind:actualKind,foundation:f,lang,targetLabel:instrumentLabel(lang,instrument),showEvents:true,showRawObservations:true,showReference:true,showReferenceRange:true,comparisonSeries:comparisons,indicatorSeries:showIndicators?indicators:[]}}}/>
          {indicators.length>0?<NativeAction label={iv3(lang,'indicators')} selected={showIndicators} onPress={()=>setShowIndicators(v=>!v)}/>:null}
          <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>{(['line','candle','bar'] as const).filter(k=>supported.includes(k.toUpperCase() as never)).map(k=><NativeAction key={k} label={c(lang,k)} selected={actualKind===k} onPress={()=>setKind(k)}/>)}<NativeAction label={c(lang,'fit')} onPress={()=>ref.current?.fit()}/>{model!.instruments.filter(i=>i.unit===instrument.unit&&i.series.length).length>1?<NativeAction label={c(lang,'compare')} selected={compare} onPress={()=>setCompare(v=>!v)}/>:null}</View>
        </>:<Text style={{color:f.text.secondary}}>{c(lang,'dataUnavailable')}</Text>}
        <NativeSection title={iv3(lang,'reference')}><Text style={{color:f.text.primary}}>{formatQuantValue(instrument.reference.value,instrument.reference.unit,lang)} {unitLabel(instrument.reference.unit,lang)}</Text></NativeSection>
        <NativeSection title={iv3(lang,'evidence')}><Text style={{color:f.text.primary}}>{evidenceStageLabel(lang,instrument.evidence.stage)} · {instrument.evidence.observation_count}</Text></NativeSection>
      </>}
    </ScrollView>
  </SafeAreaView>;
}
