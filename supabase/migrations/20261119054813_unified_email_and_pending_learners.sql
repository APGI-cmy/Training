-- Add metadata-only invitation history. No outbound queue or source record is changed.
alter table public.v2_mail_messages drop constraint v2_mail_messages_category_check;
alter table public.v2_mail_messages add constraint v2_mail_messages_category_check check(category in
('admin_invitation','company_invitation','learner_invitation','review_invitation','review_notification','account_recovery','account_confirmation','email_set','support','policy','payment','system'));

create function public.v7_index_invitation(p_id uuid) returns void language plpgsql security invoker set search_path='' as $$
declare i public.course_invitations; m uuid; c text;
begin
 select * into i from public.course_invitations where id=p_id;
 if i.id is null then return;end if;
 c=case i.invited_role when 'admin' then 'admin_invitation' when 'business_owner' then 'company_invitation' else 'learner_invitation' end;
 insert into public.v2_mail_messages(message_key,organisation_id,category,source_id,recipient,subject,created_at)
 values('invitation:'||i.id,i.organisation_id,c,i.id::text,lower(i.recipient_email),case when c='learner_invitation' then 'Learner course invitation' when c='admin_invitation' then 'Administrator invitation' else 'Company workspace invitation' end,i.created_at)
 on conflict(message_key) do nothing;
 select id into m from public.v2_mail_messages where message_key='invitation:'||i.id;
 insert into public.v2_mail_attempts(message_id,attempt_key,created_at,actor_id,state,provider_id,error,body)
 select m,'legacy-invitation:'||e.id,e.occurred_at,e.actor_id,
 case when e.event_type='sent' and e.metadata->>'provider_message_id' is not null then 'accepted' when e.event_type='failed' then 'failed' else 'unknown' end,
 e.metadata->>'provider_message_id',case when e.event_type='failed' then 'Earlier invitation delivery failed. See its original audit record.' end,'Private invitation link omitted. Manage this invitation in its original workflow.'
 from public.course_invitation_events e where e.invitation_id=p_id and e.event_type in('sent','failed')
 and not exists(select 1 from public.v2_mail_attempts a where a.message_id=m and a.provider_id=e.metadata->>'provider_message_id')
 on conflict(attempt_key) do nothing;
end $$;

create function public.v7_index_review_mail(p_id uuid) returns void language plpgsql security invoker set search_path='' as $$
declare q public.course_review_mail; r public.course_review_rounds; m uuid;
begin
 select * into q from public.course_review_mail where id=p_id;
 if q.id is null then return;end if;
 select * into r from public.course_review_rounds where id=q.round_id;
 insert into public.v2_mail_messages(message_key,organisation_id,category,source_id,recipient,subject,created_at)
 values('review-mail:'||q.id,r.organisation_id,case when q.kind='invitation' then 'review_invitation' else 'review_notification' end,q.round_id::text,lower(q.recipient),q.subject,q.created_at)
 on conflict(message_key) do nothing;
 select id into m from public.v2_mail_messages where message_key='review-mail:'||q.id;
 if q.attempts=0 and q.state='queued' then return;end if;
 insert into public.v2_mail_attempts(message_id,attempt_key,created_at,state,provider_id,error,body)
 values(m,'review-mail:'||q.id,coalesce(q.sent_at,q.first_attempt_at,q.created_at),case q.state when 'sent' then 'accepted' when 'sending' then 'sending' when 'failed' then 'failed' when 'skipped' then 'skipped' else 'queued' end,q.provider_id,q.last_error,'Private review joining links omitted. See the related review workflow.')
 on conflict(attempt_key) do update set state=excluded.state,provider_id=excluded.provider_id,error=excluded.error,created_at=excluded.created_at;
end $$;

