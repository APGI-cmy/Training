import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect} from 'vitest';
import {cleanReviewRound} from './fixtures/clean-review';
import {courseReviewProgress} from '@/lib/review-progress';
import {ReviewProgressSummary} from '@/components/reviews/ReviewProgressSummary';
import {ReviewTeamProgress} from '@/components/reviews/ReviewTeamProgress';
import {contentReviewBlockers} from '@/lib/course-review';
import {publicationGuide,findWorkflowStep} from '@/lib/publication-guide';

function partiallyRechecked(){
 const r=cleanReviewRound(2,13);
 r.document.reports=r.document.participants.map((p,i)=>({id:`prior-${i}`,email:p.email,userId:p.userId!,at:'2026-10-26T16:00:00Z',coverage:r.document.units.map(u=>u.slug),text:'Earlier completed review',endorsements:[]}));
 const [johan,jorrie]=r.document.participants;
 jorrie.coverage=r.document.units.slice(0,8).map(u=>u.slug);
 r.document.findings=r.document.findings.filter(f=>f.author===johan.email?f.unit!=='lu10':['lu1','lu2','lu9','lu11','lu12'].includes(f.unit));
 return r;
}
describe('Review summaries explain counts without changing review evidence',()=>{
 it('keeps 21/26 coverage distinct from 2/13 complete team initial requirements',()=>{
  const r=partiallyRechecked(),before=JSON.stringify(r),blockers=contentReviewBlockers(r,r.fingerprint),p=courseReviewProgress(r);
  expect(p.coverageConfirmed).toBe(21);expect(p.coverageRequired).toBe(26);expect(p.initialComplete).toBe(2);expect(p.rechecks).toBe(5);
  expect(p.reviewers[0].confirmed).toBe(13);expect(p.reviewers[0].missingRecords.map(u=>u.slug)).toEqual(['lu10']);
  const html=renderToStaticMarkup(<ReviewProgressSummary round={r}/>);
  expect(html).toContain('21/26');expect(html).toContain('Team initial review requirements: 2/13');
  expect(html).toContain('What do these figures mean, and who needs to act?');expect(html).toContain('Earlier full review saved');
  expect(html).toContain('#review-unit-lu10');expect(html).toContain('Final publication is a separate step');
  expect(JSON.stringify(r)).toBe(before);expect(contentReviewBlockers(r,r.fingerprint)).toEqual(blockers);
 });
 it.each([2,5,8])('uses the actual number of assigned reviewers for %i people',n=>{
  const r=cleanReviewRound(n,13),p=courseReviewProgress(r);
  expect(p.coverageRequired).toBe(n*13);expect(p.coverageConfirmed).toBe(n*13);
  r.document.participants[n-1].role='peer';expect(courseReviewProgress(r).coverageRequired).toBe((n-1)*13);
 });
 it('distinguishes a first review from a recheck and does not invent a saved report',()=>{
  const r=cleanReviewRound(2,2);r.document.participants[1].coverage=[];
  const p=courseReviewProgress(r);expect(p.rechecks).toBe(0);expect(p.reviewers[1].firstReviews).toHaveLength(2);
  const html=renderToStaticMarkup(<ReviewTeamProgress round={r} person={r.document.participants[1]} progress={p} brandRevision={1}/>);
  expect(html).toContain('2 coverage confirmations outstanding');expect(html).not.toContain('Earlier full review saved');
  expect(html).toContain('See progress and required actions');expect(html).toContain('Coverage confirmation required');
 });
 it('explains completed personal coverage while endorsements or feedback requirements remain outstanding',()=>{
  const r=partiallyRechecked(),p=courseReviewProgress(r);
  const html=renderToStaticMarkup(<ReviewTeamProgress round={r} person={r.document.participants[0]} progress={p} brandRevision={1}/>);
  expect(html).toContain('LU coverage: 13/13 confirmed');expect(html).toContain('Personal coverage complete');
  expect(html).toContain('Current feedback record missing: 1');expect(html).not.toContain('Pending: Content');
  const note=findWorkflowStep(publicationGuide(r,r.fingerprint,1,r.document.requester),'content')?.note;
  expect(note).toContain('LU coverage: 21/26 reviewer confirmations');expect(note).not.toContain('2/13 LUs have completed');
 });
 it('keeps declined reviewers out of the team denominator',()=>{
  const r=cleanReviewRound(5,2);r.document.participants[4].state='declined';
  const p=courseReviewProgress(r);expect(p.coverageRequired).toBe(8);
  const html=renderToStaticMarkup(<ReviewTeamProgress round={r} person={r.document.participants[4]} progress={p} brandRevision={1}/>);
  expect(html).toContain('Declined');expect(html).not.toContain('Endorsements this reviewer can provide');
 });
});
