create function public.v3_course_path_decode(value text) returns text language sql immutable set search_path='' as $$
 select convert_from(coalesce(string_agg(case when token[1] ~ '^%[A-Fa-f0-9]{2}$' then decode(substr(token[1],2),'hex') else convert_to(token[1],'UTF8') end,''::bytea order by position),''::bytea),'UTF8')
 from regexp_matches(value,'(%[A-Fa-f0-9]{2}|[^%]+|%)','g') with ordinality as pieces(token,position);
$$;
create function public.v3_scope_ebook_offer() returns trigger language plpgsql set search_path='' as $$begin
 if new.kind='ebook' then
  -- Offer only books actually referenced by this edition's learning units.
  -- Other PDFs or older draft exports in the package are not purchased books.
  select array_agg(distinct a.path order by a.path) into new.ebook_paths
  from public.course_editions e cross join lateral jsonb_array_elements(coalesce(e.course_document->'units','[]')) u
  join public.course_edition_assets a on a.edition_id=e.id and a.content_type='application/pdf' and a.path=public.v3_course_path_decode(coalesce(u->>'ebookPath',(u->>'assetBase')||'/data/book.pdf'))
  where e.id=new.edition_id and e.state='ready';
  if coalesce(cardinality(new.ebook_paths),0)=0 then raise exception 'REFERENCED_EBOOK_REQUIRED';end if;
 end if;return new;
end$$;
create trigger scope_ebook_offer before insert on public.course_purchase_offers for each row execute function public.v3_scope_ebook_offer();
revoke all on function public.v3_course_path_decode(text),public.v3_scope_ebook_offer() from public,anon,authenticated;
grant execute on function public.v3_course_path_decode(text),public.v3_scope_ebook_offer() to service_role;
