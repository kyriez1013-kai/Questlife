import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { CalendarService, type CalendarDriver, type CalendarDriverEvent } from '../../src/platform/calendar/CalendarService';
import { DeviceRepository } from '../../src/platform/deviceRepository';
import type { ScheduleBlock } from '../../src/types';

function fixture() {
  const disk = new Map<string,string>(); const events = new Map<string,CalendarDriverEvent>(); let failReadback = false; let creates = 0;
  const repo = new DeviceRepository({ getItem: async k => disk.get(k) ?? null, setItem: async (k,v) => { disk.set(k,v); } });
  const driver: CalendarDriver = {
    available: async () => true, permission: async () => 'granted', operationId: randomUUID,
    calendars: async () => [{ id: 'cal', title: 'QA', writable: true, source: 'test' }],
    read: async () => [], open: async () => {},
    inspect: async id => { if (failReadback) throw new Error('OS_READBACK'); return events.get(id) ?? null; },
    findByMarker: async (cal,marker) => [...events.values()].filter(e => e.calendarId === cal && e.operationMarker === marker),
    create: async (cal,draft,marker) => {
      assert.equal((await repo.read()).calendar.pendingOperations?.at(-1)?.phase, 'write_started');
      const id = `event-${++creates}`;
      events.set(id, { ...draft, id, externalEventId: id, calendarId: cal, operationMarker: marker, source: 'system_calendar', allDay: false }); return id;
    },
    update: async (id,draft,_,marker) => { events.set(id,{ ...events.get(id)!, ...draft, operationMarker: marker }); },
    remove: async id => { events.delete(id); },
  };
  const service = new CalendarService(driver,repo);
  const block = { id:'b', title:'QA', date:'2026-09-20', startTime:'09:00', endTime:'10:00', status:'planned' } as ScheduleBlock;
  return { repo, driver, service, events, block, fail: (v:boolean) => { failReadback=v; }, creates: () => creates };
}
test('OS create then failed readback recovers without creating twice', async () => {
  const x=fixture(); x.fail(true); await assert.rejects(x.service.createForBlock('cal',x.block,{confirmed:true}));
  const op=(await x.service.getPendingOperations())[0]; assert.equal(x.creates(),1); x.fail(false);
  const restored=new CalendarService(x.driver,x.repo); await restored.retryOperation(op.id,{confirmed:true},x.block);
  assert.equal(x.creates(),1); assert.equal((await restored.getPendingOperations()).length,0);
  assert.equal((await restored.getBlockExportStatus('cal','b',x.block)).state,'synced');
});
test('lost OS ID reconciles by exact operation marker, never title', async () => {
  const x=fixture(); const create=x.driver.create;
  x.driver.create=async(...args)=>{ await create(...args); throw new Error('PROCESS_INTERRUPTED'); };
  await assert.rejects(x.service.createForBlock('cal',x.block,{confirmed:true}));
  const op=(await x.service.getPendingOperations())[0];
  x.events.set('unrelated',{ ...[...x.events.values()][0], id:'unrelated', externalEventId:'unrelated', operationMarker:undefined });
  await x.service.retryOperation(op.id,{confirmed:true},x.block); assert.equal(x.creates(),1); assert.equal(x.events.size,2);
});
test('unknown create outcome is review-only, never blindly recreated', async () => {
  const x=fixture(); x.driver.create=async()=>{throw new Error('UNKNOWN_DELIVERY');};
  await assert.rejects(x.service.createForBlock('cal',x.block,{confirmed:true}));
  const op=(await x.service.getPendingOperations())[0];
  await assert.rejects(x.service.retryOperation(op.id,{confirmed:true},x.block),/outcome_unknown/);
  assert.equal((await x.service.getPendingOperations())[0].state,'ambiguous');
});
test('empty read window and disconnect retain exact ownership', async () => {
  const x=fixture(); await x.service.createForBlock('cal',x.block,{confirmed:true});
  await x.service.sync(['cal'],'2027-01-01T00:00:00Z','2027-01-02T00:00:00Z');
  await x.service.disconnect(); assert.equal((await x.repo.read()).calendar.exportMappings?.length,1);
  await x.service.createForBlock('cal',x.block,{confirmed:true}); assert.equal(x.creates(),1);
});
test('remote plan change needs review and never changes OS event without confirmation', async () => {
  const x=fixture(); await x.service.createForBlock('cal',x.block,{confirmed:true});
  const modified={...x.block,startTime:'11:00',endTime:'12:00'};
  assert.equal((await x.service.getBlockExportStatus('cal','b',modified)).state,'needs_review');
  assert.equal([...x.events.values()][0].startAt,new Date('2026-09-20T09:00:00').toISOString());
  await x.service.createForBlock('cal',modified,{confirmed:true}); assert.equal(x.creates(),1);
  assert.equal([...x.events.values()][0].startAt,new Date('2026-09-20T11:00:00').toISOString());
});
test('retry refuses changed confirmed snapshot and externally edited event', async () => {
  const x=fixture();x.fail(true);await assert.rejects(x.service.createForBlock('cal',x.block,{confirmed:true}));x.fail(false);
  const op=(await x.service.getPendingOperations())[0];
  await assert.rejects(x.service.retryOperation(op.id,{confirmed:true},{...x.block,title:'CHANGED'}),/requires_confirmation/);
  const event=[...x.events.values()][0];x.events.set(event.externalEventId,{...event,title:'EXTERNAL_EDIT'});
  await assert.rejects(x.service.retryOperation(op.id,{confirmed:true},x.block),/source_changed/);
});
test('delete ACK loss is idempotent only after explicit delete_started', async () => {
  const x=fixture();const record=await x.service.createForBlock('cal',x.block,{confirmed:true});
  x.driver.remove=async id=>{x.events.delete(id);throw new Error('ACK_LOST');};
  await assert.rejects(x.service.delete(record,{confirmed:true}));
  const op=(await x.service.getPendingOperations())[0];await x.service.retryOperation(op.id,{confirmed:true});
  assert.equal((await x.service.getPendingOperations()).length,0);assert.equal((await x.repo.read()).calendar.exportMappings?.[0].deleted,true);
});
