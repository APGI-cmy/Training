import {beforeEach,afterEach,describe,it,expect,vi} from "vitest";
const m=vi.hoisted(()=>({status:vi.fn(),rows:vi.fn(),write:vi.fn(),settle:vi.fn()}));
vi.mock("@/server/services/stripe-platform",()=>({setupStatus:m.status}));
vi.mock("@/server/services/company-structure",()=>({rows:m.rows,write:m.write}));
vi.mock("@/server/services/stripe-settlement",()=>({settleStripeOrder:m.settle}));
import {GET} from "../app/api/cron/stripe-settlements/route";
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv("CRON_SECRET","sandbox-job-secret");});
afterEach(()=>vi.unstubAllEnvs());
describe("Automatic sandbox settlement retry",()=>{
 it("rejects unauthorised requests before reading the ledger",async()=>{expect((await GET(new Request("https://example.test"))).status).toBe(401);expect(m.rows).not.toHaveBeenCalled();});
 it("does no Stripe work while waiting for Jorrie's connection",async()=>{m.status.mockResolvedValue({configured:false});expect(await(await GET(new Request("https://example.test",{headers:{authorization:"Bearer sandbox-job-secret"}}))).json()).toEqual({checked:0,waitingForOwner:true});expect(m.settle).not.toHaveBeenCalled();});
 it("keeps failures in the ledger and continues with other eligible orders",async()=>{m.status.mockResolvedValue({configured:true});m.rows.mockResolvedValue([{id:"one"},{id:"two"}]);m.settle.mockImplementation(async(id:string)=>{if(id==="one")throw Error("Onboarding required");});m.write.mockResolvedValue([]);const result=await GET(new Request("https://example.test",{headers:{authorization:"Bearer sandbox-job-secret"}}));expect(await result.json()).toEqual({checked:2,held:1});expect(m.rows.mock.calls[0][0]).toContain("checked_at.asc.nullsfirst");expect(m.write.mock.calls[0][1]).toEqual({hold_reason:"Onboarding required"});});
});
