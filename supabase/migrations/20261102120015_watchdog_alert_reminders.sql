-- One reminder after 24 hours, never a recursive stream of reminders.
create function public.v2_watchdog_alert_reminders() returns integer
language plpgsql security invoker set search_path='' as $$
declare changed integer; begin
 insert into public.v2_watchdog_alerts(recipient_id,company_id,run_id,dedupe_key,kind,severity)
 select a.recipient_id,a.company_id,a.run_id,'reminder:'||a.id::text,'reminder',a.severity
 from public.v2_watchdog_alerts a
 where a.kind in ('findings','incomplete','security_events') and a.state='accepted'
 and a.read_at is null and a.sent_at < now()-interval '24 hours'
 and a.created_at > now()-interval '30 days'
 and public.v2_watchdog_allowed(a.recipient_id,a.company_id)
 on conflict(recipient_id,dedupe_key) do nothing;
 get diagnostics changed=row_count; return changed;
end $$;
revoke all on function public.v2_watchdog_alert_reminders() from public,anon,authenticated;
grant execute on function public.v2_watchdog_alert_reminders() to service_role;