create function public.v7_invitation_mail_index_trigger() returns trigger language plpgsql security invoker set search_path='' as $$
begin perform public.v7_index_invitation(new.invitation_id);return new;end $$;
create trigger v7_invitation_email_history after insert on public.course_invitation_events for each row execute function public.v7_invitation_mail_index_trigger();
create function public.v7_review_mail_index_trigger() returns trigger language plpgsql security invoker set search_path='' as $$
begin perform public.v7_index_review_mail(new.id);return new;end $$;
create trigger v7_review_email_history after insert or update of state,provider_id,last_error,sent_at on public.course_review_mail for each row execute function public.v7_review_mail_index_trigger();

-- Retrospective indexing is idempotent and copies no token, body, HTML or join context.
do $$declare x record;begin
 for x in select id from public.course_invitations loop perform public.v7_index_invitation(x.id);end loop;
 for x in select id from public.course_review_mail loop perform public.v7_index_review_mail(x.id);end loop;
end $$;

create function public.v7_pending_learner_workspace(p_actor uuid,p_search text default '',p_offset integer default 0,p_company uuid default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 if public.v2_message_email(p_actor) is null then raise exception 'Verify your account first';end if;
 with eligible as (
 select i.id,i.organisation_id,o.name company,lower(i.recipient_email) email,i.course_id,g.name group_name,i.created_at,i.expires_at,i.status,
 (select e.metadata->>'provider_message_id' from public.course_invitation_events e where e.invitation_id=i.id and e.event_type='sent' order by e.occurred_at desc limit 1) provider_id
 from public.course_invitations i join public.organisations o on o.id=i.organisation_id left join public.learner_groups g on g.id=i.group_id
 where i.invited_role='learner' and i.status in('sent','pending') and i.expires_at>now() and i.redeemed_at is null
 and public.v2_message_admin(p_actor,i.organisation_id) and (p_company is null or i.organisation_id=p_company)
 and (coalesce(p_search,'')='' or position(lower(p_search) in lower(i.recipient_email||' '||o.name||' '||coalesce(i.metadata->>'company','')||' '||coalesce(g.name,'')))>0)
 and not exists(select 1 from public.profiles p join public.course_enrolments e on e.user_id=p.user_id where lower(p.email)=lower(i.recipient_email) and e.organisation_id=i.organisation_id and e.course_id=i.course_id and e.status='enrolled')
 ), records as (
 select organisation_id,company,email,min(created_at) invited_at,max(expires_at) expires_at,
 jsonb_agg(jsonb_build_object('invitationId',id,'courseId',course_id,'group',group_name,'status',status,'providerAccepted',provider_id is not null) order by created_at desc) invitations
 from eligible group by organisation_id,company,email
 ), page as(select * from records order by invited_at desc,email,organisation_id offset greatest(0,least(p_offset,100000)) limit 25)
 select jsonb_build_object('total',(select count(*) from records),'learners',coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'::jsonb)) into result;
 return result;
end $$;

revoke all on function public.v7_index_invitation(uuid),public.v7_index_review_mail(uuid),public.v7_invitation_mail_index_trigger(),public.v7_review_mail_index_trigger(),public.v7_pending_learner_workspace(uuid,text,integer,uuid) from public,anon,authenticated;
grant execute on function public.v7_index_invitation(uuid),public.v7_index_review_mail(uuid),public.v7_invitation_mail_index_trigger(),public.v7_review_mail_index_trigger(),public.v7_pending_learner_workspace(uuid,text,integer,uuid) to service_role;


create or replace function public.v2_mail_begin(p_key text,p_attempt text,p_org uuid,p_category text,p_source text,p_recipient text,p_subject text,p_actor uuid,p_html text,p_body text)
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
 values(m,p_attempt,p_actor,'sending',case when p_category in('admin_invitation','company_invitation','learner_invitation','review_invitation','review_notification','account_recovery','account_confirmation','payment') or p_key like 'independent-review:%' then null else p_html end,
 case when p_category in('admin_invitation','company_invitation','learner_invitation','review_invitation','review_notification','account_recovery','account_confirmation','payment') or p_key like 'independent-review:%' then 'Private account link omitted. Resending generates a fresh email.' else p_body end)
 on conflict(attempt_key) do nothing;
 select * into a from public.v2_mail_attempts where attempt_key=p_attempt and message_id=m;
 if a.id is null then raise exception 'Email attempt identity changed';end if;
 return jsonb_build_object('id',a.id,'state',a.state,'provider_id',a.provider_id);
end $$;

create or replace function public.v2_mail_workspace(p_actor uuid,p_search text default '',p_category text default '',p_state text default '',p_offset integer default 0,p_company uuid default null)
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
 select m.id,m.organisation_id,o.name company,case when m.message_key like 'independent-review:%' then 'review_notification' else m.category end category,m.recipient,m.subject,m.created_at,m.source_id,
 m.followup_state,m.followup_note,m.followup_due,a.state,a.provider_id,a.created_at attempted_at,a.error,a.checked_at,
 (select count(*) from public.v2_mail_attempts where message_id=m.id) attempts,
 (select max(occurred_at) from public.v2_mail_events where provider_id=a.provider_id and kind='delivered') delivered_at,
 (select max(occurred_at) from public.v2_mail_events where provider_id=a.provider_id and kind='opened') opened_at,
 (select max(occurred_at) from public.v2_mail_events where provider_id=a.provider_id and kind='clicked') clicked_at,
 (select kind from (select kind,occurred_at from public.v2_mail_events where provider_id=a.provider_id union all select a.provider_observation,a.checked_at where a.provider_observation is not null) evidence order by
 case kind when 'suppressed' then 9 when 'complained' then 8 when 'bounced' then 7 when 'failed' then 6 when 'clicked' then 5 when 'opened' then 4 when 'delivered' then 3 when 'delivery_delayed' then 2 else 1 end desc,occurred_at desc limit 1) provider_event,
 i.redeemed_at accepted_at,i.status invitation_status,i.expires_at,i.course_id,
 d.read_at platform_read_at,
 case when m.message_key like 'independent-review:%' then '/review-requests/'||m.source_id when m.category in('review_invitation','review_notification') then '/course-reviews/'||m.source_id||'#review-team' when m.category in('admin_invitation','company_invitation','learner_invitation') then '/admin/invitations'
 when m.category='email_set' then '/messages/email-sets' when m.category='support' then '/messages/'||s.thread_id
 when m.category='policy' then '/policies/'||m.source_id else null end source_href
 from public.v2_mail_messages m left join public.organisations o on o.id=m.organisation_id
 left join lateral(select * from public.v2_mail_attempts where message_id=m.id order by created_at desc,id desc limit 1)a on true
 left join public.course_invitations i on m.category in('admin_invitation','company_invitation','learner_invitation') and i.id::text=m.source_id
 left join public.v2_messages s on m.category='support' and s.id::text=m.source_id
 left join public.v2_message_deliveries d on d.message_id=s.id and lower(d.email)=m.recipient
 where public.v2_mail_access(p_actor,m.organisation_id,m.category)
 and (p_company is null or m.organisation_id=p_company)
 and (coalesce(p_search,'')='' or position(lower(p_search) in lower(m.recipient||' '||m.subject||' '||coalesce(o.name,'')||' '||replace(coalesce(i.course_id,''),'-',' ')))>0)
 and (coalesce(p_category,'')='' or case when m.message_key like 'independent-review:%' then 'review_notification' else m.category end=p_category)
 and (coalesce(p_state,'')='' or m.followup_state=p_state)
 ), page as(select * from records order by created_at desc,id desc offset greatest(0,least(p_offset,100000)) limit 50)
 select jsonb_build_object('total',(select count(*) from records),'messages',coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'),
 'companies',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name)) from public.organisations where public.v2_message_admin(p_actor,id)),'[]')) into result;
 return result;
