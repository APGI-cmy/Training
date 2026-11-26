-- Freeze owner pricing with the commercial review batch. A planning review
-- records the estimate only. A release-ready proposal also uses the existing
-- price structure, approval and test publication records.
alter table public.v6_review_requests add column if not exists superseded_by uuid;
create index if not exists v7_pricing_review_current on public.v6_review_requests
 (organisation_id, (snapshot#>>'{pricing,primaryCourseId}'), created_at desc)
 where kind='commercials' and superseded_by is null and snapshot ? 'pricing';

alter table public.v6_review_mail drop constraint if exists v6_review_mail_state_check;
alter table public.v6_review_mail add constraint v6_review_mail_state_check
 check(state in('pending','sending','sent','failed','superseded'));

create or replace function public.v7_submit_pricing_review(p_actor uuid,p_payload jsonb,p_policy uuid)
returns jsonb language plpgsql set search_path='' as $$
declare
 org uuid := (p_payload->>'company')::uuid;
 op uuid := (p_payload->>'operationId')::uuid;
 price jsonb := p_payload#>'{snapshot,pricing}';
 course text := price->>'primaryCourseId';
 company_slug text;
 structure uuid;
 result jsonb;
 replacement uuid;
 prior record;
begin
 if not public.v6_review_manager(p_actor,org) then raise exception 'Company review management access required'; end if;
 select slug into company_slug from public.organisations where id=org and is_active;
 if p_payload->>'kind' is distinct from 'commercials' or course is null or length(course)>120
    or price#>>'{structure,courses,0,courseId}' is distinct from course
    or price#>>'{structure,company,id}' is distinct from org::text
    or length(coalesce(price->>'fingerprint',''))<>64
    or (p_policy is null) is distinct from (price->>'planningOnly'='true')
 then raise exception 'Invalid frozen pricing proposal'; end if;
 if p_policy is not null and not (
  (company_slug='apgi' and public.v2_is_platform_principal(p_actor))
  or (company_slug<>'apgi' and exists (
    select 1 from public.organisation_memberships where organisation_id=org
    and user_id=p_actor and membership_role='owner' and is_active
  ))
 ) then raise exception 'A course owner must submit a release-ready price'; end if;

 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(org::text||':'||course,0));
 select jsonb_build_object('id',r.id,'batch',r.batch_id,'existing',true) into result
 from public.v6_review_requests r join public.v6_review_events e on e.request_id=r.id
 where r.organisation_id=org and e.actor_id=p_actor and e.operation_id=op and e.operation='create'
 order by r.id limit 1;
 if result is not null then return result; end if;
 if p_policy is null and exists(select 1 from public.v6_review_requests r
  where r.organisation_id=org and r.kind='commercials' and r.superseded_by is null
  and r.snapshot#>>'{pricing,primaryCourseId}'=course and r.snapshot#>>'{pricing,structureId}' is not null)
 then raise exception 'The course owner has already submitted a release-ready proposal'; end if;

 if p_policy is not null then
  insert into public.cc_price_structures(company_id,policy_id,created_by,document,fingerprint)
  values(org,p_policy,p_actor,price->'structure',price->>'fingerprint') returning id into structure;
  p_payload:=jsonb_set(p_payload,'{snapshot,pricing,structureId}',to_jsonb(structure),true);
 end if;
 result:=public.v6_review_action(p_actor,'create',null,0,p_payload);
 replacement:=(result->>'batch')::uuid;
 if replacement is null then raise exception 'Pricing review could not be saved'; end if;
 for prior in
  update public.v6_review_requests
  set superseded_by=replacement,state='closed',revision=revision+1,updated_at=now(),join_hash=null
  where organisation_id=org and kind='commercials' and batch_id<>replacement and superseded_by is null
  and snapshot#>>'{pricing,primaryCourseId}'=course
  returning id
 loop
  insert into public.v6_review_events(request_id,operation_id,actor_id,operation,reason,payload)
  values(prior.id,op,p_actor,'superseded','A replacement pricing version was submitted',jsonb_build_object('replacement_batch',replacement));
  update public.admin_notifications set context=context||jsonb_build_object('task_pending',false,'resolved_at',now())
  where source_type='independent_review' and source_id=prior.id and response_type='action';
  update public.v6_review_mail set state='superseded'
  where organisation_id=org and context->>'requestId'=prior.id::text and state in('pending','failed');
 end loop;
 return result;
end $$;

create or replace function public.v7_pricing_review_action(p_actor uuid,p_operation text,p_id uuid,p_expected integer,p_payload jsonb)
returns jsonb language plpgsql set search_path='' as $$
declare
 r public.v6_review_requests;
 saved jsonb;
 structure uuid;
begin
 select * into r from public.v6_review_requests where id=p_id for update;
 if not found or r.kind<>'commercials' or not (r.snapshot ? 'pricing') then raise exception 'Pricing review unavailable'; end if;
 if r.superseded_by is not null then raise exception 'This pricing version was superseded. Open the current proposal'; end if;
 if p_operation='reopen' and r.response is not null then raise exception 'Submit a replacement proposal to request a new pricing decision'; end if;
 saved:=public.v6_review_action(p_actor,p_operation,p_id,p_expected,p_payload);
 structure:=(r.snapshot#>>'{pricing,structureId}')::uuid;
 if p_operation='respond' and structure is not null and public.v2_is_platform_principal(p_actor)
 and exists(select 1 from public.cc_price_structures where id=structure and company_id=r.organisation_id and fingerprint=r.snapshot#>>'{pricing,fingerprint}') then
  insert into public.cc_structure_decisions(structure_id,actor_id,decision,reason)
  values(structure,p_actor,case when p_payload#>>'{decisions,course-pricing}'='approve' then 'approve' else 'reject' end,trim(p_payload->>'reason'))
  on conflict(structure_id,actor_id) do nothing;
 end if;
 return saved;
end $$;

create or replace function public.cc_publish_structure(p_actor uuid,p_id uuid)
returns void language plpgsql set search_path='' as $$
declare s public.cc_price_structures; course text;
begin
 select * into s from public.cc_price_structures where id=p_id;
 course:=s.document#>>'{courses,0,courseId}';
 if not found or course is null or not public.v2_is_platform_principal(p_actor)
 or not public.cc_structure_approved(s.id) or not public.cc_policy_ready(s.policy_id) then
  raise exception 'Both exact structure approvals and active policy required';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(s.company_id::text||':'||course,0));
 if exists(select 1 from public.v6_review_requests r where r.organisation_id=s.company_id and r.kind='commercials'
  and r.superseded_by is null and r.snapshot#>>'{pricing,primaryCourseId}'=course
  and r.snapshot#>>'{pricing,structureId}' is distinct from s.id::text)
 then raise exception 'Use the current Commercials Review proposal'; end if;
 insert into public.cc_structure_releases(structure_id,company_id,course_id,created_by)
 values(s.id,s.company_id,course,p_actor) on conflict(structure_id) do nothing;
end $$;

revoke all on function public.v7_submit_pricing_review(uuid,jsonb,uuid),public.v7_pricing_review_action(uuid,text,uuid,integer,jsonb)
from public,anon,authenticated;
grant execute on function public.v7_submit_pricing_review(uuid,jsonb,uuid),public.v7_pricing_review_action(uuid,text,uuid,integer,jsonb)
to service_role;
