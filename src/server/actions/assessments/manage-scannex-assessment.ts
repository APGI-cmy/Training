"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { requireAdmin } from "@/lib/auth/require-admin";
import { calculateScannexPracticalScore, SCANNEX_PRACTICAL_RUBRIC, SCANNEX_PRACTICAL_RUBRIC_VERSION, type ScannexPracticalScores } from "@/lib/assessments/scannex-practical-rubric";
import { getCourseBySlug } from "@/lib/courses";
import { SCANNEX_PRACTICAL_MAX_SCORE, SCANNEX_SUMMATIVE_PASS_MARK } from "@/server/assessments/scannex-theory-bank";
import { getLatestScannexTheoryAttempt } from "@/server/services/assessments/theory-attempts";
import { adminRest } from "@/server/supabase/admin-rest";

export type AssessmentActionState = { ok?: boolean; error?: string; message?: string };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function clean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

type PracticalRubricPayload = {
  trainerExerciseReference: string;
  scores: ScannexPracticalScores;
  rawScore: number;
  normalizedScore: number;
  materialSafetyConcern: boolean;
  safetyReviewNotes: string | null;
};

function parsePracticalRubric(formData: FormData): { payload: PracticalRubricPayload | null; error?: string } {
  const trainerExerciseReference = clean(formData.get("trainerExerciseReference"));
  const safetyReviewNotes = clean(formData.get("safetyReviewNotes"));
  const materialSafetyConcern = formData.get("materialSafetyConcern") === "on";
  const values = SCANNEX_PRACTICAL_RUBRIC.map((criterion) => ({ criterion, value: clean(formData.get(`practicalScore_${criterion.id}`)) }));
  const hasScores = values.some(({ value }) => value !== "");

  if (!hasScores) {
    if (trainerExerciseReference || materialSafetyConcern || safetyReviewNotes) {
      return { payload: null, error: "Enter every practical-rubric score when recording a Trainer exercise or safety review." };
    }
    return { payload: null };
  }
  if (!trainerExerciseReference) return { payload: null, error: "Enter the controlled Trainer exercise or case-set reference." };
  if (values.some(({ value }) => value === "")) return { payload: null, error: "Enter a score for every practical-rubric criterion." };

  const scores: ScannexPracticalScores = {};
  for (const { criterion, value } of values) {
    const score = Number(value);
    if (!Number.isInteger(score) || score < 0 || score > criterion.maximumScore) {
      return { payload: null, error: `Enter a whole-number score from 0 to ${criterion.maximumScore} for “${criterion.label}”.` };
    }
    scores[criterion.id] = score;
  }
  if (materialSafetyConcern && !safetyReviewNotes) {
    return { payload: null, error: "Record safety-review notes when a material safety or role-boundary concern is identified." };
  }
  const { rawScore, normalizedScore } = calculateScannexPracticalScore(scores);
  return {
    payload: {
      trainerExerciseReference,
      scores,
      rawScore,
      normalizedScore,
      materialSafetyConcern,
      safetyReviewNotes: materialSafetyConcern ? safetyReviewNotes : null
    }
  };
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
  const latestTheoryAttempt = await getLatestScannexTheoryAttempt(learnerId, courseId);
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
      notes: notes || null,
      theory_attempt_id: latestTheoryAttempt?.id ?? null,
      theory_score: latestTheoryAttempt?.score ?? null,
      theory_max_score: latestTheoryAttempt?.maxScore ?? 68
    })
  });
  if (!response.ok) return { error: "The assessment booking could not be created." };
  const booking = ((await response.json()) as Array<{ id?: string; assessment_reference?: string }>)[0];
  if (!booking?.id || !booking.assessment_reference) return { error: "The assessment booking could not be created." };

  const event = await adminRest("/rest/v1/assessment_events", {
    method: "POST",
    body: JSON.stringify({ assessment_id: booking.id, event_type: "booked", actor_user_id: session.user.id, metadata: { status, station_label: stationLabel || null, theory_attempt_id: latestTheoryAttempt?.id ?? null } })
  });
  if (!event.ok) return { error: "Booking created, but its audit record could not be saved. Do not use it until support confirms it." };
  if (approved) await adminRest("/rest/v1/assessment_events", { method: "POST", body: JSON.stringify({ assessment_id: booking.id, event_type: "approved", actor_user_id: session.user.id, metadata: {} }) });
  revalidatePath("/admin/assessments");
  return { ok: true, message: `Assessment ${booking.assessment_reference} created as ${status}.` };
}

type BookingRow = {
  learner_user_id?: string;
  course_id?: string;
  theory_attempt_id?: string | null;
  theory_score?: number | null;
  theory_max_score?: number | null;
  practical_rubric_score?: number | null;
};

