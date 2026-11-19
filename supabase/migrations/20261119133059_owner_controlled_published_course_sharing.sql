-- Owner publication and distribution are separate from tenant branding.
-- Existing offerings/reviews are retained; only new assignment changes are guarded.
alter table public.courses add column if not exists owner_organisation_id uuid references public.organisations(id);
create index if not exists courses_owner_organisation_idx on public.courses(owner_organisation_id);

create table if not exists public.course_sharing_grants (
 id uuid primary key default gen_random_uuid(),
 course_id text not null references public.courses(id),
 owner_organisation_id uuid not null references public.organisations(id),
 recipient_organisation_id uuid not null references public.organisations(id),
 source_release_id uuid not null references public.course_review_rounds(id),
 authorised_by uuid not null references auth.users(id),
 reason text not null check(length(reason) between 10 and 2000),
 is_active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(course_id,recipient_organisation_id),
 check(owner_organisation_id<>recipient_organisation_id)
);
alter table public.course_sharing_grants enable row level security;
revoke all on public.course_sharing_grants from public,anon,authenticated;
grant select,insert,update on public.course_sharing_grants to service_role;
create index if not exists course_sharing_grants_owner_idx on public.course_sharing_grants(owner_organisation_id);
create index if not exists course_sharing_grants_recipient_idx on public.course_sharing_grants(recipient_organisation_id);
create index if not exists course_sharing_grants_release_idx on public.course_sharing_grants(source_release_id);
create index if not exists course_sharing_grants_actor_idx on public.course_sharing_grants(authorised_by);

