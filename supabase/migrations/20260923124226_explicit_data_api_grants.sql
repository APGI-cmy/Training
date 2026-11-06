-- Explicit Data API grants for the 2026-10-30 Supabase default-privilege change.
-- Forward-only: applied migrations and existing privileges/RLS are left intact.
-- This fixed allowlist covers the repository's existing application surface.
-- A table absent in a staged/partial deployment is reported and skipped; rerun
-- this migration after adding such a table, or grant access in its own migration.
-- Unknown/future tables are NEVER discovered or granted access automatically.
-- No GRANT ALL, ALTER DEFAULT PRIVILEGES, anonymous blanket grants, or RLS changes.

BEGIN;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

DO $grants$
DECLARE
  entry record;
  target oid;
  actual_kind "char";
  rls_enabled boolean;
  options text[];
BEGIN
  FOR entry IN
    SELECT * FROM (VALUES
      ('assessment_bookings', '', '', 'SELECT, INSERT, UPDATE, DELETE', 'r'),
      ('assessment_events', '', '', 'SELECT, INSERT', 'r'),
      ('assessment_evidence', '', '', 'SELECT, INSERT, UPDATE, DELETE', 'r'),
      ('audit_events', 'SELECT, INSERT', '', 'SELECT, INSERT', 'r'),
      ('completion_states', 'SELECT, INSERT, UPDATE', '', 'SELECT, INSERT, UPDATE, DELETE', 'r'),
      ('content_links', 'SELECT', 'SELECT', 'SELECT, INSERT, UPDATE, DELETE', 'r'),
      ('course_enrolment_events', 'SELECT', '', 'SELECT, INSERT', 'r'),
      ('course_enrolments', 'SELECT', '', 'SELECT, INSERT, UPDATE, DELETE', 'r'),
      ('course_invitation_events', '', '', 'SELECT, INSERT', 'r'),
      ('course_invitations', '', '', 'SELECT, INSERT, UPDATE, DELETE', 'r'),
      ('course_modules', 'SELECT', 'SELECT', 'SELECT, INSERT, UPDATE, DELETE', 'r'),
      ('courses', 'SELECT', 'SELECT', 'SELECT, INSERT, UPDATE, DELETE', 'r'),
      ('file_metadata', 'SELECT, INSERT, UPDATE', '', 'SELECT, INSERT, UPDATE, DELETE', 'r'),
      ('learner_progress', 'SELECT, INSERT, UPDATE', '', 'SELECT, INSERT, UPDATE, DELETE', 'r'),
      ('learners', 'SELECT, INSERT, UPDATE', '', 'SELECT, INSERT, UPDATE, DELETE', 'r'),
      ('learning_units', 'SELECT', 'SELECT', 'SELECT, INSERT, UPDATE, DELETE', 'r'),
      ('profiles', 'SELECT, INSERT, UPDATE', '', 'SELECT, INSERT, UPDATE, DELETE', 'r'),
      ('progress_events', 'SELECT, INSERT', '', 'SELECT, INSERT', 'r'),
      ('scorm_attempts', 'SELECT, INSERT, UPDATE', '', 'SELECT, INSERT, UPDATE, DELETE', 'r'),
      ('user_roles', 'SELECT, INSERT, UPDATE, DELETE', '', 'SELECT, INSERT, UPDATE, DELETE', 'r')
    ) AS access(table_name, authenticated_privileges, anon_privileges, service_privileges, expected_kind)
  LOOP
    target := to_regclass(format('public.%I', entry.table_name));
    IF target IS NULL THEN
      RAISE NOTICE 'Data API grants: public.% is absent; no object or privilege was created', entry.table_name;
      CONTINUE;
    END IF;

    SELECT relkind, relrowsecurity, reloptions INTO actual_kind, rls_enabled, options
      FROM pg_class WHERE oid = target;
    IF actual_kind::text <> entry.expected_kind THEN
      RAISE EXCEPTION 'Data API grants: unexpected object type for public.%', entry.table_name;
    END IF;
    IF actual_kind = 'r' AND NOT rls_enabled THEN
      RAISE EXCEPTION 'Data API grants: enable and review RLS on public.% before exposing it', entry.table_name;
    END IF;
    IF actual_kind = 'v' AND NOT coalesce(options @> ARRAY['security_invoker=true'], false) THEN
      RAISE EXCEPTION 'Data API grants: public.% must be a security_invoker view', entry.table_name;
    END IF;

    IF entry.authenticated_privileges <> '' THEN
      EXECUTE format('GRANT %s ON TABLE public.%I TO authenticated', entry.authenticated_privileges, entry.table_name);
    END IF;
    IF entry.anon_privileges <> '' THEN
      EXECUTE format('GRANT %s ON TABLE public.%I TO anon', entry.anon_privileges, entry.table_name);
    END IF;
    EXECUTE format('GRANT %s ON TABLE public.%I TO service_role', entry.service_privileges, entry.table_name);
  END LOOP;
END;
$grants$;

-- Explicit EXECUTE for existing RLS helpers (no new functions or public RPCs).
-- Trigger functions run through triggers and are not exposed here.
DO $helpers$
DECLARE
  signature text;
  target regprocedure;
BEGIN
  FOREACH signature IN ARRAY ARRAY[
    'public.current_user_has_role(text)',
    'public.current_user_has_any_role(text[])',
    'public.alp_has_pending_invitation(text)'
  ] LOOP
    target := to_regprocedure(signature);
    IF target IS NOT NULL THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', target);
    END IF;
  END LOOP;
END;
$helpers$;

COMMIT;
