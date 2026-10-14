-- Version 2 staging only. Production release requires separate approval.
create table public.learner_groups (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id),
  name text not null check (length(trim(name)) between 1 and 100),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (organisation_id,name)
);
alter table public.course_invitations alter column course_id drop not null;
alter table public.course_invitations add column invited_role text not null default 'learner' check (invited_role in ('learner','admin'));
alter table public.course_invitations add column group_id uuid references public.learner_groups(id);
alter table public.course_invitations add constraint invitation_role_course check ((invited_role='learner' and course_id is not null) or (invited_role='admin' and course_id is null and group_id is null));
alter table public.course_enrolments add column group_id uuid references public.learner_groups(id);
create index learner_groups_organisation on public.learner_groups(organisation_id);
create index course_enrolments_group on public.course_enrolments(group_id);
create index course_invitations_group on public.course_invitations(group_id);
create or replace function public.v2_check_group_organisation() returns trigger language plpgsql set search_path='' as $$
begin
  if new.group_id is not null and not exists (select 1 from public.learner_groups where id=new.group_id and organisation_id=new.organisation_id) then raise exception 'GROUP_ORGANISATION_MISMATCH'; end if;
  return new;
end $$;
create trigger invitation_group_scope before insert or update on public.course_invitations for each row execute function public.v2_check_group_organisation();
create trigger enrolment_group_scope before insert or update on public.course_enrolments for each row execute function public.v2_check_group_organisation();

create table public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users(id),
  event_key text not null,
  kind text not null check (kind in ('learner_enrolled','admin_joined','certificate_issued')),
  learner_user_id uuid not null references auth.users(id),
  course_id text,
  message text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique (recipient_user_id,event_key)
);
create index admin_notifications_recipient on public.admin_notifications(recipient_user_id,created_at desc);
create or replace function public.v2_notify_enrolment() returns trigger language plpgsql set search_path='' as $$
declare invitation public.course_invitations; learner_name text;
begin
  if new.status <> 'enrolled' then return new; end if;
  if tg_op='UPDATE' and old.status='enrolled' then return new; end if;
  if coalesce(new.metadata->>'invitation_id','') !~ '^[a-f0-9-]{36}$' then return new; end if;
  select * into invitation from public.course_invitations where id=(new.metadata->>'invitation_id')::uuid and course_id=new.course_id and invited_role='learner';
  if not found then return new; end if;
  select coalesce(nullif(certificate_name,''),full_name,email) into learner_name from public.profiles where user_id=new.user_id;
  insert into public.admin_notifications(recipient_user_id,event_key,kind,learner_user_id,course_id,message)
  values(invitation.created_by,'enrolled:'||invitation.id,'learner_enrolled',new.user_id,new.course_id,coalesce(learner_name,'A learner')||' completed their profile and enrolled.') on conflict do nothing;
  return new;
end $$;
create trigger notify_learner_enrolled after insert or update on public.course_enrolments for each row execute function public.v2_notify_enrolment();

create function public.v2_redeem_admin_invitation(p_invitation uuid,p_user uuid) returns boolean language plpgsql security invoker set search_path='' as $$
declare invitation public.course_invitations; verified_email text;
begin
  select lower(email) into verified_email from auth.users where id=p_user and email_confirmed_at is not null;
  select * into invitation from public.course_invitations where id=p_invitation for update;
  if not found or verified_email is null or lower(invitation.recipient_email)<>verified_email or invitation.invited_role<>'admin' or invitation.revoked_at is not null then raise exception 'ADMIN_INVITATION_INVALID'; end if;
  if invitation.status='redeemed' and invitation.redeemed_by=p_user then return true; end if;
  if invitation.status not in ('pending','sent') or invitation.redeemed_at is not null or invitation.expires_at<=now() then raise exception 'ADMIN_INVITATION_INVALID'; end if;
  if not exists(select 1 from public.user_roles where user_id=invitation.created_by and role='admin') then raise exception 'INVITER_ADMIN_REQUIRED'; end if;
  if not exists(select 1 from public.profiles where user_id=p_user and nullif(trim(certificate_name),'') is not null) then raise exception 'PROFILE_REQUIRED'; end if;
  insert into public.user_roles(user_id,role,assigned_by) values(p_user,'admin',invitation.created_by) on conflict do nothing;
  update public.course_invitations set status='redeemed',redeemed_by=p_user,redeemed_at=now() where id=p_invitation;
  insert into public.course_invitation_events(invitation_id,event_type,actor_id,metadata) values(p_invitation,'redeemed',p_user,jsonb_build_object('invited_role','admin'));
  insert into public.admin_notifications(recipient_user_id,event_key,kind,learner_user_id,message) values(invitation.created_by,'admin:'||p_invitation,'admin_joined',p_user,verified_email||' accepted administrator access.') on conflict do nothing;
  return true;
