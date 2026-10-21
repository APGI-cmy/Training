-- V2 messaging. All tables and RPCs are service-role-only. Actor IDs come from verified server sessions.
create table public.v2_message_threads (
 id uuid primary key default gen_random_uuid(), organisation_id uuid references public.organisations,
 created_by uuid not null references auth.users, subject text not null check(length(subject) between 1 and 200),
 level text not null check(level in ('company','apgi','direct')), status text not null default 'open' check(status in ('open','closed')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique_key text unique
);
create table public.v2_message_participants (
 thread_id uuid references public.v2_message_threads on delete cascade, email text not null, primary key(thread_id,email)
);
create table public.v2_messages (
 id uuid primary key,thread_id uuid not null references public.v2_message_threads on delete cascade,
 sender_id uuid not null references auth.users,sender_email text not null,body text not null check(length(body) between 1 and 20000),
 attachment_name text,attachment_mime text,attachment_data bytea check(octet_length(attachment_data)<=2097152),
 created_at timestamptz not null default now(),unique(thread_id,id)
);
create table public.v2_message_deliveries (
 message_id uuid references public.v2_messages on delete cascade,email text not null,
 read_at timestamptz,state text not null default 'queued' check(state in ('queued','sending','accepted','failed','expired')),
 provider_id text,attempts integer not null default 0,next_at timestamptz not null default now(),lease_at timestamptz,
 primary key(message_id,email)
);
create table public.v2_message_templates (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users,name text not null check(length(name) between 1 and 100),
 subject text not null check(length(subject) between 1 and 200),body text not null check(length(body) between 1 and 20000),updated_at timestamptz not null default now()
);
create table public.v2_message_schedules (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users,organisation_id uuid not null references public.organisations,
 subject text not null check(length(subject) between 1 and 200),body text not null check(length(body) between 1 and 20000),
 recipients jsonb not null check(jsonb_typeof(recipients)='array' and jsonb_array_length(recipients) between 1 and 200),
 cadence text not null check(cadence in ('once','daily','weekly','monthly')),next_at timestamptz not null,end_at timestamptz,
 state text not null default 'active' check(state in ('active','paused','complete')),sent_count integer not null default 0,last_error text,
 created_at timestamptz not null default now(),check(cadence='once' or end_at is not null)
);
create table public.v2_message_events (
 id bigint generated always as identity primary key,actor_id uuid references auth.users,thread_id uuid references public.v2_message_threads,
 action text not null,created_at timestamptz not null default now()
);
create index v2_message_thread_org on public.v2_message_threads(organisation_id,updated_at desc);
create index v2_message_thread_creator on public.v2_message_threads(created_by,updated_at desc);
create index v2_message_thread_posts on public.v2_messages(thread_id,created_at);
create index v2_message_recipient_threads on public.v2_message_participants(email,thread_id);
create index v2_message_delivery_due on public.v2_message_deliveries(next_at) where state in ('queued','failed','sending');
create index v2_message_schedule_due on public.v2_message_schedules(next_at) where state='active';
create index v2_message_template_owner on public.v2_message_templates(owner_id);

create function public.v2_message_email(p_actor uuid) returns text language sql stable security invoker set search_path='' as $$
 select lower(email) from auth.users where id=p_actor and email_confirmed_at is not null
$$;
create function public.v2_message_admin(p_actor uuid,p_org uuid) returns boolean language sql stable security invoker set search_path='' as $$
 select public.v2_message_email(p_actor) is not null and exists(select 1 from public.organisations o where o.id=p_org and o.is_active and (
 public.v2_is_platform_principal(p_actor) or exists(select 1 from public.organisation_memberships m where m.organisation_id=o.id and m.user_id=p_actor and m.is_active and m.membership_role='owner')
 or (o.slug='apgi' and exists(select 1 from public.user_roles r where r.user_id=p_actor and r.role='admin'))))
$$;
create function public.v2_message_member(p_actor uuid,p_org uuid) returns boolean language sql stable security invoker set search_path='' as $$
 select public.v2_message_admin(p_actor,p_org) or exists(select 1 from public.organisation_memberships where user_id=p_actor and organisation_id=p_org and is_active)
 or exists(select 1 from public.course_enrolments where user_id=p_actor and organisation_id=p_org and status='enrolled')
$$;
create function public.v2_message_access(p_actor uuid,p_thread uuid) returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.v2_message_threads t where t.id=p_thread and public.v2_message_email(p_actor) is not null and (
 t.created_by=p_actor or exists(select 1 from public.v2_message_participants p where p.thread_id=t.id and p.email=public.v2_message_email(p_actor) and(t.level='direct' or public.v2_message_member(p_actor,t.organisation_id) or(t.level='apgi' and public.v2_is_platform_principal(p_actor))))
 or (t.level='company' and public.v2_message_admin(p_actor,t.organisation_id)) or(t.level='apgi' and public.v2_is_platform_principal(p_actor))))
