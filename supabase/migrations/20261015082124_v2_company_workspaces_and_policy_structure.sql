-- V2 only. Commercial terms remain drafts: no settlement or activation API exists.
alter table public.organisations add column contact_email text;
alter table public.organisations add column brand_revision integer not null default 1;

create table public.organisation_memberships (
 organisation_id uuid not null references public.organisations(id),
 user_id uuid not null references auth.users(id),
 membership_role text not null check(membership_role in ('owner','learner')),
 is_active boolean not null default true,
 assigned_by uuid references auth.users(id), created_at timestamptz not null default now(),
 primary key(organisation_id,user_id,membership_role)
);
create index organisation_memberships_user on public.organisation_memberships(user_id,organisation_id) where is_active;
insert into public.organisation_memberships(organisation_id,user_id,membership_role)
 select organisation_id,user_id,'learner' from public.learner_organisations on conflict do nothing;

create table public.organisation_offerings (
 id uuid primary key default gen_random_uuid(), organisation_id uuid not null references public.organisations(id),
 course_id text not null, status text not null default 'draft' check(status in ('draft','published','archived')),
 created_by uuid references auth.users(id), created_at timestamptz not null default now(),
 unique(organisation_id,course_id)
);
insert into public.organisation_offerings(organisation_id,course_id,status)
 select distinct organisation_id,course_id,'published' from public.course_enrolments where organisation_id is not null on conflict do nothing;
alter table public.course_invitations drop constraint course_invitations_invited_role_check;
alter table public.course_invitations drop constraint invitation_role_course;
alter table public.course_invitations add constraint course_invitations_invited_role_check check(invited_role in ('learner','admin','business_owner'));
alter table public.course_invitations add constraint invitation_role_course check(
 (invited_role='learner' and course_id is not null) or
 (invited_role in ('admin','business_owner') and course_id is null and group_id is null));

create table public.company_change_requests (
 id uuid primary key default gen_random_uuid(), organisation_id uuid not null references public.organisations(id),
 requested_by uuid not null references auth.users(id), subject text not null check(length(subject) between 3 and 150),
 description text not null check(length(description) between 10 and 5000),
 status text not null default 'submitted' check(status in ('submitted','reviewing','completed','declined')),
 response text, created_at timestamptz not null default now()
);
create table public.commercial_agreement_drafts (
 id uuid primary key default gen_random_uuid(), organisation_id uuid references public.organisations(id), course_id text,
 title text not null check(length(title) between 3 and 150),
 kind text not null check(kind in ('course_agreement','operating_cost','internal_distribution')),
 configuration jsonb not null default '{}', status text not null default 'draft' check(status='draft'),
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
comment on table public.commercial_agreement_drafts is 'Non-operative working records only. Approved policy and a separate release are required for financial activation.';

create table public.platform_policy_versions (
 id uuid primary key default gen_random_uuid(), title text not null check(length(title) between 3 and 180),
 organisation_id uuid references public.organisations(id), previous_version_id uuid references public.platform_policy_versions(id),
 version_label text not null check(length(version_label) between 1 and 60),
 body text not null check(length(body) between 10 and 40000),
 file_path text, file_sha256 text, content_hash text not null check(content_hash ~ '^[a-f0-9]{64}$'),
 status text not null default 'draft' check(status in ('draft','submitted','approved','rejected')),
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), submitted_at timestamptz,
 unique(title,version_label)
);
create table public.policy_reviewers (
 policy_id uuid not null references public.platform_policy_versions(id), email text not null check(email=lower(trim(email)) and email like '%@%'),
 primary key(policy_id,email)
);
create table public.policy_decisions (
 policy_id uuid not null references public.platform_policy_versions(id), email text not null,
 user_id uuid not null references auth.users(id), decision text not null check(decision in ('approve','reject')),
 reason text not null default '', content_hash text not null, decided_at timestamptz not null default now(),
 primary key(policy_id,email), foreign key(policy_id,email) references public.policy_reviewers(policy_id,email),
 check(decision='approve' or length(trim(reason))>=3)
);
create table public.governance_events (
 id uuid primary key default gen_random_uuid(), organisation_id uuid references public.organisations(id),
 actor_id uuid not null references auth.users(id), subject_id uuid not null, event_type text not null,
 detail jsonb not null default '{}', occurred_at timestamptz not null default now()
);
create index governance_events_subject on public.governance_events(subject_id,occurred_at);
create table public.policy_email_deliveries (
 policy_id uuid not null references public.platform_policy_versions(id), recipient_email text not null,
 status text not null default 'pending' check(status in ('pending','sent','failed','captured')),
 provider_message_id text, attempted_at timestamptz,
 primary key(policy_id,recipient_email)
);

