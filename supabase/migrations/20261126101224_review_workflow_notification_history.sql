-- Workflow actions use their exact review-task key. Automatic audit events and
-- obsolete general finding receipts do not create a second item to clear.
create or replace function public.v7_review_history_notice(n public.admin_notifications) returns boolean
language sql stable security invoker set search_path='' as $$
 select n.source_type='review' and n.response_type='read' and (
  n.context->>'legacy_review_event_receipt'='true'
  or exists (
   select 1 from public.course_review_history h
   where h.round_id=n.source_id
     and h.revision=case when split_part(n.event_key,':',3)~'^[0-9]{1,9}$'
       then split_part(n.event_key,':',3)::integer end
     and n.event_key='course-review:'||h.round_id||':'||h.revision
     and h.action in('nonresponse_window_extended','deemed_content_endorsement','content_revision_auto_registered')
  )
 ) is true;
$$;
revoke all on function public.v7_review_history_notice(public.admin_notifications) from public,anon,authenticated;
grant execute on function public.v7_review_history_notice(public.admin_notifications) to service_role;

-- Use the same rule for the active count, inbox pagination and history payload.
do $patch$
declare
 definition text;
 archived_selection text:='not public.v5_notification_retired((select n from public.admin_notifications n where n.id=e.id))';
 old_payload text:='|| public.v3_action_notice_projection(n);';
begin
 select pg_get_functiondef('public.v3_notification_inbox(uuid,jsonb,jsonb,text,integer,boolean)'::regprocedure) into definition;
 if position('public.v7_review_history_notice(n)' in definition)=0 then
  if position(archived_selection in definition)=0 then raise exception 'Unexpected inbox definition';end if;
  definition=replace(definition,archived_selection,
   'not exists (select 1 from public.admin_notifications n where n.id=e.id and
    (public.v5_notification_retired(n) or public.v7_review_history_notice(n)))');
  execute definition;
 end if;

 select pg_get_functiondef('public.v3_notification_payload(public.admin_notifications)'::regprocedure) into definition;
 if position('public.v7_review_history_notice(n)' in definition)=0 then
  if position(old_payload in definition)=0 then raise exception 'Unexpected notification payload definition';end if;
  definition=replace(definition,old_payload,'|| public.v3_action_notice_projection(n) ||
   case when public.v7_review_history_notice(n) then ''{"archived":true}''::jsonb else ''{}''::jsonb end;');
  execute definition;
 end if;
end $patch$;
