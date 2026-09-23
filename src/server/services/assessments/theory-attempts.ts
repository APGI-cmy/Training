import "server-only";

import { adminRest } from "@/server/supabase/admin-rest";

type TheoryAttemptRow = {
  id: string;
  score: number;
  max_score: number;
  passed: boolean;
  submitted_at: string;
};

export type TheoryAttemptSummary = {
  id: string;
  score: number;
  maxScore: number;
  passed: boolean;
  submittedAt: string;
};

export async function getLatestScannexTheoryAttempt(learnerId: string, courseId: string): Promise<TheoryAttemptSummary | null> {
  const response = await adminRest(
    `/rest/v1/assessment_theory_attempts?select=id,score,max_score,passed,submitted_at&learner_user_id=eq.${encodeURIComponent(learnerId)}&course_id=eq.${encodeURIComponent(courseId)}&assessment_version=eq.scannex-summative-v1&order=submitted_at.desc&limit=1`
  );

  if (!response.ok) return null;
  const row = ((await response.json()) as TheoryAttemptRow[])[0];
  if (!row?.id) return null;

  return {
    id: row.id,
    score: Number(row.score),
    maxScore: Number(row.max_score),
    passed: Boolean(row.passed),
    submittedAt: row.submitted_at
  };
}
