import Link from "next/link";
import { notFound } from "next/navigation";
import { CourseAccessDenied } from "@/components/course/CourseAccessDenied";
import { ScannexPracticalSession } from "@/components/assessments/ScannexPracticalSession";
import { getCourseBySlug } from "@/lib/courses";
import { getCourseAccess } from "@/lib/services/enrolments/get-course-access";
import { publicCaseInstructions, SCANNEX_COURSE_ID } from "@/lib/assessments/automated-practical";
import { requireSession } from "@/server/auth/session";
import { getCase, livePracticalConfigured, practicalRest, type PracticalAttempt, type PracticalRequest } from "@/server/services/assessments/automated-practical";

export const dynamic = "force-dynamic";
export default async function ViewerLabPage({ params }: { params: Promise<{ courseSlug: string; unitSlug: string }> }) {
  const session = await requireSession();
  const { courseSlug, unitSlug } = await params;
  const course = getCourseBySlug(courseSlug);
  const unit = course?.units.find(candidate => candidate.slug === unitSlug);
  if (!course || course.id !== SCANNEX_COURSE_ID || !unit?.practicalAssessment) notFound();
  const access = await getCourseAccess({ accessToken: session.accessToken, userId: session.user.id, userEmail: session.user.email, courseId: course.id });
  if (!access.canAccess) return <CourseAccessDenied course={course} access={access} />;
  let request: PracticalRequest | null = null;
  let attempt = null;
  let unavailable = false;
  try {
    const rows = await practicalRest<PracticalRequest[]>(`scannex_requests?learner_user_id=eq.${encodeURIComponent(session.user.id)}&order=created_at.desc,id.desc&limit=1&select=*`);
    request = rows[0] ?? null;
    if (request) {
      const [row] = await practicalRest<PracticalAttempt[]>(`scannex_attempts?request_id=eq.${request.id}&learner_user_id=eq.${encodeURIComponent(session.user.id)}&limit=1&select=*`);
      if (row) {
        const caseRow = await getCase(row.case_id);
        const r = row.result;
        attempt = { id: row.id, submitted: Boolean(row.checklist_submitted_at), instructions: publicCaseInstructions(caseRow.definition), result: r ? {
          status: r.status, practicalScore: r.practicalScore, practicalMaximum: r.practicalMaximum, practicalContribution: r.practicalContribution,
          theoryScore: r.theoryScore, finalScore: r.finalScore, safetyFailure: r.safetyFailure,
        } : null };
      }
    }
  } catch { unavailable = true; }
  return <main>
    <section className="unit-masthead"><div className="content-inner">
      <Link className="back-link" href={`/learn/${course.slug}/units/${unit.slug}`}>Back to summative assessment</Link>
      <p className="eyebrow">Final summative assessment · Part B</p><h1>Scannex practical assessment</h1>
      <p>Follow the assigned instructions in the genuine Scannex Viewer and submit your examination checklist.</p>
      <div className="unit-meta"><span>Practical scored out of 100</span><span>32% of your final score</span><span>75% overall pass requirement</span></div>
    </div></section>
    <section className="content-band"><div className="content-inner">
      <p>Complete your knowledge assessment before starting. Your approved session records Viewer evidence and your checklist for automatic scoring. A safety-critical failure prevents a pass.</p>
      {unavailable ? <p role="alert" className="resource-status">Assessment records are temporarily unavailable. Please refresh later. No request or result has been changed.</p> : <ScannexPracticalSession
        key={request?.id ?? "new-request"}
        request={request ? { id: request.id, status: request.status, preferredDate: request.preferred_date, opensAt: request.opens_at, closesAt: request.closes_at } : null}
        attempt={attempt} liveReady={livePracticalConfigured()} />}
    </div></section>
  </main>;
}
