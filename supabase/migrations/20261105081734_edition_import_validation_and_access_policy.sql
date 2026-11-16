alter table public.course_delivery_editions add column default_access_days integer check(default_access_days between 1 and 3650);
do $$declare definition text;begin
 definition=pg_get_functiondef('public.v3_finish_course_edition(uuid,boolean)'::regprocedure);
 definition=replace(definition,'if e.state=''staging'' then',
 'if exists(select 1 from public.course_edition_assets a where a.edition_id=e.id and (
  (select coalesce(sum((s->>''length'')::bigint),0) from jsonb_array_elements(a.segments) s)<>a.byte_count or
  exists(select 1 from jsonb_array_elements(a.segments) s where coalesce(s->>''block'','''') !~ ''^[a-f0-9]{64}$'' or
   (s->>''offset'')::bigint<0 or (s->>''length'')::bigint<=0 or
   not exists(select 1 from storage.objects o where o.bucket_id=''course-edition-blocks'' and o.name=s->>''block'' and (o.metadata->>''size'')::bigint >= (s->>''offset'')::bigint+(s->>''length'')::bigint))
 )) then raise exception ''EDITION_BLOCKS_INCOMPLETE'';end if;
 if e.state=''staging'' then');
 execute definition;
 definition=pg_get_functiondef('public.v3_pin_enrolment_edition()'::regprocedure);
 definition=replace(definition,'end if;return new;',
 'end if;
 if new.status=''enrolled'' and new.access_expires_at is null and (tg_op=''INSERT'' or old.status<>''enrolled'') then
  select new.access_granted_at+make_interval(days=>p.default_access_days) into new.access_expires_at from public.course_delivery_editions p where p.course_id=new.course_id and p.default_access_days is not null;
 end if;return new;');
 execute definition;
end$$;
create function public.v3_set_default_course_access(p_actor uuid,p_course text,p_days integer,p_reason text) returns void language plpgsql set search_path='' as $$begin
 if not public.v2_is_platform_principal(p_actor) or p_days is null or p_days not between 1 and 3650 or length(trim(coalesce(p_reason,'')))<10 or length(p_reason)>2000 then raise exception 'AGREED_ACCESS_DURATION_REQUIRED';end if;
 update public.course_delivery_editions set default_access_days=p_days,updated_at=now() where course_id=p_course;
 if not found then raise exception 'VERIFIED_BASELINE_REQUIRED';end if;
 insert into public.course_delivery_events(actor_id,course_id,event_type,detail) values(p_actor,p_course,'new_enrolment_access_duration',jsonb_build_object('days',p_days,'reason',trim(p_reason),'existing_enrolments_changed',false));
end$$;
revoke all on function public.v3_set_default_course_access(uuid,text,integer,text) from public,anon,authenticated;
grant execute on function public.v3_set_default_course_access(uuid,text,integer,text) to service_role;
