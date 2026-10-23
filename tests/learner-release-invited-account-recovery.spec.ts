import {afterEach,beforeEach,describe,it,expect,vi} from "vitest";
const m=vi.hoisted(()=>({rest:vi.fn(),deliver:vi.fn()}));
vi.mock("@/server/supabase/admin-rest",()=>({adminRest:m.rest}));
vi.mock("@/server/services/invitations/deliver-stored-invitation",()=>({deliverStoredInvitation:m.deliver}));
import {recoverInvitedAccount} from "@/server/services/invitations/recover-invited-account";
const email="invited@example.invalid",id="11111111-1111-4111-8111-111111111111";
const row={id,recipient_email:email,invited_role:"admin",course_id:null,organisation_id:"org",expires_at:"2099-01-01",status:"sent",revoked_at:null,redeemed_at:null,token_hash:"old-hash"};
beforeEach(()=>{
 vi.resetAllMocks();vi.stubEnv("ALP_ENVIRONMENT","test");m.deliver.mockResolvedValue({ok:true,deliveryStatus:"sent"});
 m.rest.mockImplementation(async(p:string,init?:RequestInit)=>Response.json(p.startsWith("/rest/v1/organisations?")?[{id:"org"}]:p.startsWith("/rest/v1/course_invitation_events?")?[]:init?.method==="PATCH"?[{id}]:p.startsWith("/rest/v1/course_invitations?")?[row]:null));
});
afterEach(()=>vi.unstubAllEnvs());
describe("Unfinished invitation account recovery",()=>{
 it("uses only the existing invitation's recipient, role, company, course and expiry",async()=>{
  await recoverInvitedAccount(email);
  expect(m.deliver).toHaveBeenCalledWith(expect.objectContaining({id,recipientEmail:email,role:"admin",expiresAt:row.expires_at,actorId:null}));
  const claim=m.rest.mock.calls.find(([,i])=>i?.method==="PATCH")!;
  expect(claim[0]).toContain("token_hash=eq.old-hash");expect(claim[0]).toContain("expires_at=gt.");
  expect(Object.keys(JSON.parse(claim[1].body)).sort()).toEqual(["status","token_hash"]);
  expect(JSON.parse(claim[1].body).token_hash).toMatch(/^[a-f0-9]{64}$/);
  expect(m.rest.mock.calls.some(([p])=>p.includes("user_roles")||p.includes("/auth/"))).toBe(false);
  const audit=m.rest.mock.calls.find(([p,i])=>p==="/rest/v1/course_invitation_events"&&i?.method==="POST")!;
  expect(JSON.parse(audit[1].body)).toMatchObject({actor_id:null,metadata:{account_setup_recovery_requested:true}});
 });
 it.each([{recipient_email:"other@example.invalid"},{status:"revoked"},{revoked_at:"today"},{redeemed_at:"today"},{expires_at:"2020-01-01"},{invited_role:"superadmin"}])("does not revive or redirect an ineligible invitation %j",async changed=>{
  m.rest.mockResolvedValue(Response.json([{...row,...changed}]));await recoverInvitedAccount(email);
  expect(m.deliver).not.toHaveBeenCalled();expect(m.rest.mock.calls.some(([,i])=>i?.method==="PATCH")).toBe(false);
 });
 it("does nothing for an address with no active invitation",async()=>{m.rest.mockResolvedValue(Response.json([]));await expect(recoverInvitedAccount(email)).resolves.toBeUndefined();expect(m.deliver).not.toHaveBeenCalled();});
 it("does not send for an inactive company",async()=>{m.rest.mockImplementation(async(p:string)=>Response.json(p.includes("organisations?")?[]:[row]));await recoverInvitedAccount(email);expect(m.deliver).not.toHaveBeenCalled();});
 it("honours a successful email sent in the last minute",async()=>{m.rest.mockImplementation(async(p:string)=>Response.json(p.includes("organisations?")?[{id:"org"}]:p.includes("course_invitation_events?")?[{id:"recent"}]:[row]));await recoverInvitedAccount(email);expect(m.deliver).not.toHaveBeenCalled();});
 it("does not send a stale link when a concurrent request wins",async()=>{m.rest.mockImplementation(async(p:string,i?:RequestInit)=>Response.json(i?.method==="PATCH"?[]:p.includes("organisations?")?[{id:"org"}]:p.includes("course_invitation_events?")?[]:[row]));await recoverInvitedAccount(email);expect(m.deliver).not.toHaveBeenCalled();});
 it("fails closed on lookup or delivery errors",async()=>{m.rest.mockResolvedValue(new Response(null,{status:500}));await expect(recoverInvitedAccount(email)).rejects.toThrow();expect(m.deliver).not.toHaveBeenCalled();});
 it("surfaces provider rejection",async()=>{m.deliver.mockResolvedValue({ok:false,error:"EMAIL_FAILED"});await expect(recoverInvitedAccount(email)).rejects.toThrow("DELIVERY_FAILED");});
});
