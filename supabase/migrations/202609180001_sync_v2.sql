-- New canonical authenticated store. Does not alter the anonymous V1 mirror.
begin;
create table public.questlife_sync_cursors (
  user_id uuid primary key references auth.users(id) on delete cascade,
  change_seq bigint not null default 0
);
create table public.questlife_sync_entities (
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type = any(array['goals','categories','modules','moduleSkillLinks','skills','actions','executionLogs','effortUnits','contributionLinks','rescueLogs','stateCheckIns','contextLogs','decisionResults','patternMemory','scheduleBlocks','rawCaptures','healthObservations'])),
  entity_id text not null check (length(entity_id) between 1 and 512),
  payload jsonb,
  schema_version integer not null check (schema_version = 1),
  revision bigint not null check (revision > 0),
  change_seq bigint not null,
  origin_device_id text not null,
  client_mutated_at timestamptz not null,
  server_updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key(user_id, entity_type, entity_id),
  check (deleted_at is not null or (jsonb_typeof(payload) = 'object' and payload->>'id' = entity_id))
);
create unique index questlife_sync_changes on public.questlife_sync_entities(user_id, change_seq);
create table public.questlife_sync_receipts (
  user_id uuid not null references auth.users(id) on delete cascade,
  mutation_id uuid not null,
  request jsonb not null,
  result jsonb not null,
  primary key(user_id, mutation_id)
);
create table public.questlife_sync_devices (
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  platform text not null check(platform in ('ios','android','web')),
  app_version text not null,
  name text,
  last_seen_at timestamptz not null default now(),
  primary key(user_id, device_id)
);
alter table public.questlife_sync_cursors enable row level security;
alter table public.questlife_sync_entities enable row level security;
alter table public.questlife_sync_receipts enable row level security;
alter table public.questlife_sync_devices enable row level security;
create policy own_entities on public.questlife_sync_entities for select to authenticated using(user_id = auth.uid());
create policy own_devices on public.questlife_sync_devices for all to authenticated using(user_id = auth.uid()) with check(user_id = auth.uid());
create policy own_cursor on public.questlife_sync_cursors for select to authenticated using(user_id = auth.uid());
-- No direct entity write grants: revisions, receipts and cursor must be atomic.
revoke all on public.questlife_sync_entities, public.questlife_sync_receipts, public.questlife_sync_cursors, public.questlife_sync_devices from anon, authenticated;
grant select on public.questlife_sync_entities, public.questlife_sync_devices, public.questlife_sync_cursors to authenticated;
grant insert, update on public.questlife_sync_devices to authenticated;

