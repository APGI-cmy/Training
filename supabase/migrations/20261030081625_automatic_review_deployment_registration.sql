-- Only the trusted V2 server may record a confirmed live content deployment.
-- No browser-supplied scope, human impersonation or review approval is accepted.
create function public.v3_deployment_recheck_units(
 p_id uuid,p_course text,p_previous text,p_fingerprint text,p_before jsonb,p_after jsonb,p_units jsonb)
returns jsonb language plpgsql immutable security invoker set search_path='' as $$
declare changed jsonb;
begin
 if p_before->>'version'='1' and p_before->>'courseId'=p_course and p_before->>'fingerprint'=p_previous then
  if p_before->>'engine' is distinct from p_after->>'engine' or p_before->>'shared' is distinct from p_after->>'shared'
   or exists(select 1 from jsonb_object_keys(p_before->'units') k where not(p_after->'units' ? k)) then
   return (select jsonb_agg(u->>'slug') from jsonb_array_elements(p_units) u);
  end if;
  select coalesce(jsonb_agg(u->>'slug'),'[]'::jsonb) into changed from jsonb_array_elements(p_units) u
   where p_before->'units'->>(u->>'slug') is distinct from p_after->'units'->>(u->>'slug');
  if jsonb_array_length(changed)>0 then return changed;end if;
  return (select jsonb_agg(u->>'slug') from jsonb_array_elements(p_units) u);
 end if;
 -- Upgrade earlier reviews using their already source-verified exact transitions.
 return public.v2_correction_recheck_units(p_id,p_course,p_previous,p_fingerprint,p_units);
