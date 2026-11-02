-- Keep the definer lookup outside the exposed API schema. The public adapter
-- is an invoker wrapper; the helper still binds and validates auth.uid().
create schema if not exists course_access_private;
revoke all on schema course_access_private from public,anon;
grant usage on schema course_access_private to authenticated;
alter function public.v2_course_asset_access(text) set schema course_access_private;
create function public.v2_course_asset_access(p_course text)
returns boolean language sql stable set search_path='' as $$
 select course_access_private.v2_course_asset_access(p_course);
$$;
revoke all on function public.v2_course_asset_access(text) from public,anon;
grant execute on function public.v2_course_asset_access(text) to authenticated;
