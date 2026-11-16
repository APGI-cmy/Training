-- Run only in the isolated fixture database described by the local test runner.
do $$begin
 if (select md5(row_to_json(s)::text) from public.scorm_attempts s where user_id='00000000-0000-4000-8000-000000000003')<>(select hash from public.fixture_hash) then raise exception 'Historical SCORM row changed';end if;
 if not exists(select from public.tiger_unit_progress where legacy_credit and qualified_at is not null and user_id='00000000-0000-4000-8000-000000000003') then raise exception 'Historical credit missing';end if;
 raise notice 'PASS: historical attempt unchanged; historical credit explicit';
end$$;

-- A separately published runtime course has its own ledger and the same guard.
insert into public.scorm_attempts(user_id,course_id,unit_id,completion_status,success_status) values('00000000-0000-4000-8000-000000000002','another-course','another-unit','completed','passed');
insert into public.learner_progress values('00000000-0000-4000-8000-000000000002','another-course','another-unit','completed');
set role authenticated;
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000002';
do $$begin
 begin
  update public.scorm_attempts set course_id='tiger-kidnapping-telecommunications',unit_id='tiger-telecom-lu-1' where user_id='00000000-0000-4000-8000-000000000002' and course_id='another-course';
  raise exception 'FAIL: reassigned old quiz result bypassed qualification';
 exception when insufficient_privilege then null;end;
 begin
  update public.learner_progress set course_id='tiger-kidnapping-telecommunications',unit_id='tiger-telecom-lu-1' where user_id='00000000-0000-4000-8000-000000000002' and course_id='another-course';
  raise exception 'FAIL: reassigned old progress bypassed qualification';
 exception when insufficient_privilege then null;end;
 raise notice 'PASS: existing passed rows cannot be reassigned to bypass Tiger qualification';
end$$;
reset role;
insert into public.course_editions values('tiger-kidnapping-telecommunications','tiger-separate-edition');
insert into public.course_enrolments values('00000000-0000-4000-8000-000000000002','tiger-separate-edition',null);
set role authenticated;
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000002';
do $$begin
 if public.tiger_unit_asset_allowed('tiger-separate-edition',2) then raise exception 'Separate runtime bypassed prerequisites';end if;
 begin
  insert into public.learner_progress values('00000000-0000-4000-8000-000000000002','tiger-separate-edition','tiger-telecom-lu-1','completed');
  raise exception 'FAIL: separate runtime completion accepted';
 exception when insufficient_privilege then null;end;
 raise notice 'PASS: separate runtime course retains prerequisite and completion guards';
end$$;
reset role;

set role service_role;
select public.tiger_merge_progress('00000000-0000-4000-8000-000000000001','tiger-kidnapping-telecommunications','tiger-telecom-lu-1','legacy','POLICY_VERSION',100,'[]',null,false,array['activity@3']);
reset role;
do $$begin
 begin
  perform public.tiger_merge_progress('00000000-0000-4000-8000-000000000001','tiger-kidnapping-telecommunications','tiger-telecom-lu-1','legacy','POLICY_VERSION',100,'[[0,100]]',null,true,array['activity@3']);
  raise exception 'FAIL: skipped video accepted';
 exception when raise_exception then if sqlerrm='FAIL: skipped video accepted' then raise;end if;end;
 raise notice 'PASS: seek-to-end / impossible first heartbeat rejected';
end$$;
update public.tiger_unit_progress set heartbeat_at=clock_timestamp()-interval '10 seconds' where user_id='00000000-0000-4000-8000-000000000001';
select public.tiger_merge_progress('00000000-0000-4000-8000-000000000001','tiger-kidnapping-telecommunications','tiger-telecom-lu-1','legacy','POLICY_VERSION',100,'[[0,20],[5,10]]',null,false,array['activity@3']);
do $$begin
 if (select video_ranges from public.tiger_unit_progress where user_id='00000000-0000-4000-8000-000000000001')<>'[[0,20]]'::jsonb then raise exception 'Overlap counted twice';end if;
 raise notice 'PASS: range union counts overlapping/repeated viewing once';
