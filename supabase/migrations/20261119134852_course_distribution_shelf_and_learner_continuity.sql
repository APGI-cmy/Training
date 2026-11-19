-- Private distribution shelf. These controls do not approve policies or change prices.
create table public.course_distribution (
 id uuid primary key default gen_random_uuid(),
 course_id text not null references public.courses(id),
 owner_organisation_id uuid not null references public.organisations(id),
 recipient_organisation_id uuid not null references public.organisations(id),
 source_release_id uuid not null,
 source_project text not null,
 source_key text unique not null,
 source_fingerprint text not null,
 source_revision bigint not null default 1,
 source_actor text not null,
 reason text not null,
 state text not null default 'offered' check(state in ('offered','concern','final','withdrawn')),
 pricing_snapshot jsonb,
 accepted_at timestamptz,
 accepted_by uuid references auth.users(id),
 declined_at timestamptz,
 margin_retained_bps integer not null default 10000 check(margin_retained_bps between 0 and 10000),
 response_due_at timestamptz,
 withdrawn_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(course_id,recipient_organisation_id),
 check(owner_organisation_id<>recipient_organisation_id)
);
create index course_distribution_owner_idx on public.course_distribution(owner_organisation_id);
create index course_distribution_recipient_idx on public.course_distribution(recipient_organisation_id);
create index course_distribution_accepted_by_idx on public.course_distribution(accepted_by);
alter table public.course_distribution enable row level security;
revoke all on public.course_distribution from public,anon,authenticated;
grant select,insert,update on public.course_distribution to service_role;
alter table public.organisation_offerings add column shared_distribution_id uuid references public.course_distribution(id);
create index organisation_offerings_distribution_idx on public.organisation_offerings(shared_distribution_id);

create table public.course_distribution_events(
 id uuid primary key default gen_random_uuid(), distribution_id uuid not null references public.course_distribution(id),
 event_key text unique not null, action text not null, actor_email text not null,
 reason text not null, response_due_at timestamptz, occurred_at timestamptz not null default now(),
 thread_id uuid references public.v2_message_threads(id)
);
create index course_distribution_events_share_idx on public.course_distribution_events(distribution_id,occurred_at);
create index course_distribution_events_thread_idx on public.course_distribution_events(thread_id);
alter table public.course_distribution_events enable row level security;
revoke all on public.course_distribution_events from public,anon,authenticated;
grant select,insert,update on public.course_distribution_events to service_role;

-- Existing enrolled learners keep their original edition, expiry, progress and certificate rights.
create table public.course_distribution_continuity(
 distribution_id uuid not null references public.course_distribution(id),
 enrolment_id uuid not null references public.course_enrolments(id),
 user_id uuid not null references auth.users(id),course_id text not null,
 recorded_at timestamptz not null default now(),primary key(distribution_id,enrolment_id)
);
create index course_distribution_continuity_user_idx on public.course_distribution_continuity(user_id,course_id);
create index course_distribution_continuity_enrolment_idx on public.course_distribution_continuity(enrolment_id);
alter table public.course_distribution_continuity enable row level security;
revoke all on public.course_distribution_continuity from public,anon,authenticated;
grant select,insert on public.course_distribution_continuity to service_role;

create function public.v6_distribution_owner(p_actor uuid,p_company uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users u join public.organisations o on o.id=p_company and o.is_active
 where u.id=p_actor and u.email_confirmed_at is not null and
 ((o.slug='apgi' and public.v2_is_platform_principal(p_actor)) or (o.slug<>'apgi' and exists(
 select 1 from public.organisation_memberships m where m.user_id=p_actor and m.organisation_id=o.id and m.membership_role='owner' and m.is_active))))
$$;
revoke execute on function public.v6_distribution_owner(uuid,uuid) from public,anon,authenticated;
grant execute on function public.v6_distribution_owner(uuid,uuid) to service_role;

