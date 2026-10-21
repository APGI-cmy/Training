import {beforeEach,describe,it,expect,vi} from "vitest";
const m=vi.hoisted(()=>({principal:vi.fn(),rest:vi.fn(),rows:vi.fn(),write:vi.fn()}));
vi.mock("@/server/services/platform-principals",()=>({requirePlatformPrincipal:m.principal}));
vi.mock("@/server/supabase/admin-rest",()=>({adminRest:m.rest}));
vi.mock("@/server/services/company-structure",()=>({rows:m.rows,write:m.write}));
vi.mock("@/server/environment-isolation",()=>({assertStagingIsolation:vi.fn(),STAGING_ORIGIN:"https://training-platform-v2-staging.vercel.app"}));
import {requireStripeOwner} from "@/server/services/stripe-platform";
beforeEach(()=>vi.clearAllMocks());
describe("Jorrie-only application access",()=>{
 it("denies Johan before reading the vault",async()=>{m.principal.mockResolvedValue({session:{user:{id:"johan",email:"johan.ras@apginc.ca"}}});await expect(requireStripeOwner()).rejects.toThrow("Only Jorrie");expect(m.rest).not.toHaveBeenCalled();expect(m.rows).not.toHaveBeenCalled();});
 it("allows Jorrie only after principal verification",async()=>{const actor={session:{user:{id:"jorrie",email:"jorrie.jordaan@apginc.ca"}}};m.principal.mockResolvedValue(actor);expect(await requireStripeOwner()).toBe(actor);});
 it("does not allow an unverified or unbound account with the right mailbox",async()=>{m.principal.mockRejectedValue(Error("Principal verification required"));await expect(requireStripeOwner()).rejects.toThrow("verification");expect(m.rows).not.toHaveBeenCalled();});
});
