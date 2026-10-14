-- Isolated staging only. No grants are changed in Version 1.
-- Explicit privileges are needed because fresh branches do not inherit the
-- historical database owner's default grants. RLS still governs user access.
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant select on public.user_roles, public.audit_events to authenticated;
grant select, insert, update on public.learners, public.profiles, public.file_metadata,
  public.progress_events, public.learner_progress, public.completion_states to authenticated;
grant select on public.course_enrolments, public.course_enrolment_events to authenticated;
grant select on public.courses, public.course_modules, public.learning_units, public.content_links to anon, authenticated;

