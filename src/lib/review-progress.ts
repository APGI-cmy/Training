import {activeFindings,type ReviewRound} from './course-review';
import {findingImplementationRecorded,findingPhase,luInitialReviewProgress,luReviewStages} from './lu-review-workflow';

// All summaries consume the same predicates as the LU modal, without changing records.
export function courseReviewProgress(round:ReviewRound){
 const units=round.document.units.map(unit=>({...unit,stages:luReviewStages(round,unit.slug),reviewers:luInitialReviewProgress(round,unit.slug)}));
 const records=activeFindings(round.document).map(finding=>({finding,phase:findingPhase(round,finding),implemented:findingImplementationRecorded(round,finding)}));
 const corrections=records.filter(r=>r.finding.outcome!=='satisfied');
 const pendingCorrections=records.filter(r=>!r.implemented||r.phase==='Reopened');
 return {units,records,corrections,pendingCorrections,
  implementationComplete:pendingCorrections.length===0,
  submitted:corrections.filter(r=>r.implemented).length,
  initialComplete:units.filter(u=>u.stages.find(s=>s.id==='initial')!.done).length,
  unitsComplete:units.filter(u=>u.stages.every(s=>s.done)).length,
  awaitingEndorsement:records.filter(r=>r.phase==='Awaiting endorsement'),
  awaitingInitial:records.filter(r=>r.phase==='Awaiting team review'),
  closed:records.filter(r=>r.phase==='Closed'),
  reviewers:round.document.participants.filter(p=>units.some(u=>u.reviewers.some(r=>r.email===p.email))).map(p=>({email:p.email,
   missingCoverage:units.filter(u=>u.reviewers.some(r=>r.email===p.email&&!r.coverage&&!r.deemed)),
   missingRecords:units.filter(u=>u.reviewers.some(r=>r.email===p.email&&!r.recorded&&!r.deemed))}))};
}
