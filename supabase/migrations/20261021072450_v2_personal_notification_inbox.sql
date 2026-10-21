-- V2 personal notification inbox. Private server access only; receipts are not approvals.
alter table public.admin_notifications
 add column target_path text,
 add column response_type text not null default 'read' check(response_type in ('read','acknowledge','action')),
 add column acknowledged_at timestamptz,
 add column actor_user_id uuid references auth.users(id),
 add column source_type text,
 add column source_id uuid,
 add column context jsonb not null default '{}';
alter table public.admin_notifications drop constraint admin_notifications_kind_check;
alter table public.admin_notifications add constraint admin_notifications_kind_check check(kind in ('learner_enrolled','admin_joined','certificate_issued','course_review_event','platform_event'));
alter table public.admin_notifications drop constraint notification_subject_required;
alter table public.admin_notifications add constraint notification_subject_required check(kind in ('course_review_event','platform_event') or learner_user_id is not null);
create index notification_actor_receipts on public.admin_notifications(actor_user_id,created_at desc) where actor_user_id is not null;
create index notification_unread on public.admin_notifications(recipient_user_id) where read_at is null;
create index review_participant_notification_lookup on public.course_review_rounds using gin((document->'participants')) where status='open';
update public.admin_notifications set target_path=substring(message from '(/course-reviews/[0-9a-f-]{36})') where kind='course_review_event';
update public.admin_notifications set target_path='/admin/learners' where kind in ('learner_enrolled','admin_joined');

create function public.v2_notice(p_user uuid,p_key text,p_message text,p_path text,p_response text default 'read',p_actor uuid default null,p_source text default null,p_id uuid default null,p_context jsonb default '{}')
returns void language sql security invoker set search_path='' as $$
 insert into public.admin_notifications(recipient_user_id,event_key,kind,message,target_path,response_type,actor_user_id,source_type,source_id,context)
 select p_user,p_key,'platform_event',p_message,p_path,p_response,p_actor,p_source,p_id,p_context
 from auth.users u where u.id=p_user and u.email_confirmed_at is not null
 on conflict(recipient_user_id,event_key) do nothing;
$$;