end $$;
revoke all on function public.v3_deployment_recheck_units(uuid,text,text,text,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.v3_deployment_recheck_units(uuid,text,text,text,jsonb,jsonb,jsonb) to service_role;

create function public.v3_register_course_deployment(
 p_id uuid,p_revision integer,p_previous text,p_identity jsonb,p_units jsonb,p_deployment jsonb,p_notes text,p_mail jsonb default '[]'::jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.course_review_rounds;d jsonb;w jsonb;versions jsonb;v jsonb;entry jsonb;recheck jsonb;preserved jsonb;
 f jsonb;next_findings jsonb;original_evidence jsonb;m jsonb;next_rev integer;
 p_fingerprint text=p_identity->>'fingerprint';actor_email text='APGI platform';deployment_reference text;next_cutoff timestamptz;
begin
 if current_user not in ('postgres','service_role') then raise exception 'Service role required';end if;
 select * into r from public.course_review_rounds where id=p_id for update;
 if r.id is null or r.status<>'open' or r.document#>>'{workflow,version}' is distinct from '2' then raise exception 'Open publication review required';end if;
 if p_identity->>'version' is distinct from '1' or p_identity->>'courseId' is distinct from r.course_id
  or p_fingerprint is null or p_fingerprint!~'^[a-f0-9]{64}$'
  or coalesce(p_identity->>'engine','')!~'^[a-f0-9]{64}$' or coalesce(p_identity->>'shared','')!~'^[a-f0-9]{64}$'
  or jsonb_typeof(p_identity->'units') is distinct from 'object' then raise exception 'Valid deployed identity required';end if;
 if jsonb_typeof(p_units) is distinct from 'array' or jsonb_array_length(p_units)=0
  or exists(select 1 from jsonb_array_elements(p_units) u where coalesce(u->>'slug','')='' or coalesce(u->>'title','')='' or coalesce(p_identity->'units'->>(u->>'slug'),'')!~'^[a-f0-9]{64}$')
  or (select count(distinct u->>'slug') from jsonb_array_elements(p_units) u)<>jsonb_array_length(p_units)
  or (select count(*) from jsonb_object_keys(p_identity->'units'))<>jsonb_array_length(p_units) then raise exception 'Valid deployed units required';end if;
 if coalesce(p_deployment->>'id','')!~'^dpl_[a-zA-Z0-9]+$' or coalesce(p_deployment->>'url','')!~'^https://[a-zA-Z0-9.-]+[.]vercel[.]app$' then raise exception 'Confirmed deployment reference required';end if;
 -- Concurrent duplicate visits/jobs are a no-op after the first registration.
 if r.fingerprint=p_fingerprint and r.document->'contentIdentity'=p_identity then return jsonb_build_object('revision',r.revision,'registered',false,'baseline',false);end if;
 if r.revision<>p_revision or r.fingerprint<>p_previous then raise exception 'REVIEW_CONFLICT';end if;
 if r.fingerprint=p_fingerprint then
  if r.document->'contentIdentity' is not null then raise exception 'IDENTITY_CONFLICT';end if;
  d=jsonb_set(jsonb_set(r.document,'{contentIdentity}',p_identity),'{registeredDeployment}',p_deployment);
  update public.course_review_rounds set document=d,revision=revision+1 where id=r.id returning revision into next_rev;
  insert into public.course_review_history(round_id,revision,actor_id,action,snapshot) values(r.id,next_rev,null,'deployment_identity_baselined',d);
  return jsonb_build_object('revision',next_rev,'registered',false,'baseline',true);
 end if;
 if p_notes is null or length(trim(p_notes))<5 or length(p_notes)>5000 or jsonb_typeof(p_mail) is distinct from 'array' then raise exception 'Valid registration summary required';end if;
 for m in select * from jsonb_array_elements(p_mail) loop
  if m->>'kind' is distinct from 'content_revision_registered' or coalesce(m->>'key','')='' or not(m->>'to'=r.document->>'requester' or m->>'to'=r.document#>>'{workflow,partnerEmail}' or exists(select 1 from jsonb_array_elements(r.document->'participants') p where p->>'email'=m->>'to' and p->>'state'<>'declined')) then raise exception 'Invalid review notice';end if;
 end loop;
 deployment_reference=p_deployment->>'url'||' ('||(p_deployment->>'id')||')';
 next_cutoff=(r.document->>'cutoff')::timestamptz;
 -- Existing agreed seven-day policy: a new content request gets a fresh window.
 -- The outbox delivery/timer transaction may extend it further from actual send time.
 if r.document#>>'{nonresponsePolicy,version}'='1' then next_cutoff=greatest(next_cutoff,now()+interval '7 days');end if;
 d=r.document;w=d->'workflow';
 if w->>'version' is distinct from '2' then raise exception 'Current publication workflow required';end if;
 recheck=public.v3_deployment_recheck_units(r.id,r.course_id,r.fingerprint,p_fingerprint,d->'contentIdentity',p_identity,p_units);
 preserved=coalesce((select jsonb_agg(u->>'slug') from jsonb_array_elements(p_units) u where not (recheck ? (u->>'slug'))),'[]'::jsonb);
 entry=jsonb_build_object('changedUnits',recheck,'preservedUnits',preserved,'previousFingerprint',r.fingerprint,'fingerprint',p_fingerprint,'at',now(),'email',actor_email,'userId',null,'automatic',true,'deploymentId',p_deployment->>'id','notes',p_notes,'deployment',deployment_reference);
 d=jsonb_set(d,'{contentRevisions}',coalesce(d->'contentRevisions','[]'::jsonb)||jsonb_build_array(entry));
 d=jsonb_set(d,'{contentIdentity}',p_identity);d=jsonb_set(d,'{registeredDeployment}',p_deployment);
 d=jsonb_set(d,'{units}',p_units);d=jsonb_set(d,'{cutoff}',to_jsonb(next_cutoff));
 -- Keep immutable reports and endorsements; only changed-unit coverage is reopened.
 d=jsonb_set(d,'{participants}',(select jsonb_agg(case when p->>'state'<>'declined' and p->>'role'<>'partner' and (not(p ? 'tasks') or p->'tasks' ? 'content')
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
 d=jsonb_set(d,'{events}',coalesce(d->'events','[]'::jsonb)||jsonb_build_array(jsonb_build_object('actor',actor_email,'at',now(),'action','content_revision_auto_registered','detail','Corrected deployment '||p_fingerprint||'. '||p_notes||' Release: '||deployment_reference)));

 -- A constrained system transaction, not a principal approval. Copy only the
 -- reviewed document paths above; financial terms and approval identities stay exact.
 update public.course_review_rounds set document=d,fingerprint=p_fingerprint,revision=revision+1 where id=r.id returning revision into next_rev;
 insert into public.course_review_history(round_id,revision,actor_id,action,snapshot) values(r.id,next_rev,null,'content_revision_auto_registered',d);
 for m in select * from jsonb_array_elements(p_mail) loop
  insert into public.course_review_mail(round_id,notification_key,recipient,kind,subject,body)
   values(r.id,m->>'key',m->>'to',m->>'kind',m->>'subject',m->>'body') on conflict(notification_key) do nothing;
 end loop;
 return jsonb_build_object('revision',next_rev,'registered',true,'baseline',false,'changedUnits',recheck,'preservedUnits',preserved);
end $$;
revoke all on function public.v3_register_course_deployment(uuid,integer,text,jsonb,jsonb,jsonb,text,jsonb) from public,anon,authenticated;
grant execute on function public.v3_register_course_deployment(uuid,integer,text,jsonb,jsonb,jsonb,text,jsonb) to service_role;
