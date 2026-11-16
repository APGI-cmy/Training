-- The HTTP boundary calls this with the user's JWT, not the service role.
-- It returns only an own-access decision and never accepts an actor ID.
create or replace function public.v2_course_asset_access(p_course text)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid(); mailbox text; sid uuid;
begin
 if actor is null or length(coalesce(p_course,'')) not between 1 and 120 then return false; end if;
 begin sid:=(auth.jwt()->>'session_id')::uuid; exception when others then return false; end;
 if sid is null or not exists(select 1 from auth.sessions s where s.id=sid and s.user_id=actor and (s.not_after is null or s.not_after>now())) then return false; end if;
 select lower(u.email) into mailbox from auth.users u where u.id=actor and u.email_confirmed_at is not null and u.deleted_at is null and (u.banned_until is null or u.banned_until<now());
 if mailbox is null then return false; end if;
 if exists(select 1 from auth.mfa_factors f where f.user_id=actor and f.factor_type='totp' and f.status='verified') and coalesce(auth.jwt()->>'aal','aal1')<>'aal2' then return false; end if;
 return exists(select 1 from public.user_roles where user_id=actor and role='admin')
 or exists(select 1 from public.course_enrolments where user_id=actor and course_id=p_course and status='enrolled')
 or exists(select 1 from public.course_review_rounds r cross join lateral jsonb_array_elements(coalesce(r.document->'participants','[]'::jsonb)) p
 where r.course_id=p_course and r.status in ('open','published') and lower(p->>'email')=mailbox and coalesce(p->>'state','')<>'declined');
end $$;
revoke all on function public.v2_course_asset_access(text) from public,anon;
grant execute on function public.v2_course_asset_access(text) to authenticated;

-- Bounded, non-delivering fixtures for actual HTTP routes. No policy history,
-- real review, financial order or recipient account is created or altered.
create or replace function public.v2_watchdog_business_fixtures(p_run uuid,p_operation text)
returns jsonb language plpgsql set search_path='' as $$
declare r public.v2_watchdog_runs; users uuid[]; actor uuid; mailbox text; thread uuid; message uuid; course text:='executive-assistant-lu1-compatibility';
begin
 select * into strict r from public.v2_watchdog_runs where id=p_run;
 select coalesce(array_agg(f.id),'{}'::uuid[]) into users from public.v2_watchdog_fixture_users(p_run) f(id);
 if p_operation='cleanup' then
  if exists(select 1 from public.v2_message_threads t where t.unique_key='watchdog-http-'||p_run::text and not(t.created_by=any(users))) then raise exception 'WATCHDOG_CLEANUP_GUARD'; end if;
  delete from public.v2_message_threads where unique_key='watchdog-http-'||p_run::text and created_by=any(users);
  delete from public.course_enrolments where user_id=any(users) and source='system' and metadata->>'watchdog_run'=p_run::text;
  return '{}'::jsonb;
 end if;
 if r.state<>'running' or cardinality(users)<>3 then raise exception 'WATCHDOG_FIXTURE_GUARD'; end if;
 select u.id,lower(u.email) into strict actor,mailbox from auth.users u where u.id=any(users) and u.email='watchdog-'||p_run::text||'-1@example.invalid';
 if p_operation='revoke' then
  update public.course_enrolments set status='revoked',access_revoked_at=now() where user_id=actor and source='system' and metadata->>'watchdog_run'=p_run::text;
  return '{}'::jsonb;
 end if;
 if p_operation<>'seed' then raise exception 'WATCHDOG_OPERATION_INVALID'; end if;
 -- organisation_id stays NULL, no invitation_id: existing enrolment triggers
 -- create no mail event, membership, financial record or learner notification.
 insert into public.course_enrolments(user_id,course_id,status,source,metadata) values(actor,course,'enrolled','system',jsonb_build_object('watchdog_run',p_run));
 insert into public.v2_message_threads(created_by,subject,level,unique_key) values(actor,'WATCHDOG SYNTHETIC attachment boundary','direct','watchdog-http-'||p_run::text) returning id into thread;
 insert into public.v2_message_participants(thread_id,email) values(thread,mailbox);
 insert into public.v2_messages(thread_id,sender_id,sender_email,body,attachment_name,attachment_mime,attachment_data)
 values(thread,actor,mailbox,'Fictional security fixture only.','watchdog-synthetic.txt','text/plain',convert_to('WATCHDOG-SYNTHETIC-'||p_run::text,'UTF8')) returning id into message;
 return jsonb_build_object('messageId',message,'courseId',course);
end $$;
revoke all on function public.v2_watchdog_business_fixtures(uuid,text) from public,anon,authenticated;
grant execute on function public.v2_watchdog_business_fixtures(uuid,text) to service_role;
