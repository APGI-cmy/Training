-- Old general review reminders are replaced by exact current action notifications.
create function public.v5_notification_retired(n public.admin_notifications) returns boolean
language sql immutable set search_path='' as $$
 select n.source_type='review' and (n.event_key like 'review-task:%' or coalesce(n.context->>'legacy_review_reminder','false')='true');
$$;
revoke all on function public.v5_notification_retired(public.admin_notifications) from public,anon,authenticated;
grant execute on function public.v5_notification_retired(public.admin_notifications) to service_role;
do $patch$
declare definition text;
begin
 select pg_get_functiondef('public.v3_notification_inbox(uuid,jsonb,jsonb,text,integer,boolean)'::regprocedure) into definition;
 if position('public.v5_notification_in_inbox(e.response_type,e.read_at,e.pending) in_inbox' in definition)=0 then raise exception 'Inbox changed; review archive migration';end if;
 definition=replace(definition,'public.v5_notification_in_inbox(e.response_type,e.read_at,e.pending) in_inbox','(public.v5_notification_in_inbox(e.response_type,e.read_at,e.pending) and not public.v5_notification_retired((select n from public.admin_notifications n where n.id=e.id))) in_inbox');
 execute definition;
 select pg_get_functiondef('public.v5_queue_notification_mail()'::regprocedure) into definition;
 definition=replace(definition,'if new.context ? ''review_task'' and new.context->>''task_pending''=''false'' then return new;end if;','if public.v5_notification_retired(new) or (new.context ? ''review_task'' and new.context->>''task_pending''=''false'') then return new;end if;');
 execute definition;
 select pg_get_functiondef('public.v5_claim_notification_mail()'::regprocedure) into definition;
 definition=replace(definition,'q.revision<>n.mail_revision or n.context->>''task_pending''=''false''','q.revision<>n.mail_revision or n.context->>''task_pending''=''false'' or public.v5_notification_retired(n)');
 execute definition;
end $patch$;
update public.v5_notification_mail q set state='superseded' from public.admin_notifications n where n.id=q.notification_id and public.v5_notification_retired(n) and q.state in('pending','failed');
