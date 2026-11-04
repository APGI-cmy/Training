import {activeFindings,type ReviewRound} from './course-review';
import {findingImplementationRecorded,findingPhase,luInitialReviewProgress,luReviewStages} from './lu-review-workflow';

// All summaries consume the same predicates as the LU modal, without changing records.
export function courseReviewProgress(round:ReviewRound){
 const units=round.document.units.map(unit=>({...unit,stages:luReviewStages(round,unit.slug),reviewers:luInitialReviewProgress(round,unit.slug)}));
 const records=activeFindings(round.document).map(finding=>({finding,phase:findingPhase(round,finding),implemented:findingImplementationRecorded(round,finding)}));
 const corrections=records.filter(r=>r.finding.outcome!=='satisfied');
 const pendingCorrections=records.filter(r=>!r.implemented||r.phase==='Reopened');
 const reviewers=round.document.participants.filter(p=>units.some(u=>u.reviewers.some(r=>r.email===p.email))).map(p=>{
  const reports=round.document.reports.filter(r=>r.email===p.email&&r.userId===p.userId);
  const earlierReport=reports.filter(r=>round.document.units.every(u=>r.coverage.includes(u.slug))).at(-1);
  const missingCoverage=units.filter(u=>u.reviewers.some(r=>r.email===p.email&&!r.coverage&&!r.deemed));
  const rechecks=missingCoverage.filter(u=>reports.some(r=>r.coverage.includes(u.slug)));
  return {email:p.email,total:units.length,
   confirmed:units.filter(u=>u.reviewers.some(r=>r.email===p.email&&r.coverage)).length,
   recorded:units.filter(u=>u.reviewers.some(r=>r.email===p.email&&r.recorded)).length,
   deemed:units.filter(u=>u.reviewers.some(r=>r.email===p.email&&r.deemed)).length,
   initialComplete:units.filter(u=>u.reviewers.some(r=>r.email===p.email&&r.complete)).length,
   earlierReport,missingCoverage,rechecks,
   firstReviews:missingCoverage.filter(u=>!rechecks.some(r=>r.slug===u.slug)),
   missingRecords:units.filter(u=>u.reviewers.some(r=>r.email===p.email&&!r.recorded&&!r.deemed))};
 });
 return {units,records,corrections,pendingCorrections,
  coverageConfirmed:reviewers.reduce((n,r)=>n+r.confirmed,0),
  coverageRequired:reviewers.length*units.length,
  rechecks:reviewers.reduce((n,r)=>n+r.rechecks.length,0),
  implementationComplete:pendingCorrections.length===0,
  submitted:corrections.filter(r=>r.implemented).length,
  initialComplete:units.filter(u=>u.stages.find(s=>s.id==='initial')!.done).length,
  unitsComplete:units.filter(u=>u.stages.every(s=>s.done)).length,
  awaitingEndorsement:records.filter(r=>r.phase==='Awaiting endorsement'),
  awaitingInitial:records.filter(r=>r.phase==='Awaiting team review'),
  closed:records.filter(r=>r.phase==='Closed'),
  reviewers};
}
