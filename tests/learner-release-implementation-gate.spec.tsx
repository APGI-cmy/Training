import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it,vi} from 'vitest';
import {notificationRound} from './fixtures/review-notification';
import type {ReviewFinding} from '@/lib/course-review';
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn(),refresh:vi.fn()})}));
vi.mock('@/server/actions/course-reviews',()=>({courseReviewAction:vi.fn(),createCourseReview:vi.fn()}));
vi.mock('@/server/actions/publication-workflow',()=>({publicationWorkflowAction:vi.fn()}));
import {LUImplementationAction} from '@/components/reviews/LUImplementationAction';

const finding:ReviewFinding={id:'finding',unit:'lu1',reference:'Slide 1',category:'Content',blocking:false,author:'jorrie.jordaan@apginc.ca',userId:'jorrie',at:'2026-10-26',text:'Animation and voice stop',status:'open',replies:[],outcome:'issue'};
function render({fresh=false,email='johan.ras@apginc.ca',userId='johan',needed=true,expired=false}={}){
 const round=notificationRound();round.document.findings=[structuredClone(finding)];if(expired)round.document.cutoff='2020-01-01';
 const before=JSON.stringify(round);
 const html=renderToStaticMarkup(<LUImplementationAction round={round} finding={round.document.findings[0]} email={email} userId={userId} fresh={fresh} needed={needed} onRegister={()=>{}}/>);
 expect(JSON.stringify(round)).toBe(before);return html;
}
describe('Implementation response availability',()=>{
 it('explains the registration blocker beside an open finding and links to the exact registration section',()=>{
  const html=render();expect(html).toContain('new course package has not been registered');expect(html).toContain('Your finding is still saved');
  expect(html).toContain('href="/course-reviews/11111111-1111-4111-8111-111111111111#changes-implemented"');
  expect(html).toContain('does not submit that response');expect(html).not.toContain('<form');
 });
 it('restores the numbered implementation form after registration',()=>{
  const html=render({fresh:true});expect(html).toContain('Submit implementation (1)');expect(html).toContain('name="finding_id" value="finding"');expect(html).not.toContain('has not been registered');
 });
 it('does not offer designer controls to another reviewer',()=>{expect(render({fresh:true,email:'jorrie.jordaan@apginc.ca',userId:'jorrie'})).toBe('');expect(render({email:'jorrie.jordaan@apginc.ca',userId:'jorrie'})).toBe('');});
 it('does not expose another response before one is needed',()=>expect(render({needed:false})).toBe(''));
 it('explains an expired review without allowing a submission',()=>{const html=render({fresh:true,expired:true});expect(html).toContain('closed or overdue');expect(html).not.toContain('<form');});
});
