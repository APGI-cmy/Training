import Link from "next/link";
import { getCourses } from "@/lib/courses";
import { EnrolmentManagementWorkspace } from "@/components/admin/EnrolmentManagementWorkspace";
import { getAdminLearner } from "@/lib/services/admin/get-admin-learners";

export default async function EnrolmentAdministrationPage({ searchParams }: { searchParams: Promise<{ learnerId?: string }> }) {
  const params = await searchParams;
  const [courses, learner] = await Promise.all([
    Promise.resolve(getCourses().map(({ id, title }) => ({ id, title }))),
    getAdminLearner(params.learnerId)
  ]);
  return <main className="admin-page"><header className="admin-page-header"><div><p className="eyebrow">Administration</p><h1>Manage enrolments</h1><p>Access decisions start with a learner record—not a copied system identifier—and remain review-only until lifecycle testing is agreed.</p></div><Link className="secondary-button" href="/admin/learners">Browse learners</Link></header><EnrolmentManagementWorkspace learner={learner} courses={courses} /></main>;
}
