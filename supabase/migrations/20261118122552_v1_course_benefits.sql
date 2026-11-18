-- V1 only. No enrolments, marks or certificates are manufactured by this migration.
-- Privileged RPCs are service-role-only; the application authenticates every actor.
create table public.v1_course_runs (
 id uuid primary key default gen_random_uuid(),
 learner_user_id uuid not null references auth.users(id) on delete restrict,
 course_id text not null check (course_id = 'scannex-training-programme'),
 attempt_number integer not null check (attempt_number > 0),
 started_at timestamptz not null default now(),
 previous_state jsonb not null default '{}'::jsonb,
 unique (learner_user_id, course_id, attempt_number)
);
create table public.v1_retake_requests (
 id uuid primary key default gen_random_uuid(),
 learner_user_id uuid not null references auth.users(id) on delete restrict,
 course_id text not null check (course_id = 'scannex-training-programme'),
 after_attempt_number integer not null check (after_attempt_number >= 2),
 status text not null default 'pending' check (status in ('pending','approved','declined','redeemed')),
 learner_note text not null default '' check (length(learner_note) <= 2000),
 review_note text, reviewed_by uuid references auth.users(id) on delete restrict,
 reviewed_at timestamptz, created_at timestamptz not null default now(),
 unique (learner_user_id, course_id, after_attempt_number)
);
create index v1_retake_requests_reviewed_by on public.v1_retake_requests(reviewed_by);
create table public.v1_course_certificates (
 id uuid primary key default gen_random_uuid(),
 learner_user_id uuid not null references auth.users(id) on delete restrict,
 course_id text not null check (course_id = 'scannex-training-programme'),
 kind text not null check (kind in ('attendance','passed')),
 learner_name text not null check (length(trim(learner_name)) between 2 and 180),
 run_id uuid references public.v1_course_runs(id) on delete restrict,
 assessment_id uuid not null references public.assessment_bookings(id) on delete restrict,
 issued_at timestamptz not null default now(), revoked_at timestamptz,
 unique (learner_user_id,course_id,kind)
);
create index v1_course_certificates_run on public.v1_course_certificates(run_id);
create index v1_course_certificates_assessment on public.v1_course_certificates(assessment_id);
create table public.v1_course_benefit_events (
 id uuid primary key default gen_random_uuid(),
 learner_user_id uuid not null references auth.users(id) on delete restrict,
 actor_user_id uuid not null references auth.users(id) on delete restrict,
 event_type text not null check (event_type in ('ebook_download_authorised','certificate_issued','certificate_print_requested','retake_requested','retake_reviewed','redo_started')),
 occurred_at timestamptz not null default now(), details jsonb not null
);
create index v1_course_benefit_events_learner on public.v1_course_benefit_events(learner_user_id,occurred_at desc);
create index v1_course_benefit_events_actor on public.v1_course_benefit_events(actor_user_id);
alter table public.assessment_theory_attempts add column v1_run_id uuid references public.v1_course_runs(id) on delete restrict;
alter table public.assessment_bookings add column v1_run_id uuid references public.v1_course_runs(id) on delete restrict;
create unique index v1_theory_one_submission_per_run on public.assessment_theory_attempts(v1_run_id) where v1_run_id is not null;
create index v1_bookings_run on public.assessment_bookings(v1_run_id);
create unique index v1_one_booking_per_run on public.assessment_bookings(v1_run_id) where v1_run_id is not null and status<>'cancelled';

alter table public.v1_course_runs enable row level security;
alter table public.v1_retake_requests enable row level security;
alter table public.v1_course_certificates enable row level security;
alter table public.v1_course_benefit_events enable row level security;
revoke all on public.v1_course_runs,public.v1_retake_requests,public.v1_course_certificates,public.v1_course_benefit_events from public,anon,authenticated,service_role;
grant select,insert on public.v1_course_runs,public.v1_course_benefit_events to service_role;
grant select,insert,update on public.v1_retake_requests,public.v1_course_certificates to service_role;

create function public.v1_assert_enrolled(p_user uuid) returns void language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from public.course_enrolments where user_id=p_user and course_id='scannex-training-programme' and status='enrolled') then
  raise exception 'ACTIVE_ENROLMENT_REQUIRED';
 end if;
end $$;

