-- Producer checks only. Every fixture and state change is rolled back; no email is sent.
begin;
do $$
declare actor uuid; org uuid; rid uuid; sourceid uuid; body jsonb; result jsonb; denied boolean; original text;
begin
 select user_id into actor from public.platform_principals where lower(email)='johan.ras@apginc.ca';
 select id into org from public.organisations where slug='apgi';
 body=jsonb_build_object('company',org,'kind','policies','title','ROLLBACK ONLY review request','recipients',jsonb_build_array('johan.ras@apginc.ca'),'reason','Producer rollback verification only','operationId',gen_random_uuid(),'deadline',now()+interval '7 days','snapshot',jsonb_build_object('items',jsonb_build_array(jsonb_build_object('id','policy-one','title','Test policy','version','1','body','Rollback only'))));
 result=public.v6_review_action(actor,'create',null,0,body);rid=(result->>'id')::uuid;
 perform public.v6_review_action(actor,'create',null,0,body);
 if (select count(*) from public.v6_review_events where request_id=rid)<>1 then raise exception 'Duplicate create';end if;
 denied=false;begin perform public.v6_review_action(gen_random_uuid(),'close',rid,1,jsonb_build_object('reason','Unauthorised close attempted','operationId',gen_random_uuid()));exception when others then denied=true;end;if not denied then raise exception 'Unauthorised close accepted';end if;
 denied=false;begin perform public.v6_review_action(actor,'respond',rid,1,jsonb_build_object('reason','Missing a required item decision','operationId',gen_random_uuid(),'decisions','{}'::jsonb));exception when others then denied=true;end;if not denied then raise exception 'Incomplete signoff accepted';end if;
 perform public.v6_review_action(actor,'respond',rid,1,jsonb_build_object('reason','Human producer fixture response','operationId',gen_random_uuid(),'decisions',jsonb_build_object('policy-one','approve')));
 perform public.v6_review_action(actor,'reopen',rid,2,jsonb_build_object('reason','Reopening preserves the prior human response','operationId',gen_random_uuid()));
 if not exists(select 1 from public.v6_review_requests where id=rid and state='open' and cycle=2) or not exists(select 1 from public.v6_review_events e where request_id=rid and operation='respond' and e.payload->'decisions'->>'policy-one'='approve') then raise exception 'Response history lost';end if;
 perform public.v6_review_action(actor,'close',rid,3,jsonb_build_object('reason','Closing is not policy approval','operationId',gen_random_uuid()));
 if not exists(select 1 from public.v6_review_requests where id=rid and state='closed' and response is null) then raise exception 'Closure inferred approval';end if;
 select id,source_round into rid,sourceid from public.v6_review_requests where source_round is not null and reviewer_email='johan.ras@apginc.ca' limit 1;
 select md5((document->'findings')::text||(document->'participants')::text||(document->'reports')::text) into original from public.course_review_rounds where id=sourceid;
 perform public.v6_review_action(actor,'reopen',rid,1,jsonb_build_object('reason','Reopen manual Tiger review while keeping the published release','operationId',gen_random_uuid()));
 if not exists(select 1 from public.course_review_rounds where id=sourceid and md5((document->'findings')::text||(document->'participants')::text||(document->'reports')::text)=original) then raise exception 'Existing review data changed';end if;
 if not exists(select 1 from public.v6_review_mail where context->>'requestId'=rid::text) then raise exception 'Missing event mail';end if;
end $$;
rollback;
select 'passed: create retry, actor guard, per-policy decisions, reopen history, closure without approval, source evidence preservation and outbox; all fixtures rolled back' as result;
