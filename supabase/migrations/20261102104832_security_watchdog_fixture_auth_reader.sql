-- The existing service role deliberately cannot read all Auth metadata.
-- Expose only IDs of newly created, correctly tagged synthetic identities.
-- No authentication credential or untagged user's metadata is returned.
create function public.v2_watchdog_fixture_users(p_run uuid) returns setof uuid
language plpgsql security definer set search_path='' as $$
declare r public.v2_watchdog_runs;
begin
 select * into strict r from public.v2_watchdog_runs where id=p_run;
 if exists(select 1 from auth.users u where u.raw_app_meta_data->>'watchdog_run'=p_run::text
 and (u.raw_app_meta_data->>'watchdog_fixture' is distinct from 'true'
 or u.email !~ ('^watchdog-'||p_run::text||'-[123]@example\.invalid$')
 or u.created_at<r.created_at-interval '5 seconds'))
 then raise exception 'WATCHDOG_CLEANUP_GUARD'; end if;
 return query select u.id from auth.users u where u.raw_app_meta_data->>'watchdog_run'=p_run::text
 and u.raw_app_meta_data->>'watchdog_fixture'='true';
end $$;
revoke all on function public.v2_watchdog_fixture_users(uuid) from public,anon,authenticated;
grant execute on function public.v2_watchdog_fixture_users(uuid) to service_role;

create or replace function public.v2_watchdog_seed(p_run uuid,p_users uuid[],p_companies uuid[]) returns void
language plpgsql security invoker set search_path='' as $$
declare r public.v2_watchdog_runs; i integer; prefix text;
begin
 select * into strict r from public.v2_watchdog_runs where id=p_run and state='running' and created_at>now()-interval '3 minutes';
 if not public.v2_watchdog_allowed(r.actor_id,r.company_id) or cardinality(p_users)<>3 or cardinality(p_companies)<>2
 then raise exception 'WATCHDOG_SCOPE_DENIED'; end if;
 if (select count(distinct v) from unnest(p_users) v)<>3 or (select count(distinct v) from unnest(p_companies) v)<>2
 then raise exception 'WATCHDOG_FIXTURE_MISMATCH'; end if;
 if (select count(*) from public.v2_watchdog_fixture_users(p_run) as f(id) where f.id=any(p_users))<>3
 then raise exception 'WATCHDOG_FIXTURE_MISMATCH'; end if;
 prefix:='watchdog-'||p_run::text;
 update public.v2_watchdog_runs set resources=resources||jsonb_build_object('userIds',p_users,'companyIds',p_companies) where id=p_run;
 for i in 1..2 loop
  insert into public.organisations(id,slug,name) values(p_companies[i],prefix||'-'||i,'[WATCHDOG SYNTHETIC] '||p_run::text||' '||i);
 end loop;
 insert into public.organisation_memberships(organisation_id,user_id,membership_role) values
 (p_companies[1],p_users[1],'owner'),(p_companies[2],p_users[2],'owner'),(p_companies[1],p_users[3],'learner');
 insert into public.profiles(user_id,email,full_name) select p_users[g.i],'watchdog-'||p_run::text||'-'||g.i||'@example.invalid','Watchdog synthetic tester' from generate_series(1,3) as g(i);
 insert into public.v2_watchdog_canaries(id,run_id,company_id,owner_id,marker) values
 (gen_random_uuid(),p_run,p_companies[1],p_users[1],'WATCHDOG-SYNTHETIC-OWN-'||p_run::text),
 (gen_random_uuid(),p_run,p_companies[2],p_users[2],'WATCHDOG-SYNTHETIC-FOREIGN-'||p_run::text),
 (gen_random_uuid(),p_run,p_companies[1],p_users[3],'WATCHDOG-SYNTHETIC-PEER-'||p_run::text);
end $$;

create or replace function public.v2_watchdog_clean_fixtures(p_run uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare r public.v2_watchdog_runs; users uuid[]; companies uuid[];
begin
 select * into strict r from public.v2_watchdog_runs where id=p_run;
 select coalesce(array_agg(f.id),'{}'::uuid[]) into users from public.v2_watchdog_fixture_users(p_run) as f(id);
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

