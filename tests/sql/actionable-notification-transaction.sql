-- V2 integration check. All notification and receipt writes are rolled back.
begin;
set local role service_role;
do $check$
declare actor uuid;other_actor uuid;r public.course_review_rounds;tasks jsonb;versions jsonb;item public.admin_notifications;result jsonb;before_document jsonb;reference bigint;proposed_document jsonb;next_revision integer;mail_before bigint;
begin
 select id into actor from auth.users where lower(email)='jorrie.jordaan@apginc.ca' and email_confirmed_at is not null;
 select id into other_actor from auth.users where lower(email)='johan.ras@apginc.ca';
 select * into r from public.course_review_rounds where status='open' and course_id='vpshr-level-0' order by created_at desc limit 1;
 if actor is null or r.id is null then raise exception 'Verified V2 test context unavailable';end if;
 before_document=r.document;
 tasks=jsonb_build_array(jsonb_build_object('key','review-action:'||r.id||':qa:'||pg_catalog.txid_current(),'roundId',r.id,'revision',r.revision,
  'title','QA transaction-only commercial response','requirement','Check the saved proposal; this fixture is rolled back.',
  'path','/course-reviews/'||r.id||'/commercials','anchor','commercial-signoff-jorrie','version','qa-fixture'));
 versions=jsonb_build_array(jsonb_build_object('id',r.id,'revision',r.revision));
 result=public.v3_notification_inbox(actor,tasks,versions,'all',0,false);
 select * into item from public.admin_notifications where recipient_user_id=actor and event_key=tasks#>>'{0,key}';
 if item.id is null or item.reference_number is null or not public.v3_notification_pending(item) then raise exception 'Required action not projected';end if;
 reference=item.reference_number;
 perform public.v3_notification_inbox(actor,tasks,versions,'all',0,true);
 if (select count(*) from public.admin_notifications where recipient_user_id=actor and event_key=tasks#>>'{0,key}')<>1 then raise exception 'Duplicate request created';end if;
 perform public.v2_notification_receipt(actor,item.id,'read');
 select * into item from public.admin_notifications where id=item.id;
 if item.read_at is null or item.acknowledged_at is not null or not public.v3_notification_pending(item) then raise exception 'Reading incorrectly completed a required action';end if;
 if public.v3_notification_one(other_actor,item.id) is not null then raise exception 'Reference leaked to another account';end if;
 if not exists(select 1 from jsonb_array_elements(public.v3_notification_targets(actor,'/course-reviews/'||r.id||'/commercials',item.id)) n where n->>'id'=item.id::text) then raise exception 'Destination reference missing';end if;
 perform public.v3_notification_inbox(actor,'[]',versions,'all',0,true);
 select * into item from public.admin_notifications where id=item.id;
 if public.v3_notification_pending(item) or item.read_at is null or not(item.context?'resolved_at') or item.reference_number<>reference then raise exception 'Completion history or stable reference lost';end if;
 if (select document from public.course_review_rounds where id=r.id) is distinct from before_document then raise exception 'Receipt modified workflow';end if;
 if has_function_privilege('anon','public.v3_notification_inbox(uuid,jsonb,jsonb,text,integer,boolean)','execute')
 or has_function_privilege('authenticated','public.v3_notification_inbox(uuid,jsonb,jsonb,text,integer,boolean)','execute')
 or has_function_privilege('authenticated','public.v3_notification_one(uuid,uuid)','execute')
 or has_function_privilege('anon','public.v3_notification_targets(uuid,text,uuid)','execute') then raise exception 'Private notification API exposed to browser roles';end if;
 -- Exercise the actual review writer with an advisory proposal, then roll it back.
 select count(*) into mail_before from public.course_review_mail where round_id=r.id;
 proposed_document=jsonb_set(before_document,'{commercialFeedback}',coalesce(before_document->'commercialFeedback','[]')||jsonb_build_array(jsonb_build_object(
  'id','qa-transaction-only','versionId',before_document#>>'{workflow,commercials,-1,id}','email','jorrie.jordaan@apginc.ca','userId',actor,
  'at',now(),'comment','QA transaction-only non-binding proposal.','apgiShare','30')));
 next_revision=public.v2_commit_course_review(r.id,r.revision,proposed_document,actor,'commercial_proposal','[]');
 if next_revision<>r.revision+1 or (select document->'workflow' from public.course_review_rounds where id=r.id) is distinct from before_document->'workflow'
 then raise exception 'Advisory proposal changed approvals or commercial terms';end if;
 if (select count(*) from public.course_review_mail where round_id=r.id)<>mail_before then raise exception 'Advisory proposal queued email';end if;
end $check$;
select 'All notification identity, receipt, completion and privacy checks passed; writes rolled back' as result;
rollback;
