-- Learner-owned SCORM 2004 state for published iSpring packages.

create table if not exists public.scorm_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null,
  unit_id text not null,
  completion_status text not null default 'unknown' check (completion_status in ('completed', 'incomplete', 'not attempted', 'unknown')),
  success_status text not null default 'unknown' check (success_status in ('passed', 'failed', 'unknown')),
  progress_measure numeric(6,5),
  score_raw numeric,
  score_scaled numeric(8,5),
  score_min numeric,
  score_max numeric,
  suspend_data text not null default '',
  location text not null default '',
  total_time text not null default '',
  interactions jsonb not null default '{}'::jsonb,
  first_launched_at timestamptz not null default now(),
  last_launched_at timestamptz not null default now(),
  completed_at timestamptz,
  passed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, course_id, unit_id)
);

create index if not exists idx_scorm_attempts_user_course on public.scorm_attempts(user_id, course_id);

grant select, insert, update on public.scorm_attempts to authenticated;

alter table public.scorm_attempts enable row level security;

create policy scorm_attempts_select_self_or_admin
on public.scorm_attempts
for select
to authenticated
using (
  (select auth.uid()) = user_id
  or public.current_user_has_any_role(array['admin', 'reviewer'])
);

create policy scorm_attempts_insert_self
on public.scorm_attempts
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy scorm_attempts_update_self
on public.scorm_attempts
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create trigger set_scorm_attempts_updated_at
before update on public.scorm_attempts
for each row execute function public.set_updated_at();
