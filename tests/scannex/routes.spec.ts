import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fixture } from "./fixtures";

const mocks = vi.hoisted(() => ({ configured: vi.fn(), attempt: vi.fn(), case: vi.fn(), rpc: vi.fn(), finalise: vi.fn(), session: vi.fn(), access: vi.fn() }));
vi.mock("@/server/services/assessments/automated-practical", () => ({ collectorConfigured: mocks.configured, getAttempt: mocks.attempt, getCase: mocks.case, practicalRpc: mocks.rpc, finalisePractical: mocks.finalise }));
vi.mock("@/server/auth/session", () => ({ getCurrentSession: mocks.session }));
vi.mock("@/lib/services/enrolments/get-course-access", () => ({ getCourseAccess: mocks.access }));
import { POST } from "../../app/api/scannex/evidence/route";
import { GET } from "../../app/api/scannex/attempts/[attemptId]/route";

describe("assessment API boundaries", () => {
  const secret = "synthetic-test-secret-32-bytes-long";
  beforeEach(() => {
    vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-25T12:31:00Z"));
    vi.stubEnv("SCANNEX_COLLECTOR_SECRET", secret); vi.stubEnv("SCANNEX_VERIFIED_ADAPTER_VERSION", "synthetic-test-v1");
    const { attempt, definition } = fixture();
    mocks.configured.mockReturnValue(true); mocks.attempt.mockResolvedValue({ ...attempt, case_id: "case-id" }); mocks.case.mockResolvedValue({ definition });
    mocks.rpc.mockResolvedValue(null); mocks.finalise.mockResolvedValue(null);
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });
  function request(payload: unknown = fixture().evidence, signed = true) {
    const body = JSON.stringify(payload), timestamp = String(Date.now() / 1000);
    const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
    return new Request("http://localhost/api/scannex/evidence", { method: "POST", body, headers: signed ? { "x-scannex-timestamp": timestamp, "x-scannex-signature": signature } : {} });
  }
  it("accepts verified evidence and triggers scoring", async () => {
    expect((await POST(request())).status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("scannex_receive_evidence", expect.objectContaining({ p_attempt: fixture().attempt.id }));
    expect(mocks.finalise).toHaveBeenCalledOnce();
  });
  it("rejects ordinary browser submissions before any database read", async () => {
    expect((await POST(request(undefined, false))).status).toBe(401); expect(mocks.attempt).not.toHaveBeenCalled();
  });
  it("fails closed when the collector is not configured", async () => {
    mocks.configured.mockReturnValue(false); expect((await POST(request())).status).toBe(503); expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("rejects an unvalidated adapter", async () => {
    vi.stubEnv("SCANNEX_VERIFIED_ADAPTER_VERSION", "different"); expect((await POST(request())).status).toBe(422); expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("rejects oversized evidence before authentication or storage", async () => {
    expect((await POST(request({ padding: "x".repeat(1024 * 1024) }))).status).toBe(413); expect(mocks.attempt).not.toHaveBeenCalled();
  });
  it("never scores mismatched capture evidence", async () => {
    expect((await POST(request({ ...fixture().evidence, nonce: "wrong" }))).status).toBe(422); expect(mocks.finalise).not.toHaveBeenCalled();
  });
  it("does not mask storage conflicts as a successful upload", async () => {
    mocks.rpc.mockRejectedValue(new Error("CONFLICTING_EVIDENCE")); expect((await POST(request())).status).toBe(422);
  });
  const context = { params: Promise.resolve({ attemptId: "10000000-0000-4000-8000-000000000001" }) };
  it("protects status from unauthenticated access", async () => {
    mocks.session.mockResolvedValue(null); expect((await GET(new Request("http://localhost"), context)).status).toBe(401); expect(mocks.attempt).not.toHaveBeenCalled();
  });
  it("protects status from unenrolled learners", async () => {
    mocks.session.mockResolvedValue({ user: { id: "learner" }, accessToken: "test" }); mocks.access.mockResolvedValue({ canAccess: false });
    expect((await GET(new Request("http://localhost"), context)).status).toBe(403); expect(mocks.attempt).not.toHaveBeenCalled();
  });
  it("checks ownership and only returns public result fields", async () => {
    mocks.session.mockResolvedValue({ user: { id: "learner" }, accessToken: "test" }); mocks.access.mockResolvedValue({ canAccess: true });
    mocks.attempt.mockResolvedValue({ completed_at: "now", checklist_submitted_at: "now", collector_nonce: "PRIVATE", result: { status: "passed", practicalScore: 100, practicalContribution: 32, theoryScore: 60, finalScore: 92, safetyFailure: false, checks: [{ expected: "PRIVATE" }] } });
    const response = await GET(new Request("http://localhost"), context);
    expect(mocks.attempt).toHaveBeenCalledWith("10000000-0000-4000-8000-000000000001", "learner");
    expect(await response.json()).toEqual({ submitted: true, result: { status: "passed", practicalScore: 100, practicalMaximum: 100, practicalContribution: 32, theoryScore: 60, finalScore: 92, safetyFailure: false } });
  });
});
