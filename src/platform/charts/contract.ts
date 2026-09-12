import type { ComponentProps } from 'react';
import type InsightsV3Chart from '../../insights-v3/InsightsV3Chart';
import { selectSeriesCandles, selectSeriesPoints } from '../../insights-v3/insightsV3Presentation';

/** Existing chart presentation, not a second statistical data contract. */
export type QuestLifeChartModelV1 = {
  version: 1;
  presentation: ComponentProps<typeof InsightsV3Chart>;
};
export type ChartCommand = { type:'fit'|'zoomIn'|'zoomOut' } | {type:'model'; model:ChartWireModel};
export type ChartEvent = {type:'ready';durationMs:number} | {type:'selection';time:number;value:number|null} | {type:'error';code:'render_failed'};
export type ChartWireModel = {
  version:1;kind:string;unit:string;label:string;
  colors:{background:string;text:string;line:string;comparison:string;border:string};
  points:Array<{time:number;value:number}>;
  candles:Array<{time:number;open:number;high:number;low:number;close:number}>;
  layers:Array<{id:string;label:string;unit:string;points:Array<{time:number;value:number}>;comparison:boolean}>;
  reference:{value:number|null;low:number|null;high:number|null};
  events:Array<{time:number;label:string}>;
};
function points(rows:Array<{observed_at:string;value:number|null}>) {
  const unique=new Map<number,{time:number;value:number}>();
  rows.forEach(row=>{const time=Math.floor(Date.parse(row.observed_at)/1000);if(row.value!=null&&Number.isFinite(row.value)&&Number.isFinite(time))unique.set(time,{time,value:row.value});});
  return [...unique.values()].sort((a,b)=>a.time-b.time);
}
export function chartWireModel(model:QuestLifeChartModelV1):ChartWireModel {
  const p=model.presentation;const f=p.foundation;
  const selected=points(selectSeriesPoints(p.series,p.range,p.asOf));
  const first=selected[0]?.time??Number.NEGATIVE_INFINITY;
  const last=selected.at(-1)?.time??Number.POSITIVE_INFINITY;
  return {version:1,kind:p.chartKind,unit:p.series.unit,label:p.targetLabel,colors:{background:f.environment.canvas,text:f.text.secondary,line:f.data.observed,comparison:f.data.comparison,border:f.border.subtle},
    points:selected,
    candles:selectSeriesCandles(p.series,p.range).map(row=>({time:Math.floor(Date.parse(row.start)/1000),open:row.open,high:row.high,low:row.low,close:row.close})),
    layers:[...(p.comparisonSeries??[]).map(row=>({id:row.instrumentId,label:row.label,unit:row.series.unit,points:points(selectSeriesPoints(row.series,p.range,p.asOf)),comparison:true})),...(p.indicatorSeries??[]).map(row=>({id:row.series.indicator_id,label:row.label,unit:row.series.unit,points:points(row.series.points).filter(point=>point.time>=first&&point.time<=last),comparison:false}))],
    reference:{value:p.showReference?p.series.reference.value:null,low:p.showReferenceRange?p.series.reference.low:null,high:p.showReferenceRange?p.series.reference.high:null},
    events:p.showEvents?p.series.events.map(e=>({time:Math.floor(Date.parse(e.timestamp)/1000),label:e.label_key})):[],
  };
}
export function parseChartEvent(raw:string):ChartEvent|null {
  try {const v=JSON.parse(raw);if(v.type==='ready'&&Number.isFinite(v.durationMs))return v;if(v.type==='selection'&&Number.isFinite(v.time)&&(v.value===null||Number.isFinite(v.value)))return v;if(v.type==='error'&&v.code==='render_failed')return v;}catch{}
  return null;
}
