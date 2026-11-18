"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { SCANNEX_COURSE_ID } from "@/lib/course-benefits";
import { benefitError, benefitRpc, getOwnedCertificate, requireScannexLearner, writeBenefitEvent } from "@/server/services/course-benefits";
import { clearCookieCourseProgress } from "@/server/progress/progress-cookie";

export type BenefitActionState = { error?: string; message?: string; href?: string };
const coursePath = `/learn/${SCANNEX_COURSE_ID}`;

export async function courseBenefitAction(_previous: BenefitActionState, form: FormData): Promise<BenefitActionState> {
  const session = await requireScannexLearner();
  try {
    switch (form.get("operation")) {
      case "certificate": {
        const kind = form.get("kind");
        if (kind !== "attendance" && kind !== "passed") return { error: "Choose a valid certificate." };
        const id = await benefitRpc<string>("v1_issue_certificate", { p_user: session.user.id, p_kind: kind });
        revalidatePath(coursePath);
        return { message: "Your certificate is ready. Open it to print or save as PDF.", href: `${coursePath}/certificates/${id}` };
      }
      case "redo": {
        if (form.get("acknowledge") !== "on") return { error: "Please confirm that your current learning state will be archived and reset for the new attempt." };
        const attempt = Number(form.get("attempt"));
        if (!Number.isSafeInteger(attempt) || attempt < 1) return { error: "Reload the course page." };
        await benefitRpc("v1_begin_redo", { p_user: session.user.id, p_expected_attempt: attempt });
        await clearCookieCourseProgress({ userId: session.user.id, courseId: SCANNEX_COURSE_ID });
        revalidatePath(coursePath, "layout");
        return { message: "Your new course attempt is ready. Previous results and certificates are preserved.", href: coursePath };
      }
      case "request":
        await benefitRpc("v1_request_retake", { p_user: session.user.id, p_note: String(form.get("note") ?? "").slice(0, 2000) });
        revalidatePath(coursePath);
        revalidatePath("/admin/assessments");
        return { message: "Your request has been sent to the APGI assessment register. APGI will consider the terms of your next attempt. No payment has been taken." };
      default: return { error: "Choose an available course action." };
    }
  } catch (error) { return { error: benefitError(error) }; }
}

export async function reviewRetakeAction(_previous: BenefitActionState, form: FormData): Promise<BenefitActionState> {
  const { session } = await requireAdmin();
  const id = String(form.get("requestId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: "Choose a valid request." };
  try {
    await benefitRpc("v1_review_retake", { p_actor: session.user.id, p_request: id, p_approve: form.get("decision") === "approved", p_note: String(form.get("note") ?? "").slice(0, 2000) });
    revalidatePath("/admin/assessments"); revalidatePath(coursePath);
    return { message: "APGI decision recorded. Approval permits one additional attempt; it does not collect payment." };
  } catch (error) { return { error: benefitError(error) }; }
}

export async function recordCertificatePrint(id: string): Promise<BenefitActionState> {
  const session = await requireScannexLearner();
  try {
    const certificate = await getOwnedCertificate(session.user.id, id);
    if (!certificate) return { error: "This certificate is unavailable." };
    await writeBenefitEvent(session.user.id, "certificate_print_requested", { certificateId: certificate.id, kind: certificate.kind });
    return { message: "Print request recorded." };
  } catch (error) { return { error: benefitError(error) }; }
}
