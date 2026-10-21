import {beforeEach,describe,it,expect,vi} from "vitest";
const m=vi.hoisted(()=>({owner:vi.fn(),principal:vi.fn(),company:vi.fn(),memberships:vi.fn(),stripe:vi.fn(),vault:vi.fn(),link:vi.fn(),audit:vi.fn(),rows:vi.fn(),write:vi.fn(),rest:vi.fn(),deliver:vi.fn()}));
vi.mock("@/server/services/platform-principals",()=>({requirePlatformPrincipal:m.principal,isPlatformPrincipal:vi.fn()}));
vi.mock("@/server/services/stripe-platform",()=>({requireStripeOwner:m.owner,stripeVault:m.vault,stripeRequest:m.stripe,partnerOnboardingLink:m.link,paymentAudit:m.audit}));
vi.mock("@/server/services/company-structure",()=>({requireCompany:m.company,ownMemberships:m.memberships,rows:m.rows,write:m.write}));
vi.mock("@/server/supabase/admin-rest",()=>({adminRest:m.rest}));
vi.mock("@/server/services/email/transactional-delivery",()=>({deliverTransactionalEmail:m.deliver}));
vi.mock("next/cache",()=>({revalidatePath:vi.fn()}));
import {savePrivateStripe,partnerStripeAction,requestStripeSetup} from "@/server/actions/stripe-payments";
const id="11111111-1111-4111-8111-111111111111";
beforeEach(()=>{vi.clearAllMocks();m.rows.mockResolvedValue([]);m.write.mockResolvedValue([]);});
describe("Private Stripe action boundaries",()=>{
 it("refuses a forged direct private-save call by Johan without reading or writing credentials",async()=>{m.owner.mockRejectedValue(Error("Only Jorrie"));const f=new FormData();f.set("key","rk_live_stolen");expect((await savePrivateStripe({},f)).error).toBe("Only Jorrie");expect(m.rows).not.toHaveBeenCalled();expect(m.stripe).not.toHaveBeenCalled();expect(m.rest).not.toHaveBeenCalled();});
 it("does not let a platform administrator onboard a different company owner's bank account",async()=>{m.company.mockResolvedValue({session:{user:{id:"johan"}},company:{slug:"partner"},isAdmin:true});m.memberships.mockResolvedValue([]);const f=new FormData();f.set("company",id);expect((await partnerStripeAction({},f)).error).toContain("assigned owner");expect(m.stripe).not.toHaveBeenCalled();expect(m.rows).not.toHaveBeenCalled();});
 it("requires the payment-purpose acknowledgement before onboarding",async()=>{m.company.mockResolvedValue({session:{user:{id:"owner"}},company:{slug:"partner"}});m.memberships.mockResolvedValue([{organisation_id:id}]);const f=new FormData();f.set("company",id);expect((await partnerStripeAction({},f)).error).toContain("payment purposes only");expect(m.stripe).not.toHaveBeenCalled();});
 it("stores an unsupported destination on hold without calling Stripe or collecting bank details",async()=>{m.company.mockResolvedValue({session:{user:{id:"owner"}},company:{slug:"partner"}});m.memberships.mockResolvedValue([{organisation_id:id}]);const f=new FormData();f.set("company",id);f.set("country","ZA");f.set("payment_purpose","on");f.set("account_number","must-be-ignored");expect((await partnerStripeAction({},f)).success).toContain("alternative");expect(m.stripe).not.toHaveBeenCalled();expect(m.write.mock.calls[0][1]).toMatchObject({state:"alternative_required",country:"ZA",account_id:null});expect(JSON.stringify(m.write.mock.calls)).not.toContain("must-be-ignored");});
 it("does not resend a setup email already accepted by the provider",async()=>{vi.stubEnv("ALP_STRIPE_SETUP_KEY",Buffer.alloc(32,1).toString("base64"));m.principal.mockResolvedValue({session:{user:{id:"johan"}}});m.rest.mockResolvedValue(new Response(JSON.stringify({id,mail_state:"accepted"})));const state=await requestStripeSetup({},new FormData());expect(state.success).toContain("already");expect(m.deliver).not.toHaveBeenCalled();vi.unstubAllEnvs();});
});
