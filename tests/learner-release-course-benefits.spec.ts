import { beforeEach, describe, expect, it, vi } from "vitest";
import { Readable } from "node:stream";
import { createHash } from "node:crypto";
import { COPYRIGHT_TERMS_VERSION, validBookId, validSignature, certificateWording, retryMessage } from "@/lib/course-benefits";

const m = vi.hoisted(() => ({ session: vi.fn(), access: vi.fn(), book: vi.fn(), profile: vi.fn(), audit: vi.fn(), rpc: vi.fn(), enrolled: vi.fn(), owned: vi.fn(), admin: vi.fn(), clear: vi.fn() }));
const pdf = Buffer.from("%PDF-1.7 local QA fixture");
vi.mock("@/server/auth/session", () => ({ getCurrentSession: m.session }));
vi.mock("@/lib/services/enrolments/get-course-access", () => ({ getCourseAccess: m.access }));
vi.mock("@/server/services/course-books", () => ({ getCourseBook: m.book }));
vi.mock("@/server/services/profiles", () => ({ getProfile: m.profile }));
vi.mock("@/server/services/course-benefits", () => ({ writeBenefitEvent: m.audit, benefitRpc: m.rpc, requireScannexLearner: m.enrolled, getOwnedCertificate: m.owned, benefitError: () => "Safely rejected" }));
vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin: m.admin }));
vi.mock("@/server/progress/progress-cookie", () => ({ clearCookieCourseProgress: m.clear }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("node:fs/promises", () => ({ readFile: async () => Buffer.from("%PDF-1.7 local QA fixture") }));
vi.mock("node:fs", () => ({ createReadStream: () => Readable.from([Buffer.from("%PDF-1.7 local QA fixture")]) }));
import { POST } from "../app/(learner)/learn/[courseSlug]/resources/download/route";
import { courseBenefitAction, recordCertificatePrint, reviewRetakeAction } from "@/server/actions/course-benefits";

const context = { params: Promise.resolve({ courseSlug: "scannex-training-programme" }) };
function form() {
  const f = new FormData(); f.set("book", "full"); f.set("agree", "on"); f.set("termsVersion", COPYRIGHT_TERMS_VERSION); f.set("signature", "QA Learner"); return f;
}
function request(f = form(), origin = "https://training.apgi.app") {
  return new Request("https://training.apgi.app/learn/scannex-training-programme/resources/download", { method: "POST", headers: { origin }, body: f });
}
beforeEach(() => {
  vi.resetAllMocks();
  const session = { user: { id: "own-user", email: "qa@example.invalid" }, accessToken: "fixture" };
  m.session.mockResolvedValue(session); m.enrolled.mockResolvedValue(session);
  m.access.mockResolvedValue({ canAccess: true }); m.profile.mockResolvedValue({ certificate_name: "QA Learner" });
  m.book.mockResolvedValue({ id: "full", filename: "book.pdf", path: "fixture", sha256: createHash("sha256").update(pdf).digest("hex") });
});
describe("signed V1 e-book downloads", () => {
  it("rejects cross-site requests before authentication or audit writes", async () => {
    expect((await POST(request(form(), "https://foreign.invalid"), context)).status).toBe(403); expect(m.session).not.toHaveBeenCalled(); expect(m.audit).not.toHaveBeenCalled();
  });
  it("supports a routed public Host when Next exposes an internal request hostname", async () => {
    const r = new Request("https://internal.invalid/learn/scannex-training-programme/resources/download", {method:"POST",headers:{host:"training.apgi.app",origin:"https://training.apgi.app"},body:form()});
    expect((await POST(r,context)).status).toBe(200);
  });
  it("requires authentication and an active enrolment", async () => {
    m.session.mockResolvedValueOnce(null); expect((await POST(request(), context)).status).toBe(401);
    m.access.mockResolvedValueOnce({ canAccess: false }); expect((await POST(request(), context)).status).toBe(403); expect(m.audit).not.toHaveBeenCalled();
  });
  it("requires the current terms, acknowledgement and profile-matching typed name", async () => {
    for (const [key, value] of [["agree", ""], ["termsVersion", "old"], ["signature", "Another Person"]]) {
      const f = form(); f.set(key, value); expect((await POST(request(f), context)).status).toBe(400);
    }
    expect(m.audit).not.toHaveBeenCalled();
  });
  it("fails closed if the signed acknowledgement cannot be audited", async () => {
    m.audit.mockRejectedValueOnce(new Error("audit offline")); expect((await POST(request(), context)).status).toBe(503);
  });
  it("blocks a mismatched file fingerprint", async () => {
    m.book.mockResolvedValueOnce({ id: "full", filename: "book.pdf", path: "fixture", sha256: "wrong" });
    expect((await POST(request(), context)).status).toBe(503); expect(m.audit).not.toHaveBeenCalled();
  });
  it("binds the signature to the authenticated identity and streams a private attachment", async () => {
    const f = form(); f.set("userId", "other-user");
    const result = await POST(request(f), context);
    expect(result.status).toBe(200); expect(result.headers.get("cache-control")).toContain("no-store");
    expect(result.headers.get("content-disposition")).toContain("attachment");
    expect(Buffer.from(await result.arrayBuffer())).toEqual(pdf);
    expect(m.audit).toHaveBeenCalledWith("own-user", "ebook_download_authorised", expect.objectContaining({ signature: "QA Learner", termsVersion: COPYRIGHT_TERMS_VERSION, email: "qa@example.invalid" }));
  });
});
describe("certificate and retry action boundaries", () => {
  it("never accepts a learner identity from the form", async () => {
    m.rpc.mockResolvedValueOnce("certificate-id");
    const f = new FormData(); f.set("operation", "certificate"); f.set("kind", "passed"); f.set("userId", "other-user");
    expect(await courseBenefitAction({}, f)).toHaveProperty("href");
    expect(m.rpc).toHaveBeenCalledWith("v1_issue_certificate", { p_user: "own-user", p_kind: "passed" });
  });
  it("does not confirm a certificate when the database rejects eligibility", async () => {
    m.rpc.mockRejectedValueOnce(new Error("CERTIFICATE_NOT_ELIGIBLE"));
    const f = new FormData(); f.set("operation", "certificate"); f.set("kind", "passed");
    expect(await courseBenefitAction({}, f)).toHaveProperty("error");
  });
  it("requires explicit reset acknowledgement before creating a redo", async () => {
    const f = new FormData(); f.set("operation", "redo"); f.set("attempt", "1");
    expect(await courseBenefitAction({}, f)).toHaveProperty("error"); expect(m.rpc).not.toHaveBeenCalled();
    f.set("acknowledge", "on"); await courseBenefitAction({}, f);
    expect(m.rpc).toHaveBeenCalledWith("v1_begin_redo", { p_user: "own-user", p_expected_attempt: 1 });
    expect(m.clear).toHaveBeenCalledWith({ userId: "own-user", courseId: "scannex-training-programme" });
  });
  it("does not record prints of a different learner’s certificate", async () => {
    m.owned.mockResolvedValueOnce(null); expect(await recordCertificatePrint("other-certificate")).toHaveProperty("error"); expect(m.audit).not.toHaveBeenCalled();
  });
  it("requires an administrator for re-enrolment approval", async () => {
    m.admin.mockRejectedValueOnce(new Error("denied")); await expect(reviewRetakeAction({}, new FormData())).rejects.toThrow("denied"); expect(m.rpc).not.toHaveBeenCalled();
  });
});
it("restricts document ids and signatures and keeps attendance distinct from passing", () => {
  expect(validBookId("../../secret")).toBe(false); expect(validBookId("lu10")).toBe(false); expect(validBookId("lu9")).toBe(true);
  expect(validSignature(" QA   Learner ", "qa learner")).toBe(true); expect(validSignature("", "")).toBe(false);
  expect(certificateWording("attendance")).toContain("does not certify a pass"); expect(certificateWording("passed")).toContain("requirements to pass");
  expect(retryMessage(1)).toContain("still take that redo"); expect(retryMessage(9)).toContain("APGI's approval");
});
