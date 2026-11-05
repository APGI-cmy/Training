-- V1 only. Preserve learner, invitation, assessment and course-content records.
alter table public.course_viewer_lab_settings add column classroom_learner_count integer;
alter table public.course_viewer_lab_settings add constraint viewer_classroom_count_valid
 check (classroom_learner_count is null or (classroom_learner_count between 1 and 1000
   and expected_concurrency_bps=10000 and maximum_capacity>=classroom_learner_count+capacity_buffer));

do $$
declare before_settings jsonb; after_settings jsonb;
begin
 select to_jsonb(s) into before_settings from public.course_viewer_lab_settings s
 where course_id='scannex-training-programme' for update;
 if before_settings is null then raise exception 'Expected existing Scannex Viewer settings'; end if;
 update public.course_viewer_lab_settings set
   classroom_learner_count=10, expected_concurrency_bps=10000,
   minimum_ready_capacity=12, maximum_capacity=greatest(maximum_capacity,12), capacity_buffer=2,
   enabled_unit_slugs=array(select distinct x from unnest(enabled_unit_slugs||array['lu6','lu7','lu8']) x order by x),
   updated_by=null, updated_at=now()
 where course_id='scannex-training-programme';
 select to_jsonb(s) into after_settings from public.course_viewer_lab_settings s where course_id='scannex-training-programme';
 insert into public.audit_events(event_type,entity_type,metadata) values
 ('scannex_classroom_configuration','course_viewer_lab_settings',jsonb_build_object(
   'course_id','scannex-training-programme','before',before_settings,'after',after_settings,
   'actor','automated implementation','authorisation','Johan Ras requested 100% participation for 10 learners, his presenter connection and one spare on 5 November 2026',
   'limits','Policy target only; not a claim of actual AWS fleet capacity or a completed concurrent trial'));
end $$;

create or replace function public.v1_require_theory_enrolment() returns trigger
language plpgsql set search_path='' as $$
begin
 if new.course_id='scannex-training-programme' and not exists(
   select 1 from public.course_enrolments e where e.user_id=new.learner_user_id
    and e.course_id=new.course_id and e.status='enrolled'
 ) then raise exception 'Active course enrolment is required for a theory submission' using errcode='23514'; end if;
 return new;
end $$;
revoke all on function public.v1_require_theory_enrolment() from public,anon,authenticated;
create trigger v1_theory_enrolment_check before insert on public.assessment_theory_attempts
 for each row execute function public.v1_require_theory_enrolment();
