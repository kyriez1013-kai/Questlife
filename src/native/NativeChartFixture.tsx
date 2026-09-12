import React,{useMemo,useRef,useState} from 'react';
import {Pressable,ScrollView,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {StatusBar} from 'expo-status-bar';
import fixture from '../quant-product/fixtures/mature_market_full.json';
import {parseQuantProductBundleV1} from '../quant-product/quantProductContract';
import {adaptQuantProductBundleV1} from '../quant-product/quantProductV1Adapter';
import {getQuestVisualFoundation} from '../design/visualFoundation';
import {questThemes} from '../design/tokens';
import {nativeCopy as c} from '../platform/nativeI18n';
import QuantChart from '../platform/charts/QuantChart';
import type {InsightsV3ChartHandle} from '../insights-v3/InsightsV3Chart';

/** Explicit development build fixture; no Store, source services, or persistence. */
export default function NativeChartFixture(){
  const model=useMemo(()=>{const parsed=parseQuantProductBundleV1(fixture);if(!parsed.ok)throw new Error('invalid_chart_fixture');return adaptQuantProductBundleV1(parsed.bundle);},[]);
  const [kind,setKind]=useState<'line'|'candle'|'bar'>('line');const [dark,setDark]=useState(true);const [duration,setDuration]=useState<number|null>(null);
  const f=getQuestVisualFoundation(questThemes[dark?'deepWork':'cleanFocus']);const ref=useRef<InsightsV3ChartHandle>(null);
  const instrument=model.instruments.find(i=>i.series.some(s=>Object.values(s.candles).some(rows=>rows.length)))??model.instruments[0];const series=instrument.series[0];
  const range=series.supported_ranges.find(r=>(series.candles[r.key]?.length??0)>0)??series.supported_ranges[0];
  const action=(label:string,onPress:()=>void)=><Pressable key={label} accessibilityRole="button" onPress={onPress} style={{minHeight:44,minWidth:44,padding:12,backgroundColor:f.material.base}}><Text style={{color:f.text.primary}}>{label}</Text></Pressable>;
  return <SafeAreaView style={{flex:1,backgroundColor:f.environment.canvas}}><StatusBar style={dark?'light':'dark'}/><ScrollView contentContainerStyle={{padding:16,gap:16}}>
    <Text style={{color:f.text.primary,fontSize:20}}>DEV ONLY · SYNTHETIC CHART · NO PERSISTENCE</Text>
    <Text style={{color:f.text.secondary}}>{instrument.id} · render {duration?.toFixed(1)??'—'} ms</Text>
    <QuantChart ref={ref} model={{version:1,presentation:{series,asOf:model.asOf,range:{kind:'contract',key:range.key},chartKind:kind,foundation:f,lang:'en',targetLabel:instrument.id,onReady:setDuration,showEvents:true,showRawObservations:true,showReference:true,showReferenceRange:true}}}/>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{(['line','candle','bar'] as const).map(k=>action(c('en',k),()=>setKind(k)))}{action(c('en','fit'),()=>ref.current?.fit())}{action('+',()=>ref.current?.zoomIn())}{action('-',()=>ref.current?.zoomOut())}{action(c('en','appearance'),()=>setDark(v=>!v))}</View>
  </ScrollView></SafeAreaView>;
}
