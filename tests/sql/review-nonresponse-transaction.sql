-- Everything in this test is rolled back. No email provider is called.
do $qa$
declare a uuid;b uuid;source public.course_review_rounds;rid uuid=gen_random_uuid();rid2 uuid=gen_random_uuid();doc jsonb;f jsonb;q public.course_review_response_requests;key1 text='qa:'||gen_random_uuid();key2 text='qa:'||gen_random_uuid();hash text=repeat('c',64);n integer;current_doc jsonb;result_time timestamptz;
begin
 select id into a from auth.users where lower(email)='johan.ras@apginc.ca' and email_confirmed_at is not null;
 select id into b from auth.users where lower(email)='jorrie.jordaan@apginc.ca' and email_confirmed_at is not null;
 select * into source from public.course_review_rounds where course_id='vpshr-level-0' and status='open' limit 1;
 if a is null or b is null or source.id is null then raise exception 'QA source unavailable';end if;
 doc=source.document||jsonb_build_object('reviewProcessVersion',3,'requester','johan.ras@apginc.ca','requesterId',a,'designerEmail','johan.ras@apginc.ca','title','Rolled-back response QA','cutoff',now()+interval '10 days','units',jsonb_build_array(jsonb_build_object('slug','lu1')),'reports','[]'::jsonb,'events','[]'::jsonb,'requests','[]'::jsonb,'contentRevisions','[]'::jsonb,'deemedEndorsements','[]'::jsonb,
 'nonresponsePolicy',jsonb_build_object('version',1,'days',7,'roundId',rid,'enabledAt',now()-interval '10 days','enabledBy',a),
 'participants',jsonb_build_array(jsonb_build_object('email','johan.ras@apginc.ca','userId',a,'role','primary','state','active','coverage',jsonb_build_array('lu1'),'tasks',jsonb_build_array('content')),jsonb_build_object('email','jorrie.jordaan@apginc.ca','role','primary','state','invited','coverage','[]'::jsonb,'tasks',jsonb_build_array('content'))));
 doc=jsonb_set(doc,'{workflow}',jsonb_build_object('version',2,'stage','content_review','counterOffers',0,'commercials','[]'::jsonb,'designerName','QA','designerCompany','APGI','partner',false));
 f=jsonb_build_object('id','qa-declaration','unit','lu1','author','johan.ras@apginc.ca','userId',a,'at',now()-interval '9 days','outcome','satisfied','status','closed','fingerprint',hash,'replies','[]'::jsonb);
 doc=jsonb_set(doc,'{findings}',jsonb_build_array(f));
 insert into public.course_review_rounds(id,organisation_id,course_id,fingerprint,document,created_at) values(rid,source.organisation_id,source.course_id,hash,doc,now()-interval '10 days');
 insert into public.course_review_mail(round_id,notification_key,recipient,kind,subject,body,state,sent_at,created_at) values(rid,key1,'jorrie.jordaan@apginc.ca','review_policy_notice','QA only','Seven-day response rule: rolled-back QA','sent',now()-interval '8 days',now()-interval '8 days');
 n=public.v3_queue_review_responses(rid,1,jsonb_build_array(jsonb_build_object('key','initial-qa','kind','initial','recipient','jorrie.jordaan@apginc.ca','fingerprint',hash,'units',jsonb_build_array('lu1'),'noticeKey',key1,'requestedAt',now()-interval '10 days')),'[]');
 if n<>1 then raise exception 'Initial request not queued';end if;
 n=public.v3_process_review_nonresponses();if n<>1 then raise exception 'Due initial request not deemed';end if;
 select document into current_doc from public.course_review_rounds where id=rid;
 if current_doc#>'{participants,1,coverage}'<>'[]'::jsonb or current_doc#>>'{participants,1,userId}' is not null then raise exception 'Actual coverage/account fabricated';end if;
 if current_doc#>'{findings,0,workflowEndorsements}' is not null or current_doc#>>'{findings,0,verifiedBy}' is not null then raise exception 'Human endorsement fabricated';end if;
 if not public.v3_lu_review_ready(current_doc,hash) then raise exception 'Properly notified deemed initial review rejected';end if;
 if public.v3_lu_review_ready(current_doc#-'{deemedEndorsements,0,at}',hash) or public.v3_lu_review_ready(current_doc#-'{deemedEndorsements,0,notifiedAt}',hash) then raise exception 'Incomplete deemed evidence accepted';end if;
 if public.v3_lu_review_ready(jsonb_set(jsonb_set(current_doc,'{findings,0,outcome}','"issue"'),'{findings,0,status}','"open"'),hash) then raise exception 'Initial timeout closed an unimplemented issue';end if;
 if public.v3_process_review_nonresponses()<>0 then raise exception 'Deemed result duplicated';end if;
 if (select count(*) from public.course_review_mail where round_id=rid and kind='deemed_endorsement')<>2 then raise exception 'Reviewer/requester result notices missing';end if;

 -- A pending/failed notice never starts the timer; successful sending starts seven days.
 doc=jsonb_set(doc,'{nonresponsePolicy,roundId}',to_jsonb(rid2::text));
 doc=jsonb_set(doc,'{cutoff}',to_jsonb(now()+interval '1 day'));
 insert into public.course_review_rounds(id,organisation_id,course_id,fingerprint,document,created_at) values(rid2,source.organisation_id,source.course_id,hash,doc,now()-interval '10 days');
 insert into public.course_review_mail(round_id,notification_key,recipient,kind,subject,body) values(rid2,key2,'jorrie.jordaan@apginc.ca','review_response_request','QA only','Seven-day response rule: rolled-back QA');
 n=public.v3_queue_review_responses(rid2,1,jsonb_build_array(jsonb_build_object('key','unsent-qa','kind','initial','recipient','jorrie.jordaan@apginc.ca','fingerprint',hash,'units',jsonb_build_array('lu1'),'noticeKey',key2,'requestedAt',now()-interval '10 days')),'[]');
 select * into q from public.course_review_response_requests where round_id=rid2;
 if q.notified_at is not null or q.due_at is not null then raise exception 'Unsent notice clock started';end if;
 update public.course_review_mail set state='failed' where notification_key=key2;
 if public.v3_process_review_nonresponses()<>0 then raise exception 'Failed notice deemed';end if;
 update public.course_review_mail set state='sent' where notification_key=key2;
 select * into q from public.course_review_response_requests where round_id=rid2;
 if q.notified_at is null or q.due_at<>q.notified_at+interval '7 days' then raise exception 'Sent notice did not start exact seven days';end if;
 if public.v3_process_review_nonresponses()<>0 then raise exception 'Early timeout accepted';end if;
 if (select (document->>'cutoff')::timestamptz from public.course_review_rounds where id=rid2)<q.due_at then raise exception 'Full response window not preserved';end if;
 -- A real response cancels the timer without waiting for its expiry.
 update public.course_review_rounds set document=jsonb_set(document,'{participants,1,coverage}',jsonb_build_array('lu1')) where id=rid2;
 if public.v3_process_review_nonresponses()<>0 then raise exception 'Responding reviewer deemed';end if;
 if (select state from public.course_review_response_requests where round_id=rid2)<>'cancelled' then raise exception 'Response timer not cancelled';end if;

 -- Reuse the isolated second round for a later designer response endorsement.
 doc=jsonb_set(doc,'{participants,1,userId}',to_jsonb(b::text));
 doc=jsonb_set(doc,'{participants,1,coverage}','[]');
 f=jsonb_build_object('id','qa-issue','unit','lu1','author','jorrie.jordaan@apginc.ca','userId',b,'at',now()-interval '9 days','outcome','issue','status','fixed','fingerprint',hash,'replies','[]'::jsonb,'implementationRounds',jsonb_build_array(jsonb_build_object('id','qa-response','number',1,'findingAt',now()-interval '9 days','fingerprint',hash,'email','johan.ras@apginc.ca','userId',a,'at',now()-interval '8 days','implemented','yes','notes','The full correction is submitted','endorsements','[]'::jsonb)));
 doc=jsonb_set(doc,'{findings}',jsonb_build_array(f));update public.course_review_rounds set document=doc where id=rid2;
 key2='qa:'||gen_random_uuid();insert into public.course_review_mail(round_id,notification_key,recipient,kind,subject,body,state,sent_at,created_at) values(rid2,key2,'jorrie.jordaan@apginc.ca','review_response_request','QA only','Seven-day response rule: rolled-back QA','sent',now()-interval '7 days 1 hour',now()-interval '7 days 1 hour');
 select revision into n from public.course_review_rounds where id=rid2;
 n=public.v3_queue_review_responses(rid2,n,jsonb_build_array(jsonb_build_object('key','endorsement-qa','kind','endorsement','recipient','jorrie.jordaan@apginc.ca','fingerprint',hash,'units',jsonb_build_array('lu1'),'findingId','qa-issue','findingAt',now()-interval '9 days','responseId','qa-response','requestedAt',now()-interval '8 days','noticeKey',key2)),'[]');
 if n<>1 or public.v3_process_review_nonresponses()<>1 then raise exception 'Due response endorsement not deemed';end if;
 select document into current_doc from public.course_review_rounds where id=rid2;
 if not public.v3_finding_deemed(current_doc,hash,current_doc->'findings'->0) then raise exception 'System response endorsement not recognized';end if;
 if current_doc#>'{findings,0,implementationRounds,0,endorsements}'<>'[]'::jsonb then raise exception 'Human response endorsement fabricated';end if;
 -- A rejected response must never be silently accepted, even with old timer evidence.
 current_doc=jsonb_set(current_doc,'{findings,0,implementationRounds,0,endorsementReopen}',jsonb_build_object('reason','Still not correct','findingAt',now()-interval '9 days','fingerprint',hash));
 if public.v3_finding_deemed(current_doc,hash,current_doc->'findings'->0) then raise exception 'Rejected response auto-accepted';end if;
 if has_function_privilege('authenticated','public.v3_process_review_nonresponses()','execute') or has_table_privilege('anon','public.course_review_response_requests','select') then raise exception 'Public policy access granted';end if;
end $qa$;
select 'Nonresponse clock, initial/response timers, rejection, idempotency and role checks passed; all fixtures roll back' as result;