end $$;

create or replace function public.v2_mail_detail(p_actor uuid,p_id uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare m public.v2_mail_messages;
begin
 select * into m from public.v2_mail_messages where id=p_id;
 if m.id is null or not coalesce(public.v2_mail_access(p_actor,m.organisation_id,m.category),false) then raise exception 'Email unavailable';end if;
 return jsonb_build_object('attempts',coalesce((select jsonb_agg(jsonb_build_object('id',id,'at',created_at,'state',state,'provider_id',provider_id,'error',error,'body',case when m.category in('learner_invitation','review_invitation','review_notification') or m.message_key like 'independent-review:%' then 'Private invitation links omitted. See the original workflow.' else body end) order by created_at desc) from public.v2_mail_attempts where message_id=p_id),'[]'),
 'events',coalesce((select jsonb_agg(jsonb_build_object('kind',e.kind,'at',e.occurred_at,'provider_id',e.provider_id) order by e.occurred_at desc) from public.v2_mail_events e where e.provider_id in(select provider_id from public.v2_mail_attempts where message_id=p_id)),'[]'),
 'followups',coalesce((select jsonb_agg(jsonb_build_object('action',action,'at',created_at) order by created_at desc) from public.v2_mail_management_events where message_id=p_id),'[]'));
end $$;

create or replace function public.v2_mail_manage(p_actor uuid,p_id uuid,p_action text,p_note text default '',p_state text default 'open',p_due timestamptz default null) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare m public.v2_mail_messages;a public.v2_mail_attempts;
begin
 select * into m from public.v2_mail_messages where id=p_id for update;
 if m.id is null or not coalesce(public.v2_mail_access(p_actor,m.organisation_id,m.category),false) then raise exception 'Email unavailable';end if;
 if p_action='followup' then
 update public.v2_mail_messages set followup_state=p_state,followup_note=p_note,followup_due=p_due,updated_by=p_actor where id=p_id;
 insert into public.v2_mail_management_events(message_id,actor_id,action) values(p_id,p_actor,'followup:'||p_state);return '{}'::jsonb;
 elsif p_action='resend' then
 if m.category in('review_invitation','review_notification') or m.message_key like 'independent-review:%' then raise exception 'Manage review resends in the related review workflow';end if;
 select * into a from public.v2_mail_attempts where message_id=p_id order by created_at desc,id desc limit 1;
 if m.resend_lease_at>now()-interval '1 minute' or a.created_at>now()-interval '1 minute' then raise exception 'Please wait one minute before resending';end if;
 if exists(select 1 from public.v2_mail_events where provider_id=a.provider_id and kind in('complained','suppressed','bounced')) then raise exception 'Delivery is blocked for this address. Resolve the delivery issue before resending';end if;
 if m.category in('admin_invitation','company_invitation','learner_invitation') and not exists(select 1 from public.user_roles where user_id=p_actor and role='admin') then raise exception 'APGI administrator access is required to resend invitations';end if;
 if m.category='email_set' and not exists(select 1 from public.v2_email_outbox q join public.v2_email_entries e on e.id=q.entry_id where q.id::text=m.source_id and e.state in('active','complete') and public.v2_email_recipient(p_actor,m.organisation_id,m.recipient)
 and (not coalesce((q.snapshot->>'marketing')::boolean,false) or exists(select 1 from public.v2_email_preferences p join auth.users u on u.id=p.user_id where p.organisation_id=m.organisation_id and lower(u.email)=m.recipient and p.announcements))) then raise exception 'This email is paused, changed or the recipient is no longer eligible';end if;
 update public.v2_mail_messages set resend_lease_at=now() where id=p_id;
 insert into public.v2_mail_management_events(message_id,actor_id,action) values(p_id,p_actor,'resend_requested');
 return to_jsonb(m)||jsonb_build_object('html',a.html,'body',a.body);
 end if;raise exception 'Choose a valid email action';
end $$;
