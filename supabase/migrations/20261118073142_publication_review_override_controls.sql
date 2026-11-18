-- Apply the user's publication override to all three workflows in one transaction.
-- Each existing scope function rechecks the principal, exact revision, fingerprint,
-- current branding, confirmation and reason and saves its own immutable snapshot.
create or replace function public.v4_apply_publication_review_override(
 p_id uuid,p_revision integer,p_fingerprint text,p_brand integer,p_actor uuid,
 p_mode text,p_reason text,p_confirm boolean
) returns uuid[] language plpgsql security invoker set search_path='' as $$
declare scope_name text; next_revision integer:=p_revision; ids uuid[]:='{}'; saved uuid;
begin
 if p_mode is null or p_mode not in ('clear','retain') or p_confirm is distinct from true
    or p_reason is null or length(trim(p_reason)) not between 15 and 4000 then
  raise exception 'Select an override option, confirm it and provide a reason';
 end if;
 foreach scope_name in array array['content','commercials','branding'] loop
  saved:=public.v4_apply_review_override(p_id,next_revision,p_fingerprint,p_brand,p_actor,scope_name,p_mode,p_reason,p_confirm,null);
  ids:=array_append(ids,saved);
  next_revision:=next_revision+1;
 end loop;
 return ids;
end $$;
revoke all on function public.v4_apply_publication_review_override(uuid,integer,text,integer,uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.v4_apply_publication_review_override(uuid,integer,text,integer,uuid,text,text,boolean) to service_role;
