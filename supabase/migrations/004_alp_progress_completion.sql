-- ALP W3 - Progress + Completion schema

create table if not exists public.progress_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null,
  unit_id text not null,
  event_type text not null check (event_type in ('unit_opened', 'unit_completed')),
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.learner_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null,
  unit_id text not null,
  status text not null check (status in ('opened', 'completed')),
  first_opened_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, course_id, unit_id)
);

create table if not exists public.completion_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null,
  status text not null check (status in ('not_started', 'in_progress', 'completed')),
  completed_units integer not null default 0 check (completed_units >= 0),
  total_units integer not null default 0 check (total_units >= 0),
  progress_percent numeric(5,2) not null default 0 check (progress_percent >= 0 and progress_percent <= 100),
  certificate_eligible boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create index if not exists idx_progress_events_user_course on public.progress_events(user_id, course_id);
create index if not exists idx_progress_events_course_unit on public.progress_events(course_id, unit_id);
create index if not exists idx_learner_progress_user_course on public.learner_progress(user_id, course_id);
create index if not exists idx_completion_states_user_course on public.completion_states(user_id, course_id);

alter table public.progress_events enable row level security;
alter table public.learner_progress enable row level security;
alter table public.completion_states enable row level security;

drop policy if exists progress_events_select_self_or_admin on public.progress_events;
create policy progress_events_select_self_or_admin
on public.progress_events
for select
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('admin', 'reviewer')
  )
);

drop policy if exists progress_events_insert_self on public.progress_events;
create policy progress_events_insert_self
on public.progress_events
for insert
with check (user_id = auth.uid());

drop policy if exists learner_progress_select_self_or_admin on public.learner_progress;
create policy learner_progress_select_self_or_admin
on public.learner_progress
for select
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('admin', 'reviewer')
  )
);

drop policy if exists learner_progress_insert_self on public.learner_progress;
create policy learner_progress_insert_self
on public.learner_progress
for insert
with check (user_id = auth.uid());

drop policy if exists learner_progress_update_self on public.learner_progress;
create policy learner_progress_update_self
on public.learner_progress
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists completion_states_select_self_or_admin on public.completion_states;
create policy completion_states_select_self_or_admin
on public.completion_states
for select
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('admin', 'reviewer')
  )
);

drop policy if exists completion_states_insert_self on public.completion_states;
create policy completion_states_insert_self
on public.completion_states
for insert
with check (user_id = auth.uid());

drop policy if exists completion_states_update_self on public.completion_states;
create policy completion_states_update_self
on public.completion_states
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop trigger if exists set_learner_progress_updated_at on public.learner_progress;
create trigger set_learner_progress_updated_at
before update on public.learner_progress
for each row execute function public.set_updated_at();

drop trigger if exists set_completion_states_updated_at on public.completion_states;
create trigger set_completion_states_updated_at
before update on public.completion_states
for each row execute function public.set_updated_at();
