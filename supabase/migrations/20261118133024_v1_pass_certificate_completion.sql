-- Only an actually issued, verified achievement certificate completes LU9.
-- Attendance certificates never mark the summative assessment as passed.
create function public.v1_complete_verified_course() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.kind='passed' then
  insert into public.learner_progress(user_id,course_id,unit_id,status,first_opened_at,completed_at)
  values(new.learner_user_id,new.course_id,'scannex-lu-9','completed',now(),now())
  on conflict(user_id,course_id,unit_id) do update set status='completed',completed_at=now(),updated_at=now();
  insert into public.completion_states(user_id,course_id,status,completed_units,total_units,progress_percent,certificate_eligible,completed_at)
  values(new.learner_user_id,new.course_id,'completed',9,9,100,true,now())
  on conflict(user_id,course_id) do update set status='completed',completed_units=9,total_units=9,progress_percent=100,certificate_eligible=true,completed_at=now(),updated_at=now();
  insert into public.progress_events(event_key,user_id,course_id,unit_id,event_type,metadata)
  values('verified-pass:'||new.id::text,new.learner_user_id,new.course_id,'scannex-lu-9','unit_completed',
   jsonb_build_object('certificate_id',new.id,'assessment_id',new.assessment_id,'source','verified_certificate_issue'));
 end if;
 return new;
end $$;
revoke all on function public.v1_complete_verified_course() from public,anon,authenticated;
grant execute on function public.v1_complete_verified_course() to service_role;
create trigger v1_complete_verified_course after insert on public.v1_course_certificates
for each row execute function public.v1_complete_verified_course();
