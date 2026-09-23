-- Scannex summative knowledge assessment.
-- Answer selections remain server-side assessment evidence and are never exposed
-- through the browser Data API.

create table if not exists public.assessment_theory_attempts (
  id uuid primary key default gen_random_uuid(),
  learner_user_id uuid not null references auth.users(id) on delete restrict,
  course_id text not null,
  assessment_version text not null default 'scannex-summative-v1',
  submitted_answers jsonb not null default '{}'::jsonb check (jsonb_typeof(submitted_answers) = 'object'),
  score numeric(5,2) not null check (score >= 0 and score <= 68),
  max_score numeric(5,2) not null default 68 check (max_score = 68),
  passed boolean not null,
  submitted_at timestamptz not null default now()
);

create index if not exists idx_assessment_theory_attempts_learner_course
  on public.assessment_theory_attempts(learner_user_id, course_id, submitted_at desc);

alter table public.assessment_theory_attempts enable row level security;
revoke all privileges on table public.assessment_theory_attempts from public, anon, authenticated;
grant all privileges on table public.assessment_theory_attempts to service_role;

alter table public.assessment_bookings
  add column if not exists assessment_version text not null default 'scannex-summative-v1',
  add column if not exists theory_attempt_id uuid references public.assessment_theory_attempts(id) on delete set null,
  add column if not exists theory_score numeric(5,2),
  add column if not exists theory_max_score numeric(5,2) not null default 68,
  add column if not exists practical_rubric_score numeric(5,2),
  add column if not exists practical_converted_score numeric(5,2),
  add column if not exists final_score numeric(5,2);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'assessment_bookings_theory_score_range'
  ) then
    alter table public.assessment_bookings
      add constraint assessment_bookings_theory_score_range
      check (theory_score is null or (theory_score >= 0 and theory_score <= theory_max_score));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'assessment_bookings_practical_rubric_score_range'
  ) then
    alter table public.assessment_bookings
      add constraint assessment_bookings_practical_rubric_score_range
      check (practical_rubric_score is null or (practical_rubric_score >= 0 and practical_rubric_score <= 100));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'assessment_bookings_practical_converted_score_range'
  ) then
    alter table public.assessment_bookings
      add constraint assessment_bookings_practical_converted_score_range
      check (practical_converted_score is null or (practical_converted_score >= 0 and practical_converted_score <= 32));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'assessment_bookings_final_score_range'
  ) then
    alter table public.assessment_bookings
      add constraint assessment_bookings_final_score_range
      check (final_score is null or (final_score >= 0 and final_score <= 100));
  end if;
end;
$$;

create index if not exists idx_assessment_bookings_theory_attempt
  on public.assessment_bookings(theory_attempt_id)
  where theory_attempt_id is not null;
