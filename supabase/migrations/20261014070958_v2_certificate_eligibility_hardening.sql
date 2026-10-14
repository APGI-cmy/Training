-- Keep requirement identifiers qualified: an inner unit_id must not shadow
-- the outer required unit when checking completion.
create or replace function public.v2_certificate_eligible(p_user uuid,p_course text) returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.course_enrolments where user_id=p_user and course_id=p_course and status='enrolled')
 and exists(select 1 from auth.users where id=p_user and email_confirmed_at is not null)
 and exists(select 1 from public.profiles where user_id=p_user and nullif(trim(certificate_name),'') is not null)
 and exists(select 1 from public.course_completion_requirements req where req.course_id=p_course
   and cardinality(req.required_unit_ids)>0
   and not exists(select 1 from unnest(req.required_unit_ids) as required(unit_id) where
     not exists(select 1 from public.learner_progress lp where lp.user_id=p_user and lp.course_id=p_course and lp.unit_id=required.unit_id and lp.status='completed')
     and not exists(select 1 from public.scorm_attempts sa where sa.user_id=p_user and sa.course_id=p_course and sa.unit_id=required.unit_id and sa.completion_status='completed' and sa.success_status<>'failed'))
   and (not req.require_assessor_pass or exists(
     select 1 from public.assessment_bookings b join public.assessment_practical_rubrics r on r.assessment_id=b.id
     where b.learner_user_id=p_user and b.course_id=p_course and b.status='passed' and b.final_score>=75
       and b.completed_at is not null and b.theory_attempt_id is not null and r.material_safety_concern=false
       and b.id=(select last_result.id from public.assessment_bookings last_result where last_result.learner_user_id=p_user and last_result.course_id=p_course and last_result.status in ('passed','failed') order by last_result.completed_at desc nulls last,last_result.updated_at desc limit 1)
       and exists(select 1 from public.assessment_evidence where assessment_id=b.id and evidence_type='scannex_result')
       and exists(select 1 from public.assessment_evidence where assessment_id=b.id and evidence_type='viewer_movement_log')
       and exists(select 1 from public.assessment_evidence where assessment_id=b.id and evidence_type='assessor_checklist')
   )))
$$;
create function public.v2_next_certificate_number() returns text language sql security invoker set search_path='' as $$
 select 'APGI-V2-'||to_char(now(),'YYYY')||'-'||lpad(nextval('public.certificate_numbers')::text,6,'0')
$$;
revoke all on function public.v2_next_certificate_number() from public,anon,authenticated;
grant execute on function public.v2_next_certificate_number() to service_role;
create unique index learner_groups_name_insensitive on public.learner_groups(organisation_id,lower(name));
