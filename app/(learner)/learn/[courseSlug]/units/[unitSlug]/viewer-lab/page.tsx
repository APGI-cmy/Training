import Link from "next/link";
import { notFound } from "next/navigation";
import { CourseAccessDenied } from "@/components/course/CourseAccessDenied";
import { getCourseBySlug } from "@/lib/courses";
import { getCourseAccess } from "@/lib/services/enrolments/get-course-access";
import { requireSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    courseSlug: string;
    unitSlug: string;
  }>;
};

function getViewerLabUrl(): string | undefined {
  const configuredUrl = process.env.SCANNEX_VIEWER_LAB_URL?.trim();

  if (!configuredUrl) return undefined;

  try {
    const parsed = new URL(configuredUrl);
    return parsed.protocol === "https:" ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

export default async function ViewerLabPage({ params }: PageProps) {
  const session = await requireSession();
  const { courseSlug, unitSlug } = await params;
  const course = getCourseBySlug(courseSlug);
  const unit = course?.units.find((candidate) => candidate.slug === unitSlug);

  if (!course || !unit?.practicalAssessment) {
    notFound();
  }

  const access = await getCourseAccess({
    accessToken: session.accessToken,
    userId: session.user.id,
    userEmail: session.user.email,
    courseId: course.id
  });

  if (!access.canAccess) {
    return <CourseAccessDenied course={course} access={access} />;
  }

  const viewerLabUrl = getViewerLabUrl();

  return (
    <main>
      <section className="unit-masthead">
        <div className="content-inner">
          <Link className="back-link" href={`/learn/${course.slug}/units/${unit.slug}`}>
            Back to summative assessment
          </Link>
          <p className="eyebrow">Controlled practical environment</p>
          <h1>Scannex Viewer Lab</h1>
          <p>Complete the practical assessment in the genuine Scannex Viewer, hosted in an isolated Windows session.</p>
        </div>
      </section>

      <section className="content-band">
        <div className="content-inner">
          <section className="unit-resources" aria-labelledby="viewer-lab-session-heading">
            <p className="eyebrow">Assessment session</p>
            <h2 id="viewer-lab-session-heading">Your Viewer session</h2>
            {viewerLabUrl ? (
              <>
                <p>
                  Open the secure Viewer Lab in a new window. It runs the approved Windows application rather than a browser imitation of the Viewer.
                </p>
                <div className="button-row">
                  <a className="primary-button" href={viewerLabUrl} target="_blank" rel="noreferrer">
                    Launch Scannex Viewer Lab
                  </a>
                </div>
              </>
            ) : (
              <>
                <p>
                  The secure Windows Viewer host is being prepared. This assessment area is ready, but no remote application session is issued until the host, licensing and pilot controls are approved.
                </p>
                <p className="resource-status" role="status">
                  Your course progress is not marked complete merely by opening this page.
                </p>
              </>
            )}
          </section>

          <section className="unit-resources" aria-labelledby="viewer-lab-evidence-heading">
            <p className="eyebrow">Evidence and review</p>
            <h2 id="viewer-lab-evidence-heading">What is assessed</h2>
            <p>
              The assessor reviews the approved exercise result, the Viewer Movement Log and the marking rubric. A separate assessment record will hold the final decision and any remediation required.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
