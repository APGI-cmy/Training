-- A course-workflow notice is not a learner event. Preserve the required learner
-- identity for enrolment/certificate notices while permitting scoped review notices.
alter table public.admin_notifications alter column learner_user_id drop not null;
alter table public.admin_notifications add constraint notification_subject_required
 check(kind='course_review_event' or learner_user_id is not null);
