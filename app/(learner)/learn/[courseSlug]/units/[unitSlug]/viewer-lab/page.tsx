import Link from "next/link";
import { notFound } from "next/navigation";
import { CourseAccessDenied } from "@/components/course/CourseAccessDenied";
import { ViewerPracticeGuide, ViewerStreamingNotice } from "@/components/course/ViewerPracticeGuide";
import { ViewerUnitAccess } from "@/components/course/ViewerUnitAccess";
import { getCourseBySlug } from "@/lib/courses";
import { getCourseAccess } from "@/lib/services/enrolments/get-course-access";
import { isViewerLabConfigured } from "@/lib/services/viewer-lab/viewer-lab-config";
import { evaluateViewerLabAvailability, getViewerLabSettings, SCANNEX_COURSE_ID } from "@/lib/services/viewer-lab/viewer-lab-settings";
import { getUserRoles, requireSession } from "@/server/auth/session";
import { getCourseResume } from "@/lib/services/progress/get-course-resume";
import { viewerReturnPath } from "@/lib/services/viewer-lab/viewer-return-path";
import { PracticalAssignment } from "@/components/assessment/PracticalAssignment";
import { ScannexHostedPilot } from "@/components/assessment/ScannexHostedPilot";
import { isHostedPilotDeployment, isScannexHostedPilot } from "@/lib/assessments/scannex-hosted-pilot";
import { devPilotStreamingRole } from "@/server/services/scannex-pilot-stream";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    courseSlug: string;
    unitSlug: string;
  }>;
  searchParams: Promise<{
    status?: string;
    returnTo?: string;
  }>;
};

const statusMessages: Record<string, string> = {
  "access-denied": "Your active Scannex enrolment could not be confirmed. Return to My Learning or contact the training administrator.",
  "not-configured": "The hosted Viewer is still being prepared. Your course progress has not been changed.",
  unavailable: "The Viewer could not be started. Please wait a moment and try again, or contact the training administrator.",
  disabled: "The Scannex Viewer has been temporarily disabled by the training administrator.",
  "not-open": "The Scannex Viewer access window has not opened yet.",
  closed: "The Scannex Viewer access window has closed. Contact the training administrator if you require an extension."
};

