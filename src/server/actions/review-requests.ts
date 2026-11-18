'use server';
import {requestPreviewAccess} from '@/server/services/review-requests';
import {hasAnswerForEveryScannexTheoryQuestion,scoreScannexTheoryAssessment} from '@/server/assessments/scannex-theory-bank';
import type {ScannexTheoryActionState} from '@/server/actions/assessments/submit-scannex-theory-attempt';
import type {ScannexTheoryAnswerState} from '@/types/scannex-assessment';
import {randomBytes,createHash} from 'node:crypto';
import {revalidatePath} from 'next/cache';
import {requireSession} from '@/server/auth/session';
import {validId,type StructureState} from '@/lib/company-structure';
import {reviewEmails,REVIEW_KINDS,type ReviewKind} from '@/lib/review-requests';
import {reviewSnapshot,requireReviewRequest,flushReviewRequestMail,independentReviewJoin} from '@/server/services/review-requests';
import {requireCompany} from '@/server/services/company-structure';
import {messageRpc} from '@/server/services/messages';
import {adminRest} from '@/server/supabase/admin-rest';
import {claimAuthEmailBudget} from '@/server/services/auth-email-budget';
import {sendAccountConfirmationEmail} from '@/server/services/email/send-account-confirmation';
export async function reviewRequestAction(_:StructureState,f:FormData):Promise<StructureState>{try{
 const session=await requireSession(),op=String(f.get('operation')),reason=String(f.get('reason')??'').trim(),token=randomBytes(32).toString('hex');
 const payload:Record<string,unknown>={reason,operationId:validId(String(f.get('operation_id'))),joinToken:token,joinHash:createHash('sha256').update(token).digest('hex')};
 let id:string|null=null,expected=0;
 if(op==='create'){
  const company=validId(String(f.get('company'))),kind=String(f.get('kind')) as ReviewKind,title=String(f.get('title')??'').trim();await requireCompany(company);
  if(!Object.hasOwn(REVIEW_KINDS,kind))throw Error('Choose a review type.');
  const recipients=reviewEmails(String(f.get('reviewers')??'')),sourceIds=[...new Set(f.getAll('source_id').map(String))],body=String(f.get('body')??'');
  const snapshot=await reviewSnapshot(company,kind,sourceIds,title,body),raw=String(f.get('deadline')??''),deadline=raw?new Date(raw+':00+02:00').toISOString():new Date(Date.now()+7*86400000).toISOString();
  Object.assign(payload,{company,kind,title,recipients,snapshot,deadline});
 }else{
  id=validId(String(f.get('id')));const a=await requireReviewRequest(id);expected=Number(f.get('revision'));
  if(op!=='respond'&&!a.manager)throw Error('Company review management access required.');
  if(op==='respond'){if(f.get('confirm')!=='on')throw Error('Confirm your own human review.');payload.decisions=Object.fromEntries(a.request.snapshot.items.map(i=>[i.id,String(f.get('decision:'+i.id)??'')]));}
 }
 const saved=await messageRpc<{id?:string}>('v6_review_action',{p_actor:session.user.id,p_operation:op,p_id:id,p_expected:expected,p_payload:payload});
 let mail='Email is queued.';try{const r=await flushReviewRequestMail();mail=`${r.accepted} email(s) accepted by the provider${r.failed?`; ${r.failed} remain queued for retry`:''}.`;}catch{/* Durable queue retained. */}
 for(const p of ['/review-requests','/course-reviews','/notifications'])revalidatePath(p);
 return {success:`Review request ${op==='respond'?'response saved':op==='close'?'closed without approval':op==='reopen'?'reopened with earlier evidence retained':op==='resend'?'resent':'created'}. ${mail} Published learner releases and live payment settings are unchanged.`,link:saved.id?`/review-requests/${saved.id}`:'/review-requests'};
}catch(e){return {error:e instanceof Error?e.message:'Review request could not be saved.'};}}
export async function registerIndependentReviewer(_:StructureState,f:FormData):Promise<StructureState>{try{
 const invite=await independentReviewJoin(validId(String(f.get('id'))),String(f.get('token'))),password=String(f.get('password')??'');
 if(!invite)throw Error('Invitation unavailable. Ask for a fresh review request.');
 if(password.length<12||password.length>256)throw Error('Choose a private password of at least 12 characters.');
 if(!await claimAuthEmailBudget('signup',invite.email))throw Error('Wait before requesting another confirmation, or sign in with your existing account.');
 const r=await adminRest('/auth/v1/admin/generate_link',{method:'POST',body:JSON.stringify({type:'signup',email:invite.email,password})});if(!r.ok)throw Error('If your account already exists, sign in or use Forgot password.');const b=await r.json();
 if(!b.hashed_token||!await sendAccountConfirmationEmail(invite.email,b.hashed_token,invite.company))throw Error('Confirmation is queued or unavailable. Contact the requester; do not create a second account.');
 return {success:'Check your confirmation email. Then sign in with the invited email and return to this review request. This grants no learner enrolment or administrator rights.'};
}catch(e){return {error:e instanceof Error?e.message:'Registration unavailable.'};}}

export async function previewIndependentTheory(_:ScannexTheoryActionState,f:FormData):Promise<ScannexTheoryActionState>{try{await requestPreviewAccess(validId(String(f.get('request_id'))),'scannex-training-programme');const raw=String(f.get('answers')??'');if(raw.length>30000)throw Error('Invalid answers.');const answers=JSON.parse(raw) as ScannexTheoryAnswerState;if(!answers||typeof answers!=='object'||Array.isArray(answers)||Object.values(answers).some(a=>!Array.isArray(a)||a.some(v=>typeof v!=='string'))||!hasAnswerForEveryScannexTheoryQuestion(answers))throw Error('Answer every question.');return {...scoreScannexTheoryAssessment(answers),message:'Review preview checked. No learner grade, enrolment or certificate was recorded.'};}catch(e){return {message:e instanceof Error?e.message:'Preview unavailable.'};}}
