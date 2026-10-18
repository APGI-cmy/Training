import {beforeEach,describe,expect,it,vi} from "vitest";
const m=vi.hoisted(()=>({rest:vi.fn(),rows:vi.fn(),write:vi.fn(async(_path:string,_body:unknown,_method?:string)=>[]),deliver:vi.fn()}));
vi.mock("@/server/supabase/admin-rest",()=>({adminRest:m.rest}));
vi.mock("@/server/services/company-structure",()=>({rows:m.rows,write:m.write}));
vi.mock("@/server/auth/session",()=>({getCurrentSession:vi.fn(),getSupabaseRestUrl:(p:string)=>`https://eaaqgtdpvbxdgjxphjie.supabase.co${p}`}));
vi.mock("@/server/services/platform-principals",()=>({isPlatformPrincipal:vi.fn()}));
vi.mock("@/server/services/email/transactional-delivery",()=>({deliverTransactionalEmail:m.deliver}));
import {processReviewMail} from "@/server/services/course-reviews";
const round=()=>({id:"round",course_id:"vpshr-level-0",status:"open",document:{title:"Course <script>",brand:{name:"Brand & Company",color:"#102b47",logo:null},requester:"requester@example.com",cutoff:"2099-01-01T00:00:00Z",participants:[{email:"reviewer@example.com",state:"active",role:"primary"}],reports:[],findings:[]}});
const mail=(kind="reminder")=>({id:"mail",round_id:"round",notification_key:`round:${kind}:reviewer`,recipient:"reviewer@example.com",kind,subject:"Review reminder",body:"Please review"});
describe("Durable course-review email delivery",()=>{
 beforeEach(()=>{vi.clearAllMocks();m.rest.mockResolvedValue(new Response(JSON.stringify([mail()]),{status:200}));m.rows.mockResolvedValue([round()]);m.deliver.mockResolvedValue({ok:true,providerMessageId:"provider-id"});});
 it("records provider acceptance and a stable idempotency key",async()=>{expect(await processReviewMail()).toEqual({processed:1,sent:1});expect(m.write).toHaveBeenCalledWith("/rest/v1/course_review_mail?id=eq.mail",{state:"sent",provider_id:"provider-id",last_error:null},"PATCH");expect(m.deliver.mock.calls[0][0].idempotencyKey).toMatch(/^[a-f0-9]{64}$/);expect(m.deliver.mock.calls[0][0].html).toContain("Brand &amp; Company");expect(m.deliver.mock.calls[0][0].html).not.toContain("<script>");});
 it.each(["finished","declined"])("skips a queued reminder if the reviewer is now %s",async state=>{const r=round();r.document.participants[0].state=state;m.rows.mockResolvedValue([r]);await processReviewMail();expect(m.deliver).not.toHaveBeenCalled();expect(m.write.mock.calls[0][1]).toMatchObject({state:"skipped"});});
 it("skips queued reminders after cutoff or cancellation",async()=>{const r=round();r.document.cutoff="2000-01-01T00:00:00Z";m.rows.mockResolvedValue([r]);await processReviewMail();expect(m.deliver).not.toHaveBeenCalled();});
 it("still shares a submitted report with a reviewer who has finished their own report",async()=>{m.rest.mockResolvedValue(new Response(JSON.stringify([mail("report_submitted")]),{status:200}));const r=round();r.document.participants[0].state="finished";m.rows.mockResolvedValue([r]);await processReviewMail();expect(m.deliver).toHaveBeenCalledOnce();});
 it("retains failed email for controlled retry rather than marking sent",async()=>{m.deliver.mockResolvedValue({ok:false,error:"EMAIL_DELIVERY_FAILED"});expect((await processReviewMail()).sent).toBe(0);expect(m.write.mock.calls[0][1]).toEqual({state:"failed",last_error:"EMAIL_DELIVERY_FAILED"});});
 it("does not send anything when the durable queue cannot be claimed",async()=>{m.rest.mockResolvedValue(new Response("unavailable",{status:503}));await expect(processReviewMail()).rejects.toThrow(/queue/);expect(m.deliver).not.toHaveBeenCalled();});
});