-- These are server-managed tables. Do not grant general clients company or policy data.
do $$ declare n text; begin
 foreach n in array array['organisation_memberships','organisation_offerings','company_change_requests','commercial_agreement_drafts','platform_policy_versions','policy_reviewers','policy_decisions','governance_events','policy_email_deliveries'] loop
 execute format('alter table public.%I enable row level security',n);
 execute format('revoke all on public.%I from anon, authenticated',n);
 execute format('grant all on public.%I to service_role',n);
 end loop;
end $$;
grant select on public.organisation_memberships to authenticated;
create policy membership_self_read on public.organisation_memberships for select to authenticated using(user_id=(select auth.uid()));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('apgi-policy-documents','apgi-policy-documents',false,10485760,array['application/pdf']) on conflict(id) do nothing;

create function public.v2_redeem_owner_invitation(p_invitation uuid,p_user uuid) returns uuid
language plpgsql security invoker set search_path='' as $$
declare i public.course_invitations; mailbox text;
begin
 select lower(email) into mailbox from auth.users where id=p_user and email_confirmed_at is not null;
 select * into i from public.course_invitations where id=p_invitation for update;
 if not found or mailbox is null or mailbox<>lower(i.recipient_email) or i.invited_role<>'business_owner' or i.revoked_at is not null then raise exception 'OWNER_INVITATION_INVALID'; end if;
 if i.status='redeemed' and i.redeemed_by=p_user then return i.organisation_id; end if;
 if i.status not in ('pending','sent') or i.redeemed_at is not null or i.expires_at<=now() then raise exception 'OWNER_INVITATION_INVALID'; end if;
 if not exists(select 1 from public.user_roles where user_id=i.created_by and role='admin') then raise exception 'INVITER_ADMIN_REQUIRED'; end if;
 if not exists(select 1 from public.organisations where id=i.organisation_id and is_active) then raise exception 'COMPANY_UNAVAILABLE'; end if;
 if not exists(select 1 from public.profiles where user_id=p_user and nullif(trim(certificate_name),'') is not null) then raise exception 'PROFILE_REQUIRED'; end if;
 insert into public.organisation_memberships(organisation_id,user_id,membership_role,assigned_by) values(i.organisation_id,p_user,'owner',i.created_by)
 on conflict(organisation_id,user_id,membership_role) do update set is_active=true,assigned_by=excluded.assigned_by;
 update public.course_invitations set status='redeemed',redeemed_by=p_user,redeemed_at=now() where id=i.id;
 insert into public.course_invitation_events(invitation_id,event_type,actor_id,metadata) values(i.id,'redeemed',p_user,jsonb_build_object('invited_role','business_owner'));
 insert into public.governance_events(organisation_id,actor_id,subject_id,event_type) values(i.organisation_id,p_user,i.id,'owner_invitation_redeemed');
 return i.organisation_id;
end $$;
revoke all on function public.v2_redeem_owner_invitation(uuid,uuid) from public,anon,authenticated;
grant execute on function public.v2_redeem_owner_invitation(uuid,uuid) to service_role;

create function public.v2_membership_from_enrolment() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.organisation_id is not null and new.status='enrolled' then
 insert into public.organisation_memberships(organisation_id,user_id,membership_role) values(new.organisation_id,new.user_id,'learner') on conflict do nothing;
 end if; return new;
end $$;
create trigger company_membership_from_enrolment after insert or update on public.course_enrolments for each row execute function public.v2_membership_from_enrolment();

