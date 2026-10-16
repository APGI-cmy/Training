-- Isolated V2 only. No financial activation, payments, or V1 changes.
do $$ begin
 if not exists(select 1 from public.organisation_memberships) or
    not exists(select 1 from information_schema.tables where table_schema='public' and table_name='platform_policy_versions') then
  raise exception 'V2_COMPANY_STRUCTURE_REQUIRED';
 end if;
end $$;

create table public.platform_principals (
 email text primary key check(email in ('johan.ras@apginc.ca','jorrie.jordaan@apginc.ca')),
 user_id uuid unique references auth.users(id),
 bound_at timestamptz,
 check((user_id is null) = (bound_at is null))
);
alter table public.platform_principals enable row level security;
revoke all on public.platform_principals from anon, authenticated;
grant select on public.platform_principals to service_role;
insert into public.platform_principals(email,user_id,bound_at)
select e.email,u.id,case when u.id is not null then now() end
from (values('johan.ras@apginc.ca'),('jorrie.jordaan@apginc.ca')) e(email)
left join auth.users u on lower(u.email)=e.email and u.email_confirmed_at is not null
 and exists(select 1 from public.user_roles r where r.user_id=u.id and r.role='admin');

create function public.v2_is_platform_principal(p_actor uuid) returns boolean
language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.platform_principals p join auth.users u on u.id=p.user_id
  where p.user_id=p_actor and lower(u.email)=p.email and u.email_confirmed_at is not null
  and exists(select 1 from public.user_roles r where r.user_id=p_actor and r.role='admin'));
$$;
revoke all on function public.v2_is_platform_principal(uuid) from public,anon,authenticated;
grant execute on function public.v2_is_platform_principal(uuid) to service_role;

-- Bind an unbound principal only when its exact verified mailbox receives admin.
-- This trigger cannot replace an already bound UUID or grant an admin role itself.
create function public.v2_bind_principal_admin() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.role='admin' then
  update public.platform_principals p set user_id=u.id,bound_at=now()
  from auth.users u where u.id=new.user_id and lower(u.email)=p.email
   and u.email_confirmed_at is not null and p.user_id is null;
 end if;
 return new;
end $$;
revoke all on function public.v2_bind_principal_admin() from public,anon,authenticated;
create trigger bind_platform_principal_after_admin after insert or update on public.user_roles
for each row execute function public.v2_bind_principal_admin();
-- The trigger runs under the caller, never as SECURITY DEFINER.
grant update(user_id,bound_at) on public.platform_principals to service_role;

alter table public.platform_policy_versions add column visibility text;
-- Classify existing history without changing its content, hash or decisions.
alter table public.platform_policy_versions disable trigger policy_content_immutable;
update public.platform_policy_versions set visibility=case when organisation_id is null then 'internal' else 'company' end;
alter table public.platform_policy_versions enable trigger policy_content_immutable;
alter table public.platform_policy_versions alter column visibility set default 'internal';
alter table public.platform_policy_versions alter column visibility set not null;
alter table public.platform_policy_versions add constraint policy_visibility_scope check(
 (visibility='internal' and organisation_id is null) or (visibility='company' and organisation_id is not null));
create index policy_visibility_scope on public.platform_policy_versions(visibility,organisation_id,created_at desc);

create or replace function public.v2_policy_immutable() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='DELETE' then raise exception 'POLICY_HISTORY_IMMUTABLE'; end if;
 if (new.id,new.created_by,new.created_at,new.title,new.version_label,new.organisation_id,new.previous_version_id,new.visibility)
 is distinct from (old.id,old.created_by,old.created_at,old.title,old.version_label,old.organisation_id,old.previous_version_id,old.visibility)
 then raise exception 'POLICY_IDENTITY_IMMUTABLE'; end if;
 if old.status<>'draft' and (new.body,new.file_path,new.file_sha256,new.content_hash)
 is distinct from (old.body,old.file_path,old.file_sha256,old.content_hash) then raise exception 'POLICY_CONTENT_IMMUTABLE'; end if;
 if old.status in ('approved','rejected') then raise exception 'CREATE_A_NEW_POLICY_VERSION'; end if;
 return new;
end $$;

create function public.v2_policy_insert_scope() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if not public.v2_is_platform_principal(new.created_by) then raise exception 'PRINCIPAL_REQUIRED'; end if;
 if new.previous_version_id is not null and not exists(
  select 1 from public.platform_policy_versions p where p.id=new.previous_version_id
   and p.visibility=new.visibility and p.organisation_id is not distinct from new.organisation_id
 ) then raise exception 'POLICY_REVISION_SCOPE_IMMUTABLE'; end if;
 return new;
end $$;
revoke all on function public.v2_policy_insert_scope() from public,anon,authenticated;
create trigger policy_insert_scope before insert on public.platform_policy_versions
for each row execute function public.v2_policy_insert_scope();

