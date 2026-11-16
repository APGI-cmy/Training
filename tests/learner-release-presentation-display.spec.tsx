import React from 'react';
import {describe,it,expect,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
vi.mock('next/navigation',()=>({useRouter:()=>({refresh:vi.fn(),push:vi.fn()})}));
vi.mock('@/server/actions/course-reviews',()=>({courseReviewAction:vi.fn(),createCourseReview:vi.fn()}));
vi.mock('@/server/actions/publication-workflow',()=>({publicationWorkflowAction:vi.fn()}));
import {PresentationViewport} from '@/components/course/PresentationViewport';
import {ScormPlayer} from '@/components/course/ScormPlayer';
import {ReviewPanel} from '@/components/reviews/ReviewPanel';

describe('Presentation display controls',()=>{
 it('keeps the review player and feedback inside the same fullscreen target',()=>{
  const html=renderToStaticMarkup(<PresentationViewport title="Unit 1"><ScormPlayer courseSlug="tiger-kidnapping-telecommunications" unitSlug="lu1" title="Unit 1" launchSrc="/unit/index.html" mode="preview"/><ReviewPanel id="review" unit="lu1" canEdit email="reviewer@example.invalid" hasEbook={false}/></PresentationViewport>);
  expect(html).toContain('aria-label="Unit 1 presentation display"');expect(html).toContain('aria-label="Presentation display controls"');
  expect(html).toContain('Enlarge presentation');expect(html).toContain('Full screen');expect(html).toContain('aria-expanded="false"');
  expect(html).toContain('Unit 1 SCORM learning activity');expect(html).toContain('Review feedback');expect(html).toContain('Save review feedback');
  expect(html.indexOf('Course feedback')).toBeGreaterThan(html.indexOf('presentation-display-content'));
 });
 it('uses the same display controls around a published learner presentation',()=>{
  const html=renderToStaticMarkup(<PresentationViewport title="Unit 2"><iframe title="Published unit" src="/unit/index.html" allow="fullscreen" allowFullScreen/></PresentationViewport>);
  expect(html).toContain('Enlarge presentation');expect(html).toContain('Full screen');expect(html).toContain('allowFullScreen=""');expect(html).toContain('src="/unit/index.html"');
 });
});