-- Called inside the same transaction as state changes. Messages are never silently emailed twice.
create function public.v6_distribution_message(p_id uuid,p_key text,p_action text,p_actor text,p_reason text,p_due timestamptz default null) returns void
language plpgsql security invoker set search_path='' as $$
declare d public.course_distribution; tid uuid; mid uuid; uid uuid; subject_text text; recipient text; company uuid; title_text text;
begin
 select * into strict d from public.course_distribution where id=p_id;
 if exists(select 1 from public.course_distribution_events where event_key=p_key) then return;end if;
 select title into title_text from public.courses where id=d.course_id;
 company=case when p_action in ('accepted','declined','margin') then d.owner_organisation_id else d.recipient_organisation_id end;
 select id into uid from auth.users where lower(email)=lower(p_actor) limit 1;
 -- A verified remote author may not have a local login. A local principal records
 -- delivery only; the external author and source key remain in the immutable event.
 if uid is null then select user_id into uid from public.platform_principals order by user_id limit 1;end if;
 if uid is null then raise exception 'Configure the local platform delivery administrator';end if;
 subject_text=case p_action when 'offered' then 'A partner shared a published course with your platform'
 when 'concern' then 'First notice - please correct the course sharing concern'
 when 'final' then 'Final notice - course sharing access may be withdrawn'
 when 'withdrawn' then 'Course withdrawn from new enrolments - existing learners may finish'
 when 'accepted' then 'Shared course added to the receiving platform portfolio'
 when 'declined' then 'Shared course declined by the receiving platform'
 else 'Shared course update' end || ' - ' || coalesce(title_text,d.course_id);
 insert into public.v2_message_threads(organisation_id,created_by,subject,level,unique_key)
 values(company,uid,subject_text,'normal','distribution:'||p_key) returning id into tid;
 insert into public.v2_messages(thread_id,sender_id,sender_email,body)
 values(tid,uid,p_actor,p_reason||case when p_due is not null then E'\nResponse required by '||p_due::text else '' end||E'\nOpen Course ownership and sharing for the exact course and recorded actions. Existing learner records and live-payment settings are unchanged.') returning id into mid;
 for recipient in select distinct lower(u.email) from auth.users u join public.organisation_memberships m on m.user_id=u.id
 where m.organisation_id=company and m.membership_role='owner' and m.is_active and u.email_confirmed_at is not null
 union select lower(u.email) from auth.users u join public.platform_principals p on p.user_id=u.id join public.organisations o on o.id=company and o.slug='apgi'
 loop
 insert into public.v2_message_participants(thread_id,email) values(tid,recipient) on conflict do nothing;
 insert into public.v2_message_deliveries(message_id,email) values(mid,recipient) on conflict do nothing;
 end loop;
 insert into public.course_distribution_events(distribution_id,event_key,action,actor_email,reason,response_due_at,thread_id)
 values(p_id,p_key,p_action,p_actor,p_reason,p_due,tid);
