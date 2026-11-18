-- Run ONLY in an isolated local database with the V1 schema. Everything rolls back.
\set ON_ERROR_STOP on
begin;
create function pg_temp.expect_error(command text, expected text) returns void language plpgsql as $$
begin
 begin execute command; exception when others then
  if sqlerrm=expected then return; end if; raise;
 end;
 raise exception 'Expected error: %',expected;
end $$;
insert into auth.users(id,email) values
 ('00000000-0000-4000-8000-000000000001','learner@example.invalid'),
 ('00000000-0000-4000-8000-000000000002','admin@example.invalid'),
 ('00000000-0000-4000-8000-000000000003','other@example.invalid');
insert into public.user_roles(user_id,role) values('00000000-0000-4000-8000-000000000002','admin');
insert into public.profiles(user_id,full_name,certificate_name) values('00000000-0000-4000-8000-000000000001','Local QA Learner','Local QA Learner');
insert into public.course_enrolments(user_id,course_id,status) values('00000000-0000-4000-8000-000000000001','scannex-training-programme','enrolled');
insert into public.learner_progress(user_id,course_id,unit_id,status,completed_at)
select '00000000-0000-4000-8000-000000000001','scannex-training-programme','scannex-lu-'||n,'completed',now() from generate_series(1,8) n;
insert into public.scorm_attempts(user_id,course_id,unit_id,completion_status,suspend_data)
values('00000000-0000-4000-8000-000000000001','scannex-training-programme','scannex-lu-1','completed','preserve-this-history');

do $$
declare u uuid:='00000000-0000-4000-8000-000000000001'; a uuid:='00000000-0000-4000-8000-000000000002';
 r public.v1_course_runs; b uuid; t uuid; q uuid; c uuid; next_run uuid; s jsonb; v text:='scannex-summative-v2-classroom-202611';