$$;
create function public.v2_message_contact(p_actor uuid,p_org uuid,p_email text) returns boolean language sql stable security invoker set search_path='' as $$
 select public.v2_message_admin(p_actor,p_org) and (
 exists(select 1 from public.platform_principals where email=p_email)
 or exists(select 1 from auth.users u where lower(u.email)=p_email and u.email_confirmed_at is not null and public.v2_message_member(u.id,p_org)))
$$;

create function public.v2_message_send(p_actor uuid,p_id uuid,p_thread uuid,p_org uuid,p_subject text,p_body text,p_to text default null,p_attachment jsonb default null,p_unique text default null) returns uuid
language plpgsql security invoker set search_path='' as $$
declare mailbox text;tid uuid;t public.v2_message_threads;target record;already public.v2_messages;admins integer;
begin
 mailbox=public.v2_message_email(p_actor);if mailbox is null then raise exception 'Confirm your email before sending messages';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_actor::text,91));
 select * into already from public.v2_messages where id=p_id;
 if found then if already.sender_id<>p_actor then raise exception 'Message unavailable';end if;return already.thread_id;end if;
 if (select count(*) from public.v2_messages where sender_id=p_actor and created_at>now()-interval '1 hour')>=500 then raise exception 'Hourly message limit reached';end if;
 if length(trim(p_body)) not between 1 and 20000 then raise exception 'Enter a message of up to 20000 characters';end if;
 if p_thread is not null then
  select * into t from public.v2_message_threads where id=p_thread for update;
  if not found or not public.v2_message_access(p_actor,p_thread) then raise exception 'Message unavailable';end if;
  if t.status='closed' then raise exception 'Reopen this conversation before replying';end if;tid=t.id;
 else
  if length(trim(p_subject)) not between 1 and 200 then raise exception 'Enter a subject of up to 200 characters';end if;
  if p_org is null or not exists(select 1 from public.organisations where id=p_org and is_active) then raise exception 'Choose an active company';end if;
  if not public.v2_message_member(p_actor,p_org) and not exists(select 1 from public.organisations where id=p_org and slug='apgi') then raise exception 'Company unavailable';end if;
  if p_to is not null and not public.v2_message_contact(p_actor,p_org,lower(p_to)) then raise exception 'Recipient is outside your administrative scope';end if;
  insert into public.v2_message_threads(organisation_id,created_by,subject,level,unique_key)
  values(p_org,p_actor,trim(p_subject),case when p_to is not null then 'direct' when exists(select 1 from public.organisations where id=p_org and slug='apgi') then 'apgi' else 'company' end,p_unique)
  on conflict(unique_key) do nothing returning id into tid;
  if tid is null then select id into tid from public.v2_message_threads where unique_key=p_unique;return tid;end if;
  insert into public.v2_message_participants values(tid,mailbox);
  if p_to is not null then insert into public.v2_message_participants values(tid,lower(p_to)) on conflict do nothing;
  else
   insert into public.v2_message_participants(thread_id,email)
   select tid,lower(u.email) from auth.users u where u.email_confirmed_at is not null and u.id<>p_actor and(
    exists(select 1 from public.organisation_memberships om where om.user_id=u.id and om.organisation_id=p_org and om.is_active and om.membership_role='owner')
    or(exists(select 1 from public.organisations o where o.id=p_org and o.slug='apgi') and public.v2_message_admin(u.id,p_org))) on conflict do nothing;
   get diagnostics admins=row_count;
   if admins=0 or exists(select 1 from public.organisations where id=p_org and slug='apgi') then
    update public.v2_message_threads set level='apgi' where id=tid;
    insert into public.v2_message_participants select tid,email from public.platform_principals where email<>mailbox on conflict do nothing;
   end if;
  end if;
 end if;
 if p_attachment is not null and (p_attachment->>'mime' not in ('application/pdf','image/png','image/jpeg','text/plain') or length(p_attachment->>'name') not between 1 and 200 or octet_length(decode(p_attachment->>'data','base64'))>2097152) then raise exception 'Attachment must be a PDF, PNG, JPG or text file of up to 2 MB';end if;
 insert into public.v2_messages(id,thread_id,sender_id,sender_email,body,attachment_name,attachment_mime,attachment_data)
 values(p_id,tid,p_actor,mailbox,trim(p_body),p_attachment->>'name',p_attachment->>'mime',decode(p_attachment->>'data','base64'));
 update public.v2_message_threads set updated_at=now() where id=tid;
 insert into public.v2_message_deliveries(message_id,email) select p_id,p.email from public.v2_message_participants p where thread_id=tid and p.email<>mailbox
 and(not exists(select 1 from auth.users u where lower(u.email)=p.email) or exists(select 1 from auth.users u where lower(u.email)=p.email and public.v2_message_access(u.id,tid)));
 for target in select u.id from public.v2_message_deliveries d join auth.users u on lower(u.email)=d.email and u.email_confirmed_at is not null where d.message_id=p_id loop
  perform public.v2_notice(target.id,'message:'||p_id,'New message: '||(select subject from public.v2_message_threads where id=tid),'/messages/'||tid,'read',p_actor,'message',tid);
 end loop;
 insert into public.v2_message_events(actor_id,thread_id,action) values(p_actor,tid,'message_sent');return tid;
