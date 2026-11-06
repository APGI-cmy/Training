BEGIN;
SET LOCAL ROLE postgres;
INSERT INTO auth.users(id,email) VALUES
 ('00000000-0000-0000-0000-000000000001','one@example.test'),
 ('00000000-0000-0000-0000-000000000002','two@example.test');
INSERT INTO public.user_roles(user_id,role) VALUES
 ('00000000-0000-0000-0000-000000000001','learner'),
 ('00000000-0000-0000-0000-000000000002','learner');
INSERT INTO public.profiles(user_id,full_name) VALUES ('00000000-0000-0000-0000-000000000002','Other learner');
SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
SET LOCAL request.jwt.claim.role = 'authenticated';
SET LOCAL ROLE authenticated;
INSERT INTO public.profiles(user_id,full_name) VALUES ('00000000-0000-0000-0000-000000000001','Test learner');
UPDATE public.profiles SET preferred_name='Test' WHERE user_id=auth.uid();
INSERT INTO public.learner_progress(user_id,course_id,unit_id,status) VALUES (auth.uid(),'test','one','opened');
INSERT INTO public.progress_events(event_key,user_id,course_id,unit_id,event_type) VALUES ('grant-test',auth.uid(),'test','one','unit_opened');
DO $$ BEGIN
 IF (SELECT count(*) FROM public.profiles) <> 1 THEN RAISE EXCEPTION 'Profile row isolation failed'; END IF;
 BEGIN
  INSERT INTO public.profiles(user_id) VALUES ('00000000-0000-0000-0000-000000000003');
  RAISE EXCEPTION 'Cross-user profile write unexpectedly allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  INSERT INTO public.course_enrolments(user_id,course_id) VALUES (auth.uid(),'forbidden');
  RAISE EXCEPTION 'Learner granted enrolment write access';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SET LOCAL ROLE service_role;
INSERT INTO public.course_enrolments(user_id,course_id,status) VALUES ('00000000-0000-0000-0000-000000000001','test','enrolled');
SET LOCAL ROLE postgres;
DO $$ DECLARE t text; r text; BEGIN
 FOREACH t IN ARRAY ARRAY['course_invitations','course_invitation_events','assessment_bookings','assessment_evidence','assessment_events','assessment_theory_attempts'] LOOP
  FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
   IF has_table_privilege(r,format('public.%I',t),'SELECT,INSERT,UPDATE,DELETE') THEN
    RAISE EXCEPTION 'Private table % exposed to %', t,r;
   END IF;
  END LOOP;
  IF NOT has_table_privilege('service_role',format('public.%I',t),'INSERT') THEN RAISE EXCEPTION 'Backend cannot insert %',t; END IF;
 END LOOP;
 IF has_table_privilege('anon','public.profiles','SELECT') THEN RAISE EXCEPTION 'Anonymous profile access'; END IF;
 IF NOT has_table_privilege('anon','public.courses','SELECT') THEN RAISE EXCEPTION 'Public catalogue unavailable'; END IF;
END $$;
SET LOCAL ROLE anon;
SELECT id FROM public.courses LIMIT 1;
ROLLBACK;
