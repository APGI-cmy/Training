import 'server-only';
import {getCourseBySlug,getCourses} from '@/lib/courses';
import {changedDeploymentUnits,deliveryIdentityForCourse,type RegisteredDeployment} from '@/lib/course-deployment';
import {hasReviewTask} from '@/lib/review-tasks';
import {reviewNonresponseNotice} from '@/lib/review-nonresponse';
import type {ReviewRound} from '@/lib/course-review';
import {STAGING_ORIGIN,STAGING_PROJECT_ID,assertStagingIsolation} from '@/server/environment-isolation';
import {adminRest} from '@/server/supabase/admin-rest';
import {rows} from './company-structure';

export function runtimeDeployment(env:NodeJS.ProcessEnv=process.env):RegisteredDeployment|undefined {
 if(env.VERCEL_ENV!=='production'||env.ALP_ENVIRONMENT!=='v2-staging'||env.VERCEL_PROJECT_ID!==STAGING_PROJECT_ID||!/^dpl_[a-zA-Z0-9]+$/.test(env.VERCEL_DEPLOYMENT_ID??'')||!/^[-a-zA-Z0-9.]+\.vercel\.app$/.test(env.VERCEL_URL??''))return undefined;
 return {id:env.VERCEL_DEPLOYMENT_ID!,url:`https://${env.VERCEL_URL}`,...(/^[a-f0-9]{40}$/.test(env.VERCEL_GIT_COMMIT_SHA??'')?{commit:env.VERCEL_GIT_COMMIT_SHA}:{})};
}

export function currentDeliveryStatus() {
 const deployment=runtimeDeployment();if(!deployment)return undefined;
 return {version:1,projectId:STAGING_PROJECT_ID,deployment,
  courses:Object.fromEntries(getCourses().flatMap(course=>{const identity=deliveryIdentityForCourse(course.id);return identity?[[course.id,identity.fingerprint]]:[]}))};
}

async function confirmedLiveDeployment() {
 const local=currentDeliveryStatus();if(!local)return undefined;
 assertStagingIsolation();
 const response=await fetch(`${STAGING_ORIGIN}/api/course-deployment`,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!response.ok)return undefined;
 const remote=await response.json() as ReturnType<typeof currentDeliveryStatus>;
 if(remote?.version!==1||remote.projectId!==STAGING_PROJECT_ID||remote.deployment.id!==local.deployment.id||remote.deployment.url!==local.deployment.url)return undefined;
 for(const [id,fingerprint] of Object.entries(local.courses))if(remote.courses[id]!==fingerprint)return undefined;
 return local.deployment;
}

function deploymentNotices(round:ReviewRound,fingerprint:string,changed:string[],deployment:RegisteredDeployment) {
 const course=getCourseBySlug(round.course_id)!;
 const names=changed.map(slug=>`${slug.toUpperCase()} · ${course.units.find(u=>u.slug===slug)?.title??slug}`).join('; ');
 const preserved=course.units.length-changed.length;
 const recipients=[...new Set([round.document.requester,...round.document.participants.filter(p=>p.state!=='declined'&&hasReviewTask(p,'content')).map(p=>p.email),...(round.document.workflow?.commercials.at(-1)?.acceptance?[round.document.workflow.partnerEmail]:[])])].filter(Boolean);
 return recipients.map(to=>{
  const person=round.document.participants.find(p=>p.email===to&&p.state!=='declined'),reviewer=person&&hasReviewTask(person,'content');
  const links=changed.map(slug=>`${slug.toUpperCase()}: ${STAGING_ORIGIN}/course-reviews/${round.id}#review-unit-${slug}`).join('\n');
  const steps=reviewer?'Open each changed LU and check the presentation, embedded quizzes and any corrections. Re-confirm “I reviewed this entire LU” under Initial review. When the designer has submitted implementation notes, open Endorsements and choose Yes—endorse or No—do not endorse with a reason. No reopens the finding.':'The assigned content reviewers must recheck the changed LUs. The designer still records implementation notes for each finding; deployment registration does not declare a finding fixed.';
  return {key:`${round.id}:auto-release:${fingerprint}:${round.revision}:${to}`,to,kind:'content_revision_registered',subject:`${round.document.title}: updated ${changed.map(u=>u.toUpperCase()).join(', ')} ready for review`,
   body:`To: ${to}\n\nThe APGI platform automatically registered a successfully deployed course update.\n\nChanged learning units: ${names}.\n${preserved} unchanged learning units keep their saved coverage. All earlier findings, comments, screenshots, reports and endorsement history remain saved.\n\n${steps}\n\n${links}\n\nCommercial and branding decisions remain separate. Final publication still requires approval.${round.document.nonresponsePolicy?`\n\n${reviewNonresponseNotice}`:''}\n\nDeployment record: ${deployment.url} (${deployment.id}).`};
 });
}

