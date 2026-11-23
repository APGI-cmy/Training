import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isPublicAccountPath, registrationHref } from "@/lib/auth/account-entry";

const hooks = vi.hoisted(() => ({ effects: [] as Array<() => unknown> }));
vi.mock("react", () => ({
  useEffect: (effect: () => unknown) => { hooks.effects.push(effect); },
  useState: () => ["", vi.fn()],
}));
import { SessionActivity } from "@/components/auth/SessionActivity";

const token = "a-valid-dedicated-invitation-token-12345678";
describe("Account entry navigation", () => {
  it.each(["/register", "/alp-sign-in", "/forgot-password", "/reset-password", "/confirm-account", `/invitations/${token}`])("keeps %s available after signing out", path => {
    expect(isPublicAccountPath(path)).toBe(true);
  });
  it.each(["/dashboard", "/admin/learners", "/learn/tiger-kidnapping-telecommunications", "/register/anything", "/invitations"])("keeps the session-expiry redirect for %s", path => {
    expect(isPublicAccountPath(path)).toBe(false);
  });
  it("keeps the original invitation when switching from sign-in to registration", () => {
    expect(registrationHref(`/invitations/${token}`)).toBe(`/register?token=${token}&setup=1`);
    expect(registrationHref(`/register?token=${token}&setup=1`)).toBe(`/register?token=${token}&setup=1`);
  });
  it.each([undefined, "/dashboard", "//other.example/invitations/anything", "https://other.example", "/invitations/%0D%0A"])("uses the invitation guidance page for an unsuitable return target", next => {
    expect(registrationHref(next)).toBe("/register");
  });
});

describe("Session monitor after switching accounts", () => {
  let clock: number;
  let tick: () => void;
  let location: { pathname: string; search: string; hash: string; assign: ReturnType<typeof vi.fn> };
  let activity: EventListener;
  const settle = () => new Promise<void>(resolve => setImmediate(resolve));
  beforeEach(() => {
    hooks.effects.length = 0;
    clock = 1_800_000_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => clock);
    location = { pathname: "/dashboard", search: "", hash: "", assign: vi.fn() };
    vi.stubGlobal("location", location);
    vi.stubGlobal("window", Object.assign(new EventTarget(),{ location }));
    vi.stubGlobal("BroadcastChannel", undefined);
    vi.stubGlobal("document", {
      visibilityState: "visible", querySelectorAll: () => [],
      addEventListener: (name: string, listener: EventListener) => { if (name === "input") activity = listener; },
      removeEventListener: vi.fn(),
    });
    vi.stubGlobal("setInterval", (callback: () => void) => { tick = callback; return 1; });
    vi.stubGlobal("clearInterval", vi.fn());
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(Response.json({ authenticated: true }))
      .mockResolvedValue(new Response(null, { status: 401 })));
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  it("does not replace an in-progress new-password form with sign-in after the old account signs out", async () => {
    SessionActivity(); hooks.effects[0](); await settle();
    location.pathname = "/register"; location.search = `?token=${token}&setup=1`;
    clock += 61_000; activity({ isTrusted: true } as Event); tick(); await settle();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(location.assign).not.toHaveBeenCalled();
  });
  it("still redirects an expired session away from protected course content", async () => {
    SessionActivity(); hooks.effects[0](); await settle();
    location.pathname = "/learn/tiger-kidnapping-telecommunications"; location.hash = "#unit-1";
    clock += 61_000; activity({ isTrusted: true } as Event); tick(); await settle();
    expect(location.assign).toHaveBeenCalledWith(`/alp-sign-in?next=${encodeURIComponent(location.pathname + location.hash)}`);
  });
  it('lets an open player retain pending work while server authentication remains required',async()=>{
    window.addEventListener('learning:session-expired',event=>event.preventDefault());
    SessionActivity();hooks.effects[0]();await settle();
    location.pathname='/learn/tiger-kidnapping-telecommunications/units/lu1';
    clock+=61_000;activity({isTrusted:true} as Event);tick();await settle();
    expect(fetch).toHaveBeenCalledTimes(2);expect(location.assign).not.toHaveBeenCalled();
  });
});