export default async function ViewerLabPage({ params, searchParams }: PageProps) {
  const session = await requireSession();
  const { courseSlug, unitSlug } = await params;
  const { status, returnTo } = await searchParams;
  const course = getCourseBySlug(courseSlug);
  const unit = course?.units.find((candidate) => candidate.slug === unitSlug);
  const settings = await getViewerLabSettings();
  const availability = unit ? evaluateViewerLabAvailability(settings, unit.slug) : undefined;
  const isPracticeLab = course?.slug === SCANNEX_COURSE_ID && Boolean(availability?.appliesToUnit);
  const isSummativeLab = Boolean(unit?.practicalAssessment);

  if (!course || !unit || (!isPracticeLab && !isSummativeLab)) {
    notFound();
  }
  const resume = await getCourseResume(session.accessToken, session.user.id, course.slug);
  const returnHref = viewerReturnPath(course.slug, returnTo) ?? resume?.href ?? `/learn/${course.slug}/units/${unit.slug}`;

  const access = await getCourseAccess({
    accessToken: session.accessToken,
    userId: session.user.id,
    userEmail: session.user.email,
    courseId: course.id
  });

  if (!access.canAccess) {
    return <CourseAccessDenied course={course} access={access} />;
  }

  if (isSummativeLab && course.slug === SCANNEX_COURSE_ID && unit.slug === "lu9"
      && isHostedPilotDeployment(process.env)) {
    const allowed = isScannexHostedPilot({
      environment: process.env.VERCEL_ENV, enabled: process.env.SCANNEX_V1_IMAGE78_PILOT,
      operator: process.env.SCANNEX_V1_PILOT_OPERATOR, authenticatedEmail: session.user.email,
      roles: await getUserRoles(session.accessToken), course: course.slug, unit: unit.slug,
    });
    if (!allowed) notFound();
    return <main>
      <section className="unit-masthead">
        <div className="content-inner">
          <Link className="back-link" href={`/learn/${course.slug}/units/${unit.slug}`}>Back to summative assessment</Link>
          <p className="eyebrow">Private V1 preview</p>
          <h1>Scannex Practical Assessment</h1>
          <p>Test the redesigned learner workflow using one ungraded exercise in the development Viewer.</p>
        </div>
      </section>
      <section className="content-band"><div className="content-inner"><ScannexHostedPilot automaticLaunchConfigured={Boolean(devPilotStreamingRole())} /></div></section>
    </main>;
  }

  if (isPracticeLab) {
    const configured = isViewerLabConfigured() && Boolean(availability?.canLaunch);
    const message = status ? statusMessages[status] : availability?.canLaunch ? undefined : availability?.message;
    const nextUnit = course.units[course.units.findIndex((candidate) => candidate.slug === unit.slug) + 1];
    const keepSession = Boolean(nextUnit && evaluateViewerLabAvailability(settings, nextUnit.slug).canLaunch);

    return (
      <main>
        <section className="unit-masthead">
          <div className="content-inner">
            <Link className="back-link" href={returnHref}>
              Return to your learning activity
            </Link>
            <p className="eyebrow">Hosted practice environment</p>
            <h1>Scannex Viewer Lab</h1>
            <div className="button-row">
              <a className="primary-button" href={returnHref}>Return to training — keep Viewer open</a>
              <a className="secondary-button" href={`/learn/${course.slug}`}>Course progress &amp; all learning units</a>
              {resume ? <a className="secondary-button" href={resume.href}>Resume last saved activity</a> : null}
            </div>
            <p>Switch back to the training tab or use these links at any time. You do not need to end your AWS session to open another learning unit.</p>
            <p>Practise the controls covered in Learning Unit {unit.order} in the genuine Scannex Viewer using an isolated training session.</p>
          </div>
        </section>

        <section className="content-band">
          <div className="content-inner">
            <section className="unit-resources" aria-labelledby="viewer-lab-practice-heading">
              <p className="eyebrow">Training practice only</p>
              <h2 id="viewer-lab-practice-heading">Open the Viewer in a separate window</h2>
              <p>
                The Viewer opens in its own secure browser window. You can move that window to a second screen and keep the learning activity visible on your first screen.
              </p>
              <ol>
                <li>Allow pop-ups for the APGI Training Platform if your browser asks.</li>
                <li>Open the Viewer with the button below. You can move its window to a second screen.</li>
                <li>Follow the connection, practice and session-ending instructions on this page.</li>
              </ol>
              <ViewerStreamingNotice />
              <p className="resource-status" role="status">
                This practice session does not record a score, pass you, or complete the learning unit.
              </p>
              {message ? <aside className="app-toast app-toast--warning app-toast--inline" role="alert"><div><strong>Viewer unavailable</strong><p>{message}</p></div></aside> : null}
              {configured ? (
                <form
                  action={`/learn/${course.slug}/units/${unit.slug}/viewer-lab/launch`}
                  method="post"
                  target="_blank"
                >
                  <button className="primary-button" type="submit">
                    Open Scannex Viewer in a new window
                  </button>
                </form>
              ) : (
                <p className="disabled-guidance">The hosted Viewer is being prepared. The launch button will appear here when the AWS learner environment is ready.</p>
              )}
            </section>

            <ViewerPracticeGuide courseSlug={course.slug} nextUnit={nextUnit} keepSession={keepSession} />

            <section className="unit-resources" aria-labelledby="viewer-lab-boundaries-heading">
              <p className="eyebrow">Practice boundaries</p>
              <h2 id="viewer-lab-boundaries-heading">What this session is for</h2>
              <p>
                Use it to become comfortable with Viewer navigation, zoom, palettes and approved image-enhancement controls. Formal assessment images, answer keys and certification decisions are not included in this practice lab.
              </p>
            </section>
          </div>
        </section>
      </main>
    );
  }

  return (
    <ViewerUnitAccess userId={session.user.id} courseSlug={course.slug} unitSlug={unit.slug}>
    <main>
      <section className="unit-masthead">
        <div className="content-inner">
          <Link className="back-link" href={`/learn/${course.slug}/units/${unit.slug}`}>
            Back to summative assessment
          </Link>
          <p className="eyebrow">Controlled practical environment</p>
          <h1>Scannex Practical Assessment</h1>
          <p>Part B of the final assessment. Start with the instructions and printable checklist, then follow the guided steps for three assigned Viewer exercises.</p>
          <div className="unit-meta">
            <span>32 practical marks</span>
            <span>40-mark assignment rubric</span>
            <span>75% overall pass requirement</span>
          </div>
          <div className="button-row"><a className="primary-button" href="#practical-workflow">Go to the practical workflow</a></div>
        </div>
      </section>

      <section className="content-band">
        <div className="content-inner">
          <PracticalAssignment />
          <details className="unit-resources">
            <summary>Supervised station / native Trainer alternative</summary>
          <section aria-labelledby="viewer-lab-session-heading">
            <p className="eyebrow">Assessment session</p>
            <h2 id="viewer-lab-session-heading">Attend your practical session</h2>
            <ol>
              <li>Complete the required learning units and formative checks.</li>
              <li>Arrange a supervised assessment session with the Scannex assessment lead.</li>
              <li>If APGI has assigned the native Trainer alternative, receive that exercise reference at the approved training station and complete it in the genuine Viewer.</li>
              <li>The assessor observes the practical rubric, then saves the approved result and Viewer Movement Log for review.</li>
            </ol>
            <p className="resource-status" role="status">
              The supervised station uses its separate legacy rubric. The 40-mark rubric applies to the recorded assignment. Neither opening the page nor attending the station completes the course.
            </p>
          </section>
          </details>

          <section className="unit-resources" aria-labelledby="viewer-lab-evidence-heading">
            <p className="eyebrow">Evidence and review</p>
            <h2 id="viewer-lab-evidence-heading">What is assessed</h2>
            <p>
              The assessor checks your Viewer evidence, annotations, checklist and reasons against the approved case key. In the supervised station alternative, the assessor uses the saved exercise result and Viewer Movement Log. An unresolved material safety concern prevents a pass.
            </p>
          </section>
        </div>
      </section>
    </main>
    </ViewerUnitAccess>
  );
}
