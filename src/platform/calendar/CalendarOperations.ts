import type {ScheduleBlock} from '../../types';
import type {CalendarDraft,CalendarExportMapping,CalendarExportStatus,CalendarPendingOperation,ExternalCommitment} from '../contracts';
import {DeviceRepository} from '../deviceRepository';
import type {CalendarDriver,CalendarDriverEvent} from './CalendarService';
import {blockFingerprint,draftForBlock,operationMarker,ownedCalendarKey,retainedMappings,sameCalendarDraft,sameCalendarRecord} from './durability';

let writeQueue:Promise<unknown>=Promise.resolve();
function serialize<T>(job:()=>Promise<T>):Promise<T> {
  const result=writeQueue.then(job);writeQueue=result.catch(()=>undefined);return result;
}
const unfinished=(op:CalendarPendingOperation)=>!['succeeded','cancelled'].includes(op.state);
function validate(draft:CalendarDraft) {
  if(!draft.title.trim() || !Number.isFinite(Date.parse(draft.startAt)) || !Number.isFinite(Date.parse(draft.endAt)) || Date.parse(draft.endAt)<=Date.parse(draft.startAt))throw new Error('calendar_invalid_event');
}
export class CalendarOperations {
  constructor(private driver:CalendarDriver,private repo:DeviceRepository,private now:()=>string) {}
  async permission(request:boolean) {
    const permission=await this.driver.permission(request);
    if(permission!=='granted')await this.repo.update(data=>{
      const mappings=retainedMappings(data.calendar);
      if(!mappings.some(mapping=>mapping.active))return data;
      return {...data,calendar:{...data.calendar,exportMappings:mappings.map(mapping=>({...mapping,active:false}))}};
    });return permission;
  }
  private async writable(calendarId:string) {
    if(await this.permission(false)!=='granted')throw new Error('calendar_permission_required');
    if(!(await this.driver.calendars()).some(row=>row.id===calendarId && row.writable))throw new Error('calendar_not_writable');
  }
  private confirmed(consent:{confirmed:true}){if(consent?.confirmed!==true)throw new Error('calendar_confirmation_required');}
  private capable(){if(!this.driver.inspect || !this.driver.findByMarker)throw new Error('calendar_durability_unsupported');}
  async getPendingOperations(){return ((await this.repo.read()).calendar.pendingOperations??[]).filter(unfinished);}
  async getBlockExportStatus(calendarId:string,blockId:string,currentBlock:ScheduleBlock|undefined):Promise<CalendarExportStatus> {
    const permission=await this.permission(false);const {calendar}=await this.repo.read();
    const mappings=retainedMappings(calendar).filter(mapping=>mapping.calendarId===calendarId && mapping.linkedScheduleBlockId===blockId && !mapping.deleted);
    const operations=(calendar.pendingOperations??[]).filter(op=>op.calendarId===calendarId && op.linkedScheduleBlockId===blockId && unfinished(op));
    const mapping=mappings[0]??(calendar.exportMappings??[]).find(mapping=>mapping.calendarId===calendarId && mapping.linkedScheduleBlockId===blockId && mapping.deleted);
    const operation=operations[0];const result={permission,mapping,operation};
    if(mappings.length>1 || operations.length>1)return {...result,state:'ambiguous'};
    if(!mapping && !operation)return {...result,state:'not_exported'};
    const fingerprint=operation?.blockFingerprint??mapping?.blockFingerprint;
    let matches=false;
    try {matches=!!currentBlock && currentBlock.id===blockId && (fingerprint?fingerprint===blockFingerprint(currentBlock):!!mapping && sameCalendarDraft(mapping.record,draftForBlock(currentBlock)));}catch{/* Invalid/removed block is review-only. */}
    if(!matches)return {...result,state:'needs_review'};
    if(permission!=='granted')return {...result,state:'inactive'};
    if(operation)return {...result,state:operation.state==='ambiguous'?'ambiguous':operation.state==='retry'?'retry':'pending'};
    if(mapping?.deleted)return {...result,state:'deleted'};
    const observed=calendar.events.find(row=>row.calendarId===calendarId && row.externalEventId===mapping?.record.externalEventId);
    if(observed && mapping && !sameCalendarDraft(observed,mapping.record))return {...result,state:'needs_review'};
    return {...result,state:mapping?.active?'synced':'inactive'};
  }
  async create(calendarId:string,draft:CalendarDraft,consent:{confirmed:true}) {
    this.confirmed(consent);validate(draft);
    return serialize(async()=>this.execute(await this.prepare('create',calendarId,draft)).then(record=>record!));
  }
  /** Remote changes only affect status. This call confirms one exact current snapshot. */
  async createForBlock(calendarId:string,block:ScheduleBlock,consent:{confirmed:true}) {
    this.confirmed(consent);const draft=draftForBlock(block);validate(draft);
    return serialize(async()=>{
      const {calendar}=await this.repo.read();
      const pending=(calendar.pendingOperations??[]).filter(op=>op.calendarId===calendarId && op.linkedScheduleBlockId===block.id && unfinished(op));
      if(pending.length>1)throw new Error('calendar_operation_ambiguous');
      if(pending[0]) {
        if(pending[0].kind!=='delete' && pending[0].blockFingerprint===blockFingerprint(block))return (await this.execute(pending[0],block))!;
        if(pending[0].phase!=='prepared')await this.execute(pending[0],undefined,true);
        else await this.patchOperation(pending[0].id,{state:'cancelled',error:'calendar_confirmation_superseded'});
      }
      const mappings=retainedMappings((await this.repo.read()).calendar).filter(mapping=>!mapping.deleted && mapping.calendarId===calendarId && mapping.linkedScheduleBlockId===block.id);
      if(mappings.length>1)throw new Error('calendar_mapping_ambiguous');
      const mapping=mappings[0];
      if(mapping && sameCalendarDraft(mapping.record,draft) && mapping.blockFingerprint===blockFingerprint(block)) {
        await this.writable(calendarId);this.capable();
        const actual=await this.driver.inspect!(mapping.record.externalEventId);
        if(!actual || !sameCalendarRecord(this.record(actual,block.id),mapping.record))throw new Error('calendar_source_changed');
        await this.repo.update(data=>({...data,calendar:{...data.calendar,exportMappings:retainedMappings(data.calendar).map(row=>row.id===mapping.id?{...row,active:true}:row)}}));
        return mapping.record;
      }
      return (await this.execute(await this.prepare(mapping?'update':'create',calendarId,draft,mapping,block),block))!;
    });
  }
  private async own(record:ExternalCommitment) {
    const mappings=retainedMappings((await this.repo.read()).calendar).filter(mapping=>!mapping.deleted && mapping.record.id===record.id && mapping.calendarId===record.calendarId && mapping.record.externalEventId===record.externalEventId);
    if(mappings.length!==1)throw new Error('calendar_external_event_read_only');
    if(!sameCalendarRecord(mappings[0].record,record))throw new Error('calendar_stale_event');return mappings[0];
  }
  async update(record:ExternalCommitment,draft:CalendarDraft,consent:{confirmed:true}) {
    this.confirmed(consent);validate(draft);
    return serialize(async()=>{const mapping=await this.own(record);return (await this.execute(await this.prepare('update',record.calendarId,{...draft,allDay:draft.allDay??record.allDay,linkedScheduleBlockId:record.linkedScheduleBlockId},mapping)))!;});
  }
  async delete(record:ExternalCommitment,consent:{confirmed:true}) {
    this.confirmed(consent);
    return serialize(async()=>{const mapping=await this.own(record);await this.execute(await this.prepare('delete',record.calendarId,undefined,mapping));});
  }
  retryOperation(operationId:string,consent:{confirmed:true},currentBlock?:ScheduleBlock) {
    return serialize(async()=>{
      this.confirmed(consent);const operation=(await this.repo.read()).calendar.pendingOperations?.find(op=>op.id===operationId);
      if(!operation)throw new Error('calendar_operation_missing');return this.execute(operation,currentBlock);
    });
  }
  private async prepare(kind:CalendarPendingOperation['kind'],calendarId:string,draft?:CalendarDraft,mapping?:CalendarExportMapping,block?:ScheduleBlock) {
    this.capable();if(!calendarId)throw new Error('calendar_invalid_calendar');
    const id=this.driver.operationId?.()??globalThis.crypto.randomUUID();
    const operation:CalendarPendingOperation={id,marker:operationMarker(id),mappingId:mapping?.id??id,calendarId,kind,state:'pending',phase:'prepared',confirmedAt:this.now(),attempts:0,draft,expected:mapping?.record,linkedScheduleBlockId:block?.id??mapping?.linkedScheduleBlockId??draft?.linkedScheduleBlockId,blockFingerprint:block?blockFingerprint(block):undefined};
    await this.repo.update(data=>{
      const pending=data.calendar.pendingOperations??[];
      if(pending.some(op=>unfinished(op) && (op.mappingId===operation.mappingId || (operation.linkedScheduleBlockId && op.calendarId===calendarId && op.linkedScheduleBlockId===operation.linkedScheduleBlockId))))throw new Error('calendar_operation_pending');
      if(pending.some(op=>op.id===id))throw new Error('calendar_operation_id_collision');
      return {...data,calendar:{...data.calendar,connectionRevision:(data.calendar.connectionRevision??0)+1,exportMappings:retainedMappings(data.calendar),pendingOperations:[...pending,operation]}};
    });return operation;
  }
  private async patchOperation(id:string,patch:Partial<CalendarPendingOperation>) {
    let operation!:CalendarPendingOperation;
    await this.repo.update(data=>({...data,calendar:{...data.calendar,pendingOperations:(data.calendar.pendingOperations??[]).map(op=>{if(op.id!==id)return op;operation={...op,...patch};return operation;})}}));
    if(!operation)throw new Error('calendar_operation_missing');return operation;
  }
  private record(event:CalendarDriverEvent,blockId?:string):ExternalCommitment {
    if(event.recurring)throw new Error('calendar_recurring_write_unsupported');
    if(!event.externalEventId || !event.calendarId)throw new Error('calendar_source_id_missing');validate(event);
    const {recurring,...record}=event;
    return {...record,ownership:'questlife',linkedScheduleBlockId:blockId,lastSyncedAt:this.now()};
  }
  private async acknowledge(op:CalendarPendingOperation,record?:ExternalCommitment) {
    await this.repo.update(data=>{
      const mappings=retainedMappings(data.calendar);const prior=mappings.find(row=>row.id===op.mappingId);const result=record??prior?.record??op.expected;
      if(!result)throw new Error('calendar_mapping_missing');
      const stillCurrent=data.calendar.connectionRevision===op.executionRevision;
      const mapping:CalendarExportMapping={id:op.mappingId,calendarId:op.calendarId,linkedScheduleBlockId:op.linkedScheduleBlockId,record:result,active:op.kind!=='delete' && stillCurrent,deleted:op.kind==='delete',blockFingerprint:op.blockFingerprint??prior?.blockFingerprint,lastOperationId:op.id};
      const key=ownedCalendarKey(op.calendarId,result.externalEventId);
      return {...data,calendar:{...data.calendar,connectionRevision:(data.calendar.connectionRevision??0)+1,error:undefined,exportMappings:[...mappings.filter(row=>row.id!==mapping.id),mapping],pendingOperations:(data.calendar.pendingOperations??[]).map(row=>row.id===op.id?{...row,state:'succeeded' as const,completedAt:this.now(),error:undefined}:row),ownedIds:op.kind==='delete'?data.calendar.ownedIds.filter(id=>id!==key):[...new Set([...data.calendar.ownedIds,key])],events:stillCurrent?[...data.calendar.events.filter(row=>row.externalEventId!==result.externalEventId || row.calendarId!==op.calendarId),...(op.kind==='delete'?[]:[result])]:data.calendar.events}};
    });return record;
  }
  private async execute(operation:CalendarPendingOperation,block?:ScheduleBlock,reconcileOnly=false):Promise<ExternalCommitment|undefined> {
    let op=operation;
    try {
      if(op.state==='succeeded')return (await this.repo.read()).calendar.exportMappings?.find(mapping=>mapping.id===op.mappingId && !mapping.deleted)?.record;
      if(op.state==='cancelled')throw new Error('calendar_operation_cancelled');
      if(!reconcileOnly && op.blockFingerprint && (!block || blockFingerprint(block)!==op.blockFingerprint))throw new Error('calendar_current_change_requires_confirmation');
      this.capable();await this.writable(op.calendarId);
      op=await this.patchOperation(op.id,{attempts:op.attempts+1,state:'pending',error:undefined,executionRevision:(await this.repo.read()).calendar.connectionRevision});
      if(op.kind==='create') {
        if(op.phase!=='prepared') {
          const matches=op.resultEventId?[await this.driver.inspect!(op.resultEventId)].filter((row):row is CalendarDriverEvent=>!!row):await this.driver.findByMarker!(op.calendarId,op.marker,op.draft!);
          if(matches.length!==1)throw new Error(matches.length?'calendar_operation_ambiguous':'calendar_create_outcome_unknown');
          const record=this.record(matches[0],op.linkedScheduleBlockId);
          if(record.calendarId!==op.calendarId || record.operationMarker!==op.marker || !sameCalendarDraft(record,op.draft!))throw new Error('calendar_source_changed');
          return await this.acknowledge(op,record);
        }
        if(reconcileOnly)throw new Error('calendar_current_change_requires_confirmation');
        op=await this.patchOperation(op.id,{phase:'write_started'});
        const id=await this.driver.create(op.calendarId,op.draft!,op.marker);
        if(!id || typeof id!=='string')throw new Error('calendar_source_id_missing');
        op=await this.patchOperation(op.id,{resultEventId:id});
      } else {
        let actual=await this.driver.inspect!(op.expected!.externalEventId);
        if(!actual) {
          if(op.kind==='delete' && op.phase==='delete_started')return await this.acknowledge(op);
          throw new Error('calendar_source_missing');
        }
        let record=this.record(actual,op.linkedScheduleBlockId);const tagged=record.calendarId===op.calendarId && record.operationMarker===op.marker;
        if(tagged && op.phase!=='prepared') {
          if(!sameCalendarDraft(record,op.draft??op.expected!))throw new Error('calendar_source_changed');
          if(op.kind==='update')return await this.acknowledge(op,record);
        } else {
          if(reconcileOnly)throw new Error('calendar_current_change_requires_confirmation');
          if(!sameCalendarRecord(record,op.expected!))throw new Error('calendar_source_changed');
          op=await this.patchOperation(op.id,{phase:'write_started'});
          await this.driver.update(record.externalEventId,op.draft??op.expected!,record,op.marker);
          actual=await this.driver.inspect!(record.externalEventId);
          if(!actual)throw new Error('calendar_source_missing');record=this.record(actual,op.linkedScheduleBlockId);
          if(record.calendarId!==op.calendarId || record.operationMarker!==op.marker || !sameCalendarDraft(record,op.draft??op.expected!))throw new Error('calendar_source_changed');
        }
        if(op.kind==='delete') {
          if(reconcileOnly)throw new Error('calendar_current_change_requires_confirmation');
          op=await this.patchOperation(op.id,{phase:'delete_started'});
          await this.driver.remove(record.externalEventId,record);
          if(await this.driver.inspect!(record.externalEventId))throw new Error('calendar_delete_not_confirmed');
          return await this.acknowledge(op);
        }
      }
      const actual=await this.driver.inspect!(op.resultEventId??op.expected!.externalEventId);
      if(!actual)throw new Error('calendar_source_missing');const record=this.record(actual,op.linkedScheduleBlockId);
      if(record.calendarId!==op.calendarId || record.operationMarker!==op.marker || !sameCalendarDraft(record,op.draft!))throw new Error('calendar_source_changed');
      return await this.acknowledge(op,record);
    } catch(error) {
      const message=error instanceof Error && /^calendar_[a-z_]+$/.test(error.message)?error.message:'calendar_os_write_failed';
      try {
        const data=await this.repo.read();
        if(data.calendar.pendingOperations?.find(row=>row.id===op.id)?.state==='succeeded')return data.calendar.exportMappings?.find(row=>row.id===op.mappingId && !row.deleted)?.record;
        await this.patchOperation(op.id,{state:/ambiguous|unknown|source_changed|source_missing/.test(message)?'ambiguous':'retry',error:message});
      }catch{/* The durable pre-write intent remains recoverable when storage returns. */}
      throw new Error(message);
    }
  }
}
