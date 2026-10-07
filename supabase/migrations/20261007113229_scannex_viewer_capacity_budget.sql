-- Scannex-only Viewer availability, capacity planning and cost monitoring.
-- These tables are private to server-side administration and launch services.

create table if not exists public.course_viewer_lab_settings (
  course_id text primary key check (course_id = 'scannex-training-programme'),
  enabled boolean not null default true,
  enabled_unit_slugs text[] not null default array['lu6']::text[],
  access_opens_at timestamptz,
  access_closes_at timestamptz,
  estimated_cost_per_learner_cents integer not null default 521
    check (estimated_cost_per_learner_cents between 0 and 100000),
  additional_session_cost_cents integer not null default 11
    check (additional_session_cost_cents between 0 and 100000),
  tolerance_bps integer not null default 1000 check (tolerance_bps between 0 and 10000),
  minimum_ready_capacity integer not null default 1 check (minimum_ready_capacity between 0 and 1000),
  maximum_capacity integer not null default 20 check (maximum_capacity between 1 and 1000),
  expected_concurrency_bps integer not null default 3000 check (expected_concurrency_bps between 100 and 10000),
  capacity_buffer integer not null default 2 check (capacity_buffer between 0 and 100),
  warmup_minutes integer not null default 20 check (warmup_minutes between 5 and 60),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(enabled_unit_slugs) > 0),
  check (minimum_ready_capacity <= maximum_capacity),
  check (access_closes_at is null or access_opens_at is null or access_closes_at > access_opens_at)
);

create table if not exists public.viewer_lab_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null check (course_id = 'scannex-training-programme'),
  unit_slug text not null,
  status text not null default 'launched' check (status in ('launched', 'failed')),
  estimated_cost_cents integer not null default 0 check (estimated_cost_cents >= 0),
  started_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_viewer_lab_sessions_course_started
  on public.viewer_lab_sessions(course_id, started_at desc);
create index if not exists idx_viewer_lab_sessions_user_started
  on public.viewer_lab_sessions(user_id, started_at desc);

alter table public.course_viewer_lab_settings enable row level security;
alter table public.viewer_lab_sessions enable row level security;

revoke all privileges on table public.course_viewer_lab_settings from public, anon, authenticated;
revoke all privileges on table public.viewer_lab_sessions from public, anon, authenticated;
grant all privileges on table public.course_viewer_lab_settings to service_role;
grant all privileges on table public.viewer_lab_sessions to service_role;

drop trigger if exists set_course_viewer_lab_settings_updated_at on public.course_viewer_lab_settings;
create trigger set_course_viewer_lab_settings_updated_at
before update on public.course_viewer_lab_settings
for each row execute function public.set_updated_at();

insert into public.course_viewer_lab_settings (
  course_id,
  enabled,
  enabled_unit_slugs,
  estimated_cost_per_learner_cents,
  additional_session_cost_cents,
  tolerance_bps,
  minimum_ready_capacity,
  maximum_capacity,
  expected_concurrency_bps,
  capacity_buffer,
  warmup_minutes
)
values (
  'scannex-training-programme',
  true,
  array['lu6']::text[],
  521,
  11,
  1000,
  1,
  20,
  3000,
  2,
  20
)
on conflict (course_id) do nothing;
