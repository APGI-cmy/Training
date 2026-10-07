import { NextResponse } from "next/server";
import { getCourseBySlug } from "@/lib/courses";
import { getCourseAccess } from "@/lib/services/enrolments/get-course-access";
import { getViewerLabConfig } from "@/lib/services/viewer-lab/viewer-lab-config";
import {
  evaluateViewerLabAvailability,
  getViewerLabCostSummary,
  getViewerLabSettings,
  SCANNEX_COURSE_ID
} from "@/lib/services/viewer-lab/viewer-lab-settings";
import { warmViewerLab } from "@/lib/services/viewer-lab/warm-viewer-lab";
import { getCurrentSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ courseSlug: string; unitSlug: string }> }) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ status: "unavailable", message: "Sign in again before preparing the Viewer." }, { status: 401 });
  const { courseSlug, unitSlug } = await params;
  const course = getCourseBySlug(courseSlug);
  if (!course || courseSlug !== SCANNEX_COURSE_ID || !course.units.some((unit) => unit.slug === unitSlug)) {
    return NextResponse.json({ status: "unavailable", message: "The Viewer is not part of this learning unit." }, { status: 404 });
  }
  const access = await getCourseAccess({ accessToken: session.accessToken, userId: session.user.id, userEmail: session.user.email, courseId: course.id });
  if (!access.canAccess) return NextResponse.json({ status: "unavailable", message: "An active Scannex enrolment is required before the Viewer can be prepared." }, { status: 403 });

  const settings = await getViewerLabSettings();
  const availability = evaluateViewerLabAvailability(settings, unitSlug);
  if (!availability.canLaunch) return NextResponse.json({ status: "unavailable", message: availability.message }, { status: 409 });
  const config = getViewerLabConfig();
  if (!config) return NextResponse.json({ status: "unavailable", message: "The hosted Viewer is still being prepared by the training administrator." }, { status: 503 });
  const summary = await getViewerLabCostSummary(settings);
  return NextResponse.json(await warmViewerLab({ config, desiredCapacity: summary.recommendedCapacity, warmupMinutes: settings.warmupMinutes }));
}
