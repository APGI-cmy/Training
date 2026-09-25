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
import { adminRest } from "@/server/supabase/admin-rest";
import type { ScannexTheoryAnswerState } from "@/types/scannex-assessment";
import { getCourseAccess } from "@/lib/services/enrolments/get-course-access";

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

  if (!hasAnswerForEveryScannexTheoryQuestion(answers)) {
    return { error: `Answer all ${getScannexTheoryQuestions().length} questions before submitting.` };
  }

  const access = await getCourseAccess({ accessToken: session.accessToken, userId: session.user.id, courseId: course.id });
  if (!access.canAccess) return { error: "An active course enrolment is required to submit this assessment." };

  const result = scoreScannexTheoryAssessment(answers);
  const response = await adminRest("/rest/v1/assessment_theory_attempts", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      learner_user_id: session.user.id,
      course_id: course.id,
      assessment_version: SCANNEX_THEORY_VERSION,
      submitted_answers: answers,
      score: result.score,
      max_score: result.maxScore,
      passed: result.passed
    })
  });

  if (!response.ok) {
    return { error: "Your assessment could not be recorded. Your answers have not been accepted; please try again." };
  }

  revalidatePath(`/learn/${course.slug}/units/lu9`);
  revalidatePath(`/learn/${course.slug}/units/lu9/knowledge`);
  return {
    message: "Your knowledge assessment has been recorded. Complete your approved practical assessment to receive your final summative result.",
    score: result.score,
    maxScore: result.maxScore,
    benchmarkMet: result.passed
  };
}
