import {describe,expect,it,vi} from 'vitest';
const db=vi.hoisted(()=>({rows:vi.fn()}));
vi.mock('@/server/services/company-structure',()=>({rows:db.rows}));
import {partnerRetainer} from '@/server/services/partner-commercial-terms';
import {partnerCourseShares,retainerLabel} from '@/lib/partner-commercial-terms';
import {defaultStructure} from '@/lib/pricing-structures';
import {withCategoryWallet} from '@/lib/category-wallet';
import {TIGER_COURSE_ID} from '@/lib/course-pricing-ownership';

const nks={id:'11111111-1111-4111-8111-111111111111',slug:'nks-capital'};
const mediation={id:'22222222-2222-4222-8222-222222222222',slug:'mediation-zone'};
describe('Partner commercial summary',()=>{
 it('uses the paid-in-advance terms for NKS Tiger only',async()=>{
  db.rows.mockReset().mockResolvedValue([]);
  expect(retainerLabel((await partnerRetainer(nks,TIGER_COURSE_ID))!)).toMatch(/None.*paid in advance/);
  expect(db.rows).not.toHaveBeenCalled();
  expect(await partnerRetainer(mediation,TIGER_COURSE_ID)).toBeUndefined();
 });
 it('shows only a published, accepted recovery fee and its recorded basis',async()=>{
  const version={configuration:{development_status:'recover',currency:'USD',development_cost:'300.00',already_paid:'100.00',recovery_rate:'25',recovery_base:'partner_share'},
   decisions:[{email:'johan.ras@apginc.ca',userId:'first',decision:'approve'},{email:'jorrie.jordaan@apginc.ca',userId:'second',decision:'approve'}]};
  const offering=[{reviewed_release_id:'33333333-3333-4333-8333-333333333333'}];
  db.rows.mockReset().mockResolvedValueOnce(offering).mockResolvedValueOnce([{document:{workflow:{partner:true,partnerCompanyId:nks.id,commercials:[version]}}}]);
  expect(await partnerRetainer(nks,'another-course')).toBeUndefined();
  db.rows.mockResolvedValueOnce(offering).mockResolvedValueOnce([{document:{workflow:{partner:true,partnerCompanyId:nks.id,commercials:[{...version,acceptance:{}}]}}}]);
  expect(retainerLabel((await partnerRetainer(nks,'another-course'))!)).toBe('25% of the partner share until the remaining USD 200.00 is recovered');
 });
 it('reads the 20/80 share from the same owned-course quotes used in the calculator',()=>{
  const cost={id:'cost',sourceDraftId:'source',currency:'USD',source:'Planning',monthlyPoolCents:76035,activeLearners:30,newEnrolments:10,variableCents:0,processorBps:370,processorFixedCents:22,rates:{public:250,industry:750,client:1500},floors:{public:500,industry:2500,client:5000},margins:{public:2500,industry:4000,client:5500}};
  const course={id:'tiger-credits',editionId:'tiger-edition',courseId:TIGER_COURSE_ID,title:'Tiger Kidnapping',ownerId:nks.id,ownerIsApgi:false,scope:'client' as const,currency:'USD',hours:3.5,minimumCents:0,evidence:'3.5 hours'};
  const proposal=withCategoryWallet(defaultStructure(cost,[course],{id:nks.id,isApgi:false}),[course]);
  expect(partnerCourseShares(proposal)).toMatchObject([{apgi:20,partner:80}]);
 });
});
