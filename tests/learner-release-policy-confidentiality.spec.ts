import { beforeEach, describe, it, expect, vi } from "vitest";
const m=vi.hoisted(()=>({session:vi.fn(),roles:vi.fn(),rest:vi.fn(),principal:false,admin:false,owner:false,assigned:false,revoked:false}));
vi.mock("@/server/auth/session",()=>({requireSession:m.session,getCurrentSession:m.session,getUserRoles:m.roles}));
vi.mock("@/server/supabase/admin-rest",()=>({adminRest:m.rest}));
vi.mock("next/headers",()=>({cookies:async()=>({get:()=>undefined})}));
import { listPolicies, requirePolicy } from "@/server/services/company-structure";
import { requirePlatformPrincipal } from "@/server/services/platform-principals";
import { GET as downloadPolicy } from "../app/api/policies/[id]/route";
const internal="11111111-1111-4111-8111-111111111111";
const company="22222222-2222-4222-8222-222222222222";
const org="33333333-3333-4333-8333-333333333333";
const user={id:"44444444-4444-4444-8444-444444444444",email:"staff@example.invalid",email_confirmed_at:"2026-10-16"};
beforeEach(()=>{
 vi.resetAllMocks();m.principal=false;m.admin=false;m.owner=false;m.assigned=false;m.revoked=false;
 m.session.mockResolvedValue({user,accessToken:"fixture"});
 m.roles.mockImplementation(async()=>m.admin?["admin"]:[]);
 m.rest.mockImplementation(async(path:string)=>{
  if(path.includes("rpc/v2_is_platform_principal"))return Response.json(m.principal);
  if(path.includes("organisation_memberships"))return Response.json(path.includes("is_active=eq.false")?(m.revoked?[{organisation_id:org}]:[]):m.owner?[{organisation_id:org,membership_role:"owner"}]:[]);
  if(path.includes("policy_reviewers"))return Response.json(m.assigned?[{policy_id:internal}]:[]);
  if(path.includes(`id=eq.${internal}`))return Response.json(path.includes("select=*")?[{id:internal,title:"Private partnership",visibility:"internal"}]:[{organisation_id:null,visibility:"internal"}]);
  if(path.includes(`id=eq.${company}`))return Response.json(path.includes("select=*")?[{id:company,title:"Company agreement",visibility:"company"}]:[{organisation_id:org,visibility:"company"}]);
  return Response.json([]);
 });
});
describe("Internal policy confidentiality",()=>{
 it("denies another global administrator before fetching internal content",async()=>{
  m.admin=true;
  await expect(requirePolicy(internal)).rejects.toThrow("access");
  expect(m.rest.mock.calls.some(([p])=>p.includes("select=*"))).toBe(false);
 });
 it.each(["learner","company owner","assigned reviewer","revoked owner"])("denies an internal direct URL for %s",async(role)=>{
  m.owner=role==="company owner";m.assigned=role==="assigned reviewer";m.revoked=role==="revoked owner";
  await expect(requirePolicy(internal)).rejects.toThrow("access");
  expect(m.rest.mock.calls.some(([p])=>p.includes("select=*"))).toBe(false);
 });
 it("allows the bound verified principal and fetches the internal document only after verification",async()=>{
  m.admin=true;m.principal=true;
  expect((await requirePolicy(internal)).policy.title).toBe("Private partnership");
  const calls=m.rest.mock.calls.map(([p])=>p);
  expect(calls.indexOf("/rest/v1/rpc/v2_is_platform_principal")).toBeLessThan(calls.findIndex(p=>p.includes("select=*")));
 });
 it("restricts a non-principal administrator's register query to company agreements",async()=>{
  m.admin=true;await listPolicies();
  expect(m.rest.mock.calls.find(([p])=>p.includes("platform_policy_versions"))?.[0]).toContain("visibility=eq.company");
 });
 it("denies commercial access to an ordinary admin even with a verified account",async()=>{
  m.admin=true;await expect(requirePlatformPrincipal()).rejects.toThrow("restricted");
 });
 it("fails closed when principal verification is unavailable",async()=>{
  m.admin=true;m.rest.mockImplementation(async(p)=>p.includes("rpc/")?new Response(null,{status:503}):Response.json([{organisation_id:null,visibility:"internal"}]));
  await expect(requirePolicy(internal)).rejects.toThrow("could not be verified");
 });
 it("does not trust a principal email or user-editable metadata without database binding",async()=>{
  m.admin=true;m.session.mockResolvedValue({accessToken:"fixture",user:{...user,email:"johan.ras@apginc.ca",user_metadata:{is_principal:true}}});
  await expect(requirePolicy(internal)).rejects.toThrow("access");
 });
 it("never touches policy data for an anonymous request",async()=>{
  m.session.mockRejectedValue(new Error("SIGN_IN"));
  await expect(requirePolicy(internal)).rejects.toThrow("SIGN_IN");expect(m.rest).not.toHaveBeenCalled();
 });
 it("returns 404 from the private PDF route for another global administrator",async()=>{
  m.admin=true;
  const response=await downloadPolicy(new Request("https://example.invalid/api/policies/"+internal),{params:Promise.resolve({id:internal})});
  expect(response.status).toBe(404);
  expect(m.rest.mock.calls.some(([p])=>p.includes("select=*"))).toBe(false);
 });
 it("returns 401 from the PDF route when signed out",async()=>{
  m.session.mockResolvedValue(null);
  const response=await downloadPolicy(new Request("https://example.invalid/api/policies/"+internal),{params:Promise.resolve({id:internal})});
  expect(response.status).toBe(401);expect(m.rest).not.toHaveBeenCalled();
 });
});
describe("Company agreements remain scoped",()=>{
 it("allows a company owner to read their own agreement",async()=>{
  m.owner=true;expect((await requirePolicy(company)).policy.title).toBe("Company agreement");
 });
 it("denies a revoked owner even if their email remains assigned for review",async()=>{
  m.revoked=true;m.assigned=true;await expect(requirePolicy(company)).rejects.toThrow("access");
 });
 it("permits a general APGI admin to read company agreements without internal principal powers",async()=>{
  m.admin=true;expect((await requirePolicy(company)).policy.title).toBe("Company agreement");
 });
});
