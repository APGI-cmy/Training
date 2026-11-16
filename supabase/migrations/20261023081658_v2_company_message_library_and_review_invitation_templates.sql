-- Every company can start with its own unactivated message library.
-- New review-invitation designs supplement mandatory joining/assignment instructions.
alter table public.course_review_mail add column email_snapshot jsonb;
create function public.v2_email_review_design(p_org uuid,p_course text) returns jsonb language sql stable security invoker set search_path='' as $$
 select e.design from public.v2_email_entries e join public.v2_email_sets s on s.id=e.set_id
 where s.organisation_id=p_org and public.v2_message_admin(s.updated_by,p_org) and e.state='active' and e.rule->>'trigger'='review_request'
 and coalesce(e.rule->>'course_id','') in('',p_course)
 and coalesce(nullif(e.rule->>'start_at','')::timestamptz,e.activated_at)<=now()
 and coalesce(nullif(e.rule->>'end_at','')::timestamptz,'infinity'::timestamptz)>now()
 order by (e.rule->>'course_id'=p_course) desc,e.updated_at desc,e.id limit 1;
$$;
create function public.v2_email_invitation_snapshot(p_mail uuid,p_snapshot jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 update public.course_review_mail set email_snapshot=coalesce(email_snapshot,p_snapshot),subject=case when email_snapshot is null then coalesce(p_snapshot->>'subject',subject) else subject end where id=p_mail and kind='invitation' and state='sending' returning email_snapshot into result;
 if not found then raise exception 'Invitation delivery is not claimed';end if;return result;
end $$;
revoke all on function public.v2_email_review_design(uuid,text),public.v2_email_invitation_snapshot(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.v2_email_review_design(uuid,text),public.v2_email_invitation_snapshot(uuid,jsonb) to service_role;
create or replace function public.v2_email_entry_save(p_actor uuid,p_id uuid,p_set uuid,p_revision integer,p_name text,p_design jsonb,p_rule jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
declare org uuid;result uuid;recipient text;k text;
begin
 select organisation_id into org from public.v2_email_sets where id=p_set for update;
 if not coalesce(public.v2_message_admin(p_actor,org),false) then raise exception 'Administrator access required for this company';end if;
 if jsonb_typeof(p_design)<>'object' or jsonb_typeof(p_rule)<>'object' then raise exception 'Choose a valid message';end if;
 foreach k in array array['subject','heading','body','button'] loop if coalesce(length(trim(p_design->>k)),0)<1 or length(p_design->>k)>(case when k='body' then 20000 when k='button' then 80 else 200 end) then raise exception 'Check subject, heading, message and button text';end if;end loop;
 if p_design->>'subject' ~ '[\r\n]' or not coalesce(p_design->>'destination' in('course','review','messages','catalogue'),false) or not coalesce(p_design->>'image' in('none','course') or p_design->>'image' ~ '^library:(welcome|progress|completion|feedback|announcements|reviews)-0[1-3]$' or p_design->>'image' ~ '^https://[^[:space:]]+$',false) then raise exception 'Choose safe platform links and graphics';end if;
 if not coalesce(p_rule->>'trigger' in('schedule','enrolment','completion','deadline','group_complete','new_course','review_request','review_complete','review_published'),false) or not coalesce(p_rule->>'cadence' in('once','daily','weekly','monthly','yearly'),false) or not coalesce(p_rule->>'audience' in('selected','enrolled','group','reviewers','members','admins'),false) then raise exception 'Choose a valid trigger, audience and repeat cycle';end if;
 if coalesce(p_rule->>'course_id','')<>'' and not exists(select 1 from public.courses where id=p_rule->>'course_id') then raise exception 'Choose a saved course';end if;
 if coalesce(p_rule->>'group_id','')<>'' and not exists(select 1 from public.learner_groups where id=(p_rule->>'group_id')::uuid and organisation_id=org) then raise exception 'The group belongs to another company';end if;
 if not coalesce(jsonb_typeof(p_rule->'recipients')='array',false) or jsonb_array_length(p_rule->'recipients')>200 then raise exception 'Choose up to 200 recipients';end if;
 for recipient in select jsonb_array_elements_text(p_rule->'recipients') loop if not public.v2_email_recipient(p_actor,org,recipient) then raise exception 'A recipient is outside this company scope';end if;end loop;
 if p_rule->>'trigger' in('review_request','review_complete','review_published') and p_rule->>'audience'<>'reviewers' then raise exception 'Review messages must target the assigned reviewers';end if;
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

create or replace function public.v2_email_entry_state(p_actor uuid,p_id uuid,p_revision integer,p_state text) returns void language plpgsql security invoker set search_path='' as $$
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
  if e.rule->>'trigger' not in('schedule','new_course','review_request') and coalesce(e.rule->>'course_id','')='' then raise exception 'Choose a course before activating this email';end if;
  if e.state='complete' then raise exception 'This schedule is complete. Add another message to send again.';end if;
  if nullif(e.rule->>'end_at','')::timestamptz<now() or (e.rule->>'trigger'='deadline' and (e.rule->>'deadline_at')::timestamptz<now()) then raise exception 'This message is past its end or deadline';end if;
  if (select count(*) from public.v2_email_entries m join public.v2_email_sets s on s.id=m.set_id where s.organisation_id=org and m.state='active' and m.id<>p_id)>=25 then raise exception 'Pause an existing message first (25 active per company)';end if;
 end if;
 if p_state='active' and e.rule->>'trigger'='review_request' then
  update public.v2_email_entries other set state='paused' from public.v2_email_sets s where s.id=other.set_id and s.organisation_id=org and other.id<>p_id and other.state='active' and other.rule->>'trigger'='review_request' and coalesce(other.rule->>'course_id','')=coalesce(e.rule->>'course_id','');
 end if;
 update public.v2_email_entries set state=p_state,activated_at=case when e.state='draft' then now() else coalesce(e.activated_at,now()) end,next_at=case when e.state='draft' then greatest(coalesce(nullif(e.rule->>'start_at','')::timestamptz,now()),now()) else greatest(coalesce(e.next_at,now()),now()) end,last_error=null where id=p_id;
 insert into public.v2_message_events(actor_id,action) values(p_actor,'email_'||p_state||':'||p_id);
end $$;

create or replace function public.v2_email_seed(p_actor uuid,p_org uuid,p_course text,p_starters jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
declare sid uuid;starter jsonb;rule jsonb;title text;
begin
 if not public.v2_message_admin(p_actor,p_org) then raise exception 'Administrator access required for this company';end if;
 if coalesce(p_course,'')='' then title='Standard company messages';else select c.title||' — prepared emails' into title from public.courses c where c.id=p_course;end if;
 if title is null or jsonb_typeof(p_starters)<>'array' or jsonb_array_length(p_starters) not between 1 and 20 then raise exception 'Choose a course and valid prepared messages';end if;
 perform pg_advisory_xact_lock(hashtextextended('email-starters:'||p_org||':'||coalesce(p_course,''),0));
 select id into sid from public.v2_email_sets where organisation_id=p_org and name=left(title,100) limit 1;
 if sid is not null then return sid;end if;
 sid=public.v2_email_set_save(p_actor,null,p_org,1,left(title,100),'Company-owned drafts for review. Choose the course where required, then check the wording, recipients, dates, promotion terms and company policy before activating each email. The reminder deadline is an example; replace it with your actual course or group deadline.');
 for starter in select value from jsonb_array_elements(p_starters) loop
  rule=jsonb_build_object('trigger','schedule','cadence','once','audience','selected','course_id',coalesce(p_course,''),'group_id','','recipients','[]'::jsonb,'start_at','','end_at','','deadline_at','','days_before',14,'first_time_only',false,'marketing',false,'policy_confirmed',false)||coalesce(starter->'rule','{}');
  rule=rule||jsonb_build_object('course_id',coalesce(p_course,''),'policy_confirmed',false);
  if rule->>'trigger'='deadline' then rule=jsonb_set(rule,'{deadline_at}',to_jsonb((now()+interval '30 days')::text));end if;
  perform public.v2_email_entry_save(p_actor,null,sid,1,starter->>'name',starter->'design',rule);
 end loop;return sid;
end $$;
