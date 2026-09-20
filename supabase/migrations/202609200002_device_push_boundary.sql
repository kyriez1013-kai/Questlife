-- Local candidate only. Never apply to production without the parent release gate.
begin;
alter table public.questlife_sync_devices
  add column push_token text,
  add column push_registration_id uuid,
  add column push_generation bigint not null default 0,
  add column push_enabled boolean not null default false,
  add column push_expires_at timestamptz,
  add column push_updated_at timestamptz,
  add column push_test_request_id uuid,
  add column push_test_requested_at timestamptz,
  add column push_test_ticket_id text,
  add column push_test_status text;
alter table public.questlife_sync_devices add constraint questlife_push_binding_valid check (
  (not push_enabled and push_token is null) or
  (push_enabled and platform in ('ios','android') and push_registration_id is not null
    and push_expires_at is not null and push_token ~ '^(ExpoPushToken|ExponentPushToken)\[[A-Za-z0-9_-]{10,200}\]$')
);
create unique index questlife_push_token_owner on public.questlife_sync_devices(push_token) where push_token is not null;
create unique index questlife_push_device_owner on public.questlife_sync_devices(device_id) where push_token is not null;

-- Preserve only the existing non-sensitive device listing; all writes use auth.uid RPCs.
revoke all on public.questlife_sync_devices from anon, authenticated;
grant select(user_id,device_id,platform,app_version,name,last_seen_at) on public.questlife_sync_devices to authenticated;

create function public.questlife_device_touch(p_device_id text, p_platform text, p_app_version text) returns void
language plpgsql security definer set search_path = '' as $$
declare owner uuid := auth.uid();
begin
  if owner is null then raise exception 'authentication_required'; end if;
  if length(coalesce(p_device_id,'')) not between 5 and 200 or p_platform is null
    or p_platform not in ('ios','android','web') or length(coalesce(p_app_version,'')) not between 1 and 100 then
    raise exception 'invalid_device';
  end if;
  insert into public.questlife_sync_devices(user_id,device_id,platform,app_version)
    values(owner,p_device_id,p_platform,p_app_version)
    on conflict(user_id,device_id) do update set app_version=excluded.app_version,last_seen_at=now();
end $$;

