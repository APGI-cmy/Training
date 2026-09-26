-- Separate automated v2 records preserve the legacy v1/99 results verbatim.
create table public.scannex_cases (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  definition jsonb not null check (jsonb_typeof(definition) = 'object'),
  definition_sha256 text not null check (definition_sha256 ~ '^[a-f0-9]{64}$'),
  status text not null default 'draft' check (status in ('draft','approved')),
  created_by uuid not null references auth.users(id),
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  check ((status = 'approved') = (approved_at is not null and approved_by is not null))
);
create table public.scannex_requests (
  id uuid primary key default gen_random_uuid(),
  learner_user_id uuid not null references auth.users(id),
  learner_email text not null,
  preferred_date date not null,
  status text not null default 'requested' check (status in ('requested','approved','in_progress','completed','cancelled','expired')),
  case_id uuid references public.scannex_cases(id),
  opens_at timestamptz,
  closes_at timestamptz,
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  notification_status text not null default 'pending' check (notification_status in ('pending','accepted','failed')),
  notification_id text,
  check ((opens_at is null and closes_at is null) or (closes_at > opens_at and closes_at <= opens_at + interval '24 hours')),
  check (status not in ('approved','in_progress','completed') or (case_id is not null and opens_at is not null and closes_at is not null and approved_by is not null))
);
create unique index scannex_requests_active_learner on public.scannex_requests(learner_user_id) where status in ('requested','approved','in_progress');
create index scannex_requests_learner_created on public.scannex_requests(learner_user_id, created_at desc);
create index scannex_requests_case on public.scannex_requests(case_id);
create table public.scannex_attempts (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.scannex_requests(id),
  case_id uuid not null references public.scannex_cases(id),
  case_sha256 text not null,
  learner_user_id uuid not null references auth.users(id),
  collector_nonce uuid not null default gen_random_uuid(),
  rubric_version text not null default 'scannex-practical-v2' check (rubric_version = 'scannex-practical-v2'),
  practical_maximum integer not null default 100 check (practical_maximum = 100),
  theory_attempt_id uuid not null references public.assessment_theory_attempts(id),
  theory_score numeric(5,2) not null check (theory_score between 0 and 68),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  checklist jsonb check (jsonb_typeof(checklist) = 'object'),
  checklist_submitted_at timestamptz,
  result jsonb check (jsonb_typeof(result) = 'object'),
  completed_at timestamptz,
  check (expires_at > started_at)
);
create index scannex_attempts_learner on public.scannex_attempts(learner_user_id);
create index scannex_attempts_case on public.scannex_attempts(case_id);
create index scannex_attempts_theory on public.scannex_attempts(theory_attempt_id);
create table public.scannex_native_evidence (
  attempt_id uuid primary key references public.scannex_attempts(id),
  payload_sha256 text not null check (payload_sha256 ~ '^[a-f0-9]{64}$'),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  received_at timestamptz not null default now()
);
create table public.scannex_automation_events (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.scannex_requests(id),
  actor_user_id uuid references auth.users(id),
  event_type text not null,
  detail jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
create index scannex_automation_events_request on public.scannex_automation_events(request_id, occurred_at);
create index scannex_cases_created_by on public.scannex_cases(created_by);
create index scannex_cases_approved_by on public.scannex_cases(approved_by);
create index scannex_requests_approved_by on public.scannex_requests(approved_by);
create index scannex_automation_events_actor on public.scannex_automation_events(actor_user_id);

-- All access goes through authenticated Next.js services. Keys and evidence have no browser Data API grants.
alter table public.scannex_cases enable row level security;
alter table public.scannex_requests enable row level security;
alter table public.scannex_attempts enable row level security;
alter table public.scannex_native_evidence enable row level security;
alter table public.scannex_automation_events enable row level security;
revoke all on public.scannex_cases, public.scannex_requests, public.scannex_attempts, public.scannex_native_evidence, public.scannex_automation_events from public, anon, authenticated;
grant select, insert on public.scannex_cases, public.scannex_native_evidence, public.scannex_automation_events to service_role;
grant select, insert, update on public.scannex_requests, public.scannex_attempts to service_role;
grant usage, select on sequence public.scannex_automation_events_id_seq to service_role;

create function public.scannex_request_practical(p_learner uuid, p_email text, p_date date)
returns public.scannex_requests language plpgsql security invoker set search_path = '' as $$
declare r public.scannex_requests;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_learner::text, 42));
  if not exists (select 1 from public.course_enrolments where user_id=p_learner and course_id='scannex-training-programme' and status='enrolled') then raise exception 'ENROLMENT_REQUIRED'; end if;
  if p_date < (now() at time zone 'Africa/Johannesburg')::date or p_date > current_date + 365 then raise exception 'INVALID_DATE'; end if;
  update public.scannex_requests set status='expired' where learner_user_id=p_learner and status='approved' and closes_at <= now();
  select * into r from public.scannex_requests where learner_user_id=p_learner and status in ('requested','approved','in_progress');
  if found then return r; end if;
  insert into public.scannex_requests(learner_user_id, learner_email, preferred_date) values (p_learner,p_email,p_date) returning * into r;
  insert into public.scannex_automation_events(request_id,actor_user_id,event_type) values(r.id,p_learner,'readiness_requested');
  return r;
