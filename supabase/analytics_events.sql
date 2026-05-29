create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(),
  anonymous_user_id text not null,
  event_name text not null,
  event_time timestamptz not null default now(),
  app_version text,
  session_id text,
  page text,
  properties jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_user_idx
on analytics_events (anonymous_user_id);

create index if not exists analytics_events_event_idx
on analytics_events (event_name);

create index if not exists analytics_events_time_idx
on analytics_events (event_time desc);
