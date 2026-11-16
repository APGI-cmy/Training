-- ALP W4.2 - governed administrator invitations and access management
--
-- Security model:
-- - invitation and invitation-event DML is service-role-only;
-- - signed-in recipients receive only a boolean pending-invitation answer through
--   alp_has_pending_invitation(text), never direct table access;
-- - invitation-event history is not deleted implicitly with its parent record;
-- - existing server actions remain the governed validation and audit boundary.

create table if not exists public.course_invitations (
  id uuid primary key default gen_random_uuid(),
  recipient_email text not null check (recipient_email = lower(trim(recipient_email))),
  course_id text not null,
  basis text not null check (basis in ('external_payment', 'corporate_order', 'complimentary_marketing', 'internal_allocation', 'other')),
  reason text not null check (length(trim(reason)) > 0),
  token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending', 'sent', 'redeemed', 'expired', 'revoked')),
  expires_at timestamptz not null,
  created_by uuid not null references auth.users(id),
  redeemed_by uuid references auth.users(id),
  redeemed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.course_invitation_events (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.course_invitations(id) on delete restrict,
  event_type text not null check (event_type in ('created', 'sent', 'redeemed', 'expired', 'revoked', 'failed')),
  actor_id uuid references auth.users(id),
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_course_invitations_recipient on public.course_invitations(lower(recipient_email));
create index if not exists idx_course_invitations_course_status on public.course_invitations(course_id, status);
create index if not exists idx_course_invitation_events_invitation on public.course_invitation_events(invitation_id, occurred_at);

alter table public.course_invitations enable row level security;
alter table public.course_invitation_events enable row level security;

-- New tables receive broad API grants by default in Supabase. Remove them
-- explicitly so neither anonymous nor ordinary authenticated requests can read,
-- insert, alter or delete invitation/audit rows. Governed server actions use the
-- service role and therefore remain the only DML path.
revoke all privileges on table public.course_invitations from public, anon, authenticated;
revoke all privileges on table public.course_invitation_events from public, anon, authenticated;
grant all privileges on table public.course_invitations to service_role;
grant all privileges on table public.course_invitation_events to service_role;

-- Recipients only need to know whether a usable invitation is pending. Returning
-- a boolean prevents token hashes, reasons, bases, internal metadata and actor
-- identifiers from becoming client-readable.
create or replace function public.alp_has_pending_invitation(p_course_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce((select auth.jwt() ->> 'email'), '') <> ''
    and exists (
      select 1
      from public.course_invitations as invitation
      where invitation.recipient_email = lower(trim(coalesce((select auth.jwt() ->> 'email'), '')))
        and invitation.course_id = p_course_id
        and invitation.status in ('pending', 'sent')
        and invitation.revoked_at is null
        and invitation.redeemed_at is null
        and invitation.expires_at > current_timestamp
    );
$$;

revoke all privileges on function public.alp_has_pending_invitation(text) from public, anon;
grant execute on function public.alp_has_pending_invitation(text) to authenticated;

-- Harden the shared trigger function used below without changing its behaviour.
alter function public.set_updated_at() set search_path = '';

drop trigger if exists set_course_invitations_updated_at on public.course_invitations;
create trigger set_course_invitations_updated_at
before update on public.course_invitations
for each row execute function public.set_updated_at();
