-- Service-only email management. Learner and review invitation trackers stay separate.
create table public.v2_mail_messages (
 id uuid primary key default gen_random_uuid(), message_key text not null unique,
 organisation_id uuid references public.organisations, category text not null check(category in
 ('admin_invitation','company_invitation','account_recovery','account_confirmation','email_set','support','policy','payment','system')),
 source_id text, recipient text not null, subject text not null, created_at timestamptz not null default now(),
 followup_state text not null default 'open' check(followup_state in('open','waiting','done')),
 followup_note text not null default '' check(length(followup_note)<=2000),followup_due timestamptz,
 updated_by uuid references auth.users,resend_lease_at timestamptz
);
create index v2_mail_company_date on public.v2_mail_messages(organisation_id,created_at desc);
create index v2_mail_recipient on public.v2_mail_messages(recipient);
create table public.v2_mail_attempts (
 id uuid primary key default gen_random_uuid(),message_id uuid not null references public.v2_mail_messages,
 attempt_key text not null unique,created_at timestamptz not null default now(),actor_id uuid references auth.users,
 state text not null check(state in('sending','accepted','failed','unknown','queued','skipped')),
 provider_id text, error text,html text,body text,provider_observation text,checked_at timestamptz
);
create index v2_mail_attempt_message on public.v2_mail_attempts(message_id,created_at desc);
create index v2_mail_attempt_provider on public.v2_mail_attempts(provider_id) where provider_id is not null;
create table public.v2_mail_events (
 event_key text primary key,provider_id text not null,kind text not null check(kind in
 ('sent','delivered','delivery_delayed','opened','clicked','bounced','complained','failed','suppressed')),
 occurred_at timestamptz not null,received_at timestamptz not null default now()
);
create index v2_mail_event_provider on public.v2_mail_events(provider_id,occurred_at);
create table public.v2_mail_management_events (
 id uuid primary key default gen_random_uuid(),message_id uuid not null references public.v2_mail_messages,
 actor_id uuid not null references auth.users,action text not null,created_at timestamptz not null default now()
);
alter table public.v2_mail_messages enable row level security;
alter table public.v2_mail_attempts enable row level security;
alter table public.v2_mail_events enable row level security;
alter table public.v2_mail_management_events enable row level security;
revoke all on public.v2_mail_messages,public.v2_mail_attempts,public.v2_mail_events,public.v2_mail_management_events from public,anon,authenticated;
grant select,insert,update on public.v2_mail_messages,public.v2_mail_attempts,public.v2_mail_events,public.v2_mail_management_events to service_role;

create function public.v2_mail_access(p_actor uuid,p_org uuid,p_category text) returns boolean
language sql stable security invoker set search_path='' as $$
 select public.v2_message_email(p_actor) is not null and (
 public.v2_is_platform_principal(p_actor) or
 (p_category not in('policy','payment','system','account_recovery','account_confirmation','admin_invitation') and
 public.v2_message_admin(p_actor,coalesce(p_org,(select id from public.organisations where slug='apgi')))) or
 (p_category in('system','account_recovery','account_confirmation','admin_invitation') and
 exists(select 1 from public.user_roles where user_id=p_actor and role='admin')));