create function public.v2_policy_immutable() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='DELETE' then raise exception 'POLICY_HISTORY_IMMUTABLE'; end if;
 if (new.id,new.created_by,new.created_at,new.title,new.version_label,new.organisation_id,new.previous_version_id) is distinct from (old.id,old.created_by,old.created_at,old.title,old.version_label,old.organisation_id,old.previous_version_id) then raise exception 'POLICY_IDENTITY_IMMUTABLE'; end if;
 if old.status<>'draft' and (new.body,new.file_path,new.file_sha256,new.content_hash) is distinct from (old.body,old.file_path,old.file_sha256,old.content_hash) then raise exception 'POLICY_CONTENT_IMMUTABLE'; end if;
 if old.status in ('approved','rejected') then raise exception 'CREATE_A_NEW_POLICY_VERSION'; end if;
 return new;
end $$;
create trigger policy_content_immutable before update or delete on public.platform_policy_versions for each row execute function public.v2_policy_immutable();
create function public.v2_reviewer_draft_only() returns trigger language plpgsql security invoker set search_path='' as $$
declare pid uuid;
begin
 pid=case when tg_op='DELETE' then old.policy_id else new.policy_id end;
 perform 1 from public.platform_policy_versions where id=pid and status='draft' for update;
 if not found then raise exception 'POLICY_REVIEWERS_LOCKED'; end if;
 if tg_op='UPDATE' and new.policy_id<>old.policy_id then raise exception 'POLICY_REVIEWERS_LOCKED'; end if;
 if tg_op='DELETE' then return old; end if; return new;
end $$;
create trigger policy_reviewers_draft_only before insert or update or delete on public.policy_reviewers for each row execute function public.v2_reviewer_draft_only();
create function public.v2_policy_review(p_policy uuid,p_actor uuid,p_action text,p_reason text default '') returns text
language plpgsql security invoker set search_path='' as $$
declare d public.platform_policy_versions; mailbox text; state text;
begin
 select * into d from public.platform_policy_versions where id=p_policy for update;
 if not found then raise exception 'POLICY_NOT_FOUND'; end if;
 select lower(email) into mailbox from auth.users where id=p_actor and email_confirmed_at is not null;
 if mailbox is null then raise exception 'VERIFIED_ACCOUNT_REQUIRED'; end if;
 if p_action='submit' then
  if not exists(select 1 from public.user_roles where user_id=p_actor and role='admin') or d.status<>'draft' then raise exception 'POLICY_SUBMIT_DENIED'; end if;
  if not exists(select 1 from public.policy_reviewers where policy_id=d.id) then raise exception 'REVIEWER_REQUIRED'; end if;
  update public.platform_policy_versions set status='submitted',submitted_at=now() where id=d.id;
  insert into public.policy_email_deliveries(policy_id,recipient_email) select d.id,email from public.policy_reviewers where policy_id=d.id on conflict do nothing;
  state='submitted';
 elsif p_action in ('approve','reject') then
  if d.status<>'submitted' or not exists(select 1 from public.policy_reviewers where policy_id=d.id and email=mailbox) then raise exception 'POLICY_REVIEW_DENIED'; end if;
  insert into public.policy_decisions(policy_id,email,user_id,decision,reason,content_hash) values(d.id,mailbox,p_actor,p_action,trim(p_reason),d.content_hash);
  state=case when p_action='reject' then 'rejected' when not exists(select 1 from public.policy_reviewers r where r.policy_id=d.id and not exists(select 1 from public.policy_decisions a where a.policy_id=d.id and a.email=r.email and a.decision='approve')) then 'approved' else 'submitted' end;
  update public.platform_policy_versions set status=state where id=d.id;
 else raise exception 'POLICY_ACTION_INVALID'; end if;
 insert into public.governance_events(organisation_id,actor_id,subject_id,event_type,detail) values(d.organisation_id,p_actor,d.id,'policy_'||p_action,jsonb_build_object('hash',d.content_hash,'reason',p_reason));
 return state;
end $$;
revoke all on function public.v2_policy_review(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.v2_policy_review(uuid,uuid,text,text) to service_role;
-- No financial effective date, approved rate table, payment or payout function is created.
