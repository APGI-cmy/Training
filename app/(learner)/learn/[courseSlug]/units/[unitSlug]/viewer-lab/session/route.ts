import { NextResponse } from "next/server";
import { getCourseBySlug } from "@/lib/courses";
import { getCourseAccess } from "@/lib/services/enrolments/get-course-access";
import { getViewerSessionStatus } from "@/lib/services/viewer-lab/get-viewer-session-status";
import { getCurrentSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ courseSlug: string; unitSlug: string }> }) {
  const session = await getCurrentSession();
  const headers = { "Cache-Control": "private, no-store" };
  if (!session) return NextResponse.json({ error: "Sign in to check your session." }, { status: 401, headers });
  const { courseSlug, unitSlug } = await params;
  const course = getCourseBySlug(courseSlug);
  const unit = course?.units.find((candidate) => candidate.slug === unitSlug || candidate.legacySlug === unitSlug);
  if (!course || course.id !== "scannex-training-programme" || !unit) return NextResponse.json({ error: "Unit not found." }, { status: 404, headers });
  const access = await getCourseAccess({ accessToken: session.accessToken, userId: session.user.id, userEmail: session.user.email, courseId: course.id });
  if (!access.canAccess) return NextResponse.json({ error: "Active enrolment required." }, { status: 403, headers });
  return NextResponse.json(await getViewerSessionStatus(session.user.id, unit.slug), { headers });
}
