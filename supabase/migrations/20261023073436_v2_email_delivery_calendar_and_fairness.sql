-- Fair checking across company workspaces; SAST calendar recurrence; resumable pauses.
alter table public.v2_email_entries add column checked_at timestamptz;
create index v2_email_entries_check on public.v2_email_entries(state,checked_at);
create index v2_email_sets_author on public.v2_email_sets(created_by);
create index v2_email_sets_editor on public.v2_email_sets(updated_by);
create index v2_email_preferences_company on public.v2_email_preferences(organisation_id);
create or replace function public.v2_email_queue() returns integer language plpgsql security invoker set search_path='' as $$
declare e record;ev record;person record;org record;due timestamptz;n integer;total integer=0;context jsonb;deadline timestamptz;
begin
 for e in select m.*,s.organisation_id,s.updated_by from public.v2_email_entries m join public.v2_email_sets s on s.id=m.set_id where m.state='active' order by m.checked_at nulls first,m.id limit 100 for update of m skip locked loop
  begin
   update public.v2_email_entries set checked_at=now() where id=e.id;
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
      n=n+1;due=((coalesce(nullif(e.rule->>'start_at','')::timestamptz,e.activated_at) at time zone 'Africa/Johannesburg')+case e.rule->>'cadence' when 'daily' then make_interval(days=>n) when 'weekly' then make_interval(days=>7*n) when 'monthly' then make_interval(months=>n) when 'yearly' then make_interval(years=>n) end) at time zone 'Africa/Johannesburg';
     end loop;
     update public.v2_email_entries set next_at=due,tick=n,state=case when due>coalesce(nullif(e.rule->>'end_at','')::timestamptz,deadline) then 'complete' else 'active' end where id=e.id;
    end if;
   end if;
  exception when others then update public.v2_email_entries set state='paused',last_error='Sending paused. Check this message, company access and recipient settings.' where id=e.id;
  end;
 end loop;return total;
end $$;

create or replace function public.v2_email_claim() returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 update public.v2_email_outbox set state='expired',last_error='Delivery window expired. Review before creating a new send.' where state in('queued','failed','sending') and created_at<now()-interval '23 hours';
 update public.v2_email_outbox q set state='suppressed',last_error='Recipient eligibility, preferences or message approval changed.' from public.v2_email_entries e,public.v2_email_sets s where e.id=q.entry_id and s.id=e.set_id and q.state in('queued','failed') and (q.revision<>e.revision or e.state='draft' or not public.v2_message_admin(s.updated_by,s.organisation_id) or not exists(select 1 from public.v2_email_targets(e.id,q.snapshot#>>'{context,course_id}',q.recipient)) or (e.rule->>'trigger'='deadline' and (e.rule->>'deadline_at')::timestamptz<=now()));
 with picked as(select q.id from public.v2_email_outbox q join public.v2_email_entries e on e.id=q.entry_id join public.v2_email_sets s on s.id=e.set_id where q.next_at<=now() and q.attempts<8 and (q.state in('queued','failed') or(q.state='sending' and q.lease_at<now()-interval '10 minutes')) and q.revision=e.revision and e.state in('active','complete') and public.v2_message_admin(s.updated_by,s.organisation_id) and exists(select 1 from public.v2_email_targets(e.id,q.snapshot#>>'{context,course_id}',q.recipient)) order by q.created_at limit 40 for update of q skip locked),
 claimed as(update public.v2_email_outbox q set state='sending',lease_at=now(),attempts=attempts+1 from picked p where q.id=p.id returning q.*) select coalesce(jsonb_agg(to_jsonb(claimed)),'[]') into result from claimed;return result;
end $$;

create or replace function private.v2_email_record_event() returns trigger language plpgsql security definer set search_path='' as $$
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
  -- APGI principal commercial decisions are stored on the exact commercial version.
  for v in select value from jsonb_array_elements(coalesce(new.document#>'{workflow,commercials}','[]')) loop
   for p in select value from jsonb_array_elements(coalesce(v->'decisions','[]')) loop
    insert into public.v2_email_event_log(event_key,organisation_id,course_id,kind,recipient,context)
    values('commercial-decision:'||new.id||':'||(v->>'id')||':'||(p->>'email'),new.organisation_id,new.course_id,'review_complete',lower(p->>'email'),jsonb_build_object('review_id',new.id,'review_scope','commercials')) on conflict do nothing;
   end loop;
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
