create or replace function public.v4_review_override_active(d jsonb,scope_name text,fp text,brand integer) returns boolean language sql stable set search_path='' as $$
 with latest as(select e.value as grant_entry from jsonb_array_elements(coalesce(d->'reviewOverrides','[]'::jsonb)) with ordinality e(value,ord) where e.value->>'scope'=scope_name and e.value->>'mode' in ('clear','retain') order by e.ord desc limit 1)
 select coalesce((select grant_entry->>'fingerprint'=fp and not exists(select 1 from jsonb_array_elements(coalesce(d->'reviewOverrides','[]'::jsonb)) rev(value) where rev.value->>'revokes'=latest.grant_entry->>'id') and (scope_name<>'branding' or (grant_entry->>'brandRevision')::integer=brand) and (scope_name<>'commercials' or grant_entry->>'commercialVersion' is not distinct from d#>>'{workflow,commercials,-1,id}') from latest),false);
$$;
revoke all on function public.v4_review_override_active(jsonb,text,text,integer) from public,anon,authenticated;
grant execute on function public.v4_review_override_active(jsonb,text,text,integer) to service_role;
