-- V2 correction releases stay in the same round. Only the deployed server hash is accepted.
create or replace function public.v2_register_course_correction(
 p_id uuid,p_revision integer,p_previous text,p_fingerprint text,p_actor uuid,
 p_units jsonb,p_notes text,p_deployment text,p_cutoff timestamptz,p_mail jsonb default '[]'::jsonb)
returns integer language plpgsql security invoker set search_path='' as $function$
declare r public.course_review_rounds; d jsonb; w jsonb; versions jsonb; v jsonb; actor_email text; next_rev integer; entry jsonb;
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
 entry=jsonb_build_object('previousFingerprint',r.fingerprint,'fingerprint',p_fingerprint,'at',now(),'email',actor_email,'userId',p_actor,'notes',p_notes,'deployment',p_deployment);
 d=jsonb_set(d,'{contentRevisions}',coalesce(d->'contentRevisions','[]'::jsonb)||jsonb_build_array(entry));
 d=jsonb_set(d,'{units}',p_units);d=jsonb_set(d,'{cutoff}',to_jsonb(p_cutoff));
 -- Reports/endorsements are retained but cannot satisfy the new fingerprint.
 d=jsonb_set(d,'{participants}',(select jsonb_agg(case when p->>'state'<>'declined' and p->>'role'<>'partner'
  then jsonb_set(jsonb_set(p,'{coverage}','[]'::jsonb),'{state}',to_jsonb(case when p->>'userId' is null then 'invited'::text else 'active'::text end)) else p end) from jsonb_array_elements(d->'participants') p));
 -- Recheck all blocking issues conservatively; the preceding complete state is in immutable history.
 d=jsonb_set(d,'{findings}',coalesce((select jsonb_agg(case when (f->>'blocking')::boolean and not (f ? 'supersededBy')
  then (f-'fixedBy'-'fixedFingerprint'-'fixedAt'-'verifiedBy'-'verifiedFingerprint'-'verifiedAt')||'{"status":"open"}'::jsonb else f end) from jsonb_array_elements(d->'findings') f),'[]'::jsonb));
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

-- Repeat content-version and independent correction checks in the locked final release transaction.
-- Preserve every existing commercial, company-owner, price-floor and cost-waterfall guard.
do $migration$
declare definition text; marker text;
begin
 select pg_get_functiondef('public.v2_publish_reviewed_course(uuid,integer,uuid,text)'::regprocedure) into definition;
 marker := 'if person->>''state''<>''finished'' or report is null then';
 if position(marker in definition)=0 then raise exception 'Report guard insertion point changed';end if;
 definition:=replace(definition,marker,
  'if jsonb_array_length(coalesce(r.document->''contentRevisions'',''[]''::jsonb))>0 and report->>''fingerprint'' is distinct from p_fingerprint then raise exception ''Current deployed version report required'';end if;'||chr(10)||marker);
 marker := 'r.document=jsonb_set(r.document,''{workflow,stage}''';
 if position(marker in definition)=0 then raise exception 'Publication guard insertion point changed';end if;
 definition:=replace(definition,marker,
  'if jsonb_array_length(coalesce(r.document->''contentRevisions'',''[]''::jsonb))>0 and exists(select 1 from jsonb_array_elements(r.document->''findings'') f where (f->>''blocking'')::boolean and not (f ? ''supersededBy'') and (f->>''fixedFingerprint'' is distinct from p_fingerprint or f->>''verifiedFingerprint'' is distinct from p_fingerprint or f->>''fixedBy'' is null or f->>''verifiedBy'' is null or f->>''fixedBy''=f->>''verifiedBy'' or not exists(select 1 from auth.users u,jsonb_array_elements(r.document->''participants'') p where u.id::text=f->>''verifiedBy'' and u.email_confirmed_at is not null and p->>''userId''=u.id::text and p->>''state''<>''declined''))) then raise exception ''Current corrections require independent verified closure'';end if;'||chr(10)||marker);
 execute definition;
end $migration$;
revoke all on function public.v2_publish_reviewed_course(uuid,integer,uuid,text) from public,anon,authenticated;
grant execute on function public.v2_publish_reviewed_course(uuid,integer,uuid,text) to service_role;
