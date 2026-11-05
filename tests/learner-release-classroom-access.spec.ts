import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const m = vi.hoisted(() => ({ session: vi.fn(), admin: vi.fn(), access: vi.fn(), rest: vi.fn(), inspect: vi.fn(), launch: vi.fn() }));
vi.mock("@/server/auth/session", () => ({ requireSession: m.session }));
vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin: m.admin }));
vi.mock("@/lib/services/enrolments/get-course-access", () => ({ getCourseAccess: m.access }));
vi.mock("@/server/supabase/admin-rest", () => ({ adminRest: m.rest }));
vi.mock("@/lib/services/viewer-lab/inspect-viewer-fleet", () => ({ inspectViewerFleet: m.inspect }));
vi.mock("@/lib/services/viewer-lab/create-viewer-lab-session", () => ({ createViewerLabSession: m.launch }));
vi.mock("@/lib/services/viewer-lab/viewer-lab-settings", () => ({ getViewerLabSettings: async () => ({ enabled: true }), getViewerLabCostSummary: async () => ({ recommendedCapacity: 12 }) }));
vi.mock("@/lib/services/viewer-lab/viewer-lab-config", () => ({ getViewerLabConfig: () => ({ region: "eu-west-1" }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { submitScannexTheoryAttempt } from "@/server/actions/assessments/submit-scannex-theory-attempt";
import { getScannexTheoryQuestions } from "@/server/assessments/scannex-theory-bank";
import { POST } from "../app/api/admin/scannex-presenter/route";
beforeEach(() => { vi.resetAllMocks(); m.session.mockResolvedValue({ user: { id: "learner", email: "learner@example.invalid" }, accessToken: "fixture" }); m.admin.mockResolvedValue({ session: { user: { id: "presenter" } } }); m.rest.mockResolvedValue(new Response(null, { status: 201 })); });
it("rejects a theory submission without active course access before writing results", async () => {
  m.access.mockResolvedValue({ canAccess: false });
  const form = new FormData(); form.set("courseSlug", "scannex-training-programme"); form.set("answers", "{}");
  expect(await submitScannexTheoryAttempt({}, form)).toHaveProperty("error"); expect(m.rest).not.toHaveBeenCalled();
});
it("stores a complete enrolled learner submission against the authenticated identity", async () => {
  m.access.mockResolvedValue({ canAccess: true });
  const form = new FormData(); form.set("courseSlug", "scannex-training-programme"); form.set("answers", JSON.stringify(Object.fromEntries(getScannexTheoryQuestions().map(q => [q.id, [q.options[0].id]]))));
  expect(await submitScannexTheoryAttempt({}, form)).toHaveProperty("score");
  expect(JSON.parse(m.rest.mock.calls[0][1].body)).toMatchObject({ learner_user_id: "learner", max_score: 68, assessment_version: "scannex-summative-v2-classroom-202611" });
});
const request = (origin = "https://training.apgi.app") => new NextRequest("https://training.apgi.app/api/admin/scannex-presenter", { method: "POST", headers: { origin } });
it("rejects a foreign-origin presenter launch", async () => { expect((await POST(request("https://external.invalid"))).status).toBe(403); expect(m.admin).not.toHaveBeenCalled(); });
it("does not create a presenter connection for a non-admin", async () => { m.admin.mockRejectedValue(new Error("unauthorised")); await expect(POST(request())).rejects.toThrow(); expect(m.launch).not.toHaveBeenCalled(); });
it("does not create a presenter connection before actual classroom capacity is ready", async () => { m.inspect.mockResolvedValue({ capacity: { ready: false } }); expect((await POST(request())).status).toBe(503); expect(m.launch).not.toHaveBeenCalled(); });
it("opens a separate presenter connection without writing learner results", async () => {
  m.inspect.mockResolvedValue({ capacity: { ready: true } }); m.launch.mockResolvedValue({ streamingUrl: "https://appstream2.eu-west-1.aws.amazon.com/authenticate?fixture=1" });
  expect((await POST(request())).status).toBe(303);
  expect(m.launch).toHaveBeenCalledWith(expect.objectContaining({ learnerId: "presenter:presenter" }));
  expect(m.rest.mock.calls.every(([path]) => path === "/rest/v1/audit_events")).toBe(true);
});
