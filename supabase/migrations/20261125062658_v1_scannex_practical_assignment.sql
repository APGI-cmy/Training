-- V1 only. Service-only records; browser clients never receive an answer key.
-- The existing criterion maxima total 100, not 99. Preserve historical versions.
alter table public.assessment_practical_rubrics drop constraint assessment_practical_rubrics_raw_score_check;
alter table public.assessment_practical_rubrics add constraint assessment_practical_rubrics_raw_score_check
 check(raw_score>=0 and raw_score<=case when rubric_version='scannex-practical-v1-even-density-20261125' then 100 else 99 end);
create table public.v1_practical_packs (
 id uuid primary key default gen_random_uuid(), title text not null,
 version text not null default 'scannex-practical-assignment-v1-20261125',
 status text not null default 'draft' check(status in ('draft','approved','retired')),
 instructions text not null default '', density_rule text not null default 'even' check(density_rule in ('even','uneven','review_required')),
 calibration_notes text not null default '', learner_cases jsonb not null, answer_keys jsonb not null,
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 approved_by uuid references auth.users(id), approved_at timestamptz, edit_version integer not null default 0
);
create table public.v1_practical_assignments (
 id uuid primary key default gen_random_uuid(), assessment_id uuid not null unique references public.assessment_bookings(id),
 pack_id uuid not null references public.v1_practical_packs(id), learner_user_id uuid not null references auth.users(id),
 v1_run_id uuid not null references public.v1_course_runs(id),
 status text not null default 'assigned' check(status in ('assigned','draft','submitted','changes_requested','assessed')),
 revision integer not null default 1, draft_version integer not null default 0, document jsonb not null default '{}',
 latest_submission_id uuid, started_at timestamptz, submitted_at timestamptz, created_at timestamptz not null default now()
);
create index on public.v1_practical_assignments(learner_user_id,created_at desc);
create index on public.v1_practical_assignments(pack_id);
create table public.v1_practical_files (
 id uuid primary key default gen_random_uuid(), assignment_id uuid references public.v1_practical_assignments(id),
 pack_id uuid references public.v1_practical_packs(id), case_id uuid not null,
 kind text not null check(kind in ('case_source','viewer_image','recording','native_log','native_result','supporting_report')),
 original_filename text not null, mime_type text not null, size_bytes bigint not null check(size_bytes between 1 and 157286400),
 storage_path text not null unique, status text not null default 'pending' check(status in ('pending','verified')),
 sha256 text check(sha256 ~ '^[a-f0-9]{64}$'), uploaded_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(), verified_at timestamptz,
 check ((assignment_id is not null and pack_id is null and kind<>'case_source') or (pack_id is not null and assignment_id is null and kind='case_source')),
 check(status<>'verified' or (sha256 is not null and verified_at is not null))
);
create index on public.v1_practical_files(assignment_id);
create index on public.v1_practical_files(pack_id);
create table public.v1_practical_submissions (
 id uuid primary key default gen_random_uuid(), assignment_id uuid not null references public.v1_practical_assignments(id),
 revision integer not null, snapshot jsonb not null, canonical_snapshot text not null, sha256 text not null,
 signed_name text not null, submitted_by uuid not null references auth.users(id), submitted_at timestamptz not null default now(),
 unique(assignment_id,revision)
);
alter table public.v1_practical_assignments add constraint v1_practical_latest_submission_fk foreign key(latest_submission_id) references public.v1_practical_submissions(id);
create table public.v1_practical_reviews (
 id uuid primary key default gen_random_uuid(), submission_id uuid not null unique references public.v1_practical_submissions(id),
 decision text not null check(decision in ('passed','failed','changes_requested')), item_scores jsonb not null,
 notes text not null, safety_concern boolean not null, evidence_verified boolean not null,
 raw_score integer, normalized_score numeric(5,2), final_score numeric(5,2),
 assessor_id uuid not null references auth.users(id), reviewed_at timestamptz not null default now()
);
create table public.v1_practical_events (
 id bigint generated always as identity primary key, assignment_id uuid references public.v1_practical_assignments(id),
 pack_id uuid references public.v1_practical_packs(id), actor_user_id uuid not null references auth.users(id),
 event_type text not null, metadata jsonb not null default '{}', occurred_at timestamptz not null default now()
);
create index on public.v1_practical_events(assignment_id,occurred_at);
create index on public.v1_practical_events(pack_id,occurred_at);
create index on public.v1_practical_packs(created_by);
create index on public.v1_practical_packs(approved_by);
create index on public.v1_practical_assignments(v1_run_id);
create index on public.v1_practical_assignments(latest_submission_id);
create index on public.v1_practical_files(uploaded_by);
create index on public.v1_practical_submissions(submitted_by);
create index on public.v1_practical_reviews(assessor_id);
create index on public.v1_practical_events(actor_user_id);
create function public.v1_practical_freeze() returns trigger language plpgsql set search_path='' as $$
begin
 if TG_TABLE_NAME in ('v1_practical_submissions','v1_practical_reviews','v1_practical_events')
 or (TG_TABLE_NAME='v1_practical_files' and to_jsonb(old)->>'status'='verified')
 or (TG_TABLE_NAME='v1_practical_packs' and to_jsonb(old)->>'status'<>'draft') then raise exception 'IMMUTABLE_EVIDENCE'; end if;
 return new;
