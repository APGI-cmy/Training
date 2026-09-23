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