end $$;

create function public.scannex_approve_practical(p_admin uuid, p_request uuid, p_case uuid, p_opens timestamptz, p_closes timestamptz)
returns void language plpgsql security invoker set search_path = '' as $$
declare r public.scannex_requests;
begin
  if not exists (select 1 from public.user_roles where user_id=p_admin and role='admin') then raise exception 'ADMIN_REQUIRED'; end if;
  select * into strict r from public.scannex_requests where id=p_request for update;
  if r.status <> 'requested' then raise exception 'REQUEST_NOT_PENDING'; end if;
  if not exists (select 1 from public.scannex_cases where id=p_case and status='approved') then raise exception 'APPROVED_CASE_REQUIRED'; end if;
  if p_opens is null or p_closes is null or p_closes <= now() or p_closes <= p_opens or p_closes > p_opens + interval '24 hours' then raise exception 'INVALID_WINDOW'; end if;
  if not exists (select 1 from public.course_enrolments where user_id=r.learner_user_id and course_id='scannex-training-programme' and status='enrolled') then raise exception 'ENROLMENT_REQUIRED'; end if;
  update public.scannex_requests set status='approved',case_id=p_case,opens_at=p_opens,closes_at=p_closes,approved_by=p_admin where id=p_request;
  insert into public.scannex_automation_events(request_id,actor_user_id,event_type,detail) values(p_request,p_admin,'access_approved',jsonb_build_object('caseId',p_case,'opensAt',p_opens,'closesAt',p_closes));
end $$;

