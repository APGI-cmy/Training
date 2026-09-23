import Link from "next/link";
import { notFound } from "next/navigation";
import { ScannexTheoryAssessment } from "@/components/assessments/ScannexTheoryAssessment";
import { CourseAccessDenied } from "@/components/course/CourseAccessDenied";
import { getCourseBySlug } from "@/lib/courses";
import { getCourseAccess } from "@/lib/services/enrolments/get-course-access";
import { getScannexTheoryQuestions } from "@/server/assessments/scannex-theory-bank";
import { requireSession } from "@/server/auth/session";
import { getLatestScannexTheoryAttempt } from "@/server/services/assessments/theory-attempts";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ courseSlug: string; unitSlug: string }> };

export default async function ScannexKnowledgeAssessmentPage({ params }: PageProps) {
  const session = await requireSession();
  const { courseSlug, unitSlug } = await params;
  const course = getCourseBySlug(courseSlug);
  const unit = course?.units.find((candidate) => candidate.slug === unitSlug);

  if (!course || !unit?.practicalAssessment || course.id !== "scannex-training-programme") notFound();

  const [access, latestAttempt] = await Promise.all([
    getCourseAccess({
      accessToken: session.accessToken,
      userId: session.user.id,
      userEmail: session.user.email,
      courseId: course.id
    }),
    getLatestScannexTheoryAttempt(session.user.id, course.id)
  ]);

  if (!access.canAccess) return <CourseAccessDenied course={course} access={access} />;

  return (
    <main>
      <section className="unit-masthead">
        <div className="content-inner">
          <Link className="back-link" href={`/learn/${course.slug}/units/${unit.slug}`}>
            Back to summative assessment
          </Link>
          <p className="eyebrow">Summative assessment</p>
          <h1>Scannex Knowledge Assessment</h1>
          <p>Part A of the final assessment assesses the theory and decision knowledge from the Scannex programme.</p>
          <div className="unit-meta">
            <span>68 theory marks</span>
            <span>32 practical marks</span>
            <span>75% overall pass requirement</span>
          </div>
        </div>
      </section>
      <ScannexTheoryAssessment
        courseSlug={course.slug}
        questions={getScannexTheoryQuestions()}
        latestResult={latestAttempt ? { score: latestAttempt.score, maxScore: latestAttempt.maxScore, submittedAt: latestAttempt.submittedAt } : null}
      />
    </main>
  );
}
