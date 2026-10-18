-- A revoked principal role must not satisfy the final commercial gate.
create or replace function public.v2_commercial_jointly_approved(v jsonb) returns boolean
language sql stable security invoker set search_path='' as $$
 select v is not null and v->>'submittedAt' is not null
 and not exists(select 1 from jsonb_array_elements(coalesce(v->'decisions','[]')) d where d->>'decision'='reject')
 and (select count(distinct p.email) from public.platform_principals p where public.v2_is_platform_principal(p.user_id) and exists(select 1 from jsonb_array_elements(coalesce(v->'decisions','[]')) d where d->>'email'=p.email and d->>'userId'=p.user_id::text and d->>'decision'='approve'))=2
 and (select count(distinct d->>'userId') from jsonb_array_elements(coalesce(v->'decisions','[]')) d where d->>'decision'='approve')=2;
$$;
