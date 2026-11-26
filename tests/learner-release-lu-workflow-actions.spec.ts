import {beforeEach,describe,it,expect,vi} from 'vitest';
import {notificationRound} from './fixtures/review-notification';
import type {ReviewFinding} from '@/lib/course-review';
import {cleanReviewRound} from './fixtures/clean-review';
import {reviewNotificationTasks} from '@/lib/review-notification-tasks';
const mocks=vi.hoisted(()=>({access:vi.fn(),commit:vi.fn(),process:vi.fn(),event:vi.fn(),sync:vi.fn()}));
vi.mock('next/cache',()=>({revalidatePath:vi.fn()}));
vi.mock('@/server/services/course-reviews',()=>({requireReview:mocks.access,claimReviewer:(r:ReturnType<typeof fixture>['round'],email:string,userId:string)=>{const p=r.document.participants.find(p=>p.email===email);if(!p||p.state==='declined'||p.userId&&p.userId!==userId)throw Error('Reviewer account mismatch');p.userId=userId;return p;},assertReviewWork:(_r:unknown,fresh:boolean)=>{if(!fresh)throw Error('Changed deployment must be registered');},commitReview:mocks.commit,processReviewMail:mocks.process,reviewEvent:mocks.event,reviewMail:()=>[]}));
vi.mock('@/server/services/review-message-sync',()=>({syncReviewMessages:mocks.sync}));
import {luReviewAction} from '@/server/actions/lu-review-workflow';
function fixture(){const round=notificationRound();round.document.reviewProcessVersion=3;const f:ReviewFinding={id:'finding-one',unit:'lu1',at:'2026-10-27T12:00:00Z',reference:'Slide 4',category:'Content',author:'jorrie.jordaan@apginc.ca',userId:'jorrie',text:'Please correct captions',status:'open',blocking:true,replies:[]};round.document.findings=[f];return {round,email:'johan.ras@apginc.ca',session:{user:{id:'johan'}},fresh:true,source:{fingerprint:round.fingerprint,brand:{brand_revision:1}}};}
function form(op='implementation_submit'){const f=new FormData();Object.entries({round_id:'11111111-1111-4111-8111-111111111111',operation:op,finding_id:'finding-one',finding_at:'2026-10-27T12:00:00Z',response_id:'',implemented:'yes',comment:'Added captions to the full clip'}).forEach(([k,v])=>f.set(k,v));return f;}
beforeEach(()=>{vi.clearAllMocks();mocks.commit.mockResolvedValue(undefined);mocks.process.mockResolvedValue({sent:0});mocks.access.mockResolvedValue(fixture());});
describe('LU workflow server authorization and persistence',()=>{
 it('retires the completed finding action and advances only its linked notification',async()=>{
  const a=fixture(),related='finding-finding-one',sibling='finding-finding-two';
  a.round.document.findings.push({...a.round.document.findings[0],id:'finding-two'});
  mocks.access.mockResolvedValue(a);
  const original={round:a.round,hash:a.round.fingerprint,brandRevision:1};
  const anchors=(source:typeof original,email:string,userId:string)=>reviewNotificationTasks(source,email,userId,false).map(t=>t.anchor);
  expect(anchors(original,a.email,a.session.user.id)).toEqual(expect.arrayContaining([related,sibling]));
  expect((await luReviewAction({},form())).error).toBeUndefined();
  expect(mocks.commit.mock.invocationCallOrder[0]).toBeLessThan(mocks.sync.mock.invocationCallOrder[0]);
  const implementation=mocks.sync.mock.calls.at(-1)![1] as typeof original;
  expect(anchors(implementation,a.email,a.session.user.id)).toContain(sibling);
  expect(anchors(implementation,a.email,a.session.user.id)).not.toContain(related);
  a.email='jorrie.jordaan@apginc.ca';a.session.user.id='jorrie';
  expect(anchors(implementation,a.email,a.session.user.id)).toContain(related);
  const endorsement=form('finding_endorsement');
  endorsement.set('response_id',a.round.document.findings[0].implementationRounds![0].id);
  endorsement.set('decision','yes');
  expect((await luReviewAction({},endorsement)).error).toBeUndefined();
  expect(anchors(mocks.sync.mock.calls.at(-1)![1],a.email,a.session.user.id)).not.toContain(related);
 });
 it('rejects an obsolete endorsement form after unanimous no-findings completion without writing a fake decision',async()=>{const a=fixture();a.round=cleanReviewRound();a.email='jorrie.jordaan@apginc.ca';a.session.user.id='jorrie';mocks.access.mockResolvedValue(a);const f=form('finding_endorsement'),record=a.round.document.findings[0];f.set('finding_id',record.id);f.set('finding_at',record.at);f.set('decision','yes');const before=JSON.stringify(a.round);expect((await luReviewAction({},f)).error).toMatch(/No endorsement is required/);expect(mocks.commit).not.toHaveBeenCalled();expect(JSON.stringify(a.round)).toBe(before);});
 it('binds a newly joined peer before accepting their first endorsement',async()=>{const a=fixture();mocks.access.mockResolvedValue(a);await luReviewAction({},form());const r=a.round.document.findings[0].implementationRounds![0];a.email='reviewer@example.com';a.session.user.id='reviewer';delete a.round.document.participants.find(p=>p.email===a.email)!.userId;const f=form('finding_endorsement');f.set('response_id',r.id);f.set('decision','yes');expect((await luReviewAction({},f)).error).toBeUndefined();expect(a.round.document.participants.find(p=>p.email===a.email)?.userId).toBe('reviewer');expect(a.round.document.findings[0].status).toBe('closed');});
 it('commits one numbered response and preserves reports, coverage and finding IDs',async()=>{const a=fixture(),before=JSON.stringify({reports:a.round.document.reports,coverage:a.round.document.participants.map(p=>p.coverage)});mocks.access.mockResolvedValue(a);const result=await luReviewAction({},form());expect(result.error).toBeUndefined();expect(result.href).toContain('#finding-finding-one');expect(a.round.document.findings[0].implementationRounds).toHaveLength(1);expect(a.round.document.findings[0].id).toBe('finding-one');expect(JSON.stringify({reports:a.round.document.reports,coverage:a.round.document.participants.map(p=>p.coverage)})).toBe(before);expect(mocks.commit).toHaveBeenCalledOnce();});
 it('rejects stale versions before commit',async()=>{const f=form();f.set('finding_at','old');expect((await luReviewAction({},f)).error).toMatch(/changed/);expect(mocks.commit).not.toHaveBeenCalled();});
 it('does not let another principal or reviewer implement the assigned designer’s corrections',async()=>{const a=fixture();a.email='jorrie.jordaan@apginc.ca';a.session.user.id='jorrie';mocks.access.mockResolvedValue(a);expect((await luReviewAction({},form())).error).toMatch(/assigned course designer/);expect(mocks.commit).not.toHaveBeenCalled();});
 it('rejects an unregistered deployment before any mutation',async()=>{const a=fixture();a.fresh=false;mocks.access.mockResolvedValue(a);expect((await luReviewAction({},form())).error).toMatch(/registered/);expect(mocks.commit).not.toHaveBeenCalled();});
 it('requires rejection and a new submit for a second response',async()=>{const a=fixture();mocks.access.mockResolvedValue(a);await luReviewAction({},form());const r=a.round.document.findings[0].implementationRounds![0];const f=form();f.set('response_id',r.id);expect((await luReviewAction({},f)).error).toMatch(/Wait for a No endorsement/);expect(a.round.document.findings[0].implementationRounds).toHaveLength(1);expect(mocks.commit).toHaveBeenCalledOnce();});
 it('rejects stale clients using the obsolete separate acceptance endpoint',async()=>{const a=fixture();mocks.access.mockResolvedValue(a);await luReviewAction({},form());const f=form('implementation_decision');f.set('response_id',a.round.document.findings[0].implementationRounds![0].id);f.set('decision','accept');expect((await luReviewAction({},f)).error).toMatch(/replaced by Endorsements/);expect(mocks.commit).toHaveBeenCalledOnce();});
});
