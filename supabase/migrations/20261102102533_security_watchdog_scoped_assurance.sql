-- Watchdog is additive. Existing course, review, payment and membership rules
-- are not changed. Only tagged, newly created synthetic fixtures are cleaned.
create table public.v2_watchdog_runs (
 id uuid primary key default gen_random_uuid(), request_id uuid not null,
 actor_id uuid not null, company_id uuid,
 state text not null default 'running' check(state in ('running','finished','inconclusive','cleanup_pending')),
 created_at timestamptz not null default now(), finished_at timestamptz,
 deployment text not null, resources jsonb not null default '{}'::jsonb,
 payload jsonb, proof jsonb, fixtures_cleaned boolean not null default false,
 unique(actor_id,request_id)
);
create index v2_watchdog_runs_scope on public.v2_watchdog_runs(company_id,created_at desc);
create index v2_watchdog_runs_actor on public.v2_watchdog_runs(actor_id,created_at desc);
create table public.v2_watchdog_deliveries (
 id uuid primary key default gen_random_uuid(), run_id uuid not null references public.v2_watchdog_runs(id),
 recipient_id uuid not null, created_at timestamptz not null default now(),
 read_at timestamptz, unique(run_id,recipient_id)
);
create index v2_watchdog_deliveries_recipient on public.v2_watchdog_deliveries(recipient_id,created_at desc);
create table public.v2_watchdog_evidence (
 id uuid primary key default gen_random_uuid(), company_id uuid,
 actor_id uuid not null, control_id text not null,
 disposition text not null check(disposition in ('recorded','gap','not_applicable')),
 reference text not null check(length(reference) between 5 and 1500),
 created_at timestamptz not null default now(), expires_at timestamptz not null,
 check(expires_at>created_at)
);
create index v2_watchdog_evidence_scope on public.v2_watchdog_evidence(company_id,created_at desc);
create table public.v2_watchdog_canaries (
 id uuid primary key, run_id uuid not null references public.v2_watchdog_runs(id),
 company_id uuid not null references public.organisations(id), owner_id uuid not null references auth.users(id),
 marker text not null check(marker like 'WATCHDOG-SYNTHETIC-%')
);
alter table public.v2_watchdog_runs enable row level security;
alter table public.v2_watchdog_deliveries enable row level security;
alter table public.v2_watchdog_evidence enable row level security;
alter table public.v2_watchdog_canaries enable row level security;
revoke all on public.v2_watchdog_runs,public.v2_watchdog_deliveries,public.v2_watchdog_evidence,public.v2_watchdog_canaries from public,anon,authenticated;
grant all on public.v2_watchdog_runs,public.v2_watchdog_deliveries,public.v2_watchdog_evidence,public.v2_watchdog_canaries to service_role;
-- Reports/evidence use the verified server-side principal/company gate. The
-- canary table deliberately uses ordinary authenticated RLS for actual probes.
create policy watchdog_runs_server_only on public.v2_watchdog_runs for all to authenticated using(false) with check(false);
create policy watchdog_deliveries_server_only on public.v2_watchdog_deliveries for all to authenticated using(false) with check(false);
create policy watchdog_evidence_server_only on public.v2_watchdog_evidence for all to authenticated using(false) with check(false);
grant select on public.v2_watchdog_canaries to authenticated;
create policy watchdog_canary_owner on public.v2_watchdog_canaries for select to authenticated using (
 owner_id=(select auth.uid()) and exists(select 1 from public.organisation_memberships m
 where m.user_id=(select auth.uid()) and m.organisation_id=company_id and m.is_active)
);

create function public.v2_watchdog_allowed(p_actor uuid,p_company uuid) returns boolean
language sql stable security invoker set search_path='' as $$
 select exists(select 1 from auth.users u where u.id=p_actor and u.email_confirmed_at is not null
 and (public.v2_is_platform_principal(p_actor) or (p_company is not null and exists(
 select 1 from public.organisation_memberships m join public.organisations o on o.id=m.organisation_id
 where m.user_id=p_actor and m.organisation_id=p_company and m.membership_role='owner' and m.is_active and o.is_active))));
$$;

