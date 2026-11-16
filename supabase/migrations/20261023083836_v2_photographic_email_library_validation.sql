-- Accept only registered photographic and illustrated library identifiers.
create or replace function public.v2_email_entry_save(p_actor uuid,p_id uuid,p_set uuid,p_revision integer,p_name text,p_design jsonb,p_rule jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
declare org uuid;result uuid;recipient text;k text;
begin
 select organisation_id into org from public.v2_email_sets where id=p_set for update;
 if not coalesce(public.v2_message_admin(p_actor,org),false) then raise exception 'Administrator access required for this company';end if;
 if jsonb_typeof(p_design)<>'object' or jsonb_typeof(p_rule)<>'object' then raise exception 'Choose a valid message';end if;
 foreach k in array array['subject','heading','body','button'] loop if coalesce(length(trim(p_design->>k)),0)<1 or length(p_design->>k)>(case when k='body' then 20000 when k='button' then 80 else 200 end) then raise exception 'Check subject, heading, message and button text';end if;end loop;
 if p_design->>'subject' ~ '[\r\n]' or not coalesce(p_design->>'destination' in('course','review','messages','catalogue'),false) or not coalesce(p_design->>'image' in('none','course') or p_design->>'image' ~ '^library:(welcome|progress|completion|feedback|announcements|reviews)-(photo-)?0[1-3]$' or p_design->>'image' ~ '^https://[^[:space:]]+$',false) then raise exception 'Choose safe platform links and graphics';end if;
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
