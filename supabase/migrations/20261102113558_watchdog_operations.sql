-- Server-only operations: no business data or credentials are stored here.
create schema if not exists watchdog_private;
revoke all on schema watchdog_private from public,anon,authenticated;
grant usage on schema watchdog_private to service_role;

create table public.v2_watchdog_monitors (
 scope_key text primary key, company_id uuid, owner_id uuid not null,
 enabled boolean not null default true, last_attempt_at timestamptz,
 last_run_at timestamptz, last_deployment text, last_run_id uuid,
 updated_at timestamptz not null default now(),
 check(scope_key=coalesce(company_id::text,'platform'))
);
create table public.v2_watchdog_actions (
 id uuid primary key default gen_random_uuid(), company_id uuid,
 scope_key text not null, control_id text not null, owner_label text not null,
 state text not null check(state in ('open','in_progress','evidence_ready')),
 due_at date, note text not null default '', updated_at timestamptz not null default now(),
 updated_by uuid not null, unique(scope_key,control_id),
 check(scope_key=coalesce(company_id::text,'platform')),
 check(length(owner_label) between 2 and 120 and length(note)<=2000)
);
create table public.v2_watchdog_action_history (
 id uuid primary key default gen_random_uuid(), action_id uuid not null references public.v2_watchdog_actions(id),
 actor_id uuid not null, recorded_at timestamptz not null default now(), record jsonb not null
);
create table public.v2_watchdog_events (
 id uuid primary key default gen_random_uuid(), company_id uuid, actor_id uuid,
 kind text not null check(kind in ('auth_failure','company_access_denied','report_access_denied','monitor_failure','configuration_change','drill')),
 severity text not null check(severity in ('info','warning','critical')),
 synthetic boolean not null default false, created_at timestamptz not null default now(),
 subject_hash text check(subject_hash is null or subject_hash ~ '^[a-f0-9]{64}$')
);
create index v2_watchdog_events_scope on public.v2_watchdog_events(company_id,created_at desc);
create table public.v2_watchdog_alerts (
 id uuid primary key default gen_random_uuid(), recipient_id uuid not null, company_id uuid,
 run_id uuid references public.v2_watchdog_runs(id), dedupe_key text not null,
 kind text not null check(kind in ('findings','incomplete','test','security_events','reminder')),
 severity text not null check(severity in ('info','warning','critical')),
 state text not null default 'pending' check(state in ('pending','sending','accepted','failed','cancelled')),
 created_at timestamptz not null default now(), sent_at timestamptz, read_at timestamptz,
 next_at timestamptz not null default now(), attempts integer not null default 0,
 provider_id text, unique(recipient_id,dedupe_key)
);
create index v2_watchdog_alerts_recipient on public.v2_watchdog_alerts(recipient_id,created_at desc);
do $$ declare name text; begin
 foreach name in array array['v2_watchdog_monitors','v2_watchdog_actions','v2_watchdog_action_history','v2_watchdog_events','v2_watchdog_alerts'] loop
  execute format('alter table public.%I enable row level security',name);
  execute format('revoke all on public.%I from public,anon,authenticated',name);
  execute format('grant all on public.%I to service_role',name);
  execute format('create policy %I on public.%I for all to authenticated using(false) with check(false)',name||'_server_only',name);
 end loop;
end $$;

create function public.v2_watchdog_monitor_set(p_actor uuid,p_company uuid,p_enabled boolean) returns boolean
language plpgsql security invoker set search_path='' as $$ begin
 if not public.v2_watchdog_allowed(p_actor,p_company) then raise exception 'WATCHDOG_SCOPE_DENIED'; end if;
 insert into public.v2_watchdog_monitors(scope_key,company_id,owner_id,enabled)
 values(coalesce(p_company::text,'platform'),p_company,p_actor,p_enabled)
 on conflict(scope_key) do update set enabled=p_enabled,owner_id=p_actor,updated_at=now();
 return true;
end $$;
-- The user authorised scheduled monitoring. Customer scopes remain opt-in.
insert into public.v2_watchdog_monitors(scope_key,company_id,owner_id)
select 'platform',null,user_id from public.platform_principals where user_id is not null
and public.v2_is_platform_principal(user_id) order by user_id limit 1;

