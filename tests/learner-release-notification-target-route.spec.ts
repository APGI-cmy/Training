import {beforeEach,describe,it,expect,vi} from "vitest";
const m=vi.hoisted(()=>({session:vi.fn(),targets:vi.fn()}));
vi.mock("@/server/auth/session",()=>({getCurrentSession:m.session}));
vi.mock("@/server/services/notifications",()=>({notificationTargets:m.targets}));
import {GET} from "../app/api/notifications/targets/route";
beforeEach(()=>{vi.clearAllMocks();m.session.mockResolvedValue({user:{id:"signed-in-user",email_confirmed_at:"today"}});m.targets.mockResolvedValue([]);});
describe("Notification reference endpoint",()=>{
 it("requires sign-in and email verification",async()=>{m.session.mockResolvedValue(null);expect((await GET(new Request("https://example.test/api/notifications/targets?path=/catalogue"))).status).toBe(401);expect(m.targets).not.toHaveBeenCalled();m.session.mockResolvedValue({user:{id:"x"}});expect((await GET(new Request("https://example.test/api/notifications/targets?path=/catalogue"))).status).toBe(403);});
 it("binds reference lookup to the current account and never caches personal data publicly",async()=>{const response=await GET(new Request("https://example.test/api/notifications/targets?path=/catalogue&user_id=forged"));expect(response.status).toBe(200);expect(m.targets.mock.calls[0][0].user.id).toBe("signed-in-user");expect(response.headers.get("Cache-Control")).toBe("private, no-store");expect(response.headers.get("Vary")).toBe("Cookie");});
 it("rejects a malformed notification reference before database lookup",async()=>{expect((await GET(new Request("https://example.test/api/notifications/targets?path=/catalogue&notification=bad"))).status).toBe(400);expect(m.targets).not.toHaveBeenCalled();});
 it("reports an outage rather than pretending that required actions disappeared",async()=>{m.targets.mockRejectedValue(Error("Private database details"));const response=await GET(new Request("https://example.test/api/notifications/targets?path=/catalogue"));expect(response.status).toBe(503);expect(await response.text()).not.toContain("Private database details");});
});
