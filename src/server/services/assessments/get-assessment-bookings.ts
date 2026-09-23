import "server-only";

import { requireAdmin } from "@/lib/auth/require-admin";
import { getCourseBySlug } from "@/lib/courses";
import { adminRest } from "@/server/supabase/admin-rest";

type BookingRow = {
  id: string;
  assessment_reference: string;
  learner_user_id: string;
  course_id: string;
  status: string;
  scheduled_for: string | null;
  station_label: string | null;
  theory_score: number | null;
  theory_max_score: number | null;
  practical_rubric_score: number | null;
  practical_converted_score: number | null;
  final_score: number | null;
  created_at: string;
};
type ProfileRow = { user_id: string; email: string | null; full_name: string | null; preferred_name: string | null };
type EvidenceRow = { assessment_id: string; evidence_type: string; evidence_reference: string; recorded_at: string };

export type AssessmentBooking = {
  id: string;
  reference: string;
  learnerId: string;
  learnerName: string;
  learnerEmail: string;
  courseTitle: string;
  status: string;
  scheduledFor: string | null;
  stationLabel: string | null;
  theoryScore: number | null;
  theoryMaxScore: number | null;
  practicalRubricScore: number | null;
  practicalConvertedScore: number | null;
  finalScore: number | null;
  evidence: Array<{ type: string; reference: string; recordedAt: string }>;
};

export async function getAssessmentBookings(): Promise<AssessmentBooking[]> {
  await requireAdmin();
  const bookingsResponse = await adminRest("/rest/v1/assessment_bookings?select=id,assessment_reference,learner_user_id,course_id,status,scheduled_for,station_label,theory_score,theory_max_score,practical_rubric_score,practical_converted_score,final_score,created_at&order=created_at.desc&limit=100");
  if (!bookingsResponse.ok) return [];
  const bookings = (await bookingsResponse.json()) as BookingRow[];
  if (!bookings.length) return [];

  const learnerIds = [...new Set(bookings.map((booking) => booking.learner_user_id))];
  const [profilesResponse, evidenceResponse] = await Promise.all([
    adminRest(`/rest/v1/profiles?select=user_id,email,full_name,preferred_name&user_id=in.(${learnerIds.join(",")})`),
    adminRest(`/rest/v1/assessment_evidence?select=assessment_id,evidence_type,evidence_reference,recorded_at&assessment_id=in.(${bookings.map((booking) => booking.id).join(",")})&order=recorded_at.desc`)
  ]);
  const profiles = profilesResponse.ok ? (await profilesResponse.json()) as ProfileRow[] : [];
  const evidence = evidenceResponse.ok ? (await evidenceResponse.json()) as EvidenceRow[] : [];
  const profilesById = new Map(profiles.map((profile) => [profile.user_id, profile]));
  const evidenceByBooking = new Map<string, EvidenceRow[]>();
  for (const entry of evidence) evidenceByBooking.set(entry.assessment_id, [...(evidenceByBooking.get(entry.assessment_id) ?? []), entry]);

  return bookings.map((booking) => {
    const profile = profilesById.get(booking.learner_user_id);
    return {
      id: booking.id,
      reference: booking.assessment_reference,
      learnerId: booking.learner_user_id,
      learnerName: profile?.preferred_name || profile?.full_name || "Learner profile incomplete",
      learnerEmail: profile?.email || "Email unavailable",
      courseTitle: getCourseBySlug(booking.course_id)?.title ?? booking.course_id,
      status: booking.status,
      scheduledFor: booking.scheduled_for,
      stationLabel: booking.station_label,
      theoryScore: booking.theory_score === null ? null : Number(booking.theory_score),
      theoryMaxScore: booking.theory_max_score === null ? null : Number(booking.theory_max_score),
      practicalRubricScore: booking.practical_rubric_score === null ? null : Number(booking.practical_rubric_score),
      practicalConvertedScore: booking.practical_converted_score === null ? null : Number(booking.practical_converted_score),
      finalScore: booking.final_score === null ? null : Number(booking.final_score),
      evidence: (evidenceByBooking.get(booking.id) ?? []).map((entry) => ({ type: entry.evidence_type, reference: entry.evidence_reference, recordedAt: entry.recorded_at }))
    };
  });
}
