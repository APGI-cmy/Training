-- APGI Learning Portal W1 auth/profile schema
-- Scope: W1 Auth + Profile + Files schema/security pass.
-- This migration replaces the W0 placeholder with real base tables for
-- learners, user roles, profiles, and profile file metadata.

create extension if not exists pgcrypto;

create table if not exists public.learners (
  id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'suspended', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('learner', 'admin', 'reviewer', 'course_publisher')),
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  unique (user_id, role)
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  preferred_name text,
  certificate_name text,
  phone text,
  country text,
  certificate_profile_locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_certificate_name_required_when_locked
    check (certificate_profile_locked_at is null or nullif(trim(coalesce(certificate_name, '')), '') is not null)
);

create table if not exists public.file_metadata (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  profile_user_id uuid references public.profiles(user_id) on delete cascade,
  bucket_id text not null default 'alp-private-files',
  object_path text not null,
  original_filename text not null,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  file_purpose text not null check (file_purpose in ('profile_photo', 'cv', 'assessment_evidence', 'certificate', 'other')),
  visibility text not null default 'private' check (visibility = 'private'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bucket_id, object_path),
  constraint file_metadata_owner_matches_profile
    check (profile_user_id is null or profile_user_id = owner_user_id)
);

create index if not exists idx_user_roles_user_id on public.user_roles(user_id);
create index if not exists idx_user_roles_role on public.user_roles(role);
create index if not exists idx_file_metadata_owner_user_id on public.file_metadata(owner_user_id);
create index if not exists idx_file_metadata_profile_user_id on public.file_metadata(profile_user_id);
create index if not exists idx_file_metadata_bucket_object on public.file_metadata(bucket_id, object_path);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_learners_updated_at on public.learners;
create trigger set_learners_updated_at
before update on public.learners
for each row execute function public.set_updated_at();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_file_metadata_updated_at on public.file_metadata;
create trigger set_file_metadata_updated_at
before update on public.file_metadata
for each row execute function public.set_updated_at();
