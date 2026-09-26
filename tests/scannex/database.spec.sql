begin;
create function pg_temp.assert_true(value boolean, message text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'ASSERTION FAILED: %',message; end if; end $$;
create function pg_temp.expect_error(statement text, expected text) returns void language plpgsql as $$
begin
  begin execute statement; exception when others then
    if sqlerrm = expected then return; end if;
    raise exception 'Expected %, got %',expected,sqlerrm;
  end;
  raise exception 'Expected exception % but statement succeeded',expected;
end $$;
insert into auth.users(id) values('10000000-0000-4000-8000-000000000001'),('10000000-0000-4000-8000-000000000002'),('10000000-0000-4000-8000-000000000003');
insert into public.user_roles values('10000000-0000-4000-8000-000000000001','admin');
insert into public.course_enrolments values('10000000-0000-4000-8000-000000000002','scannex-training-programme','enrolled');
insert into public.scannex_cases(id,title,definition,definition_sha256,status,created_by,approved_by,approved_at)
values('20000000-0000-4000-8000-000000000001','SYNTHETIC SQL FIXTURE','{}',repeat('a',64),'approved','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',now());

do $$
declare r public.scannex_requests; a public.scannex_attempts; again public.scannex_attempts; outcome jsonb;
begin
  perform pg_temp.assert_true(not has_table_privilege('anon','public.scannex_cases','SELECT'),'anon cannot read case keys');
  perform pg_temp.assert_true(not has_table_privilege('authenticated','public.scannex_native_evidence','SELECT'),'authenticated cannot read native evidence directly');
  perform pg_temp.assert_true(not has_function_privilege('authenticated','public.scannex_start_practical(uuid,uuid)','EXECUTE'),'authenticated cannot bypass server start checks');
  perform pg_temp.assert_true(not has_function_privilege('anon','public.scannex_finish_practical(uuid,jsonb)','EXECUTE'),'anon cannot grade');
  perform pg_temp.assert_true(not has_table_privilege('service_role','public.scannex_cases','UPDATE'),'case versions cannot be overwritten by the application');
  perform pg_temp.assert_true(not has_table_privilege('service_role','public.scannex_native_evidence','UPDATE'),'native evidence cannot be overwritten by the application');
  perform pg_temp.assert_true((select count(*)=5 from pg_class where relname in ('scannex_cases','scannex_requests','scannex_attempts','scannex_native_evidence','scannex_automation_events') and relrowsecurity),'RLS enabled on all five tables');
  perform pg_temp.expect_error($q$select public.scannex_request_practical('10000000-0000-4000-8000-000000000003','synthetic@example.invalid',current_date)$q$,'ENROLMENT_REQUIRED');
  perform pg_temp.expect_error($q$select public.scannex_request_practical('10000000-0000-4000-8000-000000000002','synthetic@example.invalid',current_date-1)$q$,'INVALID_DATE');
  r := public.scannex_request_practical('10000000-0000-4000-8000-000000000002','synthetic@example.invalid',current_date);
  perform pg_temp.assert_true((public.scannex_request_practical('10000000-0000-4000-8000-000000000002','synthetic@example.invalid',current_date)).id=r.id,'duplicate readiness reuses request');
  perform pg_temp.expect_error(format('select public.scannex_approve_practical(%L,%L,%L,now(),now()+interval ''1 hour'')','10000000-0000-4000-8000-000000000002',r.id,'20000000-0000-4000-8000-000000000001'),'ADMIN_REQUIRED');
  perform public.scannex_approve_practical('10000000-0000-4000-8000-000000000001',r.id,'20000000-0000-4000-8000-000000000001',now()-interval '1 minute',now()+interval '1 hour');
  perform pg_temp.expect_error(format('select public.scannex_start_practical(%L,%L)','10000000-0000-4000-8000-000000000002',r.id),'THEORY_REQUIRED');
  insert into public.assessment_theory_attempts(learner_user_id,course_id,assessment_version,score,max_score) values('10000000-0000-4000-8000-000000000002','scannex-training-programme','scannex-summative-v1',60,68);
  -- Exercise RPCs with the actual application database role, not the table owner.
  set local role service_role;
  a := public.scannex_start_practical('10000000-0000-4000-8000-000000000002',r.id);
  again := public.scannex_start_practical('10000000-0000-4000-8000-000000000002',r.id);
  reset role;
  perform pg_temp.assert_true(a.id=again.id,'reconnect reuses the same attempt');
  perform pg_temp.assert_true(a.practical_maximum=100 and a.rubric_version='scannex-practical-v2','new attempts use 100 and v2');
  insert into public.assessment_theory_attempts(learner_user_id,course_id,assessment_version,score,max_score,submitted_at) values('10000000-0000-4000-8000-000000000002','scannex-training-programme','scannex-summative-v1',68,68,now()+interval '1 second');
  perform pg_temp.assert_true((select theory_score=60 from public.scannex_attempts where id=a.id),'attempt theory score is frozen');
  perform public.scannex_submit_checklist(a.learner_user_id,a.id,'{"signed":true,"conclusion":"refer"}');
  perform public.scannex_submit_checklist(a.learner_user_id,a.id,'{"signed":true,"conclusion":"refer"}');
  perform pg_temp.expect_error(format('select public.scannex_submit_checklist(%L,%L,%L)',a.learner_user_id,a.id,'{"signed":true,"conclusion":"clear"}'),'CHECKLIST_ALREADY_SUBMITTED');
  perform pg_temp.expect_error(format('select public.scannex_finish_practical(%L,%L)',a.id,'{}'),'EVIDENCE_REQUIRED');
  perform public.scannex_receive_evidence(a.id,repeat('a',64),'{"synthetic":true}');
  perform public.scannex_receive_evidence(a.id,repeat('a',64),'{"synthetic":true}');
  perform pg_temp.expect_error(format('select public.scannex_receive_evidence(%L,%L,%L)',a.id,repeat('b',64),'{"synthetic":false}'),'CONFLICTING_EVIDENCE');
  outcome := '{"version":"scannex-practical-v2","status":"passed","practicalMaximum":100,"theoryScore":60,"practicalScore":100,"practicalContribution":32,"finalScore":92,"safetyFailure":false}';
  perform public.scannex_finish_practical(a.id,outcome);
  perform public.scannex_finish_practical(a.id,outcome);
  perform pg_temp.assert_true((select status='completed' from public.scannex_requests where id=r.id),'final result completes request');
  perform pg_temp.expect_error(format('select public.scannex_finish_practical(%L,%L)',a.id,'{"status":"failed"}'),'RESULT_IMMUTABLE');
  r := public.scannex_request_practical(a.learner_user_id,'synthetic@example.invalid',current_date);
  perform public.scannex_approve_practical('10000000-0000-4000-8000-000000000001',r.id,'20000000-0000-4000-8000-000000000001',now()+interval '1 hour',now()+interval '2 hours');
  perform pg_temp.expect_error(format('select public.scannex_start_practical(%L,%L)',a.learner_user_id,r.id),'ACCESS_WINDOW_CLOSED');
  update public.scannex_requests set opens_at=now()-interval '2 hours',closes_at=now()-interval '1 hour' where id=r.id;
  perform pg_temp.expect_error(format('select public.scannex_start_practical(%L,%L)',a.learner_user_id,r.id),'ACCESS_WINDOW_CLOSED');
  raise notice 'Scannex database workflow and privilege assertions passed.';
end $$;
rollback;
