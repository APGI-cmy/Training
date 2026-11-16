import {beforeEach,describe,it,expect,vi} from "vitest";
import {notificationRound,noticeRoundId} from "./fixtures/review-notification";
const m=vi.hoisted(()=>({rest:vi.fn(),rows:vi.fn(),principal:vi.fn(),source:vi.fn()}));
vi.mock("@/server/supabase/admin-rest",()=>({adminRest:m.rest}));
vi.mock("@/server/services/company-structure",()=>({rows:m.rows}));
vi.mock("@/server/services/platform-principals",()=>({isPlatformPrincipal:m.principal}));
vi.mock("@/server/services/course-reviews",()=>({contentSource:m.source,reviewSource:m.source}));
import {notificationInbox,notificationTargets,notificationDestination} from "@/server/services/notifications";
const session={user:{id:"jorrie",email:"jorrie.jordaan@apginc.ca",email_confirmed_at:"today"},accessToken:"test-only",refreshToken:"test-only"} as unknown as import("@/server/auth/session").AlpSession;
beforeEach(()=>{
 vi.clearAllMocks();m.principal.mockResolvedValue(true);m.source.mockResolvedValue({fingerprint:"hash",brand:{brand_revision:1}});
 m.rows.mockImplementation(async(path:string)=>path.includes("organisations")?[{id:"company"}]:[notificationRound()]);
 m.rest.mockImplementation(async()=>new Response(JSON.stringify({unread:1,responses:2,attention:2,total:2,items:[],receipts:[]})));
});
describe("Verified notification task projection",()=>{
 it("computes separate, version-bound requests from the actual saved workflow",async()=>{
  await notificationInbox(session,"all",0,true);const [path,request]=m.rest.mock.calls.find(([path])=>path.includes("v3_notification_inbox"))!;
  expect(path).toContain("v3_notification_inbox");const body=JSON.parse(request.body);expect(body.p_user).toBe("jorrie");expect(body.p_tasks.some((t:{anchor:string})=>t.anchor==="commercial-signoff-jorrie")).toBe(true);expect(body.p_revisions).toEqual([{id:noticeRoundId,revision:4}]);
 });
 it("scopes ordinary reviewers' source queries to their own invitation email",async()=>{
  m.principal.mockResolvedValue(false);const reviewer={...session,user:{...session.user,id:"reviewer",email:"reviewer@example.com"}};
  await notificationInbox(reviewer,"all",0,true);const query=m.rows.mock.calls.find(([path])=>path.includes("course_review_rounds"))?.[0];expect(query).toContain("document->participants=cs.");expect(decodeURIComponent(query)).toContain('"email":"reviewer@example.com"');
 });
 it("does not sync tasks when principal verification or source loading fails",async()=>{m.principal.mockRejectedValue(Error("Access check unavailable"));await expect(notificationInbox(session,"all",0,true)).rejects.toThrow();expect(m.rest).not.toHaveBeenCalled();});
 it("retrieves one selected reference with the signed-in account, not a supplied recipient",async()=>{
  m.rest.mockImplementation(async(path:string)=>new Response(JSON.stringify(path.includes("v3_notification_one")?{id:"selected",message:"Update",kind:"platform_event",target_path:"/notifications",response_type:"read",pending:false,created_at:"today",read_at:null,acknowledged_at:null,actor_user_id:null}:{unread:0,responses:0,attention:0,items:[],receipts:[]})));
  await notificationDestination(session,"selected");expect(JSON.parse(m.rest.mock.calls.find(([path])=>path.includes("v3_notification_one"))![1].body)).toEqual({p_user:"jorrie",p_id:"selected"});
 });
 it("does not request markers for an unsafe path",async()=>{expect(await notificationTargets(session,"//evil.example",null)).toEqual([]);expect(m.rest).not.toHaveBeenCalled();});
});