create function public.v2_watchdog_monitor_claim(p_deployment text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare m public.v2_watchdog_monitors; begin
 if exists(select 1 from public.v2_watchdog_runs where state='cleanup_pending' or
 (state='running' and created_at>now()-interval '3 minutes')) then return null; end if;
 select * into m from public.v2_watchdog_monitors where enabled
 and public.v2_watchdog_allowed(owner_id,company_id)
 and (last_attempt_at is null or last_attempt_at<now()-interval '15 minutes')
 and (last_deployment is distinct from p_deployment or last_run_at is null or last_run_at<now()-interval '24 hours')
 order by last_attempt_at nulls first for update skip locked limit 1;
 if not found then return null; end if;
 update public.v2_watchdog_monitors set last_attempt_at=now() where scope_key=m.scope_key;
 return jsonb_build_object('actorId',m.owner_id,'companyId',m.company_id,'requestId',gen_random_uuid(),'principal',public.v2_is_platform_principal(m.owner_id),
 'reason',case when m.last_deployment is distinct from p_deployment then 'deployment' else 'scheduled' end);
end $$;

create function public.v2_watchdog_action_save(p_actor uuid,p_company uuid,p_control text,p_owner text,p_state text,p_due date,p_note text) returns uuid
language plpgsql security invoker set search_path='' as $$
declare item public.v2_watchdog_actions; begin
 if not public.v2_watchdog_allowed(p_actor,p_company) then raise exception 'WATCHDOG_SCOPE_DENIED'; end if;
 if p_control not in ('database_permissions','business_isolation','identity','monitoring','outbound','recovery','independent_audit','governance','production','evidence_integrity')
 or p_state not in ('open','in_progress','evidence_ready') or length(trim(p_owner)) not between 2 and 120
 or length(p_note)>2000 then raise exception 'WATCHDOG_INVALID_ACTION'; end if;
 insert into public.v2_watchdog_actions(company_id,scope_key,control_id,owner_label,state,due_at,note,updated_by)
 values(p_company,coalesce(p_company::text,'platform'),p_control,trim(p_owner),p_state,p_due,p_note,p_actor)
 on conflict(scope_key,control_id) do update set owner_label=excluded.owner_label,state=excluded.state,
 due_at=excluded.due_at,note=excluded.note,updated_by=p_actor,updated_at=now() returning * into item;
 insert into public.v2_watchdog_action_history(action_id,actor_id,record) values(item.id,p_actor,to_jsonb(item));
 return item.id;
end $$;

create function public.v2_watchdog_event(p_actor uuid,p_company uuid,p_kind text,p_synthetic boolean,p_hash text default null) returns boolean
language plpgsql security invoker set search_path='' as $$ begin
 if p_kind not in ('auth_failure','company_access_denied','report_access_denied','monitor_failure','configuration_change','drill')
 or (p_hash is not null and p_hash !~ '^[a-f0-9]{64}$') then raise exception 'WATCHDOG_INVALID_EVENT'; end if;
 -- Bound event growth without copying user messages, credentials or IP addresses.
 if (select count(*) from public.v2_watchdog_events where created_at>now()-interval '1 day')>=10000 then return false; end if;
 insert into public.v2_watchdog_events(actor_id,company_id,kind,severity,synthetic,subject_hash)
 values(p_actor,p_company,p_kind,case when p_kind='configuration_change' or p_synthetic then 'info' else 'warning' end,p_synthetic,p_hash);
 return true;
end $$;

create function public.v2_watchdog_alert_queue(p_actor uuid,p_company uuid,p_run uuid,p_kind text,p_test boolean default false) returns integer
language plpgsql security invoker set search_path='' as $$
declare changed integer; key text; begin
 if not public.v2_watchdog_allowed(p_actor,p_company) then raise exception 'WATCHDOG_SCOPE_DENIED'; end if;
 if p_kind not in ('findings','incomplete','test','security_events') or (p_test and p_kind<>'test') then raise exception 'WATCHDOG_INVALID_ALERT'; end if;
 if p_run is not null and not exists(select 1 from public.v2_watchdog_runs where id=p_run and company_id is not distinct from p_company)
 then raise exception 'WATCHDOG_SCOPE_DENIED'; end if;
 key:=case when p_test then 'test:'||p_actor::text||':'||to_char(now(),'YYYYMMDDHH24MI')
 when p_run is not null then 'run:'||coalesce(p_company::text,'platform')||':'||p_kind||':'||
 (select deployment||':'||md5(coalesce((select jsonb_agg(jsonb_build_object('id',c->>'id','state',c->>'state') order by c->>'id')
 from jsonb_array_elements(payload->'checks') c where c->>'state' in ('failed','attention','inconclusive')),'[]'::jsonb)::text) from public.v2_watchdog_runs where id=p_run)
 else 'events:'||coalesce(p_company::text,'platform')||':'||to_char(now(),'YYYYMMDDHH24') end;
 insert into public.v2_watchdog_alerts(recipient_id,company_id,run_id,dedupe_key,kind,severity)
 select u.id,p_company,p_run,key,p_kind,case when p_kind='incomplete' then 'critical' when p_test then 'info' else 'warning' end
 from (select p_actor as id union select user_id from public.platform_principals where not p_test and user_id is not null and public.v2_is_platform_principal(user_id)) u
 on conflict(recipient_id,dedupe_key) do nothing;
 get diagnostics changed=row_count; return changed;
end $$;

create function public.v2_watchdog_alert_claim() returns setof public.v2_watchdog_alerts
language sql security invoker set search_path='' as $$
 update public.v2_watchdog_alerts a set state='sending',attempts=attempts+1,next_at=now()+interval '15 minutes'
 where a.id in (select id from public.v2_watchdog_alerts where
 ((state in ('pending','failed') and next_at<=now()) or (state='sending' and next_at<now())) and attempts<4
 order by created_at for update skip locked limit 5) returning a.*;
$$;
create function public.v2_watchdog_alert_read(p_actor uuid,p_alert uuid) returns boolean
language plpgsql security invoker set search_path='' as $$ declare changed integer; begin
 update public.v2_watchdog_alerts set read_at=coalesce(read_at,now()) where id=p_alert and recipient_id=p_actor
 and public.v2_watchdog_allowed(p_actor,company_id);
 get diagnostics changed=row_count; return changed=1;
end $$;

create function watchdog_private.session_active(p_actor uuid,p_session uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.sessions s where s.id=p_session and s.user_id=p_actor and (s.not_after is null or s.not_after>now()));
$$;
revoke all on function watchdog_private.session_active(uuid,uuid) from public,anon,authenticated;
grant execute on function watchdog_private.session_active(uuid,uuid) to service_role;
create function public.v2_watchdog_session_active(p_actor uuid,p_session uuid) returns boolean
language sql stable security invoker set search_path='' as $$ select watchdog_private.session_active(p_actor,p_session); $$;

create function watchdog_private.identity_counts(p_actor uuid,p_company uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare eligible uuid[]; begin
 if not public.v2_watchdog_allowed(p_actor,p_company) then raise exception 'WATCHDOG_SCOPE_DENIED'; end if;
 if p_company is null then select array_agg(user_id) into eligible from public.platform_principals where user_id is not null and public.v2_is_platform_principal(user_id);
 else select array_agg(user_id) into eligible from public.organisation_memberships where organisation_id=p_company and membership_role='owner' and is_active; end if;
 return jsonb_build_object('administrators',coalesce(cardinality(eligible),0),
 'mfaEnrolled',(select count(distinct user_id) from auth.mfa_factors where user_id=any(eligible) and status='verified'));
end $$;
revoke all on function watchdog_private.identity_counts(uuid,uuid) from public,anon,authenticated;
grant execute on function watchdog_private.identity_counts(uuid,uuid) to service_role;
create function public.v2_watchdog_identity_counts(p_actor uuid,p_company uuid) returns jsonb
language sql stable security invoker set search_path='' as $$ select watchdog_private.identity_counts(p_actor,p_company); $$;

revoke all on function public.v2_watchdog_monitor_set(uuid,uuid,boolean),public.v2_watchdog_monitor_claim(text),
 public.v2_watchdog_action_save(uuid,uuid,text,text,text,date,text),public.v2_watchdog_event(uuid,uuid,text,boolean,text),
 public.v2_watchdog_alert_queue(uuid,uuid,uuid,text,boolean),public.v2_watchdog_alert_claim(),public.v2_watchdog_alert_read(uuid,uuid),
 public.v2_watchdog_session_active(uuid,uuid),public.v2_watchdog_identity_counts(uuid,uuid) from public,anon,authenticated;
grant execute on function public.v2_watchdog_monitor_set(uuid,uuid,boolean),public.v2_watchdog_monitor_claim(text),
 public.v2_watchdog_action_save(uuid,uuid,text,text,text,date,text),public.v2_watchdog_event(uuid,uuid,text,boolean,text),
 public.v2_watchdog_alert_queue(uuid,uuid,uuid,text,boolean),public.v2_watchdog_alert_claim(),public.v2_watchdog_alert_read(uuid,uuid),
 public.v2_watchdog_session_active(uuid,uuid),public.v2_watchdog_identity_counts(uuid,uuid) to service_role;