end $$;

create function public.v2_message_workspace(p_actor uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare mailbox text;result jsonb;
begin
 mailbox=public.v2_message_email(p_actor);if mailbox is null then raise exception 'Verified account required';end if;
 -- Bind pending inbox notices only to the verified recipient email after registration.
 insert into public.admin_notifications(recipient_user_id,event_key,kind,message,target_path,response_type,actor_user_id,source_type,source_id)
 select p_actor,'message:'||m.id,'platform_event','New message: '||t.subject,'/messages/'||t.id,'read',m.sender_id,'message',t.id
 from public.v2_message_deliveries d join public.v2_messages m on m.id=d.message_id join public.v2_message_threads t on t.id=m.thread_id
 where d.email=mailbox and d.read_at is null on conflict(recipient_user_id,event_key) do nothing;
 select jsonb_build_object(
 'scopes',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'name',o.name,'admin',public.v2_message_admin(p_actor,o.id)) order by o.name) from public.organisations o where o.is_active and (o.slug='apgi' or public.v2_message_member(p_actor,o.id))),'[]'),
 'admin',exists(select 1 from public.organisations o where public.v2_message_admin(p_actor,o.id)),
 'contacts',coalesce((select jsonb_agg(jsonb_build_object('email',email,'label',email) order by email) from(
 select lower(u.email) email from auth.users u where u.email_confirmed_at is not null and exists(select 1 from public.organisations o where public.v2_message_contact(p_actor,o.id,lower(u.email)))
 union select pp.email from public.platform_principals pp where exists(select 1 from public.organisations o where public.v2_message_admin(p_actor,o.id))) c),'[]'),
 'threads',coalesce((select jsonb_agg(row_to_json(x)) from(select t.id,t.organisation_id,t.subject,t.level,t.status,t.updated_at,(select count(*) from public.v2_messages m join public.v2_message_deliveries d on d.message_id=m.id where m.thread_id=t.id and d.email=mailbox and d.read_at is null) unread from public.v2_message_threads t where public.v2_message_access(p_actor,t.id) order by t.updated_at desc limit 200) x),'[]'),
 'templates',coalesce((select jsonb_agg(row_to_json(x)) from(select id,name,subject,body from public.v2_message_templates where owner_id=p_actor order by name) x),'[]'),
 'schedules',coalesce((select jsonb_agg(row_to_json(x)) from(select id,subject,cadence,next_at,end_at,state,recipients,sent_count,last_error from public.v2_message_schedules where owner_id=p_actor order by created_at desc limit 100) x),'[]')) into result;
 return result;
