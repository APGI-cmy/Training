do $fix$ declare definition text;begin
 definition=pg_get_functiondef('public.v6_distribution_message(uuid,text,text,text,text,timestamp with time zone)'::regprocedure);
 if position('(''accepted'',''declined'',''margin'')' in definition)=0 then raise exception 'Unexpected message routing definition';end if;
 execute replace(definition,'(''accepted'',''declined'',''margin'')','(''accepted'',''declined'',''margin'',''security'')');
end $fix$;
-- Private shelf preview is granted only after the existing authenticated asset
-- route has independently confirmed administrator/reviewer preview authority.
create or replace function public.v6_learner_continuity(p_course text,p_company uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.course_distribution_continuity c join public.course_enrolments e on e.id=c.enrolment_id join public.course_distribution d on d.id=c.distribution_id
 where c.user_id=auth.uid() and c.course_id=p_course and d.recipient_organisation_id=p_company and e.user_id=auth.uid() and e.status='enrolled' and (e.access_expires_at is null or e.access_expires_at>now()))
 or (exists(select 1 from public.course_distribution d where d.recipient_organisation_id=p_company and d.course_id=p_course and d.state<>'withdrawn') and public.v3_course_asset_route(p_course)->>'preview'='true')
$$;

create table public.course_distribution_denials(
 distribution_id uuid not null references public.course_distribution(id),
 window_start timestamptz not null,requests integer not null default 1,
 primary key(distribution_id,window_start)
);
alter table public.course_distribution_denials enable row level security;
revoke all on public.course_distribution_denials from public,anon,authenticated;
grant select,insert,update,delete on public.course_distribution_denials to service_role;
-- Counts only verified-user denials, aggregated by course and ten-minute window.
-- No names, addresses, IPs, tokens or media paths enter these monitoring records.
create function public.v6_distribution_denial(p_course text,p_company uuid) returns void language plpgsql security definer set search_path='' as $$
declare gid uuid;begin
 if auth.uid() is null then return;end if;
 select id into gid from public.course_distribution where course_id=p_course and recipient_organisation_id=p_company and state<>'withdrawn';
 if gid is null then return;end if;
 insert into public.course_distribution_denials(distribution_id,window_start) values(gid,date_bin('10 minutes',now(),'2026-01-01'::timestamptz)) on conflict(distribution_id,window_start) do update set requests=least(100000,public.course_distribution_denials.requests+1);
end $$;
revoke execute on function public.v6_distribution_denial(text,uuid) from public,anon;
grant execute on function public.v6_distribution_denial(text,uuid) to authenticated;

create function public.v6_distribution_security_alert(p_key text,p_window timestamptz,p_count integer) returns void language plpgsql security invoker set search_path='' as $$
declare d public.course_distribution;begin
 if p_count<20 or p_window<now()-interval '1 day' or p_window>now() then return;end if;
 select * into d from public.course_distribution where source_key=p_key;
 if not found then return;end if;
 perform public.v6_distribution_message(d.id,'security:'||d.id||':'||p_window::text,'security',d.source_actor,'Monitoring recorded '||p_count||' denied course-file requests in a ten-minute window on the receiving platform. This is a signal for human investigation, not proof of copying. Review the platform and contact its owner if necessary. No course access has been withdrawn automatically.',null);
end $$;
revoke execute on function public.v6_distribution_security_alert(text,timestamptz,integer) from public,anon,authenticated;
grant execute on function public.v6_distribution_security_alert(text,timestamptz,integer) to service_role;

create function public.v6_distribution_receipt(p_key text,p_recipient uuid,p_accepted timestamptz,p_declined timestamptz,p_email text,p_reason text) returns void language plpgsql security invoker set search_path='' as $$
declare d public.course_distribution;begin
 select * into d from public.course_distribution where source_key=p_key and recipient_organisation_id=p_recipient for update;
 if not found or d.state='withdrawn' then return;end if;
 if p_accepted is not null and d.accepted_at is null then
 update public.course_distribution set accepted_at=p_accepted,declined_at=null,updated_at=now() where id=d.id;
 perform public.v6_distribution_message(d.id,'accepted:'||d.source_key,'accepted',p_email,'The receiving platform owner accepted the course into its portfolio. '||p_reason,null);
 elsif p_declined is not null and d.accepted_at is null and d.declined_at is null then
 update public.course_distribution set declined_at=p_declined,updated_at=now() where id=d.id;
 perform public.v6_distribution_message(d.id,'declined:'||d.source_key,'declined',p_email,'The receiving platform owner declined this course. '||p_reason,null);
 end if;
end $$;
revoke execute on function public.v6_distribution_receipt(text,uuid,timestamptz,timestamptz,text,text) from public,anon,authenticated;
grant execute on function public.v6_distribution_receipt(text,uuid,timestamptz,timestamptz,text,text) to service_role;