create function public.scannex_cancel_practical(p_admin uuid, p_request uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (select 1 from public.user_roles where user_id=p_admin and role='admin') then raise exception 'ADMIN_REQUIRED'; end if;
  perform 1 from public.scannex_requests where id=p_request and (status in ('requested','approved') or (status='in_progress' and closes_at + interval '15 minutes' < now())) for update;
  if not found then raise exception 'REQUEST_CANNOT_BE_CANCELLED'; end if;
  update public.scannex_requests set status='cancelled' where id=p_request;
  insert into public.scannex_automation_events(request_id,actor_user_id,event_type) values(p_request,p_admin,'access_cancelled');
end $$;

create function public.scannex_start_practical(p_learner uuid, p_request uuid)
returns public.scannex_attempts language plpgsql security invoker set search_path = '' as $$
declare r public.scannex_requests; a public.scannex_attempts; t public.assessment_theory_attempts; c public.scannex_cases;
begin
  select * into strict r from public.scannex_requests where id=p_request and learner_user_id=p_learner for update;
  if r.status not in ('approved','in_progress') or now() < r.opens_at or now() >= r.closes_at then raise exception 'ACCESS_WINDOW_CLOSED'; end if;
  if not exists (select 1 from public.course_enrolments where user_id=p_learner and course_id='scannex-training-programme' and status='enrolled') then raise exception 'ENROLMENT_REQUIRED'; end if;
  select * into a from public.scannex_attempts where request_id=p_request;
  if found then
    if a.completed_at is not null or a.checklist_submitted_at is not null then raise exception 'ATTEMPT_SUBMITTED'; end if;
    return a;
  end if;
  select * into strict c from public.scannex_cases where id=r.case_id and status='approved';
  select * into t from public.assessment_theory_attempts where learner_user_id=p_learner and course_id='scannex-training-programme' and assessment_version='scannex-summative-v1' and max_score=68 order by submitted_at desc, id desc limit 1;
  if not found then raise exception 'THEORY_REQUIRED'; end if;
  insert into public.scannex_attempts(request_id,case_id,case_sha256,learner_user_id,theory_attempt_id,theory_score,expires_at)
    values(r.id,c.id,c.definition_sha256,p_learner,t.id,t.score,r.closes_at) returning * into a;
  update public.scannex_requests set status='in_progress' where id=r.id;
  insert into public.scannex_automation_events(request_id,actor_user_id,event_type,detail) values(r.id,p_learner,'attempt_started',jsonb_build_object('attemptId',a.id,'version',a.rubric_version,'maximum',100));
  return a;
end $$;

create function public.scannex_submit_checklist(p_learner uuid, p_attempt uuid, p_checklist jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare a public.scannex_attempts;
begin
  select * into strict a from public.scannex_attempts where id=p_attempt and learner_user_id=p_learner for update;
  if a.checklist is not null then
    if a.checklist = p_checklist then return; end if;
    raise exception 'CHECKLIST_ALREADY_SUBMITTED';
  end if;
  if now() >= a.expires_at or a.completed_at is not null then raise exception 'ATTEMPT_CLOSED'; end if;
  if not exists (select 1 from public.course_enrolments where user_id=p_learner and course_id='scannex-training-programme' and status='enrolled') then raise exception 'ENROLMENT_REQUIRED'; end if;
  if p_checklist->'signed' is distinct from 'true'::jsonb then raise exception 'SIGNATURE_REQUIRED'; end if;
  update public.scannex_attempts set checklist=p_checklist,checklist_submitted_at=now() where id=a.id;
  insert into public.scannex_automation_events(request_id,actor_user_id,event_type,detail) values(a.request_id,p_learner,'checklist_submitted',jsonb_build_object('attemptId',a.id));
end $$;

-- The service verifies collector signature, artefact hashes and session binding before invoking this RPC.
create function public.scannex_receive_evidence(p_attempt uuid, p_hash text, p_payload jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare a public.scannex_attempts; existing_hash text;
begin
  select * into strict a from public.scannex_attempts where id=p_attempt for update;
  select payload_sha256 into existing_hash from public.scannex_native_evidence where attempt_id=p_attempt;
  if found then
    if existing_hash = p_hash then return; end if;
    raise exception 'CONFLICTING_EVIDENCE';
  end if;
  if a.completed_at is not null or now() > a.expires_at + interval '15 minutes' or not exists (select 1 from public.scannex_requests where id=a.request_id and status='in_progress') then raise exception 'EVIDENCE_WINDOW_CLOSED'; end if;
  insert into public.scannex_native_evidence(attempt_id,payload_sha256,payload) values(p_attempt,p_hash,p_payload);
  insert into public.scannex_automation_events(request_id,event_type,detail) values(a.request_id,'native_evidence_received',jsonb_build_object('attemptId',a.id,'sha256',p_hash));
end $$;

create function public.scannex_finish_practical(p_attempt uuid, p_result jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare a public.scannex_attempts;
begin
  select * into strict a from public.scannex_attempts where id=p_attempt for update;
  if a.completed_at is not null then
    if a.result=p_result then return; end if;
    raise exception 'RESULT_IMMUTABLE';
  end if;
  if a.checklist is null or not exists (select 1 from public.scannex_native_evidence where attempt_id=a.id) then raise exception 'EVIDENCE_REQUIRED'; end if;
  if p_result->>'version' is distinct from 'scannex-practical-v2' or p_result->>'status' is null or p_result->>'status' not in ('passed','failed','incomplete') or (p_result->>'practicalMaximum')::int is distinct from 100 or (p_result->>'theoryScore')::numeric is distinct from a.theory_score then raise exception 'INVALID_RESULT'; end if;
  if p_result->>'status' = 'incomplete' then
    if p_result->>'practicalScore' is not null or p_result->>'finalScore' is not null then raise exception 'INVALID_RESULT'; end if;
  else
    if p_result->>'practicalScore' is null or (p_result->>'practicalScore')::numeric not between 0 and 100
      or (p_result->>'practicalScore')::numeric <> trunc((p_result->>'practicalScore')::numeric)
      or (p_result->>'practicalContribution')::numeric is distinct from round((p_result->>'practicalScore')::numeric * 0.32, 2)
      or (p_result->>'finalScore')::numeric is distinct from round(a.theory_score + (p_result->>'practicalScore')::numeric * 0.32, 2)
      or jsonb_typeof(p_result->'safetyFailure') is distinct from 'boolean'
      or ((p_result->>'status' = 'passed') is distinct from ((p_result->>'finalScore')::numeric >= 75 and p_result->'safetyFailure' = 'false'::jsonb)) then raise exception 'INVALID_RESULT'; end if;
  end if;
  if a.result = p_result then return; end if;
  update public.scannex_attempts set result=p_result,completed_at=case when p_result->>'status'='incomplete' then null else now() end where id=a.id;
  if p_result->>'status' <> 'incomplete' then update public.scannex_requests set status='completed' where id=a.request_id; end if;
  insert into public.scannex_automation_events(request_id,event_type,detail) values(a.request_id,'automatic_scoring_recorded',jsonb_build_object('attemptId',a.id,'status',p_result->>'status'));
end $$;

revoke all on function public.scannex_request_practical(uuid,text,date), public.scannex_approve_practical(uuid,uuid,uuid,timestamptz,timestamptz), public.scannex_cancel_practical(uuid,uuid), public.scannex_start_practical(uuid,uuid), public.scannex_submit_checklist(uuid,uuid,jsonb), public.scannex_receive_evidence(uuid,text,jsonb), public.scannex_finish_practical(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.scannex_request_practical(uuid,text,date), public.scannex_approve_practical(uuid,uuid,uuid,timestamptz,timestamptz), public.scannex_cancel_practical(uuid,uuid), public.scannex_start_practical(uuid,uuid), public.scannex_submit_checklist(uuid,uuid,jsonb), public.scannex_receive_evidence(uuid,text,jsonb), public.scannex_finish_practical(uuid,jsonb) to service_role;
