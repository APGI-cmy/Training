create table public.v2_security_budgets(
 bucket_hash text primary key check(bucket_hash~'^[a-f0-9]{64}$'),
 window_start timestamptz not null, requests integer not null check(requests>0),
 test_run uuid references public.v2_watchdog_runs(id)
);
alter table public.v2_security_budgets enable row level security;
revoke all on public.v2_security_budgets from public,anon,authenticated;
grant select,insert,update,delete on public.v2_security_budgets to service_role;

create function public.v2_security_budget(p_bucket text,p_limit integer,p_seconds integer,p_test_run uuid default null)
returns boolean language plpgsql set search_path='' as $$
declare claimed boolean; stamp timestamptz:=clock_timestamp();
begin
 if p_bucket is null or p_limit is null or p_seconds is null or p_bucket!~'^[a-f0-9]{64}$' or p_limit not between 1 and 200 or p_seconds not between 5 and 3600 then return false; end if;
 if p_test_run is not null and not exists(select 1 from public.v2_watchdog_runs where id=p_test_run and state='running') then raise exception 'SECURITY_FIXTURE_GUARD'; end if;
 delete from public.v2_security_budgets where window_start<stamp-interval '24 hours';
 insert into public.v2_security_budgets as b(bucket_hash,window_start,requests,test_run) values(p_bucket,stamp,1,p_test_run)
 on conflict(bucket_hash) do update set window_start=case when b.window_start+make_interval(secs=>p_seconds)<=stamp then stamp else b.window_start end,
 requests=case when b.window_start+make_interval(secs=>p_seconds)<=stamp then 1 else b.requests+1 end
 where b.test_run is not distinct from excluded.test_run and (b.window_start+make_interval(secs=>p_seconds)<=stamp or b.requests<p_limit)
 returning true into claimed;
 return coalesce(claimed,false);
end $$;
revoke all on function public.v2_security_budget(text,integer,integer,uuid) from public,anon,authenticated;
grant execute on function public.v2_security_budget(text,integer,integer,uuid) to service_role;

create function watchdog_private.session_security(p_actor uuid,p_session uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
 'active',exists(select 1 from auth.sessions s join auth.users u on u.id=s.user_id where s.id=p_session and s.user_id=p_actor and (s.not_after is null or s.not_after>now()) and u.deleted_at is null and (u.banned_until is null or u.banned_until<now())),
 'privileged',exists(select 1 from public.user_roles where user_id=p_actor and role in ('admin','course_publisher')) or exists(select 1 from public.organisation_memberships where user_id=p_actor and membership_role='owner' and is_active),
 'enrolled',exists(select 1 from auth.mfa_factors where user_id=p_actor and factor_type='totp' and status='verified'));
$$;
revoke all on function watchdog_private.session_security(uuid,uuid) from public,anon,authenticated;
grant execute on function watchdog_private.session_security(uuid,uuid) to service_role;
create function public.v2_security_session_status(p_actor uuid,p_session uuid)
returns jsonb language sql stable set search_path='' as $$ select watchdog_private.session_security(p_actor,p_session); $$;
revoke all on function public.v2_security_session_status(uuid,uuid) from public,anon,authenticated;
grant execute on function public.v2_security_session_status(uuid,uuid) to service_role;

-- RLS helpers and direct course files must enforce the same step-up rule as the
-- application. Own-actor checks prevent an AAL1 administrator using the Data API.
create function course_access_private.caller_ready()
returns boolean language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid(); sid uuid; flags jsonb;
begin
 if actor is null then return false; end if;
 begin sid:=(auth.jwt()->>'session_id')::uuid; exception when others then return false; end;
 if sid is null then return false; end if;
 flags:=watchdog_private.session_security(actor,sid);
 return (flags->>'active')::boolean and
 (not((flags->>'privileged')::boolean or (flags->>'enrolled')::boolean)
 or ((flags->>'enrolled')::boolean and auth.jwt()->>'aal'='aal2'));
end $$;
create function course_access_private.has_roles(required_roles text[])
returns boolean language sql stable security definer set search_path='' as $$
 select course_access_private.caller_ready() and exists(select 1 from public.user_roles where user_id=auth.uid() and role=any(required_roles));
$$;
create or replace function public.current_user_has_role(required_role text)
returns boolean language sql stable security invoker set search_path='' as $$ select course_access_private.has_roles(array[required_role]); $$;
create or replace function public.current_user_has_any_role(required_roles text[])
returns boolean language sql stable security invoker set search_path='' as $$ select course_access_private.has_roles(required_roles); $$;

create function course_access_private.pending_invitation(p_course_id text)
returns boolean language sql stable security definer set search_path='' as $$
 select course_access_private.caller_ready() and coalesce(auth.jwt()->>'email','')<>'' and exists(
 select 1 from public.course_invitations invitation
 where invitation.recipient_email=lower(trim(coalesce(auth.jwt()->>'email','')))
 and invitation.course_id=p_course_id and invitation.status in ('pending','sent') and invitation.revoked_at is null and invitation.redeemed_at is null and invitation.expires_at>current_timestamp);
$$;
create or replace function public.alp_has_pending_invitation(p_course_id text)
returns boolean language sql stable security invoker set search_path='' as $$ select course_access_private.pending_invitation(p_course_id); $$;
revoke all on function course_access_private.caller_ready(),course_access_private.has_roles(text[]),course_access_private.pending_invitation(text) from public,anon;
grant execute on function course_access_private.caller_ready(),course_access_private.has_roles(text[]),course_access_private.pending_invitation(text) to authenticated;
revoke all on function public.current_user_has_role(text),public.current_user_has_any_role(text[]),public.alp_has_pending_invitation(text) from public,anon;
grant execute on function public.current_user_has_role(text),public.current_user_has_any_role(text[]),public.alp_has_pending_invitation(text) to authenticated;

do $migration$
declare definition text:=pg_get_functiondef('course_access_private.v2_course_asset_access(text)'::regprocedure);
begin
 if position('if actor is null' in definition)=0 then raise exception 'COURSE_GATE_EXPECTATION'; end if;
 execute replace(definition,'if actor is null','if not course_access_private.caller_ready() or actor is null');
end $migration$;

-- Restrictive policies are an additional AND condition: they cannot grant a
-- user access that the application's existing permissive policies deny.
do $migration$
declare item record;
begin
 for item in select n.nspname,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where c.relkind='r' and c.relrowsecurity and (n.nspname='public' or n.nspname='storage' and c.relname='objects') loop
  execute format('create policy v2_verified_session on %I.%I as restrictive for all to authenticated using ((select course_access_private.caller_ready())) with check ((select course_access_private.caller_ready()))',item.nspname,item.relname);
 end loop;
end $migration$;