create or replace function public.v5_record_review_course_owner() returns trigger language plpgsql set search_path='' as $$
declare declared uuid; recorded uuid;
begin
 if (new.document#>>'{workflow,ownerId}') ~* '^[0-9a-f-]{36}$' then
  declared=(new.document#>>'{workflow,ownerId}')::uuid;
  -- Imported frozen owner releases can retain the original database's owner ID.
  if exists(select 1 from public.organisations where id=declared) then
   select owner_organisation_id into recorded from public.courses where id=new.course_id for update;
   if recorded is not null and recorded<>declared then raise exception 'The declared legal owner differs from the recorded course owner. A separate ownership transfer is required.';end if;
   update public.courses set owner_organisation_id=declared where id=new.course_id and owner_organisation_id is null;
  end if;
 end if;
 return new;
end $$;
create trigger v5_record_review_course_owner after insert or update of document on public.course_review_rounds for each row execute function public.v5_record_review_course_owner();

create or replace function public.v5_guard_course_owner() returns trigger language plpgsql set search_path='' as $$
begin
 if old.owner_organisation_id is not null and new.owner_organisation_id is distinct from old.owner_organisation_id then
  raise exception 'Course ownership cannot be changed by a branding or assignment update. Use a separately approved ownership transfer.';
 end if;return new;
end $$;
create trigger v5_guard_course_owner before update of owner_organisation_id on public.courses for each row execute function public.v5_guard_course_owner();

create or replace function public.v2_guard_reviewed_offering() returns trigger language plpgsql set search_path='' as $$
declare owner_id uuid; changed boolean;
begin
 changed=TG_OP='INSERT';
 if TG_OP='UPDATE' then changed=old.status is distinct from new.status or old.reviewed_release_id is distinct from new.reviewed_release_id or old.course_id is distinct from new.course_id or old.organisation_id is distinct from new.organisation_id;end if;
 if not changed or new.status='archived' then return new;end if;
 select owner_organisation_id into owner_id from public.courses where id=new.course_id;
 if new.status='draft' then
  if owner_id is null or owner_id<>new.organisation_id then raise exception 'Draft courses belong only on their declared owner platform. Share a published owner release instead.';end if;
  return new;
 end if;
 if new.status='published' then
  if owner_id is not null and owner_id<>new.organisation_id then
   if not exists(select 1 from public.course_sharing_grants g
    join public.organisation_offerings s on s.organisation_id=g.owner_organisation_id and s.course_id=g.course_id and s.status='published' and s.reviewed_release_id=g.source_release_id
    join public.course_review_rounds r on r.id=g.source_release_id and r.organisation_id=g.owner_organisation_id and r.course_id=g.course_id and r.status='published'
    where g.course_id=new.course_id and g.recipient_organisation_id=new.organisation_id and g.owner_organisation_id=owner_id and g.source_release_id=new.reviewed_release_id and g.is_active) then
     raise exception 'Only an owner-authorised published release may be shared to another platform.';
   end if;
  elsif new.reviewed_release_id is null or not exists(select 1 from public.course_review_rounds r where r.id=new.reviewed_release_id and r.status='published' and r.course_id=new.course_id and r.organisation_id=new.organisation_id) then
   raise exception 'Complete course review and explicit publication approval first';
  end if;
 end if;return new;
end $$;

create or replace function public.v5_share_published_course(p_course text,p_owner uuid,p_recipient uuid,p_actor uuid,p_reason text,p_revoke boolean default false)
returns uuid language plpgsql security invoker set search_path='' as $$
declare owner_slug text; release_id uuid; grant_id uuid;
begin
 if p_actor is null or not exists(select 1 from auth.users where id=p_actor and email_confirmed_at is not null) then raise exception 'Verified owner account required';end if;
 select o.slug into owner_slug from public.courses c join public.organisations o on o.id=c.owner_organisation_id and o.is_active where c.id=p_course and c.owner_organisation_id=p_owner for share of c;
 if owner_slug is null then raise exception 'Declare the legal course owner before sharing';end if;
 if (owner_slug='apgi' and not public.v2_is_platform_principal(p_actor)) or
    (owner_slug<>'apgi' and not exists(select 1 from public.organisation_memberships where organisation_id=p_owner and user_id=p_actor and membership_role='owner' and is_active)) then
  raise exception 'Only the declared course owner may authorise sharing. Development or platform administration does not transfer this right.';
 end if;
 if p_recipient=p_owner or not exists(select 1 from public.organisations where id=p_recipient and is_active) then raise exception 'Choose another active platform';end if;
 if length(btrim(coalesce(p_reason,''))) not between 10 and 2000 then raise exception 'Record the reason for this owner sharing decision';end if;
 if p_revoke then
  update public.course_sharing_grants set is_active=false,reason=btrim(p_reason),authorised_by=p_actor,updated_at=now() where course_id=p_course and owner_organisation_id=p_owner and recipient_organisation_id=p_recipient returning id into grant_id;
  if grant_id is null then raise exception 'No sharing decision exists for this platform';end if;
  update public.organisation_offerings set status='archived' where course_id=p_course and organisation_id=p_recipient;
 else
  select s.reviewed_release_id into release_id from public.organisation_offerings s join public.course_review_rounds r on r.id=s.reviewed_release_id and r.status='published' and r.course_id=s.course_id and r.organisation_id=p_owner where s.course_id=p_course and s.organisation_id=p_owner and s.status='published' for share of s;
  if release_id is null then raise exception 'Publish this course on its owner platform before sharing';end if;
  insert into public.course_sharing_grants(course_id,owner_organisation_id,recipient_organisation_id,source_release_id,authorised_by,reason)
   values(p_course,p_owner,p_recipient,release_id,p_actor,btrim(p_reason))
   on conflict(course_id,recipient_organisation_id) do update set source_release_id=excluded.source_release_id,authorised_by=excluded.authorised_by,reason=excluded.reason,is_active=true,updated_at=now() returning id into grant_id;
  insert into public.organisation_offerings(organisation_id,course_id,status,created_by,reviewed_release_id) values(p_recipient,p_course,'published',p_actor,release_id)
   on conflict(organisation_id,course_id) do update set status='published',reviewed_release_id=excluded.reviewed_release_id;
 end if;
 insert into public.governance_events(organisation_id,actor_id,subject_id,event_type,detail) values(p_owner,p_actor,grant_id,case when p_revoke then 'course_sharing_revoked' else 'published_course_shared' end,jsonb_build_object('course_id',p_course,'recipient_organisation_id',p_recipient,'source_release_id',release_id,'reason',btrim(p_reason),'learner_records_preserved',true,'payments_changed',false));
 return grant_id;
end $$;
revoke execute on function public.v5_share_published_course(text,uuid,uuid,uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.v5_share_published_course(text,uuid,uuid,uuid,text,boolean) to service_role;
revoke execute on function public.v5_record_review_course_owner() from public,anon,authenticated;
revoke execute on function public.v5_guard_course_owner() from public,anon,authenticated;

-- A withdrawn/replaced owner release cannot remain distributable through an old grant.
create or replace function public.v5_withdraw_old_course_shares() returns trigger language plpgsql set search_path='' as $$
begin
 if (new.status is distinct from old.status or new.reviewed_release_id is distinct from old.reviewed_release_id)
 and exists(select 1 from public.courses where id=new.course_id and owner_organisation_id=new.organisation_id) then
  update public.course_sharing_grants set is_active=false,updated_at=now() where course_id=new.course_id and owner_organisation_id=new.organisation_id and is_active;
  update public.organisation_offerings f set status='archived' from public.course_sharing_grants g where g.course_id=new.course_id and g.owner_organisation_id=new.organisation_id and g.recipient_organisation_id=f.organisation_id and f.course_id=g.course_id and f.status='published';
 end if;return new;
end $$;
create trigger v5_withdraw_old_course_shares after update of status,reviewed_release_id on public.organisation_offerings for each row execute function public.v5_withdraw_old_course_shares();
revoke execute on function public.v5_withdraw_old_course_shares() from public,anon,authenticated;



