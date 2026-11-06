import type { AppData } from '../types';
import type { QuantProductBundleV1, QuantProductSeriesV1 } from '../quant-product/quantProductContract';

export type ObservationVariable = {
  id:string; zh:string; en:string; construct:string; series:QuantProductSeriesV1;
  artifactId?:string;
};
type Point=QuantProductSeriesV1['points'][number];
const definitions = [
  ['energy','精力','Energy','state.energy','/5','ORDINAL'],
  ['tension','紧绷','Tension','state.tension','/5','ORDINAL'],
  ['focus','专注','Focus','state.focus','/5','ORDINAL'],
  ['steps','步数','Steps','activity.steps','steps','COUNT'],
  ['sleep','睡眠时长','Sleep duration','sleep.duration','minutes','TIME_DURATION'],
  ['resting_heart_rate','静息心率','Resting heart rate','body.resting_heart_rate','bpm','RATIO'],
  ['duration','执行时长','Execution duration','execution.duration','minutes','TIME_DURATION'],
  ['quality','执行质量','Execution quality','execution.quality','/5','ORDINAL'],
] as const;

/** Chart projection only: no baseline, eligibility score, imputation or OHLC calculation. */
export function recordedSeries(id:string,construct:string,unit:string,scale:QuantProductSeriesV1['scale'],points:Point[]):QuantProductSeriesV1 {
  const ordered=[...points].sort((a,b)=>a.observed_at.localeCompare(b.observed_at)||a.observation_id.localeCompare(b.observation_id));
  const provenance={observation_ids:ordered.map(p=>p.observation_id),observation_count:ordered.length,observation_set_hash:null,source_artifact_ids:[],method:'recorded_observation_projection',method_version:'v5.3',instrument_version:'existing_record_fields',model_id:null,model_version:null,lineage_hash:null};
  return {series_id:`display:${id}`,instrument_id:id,construct_key:construct,unit,scale,points:ordered,range_points:[],candles:{},events:[],reference:{kind:'NONE',status:'UNAVAILABLE',value:null,low:null,high:null,unit,window_start:null,window_end:null,observation_count:0,independent_period_count:0,provenance:{...provenance,observation_ids:[],observation_count:0}},supported_chart_types:['LINE','POINT'],supported_ranges:[...[7,30,90,365].map(n=>({key:n===365?'1Y':`${n}D`,kind:'LAST_N_DAYS' as const,start:null,end:null,count:n,aggregation_bucket:'recorded_points',observation_window_count:null})),{key:'ALL',kind:'ALL',start:null,end:null,count:null,aggregation_bucket:'recorded_points',observation_window_count:null}],default_range_key:'30D',availability:{state:ordered.length?'AVAILABLE':'INSUFFICIENT_DATA',reason_codes:ordered.length?[]:['NO_RECORDED_OBSERVATIONS']},provenance};
}

export function observationVariables(data:AppData, product:QuantProductBundleV1|null, asOf:string):ObservationVariable[] {
  const end=Date.parse(asOf), buckets=new Map<string,Point[]>();
  const add=(key:string,id:string,time:string|undefined,value:unknown,unit:string,source:string)=>{
    if(typeof value!=='number'||!Number.isFinite(value)||!time||!Number.isFinite(Date.parse(time))||Date.parse(time)>end)return;
    if(unit==='/5'&&(value<1||value>5))return;
    const points=buckets.get(key)??[];
    points.push({observation_id:id,observed_at:new Date(time).toISOString(),value,unit,source_class:source});buckets.set(key,points);
  };
  for(const r of data.stateCheckIns??[]){if(r.dataProvenance?.deleted)continue;add('energy',r.id,r.timestamp,r.energy,'/5','questlife_confirmed');add('tension',r.id,r.timestamp,r.stateLayer?.tension,'/5','questlife_confirmed');add('focus',r.id,r.timestamp,r.focus,'/5','questlife_confirmed');}
  for(const r of data.executionLogs??[]){if(r.dataProvenance?.deleted)continue;add('duration',r.id,r.createdAt,r.durationMinutes,'minutes','questlife_confirmed');add('quality',r.id,r.createdAt,r.qualityRating,'/5','questlife_confirmed');}
  for(const r of data.contextLogs??[]){
    if(r.dataProvenance?.deleted)continue;
    const n=typeof r.value==='number'?r.value:typeof r.value==='string'&&r.value.trim()?Number(r.value):NaN;
    const time=r.dataProvenance?.eventEndAt??r.createdAt;
    const source=r.source==='healthkit'||r.source==='sensor'?'passive_device':'questlife_confirmed';
    // Only equivalent, explicitly supplied units are projected; ambiguous units remain absent.
    if(r.type==='sleep'&&['min','minutes'].includes(r.unit??''))add('sleep',r.id,time,n,'minutes',source);
    if(r.label==='steps'&&['steps','count'].includes(r.unit??''))add('steps',r.id,time,n,'steps',source);
    if(r.label==='resting_heart_rate'&&r.unit==='bpm')add('resting_heart_rate',r.id,time,n,'bpm',source);
  }
  const used=new Set<string>();
  const variables:ObservationVariable[]=definitions.map(([id,zh,en,construct,unit,scale])=>{
    const local=recordedSeries(id,construct,unit,scale,buckets.get(id)??[]);
    const artifact=product?.series.find(s=>s.construct_key===construct&&product.instruments.some(i=>i.instrument_id===s.instrument_id&&i.scope==='PERSONAL_MARKET'));
    if(artifact)used.add(artifact.instrument_id);
    // A stale artifact cannot hide a newly saved local point. Do not merge incompatible lineage IDs.
    const newer=local.points.length&&(!artifact?.points.length||Date.parse(local.points.at(-1)!.observed_at)>Date.parse(artifact.points.at(-1)!.observed_at));
    return {id,zh,en,construct,series:artifact?.points.length&&!newer?artifact:local,...(artifact?.points.length&&!newer?{artifactId:artifact.instrument_id}:{})};
  });
  for(const instrument of product?.instruments??[]){
    if(used.has(instrument.instrument_id))continue;
    const series=product!.series.find(s=>s.instrument_id===instrument.instrument_id);
    if(!series)continue;
    const name=data.skills.find(s=>s.id===instrument.entity_id)?.name??data.categories.find(g=>g.id===instrument.entity_id)?.name;
    variables.push({id:instrument.instrument_id,zh:name??instrument.label_key,en:name??instrument.label_key,construct:instrument.construct_key,series,artifactId:instrument.instrument_id});
  }
  return variables;
}

export function defaultObservationVariable(variables:ObservationVariable[]) {
  return variables.reduce((best,v)=>v.series.points.length>best.series.points.length?v:best,variables[0]).id;
}

export function chooseObservationSeries(real:QuantProductSeriesV1, example:QuantProductSeriesV1) {
  return real.points.length?{series:real,example:false}:{series:example,example:true};
}

/** Explicit visual example, never an AppData record or a personal model output. */
export function stateExample(id:string):QuantProductSeriesV1 {
  const values=id==='tension'?[3,4,3,2,4,3,2,2,3,2,3,2,2,1]:[2,3,3,2,4,3,3,4,3,4,4,3,4,4];
  const series=recordedSeries(`example:${id}`,`state.${id}`,'/5','ORDINAL',values.map((value,i)=>({observation_id:`example:${id}:${i}`,observed_at:new Date(Date.UTC(2026,6,i+1,9)).toISOString(),value,unit:'/5',source_class:'synthetic_example'})));
  return {...series,provenance:{...series.provenance,method:'isolated_visual_example',instrument_version:'not_a_personal_result'}};
}
