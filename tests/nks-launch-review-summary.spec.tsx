import {describe,it,expect,vi,beforeEach} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {notificationRound} from './fixtures/review-notification';
import type {ReviewRound} from '@/lib/course-review';
import {summarizeReviewWorkflows,type ReviewOffering} from '@/lib/review-workflow-summary';
import {ReviewWorkflowCard} from '@/components/course/ReviewWorkflowCard';

const company='ebe89fb6-23fa-4fb1-9bfb-c525795fa3c7',course='tiger-kidnapping-telecommunications';
function fixture(){
 const current={...notificationRound(),id:'current',organisation_id:company,course_id:course,status:'open' as const,created_at:'2026-11-18T07:00:00Z'};
 current.document.title='Tiger Kidnapping in Telecommunications';current.document.brand.name='NKS Capital';
 const release=(id:string,at:string):ReviewRound=>({...structuredClone(current),id,status:'published',created_at:at,document:{...structuredClone(current.document),sourceReviewId:current.id}});
 const first=release('release-1','2026-11-18T08:00:00Z'),latest=release('release-2','2026-11-18T09:00:00Z');
 const offering:ReviewOffering={organisation_id:company,course_id:course,status:'published',reviewed_release_id:latest.id};
 return {current,first,latest,offering,rounds:[latest,first,current]};
}
describe('One course workflow with retained publication evidence',()=>{
 it('combines two release snapshots and their open review without changing records',()=>{const f=fixture(),before=JSON.stringify(f.rounds);const summaries=summarizeReviewWorkflows(f.rounds,[f.offering]);expect(summaries).toHaveLength(1);expect(summaries[0]).toMatchObject({current:{id:'current'},publishedRelease:{id:'release-2'},published:true,reviewContinuing:true});expect(summaries[0].history.map(r=>r.id)).toEqual(['release-1']);expect(JSON.stringify(f.rounds)).toBe(before);});
 it('renders one combined badge and routes the main action to the editable review',()=>{const f=fixture(),summary=summarizeReviewWorkflows(f.rounds,[f.offering])[0],html=renderToStaticMarkup(<ReviewWorkflowCard summary={summary}/>);expect(html.match(/<article/g)).toHaveLength(1);expect(html.match(/<h2/g)).toHaveLength(1);expect(html).toContain('Published — review continuing');expect(html).toContain('href="/course-reviews/current"');expect(html).toContain('Continue review');expect(html).toContain('href="/course-reviews/release-2"');expect(html).toContain('<details>');expect(html).toContain('href="/course-reviews/release-1"');expect(html).not.toContain('Current step:');});
 it('uses the actual published offering rather than guessing from the newest snapshot',()=>{const f=fixture();f.offering.reviewed_release_id=f.first.id;expect(summarizeReviewWorkflows(f.rounds,[f.offering])[0].publishedRelease?.id).toBe(f.first.id);});
 it('does not call a withdrawn offering published just because snapshots exist',()=>{const f=fixture();expect(summarizeReviewWorkflows(f.rounds,[{...f.offering,status:'draft'}])[0].published).toBe(false);});
 it('does not fabricate current publication when the publication lookup fails',()=>{const f=fixture(),s=summarizeReviewWorkflows(f.rounds,null)[0];expect(s.published).toBeNull();expect(renderToStaticMarkup(<ReviewWorkflowCard summary={s}/>)).toContain('Publication status unavailable');});
 it('keeps company workflows separate even when their course and title match',()=>{const f=fixture(),other={...structuredClone(f.current),id:'other',organisation_id:'other-company'};expect(summarizeReviewWorkflows([...f.rounds,other],[f.offering])).toHaveLength(2);});
 it('never creates an action link to a source review the viewer cannot see',()=>{const f=fixture(),s=summarizeReviewWorkflows([f.latest],[f.offering])[0];expect(s.current.id).toBe(f.latest.id);expect(s.reviewContinuing).toBe(false);expect(renderToStaticMarkup(<ReviewWorkflowCard summary={s}/>)).not.toContain('/course-reviews/current');});
 it('respects explicit clear-mode exceptions without showing an unfinished retained review',()=>{const f=fixture();f.current.document.reviewOverrides=(['content','commercials','branding'] as const).map(scope=>({id:scope,scope,mode:'clear',fingerprint:f.current.fingerprint,brandRevision:f.current.document.brand.revision,commercialVersion:f.current.document.workflow?.commercials.at(-1)?.id??null,reason:'Explicit owner exception',actorId:'owner',email:'owner@example.test',at:'2026-11-18T09:00:00Z'}));expect(summarizeReviewWorkflows(f.rounds,[f.offering])[0].reviewContinuing).toBe(false);});
});

