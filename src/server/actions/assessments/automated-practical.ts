"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/server/auth/session";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getCourseAccess } from "@/lib/services/enrolments/get-course-access";
import { parsePracticalCase, publicCaseInstructions, SCANNEX_COURSE_ID, type Facts } from "@/lib/assessments/automated-practical";
import { canonicalJson, sha256 } from "@/server/assessments/scannex-native-evidence";
import { AUTOMATION_ADMIN_PATH, PRACTICAL_PATH, createPracticalStreamingUrl, finalisePractical, getAttempt, getCase, livePracticalConfigured, practicalRest, practicalRpc, type PracticalAttempt, type PracticalRequest } from "@/server/services/assessments/automated-practical";
import { sendPracticalReadiness } from "@/server/services/email/send-practical-readiness";

export type PracticalActionState = { error?: string; message?: string; attemptId?: string; streamUrl?: string; instructions?: ReturnType<typeof publicCaseInstructions> };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function formId(form: FormData, name: string) {
  const id = String(form.get(name) ?? "");
  if (!uuid.test(id)) throw new Error("INVALID_IDENTIFIER");
  return id;
}
function refresh() { revalidatePath(PRACTICAL_PATH); revalidatePath(AUTOMATION_ADMIN_PATH); }
function actionError(error: unknown): PracticalActionState {
  const code = error instanceof Error ? error.message : "";
  const messages: Record<string, string> = {
    ENROLMENT_REQUIRED: "An active Scannex course enrolment is required.",
    INVALID_DATE: "Choose a preferred date from today to one year ahead.",
    ACCESS_WINDOW_CLOSED: "Your approved assessment window is not currently open.",
    THEORY_REQUIRED: "Complete the knowledge assessment before starting your practical.",
    HOSTING_NOT_READY: "The hosted assessment is being validated. Your request remains saved.",
    ATTEMPT_SUBMITTED: "This attempt has already been submitted.",
    ATTEMPT_CLOSED: "The access window has closed. Your existing evidence is preserved.",
    CHECKLIST_ALREADY_SUBMITTED: "Your submitted checklist is locked.",
    INVALID_WINDOW: "Choose an access window of no more than 24 hours, ending in the future.",
    REQUEST_NOT_PENDING: "This request has already been processed. Refresh the page.",
    APPROVED_CASE_REQUIRED: "Select an approved assessment case.",
    REQUEST_CANNOT_BE_CANCELLED: "This request can no longer be cancelled.",
  };
  return { error: messages[code] ?? "The operation could not be completed. Refresh and try again; existing records are preserved." };
}
async function requireLearner() {
  const session = await requireSession();
  const access = await getCourseAccess({ accessToken: session.accessToken, userId: session.user.id, userEmail: session.user.email, courseId: SCANNEX_COURSE_ID });
  return { session, allowed: access.canAccess };
}
async function notify(request: PracticalRequest) {
  if (request.notification_status === "accepted") return true;
  const result = await sendPracticalReadiness(request);
  await practicalRest(`scannex_requests?id=eq.${request.id}`, { method: "PATCH", body: JSON.stringify({ notification_status: result.accepted ? "accepted" : "failed", notification_id: result.id ?? null }) });
  return result.accepted;
}
export async function requestPractical(_previous: PracticalActionState, form: FormData): Promise<PracticalActionState> {
  const { session, allowed } = await requireLearner();
  if (!allowed || !session.user.email) return actionError(new Error("ENROLMENT_REQUIRED"));
  const date = String(form.get("preferredDate") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date))) return actionError(new Error("INVALID_DATE"));
  try {
    const request = await practicalRpc<PracticalRequest>("scannex_request_practical", { p_learner: session.user.id, p_email: session.user.email, p_date: date });
    let accepted = false;
    try { accepted = await notify(request); } catch { /* Request is durable even when email delivery cannot be recorded. */ }
    refresh();
    return { message: accepted ? "Your readiness request is saved and the notification has been accepted by the email service. Check this page for your approved access window." : "Your readiness request is saved and visible to the administrator. The email notification could not be confirmed." };
  } catch (error) { return actionError(error); }
}
export async function managePracticalRequest(_previous: PracticalActionState, form: FormData): Promise<PracticalActionState> {
  const { session } = await requireAdmin();
  try {
    const requestId = formId(form, "requestId"), operation = String(form.get("operation"));
    if (operation === "notify") {
      const [request] = await practicalRest<PracticalRequest[]>(`scannex_requests?id=eq.${requestId}&select=*&limit=1`);
      if (!request) throw new Error("INVALID_IDENTIFIER");
      const accepted = await notify(request);
      refresh();
      return accepted ? { message: "The email service accepted the notification." } : { error: "The request is saved, but email delivery is unconfirmed. Automatic retries are limited to 23 hours to prevent duplicate messages." };
    }
    if (operation === "cancel") {
      await practicalRpc("scannex_cancel_practical", { p_admin: session.user.id, p_request: requestId });
    } else if (operation === "approve") {
      // The form explicitly labels these times as South African time (UTC+02:00).
      const opens = String(form.get("opensAt") ?? ""), closes = String(form.get("closesAt") ?? "");
      if (![opens, closes].every(v => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v) && Number.isFinite(Date.parse(`${v}+02:00`)))) throw new Error("INVALID_WINDOW");
      await practicalRpc("scannex_approve_practical", { p_admin: session.user.id, p_request: requestId, p_case: formId(form, "caseId"), p_opens: new Date(`${opens}+02:00`).toISOString(), p_closes: new Date(`${closes}+02:00`).toISOString() });
    } else throw new Error("INVALID_OPERATION");
    refresh();
    return { message: operation === "approve" ? "Access window approved. It is now visible to the learner." : "Request cancelled." };
  } catch (error) { return actionError(error); }
}
export async function savePracticalCase(_previous: PracticalActionState, form: FormData): Promise<PracticalActionState> {
  const { session } = await requireAdmin();
  const raw = String(form.get("definition") ?? "");
  if (raw.length > 128000) return { error: "The case definition is too large." };
  let definition: Record<string, unknown>;
  const approve = form.get("approve") === "on";
  try {
    definition = JSON.parse(raw) as Record<string, unknown>;
    if (!definition || typeof definition !== "object" || Array.isArray(definition) || typeof definition.title !== "string" || !definition.title.trim() || definition.title.length > 200) return { error: "Provide a case title of up to 200 characters." };
    if (approve) parsePracticalCase(definition);
  } catch (error) { return { error: error instanceof SyntaxError ? "The case definition is not valid JSON." : (error instanceof Error ? error.message : "Invalid case definition.") }; }
  try {
    await practicalRest("scannex_cases", { method: "POST", body: JSON.stringify({ title: definition.title, definition, definition_sha256: sha256(canonicalJson(definition)), status: approve ? "approved" : "draft", created_by: session.user.id, approved_by: approve ? session.user.id : null, approved_at: approve ? new Date().toISOString() : null }) });
    refresh();
    return { message: approve ? "A new approved case version has been saved. Existing attempts retain their original version." : "Draft case saved. Drafts cannot be assigned to learners." };
  } catch (error) { return actionError(error); }
}
export async function startPractical(_previous: PracticalActionState, form: FormData): Promise<PracticalActionState> {
  const { session, allowed } = await requireLearner();
  if (!allowed) return actionError(new Error("ENROLMENT_REQUIRED"));
  if (!livePracticalConfigured()) return actionError(new Error("HOSTING_NOT_READY"));
  try {
    const attempt = await practicalRpc<PracticalAttempt>("scannex_start_practical", { p_learner: session.user.id, p_request: formId(form, "requestId") });
    const row = await getCase(attempt.case_id);
    const streamUrl = await createPracticalStreamingUrl(attempt, row.definition);
    refresh();
    return { attemptId: attempt.id, streamUrl, instructions: publicCaseInstructions(row.definition) };
  } catch (error) { return actionError(error); }
}
export async function submitPracticalChecklist(_previous: PracticalActionState, form: FormData): Promise<PracticalActionState> {
  const { session, allowed } = await requireLearner();
  if (!allowed) return actionError(new Error("ENROLMENT_REQUIRED"));
  try {
    const attempt = await getAttempt(formId(form, "attemptId"), session.user.id);
    const row = await getCase(attempt.case_id);
    if (form.get("signed") !== "on") return { error: "Confirm that this checklist records your own assessment." };
    const answers: Facts = { signed: true };
    for (const field of row.definition.checklist) {
      const answer = String(form.get(`answer_${field.id}`) ?? "");
      if (!field.options.includes(answer)) return { error: "Answer every checklist question before submitting." };
      answers[field.id] = answer;
    }
    await practicalRpc("scannex_submit_checklist", { p_learner: session.user.id, p_attempt: attempt.id, p_checklist: answers });
    try { await finalisePractical(attempt.id); } catch { /* A later authenticated status check retries scoring against the saved evidence. */ }
    refresh();
    return { message: "Your checklist is saved and locked. Your result will appear when the native evidence has been verified." };
  } catch (error) { return actionError(error); }
}