create function public.v2_watchdog_start(p_actor uuid,p_company uuid,p_request uuid,p_deployment text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare r public.v2_watchdog_runs;
begin
 if not public.v2_watchdog_allowed(p_actor,p_company) then raise exception 'WATCHDOG_SCOPE_DENIED'; end if;
 perform pg_advisory_xact_lock(632918774);
 select * into r from public.v2_watchdog_runs where actor_id=p_actor and request_id=p_request;
 if found then
  if r.company_id is distinct from p_company then raise exception 'WATCHDOG_SCOPE_DENIED'; end if;
  return to_jsonb(r)||jsonb_build_object('reused',true);
 end if;
 if exists(select 1 from public.v2_watchdog_runs where state='cleanup_pending' or (state='running' and created_at>now()-interval '3 minutes'))
 then raise exception 'WATCHDOG_BUSY'; end if;
 if exists(select 1 from public.v2_watchdog_runs where actor_id=p_actor and created_at>now()-interval '90 seconds')
 or (select count(*) from public.v2_watchdog_runs where actor_id=p_actor and created_at>now()-interval '1 day')>=20
 then raise exception 'WATCHDOG_RATE_LIMIT'; end if;
 insert into public.v2_watchdog_runs(actor_id,company_id,request_id,deployment) values(p_actor,p_company,p_request,left(p_deployment,200)) returning * into r;
 return to_jsonb(r)||jsonb_build_object('reused',false);
end $$;

create function public.v2_watchdog_configuration(p_actor uuid,p_company uuid) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare total_count integer; rls_count integer; dangerous_count integer; private_count integer; public_count integer; report_tables_closed boolean;
begin
 if not public.v2_watchdog_allowed(p_actor,p_company) then raise exception 'WATCHDOG_SCOPE_DENIED'; end if;
 select count(*),count(*) filter(where c.relrowsecurity),count(*) filter(where
 has_table_privilege('anon',c.oid,'TRUNCATE') or has_table_privilege('authenticated',c.oid,'TRUNCATE'))
 into total_count,rls_count,dangerous_count from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relkind='r';
 select count(*) filter(where not b.public),count(*) filter(where b.public) into private_count,public_count from storage.buckets b;
 select not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'
 and c.relname in ('v2_watchdog_runs','v2_watchdog_evidence','v2_watchdog_deliveries') and
 (has_table_privilege('anon',c.oid,'SELECT') or has_table_privilege('authenticated',c.oid,'SELECT')
 or has_table_privilege('authenticated',c.oid,'UPDATE'))) into report_tables_closed;
 return jsonb_build_object('observedAt',now(),'allPublicTablesRls',total_count=rls_count,
 'clientDestructiveGrantsPresent',dangerous_count>0,'watchdogRecordsServerOnly',report_tables_closed,
 'privateEvidenceBucket',exists(select 1 from storage.buckets where id='course-review-evidence' and not public),
 'platformCounts',case when p_company is null and public.v2_is_platform_principal(p_actor) then
 jsonb_build_object('tables',total_count,'rlsTables',rls_count,'destructiveGrantTables',dangerous_count,'privateBuckets',private_count,'publicBuckets',public_count) else null end);
end $$;

create function public.v2_watchdog_seed(p_run uuid,p_users uuid[],p_companies uuid[]) returns void
language plpgsql security invoker set search_path='' as $$
declare r public.v2_watchdog_runs; i integer; prefix text;
begin
 select * into strict r from public.v2_watchdog_runs where id=p_run and state='running' and created_at>now()-interval '3 minutes';
 if not public.v2_watchdog_allowed(r.actor_id,r.company_id) or cardinality(p_users)<>3 or cardinality(p_companies)<>2
 then raise exception 'WATCHDOG_SCOPE_DENIED'; end if;
 if (select count(distinct v) from unnest(p_users) v)<>3 or (select count(distinct v) from unnest(p_companies) v)<>2
 then raise exception 'WATCHDOG_FIXTURE_MISMATCH'; end if;
 if (select count(*) from auth.users where id=any(p_users) and raw_app_meta_data->>'watchdog_run'=p_run::text
 and raw_app_meta_data->>'watchdog_fixture'='true')<>3 then raise exception 'WATCHDOG_FIXTURE_MISMATCH'; end if;
 prefix:='watchdog-'||p_run::text;
 update public.v2_watchdog_runs set resources=resources||jsonb_build_object('userIds',p_users,'companyIds',p_companies) where id=p_run;
 for i in 1..2 loop
  insert into public.organisations(id,slug,name) values(p_companies[i],prefix||'-'||i,'[WATCHDOG SYNTHETIC] '||p_run::text||' '||i);
 end loop;
 insert into public.organisation_memberships(organisation_id,user_id,membership_role) values
 (p_companies[1],p_users[1],'owner'),(p_companies[2],p_users[2],'owner'),(p_companies[1],p_users[3],'learner');
 insert into public.profiles(user_id,email,full_name) select u.id,u.email,'Watchdog synthetic tester' from auth.users u where u.id=any(p_users);
 insert into public.v2_watchdog_canaries(id,run_id,company_id,owner_id,marker) values
 (gen_random_uuid(),p_run,p_companies[1],p_users[1],'WATCHDOG-SYNTHETIC-OWN-'||p_run::text),
 (gen_random_uuid(),p_run,p_companies[2],p_users[2],'WATCHDOG-SYNTHETIC-FOREIGN-'||p_run::text),
 (gen_random_uuid(),p_run,p_companies[1],p_users[3],'WATCHDOG-SYNTHETIC-PEER-'||p_run::text);
end $$;

