-- Prepared messages are shared company drafts, never active on installation.
create function public.v2_email_seed(p_actor uuid,p_org uuid,p_course text,p_starters jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
declare sid uuid;starter jsonb;rule jsonb;title text;
begin
 if not public.v2_message_admin(p_actor,p_org) then raise exception 'Administrator access required for this company';end if;
 select c.title into title from public.courses c where c.id=p_course;
 if title is null or jsonb_typeof(p_starters)<>'array' or jsonb_array_length(p_starters) not between 1 and 20 then raise exception 'Choose a course and valid prepared messages';end if;
 perform pg_advisory_xact_lock(hashtextextended('email-starters:'||p_org||':'||p_course,0));
 select id into sid from public.v2_email_sets where organisation_id=p_org and name=left(title||' — prepared emails',100) limit 1;
 if sid is not null then return sid;end if;
 sid=public.v2_email_set_save(p_actor,null,p_org,1,left(title||' — prepared emails',100),'Prepared drafts for review. Check the wording, recipients, dates, promotion terms and company policy before activating each email. The reminder deadline is an example; replace it with your actual course or group deadline.');
 for starter in select value from jsonb_array_elements(p_starters) loop
  rule=jsonb_build_object('trigger','schedule','cadence','once','audience','selected','course_id',p_course,'group_id','','recipients','[]'::jsonb,'start_at','','end_at','','deadline_at','','days_before',14,'first_time_only',false,'marketing',false,'policy_confirmed',false)||coalesce(starter->'rule','{}');
  rule=rule||jsonb_build_object('course_id',p_course,'policy_confirmed',false);
  if rule->>'trigger'='deadline' then rule=jsonb_set(rule,'{deadline_at}',to_jsonb((now()+interval '30 days')::text));end if;
  perform public.v2_email_entry_save(p_actor,null,sid,1,starter->>'name',starter->'design',rule);
 end loop;return sid;
end $$;
revoke all on function public.v2_email_seed(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.v2_email_seed(uuid,uuid,text,jsonb) to service_role;

-- Changes to unrelated review fields must not create historical commercial thanks.
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
    if tg_op='INSERT' or not coalesce(old.document#>'{workflow,commercials}','[]') @> jsonb_build_array(jsonb_build_object('id',v->'id','decisions',jsonb_build_array(p))) then
    insert into public.v2_email_event_log(event_key,organisation_id,course_id,kind,recipient,context)
    values('commercial-decision:'||new.id||':'||(v->>'id')||':'||(p->>'email'),new.organisation_id,new.course_id,'review_complete',lower(p->>'email'),jsonb_build_object('review_id',new.id,'review_scope','commercials')) on conflict do nothing;
    end if;
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