create function public.questlife_push_register(p_device_id text, p_registration_id uuid, p_generation bigint, p_token text, p_enabled boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare owner uuid := auth.uid(); device public.questlife_sync_devices;
begin
  if owner is null then raise exception 'authentication_required'; end if;
  if p_registration_id is null or p_generation is null or p_generation<1 or p_enabled is distinct from true or p_token is null
    or p_token !~ '^(ExpoPushToken|ExponentPushToken)\[[A-Za-z0-9_-]{10,200}\]$' then raise exception 'invalid_push_registration'; end if;
  select * into device from public.questlife_sync_devices where user_id=owner and device_id=p_device_id for update;
  if not found or device.platform not in ('ios','android') then raise exception 'device_not_registered'; end if;
  -- A retired generation cannot be resurrected by a delayed register retry.
  if p_generation<=device.push_generation and not (device.push_enabled and device.push_registration_id=p_registration_id and device.push_generation=p_generation) then raise exception 'registration_retired'; end if;
  if device.push_enabled and (device.push_registration_id<>p_registration_id or device.push_token<>p_token) then raise exception 'retire_previous_registration'; end if;
  if exists(select 1 from public.questlife_sync_devices where user_id<>owner and (push_token=p_token or (device_id=p_device_id and push_token is not null))) then
    raise exception 'push_binding_unavailable';
  end if;
  update public.questlife_sync_devices set push_token=p_token,push_registration_id=p_registration_id,push_generation=p_generation,push_enabled=true,
    push_expires_at=now()+interval '24 hours',push_updated_at=now()
    where user_id=owner and device_id=p_device_id;
  return jsonb_build_object('status','registered','expiresAt',now()+interval '24 hours');
exception when unique_violation then raise exception 'push_binding_unavailable';
end $$;

create function public.questlife_push_retire(p_device_id text, p_registration_id uuid, p_generation bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare owner uuid := auth.uid(); device public.questlife_sync_devices;
begin
  if owner is null then raise exception 'authentication_required'; end if;
  if p_registration_id is null or p_generation is null or p_generation<1 then raise exception 'registration_required'; end if;
  select * into device from public.questlife_sync_devices where user_id=owner and device_id=p_device_id for update;
  if not found then return jsonb_build_object('status','retired'); end if;
  if device.push_generation>p_generation or (device.push_generation=p_generation and device.push_registration_id is distinct from p_registration_id) then
    return jsonb_build_object('status','superseded');
  end if;
  update public.questlife_sync_devices set push_token=null,push_enabled=false,push_registration_id=p_registration_id,push_generation=p_generation,
    push_expires_at=null,push_updated_at=now(),push_test_ticket_id=null,push_test_status='retired'
    where user_id=owner and device_id=p_device_id;
  return jsonb_build_object('status','retired');
end $$;

create function public.questlife_push_test_claim(p_device_id text, p_request_id uuid, p_send boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare owner uuid := auth.uid(); device public.questlife_sync_devices;
begin
  if owner is null then raise exception 'authentication_required'; end if;
  if p_request_id is null or p_send is null then raise exception 'invalid_request'; end if;
  select * into device from public.questlife_sync_devices where user_id=owner and device_id=p_device_id for update;
  if not found or not device.push_enabled or device.push_token is null or device.push_expires_at<=now() then
    return jsonb_build_object('status','disabled');
  end if;
  if device.push_test_request_id=p_request_id then
    return jsonb_build_object('status',device.push_test_status,'ticketId',device.push_test_ticket_id,'registrationId',device.push_registration_id);
  end if;
  if not p_send then return jsonb_build_object('status','not_found'); end if;
  if device.push_test_requested_at>now()-interval '1 minute' then return jsonb_build_object('status','rate_limited'); end if;
  update public.questlife_sync_devices set push_test_request_id=p_request_id,push_test_requested_at=now(),
    push_test_ticket_id=null,push_test_status='pending' where user_id=owner and device_id=p_device_id;
  return jsonb_build_object('status','claimed','token',device.push_token,'registrationId',device.push_registration_id);
end $$;

create function public.questlife_push_test_finish(p_device_id text,p_registration_id uuid,p_request_id uuid,p_status text,p_ticket_id text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare owner uuid := auth.uid(); device public.questlife_sync_devices;
begin
  if owner is null then raise exception 'authentication_required'; end if;
  if p_status is null or p_status not in ('accepted','provider_accepted','failed','device_unregistered')
    or (p_ticket_id is not null and length(p_ticket_id) not between 1 and 200) then raise exception 'invalid_result'; end if;
  select * into device from public.questlife_sync_devices where user_id=owner and device_id=p_device_id for update;
  if not found or not device.push_enabled or device.push_registration_id is distinct from p_registration_id
    or device.push_test_request_id is distinct from p_request_id then return jsonb_build_object('status','superseded'); end if;
  update public.questlife_sync_devices set push_test_status=p_status,push_test_ticket_id=coalesce(p_ticket_id,push_test_ticket_id),
    push_token=case when p_status='device_unregistered' then null else push_token end,
    push_enabled=case when p_status='device_unregistered' then false else push_enabled end,
    push_expires_at=case when p_status='device_unregistered' then null else push_expires_at end
    where user_id=owner and device_id=p_device_id;
  return jsonb_build_object('status',p_status);
end $$;

revoke all on function public.questlife_device_touch(text,text,text), public.questlife_push_register(text,uuid,bigint,text,boolean),
  public.questlife_push_retire(text,uuid,bigint), public.questlife_push_test_claim(text,uuid,boolean),
  public.questlife_push_test_finish(text,uuid,uuid,text,text) from public,anon;
grant execute on function public.questlife_device_touch(text,text,text), public.questlife_push_register(text,uuid,bigint,text,boolean),
  public.questlife_push_retire(text,uuid,bigint), public.questlife_push_test_claim(text,uuid,boolean),
  public.questlife_push_test_finish(text,uuid,uuid,text,text) to authenticated;
commit;