end $$;
create function public.v2_message_detail(p_actor uuid,p_thread uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare mailbox text;result jsonb;
begin
 if not public.v2_message_access(p_actor,p_thread) then raise exception 'Message unavailable';end if;mailbox=public.v2_message_email(p_actor);
 update public.v2_message_deliveries d set read_at=coalesce(read_at,now()) where email=mailbox and exists(select 1 from public.v2_messages m where m.id=d.message_id and m.thread_id=p_thread);
 update public.admin_notifications set read_at=coalesce(read_at,now()) where recipient_user_id=p_actor and source_type='message' and source_id=p_thread;
 select jsonb_build_object('thread',to_jsonb(t),'canManage',public.v2_message_admin(p_actor,t.organisation_id) or(t.level='apgi' and public.v2_is_platform_principal(p_actor)),
 'messages',coalesce((select jsonb_agg(row_to_json(x)) from(select m.id,m.sender_email,m.body,m.created_at,m.attachment_name,
 (select coalesce(jsonb_agg(jsonb_build_object('email',d.email,'read_at',d.read_at,'state',d.state)),'[]') from public.v2_message_deliveries d where d.message_id=m.id) receipts
 from public.v2_messages m where m.thread_id=t.id order by m.created_at,m.id) x),'[]')) into result from public.v2_message_threads t where id=p_thread;
 return result;
end $$;
create function public.v2_message_manage(p_actor uuid,p_thread uuid,p_operation text) returns void language plpgsql security invoker set search_path='' as $$
declare t public.v2_message_threads;r record;
begin
 select * into t from public.v2_message_threads where id=p_thread for update;
 if not found or not public.v2_message_access(p_actor,p_thread) then raise exception 'Message unavailable';end if;
 if p_operation='escalate' then
  if not public.v2_message_admin(p_actor,t.organisation_id) then raise exception 'Only the first-level administrator can escalate';end if;
  update public.v2_message_threads set level='apgi',status='open',updated_at=now() where id=p_thread;
  insert into public.v2_message_participants select p_thread,email from public.platform_principals on conflict do nothing;
  for r in select user_id from public.platform_principals where user_id is not null and user_id<>p_actor loop
   perform public.v2_notice(r.user_id,'message-escalated:'||p_thread,'Support request escalated: '||t.subject,'/messages/'||p_thread,'read',p_actor,'message',p_thread);
  end loop;
 elsif p_operation in ('close','reopen') then
  if t.created_by<>p_actor and not public.v2_message_admin(p_actor,t.organisation_id) then raise exception 'Only the sender or administrator may change status';end if;
  update public.v2_message_threads set status=case when p_operation='close' then 'closed' else 'open' end,updated_at=now() where id=p_thread;
 else raise exception 'Unknown message action';end if;
 insert into public.v2_message_events(actor_id,thread_id,action) values(p_actor,p_thread,p_operation);
end $$;

create function public.v2_message_template_save(p_actor uuid,p_id uuid,p_name text,p_subject text,p_body text) returns uuid language plpgsql security invoker set search_path='' as $$
declare tid uuid;
begin
 if not exists(select 1 from public.organisations o where public.v2_message_admin(p_actor,o.id)) then raise exception 'Administrator access required';end if;
 if p_id is null then insert into public.v2_message_templates(owner_id,name,subject,body) values(p_actor,trim(p_name),trim(p_subject),trim(p_body)) returning id into tid;
 else update public.v2_message_templates set name=trim(p_name),subject=trim(p_subject),body=trim(p_body),updated_at=now() where id=p_id and owner_id=p_actor returning id into tid;
 if tid is null then raise exception 'Template unavailable';end if;end if;return tid;
end $$;
create function public.v2_message_schedule_save(p_actor uuid,p_org uuid,p_subject text,p_body text,p_recipients jsonb,p_cadence text,p_next timestamptz,p_end timestamptz) returns uuid language plpgsql security invoker set search_path='' as $$
declare recipient text;sid uuid;
begin
 if not public.v2_message_admin(p_actor,p_org) then raise exception 'Administrator access required for this company';end if;
 if jsonb_typeof(p_recipients)<>'array' or jsonb_array_length(p_recipients) not between 1 and 200 then raise exception 'Select 1 to 200 recipients';end if;
 for recipient in select jsonb_array_elements_text(p_recipients) loop
  if not public.v2_message_contact(p_actor,p_org,recipient) then raise exception 'Recipient is outside your administrative scope: %',recipient;end if;
 end loop;
 if p_next<now()-interval '5 minutes' or p_next>now()+interval '1 year' or (p_cadence<>'once' and (p_end is null or p_end<=p_next or p_end>p_next+interval '1 year')) then raise exception 'Choose a future start and, for repeating messages, an end within one year';end if;
 if (select count(*) from public.v2_message_schedules where owner_id=p_actor and state='active')>=25 then raise exception 'Pause an existing schedule before adding another (25 active maximum)';end if;
 insert into public.v2_message_schedules(owner_id,organisation_id,subject,body,recipients,cadence,next_at,end_at) values(p_actor,p_org,trim(p_subject),trim(p_body),p_recipients,p_cadence,p_next,p_end) returning id into sid;return sid;
end $$;
create function public.v2_message_schedule_toggle(p_actor uuid,p_id uuid) returns void language plpgsql security invoker set search_path='' as $$
begin
 update public.v2_message_schedules set state=case when state='active' then 'paused' else 'active' end,next_at=greatest(next_at,now()),last_error=null
 where id=p_id and owner_id=p_actor and state in ('active','paused') and public.v2_message_admin(p_actor,organisation_id) and(end_at is null or end_at>now());
 if not found then raise exception 'Schedule unavailable or past its end date';end if;
end $$;
create function public.v2_message_schedule_tick() returns integer language plpgsql security invoker set search_path='' as $$
declare s public.v2_message_schedules;recipient text;done integer=0;next_time timestamptz;
begin
 for s in select * from public.v2_message_schedules where state='active' and next_at<=now() order by next_at limit 5 for update skip locked loop
  if s.end_at is not null and s.end_at<now() then update public.v2_message_schedules set state='complete' where id=s.id;continue;end if;
  begin
   if not public.v2_message_admin(s.owner_id,s.organisation_id) then raise exception 'Administrator access has changed';end if;
   for recipient in select distinct jsonb_array_elements_text(s.recipients) loop
    if not public.v2_message_contact(s.owner_id,s.organisation_id,recipient) then raise exception 'Recipient scope changed; review recipient list';end if;
    perform public.v2_message_send(s.owner_id,gen_random_uuid(),null,s.organisation_id,s.subject,s.body,recipient,null,'schedule:'||s.id||':'||s.sent_count||':'||recipient);
   end loop;
   next_time=case s.cadence when 'daily' then greatest(s.next_at+interval '1 day',now()+interval '1 day') when 'weekly' then greatest(s.next_at+interval '7 days',now()+interval '7 days') when 'monthly' then greatest(s.next_at+interval '1 month',now()+interval '1 month') else s.next_at end;
   update public.v2_message_schedules set state=case when s.cadence='once' or next_time>s.end_at then 'complete' else 'active' end,next_at=next_time,sent_count=sent_count+1,last_error=null where id=s.id;done=done+1;
  exception when others then update public.v2_message_schedules set state='paused',last_error='Sending paused. Check administrator access, recipients and limits before resuming.' where id=s.id;
  end;
 end loop;return done;
end $$;
create function public.v2_message_mail_claim(p_thread uuid default null) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 -- Stop retries after 23 hours: provider idempotency retention is 24 hours.
 update public.v2_message_deliveries d set state='expired' from public.v2_messages m where m.id=d.message_id and d.state in('queued','failed','sending') and m.created_at<now()-interval '23 hours';
 with picked as(select d.message_id,d.email from public.v2_message_deliveries d join public.v2_messages m on m.id=d.message_id where (p_thread is null or m.thread_id=p_thread) and d.next_at<=now() and d.attempts<8 and (d.state in('queued','failed') or(d.state='sending' and d.lease_at<now()-interval '10 minutes')) order by d.next_at limit 40 for update of d skip locked),
 claimed as(update public.v2_message_deliveries d set state='sending',lease_at=now(),attempts=attempts+1 from picked p where d.message_id=p.message_id and d.email=p.email returning d.*)
 select coalesce(jsonb_agg(jsonb_build_object('message_id',c.message_id,'email',c.email,'subject',t.subject,'body',m.body,'thread_id',t.id,'sender_email',m.sender_email,'attachment',m.attachment_name,'organisation_id',t.organisation_id)),'[]') into result from claimed c join public.v2_messages m on m.id=c.message_id join public.v2_message_threads t on t.id=m.thread_id;return result;
end $$;
create function public.v2_message_attachment(p_actor uuid,p_message uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('name',attachment_name,'mime',attachment_mime,'data',encode(attachment_data,'base64')) from public.v2_messages where id=p_message and attachment_data is not null and public.v2_message_access(p_actor,thread_id)
$$;

-- Never expose message bodies, attachments, addresses or privileged actor RPCs through the public Data API.
do $$ declare t text;f record;begin
 foreach t in array array['v2_message_threads','v2_message_participants','v2_messages','v2_message_deliveries','v2_message_templates','v2_message_schedules','v2_message_events'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop;
 for f in select oid::regprocedure sig from pg_proc where pronamespace='public'::regnamespace and proname like 'v2_message_%' loop
 execute format('revoke all on function %s from public,anon,authenticated',f.sig);
 execute format('grant execute on function %s to service_role',f.sig);
 end loop;
end $$;
grant usage,select on sequence public.v2_message_events_id_seq to service_role;