begin
 if has_table_privilege('authenticated','public.v1_course_certificates','INSERT') or has_table_privilege('anon','public.v1_course_benefit_events','SELECT') or has_function_privilege('authenticated','public.v1_issue_certificate(uuid,text)','EXECUTE') then raise exception 'API privileges exposed'; end if;
 if exists(select 1 from pg_class where relname like 'v1_%' and relkind='r' and not relrowsecurity) then raise exception 'Missing RLS'; end if;
 perform pg_temp.expect_error(format('select public.v1_course_benefit_state(%L)','00000000-0000-4000-8000-000000000003'),'ACTIVE_ENROLMENT_REQUIRED');
 r:=public.v1_ensure_run(u);
 perform pg_temp.expect_error(format('select public.v1_issue_certificate(%L,%L)',u,'passed'),'CERTIFICATE_NOT_ELIGIBLE');
 perform pg_temp.expect_error(format('select public.v1_issue_certificate(%L,%L)',u,'attendance'),'CERTIFICATE_NOT_ELIGIBLE');
 insert into public.assessment_bookings(learner_user_id,course_id,v1_run_id,status,approved_by,approved_at,completed_at,created_by)
 values(u,r.course_id,r.id,'failed',a,now(),now(),a) returning id into b;
 insert into public.assessment_events(assessment_id,event_type,actor_user_id,metadata) values(b,'decision_recorded',a,'{"decision":"failed"}');
 c:=public.v1_issue_certificate(u,'attendance');
 if exists(select 1 from public.learner_progress where user_id=u and unit_id='scannex-lu-9' and status='completed') then raise exception 'Attendance must not complete summative assessment'; end if;
 if public.v1_issue_certificate(u,'attendance')<>c then raise exception 'Certificate is not idempotent'; end if;
 if not exists(select 1 from public.profiles where user_id=u and certificate_profile_locked_at is not null) then raise exception 'Name not locked'; end if;
 next_run:=public.v1_begin_redo(u,1);
 if not exists(select 1 from public.v1_course_runs where id=next_run and attempt_number=2 and previous_state->'scorm'->0->>'suspend_data'='preserve-this-history') then raise exception 'Previous activity not preserved'; end if;
 if exists(select 1 from public.learner_progress where user_id=u and status='completed') then raise exception 'Progress not reset'; end if;
 if not exists(select 1 from public.v1_course_certificates where id=c) then raise exception 'Attendance certificate was lost on redo'; end if;
 perform pg_temp.expect_error(format('select public.v1_begin_redo(%L,1)',u),'ATTEMPT_CHANGED_RELOAD');
 perform pg_temp.expect_error(format('select public.v1_submit_theory(%L,%L,%L,%L::jsonb,60,true)',u,r.id,v,'{}'),'ATTEMPT_CHANGED_RELOAD');
 r:=public.v1_ensure_run(u);
 t:=public.v1_submit_theory(u,r.id,v,'{}',30,false);
 perform pg_temp.expect_error(format('select public.v1_submit_theory(%L,%L,%L,%L::jsonb,60,true)',u,r.id,v,'{}'),'THEORY_ALREADY_SUBMITTED');
 insert into public.assessment_bookings(learner_user_id,course_id,v1_run_id,status,completed_at,created_by) values(u,r.course_id,r.id,'failed',now(),a) returning id into b;
 insert into public.assessment_events(assessment_id,event_type,actor_user_id,metadata) values(b,'decision_recorded',a,'{"decision":"failed"}');
 perform pg_temp.expect_error(format('select public.v1_begin_redo(%L,2)',u),'APGI_APPROVAL_REQUIRED');
 q:=public.v1_request_retake(u,'Please consider a discounted further attempt.');
 if public.v1_request_retake(u,'Repeat click')<>q then raise exception 'Duplicate request'; end if;
 perform pg_temp.expect_error(format('select public.v1_review_retake(%L,%L,true,%L)',u,q,'approved'),'ADMIN_REQUIRED');
 perform public.v1_review_retake(a,q,true,'Local QA approval, no payment processing');
 next_run:=public.v1_begin_redo(u,2);
 if not exists(select 1 from public.v1_retake_requests where id=q and status='redeemed') then raise exception 'Approval not consumed'; end if;
 r:=public.v1_ensure_run(u);
 if r.attempt_number<>3 then raise exception 'Third attempt not created'; end if;
 t:=public.v1_submit_theory(u,r.id,v,'{}',60,true);
 update public.learner_progress set status='completed',completed_at=now() where user_id=u;
 insert into public.assessment_bookings(learner_user_id,course_id,v1_run_id,status,approved_by,approved_at,completed_at,created_by,theory_attempt_id,final_score)
 values(u,r.course_id,r.id,'passed',a,now(),now(),a,t,92) returning id into b;
 perform pg_temp.expect_error(format('select public.v1_issue_certificate(%L,%L)',u,'passed'),'CERTIFICATE_NOT_ELIGIBLE');
 insert into public.assessment_evidence(assessment_id,evidence_type,evidence_reference,recorded_by)
 select b,x,'local-qa-only',a from unnest(array['scannex_result','viewer_movement_log','assessor_checklist']) x;
 insert into public.assessment_practical_rubrics(assessment_id,trainer_exercise_reference,item_scores,raw_score,normalized_score,assessed_by)
 values(b,'LOCAL-QA','{}',99,100,a);
 insert into public.assessment_events(assessment_id,event_type,actor_user_id,metadata) values(b,'decision_recorded',u,'{"decision":"passed"}');
 perform pg_temp.expect_error(format('select public.v1_issue_certificate(%L,%L)',u,'passed'),'CERTIFICATE_NOT_ELIGIBLE');
 insert into public.assessment_events(assessment_id,event_type,actor_user_id,metadata) values(b,'decision_recorded',a,'{"decision":"passed"}');
 update public.assessment_practical_rubrics set material_safety_concern=true,safety_review_notes='Safety review required' where assessment_id=b;
 perform pg_temp.expect_error(format('select public.v1_issue_certificate(%L,%L)',u,'passed'),'CERTIFICATE_NOT_ELIGIBLE');
 update public.assessment_practical_rubrics set material_safety_concern=false,safety_review_notes=null where assessment_id=b;
 if not (public.v1_course_benefit_state(u)->>'passed')::boolean then raise exception 'Valid pass not recognised'; end if;
 c:=public.v1_issue_certificate(u,'passed');
 if not exists(select 1 from public.completion_states where user_id=u and status='completed' and completed_units=9 and progress_percent=100) then raise exception 'Verified pass should complete course progress'; end if;
 if (select count(*) from public.v1_course_certificates where learner_user_id=u)<>2 then raise exception 'Attendance and achievement certificates should coexist'; end if;
 perform pg_temp.expect_error(format('select public.v1_begin_redo(%L,3)',u),'REDO_REQUIRES_FINAL_FAILURE');
 update public.profiles set certificate_name='Changed QA Name' where user_id=u;
 if (select learner_name from public.v1_course_certificates where id=c)<>'Local QA Learner' then raise exception 'Certificate snapshot changed'; end if;
 raise notice 'PASS: certificate gates, actor validation, safety, idempotency, attendance plus redo, archival reset, one included redo, approval and third-attempt pass';
end $$;
rollback;
