-- ALP W4.1 - Enrolment state and course access gating schema

create table if not exists public.course_enrolments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null,
  status text not null default 'pending' check (status in ('pending', 'enrolled', 'revoked')),
  source text not null default 'manual' check (source in ('manual', 'admin', 'payment', 'migration', 'system')),
  access_granted_at timestamptz,
  access_revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (user_id, course_id)
);

create table if not exists public.course_enrolment_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null,
  event_type text not null check (event_type in ('enrolment_requested', 'enrolment_granted', 'enrolment_revoked', 'access_denied')),
  previous_status text,
  next_status text,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_course_enrolments_user_course on public.course_enrolments(user_id, course_id);
create index if not exists idx_course_enrolments_course_status on public.course_enrolments(course_id, status);
create index if not exists idx_course_enrolment_events_user_course on public.course_enrolment_events(user_id, course_id);

alter table public.course_enrolments enable row level security;
alter table public.course_enrolment_events enable row level security;

drop policy if exists course_enrolments_select_self_or_admin on public.course_enrolments;
create policy course_enrolments_select_self_or_admin
on public.course_enrolments
for select
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('admin', 'reviewer')
  )
);

drop policy if exists course_enrolment_events_select_self_or_admin on public.course_enrolment_events;
create policy course_enrolment_events_select_self_or_admin
on public.course_enrolment_events
for select
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('admin', 'reviewer')
  )
);

-- W4.1 is read-gating only. Enrolment writes are intentionally deferred to W4.2 admin/manual enrolment.
-- No public enrolment insert/update policies are created in this migration.

drop trigger if exists set_course_enrolments_updated_at on public.course_enrolments;
create trigger set_course_enrolments_updated_at
before update on public.course_enrolments
for each row execute function public.set_updated_at();
