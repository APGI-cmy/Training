import {describe,it,expect} from 'vitest';
import {notificationRound} from './fixtures/review-notification';
import type {ReviewFinding} from '@/lib/course-review';
import {currentImplementationProgress,findingPhase,luReviewStages,submitImplementation} from '@/lib/lu-review-workflow';
import {reviewResponseRequests} from '@/lib/review-nonresponse';
function setup(){
 const round=notificationRound();round.document.reviewProcessVersion=3;
 round.document.nonresponsePolicy={version:1,days:7,roundId:round.id,enabledAt:'2026-11-15T10:00:00Z',enabledBy:'johan'};
 const finding:ReviewFinding={id:'caption',unit:'lu2',scope:'course',at:'2026-11-01T10:00:00Z',reference:'All units',category:'Design',outcome:'issue',blocking:true,author:'johan.ras@apginc.ca',userId:'johan',text:'Caption correction',status:'open',replies:[],implementationProgress:[{id:'progress',email:'johan.ras@apginc.ca',userId:'johan',at:'2026-11-15T11:00:00Z',findingAt:'2026-11-01T10:00:00Z',fingerprint:round.fingerprint,notes:'I corrected the source captions. Fresh iSpring exports and checks remain.',state:'pending'}]};
 round.document.findings=[finding];return {round,finding};
}
describe('Shared implementation remarks without a false completion',()=>{
 it('shows current designer remarks while keeping the finding open and excluding endorsement timers',()=>{
  const {round,finding}=setup();expect(currentImplementationProgress(round,finding)?.notes).toContain('I corrected');
  expect(findingPhase(round,finding)).toBe('Open');expect(luReviewStages(round,'lu1').find(s=>s.id==='implementation')?.done).toBe(false);
  expect(reviewResponseRequests(round).filter(r=>r.kind==='endorsement')).toEqual([]);
 });
 it('does not reuse another finding, author or changed course version',()=>{
  const {round,finding}=setup();const p=finding.implementationProgress![0];
  p.userId='somebody-else';expect(currentImplementationProgress(round,finding)).toBeUndefined();p.userId='johan';
  p.findingAt='different-finding-version';expect(currentImplementationProgress(round,finding)).toBeUndefined();p.findingAt=finding.at;
  round.fingerprint='new-package';expect(currentImplementationProgress(round,finding)).toBeUndefined();
 });
 it('retains the progress history when the designer later submits the completed response',()=>{
  const {round,finding}=setup();const original=structuredClone(finding.implementationProgress);
  submitImplementation(round,finding,{email:'johan.ras@apginc.ca',userId:'johan'},{id:'response',at:'2026-11-15T12:00:00Z',implemented:'yes',notes:'The corrected package is now exported and checked.'});
  expect(currentImplementationProgress(round,finding)).toBeUndefined();expect(findingPhase(round,finding)).toBe('Awaiting endorsement');expect(finding.implementationProgress).toEqual(original);
 });
 it('can show a response-bound supplemental remark without changing the submitted decision',()=>{
  const {round,finding}=setup();submitImplementation(round,finding,{email:'johan.ras@apginc.ca',userId:'johan'},{id:'response',at:'2026-11-15T12:00:00Z',implemented:'yes',notes:'Correction implemented'});
  finding.implementationProgress!.push({...finding.implementationProgress![0],id:'supplement',responseId:'response',notes:'The source correction is complete; export acceptance remains pending.'});
  expect(currentImplementationProgress(round,finding)?.id).toBe('supplement');expect(finding.implementationRounds![0].implemented).toBe('yes');expect(findingPhase(round,finding)).toBe('Awaiting endorsement');
 });
});