create function public.v1_ensure_run(p_user uuid) returns public.v1_course_runs language plpgsql security invoker set search_path='' as $$
declare r public.v1_course_runs;
begin
 perform public.v1_assert_enrolled(p_user);
 perform pg_advisory_xact_lock(hashtextextended(p_user::text||':v1-scannex',0));
 insert into public.v1_course_runs(learner_user_id,course_id,attempt_number) values(p_user,'scannex-training-programme',1) on conflict do nothing;
 select * into r from public.v1_course_runs where learner_user_id=p_user and course_id='scannex-training-programme' order by attempt_number desc limit 1;
 return r;
end $$;

create function public.v1_course_benefit_state(p_user uuid) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare r public.v1_course_runs; b public.assessment_bookings; good_pass uuid; studied boolean; final_failure boolean;
begin
 perform public.v1_assert_enrolled(p_user);
 select * into r from public.v1_course_runs where learner_user_id=p_user and course_id='scannex-training-programme' order by attempt_number desc limit 1;
 select count(distinct unit_id)=8 into studied from public.learner_progress
 where user_id=p_user and course_id='scannex-training-programme' and status='completed'
 and unit_id in ('scannex-lu-1','scannex-lu-2','scannex-lu-3','scannex-lu-4','scannex-lu-5','scannex-lu-6','scannex-lu-7','scannex-lu-8');
 select * into b from public.assessment_bookings where learner_user_id=p_user and course_id='scannex-training-programme'
 and (v1_run_id=r.id or (coalesce(r.attempt_number,1)=1 and v1_run_id is null))
 and status in ('passed','failed') order by completed_at desc nulls last,created_at desc limit 1;
 -- A grade is authoritative only with approval, evidence, the actual same-run
 -- theory, detailed rubric, no unresolved safety concern, and an assessor event.
 select a.id into good_pass from public.assessment_bookings a
 join public.assessment_theory_attempts t on t.id=a.theory_attempt_id and t.learner_user_id=a.learner_user_id and t.course_id=a.course_id
 join public.assessment_practical_rubrics pr on pr.assessment_id=a.id
 where a.learner_user_id=p_user and a.course_id='scannex-training-programme'
 and (a.v1_run_id=r.id or (coalesce(r.attempt_number,1)=1 and a.v1_run_id is null))
 and (t.v1_run_id=a.v1_run_id or (a.v1_run_id is null and t.v1_run_id is null) or (r.attempt_number=1 and t.v1_run_id is null and a.v1_run_id=r.id) or (r.attempt_number=1 and a.v1_run_id is null and t.v1_run_id=r.id))
 and t.assessment_version='scannex-summative-v2-classroom-202611'
 and a.status='passed' and a.approved_by is not null and a.approved_at is not null and a.completed_at is not null
 and pr.material_safety_concern=false and abs(pr.normalized_score-round(pr.raw_score/99*100,2))<=0.02
 and a.final_score>=75 and abs(a.final_score-(t.score+round(pr.normalized_score/100*32,2)))<=0.02
 and (select count(distinct evidence_type) from public.assessment_evidence e where e.assessment_id=a.id and e.evidence_type in ('scannex_result','viewer_movement_log','assessor_checklist') and length(trim(e.evidence_reference))>0)=3
 and exists(select 1 from public.assessment_events e join public.user_roles u on u.user_id=e.actor_user_id and u.role='admin'
   where e.assessment_id=a.id and e.event_type='decision_recorded' and e.metadata->>'decision'='passed')
 order by a.completed_at desc limit 1;
 final_failure := b.status='failed' and b.completed_at is not null and exists(
 select 1 from public.assessment_events e join public.user_roles u on u.user_id=e.actor_user_id and u.role='admin'
 where e.assessment_id=b.id and e.event_type='decision_recorded' and e.metadata->>'decision'='failed');
 return jsonb_build_object('runId',r.id,'attemptNumber',coalesce(r.attempt_number,1),'learningComplete',studied,
 'passed',studied and good_pass is not null,'failed',coalesce(final_failure,false),'assessmentId',coalesce(good_pass,b.id),
 'attendanceEligible',studied and (good_pass is not null or coalesce(final_failure,false)),
 'request',(select to_jsonb(q) from public.v1_retake_requests q where learner_user_id=p_user and course_id='scannex-training-programme' and after_attempt_number=r.attempt_number),
 'certificates',coalesce((select jsonb_agg(to_jsonb(c)) from public.v1_course_certificates c where learner_user_id=p_user and course_id='scannex-training-programme' and revoked_at is null),'[]'::jsonb));
end $$;

