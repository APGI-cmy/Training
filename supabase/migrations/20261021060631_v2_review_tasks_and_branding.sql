-- V2: independent content, commercial and branding assignments. Private service RPCs only.
create or replace function public.v2_review_task_assigned(p_person jsonb,p_task text)
returns boolean language sql immutable security invoker set search_path='' as $function$
 select case when p_person ? 'tasks' then coalesce(p_person->'tasks' ? p_task,false)
  when p_person->>'role'='partner' then false
  else p_task='content' or (p_task='commercials' and p_person->>'scope'='content_and_commercials') end;
$function$;
revoke all on function public.v2_review_task_assigned(jsonb,text) from public,anon,authenticated;
grant execute on function public.v2_review_task_assigned(jsonb,text) to service_role;

create or replace function public.v2_review_tasks_ready(p_document jsonb,p_brand integer,p_company uuid)
returns boolean language plpgsql stable security invoker set search_path='' as $function$
declare p jsonb; task text; target text; decision jsonb; w jsonb=p_document->'workflow'; v jsonb=p_document#>'{workflow,commercials,-1}';
begin
 for p in select * from jsonb_array_elements(p_document->'participants') a where a->>'state'<>'declined' loop
  if p ? 'tasks' then
   if jsonb_typeof(p->'tasks')<>'array' or jsonb_array_length(p->'tasks')=0 then return false;end if;
   for task in select jsonb_array_elements_text(p->'tasks') loop
    if task not in ('content','commercials','branding') then return false;end if;
    if task='content' then continue;end if;
    target=case when task='branding' then p_brand::text else v->>'id' end;
    select value into decision from jsonb_array_elements(coalesce(p_document->'taskDecisions','[]'::jsonb)) with ordinality x(value,n)
      where value->>'email'=p->>'email' and value->>'task'=task and value->>'target'=target order by n desc limit 1;
    if decision is null and task='commercials' then
     select value into decision from jsonb_array_elements(coalesce(v->'decisions','[]'::jsonb)) value where value->>'email'=p->>'email' and value->>'userId'=p->>'userId' and value->>'decision'='approve' limit 1;
     if decision is null and v#>>'{acceptance,email}'=p->>'email' and v#>>'{acceptance,userId}'=p->>'userId' then decision=(v->'acceptance')||'{"decision":"approve"}'::jsonb;end if;
    end if;
    if decision is null or decision->>'decision'<>'approve' or decision->>'userId' is distinct from p->>'userId'
      or not exists(select 1 from auth.users u where u.id::text=decision->>'userId' and lower(u.email)=p->>'email' and u.email_confirmed_at is not null) then return false;end if;
   end loop;
  end if;
 end loop;
 if coalesce((w->>'partner')::boolean,false) then
  select value into decision from jsonb_array_elements(coalesce(p_document->'taskDecisions','[]'::jsonb)) with ordinality x(value,n)
   where value->>'email'=w->>'partnerEmail' and value->>'task'='branding' and value->>'target'=p_brand::text order by n desc limit 1;
  if decision is not null then
   if decision->>'decision'<>'approve' or not exists(select 1 from auth.users u join public.organisation_memberships m on m.user_id=u.id
      where u.id::text=decision->>'userId' and lower(u.email)=w->>'partnerEmail' and u.email_confirmed_at is not null
      and m.organisation_id=coalesce((w->>'partnerCompanyId')::uuid,p_company) and m.membership_role='owner' and m.is_active) then return false;end if;
  elsif v#>>'{acceptance,email}' is distinct from w->>'partnerEmail' or v#>>'{acceptance,brandRevision}' is distinct from p_brand::text then return false;
  end if;
 end if;
 return true;
end $function$;
revoke all on function public.v2_review_tasks_ready(jsonb,integer,uuid) from public,anon,authenticated;
grant execute on function public.v2_review_tasks_ready(jsonb,integer,uuid) to service_role;

do $migration$
declare definition text; marker text;
begin
 select pg_get_functiondef('public.v2_publish_reviewed_course(uuid,integer,uuid,text)'::regprocedure) into definition;
 marker:='if not public.v2_commercial_jointly_approved(v)';
 if position(marker in definition)=0 then raise exception 'Publication insertion point changed';end if;
 definition:=replace(definition,marker,'if not public.v2_review_tasks_ready(r.document,current_brand,r.organisation_id) then raise exception ''Current assigned commercial/branding reviews and owner branding sign-off required'';end if;'||chr(10)||marker);
 definition:=replace(definition,'p->>''role''=''primary'' and p->>''state''<>''declined''','p->>''role''=''primary'' and p->>''state''<>''declined'' and public.v2_review_task_assigned(p,''content'')');
 definition:=replace(definition,'p->>''role''=''primary'' and p->>''state''=''finished''','p->>''role''=''primary'' and p->>''state''=''finished'' and public.v2_review_task_assigned(p,''content'')');
 definition:=replace(definition,'where p->>''role''=''primary'' loop','where p->>''role''=''primary'' and public.v2_review_task_assigned(p,''content'') loop');
 definition:=replace(definition,'p->>''email''=e->>''email'' and p->>''state''<>''declined''','p->>''email''=e->>''email'' and p->>''state''<>''declined'' and public.v2_review_task_assigned(p,''content'')');
 execute definition;
 select pg_get_functiondef('public.v2_register_course_correction(uuid,integer,text,text,uuid,jsonb,text,text,timestamptz,jsonb)'::regprocedure) into definition;
 marker:='p->>''state''<>''declined'' and p->>''role''<>''partner''';
 if position(marker in definition)=0 then raise exception 'Correction reset insertion point changed';end if;
 definition:=replace(definition,marker,marker||' and public.v2_review_task_assigned(p,''content'')');
 execute definition;
end $migration$;
revoke all on function public.v2_publish_reviewed_course(uuid,integer,uuid,text) from public,anon,authenticated;
grant execute on function public.v2_publish_reviewed_course(uuid,integer,uuid,text) to service_role;
revoke all on function public.v2_register_course_correction(uuid,integer,text,text,uuid,jsonb,text,text,timestamptz,jsonb) from public,anon,authenticated;
grant execute on function public.v2_register_course_correction(uuid,integer,text,text,uuid,jsonb,text,text,timestamptz,jsonb) to service_role;
