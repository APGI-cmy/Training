-- V2 only. Keep the database publication gate aligned with the shared LU rules.
-- No saved review row or endorsement is changed by this migration.
create function public.v3_review_evidence_current(p_document jsonb,p_finding jsonb,p_from text,p_current text)
returns boolean language plpgsql stable security invoker set search_path='' as $$
declare at_version text=p_from; visited text[]='{}'; edge jsonb; edges integer;
begin
 if p_from is null or p_current is null then return false;end if;
 if p_from=p_current then return true;end if;
 if p_finding->>'scope'='course' or not exists(select 1 from jsonb_array_elements(p_document->'units') u where u->>'slug'=p_finding->>'unit') then return false;end if;
 while not(at_version=any(visited)) loop
  visited=array_append(visited,at_version);
  select count(*) into edges from jsonb_array_elements(coalesce(p_document->'contentRevisions','[]')) r where r->>'previousFingerprint'=at_version;
  if edges>0 then
   if edges<>1 then return false;end if;
   select r into edge from jsonb_array_elements(p_document->'contentRevisions') r where r->>'previousFingerprint'=at_version;
   if jsonb_typeof(edge->'changedUnits') is distinct from 'array' or jsonb_typeof(edge->'preservedUnits') is distinct from 'array'
    or not(edge->'preservedUnits' ? (p_finding->>'unit')) or edge->'changedUnits' ? (p_finding->>'unit') then return false;end if;
   at_version=edge->>'fingerprint';
  else
   if p_finding->>'fixedFingerprint' is distinct from p_current then return false;end if;
   select count(*) into edges from jsonb_array_elements(coalesce(p_finding->'carriedForwardEvidence','[]')) e where e->>'from'=at_version and e->>'unit'=p_finding->>'unit';
   if edges<>1 then return false;end if;
   select e into edge from jsonb_array_elements(p_finding->'carriedForwardEvidence') e where e->>'from'=at_version and e->>'unit'=p_finding->>'unit';at_version=edge->>'to';
  end if;
  if at_version=p_current then return true;end if;if at_version is null then return false;end if;
 end loop;return false;
end $$;

create function public.v3_clean_lu_review_ready(p_document jsonb,p_fingerprint text,p_unit text,p_check_course boolean default true)
returns boolean language plpgsql stable security invoker set search_path='' as $$
declare person jsonb; f jsonb; unit jsonb; n integer;
begin
 if p_document->>'reviewProcessVersion' is distinct from '3' or not exists(select 1 from jsonb_array_elements(p_document->'units') u where u->>'slug'=p_unit) then return false;end if;
 select count(*) into n from jsonb_array_elements(p_document->'participants') p where p->>'role'='primary' and public.v2_review_task_assigned(p,'content');
 if n<2 or (select count(distinct p->>'userId') from jsonb_array_elements(p_document->'participants') p where p->>'role'='primary' and public.v2_review_task_assigned(p,'content'))<>n
  or (select count(distinct p->>'email') from jsonb_array_elements(p_document->'participants') p where p->>'role'='primary' and public.v2_review_task_assigned(p,'content'))<>n then return false;end if;
 for f in select a from jsonb_array_elements(coalesce(p_document->'findings','[]')) a where a->>'unit'=p_unit or a->>'scope'='course' loop
  if f->>'outcome' is distinct from 'satisfied' or coalesce((f->>'blocking')::boolean,false) or jsonb_array_length(coalesce(f->'implementationRounds','[]'))>0
   or f->>'fixedBy' is not null or f->'declarationReopen' is not null
   or exists(select 1 from jsonb_array_elements(coalesce(f->'workflowEndorsements','[]')) e where e->>'decision'='no')
   or exists(select 1 from jsonb_array_elements(coalesce(f->'previousVersions','[]')) v where v->>'outcome' is distinct from 'satisfied') then return false;end if;
  if not(f ? 'supersededBy') and not public.v3_review_evidence_current(p_document,f,f->>'fingerprint',p_fingerprint) then return false;end if;
 end loop;
 for person in select p from jsonb_array_elements(p_document->'participants') p where p->>'role'='primary' and public.v2_review_task_assigned(p,'content') loop
  if person->>'state'='declined' or not(coalesce(person->'coverage','[]') ? p_unit)
   or not exists(select 1 from auth.users u where u.id::text=person->>'userId' and lower(u.email)=person->>'email' and u.email_confirmed_at is not null)
   or not exists(select 1 from jsonb_array_elements(p_document->'findings') a where not(a ? 'supersededBy') and (a->>'unit'=p_unit or a->>'scope'='course')
    and a->>'author'=person->>'email' and a->>'userId'=person->>'userId' and a->>'outcome'='satisfied' and public.v3_review_evidence_current(p_document,a,a->>'fingerprint',p_fingerprint)) then return false;end if;
 end loop;
 if p_check_course and exists(select 1 from jsonb_array_elements(p_document->'findings') a where not(a ? 'supersededBy') and a->>'scope'='course') then
  for unit in select u from jsonb_array_elements(p_document->'units') u loop
   if not public.v3_clean_lu_review_ready(p_document,p_fingerprint,unit->>'slug',false) then return false;end if;
  end loop;
 end if;
 return true;
end $$;

do $$
declare definition text;
begin
 select pg_get_functiondef('public.v3_lu_review_ready(jsonb,text)'::regprocedure) into definition;
 if position('public.v3_clean_lu_review_ready' in definition)=0 then
  if position('if f->>''outcome''=''satisfied'' then' in definition)=0 then raise exception 'Expected LU publication guard missing';end if;
  definition=replace(definition,'if f->>''outcome''=''satisfied'' then','if public.v3_clean_lu_review_ready(p_document,p_fingerprint,f->>''unit'') then continue;end if;'||chr(10)||'if f->>''outcome''=''satisfied'' then');
 end if;
 definition=replace(definition,'public.v3_review_version_current(f,','public.v3_review_evidence_current(p_document,f,');
 execute definition;
end $$;
revoke all on function public.v3_review_evidence_current(jsonb,jsonb,text,text),public.v3_clean_lu_review_ready(jsonb,text,text,boolean) from public,anon,authenticated;
grant execute on function public.v3_review_evidence_current(jsonb,jsonb,text,text),public.v3_clean_lu_review_ready(jsonb,text,text,boolean) to service_role;