create function public.v1_issue_certificate(p_user uuid,p_kind text) returns uuid language plpgsql security invoker set search_path='' as $$
declare r public.v1_course_runs; s jsonb; c uuid; n text;
begin
 r:=public.v1_ensure_run(p_user);
 if p_kind not in ('attendance','passed') then raise exception 'INVALID_CERTIFICATE_KIND'; end if;
 select id into c from public.v1_course_certificates where learner_user_id=p_user and course_id=r.course_id and kind=p_kind and revoked_at is null;
 if c is not null then return c; end if;
 s:=public.v1_course_benefit_state(p_user);
 if (p_kind='passed' and not (s->>'passed')::boolean) or (p_kind='attendance' and not (s->>'attendanceEligible')::boolean) then raise exception 'CERTIFICATE_NOT_ELIGIBLE'; end if;
 select nullif(trim(certificate_name),'') into n from public.profiles where user_id=p_user for update;
 if n is null or length(n)<2 then raise exception 'CERTIFICATE_NAME_REQUIRED'; end if;
 insert into public.v1_course_certificates(learner_user_id,course_id,kind,learner_name,run_id,assessment_id)
 values(p_user,r.course_id,p_kind,n,r.id,(s->>'assessmentId')::uuid) returning id into c;
 update public.profiles set certificate_profile_locked_at=coalesce(certificate_profile_locked_at,now()) where user_id=p_user;
 insert into public.v1_course_benefit_events(learner_user_id,actor_user_id,event_type,details) values(p_user,p_user,'certificate_issued',jsonb_build_object('certificateId',c,'kind',p_kind,'name',n,'runId',r.id,'assessmentId',s->>'assessmentId'));
 return c;
end $$;

create function public.v1_submit_theory(p_user uuid,p_run uuid,p_version text,p_answers jsonb,p_score numeric,p_passed boolean) returns uuid language plpgsql security invoker set search_path='' as $$
declare r public.v1_course_runs; t uuid;
begin
 r:=public.v1_ensure_run(p_user);
 if p_run is distinct from r.id then raise exception 'ATTEMPT_CHANGED_RELOAD'; end if;
 if exists(select 1 from public.assessment_theory_attempts where learner_user_id=p_user and course_id=r.course_id and (v1_run_id=r.id or (r.attempt_number=1 and v1_run_id is null))) then raise exception 'THEORY_ALREADY_SUBMITTED'; end if;
 if exists(select 1 from public.assessment_bookings where learner_user_id=p_user and course_id=r.course_id and status in ('passed','failed') and (v1_run_id=r.id or (r.attempt_number=1 and v1_run_id is null))) then raise exception 'ATTEMPT_ALREADY_GRADED'; end if;
 insert into public.assessment_theory_attempts(learner_user_id,course_id,v1_run_id,assessment_version,submitted_answers,score,max_score,passed)
 values(p_user,r.course_id,r.id,p_version,p_answers,p_score,68,p_passed) returning id into t;
 return t;
end $$;

create function public.v1_request_retake(p_user uuid,p_note text) returns uuid language plpgsql security invoker set search_path='' as $$
declare r public.v1_course_runs; s jsonb; q uuid;
begin
 r:=public.v1_ensure_run(p_user); s:=public.v1_course_benefit_state(p_user);
 if r.attempt_number<2 or not (s->>'failed')::boolean or (s->>'passed')::boolean then raise exception 'RETAKE_REQUEST_NOT_AVAILABLE'; end if;
 insert into public.v1_retake_requests(learner_user_id,course_id,after_attempt_number,learner_note) values(p_user,r.course_id,r.attempt_number,left(coalesce(p_note,''),2000))
 on conflict(learner_user_id,course_id,after_attempt_number) do nothing returning id into q;
 if q is null then select id into q from public.v1_retake_requests where learner_user_id=p_user and course_id=r.course_id and after_attempt_number=r.attempt_number;
 else insert into public.v1_course_benefit_events(learner_user_id,actor_user_id,event_type,details) values(p_user,p_user,'retake_requested',jsonb_build_object('requestId',q,'afterAttempt',r.attempt_number)); end if;
 return q;
end $$;

