-- Independent, version-bound requests. No course publication, learner or price records are reset.
create table public.v6_review_requests(
 id uuid primary key default gen_random_uuid(), batch_id uuid not null,
 organisation_id uuid not null references public.organisations(id), kind text not null check(kind in('content','branding','commercials','policies')),
 title text not null, snapshot jsonb not null, source_round uuid references public.course_review_rounds(id),
 reviewer_email text not null, requester_id uuid not null references auth.users(id),
 state text not null default 'open' check(state in('open','responded','closed')), cycle integer not null default 1, revision integer not null default 1,
 reason text not null, deadline timestamptz not null, response jsonb, join_hash text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index v6_review_source_person on public.v6_review_requests(source_round,reviewer_email,kind) where source_round is not null;
create index v6_review_company on public.v6_review_requests(organisation_id,updated_at desc);
create index v6_review_recipient on public.v6_review_requests(reviewer_email,state);
create table public.v6_review_events(id uuid primary key default gen_random_uuid(),request_id uuid not null references public.v6_review_requests(id),operation_id uuid not null,actor_id uuid not null references auth.users(id),operation text not null,reason text not null,payload jsonb not null default '{}',created_at timestamptz not null default now(),unique(request_id,operation_id));
create table public.v6_review_mail(id uuid primary key default gen_random_uuid(),event_id uuid not null references public.v6_review_events(id),recipient text not null,organisation_id uuid not null references public.organisations(id),context jsonb not null,state text not null default 'pending' check(state in('pending','sending','sent','failed')),provider_id text,last_error text,claimed_at timestamptz,claim_token uuid,next_at timestamptz not null default now(),created_at timestamptz not null default now(),unique(event_id,recipient));
alter table public.v6_review_requests enable row level security;
alter table public.v6_review_events enable row level security;
alter table public.v6_review_mail enable row level security;
revoke all on public.v6_review_requests,public.v6_review_events,public.v6_review_mail from public,anon,authenticated;
grant select,insert,update on public.v6_review_requests,public.v6_review_events,public.v6_review_mail to service_role;

create function public.v6_review_manager(p_actor uuid,p_org uuid) returns boolean language sql stable set search_path='' as $$
 select exists(select 1 from auth.users where id=p_actor and email_confirmed_at is not null) and exists(select 1 from public.organisations where id=p_org and is_active) and
 (exists(select 1 from public.user_roles where user_id=p_actor and role='admin') or exists(select 1 from public.organisation_memberships where user_id=p_actor and organisation_id=p_org and membership_role='owner' and is_active));
$$;
create function public.v6_review_event(p_request uuid,p_actor uuid,p_operation text,p_reason text,p_operation_id uuid,p_payload jsonb) returns uuid language plpgsql set search_path='' as $$
declare r public.v6_review_requests;e uuid;recipient text;uid uuid;sender text;message text;
begin
 select * into r from public.v6_review_requests where id=p_request;
 insert into public.v6_review_events(request_id,operation_id,actor_id,operation,reason,payload) values(r.id,p_operation_id,p_actor,p_operation,p_reason,p_payload-'joinToken'-'joinHash') returning id into e;
 select lower(email) into sender from auth.users where id=p_actor;
 message=sender||' '||case p_operation when 'create' then 'requested your review' when 'reopen' then 'reopened your review request' when 'resend' then 'resent your review request' when 'close' then 'closed your review request' else 'submitted a review response' end||' — '||r.title;
 -- Prior action messages leave the inbox; their read and response history remains.
 update public.admin_notifications set context=context||jsonb_build_object('task_pending',false,'resolved_at',now()) where source_type='independent_review' and source_id=r.id and response_type='action';
 for recipient in select distinct email from (select r.reviewer_email email union all select lower(email) from auth.users where id=r.requester_id and p_operation='respond') recipients loop
  select id into uid from auth.users where lower(email)=recipient and email_confirmed_at is not null;
  if uid is not null then insert into public.admin_notifications(recipient_user_id,event_key,kind,message,target_path,response_type,actor_user_id,source_type,source_id,context)
   values(uid,'independent-review:'||e||':'||recipient,'platform_event',message,'/review-requests/'||r.id,case when r.state='open' and recipient=r.reviewer_email then 'action' else 'read' end,p_actor,'independent_review',r.id,jsonb_build_object('review_task','independent-review:'||r.id,'task_pending',r.state='open' and recipient=r.reviewer_email,'requirement',p_reason,'cycle',r.cycle,'organisation_id',r.organisation_id));end if;
  insert into public.v6_review_mail(event_id,recipient,organisation_id,context) values(e,recipient,r.organisation_id,jsonb_build_object('requestId',r.id,'title',r.title,'operation',p_operation,'reason',p_reason,'sender',sender,'deadline',r.deadline,'state',r.state,'joinToken',case when recipient=r.reviewer_email then p_payload->>'joinToken' end));
 end loop;
 return e;
end $$;
create function public.v6_review_action(p_actor uuid,p_operation text,p_id uuid,p_expected integer,p_payload jsonb) returns jsonb language plpgsql set search_path='' as $$
declare r public.v6_review_requests;rid uuid;batch uuid;org uuid;recipient text;mailbox text;why text;opid uuid;ev uuid;rr public.course_review_rounds;doc jsonb;decision jsonb;
begin
 select lower(email) into mailbox from auth.users where id=p_actor and email_confirmed_at is not null;if mailbox is null then raise exception 'Verified account required';end if;
 why=trim(p_payload->>'reason');opid=(p_payload->>'operationId')::uuid;
 if why is null or length(why)<5 or length(why)>5000 or opid is null then raise exception 'Provide a reason of 5 to 5000 characters';end if;
 if p_operation='create' then
  org=(p_payload->>'company')::uuid;if not public.v6_review_manager(p_actor,org) then raise exception 'Company review management access required';end if;
  if p_payload->>'kind' not in('content','branding','commercials','policies') or length(trim(p_payload->>'title')) not between 3 and 200 or jsonb_typeof(p_payload->'recipients')<>'array' or jsonb_array_length(p_payload->'recipients') not between 1 and 50 or jsonb_typeof(p_payload->'snapshot'->'items')<>'array' or jsonb_array_length(p_payload->'snapshot'->'items') not between 1 and 100 or octet_length((p_payload->'snapshot')::text)>700000 or (p_payload->>'deadline')::timestamptz<=now() then raise exception 'Check the request, documents, recipients and future deadline';end if;
  if exists(select 1 from public.v6_review_events where operation_id=opid and actor_id=p_actor and operation='create') then return jsonb_build_object('existing',true);end if;
  batch=gen_random_uuid();
  for recipient in select distinct lower(trim(value)) from jsonb_array_elements_text(p_payload->'recipients') loop
   if recipient !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Enter valid reviewer email addresses';end if;
   if p_payload->'snapshot'->>'internal'='true' and not exists(select 1 from auth.users where lower(email)=recipient and public.v2_is_platform_principal(id)) then raise exception 'Internal policies may only be assigned to the platform principals';end if;
   insert into public.v6_review_requests(batch_id,organisation_id,kind,title,snapshot,reviewer_email,requester_id,reason,deadline,join_hash)
   values(batch,org,p_payload->>'kind',p_payload->>'title',p_payload->'snapshot',recipient,p_actor,why,(p_payload->>'deadline')::timestamptz,p_payload->>'joinHash') returning id into rid;
   perform public.v6_review_event(rid,p_actor,'create',why,opid,p_payload-'snapshot');
  end loop;
  return jsonb_build_object('id',rid,'batch',batch);
 end if;
 select * into r from public.v6_review_requests where id=p_id for update;
 if r.id is null then raise exception 'Review request unavailable';end if;
 if exists(select 1 from public.v6_review_events where request_id=r.id and operation_id=opid and actor_id=p_actor) then return jsonb_build_object('id',r.id,'existing',true);end if;
 if r.revision<>p_expected then raise exception 'Request changed. Refresh before submitting';end if;
 if p_operation='respond' then
  if mailbox<>r.reviewer_email or r.state<>'open' or r.deadline<=now() then raise exception 'This request is not open for your response';end if;
  decision=p_payload->'decisions';
  if jsonb_typeof(decision)<>'object' or (select count(*) from jsonb_object_keys(decision))<>jsonb_array_length(r.snapshot->'items') or exists(select 1 from jsonb_array_elements(r.snapshot->'items') i where coalesce(decision->>(i->>'id'),'') not in('approve','changes')) then raise exception 'Record a decision for every selected item';end if;
  update public.v6_review_requests set state='responded',response=jsonb_build_object('actor',p_actor,'email',mailbox,'at',now(),'decisions',decision,'comment',why,'cycle',cycle),revision=revision+1,updated_at=now() where id=r.id;
 elsif p_operation in('reopen','resend','close') then
  if not public.v6_review_manager(p_actor,r.organisation_id) then raise exception 'Company review management access required';end if;
  if p_operation='resend' and r.state<>'open' then raise exception 'Reopen this request before resending';end if;
  update public.v6_review_requests set state=case when p_operation='close' then 'closed' else 'open' end,cycle=cycle+case when p_operation='reopen' then 1 else 0 end,response=case when p_operation='reopen' then null else response end,reason=why,deadline=case when p_operation='reopen' then greatest(deadline,now()+interval '7 days') else deadline end,join_hash=case when p_operation='close' then null else coalesce(p_payload->>'joinHash',join_hash) end,revision=revision+1,updated_at=now() where id=r.id;
  if r.source_round is not null and p_operation in('reopen','close') then
   select * into rr from public.course_review_rounds where id=r.source_round for update;
   if rr.status<>'open' then raise exception 'The source review is no longer open';end if;
   doc=jsonb_set(rr.document,'{reviewerRequests}',coalesce(rr.document->'reviewerRequests','{}')||jsonb_build_object(r.reviewer_email,jsonb_build_object('state',case when p_operation='close' then 'closed' else 'open' end,'cycle',r.cycle+case when p_operation='reopen' then 1 else 0 end,'at',now(),'reason',why)));
   if p_operation='reopen' then doc=jsonb_set(doc,'{cutoff}',to_jsonb(greatest((rr.document->>'cutoff')::timestamptz,now()+interval '7 days')));end if;
   doc=jsonb_set(doc,'{events}',coalesce(doc->'events','[]')||jsonb_build_array(jsonb_build_object('actor',mailbox,'at',now(),'action','review_request_'||p_operation,'detail',r.reviewer_email||': '||why)));
   perform public.v2_commit_course_review(rr.id,rr.revision,doc,p_actor,'review_request_'||p_operation,'[]'::jsonb);
  end if;
 else raise exception 'Choose a valid request action';end if;
 ev=public.v6_review_event(r.id,p_actor,p_operation,why,opid,p_payload);
 return jsonb_build_object('id',r.id,'event',ev);
end $$;
create function public.v6_review_mail_claim() returns setof public.v6_review_mail language sql set search_path='' as $$
 with chosen as(select id from public.v6_review_mail where (state in('pending','failed') and next_at<=now()) or (state='sending' and claimed_at<now()-interval '10 minutes') order by created_at limit 10 for update skip locked)
 update public.v6_review_mail m set state='sending',claim_token=gen_random_uuid(),claimed_at=now() from chosen c where m.id=c.id returning m.*;
$$;
-- This source uses its own branded transactional outbox, avoiding duplicate generic emails.
create or replace function public.v5_queue_notification_mail() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.source_type='independent_review' then return new;end if;
 if tg_op='UPDATE' and new.mail_revision=old.mail_revision then return new;end if;
 update public.v5_notification_mail set state='superseded' where notification_id=new.id and state in('pending','failed');
 if new.context ? 'review_task' and new.context->>'task_pending'='false' then return new;end if;
 insert into public.v5_notification_mail(notification_id,revision) values(new.id,new.mail_revision) on conflict do nothing;return new;
end $$;
create or replace function public.v3_notification_pending(n public.admin_notifications) returns boolean language sql stable set search_path='' as $$
 select case when n.source_type in('review','independent_review') and n.context ? 'review_task' then coalesce((n.context->>'task_pending')::boolean,false) else public.v2_notification_pending(n) end;
$$;
revoke all on function public.v6_review_manager(uuid,uuid),public.v6_review_event(uuid,uuid,text,text,uuid,jsonb),public.v6_review_action(uuid,text,uuid,integer,jsonb),public.v6_review_mail_claim() from public,anon,authenticated;
grant execute on function public.v6_review_manager(uuid,uuid),public.v6_review_event(uuid,uuid,text,text,uuid,jsonb),public.v6_review_action(uuid,text,uuid,integer,jsonb),public.v6_review_mail_claim() to service_role;
-- Track the five existing Tiger assignments without sending duplicate invitations or changing evidence.
insert into public.v6_review_requests(batch_id,organisation_id,kind,title,snapshot,source_round,reviewer_email,requester_id,reason,deadline,created_at)
select r.id,r.organisation_id,'content',r.document->>'title',jsonb_build_object('items',jsonb_build_array(jsonb_build_object('id',r.course_id,'title',r.document->>'title','version',r.fingerprint,'body','Continue the retained learning-unit review. Earlier findings, coverage and endorsements remain recorded.','href','/course-reviews/'||r.id))),r.id,p->>'email',(r.document->>'requesterId')::uuid,'Existing review retained after publication',(r.document->>'cutoff')::timestamptz,r.created_at
from public.course_review_rounds r cross join lateral jsonb_array_elements(r.document->'participants') p where r.status='open' and r.course_id='tiger-kidnapping-telecommunications' and p->>'state'<>'declined' on conflict do nothing;

-- A manually reopened request requires an actual human response; old automatic closures remain history.
alter function public.v3_deemed_record_valid(jsonb,text,jsonb,text) rename to v3_deemed_record_valid_pre_requests;
create function public.v3_deemed_record_valid(d jsonb,fp text,e jsonb,unit_slug text) returns boolean language sql stable set search_path='' as $$select case when d->'reviewerRequests' ? (e->>'recipient') then false else public.v3_deemed_record_valid_pre_requests(d,fp,e,unit_slug) end;$$;
alter function public.v3_response_request_pending(public.course_review_response_requests) rename to v3_response_request_pending_pre_requests;
create function public.v3_response_request_pending(q public.course_review_response_requests) returns boolean language sql stable set search_path='' as $$ select not coalesce((select document->'reviewerRequests' ? q.recipient from public.course_review_rounds where id=q.round_id),false) and public.v3_response_request_pending_pre_requests(q);$$;
revoke all on function public.v3_deemed_record_valid(jsonb,text,jsonb,text),public.v3_deemed_record_valid_pre_requests(jsonb,text,jsonb,text),public.v3_response_request_pending(public.course_review_response_requests),public.v3_response_request_pending_pre_requests(public.course_review_response_requests) from public,anon,authenticated;
grant execute on function public.v3_deemed_record_valid(jsonb,text,jsonb,text),public.v3_deemed_record_valid_pre_requests(jsonb,text,jsonb,text),public.v3_response_request_pending(public.course_review_response_requests),public.v3_response_request_pending_pre_requests(public.course_review_response_requests) to service_role;
