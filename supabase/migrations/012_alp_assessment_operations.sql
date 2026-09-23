-- APGI Scannex practical assessment operations.
-- These tables hold the platform-side booking, approval and evidence index.
-- The legacy Scannex station remains the authoritative source of the native result and movement log.

create table if not exists public.assessment_bookings (
  id uuid primary key default gen_random_uuid(),
  assessment_reference text not null unique default (
    'SCN-' || to_char(current_date, 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  ),
  learner_user_id uuid not null references auth.users(id) on delete restrict,
  course_id text not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'approved', 'in_progress', 'evidence_pending', 'passed', 'failed', 'cancelled')),
  scheduled_for timestamptz,
  station_label text,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  completed_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assessment_evidence (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessment_bookings(id) on delete restrict,
  evidence_type text not null check (evidence_type in ('scannex_result', 'viewer_movement_log', 'assessor_checklist')),
  evidence_reference text not null check (length(trim(evidence_reference)) > 0),
  outcome_summary jsonb not null default '{}'::jsonb,
  recorded_by uuid not null references auth.users(id) on delete restrict,
  recorded_at timestamptz not null default now(),
  unique (assessment_id, evidence_type, evidence_reference)
);

create table if not exists public.assessment_events (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessment_bookings(id) on delete restrict,
  event_type text not null check (event_type in ('booked', 'approved', 'evidence_recorded', 'decision_recorded', 'cancelled')),
  actor_user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists idx_assessment_bookings_learner_course on public.assessment_bookings(learner_user_id, course_id, created_at desc);
create index if not exists idx_assessment_bookings_status on public.assessment_bookings(status, scheduled_for);
create index if not exists idx_assessment_bookings_approved_by on public.assessment_bookings(approved_by);
create index if not exists idx_assessment_bookings_created_by on public.assessment_bookings(created_by);
create index if not exists idx_assessment_evidence_booking on public.assessment_evidence(assessment_id, recorded_at desc);
create index if not exists idx_assessment_evidence_recorded_by on public.assessment_evidence(recorded_by);
create index if not exists idx_assessment_events_booking on public.assessment_events(assessment_id, occurred_at desc);
create index if not exists idx_assessment_events_actor on public.assessment_events(actor_user_id);

alter table public.assessment_bookings enable row level security;
alter table public.assessment_evidence enable row level security;
alter table public.assessment_events enable row level security;

-- All platform reads and writes use authenticated server actions. Raw assessment evidence,
-- station references and reviewer decisions must never be exposed through the browser Data API.
revoke all privileges on table public.assessment_bookings from public, anon, authenticated;
revoke all privileges on table public.assessment_evidence from public, anon, authenticated;
revoke all privileges on table public.assessment_events from public, anon, authenticated;
grant all privileges on table public.assessment_bookings to service_role;
grant all privileges on table public.assessment_evidence to service_role;
grant all privileges on table public.assessment_events to service_role;

alter function public.set_updated_at() set search_path = '';
drop trigger if exists set_assessment_bookings_updated_at on public.assessment_bookings;
create trigger set_assessment_bookings_updated_at
before update on public.assessment_bookings
for each row execute function public.set_updated_at();
