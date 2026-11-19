-- Keep row-reading authority out of the exposed API schema. Public RPCs are
-- invoker wrappers; the private functions bind auth.uid() and return only a
-- boolean or a bounded course counter, never other learners' records.
alter function public.v6_learner_continuity(text,uuid) set schema course_access_private;
alter function public.v6_distribution_denial(text,uuid) set schema course_access_private;
create function public.v6_learner_continuity(p_course text,p_company uuid) returns boolean language sql stable security invoker set search_path='' as $$
 select course_access_private.v6_learner_continuity(p_course,p_company)
$$;
create function public.v6_distribution_denial(p_course text,p_company uuid) returns void language sql security invoker set search_path='' as $$
 select course_access_private.v6_distribution_denial(p_course,p_company)
$$;
revoke execute on function public.v6_learner_continuity(text,uuid) from public,anon;
revoke execute on function public.v6_distribution_denial(text,uuid) from public,anon;
grant execute on function public.v6_learner_continuity(text,uuid) to authenticated,service_role;
grant execute on function public.v6_distribution_denial(text,uuid) to authenticated;
create or replace function course_access_private.v6_distribution_denial(p_course text,p_company uuid) returns void language plpgsql security definer set search_path='' as $$
declare gid uuid;begin
 if auth.uid() is null then return;end if;
 select dist.id into gid from public.course_distribution dist where dist.course_id=p_course and dist.state<>'withdrawn' and (p_company is null or dist.recipient_organisation_id=p_company) and
 (exists(select 1 from public.organisation_memberships m where m.user_id=auth.uid() and m.organisation_id=dist.recipient_organisation_id and m.is_active)
 or exists(select 1 from public.learner_organisations lo where lo.user_id=auth.uid() and lo.organisation_id=dist.recipient_organisation_id)) limit 1;
 if gid is null then return;end if;
 insert into public.course_distribution_denials(distribution_id,window_start) values(gid,date_bin('10 minutes',now(),'2026-01-01'::timestamptz)) on conflict(distribution_id,window_start) do update set requests=least(100000,public.course_distribution_denials.requests+1);
end $$;



