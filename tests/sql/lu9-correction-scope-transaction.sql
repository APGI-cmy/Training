-- Run inside BEGIN/ROLLBACK. No provider calls or persistent review changes.
do $qa$
declare original public.course_review_rounds; updated public.course_review_rounds;
 person jsonb;later jsonb;finding jsonb;later_finding jsonb;
 target_hash text='ec3b6a49faa2949ca97d55db2475d3954db3f2ac80a67748d905be3783d3bff5';
begin
 select * into original from public.course_review_rounds where id='4e26a845-4c1e-442a-87f8-2ad192647b37';
 if original.status<>'open' or original.fingerprint<>'82420476dbb8d3855b681a8ce7f507268c0348ba79e47c4f20542cb907aeb8b4' then raise exception 'Unexpected live review version';end if;
 if public.v2_correction_recheck_units(original.id,original.course_id,original.fingerprint,target_hash,original.document->'units')<>'["lu9"]' then raise exception 'LU9 scope incorrect';end if;
 if jsonb_array_length(public.v2_correction_recheck_units(original.id,original.course_id,original.fingerprint,repeat('a',64),original.document->'units'))<>13 then raise exception 'Unknown release incorrectly exempted';end if;
 if has_function_privilege('anon','public.v2_correction_recheck_units(uuid,text,text,text,jsonb)','execute') or has_function_privilege('authenticated','public.v2_correction_recheck_units(uuid,text,text,text,jsonb)','execute') then raise exception 'Scope RPC exposed';end if;
 perform public.v2_register_course_correction(original.id,original.revision,original.fingerprint,target_hash,(original.document->>'requesterId')::uuid,original.document->'units','QA rollback only: LU9 replacement','QA-only-not-a-release',greatest((original.document->>'cutoff')::timestamptz,now()+interval '7 days'),'[]');
 select * into updated from public.course_review_rounds where id=original.id;
 if updated.document->'reports' is distinct from original.document->'reports' then raise exception 'Reports or their endorsements changed';end if;
 if updated.document->'nonresponsePolicy' is distinct from original.document->'nonresponsePolicy' or updated.document->'deemedEndorsements' is distinct from original.document->'deemedEndorsements' then raise exception 'Response policy/evidence changed';end if;
 if updated.document#>'{contentRevisions,-1,changedUnits}'<>'["lu9"]' or jsonb_array_length(updated.document#>'{contentRevisions,-1,preservedUnits}')<>12 then raise exception 'Wrong preserved units';end if;
 for person in select p from jsonb_array_elements(original.document->'participants') p loop
  select p into later from jsonb_array_elements(updated.document->'participants') p where p->>'email'=person->>'email';
  if later->'coverage' ? 'lu9' then raise exception 'Changed LU still confirmed';end if;
  if (select coalesce(jsonb_agg(c),'[]') from jsonb_array_elements(person->'coverage') c where c#>>'{}'<>'lu9') is distinct from later->'coverage' then raise exception 'Unchanged coverage lost';end if;
 end loop;
 for finding in select f from jsonb_array_elements(original.document->'findings') f loop
  select f into later_finding from jsonb_array_elements(updated.document->'findings') f where f->>'id'=finding->>'id';
  if later_finding is null or later_finding->'text' is distinct from finding->'text' or later_finding->'replies' is distinct from finding->'replies' or later_finding->'screenshots' is distinct from finding->'screenshots' or later_finding->'implementationRounds' is distinct from finding->'implementationRounds' or later_finding->'workflowEndorsements' is distinct from finding->'workflowEndorsements' then raise exception 'Saved finding/response evidence lost';end if;
 end loop;
 if updated.document#>'{workflow,commercials}' is distinct from original.document#>'{workflow,commercials}' or updated.document#>'{workflow,counterOffers}' is distinct from original.document#>'{workflow,counterOffers}' then raise exception 'Commercials changed';end if;
end $qa$;
select 'LU9-only recheck; twelve unchanged LU confirmations and review evidence retained; transaction rolls back' result;