end $$;
create trigger freeze_practical_submission before update or delete on public.v1_practical_submissions for each row execute function public.v1_practical_freeze();
create trigger freeze_practical_review before update or delete on public.v1_practical_reviews for each row execute function public.v1_practical_freeze();
create trigger freeze_practical_event before update or delete on public.v1_practical_events for each row execute function public.v1_practical_freeze();
create trigger freeze_practical_file before update or delete on public.v1_practical_files for each row execute function public.v1_practical_freeze();
create trigger freeze_practical_pack before update or delete on public.v1_practical_packs for each row execute function public.v1_practical_freeze();

-- One transactional mutation boundary. p_actor is set from verified Auth by our server,
-- never from request JSON. No PUBLIC/anon/authenticated EXECUTE privilege.
create function public.v1_practical_mutate(p_actor uuid,p_operation text,p_id uuid default null,p_data jsonb default '{}')
returns jsonb language plpgsql security invoker set search_path='' as $$
declare a public.v1_practical_assignments; p public.v1_practical_packs; b public.assessment_bookings;
 f public.v1_practical_files; s public.v1_practical_submissions; r public.v1_course_runs;
 is_admin boolean; result jsonb; c jsonb; k jsonb; v uuid; n text; snapshot_value jsonb;
 raw integer:=0; norm numeric; final_mark numeric; t public.assessment_theory_attempts;
 criterion text; max_mark integer; mark numeric; scores jsonb; verdict text;