end $$;
revoke execute on function public.v6_distribution_message(uuid,text,text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.v6_distribution_message(uuid,text,text,text,text,timestamptz) to service_role;

create function public.v6_distribution_withdraw(p_id uuid,p_at timestamptz) returns void
language plpgsql security invoker set search_path='' as $$
declare d public.course_distribution; e record;tid uuid;mid uuid;uid uuid;
begin
 select * into strict d from public.course_distribution where id=p_id for update;
 select user_id into uid from public.platform_principals order by user_id limit 1;
 if uid is null then raise exception 'Configure the local platform delivery administrator';end if;
 insert into public.course_distribution_continuity(distribution_id,enrolment_id,user_id,course_id)
 select d.id,e.id,e.user_id,e.course_id from public.course_enrolments e where e.course_id=d.course_id and e.organisation_id=d.recipient_organisation_id and e.status='enrolled'
 on conflict do nothing;
 update public.organisation_offerings set status='archived' where shared_distribution_id=d.id;
 -- Each affected learner gets an individual, private message and tracked email.
 for e in select distinct u.email,u.id from public.course_distribution_continuity c join auth.users u on u.id=c.user_id where c.distribution_id=d.id loop
 if exists(select 1 from public.v2_message_threads where unique_key='distribution-learner:'||d.id||':'||e.id) then continue;end if;
 insert into public.v2_message_threads(organisation_id,created_by,subject,level,unique_key) values(d.recipient_organisation_id,uid,'Your existing course access continues','normal','distribution-learner:'||d.id||':'||e.id) returning id into tid;
 insert into public.v2_messages(thread_id,sender_id,sender_email,body) values(tid,uid,d.source_actor,'This course is no longer offered to new learners on this platform. You may finish your existing enrolment here until its original access expiry. Your saved progress and certificate rights are preserved. Contact your training administrator through this conversation if you need help arranging access on another approved platform. No alternative account or enrolment has been created automatically.') returning id into mid;
 insert into public.v2_message_participants(thread_id,email) values(tid,lower(e.email));
 insert into public.v2_message_deliveries(message_id,email) values(mid,lower(e.email));
 end loop;
end $$;
revoke execute on function public.v6_distribution_withdraw(uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.v6_distribution_withdraw(uuid,timestamptz) to service_role;

create function public.v6_distribution_decide(p_actor uuid,p_id uuid,p_action text,p_reason text,p_revision bigint,p_days integer default 7,p_margin integer default 10000) returns uuid
language plpgsql security invoker set search_path='' as $$
declare d public.course_distribution;email_text text;side_id uuid;due timestamptz;
begin
 select * into strict d from public.course_distribution where id=p_id for update;
 if d.source_revision<>p_revision then raise exception 'The sharing record changed. Refresh before deciding.';end if;
 if length(btrim(coalesce(p_reason,''))) not between 10 and 2000 then raise exception 'Record a reason of 10 to 2000 characters';end if;
 side_id=case when p_action in ('accept','decline','margin') then d.recipient_organisation_id else d.owner_organisation_id end;
 if not public.v6_distribution_owner(p_actor,side_id) then raise exception 'Only the relevant platform owner may make this decision';end if;
 select email into email_text from auth.users where id=p_actor;
 if p_action in ('accept','decline','margin') then
 if d.state='withdrawn' then raise exception 'This course has been withdrawn from new enrolments';end if;
 if p_action='accept' then
 update public.course_distribution set accepted_at=coalesce(accepted_at,now()),accepted_by=p_actor,declined_at=null,updated_at=now() where id=p_id;
 insert into public.organisation_offerings(organisation_id,course_id,status,created_by,shared_distribution_id)
 values(d.recipient_organisation_id,d.course_id,'published',p_actor,d.id)
 on conflict(organisation_id,course_id) do update set status='published',shared_distribution_id=excluded.shared_distribution_id;
 elsif p_action='decline' then
 if d.accepted_at is not null then raise exception 'Use course availability management for a published portfolio item';end if;
 update public.course_distribution set declined_at=now(),updated_at=now() where id=p_id;
 else
 if p_margin not between 0 and 10000 or d.pricing_snapshot is null then raise exception 'Use an approved source price and a retained partner margin from zero to 100 percent';end if;
 update public.course_distribution set margin_retained_bps=p_margin,updated_at=now() where id=p_id;
 end if;
 perform public.v6_distribution_message(p_id,p_id||':'||p_action||':'||gen_random_uuid(),case p_action when 'accept' then 'accepted' when 'decline' then 'declined' else 'margin' end,email_text,btrim(p_reason),null);
 return p_id;
 end if;
 if p_action not in ('concern','final','withdrawn') then raise exception 'Choose a valid sharing action';end if;
 if (p_action='concern' and d.state<>'offered') or (p_action='final' and d.state<>'concern') or (p_action='withdrawn' and d.state<>'final') then raise exception 'Follow the first notice, final notice and withdrawal sequence';end if;
 if p_action<>'concern' and (d.response_due_at is null or d.response_due_at>now()) then raise exception 'Allow the recorded response period to finish before escalating';end if;
 if p_days not between 1 and 30 then raise exception 'Choose a response period of 1 to 30 days';end if;
 due=case when p_action='withdrawn' then null else now()+make_interval(days=>p_days) end;
 update public.course_distribution set state=p_action,reason=btrim(p_reason),source_actor=email_text,source_revision=source_revision+1,response_due_at=due,withdrawn_at=case when p_action='withdrawn' then now() end,updated_at=now() where id=p_id;
 perform public.v6_distribution_message(p_id,p_id||':'||(d.source_revision+1),p_action,email_text,btrim(p_reason),due);
 if p_action='withdrawn' then perform public.v6_distribution_withdraw(p_id,now());end if;
 return p_id;
end $$;
revoke execute on function public.v6_distribution_decide(uuid,uuid,text,text,bigint,integer,integer) from public,anon,authenticated;
grant execute on function public.v6_distribution_decide(uuid,uuid,text,text,bigint,integer,integer) to service_role;

create function public.v6_offer_course(p_course text,p_owner uuid,p_recipient uuid,p_actor uuid,p_reason text,p_project text) returns uuid
language plpgsql security invoker set search_path='' as $$
declare rid uuid;gid uuid:=gen_random_uuid();fp text;em text;price jsonb;
begin
 if not public.v6_distribution_owner(p_actor,p_owner) then raise exception 'Verified legal course owner required';end if;
 if p_owner=p_recipient or not exists(select 1 from public.organisations where id=p_recipient and is_active) or length(btrim(coalesce(p_reason,''))) not between 10 and 2000 then raise exception 'Choose another platform and record a reason';end if;
 select r.id,r.fingerprint into rid,fp from public.courses c join public.organisation_offerings o on o.course_id=c.id and o.organisation_id=p_owner and o.status='published'
 join public.course_review_rounds r on r.id=o.reviewed_release_id and r.status='published' and r.organisation_id=p_owner and r.course_id=c.id
 where c.id=p_course and c.owner_organisation_id=p_owner for share of o;
 if rid is null then raise exception 'Only a published legal owner release may be shared';end if;
 if exists(select 1 from public.course_distribution where course_id=p_course and recipient_organisation_id=p_recipient) then raise exception 'An existing sharing record must be managed rather than overwritten';end if;
 select s.document into price from public.cc_structure_releases r join public.cc_price_structures s on s.id=r.structure_id
 where r.company_id=p_owner and r.course_id=p_course and jsonb_array_length(s.document->'courses')=1 order by r.id desc limit 1;
 select email into em from auth.users where id=p_actor;
 insert into public.course_distribution(id,course_id,owner_organisation_id,recipient_organisation_id,source_release_id,source_project,source_key,source_fingerprint,source_actor,reason,pricing_snapshot)
 values(gid,p_course,p_owner,p_recipient,rid,p_project,p_project||':'||gid,fp,em,btrim(p_reason),price);
 perform public.v6_distribution_message(gid,gid||':1','offered',em,'A new published course has been shared with your platform. It is on your private course shelf. Review its ownership, content and cost structures, then accept and publish it into your portfolio if appropriate. '||btrim(p_reason),null);
 return gid;
end $$;
revoke execute on function public.v6_offer_course(text,uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.v6_offer_course(text,uuid,uuid,uuid,text,text) to service_role;

-- Retire the earlier immediate publish/revoke mutation; no UI or API can bypass the shelf.
create or replace function public.v5_share_published_course(p_course text,p_owner uuid,p_recipient uuid,p_actor uuid,p_reason text,p_revoke boolean default false) returns uuid
language plpgsql security invoker set search_path='' as $$ begin raise exception 'Use the private course shelf and three-notice sharing workflow';end $$;

create or replace function public.v2_guard_reviewed_offering() returns trigger language plpgsql set search_path='' as $$
declare owner_id uuid;changed boolean;
begin
 changed=TG_OP='INSERT';
 if TG_OP='UPDATE' then changed=old.status is distinct from new.status or old.reviewed_release_id is distinct from new.reviewed_release_id or old.shared_distribution_id is distinct from new.shared_distribution_id or old.course_id is distinct from new.course_id or old.organisation_id is distinct from new.organisation_id;end if;
 if not changed or new.status='archived' then return new;end if;
 select owner_organisation_id into owner_id from public.courses where id=new.course_id;
 if new.status='draft' then
 if owner_id is null or owner_id<>new.organisation_id then raise exception 'Private drafts belong on the declared owner platform';end if;return new;end if;
 if new.shared_distribution_id is not null then
 if not exists(select 1 from public.course_distribution d where d.id=new.shared_distribution_id and d.course_id=new.course_id and d.recipient_organisation_id=new.organisation_id and d.owner_organisation_id=owner_id and d.accepted_at is not null and d.state<>'withdrawn') then raise exception 'Recipient owner acceptance of the shared published release is required';end if;
 elsif new.status='published' then
 if owner_id is not null and owner_id<>new.organisation_id then raise exception 'Use the receiving owner private shelf before publication';end if;
 if new.reviewed_release_id is null or not exists(select 1 from public.course_review_rounds r where r.id=new.reviewed_release_id and r.status='published' and r.course_id=new.course_id and r.organisation_id=new.organisation_id) then raise exception 'Complete course review and explicit publication approval first';end if;
 end if;return new;
end $$;
-- An updated owner edition does not silently replace a recipient's frozen edition or revoke learners.
create or replace function public.v5_withdraw_old_course_shares() returns trigger language plpgsql set search_path='' as $$ begin return new;end $$;

create function public.v6_guard_withdrawn_enrolment() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='UPDATE' then if new.status is not distinct from old.status and new.organisation_id is not distinct from old.organisation_id and new.course_id is not distinct from old.course_id then return new;end if;end if;
 perform 1 from public.course_distribution d where d.course_id=new.course_id and d.recipient_organisation_id=new.organisation_id for share;
 if exists(select 1 from public.course_distribution d where d.course_id=new.course_id and d.recipient_organisation_id=new.organisation_id and d.state='withdrawn') then raise exception 'This shared course is closed to new enrolments. Existing enrolled learners retain completion access';end if;return new;
end $$;
create trigger v6_guard_withdrawn_enrolment before insert or update on public.course_enrolments for each row execute function public.v6_guard_withdrawn_enrolment();
create trigger v6_guard_withdrawn_invitation before insert on public.course_invitations for each row execute function public.v6_guard_withdrawn_enrolment();
revoke execute on function public.v6_guard_withdrawn_enrolment() from public,anon,authenticated;

create function public.v6_learner_continuity(p_course text,p_company uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.course_distribution_continuity c join public.course_enrolments e on e.id=c.enrolment_id join public.course_distribution d on d.id=c.distribution_id
 where c.user_id=auth.uid() and c.course_id=p_course and d.recipient_organisation_id=p_company and e.user_id=auth.uid() and e.status='enrolled' and (e.access_expires_at is null or e.access_expires_at>now()))
$$;
revoke execute on function public.v6_learner_continuity(text,uuid) from public,anon;
grant execute on function public.v6_learner_continuity(text,uuid) to authenticated,service_role;



