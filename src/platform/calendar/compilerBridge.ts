import {compileScheduleDay,type ScheduleCompilerInput} from '../../utils/scheduleCompiler';
import type {ExternalCommitment} from '../contracts';
import {calendarFixedBlocks} from './CalendarService';
export function compileWithCalendar(input:ScheduleCompilerInput,events:ExternalCommitment[]){
  const fixed=new Map(input.fixedBlocks.map(b=>[b.id,b]));
  calendarFixedBlocks(events,input.date).forEach(b=>fixed.set(b.id,b));
  return compileScheduleDay({...input,fixedBlocks:[...fixed.values()]});
}
