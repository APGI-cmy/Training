-- Minimal predecessor schema, only for the isolated local test database.
create schema auth;
create table auth.users(id uuid primary key);
create table public.user_roles(user_id uuid references auth.users(id), role text);
create table public.course_enrolments(user_id uuid references auth.users(id),course_id text,status text);
create table public.assessment_theory_attempts(id uuid primary key default gen_random_uuid(),learner_user_id uuid references auth.users(id),course_id text,assessment_version text,score numeric,max_score numeric,submitted_at timestamptz default now());
grant select on public.user_roles,public.course_enrolments,public.assessment_theory_attempts to service_role;