$$;
create function public.v2_mail_begin(p_key text,p_attempt text,p_org uuid,p_category text,p_source text,p_recipient text,p_subject text,p_actor uuid,p_html text,p_body text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare m uuid;a public.v2_mail_attempts;
begin
 if length(p_key)>300 or length(p_attempt)>300 or length(p_subject)>500 or length(p_recipient)>254 then raise exception 'Invalid email metadata';end if;
 insert into public.v2_mail_messages(message_key,organisation_id,category,source_id,recipient,subject)
 values(p_key,p_org,p_category,p_source,lower(p_recipient),p_subject)
 on conflict(message_key) do update set subject=excluded.subject
 where v2_mail_messages.recipient=excluded.recipient and v2_mail_messages.category=excluded.category and
 v2_mail_messages.organisation_id is not distinct from excluded.organisation_id returning id into m;
 if m is null then raise exception 'Email identity changed';end if;
 insert into public.v2_mail_attempts(message_id,attempt_key,actor_id,state,html,body)
 values(m,p_attempt,p_actor,'sending',case when p_category in('admin_invitation','company_invitation','account_recovery','account_confirmation','payment') then null else p_html end,
 case when p_category in('admin_invitation','company_invitation','account_recovery','account_confirmation','payment') then 'Private account link omitted. Resending generates a fresh email.' else p_body end)
 on conflict(attempt_key) do nothing;
 select * into a from public.v2_mail_attempts where attempt_key=p_attempt and message_id=m;
 if a.id is null then raise exception 'Email attempt identity changed';end if;
 return jsonb_build_object('id',a.id,'state',a.state,'provider_id',a.provider_id);
end $$;

-- Import existing metadata only; never copy private invitation or reset tokens.
insert into public.v2_mail_messages(message_key,organisation_id,category,source_id,recipient,subject,created_at)
select 'invitation:'||id,organisation_id,case when invited_role='admin' then 'admin_invitation' else 'company_invitation' end,id::text,lower(recipient_email),
case when invited_role='admin' then 'Your APGI administrator invitation' else 'Your company workspace invitation' end,created_at
from public.course_invitations where invited_role in('admin','business_owner');
insert into public.v2_mail_attempts(message_id,attempt_key,created_at,actor_id,state,provider_id,error)
select m.id,'legacy-invitation:'||e.id,e.occurred_at,e.actor_id,
case when e.event_type='sent' and e.metadata->>'provider_message_id' is not null then 'accepted' when e.event_type='failed' then 'failed' else 'unknown' end,
e.metadata->>'provider_message_id',case when e.event_type='failed' then 'Earlier delivery failed. Resend to try again.' end
from public.course_invitation_events e join public.v2_mail_messages m on m.category in('admin_invitation','company_invitation') and m.source_id=e.invitation_id::text where e.event_type in('sent','failed');
insert into public.v2_mail_messages(message_key,organisation_id,category,source_id,recipient,subject,created_at)
select 'email-set:'||q.id,s.organisation_id,'email_set',q.id::text,lower(q.recipient),coalesce(q.snapshot->'design'->>'subject','Saved email message'),q.created_at
from public.v2_email_outbox q join public.v2_email_entries e on e.id=q.entry_id join public.v2_email_sets s on s.id=e.set_id;
insert into public.v2_mail_attempts(message_id,attempt_key,created_at,state,provider_id,error)
select m.id,'email-set-'||q.id,q.created_at,case when q.state='accepted' then 'accepted' when q.state='failed' then 'failed' when q.state='sending' then 'unknown' when q.state='skipped' then 'skipped' else 'queued' end,q.provider_id,q.last_error
from public.v2_email_outbox q join public.v2_mail_messages m on m.message_key='email-set:'||q.id;
insert into public.v2_mail_messages(message_key,organisation_id,category,source_id,recipient,subject,created_at)
select 'support:'||d.message_id||':'||lower(d.email),t.organisation_id,'support',d.message_id::text,lower(d.email),t.subject,m.created_at
from public.v2_message_deliveries d join public.v2_messages m on m.id=d.message_id join public.v2_message_threads t on t.id=m.thread_id;
insert into public.v2_mail_attempts(message_id,attempt_key,created_at,state,provider_id)
select l.id,'legacy-support:'||d.message_id||':'||lower(d.email),l.created_at,case when d.state in('accepted','failed') then d.state when d.state='sending' then 'unknown' else 'queued' end,d.provider_id
from public.v2_message_deliveries d join public.v2_mail_messages l on l.message_key='support:'||d.message_id||':'||lower(d.email);
insert into public.v2_mail_messages(message_key,organisation_id,category,source_id,recipient,subject,created_at)
select 'policy:'||d.policy_id||':'||lower(d.recipient_email),p.organisation_id,'policy',d.policy_id::text,lower(d.recipient_email),'A policy is ready for your review',coalesce(d.attempted_at,now())
from public.policy_email_deliveries d join public.platform_policy_versions p on p.id=d.policy_id;
insert into public.v2_mail_attempts(message_id,attempt_key,created_at,state,provider_id)
select m.id,'legacy-policy:'||d.policy_id||':'||lower(d.recipient_email),coalesce(d.attempted_at,now()),case when d.status='sent' then 'accepted' when d.status='failed' then 'failed' else 'queued' end,d.provider_message_id
from public.policy_email_deliveries d join public.v2_mail_messages m on m.message_key='policy:'||d.policy_id||':'||lower(d.recipient_email);

create function public.v2_mail_workspace(p_actor uuid,p_search text default '',p_category text default '',p_state text default '',p_offset integer default 0,p_company uuid default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 if public.v2_message_email(p_actor) is null then raise exception 'Verify your account first';end if;
 insert into public.v2_mail_messages(message_key,organisation_id,category,source_id,recipient,subject,created_at)
 select 'invitation:'||id,organisation_id,case when invited_role='admin' then 'admin_invitation' else 'company_invitation' end,id::text,lower(recipient_email),
 case when invited_role='admin' then 'Your APGI administrator invitation' else 'Your company workspace invitation' end,created_at from public.course_invitations
 where invited_role in('admin','business_owner') and public.v2_mail_access(p_actor,organisation_id,case when invited_role='admin' then 'admin_invitation' else 'company_invitation' end)
 on conflict(message_key) do nothing;
 with records as (
 select m.id,m.organisation_id,o.name company,m.category,m.recipient,m.subject,m.created_at,m.source_id,
 m.followup_state,m.followup_note,m.followup_due,a.state,a.provider_id,a.created_at attempted_at,a.error,a.checked_at,
 (select count(*) from public.v2_mail_attempts where message_id=m.id) attempts,
 (select max(occurred_at) from public.v2_mail_events where provider_id=a.provider_id and kind='delivered') delivered_at,
 (select max(occurred_at) from public.v2_mail_events where provider_id=a.provider_id and kind='opened') opened_at,
 (select max(occurred_at) from public.v2_mail_events where provider_id=a.provider_id and kind='clicked') clicked_at,
 (select kind from (select kind,occurred_at from public.v2_mail_events where provider_id=a.provider_id union all select a.provider_observation,a.checked_at where a.provider_observation is not null) evidence order by
 case kind when 'suppressed' then 9 when 'complained' then 8 when 'bounced' then 7 when 'failed' then 6 when 'clicked' then 5 when 'opened' then 4 when 'delivered' then 3 when 'delivery_delayed' then 2 else 1 end desc,occurred_at desc limit 1) provider_event,
 i.redeemed_at accepted_at,i.status invitation_status,i.expires_at,
 d.read_at platform_read_at,
 case when m.category in('admin_invitation','company_invitation') then '/admin/invitations'
 when m.category='email_set' then '/messages/email-sets' when m.category='support' then '/messages/'||s.thread_id
 when m.category='policy' then '/policies/'||m.source_id else null end source_href
 from public.v2_mail_messages m left join public.organisations o on o.id=m.organisation_id
 left join lateral(select * from public.v2_mail_attempts where message_id=m.id order by created_at desc,id desc limit 1)a on true
 left join public.course_invitations i on m.category in('admin_invitation','company_invitation') and i.id::text=m.source_id
 left join public.v2_messages s on m.category='support' and s.id::text=m.source_id
 left join public.v2_message_deliveries d on d.message_id=s.id and lower(d.email)=m.recipient
 where public.v2_mail_access(p_actor,m.organisation_id,m.category)
 and (p_company is null or m.organisation_id=p_company)
 and (coalesce(p_search,'')='' or position(lower(p_search) in lower(m.recipient||' '||m.subject||' '||coalesce(o.name,'')))>0)
 and (coalesce(p_category,'')='' or m.category=p_category)
 and (coalesce(p_state,'')='' or m.followup_state=p_state)
 ), page as(select * from records order by created_at desc,id desc offset greatest(0,least(p_offset,100000)) limit 50)
 select jsonb_build_object('total',(select count(*) from records),'messages',coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'),
 'companies',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name)) from public.organisations where public.v2_message_admin(p_actor,id)),'[]')) into result;
 return result;
