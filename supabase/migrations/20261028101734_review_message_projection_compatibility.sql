-- Older open tabs may project legacy task metadata. Never erase known senders.
do $$
declare definition text;
begin
 select pg_get_functiondef('public.v3_notification_inbox(uuid,jsonb,jsonb,text,integer,boolean)'::regprocedure) into definition;
 definition=replace(definition,'actor_user_id=excluded.actor_user_id,','actor_user_id=coalesce(excluded.actor_user_id,admin_notifications.actor_user_id),');
 execute definition;
end $$;
