import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect,vi} from 'vitest';
import {notificationRound} from './fixtures/review-notification';
const capture=vi.hoisted(()=>({snapshot:null as unknown}));
vi.mock('next/link',()=>({default:({href,children}:{href:string;children:React.ReactNode})=><a href={href}>{children}</a>}));
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn(),refresh:vi.fn()})}));
vi.mock('@/server/actions/course-reviews',()=>({courseReviewAction:vi.fn(),createCourseReview:vi.fn()}));
vi.mock('@/server/actions/publication-workflow',()=>({publicationWorkflowAction:vi.fn()}));
vi.mock('@/components/reviews/LUReviewWorkspace',()=>({LUReviewWorkspace:({round}:{round:unknown})=>{capture.snapshot=round;return <div>ONE-LU-WORKSPACE</div>;}}));
import {ReviewProcess} from '@/components/reviews/ReviewProcess';
import {reviewNotificationTasks} from '@/lib/review-notification-tasks';
import {submitImplementation,endorseFinding} from '@/lib/lu-review-workflow';
describe('Per-LU review view and notifications',()=>{
 it('renders the new single entry point, omits duplicate reports and does not send private commercials to the client',()=>{const r=notificationRound();r.document.reviewProcessVersion=3;r.document.terms.text='PRIVATE TERMS';r.document.workflow!.commercials[0].configuration.notes='PRIVATE COSTS';const before=JSON.stringify(r);const html=renderToStaticMarkup(<ReviewProcess round={r} email={r.document.requester} userId='johan' requester fresh/>);expect(html).toContain('ONE-LU-WORKSPACE');expect(html).not.toContain('Commit my peer decision');expect(html).not.toContain('Report and independent check');expect(JSON.stringify(capture.snapshot)).not.toContain('PRIVATE TERMS');expect(JSON.stringify(capture.snapshot)).not.toContain('PRIVATE COSTS');expect(JSON.stringify(r)).toBe(before);});
 it('targets the exact numbered finding decision and removes obsolete whole-report tasks',()=>{const r=notificationRound();r.document.reviewProcessVersion=3;const f={id:'one',unit:'lu1',reference:'Slide 4',category:'Content',blocking:true,author:'jorrie.jordaan@apginc.ca',userId:'jorrie',at:'now',text:'Please fix this',status:'open' as const,replies:[]};r.document.findings=[f];submitImplementation(r,f,{email:r.document.requester,userId:'johan'},{id:'response-1',at:'now',implemented:'yes',notes:'Corrected the complete clip'});const tasks=reviewNotificationTasks({round:r,hash:r.fingerprint,brandRevision:1},f.author,f.userId,false);expect(tasks.some(t=>t.anchor==='finding-one'&&t.requirement.includes('Implementation notes (1)'))).toBe(true);expect(tasks.some(t=>/Submit your full|check a submitted report/.test(t.title))).toBe(false);expect(tasks.find(t=>t.anchor==='finding-one')?.requirement).toContain('Endorsements');expect(tasks.find(t=>t.anchor==='finding-one')?.actorUserId).toBe('johan');expect(tasks.some(t=>t.key.includes(':lu-decision:'))).toBe(false);endorseFinding(r,f,{email:f.author,userId:f.userId},{at:'now',decision:'yes',reason:''});expect(reviewNotificationTasks({round:r,hash:r.fingerprint,brandRevision:1},f.author,f.userId,false).some(t=>t.anchor==='finding-one')).toBe(false);});
});
