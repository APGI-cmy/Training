import 'server-only';
import {adminRest} from '@/server/supabase/admin-rest';
import type {AlpSession} from '@/server/auth/session';
import type {Course,LearningUnit} from '@/types/course';
import {activityKey,emptyTigerProgress,isTigerCourse,mergeWatchedRanges,normalizedQuizPass,requirementsComplete,tigerPolicy,TIGER_POLICY_VERSION,unitQualified,type TigerProgress} from '@/lib/tiger-progression';

const table='/rest/v1/tiger_unit_progress';
const editionKey=(course:Course)=>course.editionId??'legacy';
export async function loadTigerProgress(session:AlpSession,course:Course,unit:LearningUnit):Promise<TigerProgress> {
  if(!tigerPolicy(course,unit))return emptyTigerProgress();
  const response=await adminRest(`${table}?user_id=eq.${session.user.id}&course_id=eq.${encodeURIComponent(course.id)}&unit_id=eq.${encodeURIComponent(unit.id)}&edition_key=eq.${editionKey(course)}&policy_version=eq.${TIGER_POLICY_VERSION}&select=video_ranges,summaries,quiz_passed,qualified_at,legacy_credit&limit=1`);
  if(!response.ok)throw Error('Your saved viewing requirements could not be read. Please try again.');
  const rows=await response.json();if(!Array.isArray(rows))throw Error('Invalid progress response');
  return rows[0]??emptyTigerProgress();
}
export async function tigerCompletedUnits(session:AlpSession,course:Course) {
  if(!isTigerCourse(course))return null;
  const response=await adminRest(`${table}?user_id=eq.${session.user.id}&course_id=eq.${encodeURIComponent(course.id)}&edition_key=eq.${editionKey(course)}&policy_version=eq.${TIGER_POLICY_VERSION}&qualified_at=not.is.null&select=unit_id`);
  if(!response.ok)throw Error('Course requirements are temporarily unavailable.');
  const rows=await response.json();if(!Array.isArray(rows))throw Error('Invalid progress response');
  return new Set<string>(rows.map((r:{unit_id:string})=>r.unit_id));
}
export async function tigerUnitAllowed(session:AlpSession,course:Course,unit:LearningUnit) {
  if(!isTigerCourse(course))return true;
  const completed=await tigerCompletedUnits(session,course);
  return course.units.filter(u=>u.order<unit.order).every(u=>completed!.has(u.id));
}
export async function saveTigerEvidence(session:AlpSession,course:Course,unit:LearningUnit,input:{ranges?:unknown;summary?:unknown;attempt?:Parameters<typeof normalizedQuizPass>[0]}) {
  const policy=tigerPolicy(course,unit);if(!policy)throw Error('Viewing requirements are not configured.');
  if(!await tigerUnitAllowed(session,course,unit))throw Error('Complete and pass the earlier units first.');
  const ranges=input.ranges===undefined?[]:mergeWatchedRanges(input.ranges,policy.duration);
  const summary=typeof input.summary==='string'?input.summary:null;
  if(input.summary!==undefined&&!policy.activities.some(a=>activityKey(a)===summary))throw Error('Unknown activity summary');
  const before=await loadTigerProgress(session,course,unit);
  if(summary){
    const activity=policy.activities.find(a=>activityKey(a)===summary)!;
    const {firstBlockedSlide}=await import('@/lib/tiger-progression');
    if(firstBlockedSlide(policy,before,activity.slide)!==null)throw Error('Complete the earlier activity first.');
  }
  const passed=!!input.attempt&&normalizedQuizPass(input.attempt)&&requirementsComplete(policy,before);
  const response=await adminRest('/rest/v1/rpc/tiger_merge_progress',{
    method:'POST',body:JSON.stringify({p_user:session.user.id,p_course:course.id,p_unit:unit.id,p_edition:editionKey(course),p_version:TIGER_POLICY_VERSION,p_duration:policy.duration,p_ranges:ranges,p_summary:summary,p_passed:passed,p_activity_keys:policy.activities.map(activityKey)})
  });
  if(!response.ok)throw Error('Your viewing requirements could not be saved. Keep this page open and try again.');
  const state=await response.json() as TigerProgress;
  return {state,qualified:unitQualified(policy,state)};
}
export async function assertTigerCompletion(session:AlpSession,course:Course,unit:LearningUnit) {
  const policy=tigerPolicy(course,unit);if(!policy)return;
  const state=await loadTigerProgress(session,course,unit);
  if(!unitQualified(policy,state))throw Error('Watch the required video, open every activity summary and pass the quiz before completing this unit.');
}
