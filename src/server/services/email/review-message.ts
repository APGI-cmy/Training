import 'server-only';
import {getSupabaseRestUrl} from '@/server/auth/session';
import {getCourseCover} from '@/lib/course-covers';
import type {ReviewRound} from '@/lib/course-review';
import {STAGING_ORIGIN} from '@/server/environment-isolation';
import {escapeEmail} from './send-course-invitation';

export function reviewInvitationNarrative(requester:string,perLu=false){
 if(perLu)return `You are invited to a collaborative course review by ${requester}. Review every assigned learning unit and its embedded quizzes. Record findings or a nothing-to-add declaration beside the presentation, and confirm your LU review. Each LU has an Initial review, Implementation feedback, Reopened rounds and Endorsements workflow. The original reviewer accepts or rejects the designer’s numbered response. One other reviewer endorses the completed record. Findings, screenshots and submitted responses are shared with the assigned team; private drafts are not. Daily reminders stop when assigned work is complete, declined or overdue. Overdue work requires an extension and never counts as approval. Sign in with the invited email. Review access does not enrol you or grant administrator rights.`;
 return `You are invited to a collaborative course review by ${requester}. Full reviewers examine every LU and quiz, mark coverage and submit a report, even when no issues are found. Every full report needs one different reviewer's endorsement. Peer-only checkers may read and endorse reports directly. Findings, screenshots and comments are shared with the assigned team. You may decline with a reason. Daily reminders stop when you finish, decline or reach the cutoff. Overdue work requires an extension and never counts as approval. Sign in with the invited email. Review access does not enrol you or grant administrator rights.`;
}
// One renderer for real review delivery and the administrator's preview.
export function renderReviewMessage(round:ReviewRound,message:{subject:string;body:string;kind?:string}){
 const d=round.document,e=escapeEmail,origin=process.env.NEXT_PUBLIC_APP_URL??STAGING_ORIGIN;
 const image=getCourseCover(round.course_id)?.src;
 const logo=d.brand.logo?getSupabaseRestUrl(`/storage/v1/object/public/alp-branding-assets/${d.brand.logo}`):`${origin}/branding/apgi-logo.png`;
 const body=message.body.length>100000?message.body.slice(0,100000)+'\nFull committed report is available in the secure review workspace.':message.body;
 const join=body.split(/\s+/).find(s=>s.startsWith(`${origin}/course-reviews/${round.id}/join/`));
 const anchor=['review_change_requested','review_change_decided'].includes(message.kind??'')?'#manage-request':'';
 return {text:body,html:`<div style="max-width:640px;margin:auto;font:16px Arial;color:#102b47">${logo?`<img alt="${e(d.brand.name)}" width="150" src="${e(logo)}"/>`:''}<h2>${e(d.brand.name)}</h2>${image?`<img alt="Course" style="width:100%;max-height:180px;object-fit:cover" src="${e(origin+image)}"/>`:''}<h3>${e(d.title)}</h3><div style="white-space:pre-line">${e(body)}</div><p><a style="display:inline-block;padding:14px;background:${/^#[a-f0-9]{6}$/i.test(d.brand.color)?d.brand.color:'#102b47'};color:white" href="${e(origin)}/course-reviews/${round.id}${anchor}">Open course review</a></p>${join?`<p><a href="${e(join)}">First time on V2? Create your review account</a></p>`:''}<small>Hosted by APGI</small></div>`};
}
