-- Staging baseline: current V1 core function definitions, schema only.
-- Apply only to eaaqgtdpvbxdgjxphjie; never migrate the Version 1 database.
CREATE OR REPLACE FUNCTION public.alp_has_pending_invitation(p_course_id text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select
    coalesce((select auth.jwt() ->> 'email'), '') <> ''
    and exists (
      select 1
      from public.course_invitations as invitation
      where invitation.recipient_email = lower(trim(coalesce((select auth.jwt() ->> 'email'), '')))
        and invitation.course_id = p_course_id
        and invitation.status in ('pending', 'sent')
        and invitation.revoked_at is null
        and invitation.redeemed_at is null
        and invitation.expires_at > current_timestamp
    );
$function$
;
CREATE OR REPLACE FUNCTION public.alp_validate_recipient_share_total()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  remaining integer;
begin
  select coalesce(sum(revenue_share_bps), 0) into remaining
  from public.course_payment_recipients
  where course_id = new.course_id
    and is_active
    and id is distinct from new.id;
  if new.is_active and remaining + new.revenue_share_bps > 10000 then
    raise exception 'Recipient allocations cannot exceed 100 percent for a course.';
  end if;
  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.claim_password_recovery_budget(p_key text, p_limit integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
$function$
;
update public.course_viewer_lab_settings set enabled = false;