const m=vi.hoisted(()=>({rows:vi.fn(),session:vi.fn(),courses:vi.fn(),company:vi.fn(),published:vi.fn(),shares:vi.fn()}));
vi.mock('@/server/services/company-structure',()=>({rows:m.rows}));
vi.mock('@/server/services/course-reviews',()=>({reviewSession:m.session}));
vi.mock('@/server/services/tenant-courses',()=>({getTenantCourses:m.courses,productionCompanyId:m.company}));
vi.mock('@/server/services/course-publication-status',()=>({getPublishedCourseIds:m.published}));
vi.mock('@/server/services/course-distribution',()=>({receivedPublishedShares:m.shares}));
import ReviewsPage from '../app/(learner)/course-reviews/page';
beforeEach(()=>{vi.clearAllMocks();const f=fixture();m.session.mockResolvedValue({email:'owner@example.test',principal:true});m.company.mockReturnValue(company);m.courses.mockResolvedValue([{id:course,slug:course,title:f.current.document.title}]);m.published.mockResolvedValue(new Set([course]));m.shares.mockResolvedValue([]);m.rows.mockImplementation((p:string)=>Promise.resolve(p.includes('course_review_rounds')?f.rounds:[f.offering]));});
it('shows one course card without offering a duplicate new workflow on the index',async()=>{const html=renderToStaticMarkup(await ReviewsPage());expect(html.match(/<article/g)).toHaveLength(1);expect(html).not.toContain('Start publication workflow');expect(html).toContain('Published — review continuing');expect(m.rows.mock.calls[0][0]).toContain('organisation_id=eq.'+company);});
it('retains reviewer membership filtering for non-principal accounts',async()=>{m.session.mockResolvedValue({email:'reviewer@example.test',principal:false});await ReviewsPage();expect(m.rows.mock.calls[0][0]).toContain('document->participants=cs.');expect(m.published).not.toHaveBeenCalled();});

function setUpSharedReview({ownerVisible=true, distinct=false}={}){
 const courseId='vpshr-level-0';
 const owner='apgi';
 const currentRelease={
  ...notificationRound(),
  id:'release-live',course_id:courseId,organisation_id:owner,status:'published' as const,
 };
 currentRelease.document.title='VPSHR Level 0';
 currentRelease.document.brand.name='APGI';
 const archived={...currentRelease,id:'review-archived',status:'cancelled' as const};
 const offering={organisation_id:owner,course_id:courseId,status:'published',reviewed_release_id:currentRelease.id};
 const companies=[{id:'mediation',name:'Mediation Zone'},{id:'nks',name:'NKS Capital'}];
 m.company.mockReturnValue(null);
 m.courses.mockResolvedValue([{id:courseId,slug:courseId,title:'VPSHR Level 0'}]);
 m.published.mockResolvedValue(new Set([courseId]));
 m.shares.mockResolvedValue(companies.map(({id},index)=>({
  id:`distribution-${id}`,
  course_id:courseId,
  owner_organisation_id:owner,
  recipient_organisation_id:id,
  source_release_id:distinct&&index>0?'release-previous':currentRelease.id,
 })));
 m.rows.mockImplementation(async (path:string)=>{
  if(path.includes('course_review_rounds'))return ownerVisible?[currentRelease,archived]:[];
  if(path.includes('/organisations?'))return companies;
  return [offering];
 });
}

it('shows one VPSHR publication for the owner and both partner shares, with archive history',async()=>{
 setUpSharedReview();
 const html=renderToStaticMarkup(await ReviewsPage());
 expect(html.match(/<h2>VPSHR Level 0<\/h2>/g)).toHaveLength(1);
 expect(html.match(/<article/g)).toHaveLength(1);
 expect(html).toContain('href="/course-reviews/release-live"');
 expect(html).toContain('href="/course-reviews/review-archived/archive"');
 expect(html).toContain('Shared with');
 expect(html).toContain('href="/course-sharing?company=mediation#share-distribution-mediation"');
 expect(html).toContain('href="/course-sharing?company=nks#share-distribution-nks"');
});

it('shows one shared release when the viewer has no visible owner workflow',async()=>{
 setUpSharedReview({ownerVisible:false});
 const html=renderToStaticMarkup(await ReviewsPage());
 expect(html.match(/<h2>VPSHR Level 0<\/h2>/g)).toHaveLength(1);
 expect(html).toContain('Mediation Zone');
 expect(html).toContain('NKS Capital');
 expect(html).not.toContain('/course-reviews/release-live');
});

it('keeps shares of a different release separate',async()=>{
 setUpSharedReview({distinct:true});
 const html=renderToStaticMarkup(await ReviewsPage());
 expect(html.match(/<h2>VPSHR Level 0<\/h2>/g)).toHaveLength(2);
 expect(html.split('</article>')[0]).toContain('Mediation Zone');
 expect(html.split('</article>')[1]).toContain('NKS Capital');
});
