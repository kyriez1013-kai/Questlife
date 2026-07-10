-- Decision AI server-side persistence (Phase 1 data-pipeline fix, 2026-07-11).
-- Run this in the Supabase SQL editor before deploying api/sync.ts and the
-- updated api/brief.ts. All tables are keyed by (anonymous_user_id, id) so
-- client-side upserts are idempotent. `payload` holds the full client record
-- (same shape as the AppData arrays persisted under the questlife.v1 key).

create table if not exists execution_logs (
  anonymous_user_id text not null,
  id text not null,
  date text,
  created_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  primary key (anonymous_user_id, id)
);

create table if not exists context_logs (
  anonymous_user_id text not null,
  id text not null,
  date text,
  type text,
  created_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  primary key (anonymous_user_id, id)
);

create table if not exists state_checkins (
  anonymous_user_id text not null,
  id text not null,
  date text,
  created_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  primary key (anonymous_user_id, id)
);

create table if not exists decision_results (
  anonymous_user_id text not null,
  id text not null,
  created_at timestamptz,
  mode text,
  source text,
  payload jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  primary key (anonymous_user_id, id)
);

create table if not exists pattern_memory (
  anonymous_user_id text not null,
  id text not null,
  status text,
  updated_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  primary key (anonymous_user_id, id)
);

create index if not exists execution_logs_user_created on execution_logs (anonymous_user_id, created_at desc);
create index if not exists context_logs_user_created on context_logs (anonymous_user_id, created_at desc);
create index if not exists state_checkins_user_created on state_checkins (anonymous_user_id, created_at desc);
create index if not exists decision_results_user_created on decision_results (anonymous_user_id, created_at desc);
create index if not exists pattern_memory_user_status on pattern_memory (anonymous_user_id, status);

-- Same access model as analytics_events: only the service-role key (used by
-- the Vercel functions) may read/write. RLS on with no policies = deny all
-- for anon/authenticated roles.
alter table execution_logs enable row level security;
alter table context_logs enable row level security;
alter table state_checkins enable row level security;
alter table decision_results enable row level security;
alter table pattern_memory enable row level security;
