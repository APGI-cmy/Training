-- Archiving is a view of the real read/response state, not deletion or a fabricated receipt.
create function public.v5_notification_in_inbox(p_response text,p_read_at timestamptz,p_pending boolean)
returns boolean language sql immutable set search_path='' as $$
 select case when p_response='read' then p_read_at is null else coalesce(p_pending,false) end;
$$;
revoke all on function public.v5_notification_in_inbox(text,timestamptz,boolean) from public,anon,authenticated;
grant execute on function public.v5_notification_in_inbox(text,timestamptz,boolean) to service_role;

-- Keep the existing verified-recipient projection, revision guard, receipts and pagination.
do $patch$
declare definition text; old_selection text; new_selection text;
begin
 select pg_get_functiondef('public.v3_notification_inbox(uuid,jsonb,jsonb,text,integer,boolean)'::regprocedure) into definition;
 old_selection=$old$with notices as materialized(select n.*,public.v3_notification_pending(n) pending from public.admin_notifications n where recipient_user_id=p_user),
 selected as(select * from notices where p_filter='all' or p_filter='unread' and read_at is null or p_filter='response' and pending)$old$;
 new_selection=$new$with evaluated as materialized(select n.*,public.v3_notification_pending(n) pending from public.admin_notifications n where recipient_user_id=p_user),
 notices as materialized(select e.*,public.v5_notification_in_inbox(e.response_type,e.read_at,e.pending) in_inbox from evaluated e),
 selected as(select * from notices where p_filter='all' or p_filter='inbox' and in_inbox or p_filter='history' and not in_inbox or p_filter='unread' and in_inbox and read_at is null or p_filter='response' and in_inbox and pending)$new$;
 if position(old_selection in definition)=0 or position('p_filter not in (''all'',''unread'',''response'')' in definition)=0 then raise exception 'Notification inbox changed; review migration before applying';end if;
 definition=replace(definition,'p_filter not in (''all'',''unread'',''response'')','p_filter not in (''all'',''unread'',''response'',''inbox'',''history'')');
 definition=replace(definition,old_selection,new_selection);
 definition=replace(definition,'count(*) from notices where read_at is null','count(*) from notices where in_inbox and read_at is null');
 definition=replace(definition,'count(*) from notices where pending','count(*) from notices where in_inbox and pending');
 definition=replace(definition,'count(*) from notices where read_at is null or pending','count(*) from notices where in_inbox');
 -- The preceding replacement may already have changed the attention predicate.
 definition=replace(definition,'count(*) from notices where in_inbox and read_at is null or pending','count(*) from notices where in_inbox');
 execute definition;
end $patch$;
