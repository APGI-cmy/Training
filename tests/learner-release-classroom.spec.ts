import { readFileSync } from "node:fs";
import { beforeEach, expect, it, vi } from "vitest";
import { sendCourseInvitationEmail } from "@/server/services/email/send-course-invitation";
import { classroomPacks } from "@/lib/namdeb-classroom";
import { viewerFleetCapacity } from "@/lib/services/viewer-lab/viewer-fleet-capacity";
import { getScannexTheoryQuestions, scoreScannexTheoryAssessment } from "@/server/assessments/scannex-theory-bank";

const send = vi.fn();
beforeEach(() => {
  vi.unstubAllEnvs(); vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://training.apgi.app");
  vi.stubEnv("RESEND_API_KEY", "offline-fixture"); vi.stubEnv("EMAIL_FROM", "training@example.invalid");
  vi.stubGlobal("fetch", send); send.mockReset();
  send.mockImplementation(async (url: string | URL) => String(url).startsWith("https://api.resend.com/")
    ? Response.json({ id: "offline" })
    : new Response(readFileSync(new URL(`../public${new URL(url).pathname}`, import.meta.url))));
});
it.each(Object.entries(classroomPacks))("sends the right group dates and two verified PDF attachments for %s", async (classroomPack, pack) => {
  const result = await sendCourseInvitationEmail({ invitationId: "offline", recipientEmail: "learner@example.invalid", courseTitle: "Scannex Training Programme", invitationToken: "fixture", expiresAt: "2026-12-01T00:00:00Z", classroomPack });
  expect(result.ok).toBe(true);
  const request = send.mock.calls.find(([url]) => url === "https://api.resend.com/emails")!;
  const body = JSON.parse(request[1].body);
  expect(body.to).toEqual(["learner@example.invalid"]);
  expect(body.text).toContain(pack.dates); expect(body.text).toContain("johan.ras@apginc.ca");
  expect(body.text).toContain("16 November 2026");
  expect(body.attachments).toHaveLength(2);
  expect(body.attachments.map((a: { filename: string }) => a.filename)).toEqual(pack.attachments.map(a => a.filename));
  for (const a of body.attachments) expect(Buffer.from(a.content, "base64").subarray(0, 5).toString()).toBe("%PDF-");
  expect(body.html).toContain("https://training.apgi.app/branding/apgi-logo.png");
});
it("does not send an invitation when an attachment differs from its approved checksum", async () => {
  send.mockResolvedValue(new Response("%PDF-corrupt"));
  expect((await sendCourseInvitationEmail({ invitationId: "offline", recipientEmail: "learner@example.invalid", courseTitle: "Scannex", invitationToken: "fixture", expiresAt: "2026-12-01T00:00:00Z", classroomPack: "namdeb-20261110" })).ok).toBe(false);
  expect(send.mock.calls.some(([url]) => url === "https://api.resend.com/emails")).toBe(false);
});
it("does not report a desired or stopped fleet as ready for the class", () => {
  expect(viewerFleetCapacity({ State: "STOPPED", ComputeCapacityStatus: { Desired: 12, Available: 12, InUse: 0 } }, 12).ready).toBe(false);
  expect(viewerFleetCapacity({ State: "RUNNING", ComputeCapacityStatus: { Desired: 12, Available: 1, InUse: 0 } }, 12).ready).toBe(false);
  expect(viewerFleetCapacity({ State: "RUNNING", ComputeCapacityStatus: { Desired: 12, Available: 11, InUse: 1 } }, 12).ready).toBe(true);
  expect(viewerFleetCapacity({ State: "RUNNING", MaxSessionsPerInstance: 2, ComputeCapacityStatus: { Desired: 6, DesiredUserSessions: 12, AvailableUserSessions: 10, ActiveUserSessions: 2 } }, 12).ready).toBe(true);
});
it("keeps summative answer keys private and grades the full 68 marks", () => {
  const publicQuestions = getScannexTheoryQuestions();
  expect(publicQuestions).toHaveLength(22);
  expect(publicQuestions.filter(q => q.id.startsWith("practice-"))).toHaveLength(18);
  expect(publicQuestions.filter(q => q.id.startsWith("variation-"))).toHaveLength(4);
  expect(publicQuestions.every(q => !("correctOptionIds" in q))).toBe(true);
  const source = readFileSync(new URL("../src/server/assessments/scannex-theory-bank.ts", import.meta.url), "utf8");
  const marked = JSON.parse(source.split("const questions: MarkedQuestion[] = ")[1].split(/;\s*export function/)[0]);
  const correct = Object.fromEntries(marked.map((q: { id: string; correctOptionIds: string[] }) => [q.id, q.correctOptionIds]));
  expect(scoreScannexTheoryAssessment(correct).score).toBe(68);
  expect(scoreScannexTheoryAssessment({}).score).toBe(0);
});