end $$;
revoke all on function public.v2_redeem_admin_invitation(uuid,uuid) from public,anon,authenticated;
grant execute on function public.v2_redeem_admin_invitation(uuid,uuid) to service_role;

alter table public.organisations add column certificate_template_id text not null default 'classic' check (certificate_template_id in ('classic','executive','modern','ribbon','minimal','heritage','geometric','academy','prestige','horizon'));
create table public.course_completion_requirements (
  course_id text primary key,
  required_unit_ids text[] not null,
  require_assessor_pass boolean not null default false
);
insert into public.course_completion_requirements values
('scannex-training-programme',array['scannex-lu-1','scannex-lu-2','scannex-lu-3','scannex-lu-4','scannex-lu-5','scannex-lu-6','scannex-lu-7','scannex-lu-8'],true),
('vpshr-level-0',array['intro','lu1','lu2','lu3','lu4','lu5','lu6','lu7','lu8','lu9','lu10','lu11','lu12'],false);
create sequence public.certificate_numbers;
create table public.issued_certificates (
  id uuid primary key,
  certificate_number text not null unique default ('APGI-V2-'||to_char(now(),'YYYY')||'-'||lpad(nextval('public.certificate_numbers')::text,6,'0')),
  user_id uuid not null references auth.users(id),
  course_id text not null,
  organisation_id uuid not null references public.organisations(id),
  issued_at timestamptz not null,
  snapshot jsonb not null,
  signature text not null check (signature ~ '^[a-f0-9]{64}$'),
  status text not null default 'valid' check (status in ('valid','revoked')),
  revoked_at timestamptz,
  revocation_reason text,
  unique(user_id,course_id)
);
create index issued_certificates_organisation on public.issued_certificates(organisation_id);
create function public.v2_certificate_eligible(p_user uuid,p_course text) returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.course_enrolments where user_id=p_user and course_id=p_course and status='enrolled')
 and exists(select 1 from public.profiles where user_id=p_user and nullif(trim(certificate_name),'') is not null)
 and exists(select 1 from public.course_completion_requirements req where req.course_id=p_course
   and not exists(select 1 from unnest(req.required_unit_ids) unit_id where
     not exists(select 1 from public.learner_progress lp where lp.user_id=p_user and lp.course_id=p_course and lp.unit_id=unit_id and lp.status='completed')
     and not exists(select 1 from public.scorm_attempts sa where sa.user_id=p_user and sa.course_id=p_course and sa.unit_id=unit_id and sa.completion_status='completed' and sa.success_status<>'failed'))
   and (not req.require_assessor_pass or exists(select 1 from public.assessment_bookings b join public.assessment_practical_rubrics r on r.assessment_id=b.id where b.learner_user_id=p_user and b.course_id=p_course and b.status='passed' and b.final_score>=75 and r.material_safety_concern=false)))
$$;
create function public.v2_guard_certificate() returns trigger language plpgsql set search_path='' as $$
begin
  if tg_op='INSERT' then
    if not public.v2_certificate_eligible(new.user_id,new.course_id) then raise exception 'CERTIFICATE_NOT_ELIGIBLE'; end if;
    if not exists(select 1 from public.course_enrolments where user_id=new.user_id and course_id=new.course_id and status='enrolled' and organisation_id=new.organisation_id) then raise exception 'CERTIFICATE_ORGANISATION_MISMATCH'; end if;
  elsif (new.id,new.certificate_number,new.user_id,new.course_id,new.organisation_id,new.issued_at,new.snapshot,new.signature) is distinct from (old.id,old.certificate_number,old.user_id,old.course_id,old.organisation_id,old.issued_at,old.snapshot,old.signature) then
    raise exception 'CERTIFICATE_IMMUTABLE';
  end if;
  return new;
end $$;
create trigger guard_certificate before insert or update on public.issued_certificates for each row execute function public.v2_guard_certificate();
revoke all on function public.v2_certificate_eligible(uuid,text) from public,anon,authenticated;
grant execute on function public.v2_certificate_eligible(uuid,text) to service_role;
do $$ declare name text; begin
  foreach name in array array['learner_groups','admin_notifications','course_completion_requirements','issued_certificates'] loop
    execute format('alter table public.%I enable row level security',name);
    execute format('revoke all on public.%I from public,anon,authenticated',name);
    execute format('grant all on public.%I to service_role',name);
  end loop;
end $$;
grant usage,select on sequence public.certificate_numbers to service_role;
