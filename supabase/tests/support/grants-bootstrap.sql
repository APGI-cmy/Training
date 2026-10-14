-- Local test fixture only. Never run against a hosted project.

create schema auth authorization postgres;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb, raw_app_meta_data jsonb default '{}'::jsonb, created_at timestamptz default now());
alter table auth.users owner to postgres;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
create function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role', true),'') $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true),''),'{}')::jsonb $$;
grant usage on schema auth to postgres, anon, authenticated, service_role;
create schema storage authorization postgres;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text, owner uuid, metadata jsonb);
alter table storage.buckets owner to postgres;
alter table storage.objects owner to postgres;
alter table storage.objects enable row level security;
create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1,'/') $$;
create schema extensions authorization postgres;
create extension vector with schema extensions;
grant usage on schema public, extensions, storage to postgres, anon, authenticated, service_role;
alter database grant_test set search_path = public, extensions;
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated, service_role;
alter default privileges for role postgres revoke execute on functions from public;