-- Recheck the underlying task on every inbox fetch. Read/acknowledged is never approval.
create function public.v2_notification_pending(n public.admin_notifications) returns boolean
language plpgsql stable security invoker set search_path='' as $$
declare r public.course_review_rounds;d jsonb;p jsonb;w jsonb;v jsonb;mailbox text;principal boolean;b integer;pol public.platform_policy_versions;
begin
 if n.response_type='acknowledge' then return n.acknowledged_at is null;end if;
 if n.response_type<>'action' then return false;end if;
 select lower(email) into mailbox from auth.users where id=n.recipient_user_id and email_confirmed_at is not null;
 if mailbox is null then return false;end if;
 principal=public.v2_is_platform_principal(n.recipient_user_id);
 if n.source_type='review' then
  select * into r from public.course_review_rounds where id=n.source_id;
  if not found or r.status<>'open' then return false;end if;
  d=r.document;w=d->'workflow';v=w#>'{commercials,-1}';
  if n.context ? 'fingerprint' and n.context->>'fingerprint'<>r.fingerprint then return false;end if;
  select brand_revision into b from public.organisations where id=r.organisation_id and is_active;
  if b is null then return false;end if;
  if n.context ? 'version' and n.context->>'version'<>(r.fingerprint||':'||coalesce(v->>'id','none')||':'||b::text) then return false;end if;
  select value into p from jsonb_array_elements(d->'participants') value where value->>'email'=mailbox;
  if not principal and (p is null or p->>'state'='declined') then return false;end if;
  if p is not null and p->>'state'<>'declined' then
   if public.v2_review_task_assigned(p,'content') and p->>'state'<>'finished' then return true;end if;
   if not public.v2_review_tasks_ready(jsonb_set(jsonb_set(d,'{participants}',jsonb_build_array(p)),'{workflow,partner}','false'),b,r.organisation_id) then return true;end if;
   if public.v2_review_task_assigned(p,'content') and exists(
    select 1 from jsonb_array_elements(d->'reports') report where report->>'email'<>mailbox
     and (not(report?'fingerprint') or report->>'fingerprint'=r.fingerprint)
     and not exists(select 1 from jsonb_array_elements(d->'reports') later where later->>'email'=report->>'email' and later->>'at'>report->>'at')
     and not exists(select 1 from jsonb_array_elements(report->'endorsements') e where e->>'decision'='approve' and e->>'userId'<>report->>'userId' and exists(select 1 from jsonb_array_elements(d->'participants') ep where ep->>'email'=e->>'email' and ep->>'state'<>'declined' and public.v2_review_task_assigned(ep,'content')))
   ) then return true;end if;
  end if;
  if principal then
   if exists(select 1 from jsonb_array_elements(coalesce(d->'requests','[]')) q where q->>'status'='pending') then return true;end if;
   if w->>'stage'='apgi_approval' and v->>'submittedAt' is not null and not exists(select 1 from jsonb_array_elements(v->'decisions') x where x->>'email'=mailbox and x->>'userId'=n.recipient_user_id::text) then return true;end if;
   if d->>'requesterId'=n.recipient_user_id::text and (w->>'stage'='ready_to_publish' or (p->>'state'='finished' and (w#>>'{contentApproval,fingerprint}' is distinct from r.fingerprint))) then return true;end if;
  end if;
  if w->>'partnerEmail'=mailbox and w->>'stage' in ('partner_offer','ready_to_publish') and (v#>>'{acceptance,brandRevision}' is distinct from b::text or v#>>'{acceptance,contentFingerprint}' is distinct from r.fingerprint) then return true;end if;
  return false;
 elsif n.source_type='policy' then
  select * into pol from public.platform_policy_versions where id=n.source_id;
  return found and pol.status='submitted' and (pol.visibility<>'internal' or principal)
   and exists(select 1 from public.policy_reviewers where policy_id=pol.id and email=mailbox)
   and not exists(select 1 from public.policy_decisions where policy_id=pol.id and email=mailbox and content_hash=pol.content_hash)
   and not exists(select 1 from public.organisation_memberships where organisation_id=pol.organisation_id and user_id=n.recipient_user_id and membership_role='owner' and not is_active);
 elsif n.source_type='company_request' then
  return exists(select 1 from public.user_roles where user_id=n.recipient_user_id and role='admin') and exists(select 1 from public.company_change_requests where id=n.source_id and status in ('submitted','reviewing'));
 end if;
 return true;
end $$;

-- Idempotently seed current assignments, including invitations accepted after the request was sent.
create function public.v2_sync_notification_tasks(p_user uuid) returns void
language plpgsql security invoker set search_path='' as $$
declare mailbox text;principal boolean;r record;n public.admin_notifications;b integer;version text;
begin
 select lower(email) into mailbox from auth.users where id=p_user and email_confirmed_at is not null;
 if mailbox is null then raise exception 'Verified account required';end if;
 principal=public.v2_is_platform_principal(p_user);
 for r in select * from public.course_review_rounds where status='open' and (principal or document->'participants' @> jsonb_build_array(jsonb_build_object('email',mailbox))) loop
  select brand_revision into b from public.organisations where id=r.organisation_id and is_active;
  if b is null then continue;end if;
  version=r.fingerprint||':'||coalesce(r.document#>>'{workflow,commercials,-1,id}','none')||':'||b::text;
  n.recipient_user_id=p_user;n.response_type='action';n.source_type='review';n.source_id=r.id;n.context=jsonb_build_object('version',version);
  if public.v2_notification_pending(n) then
   perform public.v2_notice(p_user,'review-task:'||r.id||':'||version,'Your course review or publication response is required: '||(r.document->>'title'),'/course-reviews/'||r.id,'action',nullif(r.document->>'requesterId','')::uuid,'review',r.id,n.context);
  end if;
 end loop;
 for r in select p.id,p.title,p.created_by from public.platform_policy_versions p join public.policy_reviewers pr on pr.policy_id=p.id and pr.email=mailbox where p.status='submitted' and (p.visibility<>'internal' or principal) loop
  perform public.v2_notice(p_user,'policy-task:'||r.id,'A policy or agreement is awaiting your decision: '||r.title,'/policies/'||r.id,'action',r.created_by,'policy',r.id);
 end loop;
 if exists(select 1 from public.user_roles where user_id=p_user and role='admin') then
  for r in select * from public.company_change_requests where status in ('submitted','reviewing') loop
   perform public.v2_notice(p_user,'company-task:'||r.id,'A company change request needs a response: '||r.subject,'/company/'||r.organisation_id,'action',r.requested_by,'company_request',r.id);
  end loop;
 end if;
end $$;

-- Extend the existing review event hook to its authorised, verified team.
create or replace function public.v2_review_principal_notice() returns trigger
language plpgsql security invoker set search_path='' as $$
declare recipient record;path text;response text;
begin
 if new.action in ('daily_notification_queue','coverage','resend_invite') then return new;end if;
 path='/course-reviews/'||new.round_id||case when new.action in ('request_change','decide_change','acknowledge_decline') then '#manage-request' when new.action in ('finding','reply','fixed','close') then '#review-summary' when new.action='report' then '#my-full-review' else '' end;
 for recipient in
  select u.id from auth.users u where u.email_confirmed_at is not null and u.id is distinct from new.actor_id and (
    exists(select 1 from public.platform_principals pp where pp.user_id=u.id)
    or exists(select 1 from jsonb_array_elements(new.snapshot->'participants') p where p->>'email'=lower(u.email) and p->>'state'<>'declined'))
 loop
  response=case when new.action in ('finding','reply','decide_change','partner_decline') and recipient.id::text=new.snapshot->>'requesterId' then 'acknowledge' else 'read' end;
  perform public.v2_notice(recipient.id,'course-review:'||new.round_id||':'||new.revision,'Course review update: '||replace(new.action,'_',' ')||' — '||(new.snapshot->>'title'),path,response,new.actor_id,'review',new.round_id);
 end loop;
 return new;
end $$;

create function public.v2_platform_notice_event() returns trigger
language plpgsql security invoker set search_path='' as $$
declare recipient record;actor uuid;pol public.platform_policy_versions;i public.course_invitations;
begin
 if tg_table_name='company_change_requests' then
  if tg_op='INSERT' then
   for recipient in select user_id id from public.user_roles where role='admin' loop
    perform public.v2_notice(recipient.id,'company-task:'||new.id,'A company change request needs a response: '||new.subject,'/company/'||new.organisation_id,'action',new.requested_by,'company_request',new.id);
   end loop;
  elsif (new.status,new.response) is distinct from (old.status,old.response) then
   perform public.v2_notice(new.requested_by,'company-response:'||new.id||':'||md5(new.status||coalesce(new.response,'')),'APGI responded to your company change request: '||new.subject,'/company/'||new.organisation_id,'acknowledge',null,'company_request',new.id);
  end if;
 elsif tg_table_name='platform_policy_versions' then
  if new.status='submitted' and old.status<>'submitted' then
   for recipient in select u.id from public.policy_reviewers pr join auth.users u on lower(u.email)=pr.email and u.email_confirmed_at is not null where pr.policy_id=new.id loop
    perform public.v2_notice(recipient.id,'policy-task:'||new.id,'A policy or agreement is awaiting your decision: '||new.title,'/policies/'||new.id,'action',new.created_by,'policy',new.id);
   end loop;
  end if;
 elsif tg_table_name='policy_decisions' then
  select * into pol from public.platform_policy_versions where id=new.policy_id;
  if pol.created_by<>new.user_id then perform public.v2_notice(pol.created_by,'policy-decision:'||new.policy_id||':'||new.user_id,'A policy reviewer submitted a decision: '||pol.title,'/policies/'||pol.id,'acknowledge',new.user_id,'policy',pol.id);end if;
 elsif tg_table_name='course_invitation_events' then
  if new.event_type='redeemed' then
   select * into i from public.course_invitations where id=new.invitation_id;
   if i.invited_role='business_owner' then perform public.v2_notice(i.created_by,'owner-joined:'||i.id,'A company administrator accepted the platform invitation.','/company/'||i.organisation_id,'read',new.actor_id);end if;
  end if;
 elsif tg_table_name='issued_certificates' then
  perform public.v2_notice(new.user_id,'certificate:'||new.id,'Your course certificate has been issued.','/catalogue?view=my-learning','read');
 end if;
 return new;
end $$;
create trigger company_request_personal_notice after insert or update on public.company_change_requests for each row execute function public.v2_platform_notice_event();
create trigger policy_submitted_personal_notice after update on public.platform_policy_versions for each row execute function public.v2_platform_notice_event();
create trigger policy_decision_personal_notice after insert on public.policy_decisions for each row execute function public.v2_platform_notice_event();
create trigger owner_joined_personal_notice after insert on public.course_invitation_events for each row execute function public.v2_platform_notice_event();
create trigger certificate_personal_notice after insert on public.issued_certificates for each row execute function public.v2_platform_notice_event();

create function public.v2_notification_inbox(p_user uuid,p_filter text default 'all',p_offset integer default 0,p_summary boolean default false) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare result jsonb;receipts jsonb;
begin
 if p_filter not in ('all','unread','response') or p_offset<0 or p_offset>10000 then raise exception 'Invalid inbox filter';end if;
 perform public.v2_sync_notification_tasks(p_user);
 with notices as materialized(select n.*,public.v2_notification_pending(n) pending from public.admin_notifications n where recipient_user_id=p_user),
 selected as(select * from notices where p_filter='all' or (p_filter='unread' and read_at is null) or (p_filter='response' and pending))
 select jsonb_build_object('unread',(select count(*) from notices where read_at is null),'responses',(select count(*) from notices where pending),'attention',(select count(*) from notices where read_at is null or pending),'total',(select count(*) from selected),'items',case when p_summary then '[]'::jsonb else coalesce((select jsonb_agg(to_jsonb(page)-'recipient_user_id'-'event_key'-'learner_user_id'-'context') from(select * from selected order by created_at desc,id desc limit 50 offset p_offset) page),'[]'::jsonb) end) into result;
 if not p_summary then
  select coalesce(jsonb_agg(row_to_json(receipt)),'[]'::jsonb) into receipts from(
   select n.id,n.message,n.kind,n.created_at,n.read_at,n.acknowledged_at,n.target_path,n.response_type,n.actor_user_id,public.v2_notification_pending(n) pending,u.email recipient_email
   from public.admin_notifications n join auth.users u on u.id=n.recipient_user_id where n.actor_user_id=p_user and n.recipient_user_id<>p_user order by n.created_at desc,n.id desc limit 50
  ) receipt;
  result=result||jsonb_build_object('receipts',receipts);
 end if;
 return result;
end $$;
create function public.v2_notification_receipt(p_user uuid,p_id uuid,p_mode text) returns text
language plpgsql security invoker set search_path='' as $$
declare n public.admin_notifications;
begin
 if p_mode not in ('read','acknowledge') then raise exception 'Choose a valid receipt';end if;
 select * into n from public.admin_notifications where id=p_id and recipient_user_id=p_user for update;
 if not found then raise exception 'Notification unavailable';end if;
 if p_mode='acknowledge' and n.response_type<>'acknowledge' then raise exception 'This task requires its actual workflow response';end if;
 update public.admin_notifications set read_at=coalesce(read_at,now()),acknowledged_at=case when p_mode='acknowledge' then coalesce(acknowledged_at,now()) else acknowledged_at end where id=n.id;
 return coalesce(n.target_path,'/notifications');
end $$;
-- No browser REST grants: the server supplies the verified current account.
do $$ declare signature text;begin
 foreach signature in array array['v2_notice(uuid,text,text,text,text,uuid,text,uuid,jsonb)','v2_notification_pending(public.admin_notifications)','v2_sync_notification_tasks(uuid)','v2_notification_inbox(uuid,text,integer,boolean)','v2_notification_receipt(uuid,uuid,text)','v2_review_principal_notice()','v2_platform_notice_event()'] loop
  execute 'revoke all on function public.'||signature||' from public,anon,authenticated';
  execute 'grant execute on function public.'||signature||' to service_role';
 end loop;
end $$;
