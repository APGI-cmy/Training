import 'server-only';
import {getSupabaseRestUrl} from '@/server/auth/session';
import {getCourseCover} from '@/lib/course-covers';
import type {ReviewRound} from '@/lib/course-review';
import {STAGING_ORIGIN} from '@/server/environment-isolation';
import {brandedEmail,escapeEmail} from './send-course-invitation';
import {reviewEmailSections} from '@/lib/review-email-sections';
import {reviewNonresponseNotice} from '@/lib/review-nonresponse';

export function reviewInvitationNarrative(requester:string,perLu=false){
 if(perLu)return `You are invited to a collaborative course review by ${requester}. Review every assigned learning unit and its embedded quizzes. Record findings or a nothing-to-add declaration beside the presentation, and confirm your LU review. Each LU has an Initial review, Implementation feedback, Reopened rounds and Endorsements workflow. If every assigned full reviewer completes the initial review without raising a finding, all four LU stages are complete and no endorsement is required. Otherwise the designer submits numbered implementation notes, then one eligible other reviewer selects Yes—endorse and close or No—do not endorse and reopen with a reason. There is no separate acceptance or full-report step. Findings, screenshots and submitted responses are shared with the assigned team; private drafts are not. ${reviewNonresponseNotice} Daily reminders stop when assigned work is complete, declined or overdue. Other overdue tasks require an extension and are not approved automatically. Sign in with the invited email. Review access does not enrol you or grant administrator rights.`;
 return `You are invited to a collaborative course review by ${requester}. Full reviewers examine every LU and quiz, mark coverage and submit a report, even when no issues are found. Every full report needs one different reviewer's endorsement. Peer-only checkers may read and endorse reports directly. Findings, screenshots and comments are shared with the assigned team. You may decline with a reason. Daily reminders stop when you finish, decline or reach the cutoff. Overdue work requires an extension and never counts as approval. Sign in with the invited email. Review access does not enrol you or grant administrator rights.`;
}
// One renderer for real review delivery and the administrator's preview.
export function renderReviewMessage(round:ReviewRound,message:{subject:string;body:string;kind?:string}){
 const d=round.document,e=escapeEmail,origin=process.env.NEXT_PUBLIC_APP_URL??STAGING_ORIGIN;
 const image=getCourseCover(round.course_id)?.src;
 const logo=d.brand.logo?getSupabaseRestUrl(`/storage/v1/object/public/alp-branding-assets/${d.brand.logo}`):/^apgi(?: training)?$/i.test(d.brand.name)?`${origin}/branding/apgi-logo.png`:null;
 const body=message.body.length>100000?message.body.slice(0,100000)+'\nFull committed report is available in the secure review workspace.':message.body;
 const join=body.split(/\s+/).find(s=>s.startsWith(`${origin}/course-reviews/${round.id}/join/`));
 const anchor=['review_change_requested','review_change_decided'].includes(message.kind??'')?'#manage-request':'';
 const lines=body.replace(/\nHosted by APGI\s*$/,'').split('\n');
 const signIn=lines.find(line=>line.startsWith('Sign in with ')&&line.endsWith(`: ${origin}/course-reviews/${round.id}`));
 const clean=lines.filter(line=>line!==signIn).join('\n');
 const footer=(signIn?signIn.slice(0,signIn.indexOf(`: ${origin}/`))+'.':'Sign in with the email address this message was sent to.')+' Opening an email does not complete a review or approval.';
 const html=brandedEmail({brand:d.brand.name,logo,color:d.brand.color,title:d.title,description:'',sections:reviewEmailSections(clean,d.title,message.kind),image:image?new URL(image,origin).toString():null,link:`${origin}/course-reviews/${round.id}${anchor}`,button:'Open course review',footer});
 return {text:body,html:join?html.replace('<hr style=',`<p style="margin:18px 0;line-height:1.6"><a href="${e(join)}">First time on V2? Create your review account</a></p><hr style=`):html};
}
