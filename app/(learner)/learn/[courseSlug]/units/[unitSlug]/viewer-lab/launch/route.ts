import { NextResponse, type NextRequest } from "next/server";
import { getCourseBySlug } from "@/lib/courses";
import { getCourseAccess } from "@/lib/services/enrolments/get-course-access";
import { createViewerLabSession } from "@/lib/services/viewer-lab/create-viewer-lab-session";
import { getViewerLabConfig } from "@/lib/services/viewer-lab/viewer-lab-config";
import { getCurrentSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    courseSlug: string;
    unitSlug: string;
  }>;
};

function viewerLabPageUrl(request: NextRequest, courseSlug: string, unitSlug: string, status: string) {
  return new URL(
    `/learn/${encodeURIComponent(courseSlug)}/units/${encodeURIComponent(unitSlug)}/viewer-lab?status=${encodeURIComponent(status)}`,
    request.url
  );
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.redirect(new URL("/alp-sign-in", request.url), 303);
  }

  const { courseSlug, unitSlug } = await params;
  const course = getCourseBySlug(courseSlug);
  const unit = course?.units.find((candidate) => candidate.slug === unitSlug);

  if (!course || !unit || course.slug !== "scannex-training-programme" || unit.slug !== "lu6") {
    return NextResponse.json({ error: "Viewer Lab is not available for this learning unit." }, { status: 404 });
  }

  const access = await getCourseAccess({
    accessToken: session.accessToken,
    userId: session.user.id,
    userEmail: session.user.email,
    courseId: course.id
  });

  if (!access.canAccess) {
    return NextResponse.redirect(viewerLabPageUrl(request, courseSlug, unitSlug, "access-denied"), 303);
  }

  const config = getViewerLabConfig();

  if (!config) {
    return NextResponse.redirect(viewerLabPageUrl(request, courseSlug, unitSlug, "not-configured"), 303);
  }

  try {
    const viewerSession = await createViewerLabSession({
      config,
      learnerId: session.user.id,
      courseSlug,
      unitSlug
    });

    console.info("viewer_lab_session_created", {
      learnerId: session.user.id,
      courseSlug,
      unitSlug,
      expiresAt: viewerSession.expiresAt?.toISOString()
    });

    return NextResponse.redirect(viewerSession.streamingUrl, 303);
  } catch (error) {
    console.error("viewer_lab_session_failed", {
      learnerId: session.user.id,
      courseSlug,
      unitSlug,
      error: error instanceof Error ? error.name : "UnknownError"
    });

    return NextResponse.redirect(viewerLabPageUrl(request, courseSlug, unitSlug, "unavailable"), 303);
  }
}