create function public.v2_watchdog_clean_fixtures(p_run uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare r public.v2_watchdog_runs; users uuid[]; companies uuid[];
begin
 select * into strict r from public.v2_watchdog_runs where id=p_run;
 if exists(select 1 from auth.users where raw_app_meta_data->>'watchdog_run'=p_run::text
 and (raw_app_meta_data->>'watchdog_fixture' is distinct from 'true'
 or email !~ ('^watchdog-'||p_run::text||'-[123]@example\.invalid$') or created_at<r.created_at-interval '5 seconds'))
 then raise exception 'WATCHDOG_CLEANUP_GUARD'; end if;
 select coalesce(array_agg(id),'{}'::uuid[]) into users from auth.users where
 raw_app_meta_data->>'watchdog_run'=p_run::text and raw_app_meta_data->>'watchdog_fixture'='true';
 select coalesce(array_agg(value::uuid),'{}'::uuid[]) into companies from jsonb_array_elements_text(coalesce(r.resources->'companyIds','[]'::jsonb));
 if exists(select 1 from public.organisations where id=any(companies) and slug not like 'watchdog-'||p_run::text||'-%')
 or exists(select 1 from public.organisation_memberships where organisation_id=any(companies) and not(user_id=any(users)))
 then raise exception 'WATCHDOG_CLEANUP_GUARD'; end if;
 delete from public.v2_watchdog_canaries where run_id=p_run;
 delete from public.organisation_memberships where organisation_id=any(companies) and user_id=any(users);
 delete from public.profiles where user_id=any(users);
 delete from public.organisations where id=any(companies) and slug like 'watchdog-'||p_run::text||'-%';
 return jsonb_build_object('userIds',users,'companyIds',companies);
end $$;

create function public.v2_watchdog_record_evidence(p_actor uuid,p_company uuid,p_control text,p_disposition text,p_reference text,p_expires timestamptz) returns uuid
language plpgsql security invoker set search_path='' as $$
declare evidence_id uuid;
begin
 if not public.v2_watchdog_allowed(p_actor,p_company) then raise exception 'WATCHDOG_SCOPE_DENIED'; end if;
 if p_control not in ('scope_risks','access_review','suppliers_ai','recovery','policies_training','incident_response','independent_audit')
 or p_disposition not in ('recorded','gap','not_applicable') or length(trim(p_reference)) not between 5 and 1500
 or p_expires<=now() or p_expires>now()+interval '366 days' then raise exception 'WATCHDOG_INVALID_EVIDENCE'; end if;
 insert into public.v2_watchdog_evidence(company_id,actor_id,control_id,disposition,reference,expires_at)
 values(p_company,p_actor,p_control,p_disposition,trim(p_reference),p_expires) returning id into evidence_id;
 return evidence_id;
end $$;

create function public.v2_watchdog_notify(p_run uuid) returns integer
language plpgsql security invoker set search_path='' as $$
declare r public.v2_watchdog_runs; changed integer;
begin
 select * into strict r from public.v2_watchdog_runs where id=p_run;
 insert into public.v2_watchdog_deliveries(run_id,recipient_id)
 select p_run,x.id from (select r.actor_id as id union select p.user_id from public.platform_principals p
 where p.user_id is not null and public.v2_is_platform_principal(p.user_id)) x
 on conflict(run_id,recipient_id) do nothing;
 get diagnostics changed=row_count; return changed;
end $$;

create function public.v2_watchdog_acknowledge(p_actor uuid,p_delivery uuid) returns boolean
language plpgsql security invoker set search_path='' as $$
declare changed integer;
begin
 update public.v2_watchdog_deliveries d set read_at=coalesce(read_at,now()) from public.v2_watchdog_runs r
 where d.id=p_delivery and d.run_id=r.id and d.recipient_id=p_actor and public.v2_watchdog_allowed(p_actor,r.company_id);
 get diagnostics changed=row_count; return changed=1;
end $$;

revoke all on function public.v2_watchdog_allowed(uuid,uuid),public.v2_watchdog_start(uuid,uuid,uuid,text),
 public.v2_watchdog_configuration(uuid,uuid),public.v2_watchdog_seed(uuid,uuid[],uuid[]),public.v2_watchdog_clean_fixtures(uuid),
 public.v2_watchdog_notify(uuid),public.v2_watchdog_acknowledge(uuid,uuid),public.v2_watchdog_record_evidence(uuid,uuid,text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.v2_watchdog_allowed(uuid,uuid),public.v2_watchdog_start(uuid,uuid,uuid,text),
 public.v2_watchdog_configuration(uuid,uuid),public.v2_watchdog_seed(uuid,uuid[],uuid[]),public.v2_watchdog_clean_fixtures(uuid),
 public.v2_watchdog_notify(uuid),public.v2_watchdog_acknowledge(uuid,uuid),public.v2_watchdog_record_evidence(uuid,uuid,text,text,text,timestamptz) to service_role;
