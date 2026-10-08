import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), access: vi.fn(), status: vi.fn() }));
vi.mock("@/server/auth/session", () => ({ getCurrentSession: mocks.auth }));
vi.mock("@/lib/services/enrolments/get-course-access", () => ({ getCourseAccess: mocks.access }));
vi.mock("@/lib/services/viewer-lab/get-viewer-session-status", () => ({ getViewerSessionStatus: mocks.status }));

import { GET } from "../app/(learner)/learn/[courseSlug]/units/[unitSlug]/viewer-lab/session/route";

const request = new Request("https://training.example/learn/scannex-training-programme/units/lu7/viewer-lab/session?userId=another-learner");
const context = { params: Promise.resolve({ courseSlug: "scannex-training-programme", unitSlug: "lu7" }) };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ accessToken: "token", user: { id: "signed-in-learner", email: "learner@example.invalid" } });
  mocks.access.mockResolvedValue({ canAccess: true });
  mocks.status.mockResolvedValue({ status: "active", canProceed: false, message: "End session first." });
});

describe("Viewer status endpoint", () => {
  it("requires sign-in before reading private launch/session data", async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await GET(request, context)).status).toBe(401);
    expect(mocks.status).not.toHaveBeenCalled();
  });
  it("requires active enrolment", async () => {
    mocks.access.mockResolvedValue({ canAccess: false });
    expect((await GET(request, context)).status).toBe(403);
    expect(mocks.status).not.toHaveBeenCalled();
  });
  it("ignores a supplied learner ID and returns an uncached decision for the signed-in learner", async () => {
    const response = await GET(request, context);
    expect(await response.json()).toMatchObject({ status: "active", canProceed: false });
    expect(mocks.status).toHaveBeenCalledWith("signed-in-learner", "lu7");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
  it.each([ ["vpshr-level-0", "lu7"], ["scannex-training-programme", "nonexistent"] ])("rejects another course or an unknown unit (%s/%s)", async (courseSlug, unitSlug) => {
    expect((await GET(request, { params: Promise.resolve({ courseSlug, unitSlug }) })).status).toBe(404);
    expect(mocks.status).not.toHaveBeenCalled();
  });
});
