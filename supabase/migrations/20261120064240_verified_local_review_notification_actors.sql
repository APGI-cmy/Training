create function public.v6_review_notification_actor(p_round uuid,p_source uuid) returns uuid
language sql stable security invoker set search_path='' as $$
 with r as (select document from public.course_review_rounds where id=p_round),
 source_emails as (
  select lower(p->>'email') email from r,jsonb_array_elements(coalesce(document->'participants','[]'::jsonb)) p where p->>'userId'=p_source::text
  union select lower(f->>'author') from r,jsonb_array_elements(coalesce(document->'findings','[]'::jsonb)) f where f->>'userId'=p_source::text
  union select lower(document->>'requester') from r where document->>'requesterId'=p_source::text
  union select lower(i->>'email') from r,jsonb_array_elements(coalesce(document->'findings','[]'::jsonb)) f,
   jsonb_array_elements(coalesce(f->'implementationRounds','[]'::jsonb)) i where i->>'userId'=p_source::text
 ), emails as (select distinct email from source_emails where email is not null and email<>'')
 select u.id from auth.users u where u.email_confirmed_at is not null and (
  u.id=p_source and (not exists(select 1 from emails) or lower(u.email) in(select email from emails))
  or lower(u.email)=(select min(email) from emails having count(*)=1)
 ) order by (u.id=p_source) desc,u.id limit 1;
$$;
revoke all on function public.v6_review_notification_actor(uuid,uuid) from public,anon,authenticated;
grant execute on function public.v6_review_notification_actor(uuid,uuid) to service_role;

do $$
declare definition text;
begin
 select pg_get_functiondef('public.v3_notification_inbox(uuid,jsonb,jsonb,text,integer,boolean)'::regprocedure) into definition;
 if position('public.v6_review_notification_actor' in definition)=0 then
  if position('nullif(task->>''actorUserId'','''')::uuid' in definition)=0 then raise exception 'Unexpected notification projection definition';end if;
  definition=replace(definition,'nullif(task->>''actorUserId'','''')::uuid','public.v6_review_notification_actor((task->>''roundId'')::uuid,nullif(task->>''actorUserId'','''')::uuid)');
  definition=replace(definition,'''unit'',task->>''unit''','''unit'',task->>''unit'',''source_actor_user_id'',task->>''actorUserId''');
  execute definition;
 end if;
end $$;