end $$;
create function public.v2_mail_detail(p_actor uuid,p_id uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare m public.v2_mail_messages;
begin
 select * into m from public.v2_mail_messages where id=p_id;
 if m.id is null or not coalesce(public.v2_mail_access(p_actor,m.organisation_id,m.category),false) then raise exception 'Email unavailable';end if;
 return jsonb_build_object('attempts',coalesce((select jsonb_agg(jsonb_build_object('id',id,'at',created_at,'state',state,'provider_id',provider_id,'error',error,'body',body) order by created_at desc) from public.v2_mail_attempts where message_id=p_id),'[]'),
 'events',coalesce((select jsonb_agg(jsonb_build_object('kind',e.kind,'at',e.occurred_at,'provider_id',e.provider_id) order by e.occurred_at desc) from public.v2_mail_events e where e.provider_id in(select provider_id from public.v2_mail_attempts where message_id=p_id)),'[]'),
 'followups',coalesce((select jsonb_agg(jsonb_build_object('action',action,'at',created_at) order by created_at desc) from public.v2_mail_management_events where message_id=p_id),'[]'));
end $$;
create function public.v2_mail_manage(p_actor uuid,p_id uuid,p_action text,p_note text default '',p_state text default 'open',p_due timestamptz default null) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare m public.v2_mail_messages;a public.v2_mail_attempts;
begin
 select * into m from public.v2_mail_messages where id=p_id for update;
 if m.id is null or not coalesce(public.v2_mail_access(p_actor,m.organisation_id,m.category),false) then raise exception 'Email unavailable';end if;
 if p_action='followup' then
 update public.v2_mail_messages set followup_state=p_state,followup_note=p_note,followup_due=p_due,updated_by=p_actor where id=p_id;
 insert into public.v2_mail_management_events(message_id,actor_id,action) values(p_id,p_actor,'followup:'||p_state);return '{}'::jsonb;
 elsif p_action='resend' then
 select * into a from public.v2_mail_attempts where message_id=p_id order by created_at desc,id desc limit 1;
 if m.resend_lease_at>now()-interval '1 minute' or a.created_at>now()-interval '1 minute' then raise exception 'Please wait one minute before resending';end if;
 if exists(select 1 from public.v2_mail_events where provider_id=a.provider_id and kind in('complained','suppressed','bounced')) then raise exception 'Delivery is blocked for this address. Resolve the delivery issue before resending';end if;
 if m.category in('admin_invitation','company_invitation') and not exists(select 1 from public.user_roles where user_id=p_actor and role='admin') then raise exception 'APGI administrator access is required to resend invitations';end if;
 if m.category='email_set' and not exists(select 1 from public.v2_email_outbox q join public.v2_email_entries e on e.id=q.entry_id where q.id::text=m.source_id and e.state in('active','complete') and public.v2_email_recipient(p_actor,m.organisation_id,m.recipient)
 and (not coalesce((q.snapshot->>'marketing')::boolean,false) or exists(select 1 from public.v2_email_preferences p join auth.users u on u.id=p.user_id where p.organisation_id=m.organisation_id and lower(u.email)=m.recipient and p.announcements))) then raise exception 'This email is paused, changed or the recipient is no longer eligible';end if;
 update public.v2_mail_messages set resend_lease_at=now() where id=p_id;
 insert into public.v2_mail_management_events(message_id,actor_id,action) values(p_id,p_actor,'resend_requested');
 return to_jsonb(m)||jsonb_build_object('html',a.html,'body',a.body);
 end if;raise exception 'Choose a valid email action';
end $$;
revoke all on function public.v2_mail_access(uuid,uuid,text),public.v2_mail_begin(text,text,uuid,text,text,text,text,uuid,text,text),public.v2_mail_workspace(uuid,text,text,text,integer,uuid),public.v2_mail_detail(uuid,uuid),public.v2_mail_manage(uuid,uuid,text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.v2_mail_access(uuid,uuid,text),public.v2_mail_begin(text,text,uuid,text,text,text,text,uuid,text,text),public.v2_mail_workspace(uuid,text,text,text,integer,uuid),public.v2_mail_detail(uuid,uuid),public.v2_mail_manage(uuid,uuid,text,text,text,timestamptz) to service_role;
