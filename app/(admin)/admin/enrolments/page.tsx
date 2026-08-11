import { getCourses } from "@/lib/courses";
import Link from "next/link";
import { EnrolmentManagementWorkspace } from "@/components/admin/EnrolmentManagementWorkspace";

export default async function EnrolmentAdministrationPage({ searchParams }: { searchParams: Promise<{ learnerId?: string; learner?: string; email?: string }> }) {
  const params = await searchParams;
  const courses = getCourses().map(({ id, title }) => ({ id, title }));

  return (
    <main className="admin-page">
      <header className="admin-page-header">
        <div><p className="eyebrow">Administration</p><h1>Manage enrolments</h1><p>Access decisions start with a learner record—not a copied system identifier—and remain review-only until lifecycle testing is agreed.</p></div>
        <Link className="secondary-button" href="/admin/learners">Browse learners</Link>
      </header>
      <EnrolmentManagementWorkspace learnerId={params.learnerId} learnerName={params.learner} learnerEmail={params.email} courses={courses} />
    </main>
  );
}
