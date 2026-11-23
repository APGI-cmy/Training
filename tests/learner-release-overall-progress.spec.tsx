import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {getCourses} from '@/lib/courses';
import {overallLearningProgress,unitProgressDisplay,type ProgressEvidence} from '@/lib/learning-progress-display';
import {TIGER_POLICY_VERSION} from '@/lib/tiger-progression';
import {ProgressIndicator} from '@/components/progress/ProgressIndicator';

const course=getCourses().find(c=>c.id==='tiger-kidnapping-telecommunications')!;
const row={user_id:'qa',course_id:course.id,unit_id:course.units[0].id,updated_at:'2026-11-23T08:00:00Z'};
const empty=():ProgressEvidence=>({learning:[],scorm:[],tiger:[],sequence:[],available:true,detailedAvailable:true});
const tiger={...row,edition_key:'legacy',policy_version:TIGER_POLICY_VERSION,video_ranges:[[0,74.9]] as [number,number][],summaries:['TK-LU01-F01@3','TK-LU01-F02@4','TK-LU01-F03@5'],quiz_passed:false,qualified_at:null};
describe('Overall progress without completion writes',()=>{
 it('credits saved video, summaries and sections before any unit qualifies',()=>{
  const evidence=empty(); evidence.tiger=[tiger];
  evidence.sequence=[{...row,edition_key:'legacy',document_path:'/courses/Tiger%20kidnapping_telecommunications/LU1/res/data/wo4/index.html',begun:true,step_count:4,through_step:0,summary_opened:false}];
  const before=JSON.stringify(evidence);
  const units=unitProgressDisplay(course,'qa',evidence);
  expect(units.filter(u=>u.state==='Completed')).toHaveLength(0);
  expect(overallLearningProgress(units)).toBe(5.3);
  expect(JSON.stringify(evidence)).toBe(before);
 });
 it('increases with further sections and then the required summary',()=>{
  const evidence=empty();evidence.tiger=[{...tiger}];
  evidence.sequence=[{...row,edition_key:'legacy',document_path:'/data/wo4/index.html',begun:true,step_count:4,through_step:0,summary_opened:false}];
  const a=overallLearningProgress(unitProgressDisplay(course,'qa',evidence))!;
  evidence.sequence[0].through_step=3;
  const b=overallLearningProgress(unitProgressDisplay(course,'qa',evidence))!;
  evidence.tiger[0].summaries=[...tiger.summaries,'TK-LU01-LA01@6'];
  const c=overallLearningProgress(unitProgressDisplay(course,'qa',evidence))!;
  expect(a).toBeLessThan(b);expect(b).toBeLessThan(c);
 });
 it('shows small saved video progress rather than rounding it away to zero',()=>{
  const evidence=empty();evidence.tiger=[{...tiger,video_ranges:[[0,1]],summaries:[]}];
  expect(overallLearningProgress(unitProgressDisplay(course,'qa',evidence))).toBe(.1);
 });
 it('uses an authoritative completion set and cannot turn a display estimate into 100%',()=>{
  const evidence=empty();evidence.scorm=course.units.map(u=>({...row,unit_id:u.id,completion_status:'completed',success_status:'passed',progress_measure:1}));
  const completed=new Set(course.units.slice(0,7).map(u=>u.id));
  const units=unitProgressDisplay(course,'qa',evidence,completed);
  expect(units.filter(u=>u.state==='Completed')).toHaveLength(7);
  expect(overallLearningProgress(units)).toBeLessThan(100);
  completed.add(course.units[7].id);
  expect(overallLearningProgress(unitProgressDisplay(course,'qa',evidence,completed))).toBe(100);
 });
 it('uses generic presentation evidence without inventing separate media measurements',()=>{
  const generic={...course,id:'generic',baseCourseId:undefined};
  const evidence=empty();evidence.scorm=[{...row,course_id:'generic',progress_measure:.5,completion_status:'incomplete'}];
  const units=unitProgressDisplay(generic,'qa',evidence);
  expect(overallLearningProgress(units)).toBe(6.3);
  expect(units[0].video).toBe('Not reported separately by this course');
 });
 it('shows missing evidence as unavailable and retains genuinely completed history',()=>{
  expect(overallLearningProgress(unitProgressDisplay(course,'qa',{...empty(),available:false}))).toBeNull();
  expect(overallLearningProgress(unitProgressDisplay(course,'qa',{...empty(),detailedAvailable:false}))).toBeNull();
  expect(overallLearningProgress(unitProgressDisplay(course,'qa',{...empty(),available:false},new Set(course.units.map(u=>u.id))))).toBe(100);
 });
 it('renders the overall percentage and completed-unit count separately',()=>{
  const html=renderToStaticMarkup(createElement(ProgressIndicator,{completedUnits:0,totalUnits:8,overallPercent:5.3}));
  expect(html).toContain('value="5.3"');expect(html).toContain('5.3% overall progress');
  expect(html).toContain('of 8 units complete');expect(html).not.toContain('5.3% complete');
 });
 it('keeps the learner course summative assessment in the denominator',()=>{
  const scannex=getCourses().find(c=>c.id==='scannex-training-programme')!;
  const complete=new Set(scannex.units.filter(u=>u.order<=8).map(u=>u.id));
  const units=unitProgressDisplay(scannex,'qa',empty(),complete,true);
  expect(units).toHaveLength(scannex.units.length);
  expect(overallLearningProgress(units)).toBeLessThan(100);
 });
});