async function synchronizeRound(round:ReviewRound,expectedFingerprint:string,deployment:RegisteredDeployment):Promise<ReviewRound> {
 const identity=deliveryIdentityForCourse(round.course_id),course=getCourseBySlug(round.course_id);
 if(round.status!=='open'||round.document.workflow?.version!==2||!identity||!course||identity.fingerprint!==expectedFingerprint)return round;
 if(round.fingerprint===identity.fingerprint&&round.document.contentIdentity)return round;
 const changed=changedDeploymentUnits(round,identity);
 const notes=`Automatically detected deployed changes: ${changed.map(slug=>`${slug.toUpperCase()} — ${course.units.find(u=>u.slug===slug)?.title??slug}`).join('; ')}. This records the release only; implementation decisions and independent endorsements are separate.`;
 const saved=await adminRest('/rest/v1/rpc/v3_register_course_deployment',{method:'POST',body:JSON.stringify({p_id:round.id,p_revision:round.revision,p_previous:round.fingerprint,p_identity:identity,p_units:course.units.map(u=>({slug:u.slug,title:u.title})),p_deployment:deployment,p_notes:notes,p_mail:changed.length?deploymentNotices(round,identity.fingerprint,changed,deployment):[]})});
 // Reload on a CAS conflict too: a concurrent reviewer/job may have committed.
 // Never replay an older fingerprint over that newer record.
 const updated=(await rows<ReviewRound>(`/rest/v1/course_review_rounds?id=eq.${round.id}&select=*&limit=1`))[0];
 if(!saved.ok&&(updated?.fingerprint!==identity.fingerprint||updated.document.contentIdentity?.fingerprint!==identity.fingerprint))throw Error('Automatic deployment registration will retry after a concurrent update.');
 return updated??round;
}

export async function ensureReviewDeployment(round:ReviewRound,expectedFingerprint:string):Promise<ReviewRound> {
 if(round.fingerprint===expectedFingerprint&&round.document.contentIdentity)return round;
 try{const deployment=await confirmedLiveDeployment();return deployment?await synchronizeRound(round,expectedFingerprint,deployment):round;}
 catch{console.warn('Automatic course deployment registration deferred; saved review evidence retained.');return round;}
}

export async function synchronizeCourseDeployments() {
 const deployment=await confirmedLiveDeployment();if(!deployment)return {confirmed:false,registered:0,baselined:0,deferred:0};
 const rounds=await rows<ReviewRound>('/rest/v1/course_review_rounds?status=eq.open&select=*&order=created_at.asc');
 let registered=0,baselined=0,deferred=0;
 for(const round of rounds){const identity=deliveryIdentityForCourse(round.course_id);if(!identity)continue;
  try{const updated=await synchronizeRound(round,identity.fingerprint,deployment);if(updated.fingerprint!==round.fingerprint)registered++;else if(updated.revision!==round.revision)baselined++;}
  catch{deferred++;}
 }
 return {confirmed:true,registered,baselined,deferred};
}