begin
 select exists(select 1 from public.user_roles where user_id=p_actor and role='admin') into is_admin;
 if p_operation in ('create_pack','save_pack','approve_pack','assign','review') and not is_admin then raise exception 'FORBIDDEN'; end if;
 if p_operation='create_pack' then
  insert into public.v1_practical_packs(title,learner_cases,answer_keys,created_by)
  values(coalesce(nullif(trim(p_data->>'title'),''),'New practical case pack'),p_data->'cases',p_data->'keys',p_actor) returning * into p;
  result:=to_jsonb(p);
 elsif p_operation in ('save_pack','approve_pack') then
  select * into p from public.v1_practical_packs where id=p_id for update;
  if p.id is null or p.status<>'draft' then raise exception 'PACK_LOCKED'; end if;
  if p.edit_version is distinct from (p_data->>'expectedVersion')::integer then raise exception 'STALE_VERSION'; end if;
  if p_operation='save_pack' then
   if jsonb_array_length(p_data->'cases')<>3 or jsonb_array_length(p_data->'keys')<>3 then raise exception 'THREE_CASES_REQUIRED'; end if;
   update public.v1_practical_packs set title=p_data->>'title',instructions=p_data->>'instructions',density_rule='even',
   calibration_notes=p_data->>'calibration',learner_cases=p_data->'cases',answer_keys=p_data->'keys',edit_version=edit_version+1 where id=p.id returning * into p;
  else
   if p.density_rule<>'even' or length(trim(p.calibration_notes))<1 or jsonb_array_length(p.learner_cases)<>3 then raise exception 'CALIBRATION_REQUIRED'; end if;
   for c in select value from jsonb_array_elements(p.learner_cases) loop
    select value into k from jsonb_array_elements(p.answer_keys) where value->>'caseId'=c->>'id';
    if k is null or length(trim(k->>'provenance'))<1 or k->>'truth'<>(case when (c->>'number')::integer=1 then 'confirmed_negative' else 'confirmed_diamond' end)
     or ((c->>'number')::integer=1 and jsonb_array_length(k->'targets')<>0)
     or ((c->>'number')::integer>1 and jsonb_array_length(k->'targets')<1)
     or not exists(select 1 from public.v1_practical_files where id=(c->>'sourceFileId')::uuid and pack_id=p.id and case_id=(c->>'id')::uuid and status='verified')
     then raise exception 'UNVERIFIED_CASE_SET'; end if;
   end loop;
   update public.v1_practical_packs set status='approved',approved_by=p_actor,approved_at=now(),edit_version=edit_version+1 where id=p.id returning * into p;
  end if;
  result:=to_jsonb(p);
 elsif p_operation='assign' then
  select * into b from public.assessment_bookings where id=p_id for update;
  if b.id is null or b.course_id<>'scannex-training-programme' or b.status not in ('scheduled','approved') then raise exception 'BOOKING_NOT_AVAILABLE'; end if;
  select * into p from public.v1_practical_packs where id=(p_data->>'packId')::uuid and status='approved';
  if p.id is null then raise exception 'APPROVED_PACK_REQUIRED'; end if;
  r:=public.v1_ensure_run(b.learner_user_id);
  if b.v1_run_id is not null and b.v1_run_id<>r.id then raise exception 'WRONG_COURSE_ATTEMPT'; end if;
  update public.assessment_bookings set status='approved',approved_by=coalesce(approved_by,p_actor),approved_at=coalesce(approved_at,now()),v1_run_id=r.id where id=b.id;
  insert into public.v1_practical_assignments(assessment_id,pack_id,learner_user_id,v1_run_id) values(b.id,p.id,b.learner_user_id,r.id) returning * into a;
  insert into public.assessment_events(assessment_id,event_type,actor_user_id,metadata) values(b.id,'approved',p_actor,jsonb_build_object('assignmentId',a.id,'packId',p.id));
  result:=to_jsonb(a);
 elsif p_operation in ('reserve_file','verify_file') then
  if p_operation='verify_file' then
   select * into f from public.v1_practical_files where id=p_id for update;
   if f.id is null then raise exception 'NOT_FOUND'; end if;
  end if;
  if coalesce(f.assignment_id,(p_data->>'assignmentId')::uuid) is not null then
   select * into a from public.v1_practical_assignments where id=coalesce(f.assignment_id,(p_data->>'assignmentId')::uuid) for update;
   if a.id is null or a.learner_user_id<>p_actor then raise exception 'FORBIDDEN'; end if;
   perform public.v1_assert_enrolled(p_actor);
   if a.status not in ('draft','changes_requested') then raise exception 'ASSIGNMENT_LOCKED'; end if;
   select * into p from public.v1_practical_packs where id=a.pack_id;
   if p_operation='reserve_file' and ((select count(*) from public.v1_practical_files where assignment_id=a.id)>=40
    or (select coalesce(sum(size_bytes),0) from public.v1_practical_files where assignment_id=a.id)+(p_data->>'size')::bigint>786432000) then raise exception 'UPLOAD_LIMIT'; end if;
  else
   if not is_admin then raise exception 'FORBIDDEN'; end if;
   select * into p from public.v1_practical_packs where id=coalesce(f.pack_id,(p_data->>'packId')::uuid) for update;
   if p.id is null or p.status<>'draft' then raise exception 'PACK_LOCKED'; end if;
   if p_operation='reserve_file' and (select count(*) from public.v1_practical_files where pack_id=p.id)>=30 then raise exception 'UPLOAD_LIMIT'; end if;
  end if;
  if p_operation='reserve_file' then
   if p_data->>'kind'='recording' and (p_data->>'recordingNoticeAccepted')::boolean is not true then raise exception 'APPROVAL_REQUIRED'; end if;
   if not exists(select 1 from jsonb_array_elements(p.learner_cases) where value->>'id'=p_data->>'caseId') then raise exception 'INVALID_CASE_SET'; end if;
   v:=gen_random_uuid();
   insert into public.v1_practical_files(id,assignment_id,pack_id,case_id,kind,original_filename,mime_type,size_bytes,storage_path,uploaded_by)
   values(v,a.id,case when a.id is null then p.id end,(p_data->>'caseId')::uuid,p_data->>'kind',p_data->>'name',p_data->>'mime',
    (p_data->>'size')::bigint,coalesce(a.id,p.id)::text||'/'||v::text||'/'||(p_data->>'safeName'),p_actor) returning * into f;
  else
   if f.status='verified' then return to_jsonb(f); end if;
   update public.v1_practical_files set status='verified',sha256=p_data->>'sha256',verified_at=now() where id=f.id returning * into f;
  end if;
  result:=to_jsonb(f);
 else
  select * into a from public.v1_practical_assignments where id=p_id for update;
  if a.id is null then raise exception 'NOT_FOUND'; end if;
  select * into b from public.assessment_bookings where id=a.assessment_id for update;
  select * into p from public.v1_practical_packs where id=a.pack_id;
  if p_operation<>'review' then
   if a.learner_user_id<>p_actor then raise exception 'FORBIDDEN'; end if;
   r:=public.v1_ensure_run(p_actor);
   if r.id<>a.v1_run_id then raise exception 'WRONG_COURSE_ATTEMPT'; end if;
   if b.status not in ('approved','in_progress','evidence_pending') or p.status<>'approved' then raise exception 'ASSIGNMENT_LOCKED'; end if;
  end if;
  if p_operation='start' then
   if a.status='assigned' then
    if (select count(distinct unit_id) from public.learner_progress where user_id=p_actor and course_id='scannex-training-programme' and status='completed' and unit_id in ('scannex-lu-1','scannex-lu-2','scannex-lu-3','scannex-lu-4','scannex-lu-5','scannex-lu-6','scannex-lu-7','scannex-lu-8'))<>8 then raise exception 'LEARNING_NOT_COMPLETE'; end if;
    update public.v1_practical_assignments set status='draft',started_at=now() where id=a.id returning * into a;
    update public.assessment_bookings set status='in_progress' where id=b.id;
   end if;
  elsif p_operation in ('save','submit') then
   if a.status not in ('draft','changes_requested') then raise exception 'ASSIGNMENT_LOCKED'; end if;
   if a.draft_version is distinct from (p_data->>'expectedVersion')::integer then raise exception 'STALE_VERSION'; end if;
   if p_operation='save' then
    if octet_length((p_data->'document')::text)>450000 or p_data->'document'->>'version'<>'scannex-practical-assignment-v1-20261125' then raise exception 'INVALID_WORKSHEET'; end if;
    update public.v1_practical_assignments set document=p_data->'document',draft_version=draft_version+1 where id=a.id returning * into a;
   else
    for c in select value from jsonb_array_elements(p.learner_cases) loop
     if not exists(select 1 from public.v1_practical_files where assignment_id=a.id and case_id=(c->>'id')::uuid and kind='viewer_image' and status='verified')
     or not exists(select 1 from public.v1_practical_files where assignment_id=a.id and case_id=(c->>'id')::uuid and kind in ('recording','native_log') and status='verified') then raise exception 'EVIDENCE_REQUIRED'; end if;
    end loop;
    select coalesce(nullif(trim(certificate_name),''),nullif(trim(full_name),'')) into n from public.profiles where user_id=p_actor;
    if n is null or trim(p_data->>'signedName') is distinct from n or (p_data->>'declaration')::boolean is not true then raise exception 'SIGNATURE_REQUIRED'; end if;
    snapshot_value:=jsonb_build_object('document',a.document,'pack',to_jsonb(p)-'answer_keys'-'calibration_notes'-'created_by'-'approved_by','learnerId',p_actor,'learnerName',n,'assessmentReference',b.assessment_reference,'revision',a.revision,
     'noticeVersion','scannex-recording-v1-20261125','declarationVersion','scannex-integrity-v1-20261125','submittedAt',now(),
     'files',coalesce((select jsonb_agg(to_jsonb(x)-'storage_path' order by x.id) from public.v1_practical_files x where assignment_id=a.id and status='verified'),'[]'::jsonb));
    insert into public.v1_practical_submissions(assignment_id,revision,snapshot,canonical_snapshot,sha256,signed_name,submitted_by)
    values(a.id,a.revision,snapshot_value,snapshot_value::text,encode(extensions.digest(convert_to(snapshot_value::text,'UTF8'),'sha256'),'hex'),n,p_actor) returning * into s;
    update public.v1_practical_assignments set status='submitted',latest_submission_id=s.id,submitted_at=now() where id=a.id returning * into a;
    update public.assessment_bookings set status='evidence_pending' where id=b.id;
   end if;
  elsif p_operation='review' then
   perform public.v1_assert_enrolled(a.learner_user_id);
   select * into r from public.v1_course_runs where learner_user_id=a.learner_user_id and course_id='scannex-training-programme' order by attempt_number desc limit 1;
   if r.id<>a.v1_run_id then raise exception 'WRONG_COURSE_ATTEMPT'; end if;
   if a.status<>'submitted' or a.latest_submission_id is distinct from (p_data->>'submissionId')::uuid or b.status in ('passed','failed','cancelled') then raise exception 'ASSIGNMENT_LOCKED'; end if;
   select * into s from public.v1_practical_submissions where id=a.latest_submission_id;
   verdict:=p_data->>'decision'; scores:=p_data->'scores';
   if verdict not in ('passed','failed','changes_requested') or length(trim(p_data->>'notes'))<1 then raise exception 'REVIEW_REQUIRED'; end if;
   if verdict<>'changes_requested' then
    if (p_data->>'evidenceVerified')::boolean is not true then raise exception 'EVIDENCE_REVIEW_REQUIRED'; end if;
    if jsonb_typeof(scores)<>'object' or (select count(*) from jsonb_object_keys(scores))<>21 then raise exception 'INVALID_RUBRIC'; end if;
    for criterion,max_mark in select * from (values
     ('four_viewing_modes',4),('invert_mode',2),('contrast_density',5),('key_software_features',5),('anomaly_annotation',4),
     ('systematic_scan',6),('viewing_modes_for_anomaly',5),('all_anomalies_identified',5),('annotation_during_interrogation',1),
     ('normal_anatomy_vs_diamond',8),('checklist_applied',1),('checklist_viewing_modes',4),('diamond_unstructured',16),
     ('diamond_undefined_edges',1),('diamond_uneven_density',1),('density_check',1),('record_anomaly_characteristics',5),
     ('correct_conclusion',15),('hidden_diamonds_detected',5),('correct_actions_recorded',4),('checklist_signed',2)) limits(id,maximum) loop
     mark:=(scores->>criterion)::numeric;
     if mark is null or mark<0 or mark>max_mark or mark<>trunc(mark) then raise exception 'INVALID_RUBRIC'; end if;
     raw:=raw+mark::integer;
    end loop;
    norm:=round(raw::numeric/100*100,2);
    select * into t from public.assessment_theory_attempts where learner_user_id=a.learner_user_id and course_id='scannex-training-programme'
     and assessment_version='scannex-summative-v2-classroom-202611' and (v1_run_id=a.v1_run_id or (r.attempt_number=1 and v1_run_id is null)) order by submitted_at desc limit 1;
    -- First-run legacy theory can predate course-run IDs.
    if t.id is null then select * into t from public.assessment_theory_attempts where learner_user_id=a.learner_user_id and course_id='scannex-training-programme'
      and assessment_version='scannex-summative-v2-classroom-202611' and v1_run_id is null
      and (select attempt_number from public.v1_course_runs where id=a.v1_run_id)=1 order by submitted_at desc limit 1; end if;
    if t.id is null then raise exception 'CURRENT_THEORY_REQUIRED'; end if;
    final_mark:=t.score+round(norm/100*32,2);
    if verdict='passed' and (final_mark<75 or (p_data->>'safety')::boolean is not false) then raise exception 'PASS_RULE_NOT_MET'; end if;
    insert into public.assessment_practical_rubrics(assessment_id,rubric_version,trainer_exercise_reference,item_scores,raw_score,normalized_score,material_safety_concern,safety_review_notes,assessed_by)
    values(b.id,'scannex-practical-v1-even-density-20261125','Assignment '||a.id,scores,raw,norm,(p_data->>'safety')::boolean,case when (p_data->>'safety')::boolean then p_data->>'notes' end,p_actor);
    update public.assessment_bookings set status=verdict,completed_at=now(),theory_attempt_id=t.id,theory_score=t.score,theory_max_score=t.max_score,
     practical_rubric_score=norm,practical_converted_score=round(norm/100*32,2),final_score=final_mark where id=b.id;
    insert into public.assessment_evidence(assessment_id,evidence_type,evidence_reference,outcome_summary,recorded_by)
    values(b.id,'assessor_checklist','Assignment submission '||s.id,jsonb_build_object('sha256',s.sha256,'evidencePath','recorded_assignment','rubricVersion','scannex-practical-v1-even-density-20261125'),p_actor);
    insert into public.assessment_events(assessment_id,event_type,actor_user_id,metadata) values(b.id,'decision_recorded',p_actor,jsonb_build_object('decision',verdict,'submissionId',s.id,'evidencePath','recorded_assignment'));
   end if;
   insert into public.v1_practical_reviews(submission_id,decision,item_scores,notes,safety_concern,evidence_verified,raw_score,normalized_score,final_score,assessor_id)
   values(s.id,verdict,coalesce(scores,'{}'),p_data->>'notes',coalesce((p_data->>'safety')::boolean,false),coalesce((p_data->>'evidenceVerified')::boolean,false),case when verdict<>'changes_requested' then raw end,norm,final_mark,p_actor);
   update public.v1_practical_assignments set status=case when verdict='changes_requested' then 'changes_requested' else 'assessed' end,
    revision=revision+case when verdict='changes_requested' then 1 else 0 end,draft_version=draft_version+1 where id=a.id returning * into a;
  else raise exception 'INVALID_OPERATION';
  end if;
  result:=to_jsonb(a);
 end if;
 insert into public.v1_practical_events(assignment_id,pack_id,actor_user_id,event_type,metadata)
 values(a.id,p.id,p_actor,p_operation,jsonb_build_object('recordId',coalesce(f.id,s.id,a.id,p.id),'revision',a.revision,
 'recordingNoticeVersion',case when p_operation='reserve_file' and f.kind='recording' then 'scannex-recording-v1-20261125' end));
 return result;
