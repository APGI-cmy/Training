import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "../proxy";

const token = (exp: number) => `header.${Buffer.from(JSON.stringify({exp})).toString("base64url")}.signature`;
const expired = token(1);
const refreshed = token(Math.floor(Date.now()/1000)+3600);
const fetchMock = vi.fn();
function request(access = expired, refresh = "refresh-old", user = "learner-a") {
  return new NextRequest("https://training.apgi.app/api/scorm", {
    method: "PUT", headers: { cookie: `alp_access_token=${access}; alp_refresh_token=${refresh}; alp_user_id=${user}`, "content-type": "application/json" },
    body: JSON.stringify({attempt:{suspend_data:"unsaved-quiz-answers"}})
  });
}
describe("Automatic learner session refresh", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL","https://provider.invalid");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY","public-key");
    vi.stubEnv("NODE_ENV","production");
    fetchMock.mockResolvedValue(Response.json({access_token:refreshed,refresh_token:"refresh-new",user:{id:"learner-a"}}));
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
  it("recovers an expired autosave in the same request without redirecting or consuming its answers", async () => {
    const req=request(); const response=await proxy(req);
    expect(fetchMock).toHaveBeenCalledWith("https://provider.invalid/auth/v1/token?grant_type=refresh_token",expect.objectContaining({method:"POST",body:JSON.stringify({refresh_token:"refresh-old"}),cache:"no-store"}));
    expect(response.headers.get("x-middleware-request-cookie")).toContain(`alp_access_token=${refreshed}`);
    expect(response.headers.get("location")).toBeNull();
    expect(await req.json()).toEqual({attempt:{suspend_data:"unsaved-quiz-answers"}});
    expect(response.cookies.get("alp_refresh_token")?.value).toBe("refresh-new");
    expect(response.headers.get("set-cookie")).toMatch(/HttpOnly/);
    expect(response.headers.get("set-cookie")).toMatch(/Secure/);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
  it("does not refresh a healthy token on each save",async()=>{
    await proxy(request(refreshed)); expect(fetchMock).not.toHaveBeenCalled();
  });
  it("refreshes a token nearing expiry before a long activity save",async()=>{
    await proxy(request(token(Math.floor(Date.now()/1000)+30))); expect(fetchMock).toHaveBeenCalledOnce();
  });
  it("does not manufacture an anonymous session",async()=>{
    await proxy(new NextRequest("https://training.apgi.app/api/scorm")); expect(fetchMock).not.toHaveBeenCalled();
  });
  it("never accepts a refreshed session belonging to a different user",async()=>{
    const response=await proxy(request(expired,"refresh-old","other-user"));
    expect(response.cookies.getAll()).toEqual([]);
    expect(response.headers.get("x-middleware-request-cookie")).toBeNull();
  });
  it.each([400,401,403,500])("leaves failed provider refresh %s to existing auth checks without deleting progress",async(status)=>{
    fetchMock.mockResolvedValue(new Response("unavailable",{status}));
    const response=await proxy(request()); expect(response.cookies.getAll()).toEqual([]);
    expect(response.headers.get("x-middleware-request-cookie")).toBeNull();
  });
  it("preserves cookies for retry after a network error",async()=>{
    fetchMock.mockRejectedValue(new Error("offline"));
    expect((await proxy(request())).cookies.getAll()).toEqual([]);
  });
  it("does not trust an incomplete provider response",async()=>{
    fetchMock.mockResolvedValue(Response.json({access_token:refreshed,user:{id:"learner-a"}}));
    expect((await proxy(request())).cookies.getAll()).toEqual([]);
  });
});
