-- Server-only, shared rate limits for the public password-recovery form.
-- Store opaque HMAC keys, never email addresses, passwords or recovery tokens.
create table public.password_recovery_limits (
  bucket_key text primary key,
  window_start timestamptz not null,
  requests integer not null check (requests > 0)
);
alter table public.password_recovery_limits enable row level security;
revoke all on public.password_recovery_limits from public, anon, authenticated;
grant select, insert, update, delete on public.password_recovery_limits to service_role;

create function public.claim_password_recovery_budget(p_key text, p_limit integer)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  claimed boolean;
  bucket_start timestamptz := date_trunc('hour', now());
begin
  if p_key is null or length(p_key) > 128 or p_limit < 1 or p_limit > 100 then
    return false;
  end if;
  delete from public.password_recovery_limits where window_start < now() - interval '24 hours';
  insert into public.password_recovery_limits(bucket_key, window_start, requests)
  values (p_key, bucket_start, 1)
  on conflict (bucket_key) do update
    set window_start = excluded.window_start,
        requests = case when password_recovery_limits.window_start < bucket_start
          then 1 else password_recovery_limits.requests + 1 end
    where password_recovery_limits.window_start < bucket_start
       or password_recovery_limits.requests < p_limit
  returning true into claimed;
  return coalesce(claimed, false);
end;
$$;
revoke execute on function public.claim_password_recovery_budget(text, integer) from public, anon, authenticated;
grant execute on function public.claim_password_recovery_budget(text, integer) to service_role;
