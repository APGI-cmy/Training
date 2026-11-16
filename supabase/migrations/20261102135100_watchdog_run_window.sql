-- The expanded HTTP/provider sequence can run longer than the former three
-- minutes. Match the sweeper's ten-minute stale threshold in both mutex gates.
-- Retain every existing scope, advisory lock, idempotency and rate-limit rule.
do $migration$
declare definition text;
begin
 for definition in select pg_get_functiondef(p.oid) from pg_proc p where p.oid in (
  'public.v2_watchdog_start(uuid,uuid,uuid,text)'::regprocedure,
  'public.v2_watchdog_monitor_claim(text)'::regprocedure
 ) loop
  if position('interval ''3 minutes''' in definition)=0 then raise exception 'WATCHDOG_WINDOW_EXPECTATION'; end if;
  execute replace(definition,'interval ''3 minutes''','interval ''10 minutes''');
 end loop;
end $migration$;
