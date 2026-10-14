// Explicit opt-in integration QA. This file is excluded from normal CI and
// uses only fictional accounts in the guarded Version 2 staging database.
import {beforeAll,describe,it,expect,vi} from 'vitest';
import nextEnv from '@next/env';
import {randomBytes} from 'node:crypto';
import {writeFile,mkdir} from 'node:fs/promises';
const fixture=vi.hoisted(()=>({session:null as any}));
vi.mock('@/server/auth/session',async importOriginal=>({...await importOriginal<any>(),requireSession:vi.fn(()=>fixture.session)}));
vi.mock('next/navigation',()=>({redirect:(url:string)=>{throw new Error(`REDIRECT:${url}`)}}));
vi.mock('next/cache',()=>({revalidatePath:vi.fn()}));
import {assertStagingIsolation} from '@/server/environment-isolation';
import {adminRest} from '@/server/supabase/admin-rest';
import {acceptPendingInvitations} from '@/server/actions/invitations/accept-invitation';
import {issueMyCertificate} from '@/server/actions/certificates';
import {authenticCertificate} from '@/server/certificates/authentication';
import {certificatePdf} from '@/server/certificates/pdf';
import type {CertificateRecord} from '@/lib/certificates/designs';
let org:string,actor:string,learner:any,staff:any,group:string,invitation:string,staffInvitation:string;
async function rest(path:string,body?:unknown,method='POST'){
  const r=await adminRest(path,body?{method,headers:{Prefer:'return=representation'},body:JSON.stringify(body)}:{});
  if(!r.ok)throw new Error(`Staging fixture failed ${r.status} ${path}: ${await r.text()}`);
  const text=await r.text();return text?JSON.parse(text):null;
}
async function account(label:string){
  const email=`qa-v2-${label}-${Date.now()}@example.invalid`,password=randomBytes(32).toString('base64url');
  const created=await rest('/auth/v1/admin/users',{email,password,email_confirm:true});
  const response=await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,'content-type':'application/json'},body:JSON.stringify({email,password})});
  if(!response.ok)throw new Error('Fictional staging sign-in failed');
  const token=await response.json();return {user:created,accessToken:token.access_token};
}
beforeAll(async()=>{
  const testMode=process.env.NODE_ENV;vi.stubEnv('NODE_ENV','development');
  nextEnv.loadEnvConfig(process.cwd(),true);vi.stubEnv('NODE_ENV',testMode);
  vi.stubEnv('ALP_EMAIL_MODE','disabled'); // Fictional integration accounts must never receive real mail.
  assertStagingIsolation();
  const [people,orgs]=await Promise.all([rest('/auth/v1/admin/users?page=1&per_page=100'),rest('/rest/v1/organisations?slug=eq.apgi&select=id')]);
  actor=people.users.find((u:any)=>u.email==='johan.ras@apginc.ca')?.id;org=orgs[0].id;if(!actor)throw new Error('Staging administrator not found');
  learner=await account('learner');staff=await account('administrator');
  for(const user of [learner,staff])await rest('/rest/v1/profiles',{user_id:user.user.id,email:user.user.email});
  const groups=await rest('/rest/v1/learner_groups?name=eq.QA%20Demonstration%20Group&select=id');
  group=groups[0]?.id??(await rest('/rest/v1/learner_groups',{organisation_id:org,name:'QA Demonstration Group',created_by:actor}))[0].id;
  const learnerInvite=await rest('/rest/v1/course_invitations',{recipient_email:learner.user.email,course_id:'scannex-training-programme',organisation_id:org,group_id:group,invited_role:'learner',basis:'internal_allocation',reason:'Fictional staging QA',expires_at:new Date(Date.now()+86400000).toISOString(),token_hash:randomBytes(32).toString('hex'),created_by:actor});invitation=learnerInvite[0].id;
  const adminInvite=await rest('/rest/v1/course_invitations',{recipient_email:staff.user.email,course_id:null,organisation_id:org,invited_role:'admin',basis:'internal_allocation',reason:'Fictional staging role QA',expires_at:new Date(Date.now()+86400000).toISOString(),token_hash:randomBytes(32).toString('hex'),created_by:actor});staffInvitation=adminInvite[0].id;
});
describe('Version 2 isolated database integration',()=>{
  it('requires a complete verified profile before accepting learner access',async()=>{fixture.session=learner;expect(await acceptPendingInvitations()).toMatchObject({ok:false,error:'profile_required'});});
  it('accepts the learner invitation, assigns its group and notifies the inviter once',async()=>{
    await rest(`/rest/v1/profiles?user_id=eq.${learner.user.id}`,{certificate_name:'QA Sample Learner',full_name:'QA Sample Learner'},'PATCH');fixture.session=learner;
    expect(await acceptPendingInvitations()).toMatchObject({ok:true,courseIds:['scannex-training-programme']});
    expect(await acceptPendingInvitations()).toMatchObject({ok:true,courseIds:[]});
    const enrolled=await rest(`/rest/v1/course_enrolments?user_id=eq.${learner.user.id}&select=status,group_id`);expect(enrolled[0]).toMatchObject({status:'enrolled',group_id:group});
    const notifications=await rest(`/rest/v1/admin_notifications?recipient_user_id=eq.${actor}&event_key=eq.enrolled:${invitation}&select=id`);expect(notifications).toHaveLength(1);
  });
  it('blocks another mailbox owner from redeeming an administrator invitation',async()=>{const r=await adminRest('/rest/v1/rpc/v2_redeem_admin_invitation',{method:'POST',body:JSON.stringify({p_invitation:staffInvitation,p_user:learner.user.id})});expect(r.ok).toBe(false);expect(await r.text()).toContain('ADMIN_INVITATION_INVALID');});
  it('grants the stored administrator role after profile completion and prevents duplicate grants',async()=>{
    await rest(`/rest/v1/profiles?user_id=eq.${staff.user.id}`,{certificate_name:'QA Sample Administrator',full_name:'QA Sample Administrator'},'PATCH');fixture.session=staff;expect(await acceptPendingInvitations()).toMatchObject({ok:true});
    expect(await rest('/rest/v1/rpc/v2_redeem_admin_invitation',{p_invitation:staffInvitation,p_user:staff.user.id})).toBe(true);
    const roles=await rest(`/rest/v1/user_roles?user_id=eq.${staff.user.id}&role=eq.admin&select=role`);expect(roles).toHaveLength(1);
  });
  it('requires every specified unit, not just one completed unit',async()=>{
    await rest('/rest/v1/learner_progress',{user_id:learner.user.id,course_id:'scannex-training-programme',unit_id:'scannex-lu-1',status:'completed'});
    expect(await rest('/rest/v1/rpc/v2_certificate_eligible',{p_user:learner.user.id,p_course:'scannex-training-programme'})).toBe(false);
  });
  it('blocks self-service certification without the controlled assessment pass',async()=>{
    for(let n=2;n<=8;n++)await rest('/rest/v1/learner_progress',{user_id:learner.user.id,course_id:'scannex-training-programme',unit_id:`scannex-lu-${n}`,status:'completed'});
    fixture.session=learner;const f=new FormData();f.set('courseSlug','scannex-training-programme');await expect(issueMyCertificate(f)).rejects.toThrow('Complete the required');
  });
  it('issues one authenticated numbered test certificate after approved assessment and reuses its number',async()=>{
    const theory=(await rest('/rest/v1/assessment_theory_attempts',{learner_user_id:learner.user.id,course_id:'scannex-training-programme',score:60,passed:true}))[0];
    const booking=(await rest('/rest/v1/assessment_bookings',{learner_user_id:learner.user.id,course_id:'scannex-training-programme',status:'passed',created_by:actor,approved_by:actor,completed_at:new Date().toISOString(),theory_attempt_id:theory.id,theory_score:60,practical_rubric_score:90,practical_converted_score:28.8,final_score:88.8,notes:'Fictional QA evidence, not a real assessment.'}))[0];
    await rest('/rest/v1/assessment_practical_rubrics',{assessment_id:booking.id,trainer_exercise_reference:'QA-FICTIONAL',item_scores:{qa_only:89.1},raw_score:89.1,normalized_score:90,assessed_by:actor});
    for(const type of ['scannex_result','viewer_movement_log','assessor_checklist'])await rest('/rest/v1/assessment_evidence',{assessment_id:booking.id,evidence_type:type,evidence_reference:'QA-FICTIONAL-NOT-REAL-EVIDENCE',recorded_by:actor});
    expect(await rest('/rest/v1/rpc/v2_certificate_eligible',{p_user:learner.user.id,p_course:'scannex-training-programme'})).toBe(true);
    fixture.session=learner;const f=new FormData();f.set('courseSlug','scannex-training-programme');await expect(issueMyCertificate(f)).rejects.toThrow('REDIRECT:');
    await expect(issueMyCertificate(f)).rejects.toThrow('REDIRECT:');
    const certificates=await rest(`/rest/v1/issued_certificates?user_id=eq.${learner.user.id}&select=*`);expect(certificates).toHaveLength(1);const c=certificates[0] as CertificateRecord;
    expect(c.certificate_number).toMatch(/^APGI-V2-\d{4}-\d+$/);expect(c.snapshot.test).toBe(true);expect(authenticCertificate(c)).toBe(true);
    await mkdir('.vercel',{recursive:true});await writeFile('.vercel/QA Issued Test Certificate.pdf',await certificatePdf(c));
    // Persist safe identifiers only, never passwords or session tokens.
    await writeFile('.vercel/v2-fixture-evidence.json',JSON.stringify({learner:learner.user.id,staff:staff.user.id,group,certificate:c.id,number:c.certificate_number,tests:7,fictional:true},null,2));
  });
});
