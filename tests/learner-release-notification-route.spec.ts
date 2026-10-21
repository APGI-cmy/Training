import {beforeEach,describe,it,expect,vi} from "vitest";
const m=vi.hoisted(()=>({session:vi.fn(),inbox:vi.fn()}));
vi.mock("@/server/auth/session",()=>({getCurrentSession:m.session}));
vi.mock("@/server/services/notifications",()=>({notificationInbox:m.inbox}));
import {GET} from "../app/api/notifications/route";
beforeEach(()=>{vi.clearAllMocks();m.session.mockResolvedValue({user:{id:"current-user",email_confirmed_at:"today"}});m.inbox.mockResolvedValue({unread:2,responses:3,attention:4,items:[{message:"private"}],receipts:[{email:"private"}]});});
describe("Private sidebar notification refresh",()=>{
 it("requires a session and bypasses shared caches",async()=>{m.session.mockResolvedValue(null);const r=await GET();expect(r.status).toBe(401);expect(r.headers.get("Cache-Control")).toContain("no-store");expect(m.inbox).not.toHaveBeenCalled();});
 it("requires a confirmed account",async()=>{m.session.mockResolvedValue({user:{id:"unverified"}});expect((await GET()).status).toBe(403);expect(m.inbox).not.toHaveBeenCalled();});
 it("returns only the current user's counts, including for non-admin reviewers",async()=>{const r=await GET();expect(await r.json()).toEqual({unread:2,responses:3,attention:4});expect(m.inbox.mock.calls[0][0].user.id).toBe("current-user");expect(r.headers.get("Vary")).toBe("Cookie");});
 it("does not represent an outage as an empty inbox",async()=>{m.inbox.mockRejectedValue(Error("Database private error"));const r=await GET();expect(r.status).toBe(503);expect(await r.text()).not.toContain("Database private error");});
});
