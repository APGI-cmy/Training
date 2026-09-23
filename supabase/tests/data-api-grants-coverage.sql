DO $test$
DECLARE p record; operation text;
BEGIN
  FOR p IN SELECT * FROM pg_policies WHERE schemaname = 'public'
    AND roles && ARRAY['public', 'authenticated']::name[] LOOP
    FOREACH operation IN ARRAY CASE WHEN p.cmd = 'ALL'
      THEN ARRAY['SELECT','INSERT','UPDATE','DELETE'] ELSE ARRAY[p.cmd] END LOOP
      IF NOT has_table_privilege('authenticated', format('%I.%I', p.schemaname, p.tablename), operation) THEN
        RAISE EXCEPTION 'Missing % grant for authenticated on %.%', operation, p.schemaname, p.tablename;
      END IF;
    END LOOP;
  END LOOP;
  FOR p IN SELECT c.oid, c.relname, c.relrowsecurity FROM pg_class c
    JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r'
    AND c.relname NOT IN ('legacy_migrations','aimc_migrations','mmm_native_migrations') LOOP
    IF NOT p.relrowsecurity THEN RAISE EXCEPTION 'RLS is disabled on %', p.relname; END IF;
    IF NOT has_table_privilege('service_role',p.oid,'SELECT') THEN
      RAISE EXCEPTION 'Backend SELECT missing on %',p.relname;
    END IF;
  END LOOP;
END;
$test$;
