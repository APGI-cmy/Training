-- One active structure per company AND primary course. Earlier course editions
-- and price-structure approvals remain retained.
alter table public.cc_structure_releases add column course_id text;
update public.cc_structure_releases r set course_id=s.document->'courses'->0->>'courseId' from public.cc_price_structures s where s.id=r.structure_id;
alter table public.cc_structure_releases alter column course_id set not null;
create index cc_structure_release_course_idx on public.cc_structure_releases(company_id,course_id,id desc);
create or replace function public.cc_publish_structure(p_actor uuid,p_id uuid) returns void language plpgsql set search_path='' as $$
declare s public.cc_price_structures;course text;begin
 select * into s from public.cc_price_structures where id=p_id;course=s.document->'courses'->0->>'courseId';
 if not found or course is null or not public.v2_is_platform_principal(p_actor) or not public.cc_structure_approved(s.id) or not public.cc_policy_ready(s.policy_id) then raise exception 'Both exact structure approvals and active policy required';end if;
 insert into public.cc_structure_releases(structure_id,company_id,course_id,created_by) values(s.id,s.company_id,course,p_actor) on conflict(structure_id) do nothing;
end;$$;
create or replace function public.cc_quote_current(p_actor uuid,p_quote uuid) returns boolean language sql stable set search_path='' as $$
 select q.buyer_id=p_actor and q.expires_at>now() and coalesce(public.cc_quote_ready(q.id),false) and
 q.structure_id=(select structure_id from public.cc_structure_releases where company_id=q.company_id and course_id=q.courses->0->>'courseId' order by id desc limit 1) and public.cc_can_shop(p_actor,q.company_id,q.input->>'route',q.courses)
 from public.cc_quotes q where q.id=p_quote and q.structure_id is not null;
$$;
revoke all on function public.cc_publish_structure(uuid,uuid),public.cc_quote_current(uuid,uuid) from public,anon,authenticated;
grant execute on function public.cc_publish_structure(uuid,uuid),public.cc_quote_current(uuid,uuid) to service_role;
