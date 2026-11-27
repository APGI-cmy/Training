import "server-only";
import { createHash } from "node:crypto";
import { getCurrentSession, getUserRoles, getSupabaseRestUrl, type AlpSession } from "@/server/auth/session";
import { adminRest } from "@/server/supabase/admin-rest";
import { getCourseAccess } from "@/lib/services/enrolments/get-course-access";
import { getBenefitState } from "@/server/services/course-benefits";
import { getProfile } from "@/server/services/profiles";
import { SCANNEX_PRACTICAL_RUBRIC } from "@/lib/assessments/scannex-practical-rubric";
import { FILE_KINDS, LEARNER_SCANNEX_WORKFLOW, isUuid, newDocument, object, packApprovalIssues, parseAnswerKeys, parseDocument, parsePackCases, safeFilename, submissionIssues, text, uploadLimit, validateFile,
 type CasePack, type FileKind, type PracticalAssignment, type PracticalFile } from "@/lib/assessments/scannex-assignment";

export const BUCKET = "v1-practical-evidence";
const PACK_COLUMNS = "id,title,version,status,instructions,density_rule,learner_cases,created_at,approved_at,edit_version";
const ASSIGNMENT_COLUMNS = "id,assessment_id,pack_id,learner_user_id,v1_run_id,status,revision,draft_version,document,latest_submission_id,started_at,submitted_at";
type StoredFile = PracticalFile & { storage_path: string; uploaded_by: string };
export type Actor = { session: AlpSession; admin: boolean };
export async function actor(adminOnly = false): Promise<Actor> {
  const session = await getCurrentSession();
  if (!session) throw new Error("UNAUTHENTICATED");
  const admin = (await getUserRoles(session.accessToken)).includes("admin");
  if (adminOnly && !admin) throw new Error("FORBIDDEN");
  if (!adminOnly && !admin) await enrolled(session);
  return { session, admin };
}
async function enrolled(session: AlpSession) {
  const access = await getCourseAccess({ accessToken: session.accessToken, userId: session.user.id, courseId: "scannex-training-programme" });
  if (!access.canAccess) throw new Error("ACTIVE_ENROLMENT_REQUIRED");
}
async function rows<T>(table: string, query: string): Promise<T[]> {
  const r = await adminRest(`/rest/v1/${table}?${query}`);
  if (!r.ok) throw new Error("PRACTICAL_UNAVAILABLE");
  return r.json() as Promise<T[]>;
}
export async function mutate<T>(who: Actor, operation: string, id: string | null, data: unknown = {}): Promise<T> {
  const r = await adminRest("/rest/v1/rpc/v1_practical_mutate", { method: "POST", body: JSON.stringify({ p_actor: who.session.user.id, p_operation: operation, p_id: id, p_data: data }) });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || "PRACTICAL_UNAVAILABLE"); }
  return r.json() as Promise<T>;
}
export async function ownedAssignment(who: Actor, id: unknown) {
  if (!isUuid(id)) throw new Error("NOT_FOUND");
  const [a] = await rows<PracticalAssignment>("v1_practical_assignments", `id=eq.${id}&select=*&limit=1`);
  if (!a || (!who.admin && a.learner_user_id !== who.session.user.id)) throw new Error("NOT_FOUND");
  return a;
}
async function pack(id: string) {
  const [p] = await rows<CasePack>("v1_practical_packs", `id=eq.${id}&select=${PACK_COLUMNS}&limit=1`);
  if (!p) throw new Error("NOT_FOUND");
  return { ...p, calibration_notes: "" }; // Never expose assessor calibration / hidden reference notes.
}
export async function learnerWorkspace(who: Actor) {
  await enrolled(who.session);
  const [benefits, profile, assignments] = await Promise.all([
    getBenefitState(who.session.user.id), getProfile(who.session),
    rows<PracticalAssignment>("v1_practical_assignments", `learner_user_id=eq.${who.session.user.id}&select=${ASSIGNMENT_COLUMNS}&order=created_at.desc&limit=20`)
  ]);
  const a = assignments.find(x => x.v1_run_id === benefits.runId) ?? null;
  if (!a) return { assignment: null, pack: null, files: [], submissions: [], learningComplete: benefits.learningComplete, name: profile?.certificate_name || profile?.full_name || "" };
  const [[p], files, bookings] = await Promise.all([
    rows<Pick<CasePack, "learner_cases">>("v1_practical_packs", `id=eq.${a.pack_id}&select=learner_cases&limit=1`),
    rows<StoredFile>("v1_practical_files", `assignment_id=eq.${a.id}&select=*&order=created_at`),
    rows<{ assessment_reference: string }>("assessment_bookings", `id=eq.${a.assessment_id}&select=assessment_reference`)
  ]);
  if (!p) throw new Error("NOT_FOUND");
  const learnerCases = parsePackCases(p.learner_cases).map(({ id, number, title, brief }) => ({ id, number, title, brief, sourceFileId: null, quality: { F1: "", F2: "", F3: "", F4: "" } }));
  return { assignment: a, pack: { learner_cases: learnerCases }, files: files.map(publicFile), submissions: [], learningComplete: benefits.learningComplete,
    name: profile?.certificate_name || profile?.full_name || "", reference: bookings[0]?.assessment_reference };
}
export function publicFile(f: StoredFile): PracticalFile {
  const { storage_path: _path, uploaded_by: _by, ...visible } = f; return visible;
}
export async function learnerMutation(who: Actor, body: Record<string, unknown>) {
  const a = await ownedAssignment(who, body.id);
  if (a.learner_user_id !== who.session.user.id) throw new Error("FORBIDDEN");
  const p = await pack(a.pack_id);
  const expectedVersion = Number(body.expectedVersion);
  if (body.operation === "start") await mutate(who, "start", a.id);
  else if (body.operation === "save") {
    const document = parseDocument(body.document, p.learner_cases);
    if (!Number.isSafeInteger(expectedVersion)) throw new Error("STALE_VERSION");
    return { assignment: await mutate<PracticalAssignment>(who, "save", a.id, { expectedVersion, document }) };
  } else if (body.operation === "submit") {
    if (body.declaration !== true || !Number.isSafeInteger(expectedVersion)) throw new Error("SIGNATURE_REQUIRED");
    const files = await rows<PracticalFile>("v1_practical_files", `assignment_id=eq.${a.id}&select=*`);
    const issues = submissionIssues(parseDocument(a.document, p.learner_cases), files, LEARNER_SCANNEX_WORKFLOW);
    if (issues.length) throw new Error("INCOMPLETE_SUBMISSION");
    await mutate(who, "submit", a.id, { expectedVersion, signedName: text(body.signedName, 200), declaration: true, evidencePolicy: "guided-recording-v1" });
  } else throw new Error("INVALID_OPERATION");
  return learnerWorkspace(who);
}
export async function adminWorkspace(who: Actor) {
  if (!who.admin) throw new Error("FORBIDDEN");
  const [packs, assignments, bookings, profiles] = await Promise.all([
    rows<CasePack & { edit_version: number }>("v1_practical_packs", "select=id,title,status,version,density_rule,edit_version,created_at&order=created_at.desc&limit=100"),
    rows<PracticalAssignment>("v1_practical_assignments", "select=id,assessment_id,pack_id,learner_user_id,v1_run_id,status,revision,draft_version,latest_submission_id,started_at,submitted_at&order=created_at.desc&limit=200"),
    rows<Record<string, unknown>>("assessment_bookings", "course_id=eq.scannex-training-programme&select=id,assessment_reference,learner_user_id,status,v1_run_id,final_score&order=created_at.desc&limit=200"),
    rows<Record<string, unknown>>("profiles", "select=user_id,full_name,email&limit=1000")
  ]);
  return { packs, assignments, bookings, profiles };
}
export async function adminPack(who: Actor, id: string) {
  if (!who.admin || !isUuid(id)) throw new Error("NOT_FOUND");
  const [p] = await rows<CasePack & { answer_keys: unknown[]; edit_version: number }>("v1_practical_packs", `id=eq.${id}&select=*&limit=1`);
  if (!p) throw new Error("NOT_FOUND"); return p;
}
export async function reviewWorkspace(who: Actor, id: string) {
  if (!who.admin) throw new Error("FORBIDDEN");
  const a = await ownedAssignment(who, id);
  const [p] = await rows<Record<string, unknown>>("v1_practical_packs", `id=eq.${a.pack_id}&select=*`);
  const [files, submissions, events] = await Promise.all([
    rows<StoredFile>("v1_practical_files", `assignment_id=eq.${id}&select=*&order=created_at`),
    rows<Record<string, unknown>>("v1_practical_submissions", `assignment_id=eq.${id}&select=*&order=revision.desc&limit=2`),
    rows<Record<string, unknown>>("v1_practical_events", `assignment_id=eq.${id}&select=*&order=occurred_at`)
  ]);
  const reviews = submissions.length ? await rows<Record<string, unknown>>("v1_practical_reviews", `submission_id=in.(${submissions.map(s => s.id).join(",")})&select=*`) : [];
  return { assignment: a, pack: p, files: files.map(publicFile), submissions, reviews, events };
}
export async function adminMutation(who: Actor, body: Record<string, unknown>) {
  if (!who.admin) throw new Error("FORBIDDEN");
  const op = body.operation;
  if (op === "create_pack") {
    const cases = parsePackCases(body.cases), keys = parseAnswerKeys(body.keys, cases);
    return mutate(who, "create_pack", null, { title: text(body.title, 150), cases, keys });
  }
  if (!isUuid(body.id)) throw new Error("NOT_FOUND");
  if (op === "save_pack") {
    if (!Number.isSafeInteger(body.expectedVersion) || Number(body.expectedVersion)<0) throw new Error("STALE_VERSION");
    const cases = parsePackCases(body.cases), keys = parseAnswerKeys(body.keys, cases);
    return mutate(who, op, body.id, { cases, keys, title: text(body.title, 150), instructions: text(body.instructions, 8000), calibration: text(body.calibration), expectedVersion: Number(body.expectedVersion) });
  }
  if (op === "approve_pack") {
    if (!Number.isSafeInteger(body.expectedVersion) || Number(body.expectedVersion)<0) throw new Error("STALE_VERSION");
    const [p] = await rows<CasePack & { answer_keys: unknown }>("v1_practical_packs", `id=eq.${body.id}&select=*`);
    if (!p) throw new Error("NOT_FOUND");
    const keys = parseAnswerKeys(p.answer_keys, p.learner_cases);
    if (packApprovalIssues(p.learner_cases, keys, p.density_rule, p.calibration_notes).length) throw new Error("UNVERIFIED_CASE_SET");
    return mutate(who, op, body.id, { expectedVersion: Number(body.expectedVersion) });
  }
  if (op === "assign") {
    if (!isUuid(body.packId) || body.approveBooking !== true) throw new Error("APPROVAL_REQUIRED");
    return mutate(who, op, body.id, { packId: body.packId });
  }
  if (op === "review") {
    if (!isUuid(body.submissionId) || !["passed", "failed", "changes_requested"].includes(String(body.decision))) throw new Error("REVIEW_REQUIRED");
    const scores = object(body.scores);
    if (body.decision !== "changes_requested" && (Object.keys(scores).length !== SCANNEX_PRACTICAL_RUBRIC.length || SCANNEX_PRACTICAL_RUBRIC.some(c => !Number.isInteger(scores[c.id]) || Number(scores[c.id]) < 0 || Number(scores[c.id]) > c.maximumScore))) throw new Error("INVALID_RUBRIC");
    return mutate(who, op, body.id, { submissionId: body.submissionId, decision: body.decision, scores, notes: text(body.notes, 8000), safety: body.safety === true, evidenceVerified: body.evidenceVerified === true });
  }
  throw new Error("INVALID_OPERATION");
}
export async function accessibleFile(who: Actor, id: unknown): Promise<StoredFile> {
  if (!isUuid(id)) throw new Error("NOT_FOUND");
  const [f] = await rows<StoredFile>("v1_practical_files", `id=eq.${id}&select=*`);
  if (!f) throw new Error("NOT_FOUND");
  if (!who.admin) {
    if (!f.assignment_id || f.kind === "case_source") throw new Error("NOT_FOUND");
    await ownedAssignment(who, f.assignment_id);
  }
  return f;
}
function storagePath(path: string) { return `${BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`; }
export async function uploadMutation(who: Actor, body: Record<string, unknown>) {
  if (body.operation === "reserve") {
    const kind = body.kind as FileKind, name = text(body.name, 200), mime = text(body.mime, 100), size = Number(body.size);
    validateFile(kind, name, mime, size);
    if (kind === "recording" && body.recordingNoticeAccepted !== true) throw new Error("APPROVAL_REQUIRED");
    if (!isUuid(body.caseId) || (kind === "case_source" ? !who.admin || !isUuid(body.packId) : !isUuid(body.assignmentId))) throw new Error("FORBIDDEN");
    const f = await mutate<StoredFile>(who, "reserve_file", null, { kind, name, mime, size, caseId: body.caseId, assignmentId: kind === "case_source" ? null : body.assignmentId, packId: kind === "case_source" ? body.packId : null, safeName: safeFilename(name), recordingNoticeAccepted: body.recordingNoticeAccepted === true });
    const response = await adminRest(`/storage/v1/object/upload/sign/${storagePath(f.storage_path)}`, { method: "POST", headers: { "x-upsert": "false" }, body: "{}" });
    if (!response.ok) throw new Error("UPLOAD_UNAVAILABLE");
    const data = await response.json() as { url: string };
    const base = getSupabaseRestUrl("/storage/v1");
    if (!base || !data.url?.startsWith("/object/upload/sign/")) throw new Error("UPLOAD_UNAVAILABLE");
    return { file: publicFile(f), uploadUrl: `${base}${data.url}` };
  }
  if (body.operation !== "finalize") throw new Error("INVALID_OPERATION");
  const f = await accessibleFile(who, body.id);
  if (f.uploaded_by !== who.session.user.id) throw new Error("FORBIDDEN");
  if (f.status === "verified") return { file: publicFile(f) };
  const response = await adminRest(`/storage/v1/object/authenticated/${storagePath(f.storage_path)}`);
  if (!response.ok || !response.body) throw new Error("UPLOAD_NOT_FOUND");
  const hash = createHash("sha256"), reader = response.body.getReader(); let size = 0; let head = Buffer.alloc(0);
  try { for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length;
    if (size > uploadLimit(f.kind) || size > f.size_bytes) throw new Error("FILE_SIZE_MISMATCH");
    hash.update(value); if (head.length < 4096) head = Buffer.concat([head, Buffer.from(value)]).subarray(0, 4096);
  } } finally { await reader.cancel().catch(() => {}); }
  if (size !== f.size_bytes || !fileMagicMatches(f.mime_type, head)) throw new Error("FILE_CONTENT_MISMATCH");
  const verified = await mutate<StoredFile>(who, "verify_file", f.id, { sha256: hash.digest("hex") });
  return { file: publicFile(verified) };
}
export function fileMagicMatches(mime: string, b: Buffer) {
  const hex = b.subarray(0, 8).toString("hex");
  if (mime === "image/png") return hex === "89504e470d0a1a0a";
  if (mime === "image/jpeg") return hex.startsWith("ffd8ff");
  if (mime === "image/tiff") return hex.startsWith("49492a00") || hex.startsWith("4d4d002a");
  if (mime === "application/pdf") return b.toString("ascii", 0, 5) === "%PDF-";
  if (mime === "video/webm") return hex.startsWith("1a45dfa3");
  if (mime === "video/mp4") return b.toString("ascii", 4, 8) === "ftyp";
  return ["text/plain", "application/json"].includes(mime) && !b.includes(0) && !b.toString("utf8").trimStart().startsWith("<");
}
export async function downloadFile(who: Actor, id: string) {
  const f = await accessibleFile(who, id);
  if (f.status !== "verified") throw new Error("NOT_FOUND");
  const r = await adminRest(`/storage/v1/object/authenticated/${storagePath(f.storage_path)}`);
  if (!r.ok) throw new Error("NOT_FOUND");
  const audit = await adminRest("/rest/v1/v1_practical_events", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ assignment_id: f.assignment_id, pack_id: f.pack_id, actor_user_id: who.session.user.id, event_type: "file_download_authorised", metadata: { fileId: f.id, sha256: f.sha256, kind: f.kind } }) });
  if (!audit.ok) throw new Error("AUDIT_UNAVAILABLE");
  return new Response(r.body, { headers: { "content-type": f.mime_type, "content-disposition": `attachment; filename="${safeFilename(f.original_filename)}"`, "cache-control": "private, no-store", "x-content-type-options": "nosniff", "x-apgi-evidence-sha256": f.sha256 || "", "content-security-policy": "default-src 'none'; sandbox" } });
}

