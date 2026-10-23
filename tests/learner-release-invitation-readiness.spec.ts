import {beforeEach,describe,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({rpc:vi.fn(),rest:vi.fn()}));
vi.mock('@/server/services/messages',()=>({messageRpc:m.rpc}));
vi.mock('@/server/supabase/admin-rest',()=>({adminRest:m.rest}));
import {reviewInvitationEmail,assertReviewInvitationReady} from '@/server/services/email/review-invitation-readiness';
import {emailStarters} from '@/lib/email-sets';
const org='11111111-1111-4111-8111-111111111111',course='tiger-kidnapping-telecommunications';
const candidate=(state='draft',course_id=course)=>({id:'template',name:'My review invitation',state,revision:3,rule:{course_id},updated_at:'2026-10-23T00:00:00Z'});
beforeEach(()=>{vi.clearAllMocks();m.rpc.mockResolvedValue(null);m.rest.mockImplementation(async()=>new Response('[]'));});
describe('Review invitation readiness',()=>{
 it('blocks a saved draft rather than substituting the standard message',async()=>{m.rest.mockImplementation(async()=>new Response(JSON.stringify([candidate()])));await expect(assertReviewInvitationReady(org,course)).rejects.toThrow('standard email will not be substituted');expect((await reviewInvitationEmail(org,course)).state).toMatchObject({status:'blocked',id:'template',revision:3});});
 it.each(['paused','active'])('blocks a %s design when it is not currently eligible for delivery',async state=>{m.rest.mockImplementation(async()=>new Response(JSON.stringify([candidate(state)])));await expect(assertReviewInvitationReady(org,course)).rejects.toThrow('not enabled');});
 it('uses the actual approved design returned by the company-scoped resolver',async()=>{const design=emailStarters.at(-1)!.design;m.rpc.mockResolvedValue(design);m.rest.mockImplementation(async()=>new Response(JSON.stringify([candidate('active')])));expect(await assertReviewInvitationReady(org,course)).toMatchObject({state:{status:'ready'},design});expect(m.rpc).toHaveBeenCalledWith('v2_email_review_design',{p_org:org,p_course:course});expect(m.rest.mock.calls[0][0]).toContain(`set.organisation_id=eq.${org}`);});
 it('allows the standard invitation only when no matching company design exists',async()=>{m.rest.mockImplementation(async()=>new Response(JSON.stringify([candidate('draft','another-course')])));expect((await assertReviewInvitationReady(org,course)).state.status).toBe('standard');});
 it('blocks a general company draft too and favours a course-specific draft in the editor link',async()=>{m.rest.mockImplementation(async()=>new Response(JSON.stringify([{...candidate('draft',''),id:'general'},candidate()])));expect((await reviewInvitationEmail(org,course)).state.id).toBe('template');});
 it('fails closed if template metadata cannot be checked',async()=>{m.rest.mockResolvedValue(new Response('{}',{status:503}));await expect(assertReviewInvitationReady(org,course)).rejects.toThrow('could not be checked');});
});
