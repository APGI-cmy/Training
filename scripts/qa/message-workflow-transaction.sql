begin;
do $$
declare owner_a uuid=gen_random_uuid();owner_b uuid=gen_random_uuid();learner uuid=gen_random_uuid();outsider uuid=gen_random_uuid();
 org_a uuid=gen_random_uuid();org_b uuid=gen_random_uuid();tid uuid;mid uuid=gen_random_uuid();sid uuid;detail jsonb;failed boolean;result jsonb;
begin
 insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data,raw_app_meta_data) values
 (owner_a,'message-owner-a@qa.invalid',now(),'{}','{}'),(owner_b,'message-owner-b@qa.invalid',now(),'{}','{}'),(learner,'message-learner@qa.invalid',now(),'{}','{}'),(outsider,'message-outsider@qa.invalid',now(),'{}','{}');
 insert into public.organisations(id,slug,name) values(org_a,'message-qa-a-'||org_a,'Message QA A'),(org_b,'message-qa-b-'||org_b,'Message QA B');
 insert into public.organisation_memberships(organisation_id,user_id,membership_role,is_active) values(org_a,owner_a,'owner',true),(org_b,owner_b,'owner',true),(org_a,learner,'learner',true);
 tid=public.v2_message_send(learner,mid,null,org_a,'QA support','Please help');
 if not public.v2_message_access(owner_a,tid) or public.v2_message_access(owner_b,tid) or public.v2_message_access(outsider,tid) then raise exception 'FAIL company isolation';end if;
 if exists(select 1 from public.v2_message_participants where thread_id=tid and email='jorrie.jordaan@apginc.ca') then raise exception 'FAIL bypassed first-level admin';end if;
 if public.v2_message_send(learner,mid,null,org_a,'QA duplicate','Do not duplicate')<>tid or(select count(*) from public.v2_messages where id=mid)<>1 then raise exception 'FAIL idempotency';end if;
 detail=public.v2_message_detail(owner_a,tid);
 if not exists(select 1 from public.v2_message_deliveries where message_id=mid and email='message-owner-a@qa.invalid' and read_at is not null) then raise exception 'FAIL read receipt';end if;
 failed=false;begin perform public.v2_message_send(learner,gen_random_uuid(),null,org_a,'QA forbidden','No direct escalation','jorrie.jordaan@apginc.ca');exception when others then failed=true;end;if not failed then raise exception 'FAIL learner direct send';end if;
 failed=false;begin perform public.v2_message_manage(learner,tid,'escalate');exception when others then failed=true;end;if not failed then raise exception 'FAIL learner escalation';end if;
 failed=false;begin perform public.v2_message_detail(outsider,tid);exception when others then failed=true;end;if not failed then raise exception 'FAIL outsider read';end if;
 perform public.v2_message_manage(owner_a,tid,'escalate');
 if not exists(select 1 from public.v2_message_participants where thread_id=tid and email='jorrie.jordaan@apginc.ca') then raise exception 'FAIL escalation';end if;
 perform public.v2_message_send(owner_a,gen_random_uuid(),tid,null,'','Reply with notes',null,jsonb_build_object('name','notes.txt','mime','text/plain','data',encode(convert_to('Private notes','utf8'),'base64')));
 if public.v2_message_attachment(outsider,(select id from public.v2_messages where thread_id=tid and attachment_name is not null)) is not null then raise exception 'FAIL attachment isolation';end if;
 failed=false;begin perform public.v2_message_schedule_save(owner_a,org_a,'Wrong company','No',jsonb_build_array('message-owner-b@qa.invalid'),'once',now(),null);exception when others then failed=true;end;if not failed then raise exception 'FAIL recipient scope';end if;
 sid=public.v2_message_schedule_save(owner_a,org_a,'Scheduled QA','Scheduled note',jsonb_build_array('message-learner@qa.invalid'),'daily',now(),now()+interval '2 days');
 if public.v2_message_schedule_tick()<>1 then raise exception 'FAIL dispatch';end if;
 perform public.v2_message_schedule_tick();if(select sent_count from public.v2_message_schedules where id=sid)<>1 then raise exception 'FAIL repeated dispatch';end if;
 update public.organisation_memberships set is_active=false where user_id=owner_a;
 update public.v2_message_schedules set next_at=now()-interval '1 minute' where id=sid;
 perform public.v2_message_schedule_tick();if(select state from public.v2_message_schedules where id=sid)<>'paused' then raise exception 'FAIL revoked admin schedule';end if;
 if public.v2_message_access(owner_a,tid) then raise exception 'FAIL revoked owner access';end if;
 if has_function_privilege('authenticated','public.v2_message_send(uuid,uuid,uuid,uuid,text,text,text,jsonb,text)','EXECUTE') or has_table_privilege('authenticated','public.v2_messages','SELECT') then raise exception 'FAIL public privilege';end if;
 raise notice 'PASS: routing, isolation, replay, receipts, escalation, attachments, schedules, revocation and API privileges';
end $$;
rollback;
