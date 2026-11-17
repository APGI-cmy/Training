import {beforeEach,afterEach,describe,it,expect,vi} from "vitest";
const m=vi.hoisted(()=>({status:vi.fn(),rows:vi.fn(),write:vi.fn(),settle:vi.fn(),calculator:vi.fn(),batch:vi.fn()}));
vi.mock("@/server/services/stripe-platform",()=>({setupStatus:m.status}));
vi.mock("@/server/services/company-structure",()=>({rows:m.rows,write:m.write}));
vi.mock("@/server/services/stripe-settlement",()=>({settleStripeOrder:m.settle}));
vi.mock('@/server/services/course-calculator',()=>({reconcileCalculatorOrder:m.calculator}));
vi.mock('@/server/services/pricing-structures',()=>({reconcilePricingBatch:m.batch}));
import {GET} from "../app/api/cron/stripe-settlements/route";
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv("CRON_SECRET","sandbox-job-secret");});
afterEach(()=>vi.unstubAllEnvs());
describe("Automatic sandbox settlement retry",()=>{
 it('reconciles combined payments once at the batch rather than charging each line its full fee',async()=>{m.status.mockResolvedValue({configured:true});m.rows.mockImplementation(async(path:string)=>path.includes('cc_purchase_batches')?[{id:'batch'}]:[]);const response=await GET(new Request('https://example.test',{headers:{authorization:'Bearer sandbox-job-secret'}}));expect(await response.json()).toMatchObject({pricingBatchesChecked:1});expect(m.batch).toHaveBeenCalledWith({id:'batch'});expect(m.calculator).not.toHaveBeenCalled();});
 it("rejects unauthorised requests before reading the ledger",async()=>{expect((await GET(new Request("https://example.test"))).status).toBe(401);expect(m.rows).not.toHaveBeenCalled();});
 it("does no Stripe work while waiting for Jorrie's connection",async()=>{m.status.mockResolvedValue({configured:false});expect(await(await GET(new Request("https://example.test",{headers:{authorization:"Bearer sandbox-job-secret"}}))).json()).toEqual({checked:0,waitingForOwner:true});expect(m.settle).not.toHaveBeenCalled();});
 it("keeps failures in the ledger and continues with other eligible orders",async()=>{m.status.mockResolvedValue({configured:true});m.rows.mockImplementation(async(path:string)=>path.includes('cc_')?[]:[{id:"one"},{id:"two"}]);m.settle.mockImplementation(async(id:string)=>{if(id==="one")throw Error("Onboarding required");});m.write.mockResolvedValue([]);const result=await GET(new Request("https://example.test",{headers:{authorization:"Bearer sandbox-job-secret"}}));expect(await result.json()).toEqual({checked:2,held:1,calculatorChecked:0,pricingBatchesChecked:0});expect(m.rows.mock.calls[0][0]).toContain("checked_at.asc.nullsfirst");expect(m.write.mock.calls[0][1]).toEqual({hold_reason:"Onboarding required"});});
 it('also retries actual-fee evidence on funded calculator orders',async()=>{m.status.mockResolvedValue({configured:true});m.rows.mockImplementation(async(path:string)=>path.includes('cc_orders')?[{id:'calculator'}]:[]);m.calculator.mockResolvedValue(undefined);const response=await GET(new Request('https://example.test',{headers:{authorization:'Bearer sandbox-job-secret'}}));expect(await response.json()).toEqual({checked:0,held:0,calculatorChecked:1,pricingBatchesChecked:0});expect(m.calculator).toHaveBeenCalledWith({id:'calculator'});});
});
