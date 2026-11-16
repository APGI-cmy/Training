-- Messages use client-generated IDs; their id column has no default.
-- Correct only the run-tagged fixture insert, retaining every safety guard.
do $migration$
declare definition text:=pg_get_functiondef('public.v2_watchdog_business_fixtures(uuid,text)'::regprocedure);
begin
 if position('insert into public.v2_messages(thread_id,' in definition)=0
 or position('values(thread,actor,mailbox,' in definition)=0 then raise exception 'WATCHDOG_FIXTURE_EXPECTATION'; end if;
 definition:=replace(definition,'insert into public.v2_messages(thread_id,','insert into public.v2_messages(id,thread_id,');
 definition:=replace(definition,'values(thread,actor,mailbox,','values(gen_random_uuid(),thread,actor,mailbox,');
 execute definition;
end $migration$;
