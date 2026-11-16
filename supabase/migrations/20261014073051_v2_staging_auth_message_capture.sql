-- Staging authentication messages are captured privately, never emailed.
create table public.staging_auth_messages (id uuid primary key default gen_random_uuid(), recipient_email text not null, purpose text not null check (purpose in ('confirmation','recovery')), action_url text not null, created_at timestamptz not null default now());
alter table public.staging_auth_messages enable row level security;
revoke all on public.staging_auth_messages from public,anon,authenticated;
grant all on public.staging_auth_messages to service_role;