end$$;
update public.tiger_unit_progress set heartbeat_at=clock_timestamp()-interval '10 seconds' where user_id='00000000-0000-4000-8000-000000000001';
select public.tiger_merge_progress('00000000-0000-4000-8000-000000000001','tiger-kidnapping-telecommunications','tiger-telecom-lu-1','legacy','POLICY_VERSION',100,'[[20,50]]',null,false,array['activity@3']);
update public.tiger_unit_progress set heartbeat_at=clock_timestamp()-interval '10 seconds' where user_id='00000000-0000-4000-8000-000000000001';
select public.tiger_merge_progress('00000000-0000-4000-8000-000000000001','tiger-kidnapping-telecommunications','tiger-telecom-lu-1','legacy','POLICY_VERSION',100,'[[50,79]]',null,true,array['activity@3']);
do $$begin
 if exists(select from public.tiger_unit_progress where user_id='00000000-0000-4000-8000-000000000001' and (quiz_passed or qualified_at is not null)) then raise exception '79 percent incorrectly qualified';end if;
 begin
  perform public.tiger_merge_progress('00000000-0000-4000-8000-000000000001','tiger-kidnapping-telecommunications','tiger-telecom-lu-1','legacy','POLICY_VERSION',100,'[]','activity@3',true,array['activity@3']);
  raise exception 'FAIL: 79 percent summary accepted';
 exception when raise_exception then if sqlerrm='FAIL: 79 percent summary accepted' then raise;end if;end;
 raise notice 'PASS: 79 percent cannot qualify or activate a later activity';
end$$;
select public.tiger_merge_progress('00000000-0000-4000-8000-000000000001','tiger-kidnapping-telecommunications','tiger-telecom-lu-1','legacy','POLICY_VERSION',100,'[[79,80]]','activity@3',true,array['activity@3']);
do $$begin
 if not exists(select from public.tiger_unit_progress where user_id='00000000-0000-4000-8000-000000000001' and quiz_passed and qualified_at is not null and video_ranges='[[0,80]]') then raise exception '80 percent + summary + quiz did not qualify';end if;
 raise notice 'PASS: 80 percent plus actual required summary and quiz pass qualifies';
end$$;

set role authenticated;
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000002';
do $$begin
 if exists(select from public.tiger_unit_progress where user_id<>'00000000-0000-4000-8000-000000000002') then raise exception 'Cross-learner disclosure';end if;
 begin
  insert into public.tiger_unit_progress(user_id,course_id,unit_id,edition_key,policy_version,qualified_at) values('00000000-0000-4000-8000-000000000002','tiger-kidnapping-telecommunications','tiger-telecom-lu-1','legacy','POLICY_VERSION',now());
  raise exception 'FAIL: direct ledger write accepted';
 exception when insufficient_privilege then null;end;
 begin
  perform public.tiger_merge_progress('00000000-0000-4000-8000-000000000002','tiger-kidnapping-telecommunications','tiger-telecom-lu-1','legacy','POLICY_VERSION',100,'[]',null,true,array['activity@3']);
  raise exception 'FAIL: browser RPC allowed';
 exception when insufficient_privilege then null;end;
 begin
  insert into public.learner_progress values('00000000-0000-4000-8000-000000000002','tiger-kidnapping-telecommunications','tiger-telecom-lu-1','completed');
  raise exception 'FAIL: direct completion accepted';
 exception when insufficient_privilege then null;end;
 if public.tiger_unit_asset_allowed('tiger-kidnapping-telecommunications',2) then raise exception 'Direct LU2 asset bypass';end if;
 raise notice 'PASS: cross-learner read, direct ledger/RPC/completion and later assets rejected';
end$$;
reset role;
set role authenticated;
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';
do $$begin
 if not public.tiger_unit_asset_allowed('tiger-kidnapping-telecommunications',2) then raise exception 'Qualified LU2 asset blocked';end if;
 if public.tiger_unit_asset_allowed('tiger-kidnapping-telecommunications',3) then raise exception 'LU3 bypassed incomplete LU2';end if;
end$$;
insert into public.learner_progress values('00000000-0000-4000-8000-000000000001','tiger-kidnapping-telecommunications','tiger-telecom-lu-1','completed');
reset role;
insert into public.course_enrolments values('00000000-0000-4000-8000-000000000001','tiger-kidnapping-telecommunications','10000000-0000-4000-8000-000000000001');
set role authenticated;
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';
do $$begin
 if public.tiger_unit_asset_allowed('tiger-kidnapping-telecommunications',2) then raise exception 'Old edition qualification leaked';end if;
 raise notice 'PASS: predecessor qualifications and edition isolation enforced';
end$$;
reset role;

update public.scorm_attempts set interactions='{"response":"later assessment attempt"}' where user_id='00000000-0000-4000-8000-000000000003';
do $$begin
 if not exists(select from public.tiger_scorm_history where attempt->'interactions'->>'response'='original saved assessment') then raise exception 'Original assessment responses lost';end if;
 raise notice 'PASS: original saved assessment retained before a subsequent update';
end$$;
