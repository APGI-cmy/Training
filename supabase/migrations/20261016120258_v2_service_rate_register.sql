-- V2 only. Immutable reviewed rate versions and separately scheduled source observations.
create table public.service_rate_catalogues (
 version text primary key,
 parent_version text references public.service_rate_catalogues(version),
 checked_on date not null,
 rate_values jsonb not null check(jsonb_typeof(rate_values)='object'),
 review_note text not null,
 created_by uuid references auth.users(id),
 created_at timestamptz not null default now()
);
create index service_rate_catalogues_created_idx on public.service_rate_catalogues(created_at desc);
create table public.service_rate_source_checks (
 source_id text not null check(source_id in ('supabase','vercel','render','resend','aws','ai','stripe')),
 check_day date not null,
 checked_at timestamptz not null default now(),
 status text not null check(status in ('observed','unchanged','changed','unavailable')),
 source_hash text,
 amount_signals jsonb not null default '[]' check(jsonb_typeof(amount_signals)='array'),
 summary text not null,
 primary key(source_id,check_day)
);
alter table public.service_rate_catalogues enable row level security;
alter table public.service_rate_source_checks enable row level security;
revoke all on public.service_rate_catalogues,public.service_rate_source_checks from public,anon,authenticated;
grant select,insert on public.service_rate_catalogues to service_role;
grant select,insert,update on public.service_rate_source_checks to service_role;
insert into public.service_rate_catalogues(version,checked_on,rate_values,review_note) values
('2026-10-16.1','2026-10-16','{"supabase.pro":"25","vercel.pro":"20","render.starter":"7","render.standard":"25","resend.free":"0","resend.pro":"20","resend.scale":"90","aws.single":"4.19","aws.multi":"6.42","aws.linux":"0","ai.terra.input":"2","ai.terra.output":"12","stripe.ca_domestic":"2.9","stripe.ca_international":"3.7","stripe.ca_fx":"5.7","stripe.fixed":"0.30"}',
 'Initial public rates researched on 16 October 2026. Applies to draft planning only.');

create function public.v2_publish_service_rates(p_actor uuid,p_expected text,p_values jsonb,p_note text)
returns text language plpgsql security invoker set search_path = '' as $$
declare current_version text; new_version text;
begin
 if not public.v2_is_platform_principal(p_actor) then raise exception 'Principal access required'; end if;
 perform pg_catalog.pg_advisory_xact_lock(610161200);
 select version into current_version from public.service_rate_catalogues order by created_at desc,version desc limit 1;
 if current_version is distinct from p_expected then raise exception 'Rate table changed; reload before reviewing'; end if;
 if jsonb_typeof(p_values)<>'object' or length(trim(p_note))<10 or length(p_note)>2000 then raise exception 'Complete rates and review evidence required'; end if;
 if (select array_agg(key order by key) from jsonb_each(p_values)) is distinct from
    (select array_agg(key order by key) from jsonb_each((select rate_values from public.service_rate_catalogues where version=current_version))) then raise exception 'Invalid rate keys'; end if;
 if exists(select 1 from jsonb_each_text(p_values) where value !~ '^\d{1,6}(\.\d{1,6})?$') then raise exception 'Invalid rate amount'; end if;
 new_version := 'rates-'||gen_random_uuid()::text;
 insert into public.service_rate_catalogues(version,parent_version,checked_on,rate_values,review_note,created_by)
 values(new_version,current_version,current_date,p_values,p_note,p_actor);
 insert into public.governance_events(actor_id,subject_id,event_type,detail)
 values(p_actor,gen_random_uuid(),'service_rates_reviewed',jsonb_build_object('version',new_version,'parent',current_version,'note',p_note));
 return new_version;
end;
$$;
revoke all on function public.v2_publish_service_rates(uuid,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.v2_publish_service_rates(uuid,text,jsonb,text) to service_role;
