-- Organisation identity, client catalogue availability and referral attribution.
-- All write paths remain server-only; learner-facing reads are provided by the
-- application after it has verified the signed-in user.

create table if not exists public.organisations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null unique check (length(trim(name)) between 2 and 120),
  logo_path text,
  primary_color text not null default '#0D2850' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color text not null default '#006B92' check (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color text not null default '#4C95B0' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  pale_color text not null default '#CCE1E9' check (pale_color ~ '^#[0-9A-Fa-f]{6}$'),
  footer_text text not null default 'Powered by APGI',
  default_referral_share_bps integer not null default 1000 check (default_referral_share_bps between 0 and 10000),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learner_organisations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  organisation_id uuid not null references public.organisations(id) on delete restrict,
  assigned_by uuid references auth.users(id),
  source_invitation_id uuid,
  assigned_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.course_catalogue_settings (
  course_id text primary key,
  visibility text not null default 'public' check (visibility in ('public', 'client_specific')),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organisation_course_availability (
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  course_id text not null,
  created_at timestamptz not null default now(),
  primary key (organisation_id, course_id)
);

alter table public.course_invitations add column if not exists organisation_id uuid references public.organisations(id) on delete restrict;
alter table public.course_enrolments add column if not exists organisation_id uuid references public.organisations(id) on delete restrict;
alter table public.course_enrolments add column if not exists referral_share_bps integer check (referral_share_bps between 0 and 10000);
alter table public.course_payment_orders add column if not exists organisation_id uuid references public.organisations(id) on delete restrict;
alter table public.course_payment_orders add column if not exists referral_share_bps integer check (referral_share_bps between 0 and 10000);

alter table public.learner_organisations
  add constraint learner_organisations_source_invitation_fk
  foreign key (source_invitation_id) references public.course_invitations(id) on delete set null;

create index if not exists idx_learner_organisations_organisation on public.learner_organisations(organisation_id);
create index if not exists idx_course_catalogue_visibility on public.course_catalogue_settings(visibility);
create index if not exists idx_organisation_course_availability_course on public.organisation_course_availability(course_id);
create index if not exists idx_course_invitations_organisation on public.course_invitations(organisation_id);
create index if not exists idx_course_enrolments_organisation on public.course_enrolments(organisation_id);

insert into public.organisations (slug, name, footer_text, default_referral_share_bps)
values ('apgi', 'APGI', '', 0)
on conflict (slug) do nothing;

-- Carry the saved branding library forward. A duplicate normalised name is
-- harmless: the existing organisation remains authoritative.
insert into public.organisations (
  slug, name, logo_path, primary_color, secondary_color, accent_color, pale_color, footer_text
)
select
  lower(trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'))),
  name,
  logo_path,
  primary_color,
  secondary_color,
  accent_color,
  pale_color,
  footer_text
from public.branding_presets
where nullif(trim(name), '') is not null
on conflict (slug) do nothing;

insert into public.course_catalogue_settings (course_id, visibility)
values ('vpshr-level-0', 'public'), ('scannex-training-programme', 'public')
on conflict (course_id) do nothing;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'organisations', 'learner_organisations', 'course_catalogue_settings', 'organisation_course_availability'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all privileges on table public.%I from public, anon, authenticated', table_name);
    execute format('grant all privileges on table public.%I to service_role', table_name);
  end loop;
end;
$$;

alter function public.set_updated_at() set search_path = '';
drop trigger if exists set_organisations_updated_at on public.organisations;
create trigger set_organisations_updated_at before update on public.organisations
for each row execute function public.set_updated_at();
drop trigger if exists set_course_catalogue_settings_updated_at on public.course_catalogue_settings;
create trigger set_course_catalogue_settings_updated_at before update on public.course_catalogue_settings
for each row execute function public.set_updated_at();
