import Link from "next/link";
import { notFound } from "next/navigation";
import { CourseAccessDenied } from "@/components/course/CourseAccessDenied";
import { getCourseBySlug } from "@/lib/courses";
import { getCourseAccess } from "@/lib/services/enrolments/get-course-access";
import { isViewerLabConfigured } from "@/lib/services/viewer-lab/viewer-lab-config";
import { requireSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    courseSlug: string;
    unitSlug: string;
  }>;
  searchParams: Promise<{
    status?: string;
  }>;
};

const statusMessages: Record<string, string> = {
  "access-denied": "Your active Scannex enrolment could not be confirmed. Return to My Learning or contact the training administrator.",
  "not-configured": "The hosted Viewer is still being prepared. Your course progress has not been changed.",
  unavailable: "The Viewer could not be started. Please wait a moment and try again, or contact the training administrator."
};

export default async function ViewerLabPage({ params, searchParams }: PageProps) {
  const session = await requireSession();
  const { courseSlug, unitSlug } = await params;
  const { status } = await searchParams;
  const course = getCourseBySlug(courseSlug);
  const unit = course?.units.find((candidate) => candidate.slug === unitSlug);
  const isPracticeLab = course?.slug === "scannex-training-programme" && unit?.slug === "lu6";
  const isSummativeLab = Boolean(unit?.practicalAssessment);

  if (!course || !unit || (!isPracticeLab && !isSummativeLab)) {
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

  if (isPracticeLab) {
    const configured = isViewerLabConfigured();
    const message = status ? statusMessages[status] : undefined;

    return (
      <main>
        <section className="unit-masthead">
          <div className="content-inner">
            <Link className="back-link" href={`/learn/${course.slug}/units/${unit.slug}`}>
              Back to Learning Unit 6
            </Link>
            <p className="eyebrow">Hosted practice environment</p>
            <h1>Scannex Viewer Lab</h1>
            <p>Practise the LU 6 viewing controls in the genuine Scannex Viewer using an isolated training session.</p>
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
                <li>Wait for the Windows session and Scannex Viewer to finish loading.</li>
                <li>Use the supplied practice image to explore the controls covered in LU 6.</li>
                <li>Close or sign out of the hosted session when you finish.</li>
              </ol>
              <p className="resource-status" role="status">
                This practice session does not record a score, pass you, or complete the learning unit.
              </p>
              {message ? <p className="form-error" role="alert">{message}</p> : null}
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
    <main>
      <section className="unit-masthead">
        <div className="content-inner">
          <Link className="back-link" href={`/learn/${course.slug}/units/${unit.slug}`}>
            Back to summative assessment
          </Link>
          <p className="eyebrow">Controlled practical environment</p>
          <h1>Scannex Practical Assessment</h1>
          <p>Part B of the final assessment: complete the practical exercise in the genuine Scannex Viewer at an approved training station.</p>
          <div className="unit-meta">
            <span>32 practical marks</span>
            <span>100-point assessor rubric</span>
            <span>75% overall pass requirement</span>
          </div>
        </div>
      </section>

      <section className="content-band">
        <div className="content-inner">
          <section className="unit-resources" aria-labelledby="viewer-lab-session-heading">
            <p className="eyebrow">Assessment session</p>
            <h2 id="viewer-lab-session-heading">Attend your practical session</h2>
            <ol>
              <li>Complete the required learning units and formative checks.</li>
              <li>Arrange a supervised assessment session with the Scannex assessment lead.</li>
              <li>At the approved training station, receive the assigned Trainer exercise reference and complete it in the genuine Viewer.</li>
              <li>The assessor observes the practical rubric, then saves the approved result and Viewer Movement Log for review.</li>
            </ol>
            <p className="resource-status" role="status">
              The practical instrument is recorded as 99 raw marks, normalised to 100, then converted to the 32 practical marks. Your course is not complete merely by opening this page or attending the station.
            </p>
          </section>

          <section className="unit-resources" aria-labelledby="viewer-lab-evidence-heading">
            <p className="eyebrow">Evidence and review</p>
            <h2 id="viewer-lab-evidence-heading">What is assessed</h2>
            <p>
              The assessor reviews your use of the Viewer, systematic image interrogation and application of the Scannex checklist, alongside the approved exercise result and Viewer Movement Log. A material safety or role-boundary concern must be reviewed before a pass can be recorded.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
