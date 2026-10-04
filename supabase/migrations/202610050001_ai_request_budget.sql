-- Candidate release gate only. No observation, sync entity or owner record changes.
begin;
create table public.questlife_ai_budget (
  scope text not null,
  bucket timestamptz not null,
  units integer not null check (units >= 0),
  primary key(scope, bucket)
);
alter table public.questlife_ai_budget enable row level security;
revoke all on public.questlife_ai_budget from public, anon, authenticated;

-- Only the server may claim, after verifying /auth/v1/user. The caller cannot
-- choose costs or caps; reservations survive failure and lost acknowledgements.
create function public.questlife_ai_claim(p_user_id uuid, p_endpoint text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  moment timestamptz := clock_timestamp();
  day_bucket timestamptz := date_trunc('day', moment at time zone 'UTC') at time zone 'UTC';
  minute_bucket timestamptz := date_trunc('minute', moment);
  cost integer;
  global_used integer;
  user_used integer;
  minute_used integer;
begin
  if p_user_id is null or not exists(select 1 from auth.users where id=p_user_id) then
    raise exception 'invalid_user';
  end if;
  if p_endpoint='parse' then cost:=1;
  elsif p_endpoint='brief' then cost:=3;
  else raise exception 'invalid_endpoint'; end if;
  -- One shared lock makes the global cap atomic across endpoints and instances.
  perform pg_advisory_xact_lock(719002610050001::bigint);
  select units into global_used from public.questlife_ai_budget where scope='global' and bucket=day_bucket;
  select units into user_used from public.questlife_ai_budget where scope='user:'||p_user_id and bucket=day_bucket;
  select units into minute_used from public.questlife_ai_budget where scope='minute:'||p_user_id and bucket=minute_bucket;
  if coalesce(global_used,0)+cost>1500 or coalesce(user_used,0)+cost>200 then
    return jsonb_build_object('status','rate_limited','retry_after',ceil(extract(epoch from day_bucket+interval '1 day'-moment)));
  end if;
  if coalesce(minute_used,0)+cost>12 then
    return jsonb_build_object('status','rate_limited','retry_after',ceil(extract(epoch from minute_bucket+interval '1 minute'-moment)));
  end if;
  insert into public.questlife_ai_budget(scope,bucket,units) values
    ('global',day_bucket,cost), ('user:'||p_user_id,day_bucket,cost), ('minute:'||p_user_id,minute_bucket,cost)
    on conflict(scope,bucket) do update set units=public.questlife_ai_budget.units+excluded.units;
  delete from public.questlife_ai_budget where bucket<day_bucket-interval '2 days';
  return jsonb_build_object('status','claimed');
end $$;
revoke all on function public.questlife_ai_claim(uuid,text) from public,anon,authenticated;
grant execute on function public.questlife_ai_claim(uuid,text) to service_role;
commit;