create or replace function public.v2_reviewer_draft_only() returns trigger
language plpgsql security invoker set search_path='' as $$
declare pid uuid; scope text;
begin
 pid=case when tg_op='DELETE' then old.policy_id else new.policy_id end;
 select visibility into scope from public.platform_policy_versions where id=pid and status='draft' for update;
 if not found then raise exception 'POLICY_REVIEWERS_LOCKED'; end if;
 if tg_op='UPDATE' and new.policy_id<>old.policy_id then raise exception 'POLICY_REVIEWERS_LOCKED'; end if;
 if tg_op<>'DELETE' and scope='internal' and new.email not in ('johan.ras@apginc.ca','jorrie.jordaan@apginc.ca')
 then raise exception 'INTERNAL_REVIEWER_DENIED'; end if;
 if tg_op='DELETE' then return old; end if; return new;
end $$;

create or replace function public.v2_policy_review(p_policy uuid,p_actor uuid,p_action text,p_reason text default '') returns text
language plpgsql security invoker set search_path='' as $$
declare d public.platform_policy_versions; mailbox text; state text;
begin
 select * into d from public.platform_policy_versions where id=p_policy for update;
 if not found then raise exception 'POLICY_NOT_FOUND'; end if;
 select lower(email) into mailbox from auth.users where id=p_actor and email_confirmed_at is not null;
 if mailbox is null then raise exception 'VERIFIED_ACCOUNT_REQUIRED'; end if;
 if d.visibility='internal' and not public.v2_is_platform_principal(p_actor) then raise exception 'PRINCIPAL_REQUIRED'; end if;
 if d.visibility='company' and exists(select 1 from public.organisation_memberships
  where organisation_id=d.organisation_id and user_id=p_actor and membership_role='owner' and not is_active)
  and not public.v2_is_platform_principal(p_actor) then raise exception 'REVOKED_OWNER'; end if;
 if p_action='submit' then
  if not public.v2_is_platform_principal(p_actor) or d.status<>'draft' then raise exception 'POLICY_SUBMIT_DENIED'; end if;
  if not exists(select 1 from public.policy_reviewers where policy_id=d.id) then raise exception 'REVIEWER_REQUIRED'; end if;
  if d.visibility='internal' and (
   (select count(*) from public.policy_reviewers where policy_id=d.id)<>2 or
   exists(select 1 from public.policy_reviewers where policy_id=d.id and email not in ('johan.ras@apginc.ca','jorrie.jordaan@apginc.ca'))
  ) then raise exception 'TWO_PRINCIPAL_REVIEWS_REQUIRED'; end if;
  if d.visibility='company' and (
   (select count(*) from public.policy_reviewers where policy_id=d.id)<2 or
   not exists(select 1 from public.policy_reviewers r join public.platform_principals p on p.email=r.email where r.policy_id=d.id) or
   not exists(select 1 from public.policy_reviewers r where r.policy_id=d.id and r.email not in ('johan.ras@apginc.ca','jorrie.jordaan@apginc.ca'))
  ) then raise exception 'APGI_AND_COMPANY_REVIEW_REQUIRED'; end if;
  update public.platform_policy_versions set status='submitted',submitted_at=now() where id=d.id;
  insert into public.policy_email_deliveries(policy_id,recipient_email) select d.id,email from public.policy_reviewers where policy_id=d.id on conflict do nothing;
  state='submitted';
 elsif p_action in ('approve','reject') then
  if d.status<>'submitted' or not exists(select 1 from public.policy_reviewers where policy_id=d.id and email=mailbox)
   then raise exception 'POLICY_REVIEW_DENIED'; end if;
  insert into public.policy_decisions(policy_id,email,user_id,decision,reason,content_hash)
   values(d.id,mailbox,p_actor,p_action,trim(p_reason),d.content_hash);
  state=case when p_action='reject' then 'rejected'
   when not exists(select 1 from public.policy_reviewers r where r.policy_id=d.id and not exists(
    select 1 from public.policy_decisions a where a.policy_id=d.id and a.email=r.email and a.decision='approve'))
   then 'approved' else 'submitted' end;
  update public.platform_policy_versions set status=state where id=d.id;
 else raise exception 'POLICY_ACTION_INVALID'; end if;
 insert into public.governance_events(organisation_id,actor_id,subject_id,event_type,detail)
 values(d.organisation_id,p_actor,d.id,'policy_'||p_action,jsonb_build_object('hash',d.content_hash,'reason',p_reason));
 return state;
end $$;

create function public.v2_internal_notice_scope() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if exists(select 1 from public.platform_policy_versions p where p.id=new.policy_id and p.visibility='internal')
 and new.recipient_email not in ('johan.ras@apginc.ca','jorrie.jordaan@apginc.ca') then raise exception 'INTERNAL_NOTICE_DENIED'; end if;
 return new;
end $$;
revoke all on function public.v2_internal_notice_scope() from public,anon,authenticated;
create trigger internal_notice_scope before insert or update on public.policy_email_deliveries
for each row execute function public.v2_internal_notice_scope();

create function public.v2_commercial_principal_only() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if not public.v2_is_platform_principal(new.created_by) then raise exception 'PRINCIPAL_REQUIRED'; end if;
 return new;
end $$;
revoke all on function public.v2_commercial_principal_only() from public,anon,authenticated;
create trigger commercial_principal_only before insert or update on public.commercial_agreement_drafts
for each row execute function public.v2_commercial_principal_only();

-- No direct client grants are added. Server-role code must check actual session identity.
notify pgrst, 'reload schema';
