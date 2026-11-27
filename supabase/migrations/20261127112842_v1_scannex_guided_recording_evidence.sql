-- Preserve the existing RPC's ownership, signature, version and review gates.
-- Only the guided worksheet's evidence requirement changes. This RPC is service-role only.
do $migration$
declare
 definition text := pg_get_functiondef('public.v1_practical_mutate(uuid,text,uuid,jsonb)'::regprocedure);
 legacy_gate text := $old$if not exists(select 1 from public.v1_practical_files where assignment_id=a.id and case_id=(c->>'id')::uuid and kind='viewer_image' and status='verified')
     or not exists(select 1 from public.v1_practical_files where assignment_id=a.id and case_id=(c->>'id')::uuid and kind in ('recording','native_log') and status='verified') then raise exception 'EVIDENCE_REQUIRED'; end if;$old$;
 guided_gate text := $new$if p_data->>'evidencePolicy'='guided-recording-v1' then
      if not exists(select 1 from public.v1_practical_files where assignment_id=a.id and case_id=(c->>'id')::uuid and kind='recording' and status='verified') then
       raise exception 'EVIDENCE_REQUIRED';
      end if;
     else
      LEGACY_GATE
     end if;$new$;
 snapshot_anchor text := $anchor$'declarationVersion','scannex-integrity-v1-20261125','submittedAt',now(),$anchor$;
begin
 definition := replace(definition,E'\r\n',E'\n');
 if strpos(definition,legacy_gate)=0 or strpos(definition,snapshot_anchor)=0 or strpos(definition,'guided-recording-v1')>0 then
  raise exception 'PRACTICAL_RPC_CHANGED_REVIEW_REQUIRED';
 end if;
 definition := replace(definition,legacy_gate,replace(guided_gate,'LEGACY_GATE',legacy_gate));
 execute replace(definition,snapshot_anchor,snapshot_anchor || $meta$ 'evidencePolicy',p_data->>'evidencePolicy',$meta$);
end $migration$;

-- Match the policy frozen with each submission. Do not reinterpret earlier
-- submissions or waive assessor approval, verified files or safety checks.
create or replace function public.v1_practical_evidence_complete(p_assessment uuid) returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.v1_practical_assignments a join public.v1_practical_submissions s on s.id=a.latest_submission_id
 join public.v1_practical_reviews r on r.submission_id=s.id join public.user_roles u on u.user_id=r.assessor_id and u.role='admin'
 where a.assessment_id=p_assessment and a.status='assessed' and r.decision='passed' and r.evidence_verified and not r.safety_concern
 and jsonb_array_length(s.snapshot->'document'->'cases')=3
 and not exists(select 1 from jsonb_array_elements(s.snapshot->'document'->'cases') c where
 case when s.snapshot->>'evidencePolicy'='guided-recording-v1' then
  not exists(select 1 from jsonb_array_elements(s.snapshot->'files') f where f->>'case_id'=c->>'caseId' and f->>'kind'='recording' and f->>'status'='verified')
 else
  not exists(select 1 from jsonb_array_elements(s.snapshot->'files') f where f->>'case_id'=c->>'caseId' and f->>'kind'='viewer_image' and f->>'status'='verified')
  or not exists(select 1 from jsonb_array_elements(s.snapshot->'files') f where f->>'case_id'=c->>'caseId' and f->>'kind' in ('recording','native_log') and f->>'status'='verified')
 end))
$$;
