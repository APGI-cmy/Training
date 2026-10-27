-- V2 only: locked publication checks for the approved per-LU review workflow.
create or replace function public.v3_review_version_current(p_finding jsonb,p_from text,p_current text)
returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare at_version text=p_from; edge jsonb; visited text[]='{}';
begin
 if p_from=p_current then return true;end if;
 if p_finding->>'fixedFingerprint' is distinct from p_current then return false;end if;
 while not (at_version=any(visited)) loop
  visited=array_append(visited,at_version);
  select e into edge from jsonb_array_elements(coalesce(p_finding->'carriedForwardEvidence','[]')) e where e->>'from'=at_version limit 1;
  if edge is null then return false;end if;at_version=edge->>'to';if at_version=p_current then return true;end if;
 end loop;return false;
end $$;
revoke all on function public.v3_review_version_current(jsonb,text,text) from public,anon,authenticated;
grant execute on function public.v3_review_version_current(jsonb,text,text) to service_role;

create or replace function public.v3_lu_review_ready(p_document jsonb,p_fingerprint text)
returns boolean language plpgsql stable security invoker set search_path='' as $$
declare person jsonb; unit jsonb; f jsonb; response jsonb; endorsement jsonb; decisions jsonb; designer text; n integer; valid_endorsement boolean;
begin
 designer=coalesce(p_document->>'designerEmail',p_document->>'requester');
 select count(*) into n from jsonb_array_elements(p_document->'participants') p where p->>'role'='primary' and p->>'state'<>'declined' and public.v2_review_task_assigned(p,'content');
 if jsonb_array_length(coalesce(p_document->'units','[]'))=0 then return false;end if;
 if n<2 or (select count(distinct p->>'userId') from jsonb_array_elements(p_document->'participants') p where p->>'role'='primary' and p->>'state'<>'declined' and public.v2_review_task_assigned(p,'content'))<>n then return false;end if;
 for person in select p from jsonb_array_elements(p_document->'participants') p where p->>'role'='primary' and p->>'state'<>'declined' and public.v2_review_task_assigned(p,'content') loop
  if not exists(select 1 from auth.users u where u.id::text=person->>'userId' and lower(u.email)=person->>'email' and u.email_confirmed_at is not null) then return false;end if;
  for unit in select u from jsonb_array_elements(p_document->'units') u loop
   if not (coalesce(person->'coverage','[]') ? (unit->>'slug')) or not exists(select 1 from jsonb_array_elements(p_document->'findings') finding where not (finding ? 'supersededBy') and finding->>'author'=person->>'email' and (finding->>'unit'=unit->>'slug' or finding->>'scope'='course')) then return false;end if;
  end loop;
 end loop;
 for f in select a from jsonb_array_elements(p_document->'findings') a where not (a ? 'supersededBy') loop
  if f->>'status' is distinct from 'closed' or not exists(select 1 from auth.users u where u.id::text=f->>'userId' and lower(u.email)=f->>'author' and u.email_confirmed_at is not null) then return false;end if;
  if f->>'outcome'='satisfied' then decisions=coalesce(f->'workflowEndorsements','[]');
  else
   response=f->'implementationRounds'->-1;
   -- Preserve qualified prior verification, without inventing a new response/endorsement.
   if response is null and f->>'fixedFingerprint'=p_fingerprint and f->>'verifiedFingerprint'=p_fingerprint and f->>'fixedBy' is not null and f->>'verifiedBy' is not null and f->>'fixedBy'<>f->>'verifiedBy'
    and exists(select 1 from auth.users u,jsonb_array_elements(p_document->'participants') p where u.id::text=f->>'verifiedBy' and u.email_confirmed_at is not null and p->>'userId'=u.id::text and p->>'email'=lower(u.email) and p->>'state'<>'declined' and public.v2_review_task_assigned(p,'content')) then continue;end if;
   if response is null or response->>'findingAt' is distinct from f->>'at' or not public.v3_review_version_current(f,response->>'fingerprint',p_fingerprint)
    or coalesce(response->>'implemented','') not in ('yes','no') or length(trim(coalesce(response->>'notes','')))<5
    or response->>'email' is distinct from designer or not exists(select 1 from auth.users u where u.id::text=response->>'userId' and lower(u.email)=designer and u.email_confirmed_at is not null)
    or (designer=p_document->>'requester' and response->>'userId' is distinct from p_document->>'requesterId')
   then return false;end if;
   if response->>'userId' is distinct from f->>'userId' and (response#>>'{decision,decision}' is distinct from 'accept' or response#>>'{decision,userId}' is distinct from f->>'userId' or response#>>'{decision,email}' is distinct from f->>'author') then return false;end if;
   if response#>>'{decision,decision}'='reopen' then return false;end if;
   decisions=coalesce(response->'endorsements','[]');
  end if;
  valid_endorsement=false;
  for endorsement in select e from jsonb_array_elements(decisions) e loop
   if endorsement->>'decision'='yes' and endorsement->>'findingAt'=f->>'at' and public.v3_review_version_current(f,endorsement->>'fingerprint',p_fingerprint)
    and endorsement->>'email'<>f->>'author' and endorsement->>'userId'<>f->>'userId'
    and exists(select 1 from auth.users u,jsonb_array_elements(p_document->'participants') p where u.id::text=endorsement->>'userId' and u.email_confirmed_at is not null and lower(u.email)=endorsement->>'email' and p->>'email'=lower(u.email) and p->>'userId'=u.id::text and p->>'state'<>'declined' and public.v2_review_task_assigned(p,'content')) then valid_endorsement=true;exit;end if;
  end loop;
  if not valid_endorsement then return false;end if;
 end loop;
 return true;
end $$;
revoke all on function public.v3_lu_review_ready(jsonb,text) from public,anon,authenticated;
grant execute on function public.v3_lu_review_ready(jsonb,text) to service_role;

-- Keep the complete commercial, branding, pricing, owner and final-clearance guards.
-- Only the legacy report/endorsement loop is replaced for documents explicitly on v3.
do $patch$
declare definition text; start_at integer; end_at integer; original text; marker text;
begin
 select pg_get_functiondef('public.v2_publish_reviewed_course(uuid,integer,uuid,text)'::regprocedure) into definition;
 if position('public.v3_lu_review_ready' in definition)=0 then
  start_at=position('select count(*) into n from jsonb_array_elements(r.document->''participants'')' in definition);
  end_at=position('if exists(select 1 from jsonb_array_elements(r.document->''findings'')' in definition);
  if start_at=0 or end_at<=start_at then raise exception 'Publication review guard changed; inspect before patching';end if;
  original=substring(definition from start_at for end_at-start_at);
  definition=substring(definition from 1 for start_at-1)||'if r.document->>''reviewProcessVersion''=''3'' then
   if not public.v3_lu_review_ready(r.document,p_fingerprint) then raise exception ''Complete every LU review, response decision and additional endorsement'';end if;
  else
  '||original||'end if;
  '||substring(definition from end_at);
  execute definition;
 end if;
 select pg_get_functiondef('public.v2_commit_course_review(uuid,integer,jsonb,uuid,text,jsonb)'::regprocedure) into definition;
 marker='p_action in (''finding'',''reopen_report'')';
 if position(marker in definition)>0 then
  definition=replace(definition,marker,'p_action in (''finding'',''reopen_report'',''implementation_submit'',''implementation_decision'',''finding_endorsement'',''finding_reopen'')');
  execute definition;
 elsif position('''implementation_decision''' in definition)=0 then raise exception 'Commit invalidation guard changed; inspect before patching';end if;
end $patch$;
