import 'server-only';
import {createHash} from 'node:crypto';
import {requireSession} from '@/server/auth/session';
import {rows,accessibleCompanies,requireCompany,listPolicies} from './company-structure';
import {productionCompanyId} from './tenant-courses';
import {getTenantCourses} from './tenant-courses';
import {messageRpc} from './messages';
import {adminRest} from '@/server/supabase/admin-rest';
import {recipientBrand} from './email/recipient-brand';
import {deliverTransactionalEmail,emailConfiguration} from './email/transactional-delivery';
import {brandedEmail} from './email/send-course-invitation';
import {REVIEW_KINDS,type ReviewKind,type ReviewItem,type ReviewRequest} from '@/lib/review-requests';
import {validId} from '@/lib/company-structure';
import pricingPolicy from '@/data/course-pricing-policy.json';
import {contentSource} from './course-reviews';
export const reviewRequestFields='id,batch_id,organisation_id,kind,title,snapshot,source_round,reviewer_email,requester_id,state,cycle,revision,reason,deadline,response,created_at,updated_at';
export async function reviewRequestWorkspace(){
 const session=await requireSession();if(!session.user.email_confirmed_at)throw Error('Verified email required.');
 const companies=await accessibleCompanies(session,true),ids=companies.map(c=>c.id),email=session.user.email!.toLowerCase(),tenant=productionCompanyId();
 const filter=ids.length?`&or=(organisation_id.in.(${ids.join(',')}),reviewer_email.eq.${encodeURIComponent(email)})`:`&reviewer_email=eq.${encodeURIComponent(email)}`;
 const requests=await rows<ReviewRequest>(`/rest/v1/v6_review_requests?select=${reviewRequestFields}&order=updated_at.desc&limit=200${filter}${tenant?`&organisation_id=eq.${tenant}`:''}`);
 return {session,companies,requests};
}
export async function requireReviewRequest(id:string){
 const session=await requireSession();if(!session.user.email_confirmed_at)throw Error('Verified email required.');
 const r=(await rows<ReviewRequest>(`/rest/v1/v6_review_requests?id=eq.${validId(id)}&select=${reviewRequestFields}&limit=1`))[0],tenant=productionCompanyId();
 if(!r||tenant&&r.organisation_id!==tenant)throw Error('Review request unavailable.');
 const manager=await messageRpc<boolean>('v6_review_manager',{p_actor:session.user.id,p_org:r.organisation_id});
 if(!(await rows<{id:string}>(`/rest/v1/organisations?id=eq.${r.organisation_id}&is_active=eq.true&select=id&limit=1`)).length)throw Error('Review request unavailable.');
 if(!manager&&session.user.email?.toLowerCase()!==r.reviewer_email)throw Error('Review request unavailable.');
 return {session,request:r,manager};
}
export async function reviewRequestOptions(companyId:string){
 await requireCompany(companyId);const [courses,policies]=await Promise.all([getTenantCourses(),listPolicies()]);
 const owned=await rows<{course_id:string}>(`/rest/v1/organisation_offerings?organisation_id=eq.${companyId}&select=course_id`);
 const company=(await requireCompany(companyId)).company;
 return {courses:courses.filter(c=>company.slug==='apgi'||owned.some(o=>o.course_id===c.id)).map(c=>({id:c.id,title:c.title})),policies:policies.filter(p=>p.organisation_id===companyId||p.organisation_id===null&&company.slug==='apgi').map(p=>({id:p.id,title:p.title,version:p.version_label})),pricingPolicy:company.slug==='apgi'?{id:'commercial-pricing-policy',title:'Course access and commercial pricing policy',version:pricingPolicy.version}:null};
}
export async function reviewSnapshot(companyId:string,kind:ReviewKind,sourceIds:string[],title:string,body:string){
 const {company}=await requireCompany(companyId),items:ReviewItem[]=[];let internal=false;
 if(kind==='branding'){
  const brand=await recipientBrand('',companyId);items.push({id:company.id,title:company.name+' branding',version:String(company.brand_revision),body:JSON.stringify({name:company.name,primary:company.primary_color,secondary:company.secondary_color,accent:company.accent_color,pale:company.pale_color,certificate:company.certificate_template_id,watermarks:company.watermarks},null,2)});
  return {items,brand:{name:company.name,logo:brand?.logo??null,colors:[company.primary_color,company.secondary_color,company.accent_color,company.pale_color]}};
 }
 if(kind==='policies'){
  const policies=await listPolicies();
  for(const id of [...new Set(sourceIds)]){
   if(id==='commercial-pricing-policy'&&company.slug==='apgi'){items.push({id,title:'Course access and commercial pricing policy',version:pricingPolicy.version,body:pricingPolicy.body});continue;}
   const p=policies.find(p=>p.id===id&&(p.organisation_id===companyId||p.organisation_id===null&&company.slug==='apgi'));
   if(!p)throw Error('Choose policies available to this company.');internal ||=p.visibility==='internal';
   items.push({id:p.id,title:p.title,version:p.version_label+' · '+p.content_hash,body:p.body,policyId:p.id,filePath:p.file_path,fileHash:p.file_sha256});
  }
 }else if(kind==='content'){
  const allowed=await reviewRequestOptions(companyId),courses=await getTenantCourses();
  for(const id of sourceIds){const c=courses.find(c=>c.id===id&&allowed.courses.some(a=>a.id===id));if(!c)throw Error('Choose an assigned course.');const source=await contentSource(c.id,companyId);items.push({id:c.id,title:c.title,version:source.fingerprint,body:c.description+'\n\nLearning units:\n'+c.units.map(u=>u.title).join('\n'),courseId:c.id});}
 }else{if(body.length<10||body.length>100000)throw Error('Enter the exact commercial proposal text to review.');items.push({id:'commercial-proposal',title,version:createHash('sha256').update(body).digest('hex'),body});}
 if(!items.length||items.length>100)throw Error('Select at least one review item.');return {items,internal};
}
export async function flushReviewRequestMail(){
 const config=emailConfiguration();if(!config)return {accepted:0,failed:0};
 const jobs=await messageRpc<{id:string;claim_token:string;recipient:string;organisation_id:string;context:{requestId:string;title:string;operation:string;reason:string;sender:string;deadline:string;state:string;joinToken?:string}}[]>('v6_review_mail_claim',{});let accepted=0,failed=0;
 for(const j of jobs){
  if(accepted+failed)await new Promise(resolve=>setTimeout(resolve,550));
  const b=await recipientBrand(j.recipient,j.organisation_id);if(!b)throw Error('Company mail identity unavailable.');
  const origin=productionCompanyId()?config.origin.origin:b.origin,path=j.context.joinToken?`/review-requests/${j.context.requestId}/join/${j.context.joinToken}`:`/review-requests/${j.context.requestId}`,link=new URL(path,origin).toString();
  const text=`You received a new notification in the training platform.\n\n${j.context.sender} ${j.context.operation} — ${j.context.title}\n\n${j.context.reason}\n\nRequest status: ${j.context.state}. Review deadline: ${new Date(j.context.deadline).toLocaleString('en-ZA',{timeZone:'Africa/Johannesburg'})} SAST.\n\n${j.context.state==='open'?'You are requested to open the review, read the exact version and record your human decision.':'Read the saved update and reason. Closing a request does not approve its content.'}\n\nSign in using ${j.recipient}: ${link}\n\nEarlier feedback remains recorded. Learner access, published releases and payment settings are unchanged.`;
  const subject=`${b.name} — ${j.context.title}: review ${j.context.operation}`;
  const delivered=await deliverTransactionalEmail({to:j.recipient,subject,text,html:brandedEmail({brand:b.name,logo:b.logo,color:b.color,title:subject,description:text,link,button:'Open review request',footer:'A human review response is required; reading this email is not approval.'}),branding:{name:b.name,from:b.from,verified:b.verified},tracking:{category:'system',organisationId:j.organisation_id,sourceId:j.context.requestId,messageKey:`independent-review:${j.id}`},idempotencyKey:`independent-review:${j.id}`});
  const saved=await adminRest(`/rest/v1/v6_review_mail?id=eq.${j.id}&claim_token=eq.${j.claim_token}&state=eq.sending`,{method:'PATCH',body:JSON.stringify({state:delivered.ok?'sent':'failed',provider_id:delivered.ok?delivered.providerMessageId:null,last_error:delivered.ok?null:delivered.error,next_at:new Date(Date.now()+15*60000).toISOString()})});if(!saved.ok)throw Error('Mail status requires reconciliation.');if(delivered.ok)accepted++;else failed++;
 }
 return {accepted,failed};
}
export async function independentReviewJoin(id:string,token:string){
 if(!/^[a-f0-9]{64}$/.test(token))return null;
 const r=(await rows<ReviewRequest>(`/rest/v1/v6_review_requests?id=eq.${validId(id)}&join_hash=eq.${createHash('sha256').update(token).digest('hex')}&state=eq.open&deadline=gt.${encodeURIComponent(new Date().toISOString())}&select=*&limit=1`))[0];
 if(!r||productionCompanyId()&&r.organisation_id!==productionCompanyId())return null;if(!(await rows<{id:string}>(`/rest/v1/organisations?id=eq.${r.organisation_id}&is_active=eq.true&select=id&limit=1`)).length)return null;return {email:r.reviewer_email,title:r.title,company:r.organisation_id};
}
export async function requestPreviewAccess(id:string,course:string){const a=await requireReviewRequest(id),item=a.request.snapshot.items.find(i=>i.courseId===course);if(!item||!a.manager&&(a.request.state==='closed'||Date.parse(a.request.deadline)<=Date.now()))throw Error('Course review unavailable.');const source=await contentSource(course,a.request.organisation_id);if(source.fingerprint!==item.version)throw Error('The course changed; request a new review version.');return {...a,item};}
