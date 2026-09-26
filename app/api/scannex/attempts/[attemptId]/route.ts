import { NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth/session";
import { getCourseAccess } from "@/lib/services/enrolments/get-course-access";
import { SCANNEX_COURSE_ID } from "@/lib/assessments/automated-practical";
import { finalisePractical, getAttempt } from "@/server/services/assessments/automated-practical";

export const dynamic = "force-dynamic";
export async function GET(_request: Request, context: { params: Promise<{ attemptId: string }> }) {
  const headers = { "Cache-Control": "no-store" };
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401, headers });
  const access = await getCourseAccess({ accessToken: session.accessToken, userId: session.user.id, courseId: SCANNEX_COURSE_ID });
  if (!access.canAccess) return NextResponse.json({ error: "Active enrolment required." }, { status: 403, headers });
  const { attemptId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(attemptId)) return NextResponse.json({ error: "Invalid attempt." }, { status: 400, headers });
  try {
    const attempt = await getAttempt(attemptId, session.user.id);
    if (attempt.checklist_submitted_at && !attempt.completed_at) {
      await finalisePractical(attemptId);
    }
    const updated = await getAttempt(attemptId, session.user.id);
    // Never expose expected answers, collector nonces, artifacts or private case definitions.
    return NextResponse.json({ submitted: Boolean(updated.checklist_submitted_at), result: updated.result ? {
      status: updated.result.status, practicalScore: updated.result.practicalScore, practicalMaximum: 100,
      practicalContribution: updated.result.practicalContribution, theoryScore: updated.result.theoryScore,
      finalScore: updated.result.finalScore, safetyFailure: updated.result.safetyFailure,
    } : null }, { headers });
  } catch { return NextResponse.json({ error: "The attempt status is temporarily unavailable." }, { status: 503, headers }); }
}
