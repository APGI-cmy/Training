import {describe,it,expect,vi,beforeEach} from "vitest";
const m=vi.hoisted(()=>({write:vi.fn(async()=>[]),rows:vi.fn(async()=>[] as {id:string}[]),rest:vi.fn(async(_path:string,_init?:RequestInit)=>new Response(JSON.stringify([{id:"saved-id"}]),{status:201})),audit:vi.fn(),configure:vi.fn(async()=>({cost_mode:"services"}))}));
vi.mock("@/server/services/platform-principals",()=>({requirePlatformPrincipal:async()=>({session:{user:{id:"11111111-1111-4111-8111-111111111111"}}})}));
vi.mock("@/server/auth/session",()=>({requireSession:vi.fn(),getSupabaseRestUrl:vi.fn()}));
vi.mock("@/server/supabase/admin-rest",()=>({adminRest:m.rest}));
vi.mock("@/server/services/commercial-plan-configuration",()=>({coursePlanConfiguration:m.configure,planningCostConfiguration:vi.fn()}));
vi.mock("@/server/services/company-structure",()=>({requirePolicy:vi.fn(),requireCompany:vi.fn(async()=>({})),rows:m.rows,write:m.write,companyAudit:m.audit}));
vi.mock("@/server/services/email/transactional-delivery",()=>({deliverTransactionalEmail:vi.fn(),emailConfiguration:vi.fn()}));
vi.mock("@/server/services/email/send-course-invitation",()=>({brandedEmail:vi.fn()}));
vi.mock("@/server/environment-isolation",()=>({usesStagingMailCapture:()=>true,STAGING_ORIGIN:"https://training-platform-v2-staging.vercel.app"}));
vi.mock("next/cache",()=>({revalidatePath:vi.fn()}));
import {saveCommercialDraft} from "@/server/actions/platform-policies";
function form(){const f=new FormData();for(const[k,v]of Object.entries({workspace:"course_plan",kind:"course_agreement",title:"QA draft",organisation_id:"22222222-2222-4222-8222-222222222222",course_id:"vpshr-level-0"}))f.set(k,v);return f;}
describe("Explicit course draft submission",()=>{
 beforeEach(()=>{vi.clearAllMocks();m.rows.mockResolvedValue([]);});
 it("does not write a draft from Continue or an implicit submission",async()=>{
  const f=form();expect((await saveCommercialDraft({},f)).error).toContain("explicitly");expect(m.write).not.toHaveBeenCalled();expect(m.configure).not.toHaveBeenCalled();
 });
 it("saves only with the named Save button intent and retains its audit",async()=>{
  const f=form();f.set("intent","save_course_draft");const result=await saveCommercialDraft({},f);expect(result.success).toContain("non-operative");expect(result.link).toMatch(/^\/course-reviews\/new\?plan=/);expect(m.configure).toHaveBeenCalledOnce();expect(m.rest).toHaveBeenCalledOnce();expect(m.audit).toHaveBeenCalledOnce();expect(m.rest.mock.calls[0]?.[0]).toContain("on_conflict=save_key");
 });
 it("resumes an identical saved commercial version without creating a duplicate",async()=>{m.rows.mockResolvedValue([{id:"previous-plan"}]);const f=form();f.set("intent","save_course_draft");const result=await saveCommercialDraft({},f);expect(result.link).toBe("/course-reviews/new?plan=previous-plan");expect(m.rest).not.toHaveBeenCalled();});
});
