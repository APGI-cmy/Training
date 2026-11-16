alter table public.v2_watchdog_monitors add column last_attempt_deployment text;
update public.v2_watchdog_monitors m set last_attempt_deployment=coalesce(m.last_deployment,(select r.deployment from public.v2_watchdog_runs r where r.company_id is not distinct from m.company_id order by r.created_at desc limit 1)) where m.last_attempt_at is not null;

create or replace function public.v2_watchdog_monitor_claim(p_deployment text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare m public.v2_watchdog_monitors; begin
 if exists(select 1 from public.v2_watchdog_runs where state='cleanup_pending' or
 (state='running' and created_at>now()-interval '3 minutes')) then return null; end if;
 select * into m from public.v2_watchdog_monitors where enabled
 and public.v2_watchdog_allowed(owner_id,company_id)
 and (last_attempt_deployment is distinct from p_deployment or last_attempt_at is null or last_attempt_at<now()-interval '15 minutes')
 and (last_deployment is distinct from p_deployment or last_run_at is null or last_run_at<now()-interval '24 hours')
 order by last_attempt_at nulls first for update skip locked limit 1;
 if not found then return null; end if;
 update public.v2_watchdog_monitors set last_attempt_at=now(),last_attempt_deployment=p_deployment where scope_key=m.scope_key;
 return jsonb_build_object('actorId',m.owner_id,'companyId',m.company_id,'requestId',gen_random_uuid(),'principal',public.v2_is_platform_principal(m.owner_id),
 'reason',case when m.last_deployment is distinct from p_deployment then 'deployment' else 'scheduled' end);
end $$;
