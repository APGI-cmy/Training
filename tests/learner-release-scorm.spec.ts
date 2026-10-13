import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ session: vi.fn(), access: vi.fn(), url: vi.fn(), progress: vi.fn(), fetch: vi.fn() }));
vi.mock("@/server/auth/session", () => ({ getCurrentSession: mocks.session, getSupabaseRestUrl: mocks.url }));
vi.mock("@/lib/services/enrolments/get-course-access", () => ({ getCourseAccess: mocks.access }));
vi.mock("@/server/progress/record-progress", () => ({ recordProgressForSession: mocks.progress }));
import { GET, PUT } from "../app/api/scorm/route";

const session = { accessToken: "test-token", user: { id: "actual-learner", email: "learner@example.invalid" } };
function request(attempt: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) {
  return new NextRequest("https://example.invalid/api/scorm", {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courseSlug: "scannex-training-programme", unitSlug: "lu1", attempt, ...extra })
  });
}

describe("First-learner release SCORM storage boundaries", () => {
  beforeEach(() => {
    vi.resetAllMocks(); vi.stubGlobal("fetch", mocks.fetch); vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-public-key");
    mocks.session.mockResolvedValue(session); mocks.access.mockResolvedValue({ canAccess: true });
    mocks.url.mockImplementation((path: string) => `https://example.invalid${path}`);
    mocks.fetch.mockResolvedValue(Response.json([]));
  });

  it("rejects anonymous SCORM reads and writes", async () => {
    mocks.session.mockResolvedValue(null);
    const read = new NextRequest("https://example.invalid/api/scorm?courseSlug=scannex-training-programme&unitSlug=lu1");
    expect((await GET(read)).status).toBe(401);
    expect((await PUT(request())).status).toBe(401);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("rejects a signed-in learner without course access", async () => {
    mocks.access.mockResolvedValue({ canAccess: false });
    expect((await PUT(request())).status).toBe(401);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("uses the authenticated learner rather than an ID supplied by the browser", async () => {
    expect((await PUT(request({ completion_status: "incomplete", success_status: "unknown", location: "3" }, { user_id: "other-learner" }))).status).toBe(200);
    const saved = JSON.parse(mocks.fetch.mock.calls[0][1].body);
    expect(saved.user_id).toBe("actual-learner");
    expect(saved.unit_id).toBe("scannex-lu-1");
    expect(saved.location).toBe("3");
    expect(mocks.progress).not.toHaveBeenCalled();
  });

  it.each([
    { completion_status: "completed", success_status: "failed" },
    { completion_status: "incomplete", success_status: "passed" }
  ])("does not complete a unit without both completed and passed: %j", async (attempt) => {
    expect((await PUT(request(attempt))).status).toBe(200);
    expect(mocks.progress).not.toHaveBeenCalled();
  });

  it("records completion only after successful attempt persistence", async () => {
    expect((await PUT(request({ completion_status: "completed", success_status: "passed", score_raw: 100 }))).status).toBe(200);
    expect(mocks.progress).toHaveBeenCalledOnce();
    expect(mocks.progress).toHaveBeenCalledWith(expect.objectContaining({ session, eventType: "unit_completed", unitSlug: "lu1" }));
    expect(mocks.fetch.mock.invocationCallOrder[0]).toBeLessThan(mocks.progress.mock.invocationCallOrder[0]);
  });

  it("reports failed persistence without granting completion", async () => {
    mocks.fetch.mockResolvedValue(new Response("database unavailable", { status: 500 }));
    expect((await PUT(request({ completion_status: "completed", success_status: "passed" }))).status).toBe(500);
    expect(mocks.progress).not.toHaveBeenCalled();
  });
});