type StoredPracticalRubricRow = {
  trainer_exercise_reference: string;
  raw_score: number;
  normalized_score: number;
  material_safety_concern: boolean;
  safety_review_notes: string | null;
};

export async function recordAssessmentEvidence(_previous: AssessmentActionState, formData: FormData): Promise<AssessmentActionState> {
  const { session } = await requireAdmin();
  const assessmentId = clean(formData.get("assessmentId"));
  const scannexResult = clean(formData.get("scannexResult"));
  const movementLog = clean(formData.get("movementLog"));
  const checklist = clean(formData.get("checklist"));
  const notes = clean(formData.get("assessorNotes"));
  const decision = clean(formData.get("decision"));
  if (!uuidPattern.test(assessmentId)) return { error: "Choose an assessment booking." };
  if (!["evidence_pending", "passed", "failed"].includes(decision)) return { error: "Choose an assessor decision." };
  const parsedPracticalRubric = parsePracticalRubric(formData);
  if (parsedPracticalRubric.error) return { error: parsedPracticalRubric.error };

  const bookingLookup = await adminRest(`/rest/v1/assessment_bookings?select=learner_user_id,course_id,theory_attempt_id,theory_score,theory_max_score,practical_rubric_score&id=eq.${encodeURIComponent(assessmentId)}&limit=1`);
  if (!bookingLookup.ok) return { error: "The assessment booking could not be found." };
  const booking = ((await bookingLookup.json()) as BookingRow[])[0];
  if (!booking?.learner_user_id || !booking.course_id) return { error: "The assessment booking could not be found." };

  const storedPracticalRubricResponse = await adminRest(`/rest/v1/assessment_practical_rubrics?select=trainer_exercise_reference,raw_score,normalized_score,material_safety_concern,safety_review_notes&assessment_id=eq.${encodeURIComponent(assessmentId)}&limit=1`);
  const storedPracticalRubric = storedPracticalRubricResponse.ok
    ? ((await storedPracticalRubricResponse.json()) as StoredPracticalRubricRow[])[0] ?? null
    : null;

  const existingEvidenceResponse = await adminRest(`/rest/v1/assessment_evidence?select=evidence_type&assessment_id=eq.${encodeURIComponent(assessmentId)}`);
  const existingEvidence = existingEvidenceResponse.ok ? (await existingEvidenceResponse.json()) as Array<{ evidence_type?: string }> : [];
  const evidenceTypes = new Set(existingEvidence.map((item) => item.evidence_type));
  if (scannexResult) evidenceTypes.add("scannex_result");
  if (movementLog) evidenceTypes.add("viewer_movement_log");
  if (checklist) evidenceTypes.add("assessor_checklist");

  if (decision !== "passed" && !scannexResult && !movementLog && !checklist && !parsedPracticalRubric.payload) {
    return { error: "Record evidence, a practical score, or select Passed only after the complete evidence set is already recorded." };
  }

  const latestTheoryAttempt = await getLatestScannexTheoryAttempt(booking.learner_user_id, booking.course_id)
    ?? (booking.theory_attempt_id && booking.theory_score != null
      ? { id: booking.theory_attempt_id, score: Number(booking.theory_score), maxScore: Number(booking.theory_max_score ?? 68) }
      : null);
  const effectivePracticalScore = parsedPracticalRubric.payload?.normalizedScore
    ?? (storedPracticalRubric ? Number(storedPracticalRubric.normalized_score) : (booking.practical_rubric_score == null ? null : Number(booking.practical_rubric_score)));
  const practicalConvertedScore = effectivePracticalScore === null ? null : Math.round((effectivePracticalScore / 100) * SCANNEX_PRACTICAL_MAX_SCORE * 100) / 100;
  const finalScore = latestTheoryAttempt && practicalConvertedScore !== null
    ? Math.round((latestTheoryAttempt.score + practicalConvertedScore) * 100) / 100
    : null;
  const materialSafetyConcern = parsedPracticalRubric.payload?.materialSafetyConcern ?? storedPracticalRubric?.material_safety_concern ?? false;
  const hasPracticalRubric = Boolean(parsedPracticalRubric.payload || storedPracticalRubric);

  if (decision === "passed") {
    const requiredEvidence = ["scannex_result", "viewer_movement_log", "assessor_checklist"];
    if (requiredEvidence.some((type) => !evidenceTypes.has(type))) {
      return { error: "A pass decision requires the saved Scannex result, Viewer Movement Log and assessor checklist." };
    }
    if (!latestTheoryAttempt || !hasPracticalRubric || effectivePracticalScore === null || finalScore === null) {
      return { error: "A pass decision requires a recorded theory result and the completed detailed practical rubric." };
    }
    if (materialSafetyConcern) return { error: "A pass cannot be recorded while a material safety or role-boundary concern requires review." };
    if (finalScore < SCANNEX_SUMMATIVE_PASS_MARK) {
      return { error: `The calculated final score is ${finalScore}/100. A pass requires ${SCANNEX_SUMMATIVE_PASS_MARK}/100 or above.` };
    }
  }

  const records = [
    scannexResult ? { evidence_type: "scannex_result", evidence_reference: scannexResult } : null,
    movementLog ? { evidence_type: "viewer_movement_log", evidence_reference: movementLog } : null,
    checklist ? { evidence_type: "assessor_checklist", evidence_reference: checklist } : null
  ].filter(Boolean).map((record) => ({ ...record, assessment_id: assessmentId, recorded_by: session.user.id, outcome_summary: { assessor_notes: notes || null, decision } }));
  if (records.length) {
    const evidenceResponse = await adminRest("/rest/v1/assessment_evidence", { method: "POST", body: JSON.stringify(records) });
    if (!evidenceResponse.ok) return { error: "The assessment evidence could not be recorded." };
  }

  if (parsedPracticalRubric.payload) {
    const rubricResponse = await adminRest("/rest/v1/assessment_practical_rubrics?on_conflict=assessment_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        assessment_id: assessmentId,
        rubric_version: SCANNEX_PRACTICAL_RUBRIC_VERSION,
        trainer_exercise_reference: parsedPracticalRubric.payload.trainerExerciseReference,
        item_scores: parsedPracticalRubric.payload.scores,
        raw_score: parsedPracticalRubric.payload.rawScore,
        normalized_score: parsedPracticalRubric.payload.normalizedScore,
        material_safety_concern: parsedPracticalRubric.payload.materialSafetyConcern,
        safety_review_notes: parsedPracticalRubric.payload.safetyReviewNotes,
        assessed_by: session.user.id,
        assessed_at: new Date().toISOString()
      })
    });
    if (!rubricResponse.ok) return { error: "The practical rubric could not be recorded. Do not issue a completion result yet." };
  }

  const now = new Date().toISOString();
  const bookingResponse = await adminRest(`/rest/v1/assessment_bookings?id=eq.${encodeURIComponent(assessmentId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      status: decision,
      completed_at: decision === "evidence_pending" ? null : now,
      notes: notes || null,
      theory_attempt_id: latestTheoryAttempt?.id ?? null,
      theory_score: latestTheoryAttempt?.score ?? null,
      theory_max_score: latestTheoryAttempt?.maxScore ?? 68,
      practical_rubric_score: effectivePracticalScore,
      practical_converted_score: practicalConvertedScore,
      final_score: finalScore
    })
  });
  if (!bookingResponse.ok) return { error: "Evidence was recorded, but the assessment decision could not be saved. Do not issue a completion result yet." };

  const eventResponse = await adminRest("/rest/v1/assessment_events", {
    method: "POST",
    body: JSON.stringify({ assessment_id: assessmentId, event_type: "evidence_recorded", actor_user_id: session.user.id, metadata: { decision, evidence_count: records.length, theory_score: latestTheoryAttempt?.score ?? null, practical_rubric_score: effectivePracticalScore, practical_converted_score: practicalConvertedScore, final_score: finalScore, idempotency_key: `assessment-evidence:${assessmentId}:${randomUUID()}` } })
  });
  if (!eventResponse.ok) return { error: "Evidence was recorded, but its audit event could not be saved. Do not issue a completion result yet." };
  if (parsedPracticalRubric.payload) await adminRest("/rest/v1/assessment_events", {
    method: "POST",
    body: JSON.stringify({ assessment_id: assessmentId, event_type: "practical_rubric_recorded", actor_user_id: session.user.id, metadata: { rubric_version: SCANNEX_PRACTICAL_RUBRIC_VERSION, trainer_exercise_reference: parsedPracticalRubric.payload.trainerExerciseReference, raw_score: parsedPracticalRubric.payload.rawScore, normalized_score: parsedPracticalRubric.payload.normalizedScore, material_safety_concern: parsedPracticalRubric.payload.materialSafetyConcern } })
  });
  if (decision !== "evidence_pending") await adminRest("/rest/v1/assessment_events", { method: "POST", body: JSON.stringify({ assessment_id: assessmentId, event_type: "decision_recorded", actor_user_id: session.user.id, metadata: { decision, final_score: finalScore } }) });
  revalidatePath("/admin/assessments");
  revalidatePath("/learn/scannex-training-programme/units/lu9");
  return { ok: true, message: finalScore === null ? "Assessment evidence and decision recorded." : `Assessment evidence and decision recorded. Calculated final score: ${finalScore}/100.` };
}
