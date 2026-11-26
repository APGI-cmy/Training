import 'server-only';
import {adminRest} from '@/server/supabase/admin-rest';
import type {ReviewRound} from '@/lib/course-review';
import type {ReviewOffering} from '@/lib/review-workflow-summary';
import {publishedReleaseForOffering,publishedTrainingRelease} from '@/lib/review-publication-state';
import {rows} from './company-structure';

// Presentation only. The caller must already have access to this review.
export async function reviewLearnerRelease(round:ReviewRound){
 if(round.status==='published')return publishedTrainingRelease(round,round.fingerprint,round.document.brand.revision)??null;
 if(round.status!=='open')return null;
 const [offering]=await rows<ReviewOffering>(`/rest/v1/organisation_offerings?organisation_id=eq.${round.organisation_id}&course_id=eq.${encodeURIComponent(round.course_id)}&select=organisation_id,course_id,status,reviewed_release_id&limit=1`);
 return publishedReleaseForOffering(round,offering)??null;
}

// Presentation metadata only. This never grants catalogue access or enrolment.
export async function getPublishedCourseIds(courseIds:string[]):Promise<Set<string>|null>{
 if(!courseIds.length)return new Set();
 const filter=courseIds.map(id=>`"${id.replaceAll('"','\\"')}"`).join(',');
 try{
  const response=await adminRest(`/rest/v1/organisation_offerings?status=eq.published&or=(reviewed_release_id.not.is.null,shared_distribution_id.not.is.null)&course_id=in.(${encodeURIComponent(filter)})&select=course_id,status,reviewed_release_id,shared_distribution_id`);
  if(!response.ok)return null;
  const rows=await response.json() as {course_id:string;status:string;reviewed_release_id:string|null;shared_distribution_id?:string|null}[];
  return new Set(rows.filter(r=>courseIds.includes(r.course_id)&&r.status==='published'&&(!!r.reviewed_release_id||!!r.shared_distribution_id)).map(r=>r.course_id));
 }catch{return null;}
}
