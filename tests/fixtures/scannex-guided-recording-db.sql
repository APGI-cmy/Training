-- Run with psql in an empty, disposable database, from the repository root.
\set ON_ERROR_STOP on
create schema auth;
create schema storage;
create schema extensions;
create extension pgcrypto with schema extensions;
create role anon;
create role authenticated;
create role service_role;
create table auth.users(id uuid primary key);
create table storage.buckets(id text, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table public.assessment_bookings(id uuid primary key, status text, assessment_reference text);
create table public.assessment_practical_rubrics(rubric_version text, raw_score numeric constraint assessment_practical_rubrics_raw_score_check check(raw_score between 0 and 99));
create table public.assessment_theory_attempts(id uuid primary key);
create table public.v1_course_runs(id uuid primary key, learner_user_id uuid);
create table public.user_roles(user_id uuid, role text);
create table public.profiles(user_id uuid, certificate_name text, full_name text);
create function public.v1_ensure_run(p_user uuid) returns public.v1_course_runs language sql as $$ select * from public.v1_course_runs where learner_user_id=p_user $$;
-- Only the bridge anchors are needed from the prior V1 benefits function.
create function public.v1_course_benefit_state(uuid) returns boolean language sql as $$
-- (select count(distinct evidence_type) from public.assessment_evidence e where e.assessment_id=a.id and e.evidence_type in ('scannex_result','viewer_movement_log','assessor_checklist') and length(trim(e.evidence_reference))>0)=3
-- round(pr.raw_score/99*100,2)
select false
$$;
\ir ../../supabase/migrations/20261125062658_v1_scannex_practical_assignment.sql
\ir ../../supabase/migrations/20261127112842_v1_scannex_guided_recording_evidence.sql

do $test$
declare
 learner uuid := gen_random_uuid(); marker uuid := gen_random_uuid(); booking uuid := gen_random_uuid();
 pack uuid := gen_random_uuid(); assignment uuid := gen_random_uuid(); run uuid := gen_random_uuid();
 image1 uuid := gen_random_uuid(); image2 uuid := gen_random_uuid(); image3 uuid := gen_random_uuid();
 images uuid[] := array[image1,image2,image3]; i uuid; submission uuid;
 policy jsonb := '{"expectedVersion":0,"signedName":"Test Learner","declaration":true,"evidencePolicy":"guided-recording-v1"}';
begin
 if has_function_privilege('authenticated','public.v1_practical_mutate(uuid,text,uuid,jsonb)','EXECUTE')
 or has_table_privilege('authenticated','public.v1_practical_reviews','SELECT') then raise exception 'ASSESSOR_PERMISSION_REGRESSION'; end if;
 insert into auth.users values (learner),(marker);
 insert into public.user_roles values (marker,'admin');
 insert into public.profiles values(learner,null,'Test Learner');
 insert into public.assessment_bookings values(booking,'approved','DB-TEST');
 insert into public.v1_course_runs values(run,learner);
 insert into public.v1_practical_packs(id,title,status,learner_cases,answer_keys,created_by)
 values(pack,'Synthetic cases','approved',(select jsonb_agg(jsonb_build_object('id',x)) from unnest(images) x),'[]',marker);
 insert into public.v1_practical_assignments(id,assessment_id,pack_id,learner_user_id,v1_run_id,status,document)
 values(assignment,booking,pack,learner,run,'draft',jsonb_build_object('cases',(select jsonb_agg(jsonb_build_object('caseId',x)) from unnest(images) x)));
 begin
  perform public.v1_practical_mutate(learner,'submit',assignment,policy);
  raise exception 'MISSING_RECORDINGS_ACCEPTED';
 exception when raise_exception then if sqlerrm<>'EVIDENCE_REQUIRED' then raise; end if; end;
 foreach i in array images loop
  insert into public.v1_practical_files(assignment_id,case_id,kind,original_filename,mime_type,size_bytes,storage_path,status,sha256,uploaded_by,verified_at)
  values(assignment,i,'recording','live.webm','video/webm',10,i::text,'verified',repeat('a',64),learner,now());
 end loop;
 begin
  perform public.v1_practical_mutate(learner,'submit',assignment,policy-'evidencePolicy');
  raise exception 'LEGACY_SCREENSHOT_RULE_BYPASSED';
 exception when raise_exception then if sqlerrm<>'EVIDENCE_REQUIRED' then raise; end if; end;
 perform public.v1_practical_mutate(learner,'submit',assignment,policy);
 select a.latest_submission_id into submission from public.v1_practical_assignments a where a.id=assignment;
 if (select snapshot->>'evidencePolicy' from public.v1_practical_submissions where id=submission) is distinct from 'guided-recording-v1' then raise exception 'POLICY_NOT_FROZEN'; end if;
 if public.v1_practical_evidence_complete(booking) then raise exception 'CERTIFIABLE_WITHOUT_APPROVAL'; end if;
 insert into public.v1_practical_reviews(submission_id,decision,item_scores,notes,safety_concern,evidence_verified,assessor_id)
 values(submission,'passed','{}','Test fixture only',false,true,marker);
 update public.v1_practical_assignments set status='assessed' where id=assignment;
 if not public.v1_practical_evidence_complete(booking) then raise exception 'APPROVED_RECORDINGS_NOT_RECOGNISED'; end if;
end $test$;
select 'PASS — guided and legacy evidence rules; restricted assessor data' as result;
