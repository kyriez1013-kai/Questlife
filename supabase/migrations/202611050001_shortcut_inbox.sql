-- CANDIDATE ONLY. Manual installation after review. No Owner migration.
-- Requires the existing Sync V2 tables and RPC. Does not create another data store.
begin;
create table public.questlife_inbox_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token_hash text unique check(token_hash ~ '^[a-f0-9]{64}$'),
  revoked boolean not null default true,
  health_consent boolean not null default false,
  consent_at timestamptz,
  minute_start timestamptz not null default now(), minute_count integer not null default 0,
  day_start date not null default current_date, day_count integer not null default 0,
  last_sync jsonb not null default '{}'::jsonb
);
create table public.questlife_inbox_receipts (
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null, request_hash text not null, result jsonb not null,
  primary key(user_id,request_id)
);
alter table public.questlife_inbox_tokens enable row level security;
alter table public.questlife_inbox_receipts enable row level security;
revoke all on public.questlife_inbox_tokens,public.questlife_inbox_receipts from public,anon,authenticated;

create function public.questlife_inbox_manage(action text,new_hash text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare owner uuid:=auth.uid(); t public.questlife_inbox_tokens; r public.questlife_sync_entities; seq bigint; n integer:=0;
begin
  if owner is null then raise exception 'authentication_required'; end if;
  if action not in ('status','rotate','revoke','health_on','health_off','delete_health') or action is null then raise exception 'invalid_action'; end if;
  if action='rotate' and (new_hash is null or new_hash !~ '^[a-f0-9]{64}$') then raise exception 'invalid_hash'; end if;
  insert into public.questlife_inbox_tokens(user_id) values(owner) on conflict do nothing;
  select * into t from public.questlife_inbox_tokens where user_id=owner for update;
  if action='rotate' then update public.questlife_inbox_tokens set token_hash=new_hash,revoked=false where user_id=owner;
  elsif action='revoke' then update public.questlife_inbox_tokens set token_hash=null,revoked=true where user_id=owner;
  elsif action='health_on' then update public.questlife_inbox_tokens set health_consent=true,consent_at=now() where user_id=owner;
  elsif action in ('health_off','delete_health') then update public.questlife_inbox_tokens set health_consent=false where user_id=owner;
  end if;
  if action='delete_health' then
    insert into public.questlife_sync_cursors(user_id) values(owner) on conflict do nothing;
    perform 1 from public.questlife_sync_cursors where user_id=owner for update;
    for r in select * from public.questlife_sync_entities where user_id=owner and entity_type='healthObservations' and deleted_at is null and payload->>'sourcePlatform'='shortcut' loop
      update public.questlife_sync_cursors set change_seq=change_seq+1 where user_id=owner returning change_seq into seq;
      update public.questlife_sync_entities set payload=null,deleted_at=now(),revision=revision+1,change_seq=seq,server_updated_at=now(),client_mutated_at=now(),origin_device_id='shortcut-inbox' where user_id=owner and entity_type=r.entity_type and entity_id=r.entity_id;
      n:=n+1;
    end loop;
  end if;
  select * into t from public.questlife_inbox_tokens where user_id=owner;
  return jsonb_build_object('ok',true,'active',not t.revoked,'healthConsent',t.health_consent,'consentAt',t.consent_at,'lastSync',t.last_sync,'deleted',n);
end $$;
revoke all on function public.questlife_inbox_manage(text,text) from public,anon;
grant execute on function public.questlife_inbox_manage(text,text) to authenticated;

-- Only the backend can resolve a write token. No HTTP read endpoint exposes history.
create function public.questlife_inbox_prepare(token_hash text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare t public.questlife_inbox_tokens; history jsonb;
begin
  select * into t from public.questlife_inbox_tokens where questlife_inbox_tokens.token_hash=questlife_inbox_prepare.token_hash and not revoked for update;
  if not found then return jsonb_build_object('ok',false,'status',401,'error','invalid_inbox_token'); end if;
  if t.minute_start<=now()-interval '1 minute' then t.minute_count:=0;t.minute_start:=now();end if;
  if t.day_start<>current_date then t.day_count:=0;t.day_start:=current_date;end if;
  if t.minute_count>=30 or t.day_count>=1000 then return jsonb_build_object('ok',false,'status',429,'error','rate_limited');end if;
  update public.questlife_inbox_tokens set minute_start=t.minute_start,minute_count=t.minute_count+1,day_start=t.day_start,day_count=t.day_count+1 where user_id=t.user_id;
  select coalesce(jsonb_agg(jsonb_build_object('payload',h.payload,'revision',h.revision)),'[]'::jsonb) into history from (
    select payload,revision from public.questlife_sync_entities where user_id=t.user_id and entity_type='stateCheckIns' and deleted_at is null order by payload->>'timestamp' desc limit 600
  ) h;
  return jsonb_build_object('ok',true,'healthConsent',t.health_consent,'history',history);
end $$;
revoke all on function public.questlife_inbox_prepare(text) from public,anon,authenticated;
grant execute on function public.questlife_inbox_prepare(text) to service_role;

create function public.questlife_inbox_commit(token_hash text,request_id uuid,request_hash text,kind text,changes jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare t public.questlife_inbox_tokens; receipt public.questlife_inbox_receipts; prior public.questlife_sync_entities;
  c jsonb; p jsonb; typ text; eid text; seq bigint; n integer:=0; skipped integer:=0; result jsonb; ids jsonb:='[]'::jsonb;
begin
  select * into t from public.questlife_inbox_tokens where questlife_inbox_tokens.token_hash=questlife_inbox_commit.token_hash and not revoked for update;
  if not found then return jsonb_build_object('ok',false,'status',401,'error','invalid_inbox_token');end if;
  if kind='health' and not t.health_consent then return jsonb_build_object('ok',false,'status',403,'error','health_consent_required');end if;
  if request_id is null or request_hash is null or request_hash !~ '^[a-f0-9]{64}$' or kind not in ('state','capture','follow_up','health','calendar') or kind is null or jsonb_typeof(changes) is distinct from 'array' or jsonb_array_length(changes) not between 1 and 100 or octet_length(changes::text)>262144 then raise exception 'invalid_batch';end if;
  select * into receipt from public.questlife_inbox_receipts where user_id=t.user_id and questlife_inbox_receipts.request_id=questlife_inbox_commit.request_id;
  if found then
    if receipt.request_hash<>questlife_inbox_commit.request_hash then return jsonb_build_object('ok',false,'status',409,'error','request_id_reused');end if;
    return receipt.result||jsonb_build_object('replayed',true);
  end if;
  insert into public.questlife_sync_cursors(user_id) values(t.user_id) on conflict do nothing;
  perform 1 from public.questlife_sync_cursors where user_id=t.user_id for update;
  -- Validate the whole batch before the first write. No partial acceptance.
  for c in select value from jsonb_array_elements(changes) loop
    typ:=c->>'entityType';eid:=c->>'entityId';p:=c->'payload';
    if jsonb_typeof(p) is distinct from 'object' or p->>'id' is distinct from eid or length(eid) not between 1 and 512 or eid is null then raise exception 'invalid_entity';end if;
    if ((kind='state' and typ='stateCheckIns' and eid='inbox:state:'||request_id::text and p->'stateLayer'->>'source'='watch_shortcut')
      or (kind='capture' and typ='rawCaptures' and eid='inbox:capture:'||request_id::text and p->>'parseStatus'='pending' and p->>'shortcutInbox'='true')
      or (kind='health' and typ='healthObservations' and eid like 'health:shortcut:%' and p->>'sourcePlatform'='shortcut' and p->>'schemaVersion'='questlife.health.observation.v1')
      or (kind='calendar' and typ='contextLogs' and eid='inbox:calendar:'||(p->>'date') and p->>'label'='shortcut_calendar')
      or (kind='follow_up' and typ='stateCheckIns' and c ? 'baseRevision')) is not true then raise exception 'scope_rejected';end if;
    if kind='follow_up' then
      select * into prior from public.questlife_sync_entities where user_id=t.user_id and entity_type=typ and entity_id=eid and deleted_at is null;
      if not found or prior.revision is distinct from (c->>'baseRevision')::bigint or prior.payload->'stateLayer'->'choice' is null then return jsonb_build_object('ok',false,'status',409,'error','follow_up_changed');end if;
      if (p #- '{stateLayer,choice,energyFollowUp}') is distinct from (prior.payload #- '{stateLayer,choice,energyFollowUp}') then raise exception 'follow_up_scope';end if;
    end if;
  end loop;
  for c in select value from jsonb_array_elements(changes) loop
    typ:=c->>'entityType';eid:=c->>'entityId';p:=c->'payload';
    select * into prior from public.questlife_sync_entities where user_id=t.user_id and entity_type=typ and entity_id=eid;
    if found and prior.deleted_at is not null then skipped:=skipped+1;continue;end if;
    if found and kind='health' then
      if (prior.payload - array['availableAt','importedAt','provenance'])=(p-array['availableAt','importedAt','provenance']) then skipped:=skipped+1;continue;end if;
      p:=jsonb_set(p,'{importedAt}',prior.payload->'importedAt');
    end if;
    if kind='calendar' and (prior.payload->'shortcutCalendar'->>'capturedAt')::timestamptz > (p->'shortcutCalendar'->>'capturedAt')::timestamptz then skipped:=skipped+1;continue;end if;
    update public.questlife_sync_cursors set change_seq=change_seq+1 where user_id=t.user_id returning change_seq into seq;
    insert into public.questlife_sync_entities(user_id,entity_type,entity_id,payload,schema_version,revision,change_seq,origin_device_id,client_mutated_at)
      values(t.user_id,typ,eid,p,1,coalesce(prior.revision,0)+1,seq,'shortcut-inbox',now())
      on conflict(user_id,entity_type,entity_id) do update set payload=excluded.payload,revision=excluded.revision,change_seq=excluded.change_seq,origin_device_id=excluded.origin_device_id,client_mutated_at=now(),server_updated_at=now();
    n:=n+1;ids:=ids||jsonb_build_array(jsonb_build_object('entityType',typ,'id',eid));
  end loop;
  update public.questlife_inbox_tokens set last_sync=jsonb_set(last_sync,array[kind],to_jsonb(now())) where user_id=t.user_id;
  result:=jsonb_build_object('ok',true,'written',n,'unchangedOrDeleted',skipped,'entities',ids);
  insert into public.questlife_inbox_receipts values(t.user_id,request_id,request_hash,result);
  return result;
end $$;
revoke all on function public.questlife_inbox_commit(text,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.questlife_inbox_commit(text,uuid,text,text,jsonb) to service_role;

-- Preserve the existing push implementation; extend only its pending-capture gate.
-- Inbox captures remain raw, user-owned, explicitly identified records. All other
-- unconfirmed captures retain the original rule. Fail rather than patch an unknown RPC.
do $$ declare definition text; old_clause text:= 'if typ = ''rawCaptures'' and (m->''payload''->>''parseStatus'' is distinct from ''done'' or m->''payload''->''parsed''->>''entriesDismissed'' is distinct from ''true'') then raise exception ''unconfirmed_capture''; end if;';
begin
  select pg_get_functiondef('public.questlife_sync_push(jsonb)'::regprocedure) into definition;
  if position(old_clause in definition)=0 then raise exception 'sync_push_definition_changed_review_required';end if;
  execute replace(definition,old_clause,'if typ = ''rawCaptures'' and (m->''payload''->>''parseStatus'' is distinct from ''done'' or m->''payload''->''parsed''->>''entriesDismissed'' is distinct from ''true'') and not coalesce(eid like ''inbox:capture:%'' and m->''payload''->>''shortcutInbox'' = ''true'',false) then raise exception ''unconfirmed_capture''; end if;');
end $$;
commit;
