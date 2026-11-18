import {courseClassifications} from '@/server/services/course-classification';
import {getSavedCourseCardImages} from '@/server/services/course-card-images';
import { LearnerDashboard } from "@/components/dashboard/LearnerDashboard";
import { requireSession } from "@/server/auth/session";
import { getDashboard } from "@/lib/services/dashboard/get-dashboard";
import { requireLearnerProfile } from "@/server/auth/learner-onboarding";

export const metadata = {
  title: "Learner dashboard"
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireSession();
  await requireLearnerProfile(session);
  const dashboard = await getDashboard(session);

  const labels=await courseClassifications(dashboard.courses.map(c=>c.id));
  const labelled={...dashboard,courses:dashboard.courses.map(c=>({...c,classification:labels.get(c.id)}))};
  return <LearnerDashboard dashboard={labelled} cardImages={await getSavedCourseCardImages()} />;
}
