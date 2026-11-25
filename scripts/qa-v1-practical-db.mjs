// Explicitly local-only fixture. Requires the task-owned, unexposed Docker container.
// This never reads cloud credentials or connects to a hosted database.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const container = 'apgi-v1-practical-qa-20261125';
let checks = 0;
// Reset only this disposable database inside the exact task-owned container.
const reset = spawnSync('docker', ['exec', '-i', container, 'psql', '-U', 'postgres', '-X', '-v', 'ON_ERROR_STOP=1'], {input:'drop database if exists v1_practical_qa with (force); create database v1_practical_qa;',encoding:'utf8'});
assert.equal(reset.status,0,reset.stderr);
function sql(query, fail) {
 const r = spawnSync('docker', ['exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'v1_practical_qa', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1'], {input:query,encoding:'utf8',maxBuffer:5*1024*1024});
 if (fail) { assert.notEqual(r.status,0,`Expected ${fail}`); assert.match(r.stderr,new RegExp(fail)); checks++; return; }
 assert.equal(r.status,0,r.stderr); return r.stdout.trim();
}
const quote = x => `'${String(x).replaceAll("'", "''")}'`;
const json = x => `${quote(JSON.stringify(x))}::jsonb`;
const admin='10000000-0000-4000-8000-000000000001', learner='10000000-0000-4000-8000-000000000002', other='10000000-0000-4000-8000-000000000003';
function call(actor,operation,id,data={},error) { const s=sql(`set role service_role; select public.v1_practical_mutate('${actor}','${operation}',${id ? quote(id) : 'null'},${json(data)});`,error); return error ? null : JSON.parse(s); }
function check(v) { assert.ok(v); checks++; }
sql(`do $$begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon; create role authenticated; create role service_role bypassrls; end if; end$$;
create schema auth; create schema extensions; create schema storage;
create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql as $$select null::uuid$$;
create function public.current_user_has_any_role(text[]) returns boolean language sql as $$select false$$;
create extension pgcrypto with schema extensions;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
grant usage on schema public,auth,extensions,storage to service_role; grant select on auth.users to service_role;`);
for (const name of ['001_alp_auth_profile.sql','004_alp_progress_completion.sql','005_alp_enrolments_access.sql','011_scorm_learner_attempts.sql','012_alp_assessment_operations.sql','013_scannex_theory_assessment.sql','014_scannex_practical_rubric.sql','20261118122552_v1_course_benefits.sql','20261118133024_v1_pass_certificate_completion.sql','20261125062658_v1_scannex_practical_assignment.sql']) {
 sql(readFileSync(new URL(`../supabase/migrations/${name}`,import.meta.url),'utf8')); console.log(`Applied local fixture migration: ${name}`);
}
sql(`grant select,insert,update on all tables in schema public to service_role;
insert into auth.users values('${admin}'),('${learner}'),('${other}'); insert into public.user_roles(user_id,role) values('${admin}','admin'),('${learner}','learner'),('${other}','learner');
insert into public.profiles(user_id,full_name,certificate_name) values('${learner}','Fixture Learner','Fixture Learner');
insert into public.course_enrolments(user_id,course_id,status) values('${learner}','scannex-training-programme','enrolled');`);
// Restore the feature's restrictive grants after fixture-only baseline grants.
sql(`revoke all on public.v1_practical_packs,public.v1_practical_assignments,public.v1_practical_files,public.v1_practical_submissions,public.v1_practical_reviews,public.v1_practical_events from anon,authenticated;`);
const cases=[1,2,3].map(n=>({id:`20000000-0000-4000-8000-00000000000${n}`,number:n,title:`Fixture ${n}`,brief:'Fixture source, not a real training case',sourceFileId:null,quality:{F1:'Visible reference detail',F2:'Visible reference detail',F3:'Visible reference detail',F4:'Visible reference detail'}}));
const keys=cases.map((c,i)=>({caseId:c.id,truth:i ? 'confirmed_diamond':'confirmed_negative',provenance:'SYNTHETIC FIXTURE ONLY',targets:i ? ['Fixture target']:[],expectedDecision:i?'hold':'release'}));
call(learner,'create_pack',null,{title:'No',cases,keys},'FORBIDDEN');
let p=call(admin,'create_pack',null,{title:'LOCAL FIXTURE — NOT FOR TRAINING',cases,keys}); check(p.status==='draft');
call(admin,'approve_pack',p.id,{expectedVersion:0},'CALIBRATION_REQUIRED');
for (const c of cases) {const f=call(admin,'reserve_file',null,{packId:p.id,caseId:c.id,kind:'case_source',name:'fixture.png',safeName:'fixture.png',mime:'image/png',size:10}); call(admin,'verify_file',f.id,{sha256:'a'.repeat(64)}); c.sourceFileId=f.id;}
p=call(admin,'save_pack',p.id,{expectedVersion:0,title:p.title,instructions:'Synthetic',calibration:'Synthetic local calibration',cases,keys});
call(admin,'save_pack',p.id,{expectedVersion:0,cases,keys},'STALE_VERSION');
p=call(admin,'approve_pack',p.id,{expectedVersion:p.edit_version}); check(p.status==='approved');
sql(`update public.v1_practical_packs set title='tampered' where id='${p.id}';`,'IMMUTABLE_EVIDENCE');
const booking=JSON.parse(sql(`insert into public.assessment_bookings(learner_user_id,course_id,created_by) values('${learner}','scannex-training-programme','${admin}') returning to_jsonb(assessment_bookings);`));
let a=call(admin,'assign',booking.id,{packId:p.id});
call(learner,'start',a.id,{},'LEARNING_NOT_COMPLETE'); call(other,'start',a.id,{},'FORBIDDEN');
sql(`insert into public.learner_progress(user_id,course_id,unit_id,status) select '${learner}','scannex-training-programme','scannex-lu-'||n,'completed' from generate_series(1,8)n;`);
a=call(learner,'start',a.id); check(a.status==='draft');
const doc={version:'scannex-practical-assignment-v1-20261125',preparation:{viewerOpened:true,correctImages:true,systematicScan:true},cases:cases.map(c=>({caseId:c.id,modes:Object.fromEntries(['F1','F2','F3','F4'].map(m=>[m,{used:true,tuned:true,clarity:'Fixture'}])),regions:Object.fromEntries(['feet','lower_legs','pelvis_hands','abdomen_lower_arm','chest_upper_arm','head'].map(r=>[r,'no_candidate'])),candidates:[],summary:'Fixture only',decision:'review'}))};
a=call(learner,'save',a.id,{expectedVersion:0,document:doc});
call(learner,'save',a.id,{expectedVersion:0,document:doc},'STALE_VERSION');
call(learner,'submit',a.id,{expectedVersion:a.draft_version,signedName:'Fixture Learner',declaration:true},'EVIDENCE_REQUIRED');
for (const c of cases) for (const kind of ['viewer_image','recording']) { const f=call(learner,'reserve_file',null,{assignmentId:a.id,caseId:c.id,kind,name:'fixture.bin',safeName:'fixture.bin',mime:kind==='recording'?'video/webm':'image/png',size:10,recordingNoticeAccepted:true}); call(other,'verify_file',f.id,{sha256:'a'.repeat(64)},'FORBIDDEN'); call(learner,'verify_file',f.id,{sha256:'a'.repeat(64)}); sql(`update public.v1_practical_files set original_filename='tampered' where id='${f.id}';`,'IMMUTABLE_EVIDENCE'); }
call(learner,'submit',a.id,{expectedVersion:a.draft_version,signedName:'Wrong Name',declaration:true},'SIGNATURE_REQUIRED');
a=call(learner,'submit',a.id,{expectedVersion:a.draft_version,signedName:'Fixture Learner',declaration:true}); check(a.status==='submitted');
check(sql(`select sha256=encode(extensions.digest(convert_to(canonical_snapshot,'UTF8'),'sha256'),'hex') from public.v1_practical_submissions where id='${a.latest_submission_id}'`)==='t');
sql(`update public.v1_practical_submissions set signed_name='tampered' where id='${a.latest_submission_id}';`,'IMMUTABLE_EVIDENCE');
call(learner,'save',a.id,{expectedVersion:a.draft_version,document:doc},'ASSIGNMENT_LOCKED');
call(learner,'review',a.id,{submissionId:a.latest_submission_id},'FORBIDDEN');
check(JSON.parse(sql(`set role service_role; select public.v1_course_benefit_state('${learner}');`)).passed===false);
const limits=[4,2,5,5,4,6,5,5,1,8,1,4,16,1,1,1,5,15,5,4,2],ids=['four_viewing_modes','invert_mode','contrast_density','key_software_features','anomaly_annotation','systematic_scan','viewing_modes_for_anomaly','all_anomalies_identified','annotation_during_interrogation','normal_anatomy_vs_diamond','checklist_applied','checklist_viewing_modes','diamond_unstructured','diamond_undefined_edges','diamond_uneven_density','density_check','record_anomaly_characteristics','correct_conclusion','hidden_diamonds_detected','correct_actions_recorded','checklist_signed'];
const data={submissionId:a.latest_submission_id,decision:'passed',scores:Object.fromEntries(ids.map((id,i)=>[id,limits[i]])),notes:'Local fixture review',safety:false,evidenceVerified:true};
call(admin,'review',a.id,{...data,evidenceVerified:false},'EVIDENCE_REVIEW_REQUIRED');
call(admin,'review',a.id,data,'CURRENT_THEORY_REQUIRED');
check(sql(`select count(*) from public.assessment_practical_rubrics where assessment_id='${booking.id}';`)==='0');
sql(`insert into public.assessment_theory_attempts(learner_user_id,course_id,assessment_version,score,passed,v1_run_id) values('${learner}','scannex-training-programme','scannex-summative-v2-classroom-202611',60,true,'${a.v1_run_id}');`);
call(admin,'review',a.id,{...data,safety:true},'PASS_RULE_NOT_MET');
a=call(admin,'review',a.id,data); check(a.status==='assessed');
check(sql(`select final_score from public.assessment_bookings where id='${booking.id}';`)==='92.00');
check(JSON.parse(sql(`set role service_role; select public.v1_course_benefit_state('${learner}');`)).passed===true);
check(sql(`select count(*) from public.assessment_evidence where assessment_id='${booking.id}' and evidence_type in ('scannex_result','viewer_movement_log');`)==='0');
sql(`set role service_role;select public.v1_issue_certificate('${learner}','attendance');`);
check(sql(`select count(*) from public.learner_progress where user_id='${learner}' and unit_id='scannex-lu-9' and status='completed';`)==='0');
sql(`set role service_role;select public.v1_issue_certificate('${learner}','passed');`);
check(sql(`select count(*) from public.learner_progress where user_id='${learner}' and unit_id='scannex-lu-9' and status='completed';`)==='1');
check(sql(`select progress_percent from public.completion_states where user_id='${learner}' and course_id='scannex-training-programme';`)==='100.00');
sql(`set role authenticated; select * from public.v1_practical_submissions;`,'permission denied');
sql(`set role anon; select public.v1_practical_mutate('${admin}','start','${a.id}','{}');`,'permission denied');
check(sql(`select bool_and(relrowsecurity) from pg_class where relname like 'v1_practical_%' and relkind='r';`)==='t');
console.log(`PASS: ${checks} isolated PostgreSQL assertions. No cloud records created.`);
