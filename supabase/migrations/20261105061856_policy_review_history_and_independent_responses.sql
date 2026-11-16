-- Preserve immutable decisions and audit evidence; permit remaining independent reviews.
CREATE OR REPLACE FUNCTION public.v2_policy_review(p_policy uuid, p_actor uuid, p_action text, p_reason text DEFAULT ''::text)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare d public.platform_policy_versions; mailbox text; state text;
begin
 select * into d from public.platform_policy_versions where id=p_policy for update;
 if not found then raise exception 'POLICY_NOT_FOUND'; end if;
 select lower(email) into mailbox from auth.users where id=p_actor and email_confirmed_at is not null;
 if mailbox is null then raise exception 'VERIFIED_ACCOUNT_REQUIRED'; end if;
 if d.visibility='internal' and not public.v2_is_platform_principal(p_actor) then raise exception 'PRINCIPAL_REQUIRED'; end if;
 if d.visibility='company' and exists(select 1 from public.organisation_memberships
  where organisation_id=d.organisation_id and user_id=p_actor and membership_role='owner' and not is_active)
  and not public.v2_is_platform_principal(p_actor) then raise exception 'REVOKED_OWNER'; end if;
 if p_action='submit' then
  if not public.v2_is_platform_principal(p_actor) or d.status<>'draft' then raise exception 'POLICY_SUBMIT_DENIED'; end if;
  if not exists(select 1 from public.policy_reviewers where policy_id=d.id) then raise exception 'REVIEWER_REQUIRED'; end if;
  if d.visibility='internal' and (
   (select count(*) from public.policy_reviewers where policy_id=d.id)<>2 or
   exists(select 1 from public.policy_reviewers where policy_id=d.id and email not in ('johan.ras@apginc.ca','jorrie.jordaan@apginc.ca'))
  ) then raise exception 'TWO_PRINCIPAL_REVIEWS_REQUIRED'; end if;
  if d.visibility='company' and (
   (select count(*) from public.policy_reviewers where policy_id=d.id)<2 or
   not exists(select 1 from public.policy_reviewers r join public.platform_principals p on p.email=r.email where r.policy_id=d.id) or
   not exists(select 1 from public.policy_reviewers r where r.policy_id=d.id and r.email not in ('johan.ras@apginc.ca','jorrie.jordaan@apginc.ca'))
  ) then raise exception 'APGI_AND_COMPANY_REVIEW_REQUIRED'; end if;
  update public.platform_policy_versions set status='submitted',submitted_at=now() where id=d.id;
  insert into public.policy_email_deliveries(policy_id,recipient_email) select d.id,email from public.policy_reviewers where policy_id=d.id on conflict do nothing;
  state='submitted';
 elsif p_action in ('approve','reject') then
  if length(coalesce(p_reason,''))>20000 then raise exception 'POLICY_REASON_TOO_LONG'; end if;
  if d.status not in ('submitted','rejected') or exists(select 1 from public.platform_policy_versions successor where successor.previous_version_id=d.id and successor.status<>'draft') or not exists(select 1 from public.policy_reviewers where policy_id=d.id and email=mailbox)
   then raise exception 'POLICY_REVIEW_DENIED'; end if;
  insert into public.policy_decisions(policy_id,email,user_id,decision,reason,content_hash)
   values(d.id,mailbox,p_actor,p_action,trim(p_reason),d.content_hash);
  state=case when p_action='reject' or exists(select 1 from public.policy_decisions rejected where rejected.policy_id=d.id and rejected.decision='reject') then 'rejected'
   when not exists(select 1 from public.policy_reviewers r where r.policy_id=d.id and not exists(
    select 1 from public.policy_decisions a where a.policy_id=d.id and a.email=r.email and a.decision='approve'))
   then 'approved' else 'submitted' end;
  update public.platform_policy_versions set status=state where id=d.id and status is distinct from state;
 else raise exception 'POLICY_ACTION_INVALID'; end if;
 insert into public.governance_events(organisation_id,actor_id,subject_id,event_type,detail)
 values(d.organisation_id,p_actor,d.id,'policy_'||p_action,jsonb_build_object('hash',d.content_hash,'reason',p_reason));
 return state;
end $function$
;

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

  return found and pol.status in ('submitted','rejected') and not exists(select 1 from public.platform_policy_versions successor where successor.previous_version_id=pol.id and successor.status<>'draft') and (pol.visibility<>'internal' or principal)

   and exists(select 1 from public.policy_reviewers where policy_id=pol.id and email=mailbox)

   and not exists(select 1 from public.policy_decisions where policy_id=pol.id and email=mailbox and content_hash=pol.content_hash)

   and not exists(select 1 from public.organisation_memberships where organisation_id=pol.organisation_id and user_id=n.recipient_user_id and membership_role='owner' and not is_active);

 elsif n.source_type='company_request' then

  return exists(select 1 from public.user_roles where user_id=n.recipient_user_id and role='admin') and exists(select 1 from public.company_change_requests c join public.organisations o on o.id=c.organisation_id and o.is_active where c.id=n.source_id and c.status in ('submitted','reviewing'));

 end if;

 if n.source_type='stripe_setup' then return mailbox='jorrie.jordaan@apginc.ca' and principal and not exists(select 1 from public.v2_stripe_private_setup);end if;

 return true;

