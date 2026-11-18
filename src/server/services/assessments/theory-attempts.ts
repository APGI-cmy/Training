import "server-only";
import { SCANNEX_THEORY_VERSION } from "@/server/assessments/scannex-theory-bank";

import { adminRest } from "@/server/supabase/admin-rest";
import { getBenefitState } from "@/server/services/course-benefits";

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

export async function getLatestScannexTheoryAttempt(learnerId: string, courseId: string, runId?: string | null): Promise<TheoryAttemptSummary | null> {
  let runFilter = "";
  if (courseId === "scannex-training-programme") {
    if (runId === undefined) {
      const state = await getBenefitState(learnerId);
      runFilter = state.runId ? (state.attemptNumber === 1 ? `&or=(v1_run_id.eq.${state.runId},v1_run_id.is.null)` : `&v1_run_id=eq.${state.runId}`) : "&v1_run_id=is.null";
    } else if (runId === null) runFilter = "&v1_run_id=is.null";
    else {
      const state = await getBenefitState(learnerId);
      runFilter = state.attemptNumber === 1 && state.runId === runId ? `&or=(v1_run_id.eq.${runId},v1_run_id.is.null)` : `&v1_run_id=eq.${runId}`;
    }
  }
  const response = await adminRest(
    `/rest/v1/assessment_theory_attempts?select=id,score,max_score,passed,submitted_at&learner_user_id=eq.${encodeURIComponent(learnerId)}&course_id=eq.${encodeURIComponent(courseId)}&assessment_version=eq.${encodeURIComponent(SCANNEX_THEORY_VERSION)}${runFilter}&order=submitted_at.desc&limit=1`
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
