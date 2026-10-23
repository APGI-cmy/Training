-- Company-owned email sets. Only the verified server can invoke these RPCs.
create table public.v2_email_sets (
 id uuid primary key default gen_random_uuid(),organisation_id uuid not null references public.organisations,
 name text not null check(length(name) between 1 and 100),policy_notes text not null default '' check(length(policy_notes)<=4000),
 created_by uuid not null references auth.users,updated_by uuid not null references auth.users,
 revision integer not null default 1,updated_at timestamptz not null default now()
);
create index v2_email_sets_company on public.v2_email_sets(organisation_id);
create table public.v2_email_entries (
 id uuid primary key default gen_random_uuid(),set_id uuid not null references public.v2_email_sets,
 name text not null check(length(name) between 1 and 100),design jsonb not null,rule jsonb not null,
 state text not null default 'draft' check(state in('draft','active','paused','complete')),
 revision integer not null default 1,activated_at timestamptz,next_at timestamptz,tick integer not null default 0,
 last_error text,updated_at timestamptz not null default now()
);
create index v2_email_entries_set on public.v2_email_entries(set_id);
create table public.v2_email_event_log (
 id uuid primary key default gen_random_uuid(),event_key text not null unique,
 organisation_id uuid not null references public.organisations,course_id text not null,
 kind text not null,recipient text,context jsonb not null default '{}',created_at timestamptz not null default now()
);
create index v2_email_event_match on public.v2_email_event_log(organisation_id,kind,created_at);
create table public.v2_email_outbox (
 id uuid primary key default gen_random_uuid(),entry_id uuid not null references public.v2_email_entries,
 revision integer not null,event_key text not null,recipient text not null,snapshot jsonb not null,
 state text not null default 'queued' check(state in('queued','sending','accepted','failed','expired','suppressed')),
 created_at timestamptz not null default now(),next_at timestamptz not null default now(),lease_at timestamptz,
 attempts integer not null default 0,provider_id text,last_error text,unique(entry_id,event_key,recipient)
);
create index v2_email_outbox_due on public.v2_email_outbox(state,next_at);
create table public.v2_email_preferences (
 user_id uuid not null references auth.users,organisation_id uuid not null references public.organisations,
 announcements boolean not null default false,updated_at timestamptz not null default now(),primary key(user_id,organisation_id)
);
do $$declare t text;begin foreach t in array array['v2_email_sets','v2_email_entries','v2_email_event_log','v2_email_outbox','v2_email_preferences'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant all on public.%I to service_role',t);
end loop;end $$;

create function public.v2_email_recipient(p_actor uuid,p_org uuid,p_email text) returns boolean language sql stable security invoker set search_path='' as $$
 select public.v2_message_admin(p_actor,p_org) and (
 public.v2_message_contact(p_actor,p_org,lower(p_email)) or exists(
 select 1 from public.course_review_rounds r cross join lateral jsonb_array_elements(r.document->'participants') p
 where r.organisation_id=p_org and r.status<>'cancelled' and lower(p->>'email')=lower(p_email) and p->>'state'<>'declined'));
$$;
create function public.v2_email_workspace(p_actor uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 if public.v2_message_email(p_actor) is null then raise exception 'Verify your account first';end if;
 return jsonb_build_object(
 'companies',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'slug',slug,'logo_path',logo_path,'primary_color',primary_color) order by name) from public.organisations where public.v2_message_admin(p_actor,id)),'[]'),
 'sets',coalesce((select jsonb_agg(to_jsonb(s) order by s.name) from public.v2_email_sets s where public.v2_message_admin(p_actor,s.organisation_id)),'[]'),
 'entries',coalesce((select jsonb_agg(to_jsonb(e) order by e.name) from public.v2_email_entries e join public.v2_email_sets s on s.id=e.set_id where public.v2_message_admin(p_actor,s.organisation_id)),'[]'),
 'groups',coalesce((select jsonb_agg(jsonb_build_object('id',id,'organisation_id',organisation_id,'name',name)) from public.learner_groups where public.v2_message_admin(p_actor,organisation_id)),'[]'),
 'contacts',coalesce((select jsonb_agg(x) from(select distinct lower(u.email) email,o.id organisation_id from public.organisations o join auth.users u on u.email_confirmed_at is not null where public.v2_message_contact(p_actor,o.id,lower(u.email)))x),'[]'),
 'activity',coalesce((select jsonb_agg(x) from(select q.id,q.entry_id,q.recipient,q.state,q.created_at,q.last_error from public.v2_email_outbox q join public.v2_email_entries e on e.id=q.entry_id join public.v2_email_sets s on s.id=e.set_id where public.v2_message_admin(p_actor,s.organisation_id) order by q.created_at desc limit 100)x),'[]'),
 'review_requests',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'organisation_id',r.organisation_id,'course_id',r.course_id,'title',r.document->>'title','status',r.status,'cutoff',r.document->>'cutoff','participants',r.document->'participants','mail',coalesce((select jsonb_agg(jsonb_build_object('recipient',m.recipient,'kind',m.kind,'subject',m.subject,'state',m.state,'created_at',m.created_at) order by m.created_at desc) from public.course_review_mail m where m.round_id=r.id and m.kind='invitation'),'[]'))) from public.course_review_rounds r where public.v2_message_admin(p_actor,r.organisation_id)),'[]'));
