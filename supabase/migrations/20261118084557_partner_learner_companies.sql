-- Additive employer directory. Existing groups, invitations and enrolments stay.
create table public.learner_companies (
 id uuid primary key default gen_random_uuid(),
 organisation_id uuid not null references public.organisations(id),
 name text not null check(length(btrim(name)) between 1 and 120),
 name_key text generated always as (lower(btrim(name))) stored,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 unique(organisation_id,name_key),
 unique(organisation_id,id)
);
alter table public.learner_companies enable row level security;
revoke all on public.learner_companies from public,anon,authenticated;
grant select,insert on public.learner_companies to service_role;
alter table public.learner_groups add column client_company_id uuid;
alter table public.learner_groups add constraint learner_group_company_scope
 foreign key(organisation_id,client_company_id) references public.learner_companies(organisation_id,id);
create index learner_groups_client_company_idx on public.learner_groups(client_company_id) where client_company_id is not null;
comment on table public.learner_companies is 'Tenant-owned employer names for learner reporting; no platform identity or access rights.';
