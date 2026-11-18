"use server";

import { revalidatePath } from "next/cache";
import { getCourseBySlug } from "@/lib/courses";
import {
  getScannexTheoryQuestions,
  hasAnswerForEveryScannexTheoryQuestion,
  scoreScannexTheoryAssessment,
  SCANNEX_THEORY_VERSION
} from "@/server/assessments/scannex-theory-bank";
import { requireSession } from "@/server/auth/session";
import { getCourseAccess } from "@/lib/services/enrolments/get-course-access";
import { benefitError, benefitRpc } from "@/server/services/course-benefits";
import type { ScannexTheoryAnswerState } from "@/types/scannex-assessment";

export type ScannexTheoryActionState = {
  error?: string;
  message?: string;
  score?: number;
  maxScore?: number;
  benchmarkMet?: boolean;
};

function parseAnswers(value: FormDataEntryValue | null): ScannexTheoryAnswerState | null {
  if (typeof value !== "string") return null;

  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

    return Object.fromEntries(
      Object.entries(parsed).flatMap(([questionId, selected]) => {
        if (!Array.isArray(selected) || selected.some((item) => typeof item !== "string")) return [];
        return [[questionId, selected]];
      })
    );
  } catch {
    return null;
  }
}

export async function submitScannexTheoryAttempt(
  _previous: ScannexTheoryActionState,
  formData: FormData
): Promise<ScannexTheoryActionState> {
  const session = await requireSession();
  const courseSlug = String(formData.get("courseSlug") ?? "");
  const course = getCourseBySlug(courseSlug);
  const answers = parseAnswers(formData.get("answers"));

  if (!course || course.id !== "scannex-training-programme" || !answers) {
    return { error: "The assessment could not be submitted. Please refresh the page and try again." };
  }

  const access = await getCourseAccess({ accessToken: session.accessToken, userId: session.user.id, userEmail: session.user.email, courseId: course.id });
  if (!access.canAccess) return { error: "An active Scannex enrolment is required to submit this assessment." };

  if (!hasAnswerForEveryScannexTheoryQuestion(answers)) {
    return { error: `Answer all ${getScannexTheoryQuestions().length} questions before submitting.` };
  }

  const result = scoreScannexTheoryAssessment(answers);
  const runId = String(formData.get("runId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(runId)) return { error: "Please reload the assessment to confirm your current course attempt." };
  try {
    await benefitRpc("v1_submit_theory", { p_user: session.user.id, p_run: runId,
      p_version: SCANNEX_THEORY_VERSION, p_answers: answers, p_score: result.score, p_passed: result.passed });
  } catch (error) { return { error: benefitError(error) }; }

  revalidatePath(`/learn/${course.slug}/units/lu9`);
  revalidatePath(`/learn/${course.slug}/units/lu9/knowledge`);
  return {
    message: "Your knowledge assessment has been recorded. Your practical assessment remains subject to assessor review.",
    score: result.score,
    maxScore: result.maxScore,
    benchmarkMet: result.passed
  };
}
