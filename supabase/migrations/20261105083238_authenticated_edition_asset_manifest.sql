-- One JWT-verified lookup per media request. No service credential or actor
-- supplied by the browser participates in the authorization decision.
create function course_access_private.v3_edition_asset_manifest(p_edition uuid,p_path text) returns jsonb
 language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid();sid uuid;e public.course_editions;allowed boolean;result jsonb;
begin
 if not course_access_private.caller_ready() or actor is null then return null;end if;
 begin sid:=(auth.jwt()->>'session_id')::uuid;exception when others then return null;end;
 if sid is null or not exists(select 1 from auth.sessions s where s.id=sid and s.user_id=actor and (s.not_after is null or s.not_after>now())) then return null;end if;
 if not exists(select 1 from auth.users u where u.id=actor and u.email_confirmed_at is not null and u.deleted_at is null and (u.banned_until is null or u.banned_until<now())) then return null;end if;
 select * into e from public.course_editions where id=p_edition and state='ready';if not found then return null;end if;
 allowed=exists(select 1 from public.user_roles where user_id=actor and role='admin') or exists(
  select 1 from public.course_enrolments n where n.user_id=actor and n.course_id=e.runtime_course_id and n.edition_id=e.id and n.status='enrolled' and (n.access_expires_at is null or n.access_expires_at>now())
 ) or exists(
  select 1 from public.course_purchase_entitlements t where t.user_id=actor and t.edition_id=e.id and t.kind='ebook' and t.state='active' and t.mode='live' and p_path=any(t.ebook_paths)
 );
 if not allowed then return null;end if;
 select jsonb_build_object('byte_count',a.byte_count,'content_type',a.content_type,'segments',a.segments) into result from public.course_edition_assets a where a.edition_id=e.id and a.path=p_path;
 return result;
end$$;
create function public.v3_edition_asset_manifest(p_edition uuid,p_path text) returns jsonb language sql stable set search_path='' as $$select course_access_private.v3_edition_asset_manifest(p_edition,p_path);$$;
revoke all on function course_access_private.v3_edition_asset_manifest(uuid,text),public.v3_edition_asset_manifest(uuid,text) from public,anon;
grant execute on function course_access_private.v3_edition_asset_manifest(uuid,text),public.v3_edition_asset_manifest(uuid,text) to authenticated,service_role;
