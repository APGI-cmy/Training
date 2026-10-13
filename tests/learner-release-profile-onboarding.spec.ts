import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ roles: vi.fn(), profile: vi.fn(), upsert: vi.fn(), session: vi.fn(), login: vi.fn(), accept: vi.fn(), pending: vi.fn(), revalidate: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); } }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/server/auth/session", () => ({ getUserRoles: mocks.roles, requireSession: mocks.session, getCurrentSession: mocks.session, signInWithPassword: mocks.login, signOut: vi.fn() }));
vi.mock("@/server/services/profiles", () => ({ getProfile: mocks.profile, upsertProfile: mocks.upsert }));
vi.mock("@/server/actions/invitations/accept-invitation", () => ({ acceptPendingInvitations: mocks.accept }));
vi.mock("@/server/services/invitations/pending-for-learner", () => ({ getPendingCourseInvitations: mocks.pending }));
import { requireLearnerProfile } from "@/server/auth/learner-onboarding";
import { signInAction } from "@/server/actions/auth/sign-in";
import { updateProfileAction } from "@/server/actions/profiles/update-profile";

const session = { accessToken: "learner-token", user: { id: "actual-learner", email: "learner@example.invalid", email_confirmed_at: "2026-10-13T10:00:00Z" } };
function form(values: Record<string, string>) { const data = new FormData(); Object.entries(values).forEach(([key,value]) => data.set(key,value)); return data; }

describe("Profile-first learner onboarding", () => {
  beforeEach(() => {
    vi.resetAllMocks(); mocks.session.mockResolvedValue(session); mocks.roles.mockResolvedValue([]);
    mocks.profile.mockResolvedValue(null); mocks.upsert.mockResolvedValue({ ok: true });
    mocks.login.mockResolvedValue({ ok: true }); mocks.accept.mockResolvedValue({ ok: true, courseIds: ["scannex-training-programme"] });
    mocks.pending.mockResolvedValue([]);
  });
  it("routes a new account with no learner role or profile to profile completion", async () => {
    await expect(requireLearnerProfile(session)).rejects.toThrow("REDIRECT:/profile?onboarding=required");
  });
  it("does not let a requested dashboard or course destination bypass the first profile step", async () => {
    await expect(signInAction({}, form({ email: "learner@example.invalid", password: "fixture-password-only", returnTo: "/learn/scannex-training-programme" }))).rejects.toThrow("REDIRECT:/profile?onboarding=required");
  });
  it("lets a learner with a saved certificate name reach the dashboard", async () => {
    mocks.profile.mockResolvedValue({ certificate_name: "Learner Test" });
    await expect(signInAction({}, form({ email: "learner@example.invalid", password: "fixture-password-only" }))).rejects.toThrow("REDIRECT:/dashboard");
  });
  it("keeps administrator entry unchanged", async () => {
    mocks.roles.mockResolvedValue(["admin"]);
    await expect(signInAction({}, form({ email: "admin@example.invalid", password: "fixture-password-only" }))).rejects.toThrow("REDIRECT:/admin");
    expect(mocks.profile).not.toHaveBeenCalled();
  });
  it("saves the authenticated learner's profile before accepting invitations and opening the dashboard", async () => {
    await expect(updateProfileAction({}, form({ certificate_name: "Learner Test", complete_onboarding: "true", user_id: "someone-else" }))).rejects.toThrow("REDIRECT:/dashboard?welcome=1");
    expect(mocks.upsert).toHaveBeenCalledWith(session, expect.objectContaining({ certificate_name: "Learner Test" }));
    expect(mocks.upsert.mock.invocationCallOrder[0]).toBeLessThan(mocks.accept.mock.invocationCallOrder[0]);
    expect(mocks.revalidate).toHaveBeenCalledWith("/dashboard");
  });
  it("does not accept invitations when the required profile field is blank", async () => {
    expect(await updateProfileAction({}, form({ certificate_name: " ", complete_onboarding: "true" }))).toHaveProperty("error");
    expect(mocks.upsert).not.toHaveBeenCalled(); expect(mocks.accept).not.toHaveBeenCalled();
  });
  it("does not accept invitations or advance after a failed profile save", async () => {
    mocks.upsert.mockResolvedValue({ ok: false, error: "Profile could not be saved." });
    expect(await updateProfileAction({}, form({ certificate_name: "Learner Test", complete_onboarding: "true" }))).toHaveProperty("error");
    expect(mocks.accept).not.toHaveBeenCalled();
  });
  it("explains a saved profile but failed invitation acceptance without advancing", async () => {
    mocks.accept.mockResolvedValue({ ok: false, error: "invitation_lookup_failed" });
    expect((await updateProfileAction({}, form({ certificate_name: "Learner Test", complete_onboarding: "true" }))).error).toContain("Your profile is saved");
  });
  it("grants the invited course after a regular profile save without the onboarding hidden field", async () => {
    await expect(updateProfileAction({}, form({ certificate_name: "Learner Test" }))).rejects.toThrow("REDIRECT:/dashboard?welcome=1");
    expect(mocks.accept).toHaveBeenCalledOnce();
  });
  it("keeps a failed enrolment reachable even after profile details were saved", async () => {
    mocks.profile.mockResolvedValue({ certificate_name: "Learner Test" });
    mocks.pending.mockResolvedValue([{ id: "valid-own-invitation" }]);
    await expect(requireLearnerProfile(session)).rejects.toThrow("REDIRECT:/profile?onboarding=required");
  });
  it("keeps ordinary profile edits on profile when there are no pending invitations", async () => {
    mocks.accept.mockResolvedValue({ ok: true, courseIds: [] });
    expect(await updateProfileAction({}, form({ certificate_name: "Learner Test" }))).toEqual({ success: "Profile saved." });
    expect(mocks.accept).toHaveBeenCalledOnce();
  });
  it("does not automatically enrol staff when they edit their profile", async () => {
    mocks.roles.mockResolvedValue(["admin"]);
    expect(await updateProfileAction({}, form({ certificate_name: "Admin Test" }))).toEqual({ success: "Profile saved." });
    expect(mocks.accept).not.toHaveBeenCalled();
  });
});
