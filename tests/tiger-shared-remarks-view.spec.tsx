import React from 'react';
import {describe,it,expect,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {notificationRound} from './fixtures/review-notification';
import type {ReviewFinding} from '@/lib/course-review';
vi.mock('@/components/reviews/ReviewForms',()=>({ReviewForm:({children}:React.PropsWithChildren)=><form>{children}</form>}));
import {ImplementationEditor} from '@/components/reviews/LUReviewForms';
function setup(){const round=notificationRound();const finding:ReviewFinding={id:'caption',unit:'lu2',at:'2026-11-01T10:00:00Z',reference:'Video',category:'Content',outcome:'issue',blocking:true,author:'johan.ras@apginc.ca',userId:'johan',text:'Caption correction',status:'open',replies:[],implementationProgress:[{id:'progress',email:'johan.ras@apginc.ca',userId:'johan',at:'2026-11-15T11:00:00Z',findingAt:'2026-11-01T10:00:00Z',fingerprint:round.fingerprint,notes:'I corrected source captions. Fresh exports remain pending.',state:'pending'}]};return {round,finding};}
describe('Implementation feedback remarks field',()=>{
 it('renders shared remarks inside the actual textarea without selecting a completion decision',()=>{
  const {round,finding}=setup();const html=renderToStaticMarkup(<ImplementationEditor round={round} finding={finding} userId="johan"/>);
  expect(html).toMatch(/<textarea[^>]*>I corrected source captions\. Fresh exports remain pending\.<\/textarea>/);
  expect(html).toContain('Saved shared remarks are loaded below');expect(html).not.toContain(' checked');
 });
 it('does not prefill a different author or course-version remark',()=>{
  const {round,finding}=setup();finding.implementationProgress![0].userId='unrelated';
  const html=renderToStaticMarkup(<ImplementationEditor round={round} finding={finding} userId="johan"/>);
  expect(html).not.toContain('I corrected source captions');expect(html).not.toContain('Saved shared remarks');
 });
});