end $$;

-- Reviewed assignment is an alternative evidence path, NOT a fabricated native
-- Trainer result / Viewer movement log. All other certificate gates stay intact.
create function public.v1_practical_evidence_complete(p_assessment uuid) returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.v1_practical_assignments a join public.v1_practical_submissions s on s.id=a.latest_submission_id
 join public.v1_practical_reviews r on r.submission_id=s.id join public.user_roles u on u.user_id=r.assessor_id and u.role='admin'
 where a.assessment_id=p_assessment and a.status='assessed' and r.decision='passed' and r.evidence_verified and not r.safety_concern
 and jsonb_array_length(s.snapshot->'document'->'cases')=3
 and not exists(select 1 from jsonb_array_elements(s.snapshot->'document'->'cases') c where
 not exists(select 1 from jsonb_array_elements(s.snapshot->'files') f where f->>'case_id'=c->>'caseId' and f->>'kind'='viewer_image' and f->>'status'='verified')
 or not exists(select 1 from jsonb_array_elements(s.snapshot->'files') f where f->>'case_id'=c->>'caseId' and f->>'kind' in ('recording','native_log') and f->>'status'='verified')))
$$;
do $bridge$ declare definition text; old_gate text := '(select count(distinct evidence_type) from public.assessment_evidence e where e.assessment_id=a.id and e.evidence_type in (''scannex_result'',''viewer_movement_log'',''assessor_checklist'') and length(trim(e.evidence_reference))>0)=3';
begin
 select pg_get_functiondef('public.v1_course_benefit_state(uuid)'::regprocedure) into definition;
 if strpos(definition,old_gate)=0 then raise exception 'CERTIFICATE_GATE_CHANGED_REVIEW_REQUIRED'; end if;
 definition:=replace(definition,old_gate,'('||old_gate||' or public.v1_practical_evidence_complete(a.id))');
 if strpos(definition,'round(pr.raw_score/99*100,2)')=0 then raise exception 'NORMALIZATION_GATE_CHANGED_REVIEW_REQUIRED'; end if;
 execute replace(definition,'round(pr.raw_score/99*100,2)','round(pr.raw_score/(case when pr.rubric_version=''scannex-practical-v1-even-density-20261125'' then 100 else 99 end)*100,2)');
end $bridge$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('v1-practical-evidence','v1-practical-evidence',false,157286400,array['image/png','image/jpeg','image/tiff','application/pdf','video/webm','video/mp4','text/plain','application/json']);
-- No client storage policies are added. Downloads require server ownership checks.
do $$ declare name text; signature regprocedure;
begin
 foreach name in array array['v1_practical_packs','v1_practical_assignments','v1_practical_files','v1_practical_submissions','v1_practical_reviews','v1_practical_events'] loop
  execute format('alter table public.%I enable row level security',name);
  execute format('revoke all on public.%I from public,anon,authenticated',name);
  execute format('grant all on public.%I to service_role',name);
 end loop;
 for signature in select oid::regprocedure from pg_proc where pronamespace='public'::regnamespace and proname in ('v1_practical_mutate','v1_practical_evidence_complete','v1_practical_freeze') loop
  execute format('revoke all on function %s from public,anon,authenticated',signature);
  execute format('grant execute on function %s to service_role',signature);
 end loop;
end $$;
grant usage,select on sequence public.v1_practical_events_id_seq to service_role;