const MESSAGES: Record<string, string> = {
 UNAUTHENTICATED: "Please sign in again.", FORBIDDEN: "You do not have permission for this action.", NOT_FOUND: "This assessment record is not available to you.",
 ACTIVE_ENROLMENT_REQUIRED: "An active Scannex enrolment is required.", STALE_VERSION: "This draft changed in another tab. Reload before continuing; your unsaved text has not been submitted.",
 ASSIGNMENT_LOCKED: "This assignment is locked. Reload to see its latest status.", PACK_LOCKED: "Approved case packs cannot be edited. Create a new version.",
 UNVERIFIED_CASE_SET: "Complete and verify all three source images, reference findings and clarity criteria before approval.",
 LEARNING_NOT_COMPLETE: "Complete LU1–LU8 before starting the assignment.", CURRENT_THEORY_REQUIRED: "A theory result for this course attempt is required before the final decision.",
 PASS_RULE_NOT_MET: "A pass requires at least 75/100 overall and no unresolved material safety concern.", INCOMPLETE_SUBMISSION: "Complete the worksheet and provide the required evidence for each image.",
 SIGNATURE_REQUIRED: "Enter your full profile/certificate name and accept the integrity declaration.", INVALID_RUBRIC: "Enter a whole-number mark within every rubric limit.",
 EVIDENCE_REVIEW_REQUIRED: "The assessor must review the actual evidence before recording a final decision.", UPLOAD_LIMIT: "The assignment upload allowance has been reached. Contact APGI.",
 FILE_NOT_ALLOWED: "Use an allowed file type within the displayed size limit.", FILE_SIZE_MISMATCH: "The uploaded file size did not match. Please upload it again.",
 FILE_CONTENT_MISMATCH: "The file contents do not match the declared type or size.", WRONG_COURSE_ATTEMPT: "This assignment belongs to an earlier course attempt.",
 BOOKING_NOT_AVAILABLE: "Choose an open Scannex assessment booking that has not already been assigned.", REVIEW_REQUIRED: "Record a decision and review notes.",
 APPROVAL_REQUIRED: "Explicitly approve the booking before assigning a verified case pack.", BODY_TOO_LARGE: "This request is too large. Upload evidence using the file controls.",
 INVALID_WORKSHEET: "Some worksheet values are invalid. Reload or contact APGI if this continues."
};
export function practicalError(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  return Response.json({ error: MESSAGES[code] || "The action could not be confirmed safely. Retry or contact APGI; no result has been awarded." },
    { status: code === "UNAUTHENTICATED" ? 401 : code === "FORBIDDEN" ? 403 : code === "NOT_FOUND" ? 404 : code === "STALE_VERSION" ? 409 : 400, headers: { "cache-control": "no-store" } });
}
export async function requestBody(request: Request) {
  const origin = request.headers.get("origin"), target = new URL(request.url);
  const expectedOrigin = `${target.protocol}//${request.headers.get("host") ?? target.host}`;
  if (!origin || origin !== expectedOrigin) throw new Error("FORBIDDEN");
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new Error("INVALID_WORKSHEET");
  const reader = request.body?.getReader(); if (!reader) throw new Error("INVALID_WORKSHEET");
  const chunks: Uint8Array[] = []; let length = 0;
  try { for (;;) { const { done, value } = await reader.read(); if (done) break; length += value.length; if (length > 512000) throw new Error("BODY_TOO_LARGE"); chunks.push(value); } }
  finally { await reader.cancel().catch(() => {}); }
  return object(JSON.parse(Buffer.concat(chunks).toString("utf8")));
}
