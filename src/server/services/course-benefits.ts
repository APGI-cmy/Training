import "server-only";
import { cache } from "react";
import { adminRest } from "@/server/supabase/admin-rest";
import { requireSession, type AlpSession } from "@/server/auth/session";
import { getCourseAccess } from "@/lib/services/enrolments/get-course-access";
import { SCANNEX_COURSE_ID, type CertificateKind } from "@/lib/course-benefits";

export type CourseCertificate = {
  id: string; learner_user_id: string; learner_name: string; kind: CertificateKind;
  issued_at: string; revoked_at: string | null; assessment_id: string;
};
export type BenefitState = {
  runId: string | null; attemptNumber: number; learningComplete: boolean;
  passed: boolean; failed: boolean; attendanceEligible: boolean; assessmentId: string | null;
  request: { id: string; status: string; review_note: string | null } | null;
  certificates: CourseCertificate[];
};

export async function benefitRpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const response = await adminRest(`/rest/v1/rpc/${name}`, { method: "POST", body: JSON.stringify(args) });
  if (!response.ok) {
    // Keep the database response out of learner pages, but retain its stable
    // error code for the caller's allowlisted, learner-friendly explanation.
    const body = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(body.message ?? "BENEFITS_UNAVAILABLE");
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

export const getBenefitState = cache((userId: string) =>
  benefitRpc<BenefitState>("v1_course_benefit_state", { p_user: userId }));

export async function requireScannexLearner(): Promise<AlpSession> {
  const session = await requireSession();
  const access = await getCourseAccess({ accessToken: session.accessToken, userId: session.user.id, courseId: SCANNEX_COURSE_ID });
  if (!access.canAccess) throw new Error("ACTIVE_ENROLMENT_REQUIRED");
  return session;
}

export async function ensureScannexRun(userId: string) {
  type Run = { id: string; attempt_number: number };
  const result = await benefitRpc<Run | Run[]>("v1_ensure_run", { p_user: userId });
  const run = Array.isArray(result) ? result[0] : result;
  if (!run?.id) throw new Error("BENEFITS_UNAVAILABLE");
  return run;
}

export async function writeBenefitEvent(userId: string, eventType: string, details: Record<string, unknown>, actorId = userId) {
  const response = await adminRest("/rest/v1/v1_course_benefit_events", {
    method: "POST", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ learner_user_id: userId, actor_user_id: actorId, event_type: eventType, details })
  });
  if (!response.ok) throw new Error("AUDIT_UNAVAILABLE");
}

export async function getOwnedCertificate(userId: string, id: string): Promise<CourseCertificate | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const response = await adminRest(`/rest/v1/v1_course_certificates?id=eq.${id}&learner_user_id=eq.${encodeURIComponent(userId)}&revoked_at=is.null&select=*&limit=1`);
  if (!response.ok) throw new Error("BENEFITS_UNAVAILABLE");
  return ((await response.json()) as CourseCertificate[])[0] ?? null;
}

export function benefitError(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  const messages: Record<string, string> = {
    ACTIVE_ENROLMENT_REQUIRED: "An active Scannex enrolment is required.",
    CERTIFICATE_NOT_ELIGIBLE: "Your verified course result is not yet eligible for this certificate. Please contact your assessor if a result is missing.",
    CERTIFICATE_NAME_REQUIRED: "Please complete your certificate name in your profile first.",
    ATTEMPT_CHANGED_RELOAD: "Your attempt has changed. Reload this page before continuing.",
    THEORY_ALREADY_SUBMITTED: "Your theory result is already recorded for this attempt. A further submission requires a new course attempt.",
    ATTEMPT_ALREADY_GRADED: "This attempt already has a final decision. Please return to the course page.",
    CLOSE_OPEN_BOOKINGS_FIRST: "Please ask APGI to close any outstanding assessment booking before starting the redo.",
    APGI_APPROVAL_REQUIRED: "APGI must approve your request before you can start another attempt.",
    REDO_REQUIRES_FINAL_FAILURE: "A redo is available after your assessor has recorded a final unsuccessful result.",
    RETAKE_REQUEST_NOT_AVAILABLE: "A discounted re-enrolment request is available after an unsuccessful second or later attempt.",
    REQUEST_NOT_REVIEWABLE: "This request has already been processed. Reload the register.",
    REVIEW_NOTE_REQUIRED: "Please record the agreed terms or reason for the decision."
  };
  return messages[code] ?? "This action could not be recorded safely. Please try again or contact APGI; no certificate or new attempt has been confirmed.";
}
