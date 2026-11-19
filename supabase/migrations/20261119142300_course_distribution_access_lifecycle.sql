create or replace function public.v6_distribution_withdraw(p_id uuid,p_at timestamptz) returns void
language plpgsql security invoker set search_path='' as $$
declare d public.course_distribution; e record;tid uuid;mid uuid;uid uuid;
begin
 select * into strict d from public.course_distribution where id=p_id for update;
 select user_id into uid from public.platform_principals order by user_id limit 1;
 if uid is null then raise exception 'Configure the local platform delivery administrator';end if;
 insert into public.course_distribution_continuity(distribution_id,enrolment_id,user_id,course_id)
 select d.id,enr.id,enr.user_id,enr.course_id from public.course_enrolments enr where enr.course_id=d.course_id and enr.organisation_id=d.recipient_organisation_id and enr.status='enrolled' and (enr.access_expires_at is null or enr.access_expires_at>p_at)
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

create or replace function public.v6_guard_withdrawn_enrolment() returns trigger language plpgsql security definer set search_path='' as $$
declare withdrawn boolean;
begin
 perform 1 from public.course_distribution dist where dist.course_id=new.course_id and dist.recipient_organisation_id=new.organisation_id for share;
 withdrawn=exists(select 1 from public.course_distribution dist where dist.course_id=new.course_id and dist.recipient_organisation_id=new.organisation_id and dist.state='withdrawn');
 if TG_OP='UPDATE' then
 if new.status='revoked' and new.course_id=old.course_id and new.organisation_id=old.organisation_id then return new;end if;
 if withdrawn and TG_TABLE_NAME='course_enrolments' then
 if new.edition_id is distinct from old.edition_id or (new.access_expires_at is distinct from old.access_expires_at and (new.access_expires_at is null or new.access_expires_at>old.access_expires_at)) then raise exception 'The original learner edition and expiry must be retained after withdrawal';end if;
 end if;
 if new.status is not distinct from old.status and new.organisation_id is not distinct from old.organisation_id and new.course_id is not distinct from old.course_id then return new;end if;
 end if;
 if withdrawn then raise exception 'This shared course is closed to new enrolments. Existing enrolled learners retain completion access';end if;return new;
end $$;



