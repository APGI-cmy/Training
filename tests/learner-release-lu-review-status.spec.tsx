import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect} from 'vitest';
import {notificationRound} from './fixtures/review-notification';
import {InitialReviewStatus,PendingEndorsement} from '@/components/reviews/LUReviewStatus';
import {luInitialReviewProgress,luReviewStages} from '@/lib/lu-review-workflow';

function setup(){
 const r=notificationRound();r.document.participants=r.document.participants.slice(0,2);
 r.document.findings=[{id:'own',at:'now',unit:'lu1',reference:'Slide 1',category:'Content',author:'johan.ras@apginc.ca',userId:'johan',text:'Please fix',status:'open',blocking:false,replies:[]}];
 return r;
}
describe('Clear personal and team LU status',()=>{
 it('keeps the changed LU red while old confirmations remain saved, then requires every reviewer to reconfirm',()=>{
  const r=setup();r.document.participants[1].coverage=['lu1'];r.document.findings.push({...r.document.findings[0],id:'other',author:'jorrie.jordaan@apginc.ca',userId:'jorrie',outcome:'satisfied'});
  const before=JSON.stringify(r);
  expect(luReviewStages(r,'lu1')[0].done).toBe(true);
  expect(luReviewStages(r,'lu1',true)[0].done).toBe(false);
  const html=renderToStaticMarkup(<InitialReviewStatus round={r} unit="lu1" email="johan.ras@apginc.ca" recheckPending/>);
  expect(html).toContain('Earlier coverage confirmations remain saved');expect(html).toContain('0 of 2 reviewers complete');expect(html).toContain('jorrie.jordaan@apginc.ca');expect(html).toContain('recheck the updated LU');
  expect(JSON.stringify(r)).toBe(before);
  r.document.participants.forEach(p=>p.coverage=[]);
  expect(luReviewStages(r,'lu1')[0].done).toBe(false);
  r.document.participants[0].coverage=['lu1'];expect(luReviewStages(r,'lu1')[0].done).toBe(false);
  r.document.participants[1].coverage=['lu1'];expect(luReviewStages(r,'lu1')[0].done).toBe(true);
 });
 it('shows personal completion while the team still needs another reviewer, without changing the gate',()=>{
  const r=setup(),html=renderToStaticMarkup(<InitialReviewStatus round={r} unit="lu1" email="johan.ras@apginc.ca"/>);
  expect(html).toContain('Your initial review: Complete');expect(html).toContain('1 of 2 reviewers complete');
  expect(html).toContain('jorrie.jordaan@apginc.ca');expect(html).toContain('confirm LU coverage; save a finding or a nothing-to-add declaration');
  expect(luReviewStages(r,'lu1')[0].done).toBe(false);
 });
 it('identifies a missing declaration even when coverage is confirmed, then completes only when both records exist',()=>{
  const r=setup();r.document.participants[1].coverage=['lu1'];
  let progress=luInitialReviewProgress(r,'lu1');expect(progress[1]).toMatchObject({coverage:true,recorded:false,complete:false});
  r.document.findings.push({...r.document.findings[0],id:'other',author:'jorrie.jordaan@apginc.ca',userId:'jorrie',outcome:'satisfied'});
  expect(luReviewStages(r,'lu1')[0].done).toBe(true);
  expect(luReviewStages(r,'lu1')[3].done).toBe(false);
 });
 it('counts a course-wide declaration in the selected LU and excludes declined or non-content reviewers',()=>{
  const r=setup();r.document.findings[0].scope='course';r.document.findings[0].unit='other-unit';
  r.document.participants[1].tasks=['commercials'];
  expect(luInitialReviewProgress(r,'lu1')).toEqual([{email:'johan.ras@apginc.ca',coverage:true,recorded:true,complete:true}]);
  expect(luReviewStages(r,'lu1')[0].done).toBe(false);
  r.document.participants[1].tasks=['content'];r.document.participants[1].state='declined';
  expect(luInitialReviewProgress(r,'lu1')).toHaveLength(1);
 });
 it('uses a pending message, never a green success claim, before an endorsement exists',()=>{
  const html=renderToStaticMarkup(<PendingEndorsement/>);
  expect(html).toContain('Your implementation response is complete. Awaiting endorsement from one other reviewer.');
  expect(html).toContain('class="lu-pending"');expect(html).not.toContain('form-success');
  expect(renderToStaticMarkup(<PendingEndorsement declaration/>)).toContain('Your review declaration is saved. Awaiting endorsement');
 });
});
