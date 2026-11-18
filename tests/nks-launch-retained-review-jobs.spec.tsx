import {describe,it,expect,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import type {ReactNode} from 'react';
vi.mock('@/components/reviews/ReviewForms',()=>({ReviewForm:({children,label,disabled}:{children:ReactNode;label:string;disabled?:boolean})=><form>{children}<button disabled={disabled}>{label}</button></form>}));
import {notificationRound} from './fixtures/review-notification';
import {cleanReviewRound} from './fixtures/clean-review';
import {contentReviewBlockers,finalContentReviewBlockers} from '@/lib/course-review';
import {reviewNotificationTasks} from '@/lib/review-notification-tasks';
import {publicationGuide,findWorkflowStep} from '@/lib/publication-guide';
import {FinalContentClearance} from '@/components/reviews/FinalContentClearance';
import {ReviewGuidance} from '@/components/reviews/ReviewGuidance';
function released(clean=false){
 const r=clean?cleanReviewRound():notificationRound(),version=r.document.workflow!.commercials.at(-1)!.id;
 r.document.reviewOverrides=(['content','commercials','branding'] as const).map(scope=>({id:scope,scope,mode:'retain',fingerprint:r.fingerprint,brandRevision:1,commercialVersion:version,reason:'Urgent client training with all reviews retained.',actorId:'johan',email:r.document.requester,at:'2026-11-18T09:43:29Z'}));
 r.document.trainingReleases=[{id:'released',at:'2026-11-18T09:48:56Z',fingerprint:r.fingerprint,brandRevision:1,commercialVersion:version}];return r;
}
const tasks=(r:ReturnType<typeof released>,brandRevision=1)=>reviewNotificationTasks({round:r,hash:r.fingerprint,brandRevision},r.document.requester,'johan',true);
describe('Published training with genuine reviews retained',()=>{
 it('retires the completed publication, premature clearance and historical commercial jobs without changing evidence',()=>{
  const r=released(),before=JSON.stringify(r),t=tasks(r);
  expect(t.some(x=>/:(publication|clearance|signoff):/.test(x.key))).toBe(false);
  expect(t.some(x=>x.key.includes(':branding:'))).toBe(true);
  expect(r.document.workflow!.contentApproval).toBeUndefined();expect(r.document.workflow!.commercials[0].decisions).toEqual([]);expect(JSON.stringify(r)).toBe(before);
 });
 it('distinguishes a permitted release from completed review prerequisites',()=>{const r=released();expect(contentReviewBlockers(r,r.fingerprint)).toEqual([]);expect(finalContentReviewBlockers(r,r.fingerprint).length).toBeGreaterThan(0);});
 it('shows publication green while leaving final clearance incomplete',()=>{
  const r=released(),steps=publicationGuide(r,r.fingerprint,1,r.document.requester);
  expect(findWorkflowStep(steps,'release')?.done).toBe(true);expect(findWorkflowStep(steps,'clearance')?.done).toBe(false);
  const html=renderToStaticMarkup(<ReviewGuidance round={r} email={r.document.requester} userId="johan" steps={steps} tasks={tasks(r)}/>);
  expect(html).toContain('Course publication completed.');expect(html).not.toContain('Perform final course publication');expect(html).not.toContain('Record your independent APGI commercial sign-off');
 });
 it('provides a useful clearance destination and directs unfinished work to retained reviews',()=>{
  const r=released(),html=renderToStaticMarkup(<FinalContentClearance round={r} principal email={r.document.requester} hash={r.fingerprint}/>);
  expect(html).toContain('Final content clearance is not ready');expect(html).toContain(`href="/course-reviews/${r.id}#review-process"`);expect(html).toContain('<button disabled="">Approve final corrected content');expect(html).not.toContain('<h2>Content release exception');
 });
 it('makes genuine final clearance available after the retained reviews actually finish',()=>{
  const r=released(true);expect(finalContentReviewBlockers(r,r.fingerprint)).toEqual([]);expect(tasks(r).some(t=>t.anchor==='final-content-clearance')).toBe(true);
  const html=renderToStaticMarkup(<FinalContentClearance round={r} principal email={r.document.requester} hash={r.fingerprint}/>);expect(html).toContain('All prerequisite content checks are complete');expect(html).toContain('<button>Approve final corrected content');
 });
 it('does not invent clearance after a clear-mode exception',()=>{const r=released(true);r.document.reviewOverrides![0].mode='clear';expect(tasks(r).some(t=>t.anchor==='final-content-clearance')).toBe(false);});
 it('keeps ordinary reviewers away from the principal clearance control',()=>{const r=released();const html=renderToStaticMarkup(<FinalContentClearance round={r} principal={false} email="reviewer@example.com" hash={r.fingerprint}/>);expect(html).not.toContain('<form');expect(html).toContain('Final content clearance status');});
 it('does not treat a new branding version as already published',()=>{const r=released();r.document.reviewOverrides!.find(o=>o.scope==='branding')!.brandRevision=2;expect(tasks(r,2).some(t=>t.key.includes(':publication:'))).toBe(true);});
 it('retains retirement of old commercial jobs across a later brand revision',()=>{const r=released();expect(tasks(r,2).some(t=>t.key.includes(':signoff:'))).toBe(false);});
 it('does not suppress decisions for a genuinely new commercial version',()=>{const r=released();r.document.workflow!.commercials.push({...r.document.workflow!.commercials[0],id:'new-version',decisions:[]});expect(tasks(r).some(t=>t.key.includes(':signoff:new-version'))).toBe(true);});
});
