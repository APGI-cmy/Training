create or replace function public.v6_import_distribution(p_project text,p_recipient uuid,p_share jsonb) returns uuid
language plpgsql security invoker set search_path='' as $$
declare d public.course_distribution;gid uuid;oid uuid;recorded uuid;entry jsonb;key_text text;is_new boolean;
begin
 if p_project not in ('prj_XaAAh2r1oRKGsi8HLxXGDzcI1yaf','prj_BxMjzI1TwimFM2mbV2ox3d7EUTsz') then raise exception 'Unregistered source deployment';end if;
 if p_share->>'source_project'<>p_project or not starts_with(p_share->>'source_key',p_project||':') then raise exception 'Source identity mismatch';end if;
 select id into oid from public.organisations where slug=p_share->>'owner_slug' and is_active;
 if oid is null or oid=p_recipient then raise exception 'Unknown course owner or invalid receiving platform';end if;
 if p_project='prj_BxMjzI1TwimFM2mbV2ox3d7EUTsz' and p_share->>'owner_slug'<>'nks-capital' then raise exception 'The source project cannot act for another course owner';end if;
 select owner_organisation_id into recorded from public.courses where id=p_share->>'course_id';
 if not found then raise exception 'Deploy the registered course package through the common platform release first';end if;
 if recorded is not null and recorded<>oid then raise exception 'Published course owner mismatch';end if;
 if (p_share->>'source_revision')::bigint<1 or length(p_share->>'source_fingerprint')<>64 or (p_share->>'state') not in ('offered','concern','final','withdrawn') then raise exception 'Invalid published source snapshot';end if;
 if jsonb_array_length(p_share->'events')<1 or jsonb_array_length(p_share->'events')>100 then raise exception 'Recorded source notices are required';end if;
 if not exists(select 1 from jsonb_array_elements(p_share->'events') e where e->>'action'='offered') then raise exception 'Original sharing notice is required';end if;
 if p_share->>'state' in ('final','withdrawn') and not exists(select 1 from jsonb_array_elements(p_share->'events') e where e->>'action'='concern') then raise exception 'First correction notice is required';end if;
 if p_share->>'state'='withdrawn' and not exists(select 1 from jsonb_array_elements(p_share->'events') e where e->>'action'='final') then raise exception 'Final correction notice is required';end if;
 select * into d from public.course_distribution where course_id=p_share->>'course_id' and recipient_organisation_id=p_recipient for update;
 is_new=not found;
 if not is_new then
 if d.source_key<>p_share->>'source_key' or d.owner_organisation_id<>oid then raise exception 'An existing course share cannot be overwritten by a different source';end if;
 if (p_share->>'source_revision')::bigint<=d.source_revision then return d.id;end if;
 if d.source_release_id<>(p_share->>'source_release_id')::uuid or d.source_fingerprint<>p_share->>'source_fingerprint' or d.pricing_snapshot is distinct from nullif(p_share->'pricing_snapshot','null'::jsonb) then raise exception 'A replacement release or commercial version requires a new consented sharing version';end if;
 gid=d.id;
 else
 update public.courses set owner_organisation_id=oid where id=p_share->>'course_id' and owner_organisation_id is null;
 insert into public.course_distribution(course_id,owner_organisation_id,recipient_organisation_id,source_release_id,source_project,source_key,source_fingerprint,source_revision,source_actor,reason,state,pricing_snapshot,response_due_at,withdrawn_at)
 values(p_share->>'course_id',oid,p_recipient,(p_share->>'source_release_id')::uuid,p_project,p_share->>'source_key',p_share->>'source_fingerprint',(p_share->>'source_revision')::bigint,p_share->>'source_actor',p_share->>'reason',p_share->>'state',nullif(p_share->'pricing_snapshot','null'::jsonb),(p_share->>'response_due_at')::timestamptz,(p_share->>'withdrawn_at')::timestamptz) returning id into gid;
 end if;
 if not is_new then update public.course_distribution set state=p_share->>'state',reason=p_share->>'reason',source_actor=p_share->>'source_actor',source_revision=(p_share->>'source_revision')::bigint,response_due_at=(p_share->>'response_due_at')::timestamptz,withdrawn_at=(p_share->>'withdrawn_at')::timestamptz,updated_at=now() where id=gid;end if;
 for entry in select value from jsonb_array_elements(p_sharentry->'events') loop
 if entry->>'action' not in ('offered','concern','final','withdrawn','resolved') then continue;end if;
 key_text=entry->>'event_key';
 if not starts_with(key_text,split_part(p_sharentry->>'source_key',':',2)||':') then raise exception 'Invalid source notice identity';end if;
 perform public.v6_distribution_message(gid,key_text,entry->>'action',entry->>'actor_email',entry->>'reason',(entry->>'response_due_at')::timestamptz);
 end loop;
 if p_share->>'state'='withdrawn' then perform public.v6_distribution_withdraw(gid,(p_share->>'withdrawn_at')::timestamptz);end if;
 return gid;
end $$;
revoke execute on function public.v6_import_distribution(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.v6_import_distribution(text,uuid,jsonb) to service_role;



