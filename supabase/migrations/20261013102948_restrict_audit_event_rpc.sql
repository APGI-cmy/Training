-- Audit events are written by trusted server code or the existing postgres-owned
-- profile/file triggers. Browsers must not be able to forge audit entries via RPC.
-- Preserve the existing service_role and owner grants; no new access is granted.
revoke execute on function public.write_audit_event(text, text, uuid, uuid, jsonb)
  from public, anon, authenticated;
