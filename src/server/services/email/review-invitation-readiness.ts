import 'server-only';
import {adminRest} from '@/server/supabase/admin-rest';
import {messageRpc} from '@/server/services/messages';
import {validId} from '@/lib/company-structure';
import type {EmailDesign} from '@/lib/email-sets';
import type {ReviewInvitationEmailState} from '@/lib/review-invitation-email';
type Candidate={id:string;name:string;state:string;revision:number;rule:{course_id?:string};updated_at:string;design?:EmailDesign};

// Only called from authorised server actions/pages, or the internal mail worker.
export async function reviewInvitationEmail(organisation:string,course:string):Promise<{state:ReviewInvitationEmailState;design:EmailDesign|null}>{
 validId(organisation);if(!/^[a-z0-9-]+$/.test(course))throw Error('Choose a valid course.');
 const [design,response]=await Promise.all([
  messageRpc<EmailDesign|null>('v2_email_review_design',{p_org:organisation,p_course:course}),
  adminRest(`/rest/v1/v2_email_entries?select=id,name,state,revision,rule,updated_at,design,set:v2_email_sets!inner(organisation_id)&set.organisation_id=eq.${organisation}&rule->>trigger=eq.review_request&order=updated_at.desc`)
 ]);
 if(!response.ok)throw Error('The review email could not be checked. No invitation has been sent.');
 const candidates=(await response.json() as Candidate[]).filter(entry=>!entry.rule.course_id||entry.rule.course_id===course);
 const exact=(entries:Candidate[])=>entries.find(entry=>entry.rule.course_id===course)??entries[0];
 const selected=(design?candidates.find(entry=>entry.state==='active'&&entry.design&&(Object.keys(design) as (keyof EmailDesign)[]).every(key=>entry.design![key]===design[key])):undefined)??exact(candidates.filter(entry=>entry.state==='active'))??exact(candidates);
 const state:ReviewInvitationEmailState={organisation_id:organisation,course_id:course,status:design?'ready':selected?'blocked':'standard',...(selected?{id:selected.id,name:selected.name,revision:selected.revision}:{})};
 if(state.status==='blocked')state.reason='A saved review email exists but is not enabled for this course and date. Open it, preview the email, accept the preview, save the draft and select “Use this design for review invitations”. The standard email will not be substituted.';
 return {state,design};
}
export async function assertReviewInvitationReady(organisation:string,course:string){const result=await reviewInvitationEmail(organisation,course);if(result.state.status==='blocked')throw Error(result.state.reason);return result;}
