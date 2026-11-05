import type { ExecutionLog, StateCheckIn } from '../types';
import type { PassiveSignals } from '../state-layer/signals';
export function stateDimensions(row: StateCheckIn, signals: PassiveSignals, logs: ExecutionLog[], now: Date) {
  const goals = new Set(logs.filter(l => !l.dataProvenance?.deleted && l.linkedGoalId && Date.parse(l.createdAt) <= +now && Date.parse(l.createdAt) >= +now - 3*3600000).map(l => l.linkedGoalId));
  const tension = row.stateLayer?.tension;
  return [
    { id:'alertness' as const, value:row.energy, sufficient:!!signals.sleep, sources:['energy', ...(signals.sleep ? ['sleep'] : []), 'time_block'] },
    { id:'cognitive' as const, value:tension, sufficient:!!row.stateLayer?.openLoops, sources:['tension', ...(row.stateLayer?.openLoops ? ['open_loops'] : [])], proxyCount:goals.size },
    { id:'emotional' as const, value:tension, sufficient:false, sources:tension ? ['tension'] : [] },
    { id:'recovery' as const, value:undefined, sufficient:!!(signals.training && (signals.restingHr || signals.hrv)), sources:[...(signals.training ? ['training'] : []),...(signals.restingHr ? ['resting_hr'] : []),...(signals.hrv ? ['hrv'] : [])] },
  ];
}
export function calibrationRecord(planned: number | undefined, actual: number, difficulty?: 'easier' | 'same' | 'harder') {
  if (!Number.isFinite(actual) || actual <= 0) throw new Error('invalid_actual_minutes');
  return { schemaVersion:1, ...(planned != null && Number.isFinite(planned) && planned > 0 ? { plannedMinutes:planned } : {}), actualMinutes:actual, ...(difficulty ? { subjectiveDifficulty:difficulty } : {}) };
}

/** Paired timings only. Counts describe past executions, not prediction accuracy. */
export function calibrationSummary(logs: ExecutionLog[]) {
  const pairs=logs.filter(l=>!l.dataProvenance?.deleted).map(l=>l.structuredData?.calibration as ReturnType<typeof calibrationRecord>|undefined).filter(c=>c?.schemaVersion===1&&Number.isFinite(c.actualMinutes)&&c.actualMinutes>0&&c.plannedMinutes!=null&&Number.isFinite(c.plannedMinutes)&&c.plannedMinutes>0);
  if(pairs.length<10)return undefined;
  return {n:pairs.length,planned:pairs.reduce((n,c)=>n+c!.plannedMinutes!,0),actual:pairs.reduce((n,c)=>n+c!.actualMinutes,0),harder:pairs.filter(c=>c!.subjectiveDifficulty==='harder').length,answered:pairs.filter(c=>c!.subjectiveDifficulty).length};
}
