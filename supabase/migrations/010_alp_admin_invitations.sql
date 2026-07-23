-- ALP W4.2 - governed administrator invitations and access management

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
  invitation_id uuid not null references public.course_invitations(id) on delete cascade,
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

create or replace function public.alp_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

drop policy if exists course_invitations_admin_all on public.course_invitations;
create policy course_invitations_admin_all
on public.course_invitations
for all
using (public.alp_is_admin())
with check (public.alp_is_admin());

drop policy if exists course_invitations_recipient_select on public.course_invitations;
create policy course_invitations_recipient_select
on public.course_invitations
for select
using (lower(recipient_email) = lower(coalesce(auth.jwt() ->> 'email', '')));

drop policy if exists course_invitation_events_admin_all on public.course_invitation_events;
create policy course_invitation_events_admin_all
on public.course_invitation_events
for all
using (public.alp_is_admin())
with check (public.alp_is_admin());

drop policy if exists course_enrolments_admin_insert on public.course_enrolments;
create policy course_enrolments_admin_insert
on public.course_enrolments
for insert
with check (public.alp_is_admin());

drop policy if exists course_enrolments_admin_update on public.course_enrolments;
create policy course_enrolments_admin_update
on public.course_enrolments
for update
using (public.alp_is_admin())
with check (public.alp_is_admin());

drop policy if exists course_enrolment_events_admin_insert on public.course_enrolment_events;
create policy course_enrolment_events_admin_insert
on public.course_enrolment_events
for insert
with check (public.alp_is_admin());

drop trigger if exists set_course_invitations_updated_at on public.course_invitations;
create trigger set_course_invitations_updated_at
before update on public.course_invitations
for each row execute function public.set_updated_at();
