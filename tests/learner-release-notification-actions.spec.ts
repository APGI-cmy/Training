import {beforeEach,describe,it,expect,vi} from "vitest";
const m=vi.hoisted(()=>({session:vi.fn(),rest:vi.fn(),destination:vi.fn(),redirect:vi.fn((href:string)=>{throw Object.assign(Error(href),{digest:"NEXT_REDIRECT"});}),revalidate:vi.fn()}));
vi.mock("@/server/services/notifications",()=>({notificationSession:m.session,notificationDestination:m.destination}));
vi.mock("@/server/supabase/admin-rest",()=>({adminRest:m.rest}));
vi.mock("next/cache",()=>({revalidatePath:m.revalidate}));
vi.mock("next/navigation",()=>({redirect:m.redirect}));
import {notificationAction} from "@/server/actions/notifications";
const actor="11111111-1111-4111-8111-111111111111",id="22222222-2222-4222-8222-222222222222";
const form=(op="read")=>{const f=new FormData();f.set("id",id);f.set("operation",op);f.set("user_id","forged-other-user");return f;};
beforeEach(()=>{vi.clearAllMocks();m.destination.mockResolvedValue(undefined);m.session.mockResolvedValue({user:{id:actor,email_confirmed_at:"today"}});m.rest.mockResolvedValue(new Response(JSON.stringify("/notifications")));});
describe("Notification receipt access and workflow separation",()=>{
 it("binds a read receipt to the signed-in account, ignoring submitted identity",async()=>{expect((await notificationAction({},form())).success).toContain("Marked as read");expect(JSON.parse(m.rest.mock.calls[0][1].body)).toEqual({p_user:actor,p_id:id,p_mode:"read"});});
 it("records acknowledgement as a receipt, without writing review or commercial data",async()=>{expect((await notificationAction({},form("acknowledge"))).success).toContain("No approval");expect(m.rest.mock.calls[0][0]).toBe("/rest/v1/rpc/v2_notification_receipt");expect(JSON.parse(m.rest.mock.calls[0][1].body).p_mode).toBe("acknowledge");expect(m.rest).toHaveBeenCalledOnce();});
 it("marks only this account's unread rows, leaving acknowledgements unchanged",async()=>{await notificationAction({},form("all_read"));expect(m.rest.mock.calls[0][0]).toContain(`recipient_user_id=eq.${actor}&read_at=is.null`);expect(Object.keys(JSON.parse(m.rest.mock.calls[0][1].body))).toEqual(["read_at"]);});
 it("rejects a missing or other account's notice denied by the scoped RPC",async()=>{m.rest.mockResolvedValue(new Response("denied",{status:403}));expect((await notificationAction({},form())).error).toContain("unavailable");expect(m.redirect).not.toHaveBeenCalled();});
 it("does not write if authentication fails",async()=>{m.session.mockRejectedValue(Error("Sign in required"));expect((await notificationAction({},form())).error).toContain("Sign in");expect(m.rest).not.toHaveBeenCalled();});
 it.each(["approve","accept","publish","delete"])("does not allow a notification action to %s",async op=>{expect((await notificationAction({},form(op))).error).toContain("valid notification");expect(m.rest).not.toHaveBeenCalled();});
 it("reads the notice before navigating to its safe stored workflow target",async()=>{const target=`/course-reviews/${id}#review-summary`;m.rest.mockResolvedValue(new Response(JSON.stringify(target)));await expect(notificationAction({},form("open"))).rejects.toMatchObject({digest:"NEXT_REDIRECT"});expect(m.redirect).toHaveBeenCalledWith(target);expect(JSON.parse(m.rest.mock.calls[0][1].body).p_mode).toBe("read");});
 it("never follows an external redirect from stored notification data",async()=>{m.rest.mockResolvedValue(new Response(JSON.stringify("//evil.example")));await expect(notificationAction({},form("open"))).rejects.toMatchObject({digest:"NEXT_REDIRECT"});expect(m.redirect).toHaveBeenCalledWith("/notifications");});

 it("opens a review reference at its resolved exact action, preserving a matching notification id",async()=>{const target=`/course-reviews/${id}/commercials#commercial-signoff-jorrie`;m.destination.mockResolvedValue({source_type:"review",target_path:target});await expect(notificationAction({},form("open"))).rejects.toMatchObject({digest:"NEXT_REDIRECT"});expect(m.redirect).toHaveBeenCalledWith(`/course-reviews/${id}/commercials?notification=${id}#commercial-signoff-jorrie`);expect(m.destination.mock.calls[0][0].user.id).toBe(actor);});
 it("does not record a read receipt when the account cannot retrieve the selected reference",async()=>{m.destination.mockRejectedValue(Error("Notification unavailable"));expect((await notificationAction({},form("open"))).error).toBe("Notification unavailable");expect(m.rest).not.toHaveBeenCalled();});
});