end $function$
;

CREATE OR REPLACE FUNCTION public.v3_action_notice_projection(n admin_notifications)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare pol public.platform_policy_versions; own public.policy_decisions; mailbox text; heading text; explanation text; successor public.platform_policy_versions;
begin
 if n.response_type<>'action' then return '{}'::jsonb; end if;
 if n.source_type='policy' then
  select lower(email) into mailbox from auth.users where id=n.recipient_user_id and email_confirmed_at is not null;
  select * into pol from public.platform_policy_versions where id=n.source_id;
  if not found then return jsonb_build_object('message','Policy review request no longer available','context',n.context||jsonb_build_object('requirement','This record remains in your history. No decision is requested on a missing version.')); end if;
  if pol.visibility='internal' and not public.v2_is_platform_principal(n.recipient_user_id) then return '{}'::jsonb;end if;
  select * into own from public.policy_decisions where policy_id=pol.id and email=mailbox and content_hash=pol.content_hash;
  select * into successor from public.platform_policy_versions where previous_version_id=pol.id and status<>'draft' order by created_at desc limit 1;
  if found then
   heading='Earlier policy review — revised version available: '||pol.title;
   explanation='This request concerns an earlier version. Saved decisions and proposed changes remain available. Open its audit trail and follow the link to '||successor.version_label||'. Fresh decisions are requested separately on the revised version.';
  elsif pol.status='rejected' then
   heading='Policy rejected — revision required: '||pol.title;
   explanation=case when own.decision='reject' then 'Your rejection and proposed changes are recorded. No repeat decision is required from you. ' when own.policy_id is not null then 'Your independent response is recorded. Another reviewer requested changes. ' else 'A reviewer requested changes. Read the saved rejection and record your own independent review. ' end||'This version is not approved. A later approval cannot override a rejection. A revised version needs fresh decisions.';
  elsif own.policy_id is not null then
   heading='Your policy decision is recorded: '||pol.title;
   explanation='Your '||case when own.decision='approve' then 'approval' else 'rejection' end||' and comments are saved for this exact version. '||case when pol.status='submitted' then 'The other required reviewers must still decide.' else 'Open the policy to read the recorded outcome.' end;
  elsif pol.status='approved' then
   heading='Policy approved: '||pol.title;explanation='The required approvals are recorded. Open the policy for the exact decisions. This does not itself activate financial terms or authorise a payout.';
  else return '{}'::jsonb;
  end if;
  return jsonb_build_object('message',heading,'context',n.context||jsonb_build_object('requirement',explanation));
 elsif n.source_type='company_request' and not public.v3_notification_pending(n) then
  return jsonb_build_object('message','Company request concluded: '||n.message,'context',n.context||jsonb_build_object('requirement','This company request no longer needs your response. Open its record for the saved outcome. Inactive-company requests remain historical.'));
 elsif n.source_type='stripe_setup' and not public.v3_notification_pending(n) then
  return jsonb_build_object('message','Payment setup request concluded','context',n.context||jsonb_build_object('requirement','This setup request no longer needs a response. Open your private payment workspace for the current status.'));
 end if;
 return '{}'::jsonb;
end $function$
;

CREATE OR REPLACE FUNCTION public.v2_platform_notice_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
  for recipient in select u.id from public.policy_reviewers pr join auth.users u on lower(u.email)=pr.email and u.email_confirmed_at is not null where pr.policy_id=pol.id and u.id<>new.user_id loop
   perform public.v2_notice(recipient.id,'policy-decision:'||new.policy_id||':'||new.user_id,'Policy review response recorded: '||pol.title,'/policies/'||pol.id||'#required-reviews','read',new.user_id,'policy',pol.id);
  end loop;
 elsif tg_table_name='course_invitation_events' then
  if new.event_type='redeemed' then
   select * into i from public.course_invitations where id=new.invitation_id;
   if i.invited_role='business_owner' then perform public.v2_notice(i.created_by,'owner-joined:'||i.id,'A company administrator accepted the platform invitation.','/company/'||i.organisation_id,'read',new.actor_id);end if;
  end if;
 elsif tg_table_name='issued_certificates' then
  perform public.v2_notice(new.user_id,'certificate:'||new.id,'Your course certificate has been issued.','/catalogue?view=my-learning','read');
 end if;
 return new;
end $function$
;

revoke all on function public.v2_policy_review(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.v2_policy_review(uuid,uuid,text,text) to service_role;

revoke all on function public.v2_notification_pending(public.admin_notifications) from public,anon,authenticated;
grant execute on function public.v2_notification_pending(public.admin_notifications) to service_role;

revoke all on function public.v3_action_notice_projection(public.admin_notifications) from public,anon,authenticated;
grant execute on function public.v3_action_notice_projection(public.admin_notifications) to service_role;

revoke all on function public.v2_platform_notice_event() from public,anon,authenticated;
grant execute on function public.v2_platform_notice_event() to service_role;