end $$;
create function public.v2_email_set_save(p_actor uuid,p_id uuid,p_org uuid,p_revision integer,p_name text,p_policy text) returns uuid language plpgsql security invoker set search_path='' as $$
declare result uuid;
begin
 if not public.v2_message_admin(p_actor,p_org) then raise exception 'Administrator access required for this company';end if;
 if p_id is null then insert into public.v2_email_sets(organisation_id,name,policy_notes,created_by,updated_by) values(p_org,trim(p_name),p_policy,p_actor,p_actor) returning id into result;
 else update public.v2_email_sets set name=trim(p_name),policy_notes=p_policy,updated_by=p_actor,updated_at=now(),revision=revision+1 where id=p_id and organisation_id=p_org and revision=p_revision returning id into result;
 if result is null then raise exception 'This set changed. Reload before saving.';end if;end if;
 insert into public.v2_message_events(actor_id,action) values(p_actor,'email_set_saved:'||result);return result;
end $$;
create function public.v2_email_entry_save(p_actor uuid,p_id uuid,p_set uuid,p_revision integer,p_name text,p_design jsonb,p_rule jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
declare org uuid;result uuid;recipient text;k text;
begin
 select organisation_id into org from public.v2_email_sets where id=p_set for update;
 if not coalesce(public.v2_message_admin(p_actor,org),false) then raise exception 'Administrator access required for this company';end if;
 if jsonb_typeof(p_design)<>'object' or jsonb_typeof(p_rule)<>'object' then raise exception 'Choose a valid message';end if;
 foreach k in array array['subject','heading','body','button'] loop if coalesce(length(trim(p_design->>k)),0)<1 or length(p_design->>k)>(case when k='body' then 20000 when k='button' then 80 else 200 end) then raise exception 'Check subject, heading, message and button text';end if;end loop;
 if p_design->>'subject' ~ '[\r\n]' or not coalesce(p_design->>'destination' in('course','review','messages','catalogue'),false) or not coalesce(p_design->>'image' in('none','course') or p_design->>'image' ~ '^https://[^[:space:]]+$',false) then raise exception 'Choose safe platform links and graphics';end if;
 if not coalesce(p_rule->>'trigger' in('schedule','enrolment','completion','deadline','group_complete','new_course','review_complete','review_published'),false) or not coalesce(p_rule->>'cadence' in('once','daily','weekly','monthly','yearly'),false) or not coalesce(p_rule->>'audience' in('selected','enrolled','group','reviewers','members','admins'),false) then raise exception 'Choose a valid trigger, audience and repeat cycle';end if;
 if coalesce(p_rule->>'course_id','')<>'' and not exists(select 1 from public.courses where id=p_rule->>'course_id') then raise exception 'Choose a saved course';end if;
 if p_rule->>'trigger' not in('schedule','new_course') and coalesce(p_rule->>'course_id','')='' then raise exception 'Choose the course for this trigger';end if;
 if coalesce(p_rule->>'group_id','')<>'' and not exists(select 1 from public.learner_groups where id=(p_rule->>'group_id')::uuid and organisation_id=org) then raise exception 'The group belongs to another company';end if;
 if not coalesce(jsonb_typeof(p_rule->'recipients')='array',false) or jsonb_array_length(p_rule->'recipients')>200 then raise exception 'Choose up to 200 recipients';end if;
 for recipient in select jsonb_array_elements_text(p_rule->'recipients') loop if not public.v2_email_recipient(p_actor,org,recipient) then raise exception 'A recipient is outside this company scope';end if;end loop;
 if p_rule->>'trigger' in('review_complete','review_published') and p_rule->>'audience'<>'reviewers' then raise exception 'Review messages must target the assigned reviewers';end if;
 if p_rule->>'trigger' in('enrolment','completion','deadline') and p_rule->>'audience' not in('enrolled','group') then raise exception 'This trigger targets enrolled learners or an enrolled group';end if;
 if p_rule->>'trigger'='group_complete' and p_rule->>'audience' not in('admins','selected') then raise exception 'Group summaries target company administrators or selected contacts';end if;
 if coalesce(p_rule->>'start_at','')<>'' then perform (p_rule->>'start_at')::timestamptz;end if;
 if coalesce(p_rule->>'end_at','')<>'' then
  if (p_rule->>'end_at')::timestamptz<=coalesce(nullif(p_rule->>'start_at','')::timestamptz,now()) or (p_rule->>'end_at')::timestamptz>now()+interval '5 years' then raise exception 'Choose an end after the start, within five years';end if;
 end if;
 if p_rule->>'trigger' not in('schedule','deadline') and p_rule->>'cadence'<>'once' then raise exception 'Event messages send once per matching event';end if;
 if p_rule->>'trigger'='schedule' and p_rule->>'cadence'<>'once' and coalesce(p_rule->>'end_at','')='' then raise exception 'Repeating schedules need an end date';end if;
 if p_rule->>'trigger'='deadline' then
  if coalesce(p_rule->>'deadline_at','')='' or (p_rule->>'deadline_at')::timestamptz<=now() or (p_rule->>'days_before')::integer not between 1 and 365 then raise exception 'Choose a future course deadline and 1–365 days notice';end if;
 end if;
 if p_rule->>'trigger'='new_course' and not coalesce((p_rule->>'marketing')::boolean,false) then raise exception 'New course announcements use marketing preferences';end if;
 if p_id is null then insert into public.v2_email_entries(set_id,name,design,rule) values(p_set,trim(p_name),p_design,p_rule) returning id into result;
 else update public.v2_email_entries set name=trim(p_name),design=p_design,rule=p_rule,state='draft',next_at=null,revision=revision+1,last_error=null,updated_at=now() where id=p_id and set_id=p_set and revision=p_revision returning id into result;
 if result is null then raise exception 'This message changed. Reload before saving.';end if;
 update public.v2_email_outbox set state='suppressed',last_error='Message edited; preview and activate the new version.' where entry_id=result and state in('queued','failed');end if;
 insert into public.v2_message_events(actor_id,action) values(p_actor,'email_draft_saved:'||result);return result;
end $$;
create function public.v2_email_entry_state(p_actor uuid,p_id uuid,p_revision integer,p_state text) returns void language plpgsql security invoker set search_path='' as $$
declare e public.v2_email_entries;org uuid;
begin
 select * into e from public.v2_email_entries where id=p_id for update;
 select organisation_id into org from public.v2_email_sets where id=e.set_id;
 if not coalesce(public.v2_message_admin(p_actor,org),false) or e.revision<>p_revision then raise exception 'Message unavailable or changed. Reload first.';end if;
 if p_state not in('active','paused') then raise exception 'Choose activate or pause';end if;
 if p_state='active' then
  if not coalesce((e.rule->>'policy_confirmed')::boolean,false) then raise exception 'Confirm company policy and recipient permissions before activation';end if;
  if (e.rule->>'audience'='group' or e.rule->>'trigger'='group_complete') and coalesce(e.rule->>'group_id','')='' then raise exception 'Choose an enrolled group';end if;
  if e.rule->>'audience'='selected' and jsonb_array_length(e.rule->'recipients')=0 then raise exception 'Choose at least one company contact';end if;
  if e.state='complete' then raise exception 'This schedule is complete. Add another message to send again.';end if;
  if nullif(e.rule->>'end_at','')::timestamptz<now() or (e.rule->>'trigger'='deadline' and (e.rule->>'deadline_at')::timestamptz<now()) then raise exception 'This message is past its end or deadline';end if;
  if (select count(*) from public.v2_email_entries m join public.v2_email_sets s on s.id=m.set_id where s.organisation_id=org and m.state='active' and m.id<>p_id)>=25 then raise exception 'Pause an existing message first (25 active per company)';end if;
 end if;
 update public.v2_email_entries set state=p_state,activated_at=case when e.state='draft' then now() else coalesce(e.activated_at,now()) end,next_at=case when e.state='draft' then greatest(coalesce(nullif(e.rule->>'start_at','')::timestamptz,now()),now()) else greatest(coalesce(e.next_at,now()),now()) end,last_error=null where id=p_id;
 insert into public.v2_message_events(actor_id,action) values(p_actor,'email_'||p_state||':'||p_id);
end $$;

-- Record future events only. Installing the feature does not mail historical learners.
-- The private trigger may write the service-only log when learner progress uses
-- an authenticated connection. It cannot be called through the public API.
create schema if not exists private;
create function private.v2_email_record_event() returns trigger language plpgsql security definer set search_path='' as $$
declare enrol record;p jsonb;v jsonb;key text;
begin
 if tg_table_name='completion_states' then
  if new.status='completed' and (tg_op='INSERT' or old.status is distinct from new.status) then
   for enrol in select e.organisation_id,u.email from public.course_enrolments e join auth.users u on u.id=e.user_id where e.user_id=new.user_id and e.course_id=new.course_id and e.status='enrolled' and e.organisation_id is not null loop
    insert into public.v2_email_event_log(event_key,organisation_id,course_id,kind,recipient) values('completion:'||new.id||':'||enrol.organisation_id,enrol.organisation_id,new.course_id,'completion',lower(enrol.email)) on conflict do nothing;
   end loop;
  end if;
 elsif tg_table_name='course_enrolments' then
  if new.status='enrolled' and new.organisation_id is not null and (tg_op='INSERT' or old.status is distinct from new.status) then
   insert into public.v2_email_event_log(event_key,organisation_id,course_id,kind,recipient) select 'enrolment:'||new.id,new.organisation_id,new.course_id,'enrolment',lower(email) from auth.users where id=new.user_id on conflict do nothing;
  end if;
 elsif tg_table_name='course_review_rounds' then
  for p in select value from jsonb_array_elements(coalesce(new.document->'reports','[]')) loop
   if tg_op='INSERT' or not coalesce(old.document->'reports','[]') @> jsonb_build_array(p) then
    insert into public.v2_email_event_log(event_key,organisation_id,course_id,kind,recipient,context) values('report:'||new.id||':'||(p->>'id'),new.organisation_id,new.course_id,'review_complete',lower(p->>'email'),jsonb_build_object('review_id',new.id,'review_scope','content')) on conflict do nothing;
   end if;
  end loop;
  for p in select value from jsonb_array_elements(coalesce(new.document->'taskDecisions','[]')) loop
   if tg_op='INSERT' or not coalesce(old.document->'taskDecisions','[]') @> jsonb_build_array(p) then
    insert into public.v2_email_event_log(event_key,organisation_id,course_id,kind,recipient,context) values('decision:'||new.id||':'||md5(p::text),new.organisation_id,new.course_id,'review_complete',lower(p->>'email'),jsonb_build_object('review_id',new.id,'review_scope',p->>'task')) on conflict do nothing;
   end if;
  end loop;
 elsif tg_table_name='organisation_offerings' then
  if new.status='published' and new.reviewed_release_id is not null and (tg_op='INSERT' or old.status is distinct from new.status or old.reviewed_release_id is distinct from new.reviewed_release_id) then
   if exists(select 1 from public.course_review_rounds where id=new.reviewed_release_id and status='published') then
    insert into public.v2_email_event_log(event_key,organisation_id,course_id,kind,context) values('published:'||new.reviewed_release_id,new.organisation_id,new.course_id,'new_course',jsonb_build_object('review_id',new.reviewed_release_id)) on conflict do nothing;
    for p in select value from public.course_review_rounds r cross join lateral jsonb_array_elements(r.document->'participants') where r.id=new.reviewed_release_id and value->>'state'<>'declined' loop
     insert into public.v2_email_event_log(event_key,organisation_id,course_id,kind,recipient,context) values('review-published:'||new.reviewed_release_id||':'||(p->>'email'),new.organisation_id,new.course_id,'review_published',lower(p->>'email'),jsonb_build_object('review_id',new.reviewed_release_id,'review_scope',coalesce(p->'tasks',jsonb_build_array(p->>'scope')))) on conflict do nothing;
    end loop;
   end if;
  end if;
 end if;return new;
end $$;
revoke all on function private.v2_email_record_event() from public,anon,authenticated;
create trigger v2_email_completion_event after insert or update on public.completion_states for each row execute function private.v2_email_record_event();
create trigger v2_email_enrolment_event after insert or update on public.course_enrolments for each row execute function private.v2_email_record_event();
create trigger v2_email_review_event after insert or update on public.course_review_rounds for each row execute function private.v2_email_record_event();
create trigger v2_email_publication_event after insert or update on public.organisation_offerings for each row execute function private.v2_email_record_event();

create function public.v2_email_targets(p_entry uuid,p_course text,p_recipient text default null) returns table(email text,context jsonb) language sql stable security invoker set search_path='' as $$
 with setting as(select e.*,s.organisation_id,s.updated_by,o.name company_name from public.v2_email_entries e join public.v2_email_sets s on s.id=e.set_id join public.organisations o on o.id=s.organisation_id where e.id=p_entry),
 people as(
 select lower(u.email) email,u.id user_id,coalesce(nullif(u.raw_user_meta_data->>'full_name',''),split_part(u.email,'@',1)) recipient_name from auth.users u,setting s where u.email_confirmed_at is not null and public.v2_email_recipient(s.updated_by,s.organisation_id,lower(u.email))
 union select lower(p->>'email'),null::uuid,split_part(p->>'email','@',1) from setting s join public.course_review_rounds r on r.organisation_id=s.organisation_id cross join lateral jsonb_array_elements(r.document->'participants') p where p->>'state'<>'declined' and r.course_id=p_course and not exists(select 1 from auth.users u where lower(u.email)=lower(p->>'email') and u.email_confirmed_at is not null)
 )
 select distinct p.email,jsonb_build_object('recipient_name',p.recipient_name,'company_name',s.company_name,'course_id',p_course,'course_title',coalesce((select title from public.courses where id=p_course),'your course'),'group_name',coalesce((select name from public.learner_groups where id=nullif(s.rule->>'group_id','')::uuid),''),'progress_percent',coalesce((select progress_percent::text from public.completion_states where user_id=p.user_id and course_id=p_course),'0'),'deadline',coalesce(s.rule->>'deadline_at',''),'days_left',case when nullif(s.rule->>'deadline_at','') is not null then ceil(extract(epoch from ((s.rule->>'deadline_at')::timestamptz-now()))/86400)::text else '' end,'enrolled_count',(select count(*)::text from public.course_enrolments x where x.organisation_id=s.organisation_id and x.course_id=p_course and x.status='enrolled' and (coalesce(s.rule->>'group_id','')='' or x.group_id=nullif(s.rule->>'group_id','')::uuid)),'completed_count',(select count(*)::text from public.course_enrolments x join public.completion_states c on c.user_id=x.user_id and c.course_id=x.course_id and c.status='completed' where x.organisation_id=s.organisation_id and x.course_id=p_course and x.status='enrolled' and (coalesce(s.rule->>'group_id','')='' or x.group_id=nullif(s.rule->>'group_id','')::uuid)))
 from people p cross join setting s where (p_recipient is null or p.email=p_recipient) and
 case s.rule->>'audience'
 when 'selected' then s.rule->'recipients' ? p.email
 when 'members' then public.v2_message_member(p.user_id,s.organisation_id)
 when 'admins' then public.v2_message_admin(p.user_id,s.organisation_id)
 when 'reviewers' then exists(select 1 from public.course_review_rounds r cross join lateral jsonb_array_elements(r.document->'participants') person where r.organisation_id=s.organisation_id and r.course_id=p_course and r.status<>'cancelled' and lower(person->>'email')=p.email and person->>'state'<>'declined')
 else exists(select 1 from public.course_enrolments x where x.user_id=p.user_id and x.organisation_id=s.organisation_id and x.course_id=p_course and x.status='enrolled' and (s.rule->>'audience'<>'group' or x.group_id=nullif(s.rule->>'group_id','')::uuid)) end
 and (not coalesce((s.rule->>'first_time_only')::boolean,false) or not exists(select 1 from public.course_enrolments x where x.user_id=p.user_id and x.organisation_id=s.organisation_id))
 and (not coalesce((s.rule->>'marketing')::boolean,false) or exists(select 1 from public.v2_email_preferences pref where pref.user_id=p.user_id and pref.organisation_id=s.organisation_id and pref.announcements))
 and (s.rule->>'trigger'<>'deadline' or not exists(select 1 from public.completion_states c where c.user_id=p.user_id and c.course_id=p_course and c.status='completed'));
$$;

create function public.v2_email_queue() returns integer language plpgsql security invoker set search_path='' as $$
declare e record;ev record;person record;org record;due timestamptz;n integer;total integer=0;context jsonb;deadline timestamptz;
begin
 for e in select m.*,s.organisation_id,s.updated_by from public.v2_email_entries m join public.v2_email_sets s on s.id=m.set_id where m.state='active' order by m.next_at limit 100 for update of m skip locked loop
  begin
   if not public.v2_message_admin(e.updated_by,e.organisation_id) then update public.v2_email_entries set state='paused',last_error='Company administrator access changed.' where id=e.id;continue;end if;
   if nullif(e.rule->>'end_at','')::timestamptz<now() then update public.v2_email_entries set state='complete' where id=e.id;continue;end if;
   if coalesce(nullif(e.rule->>'start_at','')::timestamptz,e.activated_at)>now() then continue;end if;
   select name,logo_path,primary_color into org from public.organisations where id=e.organisation_id;
   for ev in
    select l.event_key,l.course_id,l.recipient,l.context from public.v2_email_event_log l where l.organisation_id=e.organisation_id and l.kind=e.rule->>'trigger' and l.created_at>=e.activated_at and l.created_at>=coalesce(nullif(e.rule->>'start_at','')::timestamptz,e.activated_at) and (coalesce(e.rule->>'course_id','')='' or l.course_id=e.rule->>'course_id')
    union all
    select 'schedule:'||e.tick,e.rule->>'course_id',null::text,'{}'::jsonb where e.rule->>'trigger'='schedule' and e.next_at<=now()
    union all
    select case when e.rule->>'cadence'='once' then 'deadline:'||(e.rule->>'deadline_at') else 'deadline:'||(e.rule->>'deadline_at')||':'||e.tick end,e.rule->>'course_id',null::text,'{}'::jsonb where e.rule->>'trigger'='deadline' and e.next_at<=now() and now()>=(e.rule->>'deadline_at')::timestamptz-make_interval(days=>(e.rule->>'days_before')::integer) and now()<(e.rule->>'deadline_at')::timestamptz
    union all
    select 'group:'||(e.rule->>'group_id')||':'||(e.rule->>'course_id'),e.rule->>'course_id',null::text,'{}'::jsonb where e.rule->>'trigger'='group_complete' and exists(select 1 from public.course_enrolments x where x.group_id=nullif(e.rule->>'group_id','')::uuid and x.course_id=e.rule->>'course_id' and x.status='enrolled') and not exists(select 1 from public.course_enrolments x where x.group_id=nullif(e.rule->>'group_id','')::uuid and x.course_id=e.rule->>'course_id' and x.status='enrolled' and not exists(select 1 from public.completion_states c where c.user_id=x.user_id and c.course_id=x.course_id and c.status='completed')) and exists(select 1 from public.course_enrolments x join public.completion_states c on c.user_id=x.user_id and c.course_id=x.course_id where x.group_id=nullif(e.rule->>'group_id','')::uuid and x.course_id=e.rule->>'course_id' and c.completed_at>=e.activated_at)
   loop
    for person in select * from public.v2_email_targets(e.id,ev.course_id,ev.recipient) loop
     context=person.context||ev.context;
     insert into public.v2_email_outbox(entry_id,revision,event_key,recipient,snapshot) values(e.id,e.revision,ev.event_key,person.email,jsonb_build_object('design',e.design,'context',context,'brand',org.name,'logo_path',org.logo_path,'color',org.primary_color,'marketing',e.rule->'marketing','organisation_id',e.organisation_id)) on conflict do nothing;
     if found then total=total+1;end if;
    end loop;
   end loop;
   if e.rule->>'trigger' in('schedule','deadline') and e.next_at<=now() then
    deadline=nullif(e.rule->>'deadline_at','')::timestamptz;
    if e.rule->>'trigger'='deadline' and now()<deadline-make_interval(days=>(e.rule->>'days_before')::integer) then update public.v2_email_entries set next_at=deadline-make_interval(days=>(e.rule->>'days_before')::integer) where id=e.id;continue;end if;
    if e.rule->>'cadence'='once' then update public.v2_email_entries set state='complete' where id=e.id;
    else
     n=e.tick;due=e.next_at;
     while due<=now() loop
      n=n+1;due=coalesce(nullif(e.rule->>'start_at','')::timestamptz,e.activated_at)+case e.rule->>'cadence' when 'daily' then make_interval(days=>n) when 'weekly' then make_interval(days=>7*n) when 'monthly' then make_interval(months=>n) when 'yearly' then make_interval(years=>n) end;
     end loop;
     update public.v2_email_entries set next_at=due,tick=n,state=case when due>coalesce(nullif(e.rule->>'end_at','')::timestamptz,deadline) then 'complete' else 'active' end where id=e.id;
    end if;
   end if;
  exception when others then update public.v2_email_entries set state='paused',last_error='Sending paused. Check this message, company access and recipient settings.' where id=e.id;
  end;
 end loop;return total;
end $$;

create function public.v2_email_claim() returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 update public.v2_email_outbox set state='expired',last_error='Delivery window expired. Review before creating a new send.' where state in('queued','failed','sending') and created_at<now()-interval '23 hours';
 update public.v2_email_outbox q set state='suppressed',last_error='Recipient eligibility, preferences or message approval changed.' from public.v2_email_entries e,public.v2_email_sets s where e.id=q.entry_id and s.id=e.set_id and q.state in('queued','failed') and (q.revision<>e.revision or e.state in('draft','paused') or not public.v2_message_admin(s.updated_by,s.organisation_id) or not exists(select 1 from public.v2_email_targets(e.id,q.snapshot#>>'{context,course_id}',q.recipient)) or (e.rule->>'trigger'='deadline' and (e.rule->>'deadline_at')::timestamptz<=now()));
 with picked as(select q.id from public.v2_email_outbox q join public.v2_email_entries e on e.id=q.entry_id join public.v2_email_sets s on s.id=e.set_id where q.next_at<=now() and q.attempts<8 and (q.state in('queued','failed') or(q.state='sending' and q.lease_at<now()-interval '10 minutes')) and q.revision=e.revision and e.state in('active','complete') and public.v2_message_admin(s.updated_by,s.organisation_id) and exists(select 1 from public.v2_email_targets(e.id,q.snapshot#>>'{context,course_id}',q.recipient)) order by q.created_at limit 40 for update of q skip locked),
 claimed as(update public.v2_email_outbox q set state='sending',lease_at=now(),attempts=attempts+1 from picked p where q.id=p.id returning q.*) select coalesce(jsonb_agg(to_jsonb(claimed)),'[]') into result from claimed;return result;
end $$;
create function public.v2_email_preference(p_actor uuid,p_org uuid default null,p_opt boolean default null) returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 if public.v2_message_email(p_actor) is null then raise exception 'Verify your account first';end if;
 if p_org is not null then
  if not public.v2_message_member(p_actor,p_org) then raise exception 'This company is outside your workspace';end if;
  insert into public.v2_email_preferences(user_id,organisation_id,announcements) values(p_actor,p_org,p_opt) on conflict(user_id,organisation_id) do update set announcements=excluded.announcements,updated_at=now();
 end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'name',o.name,'announcements',coalesce(p.announcements,false))) from public.organisations o left join public.v2_email_preferences p on p.organisation_id=o.id and p.user_id=p_actor where o.is_active and public.v2_message_member(p_actor,o.id)),'[]');
end $$;
do $$declare f record;begin for f in select oid::regprocedure signature from pg_proc where pronamespace='public'::regnamespace and proname like 'v2_email_%' loop
 execute format('revoke all on function %s from public,anon,authenticated',f.signature);
 execute format('grant execute on function %s to service_role',f.signature);
end loop;end $$;
