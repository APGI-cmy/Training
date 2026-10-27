-- Human-approved, source-verified transition only. Unknown transitions retain full recheck.
create or replace function public.v2_correction_recheck_units(
 p_id uuid,p_course text,p_previous text,p_fingerprint text,p_units jsonb)
returns jsonb language sql immutable security invoker set search_path='' as $scope$
 select case when p_id='4e26a845-4c1e-442a-87f8-2ad192647b37'::uuid and p_course='vpshr-level-0'
  and p_previous='37a1df4f248783b6f583595dd3c339586b933ef3dcc342653c4838cee6f4702b'
  and p_fingerprint='b47c284e32ff813100ba0cd63fefb09fcb67146ad73204f681067cecf72e7664'
 then '["lu5","lu11"]'::jsonb
 else coalesce((select jsonb_agg(u->>'slug') from jsonb_array_elements(p_units) u),'[]'::jsonb) end;
$scope$;
revoke all on function public.v2_correction_recheck_units(uuid,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.v2_correction_recheck_units(uuid,text,text,text,jsonb) to service_role;

-- V2 correction releases stay in the same round. Only the deployed server hash is accepted.
create or replace function public.v2_register_course_correction(
 p_id uuid,p_revision integer,p_previous text,p_fingerprint text,p_actor uuid,
 p_units jsonb,p_notes text,p_deployment text,p_cutoff timestamptz,p_mail jsonb default '[]'::jsonb)
returns integer language plpgsql security invoker set search_path='' as $function$
declare r public.course_review_rounds; d jsonb; w jsonb; versions jsonb; v jsonb; actor_email text; next_rev integer; entry jsonb; recheck jsonb; preserved jsonb; f jsonb; next_findings jsonb; original_evidence jsonb;
begin
 if not public.v2_is_platform_principal(p_actor) then raise exception 'Principal required';end if;
 select lower(email) into actor_email from auth.users where id=p_actor and email_confirmed_at is not null;
 if actor_email is null then raise exception 'Verified principal required';end if;
 select * into r from public.course_review_rounds where id=p_id for update;
 if r.id is null or r.status<>'open' or r.revision<>p_revision or r.fingerprint<>p_previous then raise exception 'REVIEW_CONFLICT';end if;
 if p_fingerprint is null or p_fingerprint!~'^[a-f0-9]{64}$' or p_fingerprint=r.fingerprint then raise exception 'Changed deployed fingerprint required';end if;
 if p_cutoff is null or p_cutoff<=now() or p_cutoff<(r.document->>'cutoff')::timestamptz then raise exception 'Current or extended future cutoff required';end if;
 if p_notes is null or p_deployment is null or length(trim(p_notes))<5 or length(p_notes)>5000 or length(trim(p_deployment))<3 or length(p_deployment)>500 then raise exception 'Release reference and correction notes required';end if;
 if jsonb_typeof(p_units) is distinct from 'array' or jsonb_array_length(p_units)=0
  or exists(select 1 from jsonb_array_elements(p_units) u where coalesce(u->>'slug','')='' or coalesce(u->>'title','')='')
  or (select count(distinct u->>'slug') from jsonb_array_elements(p_units) u)<>jsonb_array_length(p_units) then raise exception 'Valid deployed units required';end if;
 d=r.document;w=d->'workflow';
 if w->>'version' is distinct from '2' then raise exception 'Current publication workflow required';end if;
 recheck=public.v2_correction_recheck_units(r.id,r.course_id,r.fingerprint,p_fingerprint,p_units);
 preserved=coalesce((select jsonb_agg(u->>'slug') from jsonb_array_elements(p_units) u where not (recheck ? (u->>'slug'))),'[]'::jsonb);
 entry=jsonb_build_object('changedUnits',recheck,'preservedUnits',preserved,'previousFingerprint',r.fingerprint,'fingerprint',p_fingerprint,'at',now(),'email',actor_email,'userId',p_actor,'notes',p_notes,'deployment',p_deployment);
 d=jsonb_set(d,'{contentRevisions}',coalesce(d->'contentRevisions','[]'::jsonb)||jsonb_build_array(entry));
 d=jsonb_set(d,'{units}',p_units);d=jsonb_set(d,'{cutoff}',to_jsonb(p_cutoff));
 -- Keep immutable reports and endorsements; only changed-unit coverage is reopened.
 d=jsonb_set(d,'{participants}',(select jsonb_agg(case when p->>'state'<>'declined' and p->>'role'<>'partner'
  then jsonb_set(jsonb_set(p,'{coverage}',coalesce((select jsonb_agg(c.value order by c.ord)
   from jsonb_array_elements(coalesce(p->'coverage','[]'::jsonb)) with ordinality c(value,ord)
   where not (recheck ? (c.value #>> '{}')) and exists(select 1 from jsonb_array_elements(p_units) u where u->>'slug'=c.value #>> '{}')),'[]'::jsonb)),
   '{state}',to_jsonb(case when p->>'userId' is null then 'invited'::text else 'active'::text end)) else p end)
  from jsonb_array_elements(d->'participants') p));
 -- Reopen affected blockers. Bind unchanged evidence to this exact approved transition,
 -- with explicit provenance; never invent an implementation or independent verifier.
 next_findings='[]'::jsonb;
 for f in select value from jsonb_array_elements(d->'findings') loop
  if not (f ? 'supersededBy') and coalesce((f->>'blocking')::boolean,false)
   and (f->>'scope'='course' or recheck ? (f->>'unit') or not exists(select 1 from jsonb_array_elements(p_units) u where u->>'slug'=f->>'unit')) then
   f=(f-'fixedBy'-'fixedFingerprint'-'fixedAt'-'verifiedBy'-'verifiedFingerprint'-'verifiedAt')||'{"status":"open"}'::jsonb;
  elsif not (f ? 'supersededBy') and not (recheck ? (f->>'unit'))
   and exists(select 1 from jsonb_array_elements(p_units) u where u->>'slug'=f->>'unit')
   and coalesce(f->>'scope','current')<>'course' and f->>'status' in ('fixed','closed')
   and f->>'fixedFingerprint'=r.fingerprint and f->>'fixedBy' is not null then
   original_evidence=jsonb_build_object('from',r.fingerprint,'to',p_fingerprint,'unit',f->>'unit','at',now(),
    'fixedFingerprint',f->>'fixedFingerprint','verifiedFingerprint',f->>'verifiedFingerprint');
   if f->>'status'='closed' and f->>'verifiedFingerprint'=r.fingerprint
    and f->>'verifiedBy' is not null and f->>'verifiedBy'<>f->>'fixedBy' then
    f=jsonb_set(f,'{verifiedFingerprint}',to_jsonb(p_fingerprint));
   end if;
   f=jsonb_set(f,'{fixedFingerprint}',to_jsonb(p_fingerprint));
   f=jsonb_set(f,'{carriedForwardEvidence}',coalesce(f->'carriedForwardEvidence','[]'::jsonb)||jsonb_build_array(original_evidence));
  end if;
  next_findings=next_findings||jsonb_build_array(f);
 end loop;
 d=jsonb_set(d,'{findings}',next_findings);
 w=w-'contentApproval';versions=w->'commercials';v=versions->-1;
 -- Monetary approvals, configurations, price and counter-offers stay exact. Archive old combined acceptance.
 if (w->>'partner')::boolean and v->'acceptance' is not null then
  v=jsonb_set(v,'{previousAcceptances}',coalesce(v->'previousAcceptances','[]'::jsonb)||jsonb_build_array(v->'acceptance'))-'acceptance';
  versions=jsonb_set(versions,array[(jsonb_array_length(versions)-1)::text],v);w=jsonb_set(w,'{commercials}',versions);
  if w->>'stage'='ready_to_publish' then w=jsonb_set(w,'{stage}','"partner_offer"'::jsonb);end if;
 end if;
 d=jsonb_set(d,'{workflow}',w);
 d=jsonb_set(d,'{events}',coalesce(d->'events','[]'::jsonb)||jsonb_build_array(jsonb_build_object('actor',actor_email,'at',now(),'action','content_revision_registered','detail','Corrected deployment '||p_fingerprint||'. '||p_notes||' Release: '||p_deployment)));
 -- Existing CAS/outbox/history transaction, followed by the fingerprint update under the same lock.
 next_rev=public.v2_commit_course_review(p_id,p_revision,d,p_actor,'content_revision_registered',p_mail);
 update public.course_review_rounds set fingerprint=p_fingerprint where id=p_id and revision=next_rev;
 return next_rev;
end $function$;
revoke all on function public.v2_register_course_correction(uuid,integer,text,text,uuid,jsonb,text,text,timestamptz,jsonb) from public,anon,authenticated;
grant execute on function public.v2_register_course_correction(uuid,integer,text,text,uuid,jsonb,text,text,timestamptz,jsonb) to service_role;

