import {describe,it,expect,vi,beforeEach} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import type {ReviewRound} from '@/lib/course-review';
const m=vi.hoisted(()=>({rows:vi.fn(),session:vi.fn(),principal:vi.fn(),sync:vi.fn()}));
vi.mock('@/server/services/company-structure',()=>({rows:m.rows,write:vi.fn()}));
vi.mock('@/server/auth/session',()=>({getCurrentSession:m.session,getSupabaseRestUrl:()=>null}));
vi.mock('@/server/services/platform-principals',()=>({isPlatformPrincipal:m.principal}));
vi.mock('@/server/services/course-deployments',()=>({ensureReviewDeployment:m.sync,synchronizeCourseDeployments:vi.fn()}));
vi.mock('next/navigation',()=>({redirect:(url:string)=>{throw Error(`REDIRECT:${url}`);}}));
vi.mock('@/lib/courses',()=>({getCourses:()=>[],getCourseBySlug:vi.fn()}));
vi.mock('@/server/services/course-publication-status',()=>({getPublishedCourseIds:async()=>new Set()}));
import {requireReview,requireReviewRecord} from '@/server/services/course-reviews';
import {ArchivedReview} from '@/components/reviews/ArchivedReview';
import ReviewsPage from '../app/(learner)/course-reviews/page';
const id='11111111-1111-4111-8111-111111111111';
// Reproduces the old cancelled fixture: coverage is absent, not an empty array.
const round={id,status:'cancelled',revision:1,course_id:'removed-course',document:{title:'Temporary account-recovery QA',brand:{name:'NKS Capital'},participants:[{email:'johan@example.com',state:'active'}],findings:[],reports:[],events:[{actor:'johan@example.com',action:'cancelled',at:'2026-11-12T12:14:24Z',detail:'Private internal detail'}],cutoff:'2026-11-12T12:14:24Z',workflow:{stage:'apgi_approval'}}} as unknown as ReviewRound;
beforeEach(()=>{vi.clearAllMocks();m.rows.mockResolvedValue([round]);m.session.mockResolvedValue({user:{id:'user',email:'johan@example.com',email_confirmed_at:'yes'}});m.principal.mockResolvedValue(true);});
describe('Cancelled review history',()=>{
 it('redirects the old workflow URL before loading assets or running deployment reconciliation',async()=>{await expect(requireReview(id,{archiveCancelled:true})).rejects.toThrow(`REDIRECT:/course-reviews/${id}/archive`);expect(m.rows).toHaveBeenCalledTimes(1);expect(m.sync).not.toHaveBeenCalled();});
 it('retains the exact original document without synthesising missing coverage',async()=>{const before=JSON.stringify(round);const record=await requireReviewRecord(id);expect(record.round).toBe(round);expect(JSON.stringify(round)).toBe(before);});
 it('keeps archived evidence limited to the assigned team and platform principals',async()=>{m.principal.mockResolvedValue(false);m.session.mockResolvedValue({user:{email:'outsider@example.com',email_confirmed_at:'yes'}});await expect(requireReviewRecord(id)).rejects.toThrow('assigned team');});
 it('allows an assigned non-principal to read retained evidence',async()=>{m.principal.mockResolvedValue(false);expect((await requireReviewRecord(id)).round.id).toBe(id);});
 it('renders old missing-coverage records safely with no editable controls',()=>{const html=renderToStaticMarkup(<ArchivedReview round={round} principal={true}/>);expect(html).toContain('Cancelled review');expect(html).toContain('Coverage not recorded');expect(html).toContain('Private internal detail');expect(html).not.toContain('<form');expect(html).not.toContain('Publish reviewed release');});
 it('does not disclose private event details to an ordinary reviewer',()=>{expect(renderToStaticMarkup(<ArchivedReview round={round} principal={false}/>)).not.toContain('Private internal detail');});
 it('labels a cancelled card as history instead of asking users to continue it',async()=>{const html=renderToStaticMarkup(await ReviewsPage());expect(html).toContain(`href="/course-reviews/${id}/archive"`);expect(html).toContain('View archived review');expect(html).not.toContain('Continue workflow');});
});
