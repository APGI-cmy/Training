do $fix$ declare definition text;begin
 definition=pg_get_functiondef('public.v6_distribution_message(uuid,text,text,text,text,timestamp with time zone)'::regprocedure);
 if position('''normal''' in definition)=0 then raise exception 'Unexpected distribution message level';end if;
 execute replace(replace(definition,'''normal''','''company'''),'uid,subject_text,','uid,left(subject_text,200),');
 definition=pg_get_functiondef('public.v6_distribution_withdraw(uuid,timestamp with time zone)'::regprocedure);
 execute replace(definition,'''normal''','''direct''');
end $fix$;
create or replace function public.v6_distribution_decide(p_actor uuid,p_id uuid,p_action text,p_reason text,p_revision bigint,p_days integer default 7,p_margin integer default 10000) returns uuid
language plpgsql security invoker set search_path='' as $$
declare d public.course_distribution;email_text text;side_id uuid;due timestamptz;
begin
 select * into strict d from public.course_distribution where id=p_id for update;
 if d.source_revision<>p_revision then raise exception 'The sharing record changed. Refresh before deciding.';end if;
 if length(btrim(coalesce(p_reason,''))) not between 10 and 2000 then raise exception 'Record a reason of 10 to 2000 characters';end if;
 side_id=case when p_action in ('accept','decline','margin') then d.recipient_organisation_id else d.owner_organisation_id end;
 if not public.v6_distribution_owner(p_actor,side_id) then raise exception 'Only the relevant platform owner may make this decision';end if;
 select email into email_text from auth.users where id=p_actor;
 if p_action in ('accept','decline','margin') then
 if d.state='withdrawn' then raise exception 'This course has been withdrawn from new enrolments';end if;
 if p_action='accept' then
 if d.accepted_at is not null then return p_id;end if;
 update public.course_distribution set accepted_at=coalesce(accepted_at,now()),accepted_by=p_actor,declined_at=null,updated_at=now() where id=p_id;
 insert into public.organisation_offerings(organisation_id,course_id,status,created_by,shared_distribution_id)
 values(d.recipient_organisation_id,d.course_id,'published',p_actor,d.id)
 on conflict(organisation_id,course_id) do update set status='published',shared_distribution_id=excluded.shared_distribution_id;
 elsif p_action='decline' then
 if d.declined_at is not null then return p_id;end if;
 if d.accepted_at is not null then raise exception 'Use course availability management for a published portfolio item';end if;
 update public.course_distribution set declined_at=now(),updated_at=now() where id=p_id;
 else
 if p_margin not between 0 and 10000 or d.pricing_snapshot is null then raise exception 'Use an approved source price and a retained partner margin from zero to 100 percent';end if;
 if d.margin_retained_bps=p_margin then return p_id;end if;
 update public.course_distribution set margin_retained_bps=p_margin,updated_at=now() where id=p_id;
 end if;
 perform public.v6_distribution_message(p_id,p_id||':'||p_action||':'||gen_random_uuid(),case p_action when 'accept' then 'accepted' when 'decline' then 'declined' else 'margin' end,email_text,btrim(p_reason),null);
 return p_id;
 end if;
 if p_action='resolve' then
 if d.state not in ('concern','final') then raise exception 'Only an open correction concern can be resolved';end if;
 update public.course_distribution set state='offered',reason=btrim(p_reason),source_actor=email_text,source_revision=source_revision+1,response_due_at=null,updated_at=now() where id=p_id;
 perform public.v6_distribution_message(p_id,p_id||':'||(d.source_revision+1),'resolved',email_text,btrim(p_reason),null);
 return p_id;
 end if;
 if p_action not in ('concern','final','withdrawn') then raise exception 'Choose a valid sharing action';end if;
 if (p_action='concern' and d.state<>'offered') or (p_action='final' and d.state<>'concern') or (p_action='withdrawn' and d.state<>'final') then raise exception 'Follow the first notice, final notice and withdrawal sequence';end if;
 if p_action<>'concern' and (d.response_due_at is null or d.response_due_at>now()) then raise exception 'Allow the recorded response period to finish before escalating';end if;
 if p_days not between 1 and 30 then raise exception 'Choose a response period of 1 to 30 days';end if;
 due=case when p_action='withdrawn' then null else now()+make_interval(days=>p_days) end;
 update public.course_distribution set state=p_action,reason=btrim(p_reason),source_actor=email_text,source_revision=source_revision+1,response_due_at=due,withdrawn_at=case when p_action='withdrawn' then now() end,updated_at=now() where id=p_id;
 perform public.v6_distribution_message(p_id,p_id||':'||(d.source_revision+1),p_action,email_text,btrim(p_reason),due);
 if p_action='withdrawn' then perform public.v6_distribution_withdraw(p_id,now());end if;
 return p_id;
end $$;
revoke execute on function public.v6_distribution_decide(uuid,uuid,text,text,bigint,integer,integer) from public,anon,authenticated;
grant execute on function public.v6_distribution_decide(uuid,uuid,text,text,bigint,integer,integer) to service_role;

create or replace function public.v6_import_distribution(p_project text,p_recipient uuid,p_share jsonb) returns uuid
language plpgsql security invoker set search_path='' as $$
declare d public.course_distribution;gid uuid;oid uuid;recorded uuid;e jsonb;key_text text;is_new boolean;
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
 for e in select value from jsonb_array_elements(p_share->'events') loop
 if e->>'action' not in ('offered','concern','final','withdrawn','resolved') then continue;end if;
 key_text=e->>'event_key';
 if not starts_with(key_text,split_part(p_share->>'source_key',':',2)||':') then raise exception 'Invalid source notice identity';end if;
 perform public.v6_distribution_message(gid,key_text,e->>'action',e->>'actor_email',e->>'reason',(e->>'response_due_at')::timestamptz);
 end loop;
 if p_share->>'state'='withdrawn' then perform public.v6_distribution_withdraw(gid,(p_share->>'withdrawn_at')::timestamptz);end if;
 return gid;
end $$;
revoke execute on function public.v6_import_distribution(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.v6_import_distribution(text,uuid,jsonb) to service_role;



