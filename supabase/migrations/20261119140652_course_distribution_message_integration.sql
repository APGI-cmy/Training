create or replace function public.v6_distribution_message(p_id uuid,p_key text,p_action text,p_actor text,p_reason text,p_due timestamptz default null) returns void
language plpgsql security invoker set search_path='' as $$
declare d public.course_distribution; tid uuid; mid uuid; uid uuid; subject_text text; recipient text; target uuid; company uuid; title_text text;
begin
 select * into strict d from public.course_distribution where id=p_id;
 if exists(select 1 from public.course_distribution_events where event_key=p_key) then return;end if;
 select title into title_text from public.courses where id=d.course_id;
 company=case when p_action in ('accepted','declined','margin','security') then d.owner_organisation_id else d.recipient_organisation_id end;
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
 insert into public.v2_message_participants(thread_id,email) values(tid,recipient) on conflict do nothing;
 insert into public.v2_message_deliveries(message_id,email) values(mid,recipient) on conflict do nothing;
 select id into target from auth.users where lower(email)=recipient and email_confirmed_at is not null;
 if target is not null then perform public.v2_notice(target,'distribution-message:'||mid,left(subject_text,200),'/messages/'||tid,'read',uid,'message',tid);end if;
 end loop;
 insert into public.course_distribution_events(distribution_id,event_key,action,actor_email,reason,response_due_at,thread_id)
 values(p_id,p_key,p_action,p_actor,p_reason,p_due,tid);
end $$;
revoke execute on function public.v6_distribution_message(uuid,text,text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.v6_distribution_message(uuid,text,text,text,text,timestamptz) to service_role;

create or replace function public.v6_distribution_withdraw(p_id uuid,p_at timestamptz) returns void
language plpgsql security invoker set search_path='' as $$
declare d public.course_distribution; e record;tid uuid;mid uuid;uid uuid;
begin
 select * into strict d from public.course_distribution where id=p_id for update;
 select user_id into uid from public.platform_principals order by user_id limit 1;
 if uid is null then raise exception 'Configure the local platform delivery administrator';end if;
 insert into public.course_distribution_continuity(distribution_id,enrolment_id,user_id,course_id)
 select d.id,e.id,e.user_id,e.course_id from public.course_enrolments e where e.course_id=d.course_id and e.organisation_id=d.recipient_organisation_id and e.status='enrolled'
 on conflict do nothing;
 update public.organisation_offerings set status='archived' where shared_distribution_id=d.id;
 -- Each affected learner gets an individual, private message and tracked email.
 for e in select distinct u.email,u.id from public.course_distribution_continuity c join auth.users u on u.id=c.user_id where c.distribution_id=d.id loop
 if exists(select 1 from public.v2_message_threads where unique_key='distribution-learner:'||d.id||':'||e.id) then continue;end if;
 insert into public.v2_message_threads(organisation_id,created_by,subject,level,unique_key) values(d.recipient_organisation_id,uid,'Your existing course access continues','direct','distribution-learner:'||d.id||':'||e.id) returning id into tid;
 insert into public.v2_messages(id,thread_id,sender_id,sender_email,body) values(gen_random_uuid(),tid,uid,d.source_actor,'This course is no longer offered to new learners on this platform. You may finish your existing enrolment here until its original access expiry. Your saved progress and certificate rights are preserved. Contact your training administrator through this conversation if you need help arranging access on another approved platform. No alternative account or enrolment has been created automatically.') returning id into mid;
 insert into public.v2_message_participants(thread_id,email) values(tid,lower(e.email));
 insert into public.v2_message_deliveries(message_id,email) values(mid,lower(e.email));
 perform public.v2_notice(e.id,'distribution-message:'||mid,'Your existing course access continues','/messages/'||tid,'read',uid,'message',tid);
 end loop;
end $$;
revoke execute on function public.v6_distribution_withdraw(uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.v6_distribution_withdraw(uuid,timestamptz) to service_role;