create function public.v1_review_retake(p_actor uuid,p_request uuid,p_approve boolean,p_note text) returns void language plpgsql security invoker set search_path='' as $$
declare q public.v1_retake_requests;
begin
 if not exists(select 1 from public.user_roles where user_id=p_actor and role='admin') then raise exception 'ADMIN_REQUIRED'; end if;
 if length(trim(coalesce(p_note,'')))<3 then raise exception 'REVIEW_NOTE_REQUIRED'; end if;
 select * into q from public.v1_retake_requests where id=p_request for update;
 if q.id is null or q.status not in ('pending','declined') then raise exception 'REQUEST_NOT_REVIEWABLE'; end if;
 update public.v1_retake_requests set status=case when p_approve then 'approved' else 'declined' end,review_note=left(p_note,2000),reviewed_by=p_actor,reviewed_at=now() where id=q.id;
 insert into public.v1_course_benefit_events(learner_user_id,actor_user_id,event_type,details) values(q.learner_user_id,p_actor,'retake_reviewed',jsonb_build_object('requestId',q.id,'approved',p_approve,'note',left(p_note,2000)));
end $$;

create function public.v1_begin_redo(p_user uuid,p_expected_attempt integer) returns uuid language plpgsql security invoker set search_path='' as $$
declare r public.v1_course_runs; s jsonb; next_id uuid; snapshot jsonb;
begin
 r:=public.v1_ensure_run(p_user);
 if r.attempt_number<>p_expected_attempt then raise exception 'ATTEMPT_CHANGED_RELOAD'; end if;
 s:=public.v1_course_benefit_state(p_user);
 if not (s->>'failed')::boolean or (s->>'passed')::boolean then raise exception 'REDO_REQUIRES_FINAL_FAILURE'; end if;
 if r.attempt_number>=2 then
  update public.v1_retake_requests set status='redeemed' where learner_user_id=p_user and course_id=r.course_id and after_attempt_number=r.attempt_number and status='approved';
  if not found then raise exception 'APGI_APPROVAL_REQUIRED'; end if;
 end if;
 if exists(select 1 from public.assessment_bookings where learner_user_id=p_user and course_id=r.course_id and status in ('scheduled','approved','in_progress','evidence_pending')) then raise exception 'CLOSE_OPEN_BOOKINGS_FIRST'; end if;
 snapshot:=jsonb_build_object('progress',coalesce((select jsonb_agg(to_jsonb(p)) from public.learner_progress p where user_id=p_user and course_id=r.course_id),'[]'::jsonb),
 'scorm',coalesce((select jsonb_agg(to_jsonb(p)) from public.scorm_attempts p where user_id=p_user and course_id=r.course_id),'[]'::jsonb),
 'completion',(select to_jsonb(p) from public.completion_states p where user_id=p_user and course_id=r.course_id));
 insert into public.v1_course_runs(learner_user_id,course_id,attempt_number,previous_state) values(p_user,r.course_id,r.attempt_number+1,snapshot) returning id into next_id;
 update public.learner_progress set status='opened',completed_at=null,updated_at=now() where user_id=p_user and course_id=r.course_id;
 update public.scorm_attempts set completion_status='not attempted',success_status='unknown',progress_measure=0,score_raw=null,score_scaled=null,score_min=null,score_max=null,suspend_data='',location='',total_time='',interactions='{}'::jsonb,completed_at=null,passed_at=null,updated_at=now() where user_id=p_user and course_id=r.course_id;
 update public.completion_states set status='in_progress',completed_units=0,progress_percent=0,certificate_eligible=false,completed_at=null,updated_at=now() where user_id=p_user and course_id=r.course_id;
 insert into public.v1_course_benefit_events(learner_user_id,actor_user_id,event_type,details) values(p_user,p_user,'redo_started',jsonb_build_object('previousRun',r.id,'runId',next_id,'attemptNumber',r.attempt_number+1));
 return next_id;
end $$;

-- Revoke the default PUBLIC EXECUTE grant, including every helper.
revoke all on function public.v1_assert_enrolled(uuid),public.v1_ensure_run(uuid),public.v1_course_benefit_state(uuid),public.v1_issue_certificate(uuid,text),public.v1_submit_theory(uuid,uuid,text,jsonb,numeric,boolean),public.v1_request_retake(uuid,text),public.v1_review_retake(uuid,uuid,boolean,text),public.v1_begin_redo(uuid,integer) from public,anon,authenticated;
grant execute on function public.v1_assert_enrolled(uuid),public.v1_ensure_run(uuid),public.v1_course_benefit_state(uuid),public.v1_issue_certificate(uuid,text),public.v1_submit_theory(uuid,uuid,text,jsonb,numeric,boolean),public.v1_request_retake(uuid,text),public.v1_review_retake(uuid,uuid,boolean,text),public.v1_begin_redo(uuid,integer) to service_role;
