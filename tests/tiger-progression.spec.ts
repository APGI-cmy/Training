import {describe,it,expect} from 'vitest';
import manifest from '@/data/tiger-progression.json';
import {activityKey,emptyTigerProgress,firstBlockedSlide,mergeWatchedRanges,normalizedQuizPass,requirementsComplete,unitQualified,videoComplete,watchedSeconds} from '@/lib/tiger-progression';
const policy={...manifest.units.lu5,duration:100};
describe('Tiger progression prerequisites',()=>{
 it('blocks 79%, opens the video condition at exactly 80%, and does not count a seek to the end',()=>{
  const state=emptyTigerProgress();state.video_ranges=[[0,79]];expect(videoComplete(policy,state)).toBe(false);expect(firstBlockedSlide(policy,state,3)).toBe(2);
  state.video_ranges=[[99,100]];expect(videoComplete(policy,state)).toBe(false);
  state.video_ranges=[[0,80]];expect(videoComplete(policy,state)).toBe(true);expect(firstBlockedSlide(policy,state,3)).toBeNull();
 });
 it('counts the union of actually watched ranges instead of repeat viewing',()=>{
  expect(watchedSeconds(mergeWatchedRanges([[0,50],[10,20],[20,60],[75,80]],100))).toBe(65);
 });
 it.each([[[0,101]],[[90,80]],[[0,Infinity]],[[0,NaN]],[[0,'80']]])('rejects malformed or out-of-duration evidence %j',ranges=>{
  expect(()=>mergeWatchedRanges(ranges,100)).toThrow();
 });
 it('requires every summary before the quiz and preserves backwards navigation',()=>{
  const state={...emptyTigerProgress(),video_ranges:[[0,80]] as [number,number][]};
  expect(firstBlockedSlide(policy,state,policy.quizSlide)).toBe(3);
  state.summaries=policy.activities.map(activityKey);expect(requirementsComplete(policy,state)).toBe(true);
  expect(firstBlockedSlide(policy,state,1)).toBeNull();expect(unitQualified(policy,state)).toBe(false);
  state.quiz_passed=true;state.qualified_at=new Date().toISOString();expect(unitQualified(policy,state)).toBe(true);
 });
 it('requires the duplicate LU4 activity summary separately at each slide',()=>{
  const p=manifest.units.lu4;const duplicate=p.activities.filter(a=>a.id===p.activities[0].id);expect(duplicate).toHaveLength(2);
  expect(activityKey(duplicate[0])).not.toBe(activityKey(duplicate[1]));
 });
 it('does not infer a pass from completion, a missing score, a fail, or a score below 80%',()=>{
  for(const attempt of [{completion_status:'completed',success_status:'failed',score_scaled:1},{completion_status:'completed',success_status:'passed'},{completion_status:'completed',success_status:'passed',score_scaled:.79},{completion_status:'incomplete',success_status:'passed',score_scaled:1}])expect(normalizedQuizPass(attempt)).toBe(false);
  expect(normalizedQuizPass({completion_status:'completed',success_status:'passed',score_raw:80,score_max:100})).toBe(true);
 });
 it('recognises explicit historical credit without inventing video ranges or altering scores',()=>{
  const state={...emptyTigerProgress(),legacy_credit:true,qualified_at:'2026-10-01T00:00:00Z'};
  expect(unitQualified(policy,state)).toBe(true);expect(state.video_ranges).toEqual([]);
 });
});
