-- V2 only. No stored findings, coverage, implementation history or endorsements are rewritten.
CREATE OR REPLACE FUNCTION public.v3_lu_review_ready(p_document jsonb, p_fingerprint text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SECURITY INVOKER
 SET search_path TO ''
AS $function$
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
  if f#>>'{declarationReopen,findingAt}'=f->>'at' and f#>>'{declarationReopen,fingerprint}'=p_fingerprint then return false;end if;
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
   -- Submitted implementation moves directly to independent endorsement.
   if response#>>'{decision,decision}'='reopen' or response ? 'endorsementReopen' then return false;end if;
   decisions=coalesce(response->'endorsements','[]');
  end if;
  valid_endorsement=false;
  for endorsement in select e from jsonb_array_elements(decisions) e loop
   if endorsement->>'decision'='yes' and endorsement->>'findingAt'=f->>'at' and public.v3_review_version_current(f,endorsement->>'fingerprint',p_fingerprint)
    and (
     (f->>'outcome'='satisfied' and endorsement->>'email'<>f->>'author' and endorsement->>'userId'<>f->>'userId')
     or (f->>'outcome' is distinct from 'satisfied' and (
      (endorsement->>'email'<>response->>'email' and endorsement->>'userId'<>response->>'userId')
      -- Preserve completed former two-decision checks, without generating new acceptance.
      or (response#>>'{decision,decision}'='accept' and response#>>'{decision,email}'=f->>'author'
       and response#>>'{decision,userId}'=f->>'userId' and response->>'userId'<>f->>'userId'
       and endorsement->>'email'<>f->>'author' and endorsement->>'userId'<>f->>'userId'
       and exists(select 1 from jsonb_array_elements(p_document->'participants') p where p->>'email'=f->>'author' and p->>'userId'=f->>'userId' and p->>'state'<>'declined' and public.v2_review_task_assigned(p,'content')))
     ))
    )
    and exists(select 1 from auth.users u,jsonb_array_elements(p_document->'participants') p where u.id::text=endorsement->>'userId' and u.email_confirmed_at is not null and lower(u.email)=endorsement->>'email' and p->>'email'=lower(u.email) and p->>'userId'=u.id::text and p->>'state'<>'declined' and public.v2_review_task_assigned(p,'content')) then valid_endorsement=true;exit;end if;
  end loop;
  if not valid_endorsement then return false;end if;
 end loop;
 return true;
end $function$;
revoke all on function public.v3_lu_review_ready(jsonb,text) from public,anon,authenticated;
grant execute on function public.v3_lu_review_ready(jsonb,text) to service_role;
