create or replace function watchdog_private.identity_counts(p_actor uuid,p_company uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare eligible uuid[]; begin
 if not public.v2_watchdog_allowed(p_actor,p_company) then raise exception 'WATCHDOG_SCOPE_DENIED'; end if;
 if p_company is null then select array_agg(user_id) into eligible from public.platform_principals where user_id is not null and public.v2_is_platform_principal(user_id);
 else select array_agg(user_id) into eligible from public.organisation_memberships where organisation_id=p_company and membership_role='owner' and is_active; end if;
 return jsonb_build_object('administrators',coalesce(cardinality(eligible),0),
 'mfaEnrolled',(select count(distinct user_id) from auth.mfa_factors where user_id=any(eligible) and status='verified' and factor_type='totp'));
end $$;
