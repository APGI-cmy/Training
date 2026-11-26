import {beforeEach,describe,it,expect,vi} from 'vitest';
const m=vi.hoisted(()=>({session:vi.fn(),rows:vi.fn(),rpc:vi.fn(),tenant:vi.fn()}));
vi.mock('@/server/auth/session',()=>({requireSession:m.session}));
vi.mock('@/server/services/company-structure',()=>({rows:m.rows,accessibleCompanies:vi.fn(),requireCompany:vi.fn(),listPolicies:vi.fn()}));
vi.mock('@/server/services/messages',()=>({messageRpc:m.rpc}));
vi.mock('@/server/services/tenant-courses',()=>({productionCompanyId:m.tenant,getTenantCourses:vi.fn()}));
vi.mock('@/server/services/course-reviews',()=>({contentSource:vi.fn()}));
vi.mock('@/server/services/email/recipient-brand',()=>({recipientBrand:vi.fn()}));
vi.mock('@/server/services/email/transactional-delivery',()=>({deliverTransactionalEmail:vi.fn(),emailConfiguration:vi.fn()}));
vi.mock('@/server/services/email/send-course-invitation',()=>({brandedEmail:vi.fn()}));
vi.mock('@/server/supabase/admin-rest',()=>({adminRest:vi.fn()}));
import {requireReviewRequest} from '@/server/services/review-requests';
import {redirect} from 'next/navigation';
import ReviewRequestPage from '../app/(learner)/review-requests/[id]/page';
const id='11111111-1111-4111-8111-111111111111',org='22222222-2222-4222-8222-222222222222';
beforeEach(()=>{vi.resetAllMocks();m.session.mockResolvedValue({user:{id:'actor',email:'reviewer@example.com',email_confirmed_at:'verified'}});m.rows.mockResolvedValue([{id,organisation_id:org,reviewer_email:'reviewer@example.com'}]);m.rpc.mockResolvedValue(false);m.tenant.mockReturnValue(null);});
describe('Independent review read boundaries',()=>{
 it('preserves the exact review destination when a signed-out visitor opens an emailed link',async()=>{
  m.session.mockImplementation(async next=>redirect(`/alp-sign-in?next=${encodeURIComponent(next)}`));
  await expect(ReviewRequestPage({params:Promise.resolve({id})})).rejects.toMatchObject({
   digest:expect.stringContaining(`/alp-sign-in?next=${encodeURIComponent('/review-requests/'+id)}`),
  });
  expect(m.rows).not.toHaveBeenCalled();
 });
 it('allows the exact verified assigned reviewer',async()=>expect((await requireReviewRequest(id)).manager).toBe(false));
 it('rejects another signed-in user without company management rights',async()=>{m.session.mockResolvedValue({user:{id:'other',email:'other@example.com',email_confirmed_at:'verified'}});await expect(requireReviewRequest(id)).rejects.toThrow(/unavailable/);});
 it('allows a verified manager only after checking the database role',async()=>{m.session.mockResolvedValue({user:{id:'manager',email:'manager@example.com',email_confirmed_at:'verified'}});m.rpc.mockResolvedValue(true);expect((await requireReviewRequest(id)).manager).toBe(true);expect(m.rpc).toHaveBeenCalledWith('v6_review_manager',{p_actor:'manager',p_org:org});});
 it('blocks a production hostname from reading another company request',async()=>{m.tenant.mockReturnValue('33333333-3333-4333-8333-333333333333');await expect(requireReviewRequest(id)).rejects.toThrow(/unavailable/);expect(m.rpc).not.toHaveBeenCalled();});
 it('rejects an unverified account before reading private request data',async()=>{m.session.mockResolvedValue({user:{id:'actor',email:'reviewer@example.com'}});await expect(requireReviewRequest(id)).rejects.toThrow(/Verified/);expect(m.rows).not.toHaveBeenCalled();});
});
