create table public.platform_deployment_identity(singleton boolean primary key default true check(singleton),project_id text not null,company_scope text[] not null);
alter table public.platform_deployment_identity enable row level security;
revoke all on public.platform_deployment_identity from public,anon,authenticated,service_role;
grant select on public.platform_deployment_identity to service_role;
create or replace function public.v6_distribution_message(p_id uuid,p_key text,p_action text,p_actor text,p_reason text,p_due timestamptz default null) returns void
language plpgsql security invoker set search_path='' as $$
declare d public.course_distribution; tid uuid; mid uuid; uid uuid; subject_text text; recipient text; target uuid; company uuid; title_text text; recipients integer:=0;
begin
 select * into strict d from public.course_distribution where id=p_id;
 if exists(select 1 from public.course_distribution_events where event_key=p_key) then return;end if;
 select title into title_text from public.courses where id=d.course_id;
 company=case when p_action in ('accepted','declined','margin','security') then d.owner_organisation_id else d.recipient_organisation_id end;
 if not exists(select 1 from public.platform_deployment_identity where singleton) then raise exception 'Configure this platform database identity before exchanging courses';end if;
 if not exists(select 1 from public.platform_deployment_identity site join public.organisations org on org.id=company and org.slug=any(site.company_scope) where site.singleton) then
 insert into public.course_distribution_events(distribution_id,event_key,action,actor_email,reason,response_due_at)
 values(p_id,p_key,p_action,p_actor,p_reason,p_due);
 return;
 end if;
 select id into uid from auth.users where lower(email)=lower(p_actor) limit 1;
 -- A verified remote author may not have a local login. A local principal records
 -- delivery only; the external author and source key remain in the immutable event.
 if uid is null then select user_id into uid from public.platform_principals order by user_id limit 1;end if;
 if uid is null then raise exception 'Configure the local platform delivery administrator';end if;
 subject_text=case p_action when 'offered' then 'A partner shared a published course with your platform'
 when 'concern' then 'First notice - please correct the course sharing concern'
 when 'final' then 'Final notice - course sharing access may be withdrawn'
 when 'withdrawn' then 'Course withdrawn from new enrolments - existing learners may finish'
 when 'accepted' then 'Shared course added to the receiving platform portfolio'
 when 'declined' then 'Shared course declined by the receiving platform'
 else 'Shared course update' end || ' - ' || coalesce(title_text,d.course_id);
 insert into public.v2_message_threads(organisation_id,created_by,subject,level,unique_key)
 values(company,uid,left(subject_text,200),'company','distribution:'||p_key) returning id into tid;
 insert into public.v2_messages(id,thread_id,sender_id,sender_email,body)
 values(gen_random_uuid(),tid,uid,p_actor,p_reason||case when p_due is not null then E'\nResponse required by '||p_due::text else '' end||E'\nOpen Course ownership and sharing for the exact course and recorded actions. Existing learner records and live-payment settings are unchanged.') returning id into mid;
 for recipient in select distinct lower(u.email) from auth.users u join public.organisation_memberships m on m.user_id=u.id
 where m.organisation_id=company and m.membership_role='owner' and m.is_active and u.email_confirmed_at is not null
 union select lower(u.email) from auth.users u join public.platform_principals p on p.user_id=u.id join public.organisations o on o.id=company and o.slug='apgi'
 loop
 recipients=recipients+1;
 insert into public.v2_message_participants(thread_id,email) values(tid,recipient) on conflict do nothing;
 insert into public.v2_message_deliveries(message_id,email) values(mid,recipient) on conflict do nothing;
 select id into target from auth.users where lower(email)=recipient and email_confirmed_at is not null;
 if target is not null then perform public.v2_notice(target,'distribution-message:'||mid,left(subject_text,200),'/messages/'||tid,'read',uid,'message',tid);end if;
 end loop;
 if recipients=0 then raise exception 'A verified platform owner account is required before sharing notifications can be delivered';end if;
 insert into public.course_distribution_events(distribution_id,event_key,action,actor_email,reason,response_due_at,thread_id)
 values(p_id,p_key,p_action,p_actor,p_reason,p_due,tid);
end $$;
revoke execute on function public.v6_distribution_message(uuid,text,text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.v6_distribution_message(uuid,text,text,text,text,timestamptz) to service_role;




