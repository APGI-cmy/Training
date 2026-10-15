import { beforeEach, describe, it, expect, vi } from "vitest";
const m = vi.hoisted(() => ({
  session: vi.fn(),
  roles: vi.fn(),
  rest: vi.fn(),
}));
vi.mock("@/server/auth/session", () => ({
  requireSession: m.session,
  getUserRoles: m.roles,
}));
vi.mock("@/server/supabase/admin-rest", () => ({ adminRest: m.rest }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));
import {
  requireCompany,
  accessibleCompanies,
  requirePolicy,
  contextualCompany,
} from "@/server/services/company-structure";
import { financialDraftConfiguration } from "@/lib/company-structure";
const own = "11111111-1111-4111-8111-111111111111",
  other = "22222222-2222-4222-8222-222222222222";
const session = {
  accessToken: "fixture",
  user: {
    id: "33333333-3333-4333-8333-333333333333",
    email: "owner@example.invalid",
    email_confirmed_at: "2026-01-01",
  },
};
beforeEach(() => {
  vi.resetAllMocks();
  m.session.mockResolvedValue(session);
  m.roles.mockResolvedValue([]);
  m.rest.mockImplementation(async () => Response.json([]));
});
describe("Company and policy data boundaries", () => {
  it("denies another company before reading its record", async () => {
    m.rest.mockResolvedValue(
      Response.json([{ organisation_id: own, membership_role: "owner" }]),
    );
    await expect(requireCompany(other)).rejects.toThrow("access");
    expect(
      m.rest.mock.calls.every(([p]) => p.includes("organisation_memberships")),
    ).toBe(true);
  });
  it("requires an owner membership for brand changes, not an ordinary learner membership", async () => {
    await expect(requireCompany(own)).rejects.toThrow("access");
    expect(m.rest.mock.calls[0][0]).toContain("membership_role=eq.owner");
  });
  it("does not return any company when the signed-in account has no membership", async () => {
    expect(await accessibleCompanies()).toEqual([]);
    expect(m.rest).toHaveBeenCalledOnce();
  });
  it("does not trust a requested branding context for another company", async () => {
    m.rest.mockResolvedValue(
      Response.json([{ organisation_id: own, membership_role: "owner" }]),
    );
    expect(await contextualCompany(session, undefined, other)).toBeNull();
    expect(
      m.rest.mock.calls.every(([p]) => p.includes("organisation_memberships")),
    ).toBe(true);
  });
  it("denies an unassigned policy before fetching its document or file metadata", async () => {
    await expect(requirePolicy(other)).rejects.toThrow("access");
    expect(m.rest.mock.calls.some(([p]) => p.includes("select=*"))).toBe(false);
  });
  it("never exposes organisation data when authentication fails", async () => {
    m.session.mockRejectedValue(new Error("SIGN_IN"));
    await expect(accessibleCompanies()).rejects.toThrow("SIGN_IN");
    expect(m.rest).not.toHaveBeenCalled();
  });
});
describe("Non-operative financial records", () => {
  it("leaves all unagreed values empty instead of silently activating defaults", () => {
    const result = financialDraftConfiguration(new FormData());
    expect(Object.values(result).every((v) => v === null)).toBe(true);
    expect(result).not.toHaveProperty("active");
  });
  it.each(["-1", "101", "NaN", "Infinity"])(
    "rejects invalid percentages: %s",
    (value) => {
      const f = new FormData();
      f.set("administration_rate", value);
      expect(() => financialDraftConfiguration(f)).toThrow("Percentages");
    },
  );
  it("rejects invalid cost amounts and currency while preserving a valid draft", () => {
    const f = new FormData();
    f.set("cost_amount", "20.00");
    f.set("administration_rate", "6");
    f.set("currency", "USD");
    expect(financialDraftConfiguration(f)).toMatchObject({
      cost_amount: "20.00",
      administration_rate: "6",
      currency: "USD",
    });
    f.set("cost_amount", "-20");
    expect(() => financialDraftConfiguration(f)).toThrow("monetary");
  });
});
