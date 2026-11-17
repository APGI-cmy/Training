import {beforeEach,describe,it,expect,vi} from 'vitest';
const m=vi.hoisted(()=>({session:vi.fn(),access:vi.fn(),shop:vi.fn(),rows:vi.fn(),missing:vi.fn()}));
vi.mock('@/server/auth/session',()=>({requireSession:m.session}));
vi.mock('next/navigation',()=>({notFound:m.missing}));
vi.mock('@/server/services/course-calculator',()=>({calculatorAccess:m.access,calculatorCourses:vi.fn(),calculatorPolicy:vi.fn(),calculatorRpc:vi.fn()}));
vi.mock('@/server/services/pricing-structures',()=>({shopAccess:m.shop,shareableCost:vi.fn(),cartQuotes:vi.fn()}));
vi.mock('@/server/services/company-structure',()=>({rows:m.rows}));
vi.mock('@/components/payments/PricingWorkflow',()=>({PricingWorkflow:()=>null}));
vi.mock('@/components/payments/CourseShop',()=>({CourseShop:()=>null}));
vi.mock('@/components/admin/StructureForm',()=>({StructureForm:()=>null}));
vi.mock('@/server/actions/course-calculator',()=>({calculatorDecision:vi.fn(),activateCalculatorPolicy:vi.fn()}));
vi.mock('@/server/actions/pricing-structures',()=>({pricingStructureDecision:vi.fn(),publishPricingStructure:vi.fn(),checkoutPricingCart:vi.fn(),removePricingQuote:vi.fn()}));
import Workflow from '../app/(learner)/course-calculator/page';
import Shop from '../app/(learner)/course-shop/page';
import Cart from '../app/(learner)/course-cart/page';
const redirect=Error('NEXT_REDIRECT;replace;/alp-sign-in;307;');
beforeEach(()=>{vi.resetAllMocks();m.session.mockRejectedValue(redirect);m.access.mockRejectedValue(redirect);m.shop.mockRejectedValue(redirect);m.rows.mockResolvedValue([{id:'20000000-0000-4000-8000-000000000001'}]);m.missing.mockImplementation(()=>{throw Error('NOT_FOUND');});});
describe('Pricing entry-point authentication',()=>{
 for(const [name,Page]of [['workflow',Workflow],['shop',Shop],['cart',Cart]] as const){it(`${name} preserves the sign-in redirect before company discovery or data access`,async()=>{await expect(Page({searchParams:Promise.resolve({})})).rejects.toBe(redirect);expect(m.missing).not.toHaveBeenCalled();expect(m.rows).not.toHaveBeenCalled();expect(m.access).not.toHaveBeenCalled();expect(m.shop).not.toHaveBeenCalled();});}
});
