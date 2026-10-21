import {beforeEach,describe,it,expect,vi} from "vitest";
const m=vi.hoisted(()=>({access:vi.fn(),rows:vi.fn(),write:vi.fn(),stripe:vi.fn(),audit:vi.fn()}));
vi.mock("@/server/services/payment-reports",()=>({paymentPortalAccess:m.access}));
vi.mock("@/server/services/company-structure",()=>({rows:m.rows,write:m.write}));
vi.mock("@/server/services/stripe-platform",()=>({stripeRequest:m.stripe,paymentAudit:m.audit}));
vi.mock("next/cache",()=>({revalidatePath:vi.fn()}));
import {personalStripeAction} from "@/server/actions/personal-payments";
beforeEach(()=>{vi.clearAllMocks();m.access.mockResolvedValue({session:{user:{id:"my-user",email:"me@example.com"}}});m.rows.mockResolvedValue([]);m.write.mockResolvedValue([]);});
describe("Personal receiving-account privacy",()=>{
 it("denies a learner before reading or creating any account",async()=>{m.access.mockRejectedValue(Error("Portal unavailable"));expect((await personalStripeAction({},new FormData())).error).toBe("Portal unavailable");expect(m.rows).not.toHaveBeenCalled();expect(m.stripe).not.toHaveBeenCalled();});
 it("ignores a forged user ID and never saves submitted bank numbers",async()=>{const form=new FormData();form.set("user_id","another-user");form.set("country","ZA");form.set("payment_purpose","on");form.set("bank_number","do-not-store-this");expect((await personalStripeAction({},form)).success).toContain("alternative");expect(m.rows.mock.calls[0][0]).toContain("user_id=eq.my-user");expect(m.write.mock.calls[0][1]).toMatchObject({user_id:"my-user",country:"ZA",state:"alternative_required"});expect(JSON.stringify(m.write.mock.calls)).not.toContain("do-not-store-this");expect(m.stripe).not.toHaveBeenCalled();});
 it("creates a receiving account only for the verified signed-in user and links it through Stripe",async()=>{m.stripe.mockResolvedValueOnce({id:"acct_mine",country:"CA"}).mockResolvedValueOnce({url:"https://connect.stripe.com/setup/test"});const form=new FormData();form.set("user_id","another-user");form.set("country","CA");form.set("payment_purpose","on");const result=await personalStripeAction({},form);expect(result.url).toContain("connect.stripe.com");expect(m.stripe.mock.calls[0][2]).toMatchObject({email:"me@example.com","metadata[apgi_recipient]":"my-user"});expect(m.stripe.mock.calls[1][2].account).toBe("acct_mine");});
 it("requires the payment-purpose acknowledgement",async()=>{const form=new FormData();form.set("country","CA");expect((await personalStripeAction({},form)).error).toContain("payment purposes only");expect(m.stripe).not.toHaveBeenCalled();});
});
