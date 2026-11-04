-- Current source outcomes, without changing decisions, messages, or read receipts.
create or replace function public.v3_action_notice_projection(n public.admin_notifications) returns jsonb
language plpgsql stable security invoker set search_path='' as $body$
declare pol public.platform_policy_versions; own public.policy_decisions; mailbox text; heading text; explanation text;
begin
 if n.response_type<>'action' then return '{}'::jsonb; end if;
 if n.source_type='policy' then
  select lower(email) into mailbox from auth.users where id=n.recipient_user_id and email_confirmed_at is not null;
  select * into pol from public.platform_policy_versions where id=n.source_id;
  if not found then return jsonb_build_object('message','Policy review request no longer available','context',n.context||jsonb_build_object('requirement','This record remains in your history. No decision is requested on a missing version.')); end if;
  if pol.visibility='internal' and not public.v2_is_platform_principal(n.recipient_user_id) then return '{}'::jsonb;end if;
  select * into own from public.policy_decisions where policy_id=pol.id and email=mailbox and content_hash=pol.content_hash;
  if pol.status='rejected' then
   heading='Policy rejected — revision required: '||pol.title;
   explanation=case when own.decision='reject' then 'Your rejection and proposed changes are recorded. ' else 'A required reviewer rejected this version and requested changes. ' end||'Read the saved response in Required reviews. No further approval is requested on this rejected version. A revised version needs fresh decisions.';
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
end $body$;
revoke all on function public.v3_action_notice_projection(public.admin_notifications) from public,anon,authenticated;
grant execute on function public.v3_action_notice_projection(public.admin_notifications) to service_role;

CREATE OR REPLACE FUNCTION public.v3_notification_payload(n admin_notifications)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 select (to_jsonb(n)-'recipient_user_id'-'learner_user_id') || jsonb_build_object('pending',public.v3_notification_pending(n),'event',(
  select jsonb_build_object('action',h.action,'actor',h.snapshot#>>'{events,-1,actor}',
   'detail',h.snapshot#>>'{events,-1,detail}','version',h.snapshot#>>'{workflow,commercials,-1,id}',
   'task_decision',case when h.action='task_decision' then h.snapshot#>'{taskDecisions,-1}' end,
   'proposal',case when h.action='commercial_proposal' then h.snapshot#>'{commercialFeedback,-1}' end,
   'report_id',case when h.action='report' then h.snapshot#>>'{reports,-1,id}' end,
   'event_index',jsonb_array_length(coalesce(h.snapshot->'events','[]'))-1,
   'finding_id',case when h.action in ('finding','reply','fixed','close') then (
    select f->>'id' from jsonb_array_elements(coalesce(h.snapshot->'findings','[]')) f
    where not exists(select 1 from public.course_review_history previous,
     lateral jsonb_array_elements(coalesce(previous.snapshot->'findings','[]')) old_f
     where previous.round_id=h.round_id and previous.revision=h.revision-1 and old_f=f) limit 1) end)
  from public.course_review_history h where h.round_id=n.source_id and n.event_key='course-review:'||h.round_id||':'||h.revision limit 1)) || public.v3_action_notice_projection(n);
$function$;

