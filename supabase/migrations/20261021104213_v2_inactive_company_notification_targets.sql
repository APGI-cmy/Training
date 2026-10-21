-- Inactive or missing companies retain notification history without a dead action link.
CREATE OR REPLACE FUNCTION public.v2_notification_pending(n admin_notifications)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
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
  return exists(select 1 from public.user_roles where user_id=n.recipient_user_id and role='admin') and exists(select 1 from public.company_change_requests c join public.organisations o on o.id=c.organisation_id and o.is_active where c.id=n.source_id and c.status in ('submitted','reviewing'));
 end if;
 if n.source_type='stripe_setup' then return mailbox='jorrie.jordaan@apginc.ca' and principal and not exists(select 1 from public.v2_stripe_private_setup);end if;
 return true;
end $function$;

CREATE OR REPLACE FUNCTION public.v2_sync_notification_tasks(p_user uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare mailbox text;principal boolean;r record;n public.admin_notifications;b integer;version text;
begin
 select lower(email) into mailbox from auth.users where id=p_user and email_confirmed_at is not null;
 if mailbox is null then raise exception 'Verified account required';end if;
 perform public.v2_message_sync_notices(p_user);principal=public.v2_is_platform_principal(p_user);
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
  for r in select c.* from public.company_change_requests c join public.organisations o on o.id=c.organisation_id and o.is_active where c.status in ('submitted','reviewing') loop
   perform public.v2_notice(p_user,'company-task:'||r.id,'A company change request needs a response: '||r.subject,'/company/'||r.organisation_id,'action',r.requested_by,'company_request',r.id);
  end loop;
 end if;
 if mailbox='jorrie.jordaan@apginc.ca' and principal then
  for r in select * from public.v2_stripe_setup_requests loop
   perform public.v2_notice(p_user,'stripe-setup:'||r.id,'APGI payment setup: please complete your private Stripe and bank setup.','/admin/payments/stripe/private','action',r.requested_by,'stripe_setup',r.id);
  end loop;
 end if;
end $function$;

CREATE OR REPLACE FUNCTION public.v2_notification_receipt(p_user uuid, p_id uuid, p_mode text)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare n public.admin_notifications;
begin
 if p_mode not in ('read','acknowledge') then raise exception 'Choose a valid receipt';end if;
 select * into n from public.admin_notifications where id=p_id and recipient_user_id=p_user for update;
 if not found then raise exception 'Notification unavailable';end if;
 if p_mode='acknowledge' and n.response_type<>'acknowledge' then raise exception 'This task requires its actual workflow response';end if;
 update public.admin_notifications set read_at=coalesce(read_at,now()),acknowledged_at=case when p_mode='acknowledge' then coalesce(acknowledged_at,now()) else acknowledged_at end where id=n.id;
 if n.source_type='company_request' then
  return coalesce((select '/company/'||c.organisation_id||'#company-requests' from public.company_change_requests c join public.organisations o on o.id=c.organisation_id and o.is_active where c.id=n.source_id),'/notifications#archived-company-request');
 end if;
 return coalesce(n.target_path,'/notifications');
end $function$;

update public.admin_notifications n set target_path='/notifications#archived-company-request'
where n.source_type='company_request' and not exists(select 1 from public.company_change_requests c join public.organisations o on o.id=c.organisation_id and o.is_active where c.id=n.source_id);
-- Keep all previous ACLs: CREATE OR REPLACE preserves the existing service-role-only RPC grants.
