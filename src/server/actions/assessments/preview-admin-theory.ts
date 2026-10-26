"use server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getScannexTheoryQuestions, hasAnswerForEveryScannexTheoryQuestion, scoreScannexTheoryAssessment } from "@/server/assessments/scannex-theory-bank";
import type { ScannexTheoryActionState } from "./submit-scannex-theory-attempt";
import type { ScannexTheoryAnswerState } from "@/types/scannex-assessment";

export async function previewAdminTheory(_: ScannexTheoryActionState, form: FormData): Promise<ScannexTheoryActionState> {
  await requireAdmin();
  try {
    if (form.get("courseSlug") !== "scannex-training-programme") throw Error("This assessment is unavailable.");
    const raw = String(form.get("answers") ?? "");
    if (raw.length > 30000) throw Error("Invalid answers.");
    const answers = JSON.parse(raw) as ScannexTheoryAnswerState;
    if (!answers || typeof answers !== "object" || Array.isArray(answers) || Object.values(answers).some(a => !Array.isArray(a) || a.some(v => typeof v !== "string")) || !hasAnswerForEveryScannexTheoryQuestion(answers)) throw Error(`Answer all ${getScannexTheoryQuestions().length} questions before submitting.`);
    return { ...scoreScannexTheoryAssessment(answers), message: "Preview checked. No learner attempt, grade or certificate was recorded." };
  } catch (error) { return { error: error instanceof Error ? error.message : "Preview could not be checked." }; }
}
