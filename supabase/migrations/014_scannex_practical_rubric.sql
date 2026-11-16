-- Detailed assessor-only Scannex practical rubric.
-- The approved instrument carries 99 raw marks. The platform preserves that
-- score and records its normalised 100-point equivalent for the agreed 32-mark
-- practical component.

create table if not exists public.assessment_practical_rubrics (
  assessment_id uuid primary key references public.assessment_bookings(id) on delete restrict,
  rubric_version text not null default 'scannex-practical-v1',
  trainer_exercise_reference text not null check (length(trim(trainer_exercise_reference)) > 0),
  item_scores jsonb not null check (jsonb_typeof(item_scores) = 'object'),
  raw_score numeric(5,2) not null check (raw_score >= 0 and raw_score <= 99),
  normalized_score numeric(5,2) not null check (normalized_score >= 0 and normalized_score <= 100),
  material_safety_concern boolean not null default false,
  safety_review_notes text,
  assessed_by uuid not null references auth.users(id) on delete restrict,
  assessed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (material_safety_concern = false and safety_review_notes is null)
    or (material_safety_concern = true and length(trim(coalesce(safety_review_notes, ''))) > 0)
  )
);

create index if not exists idx_assessment_practical_rubrics_assessed_by
  on public.assessment_practical_rubrics(assessed_by, assessed_at desc);

alter table public.assessment_practical_rubrics enable row level security;
revoke all privileges on table public.assessment_practical_rubrics from public, anon, authenticated;
grant all privileges on table public.assessment_practical_rubrics to service_role;

alter function public.set_updated_at() set search_path = '';
drop trigger if exists set_assessment_practical_rubrics_updated_at on public.assessment_practical_rubrics;
create trigger set_assessment_practical_rubrics_updated_at
before update on public.assessment_practical_rubrics
for each row execute function public.set_updated_at();

alter table public.assessment_events
  drop constraint if exists assessment_events_event_type_check;
alter table public.assessment_events
  add constraint assessment_events_event_type_check
  check (event_type in ('booked', 'approved', 'evidence_recorded', 'practical_rubric_recorded', 'decision_recorded', 'cancelled'));
