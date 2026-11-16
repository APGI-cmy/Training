-- Only the already privileged application service role may compare verified
-- identities. Do not expose Auth passwords, tokens, or metadata to this role.
grant select (id,email,email_confirmed_at) on auth.users to service_role;
-- Internal trigger functions are not public API endpoints.
revoke execute on function public.audit_file_metadata_change(),public.audit_profile_change() from public,anon,authenticated;
revoke execute on function public.current_user_has_role(text),public.current_user_has_any_role(text[]) from public,anon;
grant execute on function public.current_user_has_role(text),public.current_user_has_any_role(text[]) to authenticated,service_role;