create function public.questlife_sync_push(mutations jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  owner uuid := auth.uid();
  m jsonb; prior public.questlife_sync_entities; receipt public.questlife_sync_receipts;
  row_value public.questlife_sync_entities; result jsonb; results jsonb := '[]'::jsonb;
  seq bigint; typ text; eid text; op text; mutation uuid; base bigint;
begin
  if owner is null then raise exception 'authentication_required'; end if;
  if jsonb_typeof(mutations) <> 'array' or jsonb_array_length(mutations) > 100 or octet_length(mutations::text) > 1048576 then raise exception 'invalid_batch'; end if;
  insert into public.questlife_sync_cursors(user_id) values(owner) on conflict do nothing;
  -- The user lock is acquired before sequence allocation and held until COMMIT.
  -- A standalone global sequence cannot guarantee this commit-order property.
  perform 1 from public.questlife_sync_cursors where user_id = owner for update;
  for m in select value from jsonb_array_elements(mutations) loop
    begin
      mutation := (m->>'mutationId')::uuid;
      typ := m->>'entityType'; eid := m->>'entityId'; op := m->>'operation'; base := (m->>'baseRevision')::bigint;
      if mutation is null or base is null or base < 0 or op not in ('upsert','delete') or op is null
        or (m->>'schemaVersion')::int is distinct from 1 or length(eid) not between 1 and 512 or eid is null
        or length(coalesce(m->>'deviceId','')) not between 5 and 200
        or typ is null or not (typ = any(array['goals','categories','modules','moduleSkillLinks','skills','actions','executionLogs','effortUnits','contributionLinks','rescueLogs','stateCheckIns','contextLogs','decisionResults','patternMemory','scheduleBlocks','rawCaptures','healthObservations'])) then
        raise exception 'invalid_mutation';
      end if;
      select * into receipt from public.questlife_sync_receipts where user_id = owner and mutation_id = mutation;
      if found then
        if receipt.request <> m then raise exception 'mutation_id_reused'; end if;
        results := results || jsonb_build_array(receipt.result); continue;
      end if;
      if op = 'upsert' then
        if jsonb_typeof(m->'payload') is distinct from 'object' or m->'payload'->>'id' is distinct from eid or octet_length((m->'payload')::text) > 131072 then raise exception 'invalid_payload'; end if;
        if eid ~* '(^|:|-)(fixture|synthetic|qa|debug|demo)(:|-|$)'
          or jsonb_path_exists(m->'payload', '$.**.origin ? (@ == "SYNTHETIC" || @ == "QA_TEST" || @ == "DEBUG_FIXTURE" || @ == "QA" || @ == "DEBUG" || @ == "TEST" || @ == "FIXTURE")')
          or jsonb_path_exists(m->'payload', '$.**.syntheticOnly ? (@ == true)')
          or jsonb_path_exists(m->'payload', '$.**.trigger ? (@ == "debug")')
          or jsonb_path_exists(m->'payload', '$.**.fixture ? (@ != null && @ != false)') then raise exception 'provenance_rejected'; end if;
        if typ = 'rawCaptures' and (m->'payload'->>'parseStatus' is distinct from 'done' or m->'payload'->'parsed'->>'entriesDismissed' is distinct from 'true') then raise exception 'unconfirmed_capture'; end if;
      end if;
      select * into prior from public.questlife_sync_entities where user_id = owner and entity_type = typ and entity_id = eid;
      if coalesce(prior.revision,0) <> base then
        result := jsonb_build_object('mutationId', mutation, 'status','conflict','remote',to_jsonb(prior));
      else
        update public.questlife_sync_cursors set change_seq = change_seq + 1 where user_id = owner returning change_seq into seq;
        insert into public.questlife_sync_entities(user_id,entity_type,entity_id,payload,schema_version,revision,change_seq,origin_device_id,client_mutated_at,deleted_at)
          values(owner,typ,eid,case when op = 'delete' then null else m->'payload' end,1,base+1,seq,m->>'deviceId',(m->>'createdAt')::timestamptz,case when op = 'delete' then now() else null end)
        on conflict(user_id,entity_type,entity_id) do update set
          payload = excluded.payload, revision = excluded.revision, change_seq = excluded.change_seq,
          origin_device_id = excluded.origin_device_id, client_mutated_at = excluded.client_mutated_at,
          server_updated_at = now(), deleted_at = excluded.deleted_at
        returning * into row_value;
        result := jsonb_build_object('mutationId',mutation,'status','applied','remote',to_jsonb(row_value));
      end if;
      insert into public.questlife_sync_receipts values(owner,mutation,m,result);
      results := results || jsonb_build_array(result);
    exception when others then
      -- Never return SQL details or payloads for invalid records.
      results := results || jsonb_build_array(jsonb_build_object('mutationId',m->>'mutationId','status','rejected','error','invalid_mutation'));
    end;
  end loop;
  return results;
end $$;
revoke all on function public.questlife_sync_push(jsonb) from public, anon;
grant execute on function public.questlife_sync_push(jsonb) to authenticated;

-- Optional on local PostgreSQL; on hosted Supabase the existing publication is used.
do $$ begin
  if exists(select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.questlife_sync_entities;
  end if;
end $$;
commit;
