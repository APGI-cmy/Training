do $fix$ declare definition text;begin
 definition=pg_get_functiondef('public.v6_distribution_withdraw(uuid,timestamp with time zone)'::regprocedure);
 definition=replace(definition,'select d.id,e.id,e.user_id,e.course_id from public.course_enrolments e where e.course_id=d.course_id and e.organisation_id=d.recipient_organisation_id and e.status=','select d.id,enr.id,enr.user_id,enr.course_id from public.course_enrolments enr where enr.course_id=d.course_id and enr.organisation_id=d.recipient_organisation_id and enr.status=');
 execute definition;
end $fix$;
create or replace function public.v6_guard_withdrawn_enrolment() returns trigger language plpgsql security definer set search_path='' as $$
declare withdrawn boolean;
begin
 perform 1 from public.course_distribution dist where dist.course_id=new.course_id and dist.recipient_organisation_id=new.organisation_id for share;
 withdrawn=exists(select 1 from public.course_distribution dist where dist.course_id=new.course_id and dist.recipient_organisation_id=new.organisation_id and dist.state='withdrawn');
 if TG_OP='UPDATE' then
 if withdrawn and TG_TABLE_NAME='course_enrolments' then
 if new.edition_id is distinct from old.edition_id or (new.access_expires_at is distinct from old.access_expires_at and (new.access_expires_at is null or new.access_expires_at>old.access_expires_at)) then raise exception 'The original learner edition and expiry must be retained after withdrawal';end if;
 end if;
 if new.status is not distinct from old.status and new.organisation_id is not distinct from old.organisation_id and new.course_id is not distinct from old.course_id then return new;end if;
 end if;
 if withdrawn then raise exception 'This shared course is closed to new enrolments. Existing enrolled learners retain completion access';end if;return new;
end $$;
create or replace function public.v6_distribution_denial(p_course text,p_company uuid) returns void language plpgsql security definer set search_path='' as $$
declare gid uuid;begin
 if auth.uid() is null then return;end if;
 select dist.id into gid from public.course_distribution dist where dist.course_id=p_course and dist.state<>'withdrawn' and
 (dist.recipient_organisation_id=p_company or (p_company is null and exists(select 1 from public.organisation_memberships m where m.user_id=auth.uid() and m.organisation_id=dist.recipient_organisation_id and m.is_active))) limit 1;
 if gid is null then return;end if;
 insert into public.course_distribution_denials(distribution_id,window_start) values(gid,date_bin('10 minutes',now(),'2026-01-01'::timestamptz)) on conflict(distribution_id,window_start) do update set requests=least(100000,public.course_distribution_denials.requests+1);
end $$;



