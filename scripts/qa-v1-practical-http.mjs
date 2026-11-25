// Exercises the actual Next HTTP routes against the LOCAL fixture adapter.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const base='http://127.0.0.1:31348', path='/api/v1/scannex-practical'; let checks=0;
const headers=role=>({cookie:`alp_access_token=fixture-${role}; alp_user_id=10000000-0000-4000-8000-00000000000${role==='admin'?1:3}`,'content-type':'application/json',origin:base});
async function request(suffix='',body,role='learner',status=200){const r=await fetch(base+path+suffix,{method:body?'POST':'GET',headers:headers(role),body:body?JSON.stringify(body):undefined});const data=await r.json();assert.equal(r.status,status,JSON.stringify(data));checks++;return data;}
let w=await request(); if(w.assignment.status==='assigned')w=await request('',{operation:'start',id:w.assignment.id});
assert.equal(w.assignment.status,'draft');checks++;assert.equal(w.pack.calibration_notes,'');checks++;
await request('/admin',undefined,'learner',403);
const doc={version:'scannex-practical-assignment-v1-20261125',preparation:{viewerOpened:true,correctImages:true,systematicScan:true},cases:w.pack.learner_cases.map(c=>({caseId:c.id,modes:Object.fromEntries(['F1','F2','F3','F4'].map(m=>[m,{used:true,tuned:true,clarity:'SYNTHETIC HTTP FIXTURE — not actual Viewer use'}])),regions:Object.fromEntries(['feet','lower_legs','pelvis_hands','abdomen_lower_arm','chest_upper_arm','head'].map(r=>[r,'no_candidate'])),candidates:[],decision:'review',summary:'Synthetic assessment fixture only.'}))};
w={...w,...await request('',{operation:'save',id:w.assignment.id,expectedVersion:w.assignment.draft_version,document:doc})};
await request('',{operation:'save',id:w.assignment.id,expectedVersion:w.assignment.draft_version-1,document:doc},'learner',409);
await request('',{operation:'submit',id:w.assignment.id,expectedVersion:w.assignment.draft_version,signedName:'Local QA Learner',declaration:true},'learner',400);
for(const c of doc.cases) for(const kind of ['viewer_image','native_log']){
 const bytes=kind==='viewer_image'?Buffer.from('89504e470d0a1a0a0000','hex'):Buffer.from('SYNTHETIC LOG FIXTURE ONLY — not a real Scannex action log');
 const mime=kind==='viewer_image'?'image/png':'text/plain',name=kind==='viewer_image'?'fixture.png':'fixture.log';
 const reserved=await request('/uploads',{operation:'reserve',assignmentId:w.assignment.id,caseId:c.caseId,kind,mime,name,size:bytes.length});
 assert.ok(reserved.uploadUrl.startsWith('http://127.0.0.1:31346/'));checks++;
 const put=await fetch(reserved.uploadUrl,{method:'PUT',headers:{'content-type':mime,'x-upsert':'false'},body:bytes});assert.equal(put.status,200);checks++;
 const sealed=await request('/uploads',{operation:'finalize',id:reserved.file.id});assert.equal(sealed.file.sha256,createHash('sha256').update(bytes).digest('hex'));checks++;
 const r=await fetch(base+path+'/files/'+sealed.file.id,{headers:headers('learner')});assert.equal(r.status,200);assert.equal(r.headers.get('content-disposition'),`attachment; filename="${name}"`);assert.deepEqual(Buffer.from(await r.arrayBuffer()),bytes);checks++;
}
w=await request();await request('',{operation:'submit',id:w.assignment.id,expectedVersion:w.assignment.draft_version,signedName:'Wrong Name',declaration:true},'learner',400);
w=await request('',{operation:'submit',id:w.assignment.id,expectedVersion:w.assignment.draft_version,signedName:'Local QA Learner',declaration:true});assert.equal(w.assignment.status,'submitted');checks++;
const s=w.submissions[0];assert.equal(s.sha256,createHash('sha256').update(s.canonical_snapshot).digest('hex'));checks++;
assert.ok(!('answer_keys' in s.snapshot.pack));assert.ok(!('calibration_notes' in s.snapshot.pack));checks++;
await request('',{operation:'save',id:w.assignment.id,expectedVersion:w.assignment.draft_version,document:doc},'learner',400);
const review=await request('/admin?id='+w.assignment.id,undefined,'admin');assert.equal(review.submissions[0].id,s.id);checks++;
await request('/admin',{operation:'review',id:w.assignment.id,submissionId:s.id,decision:'changes_requested',scores:{},notes:'SYNTHETIC QA: please clarify the image conclusion.',evidenceVerified:false,safety:false},'admin');
w=await request();assert.equal(w.assignment.status,'changes_requested');assert.equal(w.assignment.revision,2);checks++;
w=await request('',{operation:'submit',id:w.assignment.id,expectedVersion:w.assignment.draft_version,signedName:'Local QA Learner',declaration:true});assert.equal(w.submissions.length,2);assert.equal(w.submissions[1].sha256,s.sha256);checks++;
console.log(`PASS: ${checks} local HTTP assertions — real Next routes, local PostgreSQL mutations, upload/verification/download, frozen snapshots and returned revisions. No cloud credentials or learner records used.`);
