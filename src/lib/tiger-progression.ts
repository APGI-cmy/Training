import manifest from '@/data/tiger-progression.json';
import type {Course, LearningUnit} from '@/types/course';

export type WatchedRange = [number, number];
export type TigerPolicy = {unitId:string;slideCount:number;videoSlide:number;duration:number;videoSha256:string;quizSlide:number;activities:Array<{id:string;slide:number}>};
export type TigerProgress = {video_ranges:WatchedRange[];summaries:string[];quiz_passed:boolean;qualified_at:string|null;legacy_credit?:boolean};
export const TIGER_POLICY_VERSION = manifest.version;
export const emptyTigerProgress = ():TigerProgress => ({video_ranges:[],summaries:[],quiz_passed:false,qualified_at:null});
export function isTigerCourse(course:Pick<Course,'id'|'baseCourseId'>) {
  return (course.baseCourseId??course.id) === manifest.courseId;
}
export function tigerPolicy(course:Course, unit:LearningUnit):TigerPolicy|null {
  if(!isTigerCourse(course)) return null;
  return (manifest.units as Record<string,TigerPolicy>)[unit.slug]??null;
}
export const activityKey = (activity:{id:string;slide:number}) => `${activity.id}@${activity.slide}`;
export function activityComplete(policy:TigerPolicy,state:TigerProgress,activity:{id:string;slide:number}) {
  if(state.summaries.includes(activityKey(activity)))return true;
  // Keep a genuinely completed Unit 4 valid without rewriting its historical evidence.
  // Incomplete attempts must open the corrected LA04 summary before they can pass.
  return policy.unitId==='tiger-telecom-lu-4'&&activity.id==='TK-LU04-LA04'&&activity.slide===6&&
    !!state.qualified_at&&state.quiz_passed&&state.summaries.includes('TK-LU04-LA01@6');
}
export function mergeWatchedRanges(ranges:unknown, duration:number):WatchedRange[] {
  if(!Array.isArray(ranges)||ranges.length>512||!Number.isFinite(duration)||duration<=0) throw Error('Invalid viewing evidence');
  const sorted:WatchedRange[] = ranges.map(value=>{
    if(!Array.isArray(value)||value.length!==2||!value.every(n=>typeof n==='number'&&Number.isFinite(n))||value[0]<0||value[1]<=value[0]||value[1]>duration+0.25) throw Error('Invalid viewing evidence');
    return [value[0],Math.min(value[1],duration)] as WatchedRange;
  }).sort((a,b)=>a[0]-b[0]);
  const merged:WatchedRange[]=[];
  for(const range of sorted){const previous=merged.at(-1);if(previous&&range[0]<=previous[1])previous[1]=Math.max(previous[1],range[1]);else merged.push([...range]);}
  return merged;
}
export function watchedSeconds(ranges:WatchedRange[]){return ranges.reduce((sum,[a,b])=>sum+b-a,0);}
export function videoComplete(policy:TigerPolicy,state:TigerProgress){return watchedSeconds(mergeWatchedRanges(state.video_ranges,policy.duration))/policy.duration>=manifest.videoThreshold;}
export function requirementsComplete(policy:TigerPolicy,state:TigerProgress){
  return state.legacy_credit===true || (videoComplete(policy,state)&&policy.activities.every(a=>activityComplete(policy,state,a)));
}
export function unitQualified(policy:TigerPolicy,state:TigerProgress){return !!state.qualified_at&&(state.legacy_credit===true||requirementsComplete(policy,state)&&state.quiz_passed);}
export function normalizedQuizPass(attempt:{completion_status?:string|null;success_status?:string|null;score_raw?:number|null;score_max?:number|null;score_scaled?:number|null}) {
  const score=typeof attempt.score_scaled==='number'&&Number.isFinite(attempt.score_scaled)?attempt.score_scaled:
    typeof attempt.score_raw==='number'&&typeof attempt.score_max==='number'&&attempt.score_max>0?attempt.score_raw/attempt.score_max:NaN;
  return attempt.completion_status==='completed'&&attempt.success_status==='passed'&&score>=manifest.quizThreshold&&score<=1;
}
// All earlier prerequisites must be met, including when using an outline or a direct slide jump.
export function firstBlockedSlide(policy:TigerPolicy,state:TigerProgress,targetSlide:number):number|null {
  if(state.legacy_credit)return null;
  if(targetSlide>policy.videoSlide&&!videoComplete(policy,state))return policy.videoSlide;
  for(const a of policy.activities){if(targetSlide>a.slide&&!activityComplete(policy,state,a))return a.slide;}
  return null;
}
export function missingTigerRequirement(policy:TigerPolicy,state:TigerProgress){
  if(!videoComplete(policy,state)&&!state.legacy_credit)return 'Watch at least 80% of the opening video.';
  if(!requirementsComplete(policy,state))return 'Open the summary in each required activity.';
  if(!state.quiz_passed&&!state.legacy_credit)return 'Pass this unit’s quiz with at least 80%.';
  return 'Requirements complete. Your progress is saved.';
}
