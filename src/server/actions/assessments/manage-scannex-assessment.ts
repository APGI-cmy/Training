"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getCourseBySlug } from "@/lib/courses";
import { adminRest } from "@/server/supabase/admin-rest";

export type AssessmentActionState = { ok?: boolean; error?: string; message?: string };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function clean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

async function isEnrolled(learnerId: string, courseId: string) {
  const response = await adminRest(`/rest/v1/course_enrolments?select=status&user_id=eq.${encodeURIComponent(learnerId)}&course_id=eq.${encodeURIComponent(courseId)}&status=eq.enrolled&limit=1`);
  return response.ok && ((await response.json()) as Array<{ status?: string }>).some((row) => row.status === "enrolled");
}

export async function createAssessmentBooking(_previous: AssessmentActionState, formData: FormData): Promise<AssessmentActionState> {
  const { session } = await requireAdmin();
  const learnerId = clean(formData.get("learnerId"));
  const courseId = clean(formData.get("courseId"));
  const scheduledFor = clean(formData.get("scheduledFor"));
  const stationLabel = clean(formData.get("stationLabel"));
  const notes = clean(formData.get("notes"));
  const approved = formData.get("approved") === "on";
  if (!uuidPattern.test(learnerId) || !getCourseBySlug(courseId)) return { error: "Choose an enrolled learner and course." };
  if (!(await isEnrolled(learnerId, courseId))) return { error: "This learner is not enrolled in the selected course." };
  if (scheduledFor && Number.isNaN(new Date(scheduledFor).getTime())) return { error: "Enter a valid assessment date and time." };

  const status = approved ? "approved" : "scheduled";
  const response = await adminRest("/rest/v1/assessment_bookings", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      learner_user_id: learnerId,
      course_id: courseId,
      status,
      scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
      station_label: stationLabel || null,
      approved_by: approved ? session.user.id : null,
      approved_at: approved ? new Date().toISOString() : null,
      created_by: session.user.id,
      notes: notes || null
    })
  });
  if (!response.ok) return { error: "The assessment booking could not be created." };
  const booking = ((await response.json()) as Array<{ id?: string; assessment_reference?: string }>)[0];
  if (!booking?.id || !booking.assessment_reference) return { error: "The assessment booking could not be created." };

  const event = await adminRest("/rest/v1/assessment_events", {
    method: "POST",
    body: JSON.stringify({ assessment_id: booking.id, event_type: "booked", actor_user_id: session.user.id, metadata: { status, station_label: stationLabel || null } })
  });
  if (!event.ok) return { error: "Booking created, but its audit record could not be saved. Do not use it until support confirms it." };
  if (approved) await adminRest("/rest/v1/assessment_events", { method: "POST", body: JSON.stringify({ assessment_id: booking.id, event_type: "approved", actor_user_id: session.user.id, metadata: {} }) });
  revalidatePath("/admin/assessments");
  return { ok: true, message: `Assessment ${booking.assessment_reference} created as ${status}.` };
}

export async function recordAssessmentEvidence(_previous: AssessmentActionState, formData: FormData): Promise<AssessmentActionState> {
  const { session } = await requireAdmin();
  const assessmentId = clean(formData.get("assessmentId"));
  const scannexResult = clean(formData.get("scannexResult"));
  const movementLog = clean(formData.get("movementLog"));
  const checklist = clean(formData.get("checklist"));
  const notes = clean(formData.get("assessorNotes"));
  const decision = clean(formData.get("decision"));
  if (!uuidPattern.test(assessmentId)) return { error: "Choose an assessment booking." };
  if (!scannexResult && !movementLog && !checklist) return { error: "Record at least one Scannex result, movement-log or checklist reference." };
  if (!["evidence_pending", "passed", "failed"].includes(decision)) return { error: "Choose an assessor decision." };

  const records = [
    scannexResult ? { evidence_type: "scannex_result", evidence_reference: scannexResult } : null,
    movementLog ? { evidence_type: "viewer_movement_log", evidence_reference: movementLog } : null,
    checklist ? { evidence_type: "assessor_checklist", evidence_reference: checklist } : null
  ].filter(Boolean).map((record) => ({ ...record, assessment_id: assessmentId, recorded_by: session.user.id, outcome_summary: { assessor_notes: notes || null, decision } }));
  const evidenceResponse = await adminRest("/rest/v1/assessment_evidence", { method: "POST", body: JSON.stringify(records) });
  if (!evidenceResponse.ok) return { error: "The assessment evidence could not be recorded." };

  const now = new Date().toISOString();
  const bookingResponse = await adminRest(`/rest/v1/assessment_bookings?id=eq.${encodeURIComponent(assessmentId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ status: decision, completed_at: decision === "evidence_pending" ? null : now, notes: notes || null })
  });
  if (!bookingResponse.ok) return { error: "Evidence was recorded, but the assessment decision could not be saved. Do not issue a completion result yet." };

  const eventResponse = await adminRest("/rest/v1/assessment_events", {
    method: "POST",
    body: JSON.stringify({ assessment_id: assessmentId, event_type: "evidence_recorded", actor_user_id: session.user.id, metadata: { decision, evidence_count: records.length, idempotency_key: `assessment-evidence:${assessmentId}:${randomUUID()}` } })
  });
  if (!eventResponse.ok) return { error: "Evidence was recorded, but its audit event could not be saved. Do not issue a completion result yet." };
  if (decision !== "evidence_pending") await adminRest("/rest/v1/assessment_events", { method: "POST", body: JSON.stringify({ assessment_id: assessmentId, event_type: "decision_recorded", actor_user_id: session.user.id, metadata: { decision } }) });
  revalidatePath("/admin/assessments");
  return { ok: true, message: "Assessment evidence and decision recorded." };
}
